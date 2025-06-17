/**
 * Comprehensive signal handler utilities for test processes
 * 
 * This module provides utilities for setting up robust signal handlers
 * across different test environments (unit tests, E2E tests, etc.)
 */

import { 
  cleanupAllConnections, 
  forceCleanupAllConnections,
  checkConnectionHealth
} from '../../lib/db/cleanup';

// Global state management
let isShuttingDown = false;
let signalHandlersRegistered = false;
let shutdownCallbacks: Array<() => Promise<void> | void> = [];

/**
 * Add a callback to be executed during graceful shutdown
 * Useful for test-specific cleanup tasks
 */
export function addShutdownCallback(callback: () => Promise<void> | void): void {
  shutdownCallbacks.push(callback);
}

/**
 * Remove a shutdown callback
 */
export function removeShutdownCallback(callback: () => Promise<void> | void): void {
  const index = shutdownCallbacks.indexOf(callback);
  if (index > -1) {
    shutdownCallbacks.splice(index, 1);
  }
}

/**
 * Clear all shutdown callbacks
 */
export function clearShutdownCallbacks(): void {
  shutdownCallbacks = [];
}

/**
 * Execute all registered shutdown callbacks
 */
async function executeShutdownCallbacks(): Promise<void> {
  if (shutdownCallbacks.length === 0) {
    return;
  }

  console.log(`🔄 Executing ${shutdownCallbacks.length} shutdown callbacks...`);
  
  const results = await Promise.allSettled(
    shutdownCallbacks.map(async (callback, index) => {
      try {
        await callback();
        console.log(`   ✅ Shutdown callback ${index + 1} completed`);
      } catch (error) {
        console.error(`   ❌ Shutdown callback ${index + 1} failed:`, error);
        throw error;
      }
    })
  );

  const failed = results.filter(result => result.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`⚠️  ${failed.length} shutdown callbacks failed`);
  } else {
    console.log('✅ All shutdown callbacks completed successfully');
  }
}

/**
 * Enhanced graceful shutdown handler with comprehensive cleanup
 */
export async function gracefulShutdown(
  signal: string, 
  exitCode = 0,
  context = 'test'
): Promise<void> {
  if (isShuttingDown) {
    console.log(`⚠️  Already shutting down, ignoring ${signal} in ${context}`);
    return;
  }

  isShuttingDown = true;
  const shutdownStartTime = Date.now();
  const maxShutdownTime = 15000; // 15 seconds max shutdown time

  console.log(`\n🛑 ${context} received ${signal} - initiating graceful shutdown...`);

  try {
    // Step 1: Execute custom shutdown callbacks first
    if (shutdownCallbacks.length > 0) {
      console.log('1️⃣ Executing custom shutdown callbacks...');
      await executeShutdownCallbacks();
    }

    // Step 2: Check current connection health
    console.log('2️⃣ Checking connection health before cleanup...');
    const preHealth = await checkConnectionHealth();
    if (preHealth.details.connections > 0) {
      console.log(`   📊 Found ${preHealth.details.connections} active connections: ${preHealth.details.names.join(', ')}`);
    } else {
      console.log('   📊 No active connections found');
    }

    // Step 3: Attempt graceful cleanup
    console.log('3️⃣ Performing graceful database cleanup...');
    await cleanupAllConnections();

    // Step 4: Verify cleanup success
    console.log('4️⃣ Verifying cleanup completion...');
    const postHealth = await checkConnectionHealth();
    if (postHealth.details.connections === 0) {
      console.log('   ✅ All connections successfully closed');
    } else {
      console.warn(`   ⚠️  ${postHealth.details.connections} connections still active: ${postHealth.details.names.join(', ')}`);
      
      // Attempt force cleanup if connections remain
      console.log('5️⃣ Attempting force cleanup for remaining connections...');
      await forceCleanupAllConnections();
      
      // Final verification
      const finalHealth = await checkConnectionHealth();
      if (finalHealth.details.connections === 0) {
        console.log('   ✅ Force cleanup successful - all connections closed');
      } else {
        console.error(`   ❌ ${finalHealth.details.connections} connections still active after force cleanup`);
        exitCode = 1;
      }
    }

    const shutdownTime = Date.now() - shutdownStartTime;
    console.log(`🎉 ${context} graceful shutdown completed in ${shutdownTime}ms`);

  } catch (error) {
    console.error(`❌ Error during ${context} graceful shutdown:`, error);
    
    // Attempt emergency force cleanup
    try {
      console.log('🚨 Attempting emergency force cleanup...');
      await forceCleanupAllConnections();
      console.log('✅ Emergency force cleanup completed');
    } catch (forceError) {
      console.error('❌ Emergency force cleanup failed:', forceError);
      exitCode = 1;
    }
  }

  // Ensure we don't exceed maximum shutdown time
  const totalShutdownTime = Date.now() - shutdownStartTime;
  if (totalShutdownTime > maxShutdownTime) {
    console.warn(`⚠️  ${context} shutdown took ${totalShutdownTime}ms (exceeded ${maxShutdownTime}ms limit)`);
  }

  console.log(`🏁 ${context} process exiting with code ${exitCode}...`);
  process.exit(exitCode);
}

/**
 * Register comprehensive signal handlers for test processes
 */
export function registerTestSignalHandlers(context = 'test'): void {
  if (signalHandlersRegistered) {
    console.log(`⚠️  Signal handlers already registered for ${context}`);
    return;
  }

  signalHandlersRegistered = true;
  console.log(`🔧 Registering comprehensive signal handlers for ${context}...`);

  // Handle termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0, context));
  process.on('SIGINT', () => gracefulShutdown('SIGINT', 130, context)); // Standard SIGINT exit code
  process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT', 131, context)); // Standard SIGQUIT exit code

  // Handle normal process exit
  process.on('exit', (code) => {
    if (!isShuttingDown) {
      console.log(`🏁 ${context} process exiting with code ${code}...`);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error(`💥 Uncaught Exception in ${context}:`, error);
    console.error('Stack trace:', error.stack);
    
    if (!isShuttingDown) {
      await gracefulShutdown('uncaughtException', 1, context);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error(`💥 Unhandled Rejection in ${context}:`, reason);
    console.error('Promise:', promise);
    
    if (!isShuttingDown) {
      await gracefulShutdown('unhandledRejection', 1, context);
    }
  });

  // Handle warning events (useful for debugging)
  process.on('warning', (warning) => {
    console.warn(`⚠️  ${context} process warning:`, warning.name, warning.message);
    if (warning.stack) {
      console.warn('Warning stack:', warning.stack);
    }
  });

  console.log(`✅ Comprehensive signal handlers registered for ${context}`);
}

/**
 * Check if signal handlers are registered
 */
export function areSignalHandlersRegistered(): boolean {
  return signalHandlersRegistered;
}

/**
 * Check if the process is currently shutting down
 */
export function isProcessShuttingDown(): boolean {
  return isShuttingDown;
}

/**
 * Reset shutdown state (useful for testing)
 * WARNING: Only use this in test scenarios
 */
export function resetShutdownState(): void {
  if (process.env.NODE_ENV !== 'test' && process.env.PLAYWRIGHT !== 'true') {
    console.warn('⚠️  resetShutdownState() should only be used in test environments');
    return;
  }
  
  isShuttingDown = false;
  signalHandlersRegistered = false;
  shutdownCallbacks = [];
}