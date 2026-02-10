'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { LANGUAGES, type Language } from '@/types';

interface VoiceCommandCallbacks {
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

export interface TranscriptSegment {
  timestamp: number;
  text: string;
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  isPaused: boolean;
  transcript: string;
  interimTranscript: string;
  transcriptSegments: TranscriptSegment[];
  recordingTime: number;
  error: string | null;
  isSupported: boolean;
  startRecording: () => void;
  stopRecording: () => string;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetTranscript: () => void;
}

// Wake word variations (how Google Speech Recognition actually hears "VelaMind")
const WAKE_WORDS = [
  // Original
  'velamind', 'vela mind', 'wella mind', 'mela mind', 'bella mind',
  'vela', 'wella', 'mela', 'bella', 'vella',
  // German misrecognitions (what Google actually hears!)
  'wähle meint', 'wähler meint', 'wähle mind', 'wähler mind',
  'wer meint', 'wer da meint', 'wer mind',
  'welle meint', 'welle mind', 'wellen mind',
  'fela mind', 'fella mind', 'fellow mind',
  'velo mind', 'velo meint', 'vella meint',
  'wella meint', 'mella mind', 'mella meint',
  // Short versions
  'wähle', 'wähler', 'welle', 'velo'
];

const STOP_WORDS = ['stop', 'stopp', 'beenden', 'ende', 'fertig', 'schluss'];
const PAUSE_WORDS = ['pause', 'pausieren', 'warte', 'halt'];
const RESUME_WORDS = ['weiter', 'fortsetzen', 'resume', 'continue', 'los'];

function detectCommand(text: string): 'stop' | 'pause' | 'resume' | null {
  const lower = text.toLowerCase();

  // Check if any wake word is present
  let hasWakeWord = false;
  for (const wake of WAKE_WORDS) {
    if (lower.includes(wake)) {
      hasWakeWord = true;
      break;
    }
  }

  if (!hasWakeWord) return null;

  // Check for commands
  for (const cmd of STOP_WORDS) {
    if (lower.includes(cmd)) return 'stop';
  }
  for (const cmd of PAUSE_WORDS) {
    if (lower.includes(cmd)) return 'pause';
  }
  for (const cmd of RESUME_WORDS) {
    if (lower.includes(cmd)) return 'resume';
  }

  return null;
}

function removeCommandFromText(text: string): string {
  let result = text;

  // Remove wake words and commands
  const allWords = [...WAKE_WORDS, ...STOP_WORDS, ...PAUSE_WORDS, ...RESUME_WORDS];
  for (const word of allWords) {
    const regex = new RegExp(word + '[.,!?]*\\s*', 'gi');
    result = result.replace(regex, '');
  }

  return result.trim();
}

export function useSpeechRecognition(
  language: Language,
  callbacks?: VoiceCommandCallbacks
): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const transcriptRef = useRef('');
  const recordingTimeRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);
  const callbacksRef = useRef(callbacks);
  const commandExecutedRef = useRef(false);

  const langConfig = LANGUAGES.find(l => l.code === language);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const executeCommand = useCallback((command: 'stop' | 'pause' | 'resume') => {
    // Prevent double execution
    if (commandExecutedRef.current) return;
    commandExecutedRef.current = true;

    console.log('🎤 EXECUTING COMMAND:', command);

    if (command === 'stop' && callbacksRef.current?.onStop) {
      callbacksRef.current.onStop();
    } else if (command === 'pause' && callbacksRef.current?.onPause) {
      callbacksRef.current.onPause();
    } else if (command === 'resume' && callbacksRef.current?.onResume) {
      callbacksRef.current.onResume();
    }

    // Reset after delay
    setTimeout(() => {
      commandExecutedRef.current = false;
    }, 2000);
  }, []);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Spracherkennung wird nicht unterstützt. Bitte Chrome oder Edge verwenden.');
      return;
    }

    if (recognitionRef.current) {
      console.log('Recognition already running');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setTranscriptSegments([]);
    setRecordingTime(0);
    setIsPaused(false);
    transcriptRef.current = '';
    recordingTimeRef.current = 0;
    isStoppingRef.current = false;
    commandExecutedRef.current = false;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langConfig?.speechCode || 'de-DE';

    recognition.onstart = () => {
      console.log('🎙️ Recording started');
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    };

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          // Check for command in final result
          const command = detectCommand(text);
          if (command) {
            console.log('🎤 Command in FINAL:', text, '→', command);
            const cleanText = removeCommandFromText(text);
            if (cleanText) final += cleanText + ' ';
            executeCommand(command);
          } else {
            final += text + ' ';
          }
        } else {
          // Check for command in INTERIM result (for faster response!)
          const command = detectCommand(text);
          if (command && !commandExecutedRef.current) {
            console.log('🎤 Command in INTERIM:', text, '→', command);
            executeCommand(command);
            // Don't add command to interim
          } else {
            interim += text;
          }
        }
      }

      if (final) {
        const newText = final.trim();
        // Check if we have new text to add as a segment
        if (newText.length > transcriptRef.current.length) {
          const newPart = newText.substring(transcriptRef.current.length).trim();
          if (newPart) {
            setTranscriptSegments(prev => [...prev, {
              timestamp: recordingTimeRef.current,
              text: newPart
            }]);
          }
        }
        transcriptRef.current = newText;
        setTranscript(newText);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.log('Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Mikrofon-Zugriff verweigert. Bitte in Browser-Einstellungen erlauben.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Fehler: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('🎙️ Recognition ended');

      if (!isStoppingRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            if (recognitionRef.current && !isStoppingRef.current) {
              recognition.start();
            }
          } catch (e) {
            console.log('Could not restart');
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      setError('Konnte Spracherkennung nicht starten.');
      recognitionRef.current = null;
    }
  }, [isSupported, langConfig, executeCommand]);

  const stopRecording = useCallback((): string => {
    console.log('🛑 Stopping recording...');
    isStoppingRef.current = true;

    const finalTranscript = (transcriptRef.current + ' ' + interimTranscript).trim();
    // Remove any remaining command words from final transcript
    const cleanTranscript = removeCommandFromText(finalTranscript);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);
    setTranscript(cleanTranscript);
    setInterimTranscript('');

    console.log('📝 Final:', cleanTranscript.substring(0, 50) + '...');
    return cleanTranscript;
  }, [interimTranscript]);

  const pauseRecording = useCallback(() => {
    console.log('⏸️ Pausing...');
    isStoppingRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsPaused(true);
  }, []);

  const resumeRecording = useCallback(() => {
    console.log('▶️ Resuming...');
    setIsPaused(false);
    isStoppingRef.current = false;
    commandExecutedRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } catch (e) {
        console.log('Could not resume');
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    transcriptRef.current = '';
    recordingTimeRef.current = 0;
    setTranscript('');
    setInterimTranscript('');
    setTranscriptSegments([]);
    setRecordingTime(0);
  }, []);

  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
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
  };
}
