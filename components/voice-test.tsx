'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useVoiceAssistant } from '@/hooks/use-voice-assistant';
import { VoiceButton } from './voice-button';
import { VoiceStatus } from './voice-status';
import { VoicePermissions } from './voice-permissions';
import { PlayCircle, Square, RotateCcw } from 'lucide-react';

/**
 * Voice Test Component - For testing voice functionality in isolation
 * This component can be used during development to test voice features
 */
export function VoiceTest() {
  const [transcriptions, setTranscriptions] = useState<Array<{ text: string; role: string; timestamp: Date }>>([]);
  const [audioEvents, setAudioEvents] = useState<Array<{ type: string; data: any; timestamp: Date }>>([]);

  const voiceAssistant = useVoiceAssistant({
    onTranscription: (text: string, role: string) => {
      setTranscriptions(prev => [...prev, { text, role, timestamp: new Date() }]);
    },
    onError: (error: string) => {
      setAudioEvents(prev => [...prev, { type: 'error', data: error, timestamp: new Date() }]);
    },
    onAudioReceived: (audioLength: number) => {
      setAudioEvents(prev => [...prev, { type: 'audio', data: { audioLength }, timestamp: new Date() }]);
    },
  });

  const clearLogs = () => {
    setTranscriptions([]);
    setAudioEvents([]);
  };

  const testSpeak = async () => {
    try {
      await voiceAssistant.speak('Hello, this is a test message from the voice assistant.');
    } catch (error) {
      console.error('Test speak failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Voice Assistant Test Interface</CardTitle>
          <CardDescription>
            Test voice recording, transcription, and assistant responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Status */}
          {voiceAssistant.permissionStatus !== 'granted' && (
            <VoicePermissions />
          )}

          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <Badge variant={voiceAssistant.isConnected ? 'default' : 'secondary'}>
              {voiceAssistant.isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant={voiceAssistant.state === 'error' ? 'destructive' : 'outline'}>
              State: {voiceAssistant.state}
            </Badge>
            {voiceAssistant.permissionStatus && (
              <Badge variant="outline">
                Permission: {voiceAssistant.permissionStatus}
              </Badge>
            )}
          </div>

          {/* Error Display */}
          {voiceAssistant.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <strong>Error:</strong> {voiceAssistant.error}
            </div>
          )}

          {/* Voice Status */}
          <VoiceStatus
            state={voiceAssistant.state}
            isConnected={voiceAssistant.isConnected}
            isRecording={voiceAssistant.isRecording}
            error={voiceAssistant.error}
          />

          {/* Controls */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={voiceAssistant.isConnected ? voiceAssistant.disconnect : voiceAssistant.connect}
            >
              {voiceAssistant.isConnected ? 'Disconnect' : 'Connect'}
            </Button>

            <VoiceButton
              state={voiceAssistant.state}
              isRecording={voiceAssistant.isRecording}
              isConnected={voiceAssistant.isConnected}
              audioLevel={voiceAssistant.audioLevel}
              onStartRecording={voiceAssistant.startRecording}
              onStopRecording={voiceAssistant.stopRecording}
              onConnect={voiceAssistant.connect}
              onDisconnect={voiceAssistant.disconnect}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={testSpeak}
              disabled={!voiceAssistant.isConnected}
            >
              <PlayCircle size={16} className="mr-2" />
              Test Speak
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
            >
              <RotateCcw size={16} className="mr-2" />
              Clear Logs
            </Button>
          </div>

          {/* Audio Level Indicator */}
          {voiceAssistant.isRecording && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Audio Level</label>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${voiceAssistant.audioLevel * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {Math.round(voiceAssistant.audioLevel * 100)}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcriptions Log */}
      {transcriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transcriptions</CardTitle>
            <CardDescription>
              Real-time speech-to-text results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transcriptions.map((transcription, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <Badge variant={transcription.role === 'user' ? 'default' : 'secondary'}>
                    {transcription.role}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{transcription.text}</p>
                    <span className="text-xs text-gray-500">
                      {transcription.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio Events Log */}
      {audioEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audio Events</CardTitle>
            <CardDescription>
              Audio processing and error events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {audioEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <Badge variant={event.type === 'error' ? 'destructive' : 'outline'}>
                    {event.type}
                  </Badge>
                  <div className="flex-1">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                    <span className="text-xs text-gray-500">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle>Session Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-gray-500">Voice Session ID</dt>
              <dd className="mt-1 font-mono text-xs bg-gray-100 p-2 rounded">
                {voiceAssistant.voiceSessionId || 'Not connected'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Permission Status</dt>
              <dd className="mt-1">
                <Badge variant="outline">
                  {voiceAssistant.permissionStatus || 'Unknown'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Recording State</dt>
              <dd className="mt-1">
                <Badge variant={voiceAssistant.isRecording ? 'default' : 'outline'}>
                  {voiceAssistant.isRecording ? 'Recording' : 'Not recording'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Connection State</dt>
              <dd className="mt-1">
                <Badge variant={voiceAssistant.isConnected ? 'default' : 'outline'}>
                  {voiceAssistant.isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}