# Tình trạng hosting YangRent — 04/11/2026

## Live Demo mới — đã xác minh

**[Mở YangRent Live Demo](https://yangrent-portfolio-demo.onrender.com/)**

| Phần | Kết quả |
| --- | --- |
| Giao diện + API | Cùng origin HTTPS, React/Vite được phục vụ bởi FastAPI |
| Render service | `srv-dbla4q3ncjis73d8dbig`, `yangrent-portfolio-demo`, plan `free`, Singapore, một instance |
| Source đang chạy | `cc081ca717cecb4c20b3d5becafe336436629e4b`, merge [PR #1](https://github.com/nguyenhonggiang2407/YangRent/pull/1) |
| Deploy | `dep-dbla4qrncjis73d8ddk0`, trạng thái `live`, hoàn tất 04/11/2026 lúc 10:12 GMT+7 |
| CI | [41765537771](https://github.com/nguyenhonggiang2407/YangRent/actions/runs/41765537771) trên đúng merge commit: frontend, backend và build/khởi động Docker đều thành công |
| Health | `/api/health` trả `database: ok`, `mode: ephemeral-demo`, đúng revision triển khai |
| Kiểm tra thực tế | 21 kiểm tra tại URL HTTPS thật, hoàn tất 04/11/2026 lúc 17:54 GMT+7 |

Các kiểm tra thực tế gồm HTML/JS/CSS, tải lại các route `/rooms`, `/login`, `/register`, sáu loại phòng hư cấu, chi tiết/lọc phòng, ảnh WebP khớp byte với source, đăng ký và đăng nhập tài khoản thử, hồ sơ, lưu/bỏ yêu thích, chặn tự đăng ký ADMIN và chặn chủ khác sửa phòng không thuộc mình. Không thực hiện thanh toán, gửi tin nhắn hoặc truy cập database của các dịch vụ cũ.

Đây là demo riêng được người dùng chọn triển khai với dữ liệu mẫu. Mỗi tiến trình tạo SQLite tạm và khóa ký mới; dữ liệu sẽ được làm mới khi tiến trình khởi động lại. Không có database, disk hay dịch vụ trả phí được tạo; các dịch vụ YangRent cũ và cấu hình của chúng được giữ nguyên. Khởi động trên gói miễn phí có thể chậm sau thời gian không hoạt động. Không nhập thông tin cá nhân hoặc dữ liệu quan trọng.

Chi tiết cách chạy: [demo riêng](free-demo.md). Có thể chạy lại kiểm tra có bảo vệ bằng `node tools/verify-demo.mjs https://yangrent-portfolio-demo.onrender.com/`; công cụ từ chối ghi tài khoản thử nếu health không xác nhận đúng chế độ demo riêng. Các ghi nhận phía dưới là lịch sử trước đợt triển khai này, không mô tả trạng thái của demo mới.

## Lịch sử: kiểm tra trong đợt audit portfolio 03/11/2026

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

## Kế hoạch cũ: cập nhật dịch vụ API có database riêng

Dịch vụ API liên kết đúng repo YangRent nhưng hiện còn build command:

```sh
pip install -r requirements.txt && PYTHONUTF8=1 python seed/seed.py
```

Seed trong source hiện tại là công cụ tạo demo **cục bộ**, không phải lệnh khởi tạo database trên host. Trước lần deploy mã mới, cấu hình build cần chỉ cài dependency; cấu hình start cần chạy migration phù hợp rồi khởi động Uvicorn, theo [kế hoạch Render + Cloudflare](cloudflare-render.md).

Render MCP đang kết nối hỗ trợ tạo dịch vụ và cập nhật biến môi trường, nhưng chưa cung cấp thao tác sửa build/start command của service hiện có. Trang quản lý yêu cầu đăng nhập riêng; bước đăng nhập đó chưa hoàn tất. Không có lần deploy, đổi dữ liệu hoặc đổi biến môi trường nào được thực hiện cho các dịch vụ YangRent cũ trong lượt này.

Sau khi đăng nhập trang quản lý, đối chiếu settings, database/schema đang sử dụng và bản sao lưu trước khi đổi command; xác minh migration trên môi trường riêng trước khi dùng database đã có dữ liệu. Giữ nguyên dữ liệu hiện có và chỉ công bố bản GitHub mới sau khi đăng ký/đăng nhập, quyền truy cập, lưu dữ liệu và frontend Cloudflare đều được kiểm tra.

Cấu hình tái tạo nằm ở [render.yaml](../render.yaml); thông tin đầy đủ về storage, CORS, khóa ký và trình tự Pages nằm ở [cloudflare-render.md](cloudflare-render.md).
