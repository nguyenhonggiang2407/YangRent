# Deploy YangRent

YangRent gồm React/Vite frontend và FastAPI backend. Do HelioHost là shared hosting, cần tách rõ phần **chắc chắn phù hợp** và phần **phụ thuộc module Python trên server**.

## Phương án khuyến nghị

```text
Frontend: HelioHost
Backend:  Render
Database: Supabase PostgreSQL
Storage:  Supabase Storage
```

Đây là phương án ít phụ thuộc cấu hình WSGI/module Python của shared host nhất.

## 1. Chuẩn bị Supabase

Tạo `backend/.env` từ `.env.example`:

```env
SECRET_KEY=<random-long-secret>
JWT_SECRET=<another-random-long-secret>
DATABASE_URL=postgresql://...
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<backend-only-key>
CORS_ORIGINS=https://YOUR_DOMAIN.helioho.st
```

Không đưa file này lên GitHub.

## 2. Deploy backend lên Render

Project đã có `render.yaml`.

Trên Render:

1. Push source lên GitHub.
2. Tạo Web Service/Blueprint từ repository.
3. Root directory: `backend`.
4. Build:

```text
pip install -r requirements.txt && python -m alembic upgrade head
```

5. Start:

```text
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

6. Cấu hình environment:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SECRET_KEY
JWT_SECRET
CORS_ORIGINS
```

7. Kiểm tra:

```text
https://YOUR-RENDER-URL/api/health
https://YOUR-RENDER-URL/docs
```

## 3. Build frontend

Trong `frontend/.env`:

```env
VITE_API_URL=https://YOUR-RENDER-URL/api
```

Build:

```bash
cd frontend
npm ci
npm run build
```

Output: `frontend/dist/`.

## 4. Upload frontend lên HelioHost

HelioHost/Plesk mới thường dùng:

```text
/home/YOUR_DOMAIN/httpdocs/
```

Tài khoản chuyển từ cPanel cũ có thể vẫn dùng:

```text
/home/YOUR_DOMAIN/public_html/
```

Upload **nội dung** `frontend/dist/` vào web root.

Tạo `.htaccess` ở web root:

```apache
RewriteEngine On

RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

RewriteRule ^ index.html [L]
```

Kiểm tra các route React trực tiếp như `/rooms`, `/login`, `/dashboard/...` không trả 404.

---

# Phương án B – Backend cùng HelioHost

Chỉ dùng khi server của bạn có đủ module Python cần thiết. HelioHost hiện yêu cầu người dùng kiểm tra module đã cài trên đúng server/Python version trước khi yêu cầu thêm module.

Backend YangRent cần tối thiểu:

```text
fastapi
pydantic
pydantic-settings
sqlalchemy
PyJWT
bcrypt
python-multipart
email-validator
alembic
psycopg2-binary (nếu PostgreSQL)
a2wsgi
```

Nếu thiếu, bạn cần yêu cầu HelioHost cài module hoặc dùng backend Render.

## Cấu trúc gợi ý

```text
httpdocs/
├── index.html
├── assets/
├── .htaccess
└── yangrent-api/
    ├── app/
    ├── migrations/
    ├── seed/
    ├── requirements.txt
    ├── dispatch.wsgi
    ├── .htaccess
    └── .env
```

## `.htaccess` trong `yangrent-api/`

```apache
Options +ExecCGI
RewriteEngine On
RewriteBase /
RewriteRule ^(dispatch\.wsgi/.*)$ - [L]
RewriteRule ^(.*)$ yangrent-api/dispatch.wsgi/$1 [QSA,PT,L]
```

## `dispatch.wsgi`

File có sẵn tại `deploy/heliohost/dispatch.wsgi` dùng `a2wsgi.ASGIMiddleware` để bắc cầu FastAPI ASGI → WSGI.

Nếu HelioHost báo thiếu `a2wsgi`, chọn một trong hai hướng:

- yêu cầu cài module trên đúng server/Python version;
- chuyển backend sang Render (khuyến nghị hơn việc rewrite toàn backend chỉ để phù hợp host).

## CORS

Nếu frontend và backend khác domain:

```env
CORS_ORIGINS=https://YOUR_DOMAIN.helioho.st
```

Không dùng `*` khi có credentials/auth.

## Checklist sau deploy

- [ ] `/api/health` trả `status: ok`.
- [ ] Swagger `/docs` mở được.
- [ ] Homepage load đủ CSS/JS/images.
- [ ] Search/filter trả dữ liệu.
- [ ] Login demo hoạt động sau khi seed.
- [ ] Favorite hoạt động.
- [ ] Property detail + gallery hoạt động.
- [ ] Dashboard theo role hoạt động.
- [ ] Upload image hoạt động nếu Supabase Storage đã cấu hình.
- [ ] Không có secret trong frontend hoặc GitHub.

## Demo accounts

```text
Admin:      admin@yangrent.vn / admin123
Chủ nhà:    hung.nguyen@yangrent.vn / yangrent123
Người thuê: lan.vu@yangrent.vn / yangrent123
User:       khoi.tran@yangrent.vn / yangrent123
```

Đổi mật khẩu trước khi dùng dữ liệu thật.
