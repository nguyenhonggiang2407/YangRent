"""Dependencies dùng chung: lấy current_user + kiểm tra RBAC / ownership.

Luồng bảo mật backend: Authentication -> Role -> Ownership -> Permission -> Database
"""
from typing import Optional

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.database import get_db
from app.models.user import User

# Các role có sẵn trong hệ thống
ROLE_ADMIN = "ADMIN"
ROLE_USER = "USER"
ROLE_LANDLORD = "LANDLORD"
ROLE_TENANT = "TENANT"

ALL_ROLES = [ROLE_ADMIN, ROLE_USER, ROLE_LANDLORD, ROLE_TENANT]


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Xác thực: đọc token từ header `Authorization: Bearer <token>`."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Vui lòng đăng nhập để tiếp tục")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_access_token(token)
    except Exception:
        raise UnauthorizedError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token không hợp lệ")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise UnauthorizedError("Tài khoản không tồn tại")
    if user.status != "ACTIVE":
        raise ForbiddenError("Tài khoản của bạn đã bị khoá. Liên hệ admin để biết thêm chi tiết.")
    return user


def require_roles(*roles: str):
    """Factory tạo dependency: yêu cầu user có ít nhất 1 trong các role."""
    def checker(user: User = Depends(get_current_user)) -> User:
        if not user.has_any_role(*roles):
            raise ForbiddenError("Bạn không có quyền truy cập chức năng này")
        return user
    return checker


# Dependency phổ biến
require_admin = require_roles(ROLE_ADMIN)
require_landlord = require_roles(ROLE_ADMIN, ROLE_LANDLORD)
require_tenant = require_roles(ROLE_ADMIN, ROLE_TENANT)
require_auth = require_roles(*ALL_ROLES)
