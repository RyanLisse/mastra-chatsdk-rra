'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { providers, type Provider } from '@/lib/ai/models';
import { cn } from '@/lib/utils';
import { CheckCircleFillIcon, ChevronDownIcon } from './icons';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, Star, Zap } from 'lucide-react';

const providerIcons: Record<Provider, React.ReactNode> = {
  openai: <Sparkles className="h-4 w-4" />,
  anthropic: <Brain className="h-4 w-4" />,
  google: <Star className="h-4 w-4" />,
  groq: <Zap className="h-4 w-4" />,
};

const providerLogos: Record<Provider, string> = {
  openai: '🤖',
  anthropic: '🧠',
  google: '⭐',
  groq: '⚡',
};

interface ProviderSelectorProps {
  selectedProvider: Provider;
  onProviderChange: (provider: Provider) => void;
  className?: string;
  disabled?: boolean;
  availableModels?: any[];
  showModelCount?: boolean;
  availableProviders?: Provider[];
}

export function ProviderSelector({
  selectedProvider,
  onProviderChange,
  className,
  disabled = false,
  availableModels = [],
  showModelCount = true,
  availableProviders,
}: ProviderSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedProviderData = providers[selectedProvider];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
        disabled={disabled}
      >
        <Button
          data-testid="provider-selector"
          variant="outline"
          className="h-10 px-3 justify-between min-w-[160px]"
        >
          <div className="flex items-center gap-2">
            {providerIcons[selectedProvider]}
            <span className="truncate">{selectedProviderData.name}</span>
          </div>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[320px] max-w-[400px]"
      >
        {Object.entries(providers)
          .filter(([providerId]) =>
            availableProviders
              ? availableProviders.includes(providerId as Provider)
              : true,
          )
          .map(([providerId, providerData]) => {
            const provider = providerId as Provider;
            const isSelected = provider === selectedProvider;

            return (
            <DropdownMenuItem
              data-testid={`provider-selector-item-${provider}`}
              key={provider}
              onSelect={() => {
                setOpen(false);
                onProviderChange(provider);
              }}
              data-active={isSelected}
              asChild
            >
              <button
                type="button"
                className="w-full p-3 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group/item"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg">{providerLogos[provider]}</span>
                      {providerIcons[provider]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{providerData.name}</span>
                        {showModelCount && availableModels.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {
                              availableModels.filter(
                                (m) => m.provider === provider,
                              ).length
                            }{' '}
                            models
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {providerData.description}
                      </p>
                      {showModelCount && availableModels.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          {getProviderStats(provider, availableModels)
                            .hasVision && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1.5 py-0.5"
                            >
                              Vision
                            </Badge>
                          )}
                          {getProviderStats(provider, availableModels)
                            .hasReasoning && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1.5 py-0.5"
                            >
                              Reasoning
                            </Badge>
                          )}
                          {getProviderStats(provider, availableModels)
                            .hasTools && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1.5 py-0.5"
                            >
                              Tools
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      'text-foreground dark:text-foreground transition-opacity flex-shrink-0 mt-1',
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Utility function to get provider statistics
export function getProviderStats(provider: Provider, availableModels: any[]) {
  const providerModels = availableModels.filter(
    (model) => model.provider === provider,
  );

  return {
    totalModels: providerModels.length,
    freeModels: providerModels.filter((model) => model.tier === 'free').length,
    premiumModels: providerModels.filter((model) => model.tier === 'premium')
      .length,
    proModels: providerModels.filter((model) => model.tier === 'pro').length,
    hasVision: providerModels.some(
      (model) => model.capabilities.supportsVision,
    ),
    hasReasoning: providerModels.some(
      (model) => model.capabilities.supportsReasoning,
    ),
    hasTools: providerModels.some((model) => model.capabilities.supportsTools),
    maxContextWindow: Math.max(
      ...providerModels.map((model) => model.capabilities.contextWindow),
    ),
  };
}
