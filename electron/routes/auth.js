/**
 * Auth routes — login, me
 * POST /api/auth/login
 * GET  /api/auth/me
 */
'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { getPrismaClient } = require('../services/db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.json({
      token,
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, username: true, displayName: true, role: true, avatarUrl: true },
  });
  res.json(user);
});

module.exports = router;
