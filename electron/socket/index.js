/**
 * Socket.io server — real-time bridge between Express backend and React renderer.
 *
 * Events emitted TO the renderer (client):
 *   "new_message"      { message, conversation }
 *   "conversation_updated" { conversation }
 *   "channel_status"   { channelId, isActive }
 *
 * Events received FROM the renderer (client):
 *   "join_conversations"   — subscribe to all conversations for a user
 *   "leave_conversation"   — stop watching a specific conversation thread
 */
'use strict';

const { Server } = require('socket.io');

let _io = null;

/**
 * Initialize Socket.io on an existing HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocketIO(httpServer) {
  _io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'file://*'],
      methods: ['GET', 'POST'],
    },
    // Use websocket transport first, then polling as fallback
    transports: ['websocket', 'polling'],
  });

  _io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId || 'anonymous';
    console.log(`[Socket.io] Client connected: ${socket.id} (user=${userId})`);

    // Put user into their personal room for targeted pushes
    socket.join(`user:${userId}`);

    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return _io;
}

/**
 * Get the Socket.io instance (throws if not initialized).
 */
function getIO() {
  if (!_io) throw new Error('Socket.io not initialized — call initSocketIO first.');
  return _io;
}

// ── Emit helpers ─────────────────────────────────────────────

/**
 * Broadcast a new inbound message to all connected clients watching
 * that conversation, and to the assigned staff member's personal room.
 */
function emitNewMessage(message, conversation) {
  if (!_io) return;
  const payload = { message, conversation };
  _io.to(`conv:${conversation.id}`).emit('new_message', payload);
  if (conversation.assignedToUserId) {
    _io.to(`user:${conversation.assignedToUserId}`).emit('new_message', payload);
  }
  // Broadcast to all admins via a shared admin room
  _io.to('role:ADMIN').emit('new_message', payload);
}

/**
 * Notify clients that a conversation's metadata changed (status, assignee…).
 */
function emitConversationUpdated(conversation) {
  if (!_io) return;
  _io.to(`conv:${conversation.id}`).emit('conversation_updated', { conversation });
  _io.to('role:ADMIN').emit('conversation_updated', { conversation });
}

/**
 * Notify clients about a channel going online/offline.
 */
function emitChannelStatus(channelId, isActive) {
  if (!_io) return;
  _io.emit('channel_status', { channelId, isActive });
}

module.exports = { initSocketIO, getIO, emitNewMessage, emitConversationUpdated, emitChannelStatus };
