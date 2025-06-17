import type { FullConfig } from '@playwright/test';
import { cleanupGlobalTestDatabase } from '../lib/db/test-config';
import {
  cleanupAllConnections,
  forceCleanupAllConnections,
  checkConnectionHealth,
} from '../lib/db/cleanup';

// Global flag to prevent multiple signal handler executions
let isShuttingDown = false;
let signalHandlersRegistered = false;

/**
 * Graceful shutdown handler for Playwright global teardown
 */
async function gracefulPlaywrightTeardownShutdown(
  signal: string,
  initialExitCode = 0,
): Promise<void> {
  if (isShuttingDown) {
    console.log(`⚠️  Already shutting down, ignoring ${signal}`);
    return;
  }

  let exitCode = initialExitCode;
  isShuttingDown = true;
  console.log(
    `\n🛑 Playwright global-teardown received ${signal} - cleaning up...`,
  );

  try {
    await cleanupAllConnections();
    console.log('✅ Playwright global-teardown cleanup completed');
  } catch (error) {
    console.error('❌ Error during Playwright global-teardown cleanup:', error);
    try {
      await forceCleanupAllConnections();
    } catch (forceError) {
      console.error('❌ Force cleanup failed:', forceError);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

/**
 * Register signal handlers for Playwright global teardown
 */
function registerPlaywrightTeardownSignalHandlers(): void {
  if (signalHandlersRegistered) {
    return;
  }

  signalHandlersRegistered = true;
  console.log('🔧 Registering Playwright global-teardown signal handlers...');

  process.on('SIGTERM', () => gracefulPlaywrightTeardownShutdown('SIGTERM', 0));
  process.on('SIGINT', () => gracefulPlaywrightTeardownShutdown('SIGINT', 130));
  process.on('SIGQUIT', () =>
    gracefulPlaywrightTeardownShutdown('SIGQUIT', 131),
  );

  process.on('uncaughtException', async (error) => {
    console.error(
      '💥 Uncaught Exception in Playwright global-teardown:',
      error,
    );
    if (!isShuttingDown) {
      await gracefulPlaywrightTeardownShutdown('uncaughtException', 1);
    }
  });

  process.on('unhandledRejection', async (reason) => {
    console.error(
      '💥 Unhandled Rejection in Playwright global-teardown:',
      reason,
    );
    if (!isShuttingDown) {
      await gracefulPlaywrightTeardownShutdown('unhandledRejection', 1);
    }
  });

  console.log('✅ Playwright global-teardown signal handlers registered');
}

// Register signal handlers
registerPlaywrightTeardownSignalHandlers();

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright global teardown...');

  try {
    // Step 1: Check connection health before cleanup
    console.log('1️⃣ Checking connection health...');
    const preHealth = await checkConnectionHealth();
    if (preHealth.details.connections > 0) {
      console.log(
        `   📊 Found ${preHealth.details.connections} active connections: ${preHealth.details.names.join(', ')}`,
      );
    }

    // Step 2: Clean up global test database connections
    console.log('2️⃣ Cleaning up test database connections...');
    await cleanupGlobalTestDatabase();
    console.log('   ✅ Test database connections closed');

    // Step 3: Cleanup all remaining connections
    console.log('3️⃣ Cleaning up all remaining connections...');
    await cleanupAllConnections();
    console.log('   ✅ All connections cleanup completed');

    // Step 4: Verify cleanup success
    console.log('4️⃣ Verifying cleanup completion...');
    const postHealth = await checkConnectionHealth();
    if (postHealth.details.connections === 0) {
      console.log('   ✅ All connections successfully closed');
    } else {
      console.warn(
        `   ⚠️  ${postHealth.details.connections} connections still active: ${postHealth.details.names.join(', ')}`,
      );
    }

    // Step 5: Clean up any remaining test data if in CI or if specifically requested
    if (process.env.CI === 'true' || process.env.CLEANUP_TEST_DATA === 'true') {
      console.log('5️⃣ Cleaning up test data...');
      // Additional cleanup is handled by the database cleanup functions
      console.log('   ✅ Test data cleanup completed');
    }

    console.log('🎉 Global teardown completed successfully!');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);

    // Attempt force cleanup if standard cleanup fails
    try {
      console.log('🚨 Attempting force cleanup in teardown...');
      await forceCleanupAllConnections();
      console.log('✅ Force cleanup completed');
    } catch (forceError) {
      console.error('❌ Force cleanup in teardown failed:', forceError);
    }

    // Don't throw error in teardown as it might mask test failures
  }
}

export default globalTeardown;
