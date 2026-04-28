#!/bin/bash
# =============================================================
#  OMNI SOCIAL MANAGER — Setup Script (All-in-One)
#  Chạy 1 lần duy nhất trên VPS để cài đặt toàn bộ hệ thống:
#    ✅ Node.js 20 + PM2
#    ✅ Clone / cập nhật code từ GitHub
#    ✅ Cài npm packages (bỏ qua Electron)
#    ✅ Prisma generate + migrate (SQLite)
#    ✅ Nginx reverse proxy
#    ✅ SSL miễn phí (Let's Encrypt)
#    ✅ PM2 startup on boot
#    ✅ Cron auto-backup hàng ngày
#
#  Cách dùng:
#    chmod +x setup.sh
#    bash setup.sh
# =============================================================

set -euo pipefail

# ── Màu sắc ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ok()   { echo -e "${GREEN}  [✓] $1${NC}"; }
info() { echo -e "${CYAN}  [→] $1${NC}"; }
warn() { echo -e "${YELLOW}  [!] $1${NC}"; }
err()  { echo -e "${RED}  [✗] $1${NC}"; exit 1; }
sep()  { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════${NC}"; }

# ── Banner ────────────────────────────────────────────────────
clear
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║   OMNI SOCIAL MANAGER — VPS SETUP    ║"
echo "  ║   Quản lý Mạng Xã Hội Tập Trung      ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# ── Kiểm tra quyền root ───────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "Script này cần chạy với quyền root. Dùng: sudo bash setup.sh"
fi

# ════════════════════════════════════════════════════════
# BƯỚC 1: CẤU HÌNH (nhập tay hoặc mặc định)
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 1: CẤU HÌNH HỆ THỐNG${NC}\n"

# Domain
DEFAULT_DOMAIN="omni.giasutinhoc24h.com"
echo -e "${YELLOW}  Domain backend (Enter để dùng mặc định: $DEFAULT_DOMAIN):${NC}"
read -r INPUT_DOMAIN
DOMAIN="${INPUT_DOMAIN:-$DEFAULT_DOMAIN}"
ok "Domain: $DOMAIN"

# Email SSL
DEFAULT_EMAIL="admin@giasutinhoc24h.com"
echo -e "${YELLOW}  Email đăng ký SSL (Enter để dùng mặc định: $DEFAULT_EMAIL):${NC}"
read -r INPUT_EMAIL
SSL_EMAIL="${INPUT_EMAIL:-$DEFAULT_EMAIL}"
ok "Email SSL: $SSL_EMAIL"

# Port backend
DEFAULT_PORT="3777"
echo -e "${YELLOW}  Port backend (Enter để dùng mặc định: $DEFAULT_PORT):${NC}"
read -r INPUT_PORT
API_PORT="${INPUT_PORT:-$DEFAULT_PORT}"
ok "Port: $API_PORT"

# Thư mục cài đặt
APP_DIR="/www/wwwroot/omni-backend"
DATA_DIR="$APP_DIR/data"
REPO="https://github.com/thangcomputer/MARKETING-DESKTOP.git"

# JWT Secret ngẫu nhiên
JWT_SECRET=$(openssl rand -hex 32)
ENC_KEY=$(openssl rand -hex 16)

echo ""
echo -e "${BOLD}  📋 Tóm tắt cấu hình:${NC}"
echo "  ┌─────────────────────────────────────┐"
echo "  │ Domain   : $DOMAIN"
echo "  │ Port     : $API_PORT"
echo "  │ Thư mục  : $APP_DIR"
echo "  │ Database : $DATA_DIR/social-manager.db"
echo "  │ SSL Email: $SSL_EMAIL"
echo "  └─────────────────────────────────────┘"
echo ""
echo -e "${YELLOW}  Bắt đầu cài đặt? [Y/n]:${NC}"
read -r CONFIRM
if [[ "${CONFIRM,,}" == "n" ]]; then
  echo "Đã hủy."
  exit 0
fi

# ════════════════════════════════════════════════════════
# BƯỚC 2: CẬP NHẬT HỆ THỐNG
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 2: CẬP NHẬT HỆ THỐNG${NC}\n"
info "Cập nhật apt packages..."
apt-get update -qq
apt-get install -y -qq curl git build-essential nginx certbot python3-certbot-nginx
ok "System packages đã cài xong"

# ════════════════════════════════════════════════════════
# BƯỚC 3: CÀI NODE.JS 20
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 3: CÀI NODE.JS 20${NC}\n"
if command -v node &>/dev/null; then
  NODE_VER=$(node -v)
  ok "Node.js đã có: $NODE_VER"
else
  info "Cài Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs
  ok "Node.js đã cài: $(node -v)"
fi

# ════════════════════════════════════════════════════════
# BƯỚC 4: CÀI PM2
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 4: CÀI PM2 (Process Manager)${NC}\n"
if command -v pm2 &>/dev/null; then
  ok "PM2 đã có: v$(pm2 -v)"
else
  info "Cài PM2..."
  npm install -g pm2 --silent
  ok "PM2 đã cài: v$(pm2 -v)"
fi

# ════════════════════════════════════════════════════════
# BƯỚC 5: CLONE / CẬP NHẬT CODE
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 5: TẢI CODE TỪ GITHUB${NC}\n"
mkdir -p "$APP_DIR" "$DATA_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
  info "Cập nhật code từ GitHub..."
  cd "$APP_DIR"
  git pull origin main
  ok "Code đã cập nhật"
else
  info "Clone repository lần đầu..."
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
  ok "Code đã clone xong"
fi

# ════════════════════════════════════════════════════════
# BƯỚC 6: TẠO FILE .ENV CHO SERVER
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 6: CẤU HÌNH BIẾN MÔI TRƯỜNG${NC}\n"
ENV_FILE="$APP_DIR/.env.server"

cat > "$ENV_FILE" << EOF
# Omni Social Backend — Production Environment
# Tạo tự động bởi setup.sh — $(date '+%Y-%m-%d %H:%M:%S')

NODE_ENV=production
API_PORT=$API_PORT

# Database (SQLite — lưu file local trên VPS)
DATABASE_URL=file:$DATA_DIR/social-manager.db
DATABASE_PATH=$DATA_DIR/social-manager.db

# Bảo mật (ngẫu nhiên, không chia sẻ)
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENC_KEY

# Domain (dùng cho CORS)
PUBLIC_URL=https://$DOMAIN
EOF

ok "File .env đã tạo: $ENV_FILE"

# ════════════════════════════════════════════════════════
# BƯỚC 7: CÀI NPM PACKAGES
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 7: CÀI NPM PACKAGES${NC}\n"
cd "$APP_DIR"
info "Cài dependencies (bỏ qua Electron, devDependencies)..."
npm install --omit=dev --ignore-scripts 2>&1 | tail -3

info "Build better-sqlite3 từ source (native addon)..."
npm install better-sqlite3 --build-from-source 2>&1 | tail -3

ok "Npm packages đã cài xong"

# ════════════════════════════════════════════════════════
# BƯỚC 8: PRISMA GENERATE + MIGRATE
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 8: CÀI ĐẶT DATABASE (SQLite)${NC}\n"
cd "$APP_DIR"

info "Prisma generate (tạo client)..."
DATABASE_URL="file:$DATA_DIR/social-manager.db" \
  npx prisma generate 2>&1 | tail -5
ok "Prisma generate xong"

info "Prisma migrate deploy (tạo bảng)..."
DATABASE_URL="file:$DATA_DIR/social-manager.db" \
  npx prisma migrate deploy 2>&1 | tail -5
ok "Database đã khởi tạo: $DATA_DIR/social-manager.db"

# ════════════════════════════════════════════════════════
# BƯỚC 9: KHỞI ĐỘNG VỚI PM2
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 9: KHỞI ĐỘNG BACKEND VỚI PM2${NC}\n"
cd "$APP_DIR"

# Dừng nếu đang chạy
pm2 delete omni-social-backend 2>/dev/null || true

# Cập nhật ecosystem.config.js trực tiếp
cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'omni-social-backend',
    script: 'electron/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      API_PORT: $API_PORT,
      DATABASE_URL: 'file:$DATA_DIR/social-manager.db',
      DATABASE_PATH: '$DATA_DIR/social-manager.db',
      JWT_SECRET: '$JWT_SECRET',
      ENCRYPTION_KEY: '$ENC_KEY'
    }
  }]
};
EOF

pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash 2>/dev/null || true
ok "PM2 đã khởi động và đăng ký tự khởi động khi reboot"

# Kiểm tra health
info "Kiểm tra backend..."
sleep 3
HEALTH=$(curl -s "http://127.0.0.1:$API_PORT/health" || echo "ERROR")
if echo "$HEALTH" | grep -q '"ok":true'; then
  ok "Backend đang chạy: $HEALTH"
else
  warn "Backend chưa phản hồi (có thể đang khởi động). Kiểm tra: pm2 logs omni-social-backend"
fi

# ════════════════════════════════════════════════════════
# BƯỚC 10: CẤU HÌNH NGINX
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 10: CẤU HÌNH NGINX${NC}\n"

NGINX_CONF="/etc/nginx/sites-available/omni-backend"

cat > "$NGINX_CONF" << EOF
# Omni Social Backend — Nginx Config
# Domain: $DOMAIN → Port $API_PORT
# Tạo bởi setup.sh

server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Reverse Proxy → Node.js backend
    location / {
        proxy_pass         http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;

        # WebSocket (Socket.io)
        proxy_set_header   Upgrade    \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_read_timeout 86400;

        # Webhook payloads (hình ảnh, video)
        client_max_body_size 50M;
    }
}
EOF

# Kích hoạt site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/omni-backend

# Kiểm tra và reload
if nginx -t 2>&1 | grep -q "successful"; then
  systemctl reload nginx
  ok "Nginx đã cấu hình xong cho $DOMAIN"
else
  warn "Nginx config có lỗi. Kiểm tra: nginx -t"
fi

# ════════════════════════════════════════════════════════
# BƯỚC 11: CÀI SSL (LET'S ENCRYPT)
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 11: CÀI SSL MIỄN PHÍ${NC}\n"
info "Đang xin chứng chỉ SSL từ Let's Encrypt cho $DOMAIN..."

if certbot --nginx -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    -m "$SSL_EMAIL" \
    --redirect 2>&1 | grep -q "Congratulations\|Certificate not yet due"; then
  ok "SSL đã cài thành công! HTTPS hoạt động."
else
  warn "SSL chưa thành công — DNS có thể chưa propagate. Chạy lại sau 5 phút:"
  warn "certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $SSL_EMAIL --redirect"
fi

# ════════════════════════════════════════════════════════
# BƯỚC 12: CRON AUTO-BACKUP
# ════════════════════════════════════════════════════════
sep
echo -e "${BOLD} BƯỚC 12: CÀI ĐẶT AUTO-BACKUP${NC}\n"
BACKUP_DIR="/var/backups/omni-social"
mkdir -p "$BACKUP_DIR"

CRON_JOB="0 3 * * * cp $DATA_DIR/social-manager.db $BACKUP_DIR/social-manager-\$(date +\%Y-\%m-\%d).db && find $BACKUP_DIR -name '*.db' -mtime +7 -delete"

# Thêm vào crontab nếu chưa có
( crontab -l 2>/dev/null | grep -v "social-manager.db"; echo "$CRON_JOB" ) | crontab -
ok "Cron backup hàng ngày lúc 3h sáng đã cài vào: $BACKUP_DIR"

# ════════════════════════════════════════════════════════
# HOÀN TẤT
# ════════════════════════════════════════════════════════
sep
echo -e "\n${BOLD}${GREEN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║        ✅ CÀI ĐẶT HOÀN TẤT!          ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BOLD}  📌 Thông tin hệ thống:${NC}"
echo "  ┌────────────────────────────────────────────────────┐"
echo "  │ 🌐 Backend URL : https://$DOMAIN"
echo "  │ 🩺 Health check: https://$DOMAIN/health"
echo "  │ 📩 Webhook FB  : https://$DOMAIN/api/webhook/facebook"
echo "  │ 📩 Webhook Zalo: https://$DOMAIN/api/webhook/zalo"
echo "  │ 💾 Database    : $DATA_DIR/social-manager.db"
echo "  │ 💾 Backup      : $BACKUP_DIR/"
echo "  │ 📋 PM2 status  : pm2 list"
echo "  │ 📋 PM2 logs    : pm2 logs omni-social-backend"
echo "  │ 🔄 Restart     : pm2 restart omni-social-backend"
echo "  └────────────────────────────────────────────────────┘"

echo ""
echo -e "${BOLD}  📋 PM2 Process Status:${NC}"
pm2 list

echo ""
echo -e "${BOLD}  🔑 JWT Secret (lưu lại, không chia sẻ):${NC}"
echo "  $JWT_SECRET"
echo ""
