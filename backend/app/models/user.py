"""User + Role (RBAC, hỗ trợ multi-role)."""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Bảng trung gian user <-> role (một tài khoản có thể có nhiều vai trò)
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), default="")
    avatar_url: Mapped[str] = mapped_column(String(500), default="")
    gender: Mapped[str] = mapped_column(String(20), nullable=True)  # MALE / FEMALE / OTHER
    date_of_birth: Mapped[str] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")  # ACTIVE / BANNED
    is_verified: Mapped[bool] = mapped_column(default=False)  # badge "Đã xác minh"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    roles: Mapped[list[Role]] = relationship("Role", secondary=user_roles, lazy="selectin")

    # ---------- RBAC helpers ----------
    def role_names(self) -> list[str]:
        return [r.name for r in self.roles]

    def has_role(self, role: str) -> bool:
        return any(r.name == role for r in self.roles)

    def has_any_role(self, *roles: str) -> bool:
        return any(self.has_role(r) for r in roles)

    def add_role(self, role: Role) -> None:
        if not self.has_role(role.name):
            self.roles.append(role)

    def to_public_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "phone": self.phone,
            "avatar_url": self.avatar_url,
            "gender": self.gender,
            "date_of_birth": self.date_of_birth,
            "status": self.status,
            "is_verified": self.is_verified,
            "roles": self.role_names(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
