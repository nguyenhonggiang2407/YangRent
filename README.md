# YangRent

Website tìm phòng và quản lý cho thuê, với giao diện React/Vite và backend FastAPI,
SQLAlchemy. Có các vai trò quản trị viên, chủ trọ, người thuê và người dùng thông thường.

## Chức năng

- Tìm phòng, lọc theo nhu cầu, lưu yêu thích và gửi yêu cầu đặt phòng.
- Đăng tin tìm người ở ghép, xem mức độ phù hợp theo khu vực và ngân sách.
- Nhắn tin và nhận thông báo.
- Chủ trọ quản lý hợp đồng, hóa đơn, chỉ số công tơ và yêu cầu bảo trì.
- Quản trị viên kiểm duyệt và quản lý dữ liệu.

Gợi ý phòng và ghép người dùng dựa trên quy tắc tính điểm.
Phần đọc công tơ và một số công cụ hỗ trợ đang ở dạng demo.

## Chạy cục bộ

Cần Python 3.10 trở lên và Node.js 20 trở lên.

Trong thư mục `backend`, tạo và kích hoạt môi trường ảo:

```bash
python -m venv .venv
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

Điền `SECRET_KEY` và `JWT_SECRET` trong `.env` bằng hai chuỗi ngẫu nhiên riêng,
mỗi chuỗi ít nhất 32 ký tự. Có thể tạo tại máy bằng:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48)); print(secrets.token_urlsafe(48))"
```

Để thử nhanh với SQLite, tạo database mẫu:

```bash
python -m seed.seed --local-demo
```

Lệnh tạo một tệp `yangrent-demo.db` mới với ba tài khoản và ba tin đăng hư cấu.
Mật khẩu được tạo khi chạy lệnh. Lệnh sẽ dừng nếu tệp đã tồn tại.

Đặt `DATABASE_URL=sqlite:///./yangrent-demo.db` trong `.env` rồi khởi động API:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Ở terminal khác, mở thư mục `frontend`:

```bash
npm ci
npm run dev
```

Vite chuyển `/api` đến `127.0.0.1:8000`. Trên PowerShell, dùng
`Copy-Item .env.example .env` thay cho `cp` ở bước sao chép cấu hình.

## Database và tài khoản quản trị

Database dùng khi triển khai là PostgreSQL. Alembic migration hiện có dùng cú pháp riêng
của PostgreSQL; không chạy chúng trên database SQLite mẫu.

Để tạo quản trị viên trên database đã cấu hình và migrate, chạy từ `backend`:

```bash
python provision_admin.py --create-admin
```

Lệnh hỏi thông tin và mật khẩu, đồng thời từ chối email đã tồn tại.

## Kiểm tra

Frontend:

```bash
npm test
npm run build
```

Backend:

```bash
python -m unittest discover -s tests -v
```

Các bài kiểm thử kiểm tra quyền truy cập, dữ liệu demo, cấu hình xác thực và thông báo.
Những tích hợp như bản đồ và tải ảnh cần kiểm tra thêm trên môi trường đã cấu hình dịch vụ.

## Cấu trúc

- `frontend/src/`: màn hình, thành phần giao diện và client API.
- `backend/app/routers/`: các route FastAPI.
- `backend/app/services/`: xử lý nghiệp vụ.
- `backend/app/models/` và `schemas/`: dữ liệu ORM và validation.
- `backend/migrations/`: Alembic migration.
- `backend/tests/` và `frontend/tests/`: kiểm thử.

Xem [hướng dẫn triển khai](docs/deployment.md) để cấu hình CORS, TLS,
PostgreSQL và lưu ảnh.

## Nguồn và quyền sử dụng

Kho mã không kèm database, cấu hình riêng hoặc ảnh tải lên của người dùng.
Dự án gốc chưa có giấy phép tái sử dụng chung; xem [thông tin nguồn](docs/source-notice.md).
