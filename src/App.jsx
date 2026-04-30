import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import InboxPage from './pages/InboxPage';
import SchedulerPage from './pages/SchedulerPage';
import CustomersPage from './pages/CustomersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import { useSettingsStore } from './stores/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield } from 'lucide-react';

function LoginScreen() {
  const login = useSettingsStore(state => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!login(username, password)) {
      setError('Tên đăng nhập hoặc mật khẩu không chính xác!');
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-background fixed inset-0 z-[100] bg-dot-pattern">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-background to-secondary/20 pointer-events-none" />
      <div className="w-[420px] p-8 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-3xl animate-in slide-in-from-bottom-6 fade-in duration-500 relative">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SocialManager</h1>
          <p className="text-sm text-muted-foreground mt-2">Hệ thống quản lý tương tác OmniChannel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[13px] font-medium text-foreground mb-2 block">Tên đăng nhập</label>
            <Input autoFocus required placeholder="tuvan, marketing, admin..." value={username} onChange={e => {setUsername(e.target.value); setError('');}} className="h-11 bg-secondary/50 focus-visible:bg-background" />
          </div>
          <div>
            <label className="text-[13px] font-medium text-foreground mb-2 block">Mật khẩu</label>
            <Input required type="password" placeholder="••••••••" value={password} onChange={e => {setPassword(e.target.value); setError('');}} className="h-11 bg-secondary/50 focus-visible:bg-background" />
          </div>
          
          {error && <div className="p-2.5 bg-danger/10 border border-danger/20 rounded-lg"><p className="text-xs text-danger font-medium text-center">{error}</p></div>}
          
          <Button type="submit" className="w-full mt-4 h-12 text-sm shadow-md font-bold tracking-wide">ĐĂNG NHẬP HỆ THỐNG</Button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-border/40">
           <p className="text-[11px] text-muted-foreground/80 font-medium mb-1">Tài khoản trải nghiệm nội bộ:</p>
           <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
             <span className="bg-secondary px-2 py-1 rounded">Admin: <b>admin / 1</b></span>
             <span className="bg-secondary px-2 py-1 rounded">Chat: <b>tuvan / 1</b></span>
           </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Root App — HashRouter for Electron file:// compatibility
 */
export default function App() {
  const currentUser = useSettingsStore(state => state.currentUser);
  const logout = useSettingsStore(state => state.logout);

  // Auto-logout after 10 mins of inactivity
  useEffect(() => {
    if (!currentUser) return;
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
         logout();
      }, 10 * 60 * 1000); // 10 minutes
    };
    
    resetTimer(); // Init
    
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser, logout]);

  if (!currentUser) return <LoginScreen />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<InboxPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/campaigns" element={<SchedulerPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
