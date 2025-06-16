'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProcessingState } from '@/components/rag/processing-card';
import type { ProgressEvent } from '@/lib/rag/progress/types';

export interface DocumentProgressState {
  [documentId: string]: ProcessingState;
}

export interface UseDocumentProgressOptions {
  onError?: (error: string) => void;
  onComplete?: (documentId: string, state: ProcessingState) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface UseDocumentProgressReturn {
  progressStates: DocumentProgressState;
  isConnected: boolean;
  error: string | null;
  startTracking: (documentId: string, filename: string) => void;
  stopTracking: (documentId: string) => void;
  clearProgress: (documentId: string) => void;
  clearAllProgress: () => void;
  retryConnection: (documentId: string) => void;
}

export function useDocumentProgress(
  options: UseDocumentProgressOptions = {}
): UseDocumentProgressReturn {
  const {
    onError,
    onComplete,
    retryAttempts = 3,
    retryDelay = 1000
  } = options;

  const [progressStates, setProgressStates] = useState<DocumentProgressState>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track active connections and retry attempts
  const connectionsRef = useRef<Map<string, EventSource>>(new Map());
  const retryCountRef = useRef<Map<string, number>>(new Map());
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const createConnection = useCallback((documentId: string, filename: string) => {
    // Close existing connection if any
    const existingConnection = connectionsRef.current.get(documentId);
    if (existingConnection) {
      existingConnection.close();
    }

    // Clear any existing retry timeout
    const existingTimeout = retryTimeoutsRef.current.get(documentId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      retryTimeoutsRef.current.delete(documentId);
    }

    try {
      const eventSource = new EventSource(`/api/documents/${documentId}/progress`);
      
      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        // Reset retry count on successful connection
        retryCountRef.current.set(documentId, 0);
      };

      eventSource.onmessage = (event) => {
        try {
          const progressData: ProgressEvent = JSON.parse(event.data);
          
          const newState: ProcessingState = {
            documentId: progressData.documentId,
            filename,
            stage: progressData.stage,
            progress: progressData.progress,
            status: progressData.status,
            error: progressData.error,
            startedAt: new Date(), // This should ideally come from the server
          };

          if (progressData.status === 'completed') {
            newState.completedAt = new Date();
          }

          setProgressStates(prev => ({
            ...prev,
            [documentId]: newState
          }));

          // Call completion callback
          if (progressData.status === 'completed' && onComplete) {
            onComplete(documentId, newState);
          }

          // Close connection if processing is complete or failed
          if (progressData.status === 'completed' || progressData.status === 'failed') {
            eventSource.close();
            connectionsRef.current.delete(documentId);
            retryCountRef.current.delete(documentId);
          }

        } catch (parseError) {
          console.error('Failed to parse progress data:', parseError);
          setError('Failed to parse progress data');
        }
      };

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        eventSource.close();
        connectionsRef.current.delete(documentId);
        
        const currentRetries = retryCountRef.current.get(documentId) || 0;
        
        if (currentRetries < retryAttempts) {
          // Attempt retry
          retryCountRef.current.set(documentId, currentRetries + 1);
          const timeout = setTimeout(() => {
            console.log(`Retrying connection for ${documentId} (attempt ${currentRetries + 1})`);
            createConnection(documentId, filename);
          }, retryDelay * Math.pow(2, currentRetries)); // Exponential backoff
          
          retryTimeoutsRef.current.set(documentId, timeout);
        } else {
          // Max retries reached
          setError(`Connection failed after ${retryAttempts} attempts`);
          setIsConnected(false);
          
          // Update state to show connection error
          setProgressStates(prev => ({
            ...prev,
            [documentId]: {
              ...prev[documentId],
              status: 'failed',
              error: 'Connection lost - please refresh to retry'
            }
          }));
          
          if (onError) {
            onError(`Connection failed for document ${documentId}`);
          }
        }
      };

      connectionsRef.current.set(documentId, eventSource);
      
    } catch (connectionError) {
      console.error('Failed to create SSE connection:', connectionError);
      setError('Failed to establish connection');
      if (onError) {
        onError(`Connection error: ${connectionError}`);
      }
    }
  }, [onError, onComplete, retryAttempts, retryDelay]);

  const startTracking = useCallback((documentId: string, filename: string) => {
    // Initialize progress state
    setProgressStates(prev => ({
      ...prev,
      [documentId]: {
        documentId,
        filename,
        stage: 'upload',
        progress: 0,
        status: 'processing',
        startedAt: new Date()
      }
    }));

    // Start SSE connection
    createConnection(documentId, filename);
  }, [createConnection]);

  const stopTracking = useCallback((documentId: string) => {
    const connection = connectionsRef.current.get(documentId);
    if (connection) {
      connection.close();
      connectionsRef.current.delete(documentId);
    }
    
    const timeout = retryTimeoutsRef.current.get(documentId);
    if (timeout) {
      clearTimeout(timeout);
      retryTimeoutsRef.current.delete(documentId);
    }
    
    retryCountRef.current.delete(documentId);
  }, []);

  const clearProgress = useCallback((documentId: string) => {
    stopTracking(documentId);
    setProgressStates(prev => {
      const newState = { ...prev };
      delete newState[documentId];
      return newState;
    });
  }, [stopTracking]);

  const clearAllProgress = useCallback(() => {
    // Close all connections
    connectionsRef.current.forEach(connection => connection.close());
    connectionsRef.current.clear();
    
    // Clear all timeouts
    retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    retryTimeoutsRef.current.clear();
    
    retryCountRef.current.clear();
    setProgressStates({});
    setIsConnected(false);
    setError(null);
  }, []);

  const retryConnection = useCallback((documentId: string) => {
    const currentState = progressStates[documentId];
    if (currentState) {
      // Reset retry count and create new connection
      retryCountRef.current.set(documentId, 0);
      createConnection(documentId, currentState.filename);
    }
  }, [progressStates, createConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllProgress();
    };
  }, [clearAllProgress]);

  // Update connection status based on active connections
  useEffect(() => {
    const hasActiveConnections = connectionsRef.current.size > 0;
    setIsConnected(hasActiveConnections);
  }, [progressStates]);

  return {
    progressStates,
    isConnected,
    error,
    startTracking,
    stopTracking,
    clearProgress,
    clearAllProgress,
    retryConnection
  };
}