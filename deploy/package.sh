#!/usr/bin/env bash
# YangRent - build & package deploy artifacts.
# Usage from project root:
#   bash deploy/package.sh [VITE_API_URL]
# Example:
#   bash deploy/package.sh https://yangrent-api.onrender.com/api
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
API_URL="${1:-/api}"
UPLOAD="$ROOT/deploy/upload"

echo "==> 1/5 Build frontend (VITE_API_URL=$API_URL)"
cd "$ROOT/frontend"
VITE_API_URL="$API_URL" npm run build

echo "==> 2/5 Reset upload directory"
rm -rf "$UPLOAD"
mkdir -p "$UPLOAD/backend" "$UPLOAD/frontend"

echo "==> 3/5 Copy backend without secrets/runtime artifacts"
cd "$ROOT/backend"
cp -r app migrations seed alembic.ini requirements.txt run.py .env.example "$UPLOAD/backend/"
cp "$ROOT/deploy/heliohost/dispatch.wsgi" "$UPLOAD/backend/dispatch.wsgi"
cp "$ROOT/deploy/heliohost/htaccess-api.txt" "$UPLOAD/backend/.htaccess"
find "$UPLOAD/backend" -type d -name '__pycache__' -prune -exec rm -rf {} + 2>/dev/null || true
find "$UPLOAD/backend" -type f \( -name '*.pyc' -o -name '*.log' -o -name '.env' \) -delete 2>/dev/null || true

echo "==> 4/5 Copy frontend dist"
cp -r "$ROOT/frontend/dist/." "$UPLOAD/frontend/"
cp "$ROOT/deploy/heliohost/htaccess-public.txt" "$UPLOAD/frontend/.htaccess"

echo "==> 5/5 Create ZIP files"
python "$ROOT/deploy/make_zips.py"

echo "DONE: deploy/upload/"
ls -lah "$UPLOAD"
