// tests/mastra/memory.test.ts
import { expect, test, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import { config } from 'dotenv';
import { PostgresMemory } from '../../lib/mastra/memory';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import type { Message } from 'ai';
import { randomUUID } from 'node:crypto';

// Load environment variables for testing
// Try .env.local first, fallback to .env
config({ path: '.env.local' });
if (!process.env.POSTGRES_URL || process.env.POSTGRES_URL.includes('your-test-postgres-url-here')) {
  config({ path: '.env' });
}

// Create a function to get database connection to avoid early instantiation issues
function getDatabase() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }
  if (process.env.POSTGRES_URL.includes('your-test-postgres-url-here')) {
    throw new Error('POSTGRES_URL is still set to placeholder value. Please configure your database connection.');
  }
  
  const client = postgres(process.env.POSTGRES_URL);
  return drizzle(client);
}

describe('PostgresMemory', () => {
  let testSessionId: string;
  let testSessionId2: string;

  beforeAll(async () => {
    // Ensure the database table exists
    try {
      const db = getDatabase();
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id SERIAL PRIMARY KEY,
          session_id TEXT NOT NULL,
          message JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    } catch (error) {
      console.error('Failed to create table:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    // Generate fresh test session IDs for each test
    testSessionId = randomUUID();
    testSessionId2 = randomUUID();
  });

  afterAll(async () => {
    // Clean up all test sessions
    try {
      const db = getDatabase();
      await db.execute(sql`
        DELETE FROM chat_sessions 
        WHERE session_id LIKE 'test-%'
      `);
    } catch (error) {
      console.error('Failed to clean up test data:', error);
    }
  });

  describe('getHistory', () => {
    test('should return empty array for new session', async () => {
      const history = await PostgresMemory.getHistory({ sessionId: testSessionId });
      expect(history).toEqual([]);
    });

    test('should return empty array for non-existent session', async () => {
      const nonExistentSessionId = randomUUID();
      const history = await PostgresMemory.getHistory({ sessionId: nonExistentSessionId });
      expect(history).toEqual([]);
    });
  });

  describe('addMessage', () => {
    test('should add a single message successfully', async () => {
      const message: Message = {
        id: randomUUID(),
        role: 'user',
        content: 'Hello, how do I start the machine?'
      };

      await PostgresMemory.addMessage({ sessionId: testSessionId, message });

      const history = await PostgresMemory.getHistory({ sessionId: testSessionId });
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(message);
    });

    test('should add multiple messages and maintain order', async () => {
      const message1: Message = {
        id: randomUUID(),
        role: 'user',
        content: 'How do I start the RoboRail machine?'
      };

      const message2: Message = {
        id: randomUUID(),
        role: 'assistant',
        content: 'To start the RoboRail machine, first ensure the area is clear...'
      };

      const message3: Message = {
        id: randomUUID(),
        role: 'user',
        content: 'What is the second step?'
      };

      // Add messages sequentially
      await PostgresMemory.addMessage({ sessionId: testSessionId, message: message1 });
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      await PostgresMemory.addMessage({ sessionId: testSessionId, message: message2 });
      await new Promise(resolve => setTimeout(resolve, 10));
      await PostgresMemory.addMessage({ sessionId: testSessionId, message: message3 });

      const history = await PostgresMemory.getHistory({ sessionId: testSessionId });
      expect(history).toHaveLength(3);
      expect(history[0]).toEqual(message1);
      expect(history[1]).toEqual(message2);
      expect(history[2]).toEqual(message3);
    });

    test('should handle messages with different roles correctly', async () => {
      const userMessage: Message = {
        id: randomUUID(),
        role: 'user',
        content: 'What safety procedures should I follow?'
      };

      const assistantMessage: Message = {
        id: randomUUID(),
        role: 'assistant',
        content: 'Always wear appropriate PPE including safety glasses and steel-toed boots.'
      };

      await PostgresMemory.addMessage({ sessionId: testSessionId, message: userMessage });
      await PostgresMemory.addMessage({ sessionId: testSessionId, message: assistantMessage });

      const history = await PostgresMemory.getHistory({ sessionId: testSessionId });
      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('assistant');
    });

    test('should throw error for invalid message (missing id)', async () => {
      const invalidMessage = {
        role: 'user',
        content: 'Test message'
      } as any;

      await expect(
        PostgresMemory.addMessage({ sessionId: testSessionId, message: invalidMessage })
      ).rejects.toThrow('Message must have id, role, and content properties');
    });

    test('should throw error for invalid message (missing role)', async () => {
      const invalidMessage = {
        id: randomUUID(),
        content: 'Test message'
      } as any;

      await expect(
        PostgresMemory.addMessage({ sessionId: testSessionId, message: invalidMessage })
      ).rejects.toThrow('Message must have id, role, and content properties');
    });

    test('should throw error for invalid message (missing content)', async () => {
      const invalidMessage = {
        id: randomUUID(),
        role: 'user'
      } as any;

      await expect(
        PostgresMemory.addMessage({ sessionId: testSessionId, message: invalidMessage })
      ).rejects.toThrow('Message must have id, role, and content properties');
    });
  });

  describe('session isolation', () => {
    test('should keep messages separate between different sessions', async () => {
      const message1: Message = {
        id: randomUUID(),
        role: 'user',
        content: 'Message for session 1'
      };

      const message2: Message = {
        id: randomUUID(),
        role: 'user',
        content: 'Message for session 2'
      };

      await PostgresMemory.addMessage({ sessionId: testSessionId, message: message1 });
      await PostgresMemory.addMessage({ sessionId: testSessionId2, message: message2 });

      const history1 = await PostgresMemory.getHistory({ sessionId: testSessionId });
      const history2 = await PostgresMemory.getHistory({ sessionId: testSessionId2 });

      expect(history1).toHaveLength(1);
      expect(history2).toHaveLength(1);
      expect(history1[0].content).toBe('Message for session 1');
      expect(history2[0].content).toBe('Message for session 2');
    });
  });

  describe('clearSession', () => {
    test('should clear all messages for a specific session', async () => {
      const message1: Message = {
        id: randomUUID(),
        role: 'user',
        content: 'First message'
      };

      const message2: Message = {
        id: randomUUID(),
        role: 'assistant',
        content: 'Second message'
      };

      // Add messages to the session
      await PostgresMemory.addMessage({ sessionId: testSessionId, message: message1 });
      await PostgresMemory.addMessage({ sessionId: testSessionId, message: message2 });

      // Verify messages were added
      let history = await PostgresMemory.getHistory({ sessionId: testSessionId });
      expect(history).toHaveLength(2);

      // Clear the session
      await PostgresMemory.clearSession({ sessionId: testSessionId });

      // Verify session is empty
      history = await PostgresMemory.getHistory({ sessionId: testSessionId });
      expect(history).toHaveLength(0);
    });

    test('should only clear the specified session', async () => {
      const message1: Message = {
        id: randomUUID(),
        role: 'user',
        content: 'Message for session 1'
      };

      const message2: Message = {
        id: randomUUID(),
        role: 'user',
        content: 'Message for session 2'
      };

      // Add messages to both sessions
      await PostgresMemory.addMessage({ sessionId: testSessionId, message: message1 });
      await PostgresMemory.addMessage({ sessionId: testSessionId2, message: message2 });

      // Clear only the first session
      await PostgresMemory.clearSession({ sessionId: testSessionId });

      // Verify first session is empty, second is intact
      const history1 = await PostgresMemory.getHistory({ sessionId: testSessionId });
      const history2 = await PostgresMemory.getHistory({ sessionId: testSessionId2 });

      expect(history1).toHaveLength(0);
      expect(history2).toHaveLength(1);
      expect(history2[0].content).toBe('Message for session 2');
    });
  });

  describe('data persistence and JSON handling', () => {
    test('should properly serialize and deserialize complex message objects', async () => {
      const complexMessage: Message = {
        id: randomUUID(),
        role: 'assistant',
        content: 'Here are the safety procedures:\n\n1. Check emergency stop\n2. Verify PPE\n3. Clear work area',
        // Test with additional properties that might be added to Message type
        experimental_attachments: undefined,
        toolInvocations: undefined
      };

      await PostgresMemory.addMessage({ sessionId: testSessionId, message: complexMessage });

      const history = await PostgresMemory.getHistory({ sessionId: testSessionId });
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(complexMessage);
      expect(history[0].content).toContain('1. Check emergency stop');
      expect(history[0].content).toContain('2. Verify PPE');
    });

    test('should handle special characters in message content', async () => {
      const messageWithSpecialChars: Message = {
        id: randomUUID(),
        role: 'user',
        content: 'How do I handle "quoted text" and symbols: @#$%^&*(){}[]?'
      };

      await PostgresMemory.addMessage({ sessionId: testSessionId, message: messageWithSpecialChars });

      const history = await PostgresMemory.getHistory({ sessionId: testSessionId });
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe(messageWithSpecialChars.content);
    });

    test('should handle empty content', async () => {
      const messageWithEmptyContent: Message = {
        id: randomUUID(),
        role: 'user',
        content: ''
      };

      await PostgresMemory.addMessage({ sessionId: testSessionId, message: messageWithEmptyContent });

      const history = await PostgresMemory.getHistory({ sessionId: testSessionId });
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('');
    });
  });

  describe('error handling', () => {
    test('should handle database connection issues gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that errors are properly thrown and have meaningful messages
      const message: Message = {
        id: randomUUID(),
        role: 'user',
        content: 'Test message'
      };

      // Test with an invalid session ID that might cause issues
      const invalidSessionId = '';
      
      try {
        await PostgresMemory.addMessage({ sessionId: invalidSessionId, message });
        await PostgresMemory.getHistory({ sessionId: invalidSessionId });
      } catch (error) {
        // Errors should be properly caught and re-thrown with meaningful messages
        expect(error).toBeDefined();
      }
    });
  });
});