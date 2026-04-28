#!/bin/bash
# =============================================================
# deploy-vps.sh — Triển khai Omni Social Backend lên VPS
# Chạy lệnh này trên VPS với: bash deploy-vps.sh
# =============================================================

set -e

APP_DIR="/www/wwwroot/omni-backend"
DATA_DIR="$APP_DIR/data"
REPO="https://github.com/thangcomputer/MARKETING-DESKTOP.git"
DOMAIN="omni.giasutinhoc24h.com"

echo "======================================================"
echo " Omni Social Backend — Deploy Script"
echo "======================================================"

# 1. Cài Node.js nếu chưa có
if ! command -v node &>/dev/null; then
  echo "[→] Cài Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "[OK] Node.js: $(node -v)"

# 2. Cài PM2 nếu chưa có
if ! command -v pm2 &>/dev/null; then
  echo "[→] Cài PM2..."
  npm install -g pm2
fi
echo "[OK] PM2: $(pm2 -v)"

# 3. Clone hoặc pull code
if [ -d "$APP_DIR/.git" ]; then
  echo "[→] Pull code mới nhất..."
  cd "$APP_DIR"
  git pull origin main
else
  echo "[→] Clone repository..."
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# 4. Tạo thư mục lưu database
mkdir -p "$DATA_DIR"
echo "[OK] Data directory: $DATA_DIR"

# 5. Cài dependencies (chỉ production, bỏ devDependencies)
echo "[→] Cài npm packages..."
npm install --omit=dev --ignore-scripts

# 6. Cài thêm electron-less deps (Electron không cần trên server)
npm install better-sqlite3 --build-from-source 2>/dev/null || true

# 7. Prisma generate (tạo client)
echo "[→] Prisma generate..."
DATABASE_URL="file:$DATA_DIR/social-manager.db" npx prisma generate

# 8. Prisma migrate (tạo bảng DB)
echo "[→] Prisma migrate..."
DATABASE_URL="file:$DATA_DIR/social-manager.db" npx prisma migrate deploy

# 9. Start/Restart với PM2
echo "[→] Khởi động với PM2..."
pm2 delete omni-social-backend 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup 2>/dev/null || true

# 10. Cấu hình Nginx
echo "[→] Cấu hình Nginx..."
cp nginx.conf /etc/nginx/sites-available/omni-backend
ln -sf /etc/nginx/sites-available/omni-backend /etc/nginx/sites-enabled/omni-backend
nginx -t && systemctl reload nginx

# 11. Cài SSL với Certbot
echo "[→] Cài SSL (Let's Encrypt)..."
if command -v certbot &>/dev/null; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@giasutinhoc24h.com || echo "[WARN] SSL chưa sẵn sàng — thử lại sau vài phút"
else
  echo "[WARN] certbot chưa cài. Chạy: apt install certbot python3-certbot-nginx -y"
fi

echo ""
echo "======================================================"
echo " ✅ Deploy hoàn tất!"
echo " Backend chạy tại: https://$DOMAIN"
echo " PM2 status:"
pm2 list
echo "======================================================"
