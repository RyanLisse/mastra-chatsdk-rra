'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { VoiceState } from '@/hooks/use-voice-assistant';
import { Mic, Volume2, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export interface VoiceStatusProps {
  state: VoiceState;
  isConnected: boolean;
  isRecording: boolean;
  currentTranscription?: string;
  error?: string | null;
  className?: string;
}

export function VoiceStatus({
  state,
  isConnected,
  isRecording,
  currentTranscription,
  error,
  className,
}: VoiceStatusProps) {
  const [displayText, setDisplayText] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Update display text based on state
  useEffect(() => {
    let text = '';
    let shouldShow = false;

    switch (state) {
      case 'connecting':
        text = 'Connecting to voice assistant...';
        shouldShow = true;
        break;
      case 'listening':
        text = currentTranscription || 'Listening...';
        shouldShow = true;
        break;
      case 'processing':
        text = 'Processing your message...';
        shouldShow = true;
        break;
      case 'speaking':
        text = 'Assistant is speaking...';
        shouldShow = true;
        break;
      case 'error':
        text = error || 'Voice error occurred';
        shouldShow = true;
        break;
      default:
        shouldShow = false;
        break;
    }

    setDisplayText(text);
    setIsVisible(shouldShow);
  }, [state, currentTranscription, error]);

  // Get status indicator props based on state
  const getStatusProps = () => {
    switch (state) {
      case 'connecting':
        return {
          icon: Loader2,
          iconClassName: 'animate-spin text-blue-500',
          textClassName: 'text-blue-600',
          bgClassName: 'bg-blue-50 border-blue-200',
        };
      case 'listening':
        return {
          icon: Mic,
          iconClassName: 'animate-pulse text-red-500',
          textClassName: 'text-red-600',
          bgClassName: 'bg-red-50 border-red-200',
        };
      case 'processing':
        return {
          icon: Loader2,
          iconClassName: 'animate-spin text-orange-500',
          textClassName: 'text-orange-600',
          bgClassName: 'bg-orange-50 border-orange-200',
        };
      case 'speaking':
        return {
          icon: Volume2,
          iconClassName: 'animate-pulse text-green-500',
          textClassName: 'text-green-600',
          bgClassName: 'bg-green-50 border-green-200',
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconClassName: 'text-red-500',
          textClassName: 'text-red-600',
          bgClassName: 'bg-red-50 border-red-200',
        };
      default:
        return {
          icon: isConnected ? Wifi : WifiOff,
          iconClassName: isConnected ? 'text-green-500' : 'text-gray-400',
          textClassName: 'text-gray-600',
          bgClassName: 'bg-gray-50 border-gray-200',
        };
    }
  };

  const { icon: Icon, iconClassName, textClassName, bgClassName } = getStatusProps();

  if (!isVisible && state === 'idle') {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ 
            type: 'spring', 
            stiffness: 300, 
            damping: 20,
            duration: 0.2 
          }}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium shadow-sm',
            bgClassName,
            className
          )}
        >
          <Icon size={16} className={iconClassName} />
          <span className={textClassName}>
            {displayText}
          </span>
          
          {/* Typing indicator for transcription */}
          {state === 'listening' && currentTranscription && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
              className="w-2 h-4 bg-current rounded-sm opacity-60"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Connection status indicator (can be used separately)
export function VoiceConnectionStatus({ 
  isConnected, 
  className 
}: { 
  isConnected: boolean; 
  className?: string; 
}) {
  return (
    <div className={cn('flex items-center gap-1 text-xs', className)}>
      {isConnected ? (
        <>
          <Wifi size={12} className="text-green-500" />
          <span className="text-green-600">Voice Connected</span>
        </>
      ) : (
        <>
          <WifiOff size={12} className="text-gray-400" />
          <span className="text-gray-500">Voice Disconnected</span>
        </>
      )}
    </div>
  );
}