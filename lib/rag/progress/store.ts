import type { ProgressState, ProgressUpdate } from './types';

/**
 * In-memory progress store for tracking document processing states
 * In a production environment, this could be replaced with Redis or another persistent store
 */
class ProgressStore {
  private states = new Map<string, ProgressState>();
  private timeouts = new Map<string, NodeJS.Timeout>();
  
  // Cleanup timeout for completed/failed states (5 minutes)
  private readonly CLEANUP_TIMEOUT = 5 * 60 * 1000;

  /**
   * Initialize a new progress state for a document
   */
  initialize(documentId: string, filename: string): ProgressState {
    const now = new Date();
    const state: ProgressState = {
      documentId,
      filename,
      stage: 'upload',
      progress: 0,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    this.states.set(documentId, state);
    this.scheduleCleanup(documentId);
    
    return state;
  }

  /**
   * Update progress state for a document
   */
  update(documentId: string, update: ProgressUpdate): ProgressState | null {
    const currentState = this.states.get(documentId);
    if (!currentState) {
      return null;
    }

    const updatedState: ProgressState = {
      ...currentState,
      ...update,
      updatedAt: new Date()
    };

    this.states.set(documentId, updatedState);

    // Schedule cleanup if processing is complete
    if (update.status === 'completed' || update.status === 'failed') {
      this.scheduleCleanup(documentId);
    }

    return updatedState;
  }

  /**
   * Get current progress state for a document
   */
  get(documentId: string): ProgressState | null {
    return this.states.get(documentId) || null;
  }

  /**
   * Check if a document exists in the store
   */
  exists(documentId: string): boolean {
    return this.states.has(documentId);
  }

  /**
   * Remove a document from the store
   */
  remove(documentId: string): boolean {
    const timeout = this.timeouts.get(documentId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(documentId);
    }
    
    return this.states.delete(documentId);
  }

  /**
   * Get all active progress states (for debugging/monitoring)
   */
  getAll(): ProgressState[] {
    return Array.from(this.states.values());
  }

  /**
   * Get count of active progress states
   */
  size(): number {
    return this.states.size;
  }

  /**
   * Schedule cleanup of completed/failed states
   */
  private scheduleCleanup(documentId: string): void {
    // Clear existing timeout if any
    const existingTimeout = this.timeouts.get(documentId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new cleanup
    const timeout = setTimeout(() => {
      this.remove(documentId);
    }, this.CLEANUP_TIMEOUT);

    this.timeouts.set(documentId, timeout);
  }

  /**
   * Clear all states (useful for testing)
   */
  clear(): void {
    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    
    // Clear all states
    this.states.clear();
  }
}

// Singleton instance
export const progressStore = new ProgressStore();
export { ProgressStore };