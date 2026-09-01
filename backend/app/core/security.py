"""Security: hash password (bcrypt) + tạo/verify JWT token."""
import datetime
from typing import Any, Optional

import bcrypt
import jwt

from app.config import get_settings

settings = get_settings()


# ---------- Password ----------
def hash_password(password: str) -> str:
    """Băm mật khẩu bằng bcrypt (salt tự sinh)."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiểm tra mật khẩu phẳng vs hash đã lưu."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# ---------- JWT ----------
def create_access_token(subject: str | int, extra: Optional[dict[str, Any]] = None) -> str:
    """Tạo JWT access token. `subject` là user id."""
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        minutes=settings.JWT_EXPIRE_MINUTES
    )
    payload: dict[str, Any] = {"sub": str(subject), "exp": expire, "iat": datetime.datetime.now(datetime.timezone.utc)}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Giải mã JWT; raise nếu hết hạn hoặc sai chữ ký."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
