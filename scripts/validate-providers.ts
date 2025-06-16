#!/usr/bin/env tsx
/**
 * Provider Configuration Validation Script
 * 
 * This script validates your AI provider configuration and provides
 * detailed feedback about your environment setup.
 * 
 * Usage:
 *   npx tsx scripts/validate-providers.ts
 *   bun run scripts/validate-providers.ts
 */

import { validateEnvironment, getEnvironmentSetupInstructions } from '../lib/ai/env-validation';
import { getProviderEnvironment, getAvailableProviders } from '../lib/ai/provider-config';
import { chatModels } from '../lib/ai/models';

function formatApiKey(key: string | undefined): string {
  if (!key) return '❌ Not set';
  return `✅ ${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
}

function printHeader(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function printSection(title: string) {
  console.log(`\n📋 ${title}`);
  console.log('-'.repeat(40));
}

async function main() {
  console.log('🔍 Mastra Chat SDK - Provider Configuration Validator\n');

  // 1. Environment Overview
  printHeader('ENVIRONMENT OVERVIEW');
  
  const env = getProviderEnvironment();
  const status = validateEnvironment();
  
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Validation Status: ${status.isValid ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`Available Providers: ${status.availableProviders.length}/4`);
  
  // 2. API Key Status
  printSection('API Key Configuration');
  
  console.log(`OpenAI:    ${formatApiKey(env.openai.apiKey)}`);
  console.log(`Anthropic: ${formatApiKey(env.anthropic.apiKey)}`);
  console.log(`Google:    ${formatApiKey(env.google.apiKey)}`);
  console.log(`Groq:      ${formatApiKey(env.groq.apiKey)}`);
  
  // 3. Provider Status
  printSection('Provider Status');
  
  const allProviders = ['openai', 'anthropic', 'google', 'groq'] as const;
  for (const provider of allProviders) {
    const isAvailable = status.availableProviders.includes(provider);
    const icon = isAvailable ? '✅' : '❌';
    const statusText = isAvailable ? 'Available' : 'Not configured';
    console.log(`${icon} ${provider.toUpperCase().padEnd(10)} ${statusText}`);
  }
  
  // 4. Available Models
  printSection('Available Models');
  
  const availableModels = chatModels.filter(model => 
    status.availableProviders.includes(model.provider)
  );
  
  console.log(`Total Models: ${availableModels.length}/${chatModels.length}`);
  
  for (const provider of status.availableProviders) {
    const providerModels = availableModels.filter(m => m.provider === provider);
    console.log(`\n${provider.toUpperCase()} (${providerModels.length} models):`);
    
    for (const model of providerModels) {
      const tier = model.tier ? `[${model.tier.toUpperCase()}]` : '[LEGACY]';
      console.log(`  • ${model.name.padEnd(20)} ${tier} - ${model.description}`);
    }
  }
  
  // 5. Issues and Warnings
  if (status.errors.length > 0) {
    printSection('❌ Errors');
    status.errors.forEach(error => console.log(`  ${error}`));
  }
  
  if (status.invalidKeys.length > 0) {
    printSection('🔑 Invalid API Keys');
    status.invalidKeys.forEach(({ provider, reason }) => 
      console.log(`  ${provider.toUpperCase()}: ${reason}`)
    );
  }
  
  if (status.warnings.length > 0) {
    printSection('⚠️  Warnings');
    status.warnings.forEach(warning => console.log(`  ${warning}`));
  }
  
  // 6. Recommendations
  printSection('💡 Recommendations');
  
  if (status.availableProviders.length === 0) {
    console.log('  🚨 No providers configured! Set at least OPENAI_API_KEY to get started.');
  } else if (status.availableProviders.length < 2) {
    console.log('  💡 Consider adding more providers for better model variety and redundancy.');
  } else if (status.availableProviders.length === 4) {
    console.log('  🎉 Excellent! All providers are configured for maximum model variety.');
  }
  
  if (!status.availableProviders.includes('openai')) {
    console.log('  ⚠️  OpenAI is the primary provider - consider adding it for best reliability.');
  }
  
  // 7. Setup Instructions
  if (!status.isValid || status.availableProviders.length < 4) {
    printSection('📝 Setup Instructions');
    console.log(getEnvironmentSetupInstructions());
  }
  
  // 8. Quick Actions
  printSection('🚀 Quick Actions');
  console.log('  • Copy example config: cp .env.local.example .env.local');
  console.log('  • Get OpenAI key:      https://platform.openai.com/api-keys');
  console.log('  • Get Anthropic key:   https://console.anthropic.com/settings/keys');
  console.log('  • Get Google key:      https://aistudio.google.com/app/apikey');
  console.log('  • Get Groq key:        https://console.groq.com/keys');
  console.log('  • Run this check:      npx tsx scripts/validate-providers.ts');
  
  console.log('\n' + '='.repeat(60));
  console.log('  Validation Complete');
  console.log('='.repeat(60) + '\n');
  
  // Exit with appropriate code
  process.exit(status.isValid ? 0 : 1);
}

// Handle async execution
main().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});