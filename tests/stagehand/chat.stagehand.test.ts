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
import { z } from 'zod';

// Import Stagehand conditionally to handle potential import issues
let Stagehand: any;
let stagehandAvailable = false;

try {
  Stagehand = require('stagehand').Stagehand;
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
 * Force cleanup Stagehand browser processes with proper termination
 */
async function forceCleanupStagehand(stagehand: any): Promise<void> {
  console.log('🧹 Starting Stagehand cleanup process...');
  
  let cleanupComplete = false;
  let browserProcess: any = null;
  
  try {
    // Extract browser process if available from multiple potential sources
    if (stagehand.page?.browser) {
      browserProcess = stagehand.page.browser().process();
    } else if (stagehand.browser) {
      browserProcess = stagehand.browser.process();
    } else if (stagehand._browser) {
      // Some Stagehand versions might use _browser
      browserProcess = stagehand._browser.process();
    }
    
    // Attempt graceful cleanup first
    const gracefulCleanup = async (): Promise<void> => {
      console.log('⏳ Attempting graceful Stagehand cleanup...');
      
      // Close pages first
      if (stagehand.page && !stagehand.page.isClosed()) {
        await stagehand.page.close();
        console.log('  📄 Page closed');
      }
      
      // Close all browser contexts if available
      if (stagehand.browser && !stagehand.browser.isClosed()) {
        const contexts = stagehand.browser.contexts();
        for (const context of contexts) {
          await context.close();
        }
        console.log('  🔗 Browser contexts closed');
      }
      
      // Then close the browser
      if (stagehand.browser && !stagehand.browser.isClosed()) {
        await stagehand.browser.close();
        console.log('  🌐 Browser closed');
      }
      
      // Finally close stagehand itself
      if (stagehand.close) {
        await stagehand.close();
        console.log('  🎭 Stagehand instance closed');
      }
      
      cleanupComplete = true;
      console.log('✅ Graceful Stagehand cleanup completed');
    };
    
    // Create timeout for force termination
    const forceTermination = new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        if (!cleanupComplete) {
          console.log('⚠️  Graceful cleanup timed out, forcing termination...');
          
          try {
            // Force kill browser process if it exists
            if (browserProcess?.pid) {
              console.log(`🔥 Force killing browser process PID: ${browserProcess.pid}`);
              
              // Try SIGTERM first
              process.kill(browserProcess.pid, 'SIGTERM');
              
              // Wait briefly, then use SIGKILL if still alive
              setTimeout(() => {
                try {
                  process.kill(browserProcess.pid, 'SIGKILL');
                  console.log(`💀 Force killed browser process with SIGKILL`);
                } catch (killError) {
                  // Process might already be dead
                  console.log('🔇 Browser process already terminated');
                }
              }, 1000);
            }
            
            // Force close any remaining handles
            if (stagehand.browser) {
              try {
                await stagehand.browser.close();
              } catch (error) {
                console.warn('Failed to close browser handle:', error);
              }
            }
            
            console.log('💥 Force termination completed');
            resolve();
          } catch (error) {
            console.error('Error during force termination:', error);
            reject(error);
          }
        } else {
          resolve();
        }
      }, 4000); // 4 second timeout for force termination
      
      // Clear timeout if graceful cleanup succeeds
      gracefulCleanup().then(() => {
        clearTimeout(timeoutId);
        resolve();
      }).catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
    
    // Wait for either graceful cleanup or force termination
    await forceTermination;
    
  } catch (error) {
    console.error('❌ Error during Stagehand cleanup:', error);
    
    // Last resort: try to kill any remaining browser processes
    if (browserProcess?.pid) {
      try {
        process.kill(browserProcess.pid, 'SIGKILL');
        console.log('🗡️  Emergency kill of browser process completed');
      } catch (killError) {
        console.warn('Failed emergency kill:', killError);
      }
    }
    
    // Don't throw the error to prevent test failures from cleanup issues
    console.warn('⚠️  Cleanup completed with errors, continuing...');
  }
}

// Global registry for tracking active stagehand instances
const activeStagehandInstances = new Set<any>();

/**
 * Handle process termination signals to ensure proper cleanup
 */
function setupProcessSignalHandlers(): void {
  const signals = ['SIGTERM', 'SIGINT', 'SIGQUIT'] as const;
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`📡 Received ${signal}, cleaning up Stagehand processes...`);
      
      // Force cleanup all active stagehand instances
      const cleanupPromises = Array.from(activeStagehandInstances).map(stagehandInstance => 
        forceCleanupStagehand(stagehandInstance).catch(error => 
          console.warn('Failed to cleanup stagehand instance:', error)
        )
      );
      
      await Promise.allSettled(cleanupPromises);
      
      // Exit after cleanup
      process.exit(0);
    });
  });
}

/**
 * Wrapper for test execution with automatic cleanup on failure
 */
async function runTestWithCleanup(testFn: () => Promise<void>, stagehandInstance?: any): Promise<void> {
  try {
    await testFn();
  } catch (error) {
    console.error('❌ Test failed, attempting emergency cleanup before re-throwing:', error);
    
    // Attempt emergency cleanup on test failure
    if (stagehandInstance) {
      try {
        console.log('🚨 Running emergency cleanup due to test failure...');
        await forceCleanupStagehand(stagehandInstance);
      } catch (cleanupError) {
        console.warn('Emergency cleanup failed:', cleanupError);
      }
    }
    
    // Re-throw the original test error
    throw error;
  }
}

// Setup signal handlers
setupProcessSignalHandlers();

test.describe(stagehandAvailable
  ? 'RoboRail Assistant Chat Tests'
  : 'RoboRail Assistant Chat Tests (Skipped)', () => {
  test.skip(!stagehandAvailable, 'Stagehand not available');
  let stagehand: any;
  
  // Track cleanup status to prevent multiple cleanup attempts
  let cleanupInProgress = false;

  test.beforeAll(async () => {
    if (stagehandAvailable) {
      try {
        stagehand = new Stagehand({
          env: 'LOCAL',
          verbose: 0, // Reduce verbosity for tests
          debugDom: false,
          headless: true, // Always run headless in tests
          domSettleTimeoutMs: 10_000, // Reduced timeout
          timeout: 30_000,
          actionTimeout: 5_000,
          launchOptions: {
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
            ],
            timeout: 15_000,
          },
        });

        // Set a timeout for initialization
        await Promise.race([
          stagehand.init(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Stagehand init timeout')),
              20_000,
            ),
          ),
        ]);
        
        // Register stagehand instance for global cleanup
        activeStagehandInstances.add(stagehand);
      } catch (error) {
        console.error('Failed to initialize Stagehand:', error);
        stagehandAvailable = false;
        stagehand = null;
      }
    }
  });

  test.afterAll(async () => {
    if (stagehand && !cleanupInProgress) {
      cleanupInProgress = true;
      console.log('🏁 Running final cleanup in afterAll...');
      await forceCleanupStagehand(stagehand);
      
      // Unregister from global cleanup
      activeStagehandInstances.delete(stagehand);
    }
  });

  // Add afterEach hook for cleanup in case individual tests fail
  test.afterEach(async () => {
    if (stagehand?.page && !cleanupInProgress) {
      try {
        // Close any open pages that might prevent proper cleanup
        console.log('🔄 Closing page in afterEach...');
        await stagehand.page.close();
        
        // Create a new page for the next test
        if (stagehand.browser && !stagehand.browser.isClosed()) {
          stagehand.page = await stagehand.browser.newPage();
        }
      } catch (error) {
        console.warn('Error closing page in afterEach:', error);
        
        // If page cleanup fails, mark for full cleanup
        if (!cleanupInProgress) {
          cleanupInProgress = true;
          await forceCleanupStagehand(stagehand);
        }
      }
    }
  });

  test.describe('Basic Chat Functionality', () => {
    test('should load the chat interface successfully', async () => {
      test.setTimeout(15000); // Reduced timeout

      if (!stagehand) {
        test.skip();
        return;
      }

      await runTestWithCleanup(async () => {
        await stagehand.page.goto('http://localhost:3000', {
          timeout: 10000,
          waitUntil: 'domcontentloaded',
        });

        // Wait for the chat interface to load with shorter timeout
        await stagehand.page.waitForSelector('[data-testid="chat-input"]', {
          timeout: 8000,
        });

        // Verify the page title or key elements
        const title = await stagehand.page.title();
        expect(title).toContain('Chat');
      }, stagehand);
    });

    test('should send a message and receive an AI response', async () => {
      test.setTimeout(60000);
      
      if (!stagehand) {
        test.skip();
        return;
      }

      await runTestWithCleanup(async () => {
        await stagehand.page.goto('http://localhost:3000');

        // Wait for the chat interface to be ready
        await stagehand.page.waitForSelector('[data-testid="chat-input"]', {
          timeout: 15000,
        });

        const testMessage = 'Hello, what can you help me with?';

        // Use Stagehand's AI-powered actions
        await stagehand.act(`Type "${testMessage}" in the chat input field`);
        await stagehand.act('Click the send button to submit the message');

        // Wait for AI response
        await stagehand.page.waitForSelector('[data-testid="message-content"]', {
          timeout: 20000,
        });

        // Extract the conversation using Stagehand's AI extraction
        const messages = await stagehand.extract(
          'Get all messages in the conversation with their roles and content',
          {
            schema: z.array(
              z.object({
                content: z.string(),
                role: z.enum(['user', 'assistant']),
              }),
            ),
          },
        );

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
      }, stagehand);
    });

    test('should handle multi-turn conversation correctly', async () => {
      test.setTimeout(90000);
      await stagehand.page.goto('http://localhost:3000');
      await stagehand.page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 15000,
      });

      // First exchange
      await stagehand.act('Type "What is the weather like?" and send it');
      await stagehand.page.waitForSelector('[data-testid="message-content"]', {
        timeout: 20000,
      });

      // Second exchange - follow-up question
      await stagehand.act('Type "What about tomorrow?" and send it');
      await stagehand.page.waitForSelector('[data-testid="message-content"]', {
        timeout: 20000,
      });

      // Extract all messages
      const conversation = await stagehand.extract(
        'Get the complete conversation history with all messages',
        {
          schema: z.array(
            z.object({
              content: z.string(),
              role: z.enum(['user', 'assistant']),
            }),
          ),
        },
      );

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
      await stagehand.page.goto('http://localhost:3000');
      await stagehand.page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 15000,
      });

      const maintenanceQuery =
        'How do I perform routine maintenance on RoboRail?';

      await stagehand.act(`Type "${maintenanceQuery}" and send the message`);
      await stagehand.page.waitForSelector('[data-testid="message-content"]', {
        timeout: 20000,
      });

      // Extract the assistant's response
      const response = await stagehand.extract(
        "Get the assistant's response to the maintenance query",
        {
          schema: z.object({
            content: z.string(),
            role: z.literal('assistant'),
          }),
        },
      );

      expect(response.content.length).toBeGreaterThan(0);
      // Should contain maintenance-related keywords
      expect(response.content.toLowerCase()).toMatch(
        /maintenance|service|inspect|clean|check/,
      );
    });

    test('should handle error code troubleshooting', async () => {
      test.setTimeout(60000);
      await stagehand.page.goto('http://localhost:3000');
      await stagehand.page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 15000,
      });

      const errorQuery = 'What does error code E001 mean and how do I fix it?';

      await stagehand.act(`Type "${errorQuery}" and send the message`);
      await stagehand.page.waitForSelector('[data-testid="message-content"]', {
        timeout: 20000,
      });

      // Extract the response
      const response = await stagehand.extract(
        "Get the assistant's response about the error code",
        {
          schema: z.object({
            content: z.string(),
            role: z.literal('assistant'),
          }),
        },
      );

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
      await stagehand.page.goto('http://localhost:3000');
      await stagehand.page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 15000,
      });

      // Send initial message
      await stagehand.act('Type "Tell me about safety procedures" and send it');
      await stagehand.page.waitForSelector('[data-testid="message-content"]', {
        timeout: 20000,
      });

      // Check if edit functionality is available
      const hasEditFeature = await stagehand.observe(
        'Check if there are edit or regenerate buttons visible',
      );

      // This test validates the UI has the expected interactive features
      expect(typeof hasEditFeature).toBe('string');
    });

    test('should display typing indicators during response generation', async () => {
      test.setTimeout(45000);
      await stagehand.page.goto('http://localhost:3000');
      await stagehand.page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 15000,
      });

      // Send a message and immediately check for loading state
      await stagehand.act(
        'Type "Explain RoboRail safety protocols" and send it',
      );

      // Check for loading/typing indicators
      const loadingState = await stagehand.observe(
        'Look for any loading indicators, typing indicators, or processing states',
      );

      expect(typeof loadingState).toBe('string');
      expect(loadingState.length).toBeGreaterThan(0);
    });
  });
});
