import React, { useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import PlatformBadge from '@/components/inbox/PlatformBadge';
import {
  Settings,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  Trash2,
  Key,
  RefreshCw,
  ExternalLink,
  LogIn,
  Globe,
  Webhook,
  CreditCard,
  Users,
} from 'lucide-react';

const platformConfigs = {
  facebook: {
    name: 'Facebook',
    description: 'Meta Graph API — Messenger, Page Management',
    docsUrl: 'https://developers.facebook.com/docs/graph-api',
    hasOAuth: true,
    oauthLabel: 'Đăng nhập với Facebook',
    oauthColor: 'bg-facebook hover:bg-facebook/90',
    fields: [
      { key: 'appId', label: 'App ID', placeholder: 'Nhập Facebook App ID' },
      { key: 'appSecret', label: 'App Secret', placeholder: 'Nhập App Secret', sensitive: true },
      { key: 'accessToken', label: 'Page Access Token', placeholder: 'Token sẽ được tạo sau khi OAuth', sensitive: true },
      { key: 'pageId', label: 'Page ID', placeholder: 'Tự động điền sau khi kết nối' },
    ],
    webhookFields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://your-server.com/webhook/facebook' },
      { key: 'verifyToken', label: 'Verify Token', placeholder: 'Token xác thực webhook' },
    ],
  },
  zalo: {
    name: 'Zalo OA',
    description: 'Zalo Open API — Official Account',
    docsUrl: 'https://developers.zalo.me/docs',
    hasOAuth: false,
    fields: [
      { key: 'appId', label: 'App ID', placeholder: 'Nhập Zalo App ID' },
      { key: 'appSecret', label: 'Secret Key', placeholder: 'Nhập Secret Key', sensitive: true },
      { key: 'accessToken', label: 'OA Access Token', placeholder: 'Nhập OA Access Token', sensitive: true },
      { key: 'refreshToken', label: 'Refresh Token', placeholder: 'Nhập Refresh Token', sensitive: true },
    ],
    webhookFields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://your-server.com/webhook/zalo' },
    ],
  },
  tiktok: {
    name: 'TikTok',
    description: 'TikTok for Developers — Content Publishing',
    docsUrl: 'https://developers.tiktok.com/doc',
    hasOAuth: true,
    oauthLabel: 'Đăng nhập với TikTok',
    oauthColor: 'bg-tiktok hover:bg-tiktok/90',
    fields: [
      { key: 'appId', label: 'Client Key', placeholder: 'Nhập TikTok Client Key' },
      { key: 'appSecret', label: 'Client Secret', placeholder: 'Nhập Client Secret', sensitive: true },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Token sẽ được tạo sau khi OAuth', sensitive: true },
      { key: 'pageId', label: 'Open ID', placeholder: 'Tự động điền sau khi kết nối' },
    ],
    webhookFields: [],
  },
  youtube: {
    name: 'YouTube',
    description: 'YouTube Data API v3 — Video Uploads, Shorts, Analytics',
    docsUrl: 'https://developers.google.com/youtube/v3',
    hasOAuth: true,
    oauthLabel: 'Đăng nhập với Google',
    oauthColor: 'bg-[#ea4335] text-white hover:bg-[#ea4335]/90',
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'Google OAuth Client ID' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Google OAuth Client Secret', sensitive: true },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Tự động tạo qua OAuth', sensitive: true },
      { key: 'channelId', label: 'Channel ID', placeholder: 'Tự động điền sau khi kết nối' },
    ],
    webhookFields: [],
  },
};

export default function SettingsPage() {
  const { credentials, saveCredential, deleteCredential, testConnection, testResults,
    hashtags, addHashtag, deleteHashtag,
    quickReplies, saveQuickReply, deleteQuickReply,
    bankInfo, updateBankInfo,
    staffList, updateStaffPermissions, addStaff, updateStaff, deleteStaff
  } = useSettingsStore();

  const [activeMenu, setActiveMenu] = useState('channels'); // 'channels', 'hashtags', 'quickreplies'
  const [newHashtag, setNewHashtag] = useState('');
  
  // Staff Form state
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffFormData, setStaffFormData] = useState({ name: '', username: '', password: '', role: 'Nhân viên', permissions: { post: false, chat: false, analytics: false } });

  const handleEditStaff = (staff) => {
    setEditingStaffId(staff.id);
    setStaffFormData({ ...staff });
  };
  
  const handleAddNewStaffClick = () => {
    setEditingStaffId('NEW');
    setStaffFormData({ name: '', username: '', password: '', role: 'Nhân viên', permissions: { post: false, chat: false, analytics: false } });
  };

  const handleSaveStaff = (e) => {
    e.preventDefault();
    if(!staffFormData.username || !staffFormData.password || !staffFormData.name) return;
    if(editingStaffId === 'NEW') addStaff(staffFormData);
    else updateStaff(editingStaffId, staffFormData);
    setEditingStaffId(null);
  };
  
  // QuickReply local inputs
  const [qrCommand, setQrCommand] = useState('');
  const [qrLabel, setQrLabel] = useState('');
  const [qrContent, setQrContent] = useState('');

  const handleAddHashtag = () => {
    let clean = newHashtag.trim().replace(/^#/, '');
    if (clean) {
      addHashtag(clean);
      setNewHashtag('');
    }
  };

  const handleAddQuickReply = () => {
    if (!qrCommand.trim() || !qrContent.trim() || !qrLabel.trim()) return;
    let cleanCmd = qrCommand.trim().startsWith('/') ? qrCommand.trim() : `/${qrCommand.trim()}`;
    saveQuickReply({ command: cleanCmd, label: qrLabel, content: qrContent });
    setQrCommand('');
    setQrLabel('');
    setQrContent('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Cài đặt hệ thống</h1>
            <p className="text-xs text-muted-foreground">Tùy biến Kênh, Trợ lý & Tốc độ</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 border-r border-border/30 bg-card/30 p-4 space-y-1">
          <button
            onClick={() => setActiveMenu('channels')}
            className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeMenu === 'channels' ? "bg-primary/10 text-primary" : "hover:bg-secondary/50 text-muted-foreground")}
          >
            <Globe className="w-4 h-4" /> Kênh liên lạc
          </button>
          <button
            onClick={() => setActiveMenu('quickreplies')}
            className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeMenu === 'quickreplies' ? "bg-primary/10 text-primary" : "hover:bg-secondary/50 text-muted-foreground")}
          >
            <Webhook className="w-4 h-4" /> Từ khóa trả lời (/)
          </button>
          <button
            onClick={() => setActiveMenu('hashtags')}
            className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeMenu === 'hashtags' ? "bg-primary/10 text-primary" : "hover:bg-secondary/50 text-muted-foreground")}
          >
            <Key className="w-4 h-4" /> Quản lý Hashtag (#)
          </button>
          <button
            onClick={() => setActiveMenu('banking')}
            className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeMenu === 'banking' ? "bg-primary/10 text-primary" : "hover:bg-secondary/50 text-muted-foreground")}
          >
            <CreditCard className="w-4 h-4" /> Cấu hình STK & QR
          </button>
          <button
            onClick={() => setActiveMenu('permissions')}
            className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeMenu === 'permissions' ? "bg-primary/10 text-primary" : "hover:bg-secondary/50 text-muted-foreground")}
          >
            <Users className="w-4 h-4" /> Phân quyền
          </button>
        </div>

        {/* Content area */}
        <ScrollArea className="flex-1 bg-background/30">
          
          {activeMenu === 'channels' && (
            <div className="p-6 space-y-8 animate-fade-in">
              {/* Security Banner */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20 mb-6">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">Bảo mật AES-256</span> — Tất cả tokens được mã hóa trước khi lưu.
                </p>
              </div>

              {Object.entries(platformConfigs).map(([platform, config]) => {
                const platformCredentials = credentials.filter((c) => c.platform === platform);
                return (
                  <div key={platform} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/30 pb-2">
                      <div className="flex items-center gap-2">
                        <PlatformBadge platform={platform} size="md" />
                        <h2 className="text-sm font-bold">{config.name}</h2>
                      </div>
                      <Button 
                        variant="outline" size="sm" className="gap-1 text-xs h-8"
                        onClick={() => saveCredential({ platform, name: `Tài khoản ${config.name} Mới`, isDraft: true })}
                      >
                        <Settings className="w-3.5 h-3.5" /> Thêm tài khoản
                      </Button>
                    </div>

                    {platformCredentials.length === 0 && (
                      <div className="text-center p-6 border border-dashed rounded-xl bg-secondary/10">
                        <p className="text-xs text-muted-foreground">Chưa có tài khoản {config.name} nào.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      {platformCredentials.map((credential) => (
                        <PlatformSettingsCard
                          key={credential.id}
                          platform={platform} config={config} credential={credential}
                          testResult={testResults[credential.id]}
                          onSave={saveCredential} onDelete={deleteCredential} onTest={testConnection}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeMenu === 'hashtags' && (
            <div className="p-6 max-w-2xl animate-fade-in">
              <h2 className="text-lg font-bold mb-1">Cấu hình Hashtag (#)</h2>
              <p className="text-xs text-muted-foreground mb-6">Thêm các thẻ để gợi ý tự động khi bạn gõ "#" trong lúc biên soạn bài đăng.</p>
              
              <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">#</span>
                  <Input 
                    placeholder="Nhập hashtag mới (VD: thoitrang)" 
                    value={newHashtag} onChange={e=>setNewHashtag(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleAddHashtag()}
                    className="pl-7"
                  />
                </div>
                <Button onClick={handleAddHashtag}>Thêm thẻ</Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {hashtags.map(tag => (
                  <Badge key={tag} variant="secondary" className="px-3 py-1.5 text-xs font-medium gap-2">
                    #{tag}
                    <button onClick={() => deleteHashtag(tag)} className="text-muted-foreground hover:text-danger ml-1 p-0.5"><XCircle className="w-3.5 h-3.5" /></button>
                  </Badge>
                ))}
                {hashtags.length === 0 && <p className="text-xs text-muted-foreground">Danh sách hashtag đang trống.</p>}
              </div>
            </div>
          )}

          {activeMenu === 'banking' && (
            <div className="p-6 space-y-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Cấu hình Thanh toán / STK</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Thiết lập STK để điền nhanh và khởi tạo mã QR nhận tiền tự động.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Ngân hàng thụ hưởng (Tên hoặc viết tắt)</label>
                    <Input 
                      value={bankInfo?.bankName || ''} 
                      onChange={(e) => updateBankInfo({ bankName: e.target.value })} 
                      placeholder="VD: MB Bank, Vietcombank..."
                      className="bg-secondary/30 border-border/50 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Mã Ngân hàng (BIN) - Dùng tạo QR</label>
                    <Input 
                      value={bankInfo?.bin || ''} 
                      onChange={(e) => updateBankInfo({ bin: e.target.value })} 
                      placeholder="VD: 970422"
                      className="bg-secondary/30 border-border/50 font-mono text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Mã định danh (BIN) là số cần thiết để VietQR hoạt động. 
                      VD: MB Bank là <strong className="text-foreground">970422</strong>, Vietcombank là <strong className="text-foreground">970436</strong>.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Số Tài khoản</label>
                    <Input 
                      value={bankInfo?.accountNo || ''} 
                      onChange={(e) => updateBankInfo({ accountNo: e.target.value })} 
                      placeholder="VD: 123456789"
                      className="bg-secondary/30 border-border/50 font-mono text-sm tracking-widest"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Tên Chủ tài khoản</label>
                    <Input 
                      value={bankInfo?.accountName || ''} 
                      onChange={(e) => updateBankInfo({ accountName: e.target.value.toUpperCase() })} 
                      placeholder="VD: NGUYEN VAN A"
                      className="bg-secondary/30 border-border/50 uppercase text-sm font-semibold"
                    />
                  </div>
                </div>
                
                <div className="p-5 bg-card/50 border border-border/50 rounded-2xl h-fit shadow-sm">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" /> Xem trước Mã QR
                  </h3>
                  <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-inner border border-border/30">
                    {(bankInfo?.bin && bankInfo?.accountNo) ? (
                      <img 
                        src={`https://img.vietqr.io/image/${bankInfo.bin}-${bankInfo.accountNo}-compact2.jpg?accountName=${encodeURIComponent(bankInfo.accountName || '')}&amount=0&addInfo=Thanh%20Toan`} 
                        alt="VietQR Preview"
                        className="w-48 h-48 object-contain"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/200?text=L%E1%BB%97i+QR+M%C3%A3+BIN'; }}
                      />
                    ) : (
                      <div className="w-48 h-48 bg-secondary/10 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                        <CreditCard className="w-8 h-8 mb-2 opacity-20" />
                        <span className="text-[10px] text-center px-4">Nhập đủ BIN và STK<br/>để thiết kế mã QR</span>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-dashed border-border/50 w-full">
                      <div className="text-xs text-center text-foreground/80 space-y-1 w-full font-medium">
                        <p className="text-[13px]">{bankInfo?.bankName || 'Chưa nhập ngân hàng'}</p>
                        <p className="text-base text-primary/80 font-bold tracking-widest">{bankInfo?.accountNo || 'STK'}</p>
                        <p>{bankInfo?.accountName || 'CHỦ TÀI KHOẢN'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'quickreplies' && (
            <div className="p-6 max-w-3xl animate-fade-in">
              <h2 className="text-lg font-bold mb-1">Mẫu tư vấn nhanh (/)</h2>
              <p className="text-xs text-muted-foreground mb-6">Phiếu câu trả lời mẫu khi trò chuyện với khách. Gõ "/" trong ô chat để gọi cứu viện!</p>
              
              <div className="bg-secondary/20 border border-border/50 rounded-xl p-4 mb-6 grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Mã lệnh (Ví dụ: /gia)</label>
                    <Input placeholder="/gia" value={qrCommand} onChange={e=>setQrCommand(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Tên hiển thị (Ví dụ: Báo giá)</label>
                    <Input placeholder="Báo giá iPhone" value={qrLabel} onChange={e=>setQrLabel(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Nội dung tự động điền</label>
                  <Input placeholder="Dạ sản phẩm này đang có giá ưu đãi là..." value={qrContent} onChange={e=>setQrContent(e.target.value)} />
                </div>
                <Button onClick={handleAddQuickReply} className="w-full">Lưu mẫu tự động</Button>
              </div>

              <div className="space-y-3">
                {quickReplies.map(qr => (
                  <div key={qr.id} className="flex items-start justify-between bg-card border border-border/50 p-4 rounded-xl shadow-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-mono text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">{qr.command}</code>
                        <span className="text-sm font-semibold">{qr.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{qr.content}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-danger hover:bg-danger/10 hover:text-danger" onClick={() => deleteQuickReply(qr.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMenu === 'permissions' && (
            <div className="p-6 max-w-5xl animate-fade-in relative z-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Quản lý Nhân sự & Phân quyền</h2>
                  <p className="text-xs text-muted-foreground mt-1">Cấp quyền truy cập hệ thống và quản lý Tên đăng nhập mật khẩu cho nhân viên.</p>
                </div>
                <Button size="sm" className="gap-2" onClick={handleAddNewStaffClick}>
                  <Users className="w-3.5 h-3.5" /> Thêm nhân viên mới
                </Button>
              </div>

              <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-secondary/50 border-b border-border">
                    <tr>
                      <th className="px-5 py-3 font-medium">Nhân sự</th>
                      <th className="px-5 py-3 font-medium">Đăng nhập</th>
                      <th className="px-5 py-3 font-medium text-center border-l border-border/50">Đăng bài</th>
                      <th className="px-5 py-3 font-medium text-center border-l border-border/50">Tư vấn</th>
                      <th className="px-5 py-3 font-medium text-center border-l border-border/50">Số liệu</th>
                      <th className="px-5 py-3 font-medium text-center border-l border-border/50">#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staffList?.map((staff) => (
                      <tr key={staff.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold">{staff.name}</span>
                            <span className="text-[11px] text-muted-foreground">{staff.role}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                           <div className="flex flex-col">
                            <code className="text-[11px] font-bold text-primary">{staff.username}</code>
                            <span className="text-[10px] text-muted-foreground/80">Mật khẩu: {staff.password}</span>
                           </div>
                        </td>
                        <td className="px-5 py-3 text-center border-l border-border/50">
                          <input 
                            type="checkbox" 
                            checked={staff.permissions?.post}
                            onChange={(e) => updateStaffPermissions(staff.id, { post: e.target.checked })}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3 text-center border-l border-border/50">
                          <input 
                            type="checkbox" 
                            checked={staff.permissions?.chat}
                            onChange={(e) => updateStaffPermissions(staff.id, { chat: e.target.checked })}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3 text-center border-l border-border/50">
                          <input 
                            type="checkbox" 
                            checked={staff.permissions?.analytics}
                            onChange={(e) => updateStaffPermissions(staff.id, { analytics: e.target.checked })}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3 text-center border-l border-border/50">
                           <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEditStaff(staff)}>
                             <Settings className="w-3.5 h-3.5" />
                           </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Overlay Modal for Staff Editing */}
              {editingStaffId && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                   <div className="bg-card w-[400px] border border-border shadow-2xl rounded-2xl p-6 animate-in zoom-in-95 duration-200">
                     <h3 className="font-bold text-base mb-4">{editingStaffId === 'NEW' ? 'Tạo tài khoản Nhân sự' : 'Chỉnh sửa tài khoản'}</h3>
                     <form onSubmit={handleSaveStaff} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                           <div>
                             <label className="text-xs font-medium text-foreground mb-1 block">Tên nhân viên (*)</label>
                             <Input required value={staffFormData.name} onChange={e=>setStaffFormData(p=>({...p, name: e.target.value}))} placeholder="Vd: Nguyễn Khách" className="bg-secondary/30 h-9 text-xs" />
                           </div>
                           <div>
                             <label className="text-xs font-medium text-foreground mb-1 block">Vị trí, vai trò</label>
                             <Input value={staffFormData.role} onChange={e=>setStaffFormData(p=>({...p, role: e.target.value}))} placeholder="Tư vấn viên" className="bg-secondary/30 h-9 text-xs" />
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <div>
                             <label className="text-xs font-medium text-foreground mb-1 block">Tên đăng nhập (*)</label>
                             <Input required value={staffFormData.username} onChange={e=>setStaffFormData(p=>({...p, username: e.target.value}))} placeholder="tuvan01" className="font-mono bg-secondary/30 h-9 text-xs" />
                           </div>
                           <div>
                             <label className="text-xs font-medium text-foreground mb-1 block">Mật khẩu (*)</label>
                             <Input required value={staffFormData.password} onChange={e=>setStaffFormData(p=>({...p, password: e.target.value}))} placeholder="Mật khẩu" type="text" className="font-mono bg-secondary/30 h-9 text-xs" />
                           </div>
                        </div>
                        <div className="pt-4 border-t border-border/50 flex items-center justify-between mt-2">
                           {editingStaffId !== 'NEW' && editingStaffId !== '3' ? (
                             <Button type="button" variant="outline" className="text-danger border-danger/20 hover:bg-danger/10 text-xs h-8" onClick={() => { deleteStaff(editingStaffId); setEditingStaffId(null); }}>Xóa tài khoản</Button>
                           ) : <div />}
                           <div className="flex gap-2">
                             <Button type="button" variant="ghost" className="text-xs h-8" onClick={() => setEditingStaffId(null)}>Hủy</Button>
                             <Button type="submit" className="text-xs h-8">Lưu T.Tin</Button>
                           </div>
                        </div>
                     </form>
                   </div>
                </div>
              )}
            </div>
          )}

        </ScrollArea>
      </div>
    </div>
  );
}

function PlatformSettingsCard({ platform, config, credential, testResult, onSave, onDelete, onTest }) {
  const [formData, setFormData] = useState({ 
    ...(credential || {}),
    name: credential?.name || '', 
    accountId: credential?.accountId || '', 
  });
  const [showSensitive, setShowSensitive] = useState({});
  const [isEditing, setIsEditing] = useState(credential?.isDraft || false);
  const [activeTab, setActiveTab] = useState('api'); // 'api' | 'webhook'

  // OAuth states
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const [facebookPages, setFacebookPages] = useState([]); // FB pages picker
  const [showPagesPicker, setShowPagesPicker] = useState(false);
  const [pendingTokenData, setPendingTokenData] = useState(null);

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    onSave({ id: credential?.id, platform, label: config.name, ...formData });
    setIsEditing(false);
  };

  // ── OAuth Handler ────────────────────────────────
  const handleOAuth = async () => {
    setOauthError('');

    // Kiểm tra xem Electron IPC có sẵn không
    const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.startOAuthFlow;

    // Lấy app keys từ form hiện tại
    const appKeys = {
      appId: formData.appId,
      appSecret: formData.appSecret,
      clientId: formData.clientId || formData.appId,
      clientSecret: formData.clientSecret || formData.appSecret,
      clientKey: formData.appId, // TikTok dùng clientKey
    };

    // Kiểm tra bắt buộc có App credentials trước
    const needsKeys = {
      facebook: !formData.appId || !formData.appSecret,
      google: !formData.clientId && !formData.appId,
      tiktok: !formData.appId,
    };
    if (needsKeys[platform]) {
      setOauthError('Vui lòng nhập App ID và App Secret trước khi đăng nhập OAuth.');
      setIsEditing(true);
      return;
    }

    setOauthLoading(true);
    try {
      let tokenData;

      if (isElectron) {
        const result = await window.electronAPI.startOAuthFlow(platform, appKeys);
        if (!result.success) throw new Error(result.error);
        tokenData = result.data;
      } else {
        // ── Web Mode: Use Server-side OAuth + Polling ──────────
        const state = `web_${platform}_${Date.now()}`;
        const initRes = await api.post('/oauth/initiate', { platform, clientKey: appKeys.clientKey || appKeys.appId, clientSecret: appKeys.clientSecret, state });
        
        if (!initRes.data?.authUrl) throw new Error('Không thể khởi tạo luồng đăng nhập.');

        // Open login window
        const authWindow = window.open(initRes.data.authUrl, 'OmniAuth', 'width=600,height=700');
        
        // Poll for result
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes
        
        while (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 5000)); // check every 5s
          attempts++;
          
          if (authWindow?.closed && attempts < 2) continue; // window closed early?

          const res = await api.get(`/oauth/result/${state}`);
          if (res.data?.success) {
            tokenData = res.data.data;
            if (authWindow) authWindow.close();
            break;
          }
          if (res.data?.error) throw new Error(res.data.error);
        }

        if (!tokenData) throw new Error('Hết thời gian chờ đăng nhập. Vui lòng thử lại.');
      }

      // Facebook có nhiều Pages → hiển bộ lấy Page
      if (platform === 'facebook' && tokenData.pages?.length > 1) {
        setPendingTokenData(tokenData);
        setFacebookPages(tokenData.pages);
        setShowPagesPicker(true);
        return;
      }

      // Không có nhiều pages: lưu luôn
      applyTokenToForm(platform, tokenData, tokenData.pages?.[0]);

    } catch (err) {
      setOauthError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setOauthLoading(false);
    }
  };

  const applyTokenToForm = (platform, tokenData, selectedPage) => {
    const newData = { ...formData };

    if (platform === 'facebook') {
      newData.accessToken = selectedPage?.access_token || tokenData.accessToken;
      newData.accountId = selectedPage?.id || '';
      if (selectedPage?.name && !newData.name) newData.name = selectedPage.name;
    } else if (platform === 'google') {
      newData.accessToken = tokenData.accessToken;
      newData.refreshToken = tokenData.refreshToken;
      newData.channelId = tokenData.channelId || '';
      newData.accountId = tokenData.channelId || '';
      if (tokenData.channelName && !newData.name) newData.name = tokenData.channelName;
    } else if (platform === 'tiktok') {
      newData.accessToken = tokenData.accessToken;
      newData.refreshToken = tokenData.refreshToken;
      newData.accountId = tokenData.openId || '';
    }

    setFormData(newData);
    setShowPagesPicker(false);
    setPendingTokenData(null);
    setIsEditing(true); // cho phép review trước khi save
  };


  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlatformBadge platform={platform} size="lg" />
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                {config.name}
                {credential?.isActive ? (
                  <Badge variant="success" className="text-[9px] gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Kết nối
                  </Badge>
                ) : credential ? (
                  <Badge variant="danger" className="text-[9px] gap-1">
                    <XCircle className="w-2.5 h-2.5" /> Ngắt
                  </Badge>
                ) : null}
              </CardTitle>
              <CardDescription className="text-[11px] flex items-center gap-2">
                {config.description}
                <a href={config.docsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                  Docs <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </CardDescription>
            </div>
          </div>

          {/* OAuth button */}
          {config.hasOAuth && (
            <div className="flex flex-col items-end gap-1">
              <Button
                className={cn('gap-2 text-xs text-white', config.oauthColor)}
                onClick={handleOAuth}
                disabled={oauthLoading}
              >
                {oauthLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <LogIn className="w-3.5 h-3.5" />
                }
                {oauthLoading ? 'Đang kết nối...' : config.oauthLabel}
              </Button>
              {oauthError && (
                <p className="text-[10px] text-danger text-right max-w-[240px]">{oauthError}</p>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/30 pb-2">
          <button
            onClick={() => setActiveTab('api')}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
              activeTab === 'api' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Key className="w-3 h-3" /> API Keys
          </button>
          {config.webhookFields?.length > 0 && (
            <button
              onClick={() => setActiveTab('webhook')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                activeTab === 'webhook' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Webhook className="w-3 h-3" /> Webhook
            </button>
          )}
        </div>

        {/* API Fields */}
        {activeTab === 'api' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  Tên hiển thị (Tự đặt)
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: FB Page Chính"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  disabled={!isEditing}
                  className="bg-secondary/30 text-[11px] h-9"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  Page / OA / Account ID
                </label>
                <Input
                  type="text"
                  placeholder="Nhập ID kênh"
                  value={formData.accountId || ''}
                  onChange={(e) => updateField('accountId', e.target.value)}
                  disabled={!isEditing}
                  className="font-mono bg-secondary/30 text-[11px] h-9"
                />
              </div>
            </div>
            
            {config.fields.map((field) => {
              if (field.key === 'pageId') return null; // We already added our own AccountID field safely above

              return (
              <div key={field.key}>
                <label className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  {field.label}
                </label>
                <div className="relative">
                  <Input
                    type={field.sensitive && !showSensitive[field.key] ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    disabled={!isEditing}
                    className="pr-9 bg-secondary/30 font-mono text-[11px] h-9"
                  />
                  {field.sensitive && (
                    <button
                      onClick={() => setShowSensitive((p) => ({ ...p, [field.key]: !p[field.key] }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSensitive[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}

        {/* Webhook Fields */}
        {activeTab === 'webhook' && config.webhookFields?.length > 0 && (
          <div className="space-y-3">
            {config.webhookFields.map((field) => (
              <div key={field.key}>
                <label className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {field.label}
                </label>
                <Input
                  placeholder={field.placeholder}
                  value={formData[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  disabled={!isEditing}
                  className="bg-secondary/30 font-mono text-[11px] h-9"
                />
              </div>
            ))}
          </div>
        )}

        {/* Test result */}
        {testResult && !testResult.loading && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
            testResult.success ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'
          )}>
            {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {testResult.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/20">
          {isEditing ? (
            <>
              <Button size="sm" className="gap-1 text-xs h-8" onClick={handleSave}>
                <Save className="w-3 h-3" /> Lưu
              </Button>
              {credential && (
                <Button size="sm" variant="secondary" className="text-xs h-8" onClick={() => setIsEditing(false)}>
                  Hủy
                </Button>
              )}
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" className="gap-1 text-xs h-8" onClick={() => setIsEditing(true)}>
                <Key className="w-3 h-3" /> Chỉnh sửa
              </Button>
              <Button
                size="sm" variant="outline" className="gap-1 text-xs h-8"
                onClick={() => onTest(credential?.id)}
                disabled={testResult?.loading}
              >
                {testResult?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Test
              </Button>
              <Button
                size="sm" variant="ghost"
                className="gap-1 text-xs h-8 text-danger hover:text-danger hover:bg-danger/10 ml-auto"
                onClick={() => onDelete(credential?.id)}
              >
                <Trash2 className="w-3 h-3" /> Xóa
              </Button>
            </>
          )}
        </div>
      </CardContent>

      {/* Facebook Pages Picker Modal */}
      {showPagesPicker && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-[420px] border border-border shadow-2xl rounded-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div>
                <h2 className="text-[15px] font-bold">Chọn Facebook Page</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tài khoản của bạn quản lý {facebookPages.length} trang. Chọn trang muốn kết nối:
                </p>
              </div>
              <button onClick={() => setShowPagesPicker(false)} className="p-1 rounded-full hover:bg-secondary">
                <XCircle className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
              {facebookPages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => { setOauthLoading(false); applyTokenToForm('facebook', pendingTokenData, page); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center shrink-0 text-[#1877F2] font-bold text-lg">
                    f
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold group-hover:text-primary transition-colors">{page.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">ID: {page.id}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

