"""Schemas cho chỗ ở cho thuê + bộ lọc tìm kiếm."""
from typing import Optional

from pydantic import BaseModel, Field


class ImageInput(BaseModel):
    image_url: str
    is_primary: bool = False
    sort_order: int = 0


class RoomCreateRequest(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    description: str = ""
    price: int = Field(ge=0)
    area: float = Field(ge=0)
    address: str = ""
    city: str = "Hà Nội"
    district: str
    ward: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    room_type: str = "RENTAL_ROOM"
    bathroom_type: str = "PRIVATE"
    furnished: bool = True
    max_occupants: int = 1
    electricity_price: float = 4000
    water_price: float = 25000
    internet_price: float = 100000
    is_featured: bool = False
    view_3d_url: Optional[str] = None
    view_360_enabled: bool = False
    video_url: Optional[str] = None
    amenity_ids: list[int] = []
    images: list[ImageInput] = []


class RoomUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    area: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    room_type: Optional[str] = None
    bathroom_type: Optional[str] = None
    furnished: Optional[bool] = None
    max_occupants: Optional[int] = None
    electricity_price: Optional[float] = None
    water_price: Optional[float] = None
    internet_price: Optional[float] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    view_3d_url: Optional[str] = None
    view_360_enabled: Optional[bool] = None
    video_url: Optional[str] = None
    amenity_ids: Optional[list[int]] = None
    images: Optional[list[ImageInput]] = None


class FavoriteRequest(BaseModel):
    room_id: int


class ReportCreateRequest(BaseModel):
    target_type: str  # ROOM / USER / ROOMMATE_POST
    target_id: int
    reason: str = ""
    description: str = ""
