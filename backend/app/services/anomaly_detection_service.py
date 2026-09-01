"""Phát hiện bất thường tiêu thụ điện/nước.

So sánh mức tiêu thụ hiện tại với trung bình 3 tháng trước.
Nếu tăng > 60% -> cảnh báo.
"""
from statistics import mean


def analyze(consumptions: list[float]) -> dict:
    """consumptions: danh sách mức tiêu thụ theo tháng (mới nhất cuối)."""
    if len(consumptions) < 2:
        return {
            "is_anomaly": False,
            "level": "NORMAL",
            "message": "Chưa đủ dữ liệu để phân tích",
            "details": [],
        }

    details = []
    for i in range(1, len(consumptions)):
        prev = consumptions[i - 1]
        curr = consumptions[i]
        if prev <= 0:
            continue
        change_pct = (curr - prev) / prev * 100
        if change_pct > 60:
            details.append({
                "index": i, "previous": prev, "current": curr,
                "change_pct": round(change_pct, 1),
                "level": "HIGH",
            })
        elif change_pct > 25:
            details.append({
                "index": i, "previous": prev, "current": curr,
                "change_pct": round(change_pct, 1),
                "level": "MEDIUM",
            })

    if any(d["level"] == "HIGH" for d in details):
        return {
            "is_anomaly": True, "level": "HIGH",
            "message": "⚠️ Mức tiêu thụ tăng bất thường, nên kiểm tra thiết bị hoặc rò rỉ",
            "details": details,
        }
    if details:
        return {
            "is_anomaly": True, "level": "MEDIUM",
            "message": "Mức tiêu thụ tăng cao hơn bình thường, hãy theo dõi",
            "details": details,
        }
    return {
        "is_anomaly": False, "level": "NORMAL",
        "message": "Mức tiêu thụ ổn định, không phát hiện bất thường",
        "details": details,
    }
