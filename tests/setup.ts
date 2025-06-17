/**
 * Global test setup for database connection management
 *
 * This file should be imported by all test files to ensure proper
 * database connection cleanup and prevent test hanging issues.
 *
 * Includes comprehensive signal handlers for graceful shutdown during tests.
 */

import { afterAll, beforeAll } from 'bun:test';
import {
  cleanupTestConnections,
  checkConnectionHealth,
} from '../lib/db/cleanup';

// Import comprehensive signal handlers
import {
  registerTestSignalHandlers,
  addShutdownCallback,
} from './helpers/signal-handlers';

// Global test setup
beforeAll(async () => {
  console.log('🚀 Setting up global test environment...');

  // Register comprehensive signal handlers for test environment
  registerTestSignalHandlers('global-test-setup');

  // Add custom cleanup callback for this test setup
  addShutdownCallback(async () => {
    console.log('🧹 Executing global test setup shutdown callback...');
    await cleanupTestConnections();
  });

  // Ensure we start with clean connections
  await cleanupTestConnections();

  console.log('✅ Global test setup complete');
});

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up global test environment...');

  try {
    // Check connection health before cleanup
    const health = await checkConnectionHealth();
    if (health.details.connections > 0) {
      console.log(
        `📊 Found ${health.details.connections} active connections: ${health.details.names.join(', ')}`,
      );
    }

    // Cleanup all test connections
    await cleanupTestConnections();

    // Verify cleanup was successful
    const postCleanupHealth = await checkConnectionHealth();
    if (postCleanupHealth.details.connections > 0) {
      console.warn(
        `⚠️  Warning: ${postCleanupHealth.details.connections} connections still active after cleanup`,
      );
    } else {
      console.log('✅ All connections properly closed');
    }
  } catch (error) {
    console.error('❌ Error during global test cleanup:', error);
  }

  console.log('✅ Global test cleanup complete');
});

// Signal handlers are now managed by the comprehensive signal handler utility
// imported from './helpers/signal-handlers.ts' and registered in beforeAll() above
