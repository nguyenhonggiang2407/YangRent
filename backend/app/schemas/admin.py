"""Schemas cho admin: duyệt bài, xử lý report, quản lý user."""
from typing import Optional

from pydantic import BaseModel


class ModerationUpdate(BaseModel):
    moderation_status: str  # PENDING/APPROVED/REJECTED


class ReportStatusUpdate(BaseModel):
    status: str  # PENDING/REVIEWING/RESOLVED/REJECTED


class UserStatusUpdate(BaseModel):
    status: str  # ACTIVE / BANNED
