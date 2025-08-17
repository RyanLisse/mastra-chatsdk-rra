/**
 * Stagehand Test Configuration
 * 
 * Centralized configuration for all Stagehand tests to ensure consistency
 * and prevent hanging issues.
 */

export const STAGEHAND_TEST_CONFIG = {
  // Test timeouts
  testTimeout: 45000, // 45 seconds per test
  actionTimeout: 15000, // 15 seconds for actions
  navigationTimeout: 20000, // 20 seconds for navigation
  
  // Stagehand initialization config
  stagehandConfig: {
    env: 'LOCAL',
    verbose: process.env.CI === 'true' ? 0 : 1,
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
        '--force-color-profile=srgb',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
      timeout: 15000,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
    },
  },
  
  // Cleanup settings
  cleanupTimeout: 8000, // 8 seconds for cleanup
  forceKillTimeout: 2000, // 2 seconds before force kill
  
  // Retry settings
  maxRetries: 0, // No retries to prevent hanging
  retryDelay: 1000, // 1 second between retries if enabled
  
  // Element selectors commonly used
  selectors: {
    modelSelector: [
      '[data-testid="model-selector"]',
      'button[aria-label*="model"]',
      'button:has-text("Select model")',
      '[role="combobox"]',
      '.model-selector'
    ],
    messageInput: [
      'textarea[placeholder*="message"]',
      'input[placeholder*="message"]',
      '[data-testid="multimodal-input"]',
      'textarea',
      '[role="textbox"]'
    ],
    modelOptions: [
      '[data-testid*="model-selector-item"]',
      '[role="menuitem"]',
      'button[data-active]',
      '[data-testid*="model-option"]',
      '.model-option',
      '[role="option"]'
    ],
    assistantMessage: [
      '[data-testid="message-assistant"]',
      '[data-role="assistant"]',
      '.assistant-message',
      '[data-testid*="assistant"]',
      '.message-content:not([data-role="user"])'
    ],
    signInButton: [
      'button:has-text("Continue as Guest")',
      'button:has-text("Guest")',
      'button:has-text("Sign in")',
      'text=Sign in'
    ],
    noProvidersWarning: [
      'text=No AI providers configured',
      'text=No providers configured',
      'text=Add API keys',
      '[data-testid="no-providers-warning"]'
    ]
  },
  
  // Wait times
  waitTimes: {
    short: 1000, // 1 second
    medium: 2000, // 2 seconds  
    long: 5000, // 5 seconds
    veryLong: 10000, // 10 seconds
  },
  
  // Response check settings
  responseCheck: {
    maxAttempts: 20, // Check up to 20 times
    checkInterval: 1500, // Check every 1.5 seconds
    minResponseLength: 5, // Minimum length for valid response
  }
};

/**
 * Check if Stagehand tests should run
 */
export function shouldRunStagehandTests(): boolean {
  // Check for Stagehand library
  try {
    require.resolve('@browserbasehq/stagehand');
  } catch {
    console.log('⚠️  Stagehand library not installed');
    return false;
  }
  
  // Check for valid API key
  const hasValidApiKey = 
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith('test-') &&
    process.env.OPENAI_API_KEY.startsWith('sk-');
    
  if (!hasValidApiKey) {
    console.log('⚠️  Stagehand tests require a valid OpenAI API key');
    console.log('💡 Set OPENAI_API_KEY in .env.test with a real API key');
    return false;
  }
  
  // Check for Playwright environment
  const isPlaywrightEnv = process.env.PLAYWRIGHT === 'true';
  if (!isPlaywrightEnv) {
    console.log('⚠️  Stagehand tests require PLAYWRIGHT=true environment');
    return false;
  }
  
  return true;
}

/**
 * Helper to find and click the first visible element from a list of selectors
 */
export async function clickFirstVisible(
  page: any, 
  selectors: string[], 
  options: { timeout?: number } = {}
): Promise<boolean> {
  const { timeout = 5000 } = options;
  
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        await element.click({ timeout });
        return true;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  return false;
}

/**
 * Helper to find and fill the first visible input from a list of selectors
 */
export async function fillFirstVisible(
  page: any,
  selectors: string[],
  text: string,
  options: { timeout?: number } = {}
): Promise<boolean> {
  const { timeout = 5000 } = options;
  
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        await element.fill(text);
        return true;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  return false;
}

/**
 * Helper to check if any of the selectors is visible
 */
export async function isAnyVisible(
  page: any,
  selectors: string[]
): Promise<boolean> {
  for (const selector of selectors) {
    try {
      if (await page.locator(selector).isVisible().catch(() => false)) {
        return true;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  return false;
}