import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useThemeStore } from '@/stores/useThemeStore';

export default function AppLayout() {
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Thin Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Titlebar drag region */}
        <div className="h-8 drag-region shrink-0 bg-background/50 border-b border-border/20" />

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
