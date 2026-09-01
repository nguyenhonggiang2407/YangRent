"""API thông báo: /api/notifications"""
import asyncio
import json
import time

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import require_auth
from app.database import get_db
from app.models.user import User
from app.schemas.common import ok
from app.services import chat_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def my_notifications(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    notifs = chat_service.get_user_notifications(db, user)
    unread = sum(1 for n in notifs if not n.is_read)
    return ok({
        "items": [{
            "id": n.id, "type": n.type, "title": n.title, "content": n.content,
            "link": n.link, "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        } for n in notifs],
        "unread_count": unread,
    })


@router.post("/read-all")
def read_all(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    chat_service.mark_notifications_read(db, user)
    return ok(message="Đã đánh dấu tất cả thông báo là đã đọc")


@router.get("/stream")
def notification_stream(request: Request, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """SSE endpoint: gui notification moi den frontend theo thoi gian thuc."""
    async def event_generator():
        last_count = 0
        try:
            notifs = chat_service.get_user_notifications(db, user)
            last_count = sum(1 for n in notifs if not n.is_read)
        except Exception:
            pass

        while True:
            if await request.is_disconnected():
                break
            try:
                notifs = chat_service.get_user_notifications(db, user)
                unread = sum(1 for n in notifs if not n.is_read)
                if unread != last_count:
                    latest = notifs[0] if notifs else None
                    data = json.dumps({
                        "unread_count": unread,
                        "latest": {
                            "id": latest.id, "title": latest.title, "content": latest.content,
                        } if latest else None,
                    })
                    yield f"event: notification\ndata: {data}\n\n"
                    last_count = unread
                else:
                    yield f": keepalive\n\n"
            except Exception:
                yield f": keepalive\n\n"
            await asyncio.sleep(5)

    return StreamingResponse(event_generator(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
