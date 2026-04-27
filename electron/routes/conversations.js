/**
 * Conversations API
 *
 * GET    /api/conversations              — list (filtered by user role + channel access)
 * GET    /api/conversations/:id          — get one + messages
 * PATCH  /api/conversations/:id          — update status / assign
 * GET    /api/conversations/:id/messages — paginated message history
 * POST   /api/conversations/:id/messages — send outbound message
 */
'use strict';

const express = require('express');
const { getPrismaClient } = require('../services/db');
const { requireAuth, assertChannelAccess } = require('../middleware/auth');
const { emitNewMessage, emitConversationUpdated } = require('../socket');

const router = express.Router();

// GET /api/conversations
router.get('/', requireAuth, async (req, res) => {
  const prisma = getPrismaClient();
  const { status, channelId, assignedTo, page = 1, limit = 50 } = req.query;

  const where = { isArchived: false };

  // SUPPORTER: restrict to their accessible channels
  if (req.user.role !== 'ADMIN') {
    const accessible = await prisma.userChannel.findMany({
      where: { userId: req.user.id },
      select: { channelId: true },
    });
    where.channelId = { in: accessible.map((a) => a.channelId) };
  }

  if (status) where.status = status.toUpperCase();
  if (channelId) where.channelId = channelId;
  if (assignedTo === 'me') where.assignedToUserId = req.user.id;

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: { channel: { select: { id: true, platform: true, name: true } } },
      orderBy: { lastMessageAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.conversation.count({ where }),
  ]);

  res.json({ conversations, total, page: Number(page), limit: Number(limit) });
});

// GET /api/conversations/:id
router.get('/:id', requireAuth, async (req, res) => {
  const prisma = getPrismaClient();
  const conv = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: {
      channel: true,
      customer: true,
      assignedTo: { select: { id: true, displayName: true, role: true } },
    },
  });
  if (!conv) return res.status(404).json({ error: 'Not found' });
  await assertChannelAccess(prisma, req.user.id, req.user.role, conv.channelId);
  res.json(conv);
});

// PATCH /api/conversations/:id
router.patch('/:id', requireAuth, async (req, res) => {
  const prisma = getPrismaClient();
  const { status, assignedToUserId } = req.body;

  const conv = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conv) return res.status(404).json({ error: 'Not found' });
  await assertChannelAccess(prisma, req.user.id, req.user.role, conv.channelId);

  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data: {
      ...(status && { status: status.toUpperCase() }),
      ...(assignedToUserId !== undefined && { assignedToUserId }),
    },
    include: { channel: { select: { id: true, platform: true, name: true } } },
  });

  emitConversationUpdated(updated);
  res.json(updated);
});

// GET /api/conversations/:id/messages?before=&limit=
router.get('/:id/messages', requireAuth, async (req, res) => {
  const prisma = getPrismaClient();
  const { before, limit = 50 } = req.query;

  const conv = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conv) return res.status(404).json({ error: 'Not found' });
  await assertChannelAccess(prisma, req.user.id, req.user.role, conv.channelId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId: req.params.id,
      ...(before && { timestamp: { lt: new Date(before) } }),
    },
    orderBy: { timestamp: 'asc' },
    take: Number(limit),
    include: { sentBy: { select: { id: true, displayName: true } } },
  });

  res.json(messages);
});

// POST /api/conversations/:id/messages — send outbound message
router.post('/:id/messages', requireAuth, async (req, res) => {
  const prisma = getPrismaClient();
  const { content, mediaUrl, mediaType } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const conv = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: { channel: true },
  });
  if (!conv) return res.status(404).json({ error: 'Not found' });
  await assertChannelAccess(prisma, req.user.id, req.user.role, conv.channelId);

  const message = await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderType: 'STAFF',
      sentByUserId: req.user.id,
      content,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      timestamp: new Date(),
      status: 'sent',
    },
    include: { sentBy: { select: { id: true, displayName: true } } },
  });

  // Update conversation lastMessage
  const updated = await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessage: content, lastMessageAt: message.timestamp },
    include: { channel: { select: { id: true, platform: true, name: true } } },
  });

  emitNewMessage(message, updated);

  // TODO: call platform API to actually send the message
  // e.g. facebookService.sendMessage(conv.externalId, content, channel)

  res.status(201).json(message);
});

module.exports = router;
