'use client';

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Mic, Square, Loader2, AlertCircle, Pause, Play, Languages, Globe, Sparkles, Monitor } from 'lucide-react';
import { useSpeechRecognition, type TranscriptSegment } from '@/hooks/useSpeechRecognition';
import { useAppStore } from '@/lib/store';
import { LANGUAGES, type Note, type TimestampedSegment } from '@/types';

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

// Auto-translate function with better error handling
async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  // Don't translate if source and target are the same
  if (sourceLang === targetLang) {
    console.log(`[translateText] Skipping - same language: ${sourceLang}`);
    return text;
  }

  // Don't translate empty text
  if (!text || text.trim().length === 0) {
    console.log('[translateText] Skipping - empty text');
    return text;
  }

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  console.log(`[translateText] Requesting: ${sourceLang} → ${targetLang}, text: "${text.substring(0, 50)}..."`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[translateText] HTTP error: ${response.status}`);
      return text;
    }

    const data = await response.json();
    console.log(`[translateText] Response:`, data);

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      // Check if translation is valid (not the same as original for different languages)
      if (translated && translated.trim().length > 0) {
        console.log(`[translateText] Success: "${translated.substring(0, 50)}..."`);
        return translated;
      }
    }

    // Check for quota exceeded or other errors
    if (data.responseStatus === 403 || data.responseDetails?.includes('LIMIT')) {
      console.warn('[translateText] API quota exceeded');
    }

    console.warn(`[translateText] Failed with status: ${data.responseStatus}, details: ${data.responseDetails}`);
  } catch (e) {
    console.error('[translateText] Network/parsing error:', e);
  }

  return text;
}

export function AudioRecorder() {
  const {
    recordingState,
    setRecordingState,
    currentMode,
    currentLanguage,
    addNote,
    useWhisper,
    useSystemAudio,
  } = useAppStore();

  const [processingStatus, setProcessingStatus] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translateLang, setTranslateLang] = useState<'en' | 'de' | 'bg'>('en');
  const [translatedSegments, setTranslatedSegments] = useState<{[key: number]: string}>({});
  const [translatingSegments, setTranslatingSegments] = useState<{[key: number]: boolean}>({});

  // Whisper audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const [whisperError, setWhisperError] = useState<string | null>(null);
  const [whisperResult, setWhisperResult] = useState<{transcript: string; segments: any[]} | null>(null);

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
    transcriptSegments,
    recordingTime,
    error,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetTranscript,
  } = useSpeechRecognition(currentLanguage, voiceCallbacks);

  // Auto-translate new segments - translate ALL segments that don't have translations
  // Now also works with Whisper enabled (shows live translations during recording, final uses Whisper)
  useEffect(() => {
    if (autoTranslate && transcriptSegments.length > 0) {
      // Translate all segments that don't have translations yet and aren't currently being translated
      transcriptSegments.forEach((segment, index) => {
        if (!translatedSegments[index] && !translatingSegments[index]) {
          // Mark as translating to prevent duplicate requests
          setTranslatingSegments(prev => ({ ...prev, [index]: true }));

          console.log(`[Translation] Starting translation for segment ${index}: "${segment.text}" (${currentLanguage} → ${translateLang})`);

          translateText(segment.text, currentLanguage, translateLang)
            .then(translated => {
              console.log(`[Translation] Completed segment ${index}: "${translated}"`);
              setTranslatedSegments(prev => ({
                ...prev,
                [index]: translated
              }));
            })
            .catch(err => {
              console.error(`[Translation] Failed for segment ${index}:`, err);
            })
            .finally(() => {
              setTranslatingSegments(prev => ({ ...prev, [index]: false }));
            });
        }
      });
    }
  }, [transcriptSegments, autoTranslate, translateLang, translatedSegments, translatingSegments, currentLanguage]);

  // Handle stop and save
  const handleStop = useCallback(async () => {
    const webSpeechTranscript = stopRecording();

    console.log('=== Recording stopped ===');
    console.log('Web Speech Transcript:', webSpeechTranscript);

    // Stop MediaRecorder if Whisper is enabled
    let whisperTranscript = '';
    let whisperSegments: TimestampedSegment[] = [];

    if (useWhisper && mediaRecorderRef.current) {
      setRecordingState('processing');
      setProcessingStatus('🎯 Whisper AI analysiert Audio für beste Qualität...');

      try {
        // Stop the MediaRecorder and ensure all data is captured
        await new Promise<void>((resolve) => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            // Request any pending data before stopping
            try {
              mediaRecorderRef.current.requestData();
            } catch (e) {
              console.log('requestData not supported or failed');
            }

            // Wait for both the final dataavailable and onstop events
            let dataReceived = false;
            let stopped = false;

            const checkComplete = () => {
              if (dataReceived && stopped) {
                resolve();
              }
            };

            mediaRecorderRef.current.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
                console.log('Whisper: Final data chunk received, size:', event.data.size);
              }
              dataReceived = true;
              checkComplete();
            };

            mediaRecorderRef.current.onstop = () => {
              console.log('Whisper: MediaRecorder stopped, total chunks:', audioChunksRef.current.length);
              stopped = true;
              checkComplete();
            };

            mediaRecorderRef.current.stop();

            // Fallback timeout in case events don't fire properly
            setTimeout(() => {
              if (!stopped || !dataReceived) {
                console.warn('Whisper: Timeout waiting for MediaRecorder events');
                resolve();
              }
            }, 1000);
          } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            // If paused, resume briefly then stop
            mediaRecorderRef.current.resume();
            setTimeout(() => {
              if (mediaRecorderRef.current) {
                mediaRecorderRef.current.onstop = () => resolve();
                mediaRecorderRef.current.stop();
              } else {
                resolve();
              }
            }, 100);
          } else {
            resolve();
          }
        });

        // Stop all audio tracks
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        // Stop system audio stream if it was used
        if (systemStreamRef.current) {
          systemStreamRef.current.getTracks().forEach(track => track.stop());
          systemStreamRef.current = null;
        }

        // Create audio blob
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Determine correct file extension based on mimeType
        const fileExtension = mimeType.includes('mp4') ? 'mp4' :
                              mimeType.includes('ogg') ? 'ogg' :
                              mimeType.includes('wav') ? 'wav' : 'webm';

        console.log('Whisper: Audio blob size:', audioBlob.size, 'mimeType:', mimeType);

        if (audioBlob.size > 0) {
          // Send to Whisper API
          const formData = new FormData();
          formData.append('audio', audioBlob, `recording.${fileExtension}`);
          formData.append('language', currentLanguage);

          const response = await fetch('/api/whisper', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (data.success) {
            whisperTranscript = data.transcript;
            whisperSegments = data.segments?.map((seg: { timestamp: number; text: string }) => ({
              timestamp: seg.timestamp,
              text: seg.text,
              translation: undefined,
            })) || [];
            console.log('Whisper transcript:', whisperTranscript);
            setWhisperResult({ transcript: whisperTranscript, segments: whisperSegments });
            setProcessingStatus('✅ Whisper Transkription abgeschlossen!');
          } else {
            console.error('Whisper API error:', data.error);
            setWhisperError(data.message || 'Whisper Transkription fehlgeschlagen');
          }
        }
      } catch (err) {
        console.error('Whisper processing error:', err);
        setWhisperError('Whisper Verarbeitung fehlgeschlagen');
      }

      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    }

    // Use Whisper transcript if available, otherwise fall back to Web Speech
    const finalTranscript = useWhisper && whisperTranscript ? whisperTranscript : webSpeechTranscript;

    // Build timestamped segments with translations
    let savedTimestampedSegments: TimestampedSegment[];

    console.log('=== Building timestamped segments ===');
    console.log('useWhisper:', useWhisper);
    console.log('whisperSegments:', whisperSegments.length);
    console.log('transcriptSegments:', transcriptSegments.length);
    console.log('translatedSegments:', translatedSegments);
    console.log('autoTranslate:', autoTranslate);
    console.log('translateLang:', translateLang);

    if (useWhisper && whisperSegments.length > 0) {
      // Use Whisper segments - translations will be fetched fresh below
      // Don't try to match with Web Speech translations (they have different segment boundaries)
      savedTimestampedSegments = whisperSegments.map((segment) => ({
        ...segment,
        translation: undefined, // Will be translated fresh below
      }));
    } else {
      // Use Web Speech segments with translations
      savedTimestampedSegments = transcriptSegments.map((segment, index) => ({
        timestamp: segment.timestamp,
        text: segment.text,
        translation: translatedSegments[index] || undefined,
      }));
    }

    console.log('savedTimestampedSegments before final translation:', savedTimestampedSegments);

    if (!finalTranscript || finalTranscript.trim().length === 0) {
      setRecordingState('idle');
      setTranslatedSegments({});
      return;
    }

    setRecordingState('processing');
    setProcessingStatus('Erstelle Zusammenfassung...');

    // If auto-translate was enabled, translate all segments before saving
    if (autoTranslate && savedTimestampedSegments.length > 0) {
      const segmentCount = savedTimestampedSegments.length;
      setProcessingStatus(`🌐 Übersetze ${segmentCount} Segment${segmentCount > 1 ? 'e' : ''} nach ${translateLang.toUpperCase()}...`);
      console.log('=== Translating segments before save ===');

      const translatedSegmentsPromises = savedTimestampedSegments.map(async (segment, index) => {
        // Skip if already has translation
        if (segment.translation && segment.translation.trim().length > 0) {
          console.log(`Segment ${index}: Already has translation "${segment.translation}"`);
          return segment;
        }

        console.log(`Segment ${index}: Translating "${segment.text}" (${currentLanguage} → ${translateLang})`);
        const translation = await translateText(segment.text, currentLanguage, translateLang);
        console.log(`Segment ${index}: Got translation "${translation}"`);

        // Only set to undefined if translation is exactly the same AND languages are different
        // If source and target language are same, don't store translation
        const shouldStoreTranslation = currentLanguage !== translateLang && translation && translation.trim().length > 0;

        return {
          ...segment,
          translation: shouldStoreTranslation ? translation : undefined,
        };
      });

      savedTimestampedSegments = await Promise.all(translatedSegmentsPromises);
      console.log('Final segments with translations:', savedTimestampedSegments);
      setProcessingStatus('Erstelle Zusammenfassung...');
    }

    try {
      const { title, summary, sentiment } = await createAISummary(finalTranscript, currentLanguage);

      // Check if any segment has a translation
      const hasTranslations = savedTimestampedSegments.some(seg => seg.translation && seg.translation.trim().length > 0);

      console.log('=== Creating note ===');
      console.log('hasTranslations:', hasTranslations);
      console.log('autoTranslate:', autoTranslate);
      console.log('translateLang:', translateLang);
      console.log('Segments to save:', savedTimestampedSegments);

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
        // Save timestamped segments with translations
        timestampedSegments: savedTimestampedSegments.length > 0 ? savedTimestampedSegments : undefined,
        translationLanguage: autoTranslate && hasTranslations ? translateLang : undefined,
      };

      addNote(newNote);
      setProcessingStatus('✓ Gespeichert!');

      setTimeout(() => {
        setProcessingStatus('');
        setRecordingState('idle');
        resetTranscript();
        setTranslatedSegments({});
        setTranslatingSegments({});
        setWhisperResult(null);
      }, 1000);

    } catch (err) {
      console.error('Error:', err);
      const local = createLocalSummary(finalTranscript);
      // Check if any segment has a translation
      const hasTranslationsOnError = savedTimestampedSegments.some(seg => seg.translation);
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
        // Save timestamped segments with translations even on error
        timestampedSegments: savedTimestampedSegments.length > 0 ? savedTimestampedSegments : undefined,
        translationLanguage: autoTranslate && hasTranslationsOnError ? translateLang : undefined,
      };
      addNote(newNote);
      setRecordingState('idle');
      resetTranscript();
      setTranslatedSegments({});
      setTranslatingSegments({});
      setWhisperResult(null);
    }
  }, [stopRecording, currentLanguage, currentMode, recordingTime, setRecordingState, addNote, resetTranscript, transcriptSegments, translatedSegments, autoTranslate, translateLang, useWhisper]);

  // Handle start
  const handleStart = useCallback(async () => {
    console.log('=== Starting recording ===');
    resetTranscript();
    setTranslatedSegments({});
    setTranslatingSegments({});
    setWhisperError(null);
    setWhisperResult(null);

    // Start MediaRecorder for Whisper if enabled
    if (useWhisper) {
      try {
        let combinedStream: MediaStream;

        if (useSystemAudio) {
          // Capture system audio (from meetings, browser tabs, etc.)
          console.log('Whisper: Requesting system audio...');
          try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: { width: 1, height: 1 }, // Minimal video (required by some browsers)
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              }
            });

            // Stop the video track immediately (we only want audio)
            displayStream.getVideoTracks().forEach(track => track.stop());

            // Also get microphone audio to capture user's voice
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Combine system audio and microphone using AudioContext
            const audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();

            // Add system audio
            const systemAudioTracks = displayStream.getAudioTracks();
            if (systemAudioTracks.length > 0) {
              const systemSource = audioContext.createMediaStreamSource(new MediaStream(systemAudioTracks));
              systemSource.connect(destination);
              console.log('Whisper: System audio connected');
            } else {
              console.warn('Whisper: No system audio tracks available');
            }

            // Add microphone audio
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(destination);
            console.log('Whisper: Microphone audio connected');

            combinedStream = destination.stream;
            systemStreamRef.current = displayStream; // Keep reference to stop later

          } catch (displayErr) {
            console.warn('System audio not available, falling back to microphone only:', displayErr);
            setWhisperError('System-Audio nicht verfügbar - nur Mikrofon aktiv');
            combinedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
        } else {
          // Just microphone
          combinedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        const mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
        });

        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        // Capture in smaller chunks (250ms) to avoid losing data at the end
        mediaRecorder.start(250);
        console.log('Whisper: MediaRecorder started' + (useSystemAudio ? ' with system audio' : ''));
      } catch (err) {
        console.error('Failed to start MediaRecorder:', err);
        setWhisperError('Mikrofon-Zugriff fehlgeschlagen');
      }
    }

    startRecording();
    setRecordingState('recording');
  }, [resetTranscript, startRecording, setRecordingState, useWhisper, useSystemAudio]);

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
        // Stop MediaRecorder if running
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          mediaRecorderRef.current = null;
        }
        // Stop system audio stream if running
        if (systemStreamRef.current) {
          systemStreamRef.current.getTracks().forEach(track => track.stop());
          systemStreamRef.current = null;
        }
        audioChunksRef.current = [];
        setRecordingState('idle');
        resetTranscript();
        setTranslatedSegments({});
        setTranslatingSegments({});
        setWhisperResult(null);
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
      {/* Whisper Indicator */}
      {useWhisper && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-sm">
          <div className="flex items-center gap-2 text-green-400">
            <Sparkles className="w-4 h-4" />
            Whisper AI aktiviert - Bessere Transkription
          </div>
          {isRecording && (
            <p className="text-xs text-green-400/70 mt-1 ml-6">
              Live-Vorschau nutzt Browser-Erkennung. Whisper analysiert das komplette Audio nach dem Stoppen für höhere Genauigkeit.
            </p>
          )}
        </div>
      )}

      {/* System Audio Indicator */}
      {useSystemAudio && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center gap-2 text-blue-400 text-sm">
          <Monitor className="w-4 h-4" />
          System-Audio aktiviert - Erfasst Meeting-Teilnehmer
        </div>
      )}

      {/* Error */}
      {(error || whisperError) && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error || whisperError}
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

        {/* Auto-Translate Button */}
        {isRecording && (
          <button
            onClick={() => setAutoTranslate(!autoTranslate)}
            className={`absolute -left-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border flex items-center justify-center transition ${
              autoTranslate
                ? 'bg-blue-500 border-blue-400 text-white'
                : 'bg-[#241b2f] border-purple-500/30 text-zinc-400 hover:text-white hover:border-purple-500/50'
            }`}
            title="Auto-Übersetzen"
          >
            <Globe className="w-4 h-4" />
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

      {/* Auto-Translate Language Selector */}
      {isRecording && autoTranslate && (
        <div className="mt-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-zinc-500">Übersetzen nach:</span>
          <div className="flex gap-1">
            {[
              { code: 'en', flag: '🇬🇧', name: 'EN' },
              { code: 'de', flag: '🇩🇪', name: 'DE' },
              { code: 'bg', flag: '🇧🇬', name: 'BG' },
            ].map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  setTranslateLang(lang.code as 'en' | 'de' | 'bg');
                  setTranslatedSegments({});
                  setTranslatingSegments({});
                }}
                className={`px-2 py-1 rounded text-xs transition ${
                  translateLang === lang.code
                    ? 'bg-blue-500 text-white'
                    : 'bg-[#241b2f] text-zinc-400 hover:text-white'
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice Commands Info */}
      {isRecording && (
        <div className="mt-3 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-xs text-purple-300 text-center">
            🎤 Sage <span className="font-bold">&quot;VelaMind Stop&quot;</span> zum Beenden
            {!isPaused && <> oder <span className="font-bold">&quot;VelaMind Pause&quot;</span></>}
          </p>
        </div>
      )}

      {/* Live Transcript with Timestamps */}
      {isRecording && (transcriptSegments.length > 0 || interimTranscript) && (
        <div className="mt-4 w-full max-w-2xl rounded-lg bg-[#1a1325] border border-purple-500/10 overflow-hidden">
          <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/10 flex items-center justify-between">
            <span className="text-xs text-zinc-500 flex items-center gap-2">
              <Languages className="w-3 h-3" />
              {useWhisper ? (
                <span className="flex items-center gap-1">
                  <span className="text-yellow-400">Browser-Vorschau</span>
                  <span className="text-zinc-600">(Whisper analysiert nach Stopp)</span>
                </span>
              ) : (
                'Live-Transkription'
              )}
            </span>
            {autoTranslate && (
              <span className="text-xs text-blue-400">
                → {translateLang.toUpperCase()}
              </span>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {/* Timestamped Segments */}
            {transcriptSegments.map((segment, index) => (
              <div key={index} className="flex gap-3 py-2 border-b border-purple-500/5 last:border-0">
                <span className="text-xs font-mono text-purple-400 w-12 flex-shrink-0">
                  {formatTime(segment.timestamp)}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-zinc-300">{segment.text}</p>
                  {autoTranslate && (
                    translatingSegments[index] ? (
                      <p className="text-xs text-blue-400/50 mt-1 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Übersetze...
                      </p>
                    ) : translatedSegments[index] ? (
                      <p className="text-xs text-blue-400 mt-1">
                        → {translatedSegments[index]}
                      </p>
                    ) : null
                  )}
                </div>
              </div>
            ))}

            {/* Current interim text */}
            {interimTranscript && (
              <div className="flex gap-3 py-2">
                <span className="text-xs font-mono text-yellow-400 w-12 flex-shrink-0">
                  {formatTime(recordingTime)}
                </span>
                <p className="text-sm text-zinc-500 italic flex-1">{interimTranscript}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Whisper Result Display (shows after processing) */}
      {!isRecording && whisperResult && recordingState === 'processing' && (
        <div className="mt-4 w-full max-w-2xl rounded-lg bg-[#1a1325] border border-green-500/20 overflow-hidden">
          <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/10 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">
              Whisper AI Ergebnis
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {whisperResult.segments.map((segment: any, index: number) => (
              <div key={index} className="flex gap-3 py-2 border-b border-green-500/5 last:border-0">
                <span className="text-xs font-mono text-green-400 w-12 flex-shrink-0">
                  {formatTime(segment.timestamp)}
                </span>
                <p className="text-sm text-zinc-300 flex-1">{segment.text}</p>
              </div>
            ))}
          </div>
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
