'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/toast';
import { Button } from './button';
import { Card, CardContent } from './card';
import { AlertTriangle, RefreshCw, X, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GlobalError {
  id: string;
  type: 'network' | 'api' | 'auth' | 'timeout' | 'validation' | 'unknown';
  title: string;
  message: string;
  details?: string;
  timestamp: Date;
  retryable: boolean;
  retryAction?: () => Promise<void>;
  dismissible: boolean;
}

interface GlobalErrorContextType {
  errors: GlobalError[];
  addError: (error: Omit<GlobalError, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearAllErrors: () => void;
  retryError: (id: string) => Promise<void>;
  isOnline: boolean;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined);

export function useGlobalError() {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
}

interface GlobalErrorProviderProps {
  children: ReactNode;
}

export function GlobalErrorProvider({ children }: GlobalErrorProviderProps) {
  const [errors, setErrors] = useState<GlobalError[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Monitor online/offline status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addError = useCallback((errorData: Omit<GlobalError, 'id' | 'timestamp'>) => {
    const error: GlobalError = {
      ...errorData,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    setErrors(prev => [error, ...prev.slice(0, 4)]); // Keep max 5 errors

    // Also show as toast for immediate feedback
    toast({
      type: 'error',
      description: error.title,
    });
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const retryError = useCallback(async (id: string) => {
    const error = errors.find(e => e.id === id);
    if (!error?.retryAction) return;

    try {
      await error.retryAction();
      removeError(id);
      toast({
        type: 'success',
        description: 'Action completed successfully',
      });
    } catch (retryError) {
      console.error('Error during retry:', retryError);
      toast({
        type: 'error',
        description: 'Retry failed. Please try again.',
      });
    }
  }, [errors, removeError]);

  return (
    <GlobalErrorContext.Provider
      value={{
        errors,
        addError,
        removeError,
        clearAllErrors,
        retryError,
        isOnline,
      }}
    >
      {children}
      <GlobalErrorDisplay />
      <NetworkStatusIndicator isOnline={isOnline} />
    </GlobalErrorContext.Provider>
  );
}

function GlobalErrorDisplay() {
  const { errors, removeError, retryError, clearAllErrors } = useGlobalError();

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {errors.slice(0, 3).map((error) => (
          <ErrorCard
            key={error.id}
            error={error}
            onDismiss={() => removeError(error.id)}
            onRetry={() => retryError(error.id)}
          />
        ))}
      </AnimatePresence>
      
      {errors.length > 3 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllErrors}
            className="text-xs"
          >
            Clear {errors.length - 3} more errors
          </Button>
        </motion.div>
      )}
    </div>
  );
}

interface ErrorCardProps {
  error: GlobalError;
  onDismiss: () => void;
  onRetry: () => void;
}

function ErrorCard({ error, onDismiss, onRetry }: ErrorCardProps) {
  const getErrorIcon = (type: GlobalError['type']) => {
    switch (type) {
      case 'network':
        return <WifiOff size={16} className="text-red-500" />;
      case 'api':
        return <AlertTriangle size={16} className="text-orange-500" />;
      case 'auth':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'timeout':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      default:
        return <AlertTriangle size={16} className="text-red-500" />;
    }
  };

  const getErrorColors = (type: GlobalError['type']) => {
    switch (type) {
      case 'network':
        return {
          border: 'border-red-200',
          bg: 'bg-red-50',
          text: 'text-red-800',
        };
      case 'api':
        return {
          border: 'border-orange-200',
          bg: 'bg-orange-50',
          text: 'text-orange-800',
        };
      case 'auth':
        return {
          border: 'border-red-200',
          bg: 'bg-red-50',
          text: 'text-red-800',
        };
      case 'timeout':
        return {
          border: 'border-yellow-200',
          bg: 'bg-yellow-50',
          text: 'text-yellow-800',
        };
      default:
        return {
          border: 'border-gray-200',
          bg: 'bg-gray-50',
          text: 'text-gray-800',
        };
    }
  };

  const colors = getErrorColors(error.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card className={cn('shadow-lg', colors.border, colors.bg)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getErrorIcon(error.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className={cn('text-sm font-semibold', colors.text)}>
                    {error.title}
                  </h4>
                  <p className={cn('text-xs mt-1', colors.text, 'opacity-90')}>
                    {error.message}
                  </p>
                  {error.details && (
                    <p className={cn('text-xs mt-1', colors.text, 'opacity-75')}>
                      {error.details}
                    </p>
                  )}
                </div>
                
                {error.dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDismiss}
                    className="h-6 w-6 p-0 hover:bg-white/50"
                  >
                    <X size={12} />
                  </Button>
                )}
              </div>
              
              {error.retryable && (
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="h-7 px-2 text-xs bg-white/50 hover:bg-white/80"
                  >
                    <RefreshCw size={12} className="mr-1" />
                    Retry
                  </Button>
                  <span className={cn('text-xs', colors.text, 'opacity-75')}>
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface NetworkStatusIndicatorProps {
  isOnline: boolean;
}

function NetworkStatusIndicator({ isOnline }: NetworkStatusIndicatorProps) {
  const [showOffline, setShowOffline] = useState(false);

  React.useEffect(() => {
    if (!isOnline) {
      setShowOffline(true);
    } else {
      // Show "back online" message briefly
      if (showOffline) {
        const timer = setTimeout(() => setShowOffline(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOnline, showOffline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Card className="border-yellow-200 bg-yellow-50 shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <WifiOff size={16} />
                <span className="text-sm font-medium">No internet connection</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {isOnline && showOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Card className="border-green-200 bg-green-50 shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-green-800">
                <Wifi size={16} />
                <span className="text-sm font-medium">Connection restored</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Utility functions for common error scenarios
export const createChatError = (message: string, retryAction?: () => Promise<void>): Omit<GlobalError, 'id' | 'timestamp'> => ({
  type: 'api',
  title: 'Chat Error',
  message,
  retryable: !!retryAction,
  retryAction,
  dismissible: true,
});

export const createNetworkError = (retryAction?: () => Promise<void>): Omit<GlobalError, 'id' | 'timestamp'> => ({
  type: 'network',
  title: 'Connection Error',
  message: 'Unable to connect to the server. Please check your internet connection.',
  retryable: !!retryAction,
  retryAction,
  dismissible: true,
});

export const createTimeoutError = (retryAction?: () => Promise<void>): Omit<GlobalError, 'id' | 'timestamp'> => ({
  type: 'timeout',
  title: 'Request Timeout',
  message: 'The request took too long to complete. Please try again.',
  retryable: !!retryAction,
  retryAction,
  dismissible: true,
});