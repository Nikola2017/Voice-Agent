'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/lib/store';

interface VoiceCommandsReturn {
  isListening: boolean;
  lastCommand: string | null;
  supportedCommands: string[];
}

// Multi-language command definitions
const COMMAND_DEFINITIONS = {
  start: {
    triggers: ['start', 'starten', 'aufnahme', 'aufnehmen', 'record', 'начни', 'запис'],
    action: 'startRecording',
  },
  stop: {
    triggers: ['stopp', 'stop', 'beenden', 'ende', 'спри', 'стоп'],
    action: 'stopRecording',
  },
  help: {
    triggers: ['hilfe', 'help', 'befehle', 'commands', 'помощ'],
    action: 'showHelp',
  },
  important: {
    triggers: ['wichtig', 'important', 'markieren', 'mark', 'важно'],
    action: 'markImportant',
  },
  analytics: {
    triggers: ['analytics', 'statistik', 'analyse', 'статистика'],
    action: 'openAnalytics',
  },
  settings: {
    triggers: ['einstellungen', 'settings', 'optionen', 'настройки'],
    action: 'openSettings',
  },
};

export function useVoiceCommands(): VoiceCommandsReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef(false);
  const isProcessingRef = useRef(false);

  const { voiceCommandsEnabled, recordingState, currentLanguage } = useAppStore();

  // Update ref when enabled state changes
  useEffect(() => {
    isEnabledRef.current = voiceCommandsEnabled;
  }, [voiceCommandsEnabled]);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined') return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Set language based on current app language
    const langCodes: Record<string, string> = {
      de: 'de-DE',
      en: 'en-US',
      bg: 'bg-BG',
    };
    utterance.lang = langCodes[currentLanguage] || 'de-DE';
    utterance.rate = 1.0;
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
  }, [currentLanguage]);

  const processCommand = useCallback((transcript: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const lower = transcript.toLowerCase().trim();
    console.log('🎤 Voice command (background):', lower);
    setLastCommand(lower);

    const state = useAppStore.getState();
    const isCurrentlyRecording = state.recordingState === 'recording';

    // Check for START command (only when not recording)
    if (!isCurrentlyRecording) {
      for (const trigger of COMMAND_DEFINITIONS.start.triggers) {
        if (lower.includes(trigger)) {
          console.log('✅ Starting recording via voice');
          window.dispatchEvent(new CustomEvent('velamind:startRecording'));

          const messages: Record<string, string> = {
            de: 'Aufnahme gestartet',
            en: 'Recording started',
            bg: 'Записът започна',
          };
          speak(messages[currentLanguage] || messages.de);

          setTimeout(() => { isProcessingRef.current = false; }, 1500);
          return;
        }
      }
    }

    // Check for HELP command
    for (const trigger of COMMAND_DEFINITIONS.help.triggers) {
      if (lower.includes(trigger)) {
        const messages: Record<string, string> = {
          de: 'Verfügbare Befehle: Start für Aufnahme, Stopp zum Beenden, Wichtig zum Markieren, Einstellungen, Analytics',
          en: 'Available commands: Start to record, Stop to end, Important to mark, Settings, Analytics',
          bg: 'Налични команди: Започни за запис, Спри за край, Важно за маркиране',
        };
        speak(messages[currentLanguage] || messages.de);

        setTimeout(() => { isProcessingRef.current = false; }, 500);
        return;
      }
    }

    // Check for IMPORTANT command
    for (const trigger of COMMAND_DEFINITIONS.important.triggers) {
      if (lower.includes(trigger)) {
        if (state.selectedNoteId) {
          state.toggleImportant(state.selectedNoteId);

          const messages: Record<string, string> = {
            de: 'Notiz markiert',
            en: 'Note marked',
            bg: 'Бележката е маркирана',
          };
          speak(messages[currentLanguage] || messages.de);
        } else {
          const messages: Record<string, string> = {
            de: 'Keine Notiz ausgewählt',
            en: 'No note selected',
            bg: 'Няма избрана бележка',
          };
          speak(messages[currentLanguage] || messages.de);
        }

        setTimeout(() => { isProcessingRef.current = false; }, 500);
        return;
      }
    }

    // Check for ANALYTICS command
    for (const trigger of COMMAND_DEFINITIONS.analytics.triggers) {
      if (lower.includes(trigger)) {
        window.dispatchEvent(new CustomEvent('velamind:navigate', { detail: 'analytics' }));

        const messages: Record<string, string> = {
          de: 'Analytics geöffnet',
          en: 'Opening analytics',
          bg: 'Отваряне на статистиката',
        };
        speak(messages[currentLanguage] || messages.de);

        setTimeout(() => { isProcessingRef.current = false; }, 500);
        return;
      }
    }

    // Check for SETTINGS command
    for (const trigger of COMMAND_DEFINITIONS.settings.triggers) {
      if (lower.includes(trigger)) {
        window.dispatchEvent(new CustomEvent('velamind:navigate', { detail: 'settings' }));

        const messages: Record<string, string> = {
          de: 'Einstellungen geöffnet',
          en: 'Opening settings',
          bg: 'Отваряне на настройките',
        };
        speak(messages[currentLanguage] || messages.de);

        setTimeout(() => { isProcessingRef.current = false; }, 500);
        return;
      }
    }

    setTimeout(() => { isProcessingRef.current = false; }, 300);
  }, [speak, currentLanguage]);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (recognitionRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    console.log('🎤 Starting background voice command listener...');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;

    // Set language based on current app language
    const langCodes: Record<string, string> = {
      de: 'de-DE',
      en: 'en-US',
      bg: 'bg-BG',
    };
    recognition.lang = langCodes[currentLanguage] || 'de-DE';

    recognition.onstart = () => {
      console.log('🎤 Background voice listener active');
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
        console.log('🎤 Background listener error:', event.error);
      }
    };

    recognition.onend = () => {
      // Only restart if:
      // 1. Voice Commands still enabled
      // 2. NO recording in progress (recording uses its own recognition)
      const state = useAppStore.getState();
      const shouldRestart = isEnabledRef.current && state.recordingState !== 'recording';

      console.log('🎤 Background listener ended, restart:', shouldRestart);

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

      const messages: Record<string, string> = {
        de: 'Sprachbefehle aktiviert',
        en: 'Voice commands enabled',
        bg: 'Гласовите команди са активирани',
      };
      speak(messages[currentLanguage] || messages.de);
    } catch (e) {
      console.error('Could not start background voice listener:', e);
    }
  }, [processCommand, speak, currentLanguage]);

  const stopListening = useCallback(() => {
    console.log('🎤 Stopping background voice command listener...');
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Pause voice commands when recording starts, resume when it ends
  useEffect(() => {
    if (recordingState === 'recording' && recognitionRef.current) {
      console.log('🎤 Pausing background voice commands for recording...');
      try { recognitionRef.current.stop(); } catch (e) {}
    } else if (recordingState === 'idle' && voiceCommandsEnabled && !recognitionRef.current) {
      console.log('🎤 Resuming background voice commands after recording...');
      startListening();
    }
  }, [recordingState, voiceCommandsEnabled, startListening]);

  // Start/Stop based on setting
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
  }, [voiceCommandsEnabled, recordingState, startListening, stopListening]);

  // Get list of supported commands for display
  const supportedCommands = Object.keys(COMMAND_DEFINITIONS);

  return { isListening, lastCommand, supportedCommands };
}
