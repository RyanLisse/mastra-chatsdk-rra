import { test, expect } from '@playwright/test';
import { getTestDatabase, resetBetweenTests } from '../helpers/database';

test.describe('Database Integration Tests', () => {
  let testDatabase: any;

  test.beforeAll(async () => {
    testDatabase = await getTestDatabase();
  });

  test.beforeEach(async () => {
    // Reset database to clean state for each test
    await resetBetweenTests();
  });

  test('should create and retrieve test user data', async () => {
    // Create a test user
    const testUser = await testDatabase.createTestUser({
      email: 'integration-test@roborail.com',
    });

    expect(testUser).toBeTruthy();
    expect(testUser.email).toBe('integration-test@roborail.com');

    // Verify user exists in database
    const users = await testDatabase.getConnection()`
      SELECT * FROM "User" WHERE email = 'integration-test@roborail.com';
    `;

    expect(users).toHaveLength(1);
    expect(users[0].id).toBe(testUser.id);
  });

  test('should create chat with messages', async () => {
    // Create test user
    const testUser = await testDatabase.createTestUser();

    // Create test chat
    const testChat = await testDatabase.createTestChat(testUser.id, {
      title: 'RoboRail Integration Test Chat',
    });

    expect(testChat).toBeTruthy();
    expect(testChat.title).toBe('RoboRail Integration Test Chat');
    expect(testChat.userId).toBe(testUser.id);

    // Create test messages
    const userMessage = await testDatabase.createTestMessage(testChat.id, {
      role: 'user',
      parts: [{ type: 'text', text: 'How do I start the RoboRail machine?' }],
    });

    const assistantMessage = await testDatabase.createTestMessage(testChat.id, {
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'To start the RoboRail machine, first ensure the area is clear...',
        },
      ],
    });

    expect(userMessage.chatId).toBe(testChat.id);
    expect(assistantMessage.chatId).toBe(testChat.id);

    // Verify chat conversation flow
    const messages = await testDatabase.getConnection()`
      SELECT * FROM "Message_v2" 
      WHERE "chatId" = ${testChat.id} 
      ORDER BY "createdAt";
    `;

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
  });

  test('should handle document chunks for RAG testing', async () => {
    // Create test document chunks
    const chunks = await testDatabase.createTestDocumentChunks(3);

    expect(chunks).toHaveLength(3);
    expect(chunks[0].content).toContain('RoboRail');

    // Test searching document chunks
    const searchResults = await testDatabase.getConnection()`
      SELECT * FROM "DocumentChunk" 
      WHERE content ILIKE '%roborail%' OR content ILIKE '%safety%'
      ORDER BY "chunkIndex";
    `;

    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].filename).toContain('test-document');
  });

  test('should maintain data isolation between tests', async () => {
    // This test verifies that data from previous tests doesn't interfere
    const stats = await testDatabase.getTestStats();

    // Should only contain sample data, not data from previous tests
    expect(stats.users).toBeGreaterThan(0); // Sample users exist
    expect(stats.chats).toBeGreaterThan(0); // Sample chats exist
    expect(stats.messages).toBeGreaterThan(0); // Sample messages exist

    // But no test-specific data should remain
    const testUsers = await testDatabase.getConnection()`
      SELECT * FROM "User" WHERE email LIKE '%integration-test%';
    `;

    expect(testUsers).toHaveLength(0); // Previous test data should be cleaned
  });

  test('should support complex database operations', async () => {
    // Test transaction-like operations
    const testUser = await testDatabase.createTestUser();
    const testChat = await testDatabase.createTestChat(testUser.id);

    // Create multiple messages in sequence
    const messages = [];
    for (let i = 0; i < 3; i++) {
      const message = await testDatabase.createTestMessage(testChat.id, {
        role: i % 2 === 0 ? 'user' : 'assistant',
        parts: [{ type: 'text', text: `Message ${i + 1}` }],
      });
      messages.push(message);
    }

    // Verify all operations succeeded
    const chatMessages = await testDatabase.getConnection()`
      SELECT * FROM "Message_v2" 
      WHERE "chatId" = ${testChat.id} 
      ORDER BY "createdAt";
    `;

    expect(chatMessages).toHaveLength(3);
    expect(chatMessages[0].role).toBe('user');
    expect(chatMessages[1].role).toBe('assistant');
    expect(chatMessages[2].role).toBe('user');
  });

  test('should handle concurrent database operations', async () => {
    // Test concurrent user creation
    const userPromises = Array.from({ length: 5 }, (_, i) =>
      testDatabase.createTestUser({
        email: `concurrent-user-${i}@test.com`,
      }),
    );

    const users = await Promise.all(userPromises);

    expect(users).toHaveLength(5);

    // Verify all users have unique IDs
    const userIds = users.map((u) => u.id);
    const uniqueIds = new Set(userIds);
    expect(uniqueIds.size).toBe(5);

    // Verify all users are in database
    const dbUsers = await testDatabase.getConnection()`
      SELECT * FROM "User" WHERE email LIKE 'concurrent-user-%@test.com';
    `;

    expect(dbUsers).toHaveLength(5);
  });

  test('should validate database performance', async () => {
    const startTime = Date.now();

    // Perform a series of database operations
    const user = await testDatabase.createTestUser();
    const chat = await testDatabase.createTestChat(user.id);
    await testDatabase.createTestMessage(chat.id);

    // Query operations
    await testDatabase.getTestStats();

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Basic performance check - operations should complete within reasonable time
    expect(duration).toBeLessThan(5000); // 5 seconds should be more than enough

    console.log(`Database operations completed in ${duration}ms`);
  });
});

test.describe('Database Error Handling', () => {
  let testDatabase: any;

  test.beforeAll(async () => {
    testDatabase = await getTestDatabase();
  });

  test('should handle invalid data gracefully', async () => {
    // Test invalid user creation
    await expect(async () => {
      await testDatabase.getConnection()`
        INSERT INTO "User" (id, email, password) 
        VALUES ('invalid-id', null, 'password');
      `;
    }).rejects.toThrow();
  });

  test('should handle foreign key constraints', async () => {
    // Test creating chat with non-existent user
    await expect(async () => {
      await testDatabase.getConnection()`
        INSERT INTO "Chat" (id, "createdAt", title, "userId") 
        VALUES ('test-chat', NOW(), 'Test', 'non-existent-user');
      `;
    }).rejects.toThrow();
  });

  test('should handle concurrent access safely', async () => {
    // Create base data
    const user = await testDatabase.createTestUser();

    // Attempt concurrent modifications
    const updatePromises = Array.from(
      { length: 3 },
      (_, i) =>
        testDatabase.getConnection()`
        UPDATE "User" 
        SET email = ${`updated-${i}@test.com`} 
        WHERE id = ${user.id};
      `,
    );

    // Only one should succeed (last one wins)
    await Promise.all(updatePromises);

    const updatedUser = await testDatabase.getConnection()`
      SELECT * FROM "User" WHERE id = ${user.id};
    `;

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].email).toMatch(/updated-\d@test\.com/);
  });
});
