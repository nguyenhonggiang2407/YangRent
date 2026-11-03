# Tình trạng hosting YangRent — 03/11/2026

## Kiểm tra lại trong đợt audit portfolio

Ngày 03/11/2026, kiểm tra HTTP chỉ đọc từ môi trường Windows cho kết quả:

| URL | Kết quả |
| --- | --- |
| `https://yangrent-yang.onrender.com/` | 200, HTML có tiêu đề YangRent |
| `https://yangrent-yang.onrender.com/rooms` | 200, HTML có tiêu đề YangRent |
| `https://yangrent-yang.onrender.com/login` | 200, HTML có tiêu đề YangRent |
| `https://yangrent-yang.onrender.com/api/health` | 200, JSON báo `status: ok`, `database: ok` |
| `https://yangrent-api.onrender.com/api/health` | 200, JSON |

Trang chủ và API riêng có lần đầu hết thời gian chờ 45 giây, sau đó phản hồi thành công
khi thử lại. Đây là kết quả truy cập HTTP, chưa chứng minh đăng nhập, ghi dữ liệu,
asset trên trình duyệt hoặc bản commit đang được triển khai. Không kết luận dịch vụ hỏng
chỉ từ lần hết thời gian chờ đầu tiên.

Endpoint health của `backend/app/main.py` hiện tại **không truy vấn database**. Kết quả
`database: ok` từ dịch vụ full-stack cũ là hành vi của bản đang chạy, không được dùng
để mô tả health check trong source `main` hiện tại. Không sửa cấu hình hay dữ liệu host
trong đợt audit tài liệu này.

## Ghi nhận triển khai trước đợt audit

| Phần | Trạng thái đã xác minh |
| --- | --- |
| Bản full-stack đã có | [yangrent-yang.onrender.com](https://yangrent-yang.onrender.com/) |
| Dịch vụ bản cũ | `srv-db8b7pm89jmc73ctg0hg`, Render Free, Ohio |
| Kiểm tra chỉ đọc | HTTPS 200 tại `/`, `/login`, `/rooms`, `/api/rooms`, `/api/health`; health báo database OK |
| API từ repository YangRent | `srv-dabf43fqj5pc739q424g`, [yangrent-api.onrender.com](https://yangrent-api.onrender.com/api/health), Render Free, Singapore; health trả 200 |
| Mã mới trên GitHub | Chưa triển khai vào các dịch vụ cũ trong lượt làm việc này |
| Cloudflare frontend | Cấu hình đã chuẩn bị, chưa xuất bản |

Link full-stack phía trên là bản đóng gói đã có trước. Dịch vụ đang dùng source loader cũ, vì vậy link này **không phải bằng chứng rằng nhánh main hiện tại đã được triển khai**. Mã nguồn, giấy phép và thông tin đóng góp của repository vẫn được đánh giá theo source trong GitHub.

## Việc cần hoàn tất cho bản GitHub mới

Dịch vụ API liên kết đúng repo YangRent nhưng hiện còn build command:

```sh
pip install -r requirements.txt && PYTHONUTF8=1 python seed/seed.py
```

Seed trong source hiện tại là công cụ tạo demo **cục bộ**, không phải lệnh khởi tạo database trên host. Trước lần deploy mã mới, cấu hình build cần chỉ cài dependency; cấu hình start cần chạy migration phù hợp rồi khởi động Uvicorn, theo [kế hoạch Render + Cloudflare](cloudflare-render.md).

Render MCP đang kết nối hỗ trợ tạo dịch vụ và cập nhật biến môi trường, nhưng chưa cung cấp thao tác sửa build/start command của service hiện có. Trang quản lý yêu cầu đăng nhập riêng; bước đăng nhập đó chưa hoàn tất. Không có lần deploy, đổi dữ liệu hoặc đổi biến môi trường nào được thực hiện cho các dịch vụ YangRent cũ trong lượt này.

Sau khi đăng nhập trang quản lý, đối chiếu settings, database/schema đang sử dụng và bản sao lưu trước khi đổi command; xác minh migration trên môi trường riêng trước khi dùng database đã có dữ liệu. Giữ nguyên dữ liệu hiện có và chỉ công bố bản GitHub mới sau khi đăng ký/đăng nhập, quyền truy cập, lưu dữ liệu và frontend Cloudflare đều được kiểm tra.

Cấu hình tái tạo nằm ở [render.yaml](../render.yaml); thông tin đầy đủ về storage, CORS, khóa ký và trình tự Pages nằm ở [cloudflare-render.md](cloudflare-render.md).
