# YangRent

**YangRent – Thuê nhà, thuê phòng đúng nhu cầu**  
**Slogan:** *Tìm đúng nơi. Ở đúng gu.*

YangRent là nền tảng full-stack tìm kiếm và quản lý nhà, phòng và căn hộ cho thuê. 

## Mục tiêu sản phẩm

YangRent phục vụ ba nhóm chính:

- **Người tìm thuê:** tìm phòng, studio, căn hộ, nhà nguyên căn, lưu yêu thích, gửi yêu cầu giữ chỗ, tìm người ở ghép và nhận gợi ý YangMatch.
- **Chủ nhà:** đăng tin, quản lý bất động sản, người thuê, hợp đồng, hóa đơn, điện nước, sửa chữa và hội thoại.
- **Quản trị viên:** quản lý người dùng, kiểm duyệt tin, báo cáo vi phạm và thống kê hệ thống.

## Tính năng chính

- Auth + JWT + bcrypt.
- RBAC: `ADMIN`, `LANDLORD`, `TENANT`, `USER`.
- Tìm kiếm, lọc, sắp xếp và phân trang chỗ ở.
- 6 loại chỗ ở: phòng cho thuê, studio, chung cư mini, căn hộ, nhà nguyên căn, ở ghép.
- Property detail + gallery + lightbox.
- Favorite, report, yêu cầu giữ chỗ.
- Dashboard chủ nhà/người thuê/admin.
- Hợp đồng, hóa đơn, thanh toán demo, chỉ số điện nước.
- Maintenance request.
- Chat + notification.
- Roommate matching.
- **YangMatch**: recommendation rule-based theo ngân sách, khu vực, loại chỗ ở và tiện nghi. Không tuyên bố machine learning khi chưa có model ML thật.
- Supabase PostgreSQL + Supabase Storage tùy chọn.
- Seed 30 listing demo tại Hà Nội.

## Kiến trúc

```text
YangRent/
├── backend/                    # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── core/               # Security, auth dependencies, exceptions
│   │   ├── models/             # ORM models
│   │   ├── routers/            # REST API
│   │   ├── schemas/            # Pydantic schemas
│   │   └── services/           # Business logic
│   ├── migrations/             # Alembic
│   ├── seed/                   # Seed data + image mapping
│   ├── requirements.txt
│   └── .env.example
├── frontend/                   # React 18 + Vite + Tailwind
│   ├── public/images/properties/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── config/brand.js
│   │   ├── context/
│   │   ├── pages/
│   │   └── utils/
│   └── .env.example
├── deploy/
├── docs/
│   └── IMAGE_SOURCES.md
├── CHANGELOG_FINAL.md
├── DEPLOY_HELIOHOST.md
├── TEST_REPORT.md
└── README.md
```

## Công nghệ

### Frontend

- React 18
- Vite 5
- Tailwind CSS 3
- Axios
- React Router
- Lucide React
- Leaflet
- Recharts

### Backend

- Python 3.11+
- FastAPI
- SQLAlchemy 2
- Pydantic 2
- JWT
- bcrypt
- Alembic
- PostgreSQL / SQLite

## Chạy local

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
python seed/seed.py
python run.py
```

Backend mặc định: `http://127.0.0.1:8000`  
Swagger: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định: `http://localhost:5173`.

## Production build

```bash
cd frontend
npm ci
npm run build
```

Output nằm trong `frontend/dist/`.

> Không commit `node_modules`, `.venv`, `.env`, database local hoặc secret.

## Database

Mặc định local:

```env
DATABASE_URL=sqlite:///./troflow.db
```

Tên file SQLite kỹ thuật cũ được giữ lại để tránh migration không cần thiết; tên này không phải brand hiển thị.

Supabase PostgreSQL:

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_BACKEND_ONLY_KEY
```

## Seed data

Seed hiện có **30 listing**:

- 10 phòng cho thuê
- 6 studio
- 5 chung cư mini
- 4 căn hộ
- 3 nhà nguyên căn
- 2 chỗ ở ghép

Dữ liệu tập trung tại Hà Nội với giá, diện tích, vị trí và nội dung demo có tính nhất quán.

Chạy:

```bash
cd backend
python seed/seed.py
```

Reset toàn bộ dữ liệu demo:

```bash
python seed/seed.py --reset
```

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@yangrent.vn` | `admin123` |
| Chủ nhà | `hung.nguyen@yangrent.vn` | `yangrent123` |
| Người thuê | `lan.vu@yangrent.vn` | `yangrent123` |
| User | `khoi.tran@yangrent.vn` | `yangrent123` |

**Bắt buộc đổi mật khẩu demo trước khi dùng với dữ liệu thật.**

## API chính

Prefix mặc định: `/api`.

```text
POST   /auth/register
POST   /auth/login
GET    /auth/me

GET    /rooms
GET    /rooms/featured
GET    /rooms/meta
GET    /rooms/:id
POST   /rooms
PUT    /rooms/:id
DELETE /rooms/:id
POST   /rooms/:id/favorite
POST   /rooms/:id/book

GET    /roommates
POST   /roommates

GET    /dashboard/landlord
GET    /dashboard/tenant
GET    /admin/overview

POST   /contracts
POST   /invoices
POST   /meters
POST   /maintenance

GET    /chat/conversations
POST   /chat/conversations
GET    /notifications

GET    /ai/recommend
GET    /ai/suspicious/:room_id
```

Response chuẩn:

```json
{
  "success": true,
  "data": {},
  "message": "..."
}
```

## Hình ảnh

- 15 listing đầu dùng WebP local trong `frontend/public/images/properties/`.
- 15 listing còn lại dùng Unsplash remote fallback trong seed.
- `RoomImage.is_primary` xác định cover.
- `RoomImage.sort_order` xác định thứ tự gallery.
- Frontend dùng `SmartImage` để fallback khi ảnh lỗi.
- Ảnh ngoài viewport được lazy-load.

Chi tiết nguồn và attribution: [`docs/IMAGE_SOURCES.md`](docs/IMAGE_SOURCES.md).

## Bảo mật

- Password hash bằng bcrypt.
- JWT secret tách khỏi source.
- Backend kiểm tra quyền và ownership; frontend chỉ là lớp UX.
- SQLAlchemy giảm rủi ro SQL injection khi dùng ORM đúng cách.
- Pydantic validation cho request.
- CORS cấu hình qua environment.
- `.env` nằm trong `.gitignore`.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng ở backend.
- Không đóng gói `.env` thật trong ZIP bàn giao.

## Deployment

Xem [`DEPLOY_HELIOHOST.md`](DEPLOY_HELIOHOST.md).

Lưu ý quan trọng: HelioHost là shared hosting và module Python khả dụng phụ thuộc server. Với project FastAPI/SQLAlchemy, phương án dễ vận hành hơn thường là:

```text
Frontend React build → HelioHost
Backend FastAPI      → Render
Database/Storage     → Supabase
```

Nếu server HelioHost của bạn đã có đủ module FastAPI/SQLAlchemy/a2wsgi/bcrypt/PostgreSQL driver, backend cũng có thể thử chạy qua WSGI adapter.

## Tài liệu bàn giao

- `README.md` – tổng quan project.
- `CHANGELOG_FINAL.md` – thay đổi từ TROFLOW sang YangRent.
- `TEST_REPORT.md` – kết quả kiểm thử và giới hạn môi trường.
- `DEPLOY_HELIOHOST.md` – hướng dẫn triển khai.
- `docs/IMAGE_SOURCES.md` – image attribution và mapping.

## License

Dự án phục vụ học tập, đồ án và portfolio. Hình ảnh bên thứ ba tuân theo điều khoản của nền tảng nguồn; xem `docs/IMAGE_SOURCES.md`.
