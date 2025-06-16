import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { validateEnvironment } from '@/lib/ai/env-validation';
import { getAvailableProviders } from '@/lib/ai/provider-config';
import { chatModels } from '@/lib/ai/models';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:auth').toResponse();
    }

    const envStatus = validateEnvironment();
    const availableProviders = getAvailableProviders();

    // Get available models for each provider
    const modelsByProvider = chatModels.reduce(
      (acc, model) => {
        if (!acc[model.provider]) {
          acc[model.provider] = [];
        }
        acc[model.provider].push({
          id: model.id,
          name: model.name,
          description: model.description,
          capabilities: model.capabilities,
          tier: model.tier,
        });
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Filter models to only include available providers
    const availableModels = Object.fromEntries(
      Object.entries(modelsByProvider).filter(([provider]) =>
        availableProviders.includes(provider as any),
      ),
    );

    return NextResponse.json({
      status: envStatus,
      availableProviders,
      modelsByProvider: availableModels,
      totalModels: Object.values(availableModels).flat().length,
    });
  } catch (error) {
    console.error('Provider status error:', error);
    return new ChatSDKError('internal_error:api').toResponse();
  }
}
