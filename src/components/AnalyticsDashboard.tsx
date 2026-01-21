'use client';

import { useMemo } from 'react';
import { 
  BarChart3, 
  Clock, 
  FileText, 
  TrendingUp,
  Calendar,
  Smile,
  Meh,
  Frown
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { MODES, type EnrichmentMode } from '@/types';

export function AnalyticsDashboard() {
  const { notes } = useAppStore();

  const analytics = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const notesThisWeek = notes.filter(n => new Date(n.createdAt) >= weekAgo).length;
    const notesThisMonth = notes.filter(n => new Date(n.createdAt) >= monthAgo).length;
    
    const totalDuration = notes.reduce((sum, n) => sum + (n.duration || 0), 0);
    const averageDuration = notes.length > 0 ? totalDuration / notes.length : 0;

    const sentimentBreakdown = {
      positive: notes.filter(n => n.sentiment === 'positive').length,
      neutral: notes.filter(n => n.sentiment === 'neutral').length,
      negative: notes.filter(n => n.sentiment === 'negative').length,
    };

    const modeBreakdown = Object.keys(MODES).reduce((acc, mode) => {
      acc[mode as EnrichmentMode] = notes.filter(n => n.mode === mode).length;
      return acc;
    }, {} as Record<EnrichmentMode, number>);

    // Daily activity for last 7 days
    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('de-DE', { weekday: 'short' });
      const count = notes.filter(n => {
        const noteDate = new Date(n.createdAt);
        return noteDate.toDateString() === date.toDateString();
      }).length;
      dailyActivity.push({ date: dateStr, count });
    }

    return {
      totalNotes: notes.length,
      totalDuration,
      notesThisWeek,
      notesThisMonth,
      averageDuration,
      sentimentBreakdown,
      modeBreakdown,
      dailyActivity,
    };
  }, [notes]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 60) {
      const hours = Math.floor(mins / 60);
      return `${hours}h ${mins % 60}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const maxDailyCount = Math.max(...analytics.dailyActivity.map(d => d.count), 1);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-purple-400" />
        Analytics Dashboard
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Gesamte Notizen"
          value={analytics.totalNotes}
          color="purple"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Gesamtdauer"
          value={formatDuration(analytics.totalDuration)}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Diese Woche"
          value={analytics.notesThisWeek}
          color="green"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Dieser Monat"
          value={analytics.notesThisMonth}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <div className="bg-[#1a1325] rounded-xl p-5 border border-purple-500/10">
          <h3 className="text-sm font-semibold text-zinc-400 mb-4">Aktivität (letzte 7 Tage)</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {analytics.dailyActivity.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-purple-500/30 rounded-t transition-all hover:bg-purple-500/50"
                  style={{ 
                    height: `${(day.count / maxDailyCount) * 100}%`,
                    minHeight: day.count > 0 ? '8px' : '2px'
                  }}
                />
                <span className="text-[10px] text-zinc-500">{day.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment Breakdown */}
        <div className="bg-[#1a1325] rounded-xl p-5 border border-purple-500/10">
          <h3 className="text-sm font-semibold text-zinc-400 mb-4">Stimmungsverteilung</h3>
          <div className="space-y-3">
            <SentimentBar 
              icon={<Smile className="w-4 h-4" />}
              label="Positiv" 
              count={analytics.sentimentBreakdown.positive} 
              total={analytics.totalNotes}
              color="green"
            />
            <SentimentBar 
              icon={<Meh className="w-4 h-4" />}
              label="Neutral" 
              count={analytics.sentimentBreakdown.neutral} 
              total={analytics.totalNotes}
              color="zinc"
            />
            <SentimentBar 
              icon={<Frown className="w-4 h-4" />}
              label="Negativ" 
              count={analytics.sentimentBreakdown.negative} 
              total={analytics.totalNotes}
              color="red"
            />
          </div>
        </div>
      </div>

      {/* Mode Breakdown */}
      <div className="bg-[#1a1325] rounded-xl p-5 border border-purple-500/10">
        <h3 className="text-sm font-semibold text-zinc-400 mb-4">Notizen nach Modus</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(MODES).map(([key, mode]) => (
            <div 
              key={key}
              className="bg-[#241b2f] rounded-lg p-3 text-center border border-purple-500/10"
            >
              <span className="text-2xl">{mode.icon}</span>
              <p className="text-lg font-bold text-white mt-1">
                {analytics.modeBreakdown[key as EnrichmentMode]}
              </p>
              <p className="text-[10px] text-zinc-500 truncate">{mode.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Productivity Score */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-5 border border-purple-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-400">Produktivitäts-Score</h3>
            <p className="text-4xl font-bold text-white mt-2">
              {Math.min(100, Math.round(analytics.notesThisWeek * 15 + analytics.totalDuration / 60))}
              <span className="text-lg text-zinc-500">/100</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-400">Durchschnitt pro Notiz</p>
            <p className="text-xl font-semibold text-purple-400">
              {formatDuration(analytics.averageDuration)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <div className="bg-[#1a1325] rounded-xl p-4 border border-purple-500/10">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function SentimentBar({ icon, label, count, total, color }: {
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500',
    zinc: 'bg-zinc-500',
    red: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`text-${color}-400`}>{icon}</div>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-zinc-400">{label}</span>
          <span className="text-zinc-500">{count} ({percentage.toFixed(0)}%)</span>
        </div>
        <div className="h-2 bg-[#241b2f] rounded-full overflow-hidden">
          <div 
            className={`h-full ${colorClasses[color]} rounded-full transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
