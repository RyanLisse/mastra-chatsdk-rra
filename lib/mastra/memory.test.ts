// lib/mastra/memory.test.ts
// Test-specific mock for PostgresMemory to avoid import issues

import type { Message } from 'ai';

interface MemoryConfig {
  sessionId: string;
}

interface AddMessageConfig extends MemoryConfig {
  message: Message;
}

/**
 * Mock PostgreSQL-based memory provider for testing
 * Avoids database dependencies and import issues
 */
export class PostgresMemory {
  private static sessions = new Map<string, Message[]>();

  /**
   * Mock: Retrieves conversation history for a given session
   */
  static async getHistory({ sessionId }: MemoryConfig): Promise<Message[]> {
    return PostgresMemory.sessions.get(sessionId) || [];
  }

  /**
   * Mock: Adds a new message to the conversation history
   */
  static async addMessage({
    sessionId,
    message,
  }: AddMessageConfig): Promise<void> {
    if (!message.id || !message.role || message.content === undefined || message.content === null) {
      throw new Error('Message must have id, role, and content properties');
    }

    const existing = PostgresMemory.sessions.get(sessionId) || [];
    existing.push(message);
    PostgresMemory.sessions.set(sessionId, existing);
  }

  /**
   * Mock: Clears all messages for a given session
   */
  static async clearSession({ sessionId }: MemoryConfig): Promise<void> {
    PostgresMemory.sessions.delete(sessionId);
  }

  /**
   * Mock: Clear all test data
   */
  static clearAll(): void {
    PostgresMemory.sessions.clear();
  }
}

/**
 * Mock cleanup function
 */
export async function cleanupMemoryConnections(): Promise<void> {
  PostgresMemory.clearAll();
}

/**
 * Mock health check function
 */
export async function testMemoryConnection(): Promise<boolean> {
  return true;
}