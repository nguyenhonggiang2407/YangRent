"""Contract - hợp đồng thuê phòng."""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

CONTRACT_STATUS = ("DRAFT", "SENT", "PENDING_TENANT", "PENDING_LANDLORD", "SIGNED", "ACTIVE", "COMPLETED", "TERMINATED", "REJECTED", "CANCELLED", "EXPIRED")


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)
    landlord_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    code: Mapped[str] = mapped_column(String(40), default="")  # mã hợp đồng, vd TF-2026-001
    start_date: Mapped[str] = mapped_column(String(20))  # "2026-08-01"
    end_date: Mapped[str] = mapped_column(String(20))
    monthly_rent: Mapped[int] = mapped_column(Integer)
    deposit_amount: Mapped[int] = mapped_column(Integer, default=0)
    terms: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="DRAFT", index=True)
    tenant_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    landlord_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    tenant_signature_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    landlord_signature_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    room = relationship("Room", lazy="selectin")
    landlord = relationship("User", foreign_keys=[landlord_id], lazy="selectin")
    tenant = relationship("User", foreign_keys=[tenant_id], lazy="selectin")
