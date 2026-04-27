/**
 * Prisma client singleton — Prisma 7 with better-sqlite3 driver adapter.
 * Shared across the entire Main process via CommonJS require cache.
 */
'use strict';

const path = require('path');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const DB_PATH = process.env.DATABASE_PATH ||
  path.resolve(__dirname, '../../prisma/social-manager.db');

let _client = null;

function getPrismaClient() {
  if (!_client) {
    const adapter = new PrismaBetterSqlite3({ url: `file:${DB_PATH}` });
    _client = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return _client;
}

async function disconnectPrisma() {
  if (_client) {
    await _client.$disconnect();
    _client = null;
  }
}

module.exports = { getPrismaClient, disconnectPrisma };
