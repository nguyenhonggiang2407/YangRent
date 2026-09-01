"""API người dùng: /api/users

- Xem ho so cong khai
- Cap nhat avatar
- Cap nhat profile
"""
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import require_auth
from app.core.exceptions import AppError, NotFoundError
from app.database import get_db
from app.models.user import User
from app.schemas.common import ok
from app.services.serializers import user_public

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("Không tìm thấy người dùng")
    return ok(user_public(user))


# ---------- Avatar ----------
@router.put("/me/avatar")
def update_avatar(request: Request, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Cap nhat anh dai dien. Gui JSON {"avatar_url": "https://..."} hoac {"data_url": "data:image/...;base64,..."}."""
    import json
    import asyncio
    body = asyncio.get_event_loop().run_until_complete(request.body())
    try:
        data = json.loads(body)
    except Exception:
        raise AppError(400, "JSON khong hop le")
    url = data.get("avatar_url") or data.get("data_url") or ""
    url = url.strip()
    if not url:
        raise AppError(400, "Thieu avatar_url hoac data_url")
    if url.startswith("data:"):
        from app.services.storage_service import process_image_input
        url = process_image_input(url, "avatars")
    user.avatar_url = url
    db.commit()
    db.refresh(user)
    return ok(user_public(user), "Cap nhat avatar thanh cong")


@router.delete("/me/avatar")
def delete_avatar(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    user.avatar_url = ""
    db.commit()
    return ok(user_public(user), "Da xoa avatar")


# ---------- Profile ----------
@router.put("/me")
def update_profile(request: Request, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    import json
    import asyncio
    body = asyncio.get_event_loop().run_until_complete(request.body())
    try:
        data = json.loads(body)
    except Exception:
        raise AppError(400, "JSON khong hop le")
    if "full_name" in data and data["full_name"]:
        user.full_name = data["full_name"][:120]
    if "phone" in data:
        user.phone = data["phone"][:20]
    if "gender" in data:
        user.gender = data["gender"]
    if "date_of_birth" in data:
        user.date_of_birth = data["date_of_birth"]
    db.commit()
    db.refresh(user)
    return ok(user_public(user), "Cap nhat ho so thanh cong")
