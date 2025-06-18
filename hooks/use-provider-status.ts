'use client';

import { useState, useEffect } from 'react';
import type { Provider } from '@/lib/ai/models';

interface ProviderStatus {
  status: {
    hasAnyProvider: boolean;
    providers: Record<Provider, boolean>;
    warnings: string[];
  };
  availableProviders: Provider[];
  modelsByProvider: Record<string, any[]>;
  totalModels: number;
  loading: boolean;
  error: string | null;
}

export function useProviderStatus(): ProviderStatus {
  const [status, setStatus] = useState<ProviderStatus>({
    status: {
      hasAnyProvider: false,
      providers: {
        openai: false,
        anthropic: false,
        google: false,
        groq: false,
      },
      warnings: [],
    },
    availableProviders: [],
    modelsByProvider: {},
    totalModels: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchProviderStatus() {
      try {
        const response = await fetch('/api/providers');
        if (!response.ok) {
          throw new Error('Failed to fetch provider status');
        }
        
        const data = await response.json();
        setStatus({
          ...data,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching provider status:', error);
        setStatus((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }

    fetchProviderStatus();
  }, []);

  return status;
}