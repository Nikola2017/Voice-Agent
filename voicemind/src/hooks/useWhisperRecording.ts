'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Language, AudioSource, WhisperSegment } from '@/types';

interface UseWhisperRecordingReturn {
  isRecording: boolean;
  recordingTime: number;
  error: string | null;
  isSupported: boolean;
  isProcessing: boolean;
  audioSource: AudioSource;
  startRecording: (source?: AudioSource) => Promise<void>;
  stopRecording: () => Promise<{
    text: string;
    segments: WhisperSegment[];
    duration: number;
  } | null>;
  cancelRecording: () => void;
  setAudioSource: (source: AudioSource) => void;
}

export function useWhisperRecording(language: Language): UseWhisperRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check for MediaRecorder and getUserMedia support
    setIsSupported(
      typeof MediaRecorder !== 'undefined' &&
      !!(navigator.mediaDevices?.getUserMedia || navigator.mediaDevices?.getDisplayMedia)
    );
  }, []);

  const getMicrophoneStream = async (): Promise<MediaStream> => {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
      },
    });
  };

  const getSystemAudioStream = async (): Promise<MediaStream> => {
    // Use getDisplayMedia with audio to capture system audio
    // This requires user to share a screen/window with audio
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true, // Required for getDisplayMedia
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      } as any,
    });

    // We only need the audio track
    const audioTrack = displayStream.getAudioTracks()[0];

    if (!audioTrack) {
      // Stop all tracks
      displayStream.getTracks().forEach(track => track.stop());
      throw new Error('No audio track available. Please select a window/tab with audio.');
    }

    // Stop video track as we don't need it
    displayStream.getVideoTracks().forEach(track => track.stop());

    // Create new stream with only audio
    return new MediaStream([audioTrack]);
  };

  const getCombinedStream = async (): Promise<MediaStream> => {
    const [micStream, systemStream] = await Promise.all([
      getMicrophoneStream(),
      getSystemAudioStream(),
    ]);

    // Combine both streams using AudioContext
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    const micSource = audioContext.createMediaStreamSource(micStream);
    const systemSource = audioContext.createMediaStreamSource(systemStream);

    micSource.connect(destination);
    systemSource.connect(destination);

    // Store original streams for cleanup
    (destination.stream as any)._originalStreams = [micStream, systemStream];
    (destination.stream as any)._audioContext = audioContext;

    return destination.stream;
  };

  const startRecording = useCallback(async (source?: AudioSource) => {
    const recordingSource = source || audioSource;
    setError(null);
    audioChunksRef.current = [];

    try {
      let stream: MediaStream;

      switch (recordingSource) {
        case 'system':
          stream = await getSystemAudioStream();
          break;
        case 'both':
          stream = await getCombinedStream();
          break;
        case 'microphone':
        default:
          stream = await getMicrophoneStream();
          break;
      }

      streamRef.current = stream;

      // Use webm format which is widely supported
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording error: ' + (event.error?.message || 'Unknown error'));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

    } catch (err: any) {
      console.error('Error starting recording:', err);

      if (err.name === 'NotAllowedError') {
        setError('Permission denied. Please allow access to audio.');
      } else if (err.name === 'NotFoundError') {
        setError('No audio input device found.');
      } else if (recordingSource === 'system' || recordingSource === 'both') {
        setError('System audio capture requires selecting a tab/window with audio. ' + err.message);
      } else {
        setError(`Failed to start recording: ${err.message}`);
      }
    }
  }, [audioSource]);

  const stopRecording = useCallback(async () => {
    return new Promise<{ text: string; segments: WhisperSegment[]; duration: number } | null>((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      const recordedDuration = recordingTime;

      mediaRecorderRef.current.onstop = async () => {
        // Clean up timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Clean up streams
        if (streamRef.current) {
          // Handle combined streams
          const originalStreams = (streamRef.current as any)._originalStreams;
          const audioContext = (streamRef.current as any)._audioContext;

          if (originalStreams) {
            originalStreams.forEach((s: MediaStream) => {
              s.getTracks().forEach(track => track.stop());
            });
          }
          if (audioContext) {
            audioContext.close();
          }

          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        setIsRecording(false);

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        if (audioBlob.size === 0) {
          setError('No audio recorded');
          resolve(null);
          return;
        }

        // Send to Whisper API
        setIsProcessing(true);

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', language);

          const response = await fetch('/api/whisper', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (data.success) {
            resolve({
              text: data.text,
              segments: data.segments,
              duration: data.duration || recordedDuration,
            });
          } else {
            setError(data.message || 'Whisper transcription failed');
            resolve(null);
          }
        } catch (err: any) {
          console.error('Error sending to Whisper:', err);
          setError('Failed to transcribe audio: ' + err.message);
          resolve(null);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [language, recordingTime]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      const originalStreams = (streamRef.current as any)._originalStreams;
      const audioContext = (streamRef.current as any)._audioContext;

      if (originalStreams) {
        originalStreams.forEach((s: MediaStream) => {
          s.getTracks().forEach(track => track.stop());
        });
      }
      if (audioContext) {
        audioContext.close();
      }

      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, [cancelRecording]);

  return {
    isRecording,
    recordingTime,
    error,
    isSupported,
    isProcessing,
    audioSource,
    startRecording,
    stopRecording,
    cancelRecording,
    setAudioSource,
  };
}
