/**
 * Channels API — CRUD for the 12 communication nodes
 *
 * GET    /api/channels           — list (filtered by user role)
 * POST   /api/channels           — create (ADMIN only)
 * PATCH  /api/channels/:id       — update (ADMIN only)
 * DELETE /api/channels/:id       — delete (ADMIN only)
 * POST   /api/channels/:id/test  — test connectivity
 */
'use strict';

const express = require('express');
const { getPrismaClient } = require('../services/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { encrypt } = require('../services/crypto.service');

const router = express.Router();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'omni-dev-key-change-in-prod';

// GET /api/channels
router.get('/', requireAuth, async (req, res) => {
  const prisma = getPrismaClient();
  try {
    let channels;
    if (req.user.role === 'ADMIN') {
      channels = await prisma.channel.findMany({ orderBy: [{ platform: 'asc' }, { sortOrder: 'asc' }] });
    } else {
      // Supporters only see channels they're assigned to
      channels = await prisma.channel.findMany({
        where: { userAccess: { some: { userId: req.user.id } }, isActive: true },
        orderBy: [{ platform: 'asc' }, { sortOrder: 'asc' }],
      });
    }
    // Strip tokens from response
    res.json(channels.map(sanitizeChannel));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const prisma = getPrismaClient();
  try {
    const { platform, accountId, name, accessToken, refreshToken, appId, appSecret, webhookSecret, widgetKey, sortOrder } = req.body;
    if (!platform || !accountId || !name) {
      return res.status(400).json({ error: 'platform, accountId, and name are required' });
    }

    const channel = await prisma.channel.create({
      data: {
        platform: platform.toUpperCase(),
        accountId,
        name,
        accessToken: accessToken ? encrypt(accessToken, ENCRYPTION_KEY) : null,
        refreshToken: refreshToken ? encrypt(refreshToken, ENCRYPTION_KEY) : null,
        appId: appId || null,
        appSecret: appSecret ? encrypt(appSecret, ENCRYPTION_KEY) : null,
        webhookSecret: webhookSecret || null,
        widgetKey: widgetKey || null,
        sortOrder: sortOrder ?? 0,
      },
    });
    res.status(201).json(sanitizeChannel(channel));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Channel already exists for this platform + accountId' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/channels/:id
router.patch('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const prisma = getPrismaClient();
  try {
    const { accessToken, refreshToken, appSecret, ...rest } = req.body;
    const data = { ...rest };
    if (accessToken) data.accessToken = encrypt(accessToken, ENCRYPTION_KEY);
    if (refreshToken) data.refreshToken = encrypt(refreshToken, ENCRYPTION_KEY);
    if (appSecret) data.appSecret = encrypt(appSecret, ENCRYPTION_KEY);

    const channel = await prisma.channel.update({ where: { id: req.params.id }, data });
    res.json(sanitizeChannel(channel));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/:id
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const prisma = getPrismaClient();
  await prisma.channel.delete({ where: { id: req.params.id } });
  res.sendStatus(204);
});

// POST /api/channels/:id/test — ping the platform API
router.post('/:id/test', requireAuth, async (req, res) => {
  // TODO: call actual platform Graph API / Zalo endpoint
  // For now return a simulated result
  await new Promise((r) => setTimeout(r, 800));
  res.json({ ok: true, message: 'Kết nối thành công (mock)' });
});

// ── Helpers ───────────────────────────────────────────────────
function sanitizeChannel(ch) {
  // Never expose tokens to the API
  const { accessToken, refreshToken, appSecret, webhookSecret, ...safe } = ch;
  safe.hasAccessToken = Boolean(accessToken);
  safe.hasRefreshToken = Boolean(refreshToken);
  return safe;
}

module.exports = router;
