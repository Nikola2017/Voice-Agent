'use client';

import { useMemo } from 'react';
import { FileText, Calendar } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { NoteCard } from './NoteCard';
import { MODES } from '@/types';

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export function NotesList() {
  const { notes, currentMode, dateFilter, clearDateFilter } = useAppStore();
  const modeConfig = MODES[currentMode];

  const filteredNotes = useMemo(() => {
    let filtered = notes.filter(note => note.mode === currentMode);
    
    // Date filter anwenden
    if (dateFilter.year !== null) {
      filtered = filtered.filter(note => {
        const date = new Date(note.createdAt);
        return date.getFullYear() === dateFilter.year;
      });
    }
    
    if (dateFilter.month !== null && dateFilter.year !== null) {
      filtered = filtered.filter(note => {
        const date = new Date(note.createdAt);
        return date.getMonth() === dateFilter.month;
      });
    }

    if (dateFilter.day !== null && dateFilter.month !== null && dateFilter.year !== null) {
      filtered = filtered.filter(note => {
        const date = new Date(note.createdAt);
        return date.getDate() === dateFilter.day;
      });
    }
    
    // Sortieren: neueste zuerst
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notes, currentMode, dateFilter]);

  const hasDateFilter = dateFilter.year !== null;

  if (filteredNotes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-[#1a1325] border border-purple-500/10 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-zinc-600" />
        </div>
        <h3 className="text-lg font-medium text-zinc-400 mb-2">
          Noch keine Notizen
        </h3>
        {hasDateFilter ? (
          <div>
            <p className="text-sm text-zinc-600 mb-3">
              Keine Notizen für {dateFilter.year}
              {dateFilter.month !== null && ` / ${MONTHS[dateFilter.month]}`}
            </p>
            <button
              onClick={clearDateFilter}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-600 max-w-xs">
            Klicke auf das Mikrofon oder drücke{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-[#1a1325] text-zinc-500 font-mono text-xs">Ctrl+Shift+V</kbd>
            {' '}um deine erste Sprachnotiz aufzunehmen.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
      {/* Filter Anzeige */}
      {hasDateFilter && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 text-sm text-purple-300">
            <Calendar className="w-4 h-4" />
            <span>
              Zeitraum: {dateFilter.year}
              {dateFilter.month !== null && ` / ${MONTHS[dateFilter.month]}`}
              {dateFilter.day !== null && ` / ${dateFilter.day}.`}
            </span>
            <span className="text-purple-400">({filteredNotes.length} Notizen)</span>
          </div>
          <button
            onClick={clearDateFilter}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            ✕ Filter entfernen
          </button>
        </div>
      )}
      
      {filteredNotes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
