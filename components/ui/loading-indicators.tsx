'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2, MessageCircle, Sparkles, Zap } from 'lucide-react';

interface LoadingDotsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingDots({ className, size = 'md' }: LoadingDotsProps) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const delayClasses = ['delay-0', 'delay-100', 'delay-200'];

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn(
            'bg-current rounded-full',
            sizeClasses[size],
            delayClasses[index]
          )}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

interface ThinkingIndicatorProps {
  className?: string;
  text?: string;
  showIcon?: boolean;
}

export function ThinkingIndicator({ 
  className, 
  text = 'Thinking',
  showIcon = true 
}: ThinkingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-center gap-2 text-muted-foreground',
        className
      )}
    >
      {showIcon && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles size={16} className="text-primary" />
        </motion.div>
      )}
      <span className="text-sm font-medium">{text}</span>
      <LoadingDots size="sm" />
    </motion.div>
  );
}

interface ProgressSpinnerProps {
  className?: string;
  size?: number;
  color?: string;
}

export function ProgressSpinner({ 
  className, 
  size = 16, 
  color = 'currentColor' 
}: ProgressSpinnerProps) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={className}
    >
      <Loader2 size={size} color={color} />
    </motion.div>
  );
}

interface TypingIndicatorProps {
  className?: string;
  isActive?: boolean;
}

export function TypingIndicator({ className, isActive = true }: TypingIndicatorProps) {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground',
        className
      )}
    >
      <MessageCircle size={14} />
      <span className="text-xs">AI is typing</span>
      <LoadingDots size="sm" />
    </motion.div>
  );
}

interface ProcessingIndicatorProps {
  className?: string;
  label?: string;
  progress?: number;
}

export function ProcessingIndicator({ 
  className, 
  label = 'Processing',
  progress 
}: ProcessingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 border',
        className
      )}
    >
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7] 
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: 'easeInOut' 
        }}
      >
        <Zap size={18} className="text-primary" />
      </motion.div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          {progress !== undefined && (
            <span className="text-xs text-muted-foreground">
              {Math.round(progress)}%
            </span>
          )}
        </div>
        
        {progress !== undefined && (
          <div className="mt-1 w-full bg-muted rounded-full h-1">
            <motion.div
              className="bg-primary h-1 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  message = 'Loading...', 
  className 
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center',
            className
          )}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex flex-col items-center gap-4 p-6 rounded-lg bg-card border shadow-lg"
          >
            <ProgressSpinner size={24} />
            <span className="text-sm font-medium">{message}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MessageLoadingProps {
  className?: string;
  lines?: number;
}

export function MessageLoading({ className, lines = 3 }: MessageLoadingProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            'h-4 bg-muted animate-pulse rounded',
            index === 0 && 'w-3/4',
            index === 1 && 'w-full',
            index === 2 && 'w-1/2'
          )}
        />
      ))}
    </div>
  );
}