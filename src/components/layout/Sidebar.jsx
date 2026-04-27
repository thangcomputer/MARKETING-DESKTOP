import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useInboxStore } from '@/stores/useInboxStore';
import { useThemeStore } from '@/stores/useThemeStore';
import {
  MessageSquare,
  CalendarClock,
  Users,
  BarChart3,
  Settings,
  Zap,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/useSettingsStore';

const navItems = [
  { id: 'inbox', label: 'Hộp thư', icon: MessageSquare, path: '/' },
  { id: 'campaigns', label: 'Chiến dịch', icon: CalendarClock, path: '/campaigns' },
  { id: 'customers', label: 'Khách hàng', icon: Users, path: '/customers' },
  { id: 'analytics', label: 'Thống kê', icon: BarChart3, path: '/analytics' },
];

const bottomItems = [
  { id: 'settings', label: 'Cài đặt', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const totalUnread = useInboxStore((s) => s.getTotalUnread());
  const { theme, toggleTheme } = useThemeStore();
  const { currentUser, logout } = useSettingsStore();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const renderNavButton = (item) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => navigate(item.path)}
        className={cn('sidebar-item group', active && 'active')}
        title={item.label}
      >
        <Icon className={cn('w-5 h-5', active ? 'text-primary' : '')} />
        {/* Unread badge */}
        {item.id === 'inbox' && totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center px-1">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
        {/* Tooltip */}
        <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-popover border border-border text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <aside className="flex flex-col items-center w-[68px] h-full bg-sidebar border-r border-border/40 py-3 shrink-0">
      {/* Logo */}
      <div className="mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/25 cursor-pointer hover:shadow-primary/40 transition-shadow">
          <Zap className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Separator */}
      <div className="w-8 h-px bg-border/60 mb-3" />

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col items-center gap-1.5">
        {navItems.map(renderNavButton)}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-1.5">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-item"
          title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Separator */}
        <div className="w-8 h-px bg-border/60 my-1" />

        {bottomItems.map(renderNavButton)}

        {/* User Info Tooltip & Avatar */}
        <div className="mt-2 group relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-xs font-bold text-foreground cursor-default uppercase ring-2 ring-transparent transition-all">
            {currentUser?.username?.substring(0, 2) || 'AD'}
          </div>
          <span className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-popover border border-border text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
             <span className="block font-bold">{currentUser?.name}</span>
             <span className="text-[10px] text-muted-foreground">{currentUser?.role}</span>
          </span>
        </div>

        {/* Clear Logout Button */}
        <button
          onClick={() => logout()}
          className="sidebar-item mt-1 group"
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut className="w-5 h-5 text-danger/70 group-hover:text-danger mix-blend-luminosity" />
        </button>
      </div>
    </aside>
  );
}
