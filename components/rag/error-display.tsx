'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  WarningIcon,
  InfoIcon,
  CrossIcon,
  ArrowUpIcon,
} from '@/components/icons';
import { cn } from '@/lib/utils';

export type ErrorType =
  | 'upload_error'
  | 'validation_error'
  | 'processing_error'
  | 'connection_error'
  | 'auth_error'
  | 'server_error'
  | 'file_size_error'
  | 'file_type_error';

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  details?: string;
  code?: string;
  timestamp: Date;
  documentId?: string;
  filename?: string;
  retryable?: boolean;
  suggestions?: string[];
}

interface ErrorDisplayProps {
  error: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
  onReportIssue?: () => void;
  compact?: boolean;
  className?: string;
}

const errorTypeConfig: Record<
  ErrorType,
  {
    title: string;
    color: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    defaultSuggestions: string[];
  }
> = {
  upload_error: {
    title: 'Upload Failed',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: WarningIcon,
    defaultSuggestions: [
      'Check your internet connection',
      'Try uploading a smaller file',
      'Refresh the page and try again',
    ],
  },
  validation_error: {
    title: 'File Validation Error',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: InfoIcon,
    defaultSuggestions: [
      'Ensure file is in Markdown (.md) or JSON (.json) format',
      'Check file size is under 50MB',
      'Verify file is not corrupted',
    ],
  },
  processing_error: {
    title: 'Processing Failed',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: WarningIcon,
    defaultSuggestions: [
      'Try uploading the file again',
      'Check if the file content is valid',
      'Contact support if the issue persists',
    ],
  },
  connection_error: {
    title: 'Connection Error',
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: WarningIcon,
    defaultSuggestions: [
      'Check your internet connection',
      'Refresh the page to reconnect',
      'Try again in a few moments',
    ],
  },
  auth_error: {
    title: 'Authentication Error',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: WarningIcon,
    defaultSuggestions: [
      'Please log in again',
      'Check if your session has expired',
      'Clear browser cache and try again',
    ],
  },
  server_error: {
    title: 'Server Error',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: WarningIcon,
    defaultSuggestions: [
      'Try again in a few moments',
      'Check service status',
      'Contact support if the issue continues',
    ],
  },
  file_size_error: {
    title: 'File Too Large',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: InfoIcon,
    defaultSuggestions: [
      'File must be smaller than 50MB',
      'Try compressing the file',
      'Split large documents into smaller files',
    ],
  },
  file_type_error: {
    title: 'Unsupported File Type',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: InfoIcon,
    defaultSuggestions: [
      'Only Markdown (.md) and JSON (.json) files are supported',
      'Convert your file to a supported format',
      'Rename file with correct extension if needed',
    ],
  },
};

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  onReportIssue,
  compact = false,
  className,
}: ErrorDisplayProps) {
  const config = errorTypeConfig[error.type];
  const IconComponent = config.icon;
  const suggestions = error.suggestions || config.defaultSuggestions;

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const canRetry = error.retryable !== false && onRetry;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-3 border rounded-md',
          'border-destructive/20 bg-destructive/5',
          className,
        )}
        role="alert"
        aria-live="polite"
      >
        <IconComponent size={16} className="text-destructive flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{config.title}</p>
          <p className="text-xs text-destructive/80 truncate">
            {error.message}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-7 px-2 text-xs"
            >
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-7 w-7 p-0"
              aria-label="Dismiss error"
            >
              <CrossIcon size={12} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('border-destructive/20', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <IconComponent size={20} className="text-destructive" />
            </div>
            <div>
              <CardTitle className="text-base text-destructive">
                {config.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={config.color}>
                  {error.type.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(error.timestamp)}
                </span>
                {error.code && (
                  <span className="text-xs text-muted-foreground font-mono">
                    #{error.code}
                  </span>
                )}
              </div>
            </div>
          </div>

          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
              aria-label="Dismiss error"
            >
              <CrossIcon size={16} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Error Message */}
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              {error.message}
            </p>
            {error.details && (
              <p className="text-sm text-muted-foreground">{error.details}</p>
            )}
            {error.filename && (
              <p className="text-xs text-muted-foreground mt-1">
                File: {error.filename}
              </p>
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                What you can try:
              </p>
              <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={`suggestion-${index}-${suggestion.slice(0, 20)}`}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {canRetry && (
              <Button onClick={onRetry} size="sm" className="h-8">
                <span className="mr-1">
                  <ArrowUpIcon size={14} />
                </span>
                Try Again
              </Button>
            )}

            {onReportIssue && (
              <Button
                variant="outline"
                onClick={onReportIssue}
                size="sm"
                className="h-8"
              >
                Report Issue
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ErrorListProps {
  errors: ErrorInfo[];
  onRetryError?: (error: ErrorInfo) => void;
  onDismissError?: (index: number) => void;
  onClearAllErrors?: () => void;
  maxVisible?: number;
  className?: string;
}

export function ErrorList({
  errors,
  onRetryError,
  onDismissError,
  onClearAllErrors,
  maxVisible = 5,
  className,
}: ErrorListProps) {
  if (errors.length === 0) return null;

  const visibleErrors = errors.slice(0, maxVisible);
  const hiddenCount = errors.length - visibleErrors.length;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-destructive">
          Errors ({errors.length})
        </h3>
        {onClearAllErrors && errors.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAllErrors}
            className="h-7 text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {visibleErrors.map((error, index) => (
          <ErrorDisplay
            key={`${error.timestamp.getTime()}-${index}`}
            error={error}
            onRetry={onRetryError ? () => onRetryError(error) : undefined}
            onDismiss={onDismissError ? () => onDismissError(index) : undefined}
            compact
          />
        ))}
      </div>

      {hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          and {hiddenCount} more error{hiddenCount > 1 ? 's' : ''}...
        </p>
      )}
    </div>
  );
}
