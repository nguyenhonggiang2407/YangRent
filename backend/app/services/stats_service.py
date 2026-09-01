"""Thống kê cho Admin / Landlord / Tenant dashboards."""
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.contract import Contract
from app.models.invoice import Invoice
from app.models.maintenance import MaintenanceRequest
from app.models.meter import MeterReading
from app.models.room import Room
from app.models.roommate import RoommatePost
from app.models.report import Report
from app.models.user import User


# ---------- ADMIN ----------
def admin_overview(db: Session) -> dict:
    total_users = db.query(User).count()
    # Đếm landlord/tenant qua bảng user_roles
    from app.models.user import user_roles, Role
    total_landlords = db.query(func.count(func.distinct(user_roles.c.user_id))).join(
        Role, Role.id == user_roles.c.role_id
    ).filter(Role.name == "LANDLORD").scalar() or 0
    total_tenants = db.query(func.count(func.distinct(user_roles.c.user_id))).join(
        Role, Role.id == user_roles.c.role_id
    ).filter(Role.name == "TENANT").scalar() or 0

    total_rooms = db.query(Room).count()
    rooms_available = db.query(Room).filter(Room.status == "AVAILABLE").count()
    rooms_rented = db.query(Room).filter(Room.status == "RENTED").count()
    rooms_pending = db.query(Room).filter(Room.moderation_status == "PENDING").count()

    total_contracts = db.query(Contract).count()
    active_contracts = db.query(Contract).filter(Contract.status == "ACTIVE").count()

    revenue = db.query(func.sum(Invoice.total_amount)).filter(Invoice.status == "PAID").scalar() or 0
    pending_invoices = db.query(Invoice).filter(Invoice.status == "PENDING").count()

    roommate_posts = db.query(RoommatePost).count()
    pending_reports = db.query(Report).filter(Report.status == "PENDING").count()

    return {
        "total_users": total_users,
        "total_landlords": total_landlords,
        "total_tenants": total_tenants,
        "total_rooms": total_rooms,
        "rooms_available": rooms_available,
        "rooms_rented": rooms_rented,
        "rooms_pending": rooms_pending,
        "total_contracts": total_contracts,
        "active_contracts": active_contracts,
        "revenue": revenue,
        "pending_invoices": pending_invoices,
        "roommate_posts": roommate_posts,
        "pending_reports": pending_reports,
    }


def admin_charts(db: Session) -> dict:
    """Dữ liệu biểu đồ: revenue 6 tháng, user growth, room occupancy."""
    months = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        d = now - timedelta(days=30 * i)
        months.append(d.strftime("%Y-%m"))

    # Doanh thu theo tháng: 1 query GROUP BY thay vì loop 6 query
    rev_rows = db.query(Invoice.period, func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
        Invoice.status == "PAID", Invoice.period.in_(months)
    ).group_by(Invoice.period).all()
    rev_map = dict(rev_rows)
    revenue_by_month = [{"month": m, "revenue": rev_map.get(m, 0)} for m in months]

    # User growth: 1 query GROUP BY tháng
    from sqlalchemy import extract
    user_growth = []
    if months:
        ym = func.to_char(User.created_at, 'YYYY-MM')
        try:
            user_rows = db.query(ym, func.count(User.id)).filter(
                User.created_at >= datetime.strptime(months[0] + "-01", "%Y-%m-%d")
            ).group_by(ym).all()
            user_map = {k: v for k, v in user_rows}
        except Exception:
            # SQLite fallback (không có to_char)
            user_map = {}
            for m in months:
                start = datetime.strptime(m + "-01", "%Y-%m-%d")
                end = (start + timedelta(days=32)).replace(day=1)
                user_map[m] = db.query(User).filter(User.created_at >= start, User.created_at < end).count()
        user_growth = [{"month": m, "users": user_map.get(m, 0)} for m in months]

    # Room occupancy theo trạng thái
    occupancy = [
        {"name": "Đang trống", "value": db.query(Room).filter(Room.status == "AVAILABLE").count()},
        {"name": "Đang cho thuê", "value": db.query(Room).filter(Room.status == "RENTED").count()},
        {"name": "Đã giữ chỗ", "value": db.query(Room).filter(Room.status == "RESERVED").count()},
        {"name": "Ẩn", "value": db.query(Room).filter(Room.status == "HIDDEN").count()},
    ]

    payment_status = [
        {"name": "Đã thanh toán", "value": db.query(Invoice).filter(Invoice.status == "PAID").count()},
        {"name": "Chờ thanh toán", "value": db.query(Invoice).filter(Invoice.status == "PENDING").count()},
        {"name": "Quá hạn", "value": db.query(Invoice).filter(Invoice.status == "EXPIRED").count()},
    ]

    return {
        "revenue_by_month": revenue_by_month,
        "user_growth": user_growth,
        "room_occupancy": occupancy,
        "payment_status": payment_status,
    }


# ---------- LANDLORD ----------
def landlord_overview(db: Session, landlord_id: int) -> dict:
    rooms = db.query(Room).filter(Room.landlord_id == landlord_id).all()
    room_ids = [r.id for r in rooms] or [-1]

    total_rooms = len(rooms)
    rooms_available = sum(1 for r in rooms if r.status == "AVAILABLE")
    rooms_rented = sum(1 for r in rooms if r.status == "RENTED")

    revenue = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.landlord_id == landlord_id, Invoice.status == "PAID"
    ).scalar() or 0

    unpaid = db.query(Invoice).filter(
        Invoice.landlord_id == landlord_id, Invoice.status == "PENDING"
    ).count()

    maintenance = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.landlord_id == landlord_id,
        MaintenanceRequest.status.in_(["PENDING", "IN_PROGRESS"]),
    ).count()

    tenants = db.query(func.count(func.distinct(Contract.tenant_id))).filter(
        Contract.landlord_id == landlord_id, Contract.status == "ACTIVE"
    ).scalar() or 0

    return {
        "total_rooms": total_rooms,
        "rooms_available": rooms_available,
        "rooms_rented": rooms_rented,
        "revenue": revenue,
        "unpaid_invoices": unpaid,
        "maintenance_pending": maintenance,
        "active_tenants": tenants,
    }


# ---------- TENANT ----------
def tenant_overview(db: Session, tenant_id: int) -> dict:
    # Eager-load để tránh N+1 khi serialize (quan trọng khi DB ở xa như Supabase)
    from sqlalchemy.orm import selectinload
    from app.models.user import User

    def u_loads():
        return selectinload(User.roles)

    contract = db.query(Contract).options(
        selectinload(Contract.room).selectinload(Room.images),
        selectinload(Contract.room).selectinload(Room.amenities),
        selectinload(Contract.room).selectinload(Room.landlord).selectinload(User.roles),
        selectinload(Contract.landlord).selectinload(User.roles),
        selectinload(Contract.tenant).selectinload(User.roles),
    ).filter(Contract.tenant_id == tenant_id, Contract.status == "ACTIVE").first()

    room = contract.room if contract else None
    invoices = db.query(Invoice).options(
        selectinload(Invoice.room).selectinload(Room.images),
        selectinload(Invoice.room).selectinload(Room.amenities),
        selectinload(Invoice.room).selectinload(Room.landlord).selectinload(User.roles),
        selectinload(Invoice.tenant).selectinload(User.roles),
        selectinload(Invoice.landlord).selectinload(User.roles),
        selectinload(Invoice.items),
    ).filter(Invoice.tenant_id == tenant_id)\
        .order_by(Invoice.period.desc()).limit(24).all()

    current_invoice = None
    total_unpaid = 0
    for inv in invoices:
        if inv.status == "PENDING":
            total_unpaid += inv.total_amount
            if current_invoice is None:
                current_invoice = inv

    meters = db.query(MeterReading).filter(
        MeterReading.room_id == (room.id if room else -1)
    ).order_by(MeterReading.period.desc()).limit(6).all()

    maintenance = db.query(MaintenanceRequest).options(
        selectinload(MaintenanceRequest.room).selectinload(Room.images),
        selectinload(MaintenanceRequest.room).selectinload(Room.amenities),
        selectinload(MaintenanceRequest.room).selectinload(Room.landlord).selectinload(User.roles),
        selectinload(MaintenanceRequest.tenant).selectinload(User.roles),
        selectinload(MaintenanceRequest.landlord).selectinload(User.roles),
    ).filter(MaintenanceRequest.tenant_id == tenant_id)\
        .order_by(MaintenanceRequest.created_at.desc()).limit(5).all()

    return {
        "contract": contract,
        "room": room,
        "current_invoice": current_invoice,
        "invoices": invoices,
        "total_unpaid": total_unpaid,
        "meters": meters,
        "maintenance": maintenance,
    }


def landlord_charts(db: Session, landlord_id: int) -> dict:
    """Doanh thu 6 tháng + tỷ lệ lấp đầy của chủ nhà.

    Dùng GROUP BY (1 query) thay vì loop 6 query để giảm round-trip tới DB.
    """
    now = datetime.utcnow()
    months = [(now - timedelta(days=30 * i)).strftime("%Y-%m") for i in range(5, -1, -1)]

    rows = db.query(Invoice.period, func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
        Invoice.landlord_id == landlord_id, Invoice.status == "PAID",
        Invoice.period.in_(months),
    ).group_by(Invoice.period).all()
    rev_map = dict(rows)
    revenue = [{"month": m, "revenue": rev_map.get(m, 0)} for m in months]

    rooms = db.query(Room).filter(Room.landlord_id == landlord_id).all()
    rented = sum(1 for r in rooms if r.status == "RENTED")
    fill_rate = round(rented / len(rooms) * 100, 1) if rooms else 0

    return {"revenue_by_month": revenue, "fill_rate": fill_rate}


def revenue_detail(db: Session, months: int = 6, landlord_id: Optional[int] = None) -> dict:
    """Chi tiết doanh thu (landlord hoặc toàn hệ thống nếu landlord_id=None).

    Chỉ tính trên hóa đơn thực tế trong database (không phải dữ liệu giả):
    - Tổng doanh thu (hóa đơn PAID)
    - Phân theo loại phí: tiền phòng, điện, nước, internet, dịch vụ, phí khác
    - Theo tháng (N tháng gần nhất)
    - Số hóa đơn theo trạng thái
    - Danh sách hóa đơn đã thanh toán gần đây
    """
    base = db.query(Invoice)
    if landlord_id is not None:
        base = base.filter(Invoice.landlord_id == landlord_id)
    paid_base = base.filter(Invoice.status == "PAID")

    # Tổng doanh thu + breakdown theo loại phí: gộp vào 1 query aggregate
    row = paid_base.with_entities(
        func.coalesce(func.sum(Invoice.total_amount), 0),
        func.coalesce(func.sum(Invoice.rent_amount), 0),
        func.coalesce(func.sum(Invoice.electricity_amount), 0),
        func.coalesce(func.sum(Invoice.water_amount), 0),
        func.coalesce(func.sum(Invoice.internet_amount), 0),
        func.coalesce(func.sum(Invoice.service_amount), 0),
        func.coalesce(func.sum(Invoice.other_amount), 0),
        func.count(Invoice.id),
    ).first()
    (total_revenue, rent, electricity, water, internet, service, other, paid_count) = (
        row if row else (0, 0, 0, 0, 0, 0, 0, 0)
    )

    breakdown = {
        "rent": rent,
        "electricity": electricity,
        "water": water,
        "internet": internet,
        "service": service,
        "other": other,
    }

    # Thống kê theo trạng thái: 1 query GROUP BY
    status_rows = base.with_entities(Invoice.status, func.count(Invoice.id)).group_by(Invoice.status).all()
    status_map = {s: c for s, c in status_rows}
    invoice_stats = {
        "total": sum(status_map.values()),
        "paid": status_map.get("PAID", 0),
        "pending": status_map.get("PENDING", 0),
        "failed": status_map.get("FAILED", 0),
        "expired": status_map.get("EXPIRED", 0),
    }

    # Doanh thu theo tháng (N tháng gần nhất): 1 query GROUP BY
    now = datetime.utcnow()
    month_keys = [(now - timedelta(days=30 * i)).strftime("%Y-%m") for i in range(months - 1, -1, -1)]
    monthly_rows = paid_base.filter(Invoice.period.in_(month_keys)).with_entities(
        Invoice.period, func.coalesce(func.sum(Invoice.total_amount), 0), func.count(Invoice.id),
    ).group_by(Invoice.period).all()
    monthly_map = {p: (rev, cnt) for p, rev, cnt in monthly_rows}
    monthly = [
        {"period": m, "revenue": monthly_map.get(m, (0, 0))[0], "count": monthly_map.get(m, (0, 0))[1]}
        for m in month_keys
    ]

    # Hóa đơn đã thanh toán gần đây (eager-load room/tenant để tránh N+1 khi serialize)
    from sqlalchemy.orm import selectinload
    recent = paid_base.options(
        selectinload(Invoice.room),
        selectinload(Invoice.tenant),
    ).order_by(Invoice.paid_at.desc().nullslast(), Invoice.id.desc()).limit(20).all()
    invoices = [{
        "id": i.id,
        "period": i.period,
        "total_amount": i.total_amount,
        "room_title": i.room.title if i.room else None,
        "tenant_name": i.tenant.full_name if i.tenant else None,
        "paid_at": i.paid_at,
    } for i in recent]

    return {
        "total_revenue": total_revenue,
        "breakdown": breakdown,
        "monthly": monthly,
        "invoice_stats": invoice_stats,
        "invoices": invoices,
    }
