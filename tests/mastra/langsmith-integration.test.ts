// tests/mastra/langsmith-integration.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { createRoboRailAgent } from '../../lib/ai/agents/roborail-agent';
import { getLangSmithClient } from '../../lib/mastra/langsmith';
import { generateUUID } from '../../lib/utils';

describe('LangSmith Integration', () => {
  let sessionId: string;

  beforeEach(() => {
    sessionId = `test-session-${generateUUID()}`;
  });

  test('should initialize LangSmith client properly', () => {
    const client = getLangSmithClient();
    
    // Should either return a client or null (if not configured)
    expect(client === null || typeof client === 'object').toBe(true);
    
    if (client) {
      expect(client).toBeDefined();
      console.log('✅ LangSmith client initialized for testing');
    } else {
      console.log('⚠️  LangSmith not configured - tracing disabled for tests');
    }
  });

  test('should create RoboRail agent with tracing support', async () => {
    const agent = createRoboRailAgent({
      sessionId,
      selectedChatModel: 'title-model'
    });

    expect(agent).toBeDefined();
    expect(agent.getSessionId()).toBe(sessionId);

    // Clean up
    await agent.clearMemory();
  });

  test('should generate response with tracing (if configured)', async () => {
    const agent = createRoboRailAgent({
      sessionId,
      selectedChatModel: 'title-model'
    });

    try {
      const response = await agent.generate('What is RoboRail?');
      
      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.content).toBeDefined();
      expect(typeof response.text).toBe('string');
      
      console.log(`✅ Generated response with tracing: ${response.text.substring(0, 100)}...`);
    } catch (error) {
      // If the test fails due to missing environment variables, that's expected
      if (error instanceof Error && error.message.includes('POSTGRES_URL')) {
        console.log('⚠️  Test requires database configuration');
        return;
      }
      throw error;
    } finally {
      // Clean up
      await agent.clearMemory();
    }
  }, 30000); // 30 second timeout for generation

  test('should handle tracing gracefully when LangSmith is not configured', async () => {
    // Test that the system works even without LangSmith configuration
    const agent = createRoboRailAgent({
      sessionId,
      selectedChatModel: 'title-model'
    });

    // This should not throw even if LangSmith is not configured
    expect(() => agent.getSessionId()).not.toThrow();
    
    // Clean up
    await agent.clearMemory();
  });
});

describe('LangSmith Tracing Functions', () => {
  test('should import tracing functions without errors', async () => {
    const { 
      traceAgentGeneration, 
      traceRAGTool, 
      traceVoiceAgent, 
      traceMemoryOperation 
    } = await import('../../lib/mastra/langsmith');

    expect(traceAgentGeneration).toBeDefined();
    expect(traceRAGTool).toBeDefined();
    expect(traceVoiceAgent).toBeDefined();
    expect(traceMemoryOperation).toBeDefined();
    expect(typeof traceAgentGeneration).toBe('function');
    expect(typeof traceRAGTool).toBe('function');
    expect(typeof traceVoiceAgent).toBe('function');
    expect(typeof traceMemoryOperation).toBe('function');
  });

  test('should execute traced function even when LangSmith is not configured', async () => {
    const { traceAgentGeneration } = await import('../../lib/mastra/langsmith');
    
    let executed = false;
    const result = await traceAgentGeneration(
      'TestAgent',
      'test input',
      'test-session',
      async () => {
        executed = true;
        return { success: true };
      }
    );

    expect(executed).toBe(true);
    expect(result).toEqual({ success: true });
  });
});