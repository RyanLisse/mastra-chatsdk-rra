/**
 * Stagehand Cleanup Utilities
 * 
 * Provides robust cleanup mechanisms for Stagehand browser instances
 * to prevent hanging tests and zombie processes.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Kill all Chrome/Chromium processes that might be left hanging
 * This is a last resort cleanup mechanism
 */
export async function killAllChromeProcesses(): Promise<void> {
  if (process.platform === 'darwin') {
    // macOS
    try {
      await execAsync('pkill -f "Google Chrome Helper"').catch(() => {});
      await execAsync('pkill -f "Chromium Helper"').catch(() => {});
      await execAsync('pkill -f "chrome.*--headless"').catch(() => {});
    } catch (error) {
      // Ignore errors - processes might not exist
    }
  } else if (process.platform === 'linux') {
    // Linux
    try {
      await execAsync('pkill -f chrome').catch(() => {});
      await execAsync('pkill -f chromium').catch(() => {});
    } catch (error) {
      // Ignore errors
    }
  }
}

/**
 * Safe cleanup for Stagehand instance with multiple fallback strategies
 */
export async function cleanupStagehand(stagehand: any): Promise<void> {
  if (!stagehand) return;

  const cleanupSteps = [
    // Step 1: Try graceful page close
    async () => {
      if (stagehand.page && typeof stagehand.page.isClosed === 'function' && !stagehand.page.isClosed()) {
        await stagehand.page.close();
      }
    },
    // Step 2: Try graceful browser close
    async () => {
      if (stagehand.browser && typeof stagehand.browser.isConnected === 'function' && stagehand.browser.isConnected()) {
        await stagehand.browser.close();
      }
    },
    // Step 3: Try stagehand's own close method
    async () => {
      if (typeof stagehand.close === 'function') {
        await stagehand.close();
      }
    },
    // Step 4: Force disconnect browser
    async () => {
      if (stagehand.browser && typeof stagehand.browser.disconnect === 'function') {
        await stagehand.browser.disconnect();
      }
    },
    // Step 5: Try to get browser process and kill it
    async () => {
      if (stagehand.browser && typeof stagehand.browser.process === 'function') {
        const browserProcess = stagehand.browser.process();
        if (browserProcess && typeof browserProcess.kill === 'function') {
          browserProcess.kill('SIGKILL');
        }
      }
    },
  ];

  // Execute cleanup steps with individual error handling
  for (const [index, step] of cleanupSteps.entries()) {
    try {
      await Promise.race([
        step(),
        new Promise((resolve) => setTimeout(resolve, 3000)) // 3s timeout per step
      ]);
    } catch (error) {
      console.warn(`⚠️  Cleanup step ${index + 1} failed:`, error);
    }
  }
}

/**
 * Setup process-level cleanup handlers for emergency situations
 */
export function setupEmergencyCleanup(stagehandInstances: Set<any>): void {
  const emergencyCleanup = async () => {
    console.log('🚨 Emergency cleanup triggered...');
    
    // Try to cleanup all tracked instances
    const cleanupPromises = Array.from(stagehandInstances).map(instance => 
      cleanupStagehand(instance).catch(() => {})
    );
    
    await Promise.allSettled(cleanupPromises);
    
    // Clear the set
    stagehandInstances.clear();
    
    // As a last resort, kill all Chrome processes
    await killAllChromeProcesses();
  };

  // Don't register multiple times
  if (!(global as any).__stagehandCleanupRegistered) {
    (global as any).__stagehandCleanupRegistered = true;
    
    process.on('beforeExit', emergencyCleanup);
    process.on('exit', () => {
      // Synchronous cleanup attempt
      try {
        stagehandInstances.forEach(instance => {
          if (instance?.browser?.process) {
            const proc = instance.browser.process();
            if (proc?.kill) {
              proc.kill('SIGKILL');
            }
          }
        });
      } catch (error) {
        // Ignore errors in exit handler
      }
    });
  }
}

/**
 * Create a timeout-safe Stagehand test wrapper
 */
export function createStagehandTest(
  testFn: (stagehand: any) => Promise<void>,
  options: { timeout?: number } = {}
): () => Promise<void> {
  const { timeout = 30000 } = options;
  
  return async () => {
    let stagehand: any = null;
    const testPromise = (async () => {
      try {
        stagehand = await initializeStagehand();
        await testFn(stagehand);
      } finally {
        if (stagehand) {
          await cleanupStagehand(stagehand);
        }
      }
    })();

    // Ensure test doesn't hang forever
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);
    });

    try {
      await Promise.race([testPromise, timeoutPromise]);
    } catch (error) {
      // Force cleanup on timeout
      if (stagehand) {
        await cleanupStagehand(stagehand);
      }
      throw error;
    }
  };
}

/**
 * Initialize Stagehand with optimized settings
 */
async function initializeStagehand(): Promise<any> {
  const { Stagehand } = require('@browserbasehq/stagehand');
  
  const config = {
    env: 'LOCAL',
    verbose: 0,
    debugDom: false,
    headless: true,
    domSettleTimeoutMs: 8000,
    timeout: 35000,
    navigationTimeout: 20000,
    actionTimeout: 15000,
    enableCleanup: true,
    enableCaching: false,
    disablePino: true,
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-blink-features=AutomationControlled',
      ],
      timeout: 15000,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
    },
  };

  const stagehand = new Stagehand(config);
  await stagehand.init();
  return stagehand;
}