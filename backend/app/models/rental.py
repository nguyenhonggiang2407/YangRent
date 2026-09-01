"""RentalRequest - yêu cầu thuê phòng (SEEKER gửi tới LANDLORD)."""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

RENTAL_REQUEST_STATUS = ("PENDING", "ACCEPTED", "REJECTED", "CANCELLED")


class RentalRequest(Base):
    __tablename__ = "rental_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)
    seeker_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)   # người gửi yêu cầu
    landlord_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    move_in_date: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="")
    lease_duration: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    deposit_amount: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    room = relationship("Room", lazy="selectin")
    seeker = relationship("User", foreign_keys=[seeker_id], lazy="selectin")
    landlord = relationship("User", foreign_keys=[landlord_id], lazy="selectin")
