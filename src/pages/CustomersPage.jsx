import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInboxStore } from '@/stores/useInboxStore';
import { useNavigate } from 'react-router-dom';
import PlatformBadge from '@/components/inbox/PlatformBadge';
import {
  Users,
  Search,
  Filter,
  Download,
  Phone,
  Mail,
  Tag,
  MoreVertical,
} from 'lucide-react';

/**
 * Customers CRM Page — contact management table view
 */
export default function CustomersPage() {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('all');
  const navigate = useNavigate();
  const { conversations, deleteConversation, setActiveConversation } = useInboxStore();
  
  // Flatten conversations into a customer list
  let customers = conversations.map((c) => ({
    ...c,
    totalMessages: Math.floor(Math.random() * 20) + 3,
    lastActive: c.lastMessageAt,
  }));

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    customers = customers.filter(c => 
      c.participantName.toLowerCase().includes(q) ||
      (c.participantPhone && c.participantPhone.includes(q))
    );
  }

  if (platformFilter !== 'all') {
    customers = customers.filter(c => c.platform === platformFilter);
  }

  const handleExportCSV = () => {
    const headers = ['Khach Hang', 'Nen Tang', 'SDT', 'Ghi Chu', 'Tin Nhan'];
    const csvContent = [
      headers.join(','),
      ...customers.map(c => [
        `"${c.participantName}"`,
        `"${c.platform}"`,
        `"${c.participantPhone || ''}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
        c.totalMessages
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DS_KhachHang_CRM_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Khách hàng</h1>
            <p className="text-xs text-muted-foreground">{customers.length} liên hệ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm khách hàng (Tên, SĐT)..." 
              className="pl-8 h-9 w-[240px] text-xs" 
            />
          </div>
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm" 
              className={cn("gap-1.5 text-xs transition-colors", platformFilter !== 'all' ? "bg-primary/10 text-primary border-primary/20" : "")} 
              onClick={() => setShowFilter(!showFilter)}
            >
              <Filter className="w-3.5 h-3.5" /> Lọc {platformFilter !== 'all' && `(${platformFilter})`}
            </Button>
            {showFilter && (
              <>
                 <div className="fixed inset-0 z-40" onClick={() => setShowFilter(false)} />
                 <div className="absolute top-full right-0 mt-2 w-40 bg-card border border-border shadow-xl rounded-xl z-50 p-1.5 animate-in fade-in zoom-in-95">
                   <button onClick={() => { setPlatformFilter('all'); setShowFilter(false); }} className={cn("w-full text-left px-3 py-2 text-xs hover:bg-secondary rounded-lg mb-1 transition-colors", platformFilter === 'all' ? "bg-secondary font-bold text-foreground" : "text-muted-foreground")}>Tất cả nền tảng</button>
                   <button onClick={() => { setPlatformFilter('zalo'); setShowFilter(false); }} className={cn("w-full text-left px-3 py-2 text-xs hover:bg-secondary rounded-lg mb-1 transition-colors", platformFilter === 'zalo' ? "bg-[#0068ff]/10 text-[#0068ff] font-bold" : "text-muted-foreground")}>Zalo OA</button>
                   <button onClick={() => { setPlatformFilter('facebook'); setShowFilter(false); }} className={cn("w-full text-left px-3 py-2 text-xs hover:bg-secondary rounded-lg mb-1 transition-colors", platformFilter === 'facebook' ? "bg-[#0866ff]/10 text-[#0866ff] font-bold" : "text-muted-foreground")}>Facebook</button>
                   <button onClick={() => { setPlatformFilter('tiktok'); setShowFilter(false); }} className={cn("w-full text-left px-3 py-2 text-xs hover:bg-secondary rounded-lg mb-1 transition-colors", platformFilter === 'tiktok' ? "bg-foreground/10 text-foreground font-bold" : "text-muted-foreground")}>TikTok</button>
                   <button onClick={() => { setPlatformFilter('youtube'); setShowFilter(false); }} className={cn("w-full text-left px-3 py-2 text-xs hover:bg-secondary rounded-lg transition-colors", platformFilter === 'youtube' ? "bg-[#ff0000]/10 text-[#ff0000] font-bold" : "text-muted-foreground")}>YouTube</button>
                 </div>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-colors" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5" /> Xuất CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-2">Khách hàng</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-2">Nền tảng</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-2">SĐT</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-2">Nhãn</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-2">Ghi chú</th>
                <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-2">Tin nhắn</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border/20 hover:bg-secondary/30 transition-colors group">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-[10px]">
                          {c.participantName.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium">{c.participantName}</p>
                        {c.participantEmail && (
                          <p className="text-[10px] text-muted-foreground">{c.participantEmail}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <PlatformBadge platform={c.platform} size="sm" showLabel />
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-xs text-muted-foreground">{c.participantPhone || '—'}</span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.slice(0, 2).map((t) => (
                        <span key={t} className="tag-badge">{t}</span>
                      ))}
                      {c.tags?.length > 2 && (
                        <span className="text-[9px] text-muted-foreground">+{c.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{c.notes || '—'}</p>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-xs text-muted-foreground">{c.totalMessages}</span>
                  </td>
                  <td className="py-3 px-2 relative z-10 w-12 text-right pr-4">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === c.id ? null : c.id)}
                      className={cn("p-1.5 rounded-lg transition-all", activeMenuId === c.id ? "opacity-100 bg-secondary text-foreground" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary")}
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {activeMenuId === c.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                        <div className="absolute right-8 top-8 w-44 bg-card border border-border/50 shadow-xl rounded-xl z-50 animate-in fade-in zoom-in-95 py-1">
                          <button 
                            onClick={() => { 
                              setActiveConversation(c.id); 
                              navigate('/'); 
                            }} 
                            className="w-full flex items-center px-4 py-2 text-xs hover:bg-secondary text-muted-foreground hover:text-foreground"
                          >
                            Nhắn tin cho KH
                          </button>
                          <div className="h-px bg-border/40 my-1 w-full mx-auto max-w-[90%]" />
                          <button 
                            onClick={() => { 
                              deleteConversation(c.id); 
                              setActiveMenuId(null); 
                            }} 
                            className="w-full flex items-center px-4 py-2 text-xs hover:bg-danger/10 text-danger transition-colors font-medium"
                          >
                            Xóa hồ sơ
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}
