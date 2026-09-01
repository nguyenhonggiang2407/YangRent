"""MeterReading - chỉ số điện / nước hàng tháng."""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

METER_TYPES = ("ELECTRICITY", "WATER")
METER_STATUS = ("SUBMITTED", "CONFIRMED")


class MeterReading(Base):
    __tablename__ = "meter_readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)
    contract_id: Mapped[int] = mapped_column(ForeignKey("contracts.id"), index=True)
    period: Mapped[str] = mapped_column(String(10), index=True)  # "2026-07"
    meter_type: Mapped[str] = mapped_column(String(20), index=True)  # ELECTRICITY / WATER
    previous_value: Mapped[float] = mapped_column(Float, default=0)
    current_value: Mapped[float] = mapped_column(Float, default=0)
    consumption: Mapped[float] = mapped_column(Float, default=0)
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    amount: Mapped[float] = mapped_column(Float, default=0)
    image_url: Mapped[str] = mapped_column(String(500), default="")  # ảnh công tơ
    ocr_raw: Mapped[str] = mapped_column(String(500), default="")  # kết quả OCR thô
    status: Mapped[str] = mapped_column(String(20), default="SUBMITTED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    room = relationship("Room", lazy="selectin")
    contract = relationship("Contract", lazy="selectin")
