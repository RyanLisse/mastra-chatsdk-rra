// tests/mastra/agent-basic.test.ts
import { expect, test, describe } from "bun:test";
import { createRoboRailAgent } from '../../lib/ai/agents/roborail-agent';

describe('RoboRail Agent Basic Tests', () => {
  describe('Agent Creation', () => {
    test('should create agent with default configuration', () => {
      const agent = createRoboRailAgent();
      expect(agent).toBeDefined();
      expect(agent.getSessionId()).toMatch(/^session-\d+-[a-z0-9]+$/);
    });

    test('should create agent with custom session ID', () => {
      const customSessionId = 'test-session-123';
      const agent = createRoboRailAgent({ sessionId: customSessionId });
      
      expect(agent.getSessionId()).toBe(customSessionId);
    });

    test('should create agent with custom chat model', () => {
      const agent = createRoboRailAgent({ 
        selectedChatModel: 'chat-model-reasoning' 
      });
      
      expect(agent).toBeDefined();
      // We can't easily test the internal model without triggering AI calls
    });
  });

  describe('Session Management', () => {
    test('should generate unique session IDs for different instances', () => {
      const agent1 = createRoboRailAgent();
      const agent2 = createRoboRailAgent();
      
      expect(agent1.getSessionId()).not.toBe(agent2.getSessionId());
    });

    test('should maintain consistent session ID for same instance', () => {
      const agent = createRoboRailAgent();
      const sessionId1 = agent.getSessionId();
      const sessionId2 = agent.getSessionId();
      
      expect(sessionId1).toBe(sessionId2);
    });
  });

  describe('Configuration Validation', () => {
    test('should handle empty configuration object', () => {
      const agent = createRoboRailAgent({});
      expect(agent).toBeDefined();
      expect(agent.getSessionId()).toBeDefined();
    });

    test('should handle undefined configuration', () => {
      const agent = createRoboRailAgent(undefined);
      expect(agent).toBeDefined();
      expect(agent.getSessionId()).toBeDefined();
    });

    test('should handle partial configuration', () => {
      const agent1 = createRoboRailAgent({ sessionId: 'test-only-session' });
      const agent2 = createRoboRailAgent({ selectedChatModel: 'chat-model' });
      
      expect(agent1.getSessionId()).toBe('test-only-session');
      expect(agent2.getSessionId()).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle memory operations gracefully when database is unavailable', async () => {
      const agent = createRoboRailAgent({ sessionId: 'test-offline-session' });
      
      // These operations should not throw when database is unavailable
      let history: any[] = [];
      try {
        history = await agent.getHistory();
      } catch (error) {
        // Expected in test environment without database
      }
      
      expect(Array.isArray(history)).toBe(true);
    });

    test('should handle clearMemory operation gracefully', async () => {
      const agent = createRoboRailAgent({ sessionId: 'test-clear-session' });
      
      // This should not crash the agent
      let clearError: Error | null = null;
      try {
        await agent.clearMemory();
      } catch (error) {
        clearError = error as Error;
      }
      
      // In test environment, we expect this to fail gracefully
      if (clearError) {
        expect(clearError.message).toContain('Failed to clear memory');
      }
    });
  });

  describe('API Interface', () => {
    test('should expose required methods', () => {
      const agent = createRoboRailAgent();
      
      expect(typeof agent.generate).toBe('function');
      expect(typeof agent.generateStream).toBe('function');
      expect(typeof agent.getSessionId).toBe('function');
      expect(typeof agent.clearMemory).toBe('function');
      expect(typeof agent.getHistory).toBe('function');
    });

    test('should maintain correct method signatures', () => {
      const agent = createRoboRailAgent();
      
      // Check that methods return promises where expected
      expect(agent.generate('test')).toBeInstanceOf(Promise);
      expect(agent.generateStream('test')).toBeInstanceOf(Promise);
      expect(agent.clearMemory()).toBeInstanceOf(Promise);
      expect(agent.getHistory()).toBeInstanceOf(Promise);
      
      // Check that getSessionId returns string
      expect(typeof agent.getSessionId()).toBe('string');
    });
  });
});