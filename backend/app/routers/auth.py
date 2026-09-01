"""API xác thực: /api/auth"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_auth
from app.core.exceptions import UnauthorizedError
from app.core.security import hash_password
from app.database import get_db
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, RegisterRequest, UserUpdateRequest
from app.schemas.common import ok
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    user = auth_service.register(db, data)
    return ok(auth_service.build_token(user), "Đăng ký thành công")


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.login(db, data.email, data.password)
    return ok(auth_service.build_token(user), "Đăng nhập thành công")


@router.get("/me")
def me(user: User = Depends(require_auth)):
    return ok(user.to_public_dict())


@router.put("/me")
def update_me(data: UserUpdateRequest, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    user = auth_service.update_profile(db, user, data)
    return ok(user.to_public_dict(), "Cập nhật hồ sơ thành công")


@router.put("/change-password")
def change_password(data: ChangePasswordRequest, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    auth_service.change_password(db, user, data.old_password, data.new_password)
    return ok(message="Đổi mật khẩu thành công")
