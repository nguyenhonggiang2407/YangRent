"""Seed database YangRent với dữ liệu demo tiếng Việt thực tế.

Cách chạy:
    cd backend
    python seed/seed.py            # tạo bảng (nếu chưa có) + seed nếu database trống
    python seed/seed.py --reset    # XOÁ toàn bộ dữ liệu cũ và seed lại từ đầu

Chạy với Supabase PostgreSQL: đặt DATABASE_URL trong .env trước, sau đó chạy như trên.
"""
import os
import sys
from datetime import datetime, timedelta

# Đảmasure backend/ nằm trong sys.path để `from app...` hoạt động
# khi chạy trực tiếp: python seed/seed.py hoặc python -m seed.seed
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import sqlalchemy as sa

# Windows console mặc định dùng cp1252 - ép UTF-8 để in tiếng Việt
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.config import get_settings
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models import (Amenity, Contract, Conversation, Favorite, Invoice, MaintenanceRequest,
                        Message, MeterReading, Notification, Report, Role, Room, RoomImage,
                        RoommatePost, User)
from app.services.auth_service import get_or_create_role
try:
    from seed_images import AVATARS, PROPERTY_IMAGE_SETS, ROOM_IMAGES  # khi chạy trực tiếp: python seed/seed.py
except ImportError:
    from seed.seed_images import AVATARS, PROPERTY_IMAGE_SETS, ROOM_IMAGES  # khi import như package

settings = get_settings()

# ---------------------------------------------------------------------------
# Dữ liệu người dùng (admin, chủ nhà, người thuê, người dùng)
# ---------------------------------------------------------------------------
USERS = [
    # (email, password, full_name, phone, gender, avatar_idx, is_verified, roles)
    ("admin@yangrent.vn", "admin123", "Quản Trị Viên YangRent", "0901000001", "MALE", 3, True, ["ADMIN", "USER"]),

    ("hung.nguyen@yangrent.vn", "yangrent123", "Nguyễn Văn Hùng", "0912345678", "MALE", 0, True, ["LANDLORD", "USER"]),
    ("mai.tran@yangrent.vn", "yangrent123", "Trần Thị Mai", "0912345679", "FEMALE", 4, True, ["LANDLORD", "USER"]),
    ("dung.le@yangrent.vn", "yangrent123", "Lê Quang Dũng", "0912345680", "MALE", 1, True, ["LANDLORD", "USER"]),
    ("huong.pham@yangrent.vn", "yangrent123", "Phạm Thu Hương", "0912345681", "FEMALE", 5, False, ["LANDLORD", "USER"]),
    ("tuan.hoang@yangrent.vn", "yangrent123", "Hoàng Minh Tuấn", "0912345682", "MALE", 2, True, ["LANDLORD", "USER"]),

    ("lan.vu@yangrent.vn", "yangrent123", "Vũ Thị Lan", "0912345683", "FEMALE", 6, True, ["TENANT", "USER"]),
    ("nam.do@yangrent.vn", "yangrent123", "Đỗ Văn Nam", "0912345684", "MALE", 7, True, ["TENANT", "USER"]),
    ("trang.bui@yangrent.vn", "yangrent123", "Bùi Thu Trang", "0912345685", "FEMALE", 8, True, ["TENANT", "USER"]),
    ("anh.nguyen@yangrent.vn", "yangrent123", "Nguyễn Hoàng Anh", "0912345686", "MALE", 9, True, ["TENANT", "USER"]),
    ("duc.phan@yangrent.vn", "yangrent123", "Phan Văn Đức", "0912345687", "MALE", 1, False, ["TENANT", "USER"]),

    ("khoi.tran@yangrent.vn", "yangrent123", "Trần Minh Khôi", "0912345688", "MALE", 0, False, ["USER"]),
    ("ngoc.le@yangrent.vn", "yangrent123", "Lê Thị Ngọc", "0912345689", "FEMALE", 4, False, ["USER"]),
    ("linh.dang@yangrent.vn", "yangrent123", "Đặng Thuỳ Linh", "0912345690", "FEMALE", 6, False, ["USER"]),
]

# ---------------------------------------------------------------------------
# Tiện ích
# ---------------------------------------------------------------------------
AMENITIES = [
    ("WiFi", "wifi"), ("Máy lạnh", "air-ventilator"), ("Máy giặt", "washing-machine"),
    ("Tủ lạnh", "refrigerator"), ("Giường", "bed-double"), ("Tủ quần áo", "archive"),
    ("WC riêng", "door-closed"), ("Ban công", "sun"), ("Chỗ để xe", "parking-circle"),
    ("Camera", "cctv"), ("Thang máy", "building-2"), ("Bếp", "chef-hat"),
    ("Nóng lạnh", "shower-head"), ("Thú cưng", "paw-print"), ("Workspace", "laptop"),
]

# ---------------------------------------------------------------------------
# 30 listing demo của YangRent – Hà Nội, phân bổ theo nhu cầu thuê
# 10 phòng cho thuê / 6 studio / 5 chung cư mini / 4 căn hộ /
# 3 nhà nguyên căn / 2 phòng ở ghép.
# Giá là dữ liệu demo hợp lý để trình diễn sản phẩm, không phải báo giá thị trường.
# ---------------------------------------------------------------------------
def listing(title, price, area, district, ward, address, room_type, image_set,
            amenities, description, *, bathroom="PRIVATE", furnished=True,
            max_occ=2, status="AVAILABLE", featured=False, verified=False,
            elec=4000, water=25000, internet=100000):
    return {
        "title": title, "price": price, "area": area, "district": district,
        "ward": ward, "address": address, "room_type": room_type,
        "image_set": image_set, "amenities": amenities, "description": description,
        "bathroom": bathroom, "furnished": furnished, "max_occ": max_occ,
        "status": status, "featured": featured, "verified": verified,
        "elec": elec, "water": water, "internet": internet,
    }


ROOMS = [
    # 01-10 · Phòng cho thuê
    listing(
        "Phòng khép kín có ban công tại Dịch Vọng Hậu", 3400000, 24, "Cầu Giấy", "Dịch Vọng Hậu",
        "Dịch Vọng Hậu, Cầu Giấy, Hà Nội", "RENTAL_ROOM", 0,
        ["WiFi", "Máy lạnh", "Giường", "Tủ quần áo", "WC riêng", "Ban công", "Chỗ để xe", "Nóng lạnh"],
        "Phòng nằm trong ngõ rộng, cách đường Cầu Giấy khoảng 300m. Diện tích 24m², có điều hòa, nóng lạnh, tủ quần áo và ban công riêng. Phù hợp 1–2 người ở.",
        featured=True, verified=True,
    ),
    listing(
        "Phòng đầy đủ nội thất gần Đại học Thương mại", 4200000, 27, "Cầu Giấy", "Mai Dịch",
        "Mai Dịch, Cầu Giấy, Hà Nội", "RENTAL_ROOM", 1,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Thang máy", "Nóng lạnh"],
        "Phòng trong tòa nhà có thang máy, đi bộ khoảng 7 phút tới Đại học Thương mại. Nội thất gồm giường, tủ, điều hòa, tủ lạnh; tầng giặt dùng chung có máy giặt.",
        featured=True, verified=True,
    ),
    listing(
        "Phòng cơ bản gần bến xe Mỹ Đình", 2600000, 20, "Nam Từ Liêm", "Mỹ Đình 2",
        "Mỹ Đình 2, Nam Từ Liêm, Hà Nội", "RENTAL_ROOM", 2,
        ["WiFi", "Giường", "Tủ quần áo", "Chỗ để xe", "Camera"],
        "Phòng 20m² trong khu dân cư gần bến xe Mỹ Đình. Có giường và tủ cơ bản, khu để xe tầng một, phù hợp một người đi làm hoặc sinh viên cần chi phí vừa phải.",
        bathroom="SHARED", furnished=False, max_occ=1, status="RENTED",
    ),
    listing(
        "Phòng sáng thoáng gần Royal City", 4600000, 30, "Thanh Xuân", "Thượng Đình",
        "Nguyễn Trãi, Thượng Đình, Thanh Xuân, Hà Nội", "RENTAL_ROOM", 3,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Thang máy", "Bếp"],
        "Phòng 30m² có cửa sổ lớn, bếp nhỏ và WC riêng. Từ nhà ra Nguyễn Trãi khoảng 200m, thuận tiện đi metro và Royal City. Tòa nhà có thang máy và khóa vân tay.",
        featured=True, verified=True,
    ),
    listing(
        "Phòng cho sinh viên gần Bách Khoa", 2800000, 21, "Hai Bà Trưng", "Bách Khoa",
        "Bách Khoa, Hai Bà Trưng, Hà Nội", "RENTAL_ROOM", 4,
        ["WiFi", "Giường", "Tủ quần áo", "Chỗ để xe", "Nóng lạnh"],
        "Phòng gọn gàng trong nhà dân, gần khu Đại học Bách Khoa – Kinh tế Quốc dân. Có giường, tủ và nóng lạnh; khu bếp dùng chung ở tầng một.",
        bathroom="SHARED", furnished=False, max_occ=1,
    ),
    listing(
        "Phòng khép kín tại Láng Hạ", 4400000, 28, "Đống Đa", "Láng Hạ",
        "Láng Hạ, Đống Đa, Hà Nội", "RENTAL_ROOM", 5,
        ["WiFi", "Máy lạnh", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Bếp", "Nóng lạnh"],
        "Phòng 28m² khép kín, có khu bếp riêng và cửa sổ hướng thoáng. Vị trí gần Láng Hạ, thuận tiện đi Ba Đình và Cầu Giấy. Phòng phù hợp người đi làm ở lâu dài.",
        status="RENTED", verified=True,
    ),
    listing(
        "Phòng yên tĩnh gần Văn Quán", 3200000, 24, "Hà Đông", "Văn Quán",
        "Văn Quán, Hà Đông, Hà Nội", "RENTAL_ROOM", 6,
        ["WiFi", "Máy lạnh", "Giường", "Tủ quần áo", "WC riêng", "Chỗ để xe", "Nóng lạnh"],
        "Phòng nằm trong khu dân cư Văn Quán, ngõ xe máy đi lại thuận tiện. Có điều hòa, nóng lạnh và WC riêng; chủ nhà ở khác tầng nên giờ giấc khá linh hoạt.",
        verified=True,
    ),
    listing(
        "Phòng có gác tại Định Công", 3000000, 23, "Hoàng Mai", "Định Công",
        "Định Công, Hoàng Mai, Hà Nội", "RENTAL_ROOM", 7,
        ["WiFi", "Giường", "Tủ quần áo", "WC riêng", "Bếp", "Chỗ để xe", "Camera"],
        "Phòng có gác ngủ, phía dưới đủ chỗ đặt bàn làm việc và bếp nhỏ. Khu trọ có camera, chỗ để xe trong nhà và khóa cổng riêng cho người thuê.",
        furnished=False,
    ),
    listing(
        "Phòng nội thất cơ bản gần Hồ Tây", 4800000, 26, "Tây Hồ", "Yên Phụ",
        "Yên Phụ, Tây Hồ, Hà Nội", "RENTAL_ROOM", 8,
        ["WiFi", "Máy lạnh", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Nóng lạnh"],
        "Phòng 26m² trong ngõ Yên Phụ, đi bộ ra hồ khoảng 10 phút. Nội thất vừa đủ gồm giường, tủ, điều hòa và tủ lạnh; phù hợp người đi làm thích khu vực yên tĩnh.",
        verified=True,
    ),
    listing(
        "Phòng rộng gần Giảng Võ", 4500000, 28, "Ba Đình", "Giảng Võ",
        "Giảng Võ, Ba Đình, Hà Nội", "RENTAL_ROOM", 9,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "WC riêng", "Chỗ để xe"],
        "Phòng rộng, có cửa sổ lớn và WC riêng. Tòa nhà cách Giảng Võ vài phút đi bộ, tầng thượng có máy giặt và sân phơi chung. Phù hợp 1–2 người.",
        status="RENTED", verified=True,
    ),

    # 11-16 · Studio
    listing(
        "Studio 25m² full nội thất gần Keangnam", 6200000, 25, "Nam Từ Liêm", "Mễ Trì",
        "Mễ Trì, Nam Từ Liêm, Hà Nội", "STUDIO", 10,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Bếp", "Thang máy"],
        "Studio 25m² có bếp riêng, máy giặt và đầy đủ nội thất. Từ nhà tới Keangnam khoảng 800m; tầng một để xe, thang máy đi tới các tầng.",
        featured=True, verified=True,
    ),
    listing(
        "Studio có bếp riêng tại Cầu Giấy", 5500000, 27, "Cầu Giấy", "Yên Hòa",
        "Yên Hòa, Cầu Giấy, Hà Nội", "STUDIO", 11,
        ["WiFi", "Máy lạnh", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Bếp", "Nóng lạnh"],
        "Studio bố trí khu ngủ và bếp tách tương đối, phù hợp một người hoặc cặp đôi. Ngõ yên tĩnh, gần nhiều văn phòng tại Yên Hòa và Trung Kính.",
        verified=True,
    ),
    listing(
        "Studio cửa sổ lớn tại Thanh Xuân", 5200000, 26, "Thanh Xuân", "Nhân Chính",
        "Nhân Chính, Thanh Xuân, Hà Nội", "STUDIO", 12,
        ["WiFi", "Máy lạnh", "Tủ lạnh", "Giường", "WC riêng", "Bếp", "Nóng lạnh", "Thang máy"],
        "Studio 26m² có cửa sổ rộng, ánh sáng tự nhiên tốt và khu bếp gọn. Tòa nhà có thang máy, cách đường Lê Văn Lương khoảng 350m.",
        status="RENTED", featured=True, verified=True,
    ),
    listing(
        "Studio tối giản gần Xã Đàn", 5800000, 29, "Đống Đa", "Phương Liên",
        "Phương Liên, Đống Đa, Hà Nội", "STUDIO", 13,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "WC riêng", "Bếp", "Workspace"],
        "Studio thiết kế tối giản, có bàn làm việc cạnh cửa sổ và bếp riêng. Khu vực gần Xã Đàn, thuận tiện đi Bách Khoa, Hoàn Kiếm và các quận trung tâm.",
        featured=True,
    ),
    listing(
        "Studio có ban công tại Bạch Mai", 5000000, 25, "Hai Bà Trưng", "Bạch Mai",
        "Bạch Mai, Hai Bà Trưng, Hà Nội", "STUDIO", 14,
        ["WiFi", "Máy lạnh", "Tủ lạnh", "Giường", "WC riêng", "Ban công", "Bếp", "Nóng lạnh"],
        "Studio có ban công nhỏ, bếp và WC riêng. Nhà nằm trong ngõ Bạch Mai, cách phố chính khoảng 150m, gần chợ và nhiều cửa hàng tiện lợi.",
        verified=True,
    ),
    listing(
        "Studio tiện nghi gần Mỹ Đình", 6500000, 31, "Nam Từ Liêm", "Mỹ Đình 1",
        "Mỹ Đình 1, Nam Từ Liêm, Hà Nội", "STUDIO", 15,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Bếp", "Thang máy", "Camera"],
        "Studio 31m² có đầy đủ đồ cơ bản và máy giặt riêng. Khu vực nhiều văn phòng, siêu thị và quán ăn; phù hợp người đi làm tại Mỹ Đình – Cầu Giấy.",
        featured=True, verified=True,
    ),

    # 17-21 · Chung cư mini
    listing(
        "Chung cư mini 1PN tại Mễ Trì", 7500000, 40, "Nam Từ Liêm", "Mễ Trì",
        "Mễ Trì, Nam Từ Liêm, Hà Nội", "MINI_APARTMENT", 16,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Bếp", "Thang máy", "Chỗ để xe"],
        "Căn 1 phòng ngủ riêng, diện tích khoảng 40m², có phòng khách nhỏ và bếp. Tòa nhà có thang máy, khu để xe tầng một và camera ở khu vực chung.",
        max_occ=3, status="RENTED", featured=True, verified=True,
    ),
    listing(
        "Chung cư mini có thang máy ở Cầu Giấy", 6800000, 36, "Cầu Giấy", "Dịch Vọng",
        "Dịch Vọng, Cầu Giấy, Hà Nội", "MINI_APARTMENT", 17,
        ["WiFi", "Máy lạnh", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Bếp", "Thang máy", "Camera"],
        "Căn 36m² có khu ngủ, bếp và bàn ăn bố trí tách nhau. Nhà có thang máy, khóa cửa điện tử và camera hành lang; gần công viên Cầu Giấy.",
        verified=True,
    ),
    listing(
        "Chung cư mini 32m² tại Hà Đông", 5900000, 32, "Hà Đông", "Mộ Lao",
        "Mộ Lao, Hà Đông, Hà Nội", "MINI_APARTMENT", 18,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "WC riêng", "Bếp", "Nóng lạnh"],
        "Căn mini 32m² phù hợp cặp đôi, có bếp nấu và máy giặt riêng. Từ nhà ra đường Trần Phú và ga metro khoảng vài phút đi xe.",
        verified=True,
    ),
    listing(
        "Chung cư mini gần Đại học Y", 6100000, 34, "Đống Đa", "Khương Thượng",
        "Khương Thượng, Đống Đa, Hà Nội", "MINI_APARTMENT", 19,
        ["WiFi", "Máy lạnh", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Bếp", "Thang máy"],
        "Căn hộ mini 34m² trong ngõ Khương Thượng, có bếp và khu ngủ riêng tương đối. Tòa nhà yên tĩnh, phù hợp bác sĩ, sinh viên sau đại học hoặc người đi làm.",
    ),
    listing(
        "Chung cư mini tại Tây Hồ", 8500000, 42, "Tây Hồ", "Quảng An",
        "Quảng An, Tây Hồ, Hà Nội", "MINI_APARTMENT", 20,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Ban công", "Bếp", "Thang máy"],
        "Căn 42m² có ban công và bếp riêng, nằm trong khu Quảng An. Nội thất đầy đủ, phù hợp người đi làm muốn ở gần Hồ Tây nhưng vẫn cần không gian vừa phải.",
        featured=True, verified=True,
    ),

    # 22-25 · Căn hộ
    listing(
        "Căn hộ 1PN tại Trung Hoà Nhân Chính", 11000000, 52, "Cầu Giấy", "Trung Hòa",
        "Trung Hòa Nhân Chính, Cầu Giấy, Hà Nội", "APARTMENT", 21,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Ban công", "Bếp", "Thang máy", "Chỗ để xe"],
        "Căn hộ 1 phòng ngủ có phòng khách, bếp và ban công; nội thất phù hợp ở lâu dài. Khu vực Trung Hòa Nhân Chính thuận tiện di chuyển tới Cầu Giấy và Thanh Xuân.",
        max_occ=3, featured=True, verified=True,
    ),
    listing(
        "Căn hộ 2PN gần Times City", 14500000, 72, "Hai Bà Trưng", "Vĩnh Tuy",
        "Vĩnh Tuy, Hai Bà Trưng, Hà Nội", "APARTMENT", 22,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Ban công", "Bếp", "Thang máy", "Chỗ để xe"],
        "Căn 2 phòng ngủ, phòng khách rộng và bếp riêng, phù hợp gia đình nhỏ. Vị trí gần Times City, thuận tiện đi Minh Khai và cầu Vĩnh Tuy.",
        max_occ=4, featured=True, verified=True, internet=150000,
    ),
    listing(
        "Căn hộ 1PN tại Mỹ Đình", 12000000, 55, "Nam Từ Liêm", "Mỹ Đình 2",
        "Mỹ Đình 2, Nam Từ Liêm, Hà Nội", "APARTMENT", 23,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Bếp", "Thang máy", "Chỗ để xe"],
        "Căn 1 phòng ngủ có khu khách và bếp tách biệt, đầy đủ máy giặt và tủ lạnh. Phù hợp người đi làm tại khu Mỹ Đình – Keangnam.",
        max_occ=3, verified=True,
    ),
    listing(
        "Căn hộ dịch vụ gần Hồ Tây", 15000000, 58, "Tây Hồ", "Tứ Liên",
        "Tứ Liên, Tây Hồ, Hà Nội", "APARTMENT", 24,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Ban công", "Bếp", "Thang máy"],
        "Căn hộ dịch vụ 1 phòng ngủ, có dọn vệ sinh khu vực chung và hỗ trợ kỹ thuật khi cần. Không gian sáng, gần Hồ Tây và khu Tứ Liên.",
        max_occ=3, featured=True, verified=True, internet=0,
    ),

    # 26-28 · Nhà nguyên căn
    listing(
        "Nhà nguyên căn 3 tầng tại Hà Đông", 13000000, 75, "Hà Đông", "La Khê",
        "La Khê, Hà Đông, Hà Nội", "WHOLE_HOUSE", 25,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "WC riêng", "Ban công", "Bếp", "Chỗ để xe"],
        "Nhà 3 tầng trong ngõ dân cư, tổng diện tích sử dụng khoảng 75m². Có 2 phòng ngủ, bếp và sân để xe nhỏ; phù hợp gia đình hoặc nhóm 3–4 người.",
        max_occ=5, furnished=False, verified=True,
    ),
    listing(
        "Nhà nguyên căn 2 tầng tại Hoàng Mai", 11500000, 62, "Hoàng Mai", "Lĩnh Nam",
        "Lĩnh Nam, Hoàng Mai, Hà Nội", "WHOLE_HOUSE", 26,
        ["WiFi", "Máy lạnh", "WC riêng", "Ban công", "Bếp", "Chỗ để xe"],
        "Nhà 2 tầng có 2 phòng ngủ, phòng khách và bếp riêng. Ngõ trước nhà đủ rộng để xe máy thoải mái, gần chợ dân sinh và đường Lĩnh Nam.",
        max_occ=5, furnished=False,
    ),
    listing(
        "Nhà nguyên căn ngõ rộng tại Bắc Từ Liêm", 12500000, 70, "Bắc Từ Liêm", "Cổ Nhuế 1",
        "Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội", "WHOLE_HOUSE", 27,
        ["WiFi", "Máy lạnh", "WC riêng", "Ban công", "Bếp", "Chỗ để xe", "Camera"],
        "Nhà nguyên căn trong ngõ rộng, gồm 2 phòng ngủ, khu khách và bếp. Phù hợp gia đình hoặc nhóm người đi làm tại Cầu Giấy – Bắc Từ Liêm.",
        max_occ=5, furnished=False, verified=True,
    ),

    # 29-30 · Phòng ở ghép
    listing(
        "Phòng ở ghép gần Đại học Quốc gia", 1800000, 28, "Cầu Giấy", "Dịch Vọng Hậu",
        "Dịch Vọng Hậu, Cầu Giấy, Hà Nội", "SHARED_ROOM", 28,
        ["WiFi", "Máy lạnh", "Giường", "Tủ quần áo", "WC riêng", "Máy giặt"],
        "Phòng 28m² hiện có một người ở, cần thêm một bạn để chia chi phí. Giá hiển thị là phần dự kiến mỗi người/tháng; điện nước chia theo thực tế sử dụng.",
        max_occ=2, verified=True,
    ),
    listing(
        "Phòng ở ghép nữ tại Thanh Xuân", 2200000, 30, "Thanh Xuân", "Khương Đình",
        "Khương Đình, Thanh Xuân, Hà Nội", "SHARED_ROOM", 29,
        ["WiFi", "Máy lạnh", "Máy giặt", "Tủ lạnh", "Giường", "Tủ quần áo", "WC riêng", "Bếp"],
        "Phòng ở ghép dành cho nữ, hiện còn một chỗ trống. Phòng có bếp nhỏ, máy giặt và WC riêng; ưu tiên người đi làm hoặc sinh viên giữ vệ sinh chung.",
        max_occ=2, featured=True,
    ),
]

# ---------------------------------------------------------------------------
# Bài đăng ở ghép demo
# ---------------------------------------------------------------------------
ROOMMATE_POSTS = [
    (13, "LOOKING_ROOM", "Nữ sinh viên tìm phòng ở Cầu Giấy",
     "Mình là nữ sinh viên năm 3 trường Ngoại Thương, tính nết hiền lành, sạch sẽ, giờ giấc điều độ. Đang tìm phòng khoảng 2-3 triệu ở khu Cầu Giấy, ưu tiên gần trường hoặc gần bến xe buýt.",
     "Cầu Giấy", 2000000, 3000000, "FEMALE", 1, "2026-09", "Đại học Ngoại Thương", "",
     ["WiFi", "Máy lạnh"], None, 0, 0, None, None, "", []),

    (12, "LOOKING_ROOMMATE", "Có phòng 2 người tại Thanh Xuân, tìm thêm 1 bạn nữ",
     "Mình đang thuê phòng 30m² tại Thanh Xuân, đầy đủ nội thất. Phòng ở được 2 người, mình tìm thêm 1 bạn nữ ở ghép cho vui. Chi phí chia đôi tiền phòng + điện nước.",
     "Thanh Xuân", None, None, "FEMALE", 2, "2026-08", "", "Nhân viên văn phòng",
     ["WiFi", "Máy lạnh", "Máy giặt"], 3000000, 1, 1, 1500000, 30, "Thanh Xuân, Hà Nội",
     [ROOM_IMAGES[7], ROOM_IMAGES[8]]),

    (11, "LOOKING_ROOM", "Nam đi làm tìm phòng gần Mỹ Đình",
     "Mình là nam, 26 tuổi, làm IT tại FPT Cầu Giấy. Tìm phòng khu Mỹ Đình hoặc Cầu Diễn, ngân sách 2.5-3.5 triệu. Ưu tiên phòng có máy lạnh, WC riêng, yên tĩnh để làm việc.",
     "Nam Từ Liêm", 2500000, 3500000, "MALE", 1, "2026-09", "", "FPT Software",
     ["WiFi", "Máy lạnh", "WC riêng"], None, 0, 0, None, None, "", []),

    (7, "LOOKING_ROOMMATE", "Tìm bạn ở ghép phòng rộng tại Đống Đa",
     "Mình là nam, 28 tuổi, đang thuê phòng 28m² tại Láng Hạ - Đống Đa. Phòng rộng, có gác lửng, muốn tìm 1 bạn nam ở ghép. Mình ít khi ở nhà, thích sự yên tĩnh và sạch sẽ.",
     "Đống Đa", None, None, "MALE", 2, "2026-08", "", "Nhân viên ngân hàng",
     ["WiFi", "Máy lạnh", "Bếp"], 3800000, 1, 1, 1900000, 28, "Láng Hạ, Đống Đa",
     [ROOM_IMAGES[15], ROOM_IMAGES[16]]),

    (10, "LOOKING_ROOM", "Sinh viên năm 2 tìm phòng gần ĐH Bách Khoa",
     "Mình là sinh viên Bách Khoa, tìm phòng khu Hai Bà Trưng hoặc Bạch Mai, ngân sách 1.5-2.5 triệu. Không yêu cầu cao, chỉ cần sạch sẽ, có wifi mạnh và yên tĩnh để học.",
     "Hai Bà Trưng", 1500000, 2500000, "MALE", 1, "2026-09", "Đại học Bách Khoa Hà Nội", "",
     ["WiFi"], None, 0, 0, None, None, "", []),

    (9, "LOOKING_ROOMMATE", "Nam tìm ở ghép khu Văn Quán, Hà Đông",
     "Mình là nam, 24 tuổi, nhân viên văn phòng tại Hà Đông. Tìm bạn ở ghép khu Văn Quán hoặc Dương Nội, ngân sách 2-3 triệu/người. Mình thích nấu ăn, có thể chia bữa cùng nhau.",
     "Hà Đông", 2000000, 3000000, "MALE", 2, "2026-08", "", "Nhân viên văn phòng",
     ["WiFi", "Bếp", "Máy giặt"], None, 0, 0, None, None, "", []),

    (13, "LOOKING_ROOM", "Nữ đi làm tìm phòng yên tĩnh tại Hoàng Mai",
     "Mình là nữ, 25 tuổi, làm kế toán tại Hoàng Mai. Tìm phòng khu Định Công, Linh Đàm, ngân sách 2.5-3.5 triệu. Ưu tiên phòng có WC riêng, chỗ để xe, khu vực an ninh.",
     "Hoàng Mai", 2500000, 3500000, "FEMALE", 1, "2026-09", "", "Nhân viên kế toán",
     ["WiFi", "WC riêng", "Chỗ để xe"], None, 0, 0, None, None, "", []),

    (3, "LOOKING_ROOMMATE", "Có phòng full nội thất Cầu Giấy, tìm 1 bạn nam",
     "Mình có phòng studio 25m² full nội thất tại Dịch Vọng Hậu - Cầu Giấy, hiện ở 1 mình. Tìm 1 bạn nam ở ghép, chi phí chia đôi. Phòng mới, sạch, có ban công riêng.",
     "Cầu Giấy", None, None, "MALE", 2, "2026-08", "", "Kỹ sư xây dựng",
     ["WiFi", "Máy lạnh", "Ban công"], 2800000, 1, 1, 1400000, 25, "Dịch Vọng Hậu, Cầu Giấy",
     [ROOM_IMAGES[0], ROOM_IMAGES[1]]),
]

# ---------------------------------------------------------------------------
# Dữ liệu hợp đồng / hoá đơn / điện nước / sửa chữa cho phòng đã cho thuê
# room_id -> (tenant_user_idx, start, end, deposit)
# ---------------------------------------------------------------------------
RENTED = {
    3: (6, "2026-03-01", "2027-03-01", 4000000),
    6: (7, "2026-01-15", "2027-01-15", 9000000),
    10: (8, "2026-04-01", "2027-04-01", 5200000),
    13: (9, "2026-05-01", "2027-05-01", 4800000),
    17: (10, "2026-02-01", "2027-02-01", 4600000),
}

# Chỉ số điện/nước theo tháng: (period, elec_prev, elec_curr, water_prev, water_curr)
METER_DATA = {
    3: [("2026-05", 210, 246, 18, 22), ("2026-06", 246, 289, 22, 27), ("2026-07", 289, 332, 27, 31)],
    6: [("2026-05", 540, 596, 31, 36), ("2026-06", 596, 664, 36, 42), ("2026-07", 664, 728, 42, 47)],
    10: [("2026-05", 310, 345, 20, 24), ("2026-06", 345, 388, 24, 29), ("2026-07", 388, 441, 29, 34)],
    13: [("2026-05", 95, 128, 14, 18), ("2026-06", 128, 167, 18, 23), ("2026-07", 167, 204, 23, 27)],
    17: [("2026-05", 155, 187, 16, 20), ("2026-06", 187, 224, 20, 25), ("2026-07", 224, 268, 25, 30)],
}

MAINTENANCE = [
    (6, 7, "Điều hoà không mát", "Điều hoà phòng chạy nhưng không mát, tiếng kêu to. Nhờ chủ nhà kiểm tra giúp.", "HIGH", "PENDING"),
    (3, 6, "Vòi nước nhà tắm bị rò rỉ", "Vòi nước phía bồn rửa bị rò rỉ nhỏ giọt suốt đêm.", "MEDIUM", "IN_PROGRESS"),
    (10, 8, "Bóng đèn phòng ngủ chập chờn", "Bóng đèn phòng ngủ lúc sáng lúc tối, cần thay bóng mới.", "LOW", "RESOLVED"),
]

FAVORITES = {
    6: [1, 4, 9],
    11: [2, 16],
    8: [14],
}

NOTIFICATIONS = [
    (6, "INVOICE", "Hoá đơn tháng 07 đã sẵn sàng", "Hoá đơn tiền phòng + điện nước tháng 07 đã được tạo. Vui lòng thanh toán trước ngày 05/08.", "/invoices"),
    (6, "MAINTENANCE", "Yêu cầu sửa chữa đang được xử lý", "Chủ nhà đã nhận yêu cầu sửa vòi nước của bạn.", "/maintenance"),
    (7, "INVOICE", "Thanh toán hoá đơn thành công", "Hoá đơn tháng 06 đã được thanh toán. Cảm ơn bạn!", "/invoices"),
    (11, "SYSTEM", "Chào mừng đến YangRent", "Cảm ơn bạn đã đăng ký. Hãy khám phá chỗ ở phù hợp nhé!", "/"),
]

CHAT = [
    # (user1_idx, user2_idx, room_id, [(sender_idx, content), ...])
    (11, 1, 1, [
        (11, "Chào anh, em xem phòng ở Dịch Vọng Hậu trên YangRent. Phòng còn trống không ạ?"),
        (1, "Chào em, phòng vẫn còn trống em nhé. Em muốn xem lúc nào?"),
        (11, "Cuối tuần này em qua xem được không ạ? Khoảng 9h sáng chủ nhật."),
        (1, "Được em, chủ nhật 9h anh có nhà. Đến ngõ 21 gọi anh nhé."),
    ]),
    (12, 5, 4, [
        (12, "Dạ anh ơi, phòng căn hộ mini Cầu Diễn còn không ạ?"),
        (5, "Còn em ơi, em xem được phòng chưa? Anh gửi thêm vài tấm ảnh thực tế nhé."),
    ]),
]

REPORTS = [
    (11, "ROOM", 8, "Tin đăng trùng lặp", "Bài đăng này bị đăng lặp lại nhiều lần với giá khác nhau.", "PENDING"),
    (12, "ROOM", 19, "Thông tin không đúng", "Diện tích thực tế nhỏ hơn nhiều so với mô tả.", "REVIEWING"),
]

# Toạ độ gần đúng cho từng quận (dùng cho bản đồ)
DISTRICT_COORDS = {
    "Cầu Giấy": (21.0310, 105.8000), "Nam Từ Liêm": (21.0337, 105.7628),
    "Thanh Xuân": (20.9924, 105.7990), "Đống Đa": (21.0218, 105.8232),
    "Hai Bà Trưng": (21.0090, 105.8550), "Hà Đông": (20.9677, 105.7767),
    "Hoàng Mai": (20.9760, 105.8540), "Ba Đình": (21.0358, 105.8342),
    "Tây Hồ": (21.0694, 105.8181), "Bắc Từ Liêm": (21.0733, 105.7705),
}

# ---------------------------------------------------------------------------
# Logic seed
# ---------------------------------------------------------------------------
def seed() -> None:
    """Tạo bảng (nếu cần) và đổ dữ liệu demo.

    - Ưu tiên chạy qua Alembic migrations (phù hợp PostgreSQL/Supabase).
    - Fallback: create_all nếu chưa có migration (SQLite dev nhanh).
    """
    reset = "--reset" in sys.argv

    # Kiểm tra xem migration Alembic đã áp dụng chưa (bảng alembic_version tồn tại?)
    inspector = sa.inspect(engine)
    has_alembic = "alembic_version" in inspector.get_table_names()
    has_tables = len(inspector.get_table_names()) > 0

    if reset:
        print("== Xoá toàn bộ dữ liệu cũ...")
        if has_alembic:
            # Dùng Alembic downgrade base rồi upgrade lại để sạch schema
            import subprocess
            subprocess.run([sys.executable, "-m", "alembic", "downgrade", "base"], check=False)
            subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=False)
        else:
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
    elif not has_tables:
        if has_alembic:
            import subprocess
            subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=False)
        else:
            Base.metadata.create_all(bind=engine)
    else:
        # Bảng đã tồn tại nhưng chưa qua Alembic (DB SQLite cũ) -> chạy create_all để thêm bảng mới nếu thiếu
        if not has_alembic:
            Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ---------- Roles ----------
        role_defs = [
            ("ADMIN", "Quản trị hệ thống"),
            ("USER", "Người dùng thông thường"),
            ("LANDLORD", "Chủ nhà - đăng phòng và quản lý cho thuê"),
            ("TENANT", "Người thuê - quản lý phòng đang thuê"),
        ]
        for name, desc in role_defs:
            get_or_create_role(db, name, desc)
        db.commit()

        # ---------- Users ----------
        users = []
        for email, pw, full_name, phone, gender, av_idx, verified, roles in USERS:
            # Admin dùng ảnh local (frontend/public/kin.jpg); các user khác dùng ảnh Unsplash
            avatar_url = "/kin.jpg" if email == "admin@yangrent.vn" else AVATARS[av_idx]
            user = User(
                email=email, hashed_password=hash_password(pw), full_name=full_name,
                phone=phone, gender=gender, avatar_url=avatar_url,
                is_verified=verified, status="ACTIVE",
            )
            for r in roles:
                user.add_role(get_or_create_role(db, r))
            db.add(user)
            users.append(user)
        db.commit()
        print(f"  + {len(users)} người dùng")

        # ---------- Amenities ----------
        amenity_map = {}
        for name, icon in AMENITIES:
            amenity = Amenity(name=name, icon=icon)
            db.add(amenity)
            amenity_map[name] = amenity
        db.commit()
        print(f"  + {len(amenity_map)} tiện ích")

        # ---------- Listings / rooms ----------
        # Giữ entity kỹ thuật Room để tương thích schema/API cũ; UI hiển thị theo property type.
        rooms = []
        for idx, r in enumerate(ROOMS):
            lat, lng = DISTRICT_COORDS.get(r["district"], (21.0285, 105.8542))
            # user index 1..5 là năm chủ nhà demo; phân bổ vòng tròn để dữ liệu cân bằng.
            landlord_user = users[1 + (idx % 5)]
            room = Room(
                landlord_id=landlord_user.id, title=r["title"], description=r["description"],
                price=r["price"], area=r["area"], address=r["address"], city="Hà Nội",
                district=r["district"], ward=r["ward"], latitude=lat, longitude=lng,
                room_type=r["room_type"], bathroom_type=r["bathroom"], furnished=r["furnished"],
                max_occupants=r["max_occ"], electricity_price=r["elec"], water_price=r["water"],
                internet_price=r["internet"], status=r["status"], is_featured=r["featured"],
                is_verified=r["verified"], moderation_status="APPROVED",
                view_count=45 + idx * 13, created_at=datetime.utcnow() - timedelta(days=idx),
            )
            db.add(room)
            db.flush()

            for image_order, image_url in enumerate(PROPERTY_IMAGE_SETS[r["image_set"]]):
                db.add(RoomImage(
                    room_id=room.id, image_url=image_url,
                    is_primary=(image_order == 0), sort_order=image_order,
                ))
            for am_name in r["amenities"]:
                if am_name in amenity_map:
                    room.amenities.append(amenity_map[am_name])
            rooms.append(room)
        db.commit()
        print(f"  + {len(rooms)} chỗ ở (3 ảnh/listing demo, cover được đánh dấu rõ)")

        # ---------- Roommate posts ----------
        for p in ROOMMATE_POSTS:
            (u_idx, ptype, title, desc, district, bmin, bmax, gender, num_people,
             move_in, school, workplace, desired, room_price, current, needed,
             cost, area, addr, images) = p
            post = RoommatePost(
                user_id=users[u_idx].id, post_type=ptype, title=title, description=desc,
                city="Hà Nội", district=district, budget_min=bmin, budget_max=bmax,
                gender_pref=gender, num_people=num_people, move_in_date=move_in,
                school=school, workplace=workplace, desired_amenities=desired,
                room_price=room_price, current_people=current, needed_people=needed,
                cost_per_person=cost, room_area=area, room_address=addr, images=images,
                status="ACTIVE",
            )
            db.add(post)
        db.commit()
        print(f"  + {len(ROOMMATE_POSTS)} bài đăng ở ghép")

        # ---------- Hợp đồng + Hoá đơn + Điện nước cho phòng đã thuê ----------
        contracts = {}
        invoices = []
        for room_id, (tenant_idx, start, end, deposit) in RENTED.items():
            room = rooms[room_id - 1]
            contract = Contract(
                room_id=room.id, landlord_id=room.landlord_id,
                tenant_id=users[tenant_idx].id,
                code=f"YR-2026-{room_id:03d}",
                start_date=start, end_date=end,
                monthly_rent=room.price, deposit_amount=deposit,
                terms=("Hợp đồng thuê chỗ ở. Tiền thuê thanh toán trước ngày 05 hàng tháng. "
                       "Đặt cọc 2 tháng, trả lại khi hết hạn hợp đồng nếu không hư hại tài sản. "
                       "Không tự ý cho người ngoài ở chung khi chưa có sự đồng ý của chủ nhà."),
                status="ACTIVE",
            )
            db.add(contract)
            db.flush()
            contracts[room_id] = contract

            # 3 tháng hoá đơn
            for period, elec_prev, elec_curr, water_prev, water_curr in METER_DATA[room_id]:
                elec_amt = round((elec_curr - elec_prev) * room.electricity_price)
                water_amt = round((water_curr - water_prev) * room.water_price)
                due = {"2026-05": "2026-06-05", "2026-06": "2026-07-05", "2026-07": "2026-08-05"}[period]
                is_paid = period in ("2026-05", "2026-06") or room_id == 6
                invoice = Invoice(
                    room_id=room.id, tenant_id=users[tenant_idx].id,
                    landlord_id=room.landlord_id, period=period, due_date=due,
                    rent_amount=room.price, electricity_amount=elec_amt,
                    water_amount=water_amt, internet_amount=room.internet_price,
                    service_amount=50000, other_amount=0,
                    total_amount=room.price + elec_amt + water_amt + room.internet_price + 50000,
                    status="PAID" if is_paid else "PENDING",
                    qr_content=f"YR{room.id:04d}-{period}",
                )
                db.add(invoice)
                invoices.append(invoice)

                # Chỉ số điện + nước
                db.add(MeterReading(
                    room_id=room.id, contract_id=contract.id, period=period,
                    meter_type="ELECTRICITY", previous_value=elec_prev, current_value=elec_curr,
                    consumption=elec_curr - elec_prev, unit_price=room.electricity_price,
                    amount=elec_amt, status="CONFIRMED",
                ))
                db.add(MeterReading(
                    room_id=room.id, contract_id=contract.id, period=period,
                    meter_type="WATER", previous_value=water_prev, current_value=water_curr,
                    consumption=water_curr - water_prev, unit_price=room.water_price,
                    amount=water_amt, status="CONFIRMED",
                ))
        db.commit()
        print(f"  + {len(contracts)} hợp đồng, {len(invoices)} hoá đơn, chỉ số điện/nước")

        # ---------- Sửa chữa ----------
        for room_id, tenant_idx, title, desc, priority, status in MAINTENANCE:
            room = rooms[room_id - 1]
            db.add(MaintenanceRequest(
                room_id=room.id, tenant_id=users[tenant_idx].id,
                landlord_id=room.landlord_id, title=title, description=desc,
                priority=priority, status=status,
            ))
        db.commit()
        print(f"  + {len(MAINTENANCE)} yêu cầu sửa chữa")

        # ---------- Favorites ----------
        fav_count = 0
        for user_idx, room_ids in FAVORITES.items():
            for rid in room_ids:
                db.add(Favorite(user_id=users[user_idx].id, room_id=rooms[rid - 1].id))
                fav_count += 1
        db.commit()
        print(f"  + {fav_count} lượt yêu thích")

        # ---------- Thông báo ----------
        for user_idx, ntype, title, content, link in NOTIFICATIONS:
            db.add(Notification(user_id=users[user_idx].id, type=ntype,
                                title=title, content=content, link=link))
        db.commit()

        # ---------- Chat ----------
        for u1_idx, u2_idx, room_id, messages in CHAT:
            conv = Conversation(
                user1_id=users[u1_idx].id, user2_id=users[u2_idx].id,
                room_id=rooms[room_id - 1].id if room_id else None,
            )
            db.add(conv)
            db.flush()
            for sender_idx, content in messages:
                db.add(Message(conversation_id=conv.id, sender_id=users[sender_idx].id,
                               content=content, is_read=True))
        db.commit()
        print("  + Hội thoại chat demo")

        # ---------- Báo cáo ----------
        for reporter_idx, target_type, target_id, reason, desc, status in REPORTS:
            db.add(Report(reporter_id=users[reporter_idx].id, target_type=target_type,
                          target_id=rooms[target_id - 1].id if target_type == "ROOM" else target_id,
                          reason=reason, description=desc, status=status))
        db.commit()
        print("  + Báo cáo vi phạm demo")

        print("\n✅ Seed hoàn tất!")
        print(f"   Database: {settings.DATABASE_URL}")
        print("   Tài khoản demo:")
        print("   - Admin:      admin@yangrent.vn / admin123")
        print("   - Chủ nhà:    hung.nguyen@yangrent.vn / yangrent123")
        print("   - Người thuê: lan.vu@yangrent.vn / yangrent123")
        print("   - Người dùng: khoi.tran@yangrent.vn / yangrent123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
