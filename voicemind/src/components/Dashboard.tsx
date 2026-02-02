'use client';

import { useState, useEffect, useMemo } from 'react';
import { MoreVertical, Mic, Search, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AudioRecorder } from './AudioRecorder';
import { NotesList } from './NotesList';
import { LanguageSelector } from './LanguageSelector';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { TeamPanel } from './TeamPanel';
import { SettingsPanel } from './SettingsPanel';
import { NoteCard } from './NoteCard';
import { useAppStore } from '@/lib/store';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { MODES } from '@/types';

type View = 'notes' | 'analytics' | 'team' | 'settings';

export function Dashboard() {
  const { currentMode, voiceCommandsEnabled, notes } = useAppStore();
  const [currentView, setCurrentView] = useState<View>('notes');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  
  const modeConfig = MODES[currentMode];

  // Initialize voice commands
  const { isListening, lastCommand } = useVoiceCommands();

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return notes.filter(note => 
      note.title.toLowerCase().includes(query) ||
      note.rawTranscript.toLowerCase().includes(query) ||
      note.summary.toLowerCase().includes(query)
    );
  }, [searchQuery, notes]);

  // Listen for voice command events
  useEffect(() => {
    const handleStartRecording = () => {
      const recordButton = document.querySelector('[data-record-button]') as HTMLButtonElement;
      if (recordButton) recordButton.click();
    };

    const handleStopRecording = () => {
      const recordButton = document.querySelector('[data-record-button]') as HTMLButtonElement;
      if (recordButton) recordButton.click();
    };

    window.addEventListener('velamind:startRecording', handleStartRecording);
    window.addEventListener('velamind:stopRecording', handleStopRecording);

    return () => {
      window.removeEventListener('velamind:startRecording', handleStartRecording);
      window.removeEventListener('velamind:stopRecording', handleStopRecording);
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0a15]">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-purple-500/10 bg-[#0f0a15]">
          <div className="flex items-center gap-3">
            {currentView === 'notes' && (
              <>
                <span className="text-lg">{modeConfig.icon}</span>
                <h1 className="font-semibold text-white">{modeConfig.name}</h1>
              </>
            )}
            {currentView === 'analytics' && (
              <h1 className="font-semibold text-white">📊 Analytics</h1>
            )}
            {currentView === 'team' && (
              <h1 className="font-semibold text-white">👥 Team</h1>
            )}
            {currentView === 'settings' && (
              <h1 className="font-semibold text-white">⚙️ Einstellungen</h1>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Voice Command Status */}
            {voiceCommandsEnabled && isListening && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400">Voice aktiv</span>
              </div>
            )}

            {/* Search Bar (wenn aktiv) */}
            {showSearch && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1325] rounded-lg border border-purple-500/20">
                <Search className="w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Titel oder Transkription suchen..."
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500 w-64"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {currentView === 'notes' && !showSearch && <LanguageSelector />}
            
            {/* Menu Button */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1325] border border-purple-500/20 rounded-lg shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowSearch(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-purple-500/20 flex items-center gap-2"
                  >
                    <Search className="w-4 h-4 text-purple-400" />
                    Suchen
                    <span className="ml-auto text-xs text-zinc-500">Ctrl+F</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Search Results */}
          {showSearch && searchQuery.trim() && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Suchergebnisse für "{searchQuery}" ({searchResults.length})
              </h2>
              
              {searchResults.length > 0 ? (
                <div className="space-y-4 max-w-4xl">
                  {searchResults.map(note => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500">Keine Ergebnisse gefunden.</p>
              )}
            </div>
          )}

          {/* Normal Content (wenn keine Suche aktiv) */}
          {(!showSearch || !searchQuery.trim()) && (
            <>
              {currentView === 'notes' && (
                <div className="p-6">
                  {/* Recording Section */}
                  <div className="flex justify-center py-8">
                    <AudioRecorder />
                  </div>

                  {/* Notes Section */}
                  <div className="max-w-4xl mx-auto">
                    <NotesList />
                  </div>
                </div>
              )}

              {currentView === 'analytics' && <AnalyticsDashboard />}
              {currentView === 'team' && <TeamPanel />}
              {currentView === 'settings' && <SettingsPanel />}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="h-10 flex items-center justify-center gap-6 border-t border-purple-500/10 text-xs text-zinc-600">
          <a href="#" className="hover:text-zinc-400">Impressum</a>
          <a href="#" className="hover:text-zinc-400">Datenschutz</a>
          <a href="#" className="hover:text-zinc-400">AGB</a>
          <span>© 2026 VelaMind</span>
        </footer>
      </main>
    </div>
  );
}
