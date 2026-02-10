'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';

interface VoiceCommandsReturn {
  isListening: boolean;
  lastCommand: string | null;
}

// Simple command triggers
const COMMANDS = {
  start: ['start', 'starten', 'aufnahme', 'record'],
  stop: ['stopp', 'stop', 'beenden', 'ende'],
};

export function useVoiceCommands(): VoiceCommandsReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const { voiceCommandsEnabled, recordingState, currentLanguage } = useAppStore();

  const processCommand = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();
    console.log('🎤 Heard:', lower);
    setLastCommand(lower);

    const state = useAppStore.getState();

    // Only process START when not recording
    if (state.recordingState === 'idle') {
      for (const trigger of COMMANDS.start) {
        if (lower.includes(trigger)) {
          console.log('✅ Voice: START');
          window.dispatchEvent(new CustomEvent('velamind:startRecording'));
          return;
        }
      }
    }

    // Only process STOP when recording
    if (state.recordingState === 'recording') {
      for (const trigger of COMMANDS.stop) {
        if (lower.includes(trigger)) {
          console.log('✅ Voice: STOP');
          window.dispatchEvent(new CustomEvent('velamind:stopRecording'));
          return;
        }
      }
    }
  }, []);

  useEffect(() => {
    // Don't run if disabled or during recording (recording has its own recognition)
    if (!voiceCommandsEnabled || recordingState === 'recording') {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
        setIsListening(false);
      }
      return;
    }

    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Don't start if already running
    if (recognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;

    const langCodes: Record<string, string> = { de: 'de-DE', en: 'en-US', bg: 'bg-BG' };
    recognition.lang = langCodes[currentLanguage] || 'de-DE';

    recognition.onstart = () => {
      console.log('🎤 Voice commands listening...');
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        processCommand(last[0].transcript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.log('Voice command error:', event.error);
      }
    };

    recognition.onend = () => {
      const state = useAppStore.getState();
      // Restart only if still enabled and not recording
      if (state.voiceCommandsEnabled && state.recordingState !== 'recording' && recognitionRef.current) {
        setTimeout(() => {
          try {
            if (recognitionRef.current) {
              recognitionRef.current.start();
            }
          } catch (e) {}
        }, 500);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      console.log('Could not start voice commands');
      recognitionRef.current = null;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }
      setIsListening(false);
    };
  }, [voiceCommandsEnabled, recordingState, currentLanguage, processCommand]);

  return { isListening, lastCommand };
}
