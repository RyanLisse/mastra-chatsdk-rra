#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createTestDatabase, validateTestDatabaseConfig } from '../lib/db/test-config';

// Load test environment configuration
config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local',
});

async function resetTestDatabase() {
  console.log('🔄 Resetting test database...\n');

  try {
    // Step 1: Validate configuration
    console.log('1️⃣ Validating test database configuration...');
    const dbConfig = validateTestDatabaseConfig();
    
    console.log(`   ✅ Using ${dbConfig.isTestBranch ? 'Neon test branch' : 'test database'}`);
    if (dbConfig.branchName) {
      console.log(`   🌿 Branch: ${dbConfig.branchName}`);
    }
    console.log();

    // Step 2: Connect and reset
    console.log('2️⃣ Connecting to test database...');
    const testDb = await createTestDatabase();
    console.log('   ✅ Connected successfully');
    console.log();

    // Step 3: Count existing data
    console.log('3️⃣ Checking existing test data...');
    
    const counts = await testDb.connection`
      SELECT 
        (SELECT COUNT(*) FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%') as test_users,
        (SELECT COUNT(*) FROM "Chat") as chats,
        (SELECT COUNT(*) FROM "Message_v2") as messages,
        (SELECT COUNT(*) FROM chat_sessions WHERE session_id LIKE '%test%') as sessions;
    `;
    
    console.log(`   📊 Current data counts:`);
    console.log(`      - Test users: ${counts[0].test_users}`);
    console.log(`      - Chats: ${counts[0].chats}`);
    console.log(`      - Messages: ${counts[0].messages}`);
    console.log(`      - Test sessions: ${counts[0].sessions}`);
    console.log();

    // Step 4: Reset database
    console.log('4️⃣ Resetting database (removing test data)...');
    await testDb.reset();
    console.log('   ✅ Test data cleared');
    console.log();

    // Step 5: Re-seed with fresh data
    console.log('5️⃣ Re-seeding with fresh test data...');
    await testDb.seed();
    console.log('   ✅ Fresh test data seeded');
    console.log();

    // Step 6: Verify reset
    console.log('6️⃣ Verifying reset results...');
    
    const newCounts = await testDb.connection`
      SELECT 
        (SELECT COUNT(*) FROM "User" WHERE email LIKE '%@roborail.com') as sample_users,
        (SELECT COUNT(*) FROM "Chat") as chats,
        (SELECT COUNT(*) FROM "Message_v2") as messages,
        (SELECT COUNT(*) FROM "DocumentChunk") as doc_chunks;
    `;
    
    console.log(`   📊 Fresh data counts:`);
    console.log(`      - Sample users: ${newCounts[0].sample_users}`);
    console.log(`      - Sample chats: ${newCounts[0].chats}`);
    console.log(`      - Sample messages: ${newCounts[0].messages}`);
    console.log(`      - Document chunks: ${newCounts[0].doc_chunks}`);
    console.log();

    // Step 7: Cleanup
    console.log('7️⃣ Cleaning up connections...');
    await testDb.cleanup();
    console.log('   ✅ Connections closed');
    console.log();

    console.log('🎉 Test database reset completed successfully!');
    console.log();
    console.log('✅ Your test database is now clean and ready for testing.');
    console.log('📋 Fresh sample data has been loaded including:');
    console.log('   - RoboRail operator accounts');
    console.log('   - Sample chat conversations');
    console.log('   - Document chunks for RAG testing');
    console.log('   - Safety and maintenance procedures');

  } catch (error) {
    console.error('❌ Test database reset failed:', error);
    
    if (error instanceof Error && error.message?.includes('connect')) {
      console.error('\n🔧 Troubleshooting connection issues:');
      console.error('   1. Verify your .env.test file has the correct POSTGRES_URL');
      console.error('   2. Ensure your Neon test branch is active');
      console.error('   3. Check your database credentials and network access');
    }
    
    process.exit(1);
  }
}

// Run reset if called directly
if (require.main === module) {
  resetTestDatabase();
}

export { resetTestDatabase };