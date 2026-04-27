import React, { useState } from 'react';
import { cn, formatDateTime } from '@/lib/utils';
import { useSchedulerStore } from '@/stores/useSchedulerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import PlatformBadge from '@/components/inbox/PlatformBadge';
import {
  CalendarClock,
  Upload,
  Image as ImageIcon,
  Film,
  X,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  Plus,
} from 'lucide-react';

export default function SchedulerPage() {
  const { posts, createPost, deletePost, filterStatus, setFilterStatus } = useSchedulerStore();
  const { hashtags, credentials } = useSettingsStore();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    caption: '',
    platforms: [],
    accountIds: [],
    scheduledAt: '',
    mediaType: null,
    videoFormat: 'feed', // 'feed' | 'reels' | 'story'
  });

  // Media & Tags State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);
  const [hashtagKeyword, setHashtagKeyword] = useState('');
  
  // Drag and Drop State
  const fileInputRef = React.useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelected = (file) => {
    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(0);
    setFormData(prev => ({ ...prev, mediaType: file.type.startsWith('video/') ? 'video' : 'image' }));
    
    // Simulate upload progress
    const timer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsUploading(false);
          return 100;
        }
        return prev + 15;
      });
    }, 200);
  };

  // Get filtered posts
  const filteredPosts = filterStatus === 'all'
    ? posts
    : posts.filter((p) => p.status === filterStatus);

  // Stats
  const stats = {
    total: posts.length,
    pending: posts.filter((p) => p.status === 'pending').length,
    published: posts.filter((p) => p.status === 'published').length,
    failed: posts.filter((p) => p.status === 'failed').length,
  };

  const handleAccountToggle = (accountId, platform) => {
    setFormData((prev) => {
      const isSelected = prev.accountIds.includes(accountId);
      const newAccountIds = isSelected
        ? prev.accountIds.filter((p) => p !== accountId)
        : [...prev.accountIds, accountId];
        
      // Derive active platforms based on selected accounts
      const activePlatforms = [...new Set(newAccountIds.map(id => credentials.find(c => c.id === id)?.platform).filter(Boolean))];

      return {
        ...prev,
        accountIds: newAccountIds,
        platforms: activePlatforms,
      };
    });
  };

  const handleSubmit = () => {
    if (!formData.caption.trim() || formData.accountIds.length === 0 || !formData.scheduledAt) return;
    createPost({
      ...formData,
      platforms: JSON.stringify(formData.platforms),
      accountIds: JSON.stringify(formData.accountIds),
      scheduledAt: new Date(formData.scheduledAt).toISOString(),
    });
    setFormData({ caption: '', platforms: [], accountIds: [], scheduledAt: '', mediaType: null, videoFormat: 'feed' });
    setShowForm(false);
  };

  const statusConfig = {
    pending: { label: 'Chờ đăng', icon: Clock, variant: 'warning', color: 'text-warning' },
    published: { label: 'Đã đăng', icon: CheckCircle2, variant: 'success', color: 'text-success' },
    failed: { label: 'Thất bại', icon: AlertCircle, variant: 'danger', color: 'text-danger' },
    publishing: { label: 'Đang đăng', icon: Clock, variant: 'default', color: 'text-primary' },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Lên lịch đăng bài</h1>
              <p className="text-xs text-muted-foreground">
                Quản lý và lên lịch bài đăng đa nền tảng
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Đóng' : 'Tạo bài mới'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Tổng cộng', value: stats.total, color: 'text-foreground', bg: 'bg-secondary/50' },
            { label: 'Chờ đăng', value: stats.pending, color: 'text-warning', bg: 'bg-warning/5' },
            { label: 'Đã đăng', value: stats.published, color: 'text-success', bg: 'bg-success/5' },
            { label: 'Thất bại', value: stats.failed, color: 'text-danger', bg: 'bg-danger/5' },
          ].map((stat) => (
            <div key={stat.label} className={cn('rounded-xl p-3 border border-border/30', stat.bg)}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Form Panel (collapsible) */}
        {showForm && (
          <div className="w-[420px] border-r border-border/30 shrink-0 animate-slide-in-left">
            <ScrollArea className="h-full">
              <div className="p-5 space-y-5">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Tạo bài đăng mới
                </h3>

                {/* Media Upload */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Hình ảnh / Video
                  </label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/*,video/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }} 
                  />

                  {!uploadedFile ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileSelected(e.dataTransfer.files[0]);
                        }
                      }}
                      className={cn(
                        "block border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer group",
                        isDragging ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/40 hover:bg-primary/5'
                      )}
                    >
                      <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      <p className="text-sm text-muted-foreground">
                        Kéo thả hoặc <span className="text-primary font-medium">chọn file</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        JPG, PNG, GIF, MP4 — Tối đa 50MB
                      </p>
                    </div>
                  ) : (
                    <div className="border border-border/50 rounded-xl p-4 bg-secondary/20 relative">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-background">
                          {uploadedFile.type?.startsWith('image/') || formData.mediaType === 'image' ? (
                            <img src={URL.createObjectURL(uploadedFile)} alt="preview" className="w-full h-full object-cover" />
                          ) : (
                            <Film className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" title={uploadedFile.name}>{uploadedFile.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {uploadedFile.size ? (uploadedFile.size / 1024 / 1024).toFixed(2) : '0.00'} MB
                          </p>
                          
                          {/* Progress bar */}
                          {isUploading ? (
                            <div className="mt-2 w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                            </div>
                          ) : (
                            <p className="text-[10px] text-success font-medium mt-1">✓ Đã tải lên xong</p>
                          )}
                        </div>
                        {!isUploading && (
                          <button onClick={() => { setUploadedFile(null); if(fileInputRef.current) fileInputRef.current.value=''; }} className="p-1.5 rounded-md hover:bg-danger/10 text-muted-foreground hover:text-danger">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setFormData((p) => ({ ...p, mediaType: 'image' }))}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all',
                        formData.mediaType === 'image'
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border/30 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> Hình ảnh
                    </button>
                    <button
                      onClick={() => setFormData((p) => ({ ...p, mediaType: 'video' }))}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all',
                        formData.mediaType === 'video'
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border/30 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Film className="w-3.5 h-3.5" /> Video
                    </button>
                  </div>

                  {/* Video format toggle - dynamically shown if video selected */}
                  {formData.mediaType === 'video' && (
                    <div className="mt-4 pt-4 border-t border-border/30 animate-in fade-in zoom-in-95 duration-200">
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">
                        Định dạng Phân phối Video
                      </label>
                      <div className="flex gap-2">
                        {['feed', 'reels', 'story'].map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => setFormData((p) => ({ ...p, videoFormat: fmt }))}
                            className={cn(
                              'flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all',
                              formData.videoFormat === fmt
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {fmt === 'feed' ? 'Bài tường (Feed)' : fmt === 'reels' ? 'Reels / Shorts / TikTok / Zalo Video' : 'Tin (Story 24h)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Caption */}
                <div className="relative">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Nội dung bài đăng
                  </label>
                  <Textarea
                    value={formData.caption}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(p => ({ ...p, caption: val }));
                      
                      // Check for hashtag typing mapping
                      const words = val.split(/[\s\n]+/);
                      const lastWord = words[words.length - 1];
                      if (lastWord.startsWith('#') && lastWord.length >= 1) {
                        setHashtagKeyword(lastWord.slice(1).toLowerCase());
                        setShowHashtags(true);
                      } else {
                        setShowHashtags(false);
                      }
                    }}
                    placeholder="Viết nội dung bài đăng của bạn... (gõ # để thêm hashtag)"
                    className="min-h-[120px] bg-secondary/30 relative"
                  />
                  
                  {/* Synced Quick Hashtags */}
                  {hashtags?.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-primary/70" /> Hashtags từ Hệ thống:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                         {hashtags.map(tag => (
                           <button 
                             key={tag}
                             onClick={(e) => {
                               e.preventDefault();
                               setFormData(p => ({ 
                                 ...p, 
                                 caption: p.caption + (p.caption.endsWith(' ') || p.caption.length === 0 ? '' : ' ') + '#' + tag + ' ' 
                               }));
                             }}
                             className="text-[11px] bg-background text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 px-2 py-1 rounded-md transition-all font-medium border border-border/60 flex items-center gap-0.5"
                           >
                             <span className="text-primary/60">#</span>{tag}
                           </button>
                         ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Hashtag Suggestions */}
                  {showHashtags && (
                    <div className="absolute z-10 bottom-full left-0 mb-1 w-[200px] max-h-[200px] overflow-y-auto bg-card border border-border/50 shadow-xl rounded-xl py-1">
                      {hashtags.filter(tag => tag.includes(hashtagKeyword)).slice(0,5).map(tag => (
                        <button
                          key={tag}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary/60 flex items-center gap-2"
                          onClick={() => {
                            const words = formData.caption.split(/[\s\n]+/);
                            words.pop(); // Remove the incomplete hashtag
                            const newCaption = words.join(' ') + (words.length > 0 ? ' ' : '') + '#' + tag + ' ';
                            setFormData(p => ({ ...p, caption: newCaption }));
                            setShowHashtags(false);
                          }}
                        >
                          <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold">#</div>
                          <span>{tag}</span>
                        </button>
                      ))}
                      {hashtags.filter(tag => tag.includes(hashtagKeyword)).length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Không tìm thấy thẻ (Vào Cài đặt để thêm)</div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground mt-1 text-right">
                    {formData.caption.length} ký tự
                  </p>
                </div>

                {/* Platform Selection */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-3 block">
                    Danh sách nơi đăng
                  </label>
                  <div className="space-y-2">
                    {credentials.filter(c => c.isActive).map((credential) => (
                      <label
                        key={credential.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200',
                          formData.accountIds.includes(credential.id)
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border/30 hover:border-border/60'
                        )}
                      >
                        <Checkbox
                          checked={formData.accountIds.includes(credential.id)}
                          onCheckedChange={() => handleAccountToggle(credential.id, credential.platform)}
                        />
                        <div className="flex items-center gap-2">
                          <PlatformBadge platform={credential.platform} size="sm" />
                          <span className="text-xs font-semibold">{credential.label || credential.accountName}</span>
                        </div>
                      </label>
                    ))}
                    {credentials.filter(c => c.isActive).length === 0 && (
                      <div className="text-xs text-muted-foreground p-3 border border-dashed border-border/50 rounded-lg text-center">Chưa có kênh khả dụng nào. (Vào Cài đặt)</div>
                    )}
                  </div>
                </div>

                {/* Schedule DateTime */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Thời gian đăng
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData((p) => ({ ...p, scheduledAt: e.target.value }))}
                    className="bg-secondary/30"
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowForm(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleSubmit}
                    disabled={
                      !formData.caption.trim() ||
                      formData.accountIds.length === 0 ||
                      !formData.scheduledAt ||
                      isUploading
                    }
                  >
                    <Sparkles className="w-4 h-4" />
                    Lên lịch
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Posts List */}
        <div className="flex-1 overflow-hidden">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-5 py-3 border-b border-border/30">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'pending', label: 'Chờ đăng' },
              { key: 'published', label: 'Đã đăng' },
              { key: 'failed', label: 'Thất bại' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  filterStatus === tab.key
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <ScrollArea className="h-[calc(100%-48px)]">
            <div className="p-5 space-y-3">
              {filteredPosts.map((post, index) => {
                const platforms = JSON.parse(post.platforms);
                const config = statusConfig[post.status];
                const StatusIcon = config.icon;

                return (
                  <Card
                    key={post.id}
                    className="group hover:border-border/80 transition-all duration-200 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={config.variant} className="gap-1">
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </Badge>
                            {post.mediaType && (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                {post.mediaType === 'image' && <ImageIcon className="w-3 h-3" />}
                                {post.mediaType === 'video' && <Film className="w-3 h-3" />}
                                {post.mediaType === 'carousel' && <FileText className="w-3 h-3" />}
                                {post.mediaType}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-foreground/90 mb-3 line-clamp-2">
                            {post.caption}
                          </p>

                          <div className="flex items-center gap-3">
                            {/* Platforms */}
                            <div className="flex items-center gap-1.5">
                              {platforms.map((p) => (
                                <PlatformBadge key={p} platform={p} size="sm" />
                              ))}
                            </div>

                            <span className="text-[10px] text-muted-foreground">•</span>

                            {/* Schedule time */}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(post.scheduledAt)}
                            </span>
                          </div>

                          {/* Error log */}
                          {post.errorLog && (
                            <div className="mt-2 px-3 py-2 rounded-lg bg-danger/5 border border-danger/20">
                              <p className="text-xs text-danger">{post.errorLog}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-muted-foreground hover:text-danger"
                            onClick={() => deletePost(post.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredPosts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <CalendarClock className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium">Chưa có bài đăng nào</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Tạo bài đăng mới để bắt đầu
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
