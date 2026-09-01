# IMAGE_SOURCES – YangRent

File này ghi nguồn ảnh demo để dễ audit/replace trước khi public production. Ảnh stock chỉ dùng cho **seed/demo**, không đại diện cho tài sản thật. Listing thật phải dùng ảnh do chủ nhà cung cấp hoặc nguồn được phép sử dụng.

## Chính sách sử dụng

- Ưu tiên Pexels/Unsplash hoặc nguồn có điều khoản sử dụng rõ ràng.
- Không dùng Google Images như kho ảnh để copy trực tiếp.
- Khi đưa dự án ra production/public portfolio, nên kiểm tra lại license/attribution hiện hành của từng nền tảng.
- Không tuyên bố ảnh stock là ảnh thực tế của bất động sản đang cho thuê.

## 1. Ảnh local WebP – property 001–015

Các ảnh dưới đây được tạo từ file ảnh Pexels đã tải về trong quá trình rebrand, resize/crop rồi chuyển sang WebP. File JPEG gốc không lưu URL trang Pexels trong EXIF/XMP; vì vậy tài liệu **không bịa URL nguồn**. Photographer/rights được lấy từ metadata khi có.

| Property | Files | Source platform | Photographer/rights metadata | Kích thước cover | Tổng dung lượng |
|---|---|---|---|---:|---:|
| 001 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | MAXArtbovich / MaksymVakhtbovych | 1600×1067 | 325.5 KB |
| 002 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | MAXArtbovich / MaksymVakhtbovych | 1600×1067 | 186.7 KB |
| 003 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | MAXArtbovich / MaksymVakhtbovych | 1600×1067 | 346.1 KB |
| 004 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | FABIO JUNIOR SABINO DE OLIVEIRA / All the rights reserved for Fabio Junior. | 1600×1067 | 308.9 KB |
| 005 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | MAXArtbovich / MaksymVakhtbovych | 1600×1067 | 171.4 KB |
| 006 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | MAXArtbovich / MaksymVakhtbovych | 1600×1067 | 307.5 KB |
| 007 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | MAXArtbovich / MaksymVakhtbovych | 1600×1067 | 108.0 KB |
| 008 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | Max Vakhtbovych [2EyesProd.] / 2Eyes prod. | 1600×1067 | 197.2 KB |
| 009 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | Không có trong metadata | 1600×1067 | 172.4 KB |
| 010 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | MAXArtbovich / MaksymVakhtbovych | 1600×1067 | 338.0 KB |
| 011 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | Max Vakhtbovych [2EyesProd.] / 2Eyes prod. | 1600×1067 | 275.5 KB |
| 012 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | Max Vakhtbovych [2EyesProd.] / 2Eyes prod. | 1600×1067 | 180.3 KB |
| 013 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | MAXArtbovich / MaksymVakhtbovych | 1600×1067 | 275.0 KB |
| 014 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | MAXArtbovich / MaksymVakhtbovych | 1600×1067 | 394.2 KB |
| 015 | `01-cover.webp, 02-detail.webp, 03-detail.webp` | Pexels | Không có trong metadata | 1600×1067 | 299.8 KB |

**Tổng ảnh local:** 45 file WebP, khoảng 3.80 MB.

> Ghi chú: để đạt mức attribution tuyệt đối, hãy thay mục “Pexels” bằng URL trang photo cụ thể nếu bạn còn lịch sử URL tải ban đầu. Metadata ảnh hiện tại không chứa photo-page URL.

## 2. Ảnh remote fallback – property 016–030

15 listing cuối dùng 15 photo ID Unsplash riêng biệt. Seed tạo nhiều crop từ cùng photo family để giữ cảm giác nhất quán và tránh dùng cùng một photo ID cho nhiều listing.

| Property | Platform | Source/photo URL | Photo ID |
|---|---|---|---|
| 016 | Unsplash | `https://images.unsplash.com/photo-1616486338812-3dadae4b4ace` | `photo-1616486338812-3dadae4b4ace` |
| 017 | Unsplash | `https://images.unsplash.com/photo-1616594039964-ae9021a400a0` | `photo-1616594039964-ae9021a400a0` |
| 018 | Unsplash | `https://images.unsplash.com/photo-1540518614846-7eded433c457` | `photo-1540518614846-7eded433c457` |
| 019 | Unsplash | `https://images.unsplash.com/photo-1598928506311-c55ded91a20c` | `photo-1598928506311-c55ded91a20c` |
| 020 | Unsplash | `https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf` | `photo-1595526114035-0d45ed16cfbf` |
| 021 | Unsplash | `https://images.unsplash.com/photo-1560185007-cde436f6a4d0` | `photo-1560185007-cde436f6a4d0` |
| 022 | Unsplash | `https://images.unsplash.com/photo-1554995207-c18c203602cb` | `photo-1554995207-c18c203602cb` |
| 023 | Unsplash | `https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e` | `photo-1567767292278-a4f21aa2d36e` |
| 024 | Unsplash | `https://images.unsplash.com/photo-1583847268964-b28dc8f51f92` | `photo-1583847268964-b28dc8f51f92` |
| 025 | Unsplash | `https://images.unsplash.com/photo-1600210492486-724fe5c67fb0` | `photo-1600210492486-724fe5c67fb0` |
| 026 | Unsplash | `https://images.unsplash.com/photo-1600585154340-be6161a56a0c` | `photo-1600585154340-be6161a56a0c` |
| 027 | Unsplash | `https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3` | `photo-1600566753190-17f0baa2a6c3` |
| 028 | Unsplash | `https://images.unsplash.com/photo-1600607687939-ce8a6c25118c` | `photo-1600607687939-ce8a6c25118c` |
| 029 | Unsplash | `https://images.unsplash.com/photo-1600573472592-401b489a3cdc` | `photo-1600573472592-401b489a3cdc` |
| 030 | Unsplash | `https://images.unsplash.com/photo-1545324418-cc1a3fa10c00` | `photo-1545324418-cc1a3fa10c00` |

## 3. Cách mapping trong database

- Table/entity kỹ thuật: `room_images`.
- `room_id`: listing sở hữu ảnh.
- `image_url`: local path hoặc remote URL.
- `is_primary=true`: cover.
- `sort_order`: thứ tự gallery.

Ví dụ:

```text
room_id=1  image_url=/images/properties/property-001/01-cover.webp  is_primary=true  sort_order=0
room_id=1  image_url=/images/properties/property-001/02-detail.webp is_primary=false sort_order=1
```

## 4. Khuyến nghị production

1. Chủ nhà upload 5–8 ảnh thật của cùng một tài sản.
2. Backend kiểm tra loại file và giới hạn kích thước.
3. Resize/compress sang WebP khi pipeline production hỗ trợ.
4. Upload Supabase Storage hoặc storage riêng của YangRent.
5. Lưu URL vào `room_images`; không hard-code gallery trong React.
6. Chọn cover bằng `is_primary`, sắp xếp bằng `sort_order`.
7. Lưu attribution chỉ cho ảnh stock/demo; ảnh người dùng upload cần điều khoản xác nhận quyền sử dụng.
