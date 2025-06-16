'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  PlayIcon, 
  StopIcon, 
  TrashIcon, 
  CheckCircleFillIcon,
  WarningIcon,
  LoaderIcon
} from '@/components/icons';
import { cn } from '@/lib/utils';
import { ProcessingCard, type ProcessingState } from './processing-card';
import type { UploadFile } from './document-upload-zone';

export interface QueueItem extends UploadFile {
  uploadedAt?: Date;
  processingState?: ProcessingState;
}

interface FileQueueProps {
  items: QueueItem[];
  isProcessing: boolean;
  onStartProcessing: () => void;
  onStopProcessing: () => void;
  onRetryItem: (item: QueueItem) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
  className?: string;
}

export function FileQueue({
  items,
  isProcessing,
  onStartProcessing,
  onStopProcessing,
  onRetryItem,
  onRemoveItem,
  onClearCompleted,
  onClearAll,
  className
}: FileQueueProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const stats = {
    total: items.length,
    pending: items.filter(item => !item.processingState || item.processingState.status === 'pending').length,
    processing: items.filter(item => item.processingState?.status === 'processing').length,
    completed: items.filter(item => item.processingState?.status === 'completed').length,
    failed: items.filter(item => item.processingState?.status === 'failed').length,
    validFiles: items.filter(item => !item.error).length,
    invalidFiles: items.filter(item => item.error).length
  };

  const canStart = stats.total > 0 && !isProcessing && (stats.pending > 0 || stats.failed > 0);
  const canStop = isProcessing && stats.processing > 0;

  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  }, [selectedItems.size, items]);

  const removeSelectedItems = useCallback(() => {
    selectedItems.forEach(itemId => onRemoveItem(itemId));
    setSelectedItems(new Set());
  }, [selectedItems, onRemoveItem]);

  const getQueueStatus = () => {
    if (isProcessing) return 'Processing';
    if (stats.total === 0) return 'Empty';
    if (stats.completed === stats.validFiles) return 'Completed';
    if (stats.failed > 0) return 'Has Errors';
    return 'Ready';
  };

  const getStatusColor = () => {
    if (isProcessing) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (stats.failed > 0) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    if (stats.completed === stats.validFiles && stats.validFiles > 0) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  if (items.length === 0) {
    return (
      <Card className={cn('text-center py-8', className)}>
        <CardContent>
          <p className="text-muted-foreground">No files in queue</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload files to start processing
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">
              Processing Queue ({stats.total})
            </CardTitle>
            <Badge className={getStatusColor()}>
              {getQueueStatus()}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {canStart && (
              <Button
                onClick={onStartProcessing}
                disabled={stats.validFiles === 0}
                className="h-9"
              >
                <span className="mr-2">
                  <PlayIcon size={16} />
                </span>
                Start Processing
              </Button>
            )}
            
            {canStop && (
              <Button
                variant="outline"
                onClick={onStopProcessing}
                className="h-9"
              >
                <span className="mr-2">
                  <StopIcon size={16} />
                </span>
                Stop
              </Button>
            )}
          </div>
        </div>
        
        {/* Queue Statistics */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-6">
            {stats.pending > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                {stats.pending} Pending
              </span>
            )}
            {stats.processing > 0 && (
              <span className="flex items-center gap-1">
                <span className="animate-spin text-blue-500">
                  <LoaderIcon size={12} />
                </span>
                {stats.processing} Processing
              </span>
            )}
            {stats.completed > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-green-500">
                  <CheckCircleFillIcon size={12} />
                </span>
                {stats.completed} Completed
              </span>
            )}
            {stats.failed > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-red-500">
                  <WarningIcon size={12} />
                </span>
                {stats.failed} Failed
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Bulk Actions */}
        {items.length > 1 && (
          <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedItems.size === items.length}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
                Select All ({selectedItems.size}/{items.length})
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeSelectedItems}
                  className="h-8"
                >
                  <span className="mr-1">
                    <TrashIcon size={14} />
                  </span>
                  Remove Selected
                </Button>
              )}
              
              {stats.completed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearCompleted}
                  className="h-8"
                >
                  Clear Completed
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="h-8"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="relative">
              {/* Item Selection */}
              {items.length > 1 && (
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    className="rounded"
                    aria-label={`Select ${item.file.name}`}
                  />
                </div>
              )}
              
              {/* Processing Card or File Preview */}
              {item.processingState ? (
                <ProcessingCard
                  state={item.processingState}
                  onRetry={() => onRetryItem(item)}
                  onCancel={() => onRemoveItem(item.id)}
                  className={cn(
                    'transition-all duration-200',
                    items.length > 1 ? 'ml-8' : ''
                  )}
                />
              ) : (
                <Card className={cn(
                  'transition-all duration-200',
                  items.length > 1 ? 'ml-8' : '',
                  item.error ? 'border-destructive' : ''
                )}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {item.error ? (
                          <span className="text-destructive">
                            <WarningIcon size={16} />
                          </span>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate" title={item.file.name}>
                          {item.file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {item.type.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {(item.file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        {item.error && (
                          <p className="text-xs text-destructive mt-1" role="alert">
                            {item.error}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItem(item.id)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10"
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <TrashIcon size={14} />
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {index < items.length - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}