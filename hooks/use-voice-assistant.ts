'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  AudioPlayer,
  AudioRecorder,
  audioToBase64,
  isAudioSupported,
  checkMicrophonePermission,
} from '@/lib/audio-utils';

export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'processing'
  | 'error';

export interface VoiceMessage {
  type: 'transcription' | 'audio' | 'error' | 'disconnect' | 'connected';
  text?: string;
  role?: string;
  audioLength?: number;
  error?: string;
  sessionId?: string;
  message?: string;
}

export interface VoiceAssistantOptions {
  sessionId?: string;
  model?: string;
  speaker?: string;
  onTranscription?: (text: string, role: string) => void;
  onError?: (error: string) => void;
  onAudioReceived?: (audioLength: number) => void;
}

export interface UseVoiceAssistantReturn {
  state: VoiceState;
  isRecording: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  speak: (text: string) => Promise<void>;
  error: string | null;
  voiceSessionId: string | null;
  audioLevel: number;
  permissionStatus: PermissionState | null;
}

export function useVoiceAssistant(
  options: VoiceAssistantOptions = {},
): UseVoiceAssistantReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const {
    sessionId,
    model = 'gpt-4o-mini-realtime-preview-2024-12-17',
    speaker = 'alloy',
    onTranscription,
    onError,
    onAudioReceived,
  } = options;

  // Check microphone permissions and audio support
  const checkPermissions = useCallback(async (): Promise<boolean> => {
    try {
      if (!isAudioSupported()) {
        setError('Audio features not supported in this browser');
        return false;
      }

      const permission = await checkMicrophonePermission();
      setPermissionStatus(permission);

      if (permission === 'denied') {
        setError(
          'Microphone permission denied. Please enable microphone access in your browser settings.',
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error checking permissions:', err);
      setError('Error checking microphone permissions');
      return false;
    }
  }, []);

  // Initialize voice session
  const connect = useCallback(async () => {
    try {
      setState('connecting');
      setError(null);

      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        setState('error');
        return;
      }

      // Initialize voice session with backend
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          model,
          speaker,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Failed to initialize voice session',
        );
      }

      const data = await response.json();
      setVoiceSessionId(data.sessionId);

      // Initialize audio player
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new AudioPlayer();
      }

      // Establish SSE connection
      const eventSource = new EventSource(
        `/api/voice?sessionId=${data.sessionId}`,
      );
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const message: VoiceMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              setIsConnected(true);
              setState('idle');
              break;

            case 'transcription':
              if (message.text && message.role) {
                onTranscription?.(message.text, message.role);
              }
              break;

            case 'audio':
              if (message.audioLength) {
                setState('speaking');
                onAudioReceived?.(message.audioLength);
                // Note: In a real implementation, you'd receive base64 audio data
                // and play it using audioPlayerRef.current.playAudioFromBase64()
                // For now, we'll simulate the speaking state
                setTimeout(
                  () => {
                    if (state !== 'listening' && state !== 'processing') {
                      setState('idle');
                    }
                  },
                  Math.max(1000, message.audioLength * 100),
                ); // Estimate duration
              }
              break;

            case 'error': {
              const errorMsg = message.error || 'Voice session error';
              setError(errorMsg);
              setState('error');
              onError?.(errorMsg);
              break;
            }

            case 'disconnect':
              setIsConnected(false);
              setState('idle');
              break;
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        setError('Connection to voice service lost');
        setState('error');
        setIsConnected(false);
      };
    } catch (err) {
      console.error('Error connecting to voice assistant:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to connect to voice assistant',
      );
      setState('error');
    }
  }, [
    sessionId,
    model,
    speaker,
    onTranscription,
    onError,
    onAudioReceived,
    checkPermissions,
    state,
  ]);

  // Disconnect voice session
  const disconnect = useCallback(async () => {
    try {
      // Stop recording if active
      if (isRecording) {
        stopRecording();
      }

      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Clean up audio player
      if (audioPlayerRef.current) {
        audioPlayerRef.current.dispose();
        audioPlayerRef.current = null;
      }

      // Clean up audio recorder
      if (audioRecorderRef.current) {
        audioRecorderRef.current.dispose();
        audioRecorderRef.current = null;
      }

      // Clean up audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Stop audio level monitoring
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }

      // Disconnect backend session
      if (voiceSessionId) {
        await fetch(`/api/voice?sessionId=${voiceSessionId}`, {
          method: 'DELETE',
        });
      }

      setIsConnected(false);
      setVoiceSessionId(null);
      setState('idle');
      setError(null);
    } catch (err) {
      console.error('Error disconnecting voice assistant:', err);
    }
  }, [isRecording, voiceSessionId]);

  // Start audio recording
  const startRecording = useCallback(async () => {
    try {
      setState('processing');
      setError(null);

      if (!isConnected) {
        throw new Error('Voice assistant not connected');
      }

      // Initialize audio recorder
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder();
      }

      // Start recording
      await audioRecorderRef.current.startRecording();

      // Set up audio level monitoring
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Start audio level monitoring
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      audioLevelIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
        }
      }, 100);

      setIsRecording(true);
      setState('listening');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to start recording',
      );
      setState('error');
      toast.error(
        'Failed to access microphone. Please check your browser permissions.',
      );
    }
  }, [isConnected, voiceSessionId]);

  // Stop audio recording
  const stopRecording = useCallback(async () => {
    try {
      if (audioRecorderRef.current && isRecording) {
        setState('processing');

        // Stop recording and get audio data
        const audioBlob = await audioRecorderRef.current.stopRecording();
        const base64Audio = await audioToBase64(audioBlob);

        // Send audio to backend
        if (voiceSessionId) {
          await fetch('/api/voice', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: voiceSessionId,
              action: 'sendAudio',
              audioData: base64Audio,
            }),
          });
        }

        setIsRecording(false);
      }

      // Stop audio level monitoring
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }

      // Clean up audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      setAudioLevel(0);
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError('Failed to process recorded audio');
      setState('error');
    }
  }, [isRecording, voiceSessionId]);

  // Send text to voice assistant
  const speak = useCallback(
    async (text: string) => {
      try {
        if (!isConnected || !voiceSessionId) {
          throw new Error('Voice assistant not connected');
        }

        setState('processing');

        await fetch('/api/voice', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: voiceSessionId,
            action: 'speak',
            text,
          }),
        });
      } catch (err) {
        console.error('Error sending text to voice assistant:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to send text to voice assistant',
        );
        setState('error');
      }
    },
    [isConnected, voiceSessionId],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    isRecording,
    isConnected,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    speak,
    error,
    voiceSessionId,
    audioLevel,
    permissionStatus,
  };
}
