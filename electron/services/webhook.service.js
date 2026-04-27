/**
 * Webhook Service — HARDENED
 * Platform-specific signature verification and payload parsing.
 *
 * Security:
 *  ✅ Facebook  — HMAC-SHA256 via X-Hub-Signature-256  (timing-safe compare)
 *  ✅ Zalo      — HMAC-SHA256 via X-Zalo-Signature     (timing-safe compare)
 *  ✅ TikTok    — HMAC-SHA256 via X-TikTok-Signature   (timing-safe compare)
 *  ✅ WebChat   — Widget Key verification
 *  ✅ All errors logged via Winston (no console.*)
 *  ✅ Message content sanitised before persistence (XSS prevent even at DB level)
 */
'use strict';

const crypto = require('crypto');
const { getPrismaClient } = require('./db');
const { emitNewMessage, emitConversationUpdated } = require('../socket');
const logger = require('./logger');

// ── Content sanitizer (server-side, no DOM) ─────────────────────
// Strip common HTML injection attempts before storing in DB
function sanitizeContent(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')        // strip remaining HTML tags
    .replace(/javascript:/gi, '')   // strip JS URLs
    .replace(/on\w+\s*=/gi, '')     // strip event handlers
    .trim()
    .slice(0, 8000);                // cap at 8 KB to prevent DB bloat
}

// ── Shared: upsert conversation & save message ────────────────

async function persistMessage(prisma, channelId, externalConvId, participantName, messageData) {
  // Sanitize before persistence
  const cleanContent = sanitizeContent(messageData.content);

  // 1. Upsert conversation
  let conversation = await prisma.conversation.upsert({
    where: { channelId_externalId: { channelId, externalId: externalConvId } },
    create: {
      channelId,
      externalId: externalConvId,
      participantName: sanitizeContent(participantName),
      status: 'OPEN',
      lastMessage: cleanContent,
      lastMessageAt: new Date(messageData.timestamp),
      unreadCount: 1,
    },
    update: {
      lastMessage: cleanContent,
      lastMessageAt: new Date(messageData.timestamp),
      unreadCount: { increment: 1 },
      status: 'OPEN',
    },
    include: { channel: true, assignedTo: true },
  });

  // 2. Dedup — if externalId already stored, skip
  if (messageData.externalId) {
    const existing = await prisma.message.findFirst({
      where: { externalId: messageData.externalId },
    });
    if (existing) {
      logger.debug('[Webhook] Duplicate message skipped', { externalId: messageData.externalId });
      return { message: existing, conversation };
    }
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: 'CUSTOMER',
      externalId: messageData.externalId || null,
      content: cleanContent,
      mediaUrl: messageData.mediaUrl || null,
      mediaType: messageData.mediaType || null,
      timestamp: new Date(messageData.timestamp),
    },
  });

  // 3. Emit real-time
  emitNewMessage(message, conversation);
  emitConversationUpdated(conversation);

  logger.info('[Webhook] Message persisted', {
    platform: conversation.channel?.platform,
    conversationId: conversation.id,
    messageId: message.id,
  });

  return { message, conversation };
}

// ── HMAC signature helpers ─────────────────────────────────────

/**
 * Constant-time HMAC-SHA256 comparison.
 * Returns true if sig matches HMAC(secret, body).
 *
 * @param {string} rawBody  — raw request body string
 * @param {string} secret   — webhook secret key
 * @param {string} header   — the signature header value (may include "sha256=" prefix)
 * @param {string} prefix   — expected prefix (e.g. "sha256=")
 */
function verifyHmacSha256(rawBody, secret, header, prefix = '') {
  if (!secret) return true;   // skip verification if not configured
  if (!header) return false;

  const received = header.startsWith(prefix) ? header.slice(prefix.length) : header;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody || '')
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(received, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false; // length mismatch = invalid
  }
}

// ── Facebook Webhook ──────────────────────────────────────────

/**
 * GET /api/webhook/facebook?hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y
 */
async function handleFacebookVerify(req, res) {
  const prisma = getPrismaClient();
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  if (mode !== 'subscribe') {
    logger.warn('[Facebook Verify] Bad hub.mode', { mode });
    return res.sendStatus(400);
  }

  const channel = await prisma.channel.findFirst({
    where: { platform: 'FACEBOOK', webhookSecret: token, isActive: true },
  });

  if (!channel) {
    logger.warn('[Facebook Verify] No matching channel for verify_token', { token: token?.slice(0, 6) + '...' });
    return res.sendStatus(403);
  }

  logger.info('[Facebook Verify] Handshake succeeded', { channelId: channel.id });
  return res.status(200).send(challenge);
}

/**
 * POST /api/webhook/facebook
 * Verifies X-Hub-Signature-256, then processes each entry.
 */
async function handleFacebookWebhook(req, res) {
  try {
    const prisma = getPrismaClient();
    const body = req.body;

    if (body.object !== 'page') return res.sendStatus(200);

    for (const entry of body.entry || []) {
      const pageId = entry.id;

      const channel = await prisma.channel.findFirst({
        where: { platform: 'FACEBOOK', accountId: pageId, isActive: true },
      });
      if (!channel) continue;

      // ✅ Signature verification
      const sigHeader = req.headers['x-hub-signature-256'];
      if (!verifyHmacSha256(req.rawBody, channel.webhookSecret, sigHeader, 'sha256=')) {
        logger.warn('[Facebook Webhook] ❌ Invalid HMAC signature — possible spoofing', {
          channelId: channel.id,
          pageId,
          ip: req.ip,
        });
        continue; // reject this entry but don't leak info to caller
      }

      for (const messaging of entry.messaging || []) {
        if (!messaging.message) continue;
        if (messaging.message.is_echo) continue; // ignore our own sent messages

        const senderId = messaging.sender.id;
        const text = messaging.message.text || '[media]';
        const attachment = messaging.message.attachments?.[0];

        await persistMessage(prisma, channel.id, senderId, 'Facebook User', {
          externalId: messaging.message.mid,
          content: text,
          mediaUrl: attachment?.payload?.url || null,
          mediaType: attachment?.type || null,
          timestamp: messaging.timestamp,
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    logger.error('[Facebook Webhook] Unhandled error', { message: err.message, stack: err.stack });
    res.sendStatus(500);
  }
}

// ── Zalo OA Webhook ───────────────────────────────────────────

/**
 * POST /api/webhook/zalo
 * Zalo sends events as JSON. Signature via X-Zalo-Signature header.
 */
async function handleZaloWebhook(req, res) {
  try {
    const prisma = getPrismaClient();
    const { event_name, sender, message, timestamp } = req.body;

    if (!['user_send_text', 'user_send_image', 'user_send_file'].includes(event_name)) {
      return res.sendStatus(200);
    }

    const oaId = req.headers['x-zalo-oa-id'] || req.body.recipient?.id;
    if (!oaId) return res.sendStatus(400);

    const channel = await prisma.channel.findFirst({
      where: { platform: 'ZALO', accountId: oaId, isActive: true },
    });
    if (!channel) return res.sendStatus(200);

    // ✅ Zalo signature verification
    const zaloSig = req.headers['x-zalo-signature'];
    if (!verifyHmacSha256(req.rawBody, channel.webhookSecret, zaloSig)) {
      logger.warn('[Zalo Webhook] ❌ Invalid HMAC signature', { oaId, ip: req.ip });
      return res.sendStatus(200); // don't leak 403
    }

    const senderId = sender.id;
    const senderName = sender.display_name || 'Zalo User';
    const content = message?.text || message?.links?.[0]?.description || '[media]';

    await persistMessage(prisma, channel.id, senderId, senderName, {
      externalId: message?.msg_id,
      content,
      mediaUrl: message?.links?.[0]?.href || null,
      mediaType: event_name === 'user_send_image' ? 'image' : event_name === 'user_send_file' ? 'file' : null,
      timestamp: timestamp * 1000, // Zalo sends seconds
    });

    res.sendStatus(200);
  } catch (err) {
    logger.error('[Zalo Webhook] Unhandled error', { message: err.message, stack: err.stack });
    res.sendStatus(500);
  }
}

// ── TikTok Webhook ────────────────────────────────────────────

/**
 * POST /api/webhook/tiktok
 * TikTok Business API events. Signature via X-TikTok-Signature header.
 */
async function handleTikTokWebhook(req, res) {
  try {
    const prisma = getPrismaClient();
    const { type, business_id, message } = req.body;

    if (type !== 'im') return res.sendStatus(200);

    const channel = await prisma.channel.findFirst({
      where: { platform: 'TIKTOK', accountId: business_id, isActive: true },
    });
    if (!channel) return res.sendStatus(200);

    // ✅ TikTok signature verification
    const tikTokSig = req.headers['x-tiktok-signature'];
    if (!verifyHmacSha256(req.rawBody, channel.webhookSecret, tikTokSig)) {
      logger.warn('[TikTok Webhook] ❌ Invalid HMAC signature', { business_id, ip: req.ip });
      return res.sendStatus(200);
    }

    const senderId = message?.sender_open_id;
    const content = message?.content || '[media]';

    await persistMessage(prisma, channel.id, senderId, 'TikTok User', {
      externalId: message?.message_id,
      content,
      mediaUrl: message?.media_url || null,
      mediaType: message?.type !== 'text' ? message?.type : null,
      timestamp: message?.create_time * 1000,
    });

    res.sendStatus(200);
  } catch (err) {
    logger.error('[TikTok Webhook] Unhandled error', { message: err.message, stack: err.stack });
    res.sendStatus(500);
  }
}

// ── Web Live Chat Webhook ─────────────────────────────────────

/**
 * POST /api/webhook/web
 * Messages from embedded web chat widget.
 */
async function handleWebChatWebhook(req, res) {
  try {
    const prisma = getPrismaClient();
    const widgetKey = req.headers['x-widget-key'];

    if (!widgetKey) {
      logger.warn('[WebChat Webhook] Missing x-widget-key header', { ip: req.ip });
      return res.status(401).json({ error: 'Missing widget key' });
    }

    const channel = await prisma.channel.findFirst({
      where: { platform: 'WEB', widgetKey, isActive: true },
    });
    if (!channel) {
      logger.warn('[WebChat Webhook] Unknown widget key', { ip: req.ip });
      return res.status(403).json({ error: 'Unknown widget key' });
    }

    const { sessionId, visitorName, content, mediaUrl, mediaType } = req.body;
    if (!sessionId || !content) {
      return res.status(400).json({ error: 'sessionId and content are required' });
    }

    const { message, conversation } = await persistMessage(
      prisma,
      channel.id,
      sessionId,
      visitorName || 'Website Visitor',
      { content, mediaUrl, mediaType, timestamp: Date.now() }
    );

    res.status(201).json({ ok: true, messageId: message.id, conversationId: conversation.id });
  } catch (err) {
    logger.error('[WebChat Webhook] Unhandled error', { message: err.message, stack: err.stack });
    res.sendStatus(500);
  }
}

module.exports = {
  handleFacebookVerify,
  handleFacebookWebhook,
  handleZaloWebhook,
  handleTikTokWebhook,
  handleWebChatWebhook,
};
