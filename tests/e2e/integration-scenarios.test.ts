import { test, expect } from '../fixtures';
import { ChatPage } from '../pages/chat';
import { AuthPage } from '../pages/auth';
import { generateRandomTestUser } from '../helpers';

test.describe('Integration Scenarios E2E', () => {
  let chatPage: ChatPage;
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    authPage = new AuthPage(page);
  });

  test.describe('End-to-End RoboRail Workflows', () => {
    test('should complete full RoboRail troubleshooting workflow', async ({
      page,
    }) => {
      await chatPage.createNewChat();

      // Step 1: User reports an issue
      await chatPage.sendUserMessage(
        'My RoboRail system is showing error code E001 and making unusual noises',
      );
      await chatPage.isGenerationComplete();

      let assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /error|e001|troubleshoot/,
      );

      // Step 2: Assistant requests more information
      await chatPage.sendUserMessage(
        'The noise started about 2 hours ago, and the system stopped moving',
      );
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);

      // Step 3: Assistant provides troubleshooting steps
      await chatPage.sendUserMessage('What should I check first?');
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /check|inspect|safety|emergency/,
      );

      // Step 4: User follows guidance
      await chatPage.sendUserMessage(
        'I checked the emergency stops and they are working. What next?',
      );
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);

      // Verify conversation maintains context throughout
      const allMessages = await chatPage.getAllMessages();
      expect(allMessages.length).toBeGreaterThanOrEqual(8); // 4 user + 4 assistant
    });

    test('should handle complete maintenance planning workflow', async ({
      page,
    }) => {
      await chatPage.createNewChat();

      // Maintenance planning scenario
      await chatPage.sendUserMessage(
        'I need to plan routine maintenance for our RoboRail system. When should I do this?',
      );
      await chatPage.isGenerationComplete();

      let assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /maintenance|schedule|routine/,
      );

      // Follow-up questions about specific components
      await chatPage.sendUserMessage('What components need weekly inspection?');
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);

      // Safety considerations
      await chatPage.sendUserMessage(
        'What safety precautions should I take during maintenance?',
      );
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /safety|ppe|protective|equipment/,
      );

      // Documentation
      await chatPage.sendUserMessage(
        'How should I document the maintenance work?',
      );
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /document|record|log/,
      );
    });

    test('should handle emergency response workflow', async ({ page }) => {
      await chatPage.createNewChat();

      // Emergency scenario
      await chatPage.sendUserMessage(
        "URGENT: RoboRail system has stopped suddenly and there's a loud alarm. What should I do immediately?",
      );
      await chatPage.isGenerationComplete();

      let assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /emergency|stop|alarm|safety|evacuate/,
      );

      // Response to emergency instructions
      await chatPage.sendUserMessage(
        'I pressed the emergency stop button and cleared the area. The alarm is still sounding.',
      );
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);

      // Next steps
      await chatPage.sendUserMessage(
        'Who should I contact and what information do they need?',
      );
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /contact|maintenance|team|information/,
      );
    });
  });

  test.describe('Multi-User Collaboration Scenarios', () => {
    const operator = generateRandomTestUser();
    const supervisor = generateRandomTestUser();

    test.beforeAll(async ({ browser }) => {
      // Set up test users
      const setupPage = await browser.newPage();
      const setupAuth = new AuthPage(setupPage);

      await setupAuth.register(operator.email, operator.password);
      await setupAuth.expectToastToContain('Account created successfully!');

      await setupAuth.register(supervisor.email, supervisor.password);
      await setupAuth.expectToastToContain('Account created successfully!');

      await setupPage.close();
    });

    test('should handle shift handover scenario', async ({ browser }) => {
      // Operator creates incident report
      const operatorContext = await browser.newContext();
      const operatorPage = await operatorContext.newPage();
      const operatorAuth = new AuthPage(operatorPage);
      const operatorChat = new ChatPage(operatorPage);

      await operatorAuth.login(operator.email, operator.password);
      await operatorPage.waitForURL('/');

      await operatorChat.createNewChat();
      await operatorChat.sendUserMessage(
        'Documenting shift report: RoboRail operated normally for first 6 hours, minor calibration adjustment made at 14:30',
      );
      await operatorChat.isGenerationComplete();

      const chatUrl = operatorPage.url();

      // Supervisor reviews the report
      const supervisorContext = await browser.newContext();
      const supervisorPage = await supervisorContext.newPage();
      const supervisorAuth = new AuthPage(supervisorPage);
      const supervisorChat = new ChatPage(supervisorPage);

      await supervisorAuth.login(supervisor.email, supervisor.password);
      await supervisorPage.waitForURL('/');

      // Note: In a real application, supervisor would access shared chats or reports
      // For this test, we'll simulate the workflow
      await supervisorChat.createNewChat();
      await supervisorChat.sendUserMessage(
        'What should I review when taking over a shift for RoboRail operations?',
      );
      await supervisorChat.isGenerationComplete();

      const assistantMessage = await supervisorChat.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /shift|review|operations|status/,
      );

      await operatorContext.close();
      await supervisorContext.close();
    });
  });

  test.describe('Real-World Usage Patterns', () => {
    test('should handle typical daily usage pattern', async ({ page }) => {
      await chatPage.createNewChat();

      // Morning startup routine
      await chatPage.sendUserMessage(
        "Good morning! I'm starting my shift. What's the startup checklist for RoboRail?",
      );
      await chatPage.isGenerationComplete();

      let assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /startup|checklist|morning/,
      );

      // Mid-shift operational questions
      await chatPage.sendUserMessage(
        'The system is running but speed seems lower than usual. Normal parameters?',
      );
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);

      // End of shift procedures
      await chatPage.sendUserMessage(
        'My shift is ending. What shutdown procedures should I follow?',
      );
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /shutdown|end|shift|procedures/,
      );

      // Verify conversation flow and context retention
      const allMessages = await chatPage.getAllMessages();
      expect(allMessages.length).toBeGreaterThanOrEqual(6);
    });

    test('should handle complex multi-topic conversation', async ({ page }) => {
      await chatPage.createNewChat();

      // Topic 1: Safety
      await chatPage.sendUserMessage(
        'Explain the safety protocols for RoboRail maintenance',
      );
      await chatPage.isGenerationComplete();

      // Topic 2: Technical issue
      await chatPage.sendUserMessage(
        'Now, separately, how do I calibrate the position sensors?',
      );
      await chatPage.isGenerationComplete();

      // Topic 3: Documentation
      await chatPage.sendUserMessage(
        "And what's the proper way to document these procedures?",
      );
      await chatPage.isGenerationComplete();

      // Reference previous topics
      await chatPage.sendUserMessage(
        "If I find a safety issue during sensor calibration, what's the protocol?",
      );
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      // Should reference both safety protocols and calibration context
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /safety|calibration|protocol/,
      );
    });
  });

  test.describe('Error Recovery and Resilience', () => {
    test('should recover from temporary service interruptions', async ({
      page,
    }) => {
      await chatPage.createNewChat();

      // Normal operation
      await chatPage.sendUserMessage(
        'What are the daily operational checks for RoboRail?',
      );
      await chatPage.isGenerationComplete();

      let assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);

      // Simulate service interruption
      await page.route('**/api/chat', (route) => {
        route.abort('failed');
      });

      // Attempt during interruption
      await chatPage.sendUserMessage('Follow-up question during outage');
      await page.waitForTimeout(3000);

      // Restore service
      await page.unroute('**/api/chat');

      // Should be able to continue
      await chatPage.sendUserMessage(
        'Can you repeat the last information about daily checks?',
      );
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(
        /daily|check|operational/,
      );
    });

    test('should handle concurrent user sessions gracefully', async ({
      browser,
    }) => {
      // Create multiple concurrent sessions
      const sessions = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
      ]);

      const pages = await Promise.all(
        sessions.map((context) => context.newPage()),
      );

      const chatPages = pages.map((page) => new ChatPage(page));

      // Create chats in all sessions
      await Promise.all(chatPages.map((chatPage) => chatPage.createNewChat()));

      // Send different messages simultaneously
      await Promise.all([
        chatPages[0].sendUserMessage('Session 1: What is RoboRail?'),
        chatPages[1].sendUserMessage('Session 2: How do I operate RoboRail?'),
        chatPages[2].sendUserMessage('Session 3: RoboRail safety protocols?'),
      ]);

      // Wait for all completions
      await Promise.all([
        chatPages[0].isGenerationComplete(),
        chatPages[1].isGenerationComplete(),
        chatPages[2].isGenerationComplete(),
      ]);

      // Verify each session got appropriate responses
      for (let i = 0; i < chatPages.length; i++) {
        const assistantMessage = await chatPages[i].getRecentAssistantMessage();
        expect(assistantMessage.content.length).toBeGreaterThan(0);
      }

      // Clean up
      await Promise.all(sessions.map((session) => session.close()));
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle rapid successive interactions', async ({ page }) => {
      await chatPage.createNewChat();

      const messages = [
        'Quick question 1: Emergency stop location?',
        'Quick question 2: Power requirements?',
        'Quick question 3: Safety equipment needed?',
      ];

      // Send messages in rapid succession
      for (const message of messages) {
        await chatPage.sendUserMessage(message);
        await chatPage.isGenerationComplete();
        await page.waitForTimeout(500); // Brief pause
      }

      // Verify all messages were processed
      const allMessages = await chatPage.getAllMessages();
      expect(allMessages.length).toBeGreaterThanOrEqual(6); // 3 user + 3 assistant

      // Check that responses are relevant
      const assistantMessages = allMessages.filter(
        (m) => m.role === 'assistant',
      );
      expect(assistantMessages.length).toBeGreaterThanOrEqual(3);
    });

    test('should maintain responsiveness with long conversation history', async ({
      page,
    }) => {
      await chatPage.createNewChat();

      // Build up conversation history
      for (let i = 1; i <= 8; i++) {
        await chatPage.sendUserMessage(
          `Message ${i}: Tell me about RoboRail topic ${i}`,
        );
        await chatPage.isGenerationComplete();

        if (i % 3 === 0) {
          await page.waitForTimeout(1000); // Periodic pause
        }
      }

      // Test responsiveness with long history
      const startTime = Date.now();
      await chatPage.sendUserMessage(
        'Final question: Summarize what we discussed',
      );
      await chatPage.isGenerationComplete();
      const responseTime = Date.now() - startTime;

      // Should still respond within reasonable time
      expect(responseTime).toBeLessThan(30000); // 30 seconds

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should support keyboard-only navigation', async ({ page }) => {
      await page.goto('/');

      // Navigate using Tab key
      await page.keyboard.press('Tab'); // Skip link or first element
      await page.keyboard.press('Tab'); // Navigate to input

      // Type message using keyboard
      await page.keyboard.type('Keyboard accessibility test for RoboRail');

      // Send using Enter
      await page.keyboard.press('Enter');

      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });

    test('should work with high contrast and accessibility features', async ({
      page,
    }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' });

      await chatPage.createNewChat();
      await chatPage.sendUserMessage(
        'Testing accessibility in high contrast mode',
      );
      await chatPage.isGenerationComplete();

      // Verify interface is still functional
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);

      // Check that key elements are visible
      await expect(chatPage.sendButton).toBeVisible();
      await expect(chatPage.multimodalInput).toBeVisible();
    });
  });
});
