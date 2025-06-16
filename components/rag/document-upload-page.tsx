'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/toast';
import { DocumentUploadZone, type UploadFile } from './document-upload-zone';
import { FileQueue, type QueueItem } from './file-queue';
import { ErrorList, type ErrorInfo } from './error-display';
import { useDocumentProgress } from '@/hooks/use-document-progress';
import { InfoIcon, FileIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface UploadStats {
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  totalSizeBytes: number;
  avgProcessingTime: number;
}

export function DocumentUploadPage() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    totalFiles: 0,
    successfulUploads: 0,
    failedUploads: 0,
    totalSizeBytes: 0,
    avgProcessingTime: 0,
  });

  const {
    progressStates,
    isConnected,
    error: progressError,
    startTracking,
    stopTracking,
    clearProgress,
    clearAllProgress,
    retryConnection,
  } = useDocumentProgress({
    onError: (error) => {
      addError({
        type: 'connection_error',
        message: 'Lost connection to progress tracking',
        details: error,
        timestamp: new Date(),
        retryable: true,
      });
    },
    onComplete: (documentId, state) => {
      updateQueueItemProcessingState(documentId, state);
      toast({
        type: 'success',
        description: `Successfully processed: ${state.filename}`,
      });
    },
  });

  // Handle files selected from upload zone
  const handleFilesSelected = useCallback((files: UploadFile[]) => {
    const newQueueItems: QueueItem[] = files.map((file) => ({
      ...file,
      uploadedAt: new Date(),
    }));
    setQueueItems(newQueueItems);
  }, []);

  // Add error to error list
  const addError = useCallback((error: ErrorInfo) => {
    setErrors((prev) => [error, ...prev].slice(0, 10)); // Keep only last 10 errors
  }, []);

  // Update queue item with processing state
  const updateQueueItemProcessingState = useCallback(
    (documentId: string, state: any) => {
      setQueueItems((prev) =>
        prev.map((item) =>
          item.processingState?.documentId === documentId
            ? { ...item, processingState: state }
            : item,
        ),
      );
    },
    [],
  );

  // Upload a single file
  const uploadFile = useCallback(
    async (item: QueueItem): Promise<string | null> => {
      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append(
          'metadata',
          JSON.stringify({
            source: 'user_upload',
            uploadedAt: item.uploadedAt?.toISOString(),
          }),
        );

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        return result.documentId;
      } catch (error) {
        addError({
          type: 'upload_error',
          message: 'Failed to upload file',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          filename: item.file.name,
          retryable: true,
        });
        return null;
      }
    },
    [addError],
  );

  // Start processing all valid files
  const startProcessing = useCallback(async () => {
    const validItems = queueItems.filter((item) => !item.error);
    if (validItems.length === 0) {
      toast({
        type: 'error',
        description: 'No valid files to process',
      });
      return;
    }

    setIsProcessing(true);

    try {
      for (const item of validItems) {
        if (!item.processingState || item.processingState.status === 'failed') {
          const documentId = await uploadFile(item);

          if (documentId) {
            // Update queue item with processing state
            const initialProcessingState = {
              documentId,
              filename: item.file.name,
              stage: 'upload' as const,
              progress: 0,
              status: 'processing' as const,
              startedAt: new Date(),
            };

            setQueueItems((prev) =>
              prev.map((queueItem) =>
                queueItem.id === item.id
                  ? { ...queueItem, processingState: initialProcessingState }
                  : queueItem,
              ),
            );

            // Start progress tracking
            startTracking(documentId, item.file.name);
          }
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [queueItems, uploadFile, startTracking]);

  // Stop processing
  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    // Note: Individual uploads will continue, but we won't start new ones
    toast({
      type: 'success',
      description:
        'Processing stopped. Files currently uploading will continue.',
    });
  }, []);

  // Retry a specific item
  const retryItem = useCallback(
    async (item: QueueItem) => {
      if (item.processingState) {
        const documentId = await uploadFile(item);
        if (documentId) {
          // Restart tracking
          retryConnection(item.processingState.documentId);
          startTracking(documentId, item.file.name);
        }
      }
    },
    [uploadFile, retryConnection, startTracking],
  );

  // Remove item from queue
  const removeItem = useCallback(
    (itemId: string) => {
      setQueueItems((prev) => {
        const item = prev.find((i) => i.id === itemId);
        if (item?.processingState) {
          stopTracking(item.processingState.documentId);
        }
        return prev.filter((i) => i.id !== itemId);
      });
    },
    [stopTracking],
  );

  // Clear completed items
  const clearCompleted = useCallback(() => {
    setQueueItems((prev) => {
      const completedItems = prev.filter(
        (item) => item.processingState?.status === 'completed',
      );

      completedItems.forEach((item) => {
        if (item.processingState) {
          clearProgress(item.processingState.documentId);
        }
      });

      return prev.filter(
        (item) => item.processingState?.status !== 'completed',
      );
    });
  }, [clearProgress]);

  // Clear all items
  const clearAll = useCallback(() => {
    queueItems.forEach((item) => {
      if (item.processingState) {
        stopTracking(item.processingState.documentId);
      }
    });
    setQueueItems([]);
    clearAllProgress();
  }, [queueItems, stopTracking, clearAllProgress]);

  // Handle errors
  const retryError = useCallback(
    (error: ErrorInfo) => {
      if (error.type === 'connection_error' && error.documentId) {
        retryConnection(error.documentId);
      }
    },
    [retryConnection],
  );

  const dismissError = useCallback((index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Update upload stats
  useEffect(() => {
    const successful = queueItems.filter(
      (item) => item.processingState?.status === 'completed',
    ).length;

    const failed = queueItems.filter(
      (item) => item.processingState?.status === 'failed' || item.error,
    ).length;

    const totalSize = queueItems.reduce((sum, item) => sum + item.file.size, 0);

    setUploadStats({
      totalFiles: queueItems.length,
      successfulUploads: successful,
      failedUploads: failed,
      totalSizeBytes: totalSize,
      avgProcessingTime: 0, // Could calculate this from processing states
    });
  }, [queueItems]);

  // Add progress error to error list
  useEffect(() => {
    if (progressError) {
      addError({
        type: 'connection_error',
        message: 'Progress tracking error',
        details: progressError,
        timestamp: new Date(),
        retryable: true,
      });
    }
  }, [progressError, addError]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {queueItems.some((item) => item.processingState) && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="flex items-center gap-3 p-4">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500',
              )}
            />
            <span className="text-sm">
              {isConnected
                ? 'Connected to progress tracking'
                : 'Disconnected from progress tracking'}
            </span>
            {!isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="ml-auto h-7"
              >
                Reconnect
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Statistics */}
      {uploadStats.totalFiles > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileIcon size={20} />
              Upload Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {uploadStats.totalFiles}
                </div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {uploadStats.successfulUploads}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {uploadStats.failedUploads}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {formatFileSize(uploadStats.totalSizeBytes)}
                </div>
                <div className="text-sm text-muted-foreground">Total Size</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Zone */}
      <DocumentUploadZone
        onFilesSelected={handleFilesSelected}
        disabled={isProcessing}
        maxFiles={10}
      />

      {/* Error Display */}
      {errors.length > 0 && (
        <ErrorList
          errors={errors}
          onRetryError={retryError}
          onDismissError={dismissError}
          onClearAllErrors={clearAllErrors}
        />
      )}

      {/* File Queue */}
      {queueItems.length > 0 && (
        <FileQueue
          items={queueItems}
          isProcessing={isProcessing}
          onStartProcessing={startProcessing}
          onStopProcessing={stopProcessing}
          onRetryItem={retryItem}
          onRemoveItem={removeItem}
          onClearCompleted={clearCompleted}
          onClearAll={clearAll}
        />
      )}

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <InfoIcon size={16} />
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>1.</strong> Drag and drop or select Markdown (.md) or JSON
              (.json) files
            </p>
            <p>
              <strong>2.</strong> Review the file queue and remove any invalid
              files
            </p>
            <p>
              <strong>3.</strong> Click &ldquo;Start Processing&rdquo; to upload
              and process your documents
            </p>
            <p>
              <strong>4.</strong> Monitor progress and wait for completion
            </p>
            <p>
              <strong>5.</strong> Processed documents will be available for chat
              queries
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
