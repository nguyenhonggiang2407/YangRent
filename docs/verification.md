# Kết quả kiểm tra — 03–04/11/2026

Kiểm tra trong đợt cải thiện portfolio trên Windows, Node.js 24.19.0 và Python 3.12.14.
Source nền của đợt tài liệu: `114ad7d5f41e05cddc819750a7a630ed891a8fa5`.
Đợt tiếp theo cập nhật dependency frontend trong lockfile theo các khoảng phiên bản
đã khai báo; không chạy migration hay thay dữ liệu trên host.

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

## Cập nhật dependency — hoàn tất 04/11/2026

Chạy `npm audit fix` trong `frontend`, không dùng `--force` hoặc đổi major.
`package.json` giữ các range hiện tại; `package-lock.json` ghi nhận:

| Package | Trước | Sau |
| --- | --- | --- |
| axios | 1.19.0 | 1.21.0 |
| follow-redirects | 1.16.0 | 1.16.2 |
| react-router / react-router-dom | 6.30.4 | 6.30.6 |
| @remix-run/router | 1.23.3 | 1.23.4 |
| postcss-selector-parser | 6.1.4 | 6.1.5 |
| source-map-js | 1.2.1 | 1.2.2 |

[Release note Axios 1.21.0](https://github.com/axios/axios/releases/tag/v1.21.0)
có thay đổi cách nhận dạng header defaults. Client hiện tại dùng plain object khi tạo
Axios instance và `AxiosHeaders` do interceptor cung cấp; source không dùng class tự
định nghĩa làm header defaults. Kiểm tra này chỉ đánh giá cách ứng dụng đang gọi API,
không khẳng định mọi API của thư viện đều không thay đổi.

Sau cập nhật: frontend unit test **7/7**, production build **qua**, browser fixture
**3/3** qua với cùng file test và Google Chrome override đã mô tả ở trên. Các lượt
này chạy lại trên dependency mới; backend không thay đổi.

Audit giảm từ **8 package (4 high, 4 moderate)** xuống **4 package (1 high, 3 moderate)**.
Vite 5.4.21 / esbuild 0.21.5 và react-router / react-router-dom 6.30.6 còn bị báo cáo.
Theo audit hiện tại, bản sửa được đề xuất là Vite 8.3.5 và react-router-dom 7.18.5,
đều vượt major đang khai báo. Không ghi đè transitive version ngoài range của Vite
để làm biến mất cảnh báo mà chưa xác minh tương thích.

Ví dụ: [React Router open redirect advisory](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6)
ghi bản vá 7.18.0; [esbuild advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
ghi bản vá 0.25.0. Các cảnh báo này cần một đợt nâng cấp và kiểm thử riêng.

## Các mục còn cần xử lý

- Bốn package còn trong audit nêu trên. Đây là kết quả dependency scan, chưa phải
  kết luận từng advisory khai thác được trong ứng dụng. Không áp `npm audit fix --force`.
- Backend dependency dùng khoảng phiên bản mở, chưa có lockfile tái tạo chính xác.
- Chưa thử tích hợp PostgreSQL, lưu upload, hành trình đăng nhập/hợp đồng/hóa đơn đầy đủ
  hoặc xác minh commit đang chạy trên host.
- Các giới hạn nghiệp vụ được ghi ở [architecture.md](architecture.md) và README;
  không tuyên bố hệ thống sẵn sàng xử lý giao dịch thật.
