"""RoommatePost - bài đăng tìm phòng / tìm người ở ghép."""
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Loại bài đăng ở ghép
POST_TYPES = ("LOOKING_ROOM", "LOOKING_ROOMMATE")


class RoommatePost(Base):
    __tablename__ = "roommate_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    post_type: Mapped[str] = mapped_column(String(30), index=True)  # LOOKING_ROOM / LOOKING_ROOMMATE
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")

    # Khu vực / ngân sách
    city: Mapped[str] = mapped_column(String(50), default="Hà Nội")
    district: Mapped[str] = mapped_column(String(50), index=True)
    budget_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    budget_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Người tìm phòng
    gender_pref: Mapped[str] = mapped_column(String(20), default="ANY")  # ANY / MALE / FEMALE
    num_people: Mapped[int] = mapped_column(Integer, default=1)
    move_in_date: Mapped[str] = mapped_column(String(30), default="")  # "2026-09"
    school: Mapped[str] = mapped_column(String(120), default="")
    workplace: Mapped[str] = mapped_column(String(120), default="")
    desired_amenities: Mapped[list] = mapped_column(JSON, default=list)  # [ "Wifi", "Điều hoà" ]

    # Người có phòng tìm ở ghép
    room_price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    current_people: Mapped[int] = mapped_column(Integer, default=0)
    needed_people: Mapped[int] = mapped_column(Integer, default=1)
    cost_per_person: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    room_area: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    room_address: Mapped[str] = mapped_column(String(300), default="")
    images: Mapped[list] = mapped_column(JSON, default=list)  # [url1, url2]

    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")  # ACTIVE / CLOSED / HIDDEN
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", lazy="selectin")
