'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/lib/store';

interface VoiceCommandsReturn {
  isListening: boolean;
  lastCommand: string | null;
}

export function useVoiceCommands(): VoiceCommandsReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef(false);
  const isProcessingRef = useRef(false);
  
  const { voiceCommandsEnabled, recordingState } = useAppStore();

  // Refs aktualisieren
  useEffect(() => {
    isEnabledRef.current = voiceCommandsEnabled;
  }, [voiceCommandsEnabled]);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined') return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 1.0;
    speechSynthesis.speak(utterance);
  }, []);

  const processCommand = useCallback((transcript: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    const lower = transcript.toLowerCase().trim();
    console.log('🎤 Voice command:', lower);
    setLastCommand(lower);

    const state = useAppStore.getState();
    const isCurrentlyRecording = state.recordingState === 'recording';

    // STOP Befehl
    if ((lower.includes('stopp') || lower.includes('stop') || lower.includes('beenden') || lower.includes('ende')) 
        && !lower.includes('start')) {
      if (isCurrentlyRecording) {
        console.log('✅ Stopping recording via voice');
        window.dispatchEvent(new CustomEvent('velamind:stopRecording'));
        speak('Aufnahme gestoppt');
      }
      setTimeout(() => { isProcessingRef.current = false; }, 1000);
      return;
    }

    // START Befehl
    if (lower.includes('start') || lower.includes('aufnahme') || lower.includes('aufnehmen')) {
      if (!isCurrentlyRecording && state.recordingState === 'idle') {
        console.log('✅ Starting recording via voice');
        window.dispatchEvent(new CustomEvent('velamind:startRecording'));
        speak('Aufnahme gestartet');
      }
      setTimeout(() => { isProcessingRef.current = false; }, 1000);
      return;
    }

    // WICHTIG Befehl
    if (lower.includes('wichtig') || lower.includes('markier')) {
      if (state.selectedNoteId) {
        state.toggleImportant(state.selectedNoteId);
        speak('Notiz markiert');
      }
      setTimeout(() => { isProcessingRef.current = false; }, 500);
      return;
    }

    // HILFE Befehl
    if (lower.includes('hilfe') || lower.includes('help')) {
      speak('Sage: Start für Aufnahme, Stopp zum Beenden, Wichtig zum Markieren');
      setTimeout(() => { isProcessingRef.current = false; }, 500);
      return;
    }

    setTimeout(() => { isProcessingRef.current = false; }, 300);
  }, [speak]);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (recognitionRef.current) return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    console.log('🎤 Starting voice command listener...');
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'de-DE';

    recognition.onstart = () => {
      console.log('🎤 Voice command listener active');
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
        console.log('🎤 Error:', event.error);
      }
    };

    recognition.onend = () => {
      // NUR neu starten wenn:
      // 1. Voice Commands noch aktiviert sind
      // 2. KEINE Aufnahme läuft (sonst Konflikt!)
      const state = useAppStore.getState();
      const shouldRestart = isEnabledRef.current && state.recordingState !== 'recording';
      
      console.log('🎤 Listener ended, restart:', shouldRestart);
      
      if (shouldRestart && recognitionRef.current) {
        setTimeout(() => {
          try {
            if (recognitionRef.current && isEnabledRef.current) {
              const currentState = useAppStore.getState();
              if (currentState.recordingState !== 'recording') {
                recognitionRef.current.start();
              }
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
      speak('Sprachbefehle aktiviert');
    } catch (e) {
      console.error('Could not start:', e);
    }
  }, [processCommand, speak]);

  const stopListening = useCallback(() => {
    console.log('🎤 Stopping voice command listener...');
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Voice Commands pausieren wenn Aufnahme startet
  useEffect(() => {
    if (recordingState === 'recording' && recognitionRef.current) {
      console.log('🎤 Pausing voice commands for recording...');
      try { recognitionRef.current.stop(); } catch (e) {}
    } else if (recordingState === 'idle' && voiceCommandsEnabled && !recognitionRef.current) {
      console.log('🎤 Resuming voice commands after recording...');
      startListening();
    }
  }, [recordingState, voiceCommandsEnabled, startListening]);

  // Start/Stop basierend auf Setting
  useEffect(() => {
    if (voiceCommandsEnabled && recordingState !== 'recording') {
      startListening();
    } else if (!voiceCommandsEnabled) {
      stopListening();
    }
    
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, [voiceCommandsEnabled]);

  return { isListening, lastCommand };
}
