# Ảnh chụp sử dụng trong YangRent

Bộ ảnh được khôi phục từ phiên bản YangRent đã lưu ngày 01/09/2026, commit `9c9ef82efbb18188616c64c52a7e27849b24e843`. Tài liệu `docs/IMAGE_SOURCES.md` của phiên bản đó ghi nguồn Pexels và tác giả từ metadata; từng file dưới đây có đường dẫn bất biến về bản lưu và SHA-256 để đối chiếu.

URL trang photo riêng của các JPEG gốc không được lưu lại. Trường `originalPhotoPage` trong catalog giữ `null`; không dựng URL hoặc khẳng định đã truy lại trang gốc. Thông tin Pexels/tác giả được dẫn theo [tài liệu nguồn cũ](https://github.com/nguyenhonggiang2407/YangRent/blob/9c9ef82efbb18188616c64c52a7e27849b24e843/docs/IMAGE_SOURCES.md). [Điều khoản Pexels](https://www.pexels.com/license/) được đọc lại ngày 03/11/2026; ảnh bên thứ ba không được cấp lại theo giấy phép của mã ứng dụng.

## Danh mục

| Vị trí | Tác giả ghi trong bản cũ | Ảnh được lưu | Bản responsive |
| --- | --- | --- | --- |
| Studio có cửa sổ lớn | Max Vakhtbovych | [Bản lưu](https://github.com/nguyenhonggiang2407/YangRent/blob/9c9ef82efbb18188616c64c52a7e27849b24e843/frontend/public/images/properties/property-001/01-cover.webp) | 960 px, 1600 px |
| Phòng cho thuê | Max Vakhtbovych | [Bản lưu](https://github.com/nguyenhonggiang2407/YangRent/blob/9c9ef82efbb18188616c64c52a7e27849b24e843/frontend/public/images/properties/property-008/01-cover.webp) | 480 px, 960 px |
| Studio | Max Vakhtbovych | [Bản lưu](https://github.com/nguyenhonggiang2407/YangRent/blob/9c9ef82efbb18188616c64c52a7e27849b24e843/frontend/public/images/properties/property-002/01-cover.webp) | 480 px, 960 px |
| Căn hộ | Max Vakhtbovych | [Bản lưu](https://github.com/nguyenhonggiang2407/YangRent/blob/9c9ef82efbb18188616c64c52a7e27849b24e843/frontend/public/images/properties/property-010/01-cover.webp) | 480 px, 960 px |
| Nhà nguyên căn | Fabio Junior Sabino de Oliveira | [Bản lưu](https://github.com/nguyenhonggiang2407/YangRent/blob/9c9ef82efbb18188616c64c52a7e27849b24e843/frontend/public/images/properties/property-004/01-cover.webp) | 480 px, 960 px |
| Ở ghép | Max Vakhtbovych | [Bản lưu](https://github.com/nguyenhonggiang2407/YangRent/blob/9c9ef82efbb18188616c64c52a7e27849b24e843/frontend/public/images/properties/property-003/01-cover.webp) | 480 px, 960 px |
| Chung cư mini | Max Vakhtbovych | [Bản lưu](https://github.com/nguyenhonggiang2407/YangRent/blob/9c9ef82efbb18188616c64c52a7e27849b24e843/frontend/public/images/properties/property-011/01-cover.webp) | 480 px, 960 px |

Catalog máy đọc: [`housingPhotos.json`](../frontend/src/data/housingPhotos.json). Tổng 7 ảnh chụp, 14 file WebP, 620944 byte. Các bản nhỏ chỉ resize/nén WebP; bản hero 1600 px giữ nguyên byte của ảnh cũ. Không tạo thêm góc chụp giả từ một ảnh.

## Cách hiển thị

- Ảnh studio nằm cạnh biểu mẫu tìm kiếm trên máy tính và dưới biểu mẫu trên điện thoại. Chú thích phân biệt ảnh minh họa với tin đăng và dẫn đến `/photo-credits` để xem tác giả. Nhóm ảnh bên dưới giúp lọc theo loại chỗ ở.
- Tin đăng vẫn dùng `room_images` của người đăng. Ảnh lỗi/chưa có giữ trạng thái rõ ràng, không thay bằng một phòng stock khác.
- Chỉ database demo cục bộ mới dùng ba ảnh chụp minh họa. Seed vẫn yêu cầu `--local-demo`, tạo file mới và từ chối ghi đè; không cập nhật database đang chạy.
- Ảnh được lưu cùng source để không phụ thuộc hotlink Pexels lúc người dùng mở trang. Hero có ưu tiên tải; ảnh danh mục dùng lazy loading và srcset.

## Xác minh

`npm test` và `npm run build` kiểm tra frontend. `npm run test:browser` chạy Chromium trên bản build với API fixture hư cấu: kiểm tra 7 ảnh thật giải mã được ở màn hình 1440 px và 390 px, không tràn ngang, mở trang ghi nguồn, và ảnh tin đăng lỗi giữ đúng trạng thái chưa có ảnh. Ảnh chụp màn hình được xuất vào `docs/screenshots/home-photos-desktop.png` và `home-photos-mobile.png`. Đây là kiểm tra giao diện với fixture, không phải bằng chứng deploy hoặc dữ liệu thật trên hosting.

Việc sửa ảnh trong GitHub không tự cập nhật dịch vụ YangRent cũ đang dùng source đóng gói và tắt auto-deploy. Tình trạng triển khai: [hosting-status.md](hosting-status.md).

## Kết quả kiểm tra

[CI 41661305056](https://github.com/nguyenhonggiang2407/YangRent/actions/runs/41661305056) đạt ở commit `86c4a346e74af445eec8bba38f3c538fbe547b34`: backend, frontend build, 7 bài kiểm tra stream hiện có và 3 bài kiểm tra giao diện ảnh. Các bản xem nhanh WebP trong `docs/screenshots/` được trích từ PNG do CI tạo; ảnh toàn trang nằm trong artifact `housing-photo-browser-checks`. Kết quả này xác minh bản build với API fixture, chưa phải xác nhận bản hosting cũ đã cập nhật.
