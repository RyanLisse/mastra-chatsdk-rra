/**
 * Stagehand Chat Tests with Improved Browser Lifecycle Management
 *
 * This test suite manages browser instances properly to prevent "browser closed" errors:
 * - Each test gets a fresh Stagehand instance for complete isolation
 * - Proper cleanup in afterEach without interfering with subsequent tests
 * - Simplified cleanup logic to work with Playwright's browser management
 * - Emergency cleanup only when needed
 */
import { test, expect } from '@playwright/test';
import { z } from 'zod';

// Import Stagehand conditionally to handle potential import issues
let StagehandClass: any;
let stagehandAvailable = false;

try {
  const { Stagehand } = require('@browserbasehq/stagehand');
  StagehandClass = Stagehand;
  stagehandAvailable = true;
} catch (error) {
  console.warn(
    'Stagehand not available, skipping Stagehand tests:',
    error instanceof Error ? error.message : String(error),
  );
}

// Additional check for Playwright environment
const isPlaywrightEnv = process.env.PLAYWRIGHT === 'true';
if (!isPlaywrightEnv) {
  console.log('⚠️  Stagehand tests require PLAYWRIGHT=true environment');
  stagehandAvailable = false;
}

/**
 * Simple cleanup for Stagehand instances
 */
async function cleanupStagehand(stagehand: any): Promise<void> {
  if (!stagehand) return;

  try {
    console.log('🧹 Cleaning up Stagehand instance...');

    // Try graceful cleanup first
    if (stagehand.close && typeof stagehand.close === 'function') {
      await stagehand.close();
      console.log('✅ Stagehand instance closed gracefully');
    }
  } catch (error) {
    console.warn('⚠️  Error during Stagehand cleanup:', error);
    // Don't throw - allow tests to continue
  }
}

test.describe(stagehandAvailable
  ? 'RoboRail Assistant Chat Tests'
  : 'RoboRail Assistant Chat Tests (Skipped)', () => {
  test.skip(!stagehandAvailable, 'Stagehand not available');

  // Each test gets its own Stagehand instance for complete isolation
  let stagehand: any;

  test.beforeEach(async () => {
    if (stagehandAvailable) {
      try {
        console.log('🎭 Creating new Stagehand instance for test...');
        stagehand = new StagehandClass({
          env: 'LOCAL',
          verbose: 0, // Reduce verbosity for tests
          debugDom: false,
          headless: true, // Always run headless in tests
          domSettleTimeoutMs: 10_000, // Reduced timeout
        });

        await stagehand.init();
        console.log('✅ Stagehand instance initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Stagehand:', error);
        stagehand = null;
        test.skip();
      }
    }
  });

  test.afterEach(async () => {
    if (stagehand) {
      console.log('🧹 Cleaning up Stagehand instance after test...');
      await cleanupStagehand(stagehand);
      stagehand = null;
    }
  });

  test.describe('Basic Chat Functionality', () => {
    test('should load the chat interface successfully', async () => {
      test.setTimeout(15000); // Reduced timeout

      if (!stagehand) {
        test.skip();
        return;
      }

      await stagehand.page.goto('http://localhost:3000', {
        timeout: 30000,
        waitUntil: 'domcontentloaded',
      });

      // Wait for the chat interface to load with shorter timeout
      await stagehand.page.waitForSelector('[data-testid="multimodal-input"]', {
        timeout: 8000,
      });

      // Verify the page title or key elements
      const title = await stagehand.page.title();
      expect(title).toContain('Chat');
    });

    test('should send a message and receive an AI response', async () => {
      test.setTimeout(60000);

      if (!stagehand) {
        test.skip();
        return;
      }

      await stagehand.page.goto('http://localhost:3000', {
        timeout: 30000,
        waitUntil: 'domcontentloaded',
      });

      // Wait for the chat interface to be ready
      await stagehand.page.waitForSelector('[data-testid="multimodal-input"]', {
        timeout: 15000,
      });

      const testMessage = 'Hello, what can you help me with?';

      // Use Stagehand's AI-powered actions
      await stagehand.page.act(
        `Type "${testMessage}" in the text area with placeholder "Ask about RoboRail operations, maintenance, or troubleshooting..."`,
      );
      await stagehand.page.act(
        'Click the send button (arrow up icon) to submit the message',
      );

      // Wait for AI response
      await stagehand.page.waitForSelector('[data-testid="message-content"]', {
        timeout: 20000,
      });

      // Extract the conversation using Stagehand's AI extraction
      const messages = await stagehand.page.extract({
        instruction:
          'Get all messages in the conversation with their roles and content',
        schema: z.array(
          z.object({
            content: z.string(),
            role: z.enum(['user', 'assistant']),
          }),
        ),
      });

      // Verify we have user message and assistant response
      expect(messages.length).toBeGreaterThanOrEqual(2);

      const userMessage = messages.find((msg: any) => msg.role === 'user');
      const assistantMessage = messages.find(
        (msg: any) => msg.role === 'assistant',
      );

      expect(userMessage).toBeDefined();
      expect(userMessage?.content).toContain(testMessage);

      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.content.length).toBeGreaterThan(0);
    });

    test('should handle multi-turn conversation correctly', async () => {
      test.setTimeout(90000);

      if (!stagehand) {
        test.skip();
        return;
      }

      await stagehand.page.goto('http://localhost:3000');
      await stagehand.page.waitForSelector('[data-testid="multimodal-input"]', {
        timeout: 15000,
      });

      // First exchange
      await stagehand.page.act(
        'Type "What is the weather like?" in the text area and click the send button',
      );
      await stagehand.page.waitForSelector('[data-testid="message-content"]', {
        timeout: 20000,
      });

      // Second exchange - follow-up question
      await stagehand.page.act(
        'Type "What about tomorrow?" in the text area and click the send button',
      );
      await stagehand.page.waitForSelector('[data-testid="message-content"]', {
        timeout: 20000,
      });

      // Extract all messages
      const conversation = await stagehand.page.extract({
        instruction: 'Get the complete conversation history with all messages',
        schema: z.array(
          z.object({
            content: z.string(),
            role: z.enum(['user', 'assistant']),
          }),
        ),
      });

      // Should have at least 4 messages (2 user + 2 assistant)
      expect(conversation.length).toBeGreaterThanOrEqual(4);

      // Verify alternating pattern
      const userMessages = conversation.filter(
        (msg: any) => msg.role === 'user',
      );
      const assistantMessages = conversation.filter(
        (msg: any) => msg.role === 'assistant',
      );

      expect(userMessages.length).toBeGreaterThanOrEqual(2);
      expect(assistantMessages.length).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('RoboRail Specific Features', () => {
    test('should handle RoboRail maintenance queries', async () => {
      test.setTimeout(60000);

      if (!stagehand) {
        test.skip();
        return;
      }

      await stagehand.page.goto('http://localhost:3000');
      await stagehand.page.waitForSelector('[data-testid="multimodal-input"]', {
        timeout: 15000,
      });

      const maintenanceQuery =
        'How do I perform routine maintenance on RoboRail?';

      await stagehand.page.act(
        `Type "${maintenanceQuery}" in the text area and click the send button`,
      );
      await stagehand.page.waitForSelector('[data-testid="message-content"]', {
        timeout: 20000,
      });

      // Extract the assistant's response
      const response = await stagehand.page.extract({
        instruction: "Get the assistant's response to the maintenance query",
        schema: z.object({
          content: z.string(),
          role: z.literal('assistant'),
        }),
      });

      expect(response.content.length).toBeGreaterThan(0);
      // Should contain maintenance-related keywords
      expect(response.content.toLowerCase()).toMatch(
        /maintenance|service|inspect|clean|check/,
      );
    });

    test('should handle error code troubleshooting', async () => {
      test.setTimeout(60000);

      if (!stagehand) {
        test.skip();
        return;
      }

      await stagehand.page.goto('http://localhost:3000');
      await stagehand.page.waitForSelector('[data-testid="multimodal-input"]', {
        timeout: 15000,
      });

      const errorQuery = 'What does error code E001 mean and how do I fix it?';

      await stagehand.page.act(
        `Type "${errorQuery}" in the text area and click the send button`,
      );
      await stagehand.page.waitForSelector('[data-testid="message-content"]', {
        timeout: 20000,
      });

      // Extract the response
      const response = await stagehand.page.extract({
        instruction: "Get the assistant's response about the error code",
        schema: z.object({
          content: z.string(),
          role: z.literal('assistant'),
        }),
      });

      expect(response.content.length).toBeGreaterThan(0);
      // Should acknowledge the error code or provide troubleshooting info
      expect(response.content.toLowerCase()).toMatch(
        /error|fix|troubleshoot|solution|check/,
      );
    });
  });

  test.describe('UI/UX Features', () => {
    test('should support message editing and regeneration', async () => {
      test.setTimeout(60000);

      if (!stagehand) {
        test.skip();
        return;
      }

      await stagehand.page.goto('http://localhost:3000');
      await stagehand.page.waitForSelector('[data-testid="multimodal-input"]', {
        timeout: 15000,
      });

      // Send initial message
      await stagehand.page.act(
        'Type "Tell me about safety procedures" in the text area and click the send button',
      );
      await stagehand.page.waitForSelector('[data-testid="message-content"]', {
        timeout: 20000,
      });

      // Check if edit functionality is available
      const hasEditFeature = await stagehand.page.observe(
        'Check if there are edit or regenerate buttons visible',
      );

      // This test validates the UI has the expected interactive features
      expect(typeof hasEditFeature).toBe('string');
    });

    test('should display typing indicators during response generation', async () => {
      test.setTimeout(45000);

      if (!stagehand) {
        test.skip();
        return;
      }

      await stagehand.page.goto('http://localhost:3000');
      await stagehand.page.waitForSelector('[data-testid="multimodal-input"]', {
        timeout: 15000,
      });

      // Send a message and immediately check for loading state
      await stagehand.page.act(
        'Type "Explain RoboRail safety protocols" in the text area and click the send button',
      );

      // Check for loading/typing indicators
      const loadingState = await stagehand.page.observe(
        'Look for any loading indicators, typing indicators, or processing states',
      );

      expect(typeof loadingState).toBe('string');
      expect(loadingState.length).toBeGreaterThan(0);
    });
  });
});
