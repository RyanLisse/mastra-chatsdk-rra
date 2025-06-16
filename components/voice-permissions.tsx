'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { AlertCircle, Mic, MicOff, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkMicrophonePermission, isAudioSupported } from '@/lib/audio-utils';

export interface VoicePermissionsProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  className?: string;
}

export function VoicePermissions({
  onPermissionGranted,
  onPermissionDenied,
  className,
}: VoicePermissionsProps) {
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // Check initial permission state
  useEffect(() => {
    const checkInitialPermissions = async () => {
      if (!isAudioSupported()) {
        setIsSupported(false);
        return;
      }

      try {
        const permission = await checkMicrophonePermission();
        setPermissionState(permission);
        
        if (permission === 'granted') {
          onPermissionGranted?.();
        } else if (permission === 'denied') {
          onPermissionDenied?.();
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        setPermissionState('denied');
      }
    };

    checkInitialPermissions();
  }, [onPermissionGranted, onPermissionDenied]);

  const requestPermission = async () => {
    setIsChecking(true);
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Success - stop the stream and update state
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
      onPermissionGranted?.();
    } catch (error) {
      console.error('Permission denied:', error);
      setPermissionState('denied');
      onPermissionDenied?.();
    } finally {
      setIsChecking(false);
    }
  };

  const openSettings = () => {
    // Guide user to browser settings
    const userAgent = navigator.userAgent;
    let instructions = 'Please enable microphone access in your browser settings.';
    
    if (userAgent.includes('Chrome')) {
      instructions = 'Click the microphone icon in the address bar or go to Settings > Privacy and security > Site Settings > Microphone.';
    } else if (userAgent.includes('Firefox')) {
      instructions = 'Click the microphone icon in the address bar or go to Preferences > Privacy & Security > Permissions > Microphone.';
    } else if (userAgent.includes('Safari')) {
      instructions = 'Go to Safari > Preferences > Websites > Microphone and allow access for this site.';
    }
    
    alert(instructions);
  };

  if (!isSupported) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800',
        className
      )}>
        <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Voice features not supported</p>
          <p className="text-sm text-red-600">
            Your browser doesn&apos;t support the required audio features for voice interaction.
          </p>
        </div>
      </div>
    );
  }

  if (permissionState === 'granted') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800',
        className
      )}>
        <Mic size={16} className="text-green-500 flex-shrink-0" />
        <span className="text-sm font-medium">Microphone access granted</span>
      </div>
    );
  }

  if (permissionState === 'denied') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800',
        className
      )}>
        <MicOff size={20} className="text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Microphone access denied</p>
          <p className="text-sm text-red-600 mb-3">
            Voice features require microphone access to work properly.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={openSettings}
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <Settings size={14} className="mr-2" />
            Open Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800',
      className
    )}>
      <Mic size={20} className="text-blue-500 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Enable voice features</p>
        <p className="text-sm text-blue-600 mb-3">
          Allow microphone access to use speech-to-text and voice interactions.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={requestPermission}
          disabled={isChecking}
          className="text-blue-700 border-blue-300 hover:bg-blue-100"
        >
          {isChecking ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2" />
              Requesting...
            </>
          ) : (
            <>
              <Mic size={14} className="mr-2" />
              Allow Microphone
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Compact version for inline use
export function VoicePermissionStatus({ 
  permissionState, 
  onRequest, 
  className 
}: { 
  permissionState: PermissionState | null; 
  onRequest?: () => void;
  className?: string;
}) {
  if (permissionState === 'granted') {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-green-600', className)}>
        <Mic size={12} />
        <span>Microphone ready</span>
      </div>
    );
  }

  if (permissionState === 'denied') {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-red-600', className)}>
        <MicOff size={12} />
        <span>Microphone blocked</span>
      </div>
    );
  }

  return (
    <button
      onClick={onRequest}
      className={cn(
        'flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline',
        className
      )}
    >
      <Mic size={12} />
      <span>Enable microphone</span>
    </button>
  );
}