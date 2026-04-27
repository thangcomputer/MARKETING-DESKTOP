/**
 * logger.js — Winston-based structured logging
 *
 * Usage:
 *   const logger = require('./logger');
 *   logger.info('Server started');
 *   logger.error('Webhook failed', { err: error.message, channel: 'FB' });
 *
 * Outputs:
 *  - Console (colorized) in development
 *  - logs/combined.log   — all levels (INFO+)
 *  - logs/error.log      — ERROR level only (critical failures)
 */
'use strict';

const path = require('path');
const { app } = require('electron');
const winston = require('winston');

// Resolve log directory — use Electron's userData in production, ./logs in dev
const LOG_DIR = process.env.NODE_ENV === 'production'
  ? path.join(app?.getPath?.('userData') ?? '.', 'logs')
  : path.join(process.cwd(), 'logs');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Human-readable format for console + dev file
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} [${level}] ${stack || message}${metaStr}`;
  })
);

// JSON format for production file logs (easy to grep / ship to Datadog etc.)
const prodFileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const transports = [];

// ── Console transport (always) ──────────────────────────────────
transports.push(
  new winston.transports.Console({
    format: devFormat,
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  })
);

// ── File transports ─────────────────────────────────────────────
try {
  const fs = require('fs');
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  // All logs: INFO and above
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: prodFileFormat,
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,               // keep last 5 rotated files
      tailable: true,
    })
  );

  // Errors only: for quick triage
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      format: prodFileFormat,
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
    })
  );
} catch (_) {
  // If file system is unavailable (sandboxed), console-only is fine
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
  // Never crash on uncaught logger errors
  exitOnError: false,
});

module.exports = logger;
