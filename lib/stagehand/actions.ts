/**
 * Stagehand Server Actions for Next.js
 *
 * This module provides server actions for web automation using Stagehand.
 * Following Next.js and Stagehand best practices:
 * - Server-only execution with proper error handling
 * - Type-safe operations with Zod validation
 * - Support for both LOCAL and BROWSERBASE environments
 * - Atomic and specific actions as recommended
 * - Proper cleanup and resource management
 */

'use server';

import { z } from 'zod';
import { auth } from '../../app/(auth)/auth';
import {
  initializeStagehand,
  createBrowserbaseSession,
  performAction,
  extractData,
  observeActions,
  navigateToUrl,
  takeScreenshot,
  type BrowserbaseSession,
} from './utils';

// Input validation schemas
const NavigateInputSchema = z.object({
  url: z.string().url('Invalid URL format'),
  sessionId: z.string().optional(),
  timeout: z.number().positive().optional(),
});

const ActionInputSchema = z.object({
  action: z.string().min(1, 'Action description is required'),
  variables: z.record(z.string()).optional(),
  sessionId: z.string().optional(),
});

const ExtractInputSchema = z.object({
  instruction: z.string().min(1, 'Extraction instruction is required'),
  schema: z.any(), // Zod schema for extracted data
  sessionId: z.string().optional(),
});

const ObserveInputSchema = z.object({
  instruction: z.string().optional(),
  sessionId: z.string().optional(),
});

const ScreenshotInputSchema = z.object({
  path: z.string().min(1, 'Screenshot path is required'),
  sessionId: z.string().optional(),
});

// Response types
export interface ActionResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface ExtractResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ObserveResult {
  success: boolean;
  actions?: any[];
  error?: string;
}

/**
 * Create a new Browserbase session for remote browser automation
 */
export async function createStagehandSession(): Promise<{
  success: boolean;
  session?: BrowserbaseSession;
  error?: string;
}> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    const browserbaseSession = await createBrowserbaseSession();

    return {
      success: true,
      session: browserbaseSession,
    };
  } catch (error) {
    console.error('Failed to create Stagehand session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Navigate to a URL using Stagehand
 */
export async function stagehandNavigate(
  input: z.infer<typeof NavigateInputSchema>,
): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'User not authenticated',
      };
    }

    // Validate input
    const validatedInput = NavigateInputSchema.parse(input);

    // Initialize Stagehand
    const { stagehand, cleanup } = await initializeStagehand(
      validatedInput.sessionId,
    );

    try {
      // Navigate to URL
      await navigateToUrl(stagehand, validatedInput.url, {
        timeout: validatedInput.timeout,
      });

      return {
        success: true,
        message: `Successfully navigated to ${validatedInput.url}`,
      };
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error('Navigation failed:', error);
    return {
      success: false,
      message: 'Navigation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Perform an action on a web page using Stagehand
 */
export async function stagehandAct(
  input: z.infer<typeof ActionInputSchema>,
): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'User not authenticated',
      };
    }

    // Validate input
    const validatedInput = ActionInputSchema.parse(input);

    // Initialize Stagehand
    const { stagehand, cleanup } = await initializeStagehand(
      validatedInput.sessionId,
    );

    try {
      // Perform action
      await performAction(stagehand, {
        action: validatedInput.action,
        variables: validatedInput.variables,
      });

      return {
        success: true,
        message: `Successfully performed action: ${validatedInput.action}`,
      };
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error('Action failed:', error);
    return {
      success: false,
      message: 'Action failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract data from a web page using Stagehand
 */
export async function stagehandExtract<T = any>(
  input: z.infer<typeof ExtractInputSchema>,
): Promise<ExtractResult<T>> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Validate input
    const validatedInput = ExtractInputSchema.parse(input);

    // Initialize Stagehand
    const { stagehand, cleanup } = await initializeStagehand(
      validatedInput.sessionId,
    );

    try {
      // Extract data
      const data = await extractData<T>(stagehand, {
        instruction: validatedInput.instruction,
        schema: validatedInput.schema,
      });

      return {
        success: true,
        data,
      };
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error('Extraction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Observe possible actions on a web page using Stagehand
 */
export async function stagehandObserve(
  input: z.infer<typeof ObserveInputSchema>,
): Promise<ObserveResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Validate input
    const validatedInput = ObserveInputSchema.parse(input);

    // Initialize Stagehand
    const { stagehand, cleanup } = await initializeStagehand(
      validatedInput.sessionId,
    );

    try {
      // Observe actions
      const actions = await observeActions(stagehand, {
        instruction: validatedInput.instruction,
      });

      return {
        success: true,
        actions,
      };
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error('Observation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Take a screenshot using Stagehand
 */
export async function stagehandScreenshot(
  input: z.infer<typeof ScreenshotInputSchema>,
): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'User not authenticated',
      };
    }

    // Validate input
    const validatedInput = ScreenshotInputSchema.parse(input);

    // Initialize Stagehand
    const { stagehand, cleanup } = await initializeStagehand(
      validatedInput.sessionId,
    );

    try {
      // Take screenshot
      await takeScreenshot(stagehand, validatedInput.path);

      return {
        success: true,
        message: `Screenshot saved to ${validatedInput.path}`,
      };
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error('Screenshot failed:', error);
    return {
      success: false,
      message: 'Screenshot failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
