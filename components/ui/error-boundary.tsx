'use client';

import React, { Component, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle, Home, Bug } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  className?: string;
}

interface ErrorBoundaryFallbackProps {
  error: Error;
  retry: () => void;
  canRetry: boolean;
  retryCount: number;
  resetError: () => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
    });
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback: Fallback, maxRetries = 3, className } = this.props;

    if (hasError && error) {
      const canRetry = retryCount < maxRetries;

      if (Fallback) {
        return (
          <Fallback
            error={error}
            retry={this.handleRetry}
            canRetry={canRetry}
            retryCount={retryCount}
            resetError={this.handleReset}
          />
        );
      }

      return (
        <div className={cn('min-h-[400px] flex items-center justify-center p-4', className)}>
          <DefaultErrorFallback
            error={error}
            retry={this.handleRetry}
            canRetry={canRetry}
            retryCount={retryCount}
            resetError={this.handleReset}
          />
        </div>
      );
    }

    return children;
  }
}

function DefaultErrorFallback({
  error,
  retry,
  canRetry,
  retryCount,
  resetError,
}: ErrorBoundaryFallbackProps) {
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
  const isTimeoutError = error.message.includes('timeout');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <Card className="border-destructive/20">
        <CardHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-4 p-3 rounded-full bg-destructive/10"
          >
            <AlertTriangle size={24} className="text-destructive" />
          </motion.div>
          
          <CardTitle className="text-lg text-destructive">
            Oops! Something went wrong
          </CardTitle>
          
          <CardDescription className="text-sm">
            {isNetworkError 
              ? "We're having trouble connecting to our servers."
              : isTimeoutError
              ? "The request took too long to complete."
              : "An unexpected error occurred while loading the application."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Technical Details
              </summary>
              <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                <p className="text-destructive font-bold">{error.name}</p>
                <p className="break-all">{error.message}</p>
                {error.stack && (
                  <pre className="mt-1 text-[10px] text-muted-foreground">
                    {error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            </details>
          )}

          {/* Retry Info */}
          {retryCount > 0 && (
            <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded">
              Retry attempt {retryCount} of 3
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {canRetry && (
              <Button
                onClick={retry}
                className="w-full"
                size="sm"
              >
                <RefreshCw size={16} className="mr-2" />
                Try Again
              </Button>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetError}
                className="flex-1"
                size="sm"
              >
                <Home size={16} className="mr-2" />
                Reset
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1"
                size="sm"
              >
                <RefreshCw size={16} className="mr-2" />
                Reload Page
              </Button>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground text-center">
            If the problem persists, try refreshing the page or{' '}
            <a 
              href="mailto:support@example.com" 
              className="text-primary hover:underline"
            >
              contact support
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Hook for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

// Chat-specific error boundary
interface ChatErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function ChatErrorBoundary({ children, onRetry, className }: ChatErrorBoundaryProps) {
  return (
    <ErrorBoundary
      className={className}
      fallback={({ error, retry, canRetry, resetError }) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 mx-auto max-w-2xl"
        >
          <Card className="border-destructive/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-destructive/10 flex-shrink-0">
                  <Bug size={20} className="text-destructive" />
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-destructive">
                      Chat Error
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Unable to load the chat interface. This might be a temporary issue.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {canRetry && (
                      <Button
                        onClick={() => {
                          retry();
                          onRetry?.();
                        }}
                        size="sm"
                      >
                        <RefreshCw size={14} className="mr-2" />
                        Retry
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={resetError}
                      size="sm"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}