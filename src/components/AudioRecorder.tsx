'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Mic, Square, Loader2, AlertCircle, Pause, Play } from 'lucide-react';
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

  // Voice command callbacks
  const voiceCallbacks = useMemo(() => ({
    onStop: () => {
      console.log('🎤 Voice: VelaMind Stop');
      window.dispatchEvent(new CustomEvent('velamind:voiceStop'));
    },
    onPause: () => {
      console.log('🎤 Voice: VelaMind Pause');
      window.dispatchEvent(new CustomEvent('velamind:voicePause'));
    },
    onResume: () => {
      console.log('🎤 Voice: VelaMind Weiter');
      window.dispatchEvent(new CustomEvent('velamind:voiceResume'));
    },
  }), []);

  const {
    isRecording,
    isPaused,
    transcript,
    interimTranscript,
    recordingTime,
    error,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetTranscript,
  } = useSpeechRecognition(currentLanguage, voiceCallbacks);

  // Handle stop and save
  const handleStop = useCallback(async () => {
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
  }, [stopRecording, currentLanguage, currentMode, recordingTime, setRecordingState, addNote, resetTranscript]);

  // Handle start
  const handleStart = useCallback(() => {
    console.log('=== Starting recording ===');
    resetTranscript();
    startRecording();
    setRecordingState('recording');
  }, [resetTranscript, startRecording, setRecordingState]);

  // Toggle recording
  const handleRecordingToggle = useCallback(() => {
    if (isRecording) {
      handleStop();
    } else {
      handleStart();
    }
  }, [isRecording, handleStop, handleStart]);

  // Listen for voice commands
  useEffect(() => {
    const onVoiceStop = () => {
      if (isRecording) {
        handleStop();
      }
    };

    const onVoicePause = () => {
      if (isRecording && !isPaused) {
        pauseRecording();
      }
    };

    const onVoiceResume = () => {
      if (isRecording && isPaused) {
        resumeRecording();
      }
    };

    window.addEventListener('velamind:voiceStop', onVoiceStop);
    window.addEventListener('velamind:voicePause', onVoicePause);
    window.addEventListener('velamind:voiceResume', onVoiceResume);

    return () => {
      window.removeEventListener('velamind:voiceStop', onVoiceStop);
      window.removeEventListener('velamind:voicePause', onVoicePause);
      window.removeEventListener('velamind:voiceResume', onVoiceResume);
    };
  }, [isRecording, isPaused, handleStop, pauseRecording, resumeRecording]);

  // Keyboard shortcuts
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
      // Space to pause/resume
      if (e.code === 'Space' && isRecording) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (isPaused) {
            resumeRecording();
          } else {
            pauseRecording();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRecordingToggle, isRecording, isPaused, stopRecording, pauseRecording, resumeRecording, setRecordingState, resetTranscript]);

  // External event listeners
  useEffect(() => {
    const onStart = () => {
      if (!isRecording && recordingState === 'idle') {
        handleStart();
      }
    };

    const onStop = () => {
      if (isRecording) {
        handleStop();
      }
    };

    window.addEventListener('velamind:startRecording', onStart);
    window.addEventListener('velamind:stopRecording', onStop);

    return () => {
      window.removeEventListener('velamind:startRecording', onStart);
      window.removeEventListener('velamind:stopRecording', onStop);
    };
  }, [isRecording, recordingState, handleStart, handleStop]);

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
      <div className="relative">
        <button
          data-record-button
          onClick={handleRecordingToggle}
          disabled={isProcessing || !isSupported}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
            ${isRecording
              ? isPaused
                ? 'bg-yellow-500'
                : 'bg-purple-500 recording-glow'
              : isProcessing
                ? 'bg-[#241b2f] border-2 border-purple-500/30'
                : 'bg-purple-500 hover:bg-purple-400 shadow-lg shadow-purple-500/25 disabled:opacity-50'
            }
          `}
        >
          {isRecording && !isPaused && (
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

        {/* Pause/Resume Button */}
        {isRecording && (
          <button
            onClick={() => isPaused ? resumeRecording() : pauseRecording()}
            className="absolute -right-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#241b2f] border border-purple-500/30 flex items-center justify-center text-zinc-400 hover:text-white hover:border-purple-500/50 transition"
            title={isPaused ? 'Fortsetzen' : 'Pausieren'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Status */}
      <p className="mt-4 text-sm text-zinc-500">
        {processingStatus
          ? processingStatus
          : isProcessing
            ? 'Verarbeite...'
            : isRecording
              ? isPaused
                ? '⏸️ Pausiert - Sage "VelaMind Weiter"'
                : '🔴 Aufnahme läuft...'
              : 'Klicken zum Aufnehmen'}
      </p>

      {/* Timer */}
      {isRecording && (
        <div className="mt-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-lg font-mono text-white">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}

      {/* Voice Commands Info */}
      {isRecording && (
        <div className="mt-3 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-xs text-purple-300 text-center">
            🎤 Sage <span className="font-bold">"VelaMind Stop"</span> zum Beenden
            {!isPaused && <> oder <span className="font-bold">"VelaMind Pause"</span></>}
          </p>
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
