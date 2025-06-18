'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProviderSelector, getProviderStats } from './provider-selector';
import {
  chatModels,
  providers,
  type Provider,
  type ChatModel,
} from '@/lib/ai/models';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { cn } from '@/lib/utils';
import { CheckCircleFillIcon, ChevronDownIcon } from './icons';
import type { Session } from 'next-auth';
import {
  Settings,
  Eye,
  Brain,
  Wrench,
  Crown,
  Info,
  Sparkles,
  Star,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { useProviderStatus } from '@/hooks/use-provider-status';

const providerIcons: Record<Provider, React.ReactNode> = {
  openai: <Sparkles className="h-3 w-3" />,
  anthropic: <Brain className="h-3 w-3" />,
  google: <Star className="h-3 w-3" />,
  groq: <Zap className="h-3 w-3" />,
};

const tierColors = {
  free: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  premium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pro: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

interface ModelSettingsProps {
  session: Session;
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

export function ModelSettings({
  session,
  selectedModelId,
  onModelChange,
  className,
}: ModelSettingsProps) {
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider>('openai');
  const [filterByProvider, setFilterByProvider] = useState(false);
  
  const { availableProviders, loading, error } = useProviderStatus();

  const userType = session?.user?.type || 'free';
  const { availableChatModelIds } = entitlementsByUserType[userType];

  // Filter models based on both user entitlements and provider availability
  const availableChatModels = chatModels.filter((chatModel) =>
    availableChatModelIds.includes(chatModel.id) &&
    availableProviders.includes(chatModel.provider),
  );

  const selectedChatModel = useMemo(
    () =>
      availableChatModels.find((chatModel) => chatModel.id === selectedModelId),
    [selectedModelId, availableChatModels],
  );

  // Update selected provider when model changes
  useEffect(() => {
    if (selectedChatModel) {
      setSelectedProvider(selectedChatModel.provider);
    }
  }, [selectedChatModel]);

  // Filter models by provider if filter is enabled
  const filteredModels = useMemo(() => {
    if (filterByProvider) {
      return availableChatModels.filter(
        (model) => model.provider === selectedProvider,
      );
    }
    return availableChatModels;
  }, [availableChatModels, selectedProvider, filterByProvider]);

  // Group models by provider
  const modelsByProvider = filteredModels.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<Provider, ChatModel[]>,
  );

  // Get statistics for current selection
  const providerStats = getProviderStats(selectedProvider, availableChatModels);

  function formatContextWindow(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${Math.round(tokens / 1000)}K`;
    }
    return tokens.toString();
  }

  // Show loading state
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="font-medium text-sm">Model Settings</span>
        </div>
        <div className="flex items-center justify-center p-4">
          <span className="text-sm text-muted-foreground">Loading providers...</span>
        </div>
      </div>
    );
  }

  // Show warning if no providers are available
  if (availableProviders.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="font-medium text-sm">Model Settings</span>
        </div>
        <Card className="border-warning">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No AI providers configured</p>
                <p className="text-xs text-muted-foreground">
                  Please add at least one API key in your environment variables:
                  OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, or GROQ_API_KEY
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Settings Header */}
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4" />
        <span className="font-medium text-sm">Model Settings</span>
      </div>

      {/* Quick Model Selector */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-auto p-3"
          >
            <div className="flex items-start gap-3 text-left">
              {selectedChatModel && providerIcons[selectedChatModel.provider]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {selectedChatModel?.name || 'Select Model'}
                  </span>
                  {selectedChatModel?.tier && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        tierColors[selectedChatModel.tier],
                      )}
                    >
                      {selectedChatModel.tier === 'pro' && (
                        <Crown className="h-2 w-2 mr-1" />
                      )}
                      {selectedChatModel.tier.toUpperCase()}
                    </Badge>
                  )}
                </div>
                {selectedChatModel && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedChatModel.capabilities.specialty}
                  </p>
                )}
              </div>
            </div>
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[400px] max-h-[500px] overflow-y-auto p-0"
        >
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Available Models</span>
              <Badge variant="outline" className="text-xs">
                {filteredModels.length} models
              </Badge>
            </div>

            {/* Provider Filter */}
            <div className="flex items-center gap-2">
              <ProviderSelector
                selectedProvider={selectedProvider}
                onProviderChange={setSelectedProvider}
                availableModels={availableChatModels}
                showModelCount={true}
                className="flex-1"
                availableProviders={availableProviders}
              />
              <Button
                variant={filterByProvider ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterByProvider(!filterByProvider)}
                className="px-3"
              >
                Filter
              </Button>
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {Object.entries(modelsByProvider).map(([provider, models]) => (
              <div key={provider}>
                {!filterByProvider && (
                  <div className="px-3 py-2 bg-muted/50 flex items-center gap-2 text-sm font-medium sticky top-0">
                    {providerIcons[provider as Provider]}
                    {providers[provider as Provider].name}
                    <Badge variant="outline" className="text-xs ml-auto">
                      {models.length}
                    </Badge>
                  </div>
                )}

                {models.map((model) => (
                  <button
                    type="button"
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full p-3 text-left hover:bg-accent transition-colors',
                      model.id === selectedModelId && 'bg-accent',
                    )}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {model.name}
                          </span>
                          {model.tier && (
                            <Badge
                              variant="secondary"
                              className={cn('text-xs', tierColors[model.tier])}
                            >
                              {model.tier === 'pro' && (
                                <Crown className="h-2 w-2 mr-1" />
                              )}
                              {model.tier.toUpperCase()}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                          {model.description}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {formatContextWindow(
                              model.capabilities.contextWindow,
                            )}{' '}
                            tokens
                          </span>
                          {model.capabilities.supportsVision && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1 py-0"
                            >
                              <Eye className="h-2 w-2" />
                            </Badge>
                          )}
                          {model.capabilities.supportsReasoning && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1 py-0"
                            >
                              <Brain className="h-2 w-2" />
                            </Badge>
                          )}
                          {model.capabilities.supportsTools && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1 py-0"
                            >
                              <Wrench className="h-2 w-2" />
                            </Badge>
                          )}
                        </div>
                      </div>

                      {model.id === selectedModelId && <CheckCircleFillIcon />}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Current Model Details */}
      {selectedChatModel && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {providerIcons[selectedChatModel.provider]}
              <CardTitle className="text-sm">
                {selectedChatModel.name}
              </CardTitle>
              {selectedChatModel.tier && (
                <Badge
                  variant="secondary"
                  className={cn('text-xs', tierColors[selectedChatModel.tier])}
                >
                  {selectedChatModel.tier === 'pro' && (
                    <Crown className="h-2 w-2 mr-1" />
                  )}
                  {selectedChatModel.tier.toUpperCase()}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {selectedChatModel.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* Capabilities */}
            <div>
              <div className="text-xs font-medium mb-2">Capabilities</div>
              <div className="flex flex-wrap gap-1">
                {selectedChatModel.capabilities.supportsVision && (
                  <Badge variant="secondary" className="text-xs">
                    <Eye className="h-2 w-2 mr-1" />
                    Vision
                  </Badge>
                )}
                {selectedChatModel.capabilities.supportsReasoning && (
                  <Badge variant="secondary" className="text-xs">
                    <Brain className="h-2 w-2 mr-1" />
                    Reasoning
                  </Badge>
                )}
                {selectedChatModel.capabilities.supportsTools && (
                  <Badge variant="secondary" className="text-xs">
                    <Wrench className="h-2 w-2 mr-1" />
                    Tools
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Technical Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Context Window:</span>
                <div className="font-medium">
                  {formatContextWindow(
                    selectedChatModel.capabilities.contextWindow,
                  )}{' '}
                  tokens
                </div>
              </div>
              {selectedChatModel.capabilities.maxTokens && (
                <div>
                  <span className="text-muted-foreground">Max Output:</span>
                  <div className="font-medium">
                    {formatContextWindow(
                      selectedChatModel.capabilities.maxTokens,
                    )}{' '}
                    tokens
                  </div>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Provider:</span>
                <div className="font-medium">
                  {providers[selectedChatModel.provider].name}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Specialty:</span>
                <div className="font-medium">
                  {selectedChatModel.capabilities.specialty}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Tier Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground p-2 bg-muted/30 rounded">
        <div className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          <span>
            Your tier:{' '}
            <span className="capitalize font-medium">{userType}</span>
          </span>
        </div>
        <span>{availableChatModels.length} models available</span>
      </div>
    </div>
  );
}
