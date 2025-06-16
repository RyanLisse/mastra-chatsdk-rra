'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileIcon, 
  LoaderIcon, 
  CheckCircleFillIcon, 
  WarningIcon,
  CrossIcon,
  MoreHorizontalIcon
} from '@/components/icons';
import { cn } from '@/lib/utils';
import { ProgressBar } from './progress-bar';
import type { ProcessingStage, ProcessingStatus } from '@/lib/rag/progress/types';

export interface ProcessingState {
  documentId: string;
  filename: string;
  stage: ProcessingStage;
  progress: number;
  status: ProcessingStatus;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

interface ProcessingCardProps {
  state: ProcessingState;
  onRetry?: (documentId: string) => void;
  onCancel?: (documentId: string) => void;
  onViewDetails?: (documentId: string) => void;
  showActions?: boolean;
  className?: string;
}

export function ProcessingCard({
  state,
  onRetry,
  onCancel,
  onViewDetails,
  showActions = true,
  className
}: ProcessingCardProps) {
  const {
    documentId,
    filename,
    stage,
    progress,
    status,
    error,
    startedAt,
    completedAt,
    metadata
  } = state;

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return (
          <span className="animate-spin">
            <LoaderIcon size={16} />
          </span>
        );
      case 'completed':
        return (
          <span className="text-green-600">
            <CheckCircleFillIcon size={16} />
          </span>
        );
      case 'failed':
        return (
          <span className="text-destructive">
            <WarningIcon size={16} />
          </span>
        );
      default:
        return <FileIcon size={16} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return null;
    const endTime = end || new Date();
    const duration = Math.round((endTime.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const getFileSize = () => {
    const size = metadata?.fileSize as number;
    if (!size) return null;
    
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canRetry = status === 'failed' && onRetry;
  const canCancel = status === 'processing' && onCancel;

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              {getStatusIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate" title={filename}>
                {filename}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={getStatusColor()}>
                  {status}
                </Badge>
                {getFileSize() && (
                  <span className="text-xs text-muted-foreground">
                    {getFileSize()}
                  </span>
                )}
                {formatDuration(startedAt, completedAt) && (
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(startedAt, completedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-1">
              {canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry(documentId)}
                  className="h-8 px-3"
                >
                  Retry
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancel(documentId)}
                  className="h-8 px-3"
                >
                  Cancel
                </Button>
              )}
              {onViewDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(documentId)}
                  className="h-8 w-8 p-0"
                  aria-label="View details"
                >
                  <MoreHorizontalIcon size={16} />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <ProgressBar
            stage={stage}
            progress={progress}
            status={status}
            animated={status === 'processing'}
          />
          
          {error && (
            <div 
              className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md"
              role="alert"
              aria-live="polite"
            >
              <span className="text-destructive mt-0.5 flex-shrink-0">
                <WarningIcon size={16} />
              </span>
              <div className="text-sm">
                <p className="font-medium text-destructive">Processing Error</p>
                <p className="text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          )}
          
          {status === 'completed' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <span className="text-green-600">
                <CheckCircleFillIcon size={16} />
              </span>
              <div className="text-sm">
                <p className="font-medium text-green-800 dark:text-green-300">
                  Processing Complete
                </p>
                <p className="text-green-700 dark:text-green-400 mt-1">
                  Document is now available for chat queries
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}