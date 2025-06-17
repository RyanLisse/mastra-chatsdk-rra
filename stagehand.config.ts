const config: any = {
  env: 'LOCAL', // or "BROWSERBASE"
  apiKey: process.env.STAGEHAND_API_KEY,
  projectId: process.env.STAGEHAND_PROJECT_ID,
  verbose: process.env.CI === 'true' ? 0 : 1,
  debugDom: process.env.CI !== 'true',
  headless: process.env.CI === 'true',
  domSettleTimeoutMs: 15_000, // Reduced from 30s to prevent hanging

  // Additional timeout configurations to prevent hanging
  timeout: 45_000, // Global timeout for all operations
  navigationTimeout: 30_000, // Navigation timeout
  actionTimeout: 10_000, // Individual action timeout

  // Browser launch options for stability
  launchOptions: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
    timeout: 30_000,
  },

  // Enable graceful cleanup on exit
  enableCleanup: true,
};

export default config;
