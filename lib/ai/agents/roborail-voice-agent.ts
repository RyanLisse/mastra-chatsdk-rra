// lib/ai/agents/roborail-voice-agent.ts
import { OpenAIRealtimeVoice } from '@mastra/voice-openai-realtime';
import { PostgresMemory } from '../../mastra/memory';
import { ragTool } from '../tools/rag';
import { roboRailPrompt } from '../prompts';
import type { Message } from 'ai';
import { generateUUID } from '../../utils';
import type { ReadableStream as NodeReadableStream } from 'stream/web';
import { traceVoiceAgent, traceMemoryOperation, traceRAGTool } from '../../mastra/langsmith';

export interface RoboRailVoiceAgentConfig {
  sessionId?: string;
  apiKey?: string;
  model?: string;
  speaker?: string;
}

/**
 * RoboRail Voice Agent with PostgreSQL memory for voice-enabled multi-turn conversations
 * Integrates OpenAI Realtime Voice with existing RoboRail agent architecture
 */
export class RoboRailVoiceAgent {
  private voice: OpenAIRealtimeVoice;
  private sessionId: string;
  private isConnected: boolean = false;

  constructor(config: RoboRailVoiceAgentConfig = {}) {
    this.sessionId = config.sessionId || this.generateSessionId();
    
    // Initialize OpenAI Realtime Voice with configuration
    this.voice = new OpenAIRealtimeVoice({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-4o-mini-realtime-preview-2024-12-17',
      speaker: config.speaker || 'alloy'
    });

    this.setupEventHandlers();
  }

  /**
   * Generate a new session ID if none provided
   */
  private generateSessionId(): string {
    return `voice-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set up voice event handlers for conversation management
   */
  private setupEventHandlers(): void {
    // Handle transcribed user speech
    this.voice.on('writing', async ({ text, role }) => {
      if (role === 'user' && text?.trim()) {
        await traceVoiceAgent(
          'handle_user_speech',
          this.sessionId,
          { text: text.trim(), role },
          async () => {
            try {
              // Store user message in PostgreSQL memory
              const userMessage: Message = {
                id: generateUUID(),
                role: 'user',
                content: text.trim()
              };

              await traceMemoryOperation(
                'add_voice_user_message',
                this.sessionId,
                { message: userMessage },
                () => PostgresMemory.addMessage({
                  sessionId: this.sessionId,
                  message: userMessage
                })
              );

              // Generate contextual response using conversation history
              await this.generateVoiceResponse(text.trim());
            } catch (error) {
              console.error('Error handling user speech:', error);
            }
          }
        );
      }
    });

    // Handle audio playback events
    this.voice.on('speaker', ({ audio }) => {
      // Audio data is handled by @mastra/node-audio automatically
      // This event can be used for additional processing if needed
      console.log('Voice response generated:', audio.length, 'bytes');
    });

    // Handle connection events
    this.voice.on('connect', () => {
      this.isConnected = true;
      console.log('RoboRail Voice Agent connected');
    });

    this.voice.on('disconnect', () => {
      this.isConnected = false;
      console.log('RoboRail Voice Agent disconnected');
    });

    this.voice.on('error', (error) => {
      console.error('RoboRail Voice Agent error:', error);
    });
  }

  /**
   * Connect to the OpenAI Realtime Voice service
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.voice.connect();
      
      // Set up the voice assistant with RoboRail context
      await this.voice.speak(`Hello! I'm your RoboRail assistant. I can help you with RoboRail operations, maintenance, and troubleshooting. What would you like to know?`);
    } catch (error) {
      console.error('Failed to connect voice agent:', error);
      throw new Error(`Failed to connect RoboRail Voice Agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect from the voice service
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.voice.close();
    } catch (error) {
      console.error('Error disconnecting voice agent:', error);
    }
  }

  /**
   * Generate a contextual voice response using conversation history
   */
  private async generateVoiceResponse(userInput: string): Promise<void> {
    await traceVoiceAgent(
      'generate_response',
      this.sessionId,
      { userInput },
      async () => {
        try {
          // Get conversation history from PostgreSQL
          const history = await traceMemoryOperation(
            'get_voice_history',
            this.sessionId,
            {},
            () => PostgresMemory.getHistory({ sessionId: this.sessionId })
          );
          
          // Prepare context for response generation
          const contextMessages = history.map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          // Use RAG tool to get relevant RoboRail documentation
          let ragContext = '';
          try {
            ragContext = await traceRAGTool(
              userInput,
              async () => {
                const ragResult = await ragTool.execute(
                  { query: userInput }, 
                  { 
                    toolCallId: generateUUID(), 
                    messages: contextMessages.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })) 
                  }
                );
                if (ragResult && typeof ragResult === 'object' && 'context' in ragResult) {
                  return ragResult.context as string;
                }
                return '';
              }
            );
          } catch (ragError) {
            console.warn('RAG tool failed, continuing without additional context:', ragError);
          }

          // Create enhanced prompt with RoboRail context and conversation history
          const enhancedPrompt = `${roboRailPrompt}

Recent conversation context:
${contextMessages.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

${ragContext ? `Relevant RoboRail documentation:
${ragContext}` : ''}

Current user question: ${userInput}

Please provide a helpful, concise response focusing on RoboRail operations. Keep your response conversational and suitable for voice interaction.`;

          // Generate and speak the response
          await this.voice.speak(enhancedPrompt);

          // Note: The assistant's response will be captured by the 'writing' event handler
          // and stored in memory when the voice generation completes
        } catch (error) {
          console.error('Error generating voice response:', error);
          await this.voice.speak("I'm sorry, I encountered an error processing your request. Please try again.");
        }
      }
    );
  }

  /**
   * Send audio stream to the voice service for processing
   */
  async sendAudio(audioData: NodeJS.ReadableStream | Int16Array): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Voice agent is not connected');
    }

    try {
      await this.voice.send(audioData);
    } catch (error) {
      console.error('Error sending audio:', error);
      throw new Error(`Failed to send audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Listen for audio input and process speech
   */
  async listen(audioStream: NodeJS.ReadableStream): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Voice agent is not connected');
    }

    try {
      await this.voice.listen(audioStream);
    } catch (error) {
      console.error('Error listening to audio:', error);
      throw new Error(`Failed to listen to audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Speak a text message directly
   */
  async speak(text: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Voice agent is not connected');
    }

    try {
      await this.voice.speak(text);
      
      // Store the assistant's message in memory
      const assistantMessage: Message = {
        id: generateUUID(),
        role: 'assistant',
        content: text
      };

      await PostgresMemory.addMessage({
        sessionId: this.sessionId,
        message: assistantMessage
      });
    } catch (error) {
      console.error('Error speaking text:', error);
      throw new Error(`Failed to speak: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get connection status
   */
  isVoiceConnected(): boolean {
    return this.isConnected;
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

  /**
   * Get the underlying voice instance for advanced operations
   */
  getVoiceInstance(): OpenAIRealtimeVoice {
    return this.voice;
  }
}

/**
 * Factory function to create a new RoboRail Voice agent instance
 */
export function createRoboRailVoiceAgent(config: RoboRailVoiceAgentConfig = {}): RoboRailVoiceAgent {
  return new RoboRailVoiceAgent(config);
}