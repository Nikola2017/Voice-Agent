'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { LANGUAGES, type Language } from '@/types';

interface VoiceCommandCallback {
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onImportant?: () => void;
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  recordingTime: number;
  error: string | null;
  isSupported: boolean;
  isPaused: boolean;
  audioLevel: number;
  startRecording: () => void;
  stopRecording: () => string;
  pauseRecording: () => void;
  resumeRecording: () => void;
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

// Voice command patterns for different languages
const STOP_COMMANDS = ['stopp', 'stop', 'beenden', 'ende', 'aufhören', 'fertig', 'спри', 'стоп'];
const PAUSE_COMMANDS = ['pause', 'pausieren', 'пауза'];
const CANCEL_COMMANDS = ['abbrechen', 'cancel', 'verwerfen', 'отмени'];
const IMPORTANT_COMMANDS = ['wichtig', 'important', 'markieren', 'важно'];

function detectVoiceCommand(text: string): string | null {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);
  const lastWords = words.slice(-3).join(' '); // Check last 3 words

  for (const cmd of STOP_COMMANDS) {
    if (lastWords.includes(cmd) && !lastWords.includes('start')) {
      return 'stop';
    }
  }

  for (const cmd of PAUSE_COMMANDS) {
    if (lastWords.includes(cmd)) {
      return 'pause';
    }
  }

  for (const cmd of CANCEL_COMMANDS) {
    if (lastWords.includes(cmd)) {
      return 'cancel';
    }
  }

  for (const cmd of IMPORTANT_COMMANDS) {
    if (lastWords.includes(cmd)) {
      return 'important';
    }
  }

  return null;
}

export function useSpeechRecognition(
  language: Language,
  voiceCommands?: VoiceCommandCallback
): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for synchronous access
  const transcriptRef = useRef('');
  const interimRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef(0);
  const voiceCommandsRef = useRef(voiceCommands);
  const commandCooldownRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const langConfig = LANGUAGES.find(l => l.code === language);

  // Update voice commands ref
  useEffect(() => {
    voiceCommandsRef.current = voiceCommands;
  }, [voiceCommands]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  // Audio level monitoring
  const startAudioMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(average / 128, 1)); // Normalize to 0-1

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.log('Audio monitoring not available');
    }
  }, []);

  const stopAudioMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const handleVoiceCommand = useCallback((command: string) => {
    if (commandCooldownRef.current) return;

    commandCooldownRef.current = true;
    setTimeout(() => { commandCooldownRef.current = false; }, 1500);

    console.log('🎤 Voice command detected:', command);

    // Provide audio feedback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const messages: Record<string, string> = {
        stop: language === 'de' ? 'Aufnahme wird gestoppt' : language === 'bg' ? 'Спиране на записа' : 'Stopping recording',
        pause: language === 'de' ? 'Pausiert' : language === 'bg' ? 'Пауза' : 'Paused',
        cancel: language === 'de' ? 'Aufnahme verworfen' : language === 'bg' ? 'Записът е отменен' : 'Recording cancelled',
        important: language === 'de' ? 'Als wichtig markiert' : language === 'bg' ? 'Маркирано като важно' : 'Marked as important',
      };

      const utterance = new SpeechSynthesisUtterance(messages[command] || command);
      utterance.lang = langConfig?.speechCode || 'de-DE';
      utterance.rate = 1.1;
      utterance.volume = 0.7;
      speechSynthesis.speak(utterance);
    }

    switch (command) {
      case 'stop':
        voiceCommandsRef.current?.onStop?.();
        break;
      case 'pause':
        voiceCommandsRef.current?.onPause?.();
        break;
      case 'cancel':
        voiceCommandsRef.current?.onCancel?.();
        break;
      case 'important':
        voiceCommandsRef.current?.onImportant?.();
        break;
    }
  }, [language, langConfig]);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Spracherkennung wird von diesem Browser nicht unterstützt. Bitte Chrome oder Edge verwenden.');
      return;
    }

    // Reset everything
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
    setIsPaused(false);
    transcriptRef.current = '';
    interimRef.current = '';
    recordingTimeRef.current = 0;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langConfig?.speechCode || 'de-DE';

    recognition.onstart = () => {
      console.log('🎙️ Speech recognition started');
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
        const text = result[0].transcript;

        if (result.isFinal) {
          // Check for voice commands in final results
          const command = detectVoiceCommand(text);
          if (command && voiceCommandsRef.current) {
            console.log('🎤 Command detected in speech:', command);
            // Remove the command from transcript
            const cleanText = text.replace(/\b(stopp|stop|beenden|ende|aufhören|fertig|pause|pausieren|abbrechen|cancel|wichtig|important|markieren|спри|стоп|пауза|отмени|важно)\b/gi, '').trim();
            if (cleanText) {
              finalTranscript += cleanText + ' ';
            }
            // Execute command after small delay
            setTimeout(() => handleVoiceCommand(command), 100);
          } else {
            finalTranscript += text + ' ';
          }
        } else {
          interim += text;
        }
      }

      if (finalTranscript) {
        transcriptRef.current += finalTranscript;
        setTranscript(transcriptRef.current);
        console.log('📝 Transcript updated:', transcriptRef.current.slice(-50));
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
      console.log('🎙️ Speech recognition ended');
      // Auto-restart if still recording (browser may stop after silence)
      if (recognitionRef.current && !isPaused) {
        try {
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch (e) {
          console.log('Could not restart recognition');
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      startAudioMonitoring();
    } catch (e) {
      setError('Konnte Spracherkennung nicht starten.');
    }
  }, [isSupported, langConfig, isPaused, handleVoiceCommand, startAudioMonitoring]);

  const stopRecording = useCallback((): string => {
    console.log('🛑 Stopping recording...');

    // Get all data first
    const final = transcriptRef.current;
    const interim = interimRef.current;
    const fullTranscript = (final + interim).trim();

    console.log('📝 Final transcript:', fullTranscript.slice(0, 100) + '...');

    // Then stop
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

    stopAudioMonitoring();
    setIsRecording(false);
    setIsPaused(false);

    // Update transcript with interim
    if (interim) {
      transcriptRef.current = fullTranscript;
      setTranscript(fullTranscript);
    }

    setInterimTranscript('');
    interimRef.current = '';

    return fullTranscript;
  }, [stopAudioMonitoring]);

  const pauseRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsPaused(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    setIsPaused(false);

    try {
      recognitionRef.current.start();
      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } catch (e) {
      console.error('Could not resume:', e);
    }
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

  // Cleanup
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
      stopAudioMonitoring();
    };
  }, [stopAudioMonitoring]);

  return {
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
    getTranscript,
  };
}
