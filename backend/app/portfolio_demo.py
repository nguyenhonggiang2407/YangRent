"""Explicit, disposable portfolio server: python -m app.portfolio_demo.

Requires PORTFOLIO_DEMO=true and no preconfigured DATABASE_URL. Every process
owns a new temporary SQLite file and new signing keys. No login credentials are
published; visitors register their own fictional test accounts.
"""
from __future__ import annotations

import atexit
from collections import deque
import os
import secrets
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path


class DemoSafetyError(RuntimeError):
    """The isolated demo cannot start without its explicit safety contract."""


@dataclass(frozen=True)
class DemoEnvironment:
    database_path: Path
    database_url: str


_prepared: DemoEnvironment | None = None
_seeded = False
_DISABLED_SETTINGS = (
    "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY",
    "OPENAI_API_KEY", "STORAGE_BUCKET",
)


def _require_demo_flag() -> None:
    if os.environ.get("PORTFOLIO_DEMO", "").strip().lower() != "true":
        raise DemoSafetyError("PORTFOLIO_DEMO=true is required for the isolated demo.")


def _configured_database() -> bool:
    if any(key.upper() == "DATABASE_URL" and value.strip()
           for key, value in os.environ.items()):
        return True
    # Settings normally reads .env. Refuse a configured database there as well,
    # before any app settings, database module, or engine is imported.
    from dotenv import dotenv_values

    return any(key.upper() == "DATABASE_URL" and value and value.strip()
               for key, value in dotenv_values(".env", interpolate=False).items())


def _shared_login_credentials() -> tuple[str, str] | None:
    if os.environ.get("DEMO_LOGIN_ENABLED") != "1":
        return None
    from pydantic import EmailStr, TypeAdapter, ValidationError

    email = os.environ.get("DEMO_LOGIN_EMAIL", "").strip().lower()
    password = os.environ.get("DEMO_LOGIN_PASSWORD", "")
    try:
        email = TypeAdapter(EmailStr).validate_python(email)
    except ValidationError:
        raise DemoSafetyError("A valid DEMO_LOGIN_EMAIL is required.") from None
    if email == "portfolio-landlord@example.test" or len(email) > 255:
        raise DemoSafetyError("DEMO_LOGIN_EMAIL is reserved or too long.")
    if len(password) < 8 or len(password.encode("utf-8")) > 72:
        raise DemoSafetyError("DEMO_LOGIN_PASSWORD does not meet the bcrypt length policy.")
    return email, password


def _cleanup_database(environment: DemoEnvironment) -> None:
    database = sys.modules.get("app.database")
    try:
        if database is not None and _is_demo_engine(database.engine, environment):
            database.engine.dispose()
        environment.database_path.unlink(missing_ok=True)
    except OSError:
        # Shutdown must not expose configuration or keep the process alive.
        pass


def _is_demo_engine(engine, environment: DemoEnvironment) -> bool:
    # URL rendering percent-escapes Windows drive colons; compare its decoded
    # database field instead of its presentation string.
    return (engine.url.get_backend_name() == "sqlite" and engine.url.database is not None
            and Path(engine.url.database).resolve() == environment.database_path)


def prepare_demo_environment() -> DemoEnvironment:
    """Reserve a new private SQLite file before importing application modules."""
    global _prepared
    _require_demo_flag()
    if _prepared is not None:
        raise DemoSafetyError("The portfolio demo is already prepared in this process.")
    if _configured_database():
        raise DemoSafetyError("A preconfigured DATABASE_URL is forbidden for this demo.")
    if any(name in sys.modules for name in ("app.config", "app.database", "app.main")):
        raise DemoSafetyError("Start the portfolio demo in a fresh process.")

    descriptor, filename = tempfile.mkstemp(prefix="yangrent-portfolio-", suffix=".sqlite3")
    os.close(descriptor)
    path = Path(filename).resolve()
    environment = DemoEnvironment(path, "sqlite:///" + path.as_posix())

    # Remove case variants as Settings accepts environment names without regard
    # to case. Explicit blanks also override provider keys in an unrelated .env.
    replaced = {"DATABASE_URL", "SECRET_KEY", "JWT_SECRET", "CORS_ORIGINS",
                "APP_NAME", "API_PREFIX", *_DISABLED_SETTINGS}
    for key in list(os.environ):
        if key.upper() in replaced:
            del os.environ[key]
    os.environ.update({
        "PORTFOLIO_DEMO": "true",
        "DATABASE_URL": environment.database_url,
        "SECRET_KEY": secrets.token_urlsafe(48),
        "JWT_SECRET": secrets.token_urlsafe(48),
        "APP_NAME": "YangRent Portfolio Demo",
        "API_PREFIX": "/api",
        "CORS_ORIGINS": "",  # The demo frontend and API share one origin.
        **{key: "" for key in _DISABLED_SETTINGS},
    })
    _prepared = environment
    atexit.register(_cleanup_database, environment)
    return environment


def seed_sample_data() -> int | None:
    """Create fictional data only inside this process's reserved empty file."""
    global _seeded
    _require_demo_flag()
    environment = _prepared
    if environment is None or _seeded:
        raise DemoSafetyError("A new prepared demo database is required for seeding.")
    if os.environ.get("DATABASE_URL") != environment.database_url:
        raise DemoSafetyError("The prepared demo database configuration changed.")
    if not environment.database_path.is_file() or environment.database_path.stat().st_size != 0:
        raise DemoSafetyError("The reserved demo database must still be empty.")
    credentials = _shared_login_credentials()

    from sqlalchemy import create_engine
    from sqlalchemy.pool import NullPool
    from app import database

    if not _is_demo_engine(database.engine, environment):
        raise DemoSafetyError("The application engine is not the reserved demo database.")
    # This opt-in process alone uses connection-per-request pooling. A shared
    # SingletonThreadPool can close active connections when request threads vary.
    database.engine.dispose()
    database.engine = create_engine(
        environment.database_url,
        connect_args={"check_same_thread": False, "timeout": 20},
        poolclass=NullPool,
        pool_pre_ping=True,
    )
    database.SessionLocal.configure(bind=database.engine)

    import bcrypt
    from app.core.security import hash_password
    from app.models import Amenity, Role, Room, RoomImage, User
    from app.models.room import Favorite

    database.Base.metadata.create_all(database.engine)
    demo_user_id = None
    with database.SessionLocal() as session:
        roles = {name: Role(name=name, description="Vai trò trong bản demo hư cấu")
                 for name in ("ADMIN", "LANDLORD", "TENANT", "USER")}
        session.add_all(roles.values())
        landlord = User(
            email="portfolio-landlord@example.test",
            hashed_password=bcrypt.hashpw(secrets.token_urlsafe(48).encode(), bcrypt.gensalt()).decode(),
            full_name="Chủ nhà mẫu — dữ liệu hư cấu", phone="", avatar_url="",
            is_verified=False, roles=[roles["LANDLORD"], roles["USER"]],
        )
        session.add(landlord)
        amenities = {
            name: Amenity(name=name, icon=icon)
            for name, icon in (("WiFi", "Wifi"), ("Máy lạnh", "Wind"),
                               ("Chỗ để xe", "Bike"), ("Bếp", "CookingPot"),
                               ("Giường", "BedDouble"))
        }
        session.add_all(amenities.values())
        demo_user = None
        if credentials is not None:
            email, password = credentials
            demo_user = User(
                email=email, hashed_password=hash_password(password),
                full_name="Khách xem thử YangRent", phone="", avatar_url="",
                is_verified=False, roles=[roles["USER"]],
            )
            session.add(demo_user)
        session.flush()
        samples = (
            ("RENTAL_ROOM", "Phòng trọ thoáng sáng", "rental-bedroom", 3200000, 24, "Cầu Giấy", 2),
            ("STUDIO", "Studio không gian mở", "studio-open-plan", 5500000, 32, "Nam Từ Liêm", 2),
            ("MINI_APARTMENT", "Căn hộ mini tiện nghi", "mini-apartment", 6800000, 38, "Thanh Xuân", 2),
            ("APARTMENT", "Căn hộ có phòng khách", "apartment-living", 9500000, 65, "Hai Bà Trưng", 4),
            ("WHOLE_HOUSE", "Nhà nguyên căn cho gia đình", "family-living", 12000000, 90, "Hà Đông", 4),
            ("SHARED_ROOM", "Phòng ở ghép có bếp chung", "shared-kitchen", 2200000, 20, "Đống Đa", 1),
        )
        for number, (kind, title, photo, price, area, district, occupants) in enumerate(samples, 1):
            room = Room(
                landlord_id=landlord.id,
                title=title + " — minh họa hư cấu",
                description=("Tin mẫu hư cấu để trải nghiệm YangRent, không phải chỗ ở đang cho thuê. "
                             "Ảnh chụp minh họa từ bộ ảnh đã lưu của dự án. "
                             "Chỉ dùng thông tin giả khi thử đặt lịch hoặc gửi yêu cầu."),
                price=price, area=area,
                address=f"Địa chỉ giả lập {number:02d} — không phải địa điểm cho thuê thật",
                city="Hà Nội", district=district, ward="", latitude=None, longitude=None,
                room_type=kind, bathroom_type="SHARED" if kind == "SHARED_ROOM" else "PRIVATE",
                furnished=True, max_occupants=occupants, status="AVAILABLE",
                is_featured=True, is_verified=False, moderation_status="APPROVED",
                amenities=[amenities["WiFi"], amenities["Giường"],
                           amenities["Bếp"] if kind == "SHARED_ROOM" else amenities["Máy lạnh"],
                           amenities["Chỗ để xe"]],
            )
            room.images = [RoomImage(image_url=f"/images/housing/{photo}-960.webp",
                                     is_primary=True, sort_order=0)]
            session.add(room)
            if number == 1 and demo_user is not None:
                session.flush()
                session.add(Favorite(user_id=demo_user.id, room_id=room.id))
        if demo_user is not None:
            demo_user_id = demo_user.id
        session.commit()
    _seeded = True
    return demo_user_id


def _limit_local_logins(app) -> None:
    from fastapi.responses import JSONResponse

    # The configured shared account is loopback-only and uses one worker.
    # A single bounded queue is sufficient for this local preview.
    attempts: deque[float] = deque()

    @app.middleware("http")
    async def limit_login(request, call_next):
        if request.method == "POST" and request.url.path.rstrip("/") == "/api/auth/login":
            now = time.monotonic()
            while attempts and now - attempts[0] >= 60:
                attempts.popleft()
            if len(attempts) >= 12:
                return JSONResponse(
                    status_code=429, headers={"Retry-After": "60"},
                    content={"success": False, "code": "LOGIN_LIMIT",
                             "message": "Đã thử đăng nhập quá nhiều. Vui lòng đợi một phút."},
                )
            attempts.append(now)
        return await call_next(request)


def create_demo_app():
    """Construct the real API only after preparing and seeding its new database."""
    prepare_demo_environment()
    demo_user_id = seed_sample_data()
    from app.main import app

    if demo_user_id is not None:
        app.state.shared_demo_user_id = demo_user_id
        _limit_local_logins(app)
    return app


def main() -> None:
    try:
        port = int(os.environ.get("PORT", "10000"))
        if not 1 <= port <= 65535:
            raise DemoSafetyError("PORT must be between 1 and 65535.")
        app = create_demo_app()
    except Exception:
        # Never echo a supplied URL, password, key, or ORM parameter on failure.
        raise SystemExit("Portfolio demo startup refused; check its isolated-demo configuration.") from None
    import uvicorn

    host = "127.0.0.1" if getattr(app.state, "shared_demo_user_id", None) else "0.0.0.0"
    uvicorn.run(app, host=host, port=port, workers=1)


if __name__ == "__main__":
    main()
