'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { chatModels, providers, type Provider } from '@/lib/ai/models';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
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
  Search,
  Filter,
  CheckCircle,
} from 'lucide-react';

const providerIcons: Record<Provider, React.ReactNode> = {
  openai: <Sparkles className="h-4 w-4" />,
  anthropic: <Brain className="h-4 w-4" />,
  google: <Star className="h-4 w-4" />,
  groq: <Zap className="h-4 w-4" />,
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

interface ModelGridProps {
  session: Session;
  selectedModelId?: string;
  onModelSelect?: (modelId: string) => void;
  className?: string;
  compact?: boolean;
}

export function ModelGrid({
  session,
  selectedModelId,
  onModelSelect,
  className,
  compact = false,
}: ModelGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState<Provider | 'all'>('all');
  const [filterTier, setFilterTier] = useState<
    'free' | 'premium' | 'pro' | 'all'
  >('all');
  const [sortBy, setSortBy] = useState<
    'name' | 'tier' | 'provider' | 'context'
  >('provider');

  const userType = session.user.type;
  const { availableChatModelIds } = entitlementsByUserType[userType];

  const availableModels = chatModels.filter((model) =>
    availableChatModelIds.includes(model.id),
  );

  const filteredAndSortedModels = useMemo(() => {
    let filtered = availableModels;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (model) =>
          model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          providers[model.provider].name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Apply provider filter
    if (filterProvider !== 'all') {
      filtered = filtered.filter((model) => model.provider === filterProvider);
    }

    // Apply tier filter
    if (filterTier !== 'all') {
      filtered = filtered.filter((model) => model.tier === filterTier);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'tier': {
          const tierOrder = { free: 0, premium: 1, pro: 2 };
          return (
            (tierOrder[a.tier || 'free'] || 0) -
            (tierOrder[b.tier || 'free'] || 0)
          );
        }
        case 'provider':
          return providers[a.provider].name.localeCompare(
            providers[b.provider].name,
          );
        case 'context':
          return b.capabilities.contextWindow - a.capabilities.contextWindow;
        default:
          return 0;
      }
    });

    return filtered;
  }, [availableModels, searchTerm, filterProvider, filterTier, sortBy]);

  function formatContextWindow(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${Math.round(tokens / 1000)}K`;
    }
    return tokens.toString();
  }

  const providerStats = useMemo(() => {
    const stats: Record<Provider, number> = {} as any;
    Object.keys(providers).forEach((provider) => {
      stats[provider as Provider] = availableModels.filter(
        (model) => model.provider === provider,
      ).length;
    });
    return stats;
  }, [availableModels]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header and Search */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              AI Models ({filteredAndSortedModels.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose from {availableModels.length} available models across{' '}
              {Object.keys(providers).length} providers
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models by name, description, or provider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select
              value={filterProvider}
              onValueChange={(value) =>
                setFilterProvider(value as Provider | 'all')
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {Object.entries(providers).map(([id, provider]) => (
                  <SelectItem key={id} value={id}>
                    {provider.name} ({providerStats[id as Provider]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterTier}
              onValueChange={(value) => setFilterTier(value as any)}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as any)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="tier">Tier</SelectItem>
                <SelectItem value="context">Context Size</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Model Grid */}
      <div
        className={cn(
          'grid gap-4',
          compact
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
        )}
      >
        {filteredAndSortedModels.map((model) => {
          const isSelected = selectedModelId === model.id;

          return (
            <Card
              key={model.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
                isSelected && 'ring-2 ring-primary shadow-lg',
                compact && 'p-3',
              )}
              onClick={() => onModelSelect?.(model.id)}
            >
              <CardHeader className={cn('pb-3', compact && 'pb-2')}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={cn(
                        'p-1.5 rounded-md bg-gradient-to-br text-white flex-shrink-0',
                        providerColors[model.provider],
                      )}
                    >
                      {providerIcons[model.provider]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle
                        className={cn(
                          'text-base truncate',
                          compact && 'text-sm',
                        )}
                      >
                        {model.name}
                      </CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {providers[model.provider].name}
                        </Badge>
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
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              </CardHeader>

              <CardContent className={cn('space-y-3', compact && 'space-y-2')}>
                <CardDescription
                  className={cn('text-sm line-clamp-2', compact && 'text-xs')}
                >
                  {model.description}
                </CardDescription>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1">
                  {model.capabilities.supportsVision && (
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0.5"
                    >
                      <Eye className="h-2 w-2 mr-1" />
                      Vision
                    </Badge>
                  )}
                  {model.capabilities.supportsReeasoning && (
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0.5"
                    >
                      <Brain className="h-2 w-2 mr-1" />
                      Reasoning
                    </Badge>
                  )}
                  {model.capabilities.supportsTools && (
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0.5"
                    >
                      <Wrench className="h-2 w-2 mr-1" />
                      Tools
                    </Badge>
                  )}
                </div>

                {/* Technical specs */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Context Window:</span>
                    <span className="font-medium">
                      {formatContextWindow(model.capabilities.contextWindow)}{' '}
                      tokens
                    </span>
                  </div>
                  {model.capabilities.maxTokens && (
                    <div className="flex justify-between">
                      <span>Max Output:</span>
                      <span className="font-medium">
                        {formatContextWindow(model.capabilities.maxTokens)}{' '}
                        tokens
                      </span>
                    </div>
                  )}
                  {model.capabilities.specialty && (
                    <div className="flex justify-between">
                      <span>Specialty:</span>
                      <span className="font-medium truncate ml-2">
                        {model.capabilities.specialty}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                {onModelSelect && (
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onModelSelect(model.id);
                    }}
                  >
                    {isSelected ? 'Currently Selected' : 'Select Model'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No Results */}
      {filteredAndSortedModels.length === 0 && (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No models found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Model Count Summary */}
      <div className="flex justify-center">
        <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-lg">
          <span>
            Showing {filteredAndSortedModels.length} of {availableModels.length}{' '}
            models
          </span>
          <span>•</span>
          <span>{Object.keys(providers).length} providers</span>
          <span>•</span>
          <span className="capitalize">{userType} tier access</span>
        </div>
      </div>
    </div>
  );
}
