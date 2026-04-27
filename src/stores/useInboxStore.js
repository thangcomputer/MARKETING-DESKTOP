import { create } from 'zustand';
import { mockConversations, mockMessages, quickReplyTemplates, mockAccounts } from '@/lib/mock-data';
import { useSettingsStore } from './useSettingsStore';

/**
 * Inbox store — conversations, messages, CRM, quick replies, and account filtering
 */
export const useInboxStore = create((set, get) => ({
  // State
  conversations: [],
  accounts: [],
  activeConversationId: null,
  messages: [],
  searchQuery: '',
  platformFilter: 'all',
  unreadOnly: false,
  // Set of account IDs that are currently SHOWN (empty = show all)
  activeAccountIds: new Set(),

  // CRM state for active contact
  editingNotes: false,
  editingTags: false,

  // Quick Reply
  quickReplies: quickReplyTemplates,
  showQuickReply: false,
  quickReplyFilter: '',
  quickReplyIndex: 0,

  // Actions
  setActiveConversation: (id) => {
    const messages = mockMessages[id] || [];
    set({
      activeConversationId: id,
      messages,
      showQuickReply: false,
      quickReplyFilter: '',
    });
    // Mark as read
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, unreadCount: 0 } : c
      ),
    }));
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setPlatformFilter: (filter) => set({ platformFilter: filter, activeAccountIds: new Set() }),
  toggleUnreadFilter: () => set((state) => ({ unreadOnly: !state.unreadOnly })),

  // Toggle a single account in/out of the active filter set.
  // If the resulting set equals all accounts for that platform, collapse back to "all".
  toggleAccountFilter: (accountId) => {
    const { activeAccountIds, accounts } = get();
    const next = new Set(activeAccountIds);
    if (next.has(accountId)) {
      next.delete(accountId);
    } else {
      next.add(accountId);
    }
    set({ activeAccountIds: next });
  },

  clearAccountFilter: () => set({ activeAccountIds: new Set() }),

  // Derived: returns accounts relevant to the current platform filter
  getAccountsForFilter: () => {
    const { accounts, platformFilter } = get();
    if (platformFilter === 'all') return accounts;
    return accounts.filter((a) => a.platform === platformFilter);
  },

  // Quick Reply actions
  setShowQuickReply: (show) => set({ showQuickReply: show, quickReplyIndex: 0 }),
  setQuickReplyFilter: (filter) => set({ quickReplyFilter: filter, quickReplyIndex: 0 }),
  setQuickReplyIndex: (index) => set({ quickReplyIndex: index }),

  getFilteredQuickReplies: () => {
    const { quickReplyFilter } = get();
    const liveReplies = useSettingsStore.getState()?.quickReplies || [];
    if (!quickReplyFilter) return liveReplies;
    const q = quickReplyFilter.toLowerCase();
    return liveReplies.filter(
      (qr) =>
        qr.command.toLowerCase().includes(q) ||
        qr.label.toLowerCase().includes(q)
    );
  },

  // CRM actions
  updateContactNotes: (conversationId, notes) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, notes } : c
      ),
    }));
  },

  addTag: (conversationId, tag) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId && !c.tags.includes(tag)
          ? { ...c, tags: [...c.tags, tag] }
          : c
      ),
    }));
  },

  removeTag: (conversationId, tag) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, tags: c.tags.filter((t) => t !== tag) }
          : c
      ),
    }));
  },

  // Send message
  sendMessage: async (content = '', attachments = [], targetConversationId = null) => {
    const { activeConversationId, messages, conversations } = get();
    const convIdToUse = targetConversationId || activeConversationId;
    if (!convIdToUse || (!content.trim() && attachments.length === 0)) return;

    const conversation = conversations.find((c) => c.id === convIdToUse);
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId: convIdToUse,
      platform: conversation?.platform || 'zalo',
      direction: 'outbound',
      content: content.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      sentAt: new Date().toISOString(),
      status: 'sent',
    };

    if (conversation?.platform === 'facebook' && conversation?.accessToken) {
      try {
        await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${conversation.accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: conversation.externalId },
            message: { text: content.trim() }
          })
        });
      } catch (err) {
        console.error('FB Send failed', err);
        newMessage.status = 'failed';
        newMessage.content += ' ⚠️ Lỗi khi gửi!';
      }
    }

    // Store globally so it persists when switching conversations
    if (!mockMessages[convIdToUse]) {
      mockMessages[convIdToUse] = [];
    }
    mockMessages[convIdToUse].push(newMessage);

    set({
      messages: activeConversationId && mockMessages[activeConversationId] ? [...mockMessages[activeConversationId]] : [...messages, newMessage],
      conversations: conversations.map((c) =>
        c.id === convIdToUse
          ? { ...c, lastMessage: content.trim() || 'Đã gửi file', lastMessageAt: new Date().toISOString() }
          : c
      ),
      showQuickReply: false,
      quickReplyFilter: '',
    });
  },

  // Socket: Add an incoming message from the real-time server
  addIncomingMessage: (message, conversation) => {
    set((state) => {
      // 1. Update messages array if this is the active conversation
      const newMessages =
        state.activeConversationId === conversation.id
          ? [...state.messages, message]
          : state.messages;

      // 2. Update or add the conversation in the conversation list
      let conversationExists = false;
      const updatedConversations = state.conversations.map((c) => {
        if (c.id === conversation.id) {
          conversationExists = true;
          return {
            ...c,
            lastMessage: message.content,
            lastMessageAt: message.timestamp,
            unreadCount:
              state.activeConversationId === conversation.id ? 0 : c.unreadCount + 1,
          };
        }
        return c;
      });

      // If it's a completely new conversation thread, prepend it
      if (!conversationExists) {
        updatedConversations.unshift({
          ...conversation,
          lastMessage: message.content,
          lastMessageAt: message.timestamp,
          unreadCount: 1,
        });
      }

      return {
        messages: newMessages,
        conversations: updatedConversations,
      };
    });
  },

  recallMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.map(m => 
        m.id === messageId && m.direction === 'outbound'
          ? { ...m, content: 'Tin nhắn đã thu hồi', isRecalled: true, attachments: [] }
          : m
      )
    }));
  },

  blockUser: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map(c => 
        c.id === conversationId ? { ...c, isBlocked: !c.isBlocked } : c
      ),
      // Optionally deselect if they block the active one (though keeping it selected to unblock is fine)
    }));
  },

  archiveConversation: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.filter(c => c.id !== conversationId),
      activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId
    }));
  },

  deleteConversation: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.filter(c => c.id !== conversationId),
      activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId
    }));
  },

  getTotalUnread: () => {
    const { conversations, activeAccountIds } = get();
    const filtered = activeAccountIds.size > 0
      ? conversations.filter((c) => activeAccountIds.has(c.channelId || c.credentialId))
      : conversations;
    return filtered.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  },

  // Real-time Facebook Fetch via Thick Client directly to Graph API
  fetchFacebookInbox: async () => {
    const settings = useSettingsStore.getState();
    const fbCreds = settings.credentials.filter(c => c.platform === 'facebook' && c.isActive && c.accessToken);
    if (!fbCreds.length) return;

    let allConversations = [];
    let allMessagesMap = {};

    for (const cred of fbCreds) {
      try {
        const pageId = cred.accountId;
        const res = await fetch(`https://graph.facebook.com/v19.0/me/conversations?fields=id,participants,updated_time,snippet,messages.limit(20){id,message,created_time,from,attachments}&access_token=${cred.accessToken}`);
        const data = await res.json();
        
        if (data.data) {
          data.data.forEach(fbConv => {
            const customer = fbConv.participants?.data?.find(p => p.id !== pageId) || {};
            const customerName = customer.name || 'Người dùng Facebook';
            const psid = customer.id;

            const convObj = {
              id: fbConv.id,
              credentialId: cred.id,
              platform: 'facebook',
              externalId: psid, // PSID for replying
              type: 'message',
              participantName: customerName,
              participantAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=1e293b&color=fff`,
              participantLink: `https://facebook.com/${psid}`,
              tags: [],
              notes: '',
              lastMessage: fbConv.snippet || '',
              lastMessageAt: new Date(fbConv.updated_time).toISOString(),
              unreadCount: 0,
              isArchived: false,
              isOnline: false,
              pageId: pageId,
              accessToken: cred.accessToken
            };
            allConversations.push(convObj);
            
            const msgs = fbConv.messages?.data?.map(m => {
              let msgContent = m.message || '';
              if (m.attachments && m.attachments.data && m.attachments.data.length > 0) {
                 msgContent += ' [Hình ảnh/Đính kèm]';
              }
              return {
                id: m.id,
                conversationId: fbConv.id,
                platform: 'facebook',
                direction: m.from?.id === pageId ? 'outbound' : 'inbound',
                content: msgContent.trim() || '(Tin nhắn Media)',
                sentAt: new Date(m.created_time).toISOString(),
                status: 'delivered'
              }
            }) || [];
            
            allMessagesMap[fbConv.id] = msgs.reverse(); 
            mockMessages[fbConv.id] = [...allMessagesMap[fbConv.id]]; // Feed into global cache so chat window can read
          });
        }
      } catch (err) {
         console.error('[Inbox] FB Sync Error', err);
      }
    }
    
    // Merge conversations
    const oldConvs = get().conversations.filter(c => c.platform !== 'facebook');
    const mergedConvs = [...oldConvs, ...allConversations].sort((a,b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()).reverse();
    set({ conversations: mergedConvs });
    
    // Refresh active conversation view
    const active = get().activeConversationId;
    if (active && allMessagesMap[active]) {
       set({ messages: mockMessages[active] });
    }
  },
}));
