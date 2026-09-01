"""API Admin: /api/admin (chỉ ADMIN).

Bao gồm: thống kê, quản lý user, duyệt bài, xử lý report.
Mọi endpoint đều yêu cầu role ADMIN ở backend.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.core.exceptions import NotFoundError
from app.database import get_db
from app.models.report import Report
from app.models.room import Room
from app.models.roommate import RoommatePost
from app.models.user import Role, User, user_roles
from app.schemas.admin import ModerationUpdate, ReportStatusUpdate, UserStatusUpdate
from app.schemas.common import ok, paginated
from app.services import stats_service
from app.services.ai_service import suspicious_score
from app.services.serializers import report_to_dict, room_to_dict, roommate_post_to_dict

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
def overview(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    return ok(stats_service.admin_overview(db))


@router.get("/charts")
def charts(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    return ok(stats_service.admin_charts(db))


@router.get("/revenue")
def admin_revenue(months: int = Query(6, ge=1, le=24),
                  db: Session = Depends(get_db), user: User = Depends(require_admin)):
    """Chi tiết doanh thu toàn hệ thống (chỉ ADMIN)."""
    return ok(stats_service.revenue_detail(db, months=months))


# ---------- Users ----------
@router.get("/users")
def list_users(
    role: Optional[str] = None,
    keyword: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    query = db.query(User)
    if role:
        query = query.join(User.roles).filter(Role.name == role)
    if status:
        query = query.filter(User.status == status)
    if keyword:
        kw = f"%{keyword}%"
        query = query.filter((User.full_name.ilike(kw)) | (User.email.ilike(kw)))
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return paginated([u.to_public_dict() for u in users], total, page, page_size)


@router.put("/users/{user_id}/status")
def update_user_status(user_id: int, data: UserStatusUpdate,
                       db: Session = Depends(get_db), user: User = Depends(require_admin)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise NotFoundError("Không tìm thấy người dùng")
    target.status = data.status
    db.commit()
    db.refresh(target)
    return ok(target.to_public_dict(), "Cập nhật trạng thái thành công")


# ---------- Rooms (moderation) ----------
@router.get("/rooms")
def list_all_rooms(
    moderation_status: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    query = db.query(Room)
    if moderation_status:
        query = query.filter(Room.moderation_status == moderation_status)
    if status:
        query = query.filter(Room.status == status)
    total = query.count()
    rooms = query.order_by(Room.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return paginated([room_to_dict(r) for r in rooms], total, page, page_size)


@router.put("/rooms/{room_id}/moderation")
def moderate_room(room_id: int, data: ModerationUpdate,
                  db: Session = Depends(get_db), user: User = Depends(require_admin)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise NotFoundError("Không tìm thấy phòng")
    room.moderation_status = data.moderation_status
    db.commit()
    db.refresh(room)
    return ok({
        **room_to_dict(room),
        "ai_risk": suspicious_score(room),
    }, "Cập nhật trạng thái duyệt thành công")


@router.delete("/rooms/{room_id}")
def admin_delete_room(room_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise NotFoundError("Không tìm thấy phòng")
    db.delete(room)
    db.commit()
    return ok(message="Đã xoá phòng vi phạm")


# ---------- Roommate posts ----------
@router.get("/roommate-posts")
def list_all_posts(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    posts = db.query(RoommatePost).order_by(RoommatePost.created_at.desc()).all()
    return ok([roommate_post_to_dict(p) for p in posts])


# ---------- Reports ----------
@router.get("/reports")
def list_reports(status: Optional[str] = None, db: Session = Depends(get_db),
                 user: User = Depends(require_admin)):
    query = db.query(Report)
    if status:
        query = query.filter(Report.status == status)
    reports = query.order_by(Report.created_at.desc()).all()
    return ok([report_to_dict(r) for r in reports])


@router.put("/reports/{report_id}/status")
def update_report(report_id: int, data: ReportStatusUpdate,
                  db: Session = Depends(get_db), user: User = Depends(require_admin)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise NotFoundError("Không tìm thấy báo cáo")
    report.status = data.status
    report.handled_by = user.id
    db.commit()
    db.refresh(report)
    return ok(report_to_dict(report), "Cập nhật báo cáo thành công")
