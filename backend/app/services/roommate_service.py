"""Nghiệp vụ ở ghép: CRUD bài đăng + tìm kiếm + AI match (gọi ai_service)."""
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.roommate import RoommatePost
from app.models.user import User


def process_images(images) -> list[str]:
    """Xu ly danh sach anh: data URL -> upload Supabase Storage, URL ngoai giu nguyen."""
    from app.services.storage_service import process_image_input
    if not images:
        return []
    out = []
    for img in images:
        if not (img or "").strip():
            continue
        try:
            out.append(process_image_input(str(img)))
        except ValueError:
            continue  # bo qua anh loi, khong lam hong ca bai dang
    return out[:3]  # toi da 3 anh


def search_posts(db: Session, filters: dict, page: int = 1, page_size: int = 12):
    """Tìm bài đăng ở ghép với bộ lọc + pagination."""
    query = db.query(RoommatePost).filter(RoommatePost.status == "ACTIVE")

    if filters.get("keyword"):
        kw = f"%{filters['keyword']}%"
        query = query.filter(or_(
            RoommatePost.title.ilike(kw),
            RoommatePost.description.ilike(kw),
            RoommatePost.district.ilike(kw),
            RoommatePost.workplace.ilike(kw),
        ))
    if filters.get("post_type"):
        query = query.filter(RoommatePost.post_type == filters["post_type"])
    if filters.get("city"):
        query = query.filter(RoommatePost.city == filters["city"])
    if filters.get("district"):
        query = query.filter(RoommatePost.district == filters["district"])
    if filters.get("gender_pref"):
        query = query.filter(RoommatePost.gender_pref == filters["gender_pref"])
    if filters.get("budget_max") is not None:
        query = query.filter(
            or_(
                RoommatePost.budget_min.is_(None),
                RoommatePost.budget_min <= int(filters["budget_max"]),
            )
        )

    query = query.order_by(RoommatePost.created_at.desc())
    total = query.count()
    posts = query.offset((page - 1) * page_size).limit(page_size).all()
    return posts, total


def get_post_or_404(db: Session, post_id: int) -> RoommatePost:
    post = db.query(RoommatePost).filter(RoommatePost.id == post_id).first()
    if not post:
        raise NotFoundError("Không tìm thấy bài đăng")
    return post


def create_post(db: Session, user: User, data) -> RoommatePost:
    if data.post_type not in ("LOOKING_ROOM", "LOOKING_ROOMMATE"):
        raise ForbiddenError("Loại bài đăng không hợp lệ")
    post = RoommatePost(
        user_id=user.id, post_type=data.post_type, title=data.title, description=data.description,
        city=data.city, district=data.district, budget_min=data.budget_min, budget_max=data.budget_max,
        gender_pref=data.gender_pref, num_people=data.num_people, move_in_date=data.move_in_date,
        school=data.school, workplace=data.workplace, desired_amenities=data.desired_amenities,
        room_price=data.room_price, current_people=data.current_people, needed_people=data.needed_people,
        cost_per_person=data.cost_per_person, room_area=data.room_area, room_address=data.room_address,
        images=process_images(data.images),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def update_post(db: Session, post: RoommatePost, data) -> RoommatePost:
    for field in ("title", "description", "district", "budget_min", "budget_max", "gender_pref",
                  "num_people", "move_in_date", "desired_amenities", "status"):
        value = getattr(data, field, None)
        if value is not None:
            setattr(post, field, value)
    if data.images is not None:
        new_images = process_images(data.images)
        # Xoa object storage cua anh bi loai bo (khong con trong danh sach moi)
        from app.services.storage_service import delete_object
        keep = set(new_images)
        for url in (post.images or []):
            if url not in keep:
                delete_object(url)
        post.images = new_images
    db.commit()
    db.refresh(post)
    return post


def delete_post(db: Session, post: RoommatePost) -> None:
    # Xoa anh upload tren Supabase Storage (chi object cua storage, khong dong URL ngoai)
    from app.services.storage_service import delete_object
    for url in (post.images or []):
        delete_object(url)
    db.delete(post)
    db.commit()
