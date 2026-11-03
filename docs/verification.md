# Kết quả kiểm tra — 03/11/2026

Kiểm tra trong đợt cải thiện portfolio trên Windows, Node.js 24.19.0 và Python 3.12.14.
Source nền: `114ad7d5f41e05cddc819750a7a630ed891a8fa5`. Thay đổi của đợt này là
tài liệu; không chạy migration hay thay dữ liệu trên host.

| Phạm vi | Lệnh / cách kiểm tra | Kết quả |
| --- | --- | --- |
| Dependency frontend | `npm ci` trong `frontend` | Thành công từ lockfile |
| Unit frontend | `npm test` | 7/7 qua |
| Build frontend | `npm run build` | Thành công, Vite 5.4.21 |
| Dependency backend | Môi trường ảo mới, `python -m pip install -r requirements-dev.txt` | Thành công |
| Unit backend | `DATABASE_URL=sqlite://`, `python -B -m unittest discover -s tests -v` | 13/13 qua; có cảnh báo deprecation từ dependency/datetime |
| Browser frontend | `frontend/e2e/photos.mjs`, chạy bằng Node test với launch override trỏ tới Google Chrome cài trên máy | 3/3 qua: desktop, mobile, thiếu ảnh |
| Whitespace | `git diff --check` | Qua |
| HTTP public | GET trang chủ, rooms, login, health | Xem [chi tiết hosting](hosting-status.md) |

`npm run test:browser` mặc định ban đầu không chạy được vì Playwright 1.64.1 yêu cầu
Chromium revision 1248 chưa có trên máy. Lượt kiểm tra thành công dùng cùng file test,
chỉ thay executable lúc launch qua script tạm ngoài repository để dùng Google Chrome
đã cài. Không thay đổi test hoặc cấu hình dự án để che lỗi thiếu browser. Khi tái tạo
trên môi trường mới, cài browser bằng `npx playwright install chromium` trước khi chạy
lệnh tiêu chuẩn.

Browser test phục vụ bản build cục bộ, chặn nguồn ngoài và dùng API fixture hư cấu.
Nó xác nhận ảnh bundled giải mã được, liên kết credits, trạng thái thiếu ảnh và không
tràn ngang ở hai kích thước viewport. Nó không xác nhận tích hợp với backend live.
Giữ các ảnh WebP đã có trong repo; lượt chạy này không thay thế chúng bằng ảnh dựng.

## Các mục còn cần xử lý

- `npm audit` ghi nhận 8 dependency bị báo cáo (4 high, 4 moderate): Axios,
  follow-redirects, source-map-js, Vite, esbuild, postcss-selector-parser,
  react-router và react-router-dom. Đây là kết quả dependency scan, chưa phải kết luận
  từng advisory khai thác được trong ứng dụng. Một phần bản sửa được đề xuất cần nâng
  major Vite; đợt tài liệu này không áp `npm audit fix --force`.
- Backend dependency dùng khoảng phiên bản mở, chưa có lockfile tái tạo chính xác.
- Chưa thử tích hợp PostgreSQL, lưu upload, hành trình đăng nhập/hợp đồng/hóa đơn đầy đủ
  hoặc xác minh commit đang chạy trên host.
- Các giới hạn nghiệp vụ được ghi ở [architecture.md](architecture.md) và README;
  không tuyên bố hệ thống sẵn sàng xử lý giao dịch thật.
