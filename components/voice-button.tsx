'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import type { VoiceState } from '@/hooks/use-voice-assistant';

// We'll use Lucide React icons since they're available
import { Mic, MicOff, Volume2, Loader2, AlertCircle } from 'lucide-react';

export interface VoiceButtonProps {
  state: VoiceState;
  isRecording: boolean;
  isConnected: boolean;
  audioLevel: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceButton({
  state,
  isRecording,
  isConnected,
  audioLevel,
  onStartRecording,
  onStopRecording,
  onConnect,
  onDisconnect,
  disabled = false,
  className,
}: VoiceButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  // Handle press and hold for recording
  const handleMouseDown = () => {
    if (disabled || state === 'error') return;
    
    if (!isConnected) {
      onConnect();
      return;
    }

    if (!isRecording && state !== 'processing') {
      setIsPressed(true);
      onStartRecording();
    }
  };

  const handleMouseUp = () => {
    if (isPressed && isRecording) {
      setIsPressed(false);
      onStopRecording();
    }
  };

  // Reset pressed state when recording stops externally
  useEffect(() => {
    if (!isRecording && isPressed) {
      setIsPressed(false);
    }
  }, [isRecording, isPressed]);

  const handleClick = () => {
    if (disabled || state === 'error') return;
    
    if (!isConnected) {
      onConnect();
      return;
    }

    // For click-to-talk mode (optional)
    if (!isRecording && state !== 'processing') {
      onStartRecording();
    } else if (isRecording) {
      onStopRecording();
    }
  };

  // Handle keyboard events for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        handleMouseDown();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        handleMouseUp();
      }
    };

    if (isPressed) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPressed]);

  // Get button appearance based on state
  const getButtonAppearance = () => {
    switch (state) {
      case 'error':
        return {
          icon: AlertCircle,
          variant: 'destructive' as const,
          className: 'text-destructive-foreground animate-pulse',
          tooltip: 'Voice error - click to retry',
        };
      case 'connecting':
        return {
          icon: Loader2,
          variant: 'outline' as const,
          className: 'animate-spin',
          tooltip: 'Connecting to voice assistant...',
        };
      case 'listening':
        return {
          icon: Mic,
          variant: 'default' as const,
          className: cn(
            'bg-red-500 hover:bg-red-600 text-white animate-pulse',
            isPressed && 'scale-110'
          ),
          tooltip: 'Listening... Release to stop',
        };
      case 'speaking':
        return {
          icon: Volume2,
          variant: 'outline' as const,
          className: 'animate-pulse',
          tooltip: 'Assistant is speaking',
        };
      case 'processing':
        return {
          icon: Loader2,
          variant: 'outline' as const,
          className: 'animate-spin',
          tooltip: 'Processing audio...',
        };
      default:
        return {
          icon: isConnected ? Mic : MicOff,
          variant: 'outline' as const,
          className: isConnected ? 'hover:bg-primary hover:text-primary-foreground' : 'opacity-50',
          tooltip: isConnected ? 'Hold to talk' : 'Click to connect voice assistant',
        };
    }
  };

  const { icon: Icon, variant, className: stateClassName, tooltip } = getButtonAppearance();

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="sm"
            className={cn(
              'rounded-full p-2 h-fit transition-all duration-200',
              stateClassName,
              className
            )}
            disabled={disabled}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            aria-label={tooltip}
          >
            <Icon size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {tooltip}
        </TooltipContent>
      </Tooltip>

      {/* Audio level indicator */}
      {isRecording && audioLevel > 0 && (
        <div className="absolute -inset-1 rounded-full border-2 border-red-500 opacity-50">
          <div 
            className="absolute inset-0 rounded-full bg-red-500 opacity-30 transition-transform duration-100"
            style={{
              transform: `scale(${1 + audioLevel * 0.5})`
            }}
          />
        </div>
      )}
    </div>
  );
}