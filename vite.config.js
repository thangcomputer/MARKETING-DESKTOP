import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: [
                // Prisma / SQLite
                '@prisma/client',
                'better-sqlite3',
                // Node built-ins
                'http', 'https', 'url', 'crypto', 'path', 'fs',
                'net', 'os', 'stream', 'events', 'util', 'assert',
                'child_process', 'buffer', 'zlib', 'tls', 'dns',
                // Electron
                'electron',
                // Local services — sẽ được require() tại runtime
                './services/oauth.service',
                './services/logger',
                './services/db',
                './services/webhook.service',
                './services/crypto.service',
                './socket',
                './socket/index',
                './routes/auth',
                './routes/channels',
                './routes/conversations',
                './routes/users',
                './routes/webhook',
                // npm packages used by electron services
                'express', 'helmet', 'cors', 'express-rate-limit',
                'socket.io', 'jsonwebtoken', 'bcryptjs',
                'winston', 'dotenv', 'winston/lib/logger',
              ],
            },
          },
        },
      },
      {
        entry: 'electron/preload.js',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
      // ── Build electron service files vào dist-electron/services/ ──
      {
        entry: 'electron/services/oauth.service.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: { entry: 'electron/services/oauth.service.js', formats: ['cjs'] },
            rollupOptions: {
              external: [
                'electron', 'http', 'https', 'url', 'crypto', 'path', 'fs',
                'net', 'os', 'stream', 'events', 'util', 'winston',
                './logger', '../services/logger',
              ],
              output: { entryFileNames: 'services/oauth.service.js' },
            },
          },
        },
      },
      {
        entry: 'electron/services/logger.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: { entry: 'electron/services/logger.js', formats: ['cjs'] },
            rollupOptions: {
              external: [
                'electron', 'path', 'fs', 'winston',
                'winston/lib/logger', 'winston-transport',
              ],
              output: { entryFileNames: 'services/logger.js' },
            },
          },
        },
      },
    ]),
    electronRenderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
