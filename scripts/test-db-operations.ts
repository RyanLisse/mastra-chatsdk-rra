#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createTestDatabase } from '../lib/db/test-config';
import { generateUUID } from '../lib/utils';

// Load test environment
config({ path: '.env.test' });

async function testDatabaseOperations() {
  console.log('🧪 Testing database operations...\n');

  try {
    const testDb = await createTestDatabase();
    const { db, connection } = testDb;

    // Test 1: Create a test user
    console.log('1️⃣ Creating test user...');
    const testUserId = '550e8400-e29b-41d4-a716-446655440001';
    
    // Check if user exists
    const existingUser = await connection`
      SELECT * FROM "User" WHERE id = ${testUserId}
    `;
    
    if (existingUser.length > 0) {
      console.log('   ✅ Test user already exists');
    } else {
      await connection`
        INSERT INTO "User" (id, email, password) 
        VALUES (${testUserId}, 'test-operator@roborail.com', 'test-hash')
      `;
      console.log('   ✅ Test user created');
    }

    // Test 2: Create a test chat
    console.log('\n2️⃣ Creating test chat...');
    const chatId = generateUUID();
    
    try {
      await connection`
        INSERT INTO "Chat" (id, "createdAt", title, "userId", visibility)
        VALUES (${chatId}, NOW(), 'Test Chat', ${testUserId}, 'private')
      `;
      console.log(`   ✅ Chat created with ID: ${chatId}`);
    } catch (error) {
      console.error('   ❌ Failed to create chat:', error);
      throw error;
    }

    // Test 3: Create a test message
    console.log('\n3️⃣ Creating test message...');
    const messageId = generateUUID();
    
    try {
      await connection`
        INSERT INTO "Message_v2" (id, "chatId", role, parts, attachments, "createdAt")
        VALUES (
          ${messageId},
          ${chatId},
          'user',
          '[{"type": "text", "text": "Test message"}]'::jsonb,
          '[]'::jsonb,
          NOW()
        )
      `;
      console.log(`   ✅ Message created with ID: ${messageId}`);
    } catch (error) {
      console.error('   ❌ Failed to create message:', error);
      throw error;
    }

    // Test 4: Query the data
    console.log('\n4️⃣ Querying test data...');
    const chats = await connection`
      SELECT c.*, u.email 
      FROM "Chat" c
      JOIN "User" u ON c."userId" = u.id
      WHERE c.id = ${chatId}
    `;
    
    console.log(`   ✅ Found ${chats.length} chat(s)`);
    if (chats.length > 0) {
      console.log(`      - Chat: ${chats[0].title} by ${chats[0].email}`);
    }

    // Test 5: Clean up test data
    console.log('\n5️⃣ Cleaning up test data...');
    await connection`DELETE FROM "Message_v2" WHERE id = ${messageId}`;
    await connection`DELETE FROM "Chat" WHERE id = ${chatId}`;
    console.log('   ✅ Test data cleaned up');

    // Close connection
    await testDb.cleanup();
    console.log('\n✅ All database operations completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database operation test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabaseOperations();