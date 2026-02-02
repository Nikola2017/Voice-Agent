'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Mail, 
  Users, 
  Code2, 
  CheckSquare, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  User,
  LogOut,
  BarChart3,
  Settings,
  Mic,
  WifiOff,
  Calendar,
  X,
  Bot
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { MODES, type EnrichmentMode } from '@/types';

type View = 'notes' | 'analytics' | 'team' | 'settings';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const modeIcons: Record<EnrichmentMode, React.ReactNode> = {
  'smart-notes': <FileText className="w-5 h-5" />,
  'email-draft': <Mail className="w-5 h-5" />,
  'meeting-notes': <Users className="w-5 h-5" />,
  'code-comment': <Code2 className="w-5 h-5" />,
  'task-list': <CheckSquare className="w-5 h-5" />,
  'creative': <Sparkles className="w-5 h-5" />,
};

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { 
    currentMode, 
    setCurrentMode, 
    notes, 
    sidebarCollapsed, 
    toggleSidebar,
    user,
    logout,
    voiceCommandsEnabled,
    offlineMode,
    dateFilter,
    setDateFilter,
    clearDateFilter,
    userProfile,
    updateUserProfile,
  } = useAppStore();

  const [modesCollapsed, setModesCollapsed] = useState(false);
  const [dateFilterCollapsed, setDateFilterCollapsed] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    bio: '',
    isAIAgent: false,
    agentPersonality: 'professional' as 'professional' | 'friendly' | 'creative' | 'analytical',
    agentSkills: [] as string[],
  });

  // Profile Form mit bestehenden Daten füllen
  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        name: userProfile.name || user?.name || '',
        email: userProfile.email || user?.email || '',
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        bio: userProfile.bio || '',
        isAIAgent: userProfile.isAIAgent || false,
        agentPersonality: userProfile.agentPersonality || 'professional',
        agentSkills: userProfile.agentSkills || [],
      });
    } else if (user) {
      setProfileForm(prev => ({
        ...prev,
        name: user.name,
        email: user.email,
      }));
    }
  }, [userProfile, user]);

  const handleSaveProfile = () => {
    updateUserProfile(profileForm);
    setShowProfile(false);
  };

  // Jahre mit Notizen
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    notes.forEach(n => {
      const year = new Date(n.createdAt).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [notes]);

  // Monate für ausgewähltes Jahr
  const availableMonths = useMemo(() => {
    if (!dateFilter.year) return [];
    const months = new Set<number>();
    notes.forEach(n => {
      const date = new Date(n.createdAt);
      if (date.getFullYear() === dateFilter.year) {
        months.add(date.getMonth());
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [notes, dateFilter.year]);

  // Tage für ausgewählten Monat
  const availableDays = useMemo(() => {
    if (!dateFilter.year || dateFilter.month === null) return [];
    const days = new Set<number>();
    notes.forEach(n => {
      const date = new Date(n.createdAt);
      if (date.getFullYear() === dateFilter.year && date.getMonth() === dateFilter.month) {
        days.add(date.getDate());
      }
    });
    return Array.from(days).sort((a, b) => a - b);
  }, [notes, dateFilter.year, dateFilter.month]);

  // Anzahl Notizen pro Modus MIT Filter
  const filteredNoteCounts = useMemo(() => {
    const counts: Record<EnrichmentMode, number> = {} as any;
    
    Object.keys(MODES).forEach(mode => {
      let modeNotes = notes.filter(n => n.mode === mode);
      
      if (dateFilter.year !== null) {
        modeNotes = modeNotes.filter(n => {
          const date = new Date(n.createdAt);
          return date.getFullYear() === dateFilter.year;
        });
      }
      
      if (dateFilter.month !== null && dateFilter.year !== null) {
        modeNotes = modeNotes.filter(n => {
          const date = new Date(n.createdAt);
          return date.getMonth() === dateFilter.month;
        });
      }

      if (dateFilter.day !== null && dateFilter.month !== null && dateFilter.year !== null) {
        modeNotes = modeNotes.filter(n => {
          const date = new Date(n.createdAt);
          return date.getDate() === dateFilter.day;
        });
      }
      
      counts[mode as EnrichmentMode] = modeNotes.length;
    });
    
    return counts;
  }, [notes, dateFilter]);

  // Anzahl Notizen pro Jahr
  const yearCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    notes.forEach(n => {
      const year = new Date(n.createdAt).getFullYear();
      counts[year] = (counts[year] || 0) + 1;
    });
    return counts;
  }, [notes]);

  // Anzahl Notizen pro Monat
  const monthCounts = useMemo(() => {
    if (!dateFilter.year) return {};
    const counts: Record<number, number> = {};
    notes.forEach(n => {
      const date = new Date(n.createdAt);
      if (date.getFullYear() === dateFilter.year) {
        const month = date.getMonth();
        counts[month] = (counts[month] || 0) + 1;
      }
    });
    return counts;
  }, [notes, dateFilter.year]);

  const handleYearClick = (year: number) => {
    if (dateFilter.year === year) {
      clearDateFilter();
    } else {
      setDateFilter({ year, month: null, day: null });
    }
    setShowCalendar(false);
  };

  const handleMonthClick = (month: number) => {
    if (dateFilter.month === month) {
      setDateFilter({ ...dateFilter, month: null, day: null });
    } else {
      setDateFilter({ ...dateFilter, month, day: null });
    }
    setShowCalendar(false);
  };

  const handleDayClick = (day: number) => {
    setDateFilter({ ...dateFilter, day });
    setShowCalendar(false);
  };

  // Kalender generieren
  const calendarDays = useMemo(() => {
    if (!dateFilter.year || dateFilter.month === null) return [];
    
    const firstDay = new Date(dateFilter.year, dateFilter.month, 1);
    const lastDay = new Date(dateFilter.year, dateFilter.month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Wochentag des ersten Tags (0=So, 1=Mo, ...) -> konvertieren zu Mo=0
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;
    
    const days: (number | null)[] = [];
    
    // Leere Tage vor dem ersten
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }
    
    // Tage des Monats
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    
    return days;
  }, [dateFilter.year, dateFilter.month]);

  const getFilterLabel = () => {
    if (!dateFilter.year) return '';
    let label = `${dateFilter.year}`;
    if (dateFilter.month !== null) {
      label += ` / ${MONTHS[dateFilter.month]}`;
    }
    if (dateFilter.day !== null) {
      label += ` / ${dateFilter.day}.`;
    }
    return label;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 60 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen flex flex-col bg-[#1a1325] border-r border-purple-500/10 relative"
    >
      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 w-6 h-6 rounded-md bg-[#241b2f] border border-purple-500/20 flex items-center justify-center hover:bg-[#2a2035] transition-colors z-10"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3 h-3 text-purple-400" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-purple-400" />
        )}
      </button>

      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">V</span>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              <span className="font-bold text-lg text-white">VelaMind</span>
              <span className="text-[10px] text-zinc-500">Voice Intelligence</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Indicators */}
      <AnimatePresence>
        {!sidebarCollapsed && (voiceCommandsEnabled || offlineMode) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-2 flex gap-2"
          >
            {voiceCommandsEnabled && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-400">
                <Mic className="w-3 h-3" /> Voice
              </span>
            )}
            {offlineMode && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-orange-500/20 text-orange-400">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navigation */}
      <div className="flex-1 py-2 overflow-y-auto">
        {/* Primary Views */}
        <div className="px-2 space-y-1 mb-4">
          <NavButton
            icon={<FileText className="w-5 h-5" />}
            label="Transkription"
            active={currentView === 'notes'}
            onClick={() => onViewChange('notes')}
            collapsed={sidebarCollapsed}
            badge={notes.length}
          />
          <NavButton
            icon={<BarChart3 className="w-5 h-5" />}
            label="Analytics"
            active={currentView === 'analytics'}
            onClick={() => onViewChange('analytics')}
            collapsed={sidebarCollapsed}
          />
          <NavButton
            icon={<Users className="w-5 h-5" />}
            label="Team"
            active={currentView === 'team'}
            onClick={() => onViewChange('team')}
            collapsed={sidebarCollapsed}
          />
          <NavButton
            icon={<Settings className="w-5 h-5" />}
            label="Einstellungen"
            active={currentView === 'settings'}
            onClick={() => onViewChange('settings')}
            collapsed={sidebarCollapsed}
          />
        </div>

        {/* Notes View Content */}
        {currentView === 'notes' && (
          <>
            {/* ZEITRAUM FILTER */}
            <AnimatePresence>
              {!sidebarCollapsed && availableYears.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <button 
                    onClick={() => setDateFilterCollapsed(!dateFilterCollapsed)}
                    className="w-full px-4 flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 hover:text-zinc-400"
                  >
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      ZEITRAUM
                      {dateFilter.year && (
                        <span className="text-purple-400 normal-case font-normal">
                          ({getFilterLabel()})
                        </span>
                      )}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${dateFilterCollapsed ? '-rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {!dateFilterCollapsed && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-2 mb-4 overflow-hidden"
                      >
                        {/* Clear Filter */}
                        {dateFilter.year && (
                          <button
                            onClick={() => {
                              clearDateFilter();
                              setShowCalendar(false);
                            }}
                            className="w-full mb-2 px-3 py-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors"
                          >
                            ✕ Filter zurücksetzen
                          </button>
                        )}

                        {/* Years */}
                        <div className="space-y-1">
                          {availableYears.map(year => (
                            <div key={year}>
                              <button
                                onClick={() => handleYearClick(year)}
                                className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors flex items-center justify-between ${
                                  dateFilter.year === year
                                    ? 'bg-purple-500/20 text-white'
                                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span>📅 {year}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  dateFilter.year === year ? 'bg-purple-500/30 text-purple-300' : 'bg-zinc-700/50 text-zinc-500'
                                }`}>
                                  {yearCounts[year] || 0}
                                </span>
                              </button>

                              {/* Months */}
                              {dateFilter.year === year && availableMonths.length > 0 && (
                                <div className="ml-4 mt-1 space-y-0.5 border-l border-purple-500/20 pl-2">
                                  {availableMonths.map(month => (
                                    <div key={month}>
                                      <button
                                        onClick={() => handleMonthClick(month)}
                                        className={`w-full px-3 py-1.5 rounded text-left text-xs transition-colors flex items-center justify-between ${
                                          dateFilter.month === month
                                            ? 'bg-purple-500/30 text-white'
                                            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                                        }`}
                                      >
                                        <span>{MONTHS[month]}</span>
                                        <span className="text-[10px]">{monthCounts[month] || 0}</span>
                                      </button>

                                      {/* Tag Button */}
                                      {dateFilter.month === month && (
                                        <div className="ml-2 mt-1 border-l border-purple-500/10 pl-2">
                                          <button
                                            onClick={() => setShowCalendar(!showCalendar)}
                                            className={`w-full px-2 py-1 rounded text-left text-[11px] flex items-center gap-1 ${
                                              dateFilter.day !== null
                                                ? 'bg-blue-500/20 text-blue-300'
                                                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                                            }`}
                                          >
                                            <Calendar className="w-3 h-3" />
                                            {dateFilter.day !== null ? `Tag: ${dateFilter.day}` : 'Tag wählen...'}
                                          </button>

                                          {/* Calendar Popup */}
                                          {showCalendar && (
                                            <div className="mt-2 p-2 bg-[#241b2f] rounded-lg border border-purple-500/20">
                                              {/* Weekday Header */}
                                              <div className="grid grid-cols-7 gap-0.5 mb-1">
                                                {WEEKDAYS.map(day => (
                                                  <div key={day} className="text-[9px] text-zinc-500 text-center py-0.5">
                                                    {day}
                                                  </div>
                                                ))}
                                              </div>
                                              
                                              {/* Days Grid */}
                                              <div className="grid grid-cols-7 gap-0.5">
                                                {calendarDays.map((day, idx) => (
                                                  <button
                                                    key={idx}
                                                    onClick={() => day && handleDayClick(day)}
                                                    disabled={!day || !availableDays.includes(day)}
                                                    className={`
                                                      w-6 h-6 rounded text-[10px] flex items-center justify-center transition-colors
                                                      ${!day ? 'invisible' : ''}
                                                      ${day && availableDays.includes(day)
                                                        ? dateFilter.day === day
                                                          ? 'bg-purple-500 text-white'
                                                          : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40'
                                                        : 'text-zinc-600 cursor-not-allowed'
                                                      }
                                                    `}
                                                  >
                                                    {day}
                                                  </button>
                                                ))}
                                              </div>

                                              {/* Clear Day */}
                                              {dateFilter.day !== null && (
                                                <button
                                                  onClick={() => setDateFilter({ ...dateFilter, day: null })}
                                                  className="w-full mt-2 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-300 bg-zinc-700/30 rounded"
                                                >
                                                  Tag-Filter entfernen
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MODI SECTION */}
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <button 
                    onClick={() => setModesCollapsed(!modesCollapsed)}
                    className="w-full px-4 flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 hover:text-zinc-400"
                  >
                    <span>MODI</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${modesCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!modesCollapsed && (
                <motion.nav 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-0.5 px-2 overflow-hidden"
                >
                  {Object.values(MODES).map((mode) => {
                    const isActive = currentMode === mode.id;
                    const count = filteredNoteCounts[mode.id] || 0;

                    return (
                      <button
                        key={mode.id}
                        onClick={() => setCurrentMode(mode.id)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-left
                          ${isActive 
                            ? 'bg-purple-500/20 text-white' 
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }
                        `}
                        title={sidebarCollapsed ? mode.name : undefined}
                      >
                        <span className={`flex-shrink-0 ${isActive ? 'text-purple-400' : ''}`}>
                          {modeIcons[mode.id]}
                        </span>
                        <AnimatePresence>
                          {!sidebarCollapsed && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex-1 flex items-center justify-between min-w-0"
                            >
                              <span className="text-sm font-medium truncate">{mode.name}</span>
                              <span className={`
                                text-xs px-2 py-0.5 rounded-full flex-shrink-0
                                ${isActive ? 'bg-purple-500/30 text-purple-300' : 'bg-zinc-700/50 text-zinc-500'}
                              `}>
                                {count}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    );
                  })}
                </motion.nav>
              )}
            </AnimatePresence>

            {/* Keine Notizen Hinweis */}
            {!sidebarCollapsed && dateFilter.year && Object.values(filteredNoteCounts).every(c => c === 0) && (
              <div className="px-4 py-3 mx-2 mt-4 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                <p className="text-xs text-zinc-500 text-center">
                  Keine Notizen für diesen Zeitraum
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer mit Profile */}
      <div className="p-4 border-t border-purple-500/10 relative">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 hover:bg-white/5 rounded-lg p-1 -ml-1 transition-colors"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              userProfile?.isAIAgent 
                ? 'bg-gradient-to-br from-cyan-500 to-blue-500 ring-2 ring-cyan-400/50' 
                : 'bg-gradient-to-br from-purple-500 to-pink-500'
            }`}>
              {userProfile?.isAIAgent ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col text-left"
                >
                  <span className="text-sm text-white truncate max-w-[120px]">
                    {user?.name || 'User'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {userProfile?.isAIAgent ? '🤖 AI Agent' : user?.role === 'admin' ? '👑 Admin' : user?.role === 'manager' ? '🛡️ Manager' : 'Mitglied'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <button 
            onClick={logout}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Popup */}
        <AnimatePresence>
          {showProfile && !sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 right-0 mb-2 mx-2 p-4 bg-[#1a1325] border border-purple-500/20 rounded-xl shadow-2xl z-50"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  {userProfile?.isAIAgent ? <Bot className="w-4 h-4 text-cyan-400" /> : <User className="w-4 h-4 text-purple-400" />}
                  Profil
                </h3>
                <button 
                  onClick={() => setShowProfile(false)}
                  className="p-1 rounded hover:bg-white/10 text-zinc-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-[#241b2f] border border-purple-500/20 rounded text-sm text-white"
                    placeholder="Dein Name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">E-Mail</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-[#241b2f] border border-purple-500/20 rounded text-sm text-white"
                    placeholder="email@beispiel.de"
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Telefon</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-[#241b2f] border border-purple-500/20 rounded text-sm text-white"
                    placeholder="+49 123 456789"
                  />
                </div>

                {/* Adresse */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Adresse</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-[#241b2f] border border-purple-500/20 rounded text-sm text-white"
                    placeholder="Straße, Stadt"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Beschreibung</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-[#241b2f] border border-purple-500/20 rounded text-sm text-white resize-none"
                    rows={2}
                    placeholder="Kurze Beschreibung..."
                  />
                </div>

                {/* AI Agent Toggle */}
                <div className="pt-2 border-t border-purple-500/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white flex items-center gap-2">
                        <Bot className="w-4 h-4 text-cyan-400" />
                        AI Agent Modus
                      </p>
                      <p className="text-[10px] text-zinc-500">Aktiviere KI-gestützte Automatisierung</p>
                    </div>
                    <button
                      onClick={() => setProfileForm({ ...profileForm, isAIAgent: !profileForm.isAIAgent })}
                      className={`w-10 h-5 rounded-full transition-colors ${
                        profileForm.isAIAgent ? 'bg-cyan-500' : 'bg-zinc-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        profileForm.isAIAgent ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* AI Agent Settings */}
                {profileForm.isAIAgent && (
                  <div className="space-y-3 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                    <p className="text-xs text-cyan-300 font-medium">🤖 AI Agent Einstellungen</p>
                    
                    {/* Personality */}
                    <div>
                      <label className="text-[10px] text-zinc-400">Persönlichkeit</label>
                      <select
                        value={profileForm.agentPersonality}
                        onChange={(e) => setProfileForm({ ...profileForm, agentPersonality: e.target.value as any })}
                        className="w-full mt-1 px-3 py-1.5 bg-[#241b2f] border border-cyan-500/20 rounded text-sm text-white"
                      >
                        <option value="professional">💼 Professionell</option>
                        <option value="friendly">😊 Freundlich</option>
                        <option value="creative">🎨 Kreativ</option>
                        <option value="analytical">📊 Analytisch</option>
                      </select>
                    </div>

                    {/* Skills */}
                    <div>
                      <label className="text-[10px] text-zinc-400">Fähigkeiten</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {['Meetings', 'E-Mails', 'Recherche', 'Coding', 'Kreativ'].map((skill) => (
                          <button
                            key={skill}
                            onClick={() => {
                              const skills = profileForm.agentSkills || [];
                              const newSkills = skills.includes(skill)
                                ? skills.filter(s => s !== skill)
                                : [...skills, skill];
                              setProfileForm({ ...profileForm, agentSkills: newSkills });
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                              (profileForm.agentSkills || []).includes(skill)
                                ? 'bg-cyan-500 text-white'
                                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                            }`}
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-[10px] text-cyan-400/70">
                      💡 Als AI Agent kann VelaMind automatisch Notizen kategorisieren, Zusammenfassungen erstellen und Aufgaben vorschlagen.
                    </p>
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSaveProfile}
                  className="w-full py-2 bg-purple-500 hover:bg-purple-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Speichern
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

function NavButton({ icon, label, active, onClick, collapsed, badge }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
        ${active 
          ? 'bg-purple-500/20 text-white' 
          : 'text-zinc-400 hover:text-white hover:bg-white/5'
        }
      `}
      title={collapsed ? label : undefined}
    >
      <span className={active ? 'text-purple-400' : ''}>{icon}</span>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-between"
          >
            <span className="text-sm font-medium">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300">
                {badge}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
