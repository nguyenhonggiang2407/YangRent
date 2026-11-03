# YangRent: Render API + Cloudflare Pages

Đây là cấu hình chuẩn bị triển khai cho Nguyễn Hồng Giang, chưa xác nhận service hoặc URL nào đang hoạt động. Frontend Cloudflare và backend Render là hai phần riêng, mỗi phần phải được kiểm tra sau deploy.

## Backend Render Free

Dùng `render.yaml` ở gốc repository để tạo **một** Python Web Service `yangrent-api`, nhánh `main`, root `backend`, gói **Free**. Blueprint không tạo Render Postgres, disk trả phí hoặc frontend Render. Nếu đã có service/Blueprint cũ, kiểm tra dịch vụ hiện có trước khi áp dụng để tránh tạo trùng.

Python 3.12 dùng `backend/.python-version`. Build chỉ cài dependency; migration được chạy khi start và phải thành công trước khi Uvicorn mở cổng `PORT`. Không chạy migration với cơ sở dữ liệu khác hoặc với dữ liệu thật chưa sao lưu. Khi chưa có kết nối hosting, không có migration bên ngoài nào được xác nhận là đã chạy.

Cơ sở dữ liệu dành riêng cho ứng dụng đã được tìm thấy trên Neon: project **YangRent**, ID `little-base-12541745`, vùng `aws-us-east-2`. Render chọn `ohio` để ở cùng vùng địa lý. Không dùng database này cho bốn ứng dụng demo còn lại.

Cấu hình private `DATABASE_URL` cho đúng database/branch của YangRent, dùng URL PostgreSQL trực tiếp có TLS `sslmode=require` hoặc chặt hơn. Start command chứa Alembic nên URL phải là direct/unpooled; đừng dùng hostname chứa `-pooler` cho lệnh migration. Giữ nguyên driver SQLAlchemy/psycopg2 hiện có. Không đưa URL database vào mã nguồn hoặc biến `VITE_`.

Render tự sinh hai khóa ngẫu nhiên độc lập qua `generateValue: true` cho `SECRET_KEY` và `JWT_SECRET`; khóa đã có không bị sinh lại theo mỗi commit. Đặt `CORS_ORIGINS` đúng origin HTTPS do Cloudflare cấp, không có đường dẫn. Chỉ cho phép các domain preview cụ thể khi thực sự cần, không dùng wildcard cho cookie/credential.

Ảnh bằng URL ngoài vẫn hoạt động. Upload mới cần Supabase Storage riêng với `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` và bucket `room-images`; đây là phần tùy chọn nên Blueprint không bắt buộc cung cấp các khóa đó. Không xác nhận chức năng upload đã hoạt động nếu chưa cấu hình và kiểm tra storage.

## Frontend Cloudflare Pages

Kết nối repository `nguyenhonggiang2407/YangRent` trong Cloudflare Pages:

| Trường | Giá trị |
| --- | --- |
| Production branch | `main` |
| Root directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| `NODE_VERSION` | `24.22.1` |
| `VITE_API_URL` | URL HTTPS thực tế của Render, thêm `/api` cuối |

`frontend/public/_redirects` được Vite sao chép vào `dist/_redirects`, hỗ trợ tải trực tiếp các route BrowserRouter. `VITE_API_URL` là biến public được nhúng lúc build: đổi URL API cần build/deploy frontend lại. Không cấu hình URL ví dụ hoặc port localhost trong bản public.

Thứ tự khởi tạo: tạo project Pages để lấy hostname thực tế, cấu hình origin đó ở Render, deploy và lấy URL API Render, đặt `VITE_API_URL` cho Pages rồi deploy frontend lại. Chỉ công bố link demo sau khi cả hai phía đã được kiểm tra.

## Kiểm tra trên host thật

1. Render `/api/health` trả 200, xem log migration và kiểm tra các bảng bằng database đúng dự án.
2. Cloudflare tải trang chủ, `/login`, `/rooms` và tải lại một trang chi tiết có thật.
3. Đăng ký tài khoản hư cấu, đăng nhập, tạo/chỉnh sửa dữ liệu phù hợp với quyền. Kiểm tra CORS với đúng frontend origin, từ chối origin khác.
4. Restart API rồi đăng nhập và đọc lại bản ghi để kiểm chứng dữ liệu PostgreSQL còn nguyên.
5. Chỉ tạo admin bằng công cụ riêng `backend/provision_admin.py --create-admin` với kết nối database private; không đưa mật khẩu admin vào build log hoặc GitHub. Render Free không có shell/one-off job, có thể chạy CLI riêng từ môi trường tin cậy sau khi migration thành công.
6. Kiểm tra quyền storage trước khi thử upload, và kiểm tra stream thông báo/fallback polling nếu dùng.
7. Gắn URL đã kiểm tra vào README/Website của repository; chưa có URL thì không thêm link dự đoán.

Ngân sách mục tiêu 0đ: chọn Free, không thêm disk/dịch vụ tính phí, không ping giữ service thức. Dữ liệu PostgreSQL được giữ riêng ngoài filesystem Render; hosting Free vẫn có hạn mức và có thể ngủ.

Tham khảo: [Render Free](https://render.com/docs/free), [Render Blueprint](https://render.com/docs/blueprint-spec), [Pages build config](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/). Xem thêm [deployment.md](deployment.md) về TLS, lưu trữ, migration và quyền database.
