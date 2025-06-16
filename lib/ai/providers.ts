import {
  customProvider,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': openai('gpt-4o'),
        'chat-model-reasoning': openai('o1-mini'),
        'title-model': openai('gpt-4o-mini'),
        'artifact-model': openai('gpt-4o'),
      },
      imageModels: {
        'small-model': openai.image('dall-e-3'),
      },
    });
