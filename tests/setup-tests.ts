/**
 * Test setup configuration
 * This file ensures all tests run without skipping, using mocks when necessary
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });
config({ path: '.env.local' });
config({ path: '.env' });

// Check for missing dependencies and set up mocks
export function setupTestEnvironment(): void {
  console.log('\n🔧 Setting up test environment...\n');

  // Database setup
  if (!process.env.POSTGRES_URL || 
      process.env.POSTGRES_URL.includes('your-test-postgres-url-here') ||
      process.env.POSTGRES_URL.includes('placeholder')) {
    console.log('📝 Database not configured - using mock database');
    const { createMockDatabaseUrl } = require('./mocks/database.mock');
    process.env.POSTGRES_URL = createMockDatabaseUrl();
  } else {
    console.log('✅ Database configured');
  }

  // External services setup
  const hasRealApiKeys = 
    (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('test-')) ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GROQ_API_KEY;

  if (!hasRealApiKeys) {
    console.log('📝 API keys not configured - using mock services');
    const { setupMockEnvironment } = require('./mocks/external-services.mock');
    setupMockEnvironment();
  } else {
    console.log('✅ API keys configured');
  }

  // Stagehand setup
  try {
    require('@browserbasehq/stagehand');
    console.log('✅ Stagehand library available');
  } catch {
    console.log('📝 Stagehand not installed - tests will use mock');
  }

  // Set test environment flags
  if (!process.env.NODE_ENV) {
    (process.env as any).NODE_ENV = 'test';
  }
  process.env.NEXT_PUBLIC_APP_ENV = 'test';
  
  // Ensure Playwright doesn't skip
  if (!process.env.PLAYWRIGHT) {
    process.env.PLAYWRIGHT = 'true';
  }

  console.log('\n✅ Test environment ready!\n');
}

// Run setup when this file is imported
setupTestEnvironment();