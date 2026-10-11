"""Explicit fictional local demo; never uses a configured remote database.

Run from backend: python -m seed.seed --local-demo
Creates only a new yangrent-demo.db in the current directory; never resets data.
"""
import argparse
import os
import secrets
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-demo", action="store_true", help="Create a NEW fictional local SQLite demo")
    args = parser.parse_args()
    if not args.local_demo:
        parser.error("Explicit --local-demo is required; never a production initializer")

    database = Path.cwd() / "yangrent-demo.db"
    if database.exists():
        parser.error("yangrent-demo.db already exists; refusing to modify or reset it")
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from app.config import get_settings

    # Override only this process, before importing any database code.
    os.environ["DATABASE_URL"] = "sqlite:///" + database.resolve().as_posix()
    get_settings.cache_clear()
    get_settings()  # Validate required signing keys before creating a file.
    try:
        with database.open("x"):
            pass
    except FileExistsError:
        parser.error("Demo file appeared meanwhile; refusing to modify it")

    from app.core.security import hash_password
    from app.database import Base, SessionLocal, engine
    from app.models import Role, Room, RoomImage, User

    Base.metadata.create_all(engine)
    credentials = []
    with SessionLocal() as db:
        roles = {name: Role(name=name) for name in ("ADMIN", "LANDLORD", "TENANT", "USER")}
        db.add_all(roles.values())
        users = {}
        for name, role in (("admin", "ADMIN"), ("landlord", "LANDLORD"), ("tenant", "TENANT")):
            password = secrets.token_urlsafe(24)
            email = name + "@example.test"
            user = User(email=email, hashed_password=hash_password(password),
                        full_name="Fictional demo " + name, phone="", avatar_url="",
                        is_verified=False, roles=[roles[role], roles["USER"]])
            db.add(user)
            users[name] = user
            credentials.append((email, password))
        db.flush()
        for number, room_type in enumerate(("RENTAL_ROOM", "STUDIO", "SHARED_ROOM"), start=1):
            room = Room(landlord_id=users["landlord"].id,
                        title=f"Phòng minh họa {number} — dữ liệu hư cấu",
                        description="Dữ liệu học tập hư cấu. Không phải tin cho thuê thật.",
                        price=number * 1000000, area=18 + number * 4,
                        address="Địa chỉ minh họa — không tồn tại", city="Hà Nội",
                        district="Cầu Giấy", ward="", latitude=None, longitude=None,
                        room_type=room_type, is_featured=True, is_verified=False,
                        moderation_status="APPROVED")
            room.images = [RoomImage(image_url="/images/yangrent-placeholder.svg",
                                     is_primary=True, sort_order=0)]
            db.add(room)
        db.commit()
    engine.dispose()
    print("Created fictional local demo: yangrent-demo.db (3 users, 3 rooms).")
    print("Generated local-only passwords; never expose these demo accounts on a public host:")
    for email, password in credentials:
        print(f"{email}\t{password}")
    print("For local use set DATABASE_URL=sqlite:///./yangrent-demo.db before starting the backend.")


if __name__ == "__main__":
    main()
