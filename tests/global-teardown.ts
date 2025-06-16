import type { FullConfig } from '@playwright/test';
import { cleanupGlobalTestDatabase } from '../lib/db/test-config';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright global teardown...');
  
  try {
    // Clean up global test database connections
    console.log('1️⃣ Cleaning up test database connections...');
    await cleanupGlobalTestDatabase();
    console.log('   ✅ Database connections closed');

    // Clean up any remaining test data if in CI or if specifically requested
    if (process.env.CI === 'true' || process.env.CLEANUP_TEST_DATA === 'true') {
      console.log('2️⃣ Cleaning up test data...');
      
      // This is already handled by cleanupGlobalTestDatabase
      // but we can add additional cleanup here if needed
      
      console.log('   ✅ Test data cleanup completed');
    }

    console.log('🎉 Global teardown completed successfully!');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown as it might mask test failures
  }
}

export default globalTeardown;