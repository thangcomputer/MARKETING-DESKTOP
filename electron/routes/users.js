/**
 * Users API (ADMIN only)
 *
 * GET    /api/users              — list all staff
 * POST   /api/users              — create staff member
 * PATCH  /api/users/:id          — update role / channel access
 * DELETE /api/users/:id          — deactivate
 * POST   /api/users/:id/channels — assign channels to a Supporter
 */
'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { getPrismaClient } = require('../services/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const BCRYPT_ROUNDS = 12;

router.use(requireAuth, requireRole('ADMIN'));

// GET /api/users
router.get('/', async (req, res) => {
  const prisma = getPrismaClient();
  const users = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, role: true, isActive: true, createdAt: true,
      channelAccess: { select: { channelId: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

// POST /api/users
router.post('/', async (req, res) => {
  const prisma = getPrismaClient();
  const { username, password, displayName, role = 'SUPPORTER', channelIds = [] } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      username, passwordHash, displayName: displayName || username,
      role: role.toUpperCase(),
      channelAccess: channelIds.length
        ? { create: channelIds.map((channelId) => ({ channelId })) }
        : undefined,
    },
    select: { id: true, username: true, displayName: true, role: true },
  });
  res.status(201).json(user);
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
  const prisma = getPrismaClient();
  const { displayName, role, isActive } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { ...(displayName && { displayName }), ...(role && { role: role.toUpperCase() }), ...(isActive !== undefined && { isActive }) },
    select: { id: true, username: true, displayName: true, role: true, isActive: true },
  });
  res.json(user);
});

// DELETE /api/users/:id — soft delete (deactivate)
router.delete('/:id', async (req, res) => {
  const prisma = getPrismaClient();
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.sendStatus(204);
});

// POST /api/users/:id/channels — set channel access for a Supporter
router.post('/:id/channels', async (req, res) => {
  const prisma = getPrismaClient();
  const { channelIds } = req.body;
  if (!Array.isArray(channelIds)) return res.status(400).json({ error: 'channelIds must be an array' });

  await prisma.$transaction([
    prisma.userChannel.deleteMany({ where: { userId: req.params.id } }),
    ...channelIds.map((channelId) =>
      prisma.userChannel.create({ data: { userId: req.params.id, channelId } })
    ),
  ]);
  res.json({ ok: true, channelIds });
});

module.exports = router;
