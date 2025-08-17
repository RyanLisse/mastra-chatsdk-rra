/**
 * Stagehand Utilities with Best Practices
 * 
 * This module provides utilities for working with Stagehand following best practices:
 * - Centralized initialization and configuration
 * - Proper error handling and cleanup
 * - Support for both LOCAL and BROWSERBASE environments
 * - Type-safe operations with Zod validation
 * - Atomic and specific actions as recommended
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { Browserbase } from '@browserbasehq/sdk';
import { z } from 'zod';
import stagehandConfig, { getBrowserLaunchOptions, type StagehandConfig } from '../../stagehand.config';

// Types for Stagehand operations
export interface StagehandInstance {
  stagehand: Stagehand;
  cleanup: () => Promise<void>;
}

export interface BrowserbaseSession {
  sessionId: string;
  debugUrl?: string;
}

// Validation schemas
const ActionSchema = z.object({
  action: z.string().min(1, 'Action description is required'),
  variables: z.record(z.string()).optional(),
});

const ExtractSchema = z.object({
  instruction: z.string().min(1, 'Extraction instruction is required'),
  schema: z.any(), // Zod schema for extracted data
});

const ObserveSchema = z.object({
  instruction: z.string().optional(),
});

export type ActionInput = z.infer<typeof ActionSchema>;
export type ExtractInput = z.infer<typeof ExtractSchema>;
export type ObserveInput = z.infer<typeof ObserveSchema>;

/**
 * Initialize a Stagehand instance with proper configuration
 */
export async function initializeStagehand(
  sessionId?: string,
  customConfig?: Partial<StagehandConfig>
): Promise<StagehandInstance> {
  const config = { ...stagehandConfig, ...customConfig };
  
  // Validate required configuration for BROWSERBASE environment
  if (config.env === 'BROWSERBASE') {
    if (!config.apiKey || !config.projectId) {
      throw new Error(
        'BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID are required for BROWSERBASE environment'
      );
    }
  }

  const stagehandOptions: any = {
    env: config.env,
    verbose: config.verbose,
    debugDom: config.debugDom,
    headless: config.headless,
    domSettleTimeoutMs: config.domSettleTimeoutMs,
    timeout: config.timeout,
    navigationTimeout: config.navigationTimeout,
    actionTimeout: config.actionTimeout,
    enableCleanup: config.enableCleanup,
    disablePino: config.disablePino,
  };

  // Add Browserbase-specific options
  if (config.env === 'BROWSERBASE') {
    stagehandOptions.apiKey = config.apiKey;
    stagehandOptions.projectId = config.projectId;
    if (sessionId) {
      stagehandOptions.browserbaseSessionID = sessionId;
    }
  } else {
    // Add browser launch options for LOCAL environment
    stagehandOptions.launchOptions = getBrowserLaunchOptions(config);
  }

  const stagehand = new Stagehand(stagehandOptions);
  
  try {
    await stagehand.init();
    
    return {
      stagehand,
      cleanup: async () => {
        try {
          await stagehand.close();
        } catch (error) {
          console.error('Error during Stagehand cleanup:', error);
        }
      },
    };
  } catch (error) {
    console.error('Failed to initialize Stagehand:', error);
    throw error;
  }
}

/**
 * Create a Browserbase session for remote browser automation
 */
export async function createBrowserbaseSession(
  projectId?: string
): Promise<BrowserbaseSession> {
  const browserbase = new Browserbase();
  const targetProjectId = projectId || stagehandConfig.projectId;
  
  if (!targetProjectId) {
    throw new Error('BROWSERBASE_PROJECT_ID is required to create a session');
  }

  try {
    const session = await browserbase.sessions.create({
      projectId: targetProjectId,
    });
    
    let debugUrl: string | undefined;
    try {
      const debugResponse = await browserbase.sessions.debug(session.id);
      debugUrl = debugResponse.debuggerFullscreenUrl;
    } catch (error) {
      console.warn('Could not get debug URL for session:', error);
    }

    return {
      sessionId: session.id,
      debugUrl,
    };
  } catch (error) {
    console.error('Failed to create Browserbase session:', error);
    throw error;
  }
}

/**
 * Perform an atomic action on a page following best practices
 */
export async function performAction(
  stagehand: Stagehand,
  input: ActionInput
): Promise<void> {
  const validatedInput = ActionSchema.parse(input);
  
  try {
    if (validatedInput.variables) {
      // Use variables to avoid sending sensitive information to LLMs
      await stagehand.page.act({
        action: validatedInput.action,
        variables: validatedInput.variables,
      });
    } else {
      await stagehand.page.act(validatedInput.action);
    }
  } catch (error) {
    console.error('Action failed:', error);
    throw new Error(`Failed to perform action: ${validatedInput.action}`);
  }
}

/**
 * Extract data from a page with schema validation
 */
export async function extractData<T>(
  stagehand: Stagehand,
  input: ExtractInput
): Promise<T> {
  const validatedInput = ExtractSchema.parse(input);
  
  try {
    const result = await stagehand.page.extract({
      instruction: validatedInput.instruction,
      schema: validatedInput.schema,
    });
    
    return result as T;
  } catch (error) {
    console.error('Extraction failed:', error);
    throw new Error(`Failed to extract data: ${validatedInput.instruction}`);
  }
}

/**
 * Observe possible actions on a page
 */
export async function observeActions(
  stagehand: Stagehand,
  input?: ObserveInput
): Promise<any[]> {
  const validatedInput = input ? ObserveSchema.parse(input) : {};
  
  try {
    if (validatedInput.instruction) {
      return await stagehand.page.observe(validatedInput.instruction);
    } else {
      return await stagehand.page.observe();
    }
  } catch (error) {
    console.error('Observation failed:', error);
    throw new Error('Failed to observe page actions');
  }
}

/**
 * Navigate to a URL with proper error handling
 */
export async function navigateToUrl(
  stagehand: Stagehand,
  url: string,
  options?: { timeout?: number; waitUntil?: string }
): Promise<void> {
  try {
    await stagehand.page.goto(url, {
      timeout: options?.timeout || stagehandConfig.navigationTimeout,
      waitUntil: (options?.waitUntil as any) || 'domcontentloaded',
    });
  } catch (error) {
    console.error(`Navigation to ${url} failed:`, error);
    throw new Error(`Failed to navigate to ${url}`);
  }
}

/**
 * Take a screenshot for debugging purposes
 */
export async function takeScreenshot(
  stagehand: Stagehand,
  path: string
): Promise<void> {
  try {
    await stagehand.page.screenshot({ path });
  } catch (error) {
    console.error('Screenshot failed:', error);
    throw new Error(`Failed to take screenshot: ${path}`);
  }
}

/**
 * Wait for a specific condition with timeout
 */
export async function waitForCondition(
  stagehand: Stagehand,
  condition: () => Promise<boolean>,
  timeout = 30000,
  interval = 1000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      if (await condition()) {
        return;
      }
    } catch (error) {
      // Continue waiting if condition check fails
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}
