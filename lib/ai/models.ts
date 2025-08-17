export const DEFAULT_CHAT_MODEL: string = 'gemini-2.5-flash';

export type Provider = 'openai' | 'anthropic' | 'google' | 'groq' | 'cohere' | 'xai' | 'openrouter' | 'perplexity' | 'mistral' | 'together';

export interface ModelCapabilities {
  contextWindow: number;
  maxTokens?: number;
  supportsVision?: boolean;
  supportsReasoning?: boolean;
  supportsTools?: boolean;
  specialty?: string;
}

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider: Provider;
  capabilities: ModelCapabilities;
  tier?: 'free' | 'premium' | 'pro';
}

export const providers: Record<
  Provider,
  { name: string; description: string }
> = {
  openai: {
    name: 'OpenAI',
    description: 'Advanced language models including GPT-4 series',
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude models with strong reasoning capabilities',
  },
  google: {
    name: 'Google',
    description: 'Gemini models with multimodal capabilities',
  },
  groq: {
    name: 'Groq',
    description: 'High-speed inference with LLaMA models',
  },
  cohere: {
    name: 'Cohere',
    description: 'Command models for text generation and understanding',
  },
  xai: {
    name: 'xAI',
    description: 'Grok models with real-time knowledge',
  },
  openrouter: {
    name: 'OpenRouter',
    description: 'Unified API for multiple model providers',
  },
  perplexity: {
    name: 'Perplexity',
    description: 'Models optimized for search and factual responses',
  },
  mistral: {
    name: 'Mistral AI',
    description: 'Open-weight models with strong performance',
  },
  together: {
    name: 'Together AI',
    description: 'Open-source models with fast inference',
  },
};

export const chatModels: Array<ChatModel> = [
  // OpenAI Models
  {
    id: 'o3-pro',
    name: 'o3-pro',
    description:
      'Most advanced reasoning model with exceptional problem-solving',
    provider: 'openai',
    capabilities: {
      contextWindow: 200000,
      maxTokens: 4096,
      supportsReasoning: true,
      supportsTools: true,
      specialty: 'Advanced reasoning and complex problem solving',
    },
    tier: 'pro',
  },
  {
    id: 'o3',
    name: 'o3',
    description: 'Advanced reasoning model for complex tasks',
    provider: 'openai',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsReasoning: true,
      supportsTools: true,
      specialty: 'Reasoning and problem solving',
    },
    tier: 'premium',
  },
  {
    id: 'o4-mini',
    name: 'o4-mini',
    description: 'Compact reasoning model for faster responses',
    provider: 'openai',
    capabilities: {
      contextWindow: 64000,
      maxTokens: 2048,
      supportsReasoning: true,
      supportsTools: true,
      specialty: 'Fast reasoning',
    },
    tier: 'free',
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Latest iteration with improved performance and reliability',
    provider: 'openai',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      specialty: 'General purpose with vision',
    },
    tier: 'premium',
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    description: 'Efficient version of GPT-4.1 for faster responses',
    provider: 'openai',
    capabilities: {
      contextWindow: 64000,
      maxTokens: 2048,
      supportsVision: true,
      supportsTools: true,
      specialty: 'Fast general purpose',
    },
    tier: 'free',
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    description: 'Ultra-lightweight model for simple tasks',
    provider: 'openai',
    capabilities: {
      contextWindow: 32000,
      maxTokens: 1024,
      supportsTools: true,
      specialty: 'Simple tasks and quick responses',
    },
    tier: 'free',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Omni-modal model with vision, audio, and text capabilities',
    provider: 'openai',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      specialty: 'Multimodal (text, vision, audio)',
    },
    tier: 'premium',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Compact multimodal model for efficient processing',
    provider: 'openai',
    capabilities: {
      contextWindow: 64000,
      maxTokens: 2048,
      supportsVision: true,
      supportsTools: true,
      specialty: 'Efficient multimodal',
    },
    tier: 'free',
  },

  // Anthropic Models
  {
    id: 'claude-4-opus',
    name: 'Claude 4 Opus',
    description: 'Most capable Claude model for complex reasoning and analysis',
    provider: 'anthropic',
    capabilities: {
      contextWindow: 200000,
      maxTokens: 4096,
      supportsReasoning: true,
      supportsTools: true,
      specialty: 'Complex reasoning and analysis',
    },
    tier: 'pro',
  },
  {
    id: 'claude-4-sonnet',
    name: 'Claude 4 Sonnet',
    description:
      'Balanced model for general-purpose tasks with strong reasoning',
    provider: 'anthropic',
    capabilities: {
      contextWindow: 200000,
      maxTokens: 4096,
      supportsReasoning: true,
      supportsTools: true,
      specialty: 'General purpose with strong reasoning',
    },
    tier: 'premium',
  },
  {
    id: 'claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    description: 'Enhanced Sonnet with improved performance and capabilities',
    provider: 'anthropic',
    capabilities: {
      contextWindow: 200000,
      maxTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      specialty: 'Enhanced reasoning with vision',
    },
    tier: 'premium',
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Advanced model with excellent reasoning and code generation',
    provider: 'anthropic',
    capabilities: {
      contextWindow: 200000,
      maxTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      specialty: 'Code generation and reasoning',
    },
    tier: 'premium',
  },
  {
    id: 'claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    description: 'Fast and efficient model for quick responses',
    provider: 'anthropic',
    capabilities: {
      contextWindow: 200000,
      maxTokens: 2048,
      supportsVision: true,
      supportsTools: true,
      specialty: 'Fast responses and lightweight tasks',
    },
    tier: 'free',
  },

  // Google Models
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description:
      'Most advanced Gemini model with superior multimodal capabilities',
    provider: 'google',
    capabilities: {
      contextWindow: 1000000,
      maxTokens: 8192,
      supportsVision: true,
      supportsTools: true,
      specialty: 'Long context multimodal reasoning',
    },
    tier: 'pro',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'High-performance model optimized for speed and efficiency',
    provider: 'google',
    capabilities: {
      contextWindow: 1000000,
      maxTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      specialty: 'Fast long-context processing',
    },
    tier: 'premium',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Latest generation model with enhanced speed and capabilities',
    provider: 'google',
    capabilities: {
      contextWindow: 500000,
      maxTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      specialty: 'Enhanced speed and capabilities',
    },
    tier: 'premium',
  },
  {
    id: 'gemini-2.0-pro',
    name: 'Gemini 2.0 Pro',
    description: 'Professional-grade model for complex multimodal tasks',
    provider: 'google',
    capabilities: {
      contextWindow: 500000,
      maxTokens: 8192,
      supportsVision: true,
      supportsTools: true,
      specialty: 'Professional multimodal tasks',
    },
    tier: 'premium',
  },

  // Groq Models
  {
    id: 'llama-3.3-70b',
    name: 'LLaMA 3.3-70B',
    description: 'Large parameter model with excellent performance and speed',
    provider: 'groq',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsTools: true,
      specialty: 'High-performance inference',
    },
    tier: 'premium',
  },
  {
    id: 'llama-3.1-405b',
    name: 'LLaMA 3.1-405B',
    description: 'Massive parameter model for complex reasoning tasks',
    provider: 'groq',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsTools: true,
      specialty: 'Complex reasoning with massive parameters',
    },
    tier: 'pro',
  },
  {
    id: 'llama-3-groq-70b-tool-use',
    name: 'LLaMA-3-Groq-70B-Tool-Use',
    description:
      'Specialized model optimized for tool usage and function calling',
    provider: 'groq',
    capabilities: {
      contextWindow: 64000,
      maxTokens: 2048,
      supportsTools: true,
      specialty: 'Tool usage and function calling',
    },
    tier: 'premium',
  },
  {
    id: 'llama-3-groq-8b-tool-use',
    name: 'LLaMA-3-Groq-8B-Tool-Use',
    description: 'Compact model for efficient tool usage and quick responses',
    provider: 'groq',
    capabilities: {
      contextWindow: 32000,
      maxTokens: 1024,
      supportsTools: true,
      specialty: 'Efficient tool usage',
    },
    tier: 'free',
  },

  // Cohere Models
  {
    id: 'command-r-plus',
    name: 'Command R+',
    description: 'Most capable Cohere model for complex tasks',
    provider: 'cohere',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsTools: true,
      specialty: 'RAG and tool use',
    },
    tier: 'premium',
  },
  {
    id: 'command-r',
    name: 'Command R',
    description: 'Efficient model for production workloads',
    provider: 'cohere',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsTools: true,
      specialty: 'Efficient RAG',
    },
    tier: 'free',
  },
  {
    id: 'command-light',
    name: 'Command Light',
    description: 'Fast lightweight model for simple tasks',
    provider: 'cohere',
    capabilities: {
      contextWindow: 4000,
      maxTokens: 1024,
      specialty: 'Fast responses',
    },
    tier: 'free',
  },

  // xAI Models
  {
    id: 'grok-2',
    name: 'Grok-2',
    description: 'Advanced model with real-time knowledge',
    provider: 'xai',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsTools: true,
      specialty: 'Real-time information',
    },
    tier: 'premium',
  },
  {
    id: 'grok-2-mini',
    name: 'Grok-2 Mini',
    description: 'Faster model for quick responses',
    provider: 'xai',
    capabilities: {
      contextWindow: 32000,
      maxTokens: 2048,
      supportsTools: true,
      specialty: 'Fast real-time access',
    },
    tier: 'free',
  },

  // Mistral Models
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    description: 'Most powerful Mistral model for complex reasoning',
    provider: 'mistral',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsTools: true,
      supportsReasoning: true,
      specialty: 'Complex reasoning',
    },
    tier: 'premium',
  },
  {
    id: 'mistral-medium',
    name: 'Mistral Medium',
    description: 'Balanced model for general tasks',
    provider: 'mistral',
    capabilities: {
      contextWindow: 32000,
      maxTokens: 2048,
      supportsTools: true,
      specialty: 'General purpose',
    },
    tier: 'free',
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    description: 'MoE model with excellent performance',
    provider: 'mistral',
    capabilities: {
      contextWindow: 32000,
      maxTokens: 2048,
      supportsTools: true,
      specialty: 'Mixture of experts',
    },
    tier: 'free',
  },

  // Perplexity Models
  {
    id: 'pplx-70b-online',
    name: 'Perplexity 70B Online',
    description: 'Model with real-time web access',
    provider: 'perplexity',
    capabilities: {
      contextWindow: 8192,
      maxTokens: 2048,
      supportsTools: true,
      specialty: 'Web-grounded responses',
    },
    tier: 'premium',
  },
  {
    id: 'pplx-7b-online',
    name: 'Perplexity 7B Online',
    description: 'Efficient model with web access',
    provider: 'perplexity',
    capabilities: {
      contextWindow: 4096,
      maxTokens: 1024,
      supportsTools: true,
      specialty: 'Fast web search',
    },
    tier: 'free',
  },

  // Together AI Models
  {
    id: 'deepseek-coder-v2',
    name: 'DeepSeek Coder V2',
    description: 'Specialized model for code generation',
    provider: 'together',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsTools: true,
      specialty: 'Code generation',
    },
    tier: 'premium',
  },
  {
    id: 'qwen-2-72b',
    name: 'Qwen 2 72B',
    description: 'Large multilingual model',
    provider: 'together',
    capabilities: {
      contextWindow: 32000,
      maxTokens: 4096,
      supportsTools: true,
      specialty: 'Multilingual',
    },
    tier: 'free',
  },
  {
    id: 'nous-hermes-2-mixtral',
    name: 'Nous Hermes 2 Mixtral',
    description: 'Fine-tuned Mixtral for conversations',
    provider: 'together',
    capabilities: {
      contextWindow: 32000,
      maxTokens: 2048,
      supportsTools: true,
      specialty: 'Conversational AI',
    },
    tier: 'free',
  },

  // OpenRouter Models (Gateway to multiple providers)
  {
    id: 'openrouter/auto',
    name: 'Auto (Best Available)',
    description: 'Automatically selects the best available model',
    provider: 'openrouter',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsTools: true,
      specialty: 'Automatic selection',
    },
    tier: 'premium',
  },
  {
    id: 'openrouter/claude-3-opus',
    name: 'Claude 3 Opus (via OR)',
    description: 'Access Claude 3 Opus through OpenRouter',
    provider: 'openrouter',
    capabilities: {
      contextWindow: 200000,
      maxTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      specialty: 'Complex reasoning',
    },
    tier: 'pro',
  },
  {
    id: 'openrouter/gpt-4-turbo',
    name: 'GPT-4 Turbo (via OR)',
    description: 'Access GPT-4 Turbo through OpenRouter',
    provider: 'openrouter',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      specialty: 'General purpose',
    },
    tier: 'premium',
  },

  // Legacy models for backward compatibility
  {
    id: 'chat-model',
    name: 'Chat model',
    description: 'Primary model for all-purpose chat (Legacy)',
    provider: 'openai',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsTools: true,
      specialty: 'General purpose (Legacy)',
    },
    tier: 'free',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning (Legacy)',
    provider: 'openai',
    capabilities: {
      contextWindow: 128000,
      maxTokens: 4096,
      supportsReasoning: true,
      supportsTools: true,
      specialty: 'Advanced reasoning (Legacy)',
    },
    tier: 'free',
  },
];
