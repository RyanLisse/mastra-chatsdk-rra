#!/usr/bin/env bun
/**
 * Test runner with timeout protection
 * 
 * This script runs Playwright tests with a hard timeout to prevent hanging.
 * If tests don't complete within the timeout, the process is forcefully terminated.
 */

import { spawn } from 'node:child_process';
import { exit } from 'node:process';

const TIMEOUT_MINUTES = 10; // 10 minutes max for all tests
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;

console.log(`🚀 Starting Playwright tests with ${TIMEOUT_MINUTES} minute timeout...`);

// Get test arguments from command line
const args = process.argv.slice(2);
const testCommand = ['bun', 'playwright', 'test', ...args];

// Spawn the test process
const testProcess = spawn(testCommand[0], testCommand.slice(1), {
  stdio: 'inherit',
  env: {
    ...process.env,
    PLAYWRIGHT_NO_SIGNAL_HANDLERS: 'true', // Prevent signal handler conflicts
    FORCE_COLOR: '1', // Keep colors in output
  },
});

let processExited = false;

// Set up timeout
const timeoutId = setTimeout(() => {
  if (!processExited) {
    console.error(`\n❌ Tests timed out after ${TIMEOUT_MINUTES} minutes!`);
    console.error('🔪 Forcefully terminating test process...');
    
    // Try graceful shutdown first
    testProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (!processExited) {
        testProcess.kill('SIGKILL');
        exit(124); // Timeout exit code
      }
    }, 5000);
  }
}, TIMEOUT_MS);

// Handle test process exit
testProcess.on('exit', (code, signal) => {
  processExited = true;
  clearTimeout(timeoutId);
  
  if (signal) {
    console.log(`\n⚠️  Tests terminated by signal: ${signal}`);
    exit(128 + (signal === 'SIGTERM' ? 15 : 9));
  } else if (code !== null) {
    if (code === 0) {
      console.log('\n✅ All tests completed successfully!');
    } else {
      console.log(`\n❌ Tests failed with exit code: ${code}`);
    }
    exit(code);
  }
});

// Handle errors
testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error);
  clearTimeout(timeoutId);
  exit(1);
});

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test run interrupted by user');
  testProcess.kill('SIGTERM');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test run terminated');
  testProcess.kill('SIGTERM');
});

// Progress indicator
let progressInterval: NodeJS.Timeout | null = null;
if (process.stdout.isTTY && !process.env.CI) {
  let dots = 0;
  progressInterval = setInterval(() => {
    if (!processExited) {
      process.stdout.write('.');
      dots++;
      if (dots % 60 === 0) {
        process.stdout.write(` ${dots / 60}m\n`);
      }
    }
  }, 1000);
  
  // Clean up progress indicator on exit
  process.on('exit', () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      process.stdout.write('\n');
    }
  });
}