#!/usr/bin/env tsx

import { chatModels, providers, type Provider } from '../lib/ai/models';
import { entitlementsByUserType } from '../lib/ai/entitlements';

console.log('🔍 Verifying AI Model Configuration...\n');

// 1. Total Model Count Verification
console.log('📊 Total Model Count:');
console.log(`✅ Total models defined: ${chatModels.length}`);
console.log(`✅ Expected: 23 models`);
console.log(
  `${chatModels.length === 23 ? '✅' : '❌'} Count verification: ${chatModels.length === 23 ? 'PASSED' : 'FAILED'}\n`,
);

// 2. Provider Coverage Verification
console.log('🏢 Provider Coverage:');
const uniqueProviders = new Set(chatModels.map((model) => model.provider));
console.log(`✅ Unique providers: ${uniqueProviders.size}`);
console.log(`✅ Expected: 4 providers`);

Object.keys(providers).forEach((providerId) => {
  const provider = providerId as Provider;
  const hasModels = uniqueProviders.has(provider);
  console.log(
    `${hasModels ? '✅' : '❌'} ${providers[provider].name}: ${hasModels ? 'PRESENT' : 'MISSING'}`,
  );
});

console.log(
  `${uniqueProviders.size === 4 ? '✅' : '❌'} Provider verification: ${uniqueProviders.size === 4 ? 'PASSED' : 'FAILED'}\n`,
);

// 3. Provider Model Distribution
console.log('📈 Model Distribution by Provider:');
const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    acc[model.provider] = (acc[model.provider] || 0) + 1;
    return acc;
  },
  {} as Record<Provider, number>,
);

Object.entries(modelsByProvider).forEach(([provider, count]) => {
  console.log(`✅ ${providers[provider as Provider].name}: ${count} models`);
});

// Expected distribution
const expectedCounts = {
  openai: 8,
  anthropic: 5,
  google: 4,
  groq: 4,
};

let distributionPassed = true;
Object.entries(expectedCounts).forEach(([provider, expectedCount]) => {
  const actualCount = modelsByProvider[provider as Provider] || 0;
  const passed = actualCount >= expectedCount;
  if (!passed) distributionPassed = false;
  console.log(
    `${passed ? '✅' : '❌'} ${providers[provider as Provider].name}: Expected ${expectedCount}, got ${actualCount}`,
  );
});

console.log(
  `${distributionPassed ? '✅' : '❌'} Distribution verification: ${distributionPassed ? 'PASSED' : 'FAILED'}\n`,
);

// 4. Tier Distribution
console.log('🏆 Model Tier Distribution:');
const tierCounts = chatModels.reduce(
  (acc, model) => {
    const tier = model.tier || 'unknown';
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);

Object.entries(tierCounts).forEach(([tier, count]) => {
  console.log(`✅ ${tier.toUpperCase()}: ${count} models`);
});

const hasFree = tierCounts.free > 0;
const hasPremium = tierCounts.premium > 0;
const hasPro = tierCounts.pro > 0;
const tiersPassed = hasFree && hasPremium && hasPro;

console.log(
  `${tiersPassed ? '✅' : '❌'} Tier distribution: ${tiersPassed ? 'PASSED' : 'FAILED'}\n`,
);

// 5. Capability Distribution
console.log('🧠 Capability Distribution:');
const capabilities = {
  vision: chatModels.filter((m) => m.capabilities.supportsVision).length,
  reasoning: chatModels.filter((m) => m.capabilities.supportsReeasoning).length,
  tools: chatModels.filter((m) => m.capabilities.supportsTools).length,
};

Object.entries(capabilities).forEach(([capability, count]) => {
  console.log(`✅ ${capability.toUpperCase()}: ${count} models`);
});

const capabilitiesPassed =
  capabilities.vision > 0 &&
  capabilities.reasoning > 0 &&
  capabilities.tools > 0;
console.log(
  `${capabilitiesPassed ? '✅' : '❌'} Capability distribution: ${capabilitiesPassed ? 'PASSED' : 'FAILED'}\n`,
);

// 6. User Tier Access Verification
console.log('👥 User Tier Access:');
Object.entries(entitlementsByUserType).forEach(([userType, entitlements]) => {
  const availableCount = entitlements.availableChatModelIds.length;
  const validModels = entitlements.availableChatModelIds.filter((id) =>
    chatModels.some((model) => model.id === id),
  ).length;

  console.log(
    `✅ ${userType.toUpperCase()}: ${availableCount} models (${validModels} valid)`,
  );

  if (availableCount !== validModels) {
    console.log(
      `❌ Some model IDs in ${userType} entitlements don't exist in chatModels`,
    );
  }
});

// 7. Special Model Verification
console.log('\n🎯 Special Model Verification:');

// Claude 4 models
const claude4Models = chatModels.filter((m) => m.id.includes('claude-4'));
console.log(
  `✅ Claude 4 models: ${claude4Models.length} (${claude4Models.map((m) => m.name).join(', ')})`,
);

// Gemini 2.5 models
const gemini25Models = chatModels.filter((m) => m.id.includes('gemini-2.5'));
console.log(
  `✅ Gemini 2.5 models: ${gemini25Models.length} (${gemini25Models.map((m) => m.name).join(', ')})`,
);

// o3 models
const o3Models = chatModels.filter((m) => m.id.includes('o3'));
console.log(
  `✅ o3 models: ${o3Models.length} (${o3Models.map((m) => m.name).join(', ')})`,
);

// LLaMA models
const llamaModels = chatModels.filter((m) => m.id.includes('llama'));
console.log(
  `✅ LLaMA models: ${llamaModels.length} (${llamaModels.map((m) => m.name).join(', ')})`,
);

// 8. Context Window Verification
console.log('\n💾 Context Window Analysis:');
const contextWindows = chatModels
  .map((m) => m.capabilities.contextWindow)
  .sort((a, b) => b - a);
console.log(
  `✅ Largest context window: ${contextWindows[0].toLocaleString()} tokens`,
);
console.log(
  `✅ Smallest context window: ${contextWindows[contextWindows.length - 1].toLocaleString()} tokens`,
);

const megaTokenModels = chatModels.filter(
  (m) => m.capabilities.contextWindow >= 1000000,
);
console.log(
  `✅ Models with 1M+ tokens: ${megaTokenModels.length} (${megaTokenModels.map((m) => m.name).join(', ')})`,
);

// 9. Final Summary
console.log('\n🎉 VERIFICATION SUMMARY:');
const allChecks = [
  chatModels.length === 23,
  uniqueProviders.size === 4,
  distributionPassed,
  tiersPassed,
  capabilitiesPassed,
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);
console.log(
  `${passedChecks === totalChecks ? '🎉 ALL VERIFICATIONS PASSED!' : '❌ Some verifications failed'}`,
);

// List some sample models for verification
console.log('\n📋 Sample Models from Each Provider:');
Object.entries(providers).forEach(([providerId, providerData]) => {
  const provider = providerId as Provider;
  const providerModels = chatModels.filter((m) => m.provider === provider);
  const sampleModel = providerModels[0];
  if (sampleModel) {
    console.log(
      `  ${providerData.name}: ${sampleModel.name} (${sampleModel.tier}, ${sampleModel.capabilities.contextWindow.toLocaleString()} tokens)`,
    );
  }
});
