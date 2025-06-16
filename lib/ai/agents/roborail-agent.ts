// lib/ai/agents/roborail-agent.ts
import { streamText, generateText } from 'ai';
import { myProvider } from '../providers';
import { roboRailPrompt } from '../prompts';
import { PostgresMemory } from '../../mastra/memory';
import { ragTool } from '../tools/rag';
import type { Message } from 'ai';
import { generateUUID } from '../../utils';
import {
  traceAgentGeneration,
  traceMemoryOperation,
} from '../../mastra/langsmith';

export interface RoboRailAgentConfig {
  sessionId?: string;
  selectedChatModel?: string;
}

/**
 * RoboRail Agent with PostgreSQL memory for multi-turn conversations
 * Provides context-aware responses for RoboRail operations
 */
export class RoboRailAgent {
  private sessionId: string;
  private selectedChatModel: string;

  constructor(config: RoboRailAgentConfig = {}) {
    this.sessionId = config.sessionId || this.generateSessionId();
    this.selectedChatModel = config.selectedChatModel || 'chat-model';
  }

  /**
   * Generate a new session ID if none provided
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get conversation history from memory and prepare messages for AI
   */
  private async getMessagesWithHistory(userInput: string): Promise<Message[]> {
    return traceMemoryOperation(
      'get_messages_with_history',
      this.sessionId,
      { userInput },
      async () => {
        try {
          // Get conversation history from PostgreSQL
          const history = await traceMemoryOperation(
            'get_history',
            this.sessionId,
            {},
            () => PostgresMemory.getHistory({ sessionId: this.sessionId }),
          );

          // Add the new user message to history
          const newUserMessage: Message = {
            id: generateUUID(),
            role: 'user',
            content: userInput,
          };

          // Store the new user message
          await traceMemoryOperation(
            'add_message',
            this.sessionId,
            { message: newUserMessage },
            () =>
              PostgresMemory.addMessage({
                sessionId: this.sessionId,
                message: newUserMessage,
              }),
          );

          // Return all messages including the new one
          return [...history, newUserMessage];
        } catch (error) {
          console.error('Error managing conversation history:', error);
          // Fallback to just the current message if history fails
          return [
            {
              id: generateUUID(),
              role: 'user',
              content: userInput,
            },
          ];
        }
      },
    );
  }

  /**
   * Generate a response to user input with memory context
   */
  async generate(input: string): Promise<{ text: string; content: string }> {
    return traceAgentGeneration(
      'RoboRailAgent',
      input,
      this.sessionId,
      async () => {
        try {
          // Get messages with conversation history
          const messages = await this.getMessagesWithHistory(input);

          // Generate response using AI SDK with context
          const result = await generateText({
            model: myProvider.languageModel(this.selectedChatModel),
            system: roboRailPrompt,
            messages,
            tools: {
              ragTool,
            },
          });

          // Store the assistant's response in memory
          const assistantMessage: Message = {
            id: generateUUID(),
            role: 'assistant',
            content: result.text,
          };

          await traceMemoryOperation(
            'add_assistant_message',
            this.sessionId,
            { message: assistantMessage },
            () =>
              PostgresMemory.addMessage({
                sessionId: this.sessionId,
                message: assistantMessage,
              }),
          );

          return {
            text: result.text,
            content: result.text,
          };
        } catch (error) {
          console.error('Error generating response:', error);
          throw new Error(
            `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      },
    );
  }

  /**
   * Generate a streaming response with memory context
   */
  async generateStream(input: string) {
    return traceAgentGeneration(
      'RoboRailAgent_Stream',
      input,
      this.sessionId,
      async () => {
        try {
          // Get messages with conversation history
          const messages = await this.getMessagesWithHistory(input);

          // Generate streaming response using AI SDK with context
          const result = streamText({
            model: myProvider.languageModel(this.selectedChatModel),
            system: roboRailPrompt,
            messages,
            tools: {
              ragTool,
            },
            onFinish: async ({ text }) => {
              // Store the assistant's response in memory when streaming finishes
              try {
                const assistantMessage: Message = {
                  id: generateUUID(),
                  role: 'assistant',
                  content: text,
                };

                await traceMemoryOperation(
                  'add_streaming_assistant_message',
                  this.sessionId,
                  { message: assistantMessage },
                  () =>
                    PostgresMemory.addMessage({
                      sessionId: this.sessionId,
                      message: assistantMessage,
                    }),
                );
              } catch (error) {
                console.error('Failed to store assistant message:', error);
              }
            },
          });

          return result;
        } catch (error) {
          console.error('Error generating streaming response:', error);
          throw new Error(
            `Failed to generate streaming response: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      },
    );
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Clear the current session's memory
   */
  async clearMemory(): Promise<void> {
    try {
      await PostgresMemory.clearSession({ sessionId: this.sessionId });
    } catch (error) {
      console.error('Failed to clear session memory:', error);
      throw new Error(`Failed to clear memory for session ${this.sessionId}`);
    }
  }

  /**
   * Get conversation history for the current session
   */
  async getHistory(): Promise<Message[]> {
    try {
      return await PostgresMemory.getHistory({ sessionId: this.sessionId });
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }
}

/**
 * Factory function to create a new RoboRail agent instance
 */
export function createRoboRailAgent(
  config: RoboRailAgentConfig = {},
): RoboRailAgent {
  return new RoboRailAgent(config);
}
