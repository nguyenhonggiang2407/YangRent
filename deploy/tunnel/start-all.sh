#!/usr/bin/env bash
# ============================================================
# YangRent - Khởi động lại toàn bộ SAU KHI TẮT/BẬT MÁY
#
# Cách dùng: mở Git Bash, gõ:
#   bash deploy/tunnel/start-all.sh
#
# Script tự động:
#   1. Khởi động backend (nếu chưa chạy)
#   2. Mở Cloudflare Tunnel mới + lấy URL
#   3. Build lại frontend trỏ tới URL mới
#   4. Nén file deploy/upload/yangrent-frontend.zip
#   5. In hướng dẫn upload
# ============================================================
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND="$ROOT/backend"
PY="$BACKEND/.venv/Scripts/python.exe"
FRONTEND="$ROOT/frontend"
UPLOAD="$ROOT/deploy/upload/frontend"

echo "==> [1/4] Kiểm tra backend..."
if curl -s -m 3 http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
  echo "    Backend đã chạy sẵn (port 8000) - bỏ qua"
else
  echo "    Đang khởi động backend..."
  (cd "$BACKEND" && nohup env PYTHONUTF8=1 "$PY" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > /tmp/yangrent-backend.log 2>&1 &)
  sleep 8
  curl -s -m 5 http://127.0.0.1:8000/api/health > /dev/null 2>&1 || { echo "    LỖI: backend không khởi động được. Xem /tmp/yangrent-backend.log"; exit 1; }
  echo "    Backend OK"
fi

echo "==> [2/4] Mở tunnel mới..."
taskkill //F //IM cloudflared.exe > /dev/null 2>&1 || true
sleep 2
(cd "$ROOT/deploy/tunnel" && nohup ./cloudflared.exe tunnel --url http://127.0.0.1:8000 > /tmp/tunnel.log 2>&1 &)
echo "    Đang chờ Cloudflare cấp URL (10-25 giây)..."
URL=""
for i in $(seq 1 40); do
  URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/tunnel.log 2>/dev/null | head -1)
  [ -n "$URL" ] && break
  sleep 1
done
[ -z "$URL" ] && { echo "    LỖI: không lấy được URL tunnel. Xem /tmp/tunnel.log"; exit 1; }
echo "    Tunnel URL: $URL"

echo "==> [3/4] Build lại frontend (trỏ tới URL mới)..."
(cd "$FRONTEND" && VITE_API_URL="$URL/api" node node_modules/vite/bin/vite.js build)

echo "==> [4/4] Đóng gói yangrent-frontend.zip..."
rm -rf "$UPLOAD"
mkdir -p "$UPLOAD"
cp -r "$FRONTEND/dist/." "$UPLOAD/"
cp "$ROOT/deploy/heliohost/htaccess-public.txt" "$UPLOAD/.htaccess"
(cd "$UPLOAD" && PYTHONUTF8=1 "$PY" -c "
import zipfile, os
with zipfile.ZipFile('../yangrent-frontend.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _d, files in os.walk('.'):
        for f in files:
            full = os.path.join(root, f)
            z.write(full, os.path.relpath(full, '.'))
print('    zip OK')
")

echo "==> [5/5] Copy ra Desktop..."
DESK="$HOME/Desktop"
if [ -d "$DESK" ]; then
  cp "$ROOT/deploy/upload/yangrent-frontend.zip" "$DESK/yangrent-frontend.zip" 2>/dev/null || true
  cat > "$DESK/HUONG_DAN_UPLOAD.txt" <<EOF2
YANGRENT - Web san sang!

Tunnel URL moi: $URL

Viec can lam (1 buoc):
1. Upload file yangrent-frontend.zip (ngay canh file nay) len httpdocs/ tren HelioHost
2. Plesk File Manager -> chon zip -> Extract -> ghi de (Replace all)
3. Mo https://nguyenduckien.heliohost.us/ de kiem tra
EOF2
  echo "    Da copy zip + huong dan ra Desktop"
else
  echo "    (khong thay Desktop - zip van o deploy/upload/)"
fi

echo
echo "============================================================"
echo " HOÀN TẤT!"
echo "   Tunnel URL mới: $URL"
echo ""
echo " Việc bạn cần làm (1 bước):"
echo "   Upload file yangrent-frontend.zip (đã copy ra Desktop)"
echo "   lên httpdocs/ trên HelioHost -> Extract -> ghi đè."
echo "============================================================"
