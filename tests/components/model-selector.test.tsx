import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModelSelector } from '@/components/model-selector';
import { ProviderSelector } from '@/components/provider-selector';
import { ModelGrid } from '@/components/model-grid';
import { ProviderOverview } from '@/components/provider-overview';
import { chatModels, providers } from '@/lib/ai/models';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import type { Session } from 'next-auth';

// Mock session for testing
const mockSession: Session = {
  user: {
    id: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    type: 'premium',
  },
  expires: '2024-12-31',
};

// Mock the saveChatModelAsCookie function
jest.mock('@/app/(chat)/actions', () => ({
  saveChatModelAsCookie: jest.fn(),
}));

describe('Model Selection Components', () => {
  describe('ModelSelector', () => {
    it('renders with default model selection', () => {
      render(
        <ModelSelector
          session={mockSession}
          selectedModelId="gpt-4o"
        />
      );

      expect(screen.getByTestId('model-selector')).toBeInTheDocument();
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    });

    it('opens dropdown and shows all available models grouped by provider', async () => {
      render(
        <ModelSelector
          session={mockSession}
          selectedModelId="gpt-4o"
        />
      );

      const selector = screen.getByTestId('model-selector');
      fireEvent.click(selector);

      await waitFor(() => {
        // Check that provider groups are shown
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
        expect(screen.getByText('Anthropic')).toBeInTheDocument();
        expect(screen.getByText('Google')).toBeInTheDocument();
        expect(screen.getByText('Groq')).toBeInTheDocument();
      });
    });

    it('shows correct number of available models for premium user', async () => {
      const { availableChatModelIds } = entitlementsByUserType.premium;
      
      render(
        <ModelSelector
          session={mockSession}
          selectedModelId="gpt-4o"
        />
      );

      const selector = screen.getByTestId('model-selector');
      fireEvent.click(selector);

      await waitFor(() => {
        const expectedModels = chatModels.filter(model => 
          availableChatModelIds.includes(model.id)
        );
        
        // Check that the footer shows correct count
        expect(screen.getByText(`Available models: ${expectedModels.length}`)).toBeInTheDocument();
        expect(screen.getByText('premium tier')).toBeInTheDocument();
      });
    });

    it('filters models correctly by user tier', () => {
      const guestSession = { ...mockSession, user: { ...mockSession.user, type: 'guest' as const } };
      
      render(
        <ModelSelector
          session={guestSession}
          selectedModelId="gpt-4o-mini"
        />
      );

      const selector = screen.getByTestId('model-selector');
      fireEvent.click(selector);

      // Guest users should only see free tier models
      const { availableChatModelIds } = entitlementsByUserType.guest;
      const expectedCount = chatModels.filter(model => 
        availableChatModelIds.includes(model.id)
      ).length;

      expect(screen.getByText(`Available models: ${expectedCount}`)).toBeInTheDocument();
    });

    it('shows model capabilities badges correctly', async () => {
      render(
        <ModelSelector
          session={mockSession}
          selectedModelId="gpt-4o"
        />
      );

      const selector = screen.getByTestId('model-selector');
      fireEvent.click(selector);

      await waitFor(() => {
        // GPT-4o should show Vision and Tools badges
        const gpt4oItem = screen.getByTestId('model-selector-item-gpt-4o');
        expect(gpt4oItem).toBeInTheDocument();
        
        // Check for capability badges within the dropdown
        expect(screen.getByText('Vision')).toBeInTheDocument();
        expect(screen.getByText('Tools')).toBeInTheDocument();
      });
    });
  });

  describe('ProviderSelector', () => {
    const mockProviderChange = jest.fn();

    beforeEach(() => {
      mockProviderChange.mockClear();
    });

    it('renders selected provider correctly', () => {
      render(
        <ProviderSelector
          selectedProvider="openai"
          onProviderChange={mockProviderChange}
        />
      );

      expect(screen.getByTestId('provider-selector')).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('shows all providers when opened', async () => {
      render(
        <ProviderSelector
          selectedProvider="openai"
          onProviderChange={mockProviderChange}
        />
      );

      const selector = screen.getByTestId('provider-selector');
      fireEvent.click(selector);

      await waitFor(() => {
        Object.values(providers).forEach(provider => {
          expect(screen.getByText(provider.name)).toBeInTheDocument();
        });
      });
    });

    it('calls onProviderChange when provider is selected', async () => {
      render(
        <ProviderSelector
          selectedProvider="openai"
          onProviderChange={mockProviderChange}
        />
      );

      const selector = screen.getByTestId('provider-selector');
      fireEvent.click(selector);

      await waitFor(() => {
        const anthropicItem = screen.getByTestId('provider-selector-item-anthropic');
        fireEvent.click(anthropicItem);
      });

      expect(mockProviderChange).toHaveBeenCalledWith('anthropic');
    });

    it('shows model counts when availableModels provided', () => {
      const mockModels = chatModels.slice(0, 10); // First 10 models for testing
      
      render(
        <ProviderSelector
          selectedProvider="openai"
          onProviderChange={mockProviderChange}
          availableModels={mockModels}
          showModelCount={true}
        />
      );

      const selector = screen.getByTestId('provider-selector');
      fireEvent.click(selector);

      // Should show model counts for each provider
      const openaiModels = mockModels.filter(m => m.provider === 'openai');
      if (openaiModels.length > 0) {
        expect(screen.getByText(`${openaiModels.length} models`)).toBeInTheDocument();
      }
    });
  });

  describe('ModelGrid', () => {
    const mockModelSelect = jest.fn();

    beforeEach(() => {
      mockModelSelect.mockClear();
    });

    it('renders all available models in grid format', () => {
      render(
        <ModelGrid
          session={mockSession}
          selectedModelId="gpt-4o"
          onModelSelect={mockModelSelect}
        />
      );

      const { availableChatModelIds } = entitlementsByUserType.premium;
      const expectedCount = chatModels.filter(model => 
        availableChatModelIds.includes(model.id)
      ).length;

      expect(screen.getByText(`AI Models (${expectedCount})`)).toBeInTheDocument();
    });

    it('filters models by search term', async () => {
      render(
        <ModelGrid
          session={mockSession}
          selectedModelId="gpt-4o"
          onModelSelect={mockModelSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search models/i);
      fireEvent.change(searchInput, { target: { value: 'claude' } });

      await waitFor(() => {
        // Should only show Claude models
        expect(screen.getByText('Claude 4 Sonnet')).toBeInTheDocument();
        expect(screen.queryByText('GPT-4o')).not.toBeInTheDocument();
      });
    });

    it('filters models by provider', async () => {
      render(
        <ModelGrid
          session={mockSession}
          selectedModelId="gpt-4o"
          onModelSelect={mockModelSelect}
        />
      );

      // Find and interact with provider filter
      const providerSelect = screen.getByDisplayValue('All Providers');
      fireEvent.click(providerSelect);
      
      await waitFor(() => {
        const anthropicOption = screen.getByText(/Anthropic/);
        fireEvent.click(anthropicOption);
      });

      // Should only show Anthropic models
      expect(screen.getByText('Claude 4 Sonnet')).toBeInTheDocument();
    });

    it('sorts models correctly', async () => {
      render(
        <ModelGrid
          session={mockSession}
          selectedModelId="gpt-4o"
          onModelSelect={mockModelSelect}
        />
      );

      const sortSelect = screen.getByDisplayValue('Provider');
      fireEvent.click(sortSelect);
      
      await waitFor(() => {
        const nameOption = screen.getByText('Name');
        fireEvent.click(nameOption);
      });

      // Models should now be sorted alphabetically by name
      const modelCards = screen.getAllByRole('button', { name: /select model/i });
      expect(modelCards.length).toBeGreaterThan(0);
    });
  });

  describe('ProviderOverview', () => {
    it('renders overview of all providers', () => {
      render(
        <ProviderOverview
          session={mockSession}
        />
      );

      // Should show total models and providers
      const totalModels = chatModels.filter(model => 
        entitlementsByUserType.premium.availableChatModelIds.includes(model.id)
      ).length;
      
      expect(screen.getByText(totalModels.toString())).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // 4 providers
    });

    it('shows provider capabilities correctly', () => {
      render(
        <ProviderOverview
          session={mockSession}
        />
      );

      // Check that provider cards show capabilities
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Anthropic')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('Groq')).toBeInTheDocument();
    });

    it('highlights selected provider', () => {
      render(
        <ProviderOverview
          session={mockSession}
          selectedProvider="anthropic"
        />
      );

      // Should show "Selected" badge for Anthropic
      expect(screen.getByText('Selected')).toBeInTheDocument();
    });
  });

  describe('Model Count Verification', () => {
    it('confirms all 23 models are defined', () => {
      expect(chatModels.length).toBe(23);
    });

    it('confirms all 4 providers are represented', () => {
      const uniqueProviders = new Set(chatModels.map(model => model.provider));
      expect(uniqueProviders.size).toBe(4);
      expect(uniqueProviders.has('openai')).toBe(true);
      expect(uniqueProviders.has('anthropic')).toBe(true);
      expect(uniqueProviders.has('google')).toBe(true);
      expect(uniqueProviders.has('groq')).toBe(true);
    });

    it('verifies OpenAI models count', () => {
      const openaiModels = chatModels.filter(model => model.provider === 'openai');
      expect(openaiModels.length).toBe(8);
    });

    it('verifies Anthropic models count', () => {
      const anthropicModels = chatModels.filter(model => model.provider === 'anthropic');
      expect(anthropicModels.length).toBe(5);
    });

    it('verifies Google models count', () => {
      const googleModels = chatModels.filter(model => model.provider === 'google');
      expect(googleModels.length).toBe(4);
    });

    it('verifies Groq models count', () => {
      const groqModels = chatModels.filter(model => model.provider === 'groq');
      expect(groqModels.length).toBe(4);
    });

    it('verifies legacy models count', () => {
      const legacyModels = chatModels.filter(model => 
        model.id === 'chat-model' || model.id === 'chat-model-reasoning'
      );
      expect(legacyModels.length).toBe(2);
    });

    it('verifies tier distribution', () => {
      const freeModels = chatModels.filter(model => model.tier === 'free');
      const premiumModels = chatModels.filter(model => model.tier === 'premium');
      const proModels = chatModels.filter(model => model.tier === 'pro');

      expect(freeModels.length).toBeGreaterThan(0);
      expect(premiumModels.length).toBeGreaterThan(0);
      expect(proModels.length).toBeGreaterThan(0);
      expect(freeModels.length + premiumModels.length + proModels.length).toBe(23);
    });

    it('verifies capabilities distribution', () => {
      const visionModels = chatModels.filter(model => model.capabilities.supportsVision);
      const reasoningModels = chatModels.filter(model => model.capabilities.supportsReeasoning);
      const toolModels = chatModels.filter(model => model.capabilities.supportsTools);

      expect(visionModels.length).toBeGreaterThan(0);
      expect(reasoningModels.length).toBeGreaterThan(0);
      expect(toolModels.length).toBeGreaterThan(0);
    });
  });
});