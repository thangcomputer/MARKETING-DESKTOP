import React, { useState } from 'react';
import { cn, PLATFORMS } from '@/lib/utils';
import { useInboxStore } from '@/stores/useInboxStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import PlatformBadge from './PlatformBadge';
import {
  User,
  Phone,
  Mail,
  ExternalLink,
  Tag,
  X,
  Plus,
  StickyNote,
  Save,
  Edit3,
  Clock,
  MessageSquare,
  UserCircle,
} from 'lucide-react';

export default function CRMPanel() {
  const {
    conversations,
    activeConversationId,
    updateContactNotes,
    addTag,
    removeTag,
  } = useInboxStore();

  const [newTag, setNewTag] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  const conversation = conversations.find((c) => c.id === activeConversationId);

  if (!conversation) {
    return (
      <div className="w-[280px] shrink-0 border-l border-border/40 bg-card/20 flex items-center justify-center">
        <div className="text-center text-muted-foreground/40">
          <UserCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Chọn hội thoại để xem thông tin</p>
        </div>
      </div>
    );
  }

  const handleSaveNotes = () => {
    updateContactNotes(conversation.id, notesValue);
    setIsEditingNotes(false);
  };

  const handleStartEditNotes = () => {
    setNotesValue(conversation.notes || '');
    setIsEditingNotes(true);
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      addTag(conversation.id, newTag.trim());
      setNewTag('');
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const platformInfo = PLATFORMS[conversation.platform];

  return (
    <div className="w-[280px] shrink-0 border-l border-border/40 bg-card/20 flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* ── Contact Header ── */}
          <div className="text-center pb-4 border-b border-border/30">
            <div className="relative inline-block mb-3">
              <Avatar className="w-16 h-16 mx-auto">
                <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary/30 to-purple-500/30">
                  {conversation.participantName.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1">
                <PlatformBadge platform={conversation.platform} size="sm" />
              </div>
            </div>
            <h3 className="text-sm font-bold">{conversation.participantName}</h3>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span
                className={cn('w-1.5 h-1.5 rounded-full', conversation.isOnline ? 'bg-success' : 'bg-muted-foreground/30')}
              />
              <span className="text-[10px] text-muted-foreground">
                {conversation.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
              </span>
            </div>
          </div>

          {/* ── Contact Info ── */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3 h-3" /> Thông tin liên hệ
            </h4>

            {conversation.participantPhone && (
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors group">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs">{conversation.participantPhone}</span>
              </div>
            )}

            {conversation.participantEmail && (
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs truncate">{conversation.participantEmail}</span>
              </div>
            )}

            {conversation.participantLink && (
              <a
                href={conversation.participantLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors text-primary"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="text-xs truncate">{platformInfo?.name || 'Profile'}</span>
              </a>
            )}

            {!conversation.participantPhone && !conversation.participantEmail && (
              <p className="text-[10px] text-muted-foreground/50 italic px-2">
                Chưa có thông tin liên hệ
              </p>
            )}
          </div>

          {/* ── Tags ── */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Nhãn
            </h4>

            <div className="flex flex-wrap gap-1.5">
              {conversation.tags?.map((tag) => (
                <span key={tag} className="tag-badge group">
                  {tag}
                  <button
                    onClick={() => removeTag(conversation.id, tag)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add tag input */}
            <div className="flex gap-1.5">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Thêm nhãn..."
                className="h-7 text-[11px] bg-secondary/40 border-0 rounded-md"
              />
              <Button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                size="icon"
                variant="ghost"
                className="w-7 h-7 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <StickyNote className="w-3 h-3" /> Ghi chú nội bộ
              </h4>
              {!isEditingNotes && (
                <button
                  onClick={handleStartEditNotes}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Ghi chú nội bộ (VD: Đã tư vấn, chuyển cho cô Nga chốt lịch...)"
                  className="min-h-[80px] text-xs bg-secondary/30 border-border/30"
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-[11px] gap-1 flex-1"
                    onClick={handleSaveNotes}
                  >
                    <Save className="w-3 h-3" /> Lưu
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-[11px] flex-1"
                    onClick={() => setIsEditingNotes(false)}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={handleStartEditNotes}
                className={cn(
                  'px-3 py-2.5 rounded-lg text-xs leading-relaxed cursor-pointer transition-colors min-h-[60px]',
                  conversation.notes
                    ? 'bg-warning/5 border border-warning/15 text-foreground/80 hover:bg-warning/8'
                    : 'bg-secondary/20 border border-dashed border-border/40 text-muted-foreground/50 hover:bg-secondary/30'
                )}
              >
                {conversation.notes || 'Nhấn để thêm ghi chú...'}
              </div>
            )}
          </div>

          {/* ── Activity ── */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Hoạt động
            </h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2 px-2">
                <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-foreground/70">Tin nhắn mới nhất</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(conversation.lastMessageAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 px-2">
                <div className="w-1 h-1 rounded-full bg-success mt-1.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-foreground/70">Nguồn: {PLATFORMS[conversation.platform]?.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    ID: {conversation.externalId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
