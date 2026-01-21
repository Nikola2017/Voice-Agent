'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAppStore } from '@/lib/store';
import { LANGUAGES, type Note } from '@/types';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function generateId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createLocalSummary(text: string): { title: string; summary: string } {
  if (!text || text.trim().length === 0) {
    return { title: 'Leere Notiz', summary: '' };
  }

  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  const title = words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');

  const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const summary = sentences.length > 3
    ? sentences.slice(0, 3).join('. ') + '.'
    : trimmed;

  return { title: title || 'Neue Notiz', summary };
}

async function createAISummary(text: string, language: string): Promise<{ title: string; summary: string; sentiment: string }> {
  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text, language }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return {
          title: data.title || createLocalSummary(text).title,
          summary: data.summary || text,
          sentiment: data.sentiment || 'neutral',
        };
      }
    }
  } catch (e) {
    console.log('API not available, using local summary');
  }

  const local = createLocalSummary(text);
  return { ...local, sentiment: 'neutral' };
}

export function AudioRecorder() {
  const {
    recordingState,
    setRecordingState,
    currentMode,
    currentLanguage,
    addNote,
  } = useAppStore();

  const [processingStatus, setProcessingStatus] = useState('');

  const {
    isRecording,
    transcript,
    interimTranscript,
    recordingTime,
    error,
    isSupported,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useSpeechRecognition(currentLanguage);

  const handleRecordingToggle = useCallback(async () => {
    if (isRecording) {
      // STOP
      const finalTranscript = stopRecording();

      console.log('=== Recording stopped ===');
      console.log('Transcript:', finalTranscript);

      if (!finalTranscript || finalTranscript.trim().length === 0) {
        setRecordingState('idle');
        return;
      }

      setRecordingState('processing');
      setProcessingStatus('Erstelle Zusammenfassung...');

      try {
        const { title, summary, sentiment } = await createAISummary(finalTranscript, currentLanguage);

        const newNote: Note = {
          id: generateId(),
          title,
          rawTranscript: finalTranscript,
          summary,
          mode: currentMode,
          sentiment: sentiment as 'positive' | 'neutral' | 'negative',
          language: currentLanguage,
          createdAt: new Date(),
          updatedAt: new Date(),
          duration: recordingTime,
        };

        addNote(newNote);
        setProcessingStatus('✓ Gespeichert!');

        setTimeout(() => {
          setProcessingStatus('');
          setRecordingState('idle');
          resetTranscript();
        }, 1000);

      } catch (err) {
        console.error('Error:', err);
        const local = createLocalSummary(finalTranscript);
        const newNote: Note = {
          id: generateId(),
          title: local.title,
          rawTranscript: finalTranscript,
          summary: local.summary,
          mode: currentMode,
          sentiment: 'neutral',
          language: currentLanguage,
          createdAt: new Date(),
          updatedAt: new Date(),
          duration: recordingTime,
        };
        addNote(newNote);
        setRecordingState('idle');
        resetTranscript();
      }
    } else {
      // START
      console.log('=== Starting recording ===');
      resetTranscript();
      startRecording();
      setRecordingState('recording');
    }
  }, [isRecording, currentLanguage, currentMode, recordingTime, startRecording, stopRecording, setRecordingState, addNote, resetTranscript]);

  // Keyboard shortcut: Ctrl+Shift+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyV') {
        e.preventDefault();
        handleRecordingToggle();
      }
      if (e.code === 'Escape' && isRecording) {
        stopRecording();
        setRecordingState('idle');
        resetTranscript();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRecordingToggle, isRecording, stopRecording, setRecordingState, resetTranscript]);

  // Listen for external events
  useEffect(() => {
    const handleStart = () => {
      if (!isRecording && recordingState === 'idle') {
        resetTranscript();
        startRecording();
        setRecordingState('recording');
      }
    };

    const handleStop = () => {
      if (isRecording) {
        handleRecordingToggle();
      }
    };

    window.addEventListener('velamind:startRecording', handleStart);
    window.addEventListener('velamind:stopRecording', handleStop);

    return () => {
      window.removeEventListener('velamind:startRecording', handleStart);
      window.removeEventListener('velamind:stopRecording', handleStop);
    };
  }, [isRecording, recordingState, startRecording, setRecordingState, resetTranscript, handleRecordingToggle]);

  const langConfig = LANGUAGES.find(l => l.code === currentLanguage);
  const isProcessing = recordingState === 'processing';

  return (
    <div className="flex flex-col items-center">
      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Browser Warning */}
      {!isSupported && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm text-center max-w-md">
          ⚠️ Spracherkennung nicht unterstützt. Bitte Chrome oder Edge verwenden.
        </div>
      )}

      {/* Record Button */}
      <button
        data-record-button
        onClick={handleRecordingToggle}
        disabled={isProcessing || !isSupported}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
          ${isRecording
            ? 'bg-purple-500 recording-glow'
            : isProcessing
              ? 'bg-[#241b2f] border-2 border-purple-500/30'
              : 'bg-purple-500 hover:bg-purple-400 shadow-lg shadow-purple-500/25 disabled:opacity-50'
          }
        `}
      >
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-purple-500/30 pulse-ring" />
            <div className="absolute inset-0 rounded-full bg-purple-500/20 pulse-ring" style={{ animationDelay: '0.5s' }} />
          </>
        )}

        {isProcessing ? (
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        ) : isRecording ? (
          <Square className="w-6 h-6 text-white fill-white" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </button>

      {/* Status */}
      <p className="mt-4 text-sm text-zinc-500">
        {processingStatus
          ? processingStatus
          : isProcessing
            ? 'Verarbeite...'
            : isRecording
              ? 'Aufnahme läuft... (Klicken zum Stoppen)'
              : 'Klicken zum Aufnehmen'}
      </p>

      {/* Timer */}
      {isRecording && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-lg font-mono text-white">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}

      {/* Live Transcript */}
      {(transcript || interimTranscript) && isRecording && (
        <div className="mt-4 max-w-lg p-4 rounded-lg bg-[#1a1325] border border-purple-500/10">
          <p className="text-xs text-zinc-500 mb-1">Live-Transkription:</p>
          <p className="text-sm text-zinc-300">
            {transcript}
            <span className="text-zinc-500 italic">{interimTranscript}</span>
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="text-xs text-zinc-600">
          Sprache: <span className="text-zinc-400">{langConfig?.flag} {langConfig?.name}</span>
        </p>
        <p className="text-xs text-zinc-600">
          <kbd className="px-1.5 py-0.5 rounded bg-[#241b2f] text-zinc-500 font-mono text-[10px]">Ctrl</kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 rounded bg-[#241b2f] text-zinc-500 font-mono text-[10px]">Shift</kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 rounded bg-[#241b2f] text-zinc-500 font-mono text-[10px]">V</kbd>
          {' '}{isRecording ? 'Stoppen' : 'Starten'}
        </p>
      </div>
    </div>
  );
}
