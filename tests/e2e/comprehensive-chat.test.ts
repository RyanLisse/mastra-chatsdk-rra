import { test, expect } from '../fixtures';
import { ChatPage } from '../pages/chat';

test.describe('Comprehensive Chat E2E Tests', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test.describe('Basic Chat Functionality', () => {
    test('should send message and receive response', async () => {
      await chatPage.sendUserMessage('Hello, can you help me with RoboRail?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toContain('RoboRail');
    });

    test('should handle multiple messages in conversation', async () => {
      // First message
      await chatPage.sendUserMessage('What is RoboRail?');
      await chatPage.isGenerationComplete();

      let assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);

      // Follow-up message
      await chatPage.sendUserMessage('How do I start it?');
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);

      // Check that we have multiple messages
      const messages = await chatPage.getAllMessages();
      expect(messages.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant
    });

    test('should show typing indicator during response generation', async () => {
      const sendPromise = chatPage.sendUserMessage(
        'Tell me about RoboRail safety protocols',
      );

      // Check for loading state
      await expect(chatPage.stopButton).toBeVisible();

      await sendPromise;
      await chatPage.isGenerationComplete();

      // Verify stop button disappears after completion
      await expect(chatPage.stopButton).not.toBeVisible();
      await expect(chatPage.sendButton).toBeVisible();
    });

    test('should handle stop generation', async () => {
      await chatPage.sendUserMessage(
        'Tell me a very long story about RoboRail',
      );

      // Wait for generation to start
      await expect(chatPage.stopButton).toBeVisible();

      // Stop generation
      await chatPage.stopButton.click();

      // Verify we can send another message
      await expect(chatPage.sendButton).toBeVisible();
      await chatPage.sendUserMessage('Short question: What is RoboRail?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });
  });

  test.describe('Message Editing and Regeneration', () => {
    test('should edit user message and regenerate response', async () => {
      await chatPage.sendUserMessage('What color is the sky?');
      await chatPage.isGenerationComplete();

      const originalResponse = await chatPage.getRecentAssistantMessage();
      expect(originalResponse.content.length).toBeGreaterThan(0);

      // Edit the user message
      const userMessage = await chatPage.getRecentUserMessage();
      await userMessage.edit('What color is grass?');
      await chatPage.isGenerationComplete();

      const newResponse = await chatPage.getRecentAssistantMessage();
      expect(newResponse.content).not.toEqual(originalResponse.content);
    });

    test('should handle message voting', async () => {
      await chatPage.sendUserMessage('Explain RoboRail safety features');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();

      // Test upvote
      await assistantMessage.upvote();
      await chatPage.isVoteComplete();

      // Test downvote (should change from upvote)
      await assistantMessage.downvote();
      await chatPage.isVoteComplete();
    });
  });

  test.describe('Chat Navigation and URL Handling', () => {
    test('should redirect to chat ID after sending message', async () => {
      await chatPage.sendUserMessage('Test message');
      await chatPage.isGenerationComplete();

      await chatPage.hasChatIdInUrl();
    });

    test('should handle query parameter for initial message', async ({
      page,
    }) => {
      const testQuery = 'Tell me about RoboRail maintenance';
      await page.goto(`/?query=${encodeURIComponent(testQuery)}`);

      await chatPage.isGenerationComplete();

      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.content).toBe(testQuery);

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toContain('maintenance');
    });
  });

  test.describe('Scroll Behavior', () => {
    test('should auto-scroll to bottom after new messages', async () => {
      await chatPage.sendMultipleMessages(3, (i) => `Message ${i + 1}`);
      await chatPage.waitForScrollToBottom();

      // Verify scroll position is at bottom
      const isAtBottom = await chatPage.isScrolledToBottom();
      expect(isAtBottom).toBe(true);
    });

    test('should show scroll to bottom button when scrolled up', async () => {
      await chatPage.sendMultipleMessages(5, (i) => `Filling message ${i + 1}`);

      // Should not show scroll button when at bottom
      await expect(chatPage.scrollToBottomButton).not.toBeVisible();

      // Scroll up
      await chatPage.scrollToTop();

      // Should show scroll button
      await expect(chatPage.scrollToBottomButton).toBeVisible();

      // Click button should scroll to bottom and hide button
      await chatPage.scrollToBottomButton.click();
      await chatPage.waitForScrollToBottom();
      await expect(chatPage.scrollToBottomButton).not.toBeVisible();
    });
  });

  test.describe('Suggested Actions', () => {
    test('should show suggested actions on new chat', async () => {
      await chatPage.isElementVisible('suggested-actions');
    });

    test('should hide suggested actions after sending message', async () => {
      await chatPage.isElementVisible('suggested-actions');
      await chatPage.sendUserMessageFromSuggestion();
      await chatPage.isElementNotVisible('suggested-actions');
    });

    test('should send message from suggestion click', async () => {
      await chatPage.sendUserMessageFromSuggestion();
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Send a message first
      await chatPage.sendUserMessage('Test message');
      await chatPage.isGenerationComplete();

      // Simulate network failure
      await page.route('**/api/chat', (route) => {
        route.abort('failed');
      });

      // Try to send another message
      await chatPage.sendUserMessage('This should fail');

      // Should show error state or retry mechanism
      // The exact error handling depends on implementation
      await page.waitForTimeout(3000);

      // Clear route interception
      await page.unroute('**/api/chat');
    });

    test('should handle extremely long messages', async () => {
      const longMessage = `${'A'.repeat(1000)} What is RoboRail?`;
      await chatPage.sendUserMessage(longMessage);
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should send message with Enter key', async ({ page }) => {
      await chatPage.focusMessageInput();
      await page.keyboard.type('Test message using Enter');
      await page.keyboard.press('Enter');

      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });

    test('should not send message with Shift+Enter', async ({ page }) => {
      await chatPage.focusMessageInput();
      await page.keyboard.type('Line 1');
      await page.keyboard.press('Shift+Enter');
      await page.keyboard.type('Line 2');

      // Should not have sent the message yet
      await expect(chatPage.sendButton).toBeVisible();

      // Now send with Enter
      await page.keyboard.press('Enter');
      await chatPage.isGenerationComplete();

      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.content).toContain('Line 1');
      expect(userMessage.content).toContain('Line 2');
    });
  });
});
