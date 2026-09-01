"""API ở ghép: /api/roommates (bài đăng + AI match)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import require_auth
from app.core.exceptions import ForbiddenError
from app.database import get_db
from app.models.user import User
from app.schemas.common import ok, paginated
from app.schemas.roommate import RoommatePostCreate, RoommatePostUpdate
from app.services import roommate_service
from app.services.ai_service import match_roommates
from app.services.serializers import roommate_post_to_dict

router = APIRouter(prefix="/roommates", tags=["roommates"])


@router.get("")
def list_posts(
    keyword: Optional[str] = None,
    post_type: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
    gender_pref: Optional[str] = None,
    budget_max: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    filters = {k: v for k, v in {
        "keyword": keyword, "post_type": post_type, "city": city,
        "district": district, "gender_pref": gender_pref, "budget_max": budget_max,
    }.items() if v is not None}
    posts, total = roommate_service.search_posts(db, filters, page, page_size)
    return paginated([roommate_post_to_dict(p) for p in posts], total, page, page_size)


@router.get("/my-posts")
def my_posts(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    from app.models.roommate import RoommatePost
    posts = db.query(RoommatePost).filter(RoommatePost.user_id == user.id)\
        .order_by(RoommatePost.created_at.desc()).all()
    return ok([roommate_post_to_dict(p) for p in posts])


@router.post("")
def create_post(data: RoommatePostCreate, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    post = roommate_service.create_post(db, user, data)
    return ok(roommate_post_to_dict(post), "Đăng bài thành công!")


@router.get("/{post_id}")
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = roommate_service.get_post_or_404(db, post_id)
    return ok(roommate_post_to_dict(post))


@router.get("/{post_id}/ai-match")
def ai_match(post_id: int, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """AI Match: tính điểm phù hợp với các bài đăng khác."""
    post = roommate_service.get_post_or_404(db, post_id)
    matches = match_roommates(db, post)
    return ok({"source_post": roommate_post_to_dict(post), "matches": matches})


@router.put("/{post_id}")
def update_post(post_id: int, data: RoommatePostUpdate,
                user: User = Depends(require_auth), db: Session = Depends(get_db)):
    post = roommate_service.get_post_or_404(db, post_id)
    if post.user_id != user.id and not user.has_role("ADMIN"):
        raise ForbiddenError("Bạn không sở hữu bài đăng này")
    post = roommate_service.update_post(db, post, data)
    return ok(roommate_post_to_dict(post), "Cập nhật bài đăng thành công")


@router.delete("/{post_id}")
def delete_post(post_id: int, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    post = roommate_service.get_post_or_404(db, post_id)
    if post.user_id != user.id and not user.has_role("ADMIN"):
        raise ForbiddenError("Bạn không sở hữu bài đăng này")
    roommate_service.delete_post(db, post)
    return ok(message="Xoá bài đăng thành công")


@router.post("/{post_id}/report")
def report_post(post_id: int, db: Session = Depends(get_db),
                user: User = Depends(require_auth)):
    from app.schemas.room import ReportCreateRequest
    from app.services.chat_service import create_report
    data = ReportCreateRequest(target_type="ROOMMATE_POST", target_id=post_id)
    report = create_report(db, user, data)
    return ok({"report_id": report.id}, "Cảm ơn bạn! Báo cáo đã được gửi.")
