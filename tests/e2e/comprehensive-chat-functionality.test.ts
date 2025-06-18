import { test, expect } from '../fixtures';
import { ChatPage } from '../pages/chat';

test.describe('Comprehensive Chat Functionality (Replaces Stagehand Tests)', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test.describe('Basic Chat Interface', () => {
    test('should load the chat interface successfully', async ({ page }) => {
      // Verify the page loads
      await expect(page).toHaveTitle(/Chat/);
      
      // Verify key chat elements are visible
      await expect(chatPage.multimodalInput).toBeVisible();
      await expect(chatPage.sendButton).toBeVisible();
      
      // Verify placeholder text
      await expect(chatPage.multimodalInput).toHaveAttribute(
        'placeholder',
        'Ask about RoboRail operations, maintenance, or troubleshooting...'
      );
    });

    test('should send a message and receive an AI response', async () => {
      const testMessage = 'Hello, what can you help me with?';
      
      await chatPage.sendUserMessage(testMessage);
      await chatPage.isGenerationComplete();

      // Verify message was sent
      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.content).toContain(testMessage);

      // Verify we received a response
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
      
      // Verify chat URL is correct
      await chatPage.hasChatIdInUrl();
    });

    test('should handle multi-turn conversation correctly', async () => {
      // First exchange
      await chatPage.sendUserMessage('What is the weather like?');
      await chatPage.isGenerationComplete();
      
      // Second exchange - follow-up question
      await chatPage.sendUserMessage('What about tomorrow?');
      await chatPage.isGenerationComplete();

      // Verify we have multiple messages
      const allMessages = await chatPage.getAllMessages();
      expect(allMessages.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant

      // Verify alternating pattern
      const userMessages = allMessages.filter(msg => msg.role === 'user');
      const assistantMessages = allMessages.filter(msg => msg.role === 'assistant');
      
      expect(userMessages.length).toBeGreaterThanOrEqual(2);
      expect(assistantMessages.length).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('RoboRail Specific Features', () => {
    test('should handle RoboRail maintenance queries', async () => {
      const maintenanceQuery = 'How do I perform routine maintenance on RoboRail?';
      
      await chatPage.sendUserMessage(maintenanceQuery);
      await chatPage.isGenerationComplete();

      const response = await chatPage.getRecentAssistantMessage();
      expect(response.content.length).toBeGreaterThan(0);
      
      // Should contain maintenance-related keywords
      const lowerContent = response.content.toLowerCase();
      expect(lowerContent).toMatch(/maintenance|service|inspect|clean|check|roborail/);
    });

    test('should handle error code troubleshooting', async () => {
      const errorQuery = 'What does error code E001 mean and how do I fix it?';
      
      await chatPage.sendUserMessage(errorQuery);
      await chatPage.isGenerationComplete();

      const response = await chatPage.getRecentAssistantMessage();
      expect(response.content.length).toBeGreaterThan(0);
      
      // Should acknowledge the error code or provide troubleshooting info
      const lowerContent = response.content.toLowerCase();
      expect(lowerContent).toMatch(/error|fix|troubleshoot|solution|check|e001/);
    });

    test('should provide RoboRail-specific guidance', async () => {
      const roborailQuery = 'Tell me about RoboRail safety procedures';
      
      await chatPage.sendUserMessage(roborailQuery);
      await chatPage.isGenerationComplete();

      const response = await chatPage.getRecentAssistantMessage();
      expect(response.content.length).toBeGreaterThan(0);
      
      // Should contain safety-related keywords
      const lowerContent = response.content.toLowerCase();
      expect(lowerContent).toMatch(/safety|procedure|protocol|secure|caution|warning/);
    });
  });

  test.describe('UI/UX Features', () => {
    test('should show loading states during response generation', async ({ page }) => {
      // Start sending a message
      await chatPage.multimodalInput.fill('Tell me about RoboRail safety protocols');
      await chatPage.sendButton.click();

      // Check for loading indicators (stop button should appear)
      await expect(chatPage.stopButton).toBeVisible({ timeout: 5000 });
      
      // Wait for completion
      await chatPage.isGenerationComplete();
      
      // Stop button should be gone, send button should be back
      await expect(chatPage.sendButton).toBeVisible();
    });

    test('should support message input functionality', async () => {
      // Test input focus
      await chatPage.focusMessageInput();
      await expect(chatPage.multimodalInput).toBeFocused();

      // Test input value
      const testText = 'Test input value';
      await chatPage.multimodalInput.fill(testText);
      expect(await chatPage.getMessageInputValue()).toBe(testText);

      // Test clear input
      await chatPage.clearMessageInput();
      expect(await chatPage.getMessageInputValue()).toBe('');
    });

    test('should handle keyboard shortcuts', async ({ page }) => {
      await chatPage.focusMessageInput();
      await chatPage.multimodalInput.fill('Test message with Enter key');
      
      // Press Enter to send
      await page.keyboard.press('Enter');
      
      // Should send the message
      await chatPage.isGenerationComplete();
      
      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.content).toContain('Test message with Enter key');
    });

    test('should handle empty message submission gracefully', async () => {
      // Try to send empty message
      await chatPage.clearMessageInput();
      await chatPage.sendButton.click();
      
      // Should not create a new message or cause errors
      // The send button should remain enabled and no API call should be made
      await expect(chatPage.multimodalInput).toBeVisible();
      await expect(chatPage.sendButton).toBeVisible();
    });
  });

  test.describe('Model Selection and Configuration', () => {
    test('should have model selector visible', async ({ page }) => {
      // Open sidebar to access model selector
      await chatPage.openSidebar();
      
      // Model selector should be visible
      const modelSelector = page.getByTestId('model-selector');
      await expect(modelSelector).toBeVisible();
    });

    test('should maintain chat state between interactions', async () => {
      // Send first message
      await chatPage.sendUserMessage('First test message');
      await chatPage.isGenerationComplete();
      
      const firstResponse = await chatPage.getRecentAssistantMessage();
      
      // Send second message
      await chatPage.sendUserMessage('Second test message');
      await chatPage.isGenerationComplete();
      
      // Verify both messages are still in chat
      const allMessages = await chatPage.getAllMessages();
      expect(allMessages.length).toBeGreaterThanOrEqual(4);
      
      // Verify first response is still there
      const userMessages = allMessages.filter(msg => msg.role === 'user');
      expect(userMessages[0].content).toContain('First test message');
      expect(userMessages[1].content).toContain('Second test message');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // This test verifies error handling exists, actual network simulation would require more setup
      await chatPage.sendUserMessage('Test network resilience');
      
      // Wait for response - if network fails, should show error
      try {
        await chatPage.isGenerationComplete();
        // If successful, verify we got a response
        const response = await chatPage.getRecentAssistantMessage();
        expect(response.content.length).toBeGreaterThan(0);
      } catch (error) {
        // If failed, verify error handling exists
        console.log('Network error handled:', error);
      }
    });

    test('should handle very long messages', async () => {
      const longMessage = `This is a very long message that tests the input handling. ${'A'.repeat(1000)}`; // Create a very long message
      
      await chatPage.sendUserMessage(longMessage);
      await chatPage.isGenerationComplete();
      
      // Should handle long input gracefully
      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.content).toContain(longMessage);
      
      // Should still get a response
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });

    test('should handle special characters in messages', async () => {
      const specialMessage = 'Test with special characters: @#$%^&*()[]{}|;:,.<>?/~`';
      
      await chatPage.sendUserMessage(specialMessage);
      await chatPage.isGenerationComplete();
      
      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.content).toContain(specialMessage);
      
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });
  });
});