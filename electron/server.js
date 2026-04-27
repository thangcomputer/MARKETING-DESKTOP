/**
 * Express + Socket.io Server  — HARDENED PRODUCTION BUILD
 * Runs inside the Electron Main process on port 3777 (localhost-only).
 *
 * Architecture:
 *   HTTP Server (Express)
 *     ├── /api/auth          — login, session
 *     ├── /api/channels      — 12-channel CRUD
 *     ├── /api/conversations — inbox + messages
 *     ├── /api/users         — staff management (ADMIN)
 *     ├── /api/webhook/*     — inbound platform webhooks
 *     └── /health            — liveness probe
 *
 *   Socket.io (attached to same HTTP server)
 *     └── real-time message push to React renderer
 *
 * Security layers applied:
 *  ✅ helmet()             — hides X-Powered-By, sets safe headers
 *  ✅ express-rate-limit   — anti-DDoS / brute-force
 *  ✅ CORS locked to localhost
 *  ✅ All console.* replaced by Winston logger
 */
'use strict';

const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const logger = require('./services/logger');
const { initSocketIO } = require('./socket');
const authRouter = require('./routes/auth');
const channelsRouter = require('./routes/channels');
const conversationsRouter = require('./routes/conversations');
const usersRouter = require('./routes/users');
const webhookRouter = require('./routes/webhook');

const PORT = process.env.API_PORT || 3777;

let _server = null;
let _app = null;

// ── Build Express app ─────────────────────────────────────────

function buildApp() {
  const app = express();

  // ── Security middleware ──────────────────────────────────────
  // helmet hides "X-Powered-By: Express" and adds 11 protective headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // allow Electron renderer
  }));

  // CORS — only allow requests from our Vite dev server or the file:// origin (built Electron)
  app.use(cors({
    origin: (origin, callback) => {
      const allowed = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
      ];
      // Allow Electron file:// origin (no origin header) and localhost
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('[CORS] Blocked request from untrusted origin', { origin });
        callback(new Error('CORS: Origin not allowed'));
      }
    },
    credentials: true,
  }));

  // ── Rate limiting ────────────────────────────────────────────
  // Auth: very strict — defend against credential stuffing
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                   // 20 login attempts per 15 min
    message: { error: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      logger.warn('[RateLimit] Auth limit exceeded', { ip: req.ip });
      res.status(options.statusCode).json(options.message);
    },
  });

  // API: moderate — protect business endpoints
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 200,                  // 200 calls/min per IP
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      logger.warn('[RateLimit] API limit exceeded', { ip: req.ip, path: req.path });
      res.status(options.statusCode).json({ error: 'Too many requests, slow down.' });
    },
  });

  // Webhook: more permissive — platforms send bursts, but still bounded
  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 500,                  // 500 webhook calls/min (12 channels × burst)
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate-limit check for verified platform IPs (optional — add known FB/Zalo CIDRs)
      return false;
    },
    handler: (req, res, next, options) => {
      logger.warn('[RateLimit] Webhook limit exceeded', { ip: req.ip, path: req.path });
      res.status(options.statusCode).json({ error: 'Webhook rate limit exceeded.' });
    },
  });

  // ── Body parsing + route mounting ────────────────────────────
  // NOTE: webhook routes handle their own rawBody capture (required for HMAC)
  app.use('/api/auth',          express.json(), authLimiter,    authRouter);
  app.use('/api/channels',      express.json(), apiLimiter,     channelsRouter);
  app.use('/api/conversations', express.json(), apiLimiter,     conversationsRouter);
  app.use('/api/users',         express.json(), apiLimiter,     usersRouter);
  app.use('/api/webhook',       webhookLimiter,                 webhookRouter);

  // ── Health check ─────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  // ── 404 handler ───────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ── Global error handler ─────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    logger.error('[Server] Unhandled error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

// ── Start server ──────────────────────────────────────────────

function startServer() {
  return new Promise((resolve, reject) => {
    if (_server) return resolve({ port: PORT });

    _app = buildApp();
    _server = http.createServer(_app);

    // Attach Socket.io to the same HTTP server
    initSocketIO(_server);

    _server.listen(PORT, '127.0.0.1', () => {
      logger.info(`[Server] API + Socket.io running on http://127.0.0.1:${PORT}`);
      resolve({ port: PORT });
    });

    _server.on('error', (err) => {
      logger.error('[Server] Failed to start', { message: err.message, code: err.code });
      reject(err);
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!_server) return resolve();
    _server.close(() => {
      _server = null;
      _app = null;
      logger.info('[Server] Stopped.');
      resolve();
    });
  });
}

module.exports = { startServer, stopServer };
