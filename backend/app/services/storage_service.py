"""Supabase Storage - upload anh phong / avatar / bai dang.

- Upload file qua REST API cua Supabase Storage (bucket public: room-images).
- Khong expose service-role key ra frontend: frontend gui file/base64 len
  backend, backend moi goi Supabase Storage.
- Neu chua cau hinh SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (tuc storage chua bat),
  he thong tu fallback: giu nguyen URL ngoai (Unsplash/Pexels...) nhu cu.
"""
import base64
import re
import time
import urllib.request
import uuid

from app.config import get_settings

# Kieu anh cho phep + dung luong toi da
ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB

BUCKET_NAME = "room-images"


def _project_ref() -> str:
    """Lay project ref tu DATABASE_URL (postgres.REF@...) de tu suy SUPABASE_URL."""
    url = get_settings().DATABASE_URL
    m = re.search(r"postgres\.([a-z0-9]+)", url)
    return m.group(1) if m else ""


def _supabase_base_url() -> str:
    """SUPABASE_URL neu cau hinh, nguoc lai tu suy tu project ref."""
    url = get_settings().SUPABASE_URL.strip()
    if url:
        return url.rstrip("/")
    ref = _project_ref()
    if ref:
        return f"https://{ref}.supabase.co"
    return ""


def storage_enabled() -> bool:
    s = get_settings()
    return bool(_supabase_base_url() and s.supabase_key)


def _supabase_headers() -> dict:
    """Headers chuan cho Supabase Storage API (dung service-role key o backend)."""
    s = get_settings()
    return {
        "apikey": s.supabase_key,
        "Authorization": f"Bearer {s.supabase_key}",
    }


def ensure_bucket() -> None:
    """Tao bucket public neu chua ton tai (idempotent)."""
    if not storage_enabled():
        return
    url = f"{_supabase_base_url()}/storage/v1/bucket"
    body = '{"name": "%s", "public": true}' % BUCKET_NAME
    req = urllib.request.Request(url, data=body.encode(), method="POST",
                                 headers={**_supabase_headers(), "Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=20)
    except urllib.error.HTTPError as e:
        # Bucket da ton tai -> 400 (Duplicate) la binh thuong
        if e.code not in (400, 409):
            raise


def _detect_content_type(data: bytes, hint: str = "") -> str:
    """Nhan dien content-type tu magic bytes (uu tien) roi fallback hint."""
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return hint if hint in ALLOWED_CONTENT_TYPES else ""


def validate_image(data: bytes, content_type: str) -> str:
    """Validate anh: dung luong + kieu. Tra content-type chuan hoa."""
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError("Anh qua lon (toi da 5MB)")
    if len(data) == 0:
        raise ValueError("File rong")
    ct = _detect_content_type(data, content_type)
    if ct not in ALLOWED_CONTENT_TYPES:
        raise ValueError("Dinh dang anh khong hop le (chi ho tro JPG, PNG, WEBP, GIF)")
    return ct


def upload_bytes(data: bytes, content_type: str, folder: str = "rooms") -> str:
    """Upload bytes len Supabase Storage, tra URL public.

    Raises ValueError neu storage chua cau hinh.
    """
    if not storage_enabled():
        raise ValueError(
            "Supabase Storage chua duoc cau hinh: them SUPABASE_SERVICE_ROLE_KEY vao backend/.env "
            "(SUPABASE_URL tu dong suy tu project ref)"
        )
    ensure_bucket()
    ext = ALLOWED_CONTENT_TYPES.get(content_type, "jpg")
    key = f"{folder}/{int(time.time())}-{uuid.uuid4().hex[:8]}.{ext}"
    url = f"{_supabase_base_url()}/storage/v1/object/{BUCKET_NAME}/{key}"
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={**_supabase_headers(), "Content-Type": content_type, "x-upsert": "true"})
    urllib.request.urlopen(req, timeout=30)
    return f"{_supabase_base_url()}/storage/v1/object/public/{BUCKET_NAME}/{key}"


def delete_object(public_url: str) -> None:
    """Xoa object tren Supabase Storage bang URL public (neu la object cua storage)."""
    if not storage_enabled():
        return
    base = _supabase_base_url()
    prefix = f"{base}/storage/v1/object/public/{BUCKET_NAME}/"
    if not public_url.startswith(prefix):
        return  # URL ngoai (Unsplash...) - khong xoa
    key = public_url[len(prefix):]
    url = f"{base}/storage/v1/object/{BUCKET_NAME}/{key}"
    req = urllib.request.Request(url, method="DELETE", headers=_supabase_headers())
    try:
        urllib.request.urlopen(req, timeout=20)
    except urllib.error.HTTPError:
        pass  # object khong ton tai - bo qua


def decode_base64_image(data_url: str) -> tuple[bytes, str]:
    """Giai ma data URL (data:image/png;base64,...) -> (bytes, content_type)."""
    m = re.match(r"^data:([\w/+-]+);base64,(.*)$", data_url, re.DOTALL)
    if not m:
        raise ValueError("Du lieu anh khong hop le")
    content_type, b64 = m.group(1), m.group(2)
    raw = base64.b64decode(b64)
    return raw, content_type


def is_external_url(value: str) -> bool:
    """URL ngoai hop le (http/https) - khong phai data URL."""
    return bool(re.match(r"^https?://", value.strip()))


def process_image_input(value: str, folder: str = "rooms") -> str:
    """Nhan 1 input anh (data URL hoac URL ngoai) -> tra URL luu duoc.

    - data URL: upload len Supabase Storage (neu cau hinh) hoac loi ro rang.
    - URL ngoai: giu nguyen (he thong uu tien URL ngoai nhu spec).
    """
    value = (value or "").strip()
    if not value:
        raise ValueError("URL anh trong")
    if value.startswith("data:"):
        raw, ct = decode_base64_image(value)
        ct = validate_image(raw, ct)
        return upload_bytes(raw, ct, folder)
    if is_external_url(value):
        return value
    raise ValueError("URL anh khong hop le")
