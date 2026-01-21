'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Mic, Square, Loader2, AlertCircle, Pause, Play, X, Sparkles } from 'lucide-react';
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

// Audio Waveform Visualization Component
function AudioWaveform({ level, isRecording }: { level: number; isRecording: boolean }) {
  const bars = 12;

  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {Array.from({ length: bars }).map((_, i) => {
        const baseHeight = 0.3;
        const variance = Math.sin((i / bars) * Math.PI) * 0.7;
        const animatedHeight = isRecording
          ? baseHeight + (level * variance * (0.5 + Math.random() * 0.5))
          : baseHeight;

        return (
          <div
            key={i}
            className="w-1 rounded-full bg-gradient-to-t from-purple-500 to-pink-500 transition-all duration-75"
            style={{
              height: `${Math.max(4, animatedHeight * 32)}px`,
              opacity: isRecording ? 0.7 + level * 0.3 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
}

export function AudioRecorder() {
  const {
    recordingState,
    setRecordingState,
    currentMode,
    currentLanguage,
    addNote,
    voiceCommandsEnabled,
  } = useAppStore();

  const [processingStatus, setProcessingStatus] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [lastCommandFeedback, setLastCommandFeedback] = useState<string | null>(null);

  // Voice command callbacks
  const voiceCommandCallbacks = useMemo(() => ({
    onStop: () => {
      console.log('🎤 Voice command: STOP');
      setLastCommandFeedback('Stopp erkannt!');
      setTimeout(() => setLastCommandFeedback(null), 2000);
      // Trigger stop via the button to ensure proper state handling
      const event = new CustomEvent('voicemind:voiceStop');
      window.dispatchEvent(event);
    },
    onPause: () => {
      console.log('🎤 Voice command: PAUSE');
      setLastCommandFeedback('Pause');
      setTimeout(() => setLastCommandFeedback(null), 2000);
      pauseRecording();
    },
    onCancel: () => {
      console.log('🎤 Voice command: CANCEL');
      setLastCommandFeedback('Verworfen');
      setTimeout(() => setLastCommandFeedback(null), 2000);
      handleCancel();
    },
    onImportant: () => {
      console.log('🎤 Voice command: IMPORTANT');
      setLastCommandFeedback('Als wichtig markiert!');
      setTimeout(() => setLastCommandFeedback(null), 2000);
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
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetTranscript,
  } = useSpeechRecognition(currentLanguage, voiceCommandsEnabled ? voiceCommandCallbacks : undefined);

  const handleCancel = useCallback(() => {
    stopRecording();
    resetTranscript();
    setRecordingState('idle');
    setShowCancelConfirm(false);
  }, [stopRecording, resetTranscript, setRecordingState]);

  const handleRecordingToggle = useCallback(async () => {
    if (isRecording) {
      // STOP - get transcript and save
      const finalTranscript = stopRecording();

      console.log('=== Recording stopped ===');
      console.log('Got transcript:', finalTranscript);
      console.log('Transcript length:', finalTranscript.length);

      if (!finalTranscript || finalTranscript.trim().length === 0) {
        console.log('No transcript, returning to idle');
        setRecordingState('idle');
        return;
      }

      setRecordingState('processing');
      setProcessingStatus('Erstelle Zusammenfassung...');

      try {
        const { title, summary, sentiment } = await createAISummary(finalTranscript, currentLanguage);

        const newNote: Note = {
          id: generateId(),
          title: title,
          rawTranscript: finalTranscript,
          summary: summary,
          mode: currentMode,
          sentiment: sentiment as 'positive' | 'neutral' | 'negative',
          language: currentLanguage,
          createdAt: new Date(),
          updatedAt: new Date(),
          duration: recordingTime,
        };

        console.log('Adding note:', newNote);
        addNote(newNote);
        setProcessingStatus('✓ Notiz gespeichert!');

        setTimeout(() => {
          setProcessingStatus('');
          setRecordingState('idle');
          resetTranscript();
        }, 1000);

      } catch (err) {
        console.error('Error creating note:', err);

        // Fallback: Save anyway
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

  // Listen for voice stop command
  useEffect(() => {
    const handleVoiceStop = () => {
      if (isRecording) {
        handleRecordingToggle();
      }
    };

    window.addEventListener('voicemind:voiceStop', handleVoiceStop);
    return () => window.removeEventListener('voicemind:voiceStop', handleVoiceStop);
  }, [isRecording, handleRecordingToggle]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+V to toggle recording
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyV') {
        e.preventDefault();
        handleRecordingToggle();
      }
      // Escape to cancel
      if (e.code === 'Escape' && isRecording) {
        setShowCancelConfirm(true);
      }
      // Space to pause/resume (when recording)
      if (e.code === 'Space' && isRecording && !e.ctrlKey && !e.shiftKey && !e.altKey) {
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
  }, [handleRecordingToggle, isRecording, isPaused, pauseRecording, resumeRecording]);

  // Legacy event listeners for compatibility
  useEffect(() => {
    const handleStartRecording = () => {
      if (!isRecording && recordingState === 'idle') {
        resetTranscript();
        startRecording();
        setRecordingState('recording');
      }
    };

    const handleStopRecording = () => {
      if (isRecording) {
        handleRecordingToggle();
      }
    };

    window.addEventListener('velamind:startRecording', handleStartRecording);
    window.addEventListener('velamind:stopRecording', handleStopRecording);

    return () => {
      window.removeEventListener('velamind:startRecording', handleStartRecording);
      window.removeEventListener('velamind:stopRecording', handleStopRecording);
    };
  }, [isRecording, recordingState, startRecording, setRecordingState, resetTranscript, handleRecordingToggle]);

  const langConfig = LANGUAGES.find(l => l.code === currentLanguage);
  const isProcessing = recordingState === 'processing';

  return (
    <div className="flex flex-col items-center">
      {/* Voice Command Feedback Toast */}
      {lastCommandFeedback && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-lg flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {lastCommandFeedback}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1325] border border-purple-500/20 rounded-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Aufnahme verwerfen?</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Die aktuelle Aufnahme wird gelöscht und kann nicht wiederhergestellt werden.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600 transition"
              >
                Weiter aufnehmen
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
              >
                Verwerfen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Browser Support Warning */}
      {!isSupported && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm text-center max-w-md">
          ⚠️ Web Speech API wird nicht unterstützt. Bitte Chrome oder Edge verwenden.
        </div>
      )}

      {/* Audio Waveform */}
      {isRecording && (
        <div className="mb-4">
          <AudioWaveform level={audioLevel} isRecording={isRecording && !isPaused} />
        </div>
      )}

      {/* Main Recording Button */}
      <div className="relative">
        <button
          data-record-button
          onClick={handleRecordingToggle}
          disabled={isProcessing || !isSupported}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
            ${isRecording
              ? isPaused
                ? 'bg-yellow-500/80 border-2 border-yellow-400'
                : 'bg-purple-500 recording-glow'
              : isProcessing
                ? 'bg-[#241b2f] border-2 border-purple-500/30'
                : 'bg-purple-500 hover:bg-purple-400 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed'
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

        {/* Pause/Resume Button (when recording) */}
        {isRecording && (
          <button
            onClick={() => isPaused ? resumeRecording() : pauseRecording()}
            className="absolute -right-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#241b2f] border border-purple-500/30 flex items-center justify-center text-zinc-400 hover:text-white hover:border-purple-500/50 transition"
            title={isPaused ? 'Fortsetzen (Leertaste)' : 'Pausieren (Leertaste)'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        )}

        {/* Cancel Button (when recording) */}
        {isRecording && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="absolute -left-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#241b2f] border border-red-500/30 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-500/50 transition"
            title="Verwerfen (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status Text */}
      <p className="mt-4 text-sm text-zinc-500">
        {processingStatus
          ? processingStatus
          : isProcessing
            ? 'Verarbeite...'
            : isRecording
              ? isPaused
                ? '⏸️ Pausiert - Klicken zum Fortsetzen'
                : '🔴 Aufnahme läuft... (Klicken zum Stoppen)'
              : 'Klicken zum Aufnehmen'}
      </p>

      {/* Recording Time */}
      {isRecording && (
        <div className="mt-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-lg font-mono text-white">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}

      {/* Voice Commands Info (when enabled) */}
      {isRecording && voiceCommandsEnabled && (
        <div className="mt-3 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-green-400 text-center">
            🎤 Sage <span className="font-semibold">"Stopp"</span> oder <span className="font-semibold">"Fertig"</span> zum Beenden
          </p>
        </div>
      )}

      {/* Live Transcript Preview */}
      {(transcript || interimTranscript) && isRecording && (
        <div className="mt-4 max-w-lg p-4 rounded-lg bg-[#1a1325] border border-purple-500/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500">Live-Transkription:</p>
            <p className="text-xs text-zinc-600">{transcript.split(' ').length} Wörter</p>
          </div>
          <p className="text-sm text-zinc-300 max-h-32 overflow-y-auto">
            {transcript}
            <span className="text-zinc-500 italic">{interimTranscript}</span>
          </p>
        </div>
      )}

      {/* Language & Hotkey Info */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="text-xs text-zinc-600">
          Sprache: <span className="text-zinc-400">{langConfig?.flag} {langConfig?.name}</span>
        </p>
        <div className="flex items-center gap-4">
          <p className="text-xs text-zinc-600">
            <kbd className="px-1.5 py-0.5 rounded bg-[#241b2f] text-zinc-500 font-mono text-[10px]">Ctrl</kbd>
            {' + '}
            <kbd className="px-1.5 py-0.5 rounded bg-[#241b2f] text-zinc-500 font-mono text-[10px]">Shift</kbd>
            {' + '}
            <kbd className="px-1.5 py-0.5 rounded bg-[#241b2f] text-zinc-500 font-mono text-[10px]">V</kbd>
            {' '}{isRecording ? 'Stoppen' : 'Starten'}
          </p>
          {isRecording && (
            <p className="text-xs text-zinc-600">
              <kbd className="px-1.5 py-0.5 rounded bg-[#241b2f] text-zinc-500 font-mono text-[10px]">Space</kbd>
              {' '}{isPaused ? 'Fortsetzen' : 'Pause'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
