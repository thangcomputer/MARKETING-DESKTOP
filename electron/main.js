const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const { startOAuthFlow } = require('./services/oauth.service');
// Note: Backend server logic (server.js, db.js, auth.js) has been offloaded to the VPS backend.
// The Electron app now acts strictly as a lightweight desktop client.

// ── Keep a global reference of the window object ──
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Custom titlebar
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f14',
      symbolColor: '#a0a0b8',
      height: 40,
    },
    backgroundColor: '#0f0f14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '../public/vite.svg'),
  });

  // ── Load the app ──
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // ── Security: Enforce Content Security Policy via headers ──────
  // Prevents any injected script from loading external resources
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' http://127.0.0.1:3777;"
          + " script-src 'self' 'unsafe-inline';"
          + " style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;"
          + " font-src 'self' https://fonts.gstatic.com;"
          + " img-src 'self' data: blob: https://img.vietqr.io;"
          + " connect-src 'self' http://127.0.0.1:3777 ws://127.0.0.1:3777;"
          + " object-src 'none';"
          + " frame-ancestors 'none';",
        ],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'Referrer-Policy': ['strict-origin-when-cross-origin'],
      },
    });
  });

  // ── Security: Block all navigation away from known safe origins ──
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const ALLOWED_ORIGINS = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3777',
    ];
    const isAllowed = ALLOWED_ORIGINS.some(o => url.startsWith(o)) || url.startsWith('file://');
    if (!isAllowed) {
      event.preventDefault();
      console.warn('[Security] Blocked navigation to:', url);
    }
  });

} // end createWindow

// ── Register IPC Handlers ──
function registerIPCHandlers() {

  // ── OAuth: Mở trình duyệt đăng nhập và lấy token tự động ─────
  ipcMain.handle('oauth:startFlow', async (event, { platform, appKeys }) => {
    try {
      const tokenData = await startOAuthFlow(platform, appKeys);
      return { success: true, data: tokenData };
    } catch (err) {
      console.error('[IPC:oauth] Flow failed:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

  // File dialog
  ipcMain.handle('dialog:selectFiles', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Media', extensions: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'webm', 'webp'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
        { name: 'Videos', extensions: ['mp4', 'mov', 'webm'] },
      ],
      ...options,
    });
    return result;
  });

  // ── Settings / Channels IPC ──────────────────────────────
  ipcMain.handle('settings:getChannels', async () => {
    return [];
  });

  ipcMain.handle('settings:saveChannel', async (event, data) => {
    return { success: true };
  });

  ipcMain.handle('settings:deleteChannel', async (event, id) => {
    return { success: true };
  });

  ipcMain.handle('settings:testConnection', async (event, id) => {
    return { success: true, message: 'Kết nối thành công (mock)' };
  });

  // ── Auth IPC ──────────────────────────────────────────────
  ipcMain.handle('auth:login', async (event, { username, password }) => {
    return { token: 'mock-token', user: { id: 'mock-id', username, displayName: 'Staff' } };
  });

  // ── Inbox IPC ─────────────────────────────────────────────
  ipcMain.handle('inbox:getConversations', async (event, filters) => {
    return { data: [], total: 0 };
  });

  ipcMain.handle('inbox:getCustomer', async (event, customerId) => {
    return null;
  });

  ipcMain.handle('inbox:getMessages', async (event, conversationId, skip = 0) => {
    return [];
  });

  ipcMain.handle('inbox:sendMessage', async (event, { conversationId, content, sentByUserId }) => {
    return { success: true };
  });

  ipcMain.handle('inbox:markAsRead', async (event, conversationId) => {
    return { success: true };
  });

  ipcMain.handle('inbox:updateConversation', async (event, { id, ...data }) => {
    return { success: true };
  });

  // Scheduler IPC
  ipcMain.handle('scheduler:getPosts', async (event, filters) => {
    return [];
  });

  ipcMain.handle('scheduler:createPost', async (event, data) => {
    console.log('[IPC] Create post:', data);
    return { success: true, id: 'mock-post-id' };
  });

  ipcMain.handle('scheduler:updatePost', async (event, id, data) => {
    console.log('[IPC] Update post:', id, data);
    return { success: true };
  });

  ipcMain.handle('scheduler:deletePost', async (event, id) => {
    console.log('[IPC] Delete post:', id);
    return { success: true };
  });
}

// ── App lifecycle ──
app.whenReady().then(async () => {
  // Application now relies solely on Axios + Socket.io connecting to VPS!

  registerIPCHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  // App cleanup logic without invoking server kill
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ── Security: Prevent new window creation ──
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});
