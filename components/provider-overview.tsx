'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { chatModels, providers, type Provider } from '@/lib/ai/models';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { getProviderStats } from './provider-selector';
import { cn } from '@/lib/utils';
import type { Session } from 'next-auth';
import {
  Brain,
  Sparkles,
  Star,
  Zap,
  Eye,
  Wrench,
  Crown,
  Users,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

const providerIcons: Record<Provider, React.ReactNode> = {
  openai: <Sparkles className="h-5 w-5" />,
  anthropic: <Brain className="h-5 w-5" />,
  google: <Star className="h-5 w-5" />,
  groq: <Zap className="h-5 w-5" />,
};

const providerColors: Record<Provider, string> = {
  openai: 'from-green-500 to-emerald-600',
  anthropic: 'from-orange-500 to-red-600',
  google: 'from-blue-500 to-purple-600',
  groq: 'from-yellow-500 to-orange-600',
};

const tierColors = {
  free: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  premium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pro: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

interface ProviderOverviewProps {
  session: Session;
  selectedProvider?: Provider;
  onProviderSelect?: (provider: Provider) => void;
  className?: string;
}

export function ProviderOverview({
  session,
  selectedProvider,
  onProviderSelect,
  className,
}: ProviderOverviewProps) {
  const userType = session.user.type;
  const { availableChatModelIds } = entitlementsByUserType[userType];

  const availableModels = chatModels.filter((model) =>
    availableChatModelIds.includes(model.id),
  );

  const providerData = useMemo(() => {
    return Object.entries(providers).map(([providerId, providerInfo]) => {
      const provider = providerId as Provider;
      const stats = getProviderStats(provider, availableModels);
      const models = availableModels.filter((m) => m.provider === provider);

      return {
        id: provider,
        ...providerInfo,
        stats,
        models,
        isSelected: selectedProvider === provider,
      };
    });
  }, [availableModels, selectedProvider]);

  const totalModels = availableModels.length;
  const totalProviders = Object.keys(providers).length;

  function formatContextWindow(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${Math.round(tokens / 1000)}K`;
    }
    return tokens.toString();
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalModels}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Models</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalProviders}</span>
            </div>
            <p className="text-xs text-muted-foreground">AI Providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {availableModels.filter((m) => m.tier === 'pro').length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Pro Models</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {
                  availableModels.filter((m) => m.capabilities.supportsVision)
                    .length
                }
              </span>
            </div>
            <p className="text-xs text-muted-foreground">With Vision</p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providerData.map((provider) => (
          <Card
            key={provider.id}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-lg',
              provider.isSelected && 'ring-2 ring-primary shadow-lg',
            )}
            onClick={() => onProviderSelect?.(provider.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg bg-gradient-to-br text-white',
                      providerColors[provider.id],
                    )}
                  >
                    {providerIcons[provider.id]}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {provider.description}
                    </CardDescription>
                  </div>
                </div>
                {provider.isSelected && (
                  <Badge variant="default" className="px-2 py-1">
                    Selected
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Model Count and Distribution */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {provider.stats.totalModels} Models Available
                  </span>
                  <div className="flex items-center gap-1">
                    {provider.stats.freeModels > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {provider.stats.freeModels} Free
                      </Badge>
                    )}
                    {provider.stats.premiumModels > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {provider.stats.premiumModels} Premium
                      </Badge>
                    )}
                    {provider.stats.proModels > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {provider.stats.proModels} Pro
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress
                  value={(provider.stats.totalModels / totalModels) * 100}
                  className="h-2"
                />
              </div>

              {/* Capabilities */}
              <div>
                <div className="text-sm font-medium mb-2">Capabilities</div>
                <div className="flex flex-wrap gap-2">
                  {provider.stats.hasVision && (
                    <Badge variant="secondary" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Vision
                    </Badge>
                  )}
                  {provider.stats.hasReasoning && (
                    <Badge variant="secondary" className="text-xs">
                      <Brain className="h-3 w-3 mr-1" />
                      Reasoning
                    </Badge>
                  )}
                  {provider.stats.hasTools && (
                    <Badge variant="secondary" className="text-xs">
                      <Wrench className="h-3 w-3 mr-1" />
                      Tools
                    </Badge>
                  )}
                </div>
              </div>

              {/* Max Context Window */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Max Context:</span>
                <span className="font-medium">
                  {formatContextWindow(provider.stats.maxContextWindow)} tokens
                </span>
              </div>

              {/* Top Models Preview */}
              <div>
                <div className="text-sm font-medium mb-2">Top Models</div>
                <div className="space-y-1">
                  {provider.models.slice(0, 2).map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30"
                    >
                      <span className="font-medium truncate">{model.name}</span>
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
                  ))}
                  {provider.models.length > 2 && (
                    <div className="text-xs text-muted-foreground text-center py-1">
                      +{provider.models.length - 2} more models
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {onProviderSelect && (
                <Button
                  variant={provider.isSelected ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProviderSelect(provider.id);
                  }}
                >
                  {provider.isSelected
                    ? 'Currently Selected'
                    : `Switch to ${provider.name}`}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Access Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Access Level</CardTitle>
          <CardDescription>
            Model access based on your {userType} tier account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {availableModels.filter((m) => m.tier === 'free').length}
              </div>
              <div className="text-sm text-muted-foreground">Free Models</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {availableModels.filter((m) => m.tier === 'premium').length}
              </div>
              <div className="text-sm text-muted-foreground">
                Premium Models
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {availableModels.filter((m) => m.tier === 'pro').length}
              </div>
              <div className="text-sm text-muted-foreground">Pro Models</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
