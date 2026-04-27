import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Users,
  Eye,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import PlatformBadge from '@/components/inbox/PlatformBadge';

/**
 * Analytics Page — dashboard overview with metrics
 */
export default function AnalyticsPage() {
  const metrics = [
    { label: 'Tổng tin nhắn', value: '1,248', change: '+12%', up: true, icon: MessageSquare, color: 'text-primary' },
    { label: 'Khách hàng mới', value: '86', change: '+24%', up: true, icon: Users, color: 'text-success' },
    { label: 'Lượt xem bài', value: '14.2K', change: '+8%', up: true, icon: Eye, color: 'text-zalo' },
    { label: 'Bài đã đăng', value: '32', change: '-3%', up: false, icon: Calendar, color: 'text-warning' },
  ];

  const platformStats = [
    { platform: 'facebook', messages: 523, customers: 34, engagement: '4.2%' },
    { platform: 'zalo', messages: 412, customers: 28, engagement: '6.8%' },
    { platform: 'tiktok', messages: 313, customers: 24, engagement: '8.1%' },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Thống kê</h1>
            <p className="text-xs text-muted-foreground">Tổng quan hiệu suất 30 ngày qua</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center">
                      <Icon className={`w-4.5 h-4.5 ${m.color}`} />
                    </div>
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${m.up ? 'text-success' : 'text-danger'}`}>
                      {m.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {m.change}
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{m.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Platform Breakdown */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Phân tích theo nền tảng
            </h3>
            <div className="space-y-4">
              {platformStats.map((ps) => (
                <div key={ps.platform} className="flex items-center gap-4">
                  <PlatformBadge platform={ps.platform} size="md" showLabel />
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-lg font-bold">{ps.messages}</p>
                      <p className="text-[10px] text-muted-foreground">Tin nhắn</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{ps.customers}</p>
                      <p className="text-[10px] text-muted-foreground">Khách hàng</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{ps.engagement}</p>
                      <p className="text-[10px] text-muted-foreground">Tương tác</p>
                    </div>
                  </div>
                  {/* Simple bar visualization */}
                  <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(ps.messages / 523) * 100}%`,
                        backgroundColor: ps.platform === 'facebook' ? '#1877f2' : ps.platform === 'zalo' ? '#0068ff' : '#ff0050'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Placeholder chart area */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Xu hướng tin nhắn (7 ngày)</h3>
            <div className="h-[200px] flex items-end justify-between gap-2 px-4">
              {[65, 42, 78, 55, 90, 68, 85].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-primary/20 rounded-t-md relative group hover:bg-primary/30 transition-colors"
                    style={{ height: `${val}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-popover text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-border">
                      {Math.floor(val * 1.8)} tin
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-1/3 bg-primary/30 rounded-t-md" />
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
