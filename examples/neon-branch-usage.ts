#!/usr/bin/env tsx
/**
 * Example usage of NeonDB CLI integration for automated test branch management
 * 
 * This script demonstrates how to:
 * 1. Create temporary test branches
 * 2. Use them for testing
 * 3. Clean up after tests
 */

import { config } from 'dotenv';
import { createTestDatabase } from '../lib/db/test-config';

// Load environment configuration
config({ path: '.env.local' });

async function demonstrateNeonBranchUsage() {
  console.log('🚀 NeonDB CLI Integration Usage Example\n');

  try {
    // Create test database setup
    const testDb = await createTestDatabase();
    
    console.log('✅ Test database setup complete');
    console.log(`📊 Configuration: ${testDb.config.isTestBranch ? 'Neon Test Branch' : 'Standard Database'}`);
    
    if (testDb.config.branchName) {
      console.log(`🌿 Current branch: ${testDb.config.branchName}`);
    }
    
    if (testDb.config.projectId) {
      console.log(`📁 Project ID: ${testDb.config.projectId}`);
    }

    // Demonstrate branch management features (if available)
    if (testDb.createTestBranch && testDb.cleanupTestBranches) {
      console.log('\n🔧 Branch management features are available!');
      
      // Example 1: List cleanup (dry run)
      console.log('\n📋 Checking for existing test branches...');
      const existingTestBranches = await testDb.cleanupTestBranches(true);
      console.log(`Found ${existingTestBranches.length} existing test branches:`, existingTestBranches);

      // Example 2: Create a temporary test branch
      console.log('\n🌿 Creating temporary test branch...');
      const tempBranch = await testDb.createTestBranch('example-usage');
      
      console.log(`✅ Created temporary branch: ${tempBranch.branch.name}`);
      console.log(`🔗 Connection: ${tempBranch.connectionString.substring(0, 50)}...`);
      
      // Example 3: Use the branch (simulate some work)
      console.log('\n⏳ Simulating test work on branch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Example 4: Clean up the temporary branch
      console.log('\n🧹 Cleaning up temporary branch...');
      await tempBranch.cleanup();
      console.log('✅ Temporary branch cleaned up');
      
    } else {
      console.log('\n❌ Branch management features not available');
      console.log('   Reasons could be:');
      console.log('   - NEON_API_KEY not configured');
      console.log('   - Not using a Neon database');
      console.log('   - API key validation failed');
      console.log('\n💡 To enable branch management:');
      console.log('   1. Set NEON_API_KEY in .env.local');
      console.log('   2. Use a Neon database URL');
      console.log('   3. Run: npm run test:neon-setup');
    }

    // Clean up main test database
    await testDb.cleanup();
    console.log('\n✅ Example completed successfully!');
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

// Example usage patterns
async function showUsagePatterns() {
  console.log('\n📚 Common Usage Patterns:\n');
  
  console.log('1. In test files:');
  console.log(`
import { createTestDatabase } from '../lib/db/test-config';

describe('My Test Suite', () => {
  let testDb;
  
  beforeAll(async () => {
    testDb = await createTestDatabase();
  });
  
  afterAll(async () => {
    await testDb.cleanup();
  });
  
  it('should create temporary branch for isolated testing', async () => {
    if (testDb.createTestBranch) {
      const tempBranch = await testDb.createTestBranch('isolated-test');
      
      // Run tests on temporary branch
      // ... test code here ...
      
      await tempBranch.cleanup();
    }
  });
});
`);

  console.log('2. In CI/CD pipelines:');
  console.log(`
# .github/workflows/test.yml
- name: Setup test environment
  run: npm run test:neon-setup

- name: Run tests with branch cleanup
  run: |
    npm run test:unit
    npm run db:test:clean
`);

  console.log('3. Manual cleanup:');
  console.log(`
# Clean up old test branches
npm run test:neon-setup -- --cleanup-branches

# Test basic setup
npm run test:neon-setup
`);
}

// Run the demonstration
if (require.main === module) {
  demonstrateNeonBranchUsage()
    .then(() => showUsagePatterns())
    .catch(console.error);
}