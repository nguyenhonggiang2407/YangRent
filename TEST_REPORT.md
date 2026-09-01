# YangRent – TEST REPORT

Ngày kiểm thử: **23/08/2026**  
Phạm vi: source rebrand YangRent, backend FastAPI, seed data, API chính, cú pháp frontend React/Vite và package bàn giao.

## 1. Tổng quan

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| Python compile backend/seed/migrations | PASS | `python -m compileall` không có lỗi |
| Frontend JS/JSX parse | PASS | 33 file `.js/.jsx` parse bằng Babel parser |
| Seed SQLite tách biệt | PASS | Database kiểm thử riêng, không chạm DB production |
| Health API | PASS | `/api/health` |
| Danh sách chỗ ở | PASS | 30 listing |
| Phân loại chỗ ở | PASS | 6 loại |
| Filter Studio | PASS | 6 Studio |
| Filter Tây Hồ | PASS | 3 listing |
| Property detail / image mapping | PASS | listing detail trả gallery; DB có 90 dòng `room_images` |
| Featured listings | PASS | endpoint hoạt động |
| YangMatch | PASS | trả tối đa 6 gợi ý theo rule-based scoring |
| Admin login + `/auth/me` | PASS | role ADMIN được xác thực |
| Admin overview | PASS | endpoint RBAC Admin hoạt động |
| Landlord login | PASS | tài khoản seed chủ nhà hoạt động |
| User/Tenant login | PASS | tài khoản seed người thuê hoạt động |
| Tạo yêu cầu giữ chỗ | PASS | booking/rental request tạo thành công |
| Chủ nhà chấp nhận giữ chỗ | PASS | request chuyển trạng thái xử lý |
| Trạng thái listing sau accept | PASS | `Room.status = RESERVED` đúng enum hiện có |
| Database seed | PASS | 30 rooms, 90 room_images, 6 room_type |
| Vite production build trong môi trường kiểm thử hiện tại | NOT EXECUTED | `node_modules` trong ZIP gốc là dependency Windows; Linux thiếu `@rollup/rollup-linux-x64-gnu`. Môi trường hiện tại không cho tải lại native binary/npm package cần thiết. Không tính là lỗi source. |
| Browser visual QA thật | NOT EXECUTED | Không có trình duyệt local trực quan cho artifact runtime trong môi trường này |
| Supabase live/Storage | NOT EXECUTED | Không sử dụng credential production khi kiểm thử |
| Deploy trực tiếp tài khoản HelioHost | NOT EXECUTED | Không thao tác tài khoản hosting của người dùng |

## 2. Backend smoke test

Vòng smoke test trước khi đóng gói đạt **18 PASS / 0 FAIL** cho các luồng cốt lõi:

1. health;
2. rooms count = 30;
3. Studio filter = 6;
4. Tây Hồ filter = 3;
5. room detail + gallery data;
6. featured listings;
7. YangMatch;
8. Admin login;
9. `/auth/me` + ADMIN role;
10. Admin overview;
11. Landlord login;
12. User/Tenant login;
13. booking create;
14. booking accept;
15. listing chuyển sang `RESERVED`;
16. DB có 30 rooms;
17. DB có 90 `room_images`;
18. DB có đúng 6 `room_type`.

Database smoke test được tạo ở file tạm ngoài source bàn giao. Sau kiểm thử, DB production/Supabase không bị chỉnh sửa.

## 3. Kiểm tra frontend

- 33 file JavaScript/JSX trong `frontend/src` parse thành công.
- Đã sửa contract Axios để interceptor trả về **Axios response chuẩn**, phù hợp với cách toàn bộ UI đang đọc `res.data`.
- Đã thêm tương thích token cũ `troflow_token` → `yangrent_token` để rebrand không tự làm logout người dùng hiện có.
- Image component có fallback và không tạo vòng lặp `onError`.
- Các ảnh ngoài viewport dùng lazy loading ở component phù hợp; ảnh quan trọng có thể ưu tiên tải.

### Vì sao production build không được đánh dấu PASS

Bản ZIP nguồn ban đầu chứa `frontend/node_modules` được cài trên Windows. Môi trường kiểm thử hiện tại là Linux. Khi chạy `npm run build`, Vite dừng tại Rollup vì thiếu native optional package Linux:

```text
Cannot find module @rollup/rollup-linux-x64-gnu
```

Đây là dependency artifact theo hệ điều hành, không phải lỗi parse của source React. Bản bàn giao **không chứa `node_modules` Windows**. Khi triển khai/CI, chạy:

```bash
cd frontend
npm ci
npm run build
```

trên môi trường có kết nối npm để cài đúng native dependency cho hệ điều hành.

## 4. Data consistency

Seed cuối:

- 10 Phòng cho thuê;
- 6 Studio;
- 5 Chung cư mini;
- 4 Căn hộ;
- 3 Nhà nguyên căn;
- 2 Ở ghép.

Tổng: **30 listing**.

Ảnh seed:

- **90 row** trong `room_images` = 3 ảnh/listing;
- 45 WebP local cho 15 listing đầu;
- 15 listing còn lại dùng URL Unsplash fallback theo từng listing;
- `is_primary` + `sort_order` được dùng để xác định cover/thứ tự ảnh.

Chi tiết nguồn và giới hạn attribution xem `docs/IMAGE_SOURCES.md`.

## 5. Security / package hygiene

Bản ZIP bàn giao cuối phải loại bỏ:

- `.env` thật;
- `.venv`;
- `node_modules`;
- SQLite runtime DB;
- runtime log;
- `.git` history;
- stale build/package cũ.

Chỉ giữ `.env.example` để cấu hình triển khai.

## 6. Kết luận

**PASS** cho backend, seed, API cốt lõi và frontend source parsing.  
**NOT EXECUTED** cho các bước phụ thuộc môi trường/credential bên ngoài: Vite native production build trong container hiện tại, Supabase live, HelioHost live và browser visual QA.

Không có hạng mục nào bị gắn PASS nếu chưa thực sự chạy được.
