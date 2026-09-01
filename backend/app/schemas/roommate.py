"""Schemas cho bài đăng tìm phòng / tìm người ở ghép."""
from typing import Optional

from pydantic import BaseModel, Field


class RoommatePostCreate(BaseModel):
    post_type: str  # LOOKING_ROOM / LOOKING_ROOMMATE
    title: str = Field(min_length=5, max_length=200)
    description: str = ""
    city: str = "Hà Nội"
    district: str
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    gender_pref: str = "ANY"
    num_people: int = 1
    move_in_date: str = ""
    school: str = ""
    workplace: str = ""
    desired_amenities: list[str] = []
    room_price: Optional[int] = None
    current_people: int = 0
    needed_people: int = 1
    cost_per_person: Optional[int] = None
    room_area: Optional[float] = None
    room_address: str = ""
    images: list[str] = []


class RoommatePostUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    district: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    gender_pref: Optional[str] = None
    num_people: Optional[int] = None
    move_in_date: Optional[str] = None
    desired_amenities: Optional[list[str]] = None
    status: Optional[str] = None
    images: Optional[list[str]] = None
