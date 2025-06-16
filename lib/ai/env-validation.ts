import { type Provider } from './models';
import { getProviderEnvironment, isProviderAvailable } from './provider-config';

export interface EnvironmentStatus {
  isValid: boolean;
  availableProviders: Provider[];
  missingProviders: Provider[];
  warnings: string[];
  errors: string[];
  invalidKeys: Array<{ provider: Provider; reason: string }>;
}

/**
 * Validate API key format for a provider
 */
function validateApiKeyFormat(provider: Provider, apiKey: string): { isValid: boolean; reason?: string } {
  if (!apiKey) {
    return { isValid: false, reason: 'API key is empty' };
  }

  const validations: Record<Provider, { pattern: RegExp; description: string }> = {
    openai: {
      pattern: /^sk-[a-zA-Z0-9\-_]{20,}$/,
      description: 'Should start with "sk-" followed by alphanumeric characters'
    },
    anthropic: {
      pattern: /^sk-ant-[a-zA-Z0-9\-_]{20,}$/,
      description: 'Should start with "sk-ant-" followed by alphanumeric characters'
    },
    google: {
      pattern: /^AIza[a-zA-Z0-9\-_]{35,}$/,
      description: 'Should start with "AIza" followed by alphanumeric characters'
    },
    groq: {
      pattern: /^gsk_[a-zA-Z0-9\-_]{20,}$/,
      description: 'Should start with "gsk_" followed by alphanumeric characters'
    },
  };

  const validation = validations[provider];
  if (!validation) {
    return { isValid: true }; // Unknown provider, assume valid
  }

  if (!validation.pattern.test(apiKey)) {
    return { 
      isValid: false, 
      reason: `Invalid format. ${validation.description}` 
    };
  }

  return { isValid: true };
}

/**
 * Validate environment configuration for AI providers
 */
export function validateEnvironment(): EnvironmentStatus {
  const env = getProviderEnvironment();
  const allProviders: Provider[] = ['openai', 'anthropic', 'google', 'groq'];
  const availableProviders: Provider[] = [];
  const missingProviders: Provider[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const invalidKeys: Array<{ provider: Provider; reason: string }> = [];

  // Check each provider
  for (const provider of allProviders) {
    const apiKey = getApiKey(env, provider);
    
    if (!apiKey) {
      missingProviders.push(provider);
      const envVarName = getEnvVarName(provider);
      warnings.push(`${provider.toUpperCase()} API key not found. Set ${envVarName} to enable ${provider} models.`);
    } else {
      // Validate API key format
      const validation = validateApiKeyFormat(provider, apiKey);
      if (validation.isValid) {
        availableProviders.push(provider);
      } else {
        invalidKeys.push({ provider, reason: validation.reason || 'Invalid format' });
        errors.push(`${provider.toUpperCase()} API key is invalid: ${validation.reason}`);
      }
    }
  }

  // Check if at least one provider is available
  if (availableProviders.length === 0) {
    errors.push('No valid AI providers are configured. Please set at least one valid API key.');
  }

  // Special warnings for missing providers
  if (!availableProviders.includes('openai')) {
    warnings.push('OpenAI is the default fallback provider. Consider setting OPENAI_API_KEY for better reliability.');
  }

  return {
    isValid: errors.length === 0,
    availableProviders,
    missingProviders,
    warnings,
    errors,
    invalidKeys,
  };
}

/**
 * Get API key for a provider from environment
 */
function getApiKey(env: any, provider: Provider): string | undefined {
  switch (provider) {
    case 'openai':
      return env.openai.apiKey;
    case 'anthropic':
      return env.anthropic.apiKey;
    case 'google':
      return env.google.apiKey;
    case 'groq':
      return env.groq.apiKey;
    default:
      return undefined;
  }
}

/**
 * Get environment variable name for a provider
 */
function getEnvVarName(provider: Provider): string {
  const envVarMap: Record<Provider, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    groq: 'GROQ_API_KEY',
  };
  
  return envVarMap[provider];
}

/**
 * Log environment status on startup
 */
export function logEnvironmentStatus(): void {
  const status = validateEnvironment();
  
  console.log('\n🤖 AI Provider Environment Status:');
  console.log(`✅ Available Providers: ${status.availableProviders.join(', ') || 'None'}`);
  
  if (status.missingProviders.length > 0) {
    console.log(`⚠️  Missing Providers: ${status.missingProviders.join(', ')}`);
  }
  
  if (status.invalidKeys.length > 0) {
    console.log('\n🔑 Invalid API Keys:');
    status.invalidKeys.forEach(({ provider, reason }) => 
      console.log(`   ${provider.toUpperCase()}: ${reason}`)
    );
  }
  
  if (status.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    status.warnings.forEach(warning => console.log(`   ${warning}`));
  }
  
  if (status.errors.length > 0) {
    console.log('\n❌ Errors:');
    status.errors.forEach(error => console.log(`   ${error}`));
  }
  
  console.log(''); // Empty line for spacing
}

/**
 * Get recommended environment variables setup
 */
export function getEnvironmentSetupInstructions(): string {
  const status = validateEnvironment();
  
  if (status.isValid && status.availableProviders.length === 4) {
    return 'All AI providers are configured correctly! 🎉';
  }
  
  let instructions = 'To enable all AI providers, set these environment variables:\n\n';
  
  const envVars = [
    { name: 'OPENAI_API_KEY', provider: 'openai', description: 'OpenAI GPT models (o3, o4, GPT-4)' },
    { name: 'ANTHROPIC_API_KEY', provider: 'anthropic', description: 'Claude models (Claude 4, 3.5)' },
    { name: 'GOOGLE_API_KEY', provider: 'google', description: 'Gemini models (2.5 Pro, 2.0 Flash)' },
    { name: 'GROQ_API_KEY', provider: 'groq', description: 'LLaMA models with high-speed inference' },
  ];
  
  for (const envVar of envVars) {
    const isConfigured = status.availableProviders.includes(envVar.provider as Provider);
    const status_icon = isConfigured ? '✅' : '❌';
    instructions += `${status_icon} ${envVar.name}="your-key-here"  # ${envVar.description}\n`;
  }
  
  instructions += '\nAdd these to your .env.local file or deployment environment.\n';
  
  return instructions;
}