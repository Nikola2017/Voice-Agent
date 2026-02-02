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
  getTranscript: () => string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export function useSpeechRecognition(language: Language): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // WICHTIG: Transcript als Ref für synchronen Zugriff
  const transcriptRef = useRef('');
  const interimRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef(0);

  const langConfig = LANGUAGES.find(l => l.code === language);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Spracherkennung wird von diesem Browser nicht unterstützt. Bitte Chrome oder Edge verwenden.');
      return;
    }

    // Reset alles
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
    transcriptRef.current = '';
    interimRef.current = '';
    recordingTimeRef.current = 0;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langConfig?.speechCode || 'de-DE';

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        transcriptRef.current += finalTranscript;
        setTranscript(transcriptRef.current);
        console.log('Final transcript updated:', transcriptRef.current);
      }
      
      interimRef.current = interim;
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.');
      } else if (event.error === 'no-speech') {
        console.log('No speech detected - continuing...');
      } else if (event.error !== 'aborted') {
        setError(`Fehler: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      setError('Konnte Spracherkennung nicht starten.');
    }
  }, [isSupported, langConfig]);

  const stopRecording = useCallback((): string => {
    console.log('Stopping recording...');
    
    // WICHTIG: Erst alle Daten sammeln
    const final = transcriptRef.current;
    const interim = interimRef.current;
    const fullTranscript = (final + interim).trim();
    
    console.log('Final transcript:', final);
    console.log('Interim transcript:', interim);
    console.log('Full transcript:', fullTranscript);

    // Dann stoppen
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
    
    // Transcript mit interim aktualisieren
    if (interim) {
      transcriptRef.current = fullTranscript;
      setTranscript(fullTranscript);
    }
    
    setInterimTranscript('');
    interimRef.current = '';
    
    return fullTranscript;
  }, []);

  const resetTranscript = useCallback(() => {
    transcriptRef.current = '';
    interimRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
    recordingTimeRef.current = 0;
  }, []);

  const getTranscript = useCallback((): string => {
    return (transcriptRef.current + interimRef.current).trim();
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
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
    getTranscript,
  };
}
