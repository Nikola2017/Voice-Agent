'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { LANGUAGES, type Language } from '@/types';

interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  recordingTime: number;
  error: string | null;
  isSupported: boolean;
  startRecording: () => void;
  stopRecording: () => string;
  resetTranscript: () => void;
}

export function useSpeechRecognition(language: Language): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const transcriptRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);

  const langConfig = LANGUAGES.find(l => l.code === language);

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Spracherkennung wird nicht unterstützt. Bitte Chrome oder Edge verwenden.');
      return;
    }

    // Prevent double start
    if (recognitionRef.current) {
      console.log('Recognition already running');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
    transcriptRef.current = '';
    isStoppingRef.current = false;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langConfig?.speechCode || 'de-DE';

    recognition.onstart = () => {
      console.log('🎙️ Recording started');
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    };

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        transcriptRef.current = final.trim();
        setTranscript(final.trim());
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
      console.log('🎙️ Recognition ended, stopping:', isStoppingRef.current);

      // Only restart if not intentionally stopping
      if (!isStoppingRef.current && recognitionRef.current) {
        console.log('🔄 Auto-restarting...');
        try {
          recognition.start();
        } catch (e) {
          console.log('Could not restart');
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      setError('Konnte Spracherkennung nicht starten.');
      recognitionRef.current = null;
    }
  }, [isSupported, langConfig]);

  const stopRecording = useCallback((): string => {
    console.log('🛑 Stopping recording...');
    isStoppingRef.current = true;

    // Get final transcript
    const finalTranscript = (transcriptRef.current + ' ' + interimTranscript).trim();

    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setTranscript(finalTranscript);
    setInterimTranscript('');

    console.log('📝 Final:', finalTranscript.substring(0, 50) + '...');
    return finalTranscript;
  }, [interimTranscript]);

  const resetTranscript = useCallback(() => {
    transcriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
  }, []);

  // Cleanup on unmount
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
    transcript,
    interimTranscript,
    recordingTime,
    error,
    isSupported,
    startRecording,
    stopRecording,
    resetTranscript,
  };
}
