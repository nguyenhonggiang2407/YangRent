# Kiến trúc và mô hình dữ liệu

Tài liệu này mô tả source trong repository, không suy ra trạng thái của dịch vụ đang chạy.

## Ranh giới frontend / backend

- `frontend/src/api/client.js` dùng Axios, lấy API prefix từ `VITE_API_URL` và đọc envelope `{ success, data, message }`. Vite proxy chỉ có ở môi trường phát triển.
- `frontend/src/context/AuthContext.jsx` quản lý trạng thái đăng nhập, gọi `/auth/me` và lưu bearer token trong `localStorage`. Đây không phải session cookie `HttpOnly`; cần đánh giá rủi ro XSS khi phát triển tiếp.
- `backend/app/main.py` gắn các router dưới `/api`, khai báo CORS và handler lỗi. `/docs` hiển thị OpenAPI khi backend đã cấu hình chạy.
- `backend/app/core/deps.py` xác thực JWT, kiểm tra trạng thái tài khoản và các role `USER`, `TENANT`, `LANDLORD`, `ADMIN`. Các router kiểm tra quyền đối với bản ghi cụ thể trước khi sửa.
- Nghiệp vụ nằm trong `backend/app/services/`; một số router cũng truy vấn SQLAlchemy trực tiếp. Database session được cấp qua dependency `get_db`.

## Quan hệ dữ liệu chính

| Nhóm bảng | Quan hệ trong ORM | Source |
| --- | --- | --- |
| `users`, `roles`, `user_roles` | User–Role nhiều/nhiều | `app/models/user.py` |
| `rooms`, `room_images`, `room_videos` | Phòng thuộc một chủ trọ; có nhiều ảnh/video | `app/models/room.py`, `room_video.py` |
| `amenities`, `room_amenities`, `favorites` | Tiện ích phòng và cặp user/phòng yêu thích | `app/models/room.py` |
| `rental_requests` | Tham chiếu phòng, người gửi và chủ phòng | `app/models/rental.py` |
| `contracts` | Tham chiếu phòng, landlord và tenant; lưu chữ ký tên và thời điểm ký | `app/models/contract.py` |
| `invoices`, `invoice_items`, `payments` | Hóa đơn có khoản mục; payment tham chiếu hóa đơn và user | `app/models/invoice.py` |
| `meter_readings`, `maintenance_requests` | Chỉ số công tơ và yêu cầu bảo trì gắn với phòng | `app/models/meter.py`, `maintenance.py` |
| Chat, thông báo, ở ghép, báo cáo | Các bảng riêng cho từng chức năng | `app/models/chat.py`, `notification.py`, `roommate.py`, `report.py` |

Các đường dẫn source trong bảng được tính từ `backend/`. Alembic quản lý schema triển khai
PostgreSQL; seed `--local-demo` tạo database SQLite mới, không áp migration PostgreSQL lên SQLite.

## Các luồng cần xem khi review

1. **Giữ chỗ:** `routers/rooms.py` kiểm tra phòng `AVAILABLE` và yêu cầu `PENDING` hiện có, tạo `RentalRequest` rồi thông báo chủ phòng. Chấp nhận chuyển phòng sang `RESERVED`. Đây là thao tác nghiệp vụ, không phải thanh toán đặt cọc thật. Truy vấn kiểm tra và ghi hiện chưa bảo đảm chống hai yêu cầu đồng thời.
2. **Hợp đồng:** `routers/contracts.py` kiểm tra chủ sở hữu phòng khi tạo và kiểm tra hai bên hợp đồng khi đọc/ký. `services/invoice_service.py` tạo hợp đồng ở `SENT`; endpoint gửi yêu cầu `DRAFT`, còn endpoint ký nhận các trạng thái riêng. Các trạng thái này cần được thống nhất và kiểm thử end-to-end trước khi mô tả là một quy trình ký hoàn chỉnh. Chữ ký tên trong database không phải dịch vụ chữ ký số pháp lý.
3. **Hóa đơn:** server cộng các khoản do request cung cấp trong `create_invoice`. API giới hạn người tạo theo quyền phòng, nhưng chưa phải hệ thống kế toán/đối soát. `pay_invoice` ghi nhận thanh toán mô phỏng với tham chiếu `MOCK-*`; không gửi giao dịch ngân hàng.
4. **Bảo trì:** người đăng nhập tạo yêu cầu; landlord sở hữu bản ghi hoặc admin được cập nhật trạng thái. Source hiện gán người tạo làm tenant từ user đăng nhập, chưa đối chiếu một hợp đồng thuê đang hiệu lực ở bước tạo.
5. **Thông báo:** fetch stream có header bearer, không đưa token vào URL; khi stream kết thúc/lỗi, frontend chuyển sang polling. Xem `frontend/src/lib/notificationStream.js` và test tương ứng.

## Phạm vi kiểm thử

`backend/tests/` kiểm tra cấu hình publication, seed local an toàn, video/quyền truy cập và
thông báo bằng database kiểm thử. `frontend/tests/` kiểm tra vòng đời stream. Browser test
ở `frontend/e2e/` dùng API fixture, kiểm tra ảnh bundled, credits, fallback và overflow
desktop/mobile. Các bài này không thay thế thử tích hợp PostgreSQL, upload storage,
luồng ký hợp đồng hay tương tác thật giữa frontend và backend trên host.

Không có thay đổi schema hoặc database đang chạy trong đợt cải thiện tài liệu này.
