'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  Clock,
  FileText,
  TrendingUp,
  Calendar,
  Smile,
  Meh,
  Frown,
  FileBarChart,
  Download,
  ChevronDown,
  ChevronUp,
  Star,
  MessageSquare,
  Target
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { MODES, type EnrichmentMode } from '@/types';

export function AnalyticsDashboard() {
  const { notes } = useAppStore();
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);

  const analytics = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklyNotes = notes.filter(n => new Date(n.createdAt) >= weekAgo);
    const notesThisWeek = weeklyNotes.length;
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

    // Weekly Report Data
    const weeklyDuration = weeklyNotes.reduce((sum, n) => sum + (n.duration || 0), 0);
    const weeklyAvgDuration = weeklyNotes.length > 0 ? weeklyDuration / weeklyNotes.length : 0;

    const weeklySentiment = {
      positive: weeklyNotes.filter(n => n.sentiment === 'positive').length,
      neutral: weeklyNotes.filter(n => n.sentiment === 'neutral').length,
      negative: weeklyNotes.filter(n => n.sentiment === 'negative').length,
    };

    const weeklyModes = Object.keys(MODES).reduce((acc, mode) => {
      acc[mode as EnrichmentMode] = weeklyNotes.filter(n => n.mode === mode).length;
      return acc;
    }, {} as Record<EnrichmentMode, number>);

    // Most used mode this week
    const topMode = Object.entries(weeklyModes).sort((a, b) => b[1] - a[1])[0];

    // Important notes this week (starred)
    const importantNotes = weeklyNotes.filter(n => n.isImportant);

    // Recent summaries
    const recentSummaries = weeklyNotes
      .filter(n => n.summary)
      .slice(0, 5)
      .map(n => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        date: n.createdAt,
        mode: n.mode
      }));

    // Week date range
    const weekStart = new Date(weekAgo);
    const weekEnd = new Date(now);
    const weekRange = `${weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

    return {
      totalNotes: notes.length,
      totalDuration,
      notesThisWeek,
      notesThisMonth,
      averageDuration,
      sentimentBreakdown,
      modeBreakdown,
      dailyActivity,
      // Weekly Report
      weeklyReport: {
        dateRange: weekRange,
        totalNotes: notesThisWeek,
        totalDuration: weeklyDuration,
        avgDuration: weeklyAvgDuration,
        sentiment: weeklySentiment,
        modes: weeklyModes,
        topMode: topMode ? { mode: topMode[0], count: topMode[1] } : null,
        importantNotes: importantNotes.length,
        recentSummaries,
      }
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

      {/* Weekly Report Section */}
      <div className="bg-[#1a1325] rounded-xl border border-purple-500/10 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setShowWeeklyReport(!showWeeklyReport)}
          className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <FileBarChart className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">Wochenbericht</h3>
              <p className="text-xs text-zinc-500">{analytics.weeklyReport.dateRange}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
              {analytics.weeklyReport.totalNotes} Notizen
            </span>
            {showWeeklyReport ? (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            )}
          </div>
        </button>

        {/* Report Content */}
        {showWeeklyReport && (
          <div className="p-5 pt-0 space-y-5 border-t border-purple-500/10">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-[#241b2f] rounded-lg p-3 text-center">
                <FileText className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{analytics.weeklyReport.totalNotes}</p>
                <p className="text-[10px] text-zinc-500">Notizen erstellt</p>
              </div>
              <div className="bg-[#241b2f] rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{formatDuration(analytics.weeklyReport.totalDuration)}</p>
                <p className="text-[10px] text-zinc-500">Gesamtdauer</p>
              </div>
              <div className="bg-[#241b2f] rounded-lg p-3 text-center">
                <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{analytics.weeklyReport.importantNotes}</p>
                <p className="text-[10px] text-zinc-500">Wichtige Notizen</p>
              </div>
              <div className="bg-[#241b2f] rounded-lg p-3 text-center">
                <Target className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{formatDuration(analytics.weeklyReport.avgDuration)}</p>
                <p className="text-[10px] text-zinc-500">Durchschnitt</p>
              </div>
            </div>

            {/* Sentiment This Week */}
            <div className="bg-[#241b2f] rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                Stimmung diese Woche
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-white">{analytics.weeklyReport.sentiment.positive}</span>
                  <span className="text-xs text-zinc-500">positiv</span>
                </div>
                <div className="flex items-center gap-2">
                  <Meh className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-white">{analytics.weeklyReport.sentiment.neutral}</span>
                  <span className="text-xs text-zinc-500">neutral</span>
                </div>
                <div className="flex items-center gap-2">
                  <Frown className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-white">{analytics.weeklyReport.sentiment.negative}</span>
                  <span className="text-xs text-zinc-500">negativ</span>
                </div>
              </div>
              {/* Sentiment Bar */}
              <div className="mt-3 h-2 bg-[#1a1325] rounded-full overflow-hidden flex">
                {analytics.weeklyReport.totalNotes > 0 && (
                  <>
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${(analytics.weeklyReport.sentiment.positive / analytics.weeklyReport.totalNotes) * 100}%` }}
                    />
                    <div
                      className="h-full bg-zinc-500"
                      style={{ width: `${(analytics.weeklyReport.sentiment.neutral / analytics.weeklyReport.totalNotes) * 100}%` }}
                    />
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${(analytics.weeklyReport.sentiment.negative / analytics.weeklyReport.totalNotes) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Top Mode */}
            {analytics.weeklyReport.topMode && analytics.weeklyReport.topMode.count > 0 && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/20">
                <p className="text-xs text-zinc-500 mb-1">Meistgenutzter Modus</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{MODES[analytics.weeklyReport.topMode.mode as EnrichmentMode]?.icon}</span>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {MODES[analytics.weeklyReport.topMode.mode as EnrichmentMode]?.name}
                    </p>
                    <p className="text-xs text-zinc-400">{analytics.weeklyReport.topMode.count}x verwendet</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Summaries */}
            {analytics.weeklyReport.recentSummaries.length > 0 && (
              <div className="bg-[#241b2f] rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-3">Letzte Zusammenfassungen</h4>
                <div className="space-y-3">
                  {analytics.weeklyReport.recentSummaries.map((item) => (
                    <div key={item.id} className="p-3 bg-[#1a1325] rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{MODES[item.mode as EnrichmentMode]?.icon}</span>
                        <p className="text-sm font-medium text-white truncate">{item.title}</p>
                        <span className="text-[10px] text-zinc-500 ml-auto">
                          {new Date(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2">{item.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export Button */}
            <button
              onClick={() => {
                const report = {
                  title: 'VelaMind Wochenbericht',
                  dateRange: analytics.weeklyReport.dateRange,
                  stats: {
                    totalNotes: analytics.weeklyReport.totalNotes,
                    totalDuration: formatDuration(analytics.weeklyReport.totalDuration),
                    avgDuration: formatDuration(analytics.weeklyReport.avgDuration),
                    importantNotes: analytics.weeklyReport.importantNotes,
                  },
                  sentiment: analytics.weeklyReport.sentiment,
                  topMode: analytics.weeklyReport.topMode,
                  summaries: analytics.weeklyReport.recentSummaries,
                  generatedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `velamind-wochenbericht-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
              className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Wochenbericht exportieren
            </button>

            {/* Empty State */}
            {analytics.weeklyReport.totalNotes === 0 && (
              <div className="text-center py-8">
                <FileBarChart className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-500">Keine Notizen diese Woche</p>
                <p className="text-xs text-zinc-600 mt-1">Erstelle Notizen um deinen Wochenbericht zu sehen</p>
              </div>
            )}
          </div>
        )}
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
