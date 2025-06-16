import {
  customProvider,
  type LanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import {
  createProviderClients,
  getModelInfo,
  getFallbackModel,
  isProviderAvailable,
} from './provider-config';
import { chatModels } from './models';
import { logEnvironmentStatus } from './env-validation';

// Log environment status on module load (only in production)
if (!isTestEnvironment && typeof window === 'undefined') {
  logEnvironmentStatus();
}

/**
 * Create a language model instance based on model ID
 */
function createLanguageModel(modelId: string): LanguageModel {
  const modelInfo = getModelInfo(modelId);
  
  if (!modelInfo) {
    console.warn(`Model ${modelId} not found, falling back to default`);
    return openai('gpt-4o-mini');
  }

  const { provider, modelId: providerModelId } = modelInfo;
  
  // Check if provider is available
  if (!isProviderAvailable(provider)) {
    console.warn(`Provider ${provider} not available, falling back to OpenAI`);
    return openai('gpt-4o-mini');
  }

  try {
    switch (provider) {
      case 'openai':
        return openai(providerModelId);
      case 'anthropic':
        return anthropic(providerModelId);
      case 'google':
        return google(providerModelId);
      case 'groq':
        return groq(providerModelId);
      default:
        console.warn(`Unknown provider ${provider}, falling back to OpenAI`);
        return openai('gpt-4o-mini');
    }
  } catch (error) {
    console.error(`Failed to create model for ${provider}:${providerModelId}`, error);
    return openai('gpt-4o-mini');
  }
}

/**
 * Create language models map for all available models
 */
function createLanguageModels(): Record<string, LanguageModel> {
  const models: Record<string, LanguageModel> = {};
  
  // Add all chat models
  for (const model of chatModels) {
    models[model.id] = createLanguageModel(model.id);
  }
  
  // Add specific models for different use cases
  models['title-model'] = createLanguageModel('gpt-4o-mini');
  models['artifact-model'] = createLanguageModel('gpt-4o');
  
  return models;
}

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
        // Add all other models for testing
        ...Object.fromEntries(
          chatModels.map(model => [model.id, chatModel])
        ),
      },
    })
  : customProvider({
      languageModels: createLanguageModels(),
      imageModels: {
        'small-model': openai.image('dall-e-3'),
      },
    });

/**
 * Get a specific language model by ID
 */
export function getLanguageModel(modelId: string): LanguageModel {
  if (isTestEnvironment) {
    return chatModel;
  }
  
  return createLanguageModel(modelId);
}

/**
 * Check if a model is available
 */
export function isModelAvailable(modelId: string): boolean {
  const modelInfo = getModelInfo(modelId);
  if (!modelInfo) {
    return false;
  }
  
  return isProviderAvailable(modelInfo.provider);
}
