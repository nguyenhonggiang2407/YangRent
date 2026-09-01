"""MaintenanceRequest - yêu cầu sửa chữa."""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

MAINTENANCE_STATUS = ("PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED")
MAINTENANCE_PRIORITY = ("LOW", "MEDIUM", "HIGH", "URGENT")


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    landlord_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    room = relationship("Room", lazy="selectin")
    tenant = relationship("User", foreign_keys=[tenant_id], lazy="selectin")
    landlord = relationship("User", foreign_keys=[landlord_id], lazy="selectin")
