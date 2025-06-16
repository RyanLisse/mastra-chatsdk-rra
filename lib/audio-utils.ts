'use client';

/**
 * Audio utilities for handling voice interactions
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private onEndedCallback: (() => void) | null = null;

  constructor() {
    // Initialize audio context when needed
    this.ensureAudioContext();
  }

  private ensureAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
  }

  /**
   * Play audio from base64 encoded data
   */
  async playAudioFromBase64(
    base64Data: string,
    onEnded?: () => void,
  ): Promise<void> {
    try {
      this.ensureAudioContext();

      if (!this.audioContext) {
        throw new Error('Audio context not available');
      }

      // Stop any currently playing audio
      this.stop();

      // Decode base64 to array buffer
      const binaryString = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      // Set up event handlers
      this.onEndedCallback = onEnded || null;
      source.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        this.onEndedCallback?.();
      };

      // Resume audio context if suspended (required for some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Play the audio
      this.currentSource = source;
      this.isPlaying = true;
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      throw new Error('Failed to play audio response');
    }
  }

  /**
   * Play audio from URL
   */
  async playAudioFromUrl(url: string, onEnded?: () => void): Promise<void> {
    try {
      this.ensureAudioContext();

      if (!this.audioContext) {
        throw new Error('Audio context not available');
      }

      // Stop any currently playing audio
      this.stop();

      // Fetch audio data
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      // Set up event handlers
      this.onEndedCallback = onEnded || null;
      source.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        this.onEndedCallback?.();
      };

      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Play the audio
      this.currentSource = source;
      this.isPlaying = true;
      source.start();
    } catch (error) {
      console.error('Error playing audio from URL:', error);
      throw new Error('Failed to play audio from URL');
    }
  }

  /**
   * Stop currently playing audio
   */
  stop(): void {
    if (this.currentSource && this.isPlaying) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Ignore errors when stopping (might already be stopped)
      }
      this.currentSource = null;
      this.isPlaying = false;
    }
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get audio context state
   */
  getAudioContextState(): AudioContextState | null {
    return this.audioContext?.state || null;
  }

  /**
   * Resume audio context (useful for handling browser autoplay policies)
   */
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Dispose of audio resources
   */
  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Audio recorder utilities
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      // Get user media
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.getSupportedMimeType(),
      });

      this.audioChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw new Error('Failed to start audio recording');
    }
  }

  /**
   * Stop recording and return audio data
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const audioBlob = new Blob(this.audioChunks, {
            type: this.getSupportedMimeType(),
          });

          // Clean up
          this.cleanup();
          resolve(audioBlob);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }

  /**
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Clean up recording resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    if (this.isRecording) {
      this.mediaRecorder?.stop();
    }
    this.cleanup();
  }
}

/**
 * Convert audio blob to base64 string
 */
export async function audioToBase64(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just the base64 data
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
}

/**
 * Check if audio APIs are supported
 */
export function isAudioSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    window.MediaRecorder &&
    (window.AudioContext || (window as any).webkitAudioContext)
  );
}

/**
 * Check microphone permissions
 */
export async function checkMicrophonePermission(): Promise<PermissionState> {
  if (!('permissions' in navigator) || !navigator.mediaDevices) {
    // Fallback: try to access microphone
    try {
      const stream = await navigator.mediaDevices?.getUserMedia({
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch {
      return 'denied';
    }
  }

  try {
    const permission = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    });
    return permission.state;
  } catch {
    return 'prompt';
  }
}
