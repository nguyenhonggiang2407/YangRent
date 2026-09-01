"""API chỗ ở cho thuê: /api/rooms

- Tìm kiếm công khai (filter/sort/pagination)
- CRUD: LANDLORD (chủ phòng) hoặc ADMIN
- Ownership check BẮT BUỘC ở backend
- Favorite + Report
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import require_admin, require_auth, require_landlord, require_tenant
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.database import get_db
from app.models.room import Amenity, Room
from app.models.user import User
from app.schemas.common import ok, paginated
from app.schemas.management import BookingCreateRequest
from app.schemas.room import ReportCreateRequest, RoomCreateRequest, RoomUpdateRequest
from app.services import room_service
from app.services.serializers import room_to_dict

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("")
def list_rooms(
    keyword: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
    price_min: Optional[int] = None,
    price_max: Optional[int] = None,
    area_min: Optional[float] = None,
    area_max: Optional[float] = None,
    room_type: Optional[str] = None,
    bathroom_type: Optional[str] = None,
    furnished: Optional[str] = None,
    wifi: Optional[str] = None,
    ac: Optional[str] = None,
    parking: Optional[str] = None,
    amenity_ids: Optional[str] = None,
    sw_lat: Optional[float] = None,
    sw_lng: Optional[float] = None,
    ne_lat: Optional[float] = None,
    ne_lng: Optional[float] = None,
    sort: str = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Tìm kiếm phòng công khai với bộ lọc đầy đủ."""
    filters = {k: v for k, v in {
        "keyword": keyword, "city": city, "district": district,
        "price_min": price_min, "price_max": price_max,
        "area_min": area_min, "area_max": area_max,
        "room_type": room_type, "bathroom_type": bathroom_type,
        "furnished": furnished, "wifi": wifi, "ac": ac, "parking": parking,
        "amenity_ids": amenity_ids,
        "sw_lat": sw_lat, "sw_lng": sw_lng, "ne_lat": ne_lat, "ne_lng": ne_lng,
    }.items() if v is not None}

    rooms, total = room_service.search_rooms(db, filters, sort, page, page_size)
    return paginated([room_to_dict(r) for r in rooms], total, page, page_size)


@router.get("/meta")
def room_meta(db: Session = Depends(get_db)):
    """Danh sách amenity + khu vực cho form filter."""
    amenities = db.query(Amenity).order_by(Amenity.id).all()
    return ok({
        "amenities": [{"id": a.id, "name": a.name, "icon": a.icon} for a in amenities],
        "districts_hanoi": room_service.DISTRICTS_HANOI,
        "districts_hcmc": room_service.DISTRICTS_HCMC,
    })


@router.get("/featured")
def featured_rooms(limit: int = 8, db: Session = Depends(get_db)):
    rooms = db.query(Room).filter(
        Room.is_featured == True,  # noqa: E712
        Room.moderation_status == "APPROVED",
    ).order_by(Room.created_at.desc()).limit(limit).all()
    return ok([room_to_dict(r) for r in rooms])


@router.get("/favorites/me")
def my_favorites(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    rooms = room_service.get_favorite_rooms(db, user)
    return ok([room_to_dict(r) for r in rooms])


@router.get("/{room_id}")
def get_room(room_id: int, db: Session = Depends(get_db)):
    room = room_service.get_room_or_404(db, room_id)
    room_service.increment_view(db, room)
    return ok(room_to_dict(room))


# ---------- CRUD (Landlord / Admin) ----------
@router.post("")
def create_room(data: RoomCreateRequest, user: User = Depends(require_landlord), db: Session = Depends(get_db)):
    room = room_service.create_room(db, user, data)
    return ok(room_to_dict(room), "Đăng tin thành công! Bài đăng đang chờ quản trị viên duyệt.")


def _check_ownership(room, user: User):
    """Ownership check: chỉ chủ phòng hoặc admin được sửa/xoá."""
    if not user.has_role("ADMIN") and room.landlord_id != user.id:
        raise ForbiddenError("Bạn không sở hữu chỗ ở này")


@router.put("/{room_id}")
def update_room(room_id: int, data: RoomUpdateRequest,
                user: User = Depends(require_landlord), db: Session = Depends(get_db)):
    room = room_service.get_room_or_404(db, room_id)
    _check_ownership(room, user)
    room = room_service.update_room(db, room, data)
    return ok(room_to_dict(room), "Cập nhật chỗ ở thành công")


@router.delete("/{room_id}")
def delete_room(room_id: int, user: User = Depends(require_landlord), db: Session = Depends(get_db)):
    room = room_service.get_room_or_404(db, room_id)
    _check_ownership(room, user)
    room_service.delete_room(db, room)
    return ok(message="Xoá chỗ ở thành công")


# ---------- Favorite ----------
@router.post("/{room_id}/favorite")
def toggle_favorite(room_id: int, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    result = room_service.toggle_favorite(db, user, room_id)
    return ok(result)


# ---------- Booking (giữ chỗ) ----------
@router.post("/{room_id}/book")
def book_room(room_id: int, data: BookingCreateRequest,
              user: User = Depends(require_auth), db: Session = Depends(get_db)):
    from app.models.rental import RentalRequest
    from app.services.chat_service import create_notification
    room = room_service.get_room_or_404(db, room_id)
    if room.status != "AVAILABLE":
        raise ConflictError("Chỗ ở hiện không khả dụng để giữ chỗ")
    existing = db.query(RentalRequest).filter(RentalRequest.room_id == room_id, RentalRequest.status == "PENDING").first()
    if existing:
        raise ConflictError("Chỗ ở này đã có yêu cầu giữ chỗ đang chờ xử lý")
    booking = RentalRequest(room_id=room_id, seeker_id=user.id, landlord_id=room.landlord_id,
        message=data.message, move_in_date=data.move_in_date,
        lease_duration=data.lease_duration, deposit_amount=data.deposit_amount, status="PENDING")
    db.add(booking)
    db.commit()
    db.refresh(booking)
    create_notification(db, room.landlord_id, "Yêu cầu giữ chỗ mới",
        f"{user.full_name} muốn giữ chỗ {room.title}", "BOOKING")
    return ok({"id": booking.id}, "Yêu cầu giữ chỗ đã được gửi")


@router.get("/{room_id}/bookings")
def room_bookings(room_id: int, user: User = Depends(require_landlord), db: Session = Depends(get_db)):
    from app.models.rental import RentalRequest
    room = room_service.get_room_or_404(db, room_id)
    if room.landlord_id != user.id and not user.has_role("ADMIN"):
        raise ForbiddenError("Bạn không có quyền thực hiện thao tác này")
    bookings = db.query(RentalRequest).filter(RentalRequest.room_id == room_id).order_by(RentalRequest.created_at.desc()).all()
    return ok([{"id": b.id, "seeker": {"id": b.seeker_id, "full_name": b.seeker.full_name if b.seeker else "", "phone": b.seeker.phone if b.seeker else ""},
        "message": b.message, "move_in_date": b.move_in_date, "lease_duration": b.lease_duration,
        "deposit_amount": b.deposit_amount, "status": b.status,
        "created_at": b.created_at.isoformat() if b.created_at else None} for b in bookings])


@router.put("/bookings/{booking_id}/accept")
def accept_booking(booking_id: int, user: User = Depends(require_landlord), db: Session = Depends(get_db)):
    from app.models.rental import RentalRequest
    from app.services.chat_service import create_notification
    booking = db.query(RentalRequest).filter(RentalRequest.id == booking_id).first()
    if not booking:
        raise NotFoundError("Không tìm thấy yêu cầu")
    room = db.query(Room).filter(Room.id == booking.room_id).first()
    if not room or room.landlord_id != user.id:
        raise ForbiddenError("Bạn không có quyền thực hiện thao tác này")
    if booking.status != "PENDING":
        raise ConflictError("Yêu cầu đã được xử lý")
    booking.status = "ACCEPTED"
    room.status = "RESERVED"
    db.commit()
    create_notification(db, booking.seeker_id, "Yêu cầu giữ chỗ được chấp nhận",
        f"Chủ nhà đã chấp nhận yêu cầu giữ chỗ {room.title}.", "BOOKING")
    return ok(message="Đã chấp nhận yêu cầu giữ chỗ")


@router.put("/bookings/{booking_id}/reject")
def reject_booking(booking_id: int, user: User = Depends(require_landlord), db: Session = Depends(get_db)):
    from app.models.rental import RentalRequest
    from app.services.chat_service import create_notification
    booking = db.query(RentalRequest).filter(RentalRequest.id == booking_id).first()
    if not booking:
        raise NotFoundError("Không tìm thấy yêu cầu")
    room = db.query(Room).filter(Room.id == booking.room_id).first()
    if not room or room.landlord_id != user.id:
        raise ForbiddenError("Bạn không có quyền thực hiện thao tác này")
    if booking.status != "PENDING":
        raise ConflictError("Yêu cầu đã được xử lý")
    booking.status = "REJECTED"
    db.commit()
    create_notification(db, booking.seeker_id, "Yêu cầu giữ chỗ bị từ chối",
        f"Chủ nhà đã từ chối yêu cầu giữ chỗ {room.title}.", "BOOKING")
    return ok(message="Đã từ chối yêu cầu giữ chỗ")


@router.get("/bookings/me")
def my_bookings(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    from app.models.rental import RentalRequest
    bookings = db.query(RentalRequest).filter(
        (RentalRequest.seeker_id == user.id) | (RentalRequest.landlord_id == user.id)
    ).order_by(RentalRequest.created_at.desc()).all()
    result = []
    for b in bookings:
        result.append({"id": b.id, "room": room_to_dict(b.room) if b.room else None,
            "seeker": {"id": b.seeker_id, "full_name": b.seeker.full_name if b.seeker else ""},
            "landlord_id": b.landlord_id, "message": b.message,
            "move_in_date": b.move_in_date, "lease_duration": b.lease_duration,
            "deposit_amount": b.deposit_amount, "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None})
    return ok(result)


# ---------- Report ----------
@router.post("/{room_id}/report")
def report_room(room_id: int, data: ReportCreateRequest,
                user: User = Depends(require_auth), db: Session = Depends(get_db)):
    from app.services.chat_service import create_report
    report = create_report(db, user, data)
    return ok({"report_id": report.id}, "Cảm ơn bạn! Báo cáo đã được gửi tới đội ngũ quản trị.")
