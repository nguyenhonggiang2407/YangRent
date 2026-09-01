# CHANGELOG_FINAL – YangRent

## 2026-08-23 – Rebrand & Production Cleanup

### Branding

- Rebrand phần người dùng nhìn thấy từ TROFLOW/TRỌFLOW sang **YangRent**.
- Slogan chính: **Tìm đúng nơi. Ở đúng gu.**
- Thêm `frontend/src/config/brand.js` để tránh hard-code brand rải rác.
- Đổi metadata homepage, login/register, navbar, footer và nội dung marketing.
- Giữ entity kỹ thuật `Room`, `room_id`, `rooms` và tên SQLite legacy khi việc đổi tên không tạo lợi ích và có nguy cơ phá dữ liệu.

### Homepage / UI

- Thiết kế lại hero với search theo khu vực, loại chỗ ở và ngân sách.
- Thêm 6 category theo nhu cầu thuê.
- Thêm section chỗ ở nổi bật, mới đăng, giá tốt, khu vực Hà Nội, YangMatch và CTA chủ nhà.
- Rework property card: cover, loại chỗ ở, vị trí, giá/tháng, diện tích, sức chứa, WC, tiện nghi, trạng thái xác minh và favorite.
- Chuẩn hóa màu sắc theo phong cách modern housing marketplace.
- Cải thiện responsive và accessibility label ở các thành phần đã chỉnh.

### Property types / data

- Bổ sung `room_type` và 6 loại chỗ ở:
  - `RENTAL_ROOM`
  - `STUDIO`
  - `MINI_APARTMENT`
  - `APARTMENT`
  - `WHOLE_HOUSE`
  - `SHARED_ROOM`
- Seed lại 30 listing demo tại Hà Nội với tên, mô tả, giá, diện tích và tiện nghi tự nhiên hơn.
- Giữ ID/quan hệ seed quan trọng để không phá contract/invoice/meter/maintenance demo.

### Images

- Thêm 45 WebP local cho 15 listing đầu.
- Chuẩn hóa thư mục `frontend/public/images/properties/property-XXX/`.
- Cover và detail dùng crop/resize phù hợp card/gallery.
- Thêm `SmartImage` fallback và xử lý `onError`.
- Seed ảnh dùng `is_primary` + `sort_order` thay vì phụ thuộc thứ tự không ổn định.
- Thêm `docs/IMAGE_SOURCES.md`.

### API / frontend contract

- Sửa Axios interceptor để trả về Axios response chuẩn thay vì trả `response.data` nhưng frontend lại tiếp tục đọc `.data`.
- Giữ tương thích token cũ `troflow_token` và tự chuyển sang `yangrent_token`.

### Booking

- Sửa trạng thái sau khi chấp nhận yêu cầu giữ chỗ từ `BOOKED` không thuộc enum backend sang `RESERVED`.
- Chuẩn hóa message tiếng Việt cho luồng giữ chỗ.

### Recommendation

- Rebrand recommendation thành **YangMatch**.
- Ghi rõ implementation hiện tại là rule-based scoring, không giả định machine learning.

### Deployment / repository hygiene

- Cập nhật env examples sang YangRent.
- Cập nhật hướng dẫn deploy theo cấu trúc hiện tại.
- Loại `.env`, `.venv`, `node_modules`, log và database local khỏi ZIP bàn giao.
- Cập nhật demo accounts sang domain `@yangrent.vn`.
