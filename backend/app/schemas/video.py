"""Bounded JSON payloads for existing video-link endpoints."""
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, field_validator


class VideoURLRequest(BaseModel):
    room_id: int | None = Field(default=None, gt=0)
    video_url: str = Field(min_length=1, max_length=500)
    title: str = Field(default="", max_length=200)

    @field_validator("video_url")
    @classmethod
    def valid_video_url(cls, value: str) -> str:
        value = value.strip()
        if any(ord(char) < 32 for char in value):
            raise ValueError("URL video không hợp lệ")
        try:
            parsed = urlsplit(value)
            valid = parsed.scheme in {"http", "https"} and parsed.hostname and not parsed.username and not parsed.password
            parsed.port  # Reject malformed port values too.
        except ValueError:
            valid = False
        if not valid:
            raise ValueError("Dùng URL video đầy đủ với http hoặc https")
        return value

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        return value.strip()


class RoomVideoRequest(VideoURLRequest):
    room_id: int = Field(gt=0)
