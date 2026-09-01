"""Room + RoomImage + Amenity + Favorite."""
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Table, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Trạng thái phòng
ROOM_STATUS = ("AVAILABLE", "RENTED", "RESERVED", "HIDDEN")
# Trạng thái duyệt bài
MODERATION_STATUS = ("PENDING", "APPROVED", "REJECTED")
ROOM_TYPES = ("RENTAL_ROOM", "STUDIO", "MINI_APARTMENT", "APARTMENT", "WHOLE_HOUSE", "SHARED_ROOM")


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    landlord_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[int] = mapped_column(Integer)  # VNĐ / tháng
    area: Mapped[float] = mapped_column(Float, default=0)  # m²
    address: Mapped[str] = mapped_column(String(300), default="")
    city: Mapped[str] = mapped_column(String(50), default="Hà Nội")
    district: Mapped[str] = mapped_column(String(50), index=True)
    ward: Mapped[str] = mapped_column(String(50), default="")
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    room_type: Mapped[str] = mapped_column(String(50), default="RENTAL_ROOM")
    bathroom_type: Mapped[str] = mapped_column(String(20), default="PRIVATE")  # PRIVATE / SHARED
    furnished: Mapped[bool] = mapped_column(Boolean, default=True)
    max_occupants: Mapped[int] = mapped_column(Integer, default=1)
    electricity_price: Mapped[float] = mapped_column(Float, default=4000)  # đ/kWh
    water_price: Mapped[float] = mapped_column(Float, default=25000)  # đ/m³
    internet_price: Mapped[float] = mapped_column(Float, default=100000)  # đ/tháng
    status: Mapped[str] = mapped_column(String(20), default="AVAILABLE", index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    moderation_status: Mapped[str] = mapped_column(String(20), default="APPROVED")
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    view_3d_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    view_360_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    video_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    landlord = relationship("User", lazy="selectin")
    images: Mapped[list["RoomImage"]] = relationship(
        "RoomImage", back_populates="room", cascade="all, delete-orphan",
        order_by="RoomImage.sort_order", lazy="selectin",
    )
    videos: Mapped[list] = relationship(
        "RoomVideo", back_populates="room", cascade="all, delete-orphan",
        order_by="RoomVideo.sort_order", lazy="selectin",
    )
    amenities: Mapped[list["Amenity"]] = relationship(
        "Amenity", secondary="room_amenities", lazy="selectin"
    )


class RoomImage(Base):
    __tablename__ = "room_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    image_url: Mapped[str] = mapped_column(String(500))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    room = relationship("Room", back_populates="images")


# Bảng trung gian room <-> amenity
room_amenities = Table(
    "room_amenities",
    Base.metadata,
    Column("room_id", ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True),
    Column("amenity_id", ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True),
)


class Amenity(Base):
    __tablename__ = "amenities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    icon: Mapped[str] = mapped_column(String(50), default="")  # tên lucide icon


class Favorite(Base):
    __tablename__ = "favorites"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    room = relationship("Room", lazy="selectin")
