#!/usr/bin/env tsx
/**
 * Check Stagehand test environment and dependencies
 */

import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Load test environment
config({ path: '.env.test' });

console.log('🔍 Checking Stagehand test environment...\n');

// Check for required environment variables
const requiredEnvVars = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  POSTGRES_URL: process.env.POSTGRES_URL,
};

const optionalEnvVars = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  XAI_API_KEY: process.env.XAI_API_KEY,
  COHERE_API_KEY: process.env.COHERE_API_KEY,
};

// Check required variables
console.log('📋 Required Environment Variables:');
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value || value.includes('test-') || value.includes('your-')) {
    console.log(`❌ ${key}: Not configured or using placeholder`);
  } else {
    console.log(`✅ ${key}: Configured`);
  }
});

console.log('\n📋 Optional API Keys (for model testing):');
Object.entries(optionalEnvVars).forEach(([key, value]) => {
  if (!value || value.includes('test-') || value.includes('your-')) {
    console.log(`⚠️  ${key}: Not configured`);
  } else {
    console.log(`✅ ${key}: Configured`);
  }
});

// Check if .env.test exists
console.log('\n📄 Configuration Files:');
const envTestPath = path.join(process.cwd(), '.env.test');
if (fs.existsSync(envTestPath)) {
  console.log('✅ .env.test: Found');
} else {
  console.log('❌ .env.test: Not found');
  console.log('💡 Copy .env.test.example to .env.test and configure');
}

// Check for Stagehand dependency
console.log('\n📦 Dependencies:');
try {
  require('@browserbasehq/stagehand');
  console.log('✅ @browserbasehq/stagehand: Installed');
  
  // Additional check for OpenAI API key format
  if (process.env.OPENAI_API_KEY?.startsWith('sk-')) {
    console.log('✅ OpenAI API Key: Valid format');
  } else {
    console.log('❌ OpenAI API Key: Invalid format (should start with sk-)');
  }
} catch (error) {
  console.log('❌ @browserbasehq/stagehand: Not installed');
  console.log('💡 Run: bun install');
}

// Check if server is running
console.log('\n🌐 Server Status:');
fetch('http://localhost:3000')
  .then((res) => {
    if (res.ok) {
      console.log('✅ Development server: Running on http://localhost:3000');
    } else {
      console.log(`⚠️  Development server: Responded with status ${res.status}`);
    }
  })
  .catch(() => {
    console.log('❌ Development server: Not running');
    console.log('💡 Run: bun run dev');
  })
  .finally(() => {
    console.log('\n📝 Summary:');
    console.log('1. Ensure all required environment variables are configured');
    console.log('2. Add real API keys for model testing (at least OpenAI)');
    console.log('3. Start the development server before running tests');
    console.log('4. Run tests with: bun run test:stagehand');
  });