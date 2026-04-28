/**
 * OAuth Callback Route — VPS-hosted callback endpoint
 *
 * TikTok (and other platforms) require HTTPS public domain for OAuth redirect.
 * This route handles the OAuth callback on the VPS, exchanges the code for a token,
 * and shows the user a success page.
 *
 * GET /oauth/callback?code=...&state=...
 */
'use strict';

const express = require('express');
const logger = require('../services/logger');
const router = express.Router();

// In-memory store for pending OAuth states (VPS side)
const pendingOAuthStates = new Map();

/**
 * Register a pending OAuth state (called from the channels API when a user initiates OAuth)
 */
function registerOAuthState(state, { platform, clientKey, clientSecret, resolve, reject }) {
  pendingOAuthStates.set(state, { platform, clientKey, clientSecret, resolve, reject, createdAt: Date.now() });

  // Auto-cleanup after 10 minutes
  setTimeout(() => {
    pendingOAuthStates.delete(state);
  }, 10 * 60 * 1000);
}

/**
 * GET /oauth/callback
 * Platform redirects here after user authorizes
 */
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description, scopes } = req.query;

  logger.info('[OAuth Callback] Received', { code: code?.slice(0, 10) + '...', state, error });

  // ── Error from platform ──
  if (error) {
    logger.warn('[OAuth Callback] Error from platform', { error, error_description });
    return res.status(200).send(renderHTML(false, error_description || error));
  }

  if (!code || !state) {
    return res.status(400).send(renderHTML(false, 'Missing code or state parameter'));
  }

  // ── Check pending state ──
  const pending = pendingOAuthStates.get(state);
  if (!pending) {
    logger.warn('[OAuth Callback] Unknown state — may have expired', { state });
    return res.status(200).send(renderHTML(false, 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại.'));
  }

  pendingOAuthStates.delete(state);

  try {
    let tokenData = {};

    // ── TikTok token exchange ──
    if (pending.platform === 'tiktok') {
      const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: pending.clientKey,
          client_secret: pending.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `https://${req.headers.host}/oauth/callback`,
        }),
      });
      const data = await tokenRes.json();

      if (data.error || !data.data?.access_token) {
        throw new Error(data.error_description || data.error || 'Token exchange failed');
      }

      tokenData = {
        accessToken: data.data.access_token,
        refreshToken: data.data.refresh_token,
        openId: data.data.open_id,
        expiresIn: data.data.expires_in,
        scope: data.data.scope,
      };
    }

    // ── Facebook token exchange ──
    else if (pending.platform === 'facebook') {
      const tokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${pending.clientKey}&redirect_uri=${encodeURIComponent(`https://${req.headers.host}/oauth/callback`)}&client_secret=${pending.clientSecret}&code=${code}`
      );
      const data = await tokenRes.json();

      if (data.error) throw new Error(data.error.message);

      // Exchange for long-lived token
      const longRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${pending.clientKey}&client_secret=${pending.clientSecret}&fb_exchange_token=${data.access_token}`
      );
      const longData = await longRes.json();

      // Get user's pages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${longData.access_token}`
      );
      const pagesData = await pagesRes.json();

      tokenData = {
        accessToken: longData.access_token,
        expiresIn: longData.expires_in,
        pages: pagesData.data || [],
      };
    }

    // ── Google/YouTube token exchange ──
    else if (pending.platform === 'google') {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: pending.clientKey,
          client_secret: pending.clientSecret,
          redirect_uri: `https://${req.headers.host}/oauth/callback`,
          grant_type: 'authorization_code',
        }),
      });
      const data = await tokenRes.json();
      if (data.error) throw new Error(data.error_description || data.error);

      tokenData = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    }

    logger.info('[OAuth Callback] Token obtained', { platform: pending.platform, hasToken: !!tokenData.accessToken });

    // Store the token result for the client to poll
    if (pending.resolve) {
      pending.resolve(tokenData);
    }

    // Also store in a retrievable map for the frontend to poll
    oauthResults.set(state, { success: true, data: tokenData, platform: pending.platform });
    setTimeout(() => oauthResults.delete(state), 5 * 60 * 1000); // cleanup after 5 min

    return res.status(200).send(renderHTML(true, 'Đăng nhập thành công! Token đã được lưu.'));

  } catch (err) {
    logger.error('[OAuth Callback] Token exchange failed', { message: err.message, platform: pending.platform });
    if (pending.reject) pending.reject(err);
    return res.status(200).send(renderHTML(false, err.message));
  }
});

// ── Store for polling results ──
const oauthResults = new Map();

/**
 * GET /oauth/result/:state — Frontend polls this to get token after redirect
 */
router.get('/result/:state', (req, res) => {
  const result = oauthResults.get(req.params.state);
  if (!result) {
    return res.json({ pending: true });
  }
  // Don't delete yet — let frontend poll multiple times
  return res.json(result);
});

/**
 * POST /oauth/initiate — Frontend calls this to start OAuth flow (register state)
 */
router.post('/initiate', express.json(), (req, res) => {
  const { platform, clientKey, clientSecret, state } = req.body;
  if (!platform || !clientKey || !state) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  registerOAuthState(state, { platform, clientKey, clientSecret });

  // Build auth URL based on platform
  const redirectUri = `https://${req.headers.host}/oauth/callback`;
  let authUrl = '';

  if (platform === 'tiktok') {
    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'user.info.basic,video.publish,video.upload',
      state,
    });
    authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  } else if (platform === 'facebook') {
    const params = new URLSearchParams({
      client_id: clientKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'pages_manage_posts,pages_read_engagement,pages_messaging,pages_read_user_content',
      state,
    });
    authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  } else if (platform === 'google') {
    const params = new URLSearchParams({
      client_id: clientKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  logger.info('[OAuth] Initiated flow', { platform, state });
  return res.json({ authUrl, state });
});

// ── HTML response renderer ──
function renderHTML(success, message) {
  const icon = success ? '✅' : '❌';
  const title = success ? 'Đăng nhập thành công!' : 'Đăng nhập thất bại';
  const color = success ? '#7c3aed' : '#ef4444';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>OmniDesk OAuth</title></head>
<body style="font-family:'Segoe UI',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f0f14;color:#fff;">
  <div style="text-align:center;max-width:400px;padding:40px;">
    <div style="font-size:64px;margin-bottom:16px">${icon}</div>
    <h2 style="color:${color};margin-bottom:12px">${title}</h2>
    <p style="color:#888;line-height:1.6">${message}</p>
    <p style="color:#555;font-size:13px;margin-top:24px">Bạn có thể đóng tab này và quay lại OmniDesk.</p>
  </div>
</body></html>`;
}

module.exports = { router, registerOAuthState, oauthResults };
