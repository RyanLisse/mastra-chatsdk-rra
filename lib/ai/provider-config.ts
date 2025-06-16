import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { type Provider } from './models';

/**
 * Environment variable configuration for AI providers
 */
export interface ProviderEnvironment {
  openai: {
    apiKey?: string;
  };
  anthropic: {
    apiKey?: string;
  };
  google: {
    apiKey?: string;
  };
  groq: {
    apiKey?: string;
  };
}

/**
 * Get environment variables for all providers
 */
export function getProviderEnvironment(): ProviderEnvironment {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
    },
  };
}

/**
 * Check if a provider is available (has API key configured)
 */
export function isProviderAvailable(provider: Provider): boolean {
  const env = getProviderEnvironment();
  
  switch (provider) {
    case 'openai':
      return !!env.openai.apiKey;
    case 'anthropic':
      return !!env.anthropic.apiKey;
    case 'google':
      return !!env.google.apiKey;
    case 'groq':
      return !!env.groq.apiKey;
    default:
      return false;
  }
}

/**
 * Get available providers based on environment configuration
 */
export function getAvailableProviders(): Provider[] {
  const providers: Provider[] = ['openai', 'anthropic', 'google', 'groq'];
  return providers.filter(isProviderAvailable);
}

/**
 * Create provider-specific client instances with API keys
 */
export function createProviderClients() {
  const env = getProviderEnvironment();
  
  const clients = {
    openai: env.openai.apiKey ? openai : null,
    anthropic: env.anthropic.apiKey ? anthropic : null,
    google: env.google.apiKey ? google : null,
    groq: env.groq.apiKey ? groq : null,
  };

  return clients;
}

/**
 * Model ID mapping for different providers
 * Maps our internal model IDs to provider-specific model names
 */
export const modelIdMapping: Record<string, { provider: Provider; modelId: string }> = {
  // OpenAI Models
  'o3-pro': { provider: 'openai', modelId: 'o3-pro' },
  'o3': { provider: 'openai', modelId: 'o3' },
  'o4-mini': { provider: 'openai', modelId: 'o4-mini' },
  'gpt-4.1': { provider: 'openai', modelId: 'gpt-4.1' },
  'gpt-4.1-mini': { provider: 'openai', modelId: 'gpt-4.1-mini' },
  'gpt-4.1-nano': { provider: 'openai', modelId: 'gpt-4.1-nano' },
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o' },
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini' },
  'o1-mini': { provider: 'openai', modelId: 'o1-mini' },
  'o1-preview': { provider: 'openai', modelId: 'o1-preview' },
  
  // Anthropic Models
  'claude-4-opus': { provider: 'anthropic', modelId: 'claude-4-opus' },
  'claude-4-sonnet': { provider: 'anthropic', modelId: 'claude-4-sonnet' },
  'claude-3.7-sonnet': { provider: 'anthropic', modelId: 'claude-3-7-sonnet' },
  'claude-3.5-sonnet': { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022' },
  'claude-3.5-haiku': { provider: 'anthropic', modelId: 'claude-3-5-haiku-20241022' },
  
  // Google Models
  'gemini-2.5-pro': { provider: 'google', modelId: 'gemini-2.5-pro' },
  'gemini-2.5-flash': { provider: 'google', modelId: 'gemini-2.5-flash' },
  'gemini-2.0-flash': { provider: 'google', modelId: 'gemini-2.0-flash-exp' },
  'gemini-2.0-pro': { provider: 'google', modelId: 'gemini-2.0-pro' },
  
  // Groq Models
  'llama-3.3-70b': { provider: 'groq', modelId: 'llama-3.3-70b-versatile' },
  'llama-3.1-405b': { provider: 'groq', modelId: 'llama-3.1-405b-reasoning' },
  'llama-3-groq-70b-tool-use': { provider: 'groq', modelId: 'llama3-groq-70b-8192-tool-use-preview' },
  'llama-3-groq-8b-tool-use': { provider: 'groq', modelId: 'llama3-groq-8b-8192-tool-use-preview' },
  
  // Legacy models (default to OpenAI)
  'chat-model': { provider: 'openai', modelId: 'gpt-4o' },
  'chat-model-reasoning': { provider: 'openai', modelId: 'o1-mini' },
};

/**
 * Get the actual model information for a given model ID
 */
export function getModelInfo(modelId: string): { provider: Provider; modelId: string } | null {
  return modelIdMapping[modelId] || null;
}

/**
 * Get fallback model for a provider if the requested model is not available
 */
export function getFallbackModel(provider: Provider): string {
  const fallbacks: Record<Provider, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3.5-haiku',
    google: 'gemini-2.0-flash',
    groq: 'llama-3-groq-8b-tool-use',
  };
  
  return fallbacks[provider];
}