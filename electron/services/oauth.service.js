/**
 * oauth.service.js — OAuth 2.0 Authorization Code Flow via Electron Shell
 *
 * Cách hoạt động:
 *  1. App mở cửa sổ trình duyệt hệ thống (shell.openExternal) đến URL xác thực của nền tảng
 *  2. Người dùng đăng nhập + chấp thuận quyền trên trình duyệt
 *  3. Nền tảng redirect về localhost callback server (port 51234)
 *  4. Server nhận code, đổi lấy Access Token
 *  5. Token được trả về main process → gửi xuống renderer qua IPC
 *
 * Được hỗ trợ:
 *  ✅ Facebook (Meta Graph API)
 *  ✅ Google / YouTube (OAuth 2.0)
 *  ✅ TikTok for Developers
 *  ✅ Zalo (bắt buộc nhập tay — không hỗ trợ OAuth desktop)
 */
'use strict';

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { shell } = require('electron');
const logger = require('./logger');

// ── Cổng Callback cố định (loopback) ─────────────────────────
const CALLBACK_PORT = 51234;
const CALLBACK_HOST = '127.0.0.1';
const REDIRECT_URI = `http://${CALLBACK_HOST}:${CALLBACK_PORT}/oauth/callback`;

// ── State store (tránh CSRF) ──────────────────────────────────
const pendingStates = new Map(); // state -> { platform, resolve, reject, server }

// ── Platform OAuth Configs ────────────────────────────────────
const OAUTH_CONFIGS = {
  facebook: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scope: 'pages_manage_posts,pages_read_engagement,pages_messaging,pages_read_user_content',
    async exchangeCode(code, appId, appSecret) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${appSecret}&code=${code}`
      );
      if (!res.ok) throw new Error(`Facebook token exchange failed: ${await res.text()}`);
      const data = await res.json();

      // Đổi short-lived token → long-lived token (60 ngày)
      const longRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${data.access_token}`
      );
      const longData = await longRes.json();

      // Lấy danh sách Pages user quản lý
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${longData.access_token}`
      );
      const pagesData = await pagesRes.json();

      return {
        accessToken: longData.access_token,
        expiresIn: longData.expires_in,
        pages: pagesData.data || [],
      };
    },
  },

  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ].join(' '),
    async exchangeCode(code, clientId, clientSecret) {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });
      if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
      const data = await res.json();

      // Lấy thông tin channel YouTube
      const channelRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: `Bearer ${data.access_token}` } }
      );
      const channelData = await channelRes.json();
      const channel = channelData.items?.[0];

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        channelId: channel?.id || '',
        channelName: channel?.snippet?.title || '',
      };
    },
  },

  tiktok: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    scope: 'user.info.basic,video.publish,video.upload',
    async exchangeCode(code, clientKey, clientSecret) {
      const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        }),
      });
      if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`);
      const data = await res.json();
      return {
        accessToken: data.data?.access_token || data.access_token,
        refreshToken: data.data?.refresh_token || data.refresh_token,
        openId: data.data?.open_id || data.open_id,
        expiresIn: data.data?.expires_in || data.expires_in,
      };
    },
  },
};

// ── Khởi động callback server tạm thời ────────────────────────

function startCallbackServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);

      if (!parsedUrl.pathname.startsWith('/oauth/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const { code, state, error, error_description } = parsedUrl.query;

      // Gửi HTML phản hồi đẹp đến trình duyệt
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (error) {
        res.end(`
          <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#0f0f14;color:#fff;">
            <div style="text-align:center">
              <div style="font-size:48px;margin-bottom:16px">❌</div>
              <h2>Đăng nhập thất bại</h2>
              <p style="color:#888">${error_description || error}</p>
              <p style="color:#555;font-size:13px;margin-top:20px">Bạn có thể đóng tab này.</p>
            </div>
          </body></html>
        `);
      } else {
        res.end(`
          <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#0f0f14;color:#fff;">
            <div style="text-align:center">
              <div style="font-size:48px;margin-bottom:16px">✅</div>
              <h2 style="color:#7c3aed">Đăng nhập thành công!</h2>
              <p style="color:#888">Token đã được lưu vào ứng dụng.</p>
              <p style="color:#555;font-size:13px;margin-top:20px">Bạn có thể đóng tab này và quay lại OmniDesk.</p>
            </div>
          </body></html>
        `);
      }

      // Xử lý callback
      if (state && pendingStates.has(state)) {
        const pending = pendingStates.get(state);
        pendingStates.delete(state);

        if (error) {
          pending.reject(new Error(error_description || error));
        } else {
          pending.resolve({ code, state });
        }

        // Tắt server sau 1 giây
        setTimeout(() => {
          server.close(() => logger.info('[OAuth] Callback server stopped'));
        }, 1000);
      }
    });

    server.listen(CALLBACK_PORT, CALLBACK_HOST, () => {
      logger.info(`[OAuth] Callback server listening on ${REDIRECT_URI}`);
      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`[OAuth] Port ${CALLBACK_PORT} already in use — another flow may be running`);
        resolve(null); // Server đang chạy rồi, ok
      } else {
        reject(err);
      }
    });
  });
}

// ── Hàm chính: startOAuthFlow ─────────────────────────────────

/**
 * Mở trình duyệt đến trang OAuth và đợi callback.
 *
 * @param {string} platform   - 'facebook' | 'google' | 'tiktok'
 * @param {object} appKeys    - { appId/clientId/clientKey, appSecret/clientSecret }
 * @returns {Promise<object>} - Token data từ platform
 */
async function startOAuthFlow(platform, appKeys) {
  const config = OAUTH_CONFIGS[platform];
  if (!config) throw new Error(`OAuth không hỗ trợ platform: ${platform}`);

  // Tạo state ngẫu nhiên để chống CSRF
  const state = crypto.randomBytes(16).toString('hex');

  // Khởi động callback server
  const server = await startCallbackServer();

  // Tạo Promise đợi callback
  const callbackPromise = new Promise((resolve, reject) => {
    pendingStates.set(state, { platform, resolve, reject, server });

    // Timeout sau 5 phút
    setTimeout(() => {
      if (pendingStates.has(state)) {
        pendingStates.delete(state);
        if (server) server.close();
        reject(new Error('OAuth timeout — người dùng không hoàn tất đăng nhập trong 5 phút'));
      }
    }, 5 * 60 * 1000);
  });

  // Xây dựng URL xác thực
  const authParams = new URLSearchParams({
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state,
  });

  if (platform === 'facebook') {
    authParams.set('client_id', appKeys.appId);
    authParams.set('scope', config.scope);
  } else if (platform === 'google') {
    authParams.set('client_id', appKeys.clientId);
    authParams.set('scope', config.scope);
    authParams.set('access_type', 'offline');
    authParams.set('prompt', 'consent');
  } else if (platform === 'tiktok') {
    authParams.set('client_key', appKeys.clientKey);
    authParams.set('scope', config.scope);
  }

  const authUrl = `${config.authUrl}?${authParams.toString()}`;
  logger.info(`[OAuth] Opening browser for ${platform}`, { authUrl });

  // Mở trình duyệt hệ thống
  await shell.openExternal(authUrl);

  // Đợi callback
  const { code } = await callbackPromise;
  logger.info(`[OAuth] Got authorization code for ${platform}`);

  // Đổi code lấy token
  const tokenData = await config.exchangeCode(
    code,
    appKeys.appId || appKeys.clientId || appKeys.clientKey,
    appKeys.appSecret || appKeys.clientSecret
  );

  logger.info(`[OAuth] Token obtained for ${platform}`, {
    hasAccessToken: !!tokenData.accessToken,
    hasRefreshToken: !!tokenData.refreshToken,
  });

  return tokenData;
}

module.exports = { startOAuthFlow, REDIRECT_URI };
