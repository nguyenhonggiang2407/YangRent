"""Response format thống nhất + các schema dùng chung."""
from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Envelope chuẩn: {"success": true, "data": ..., "message": "..."}"""
    success: bool = True
    data: Optional[T] = None
    message: str = "Success"


class PaginatedData(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[PaginatedData[T]] = None
    message: str = "Success"


def ok(data: Any = None, message: str = "Success") -> dict:
    return {"success": True, "data": data, "message": message}


def paginated(items: list, total: int, page: int, page_size: int) -> dict:
    return {
        "success": True,
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size else 0,
        },
        "message": "Success",
    }
