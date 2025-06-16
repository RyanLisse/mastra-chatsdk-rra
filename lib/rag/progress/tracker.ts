import type { ProgressUpdate, ProgressEvent, ProgressState } from './types';
import { progressStore } from './store';

export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * Progress tracker for document processing with SSE support
 */
export class ProgressTracker {
  private callbacks = new Map<string, Set<ProgressCallback>>();

  /**
   * Initialize progress tracking for a document
   */
  initialize(documentId: string, filename: string): ProgressState {
    return progressStore.initialize(documentId, filename);
  }

  /**
   * Update progress and notify all subscribers
   */
  async update(
    documentId: string,
    update: ProgressUpdate,
  ): Promise<ProgressState> {
    const state = progressStore.update(documentId, update);

    if (!state) {
      throw new Error(`Document ${documentId} not found in progress store`);
    }

    // Create progress event
    const event: ProgressEvent = {
      documentId,
      stage: state.stage,
      progress: state.progress,
      status: state.status,
      error: state.error,
      timestamp: state.updatedAt.toISOString(),
    };

    // Notify all callbacks for this document
    const documentCallbacks = this.callbacks.get(documentId);
    if (documentCallbacks) {
      documentCallbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in progress callback:', error);
        }
      });
    }

    return state;
  }

  /**
   * Get current progress state
   */
  getState(documentId: string): ProgressState | null {
    return progressStore.get(documentId);
  }

  /**
   * Subscribe to progress updates for a document
   */
  subscribe(documentId: string, callback: ProgressCallback): () => void {
    if (!this.callbacks.has(documentId)) {
      this.callbacks.set(documentId, new Set());
    }

    const documentCallbacks = this.callbacks.get(documentId);
    if (!documentCallbacks) {
      throw new Error(`Document callbacks not found for ${documentId}`);
    }
    documentCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      documentCallbacks.delete(callback);
      if (documentCallbacks.size === 0) {
        this.callbacks.delete(documentId);
      }
    };
  }

  /**
   * Unsubscribe all callbacks for a document
   */
  unsubscribe(documentId: string): void {
    this.callbacks.delete(documentId);
  }

  /**
   * Check if document exists
   */
  exists(documentId: string): boolean {
    return progressStore.exists(documentId);
  }

  /**
   * Remove document from tracking
   */
  remove(documentId: string): boolean {
    this.unsubscribe(documentId);
    return progressStore.remove(documentId);
  }

  /**
   * Create an SSE response stream for progress updates
   */
  createSSEStream(documentId: string): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream({
      start: (controller) => {
        // Send initial state if available
        const currentState = this.getState(documentId);
        if (currentState) {
          const event: ProgressEvent = {
            documentId,
            stage: currentState.stage,
            progress: currentState.progress,
            status: currentState.status,
            error: currentState.error,
            timestamp: currentState.updatedAt.toISOString(),
          };

          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        // Subscribe to updates
        const unsubscribe = this.subscribe(documentId, (event) => {
          try {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));

            // Close stream when processing is complete
            if (event.status === 'completed' || event.status === 'failed') {
              setTimeout(() => {
                controller.close();
              }, 1000); // Small delay to ensure client receives final event
            }
          } catch (error) {
            console.error('Error sending SSE data:', error);
            controller.error(error);
          }
        });

        // Handle client disconnect
        return () => {
          unsubscribe();
        };
      },

      cancel: () => {
        // Client disconnected, cleanup subscription
        this.unsubscribe(documentId);
      },
    });
  }
}

// Singleton instance
export const progressTracker = new ProgressTracker();
