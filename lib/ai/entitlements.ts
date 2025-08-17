import type { UserType } from '@/app/(auth)/auth';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: [
      // Free tier models
      'o4-mini',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o-mini',
      'claude-3.5-haiku',
      'llama-3-groq-8b-tool-use',
      'command-r',
      'command-light',
      'grok-2-mini',
      'mistral-medium',
      'mixtral-8x7b',
      'pplx-7b-online',
      'qwen-2-72b',
      'nous-hermes-2-mixtral',
      // Legacy models
      'chat-model',
      'chat-model-reasoning',
    ],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      // Free tier models
      'o4-mini',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o-mini',
      'claude-3.5-haiku',
      'llama-3-groq-8b-tool-use',
      'command-r',
      'command-light',
      'grok-2-mini',
      'mistral-medium',
      'mixtral-8x7b',
      'pplx-7b-online',
      'qwen-2-72b',
      'nous-hermes-2-mixtral',
      // Premium tier models
      'o3',
      'gpt-4.1',
      'gpt-4o',
      'claude-4-sonnet',
      'claude-3.7-sonnet',
      'claude-3.5-sonnet',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-pro',
      'llama-3.3-70b',
      'llama-3-groq-70b-tool-use',
      'command-r-plus',
      'grok-2',
      'mistral-large',
      'pplx-70b-online',
      'deepseek-coder-v2',
      'openrouter/auto',
      'openrouter/gpt-4-turbo',
      // Legacy models
      'chat-model',
      'chat-model-reasoning',
    ],
  },

  /*
   * For users with an account and a paid membership
   */
  premium: {
    maxMessagesPerDay: 500,
    availableChatModelIds: [
      // All models including pro tier
      'o3-pro',
      'o3',
      'o4-mini',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'claude-4-opus',
      'claude-4-sonnet',
      'claude-3.7-sonnet',
      'claude-3.5-sonnet',
      'claude-3.5-haiku',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-pro',
      'llama-3.1-405b',
      'llama-3.3-70b',
      'llama-3-groq-70b-tool-use',
      'llama-3-groq-8b-tool-use',
      'command-r-plus',
      'command-r',
      'command-light',
      'grok-2',
      'grok-2-mini',
      'mistral-large',
      'mistral-medium',
      'mixtral-8x7b',
      'pplx-70b-online',
      'pplx-7b-online',
      'deepseek-coder-v2',
      'qwen-2-72b',
      'nous-hermes-2-mixtral',
      'openrouter/auto',
      'openrouter/claude-3-opus',
      'openrouter/gpt-4-turbo',
      // Legacy models
      'chat-model',
      'chat-model-reasoning',
    ],
  },
};
