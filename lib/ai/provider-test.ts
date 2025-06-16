/**
 * Test file to validate multi-provider AI implementation
 */

import { chatModels } from './models';
import { getModelInfo, isProviderAvailable } from './provider-config';
import { isModelAvailable } from './providers';
import { validateEnvironment } from './env-validation';

/**
 * Test provider availability
 */
export function testProviderAvailability() {
  console.log('🔍 Testing Provider Availability:');
  
  const providers = ['openai', 'anthropic', 'google', 'groq'] as const;
  
  providers.forEach(provider => {
    const available = isProviderAvailable(provider);
    console.log(`  ${provider}: ${available ? '✅' : '❌'}`);
  });
}

/**
 * Test model mappings
 */
export function testModelMappings() {
  console.log('\n🗺️  Testing Model Mappings:');
  
  const testModels = [
    'gpt-4o',
    'claude-3.5-sonnet',
    'gemini-2.5-pro',
    'llama-3.3-70b',
    'o3-pro',
    'claude-4-opus',
  ];
  
  testModels.forEach(modelId => {
    const modelInfo = getModelInfo(modelId);
    const available = isModelAvailable(modelId);
    console.log(`  ${modelId}: ${modelInfo ? `${modelInfo.provider} -> ${modelInfo.modelId}` : 'NOT FOUND'} (${available ? '✅' : '❌'})`);
  });
}

/**
 * Test environment validation
 */
export function testEnvironmentValidation() {
  console.log('\n🌍 Environment Validation:');
  
  const status = validateEnvironment();
  
  console.log(`  Valid: ${status.isValid ? '✅' : '❌'}`);
  console.log(`  Available Providers: ${status.availableProviders.join(', ')}`);
  console.log(`  Missing Providers: ${status.missingProviders.join(', ')}`);
  
  if (status.warnings.length > 0) {
    console.log('  Warnings:');
    status.warnings.forEach(warning => console.log(`    - ${warning}`));
  }
  
  if (status.errors.length > 0) {
    console.log('  Errors:');
    status.errors.forEach(error => console.log(`    - ${error}`));
  }
}

/**
 * Test model counts by provider
 */
export function testModelCounts() {
  console.log('\n📊 Model Counts by Provider:');
  
  const modelsByProvider = chatModels.reduce((acc, model) => {
    acc[model.provider] = (acc[model.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(modelsByProvider).forEach(([provider, count]) => {
    console.log(`  ${provider}: ${count} models`);
  });
  
  console.log(`  Total: ${chatModels.length} models`);
}

/**
 * Run all tests
 */
export function runProviderTests() {
  console.log('🧪 Multi-Provider AI Implementation Tests\n');
  
  testProviderAvailability();
  testModelMappings();
  testEnvironmentValidation();
  testModelCounts();
  
  console.log('\n✨ Tests completed!');
}