#!/usr/bin/env bash
set -euo pipefail

# AdmitSimple EC2 Deploy Script
# Run from: ~/new-app on the EC2 server
# Usage: bash deploy/scripts/deploy-ec2.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT_DIR/deploy/.env"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     AdmitSimple — EC2 Deploy             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Check .env exists ────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Missing $ENV_FILE"
  echo ""
  echo "Create it with:"
  echo "  cat > ~/new-app/deploy/.env <<'EOF'"
  echo "  SESSION_SECRET=<generate with: openssl rand -base64 48>"
  echo "  ADMIN_PASSWORD=<your admin password>"
  echo "  DB_PASSWORD=<generate with: openssl rand -base64 32>"
  echo "  TWILIO_ACCOUNT_SID=<from Twilio>"
  echo "  TWILIO_AUTH_TOKEN=<from Twilio>"
  echo "  TWILIO_PHONE_NUMBER=<e.g. +16025551234>"
  echo "  TWILIO_TWIML_APP_SID=<from Twilio>"
  echo "  EOF"
  exit 1
fi

source "$ENV_FILE"

# ── Pull latest code ─────────────────────────
echo "▶ Pulling latest code..."
cd "$ROOT_DIR"
git pull

# ── Stop old container ───────────────────────
echo "▶ Stopping old admitsimple container..."
docker stop admitsimple 2>/dev/null || echo "  (no old container running)"
docker rm admitsimple 2>/dev/null || echo "  (no old container to remove)"

# ── Build new API image ──────────────────────
echo "▶ Building API Docker image (this takes a few minutes)..."
docker build -f deploy/Dockerfile.api -t admitsimple-api:latest .

# ── Start new API container ──────────────────
echo "▶ Starting API container..."
docker run -d \
  --name admitsimple-api \
  --restart unless-stopped \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e DATABASE_URL="${DATABASE_URL:-postgresql://admitsimple:${DB_PASSWORD}@localhost:5432/admitsimple}" \
  -e SESSION_SECRET="$SESSION_SECRET" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-}" \
  -e TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-}" \
  -e TWILIO_PHONE_NUMBER="${TWILIO_PHONE_NUMBER:-}" \
  -e TWILIO_TWIML_APP_SID="${TWILIO_TWIML_APP_SID:-}" \
  --network host \
  admitsimple-api:latest

echo "▶ Waiting for API to start..."
sleep 5
docker logs admitsimple-api --tail 5

# ── Build frontend ───────────────────────────
echo "▶ Building frontend..."
cd "$ROOT_DIR"
pnpm install --frozen-lockfile
BASE_PATH=/ pnpm --filter @workspace/admit-simple run build

# ── Deploy frontend to nginx html dir ───────
echo "▶ Deploying frontend to /usr/share/nginx/html..."
sudo rm -rf /usr/share/nginx/html/*
sudo cp -r artifacts/admit-simple/dist/public/* /usr/share/nginx/html/

# ── Update nginx config ──────────────────────
echo "▶ Updating nginx config..."
sudo tee /etc/nginx/conf.d/admitsimple-app.conf > /dev/null <<'NGINXCONF'
# API proxy (port 3001 = new app)
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}

location /api/events {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
    proxy_buffering off;
    proxy_cache off;
}
NGINXCONF

echo ""
echo "⚠️  Now update /etc/nginx/conf.d/admitsimple.conf:"
echo "   Change:  proxy_pass http://localhost:5000;"
echo "   To:      (remove that line — frontend is now served as static files)"
echo ""
echo "   The API location blocks are now in: /etc/nginx/conf.d/admitsimple-app.conf"
echo ""
echo "▶ Testing nginx config..."
sudo nginx -t

echo ""
echo "✅ Done! Run: sudo systemctl reload nginx"
echo ""
echo "Then test: curl -s https://admitsimple.com/api/health"
