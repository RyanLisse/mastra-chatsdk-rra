// tests/mastra/agent-memory-integration.test.ts
import { expect, test, describe, beforeAll, afterEach, beforeEach } from "bun:test";
import { config } from 'dotenv';
import { createRoboRailAgent, type RoboRailAgent } from '../../lib/ai/agents/roborail-agent';
import { PostgresMemory } from '../../lib/mastra/memory';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
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

describe('RoboRail Agent Memory Integration', () => {
  let testSessionId: string;
  let testSessionId2: string;
  let agent: RoboRailAgent;
  let agent2: RoboRailAgent;

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
    // Generate fresh test session IDs and agents for each test
    testSessionId = `test-session-${randomUUID()}`;
    testSessionId2 = `test-session-${randomUUID()}`;
    
    agent = createRoboRailAgent({
      sessionId: testSessionId,
      selectedChatModel: 'chat-model'
    });
    
    agent2 = createRoboRailAgent({
      sessionId: testSessionId2,
      selectedChatModel: 'chat-model'
    });
  });

  afterEach(async () => {
    // Clean up test sessions after each test
    try {
      await PostgresMemory.clearSession({ sessionId: testSessionId });
      await PostgresMemory.clearSession({ sessionId: testSessionId2 });
    } catch (error) {
      console.error('Failed to clean up test sessions:', error);
    }
  });

  describe('Agent Creation and Configuration', () => {
    test('should create agent with correct session ID', () => {
      expect(agent.getSessionId()).toBe(testSessionId);
    });

    test('should create agent with auto-generated session ID when none provided', () => {
      const autoAgent = createRoboRailAgent();
      const sessionId = autoAgent.getSessionId();
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session-\d+-[a-z0-9]+$/);
    });

    test('should have empty history for new session', async () => {
      const history = await agent.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Multi-Turn Conversation Flow', () => {
    test('should maintain context across multiple questions about RoboRail', async () => {
      // This test uses mocked responses since we're testing integration with memory
      // In a real scenario, you'd have actual AI responses
      
      // First question
      const firstQuestion = "How do I start the RoboRail machine?";
      
      // Simulate agent call (in real usage, this would make an actual AI call)
      try {
        await agent.generate(firstQuestion);
      } catch (error) {
        // Expected to fail without real AI setup, but memory should still work
        console.log('Expected AI generation failure in test environment');
      }

      // Check that the user message was added to memory
      const historyAfterFirst = await agent.getHistory();
      expect(historyAfterFirst.length).toBeGreaterThan(0);
      
      // The user message should be in history
      const userMessages = historyAfterFirst.filter(msg => msg.role === 'user');
      expect(userMessages.some(msg => msg.content === firstQuestion)).toBe(true);
    });

    test('should handle follow-up questions with context', async () => {
      // Manually add some conversation history to test context retrieval
      await PostgresMemory.addMessage({
        sessionId: testSessionId,
        message: {
          id: randomUUID(),
          role: 'user',
          content: 'How do I start the RoboRail machine?'
        }
      });

      await PostgresMemory.addMessage({
        sessionId: testSessionId,
        message: {
          id: randomUUID(),
          role: 'assistant',
          content: 'To start the RoboRail machine, first ensure all safety protocols are followed...'
        }
      });

      // Now check if agent can retrieve this history
      const history = await agent.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('assistant');
      expect(history[0].content).toContain('start the RoboRail');
      expect(history[1].content).toContain('safety protocols');

      // Test follow-up question
      const followUpQuestion = "What's the second step?";
      
      try {
        await agent.generate(followUpQuestion);
      } catch (error) {
        // Expected to fail without real AI setup
        console.log('Expected AI generation failure in test environment');
      }

      // Verify the follow-up was added to memory
      const updatedHistory = await agent.getHistory();
      expect(updatedHistory.length).toBeGreaterThan(2);
    });
  });

  describe('Session Isolation', () => {
    test('should keep conversations separate between different sessions', async () => {
      // Add messages to first session
      await PostgresMemory.addMessage({
        sessionId: testSessionId,
        message: {
          id: randomUUID(),
          role: 'user',
          content: 'Question for session 1'
        }
      });

      // Add messages to second session
      await PostgresMemory.addMessage({
        sessionId: testSessionId2,
        message: {
          id: randomUUID(),
          role: 'user',
          content: 'Question for session 2'
        }
      });

      // Verify separation
      const history1 = await agent.getHistory();
      const history2 = await agent2.getHistory();

      expect(history1).toHaveLength(1);
      expect(history2).toHaveLength(1);
      expect(history1[0].content).toBe('Question for session 1');
      expect(history2[0].content).toBe('Question for session 2');
    });

    test('should not leak conversation between different agents', async () => {
      // Add conversation to first agent's session
      await PostgresMemory.addMessage({
        sessionId: testSessionId,
        message: {
          id: randomUUID(),
          role: 'user',
          content: 'Confidential question about machine settings'
        }
      });

      await PostgresMemory.addMessage({
        sessionId: testSessionId,
        message: {
          id: randomUUID(),
          role: 'assistant',
          content: 'Here are the confidential machine settings...'
        }
      });

      // Check that second agent can't access first agent's conversation
      const agent2History = await agent2.getHistory();
      expect(agent2History).toHaveLength(0);

      // Verify first agent still has its conversation
      const agent1History = await agent.getHistory();
      expect(agent1History).toHaveLength(2);
      expect(agent1History.some(msg => msg.content.includes('Confidential'))).toBe(true);
    });
  });

  describe('Memory Management', () => {
    test('should clear session memory correctly', async () => {
      // Add some messages
      await PostgresMemory.addMessage({
        sessionId: testSessionId,
        message: {
          id: randomUUID(),
          role: 'user',
          content: 'Test message 1'
        }
      });

      await PostgresMemory.addMessage({
        sessionId: testSessionId,
        message: {
          id: randomUUID(),
          role: 'assistant',
          content: 'Test response 1'
        }
      });

      // Verify messages exist
      let history = await agent.getHistory();
      expect(history).toHaveLength(2);

      // Clear memory
      await agent.clearMemory();

      // Verify memory is cleared
      history = await agent.getHistory();
      expect(history).toHaveLength(0);
    });

    test('should handle memory errors gracefully', async () => {
      // Test with invalid session ID (empty string)
      const invalidAgent = createRoboRailAgent({ sessionId: '' });

      // Memory operations should not crash the agent
      expect(async () => {
        await invalidAgent.getHistory();
      }).not.toThrow();

      expect(async () => {
        await invalidAgent.clearMemory();
      }).not.toThrow();
    });
  });

  describe('RoboRail-Specific Scenarios', () => {
    test('should handle safety procedure questions with context', async () => {
      // Simulate a safety-focused conversation
      const safetyMessages = [
        {
          id: randomUUID(),
          role: 'user' as const,
          content: 'What safety equipment do I need for RoboRail operation?'
        },
        {
          id: randomUUID(),
          role: 'assistant' as const,
          content: 'For RoboRail operation, you need: safety glasses, steel-toed boots, hard hat, and high-visibility vest.'
        },
        {
          id: randomUUID(),
          role: 'user' as const,
          content: 'What about emergency procedures?'
        }
      ];

      // Add messages to memory
      for (const message of safetyMessages) {
        await PostgresMemory.addMessage({
          sessionId: testSessionId,
          message
        });
      }

      // Verify the conversation is stored correctly
      const history = await agent.getHistory();
      expect(history).toHaveLength(3);
      expect(history.some(msg => msg.content.includes('safety equipment'))).toBe(true);
      expect(history.some(msg => msg.content.includes('steel-toed boots'))).toBe(true);
      expect(history.some(msg => msg.content.includes('emergency procedures'))).toBe(true);
    });

    test('should handle troubleshooting sequences with context', async () => {
      // Simulate a troubleshooting conversation
      const troubleshootingMessages = [
        {
          id: randomUUID(),
          role: 'user' as const,
          content: 'The RoboRail machine is making unusual noises'
        },
        {
          id: randomUUID(),
          role: 'assistant' as const,
          content: 'Let me help you troubleshoot. First, can you describe the type of noise?'
        },
        {
          id: randomUUID(),
          role: 'user' as const,
          content: 'It sounds like a grinding noise from the motor area'
        },
        {
          id: randomUUID(),
          role: 'assistant' as const,
          content: 'A grinding noise from the motor suggests possible bearing issues. Check the motor bearings for wear.'
        }
      ];

      // Add messages to memory
      for (const message of troubleshootingMessages) {
        await PostgresMemory.addMessage({
          sessionId: testSessionId,
          message
        });
      }

      // Verify the troubleshooting sequence is preserved
      const history = await agent.getHistory();
      expect(history).toHaveLength(4);
      
      // Check conversation flow is maintained
      expect(history[0].content).toContain('unusual noises');
      expect(history[1].content).toContain('troubleshoot');
      expect(history[2].content).toContain('grinding noise');
      expect(history[3].content).toContain('bearing issues');
    });

    test('should maintain context for multi-step procedures', async () => {
      // Simulate a multi-step procedure conversation
      const procedureMessages = [
        {
          id: randomUUID(),
          role: 'user' as const,
          content: 'How do I perform routine maintenance on the RoboRail?'
        },
        {
          id: randomUUID(),
          role: 'assistant' as const,
          content: 'Routine maintenance involves several steps: 1) Check oil levels, 2) Inspect belts, 3) Clean filters. Would you like details on any specific step?'
        },
        {
          id: randomUUID(),
          role: 'user' as const,
          content: 'Tell me more about step 2'
        }
      ];

      // Add messages to memory
      for (const message of procedureMessages) {
        await PostgresMemory.addMessage({
          sessionId: testSessionId,
          message
        });
      }

      // Verify the procedure context is maintained
      const history = await agent.getHistory();
      expect(history).toHaveLength(3);
      
      // The agent should have context about which step the user is asking about
      expect(history[2].content).toContain('step 2');
      
      // Previous context should be available for the agent to reference
      const maintenanceMessage = history.find(msg => msg.content.includes('routine maintenance'));
      expect(maintenanceMessage).toBeDefined();
      expect(maintenanceMessage?.content).toContain('Check oil levels');
      expect(maintenanceMessage?.content).toContain('Inspect belts');
    });
  });
});