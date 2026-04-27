/**
 * Webhook routes — dynamic routing by platform
 *
 * GET  /api/webhook/facebook          — FB verify handshake
 * POST /api/webhook/facebook          — FB page events
 * POST /api/webhook/zalo              — Zalo OA events
 * POST /api/webhook/tiktok            — TikTok Business events
 * POST /api/webhook/web               — Web live-chat widget messages
 *
 * Generic fallback:
 * POST /api/webhook                   — routes by X-Platform header or ?platform= query
 */
'use strict';

const express = require('express');
const {
  handleFacebookVerify,
  handleFacebookWebhook,
  handleZaloWebhook,
  handleTikTokWebhook,
  handleWebChatWebhook,
} = require('../services/webhook.service');

const router = express.Router();

// Store rawBody for HMAC verification (Facebook requires this)
router.use((req, _res, next) => {
  let data = [];
  req.on('data', (chunk) => data.push(chunk));
  req.on('end', () => {
    req.rawBody = Buffer.concat(data).toString();
    next();
  });
});

// ── Platform-specific routes ──────────────────────────────────
router.get('/facebook', handleFacebookVerify);
router.post('/facebook', express.json(), handleFacebookWebhook);

router.post('/zalo', express.json(), handleZaloWebhook);

router.post('/tiktok', express.json(), handleTikTokWebhook);

router.post('/web', express.json(), handleWebChatWebhook);

// ── Generic fallback — routes by header or query param ────────
router.post('/', express.json(), async (req, res) => {
  const platform = (
    req.headers['x-platform'] ||
    req.query.platform ||
    req.body?.platform ||
    ''
  ).toUpperCase();

  switch (platform) {
    case 'FACEBOOK': return handleFacebookWebhook(req, res);
    case 'ZALO': return handleZaloWebhook(req, res);
    case 'TIKTOK': return handleTikTokWebhook(req, res);
    case 'WEB': return handleWebChatWebhook(req, res);
    default:
      return res.status(400).json({ error: `Unknown platform: "${platform}". Use X-Platform header.` });
  }
});

module.exports = router;
