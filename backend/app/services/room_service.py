"""Nghiệp vụ chỗ ở cho thuê: CRUD + tìm kiếm + filter + sort + pagination + favorite."""
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.room import Amenity, Favorite, Room, RoomImage
from app.models.user import User

# Danh sách quận/huyện phổ biến (dùng cho filter frontend)
DISTRICTS_HANOI = ["Cầu Giấy", "Nam Từ Liêm", "Thanh Xuân", "Đống Đa", "Hai Bà Trưng", "Hà Đông", "Hoàng Mai", "Ba Đình", "Tây Hồ", "Bắc Từ Liêm", "Long Biên"]
DISTRICTS_HCMC = ["Quận 1", "Quận 3", "Bình Thạnh", "Thủ Đức", "Tân Bình", "Gò Vấp"]


def _rooms_with_amenity_ids(db: Session, name: str) -> list[int]:
    """Trả danh sách room id có amenity theo tên (dùng cho filter)."""
    rows = db.query(Room.id).join(Room.amenities).filter(Amenity.name == name).all()
    return [r[0] for r in rows] or [-1]


def _apply_filters(query, db: Session, filters: dict):
    """Áp dụng toàn bộ bộ lọc tìm phòng."""
    if filters.get("keyword"):
        kw = f"%{filters['keyword']}%"
        query = query.filter(or_(
            Room.title.ilike(kw),
            Room.address.ilike(kw),
            Room.district.ilike(kw),
            Room.ward.ilike(kw),
        ))
    if filters.get("city"):
        query = query.filter(Room.city == filters["city"])
    if filters.get("district"):
        query = query.filter(Room.district == filters["district"])
    if filters.get("price_min") is not None:
        query = query.filter(Room.price >= int(filters["price_min"]))
    if filters.get("price_max") is not None:
        query = query.filter(Room.price <= int(filters["price_max"]))
    if filters.get("area_min") is not None:
        query = query.filter(Room.area >= float(filters["area_min"]))
    if filters.get("area_max") is not None:
        query = query.filter(Room.area <= float(filters["area_max"]))
    if filters.get("room_type"):
        query = query.filter(Room.room_type == filters["room_type"])
    if filters.get("bathroom_type"):
        query = query.filter(Room.bathroom_type == filters["bathroom_type"])
    if filters.get("furnished") is not None:
        on = str(filters["furnished"]).lower() in ("1", "true", "yes")
        query = query.filter(Room.furnished == on)

    # Lọc theo tiện ích phổ biến (wifi / máy lạnh / chỗ để xe)
    for key, amenity_name in (("wifi", "WiFi"), ("ac", "Máy lạnh"), ("parking", "Chỗ để xe")):
        if filters.get(key) is not None:
            on = str(filters[key]).lower() in ("1", "true", "yes")
            ids = _rooms_with_amenity_ids(db, amenity_name)
            query = query.filter(Room.id.in_(ids) if on else Room.id.notin_(ids))

    if filters.get("amenity_ids"):
        ids = [int(x) for x in str(filters["amenity_ids"]).split(",") if x]
        for aid in ids:
            query = query.filter(Room.id.in_(
                db.query(Room.id).join(Room.amenities).filter(Amenity.id == aid)
            ))

    # Lọc theo khung nhìn bản đồ (bounds) - dùng cho Map View "Search-as-I-move"
    if all(filters.get(k) is not None for k in ("sw_lat", "sw_lng", "ne_lat", "ne_lng")):
        query = query.filter(
            Room.latitude.between(float(filters["sw_lat"]), float(filters["ne_lat"])),
            Room.longitude.between(float(filters["sw_lng"]), float(filters["ne_lng"])),
        )
    return query


def search_rooms(db: Session, filters: dict, sort: str = "newest", page: int = 1, page_size: int = 12):
    """Tìm phòng với filter + sort + pagination. Chỉ trả phòng công khai."""
    query = db.query(Room).filter(Room.moderation_status == "APPROVED", Room.status != "HIDDEN")
    query = _apply_filters(query, db, filters)

    sort_map = {
        "price_asc": Room.price.asc(),
        "price_desc": Room.price.desc(),
        "newest": Room.created_at.desc(),
        "area_desc": Room.area.desc(),
        "area_asc": Room.area.asc(),
        "featured": Room.is_featured.desc(),
    }
    query = query.order_by(sort_map.get(sort, Room.created_at.desc()))

    total = query.count()
    rooms = query.offset((page - 1) * page_size).limit(page_size).all()
    return rooms, total


def get_room_or_404(db: Session, room_id: int) -> Room:
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise NotFoundError("Không tìm thấy chỗ ở")
    return room


def increment_view(db: Session, room: Room) -> None:
    room.view_count = (room.view_count or 0) + 1
    db.commit()


def create_room(db: Session, user: User, data) -> Room:
    """Landlord đăng phòng mới. Bài mới có moderation_status = PENDING."""
    room = Room(
        landlord_id=user.id,
        title=data.title, description=data.description, price=data.price, area=data.area,
        address=data.address, city=data.city, district=data.district, ward=data.ward,
        latitude=data.latitude, longitude=data.longitude,
        room_type=data.room_type, bathroom_type=data.bathroom_type, furnished=data.furnished,
        max_occupants=data.max_occupants,
        electricity_price=data.electricity_price, water_price=data.water_price,
        internet_price=data.internet_price, is_featured=data.is_featured,
        moderation_status="PENDING",  # chờ admin duyệt
    )
    db.add(room)
    db.flush()
    _sync_room_images(db, room, data.images)
    _sync_room_amenities(db, room, data.amenity_ids)
    db.commit()
    db.refresh(room)
    return room


def update_room(db: Session, room: Room, data) -> Room:
    """Chủ phòng (hoặc admin) sửa phòng. Ownership check ở router."""
    editable = [
        "title", "description", "price", "area", "address", "city", "district", "ward",
        "latitude", "longitude", "room_type", "bathroom_type", "furnished", "max_occupants",
        "electricity_price", "water_price", "internet_price", "status", "is_featured",
        "view_3d_url", "view_360_enabled", "video_url",
    ]
    for field in editable:
        value = getattr(data, field, None)
        if value is not None:
            setattr(room, field, value)
    if data.amenity_ids is not None:
        _sync_room_amenities(db, room, data.amenity_ids)
    if data.images is not None:
        _sync_room_images(db, room, data.images)
    db.commit()
    db.refresh(room)
    return room


def delete_room(db: Session, room: Room) -> None:
    """Xoá phòng cùng toàn bộ dữ liệu liên quan.

    SQLite không ép ràng buộc khóa ngoại nên trước đây xoá phòng vẫn chạy
    (để lại dữ liệu mồ côi). PostgreSQL ép chặt nên phải xoá theo thứ tự FK:
    favorites, rental_requests, meter_readings, maintenance_requests,
    contracts (và meter_readings/invoices của chúng), invoices (+ items, payments),
    conversations, rồi mới tới room.
    """
    from app.models.chat import Conversation, Message
    from app.models.contract import Contract
    from app.models.invoice import Invoice, InvoiceItem, Payment
    from app.models.maintenance import MaintenanceRequest
    from app.models.meter import MeterReading
    from app.models.rental import RentalRequest

    room_id = room.id

    # Xoá invoice items + payments trước (phụ thuộc invoice)
    for invoice_id, in db.query(Invoice.id).filter(Invoice.room_id == room_id).all():
        db.query(Payment).filter(Payment.invoice_id == invoice_id).delete(synchronize_session=False)
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete(synchronize_session=False)
    db.query(Invoice).filter(Invoice.room_id == room_id).delete(synchronize_session=False)

    # Contracts của phòng: xoá meter_readings tham chiếu contract trước
    for contract_id, in db.query(Contract.id).filter(Contract.room_id == room_id).all():
        db.query(MeterReading).filter(MeterReading.contract_id == contract_id).delete(synchronize_session=False)
    db.query(Contract).filter(Contract.room_id == room_id).delete(synchronize_session=False)

    # Các bảng phụ thuộc room trực tiếp
    db.query(MeterReading).filter(MeterReading.room_id == room_id).delete(synchronize_session=False)
    db.query(MaintenanceRequest).filter(MaintenanceRequest.room_id == room_id).delete(synchronize_session=False)
    db.query(RentalRequest).filter(RentalRequest.room_id == room_id).delete(synchronize_session=False)
    db.query(Favorite).filter(Favorite.room_id == room_id).delete(synchronize_session=False)

    # Conversations của phòng: xoá messages trước
    for conv_id, in db.query(Conversation.id).filter(Conversation.room_id == room_id).all():
        db.query(Message).filter(Message.conversation_id == conv_id).delete(synchronize_session=False)
    db.query(Conversation).filter(Conversation.room_id == room_id).delete(synchronize_session=False)

    # room_amenities + room_images (đã có ondelete CASCADE, nhưng xoá tay cho chắc trên mọi DB)
    room.amenities = []
    from app.services.storage_service import delete_object
    for img in room.images:
        delete_object(img.image_url)  # xoa file tren Supabase Storage neu co
        db.delete(img)

    db.delete(room)
    db.commit()


def _sync_room_images(db: Session, room: Room, images) -> None:
    if images is None:
        return
    from app.services.storage_service import delete_object, process_image_input
    # Chuân hoa URL anh moi (data URL -> upload storage; URL ngoai -> giu nguyen)
    new_urls: list[str] = []
    for img in images:
        try:
            new_urls.append(process_image_input(img.image_url))
        except ValueError:
            new_urls.append(img.image_url)  # giu nguyen neu loi parse
    # Xoa object tren storage CHI cho anh bi loai bo (khong con trong danh sach moi)
    keep = set(new_urls)
    for img in room.images:
        if img.image_url not in keep:
            delete_object(img.image_url)
        db.delete(img)
    db.flush()
    for idx, url in enumerate(new_urls):
        img = images[idx]
        db.add(RoomImage(
            room_id=room.id,
            image_url=url,
            is_primary=img.is_primary or idx == 0,
            sort_order=img.sort_order if img.sort_order is not None else idx,
        ))


def _sync_room_amenities(db: Session, room: Room, amenity_ids) -> None:
    if amenity_ids is None:
        return
    room.amenities = db.query(Amenity).filter(Amenity.id.in_(amenity_ids)).all()


# ---------- Favorite ----------
def toggle_favorite(db: Session, user: User, room_id: int) -> dict:
    room = get_room_or_404(db, room_id)
    fav = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.room_id == room_id).first()
    if fav:
        db.delete(fav)
        db.commit()
        return {"is_favorite": False}
    db.add(Favorite(user_id=user.id, room_id=room_id))
    db.commit()
    return {"is_favorite": True}


def get_favorite_rooms(db: Session, user: User):
    favs = db.query(Favorite).filter(Favorite.user_id == user.id).order_by(Favorite.created_at.desc()).all()
    return [f.room for f in favs if f.room]


def get_favorite_ids(db: Session, user: User) -> list[int]:
    return [r[0] for r in db.query(Favorite.room_id).filter(Favorite.user_id == user.id).all()]
