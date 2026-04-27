/**
 * Auth middleware — JWT verification + RBAC helper.
 * Tokens are issued by POST /api/auth/login.
 */
'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'omni-local-dev-secret-change-me';
const JWT_EXPIRES = '8h';

// ── Token helpers ────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Express middleware ────────────────────────────────────────

/**
 * requireAuth — attaches req.user or responds 401.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * requireRole — factory for role-gated routes.
 * Usage: router.delete('/channel/:id', requireAuth, requireRole('ADMIN'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Verify that a SUPPORTER only accesses channels they are assigned to.
 * Pass the channelId from req.params / req.body as `channelId`.
 */
async function assertChannelAccess(prisma, userId, role, channelId) {
  if (role === 'ADMIN') return true; // Admins always pass
  const access = await prisma.userChannel.findUnique({
    where: { userId_channelId: { userId, channelId } },
  });
  if (!access) throw Object.assign(new Error('Access denied to this channel'), { status: 403 });
  return true;
}

module.exports = { signToken, requireAuth, requireRole, assertChannelAccess };
