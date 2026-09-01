"""API upload anh: /api/uploads

- POST /api/uploads/image: nhan file (multipart) hoac {data_url}/{url} (JSON),
  validate kieu + dung luong, upload len Supabase Storage (neu cau hinh),
  tra URL public. Khong expose service-role key ra frontend.
"""
import json

from fastapi import APIRouter, Depends, Request, UploadFile

from app.core.deps import require_auth, require_landlord
from app.core.exceptions import AppError, ForbiddenError, NotFoundError
from app.database import get_db
from app.schemas.common import ok
from app.services import storage_service

router = APIRouter(prefix="/uploads", tags=["uploads"])

MAX_JSON_BODY = 8 * 1024 * 1024  # 8 MB cho data URL


@router.post("/image")
async def upload_image(request: Request, user=Depends(require_auth)):
    """Upload 1 anh. Ho tro 2 cach:

    1. multipart/form-data voi field "file" (tu may nguoi dung).
    2. JSON: {"data_url": "data:image/png;base64,..."} hoac {"url": "https://..."}.
    """
    ct = (request.headers.get("content-type") or "").lower()
    try:
        if "multipart/form-data" in ct:
            form = await request.form()
            file: UploadFile | None = form.get("file")
            if file is None:
                raise AppError(400, "Thiếu field 'file'")
            raw = await file.read()
            ctype = storage_service.validate_image(raw, file.content_type or "")
            url = storage_service.upload_bytes(raw, ctype, "rooms")
        elif "application/json" in ct or ct.startswith("text/plain"):
            raw_body = await request.body()
            if len(raw_body) > MAX_JSON_BODY:
                raise AppError(400, "Dữ liệu ảnh quá lớn (tối đa 5MB)")
            try:
                data = json.loads(raw_body)
            except Exception:
                raise AppError(400, "Body JSON không hợp lệ")
            folder = data.get("folder") or "rooms"
            if data.get("data_url"):
                url = storage_service.process_image_input(data["data_url"], folder)
            elif data.get("url"):
                url = storage_service.process_image_input(data["url"], folder)
            else:
                raise AppError(400, "Vui lòng gửi file ảnh hoặc data_url/url")
        else:
            raise AppError(400, "Content-Type không hỗ trợ (dùng multipart/form-data hoặc application/json)")
        return ok({"url": url}, "Upload ảnh thành công")
    except AppError:
        raise
    except ValueError as e:
        raise AppError(400, str(e))
    except Exception as e:  # noqa: BLE001 - loi storage tra message ro rang
        raise AppError(500, f"Upload ảnh thất bại: {str(e)[:150]}")


# ---------- Video endpoints ----------
@router.post("/video")
def upload_video_url(request, user=Depends(require_landlord)):
    """Upload video URL (YouTube, Vimeo, hoac URL truc tiep)."""
    import json as _json
    from app.models.room import Room
    from app.services.room_service import get_room_or_404
    ct = (request.headers.get('content-type') or '').lower()
    if 'application/json' not in ct:
        raise AppError(400, "Dung JSON")
    import asyncio; body = asyncio.get_event_loop().run_until_complete(request.body())
    data = _json.loads(body)
    room_id = data.get('room_id')
    video_url = (data.get('video_url') or '').strip()
    title = (data.get('title') or '').strip()
    if not video_url or not video_url.startswith('http'):
        raise AppError(400, "URL video khong hop le")
    room = get_room_or_404(get_db().__next__(), room_id) if room_id else None
    if room and room.landlord_id != user.id and not user.has_role('ADMIN'):
        raise ForbiddenError("Ban khong so huu phong nay")
    # Validate video URL format
    valid_domains = ['youtube.com', 'youtu.be', 'vimeo.com', 'storage.googleapis.com', 'supabase']
    if not any(d in video_url for d in valid_domains):
        if not video_url.startswith('http'):
            raise AppError(400, "Chi ho tro URL video tu YouTube/Vimeo/Supabase Storage")
    return ok({"url": video_url, "title": title})


@router.get("/room-videos/{room_id}")
def get_room_videos(room_id: int, db=Depends(get_db)):
    from app.models.room_video import RoomVideo
    videos = db.query(RoomVideo).filter(RoomVideo.room_id == room_id).order_by(RoomVideo.sort_order).all()
    return ok([{"id": v.id, "video_url": v.video_url, "title": v.title, "sort_order": v.sort_order} for v in videos])


@router.post("/room-videos")
def add_room_video(request, user=Depends(require_landlord), db=Depends(get_db)):
    import json as _json
    from app.models.room import Room
    from app.models.room_video import RoomVideo
    from app.services.room_service import get_room_or_404
    import asyncio; body = asyncio.get_event_loop().run_until_complete(request.body())
    data = _json.loads(body)
    room_id = data.get('room_id')
    video_url = (data.get('video_url') or '').strip()
    title = (data.get('title') or '').strip()
    if not video_url:
        raise AppError(400, "Thieu URL video")
    room = get_room_or_404(db, room_id)
    if room.landlord_id != user.id and not user.has_role('ADMIN'):
        raise ForbiddenError("Ban khong so huu phong nay")
    existing_count = db.query(RoomVideo).filter(RoomVideo.room_id == room_id).count()
    vid = RoomVideo(room_id=room_id, video_url=video_url, title=title, sort_order=existing_count)
    db.add(vid)
    db.commit()
    db.refresh(vid)
    return ok({"id": vid.id, "video_url": vid.video_url, "title": vid.title}, "Da them video")


@router.delete("/room-videos/{video_id}")
def delete_room_video(video_id: int, user=Depends(require_landlord), db=Depends(get_db)):
    from app.models.room_video import RoomVideo
    vid = db.query(RoomVideo).filter(RoomVideo.id == video_id).first()
    if not vid:
        raise NotFoundError("Khong tim thay video")
    room = db.query(Room).filter(Room.id == vid.room_id).first()
    if room and room.landlord_id != user.id and not user.has_role('ADMIN'):
        raise ForbiddenError("Ban khong so huu phong nay")
    db.delete(vid)
    db.commit()
    return ok(message="Da xoa video")
