/**
 * Stagehand Configuration with Best Practices
 *
 * This configuration follows Stagehand best practices:
 * - Uses environment variables for all configuration
 * - Supports both LOCAL and BROWSERBASE environments
 * - Implements proper timeout management
 * - Includes browser stability options
 * - Provides type safety with TypeScript
 */

import { z } from 'zod';

// Configuration schema for validation
const StagehandConfigSchema = z.object({
  env: z.enum(['LOCAL', 'BROWSERBASE']).default('LOCAL'),
  apiKey: z.string().optional(),
  projectId: z.string().optional(),
  browserbaseSessionID: z.string().optional(),
  verbose: z.number().min(0).max(2).default(1),
  debugDom: z.boolean().default(false),
  headless: z.boolean().default(true),
  domSettleTimeoutMs: z.number().positive().default(30000),
  timeout: z.number().positive().default(60000),
  navigationTimeout: z.number().positive().default(30000),
  actionTimeout: z.number().positive().default(15000),
  enableCleanup: z.boolean().default(true),
  disablePino: z.boolean().default(false),
});

export type StagehandConfig = z.infer<typeof StagehandConfigSchema>;

/**
 * Get environment-specific Stagehand configuration
 */
function getStagehandConfig(): StagehandConfig {
  const isCI = process.env.CI === 'true';
  const isTest =
    process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT === 'true';

  // Parse environment variables with defaults
  const rawConfig = {
    env: (process.env.STAGEHAND_ENV as 'LOCAL' | 'BROWSERBASE') || 'LOCAL',
    apiKey: process.env.STAGEHAND_API_KEY || process.env.BROWSERBASE_API_KEY,
    projectId:
      process.env.STAGEHAND_PROJECT_ID || process.env.BROWSERBASE_PROJECT_ID,
    browserbaseSessionID: process.env.BROWSERBASE_SESSION_ID,
    verbose: isCI
      ? 0
      : Number.parseInt(process.env.STAGEHAND_VERBOSE || '1', 10),
    debugDom: isCI ? false : process.env.STAGEHAND_DEBUG_DOM === 'true',
    headless:
      isCI || isTest ? true : process.env.STAGEHAND_HEADLESS !== 'false',
    domSettleTimeoutMs: Number.parseInt(
      process.env.STAGEHAND_DOM_SETTLE_TIMEOUT || '30000',
      10,
    ),
    timeout: Number.parseInt(process.env.STAGEHAND_TIMEOUT || '60000', 10),
    navigationTimeout: Number.parseInt(
      process.env.STAGEHAND_NAVIGATION_TIMEOUT || '30000',
      10,
    ),
    actionTimeout: Number.parseInt(
      process.env.STAGEHAND_ACTION_TIMEOUT || '15000',
      10,
    ),
    enableCleanup: true,
    disablePino: isTest, // Disable Pino logging in tests
  };

  // Validate configuration
  const result = StagehandConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('Invalid Stagehand configuration:', result.error.format());
    throw new Error('Invalid Stagehand configuration');
  }

  return result.data;
}

/**
 * Get browser launch options for stability
 */
export function getBrowserLaunchOptions(config: StagehandConfig) {
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
  ];

  // Add additional args for CI environments
  if (process.env.CI === 'true') {
    baseArgs.push(
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // For CI stability
    );
  }

  return {
    args: baseArgs,
    timeout: 30000,
    headless: config.headless,
  };
}

// Export the configuration
const config = getStagehandConfig();
export default config;
