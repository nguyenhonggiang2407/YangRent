"""Schemas cho chat + thông báo."""
from typing import Optional

from pydantic import BaseModel, Field


class ConversationStartRequest(BaseModel):
    user_id: int
    room_id: Optional[int] = None
    initial_message: str = ""


class MessageSendRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
