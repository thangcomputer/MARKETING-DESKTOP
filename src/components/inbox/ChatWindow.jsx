import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sanitizeMessage } from '@/lib/sanitize';
import { cn, formatTime, getInitials, PLATFORMS } from '@/lib/utils';
import { useInboxStore } from '@/stores/useInboxStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import PlatformBadge from './PlatformBadge';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Zap,
  Hash,
  MessageSquareDashed,
  X,
  Ban,
  Undo2,
  CreditCard,
  Search,
} from 'lucide-react';

export default function ChatWindow() {
  const {
    conversations, activeConversationId, messages, sendMessage,
    showQuickReply, quickReplyFilter, quickReplyIndex,
    setShowQuickReply, setQuickReplyFilter, setQuickReplyIndex,
    getFilteredQuickReplies,
    recallMessage, blockUser, archiveConversation, deleteConversation
  } = useInboxStore();
  
  const bankInfo = useSettingsStore(state => state.bankInfo);

  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState(null);
  
  // Forward Modal State
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardSelectedIds, setForwardSelectedIds] = useState([]);
  const [forwardNote, setForwardNote] = useState('');
  
  const [toastMessage, setToastMessage] = useState('');

  const handleCopy = (content) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setToastMessage('✅ Đã copy tin nhắn!');
    setTimeout(() => setToastMessage(''), 2500);
    setActiveMessageMenuId(null);
  };

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const moreMenuRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Handle clicking outside of popups
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const conversation = conversations.find((c) => c.id === activeConversationId);
  const filteredQR = getFilteredQuickReplies();

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConversationId]);

  // Handle input change — detect slash commands
  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setInputValue(val);

    // Detect slash command at start of input
    if (val.startsWith('/')) {
      setShowQuickReply(true);
      setQuickReplyFilter(val.slice(1)); // Remove the slash
    } else {
      setShowQuickReply(false);
      setQuickReplyFilter('');
    }
  }, [setShowQuickReply, setQuickReplyFilter]);

  // Select a quick reply
  const selectQuickReply = useCallback((template) => {
    setInputValue('');
    setShowQuickReply(false);
    setQuickReplyFilter('');
    sendMessage(template.content);
  }, [sendMessage, setShowQuickReply, setQuickReplyFilter]);

  // Handle send
  const handleSend = () => {
    if (!inputValue.trim() && attachments.length === 0) return;
    
    // We transform File blobs into objects to keep UI smooth and detached from DOM inputs
    const formattedAttachments = attachments.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      url: URL.createObjectURL(f)
    }));

    sendMessage(inputValue, formattedAttachments);
    setInputValue('');
    setAttachments([]);
    setShowEmojiPicker(false);
    setShowQuickReply(false);
  };

  const handleSendBankInfo = () => {
    if (conversation?.platform === 'tiktok') return;
    const { bankName, bin, accountNo, accountName } = bankInfo;
    const bankInfoContent = `Dạ, anh/chị gửi thanh toán vào STK sau nhé:\nNgân hàng: ${bankName}\nSTK: ${accountNo}\nChủ TK: ${accountName}\nNội dung CK: SĐT hoặc Mã đơn`;
    const qrAttachment = {
      type: 'image/jpeg',
      name: 'bank-qr.jpg',
      size: 15400,
      url: `https://img.vietqr.io/image/${bin}-${accountNo}-Q4zCrc2.jpg?accountName=${encodeURIComponent(accountName)}&amount=0&addInfo=Thanh%20Toan`, 
    };
    sendMessage(bankInfoContent, [qrAttachment]);
  };

  // Keyboard navigation for quick replies
  const handleKeyDown = (e) => {
    if (showQuickReply && filteredQR.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setQuickReplyIndex(Math.min(quickReplyIndex + 1, filteredQR.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setQuickReplyIndex(Math.max(quickReplyIndex - 1, 0));
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        selectQuickReply(filteredQR[quickReplyIndex]);
      } else if (e.key === 'Escape') {
        setShowQuickReply(false);
        setInputValue('');
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-background/30">
        <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
          <MessageSquareDashed className="w-8 h-8 opacity-30" />
        </div>
        <h3 className="text-base font-semibold text-foreground/50 mb-1">
          Chọn một hội thoại
        </h3>
        <p className="text-xs text-muted-foreground/50 max-w-[260px] text-center">
          Nhấn vào hội thoại bên trái để trả lời tin nhắn
        </p>
        <div className="mt-6 flex items-center gap-2 text-[10px] text-muted-foreground/40">
          <Zap className="w-3.5 h-3.5" />
          Gõ <code className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">/</code> để trả lời nhanh
        </div>
      </div>
    );
  }

  const platformInfo = PLATFORMS[conversation.platform];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background/20">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-border/30 bg-card/40 backdrop-blur-sm shrink-0 relative z-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-9 h-9">
              <AvatarImage src={conversation.participantAvatar} alt={conversation.participantName} />
              <AvatarFallback className="text-xs font-semibold">
                {getInitials(conversation.participantName)}
              </AvatarFallback>
            </Avatar>
            {conversation.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">{conversation.participantName}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <PlatformBadge platform={conversation.platform} size="xs" showLabel />
              <span className="text-[9px] text-muted-foreground mx-0.5">•</span>
              <span className={cn(
                'text-[10px] flex items-center gap-1',
                conversation.isOnline ? 'text-success' : 'text-muted-foreground'
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  conversation.isOnline ? 'bg-success' : 'bg-muted-foreground/40'
                )} />
                {conversation.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {['facebook', 'zalo'].includes(conversation.platform) && (
            <>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
                <Video className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button 
            variant={conversation.isBlocked ? 'destructive' : 'ghost'} 
            size="icon" 
            className={cn('w-8 h-8', conversation.isBlocked ? 'text-white' : 'text-danger hover:text-danger hover:bg-danger/10')}
            title="Chặn người dùng này"
            onClick={() => blockUser(conversation.id)}
          >
            <Ban className="w-4 h-4" />
          </Button>
          <div className="relative" ref={moreMenuRef}>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn('w-8 h-8 transition-colors', showMoreMenu ? 'bg-secondary text-foreground' : 'text-muted-foreground')}
              onClick={() => setShowMoreMenu(!showMoreMenu)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            
            {showMoreMenu && (
                <div className="absolute top-full right-0 mt-2 w-[240px] bg-card border border-border pb-1.5 pt-1.5 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                  <button onClick={() => { archiveConversation(conversation.id); setShowMoreMenu(false); }} className="w-full flex items-start gap-3 px-3 py-2 hover:bg-secondary transition-colors text-left group">
                    <span className="w-6 h-6 shrink-0 flex items-center justify-center opacity-70 bg-primary/10 rounded-md text-primary mt-0.5">📥</span> 
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground font-medium">Lưu trữ (Ẩn đi)</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Dọn dẹp Inbox. Sẽ hiện lại nếu KH nhắn tin.</p>
                    </div>
                  </button>
                  <button onClick={() => { deleteConversation(conversation.id); setShowMoreMenu(false); }} className="w-full flex items-start gap-3 px-3 py-2 hover:bg-secondary transition-colors text-left group mt-0.5">
                    <span className="w-6 h-6 shrink-0 flex items-center justify-center opacity-70 bg-muted rounded-md text-foreground mt-0.5">🗑️</span> 
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground font-medium">Xóa vĩnh viễn</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Xoá toàn bộ lịch sử trò chuyện này.</p>
                    </div>
                  </button>
                  <div className="h-px bg-border/40 my-1.5 w-full mx-auto max-w-[90%]" />
                  <button onClick={() => { blockUser(conversation.id); setShowMoreMenu(false); }} className="w-full flex items-start gap-3 px-3 py-2 hover:bg-danger/5 transition-colors text-left group">
                    <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md bg-danger/10 text-danger mt-0.5">
                      <Ban className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-danger font-medium">{conversation.isBlocked ? 'Bỏ chặn khách hàng' : 'Chặn khách hàng'}</p>
                      <p className="text-[10px] text-danger/70 leading-tight mt-0.5">{conversation.isBlocked ? 'Cho phép KH nhắn tin lại' : 'Đưa KH này vào danh sách đen'}</p>
                    </div>
                  </button>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-3">
          {/* Date separator */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border/20" />
            <span className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-widest">
              Hôm nay
            </span>
            <div className="flex-1 h-px bg-border/20" />
          </div>

          {messages.map((msg, idx) => {
            const isOutbound = msg.direction === 'outbound';
            const showAvatarOrTitle = idx === 0 || messages[idx - 1]?.direction !== msg.direction;

            return (
              <div
                key={msg.id}
                className={cn('flex flex-col gap-1', isOutbound ? 'items-end' : 'items-start')}
              >
                {showAvatarOrTitle && isOutbound && (
                   <span className="text-[10px] text-muted-foreground/60 font-medium mr-1 uppercase tracking-wider">
                     {conversation?.platform === 'facebook' ? 'Fanpage' : conversation?.platform === 'zalo' ? 'Zalo OA' : conversation?.platform === 'tiktok' ? 'TikTok Shop' : conversation?.platform}
                   </span>
                )}
                <div className={cn('flex gap-2 w-full', isOutbound ? 'justify-end' : 'justify-start')}>
                  {!isOutbound && (
                    <div className="w-7 shrink-0 pt-1">
                      {showAvatarOrTitle && (
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={conversation.participantAvatar} alt={conversation.participantName} />
                          <AvatarFallback className="text-[9px]">
                            {getInitials(conversation.participantName)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}

                  <div className={cn('max-w-[65%] group flex items-start gap-2', isOutbound ? 'flex-row-reverse' : 'flex-row')}>
                  
                  {!msg.isRecalled && (
                    <div className="relative mt-1 transition-opacity z-10 flex shrink-0 group-hover:opacity-100 opacity-0" style={{ opacity: activeMessageMenuId === msg.id ? 1 : undefined }}>
                      <button 
                        onClick={() => setActiveMessageMenuId(activeMessageMenuId === msg.id ? null : msg.id)}
                        className={cn("p-1.5 rounded-full text-muted-foreground/50 hover:text-foreground transition-all duration-200", activeMessageMenuId === msg.id ? "bg-muted text-foreground opacity-100" : "hover:bg-muted")}
                        title="Tùy chọn tin nhắn"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {activeMessageMenuId === msg.id && (
                        <>
                          <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(null); }} />
                          <div className={cn("absolute top-8 w-36 bg-card border border-border shadow-xl rounded-xl z-50 py-1 flex flex-col animate-in fade-in zoom-in-95", isOutbound ? "right-0" : "left-0")}>
                            <button onClick={() => handleCopy(msg.content)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-secondary text-muted-foreground hover:text-foreground">
                              Copy tin nhắn
                            </button>
                            <button onClick={() => { setForwardingMessage(msg); setActiveMessageMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-secondary text-muted-foreground hover:text-foreground">
                              Chuyển tiếp
                            </button>
                            {isOutbound && (
                              <>
                                <div className="h-px bg-border/40 my-1 mx-2" />
                                <button onClick={() => { recallMessage(msg.id); setActiveMessageMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10">
                                  Thu hồi
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap',
                      isOutbound ? 'bubble-outbound' : 'bubble-inbound',
                      msg.isRecalled && 'italic text-muted-foreground/60 bg-secondary/50 shadow-none border border-border/30 text-center text-xs'
                    )}>
                    {msg.content && <div>{sanitizeMessage(msg.content)}</div>}
                    {msg.attachments?.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        {msg.attachments.map((att, i) => (
                          att.type?.startsWith('image/') ? (
                            <img key={i} src={att.url} alt="attachment" className="rounded-lg max-w-[220px] max-h-[220px] object-cover shadow-sm border border-border/20" />
                          ) : (
                            <div key={i} className="flex items-center gap-2 p-2.5 bg-background/50 rounded-lg border border-border/20 shadow-sm w-[220px]">
                              <div className="w-8 h-8 rounded-md bg-secondary/50 flex items-center justify-center shrink-0">
                                <Paperclip className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate" title={att.name}>{att.name}</p>
                                <p className="text-[10px] text-muted-foreground">{(att.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                    <div className={cn(
                      'flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
                      isOutbound ? 'justify-end' : 'justify-start'
                    )}>
                      <span className="text-[9px] text-muted-foreground">
                        {formatTime(msg.sentAt)}
                      </span>
                      {isOutbound && (
                        <span className="text-[9px] text-primary/50">
                          {msg.status === 'read' || msg.status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Toast Floating Notification */}
      {toastMessage && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-foreground/90 text-background px-4 py-2 rounded-full shadow-2xl text-[13px] font-medium z-[100] animate-in slide-in-from-bottom-5 fade-in zoom-in-95 pointer-events-none transition-all duration-300">
          {toastMessage}
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-border/30 bg-card/30 relative">
        {/* Quick Reply Popup */}
        {showQuickReply && filteredQR.length > 0 && (
          <div className="quick-reply-popup max-h-[280px] overflow-y-auto">
            <div className="px-4 py-2 border-b border-border/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-primary" />
                Trả lời nhanh
              </p>
            </div>
            {filteredQR.map((qr, i) => (
              <button
                key={qr.id}
                onClick={() => selectQuickReply(qr)}
                onMouseEnter={() => setQuickReplyIndex(i)}
                className={cn('quick-reply-item w-full text-left', i === quickReplyIndex && 'active')}
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-primary">{qr.command}</code>
                    <span className="text-[11px] font-medium text-foreground">{qr.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {qr.content.split('\n')[0]}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 p-2 mb-2 bg-secondary/20 rounded-xl overflow-x-auto">
            {attachments.map((file, i) => (
              <div key={i} className="relative group w-14 h-14 shrink-0 bg-background rounded-lg border border-border/50 flex items-center justify-center overflow-hidden">
                {file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <Paperclip className="w-5 h-5 text-muted-foreground" />
                )}
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black p-0.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input bar */}
        {conversation?.isBlocked ? (
          <div className="flex items-center justify-center p-4 bg-secondary/30 rounded-2xl border border-dashed border-border/50 text-muted-foreground">
            <Ban className="w-5 h-5 mr-3 opacity-50 text-danger" />
            <p className="text-sm font-medium">Bạn đã chặn người dùng này. Bỏ chặn để tiếp tục trò chuyện.</p>
          </div>
        ) : (
          <div className="flex items-end gap-2 bg-secondary/40 rounded-2xl border border-border/30 px-3 py-2 relative">
            
            <div className="flex items-center gap-0.5 shrink-0 pb-0.5 relative">
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
              <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button 
                onClick={() => imageInputRef.current?.click()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <div ref={emojiPickerRef} className="relative">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn("p-1.5 rounded-lg transition-colors flex items-center justify-center", showEmojiPicker ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60")}
                >
                  <Smile className="w-4 h-4" />
                </button>
                {/* Emoji Popover */}
                {showEmojiPicker && (
                  <div className="absolute bottom-[calc(100%+12px)] left-0 mb-1 bg-card border border-border/50 shadow-xl rounded-xl p-2 grid grid-cols-5 gap-1 z-50">
                    {['😀', '😂', '😍', '👍', '❤️', '🔥', '😊', '😭', '🙏', '✨', '✔', '🎁', '☀️', '🎉', '😡'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setInputValue(prev => prev + emoji);
                          setShowEmojiPicker(false);
                          inputRef.current?.focus();
                        }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-secondary rounded-lg text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={handleSendBankInfo}
                disabled={conversation?.platform === 'tiktok'}
                title={conversation?.platform === 'tiktok' ? 'Không thể gửi STK qua TikTok để tránh bị khoá tài khoản' : 'Gửi nhanh Mã QR Chuyển khoản'}
                className={cn("p-1.5 rounded-lg transition-colors", 
                  conversation?.platform === 'tiktok' 
                    ? "opacity-30 cursor-not-allowed text-muted-foreground" 
                    : "text-muted-foreground hover:text-[#0068ff] hover:bg-[#0068ff]/10")}
              >
                <CreditCard className="w-4 h-4" />
              </button>
            </div>

            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn... (gõ / để trả lời nhanh)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none max-h-[100px] py-1"
            />

            <Button
              onClick={handleSend}
              disabled={(!inputValue.trim() && attachments.length === 0) || showQuickReply}
              size="icon"
              className={cn(
                'w-8 h-8 rounded-xl shrink-0 mb-0.5 transition-all',
                (inputValue.trim() || attachments.length > 0) && !showQuickReply
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-[420px] border border-border shadow-2xl rounded-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <h2 className="text-[15px] font-semibold">Chia sẻ</h2>
              <button 
                onClick={() => {
                  setForwardingMessage(null);
                  setForwardSearch('');
                  setForwardSelectedIds([]);
                  setForwardNote('');
                }} 
                className="p-1 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            
            <div className="p-3 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Tìm kiếm..." 
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-border/60 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex px-4 py-2 border-b border-border/40 gap-4 text-[13px] font-medium text-muted-foreground">
              <button className="text-primary border-b-2 border-primary pb-2 -mb-[9px] font-semibold">Gần đây</button>
              <button className="hover:text-foreground transition-colors">Nhóm trò chuyện</button>
              <button className="hover:text-foreground transition-colors">Bạn bè</button>
            </div>

            <ScrollArea className="h-[280px]">
              <div className="p-2 flex flex-col gap-1">
                {conversations
                  .filter(c => forwardSearch.trim() ? c.participantName.toLowerCase().includes(forwardSearch.toLowerCase()) : true)
                  .slice(0, forwardSearch.trim() ? undefined : 10)
                  .map(c => (
                  <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-secondary/60 rounded-xl cursor-pointer transition-colors">
                    <div className="flex bg-background border border-border items-center justify-center w-4 h-4 rounded ml-1 shrink-0">
                      {forwardSelectedIds.includes(c.id) && <div className="w-2.5 h-2.5 bg-primary rounded-sm shadow-sm" />}
                    </div>
                    <input 
                      type="checkbox" 
                      checked={forwardSelectedIds.includes(c.id)}
                      onChange={(e) => {
                        if(e.target.checked) setForwardSelectedIds([...forwardSelectedIds, c.id]);
                        else setForwardSelectedIds(forwardSelectedIds.filter(id => id !== c.id));
                      }}
                      className="hidden"
                    />
                    <Avatar className="w-8 h-8 ring-1 ring-border/50 shrink-0">
                      <AvatarImage src={c.participantAvatar} />
                      <AvatarFallback className="text-[10px]">{getInitials(c.participantName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate text-foreground/90">{c.participantName}</p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border/40 bg-secondary/20 flex flex-col gap-2 rounded-b-2xl">
              <div className="p-2.5 bg-background border border-border/60 shadow-sm rounded-xl flex gap-3 items-center">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-lg opacity-80">💬</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground font-medium mb-0.5">Nội dung chia sẻ</p>
                  <p className="text-[13px] font-medium truncate opacity-90">{forwardingMessage.content || "Có đính kèm file/hình ảnh"}</p>
                </div>
              </div>
              <div className="bg-background border border-border/60 rounded-xl shadow-sm px-3 py-2 flex mt-1">
                 <input 
                  type="text" 
                  placeholder="Nhập tin nhắn đính kèm..." 
                  value={forwardNote}
                  onChange={(e) => setForwardNote(e.target.value)}
                  className="w-full text-[13px] bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/50"
                />
              </div>
             
              <div className="flex justify-end gap-2 mt-2 pb-1">
                <Button variant="ghost" size="sm" onClick={() => {
                  setForwardingMessage(null);
                  setForwardSearch('');
                  setForwardSelectedIds([]);
                  setForwardNote('');
                }} className="hover:bg-secondary">Hủy</Button>
                <Button size="sm" disabled={forwardSelectedIds.length === 0} onClick={() => {
                   forwardSelectedIds.forEach((targetConvId) => {
                     // 1. Send the forwarded content/attachments first
                     if (forwardingMessage.content || (forwardingMessage.attachments && forwardingMessage.attachments.length > 0)) {
                       sendMessage(forwardingMessage.content || '', forwardingMessage.attachments || [], targetConvId);
                     }
                     // 2. Send the optional attached note right after
                     if (forwardNote.trim()) {
                       setTimeout(() => {
                         sendMessage(forwardNote.trim(), [], targetConvId);
                       }, 500);
                     }
                   });
                   
                   setToastMessage(`✅ Đã gửi chuyển tiếp đến ${forwardSelectedIds.length} khách hàng!`);
                   setTimeout(() => setToastMessage(''), 3000);

                   setForwardingMessage(null);
                   setForwardSearch('');
                   setForwardSelectedIds([]);
                   setForwardNote('');
                }} className="px-6 min-w-[100px] shadow-md transition-all">Chia sẻ</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
