#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createTestDatabase, validateTestDatabaseConfig } from '../lib/db/test-config';

// Load test environment configuration
config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local',
});

async function seedTestDatabase() {
  console.log('🌱 Seeding test database with RoboRail data...\n');

  try {
    // Step 1: Validate configuration
    console.log('1️⃣ Validating test database configuration...');
    const dbConfig = validateTestDatabaseConfig();
    
    console.log(`   ✅ Using ${dbConfig.isTestBranch ? 'Neon test branch' : 'test database'}`);
    if (dbConfig.branchName) {
      console.log(`   🌿 Branch: ${dbConfig.branchName}`);
    }
    console.log();

    // Step 2: Connect to database
    console.log('2️⃣ Connecting to test database...');
    const testDb = await createTestDatabase();
    console.log('   ✅ Connected successfully');
    console.log();

    // Step 3: Check current data
    console.log('3️⃣ Checking existing data...');
    
    const currentCounts = await testDb.connection`
      SELECT 
        (SELECT COUNT(*) FROM "User") as users,
        (SELECT COUNT(*) FROM "Chat") as chats,
        (SELECT COUNT(*) FROM "Message_v2") as messages,
        (SELECT COUNT(*) FROM "DocumentChunk") as doc_chunks;
    `;
    
    console.log(`   📊 Current data counts:`);
    console.log(`      - Users: ${currentCounts[0].users}`);
    console.log(`      - Chats: ${currentCounts[0].chats}`);
    console.log(`      - Messages: ${currentCounts[0].messages}`);
    console.log(`      - Document chunks: ${currentCounts[0].doc_chunks}`);
    console.log();

    // Step 4: Seed database
    console.log('4️⃣ Seeding database with RoboRail sample data...');
    await testDb.seed();
    console.log('   ✅ Seeding completed');
    console.log();

    // Step 5: Verify seeding results
    console.log('5️⃣ Verifying seeded data...');
    
    const newCounts = await testDb.connection`
      SELECT 
        (SELECT COUNT(*) FROM "User") as users,
        (SELECT COUNT(*) FROM "Chat") as chats,
        (SELECT COUNT(*) FROM "Message_v2") as messages,
        (SELECT COUNT(*) FROM "DocumentChunk") as doc_chunks,
        (SELECT COUNT(*) FROM "DocumentProcessing") as doc_processing;
    `;
    
    console.log(`   📊 Updated data counts:`);
    console.log(`      - Users: ${newCounts[0].users}`);
    console.log(`      - Chats: ${newCounts[0].chats}`);
    console.log(`      - Messages: ${newCounts[0].messages}`);
    console.log(`      - Document chunks: ${newCounts[0].doc_chunks}`);
    console.log(`      - Document processing records: ${newCounts[0].doc_processing}`);
    console.log();

    // Step 6: Show sample data details
    console.log('6️⃣ Sample data overview...');
    
    const sampleUsers = await testDb.connection`
      SELECT email, id FROM "User" WHERE email LIKE '%@roborail.com' ORDER BY email;
    `;
    
    const sampleChats = await testDb.connection`
      SELECT title, visibility FROM "Chat" ORDER BY "createdAt";
    `;
    
    const sampleDocs = await testDb.connection`
      SELECT filename, status, "chunkCount" FROM "DocumentProcessing" ORDER BY filename;
    `;
    
    console.log('   👥 Sample users:');
    sampleUsers.forEach(user => {
      console.log(`      - ${user.email}`);
    });
    console.log();
    
    console.log('   💬 Sample chats:');
    sampleChats.forEach(chat => {
      console.log(`      - "${chat.title}" (${chat.visibility})`);
    });
    console.log();
    
    console.log('   📄 Sample documents:');
    sampleDocs.forEach(doc => {
      console.log(`      - ${doc.filename} (${doc.status}, ${doc.chunkCount} chunks)`);
    });
    console.log();

    // Step 7: Test RAG functionality
    console.log('7️⃣ Testing RAG system readiness...');
    
    try {
      const ragTestQuery = await testDb.connection`
        SELECT 
          dc.content,
          dc.filename,
          dc.metadata
        FROM "DocumentChunk" dc
        WHERE dc.content ILIKE '%roborail%' OR dc.content ILIKE '%safety%'
        LIMIT 2;
      `;
      
      console.log(`   ✅ Found ${ragTestQuery.length} searchable document chunks`);
      if (ragTestQuery.length > 0) {
        console.log('   📋 Sample chunk preview:');
        console.log(`      "${ragTestQuery[0].content.substring(0, 80)}..."`);
      }
    } catch (error) {
      console.log('   ⚠️  RAG test query failed:', error);
    }
    console.log();

    // Step 8: Cleanup connections
    console.log('8️⃣ Cleaning up connections...');
    await testDb.cleanup();
    console.log('   ✅ Connections closed');
    console.log();

    console.log('🎉 Test database seeding completed successfully!');
    console.log();
    console.log('📋 Your test database now contains:');
    console.log('   🏭 RoboRail operator accounts for testing');
    console.log('   💬 Sample conversations with startup/safety topics');
    console.log('   📄 Document chunks for RAG system testing');
    console.log('   🔧 Maintenance and safety procedure examples');
    console.log('   🤖 Ready-to-use test data for E2E scenarios');
    console.log();
    console.log('🚀 Ready for comprehensive testing!');

  } catch (error) {
    console.error('❌ Test database seeding failed:', error);
    
    if (error instanceof Error && (error.message?.includes('duplicate key') || error.message?.includes('already exists'))) {
      console.error('\n💡 Tip: If you see duplicate key errors, try resetting first:');
      console.error('   bun run db:test:reset');
    }
    
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedTestDatabase();
}

export { seedTestDatabase };