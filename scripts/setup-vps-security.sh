#!/bin/bash
# =============================================================
# setup-vps-security.sh — VPS Firewall & SSH Hardening Setup
# =============================================================
# Chạy với quyền root trên Ubuntu/Debian VPS:
#   sudo bash setup-vps-security.sh
#
# Script này sẽ:
#   ✅ Cài đặt và cấu hình UFW firewall
#   ✅ Chỉ mở 3 cổng: 22 (SSH), 80 (HTTP), 443 (HTTPS)
#   ✅ Chặn tất cả các cổng khác (3000, 5432, 3777, v.v.)
#   ✅ Tắt đăng nhập SSH bằng mật khẩu
#   ✅ Giới hạn số lần SSH đăng nhập thất bại (Fail2Ban)
# =============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  VPS Security Hardening Script${NC}"
echo -e "${GREEN}  Social Media Manager — Production${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# ── Kiểm tra quyền root ───────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[LỖI] Script này cần chạy với quyền root${NC}"
  echo "      Dùng: sudo bash setup-vps-security.sh"
  exit 1
fi

# ── 1. Cập nhật hệ thống ──────────────────────────────────────
echo -e "${YELLOW}[1/5] Cập nhật danh sách gói...${NC}"
apt-get update -qq

# ── 2. Cài đặt UFW + Fail2Ban ─────────────────────────────────
echo -e "${YELLOW}[2/5] Cài đặt UFW firewall và Fail2Ban...${NC}"
apt-get install -y -qq ufw fail2ban

# ── 3. Cấu hình UFW Firewall ──────────────────────────────────
echo -e "${YELLOW}[3/5] Cấu hình UFW...${NC}"

# Reset về mặc định
ufw --force reset

# Mặc định: từ chối tất cả kết nối đến, cho phép ra ngoài
ufw default deny incoming
ufw default allow outgoing

# Chỉ mở đúng 3 cổng cần thiết:
ufw allow 22/tcp    comment 'SSH Admin'
ufw allow 80/tcp    comment 'HTTP (Nginx proxy)'
ufw allow 443/tcp   comment 'HTTPS Webhook + App'

# Giới hạn SSH (auto-ban nếu thử đăng nhập sai quá nhiều)
ufw limit 22/tcp comment 'SSH bruteforce protection'

# Kích hoạt
ufw --force enable
echo -e "${GREEN}[OK] UFW đã bật. Các cổng đang mở:${NC}"
ufw status verbose

# ── 4. Tắt đăng nhập SSH bằng mật khẩu ──────────────────────
echo ""
echo -e "${YELLOW}[4/5] Cứng hoá SSH...${NC}"

SSHD_CONFIG="/etc/ssh/sshd_config"

# Backup file gốc
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.bak.$(date +%Y%m%d)"

# Áp dụng cấu hình bảo mật
cat >> "$SSHD_CONFIG" << 'EOF'

# ── Social Manager Security Hardening ──────────────────────────
PasswordAuthentication no        # Tắt đăng nhập bằng mật khẩu
PermitRootLogin prohibit-password # Root chỉ dùng SSH key
PubkeyAuthentication yes         # Bắt buộc SSH key
MaxAuthTries 3                   # Tối đa 3 lần thử/session
MaxSessions 5                    # Tối đa 5 session đồng thời
LoginGraceTime 30                # Timeout 30 giây để đăng nhập
X11Forwarding no                 # Tắt X11 forwarding
AllowTcpForwarding no            # Tắt TCP tunneling
# ──────────────────────────────────────────────────────────────
EOF

# Kiểm tra cú pháp
sshd -t && echo -e "${GREEN}[OK] SSH config hợp lệ${NC}" || {
  echo -e "${RED}[LỖI] SSH config lỗi, đang restore...${NC}"
  cp "${SSHD_CONFIG}.bak.$(date +%Y%m%d)" "$SSHD_CONFIG"
  exit 1
}

systemctl reload sshd
echo -e "${GREEN}[OK] SSH đã được cứng hoá — chỉ cho phép đăng nhập bằng SSH Key${NC}"

# ── 5. Cấu hình Fail2Ban ──────────────────────────────────────
echo ""
echo -e "${YELLOW}[5/5] Cấu hình Fail2Ban...${NC}"

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600    ; Ban 1 giờ
findtime = 600     ; Trong 10 phút
maxretry = 5       ; Nếu thất bại 5 lần

[sshd]
enabled  = true
port     = ssh
logpath  = %(sshd_log)s
maxretry = 3       ; SSH nghiêm ngặt hơn: 3 lần là ban
bantime  = 86400   ; Ban 24 giờ

[nginx-http-auth]
enabled  = true

[nginx-limit-req]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban
echo -e "${GREEN}[OK] Fail2Ban đã chạy${NC}"

# ── Tóm tắt ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ HOÀN TẤT! Tóm tắt bảo mật:${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "  🔥 UFW     : BẬT — chỉ mở cổng 22, 80, 443"
echo -e "  🔑 SSH     : Chỉ cho phép SSH Key"
echo -e "  🛡️  Fail2Ban: Tự động ban IP xấu"
echo -e "  ❌ Đã đóng : 3000, 3777, 5432 và tất cả cổng khác"
echo ""
echo -e "${YELLOW}⚠️  QUAN TRỌNG: Đảm bảo SSH Key đã được cài trước khi logout!${NC}"
echo -e "${YELLOW}   Lệnh kiểm tra: cat ~/.ssh/authorized_keys${NC}"
echo ""
