"""Nguồn ảnh demo cho YangRent.

- Listing 01-15 dùng WebP được lưu local trong frontend/public/images/properties/.
- Listing 16-30 dùng ảnh Unsplash ổn định theo từng visual family để dữ liệu seed vẫn
  hoạt động khi chưa upload lên Supabase Storage.
- Mỗi listing có 3 ảnh với thứ tự cover/detail/detail; RoomImage.is_primary + sort_order
  chịu trách nhiệm xác định ảnh bìa và thứ tự hiển thị.

Danh sách attribution cho ảnh local được ghi tại docs/IMAGE_SOURCES.md.
"""

THUMB = "?auto=format&fit=crop&w=800&q=80"


def u(photo_id: str, query: str = "?auto=format&fit=crop&w=1200&q=80") -> str:
    return f"https://images.unsplash.com/{photo_id}{query}"


def unsplash_set(photo_id: str) -> list[str]:
    """Tạo ba crop của cùng một ảnh để giữ visual family nhất quán cho demo."""
    return [
        u(photo_id, "?auto=format&fit=crop&w=1600&h=1067&q=82&crop=center"),
        u(photo_id, "?auto=format&fit=crop&w=1200&h=900&q=80&crop=top"),
        u(photo_id, "?auto=format&fit=crop&w=1200&h=900&q=80&crop=bottom"),
    ]


LOCAL_PROPERTY_IMAGE_SETS = [
    [
        f"/images/properties/property-{idx:03d}/01-cover.webp",
        f"/images/properties/property-{idx:03d}/02-detail.webp",
        f"/images/properties/property-{idx:03d}/03-detail.webp",
    ]
    for idx in range(1, 16)
]

# 15 visual families riêng biệt cho listing 16-30. Các URL này là seed fallback;
# production có thể upload sang Supabase Storage và thay URL trong DB mà không đổi schema.
_REMOTE_BASES = [
    "photo-1616486338812-3dadae4b4ace",
    "photo-1616594039964-ae9021a400a0",
    "photo-1540518614846-7eded433c457",
    "photo-1598928506311-c55ded91a20c",
    "photo-1595526114035-0d45ed16cfbf",
    "photo-1560185007-cde436f6a4d0",
    "photo-1554995207-c18c203602cb",
    "photo-1567767292278-a4f21aa2d36e",
    "photo-1583847268964-b28dc8f51f92",
    "photo-1600210492486-724fe5c67fb0",
    "photo-1600585154340-be6161a56a0c",
    "photo-1600566753190-17f0baa2a6c3",
    "photo-1600607687939-ce8a6c25118c",
    "photo-1600573472592-401b489a3cdc",
    "photo-1545324418-cc1a3fa10c00",
]
REMOTE_PROPERTY_IMAGE_SETS = [unsplash_set(photo_id) for photo_id in _REMOTE_BASES]

PROPERTY_IMAGE_SETS = LOCAL_PROPERTY_IMAGE_SETS + REMOTE_PROPERTY_IMAGE_SETS

# Giữ alias cũ để các bài roommate demo không phải migration lớn.
ROOM_IMAGES = [image_set[0] for image_set in PROPERTY_IMAGE_SETS]

# Avatar người dùng demo (Unsplash). Không đại diện cho người thật trong listing.
AVATARS = [
    u("photo-1472099645785-5658abf4ff4e", THUMB),
    u("photo-1500648767791-00dcc994a43e", THUMB),
    u("photo-1506794778202-cad84cf45f1d", THUMB),
    u("photo-1507003211169-0a1dd7228f2d", THUMB),
    u("photo-1494790108377-be9c29b29330", THUMB),
    u("photo-1438761681033-6461ffad8d80", THUMB),
    u("photo-1544005313-94ddf0286df2", THUMB),
    u("photo-1534528741775-53994a69daeb", THUMB),
    u("photo-1531123897727-8f129e1688ce", THUMB),
    u("photo-1547425260-76bcadfb4f2c", THUMB),
]
