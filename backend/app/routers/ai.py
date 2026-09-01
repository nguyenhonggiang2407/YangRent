"""API AI: /api/ai (recommend, match, ocr, analysis).

Tất cả logic AI nằm trong services - route chỉ là lớp HTTP.
"""
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_auth
from app.database import get_db
from app.models.user import User
from app.schemas.common import ok
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/recommend")
def recommend(
    budget: Optional[int] = None,
    district: Optional[str] = None,
    room_type: Optional[str] = None,
    limit: int = 6,
    db: Session = Depends(get_db),
):
    """YangMatch gợi ý chỗ ở phù hợp bằng rule-based scoring."""
    rooms = ai_service.recommend_rooms(db, budget=budget, district=district,
                                       room_type=room_type, limit=limit)
    return ok({"items": rooms, "note": "YangMatch xếp hạng theo ngân sách, khu vực và loại chỗ ở (rule-based scoring)"})


@router.get("/ocr")
def ocr(image_url: str, db: Session = Depends(get_db)):
    """Đọc chỉ số công tơ từ ảnh (mock OCR, sẵn sàng thay model thật)."""
    return ok(ai_service.ocr_read_meter(image_url))


@router.get("/suspicious/{room_id}")
def suspicious(room_id: int, db: Session = Depends(get_db)):
    """Đánh giá rủi ro tin đăng (dùng cho admin moderation)."""
    from app.services.room_service import get_room_or_404
    room = get_room_or_404(db, room_id)
    return ok(ai_service.suspicious_score(room))
