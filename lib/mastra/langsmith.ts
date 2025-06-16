// lib/mastra/langsmith.ts
import { Client } from 'langsmith';
import { config } from 'dotenv';

// Load environment variables for tests and local development
// Try .env.local first, fallback to .env
config({ path: '.env.local' });
if (!process.env.LANGSMITH_API_KEY) {
  config({ path: '.env' });
}

let client: Client | null = null;

/**
 * Initialize LangSmith client with environment configuration
 * Returns null if LangSmith is not configured (allows graceful degradation)
 */
export function getLangSmithClient(): Client | null {
  if (client) {
    return client;
  }

  const apiKey = process.env.LANGSMITH_API_KEY;
  const projectName = process.env.LANGSMITH_PROJECT;

  if (!apiKey || !projectName) {
    console.warn(
      'LangSmith not configured - tracing will be disabled. Set LANGSMITH_API_KEY and LANGSMITH_PROJECT to enable.',
    );
    return null;
  }

  try {
    client = new Client({
      apiKey,
    });

    console.log(`LangSmith tracing initialized for project: ${projectName}`);
    return client;
  } catch (error) {
    console.error('Failed to initialize LangSmith client:', error);
    return null;
  }
}

/**
 * Wrapper function for tracing function calls with LangSmith
 * @param name - Name of the trace/span
 * @param metadata - Additional metadata to include in the trace
 * @param fn - Function to execute and trace
 * @returns Promise resolving to the function result
 */
export async function traceLangSmith<T>(
  name: string,
  metadata: Record<string, any>,
  fn: () => Promise<T>,
): Promise<T> {
  const client = getLangSmithClient();

  if (!client) {
    // If LangSmith is not configured, just execute the function
    return await fn();
  }

  try {
    const runId = crypto.randomUUID();
    const startTime = Date.now();

    // Create run start event
    await client.createRun({
      id: runId,
      name,
      run_type: 'chain',
      inputs: metadata.inputs || {},
      extra: {
        metadata: {
          ...metadata,
          agent: 'RoboRail',
          timestamp: new Date().toISOString(),
        },
      },
      start_time: startTime,
    });

    try {
      const result = await fn();

      // Create run end event with success
      await client.updateRun(runId, {
        outputs: { result },
        end_time: Date.now(),
      });

      return result;
    } catch (error) {
      // Create run end event with error
      await client.updateRun(runId, {
        error: error instanceof Error ? error.message : String(error),
        end_time: Date.now(),
      });

      throw error;
    }
  } catch (tracingError) {
    // If tracing fails, log but don't break the main function
    console.error('LangSmith tracing failed:', tracingError);
    return await fn();
  }
}

/**
 * Trace agent generation calls
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
 * Trace RAG tool usage
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
 * Trace voice agent operations
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
 * Trace memory operations
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
