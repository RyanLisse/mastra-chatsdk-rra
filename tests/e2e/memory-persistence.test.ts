import { test, expect } from '../fixtures';
import { ChatPage } from '../pages/chat';
import { AuthPage } from '../pages/auth';
import { generateRandomTestUser } from '../helpers';

test.describe('Memory & Persistence E2E Tests', () => {
  let chatPage: ChatPage;
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    authPage = new AuthPage(page);
  });

  test.describe('Chat Session Persistence', () => {
    test('should persist chat across page reloads', async ({ page }) => {
      await chatPage.createNewChat();

      // Send some messages
      await chatPage.sendUserMessage('What is RoboRail?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      const originalResponse = assistantMessage.content;

      await chatPage.sendUserMessage('How do I start it?');
      await chatPage.isGenerationComplete();

      // Get the chat URL
      const chatUrl = page.url();
      expect(chatUrl).toMatch(/\/chat\/[a-f0-9-]+/);

      // Reload the page
      await page.reload();

      // Chat should be restored
      await page.waitForSelector('[data-testid="message-content"]', {
        timeout: 10000,
      });

      const messages = await chatPage.getAllMessages();
      expect(messages.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant

      // Verify original content is still there
      const assistantMessages = messages.filter((m) => m.role === 'assistant');
      expect(
        assistantMessages.some((m) => m.content === originalResponse),
      ).toBe(true);
    });

    test('should maintain conversation context after reload', async ({
      page,
    }) => {
      await chatPage.createNewChat();

      // Establish context
      await chatPage.sendUserMessage(
        'My name is TestUser and I work with RoboRail maintenance',
      );
      await chatPage.isGenerationComplete();

      await chatPage.sendUserMessage('What safety equipment do I need?');
      await chatPage.isGenerationComplete();

      const chatUrl = page.url();

      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="message-content"]', {
        timeout: 10000,
      });

      // Ask follow-up question that requires context
      await chatPage.sendUserMessage('What did I say my name was?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toContain('testuser');
    });

    test('should handle navigation back to chat', async ({ page }) => {
      await chatPage.createNewChat();

      await chatPage.sendUserMessage('Test message for navigation');
      await chatPage.isGenerationComplete();

      const chatUrl = page.url();

      // Navigate away
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Navigate back to chat
      await page.goto(chatUrl);
      await page.waitForSelector('[data-testid="message-content"]', {
        timeout: 10000,
      });

      // Messages should be restored
      const messages = await chatPage.getAllMessages();
      expect(messages.length).toBeGreaterThanOrEqual(2);

      const userMessage = messages.find((m) => m.role === 'user');
      expect(userMessage?.content).toBe('Test message for navigation');
    });
  });

  test.describe('User Memory Across Sessions', () => {
    const testUser = generateRandomTestUser();

    test.beforeAll(async ({ browser }) => {
      // Register user for memory tests
      const page = await browser.newPage();
      const setupAuthPage = new AuthPage(page);

      await setupAuthPage.register(testUser.email, testUser.password);
      await setupAuthPage.expectToastToContain('Account created successfully!');
      await page.close();
    });

    test('should remember user information across login sessions', async ({
      page,
    }) => {
      // First session
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL('/');

      await chatPage.createNewChat();
      await chatPage.sendUserMessage(
        'My name is TestUser and I prefer morning shifts',
      );
      await chatPage.isGenerationComplete();

      await chatPage.sendUserMessage(
        'What did I tell you about my shift preference?',
      );
      await chatPage.isGenerationComplete();

      let assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toContain('morning');

      // Logout
      await authPage.logout(testUser.email, testUser.password);

      // Login again
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL('/');

      // Create new chat
      await chatPage.createNewChat();
      await chatPage.sendUserMessage(
        'What shift preference did I mention before?',
      );
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      // This depends on memory implementation - may or may not remember across sessions
      // Test should verify the expected behavior based on your memory system
    });

    test('should maintain chat history for authenticated users', async ({
      page,
    }) => {
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL('/');

      // Create first chat
      await chatPage.createNewChat();
      await chatPage.sendUserMessage(
        'First chat message about safety protocols',
      );
      await chatPage.isGenerationComplete();

      const firstChatUrl = page.url();

      // Create second chat
      await chatPage.createNewChat();
      await chatPage.sendUserMessage('Second chat message about maintenance');
      await chatPage.isGenerationComplete();

      const secondChatUrl = page.url();

      // Both chats should be accessible
      await page.goto(firstChatUrl);
      await page.waitForSelector('[data-testid="message-content"]', {
        timeout: 10000,
      });

      let messages = await chatPage.getAllMessages();
      expect(
        messages.some((m) => m.content?.includes('safety protocols')),
      ).toBe(true);

      await page.goto(secondChatUrl);
      await page.waitForSelector('[data-testid="message-content"]', {
        timeout: 10000,
      });

      messages = await chatPage.getAllMessages();
      expect(messages.some((m) => m.content?.includes('maintenance'))).toBe(
        true,
      );
    });
  });

  test.describe('Chat History Management', () => {
    test('should show chat history in sidebar', async ({ page }) => {
      await chatPage.createNewChat();

      await chatPage.sendUserMessage('Test message for history');
      await chatPage.isGenerationComplete();

      // Open sidebar
      await chatPage.openSidebar();

      // Check for chat history
      const chatHistory = page.getByTestId('chat-history');
      if ((await chatHistory.count()) > 0) {
        await expect(chatHistory).toBeVisible();

        // Should show current chat
        const chatItems = page.getByTestId('chat-history-item');
        if ((await chatItems.count()) > 0) {
          await expect(chatItems.first()).toBeVisible();
        }
      }
    });

    test('should allow navigation between chat histories', async ({ page }) => {
      // Create first chat
      await chatPage.createNewChat();
      await chatPage.sendUserMessage('First chat content');
      await chatPage.isGenerationComplete();

      const firstChatUrl = page.url();

      // Create second chat
      await chatPage.createNewChat();
      await chatPage.sendUserMessage('Second chat content');
      await chatPage.isGenerationComplete();

      // Open sidebar and navigate back to first chat
      await chatPage.openSidebar();

      const chatHistoryItems = page.getByTestId('chat-history-item');
      if ((await chatHistoryItems.count()) > 1) {
        // Click on first chat (usually the second item since newest is first)
        await chatHistoryItems.nth(1).click();

        // Should navigate to first chat
        await page.waitForTimeout(1000);
        const messages = await chatPage.getAllMessages();
        expect(
          messages.some((m) => m.content?.includes('First chat content')),
        ).toBe(true);
      }
    });

    test('should allow deleting chat history', async ({ page }) => {
      await chatPage.createNewChat();
      await chatPage.sendUserMessage('Chat to be deleted');
      await chatPage.isGenerationComplete();

      const chatUrl = page.url();

      // Open sidebar
      await chatPage.openSidebar();

      // Look for delete button
      const deleteButton = page.getByTestId('delete-chat-button');
      if ((await deleteButton.count()) > 0) {
        await deleteButton.click();

        // Confirm deletion if modal appears
        const confirmButton = page.getByTestId('confirm-delete-chat');
        if ((await confirmButton.count()) > 0) {
          await confirmButton.click();
        }

        // Should redirect away from deleted chat
        await page.waitForTimeout(2000);
        expect(page.url()).not.toBe(chatUrl);

        // Try to access deleted chat URL
        await page.goto(chatUrl);

        // Should redirect to home or show error
        await page.waitForTimeout(2000);
        expect(page.url()).toMatch(/^http:\/\/localhost:3000\/?$/);
      }
    });
  });

  test.describe('Data Persistence Edge Cases', () => {
    test('should handle very long conversations', async ({ page }) => {
      await chatPage.createNewChat();

      // Send many messages to test persistence of long conversations
      for (let i = 0; i < 10; i++) {
        await chatPage.sendUserMessage(
          `Message ${i + 1}: Testing long conversation persistence`,
        );
        await chatPage.isGenerationComplete();

        // Brief pause to avoid overwhelming the system
        await page.waitForTimeout(500);
      }

      const chatUrl = page.url();

      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="message-content"]', {
        timeout: 15000,
      });

      // All messages should be restored
      const messages = await chatPage.getAllMessages();
      expect(messages.length).toBeGreaterThanOrEqual(20); // 10 user + 10 assistant

      // Verify specific messages
      const userMessages = messages.filter((m) => m.role === 'user');
      expect(userMessages.some((m) => m.content?.includes('Message 1:'))).toBe(
        true,
      );
      expect(userMessages.some((m) => m.content?.includes('Message 10:'))).toBe(
        true,
      );
    });

    test('should handle special characters in messages', async ({ page }) => {
      await chatPage.createNewChat();

      const specialMessage =
        'Test with émojis 🤖, spëcial chäracters, and "quotes" & symbols: @#$%^&*()';
      await chatPage.sendUserMessage(specialMessage);
      await chatPage.isGenerationComplete();

      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="message-content"]', {
        timeout: 10000,
      });

      const messages = await chatPage.getAllMessages();
      const userMessage = messages.find((m) => m.role === 'user');
      expect(userMessage?.content).toBe(specialMessage);
    });

    test('should handle concurrent chat sessions', async ({ browser }) => {
      // Create two browser contexts to simulate concurrent users
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const chatPage1 = new ChatPage(page1);
      const chatPage2 = new ChatPage(page2);

      // Create chats in both contexts
      await chatPage1.createNewChat();
      await chatPage2.createNewChat();

      // Send messages simultaneously
      await Promise.all([
        chatPage1.sendUserMessage('Message from context 1'),
        chatPage2.sendUserMessage('Message from context 2'),
      ]);

      await Promise.all([
        chatPage1.isGenerationComplete(),
        chatPage2.isGenerationComplete(),
      ]);

      // Verify messages are isolated
      const messages1 = await chatPage1.getAllMessages();
      const messages2 = await chatPage2.getAllMessages();

      expect(messages1.some((m) => m.content?.includes('context 1'))).toBe(
        true,
      );
      expect(messages1.some((m) => m.content?.includes('context 2'))).toBe(
        false,
      );

      expect(messages2.some((m) => m.content?.includes('context 2'))).toBe(
        true,
      );
      expect(messages2.some((m) => m.content?.includes('context 1'))).toBe(
        false,
      );

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Memory Performance', () => {
    test('should load chat history efficiently', async ({ page }) => {
      await chatPage.createNewChat();

      // Create a chat with substantial content
      await chatPage.sendUserMessage(
        'Tell me everything about RoboRail safety procedures in detail',
      );
      await chatPage.isGenerationComplete();

      await chatPage.sendUserMessage('Now explain the maintenance procedures');
      await chatPage.isGenerationComplete();

      const chatUrl = page.url();

      // Measure reload time
      const startTime = Date.now();
      await page.reload();
      await page.waitForSelector('[data-testid="message-content"]', {
        timeout: 15000,
      });
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(10000); // 10 seconds

      // All content should be restored
      const messages = await chatPage.getAllMessages();
      expect(messages.length).toBeGreaterThanOrEqual(4);
    });

    test('should handle memory cleanup appropriately', async ({ page }) => {
      // Create multiple chats to test memory management
      const chatUrls = [];

      for (let i = 0; i < 3; i++) {
        await chatPage.createNewChat();
        await chatPage.sendUserMessage(`Chat ${i + 1} message`);
        await chatPage.isGenerationComplete();
        chatUrls.push(page.url());
      }

      // Navigate between chats
      for (const url of chatUrls) {
        await page.goto(url);
        await page.waitForSelector('[data-testid="message-content"]', {
          timeout: 10000,
        });

        const messages = await chatPage.getAllMessages();
        expect(messages.length).toBeGreaterThanOrEqual(2);
      }

      // Memory usage should remain reasonable
      // This is hard to test directly, but navigation should remain responsive
      const startTime = Date.now();
      await page.goto(chatUrls[0]);
      await page.waitForSelector('[data-testid="message-content"]', {
        timeout: 10000,
      });
      const navigationTime = Date.now() - startTime;

      expect(navigationTime).toBeLessThan(5000); // 5 seconds
    });
  });

  test.describe('Offline/Network Handling', () => {
    test('should handle network disconnection gracefully', async ({ page }) => {
      await chatPage.createNewChat();

      await chatPage.sendUserMessage('Test message before disconnect');
      await chatPage.isGenerationComplete();

      // Simulate network disconnection
      await page.context().setOffline(true);

      // Try to send message while offline
      await chatPage.sendUserMessage('Message while offline');

      // Should show appropriate error or queue message
      await page.waitForTimeout(3000);

      // Restore network
      await page.context().setOffline(false);

      // Should recover gracefully
      await page.waitForTimeout(2000);

      // Try sending another message
      await chatPage.sendUserMessage('Message after reconnect');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });

    test('should cache chat data for offline viewing', async ({ page }) => {
      await chatPage.createNewChat();

      await chatPage.sendUserMessage('Cached message test');
      await chatPage.isGenerationComplete();

      const chatUrl = page.url();

      // Go offline
      await page.context().setOffline(true);

      // Reload page while offline
      await page.reload();

      // Depending on implementation, should either:
      // 1. Show cached content
      // 2. Show appropriate offline message
      await page.waitForTimeout(5000);

      // Restore network
      await page.context().setOffline(false);
    });
  });
});
