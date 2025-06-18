#!/usr/bin/env tsx
/**
 * Run a single Stagehand test with better error handling and cleanup
 */

import { spawn } from 'node:child_process';
import { config } from 'dotenv';

// Load test environment
config({ path: '.env.test' });

const testFile = process.argv[2] || 'tests/stagehand/model-response-test.ts';

console.log(`🧪 Running Stagehand test: ${testFile}\n`);

// Check for required environment
if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-')) {
  console.error('❌ Valid OpenAI API key required for Stagehand tests');
  console.error('💡 Set OPENAI_API_KEY in .env.test');
  process.exit(1);
}

// Set up environment
const env = {
  ...process.env,
  PLAYWRIGHT: 'true',
  NODE_ENV: 'test' as const,
  // Force headless mode for CI/testing
  HEADLESS: 'true',
};

// Run the test with a timeout
const testProcess = spawn('npx', ['playwright', 'test', testFile, '--max-failures=1'], {
  env,
  stdio: 'inherit',
});

// Set a global timeout for the test
const TEST_TIMEOUT = 120000; // 2 minutes
const timeout = setTimeout(() => {
  console.error('\n⏱️  Test timeout reached, terminating...');
  testProcess.kill('SIGTERM');
  
  // Force kill after 5 seconds if SIGTERM doesn't work
  setTimeout(() => {
    if (!testProcess.killed) {
      console.error('⚠️  Force killing test process...');
      testProcess.kill('SIGKILL');
    }
  }, 5000);
}, TEST_TIMEOUT);

// Handle test completion
testProcess.on('close', (code) => {
  clearTimeout(timeout);
  
  if (code === 0) {
    console.log('\n✅ Test completed successfully');
  } else if (code === null) {
    console.log('\n⚠️  Test was terminated');
  } else {
    console.log(`\n❌ Test failed with code ${code}`);
  }
  
  process.exit(code || 0);
});

// Handle errors
testProcess.on('error', (error) => {
  clearTimeout(timeout);
  console.error('\n❌ Failed to run test:', error);
  process.exit(1);
});

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⚠️  Interrupted, cleaning up...');
  testProcess.kill('SIGTERM');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Terminated, cleaning up...');
  testProcess.kill('SIGTERM');
  process.exit(143);
});