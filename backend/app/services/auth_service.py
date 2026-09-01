"""Nghiệp vụ xác thực: đăng ký, đăng nhập, đổi mật khẩu, cập nhật hồ sơ."""
from sqlalchemy.orm import Session

from app.core.deps import ROLE_ADMIN, ROLE_LANDLORD, ROLE_TENANT, ROLE_USER
from app.core.exceptions import ConflictError, NotFoundError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import Role, User


def get_or_create_role(db: Session, name: str, description: str = "") -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if not role:
        role = Role(name=name, description=description)
        db.add(role)
        db.flush()
    return role


def register(db: Session, data) -> User:
    """Đăng ký tài khoản mới. Roles hợp lệ: USER, LANDLORD, TENANT."""
    if db.query(User).filter(User.email == data.email.lower()).first():
        raise ConflictError("Email đã được sử dụng, vui lòng đăng nhập hoặc dùng email khác")

    allowed = {ROLE_USER, ROLE_LANDLORD, ROLE_TENANT}
    requested_roles = data.roles or [ROLE_USER]
    if not all(r in allowed for r in requested_roles):
        raise UnauthorizedError("Role không hợp lệ")

    user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        avatar_url=data.avatar_url,
        gender=data.gender,
    )
    for r in requested_roles:
        user.add_role(get_or_create_role(db, r))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.hashed_password):
        raise UnauthorizedError("Email hoặc mật khẩu không đúng")
    if user.status != "ACTIVE":
        raise UnauthorizedError("Tài khoản của bạn đã bị khoá. Liên hệ admin để biết thêm chi tiết.")
    return user


def build_token(user: User) -> dict:
    return {
        "access_token": create_access_token(user.id, {"roles": user.role_names()}),
        "token_type": "bearer",
        "user": user.to_public_dict(),
    }


def update_profile(db: Session, user: User, data) -> User:
    for field in ("full_name", "phone", "avatar_url", "gender", "date_of_birth"):
        value = getattr(data, field, None)
        if value is not None:
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, old_password: str, new_password: str) -> None:
    if not verify_password(old_password, user.hashed_password):
        raise UnauthorizedError("Mật khẩu cũ không đúng")
    user.hashed_password = hash_password(new_password)
    db.commit()
