/**
 * Database cleanup utilities for tests and application shutdown
 *
 * This module provides centralized cleanup functions to ensure all database
 * connections are properly closed to prevent test hanging and resource leaks.
 */

// Only import server-only in actual server environments (not in tests)
// Skip server-only import entirely in test/Playwright environments
const isTestEnvironment =
  process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT === 'true';
const isClientSide = typeof window !== 'undefined';

if (!isTestEnvironment && !isClientSide) {
  try {
    require('server-only');
  } catch (error) {
    // Silently ignore server-only import errors in edge cases
  }
}

import { cleanupMemoryConnections } from '../mastra/memory';
import { cleanupQueryConnections } from './queries';
import {
  cleanupGlobalTestDatabase,
  forceCleanupGlobalTestDatabase,
} from './test-config';
import {
  cleanupAllDatabaseConnections,
  forceCleanupAllDatabaseConnections,
  DatabaseConnectionManager,
} from './connection-manager';

/**
 * Cleanup all database connections for graceful shutdown
 * This function should be called when the application is shutting down
 * or when tests need to clean up their connections
 */
export async function cleanupAllConnections(): Promise<void> {
  const cleanupPromises = [
    cleanupMemoryConnections(),
    cleanupQueryConnections(),
    cleanupGlobalTestDatabase(),
    cleanupAllDatabaseConnections(),
  ];

  try {
    await Promise.all(cleanupPromises);
    console.log('✅ All database connections cleaned up successfully');
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  }
}

/**
 * Force cleanup all database connections for emergency scenarios
 * This function should be used when graceful shutdown fails
 */
export async function forceCleanupAllConnections(): Promise<void> {
  const forceCleanupPromises = [
    forceCleanupGlobalTestDatabase(),
    forceCleanupAllDatabaseConnections(),
  ];

  try {
    await Promise.all(forceCleanupPromises);
    console.log('✅ All database connections force cleaned up');
  } catch (error) {
    console.error('❌ Error during force cleanup:', error);
    // Don't throw here since this is emergency cleanup
  }
}

/**
 * Test-specific cleanup function that ensures all test connections are closed
 * This should be called in test teardown (afterAll/afterEach)
 */
export async function cleanupTestConnections(): Promise<void> {
  try {
    // Clean up test-specific connections
    await cleanupGlobalTestDatabase();

    // Clean up any remaining connections via connection manager
    await cleanupAllDatabaseConnections();

    console.log('✅ Test database connections cleaned up');
  } catch (error) {
    console.error('❌ Error during test cleanup:', error);

    // Try force cleanup if graceful cleanup fails
    try {
      await forceCleanupAllConnections();
    } catch (forceError) {
      console.error('❌ Force cleanup also failed:', forceError);
    }
  }
}

// Global flag to prevent multiple signal handler executions
let applicationIsShuttingDown = false;
let applicationSignalHandlersRegistered = false;

/**
 * Setup graceful shutdown handlers for Node.js applications
 * This ensures database connections are properly closed when the process exits
 */
export function setupGracefulShutdown(): void {
  if (applicationSignalHandlersRegistered) {
    console.log('⚠️  Application signal handlers already registered');
    return;
  }

  applicationSignalHandlersRegistered = true;
  console.log('🔧 Setting up application graceful shutdown handlers...');

  const shutdown = async (signal: string, initialExitCode = 0) => {
    if (applicationIsShuttingDown) {
      console.log(`⚠️  Application already shutting down, ignoring ${signal}`);
      return;
    }

    let exitCode = initialExitCode;
    applicationIsShuttingDown = true;
    console.log(
      `🛑 Application received ${signal}, cleaning up database connections...`,
    );

    const shutdownStartTime = Date.now();

    try {
      await cleanupAllConnections();

      const shutdownTime = Date.now() - shutdownStartTime;
      console.log(
        `✅ Application graceful shutdown completed in ${shutdownTime}ms`,
      );
    } catch (error) {
      console.error('❌ Error during application graceful shutdown:', error);
      try {
        await forceCleanupAllConnections();
        console.log('✅ Application force cleanup completed');
      } catch (forceError) {
        console.error('❌ Application force cleanup failed:', forceError);
        exitCode = 1;
      }
    }

    console.log(`🏁 Application exiting with code ${exitCode}...`);
    process.exit(exitCode);
  };

  // Register signal handlers with appropriate exit codes
  process.on('SIGINT', () => shutdown('SIGINT', 130));
  process.on('SIGTERM', () => shutdown('SIGTERM', 0));
  process.on('SIGQUIT', () => shutdown('SIGQUIT', 131));

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', async (error) => {
    console.error('💥 Application Uncaught Exception:', error);
    console.error('Stack trace:', error.stack);

    if (!applicationIsShuttingDown) {
      applicationIsShuttingDown = true;
      try {
        await forceCleanupAllConnections();
      } catch (cleanupError) {
        console.error('❌ Emergency cleanup failed:', cleanupError);
      }
    }

    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error(
      '💥 Application Unhandled Rejection at:',
      promise,
      'reason:',
      reason,
    );

    if (!applicationIsShuttingDown) {
      applicationIsShuttingDown = true;
      try {
        await forceCleanupAllConnections();
      } catch (cleanupError) {
        console.error('❌ Emergency cleanup failed:', cleanupError);
      }
    }

    process.exit(1);
  });

  console.log('✅ Application graceful shutdown handlers registered');
}

/**
 * Utility function to check if all connections are properly closed
 * Useful for debugging connection leaks in tests
 */
export async function checkConnectionHealth(): Promise<{
  healthy: boolean;
  details: {
    connections: number;
    names: string[];
  };
}> {
  try {
    // Check if DatabaseConnectionManager is properly available
    if (
      !DatabaseConnectionManager ||
      typeof DatabaseConnectionManager.getConnectionStats !== 'function'
    ) {
      console.warn(
        'DatabaseConnectionManager not available, assuming no active connections',
      );
      return {
        healthy: true,
        details: {
          connections: 0,
          names: [],
        },
      };
    }

    const stats = DatabaseConnectionManager.getConnectionStats();
    const health = await DatabaseConnectionManager.healthCheck();

    return {
      healthy: health.unhealthy.length === 0,
      details: {
        connections: stats.activeConnections,
        names: stats.connectionNames,
      },
    };
  } catch (error) {
    console.error('Error checking connection health:', error);
    return {
      healthy: false,
      details: {
        connections: -1,
        names: [],
      },
    };
  }
}
