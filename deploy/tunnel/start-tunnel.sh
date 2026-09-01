#!/usr/bin/env bash
# ============================================================
# Khởi động Cloudflare Tunnel trỏ tới backend local (port 8000)
#
# CÁCH DÙNG: mở Git Bash, chạy:
#   bash deploy/tunnel/start-tunnel.sh
#
# Sau khi chạy, nhìn dòng "https://xxx.trycloudflare.com"
# -> gửi URL đó cho tôi để tôi build lại frontend (URL đổi mỗi lần chạy).
# Giữ cửa sổ terminal này MỞ (không tắt) thì web mới hoạt động.
# ============================================================
cd "$(dirname "$0")"
./cloudflared.exe tunnel --url http://127.0.0.1:8000
