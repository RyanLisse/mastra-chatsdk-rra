'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ModelSelector } from './model-selector';
import { ProviderSelector } from './provider-selector';
import { ModelSettings } from './model-settings';
import { useModelSettings } from '@/hooks/use-model-settings';
import { providers, type Provider } from '@/lib/ai/models';
import type { Session } from 'next-auth';
import {
  Settings,
  Sparkles,
  Brain,
  Star,
  Zap,
  BarChart3,
  Users,
  Crown,
} from 'lucide-react';

const providerIcons: Record<Provider, React.ReactNode> = {
  openai: <Sparkles className="h-4 w-4" />,
  anthropic: <Brain className="h-4 w-4" />,
  google: <Star className="h-4 w-4" />,
  groq: <Zap className="h-4 w-4" />,
};

interface ModelSelectorDemoProps {
  session: Session;
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSelectorDemo({
  session,
  selectedModelId,
  onModelChange,
}: ModelSelectorDemoProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('openai');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    selectedModel,
    availableModels,
    getModelsByProvider,
    getModelStats,
    switchToProvider,
  } = useModelSettings(session.user.type, selectedModelId);

  const stats = getModelStats();
  const providerModels = getModelsByProvider(selectedProvider);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5" />
        <h1 className="text-xl font-semibold">AI Model Selection Demo</h1>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Models</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{Object.keys(stats.byProvider).length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.byTier.pro}</span>
            </div>
            <p className="text-xs text-muted-foreground">Pro Models</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.capabilities.reasoning}</span>
            </div>
            <p className="text-xs text-muted-foreground">With Reasoning</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Selection</CardTitle>
          <CardDescription>
            Currently selected model for your conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enhanced Model Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Selected Model
            </label>
            <ModelSelector
              session={session}
              selectedModelId={selectedModelId}
              className="w-full max-w-md"
            />
          </div>

          {selectedModel && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline">
                {providerIcons[selectedModel.provider]}
                <span className="ml-1">{providers[selectedModel.provider].name}</span>
              </Badge>
              <Badge variant="outline">
                {selectedModel.capabilities.contextWindow >= 1000000 
                  ? `${(selectedModel.capabilities.contextWindow / 1000000).toFixed(1)}M` 
                  : `${Math.round(selectedModel.capabilities.contextWindow / 1000)}K`} tokens
              </Badge>
              {selectedModel.capabilities.supportsVision && (
                <Badge variant="secondary">Vision</Badge>
              )}
              {selectedModel.capabilities.supportsReeasoning && (
                <Badge variant="secondary">Reasoning</Badge>
              )}
              {selectedModel.capabilities.supportsTools && (
                <Badge variant="secondary">Tools</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Provider Selection</CardTitle>
          <CardDescription>
            Choose an AI provider and view available models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              AI Provider
            </label>
            <ProviderSelector
              selectedProvider={selectedProvider}
              onProviderChange={setSelectedProvider}
              className="w-full max-w-md"
            />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Available models from {providers[selectedProvider].name}: {providerModels.length}
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {providerModels.slice(0, 5).map((model) => (
                <div key={model.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div>
                    <span className="font-medium text-sm">{model.name}</span>
                    <p className="text-xs text-muted-foreground">{model.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {model.tier?.toUpperCase()}
                  </Badge>
                </div>
              ))}
              {providerModels.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  ...and {providerModels.length - 5} more models
                </p>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => switchToProvider(selectedProvider)}
            >
              Switch to {providers[selectedProvider].name}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Advanced Model Settings
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide' : 'Show'}
            </Button>
          </CardTitle>
          <CardDescription>
            Detailed model configuration and preferences
          </CardDescription>
        </CardHeader>
        {showAdvanced && (
          <CardContent>
            <ModelSettings
              session={session}
              selectedModelId={selectedModelId}
              onModelChange={onModelChange}
            />
          </CardContent>
        )}
      </Card>

      {/* Provider Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Provider Overview</CardTitle>
          <CardDescription>
            Model distribution across providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(stats.byProvider).map(([provider, count]) => (
              <div key={provider} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {providerIcons[provider as Provider]}
                  <span className="font-medium">{providers[provider as Provider].name}</span>
                </div>
                <Badge variant="outline">{count} models</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Tier Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Access Level</CardTitle>
          <CardDescription>
            Model access based on your account tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              <span className="capitalize">{session.user.type} User</span>
            </Badge>
            <div className="text-sm text-muted-foreground">
              {stats.byTier.free} free • {stats.byTier.premium} premium • {stats.byTier.pro} pro models
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}