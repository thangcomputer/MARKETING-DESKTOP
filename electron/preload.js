const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure IPC bridge — exposes a limited API surface to the Renderer process.
 * The Renderer has NO direct access to Node.js APIs.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ── Window Controls ──
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // ── Settings / Credentials ──
  getCredentials: () => ipcRenderer.invoke('settings:getCredentials'),
  saveCredential: (data) => ipcRenderer.invoke('settings:saveCredential', data),
  deleteCredential: (id) => ipcRenderer.invoke('settings:deleteCredential', id),
  testConnection: (id) => ipcRenderer.invoke('settings:testConnection', id),

  // ── Inbox ──
  getConversations: (filters) => ipcRenderer.invoke('inbox:getConversations', filters),
  getMessages: (conversationId) => ipcRenderer.invoke('inbox:getMessages', conversationId),
  sendMessage: (data) => ipcRenderer.invoke('inbox:sendMessage', data),
  markAsRead: (conversationId) => ipcRenderer.invoke('inbox:markAsRead', conversationId),

  // ── Scheduler ──
  getScheduledPosts: (filters) => ipcRenderer.invoke('scheduler:getPosts', filters),
  createScheduledPost: (data) => ipcRenderer.invoke('scheduler:createPost', data),
  updateScheduledPost: (id, data) => ipcRenderer.invoke('scheduler:updatePost', id, data),
  deleteScheduledPost: (id) => ipcRenderer.invoke('scheduler:deletePost', id),

  // ── File Dialog ──
  selectFiles: (options) => ipcRenderer.invoke('dialog:selectFiles', options),

  // ── Real-time Events (Main → Renderer) ──
  onNewMessage: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('inbox:newMessage', handler);
    return () => ipcRenderer.removeListener('inbox:newMessage', handler);
  },

  onPostPublished: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('scheduler:postPublished', handler);
    return () => ipcRenderer.removeListener('scheduler:postPublished', handler);
  },

  // ── OAuth: Đăng nhập nền tảng qua trình duyệt hệ thống ──────
  // Gọi: await window.electronAPI.startOAuthFlow('facebook', { appId, appSecret })
  // Trả về: { success, data: { accessToken, refreshToken, pages?, channelId?, openId? } }
  startOAuthFlow: (platform, appKeys) =>
    ipcRenderer.invoke('oauth:startFlow', { platform, appKeys }),
});
