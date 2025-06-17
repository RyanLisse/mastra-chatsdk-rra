'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { chatModels, providers, type Provider } from '@/lib/ai/models';
import { cn } from '@/lib/utils';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import type { Session } from 'next-auth';
import { Eye, Brain, Wrench, Zap, Crown, Sparkles, Star } from 'lucide-react';

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

function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}K`;
  }
  return tokens.toString();
}

function ModelCapabilityBadges({ model }: { model: any }) {
  const capabilities = [];

  if (model.capabilities.supportsVision) {
    capabilities.push(
      <Badge key="vision" variant="secondary" className="text-xs px-1 py-0">
        <Eye className="h-2 w-2 mr-1" />
        Vision
      </Badge>,
    );
  }

  if (model.capabilities.supportsReeasoning) {
    capabilities.push(
      <Badge key="reasoning" variant="secondary" className="text-xs px-1 py-0">
        <Brain className="h-2 w-2 mr-1" />
        Reasoning
      </Badge>,
    );
  }

  if (model.capabilities.supportsTools) {
    capabilities.push(
      <Badge key="tools" variant="secondary" className="text-xs px-1 py-0">
        <Wrench className="h-2 w-2 mr-1" />
        Tools
      </Badge>,
    );
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {capabilities.slice(0, 2)}
      {capabilities.length > 2 && (
        <Badge variant="secondary" className="text-xs px-1 py-0">
          +{capabilities.length - 2}
        </Badge>
      )}
    </div>
  );
}

export function ModelSelector({
  session,
  selectedModelId,
  className,
}: {
  session: Session;
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  const userType = session?.user?.type || 'free';
  const { availableChatModelIds } = entitlementsByUserType[userType];

  const availableChatModels = chatModels.filter((chatModel) =>
    availableChatModelIds.includes(chatModel.id),
  );

  // Group models by provider
  const modelsByProvider = availableChatModels.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<Provider, typeof availableChatModels>,
  );

  const selectedChatModel = useMemo(
    () =>
      availableChatModels.find(
        (chatModel) => chatModel.id === optimisticModelId,
      ),
    [optimisticModelId, availableChatModels],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          data-testid="model-selector"
          variant="outline"
          className="md:px-2 md:h-[34px] min-w-[120px] justify-between"
        >
          <div className="flex items-center gap-1.5">
            {selectedChatModel && providerIcons[selectedChatModel.provider]}
            <span className="truncate max-w-[100px]">
              {selectedChatModel?.name || 'Select Model'}
            </span>
          </div>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[420px] max-w-[520px] max-h-[650px] overflow-y-auto"
      >
        {Object.entries(modelsByProvider).map(([provider, models]) => (
          <div key={provider}>
            <DropdownMenuLabel className="flex items-center gap-2 px-3 py-2 bg-muted/30 sticky top-0 z-10">
              <div className="flex items-center gap-2 flex-1">
                {providerIcons[provider as Provider]}
                <span className="font-semibold">
                  {providers[provider as Provider].name}
                </span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {models.length} models
                </Badge>
              </div>
            </DropdownMenuLabel>
            <div className="px-3 pb-2 text-xs text-muted-foreground">
              {providers[provider as Provider].description}
            </div>

            {models.map((chatModel) => {
              const { id } = chatModel;
              const isSelected = id === optimisticModelId;

              return (
                <DropdownMenuItem
                  data-testid={`model-selector-item-${id}`}
                  key={id}
                  onSelect={() => {
                    setOpen(false);
                    startTransition(() => {
                      setOptimisticModelId(id);
                      saveChatModelAsCookie(id);
                    });
                  }}
                  data-active={isSelected}
                  asChild
                >
                  <button
                    type="button"
                    className="w-full p-3 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group/item"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {chatModel.name}
                          </span>
                          {chatModel.tier && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-xs px-1.5 py-0.5',
                                tierColors[chatModel.tier],
                              )}
                            >
                              {chatModel.tier === 'pro' && (
                                <Crown className="h-2 w-2 mr-1" />
                              )}
                              {chatModel.tier.toUpperCase()}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {chatModel.description}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                          <span>
                            {formatContextWindow(
                              chatModel.capabilities.contextWindow,
                            )}{' '}
                            tokens
                          </span>
                          {chatModel.capabilities.specialty && (
                            <>
                              <span>•</span>
                              <span className="truncate">
                                {chatModel.capabilities.specialty}
                              </span>
                            </>
                          )}
                        </div>

                        <ModelCapabilityBadges model={chatModel} />
                      </div>

                      <div
                        className={cn(
                          'text-foreground dark:text-foreground transition-opacity flex-shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      >
                        <CheckCircleFillIcon />
                      </div>
                    </div>
                  </button>
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />
          </div>
        ))}

        <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/20">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">
              Available models: {availableChatModels.length}
            </span>
            <span className="capitalize font-medium">{userType} tier</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Providers: {Object.keys(modelsByProvider).length}</span>
            <span>
              Free:{' '}
              {availableChatModels.filter((m) => m.tier === 'free').length} •
              Premium:{' '}
              {availableChatModels.filter((m) => m.tier === 'premium').length} •
              Pro: {availableChatModels.filter((m) => m.tier === 'pro').length}
            </span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
