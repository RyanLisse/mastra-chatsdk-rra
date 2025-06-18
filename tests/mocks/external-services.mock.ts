/**
 * Mock implementations for external services
 * This ensures integration tests run even when external services are unavailable
 */

export class MockOpenAIService {
  async createChatCompletion(params: any): Promise<any> {
    console.log('[MockOpenAI] Creating chat completion');
    return {
      id: 'mock-completion-id',
      object: 'chat.completion',
      created: Date.now(),
      model: params.model || 'gpt-4',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'This is a mock response from the AI assistant.',
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 10,
        total_tokens: 20
      }
    };
  }

  async createEmbedding(params: any): Promise<any> {
    console.log('[MockOpenAI] Creating embedding');
    return {
      object: 'list',
      data: [{
        object: 'embedding',
        embedding: Array(1536).fill(0.1),
        index: 0
      }],
      model: params.model || 'text-embedding-ada-002',
      usage: {
        prompt_tokens: 8,
        total_tokens: 8
      }
    };
  }
}

export class MockAnthropicService {
  async createMessage(params: any): Promise<any> {
    console.log('[MockAnthropic] Creating message');
    return {
      id: 'mock-message-id',
      type: 'message',
      role: 'assistant',
      content: [{
        type: 'text',
        text: 'This is a mock response from Claude.'
      }],
      model: params.model || 'claude-3-sonnet',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 10,
        output_tokens: 10
      }
    };
  }
}

export class MockGoogleAIService {
  async generateContent(params: any): Promise<any> {
    console.log('[MockGoogleAI] Generating content');
    return {
      response: {
        candidates: [{
          content: {
            parts: [{
              text: 'This is a mock response from Gemini.'
            }],
            role: 'model'
          },
          finishReason: 'STOP',
          index: 0,
          safetyRatings: []
        }],
        promptFeedback: {
          safetyRatings: []
        }
      }
    };
  }
}

export class MockGroqService {
  async createChatCompletion(params: any): Promise<any> {
    console.log('[MockGroq] Creating chat completion');
    return {
      id: 'mock-groq-completion',
      object: 'chat.completion',
      created: Date.now(),
      model: params.model || 'mixtral-8x7b',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'This is a mock response from Groq.'
        },
        logprobs: null,
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        prompt_time: 0.001,
        completion_tokens: 10,
        completion_time: 0.01,
        total_tokens: 20,
        total_time: 0.011
      }
    };
  }
}

// Factory function to get appropriate mock service
export function getMockService(provider: string): any {
  switch (provider.toLowerCase()) {
    case 'openai':
      return new MockOpenAIService();
    case 'anthropic':
      return new MockAnthropicService();
    case 'google':
    case 'gemini':
      return new MockGoogleAIService();
    case 'groq':
      return new MockGroqService();
    default:
      return new MockOpenAIService(); // Default fallback
  }
}

// Environment setup helper
export function setupMockEnvironment(): void {
  // Set mock API keys if not present
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('test-')) {
    process.env.OPENAI_API_KEY = 'mock-openai-key';
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = 'mock-anthropic-key';
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'mock-google-key';
  }
  if (!process.env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = 'mock-groq-key';
  }
  
  // Set mock service flag
  process.env.USE_MOCK_SERVICES = 'true';
}