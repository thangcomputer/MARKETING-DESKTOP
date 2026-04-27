import React, { useEffect } from 'react';
import ConversationList from '@/components/inbox/ConversationList';
import ChatWindow from '@/components/inbox/ChatWindow';
import CRMPanel from '@/components/inbox/CRMPanel';
import { useSocket } from '@/hooks/useSocket';
import { useInboxStore } from '@/stores/useInboxStore';

/**
 * Unified Inbox Page — 3-pane layout:
 * Pane 1: Conversation List (left)
 * Pane 2: Chat Window (center)
 * Pane 3: CRM Panel (right)
 */
export default function InboxPage() {
  // Since we don't have a fully global user context yet, we'll assume a dummy userId
  // This should normally come from an AuthContext (e.g. useAuth().user.id)
  const currentUserId = 'active-staff-id';
  
  const { socket, isConnected } = useSocket(currentUserId);
  const addIncomingMessage = useInboxStore((state) => state.addIncomingMessage);
  const fetchFacebookInbox = useInboxStore((state) => state.fetchFacebookInbox);

  // Sync Facebook API directly (Thick Client Mode)
  useEffect(() => {
    fetchFacebookInbox();
    // Auto-refresh every 10 seconds to simulate real-time without wait for backend webhook
    const interval = setInterval(fetchFacebookInbox, 10000);
    return () => clearInterval(interval);
  }, [fetchFacebookInbox]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (payload) => {
      const { message, conversation } = payload;
      console.log('[Inbox] Real-time message received:', message);
      addIncomingMessage(message, conversation);
    });

    return () => {
      socket.off('new_message');
    };
  }, [socket, addIncomingMessage]);

  return (
    <div className="flex h-full relative">
      {/* Optional: Small status indicator for socket connection */}
      <div className={`absolute bottom-2 left-2 w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} shadow-md`} title={isConnected ? 'Connected to Live Server' : 'Disconnected'} />
      <ConversationList />
      <ChatWindow />
      <CRMPanel />
    </div>
  );
}
