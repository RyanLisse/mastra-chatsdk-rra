# Multi-Provider AI Configuration Guide

This guide explains how to configure and use multiple AI providers in the Mastra Chat SDK application.

## Overview

The application supports four major AI providers, allowing you to leverage different models based on your needs:

- **OpenAI** - Primary provider with GPT models
- **Anthropic** - Claude models with strong reasoning capabilities  
- **Google** - Gemini models with multimodal capabilities
- **Groq** - High-speed inference with LLaMA models

## Provider Configuration

### Environment Variables

Configure providers by setting their respective API keys in your `.env.local` file:

```env
# OpenAI (Recommended - primary provider)
OPENAI_API_KEY=sk-your-openai-api-key

# Anthropic (Optional)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key

# Google (Optional)
GOOGLE_API_KEY=AIzaSy-your-google-api-key

# Groq (Optional)
GROQ_API_KEY=gsk_your-groq-api-key
```

### API Key Formats

The system validates API key formats to prevent configuration errors:

| Provider | Format | Example |
|----------|--------|---------|
| OpenAI | `sk-[alphanumeric+]` | `sk-proj-abc123...` |
| Anthropic | `sk-ant-[alphanumeric+]` | `sk-ant-api03-xyz789...` |
| Google | `AIza[alphanumeric+]` | `AIzaSyAbc123...` |
| Groq | `gsk_[alphanumeric+]` | `gsk_abc123...` |

## Available Models

### OpenAI Models

| Model | Tier | Context | Features |
|-------|------|---------|----------|
| o3-pro | Pro | 200K | Advanced reasoning |
| o3 | Premium | 128K | Reasoning |
| o4-mini | Free | 64K | Fast reasoning |
| gpt-4.1 | Premium | 128K | Vision, tools |
| gpt-4.1-mini | Free | 64K | Fast, vision |
| gpt-4.1-nano | Free | 32K | Ultra-lightweight |
| gpt-4o | Premium | 128K | Multimodal |
| gpt-4o-mini | Free | 64K | Efficient multimodal |

### Anthropic Models

| Model | Tier | Context | Features |
|-------|------|---------|----------|
| claude-4-opus | Pro | 200K | Complex reasoning |
| claude-4-sonnet | Premium | 200K | Balanced reasoning |
| claude-3.7-sonnet | Premium | 200K | Enhanced vision |
| claude-3.5-sonnet | Premium | 200K | Code generation |
| claude-3.5-haiku | Free | 200K | Fast responses |

### Google Models

| Model | Tier | Context | Features |
|-------|------|---------|----------|
| gemini-2.5-pro | Pro | 1M | Long context multimodal |
| gemini-2.5-flash | Premium | 1M | Fast long-context |
| gemini-2.0-flash | Premium | 500K | Enhanced speed |
| gemini-2.0-pro | Premium | 500K | Professional multimodal |

### Groq Models

| Model | Tier | Context | Features |
|-------|------|---------|----------|
| llama-3.3-70b | Premium | 128K | High performance |
| llama-3.1-405b | Pro | 128K | Massive parameters |
| llama-3-groq-70b-tool-use | Premium | 64K | Tool usage |
| llama-3-groq-8b-tool-use | Free | 32K | Efficient tools |

## Getting API Keys

### OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new secret key
5. Copy the key (starts with `sk-`)

### Anthropic
1. Visit [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Sign in or create an account
3. Go to API Keys in settings
4. Generate a new key
5. Copy the key (starts with `sk-ant-`)

### Google
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google account
3. Create a new API key
4. Copy the key (starts with `AIza`)

### Groq
1. Visit [Groq Console](https://console.groq.com/keys)
2. Sign in or create an account
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `gsk_`)

## Provider Features

### Fallback Mechanism
- If a provider is unavailable, the system automatically falls back to OpenAI
- Invalid API keys are detected and reported during startup
- Users can switch providers in real-time through the UI

### Environment Validation
The system performs comprehensive validation:
- Checks API key presence and format
- Validates provider availability
- Reports configuration issues in console logs
- Provides setup instructions for missing providers

### Model Selection
- Models are automatically available based on configured providers
- UI displays provider logos and model capabilities
- Users can filter models by provider, tier, or capabilities
- Model switching preserves conversation context

## Development Setup

### Minimal Setup (OpenAI only)
```env
OPENAI_API_KEY=sk-your-openai-key
COHERE_API_KEY=your-cohere-key  # Required for RAG
```

### Complete Setup (All providers)
```env
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=AIzaSy-your-google-key
GROQ_API_KEY=gsk_your-groq-key
COHERE_API_KEY=your-cohere-key
```

### Testing Provider Configuration

Run the application in development mode to see provider status:

```bash
npm run dev
```

Console output will show:
```
🤖 AI Provider Environment Status:
✅ Available Providers: openai, anthropic, google, groq
⚠️  Missing Providers: None
```

## Troubleshooting

### Common Issues

**Provider not available:**
- Check API key is set in `.env.local`
- Verify API key format is correct
- Ensure API key has necessary permissions

**Invalid API key format:**
- Check the API key format matches provider requirements
- Remove any extra spaces or characters
- Regenerate the key if necessary

**Models not appearing:**
- Restart the development server after adding new API keys
- Check browser console for error messages
- Verify provider is listed in available providers

### Debug Commands

Check environment variables:
```bash
# In your application console
console.log(process.env.OPENAI_API_KEY?.substring(0, 10) + '...')
```

Validate configuration programmatically:
```typescript
import { validateEnvironment } from '@/lib/ai/env-validation';
const status = validateEnvironment();
console.log(status);
```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use different keys** for development and production
3. **Rotate keys regularly** (recommended: every 90 days)
4. **Monitor API usage** to detect unexpected usage
5. **Set spending limits** on provider platforms
6. **Enable 2FA** on all provider accounts
7. **Restrict API key permissions** where possible

## Cost Optimization

### Model Selection by Use Case

**Quick responses:** Use free tier models
- `gpt-4o-mini`, `claude-3.5-haiku`, `llama-3-groq-8b-tool-use`

**Balanced performance:** Use premium models
- `gpt-4o`, `claude-3.5-sonnet`, `gemini-2.0-flash`

**Complex reasoning:** Use pro models
- `o3-pro`, `claude-4-opus`, `gemini-2.5-pro`

### Provider-Specific Pricing
- **Groq**: Often the most cost-effective for high-throughput
- **Google**: Competitive pricing for long-context tasks
- **Anthropic**: Premium pricing for high-quality reasoning
- **OpenAI**: Standard pricing across model tiers

## Advanced Configuration

### Custom Model Preferences
```env
DEFAULT_CHAT_MODEL_ID=gpt-4o
PREFERRED_REASONING_MODEL=o3-mini
PREFERRED_FAST_MODEL=gpt-4o-mini
```

### Provider-Specific Feature Flags
```env
ENABLE_ANTHROPIC_MODELS=true
ENABLE_GOOGLE_MODELS=true
ENABLE_GROQ_MODELS=true
ENABLE_OPENAI_MODELS=true
```

### Load Balancing
The system can distribute requests across providers for:
- Cost optimization
- Redundancy
- Performance tuning

Configure in `lib/ai/provider-config.ts` for custom load balancing strategies.