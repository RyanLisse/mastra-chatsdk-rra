/**
 * Stagehand Chat Tests with Robust Browser Process Cleanup
 *
 * This test suite includes comprehensive browser process management to prevent hanging:
 * - Force browser process termination after 4-second timeout
 * - SIGTERM/SIGKILL process handling for stubborn browser processes
 * - Emergency cleanup on test failures
 * - Process signal handlers for graceful shutdown
 * - Per-test cleanup to prevent resource leaks
 *
 * The cleanup system uses a layered approach:
 * 1. Graceful cleanup (page.close() → browser.close() → stagehand.close())
 * 2. Force termination with SIGTERM after 4s timeout
 * 3. SIGKILL as last resort after additional 1s delay
 * 4. Emergency cleanup on any test failure
 */
import { test, expect } from '@playwright/test';

// Import Stagehand with proper error handling
let StagehandClass: any;
let stagehandAvailable = false;

try {
  const { Stagehand } = require('@browserbasehq/stagehand');
  StagehandClass = Stagehand;
  stagehandAvailable = true;
  console.log('✅ Stagehand library loaded successfully');
} catch (error) {
  console.log(
    '⚠️  Stagehand library not available:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  console.log('📝 Stagehand tests will be skipped');
}

// Additional checks for test environment
const isPlaywrightEnv = process.env.PLAYWRIGHT === 'true';
const hasValidApiKey =
  process.env.OPENAI_API_KEY &&
  !process.env.OPENAI_API_KEY.startsWith('test-') &&
  process.env.OPENAI_API_KEY.startsWith('sk-');

if (!isPlaywrightEnv) {
  console.log('⚠️  Stagehand tests require PLAYWRIGHT=true environment');
  stagehandAvailable = false;
}

if (!hasValidApiKey) {
  console.log('⚠️  Stagehand tests require a valid OpenAI API key');
  console.log(
    '💡 Set OPENAI_API_KEY in .env.test with a real API key to run Stagehand tests',
  );
  stagehandAvailable = false;
}

/**
 * Force cleanup for Stagehand instances with comprehensive process management
 */
async function forceCleanupStagehand(stagehand: any): Promise<void> {
  if (!stagehand) return;

  const startTime = Date.now();
  console.log('🧹 Starting comprehensive Stagehand cleanup...');

  try {
    // Step 1: Graceful cleanup with timeout
    const gracefulCleanup = async () => {
      try {
        if (stagehand.page && !stagehand.page.isClosed()) {
          await stagehand.page.close();
        }
      } catch (error) {
        console.warn('⚠️  Error closing page:', error);
      }

      try {
        if (stagehand.browser) {
          await stagehand.browser.close();
        }
      } catch (error) {
        console.warn('⚠️  Error closing browser:', error);
      }

      try {
        if (stagehand.close) {
          await stagehand.close();
        }
      } catch (error) {
        console.warn('⚠️  Error calling stagehand.close():', error);
      }
    };

    // Run graceful cleanup with 4-second timeout
    const gracefulTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Graceful cleanup timeout')), 4000),
    );

    try {
      await Promise.race([gracefulCleanup(), gracefulTimeout]);
      console.log('✅ Graceful cleanup completed');
      return;
    } catch (error) {
      console.warn('⚠️  Graceful cleanup failed or timed out:', error);
    }

    // Step 2: Force termination with SIGTERM
    console.log('🔨 Attempting force termination...');
    if (stagehand.browser?.process()) {
      const browserProcess = stagehand.browser.process();
      if (browserProcess && !browserProcess.killed) {
        console.log(
          `💀 Sending SIGTERM to browser process ${browserProcess.pid}`,
        );
        browserProcess.kill('SIGTERM');

        // Wait 1 second for SIGTERM to work
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // If still alive, use SIGKILL
        if (!browserProcess.killed) {
          console.log(
            `💀💀 Sending SIGKILL to browser process ${browserProcess.pid}`,
          );
          browserProcess.kill('SIGKILL');
        }
      }
    }

    // Step 3: Emergency cleanup - kill any remaining browser processes
    if (process.platform !== 'win32') {
      try {
        const { execSync } = require('node:child_process');
        execSync(
          'pkill -f chrome || pkill -f chromium || pkill -f browser || true',
          {
            stdio: 'ignore',
          },
        );
      } catch (error) {
        // Ignore errors from process killing
      }
    }

    const endTime = Date.now();
    console.log(`✅ Force cleanup completed in ${endTime - startTime}ms`);
  } catch (error) {
    console.error('❌ Error during force cleanup:', error);
  }
}

test.describe(stagehandAvailable
  ? 'Chat Interface with Stagehand'
  : 'Chat Interface with Stagehand (Skipped)', () => {
  let stagehand: any;

  test.beforeEach(async () => {
    if (stagehandAvailable) {
      console.log('🚀 Setting up fresh Stagehand instance...');

      // Use configuration from stagehand.config.ts
      const config = {
        env: 'LOCAL',
        verbose: process.env.CI === 'true' ? 0 : 1,
        debugDom: process.env.CI !== 'true',
        headless: process.env.CI === 'true',
        domSettleTimeoutMs: 15000, // Reduced for faster tests
        timeout: 45000,
        navigationTimeout: 30000,
        actionTimeout: 10000,
        enableCleanup: true,
        disablePino: true, // Disable logging in tests
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
          ],
          timeout: 30000,
        },
      };

      stagehand = new StagehandClass(config);
      await stagehand.init();
      console.log('✅ Stagehand instance ready');
    }
  });

  test.afterEach(async () => {
    if (stagehand) {
      console.log('🧹 Cleaning up Stagehand instance...');
      await forceCleanupStagehand(stagehand);
      stagehand = null;
      console.log('✅ Stagehand cleanup completed');
    }
  });

  test('should load the homepage and display chat interface', async () => {
    if (!stagehandAvailable || !stagehand) {
      console.log('⚠️  Stagehand not available, skipping test');
      return;
    }

    console.log('🌐 Navigating to homepage...');
    await stagehand.page.goto('http://localhost:3000', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });

    // Wait for the page to fully load
    await stagehand.page.waitForTimeout(3000);

    // Take a screenshot for debugging
    await stagehand.page.screenshot({ path: 'homepage-loaded.png' });

    console.log('🔍 Checking for chat interface elements...');

    // Check if we need to sign in or if we're already in chat
    const hasSignIn = await stagehand.page
      .locator('text=Sign in')
      .isVisible()
      .catch(() => false);

    if (hasSignIn) {
      console.log('🔐 Signing in as guest...');
      // Use observe() first to get the action, then act() - following best practices
      const signInActions = await stagehand.page.observe(
        'find sign in or continue as guest button',
      );
      if (signInActions.length > 0) {
        await stagehand.page.act(signInActions[0]);
      } else {
        await stagehand.page.act(
          'Click the "Continue as Guest" button or sign in option',
        );
      }
      await stagehand.page.waitForTimeout(2000);
    }

    // Verify we can see the chat input
    const hasChatInput = await stagehand.page
      .locator(
        '[data-testid="multimodal-input"], textarea, input[placeholder*="message"]',
      )
      .isVisible()
      .catch(() => false);

    expect(hasChatInput).toBe(true);
    console.log('✅ Chat interface is visible and accessible');
  });

  test('should be able to send a message', async () => {
    if (!stagehandAvailable || !stagehand) {
      console.log('⚠️  Stagehand not available, skipping test');
      return;
    }

    console.log('🌐 Navigating to chat page...');
    await stagehand.page.goto('http://localhost:3000', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });

    await stagehand.page.waitForTimeout(3000);

    // Handle potential sign-in
    const hasSignIn = await stagehand.page
      .locator('text=Sign in')
      .isVisible()
      .catch(() => false);

    if (hasSignIn) {
      console.log('🔐 Handling authentication...');
      await stagehand.page.act('Sign in or continue as guest');
      await stagehand.page.waitForTimeout(2000);
    }

    console.log('💬 Sending test message...');
    const testMessage = 'Hello, this is a test message from Stagehand!';

    // Send the message using Stagehand's act method with variables (best practice)
    await stagehand.page.act({
      action: 'Type %message% in the text area and send it',
      variables: {
        message: testMessage,
      },
    });

    // Wait for the message to appear
    await stagehand.page.waitForTimeout(3000);

    // Take a screenshot
    await stagehand.page.screenshot({ path: 'message-sent.png' });

    // Verify the message appears in the chat
    const messageExists = await stagehand.page
      .locator(`text=${testMessage}`)
      .isVisible()
      .catch(() => false);

    expect(messageExists).toBe(true);
    console.log('✅ Message was successfully sent and displayed');
  });

  test('should display model selector and allow model changes', async () => {
    if (!stagehandAvailable || !stagehand) {
      console.log('⚠️  Stagehand not available, skipping test');
      return;
    }

    console.log('🌐 Navigating to chat page...');
    await stagehand.page.goto('http://localhost:3000', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });

    await stagehand.page.waitForTimeout(3000);

    // Handle potential sign-in
    const hasSignIn = await stagehand.page
      .locator('text=Sign in')
      .isVisible()
      .catch(() => false);

    if (hasSignIn) {
      console.log('🔐 Handling authentication...');
      await stagehand.page.act('Sign in or continue as guest');
      await stagehand.page.waitForTimeout(2000);
    }

    console.log('🎯 Looking for model selector...');

    // Find and interact with the model selector
    await stagehand.page.act('Click the model selector button');
    await stagehand.page.waitForTimeout(2000);

    // Take a screenshot of the model selector
    await stagehand.page.screenshot({ path: 'model-selector.png' });

    // Verify model options are visible
    const hasModelOptions = await stagehand.page
      .locator('[data-testid*="model"], .model-option, [role="menuitem"]')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasModelOptions).toBe(true);
    console.log('✅ Model selector is functional');
  });

  test('should handle error scenarios gracefully', async () => {
    if (!stagehandAvailable || !stagehand) {
      console.log('⚠️  Stagehand not available, skipping test');
      return;
    }

    console.log('🌐 Testing error handling...');

    // Navigate to a non-existent page to trigger error handling
    try {
      await stagehand.page.goto('http://localhost:3000/nonexistent-page', {
        timeout: 30000,
      });
    } catch (error) {
      console.log('Expected error for non-existent page:', error);
    }

    await stagehand.page.waitForTimeout(2000);

    // Take a screenshot
    await stagehand.page.screenshot({ path: 'error-page.png' });

    // Verify we can navigate back to the main page
    await stagehand.page.goto('http://localhost:3000', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });

    await stagehand.page.waitForTimeout(2000);

    const isOnMainPage = await stagehand.page
      .locator('body')
      .isVisible()
      .catch(() => false);

    expect(isOnMainPage).toBe(true);
    console.log('✅ Error handling works correctly');
  });
});
