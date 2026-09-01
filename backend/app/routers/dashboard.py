"""API dashboard: /api/dashboard (Landlord + Tenant)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload

from app.core.deps import require_auth
from app.core.exceptions import ForbiddenError
from app.database import get_db
from app.models.user import User
from app.schemas.common import ok
from app.services import stats_service
from app.services.serializers import (contract_to_dict, invoice_to_dict, maintenance_to_dict,
                                      meter_to_dict, room_to_dict)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Eager-load đầy đủ để tránh N+1 queries khi serialize (SQLite nhanh nên không lộ,
# nhưng qua Supabase pooler mỗi query ~100-300ms -> trước đây dashboard mất ~38s,
# vượt timeout của frontend nên dashboard chỉ hiện skeleton/error).

def _user_loads():
    """Eager-load roles để user_public() không lazy-load từng user."""
    from app.models.user import User
    return selectinload(User.roles)


def _room_loads():
    from app.models.room import Room
    return (
        selectinload(Room.images),
        selectinload(Room.amenities),
        selectinload(Room.landlord).selectinload(User.roles),
    )


def _contract_loads():
    from app.models.contract import Contract
    from app.models.room import Room
    from app.models.user import User
    return (
        selectinload(Contract.room).selectinload(Room.images),
        selectinload(Contract.room).selectinload(Room.amenities),
        selectinload(Contract.room).selectinload(Room.landlord).selectinload(User.roles),
        selectinload(Contract.tenant).selectinload(User.roles),
        selectinload(Contract.landlord).selectinload(User.roles),
    )


def _invoice_loads():
    from app.models.invoice import Invoice
    from app.models.room import Room
    from app.models.user import User
    return (
        selectinload(Invoice.room).selectinload(Room.images),
        selectinload(Invoice.room).selectinload(Room.amenities),
        selectinload(Invoice.room).selectinload(Room.landlord).selectinload(User.roles),
        selectinload(Invoice.tenant).selectinload(User.roles),
        selectinload(Invoice.landlord).selectinload(User.roles),
        selectinload(Invoice.items),
    )


def _maintenance_loads():
    from app.models.maintenance import MaintenanceRequest
    from app.models.room import Room
    from app.models.user import User
    return (
        selectinload(MaintenanceRequest.room).selectinload(Room.images),
        selectinload(MaintenanceRequest.room).selectinload(Room.amenities),
        selectinload(MaintenanceRequest.room).selectinload(Room.landlord).selectinload(User.roles),
        selectinload(MaintenanceRequest.tenant).selectinload(User.roles),
        selectinload(MaintenanceRequest.landlord).selectinload(User.roles),
    )


@router.get("/landlord/revenue")
def landlord_revenue(
    months: int = Query(6, ge=1, le=24),
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Chi tiết doanh thu của chủ nhà đang đăng nhập (RBAC: LANDLORD/ADMIN)."""
    if not user.has_any_role("LANDLORD", "ADMIN"):
        raise ForbiddenError("Bạn không phải chủ nhà")
    return ok(stats_service.revenue_detail(db, months=months, landlord_id=user.id))


@router.get("/landlord")
def landlord_dashboard(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Tổng quan cho chủ nhà: thống kê + phòng + hợp đồng + hoá đơn + sửa chữa."""
    from app.models.contract import Contract
    from app.models.invoice import Invoice
    from app.models.maintenance import MaintenanceRequest
    from app.models.room import Room

    if not user.has_any_role("LANDLORD", "ADMIN"):
        return ok({"error": "Bạn không phải chủ nhà"})

    overview = stats_service.landlord_overview(db, user.id)
    charts = stats_service.landlord_charts(db, user.id)
    rooms = db.query(Room).options(*_room_loads())\
        .filter(Room.landlord_id == user.id).order_by(Room.created_at.desc()).all()
    contracts = db.query(Contract).options(*_contract_loads())\
        .filter(Contract.landlord_id == user.id)\
        .order_by(Contract.created_at.desc()).limit(10).all()
    invoices = db.query(Invoice).options(*_invoice_loads())\
        .filter(Invoice.landlord_id == user.id)\
        .order_by(Invoice.period.desc()).limit(10).all()
    maintenance = db.query(MaintenanceRequest).options(*_maintenance_loads())\
        .filter(MaintenanceRequest.landlord_id == user.id)\
        .order_by(MaintenanceRequest.created_at.desc()).limit(10).all()

    # Booking requests cho landlord
    from app.models.rental import RentalRequest
    bookings_raw = db.query(RentalRequest).filter(
        RentalRequest.landlord_id == user.id
    ).order_by(RentalRequest.created_at.desc()).limit(20).all()
    bookings = []
    for b in bookings_raw:
        bookings.append({
            "id": b.id, "room_id": b.room_id,
            "seeker": {"id": b.seeker_id, "full_name": b.seeker.full_name if b.seeker else "", "phone": b.seeker.phone if b.seeker else "", "avatar_url": b.seeker.avatar_url if b.seeker else None},
            "room": {"id": b.room.id, "title": b.room.title, "price": b.room.price, "images": [{"image_url": b.room.images[0].image_url}] if b.room.images else []} if b.room else None,
            "message": b.message, "move_in_date": b.move_in_date,
            "lease_duration": b.lease_duration, "deposit_amount": b.deposit_amount,
            "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })

    return ok({
        "overview": overview,
        "charts": charts,
        "rooms": [room_to_dict(r) for r in rooms],
        "contracts": [contract_to_dict(c) for c in contracts],
        "invoices": [invoice_to_dict(i) for i in invoices],
        "maintenance": [maintenance_to_dict(m) for m in maintenance],
        "bookings": bookings,
    })


@router.get("/tenant")
def tenant_dashboard(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Tổng quan cho người thuê: phòng, hoá đơn, điện nước, sửa chữa."""
    if not user.has_any_role("TENANT", "ADMIN"):
        return ok({"error": "Bạn không phải người thuê"})

    data = stats_service.tenant_overview(db, user.id)

    # Booking requests cho tenant
    from app.models.rental import RentalRequest
    bookings_raw = db.query(RentalRequest).filter(
        RentalRequest.seeker_id == user.id
    ).order_by(RentalRequest.created_at.desc()).limit(20).all()
    bookings = []
    for b in bookings_raw:
        bookings.append({
            "id": b.id, "room_id": b.room_id,
            "room": {"id": b.room.id, "title": b.room.title, "price": b.room.price, "images": [{"image_url": b.room.images[0].image_url}] if b.room.images else []} if b.room else None,
            "landlord": {"full_name": b.room.landlord.full_name if b.room and b.room.landlord else ""} if b.room else None,
            "message": b.message, "move_in_date": b.move_in_date,
            "lease_duration": b.lease_duration, "deposit_amount": b.deposit_amount,
            "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })

    return ok({
        "contract": contract_to_dict(data["contract"]) if data["contract"] else None,
        "room": room_to_dict(data["room"]) if data["room"] else None,
        "current_invoice": invoice_to_dict(data["current_invoice"]) if data["current_invoice"] else None,
        "invoices": [invoice_to_dict(i) for i in data["invoices"]],
        "total_unpaid": data["total_unpaid"],
        "meters": [meter_to_dict(m) for m in data["meters"]],
        "maintenance": [maintenance_to_dict(m) for m in data["maintenance"]],
        "bookings": bookings,
    })
