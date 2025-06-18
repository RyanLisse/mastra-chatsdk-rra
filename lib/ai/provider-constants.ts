/**
 * Centralized Provider Constants
 *
 * This file serves as the single source of truth for all provider-related
 * configurations, icons, colors, and metadata. This eliminates code duplication
 * across multiple components and ensures consistency.
 */

import {
  Bot,
  Brain,
  Code,
  Layers,
  Router,
  Search,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react';

import type { Provider } from '@/lib/ai/models';
import { createElement } from 'react';

// Provider Icon Components Map
export const PROVIDER_ICON_COMPONENTS = {
  openai: Sparkles,
  anthropic: Brain,
  google: Star,
  groq: Zap,
  cohere: Layers,
  xai: Bot,
  openrouter: Router,
  perplexity: Search,
  mistral: Code,
  together: Users,
} as const;

// Provider Icons with custom sizes
export const createProviderIcon = (
  provider: Provider,
  className = 'h-4 w-4',
) => {
  const IconComponent = PROVIDER_ICON_COMPONENTS[provider];
  return createElement(IconComponent, { className });
};

// Default Provider Icons (h-4 w-4)
export const getProviderIcon = (
  provider: Provider,
  size: 'sm' | 'md' | 'lg' = 'md',
) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return createProviderIcon(provider, sizeClasses[size]);
};

// Provider Colors - Gradient color schemes
export const PROVIDER_COLORS: Record<Provider, string> = {
  openai: 'from-green-500 to-emerald-600',
  anthropic: 'from-orange-500 to-red-600',
  google: 'from-blue-500 to-purple-600',
  groq: 'from-yellow-500 to-orange-600',
  cohere: 'from-teal-500 to-cyan-600',
  xai: 'from-gray-500 to-slate-600',
  openrouter: 'from-indigo-500 to-blue-600',
  perplexity: 'from-violet-500 to-purple-600',
  mistral: 'from-red-500 to-pink-600',
  together: 'from-emerald-500 to-green-600',
};

// Provider Logos - Emoji representations
export const PROVIDER_LOGOS: Record<Provider, string> = {
  openai: '🤖',
  anthropic: '🧠',
  google: '⭐',
  groq: '⚡',
  cohere: '🔗',
  xai: '🤖',
  openrouter: '🔀',
  perplexity: '🔍',
  mistral: '💨',
  together: '👥',
};

// Provider Display Names
export const PROVIDER_NAMES: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  groq: 'Groq',
  cohere: 'Cohere',
  xai: 'xAI',
  openrouter: 'OpenRouter',
  perplexity: 'Perplexity',
  mistral: 'Mistral',
  together: 'Together',
};

// Default/Fallback Models
export const PROVIDER_FALLBACK_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3.5-haiku',
  google: 'gemini-2.0-flash',
  groq: 'llama-3-groq-8b-tool-use',
  cohere: 'command-r',
  xai: 'grok-2',
  openrouter: 'openrouter/auto',
  perplexity: 'llama-3.1-sonar-small-128k-online',
  mistral: 'mistral-large',
  together: 'nous-hermes-2-mixtral',
};

// Default Last Used Models
export const PROVIDER_DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3.5-sonnet',
  google: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b',
  cohere: 'command-r',
  xai: 'grok-2',
  openrouter: 'openrouter/auto',
  perplexity: 'llama-3.1-sonar-small-128k-online',
  mistral: 'mistral-large',
  together: 'nous-hermes-2-mixtral',
};

// Environment Variable Names
export const PROVIDER_ENV_VARS: Record<Provider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  groq: 'GROQ_API_KEY',
  cohere: 'COHERE_API_KEY',
  xai: 'XAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  together: 'TOGETHER_API_KEY',
};

// API Key Validation Patterns
export const PROVIDER_VALIDATION_PATTERNS: Record<
  Provider,
  { pattern: RegExp; description: string }
> = {
  openai: {
    pattern: /^sk-(?:proj-)?[a-zA-Z0-9\-_]{20,}$/,
    description:
      'Should start with "sk-" or "sk-proj-" followed by alphanumeric characters',
  },
  anthropic: {
    pattern: /^sk-ant-[a-zA-Z0-9\-_]{20,}$/,
    description:
      'Should start with "sk-ant-" followed by alphanumeric characters',
  },
  google: {
    pattern: /^AIza[a-zA-Z0-9\-_]{35,}$/,
    description: 'Should start with "AIza" followed by alphanumeric characters',
  },
  groq: {
    pattern: /^gsk_[a-zA-Z0-9\-_]{20,}$/,
    description: 'Should start with "gsk_" followed by alphanumeric characters',
  },
  cohere: {
    pattern: /^[a-zA-Z0-9\-_]{20,}$/,
    description: 'Should be alphanumeric characters',
  },
  xai: {
    pattern: /^xai-[a-zA-Z0-9\-_]{20,}$/,
    description: 'Should start with "xai-" followed by alphanumeric characters',
  },
  openrouter: {
    pattern: /^sk-or-[a-zA-Z0-9\-_]{20,}$/,
    description:
      'Should start with "sk-or-" followed by alphanumeric characters',
  },
  perplexity: {
    pattern: /^pplx-[a-zA-Z0-9\-_]{20,}$/,
    description:
      'Should start with "pplx-" followed by alphanumeric characters',
  },
  mistral: {
    pattern: /^[a-zA-Z0-9\-_]{20,}$/,
    description: 'Should be alphanumeric characters',
  },
  together: {
    pattern: /^[a-zA-Z0-9\-_]{20,}$/,
    description: 'Should be alphanumeric characters',
  },
};

// All Providers List
export const ALL_PROVIDERS: Provider[] = [
  'openai',
  'anthropic',
  'google',
  'groq',
  'cohere',
  'xai',
  'openrouter',
  'perplexity',
  'mistral',
  'together',
];

// Core Providers (always available)
export const CORE_PROVIDERS: Provider[] = [
  'openai',
  'anthropic',
  'google',
  'groq',
];

// Extended Providers (optional)
export const EXTENDED_PROVIDERS: Provider[] = [
  'cohere',
  'xai',
  'openrouter',
  'perplexity',
  'mistral',
  'together',
];

// Provider Categories
export const PROVIDER_CATEGORIES = {
  core: CORE_PROVIDERS,
  extended: EXTENDED_PROVIDERS,
  all: ALL_PROVIDERS,
} as const;

// Utility Functions
export const getProviderColor = (provider: Provider) =>
  PROVIDER_COLORS[provider];

export const getProviderName = (provider: Provider) => PROVIDER_NAMES[provider];

export const getProviderLogo = (provider: Provider) => PROVIDER_LOGOS[provider];

export const getProviderEnvVar = (provider: Provider) =>
  PROVIDER_ENV_VARS[provider];

export const getProviderValidation = (provider: Provider) =>
  PROVIDER_VALIDATION_PATTERNS[provider];

export const getFallbackModel = (provider: Provider) =>
  PROVIDER_FALLBACK_MODELS[provider];

export const getDefaultModel = (provider: Provider) =>
  PROVIDER_DEFAULT_MODELS[provider];

// Provider Status Helpers
export const isProviderAvailable = (provider: Provider): boolean => {
  const envVar = getProviderEnvVar(provider);
  return !!process.env[envVar];
};

export const getAvailableProviders = (): Provider[] => {
  return ALL_PROVIDERS.filter(isProviderAvailable);
};

export const validateProviderKey = (
  provider: Provider,
  key: string,
): boolean => {
  const validation = getProviderValidation(provider);
  return validation.pattern.test(key);
};

// Default Provider Status Object
export const createDefaultProviderStatus = () => {
  return ALL_PROVIDERS.reduce(
    (acc, provider) => {
      acc[provider] = false;
      return acc;
    },
    {} as Record<Provider, boolean>,
  );
};
