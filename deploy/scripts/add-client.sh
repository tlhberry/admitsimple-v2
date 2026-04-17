#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
#  AdmitSimple — Add New Client (Single-Server Edition)
#  Runs on the EC2 server directly.
#  Usage: sudo bash ~/new-app/deploy/scripts/add-client.sh
# ─────────────────────────────────────────────────────────────

DOMAIN="admitsimple.com"
EC2_IP="3.223.7.206"
ADMIN_EMAIL="admin@admitsimple.com"
CLIENTS_LOG="$HOME/new-app/deploy/clients.log"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║    AdmitSimple — New Client Setup            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Collect info ─────────────────────────────────────────────
read -rp "Client short name — lowercase, hyphens only (e.g. sunrise-recovery): " CLIENT_SLUG

if [[ ! "$CLIENT_SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "❌ Name must be lowercase letters, numbers, and hyphens only."
  exit 1
fi

CLIENT_DOMAIN="${CLIENT_SLUG}.${DOMAIN}"

if [ -f "$CLIENTS_LOG" ] && grep -q "^${CLIENT_SLUG}|" "$CLIENTS_LOG"; then
  echo "❌ Client '${CLIENT_SLUG}' already exists."
  exit 1
fi

read -rsp "Admin password for this client: " ADMIN_PASSWORD
echo ""
read -rp "Anthropic API key (leave blank to set later in Settings): " ANTHROPIC_KEY
echo ""

# ── Find next available port ─────────────────────────────────
echo "▶ Finding available port..."
NEXT_PORT=3002
while docker ps --format "{{.Ports}}" | grep -q "0.0.0.0:${NEXT_PORT}->"; do
  NEXT_PORT=$((NEXT_PORT + 1))
done
echo "  Using port ${NEXT_PORT}"

# ── Generate secrets ─────────────────────────────────────────
DB_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
SESSION_SECRET=$(openssl rand -base64 48)
DB_USER="admitsimple_${CLIENT_SLUG//-/_}"
DB_NAME="admitsimple_${CLIENT_SLUG//-/_}"
DB_CONTAINER="admitsimple-db-${CLIENT_SLUG}"
API_CONTAINER="admitsimple-api-${CLIENT_SLUG}"
NETWORK_NAME="admitsimple-net-${CLIENT_SLUG}"

# ── Load base env (for SENDGRID key) ─────────────────────────
source "$HOME/new-app/deploy/.env" 2>/dev/null || true

# ── Docker network ───────────────────────────────────────────
echo "▶ Creating network..."
docker network create "${NETWORK_NAME}" 2>/dev/null || true

# ── Start PostgreSQL ─────────────────────────────────────────
echo "▶ Starting database..."
docker run -d \
  --name "${DB_CONTAINER}" \
  --restart unless-stopped \
  --network "${NETWORK_NAME}" \
  -v "admitsimple-data-${CLIENT_SLUG}:/var/lib/postgresql/data" \
  -e POSTGRES_USER="${DB_USER}" \
  -e POSTGRES_PASSWORD="${DB_PASS}" \
  -e POSTGRES_DB="${DB_NAME}" \
  postgres:15-alpine > /dev/null

echo -n "  Waiting for database"
for i in {1..20}; do
  if docker exec "${DB_CONTAINER}" pg_isready -U "${DB_USER}" > /dev/null 2>&1; then
    echo " ✅"
    break
  fi
  echo -n "."
  sleep 3
done

# ── Start API ────────────────────────────────────────────────
echo "▶ Starting API..."
docker run -d \
  --name "${API_CONTAINER}" \
  --restart unless-stopped \
  --network "${NETWORK_NAME}" \
  -p "${NEXT_PORT}:3001" \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e SECURE_COOKIES=true \
  -e DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@${DB_CONTAINER}:5432/${DB_NAME}" \
  -e SESSION_SECRET="${SESSION_SECRET}" \
  -e ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
  -e SENDGRID_API_KEY="${SENDGRID_API_KEY:-}" \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_KEY:-}" \
  admitsimple-api:latest > /dev/null
echo "  ✅ API started on port ${NEXT_PORT}"

# ── DNS via Route 53 ─────────────────────────────────────────
echo "▶ Adding DNS record..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='${DOMAIN}.'].Id" \
  --output text 2>/dev/null | cut -d'/' -f3 || true)

if [[ -n "${HOSTED_ZONE_ID:-}" ]]; then
  aws route53 change-resource-record-sets \
    --hosted-zone-id "${HOSTED_ZONE_ID}" \
    --change-batch "{
      \"Changes\": [{
        \"Action\": \"UPSERT\",
        \"ResourceRecordSet\": {
          \"Name\": \"${CLIENT_DOMAIN}\",
          \"Type\": \"A\",
          \"TTL\": 300,
          \"ResourceRecords\": [{\"Value\": \"${EC2_IP}\"}]
        }
      }]
    }" > /dev/null
  echo "  ✅ DNS: ${CLIENT_DOMAIN} → ${EC2_IP}"
  DNS_WAIT=30
else
  echo "  ⚠️  Auto-DNS unavailable. Manually add in Route 53:"
  echo "     Type: A | Name: ${CLIENT_DOMAIN} | Value: ${EC2_IP}"
  echo ""
  read -rp "Press Enter once the A record is added..."
  DNS_WAIT=10
fi

# ── Temporary HTTP nginx block for certbot ───────────────────
echo "▶ Configuring nginx for SSL challenge..."
sudo tee "/etc/nginx/conf.d/client-${CLIENT_SLUG}-temp.conf" > /dev/null << NGINX_TEMP
server {
    listen 80;
    server_name ${CLIENT_DOMAIN};
    root /usr/share/nginx/html;
}
NGINX_TEMP
sudo nginx -t && sudo systemctl reload nginx

echo -n "  Waiting ${DNS_WAIT}s for DNS..."
sleep "${DNS_WAIT}"
echo " done"

# ── SSL Certificate ──────────────────────────────────────────
echo "▶ Getting SSL certificate..."
sudo certbot certonly --nginx \
  -d "${CLIENT_DOMAIN}" \
  --non-interactive --agree-tos \
  -m "${ADMIN_EMAIL}"
echo "  ✅ SSL certificate issued"

# ── Final nginx config ───────────────────────────────────────
echo "▶ Writing final nginx config..."
sudo rm -f "/etc/nginx/conf.d/client-${CLIENT_SLUG}-temp.conf"
sudo tee "/etc/nginx/conf.d/client-${CLIENT_SLUG}.conf" > /dev/null << NGINX
server {
    listen 80;
    server_name ${CLIENT_DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${CLIENT_DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${CLIENT_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${CLIENT_DOMAIN}/privkey.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:${NEXT_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Cookie \$http_cookie;
    }

    location / {
        root /usr/share/nginx/html/app;
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX
sudo nginx -t && sudo systemctl reload nginx

# ── Save client record ───────────────────────────────────────
mkdir -p "$(dirname "$CLIENTS_LOG")"
echo "${CLIENT_SLUG}|${CLIENT_DOMAIN}|${NEXT_PORT}|${DB_CONTAINER}|${API_CONTAINER}|$(date -u +%Y-%m-%d)" >> "$CLIENTS_LOG"

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║           ✅  CLIENT IS LIVE!                ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  🌐 URL:       https://${CLIENT_DOMAIN}/app"
echo "  👤 Username:  admin"
echo "  🔑 Password:  ${ADMIN_PASSWORD}"
echo ""
if [[ -z "${ANTHROPIC_KEY:-}" ]]; then
  echo "  ⚠️  Anthropic key not set — AI features inactive."
  echo "     Add it in Settings after first login."
  echo ""
fi
echo "  Save these credentials — they won't be shown again."
echo ""
