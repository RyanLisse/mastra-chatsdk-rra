'use client';

import { useState, useEffect, useCallback } from 'react';
import { chatModels, type Provider } from '@/lib/ai/models';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import type { UserType } from '@/app/(auth)/auth';

const STORAGE_KEYS = {
  selectedModel: 'mastra-chat-selected-model',
  selectedProvider: 'mastra-chat-selected-provider',
  modelPreferences: 'mastra-chat-model-preferences',
} as const;

interface ModelPreferences {
  lastUsedModels: Record<Provider, string>;
  providerPreference: Provider;
  autoSelectLatest: boolean;
}

const DEFAULT_PREFERENCES: ModelPreferences = {
  lastUsedModels: {
    openai: 'gpt-4o',
    anthropic: 'claude-3.5-sonnet',
    google: 'gemini-2.0-flash',
    groq: 'llama-3.3-70b',
  },
  providerPreference: 'openai',
  autoSelectLatest: false,
};

export function useModelSettings(userType: UserType, initialModelId?: string) {
  const [selectedModelId, setSelectedModelId] = useState<string>(
    initialModelId || 'gpt-4o',
  );
  const [preferences, setPreferences] =
    useState<ModelPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  const { availableChatModelIds } = entitlementsByUserType[userType];

  const availableModels = chatModels.filter((model) =>
    availableChatModelIds.includes(model.id),
  );

  const selectedModel = availableModels.find(
    (model) => model.id === selectedModelId,
  );

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const storedModelId = localStorage.getItem(STORAGE_KEYS.selectedModel);
      const storedPreferences = localStorage.getItem(
        STORAGE_KEYS.modelPreferences,
      );

      if (storedPreferences) {
        const parsed = JSON.parse(storedPreferences);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }

      // Validate and set stored model ID
      if (storedModelId && availableChatModelIds.includes(storedModelId)) {
        setSelectedModelId(storedModelId);
      } else if (
        initialModelId &&
        availableChatModelIds.includes(initialModelId)
      ) {
        setSelectedModelId(initialModelId);
      } else {
        // Find first available model as fallback
        const fallbackModel = availableModels[0];
        if (fallbackModel) {
          setSelectedModelId(fallbackModel.id);
        }
      }
    } catch (error) {
      console.warn(
        'Failed to load model preferences from localStorage:',
        error,
      );
    } finally {
      setIsLoading(false);
    }
  }, [initialModelId, availableChatModelIds, availableModels]);

  // Save model selection to localStorage
  const saveModelSelection = useCallback(
    (modelId: string) => {
      try {
        localStorage.setItem(STORAGE_KEYS.selectedModel, modelId);

        const model = availableModels.find((m) => m.id === modelId);
        if (model) {
          const updatedPreferences = {
            ...preferences,
            lastUsedModels: {
              ...preferences.lastUsedModels,
              [model.provider]: modelId,
            },
          };

          setPreferences(updatedPreferences);
          localStorage.setItem(
            STORAGE_KEYS.modelPreferences,
            JSON.stringify(updatedPreferences),
          );
        }
      } catch (error) {
        console.warn('Failed to save model selection to localStorage:', error);
      }
    },
    [availableModels, preferences],
  );

  // Change model selection
  const changeModel = useCallback(
    (modelId: string) => {
      if (availableChatModelIds.includes(modelId)) {
        setSelectedModelId(modelId);
        saveModelSelection(modelId);
      }
    },
    [availableChatModelIds, saveModelSelection],
  );

  // Get models by provider
  const getModelsByProvider = useCallback(
    (provider: Provider) => {
      return availableModels.filter((model) => model.provider === provider);
    },
    [availableModels],
  );

  // Get last used model for provider
  const getLastUsedModel = useCallback(
    (provider: Provider) => {
      const lastModelId = preferences.lastUsedModels[provider];
      return availableModels.find(
        (model) => model.id === lastModelId && model.provider === provider,
      );
    },
    [availableModels, preferences.lastUsedModels],
  );

  // Switch to provider (using last used model or first available)
  const switchToProvider = useCallback(
    (provider: Provider) => {
      const lastUsedModel = getLastUsedModel(provider);
      const providerModels = getModelsByProvider(provider);

      if (lastUsedModel) {
        changeModel(lastUsedModel.id);
      } else if (providerModels.length > 0) {
        changeModel(providerModels[0].id);
      }
    },
    [changeModel, getLastUsedModel, getModelsByProvider],
  );

  // Update preferences
  const updatePreferences = useCallback(
    (updates: Partial<ModelPreferences>) => {
      const updatedPreferences = { ...preferences, ...updates };
      setPreferences(updatedPreferences);

      try {
        localStorage.setItem(
          STORAGE_KEYS.modelPreferences,
          JSON.stringify(updatedPreferences),
        );
      } catch (error) {
        console.warn('Failed to save preferences to localStorage:', error);
      }
    },
    [preferences],
  );

  // Get model statistics
  const getModelStats = useCallback(() => {
    const stats = {
      total: availableModels.length,
      byProvider: {} as Record<Provider, number>,
      byTier: { free: 0, premium: 0, pro: 0 },
      capabilities: {
        vision: 0,
        reasoning: 0,
        tools: 0,
      },
    };

    availableModels.forEach((model) => {
      // Count by provider
      stats.byProvider[model.provider] =
        (stats.byProvider[model.provider] || 0) + 1;

      // Count by tier
      if (model.tier) {
        stats.byTier[model.tier]++;
      }

      // Count capabilities
      if (model.capabilities.supportsVision) stats.capabilities.vision++;
      if (model.capabilities.supportsReeasoning) stats.capabilities.reasoning++;
      if (model.capabilities.supportsTools) stats.capabilities.tools++;
    });

    return stats;
  }, [availableModels]);

  return {
    // State
    selectedModelId,
    selectedModel,
    preferences,
    availableModels,
    isLoading,

    // Actions
    changeModel,
    switchToProvider,
    updatePreferences,

    // Helpers
    getModelsByProvider,
    getLastUsedModel,
    getModelStats,
  };
}
