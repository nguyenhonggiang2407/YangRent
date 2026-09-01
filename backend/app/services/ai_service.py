"""Dịch vụ AI của YangRent.

Bao gồm:
- recommend: gợi ý phòng phù hợp (rule-based scoring)
- match: AI roommate matching (rule-based scoring)
- forecast: dự báo chi phí tháng sau
- ocr: đọc chỉ số công tơ từ ảnh (mock rõ ràng, sẵn sàng thay model thật)
- suspicious: đánh giá rủi ro bài đăng (mock)

Kiến trúc: tất cả logic AI nằm trong service, KHÔNG viết trong route.
Khi có model thật (OpenAI/OCR API), chỉ cần thay implementation bên trong
các hàm này mà không đổi API.
"""
import random
from typing import Optional

from sqlalchemy.orm import Session

from app.models.room import Room
from app.models.roommate import RoommatePost


# ---------------- RECOMMEND: gợi ý phòng ----------------
def recommend_rooms(db: Session, *, budget: Optional[int] = None, district: Optional[str] = None,
                    room_type: Optional[str] = None, limit: int = 6) -> list[dict]:
    """Gợi ý phòng dựa trên nhu cầu người dùng (rule-based scoring)."""
    rooms = db.query(Room).filter(
        Room.moderation_status == "APPROVED",
        Room.status == "AVAILABLE",
    ).all()

    scored = []
    for room in rooms:
        score = 0
        reasons = []
        if budget and room.price <= budget * 1.1:
            score += 30
            reasons.append("Phù hợp ngân sách")
        if district and room.district == district:
            score += 40
            reasons.append(f"Cùng khu vực {district}")
        if room_type and room.room_type == room_type:
            score += 20
            reasons.append("Đúng loại chỗ ở bạn cần")
        if room.is_verified:
            score += 5
        if room.is_featured:
            score += 5
        scored.append({
            "room_id": room.id,
            "title": room.title,
            "price": room.price,
            "area": room.area,
            "district": room.district,
            "score": min(score, 100),
            "reasons": reasons,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


# ---------------- MATCH: tìm người ở ghép ----------------
def match_roommates(db: Session, post: RoommatePost, limit: int = 8) -> list[dict]:
    """Tính điểm phù hợp giữa bài đăng hiện tại và các bài đăng khác.

    KHÔNG dùng đặc điểm nhạy cảm (tôn giáo, dân tộc, ...) để đánh giá.
    Chỉ dùng: khu vực, ngân sách, thời gian chuyển vào, số người, sở thích tiện ích.
    """
    candidates = db.query(RoommatePost).filter(
        RoommatePost.status == "ACTIVE",
        RoommatePost.id != post.id,
        RoommatePost.user_id != post.user_id,
    ).all()

    results = []
    for c in candidates:
        score = 0
        reasons = []

        if c.district == post.district:
            score += 35
            reasons.append("Cùng khu vực")
        elif c.city == post.city:
            score += 10
            reasons.append("Cùng thành phố")

        # Ngân sách chồng nhau
        a_lo, a_hi = post.budget_min or 0, post.budget_max or 10_000_000
        b_lo, b_hi = c.budget_min or 0, c.budget_max or 10_000_000
        overlap = min(a_hi, b_hi) - max(a_lo, b_lo)
        if overlap > 0:
            score += 25
            reasons.append("Ngân sách tương đồng")

        if post.move_in_date and c.move_in_date and post.move_in_date == c.move_in_date:
            score += 15
            reasons.append("Cùng thời gian chuyển vào")

        # Nhu cầu tiện ích tương tự
        common = set(post.desired_amenities or []) & set(c.desired_amenities or [])
        if common:
            score += min(len(common) * 5, 15)
            reasons.append("Nhu cầu tiện ích tương tự")

        # Người có phòng cần thêm người
        if c.needed_people > 0:
            score += 10
            reasons.append("Đang cần thêm người ở ghép")

        results.append({
            "post_id": c.id,
            "user_id": c.user_id,
            "user_name": c.user.full_name if c.user else "Người dùng",
            "avatar_url": c.user.avatar_url if c.user else "",
            "title": c.title,
            "post_type": c.post_type,
            "district": c.district,
            "budget_min": c.budget_min,
            "budget_max": c.budget_max,
            "move_in_date": c.move_in_date,
            "match_score": min(score, 100),
            "reasons": reasons,
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results[:limit]


# ---------------- FORECAST: dự báo chi phí ----------------
def forecast_cost(history: list[float]) -> dict:
    """Dự báo chi phí tháng sau dựa trên 3 tháng gần nhất (moving average)."""
    if not history:
        return {"min": 0, "max": 0, "estimated": 0, "trend": "STABLE"}
    recent = history[-3:]
    avg = sum(recent) / len(recent)
    if len(recent) >= 2:
        trend_pct = (recent[-1] - recent[0]) / recent[0] * 100 if recent[0] else 0
    else:
        trend_pct = 0

    low = int(avg * 0.85)
    high = int(avg * 1.15)
    trend = "UP" if trend_pct > 5 else ("DOWN" if trend_pct < -5 else "STABLE")
    return {
        "min": low, "max": high, "estimated": int(avg),
        "trend": trend, "trend_pct": round(trend_pct, 1),
        "note": "Dự báo dựa trên trung bình 3 tháng gần nhất, chỉ mang tính tham khảo",
    }


# ---------------- OCR: đọc chỉ số công tơ ----------------
def ocr_read_meter(image_url: str) -> dict:
    """Đọc chỉ số công tơ từ ảnh.

    HIỆN TẠI: mock rõ ràng (sinh số ngẫu nhiên có kiểm soát) để UI + API
    hoạt động đầy đủ. Khi có OCR thật (Google Vision / PaddleOCR / API),
    thay implementation trong hàm này, giữ nguyên API contract.
    """
    # Simulate đọc ảnh: chỉ số tăng dần theo "độ mới" của ảnh
    seed = abs(hash(image_url)) % 1000
    value = 100 + seed
    return {
        "success": True,
        "raw_text": f"{value} kWh",
        "value": value,
        "unit": "kWh",
        "confidence": round(0.82 + (seed % 15) / 100, 2),
        "engine": "mock-ocr-v1",
        "note": "Kết quả demo từ mock OCR. Tích hợp OCR thật sẽ thay engine này.",
    }


# ---------------- SUSPICIOUS: đánh giá rủi ro bài đăng ----------------
def suspicious_score(room: Room) -> dict:
    """Đánh giá rủi ro tin đăng (rule-based heuristic).

    Kiểm tra các dấu hiệu: giá quá rẻ so với diện tích, thiếu ảnh,
    chủ nhà chưa xác minh, thiếu mô tả.
    """
    risk = 0
    flags = []

    if room.price <= 0 or (room.area > 0 and room.price / room.area < 60000):
        risk += 40
        flags.append("Giá thuê thấp bất thường so với diện tích")
    if not room.images:
        risk += 25
        flags.append("Bài đăng không có ảnh phòng")
    if not room.landlord or not room.landlord.is_verified:
        risk += 20
        flags.append("Chủ nhà chưa xác minh danh tính")
    if len(room.description or "") < 30:
        risk += 15
        flags.append("Mô tả quá ngắn, thiếu thông tin")

    if risk >= 60:
        level = "HIGH"
    elif risk >= 30:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {"risk_score": min(risk, 100), "level": level, "flags": flags}
