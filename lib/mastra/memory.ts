// lib/mastra/memory.ts
// Only import server-only in actual server environments (not in tests)
// Skip server-only import entirely in test/Playwright environments
const isTestEnvironment =
  process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT === 'true';
const isClientSide = typeof window !== 'undefined';

if (!isTestEnvironment && !isClientSide) {
  try {
    require('server-only');
  } catch (error) {
    // Silently ignore server-only import errors in edge cases
  }
}

import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import type { Message } from 'ai';
import { DatabaseConnectionManager } from '../db/connection-manager';

// Load environment variables for tests and local development
// In test environment, prioritize .env.test, then .env.local, then .env
if (process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT === 'false') {
  config({ path: '.env.test' });
}
config({ path: '.env.local' });
if (
  !process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL.includes('your-test-postgres-url-here')
) {
  config({ path: '.env' });
}

// Database connection management
const CONNECTION_NAME = 'mastra-memory';

// Get database connection using connection manager
function getDatabase() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }
  if (process.env.POSTGRES_URL.includes('your-test-postgres-url-here')) {
    throw new Error(
      'POSTGRES_URL is still set to placeholder value. Please configure your database connection.',
    );
  }

  const { db } = DatabaseConnectionManager.getConnection(CONNECTION_NAME, {
    url: process.env.POSTGRES_URL,
    max: 10,
    idle_timeout: 20,
    max_lifetime: 1800,
    prepare: false,
  });

  return db;
}

/**
 * Cleanup function to properly close database connections
 * Should be called during application shutdown or test teardown
 */
export async function cleanupMemoryConnections(): Promise<void> {
  await DatabaseConnectionManager.closeConnection(CONNECTION_NAME);
}

/**
 * Health check function to test database connectivity
 */
export async function testMemoryConnection(): Promise<boolean> {
  return await DatabaseConnectionManager.testConnection(CONNECTION_NAME);
}

interface MemoryConfig {
  sessionId: string;
}

interface AddMessageConfig extends MemoryConfig {
  message: Message;
}

/**
 * PostgreSQL-based memory provider for storing chat sessions
 * Implements persistent storage for multi-turn conversations
 */
// biome-ignore lint/complexity/noStaticOnlyClass: This class provides a clean API interface for memory operations
export class PostgresMemory {
  /**
   * Retrieves conversation history for a given session
   * @param sessionId - Unique identifier for the chat session
   * @returns Array of messages in chronological order
   */
  static async getHistory({ sessionId }: MemoryConfig): Promise<Message[]> {
    try {
      const db = getDatabase();
      const result = await db.execute(sql`
        SELECT message FROM chat_sessions
        WHERE session_id = ${sessionId}
        ORDER BY created_at ASC
      `);

      return result.map((row) => row.message as Message);
    } catch (error) {
      console.error('Error retrieving chat history:', error);
      throw new Error(`Failed to retrieve history for session ${sessionId}`);
    }
  }

  /**
   * Adds a new message to the conversation history
   * @param sessionId - Unique identifier for the chat session
   * @param message - Message object to store (must include id, role, content)
   */
  static async addMessage({
    sessionId,
    message,
  }: AddMessageConfig): Promise<void> {
    // Validate message structure first, before try-catch
    if (
      !message.id ||
      !message.role ||
      message.content === undefined ||
      message.content === null
    ) {
      throw new Error('Message must have id, role, and content properties');
    }

    try {
      const db = getDatabase();
      await db.execute(sql`
        INSERT INTO chat_sessions (session_id, message)
        VALUES (${sessionId}, ${JSON.stringify(message)})
      `);
    } catch (error) {
      console.error('Error adding message to chat history:', error);
      throw new Error(`Failed to add message to session ${sessionId}`);
    }
  }

  /**
   * Clears all messages for a given session (useful for testing)
   * @param sessionId - Unique identifier for the chat session
   */
  static async clearSession({ sessionId }: MemoryConfig): Promise<void> {
    try {
      const db = getDatabase();
      await db.execute(sql`
        DELETE FROM chat_sessions
        WHERE session_id = ${sessionId}
      `);
    } catch (error) {
      console.error('Error clearing chat session:', error);
      throw new Error(`Failed to clear session ${sessionId}`);
    }
  }
}
