'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mic, Square, Loader2, AlertCircle, Monitor, MicOff, Languages, RefreshCw } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useWhisperRecording } from '@/hooks/useWhisperRecording';
import { useAppStore } from '@/lib/store';
import { LANGUAGES, type Note, type WhisperSegment, type AudioSource } from '@/types';

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

async function translateSegments(
  segments: WhisperSegment[],
  targetLanguage: string,
  sourceLanguage?: string
): Promise<WhisperSegment[]> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segments,
        targetLanguage,
        sourceLanguage,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return data.segments;
      }
    }
  } catch (e) {
    console.log('Translation API not available');
  }

  return segments;
}

export function AudioRecorder() {
  const {
    recordingState,
    setRecordingState,
    currentMode,
    currentLanguage,
    recordingSettings,
    setRecordingSettings,
    addNote
  } = useAppStore();

  // Web Speech API hook
  const speechRecognition = useSpeechRecognition(currentLanguage);

  // Whisper recording hook
  const whisperRecording = useWhisperRecording(currentLanguage);

  const [processingStatus, setProcessingStatus] = useState('');
  const [showAudioSourceMenu, setShowAudioSourceMenu] = useState(false);

  // Determine which recording system to use
  const useWhisper = recordingSettings.useWhisper;
  const isRecording = useWhisper ? whisperRecording.isRecording : speechRecognition.isRecording;
  const recordingTime = useWhisper ? whisperRecording.recordingTime : speechRecognition.recordingTime;
  const error = useWhisper ? whisperRecording.error : speechRecognition.error;
  const isSupported = useWhisper ? whisperRecording.isSupported : speechRecognition.isSupported;

  const handleRecordingToggle = useCallback(async () => {
    if (isRecording) {
      // STOP RECORDING
      console.log('=== Recording stopped ===');

      if (useWhisper) {
        // Whisper mode - process audio file
        setRecordingState('processing');
        setProcessingStatus('Transcribing with Whisper...');

        const result = await whisperRecording.stopRecording();

        if (!result || !result.text || result.text.trim().length === 0) {
          console.log('No transcript from Whisper, returning to idle');
          setRecordingState('idle');
          setProcessingStatus('');
          return;
        }

        let segments = result.segments;

        // If translation is enabled, translate each segment fresh
        if (recordingSettings.enableLiveTranslation &&
            recordingSettings.targetTranslationLanguage !== currentLanguage) {
          setProcessingStatus('Translating segments...');

          // Each segment gets its own fresh translation
          segments = await translateSegments(
            segments,
            recordingSettings.targetTranslationLanguage,
            currentLanguage
          );
        }

        setProcessingStatus('Creating summary...');
        const textForSummary = segments.map(s => s.translatedText || s.text).join(' ');
        const { title, summary, sentiment } = await createAISummary(textForSummary, currentLanguage);

        const newNote: Note = {
          id: generateId(),
          title,
          rawTranscript: result.text,
          summary,
          mode: currentMode,
          sentiment: sentiment as 'positive' | 'neutral' | 'negative',
          language: currentLanguage,
          createdAt: new Date(),
          updatedAt: new Date(),
          duration: result.duration,
          whisperSegments: segments,
        };

        console.log('Adding Whisper note:', newNote);
        addNote(newNote);
        setProcessingStatus('Note saved!');

        setTimeout(() => {
          setProcessingStatus('');
          setRecordingState('idle');
        }, 1000);

      } else {
        // Web Speech API mode
        const finalTranscript = speechRecognition.stopRecording();

        console.log('Got transcript:', finalTranscript);
        console.log('Transcript length:', finalTranscript.length);

        if (!finalTranscript || finalTranscript.trim().length === 0) {
          console.log('No transcript, returning to idle');
          setRecordingState('idle');
          return;
        }

        setRecordingState('processing');
        setProcessingStatus('Creating summary...');

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

          console.log('Adding note:', newNote);
          addNote(newNote);
          setProcessingStatus('Note saved!');

          setTimeout(() => {
            setProcessingStatus('');
            setRecordingState('idle');
            speechRecognition.resetTranscript();
          }, 1000);

        } catch (err) {
          console.error('Error creating note:', err);

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
          speechRecognition.resetTranscript();
        }
      }
    } else {
      // START RECORDING
      console.log('=== Starting recording ===');

      if (useWhisper) {
        await whisperRecording.startRecording(recordingSettings.audioSource);
      } else {
        speechRecognition.resetTranscript();
        speechRecognition.startRecording();
      }
      setRecordingState('recording');
    }
  }, [
    isRecording,
    useWhisper,
    currentLanguage,
    currentMode,
    recordingTime,
    recordingSettings,
    speechRecognition,
    whisperRecording,
    setRecordingState,
    addNote
  ]);

  // Cancel recording
  const handleCancel = useCallback(() => {
    if (useWhisper) {
      whisperRecording.cancelRecording();
    } else {
      speechRecognition.stopRecording();
      speechRecognition.resetTranscript();
    }
    setRecordingState('idle');
    setProcessingStatus('');
  }, [useWhisper, whisperRecording, speechRecognition, setRecordingState]);

  // Keyboard shortcut: Ctrl+Shift+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyV') {
        e.preventDefault();
        handleRecordingToggle();
      }
      if (e.code === 'Escape' && isRecording) {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRecordingToggle, handleCancel, isRecording]);

  const langConfig = LANGUAGES.find(l => l.code === currentLanguage);
  const targetLangConfig = LANGUAGES.find(l => l.code === recordingSettings.targetTranslationLanguage);
  const isProcessing = recordingState === 'processing' || whisperRecording.isProcessing;

  const audioSourceLabels: Record<AudioSource, { label: string; icon: JSX.Element }> = {
    microphone: { label: 'Microphone', icon: <Mic className="w-4 h-4" /> },
    system: { label: 'System Audio', icon: <Monitor className="w-4 h-4" /> },
    both: { label: 'Mic + System', icon: <><Mic className="w-3 h-3" /><Monitor className="w-3 h-3" /></> },
  };

  return (
    <div className="flex flex-col items-center">
      {/* Error Message */}
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm max-w-md">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Browser Support Warning */}
      {!isSupported && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm text-center max-w-md">
          {useWhisper
            ? 'MediaRecorder not supported. Please use a modern browser.'
            : 'Web Speech API not supported. Please use Chrome or Edge.'
          }
        </div>
      )}

      {/* Recording Mode Toggle */}
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => setRecordingSettings({ useWhisper: !useWhisper })}
          disabled={isRecording}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            useWhisper
              ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
              : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/50 hover:bg-zinc-700'
          } disabled:opacity-50`}
        >
          {useWhisper ? 'Whisper Mode' : 'Live Mode'}
        </button>

        {/* Audio Source Selector (Whisper only) */}
        {useWhisper && (
          <div className="relative">
            <button
              onClick={() => setShowAudioSourceMenu(!showAudioSourceMenu)}
              disabled={isRecording}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-700/50 text-zinc-300 border border-zinc-600/50 hover:bg-zinc-700 disabled:opacity-50"
            >
              {audioSourceLabels[recordingSettings.audioSource].icon}
              <span>{audioSourceLabels[recordingSettings.audioSource].label}</span>
            </button>

            {showAudioSourceMenu && !isRecording && (
              <div className="absolute top-full mt-1 left-0 bg-[#1e1629] border border-purple-500/20 rounded-lg shadow-xl z-10 overflow-hidden">
                {(Object.keys(audioSourceLabels) as AudioSource[]).map((source) => (
                  <button
                    key={source}
                    onClick={() => {
                      setRecordingSettings({ audioSource: source });
                      setShowAudioSourceMenu(false);
                    }}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-xs text-left hover:bg-purple-500/20 ${
                      recordingSettings.audioSource === source ? 'bg-purple-500/10 text-purple-300' : 'text-zinc-300'
                    }`}
                  >
                    {audioSourceLabels[source].icon}
                    <span>{audioSourceLabels[source].label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Translation Toggle (Whisper only) */}
        {useWhisper && (
          <button
            onClick={() => setRecordingSettings({
              enableLiveTranslation: !recordingSettings.enableLiveTranslation
            })}
            disabled={isRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              recordingSettings.enableLiveTranslation
                ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/50 hover:bg-zinc-700'
            } disabled:opacity-50`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Translate to {targetLangConfig?.flag}</span>
          </button>
        )}
      </div>

      {/* Main Recording Button */}
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
              : 'bg-purple-500 hover:bg-purple-400 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed'
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
          recordingSettings.audioSource === 'system' && useWhisper ? (
            <Monitor className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )
        )}
      </button>

      {/* Status Text */}
      <p className="mt-4 text-sm text-zinc-500">
        {processingStatus
          ? processingStatus
          : isProcessing
            ? 'Processing...'
            : isRecording
              ? `Recording${useWhisper ? ' (Whisper)' : ''}... (Click to stop)`
              : 'Click to record'}
      </p>

      {/* Recording Time */}
      {isRecording && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-lg font-mono text-white">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}

      {/* Live Transcript Preview (Web Speech API only - disabled during Whisper) */}
      {!useWhisper && (speechRecognition.transcript || speechRecognition.interimTranscript) && isRecording && (
        <div className="mt-4 max-w-lg p-4 rounded-lg bg-[#1a1325] border border-purple-500/10">
          <p className="text-xs text-zinc-500 mb-1">Live Transcription:</p>
          <p className="text-sm text-zinc-300">
            {speechRecognition.transcript}
            <span className="text-zinc-500 italic">{speechRecognition.interimTranscript}</span>
          </p>
        </div>
      )}

      {/* Whisper Mode Info */}
      {useWhisper && isRecording && (
        <div className="mt-4 max-w-lg p-4 rounded-lg bg-[#1a1325] border border-purple-500/10">
          <p className="text-xs text-zinc-500 mb-1">Whisper Mode Active</p>
          <p className="text-sm text-zinc-400">
            Audio is being recorded. Transcription will happen after you stop.
            {recordingSettings.enableLiveTranslation && (
              <span className="block mt-1 text-blue-400">
                Translation to {targetLangConfig?.name} will be applied to each segment.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Language & Hotkey Info */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="text-xs text-zinc-600">
          Language: <span className="text-zinc-400">{langConfig?.flag} {langConfig?.name}</span>
        </p>
        <p className="text-xs text-zinc-600">
          <kbd className="px-1.5 py-0.5 rounded bg-[#241b2f] text-zinc-500 font-mono text-[10px]">Ctrl</kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 rounded bg-[#241b2f] text-zinc-500 font-mono text-[10px]">Shift</kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 rounded bg-[#241b2f] text-zinc-500 font-mono text-[10px]">V</kbd>
          {' to '}{isRecording ? 'stop' : 'start'}
        </p>
      </div>
    </div>
  );
}
