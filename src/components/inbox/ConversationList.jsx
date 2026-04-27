import React from 'react';
import { cn, formatRelativeTime, truncate, getInitials, PLATFORMS } from '@/lib/utils';
import { useInboxStore } from '@/stores/useInboxStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import PlatformBadge from './PlatformBadge';
import { Search, SlidersHorizontal, Check, ChevronDown, MessageCircle, MessageSquare } from 'lucide-react';

// Platform tab config
const PLATFORM_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'facebook', label: 'FB' },
  { key: 'zalo', label: 'Zalo' },
  { key: 'tiktok', label: 'TT' },
];

export default function ConversationList() {
  const {
    conversations,
    accounts,
    activeConversationId,
    searchQuery,
    platformFilter,
    activeAccountIds,
    setActiveConversation,
    setSearchQuery,
    setPlatformFilter,
    toggleAccountFilter,
    clearAccountFilter,
    getAccountsForFilter,
    unreadOnly,
    toggleUnreadFilter,
  } = useInboxStore();

  // Accounts visible for the current platform filter
  const visibleAccounts = getAccountsForFilter();
  const hasMultipleAccounts = visibleAccounts.length > 1;

  // Apply filters to conversations
  let filtered = conversations;

  if (platformFilter !== 'all') {
    filtered = filtered.filter((c) => c.platform === platformFilter);
  }

  if (activeAccountIds.size > 0) {
    filtered = filtered.filter((c) => activeAccountIds.has(c.credentialId));
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.participantName.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
        (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  if (unreadOnly) {
    filtered = filtered.filter((c) => c.unreadCount > 0);
  }

  filtered = [...filtered].sort(
    (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
  );

  return (
    <div className="flex flex-col h-full border-r border-border/40 w-[300px] shrink-0 bg-card/30">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight">Tin nhắn</h2>
          <button 
            onClick={toggleUnreadFilter}
            title={unreadOnly ? 'Hiển thị tất cả' : 'Chỉ hiển thị tin nhắn chưa đọc'}
            className={cn(
              "p-1.5 rounded-lg transition-colors flex items-center gap-1",
              unreadOnly 
                ? "bg-primary/10 text-primary hover:bg-primary/20" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {unreadOnly && <span className="text-[10px] font-bold">Chưa đọc</span>}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-secondary/60 border-0 focus-visible:ring-1 rounded-lg"
          />
        </div>

        {/* Platform filter pills */}
        <div className="flex gap-1">
          {PLATFORM_TABS.map((f) => (
            <button
              key={f.key}
              onClick={() => setPlatformFilter(f.key)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
                platformFilter === f.key
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Account Switcher ── */}
      {hasMultipleAccounts && (
        <AccountSwitcher
          accounts={visibleAccounts}
          activeAccountIds={activeAccountIds}
          onToggle={toggleAccountFilter}
          onClear={clearAccountFilter}
        />
      )}

      {/* ── Conversation List ── */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-px">
          {filtered.map((conv) => {
            const account = accounts.find((a) => a.id === conv.credentialId);
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left',
                  activeConversationId === conv.id
                    ? 'bg-primary/8 ring-1 ring-primary/20'
                    : 'hover:bg-secondary/50'
                )}
              >
                {/* Avatar with platform badge */}
                <div className="relative shrink-0">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="text-[11px] font-semibold">
                      {getInitials(conv.participantName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <PlatformBadge platform={conv.platform} size="xs" />
                  </div>
                  {conv.isOnline && (
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn(
                      'text-[13px] truncate flex items-center gap-1.5',
                      conv.unreadCount > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground/80'
                    )}>
                      {conv.type === 'comment' ? (
                        <MessageCircle className="w-3.5 h-3.5 text-primary shrink-0" title="Bình luận bài viết" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" title="Tin nhắn trực tiếp" />
                      )}
                      {conv.participantName}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {formatRelativeTime(conv.lastMessageAt)}
                    </span>
                  </div>

                  {/* Account label (shown when filter is 'all' so user knows which account) */}
                  {platformFilter === 'all' && account && (
                    <p className="text-[9px] text-muted-foreground/60 mb-0.5 truncate">
                      {account.accountName}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className={cn(
                      'text-[11px] truncate max-w-[170px]',
                      conv.unreadCount > 0 ? 'text-foreground/70 font-medium' : 'text-muted-foreground'
                    )}>
                      {truncate(conv.lastMessage, 40)}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1 shrink-0 ml-1">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs">Không tìm thấy hội thoại</p>
              {activeAccountIds.size > 0 && (
                <button
                  onClick={clearAccountFilter}
                  className="mt-2 text-[10px] text-primary hover:underline"
                >
                  Xóa bộ lọc tài khoản
                </button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Account Switcher Sub-component ──────────────────────────────────────────
function AccountSwitcher({ accounts, activeAccountIds, onToggle, onClear }) {
  const [expanded, setExpanded] = React.useState(false);

  const activeCount = activeAccountIds.size;
  const isFiltered = activeCount > 0;

  // Group accounts by platform for visual separation
  const byPlatform = accounts.reduce((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = [];
    acc[a.platform].push(a);
    return acc;
  }, {});

  return (
    <div className="border-t border-border/30 px-4 py-2">
      {/* Collapse toggle */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Tài khoản
          </span>
          {isFiltered && (
            <span className="px-1.5 py-px text-[9px] font-bold rounded-full bg-primary/15 text-primary">
              {activeCount} được chọn
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isFiltered && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-[10px] text-primary hover:underline"
            >
              Xóa lọc
            </button>
          )}
          <ChevronDown className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Account chips */}
      {expanded && (
        <div className="mt-2 space-y-2.5">
          {Object.entries(byPlatform).map(([platform, platformAccounts]) => (
            <div key={platform}>
              {/* Platform group label when showing 'all' */}
              {Object.keys(byPlatform).length > 1 && (
                <p className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1 ml-1">
                  {PLATFORMS[platform]?.name}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {platformAccounts.map((acc) => {
                  const selected = activeAccountIds.has(acc.id);
                  return (
                    <button
                      key={acc.id}
                      onClick={() => onToggle(acc.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all',
                        selected
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60',
                        !acc.isActive && 'opacity-50'
                      )}
                    >
                      <PlatformBadge platform={acc.platform} size="xs" />
                      <span className="max-w-[120px] truncate">{acc.accountName.replace(/^(facebook|zalo|tiktok)\s*[-–]\s*/i, '')}</span>
                      {selected && <Check className="w-2.5 h-2.5 shrink-0" />}
                      {!acc.isActive && (
                        <span className="text-[8px] text-danger font-bold uppercase">Hết hạn</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
