#!/bin/bash
# =============================================================
# auto-backup.sh — PostgreSQL Auto-Backup Script
# =============================================================
# Cài đặt:
#   1. chmod +x auto-backup.sh
#   2. Thêm vào crontab:  crontab -e
#      0 2 * * * /root/scripts/auto-backup.sh >> /var/log/db-backup.log 2>&1
#
# Script này sẽ:
#   - Dump toàn bộ PostgreSQL database lúc 2h sáng
#   - Giữ lại 7 bản backup gần nhất
#   - Upload lên Google Drive (nếu rclone đã cài)
#   - Ghi log chi tiết
# =============================================================

set -euo pipefail

# ── Cấu hình ──────────────────────────────────────────────────
DB_NAME="${PGDATABASE:-social_manager}"
DB_USER="${PGUSER:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"

BACKUP_DIR="/var/backups/social-manager"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/db_${DATE}.sql.gz"

KEEP_DAYS=7                         # Số ngày giữ backup
RCLONE_REMOTE="gdrive:backups/social-manager"  # Cấu hình rclone trước

# ── Tạo thư mục backup nếu chưa có ───────────────────────────
mkdir -p "$BACKUP_DIR"

echo "========================================"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] BẮT ĐẦU BACKUP"
echo "Database : $DB_NAME"
echo "File     : $BACKUP_FILE"
echo "========================================"

# ── Thực hiện backup ──────────────────────────────────────────
PGPASSWORD="${PGPASSWORD:-}" \
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-password \
  --format=custom \
  | gzip -9 > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  echo "[OK] Backup thành công: $BACKUP_FILE ($SIZE)"
else
  echo "[LỖI] pg_dump thất bại!" >&2
  exit 1
fi

# ── Upload lên Google Drive (nếu rclone đã cài) ───────────────
if command -v rclone &> /dev/null; then
  echo "[→] Đang upload lên Google Drive..."
  rclone copy "$BACKUP_FILE" "$RCLONE_REMOTE" \
    --log-level INFO \
    --log-file /var/log/rclone-backup.log

  if [ $? -eq 0 ]; then
    echo "[OK] Upload Google Drive thành công"
  else
    echo "[CẢNH BÁO] Upload Google Drive thất bại — file vẫn giữ local" >&2
  fi
else
  echo "[THÔNG TIN] rclone chưa cài — bỏ qua upload Google Drive"
  echo "            Cài đặt: https://rclone.org/downloads/"
fi

# ── Xóa backup cũ (hơn KEEP_DAYS ngày) ──────────────────────
echo "[→] Dọn dẹp backup cũ hơn ${KEEP_DAYS} ngày..."
COUNT_BEFORE=$(ls "$BACKUP_DIR"/*.gz 2>/dev/null | wc -l)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${KEEP_DAYS}" -delete
COUNT_AFTER=$(ls "$BACKUP_DIR"/*.gz 2>/dev/null | wc -l)
DELETED=$((COUNT_BEFORE - COUNT_AFTER))
echo "[OK] Đã xóa ${DELETED} file backup cũ. Hiện còn ${COUNT_AFTER} file."

# ── Thống kê ─────────────────────────────────────────────────
echo "========================================"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] BACKUP HOÀN TẤT ✅"
echo "Tổng dung lượng backup: $(du -sh $BACKUP_DIR | cut -f1)"
echo "========================================"
