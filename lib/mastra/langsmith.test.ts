// lib/mastra/langsmith.test.ts
// Test-specific mock for LangSmith to avoid import issues

/**
 * Mock LangSmith client for testing
 */
export function getLangSmithClient(): null {
  return null;
}

/**
 * Mock wrapper function for tracing function calls
 */
export async function traceLangSmith<T>(
  name: string,
  metadata: Record<string, any>,
  fn: () => Promise<T>,
): Promise<T> {
  // Just execute the function without tracing
  return await fn();
}

/**
 * Mock trace agent generation calls
 */
export async function traceAgentGeneration<T>(
  agentName: string,
  input: string,
  sessionId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return traceLangSmith(
    `${agentName}_generation`,
    {
      inputs: { input, sessionId },
      agent: agentName,
      operation: 'generation',
    },
    fn,
  );
}

/**
 * Mock trace RAG tool usage
 */
export async function traceRAGTool<T>(
  query: string,
  fn: () => Promise<T>,
): Promise<T> {
  return traceLangSmith(
    'rag_tool_execution',
    {
      inputs: { query },
      tool: 'RAG',
      operation: 'document_retrieval',
    },
    fn,
  );
}

/**
 * Mock trace voice agent operations
 */
export async function traceVoiceAgent<T>(
  operation: string,
  sessionId: string,
  metadata: Record<string, any>,
  fn: () => Promise<T>,
): Promise<T> {
  return traceLangSmith(
    `voice_agent_${operation}`,
    {
      inputs: metadata,
      agent: 'RoboRailVoice',
      operation,
      sessionId,
    },
    fn,
  );
}

/**
 * Mock trace memory operations
 */
export async function traceMemoryOperation<T>(
  operation: string,
  sessionId: string,
  metadata: Record<string, any>,
  fn: () => Promise<T>,
): Promise<T> {
  return traceLangSmith(
    `memory_${operation}`,
    {
      inputs: { sessionId, ...metadata },
      component: 'PostgresMemory',
      operation,
    },
    fn,
  );
}