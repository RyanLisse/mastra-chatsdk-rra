import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import { config } from 'dotenv';

// Flag to track if we've set up Playwright-level signal handlers
let playwrightSignalHandlersRegistered = false;

// Always use .env.test for Playwright tests
config({
  path: '.env.test',
});

/**
 * Register Playwright-level signal handlers
 * These ensure cleanup happens even if individual test processes don't handle signals
 */
function registerPlaywrightSignalHandlers(): void {
  if (playwrightSignalHandlersRegistered) {
    return;
  }

  playwrightSignalHandlersRegistered = true;
  console.log('🔧 Registering Playwright config signal handlers...');

  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Playwright config received ${signal} - cleaning up...`);

    try {
      // Cleanup handled by global setup/teardown to avoid server-only import issues
      console.log('✅ Playwright config cleanup completed');
    } catch (error) {
      console.error('❌ Error during Playwright config cleanup:', error);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

  console.log('✅ Playwright config signal handlers registered');
}

// Register signal handlers
registerPlaywrightSignalHandlers();

// Validate test database is configured
if (
  !process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL.includes('your-test-postgres-url-here')
) {
  console.error('❌ Test database not configured!');
  console.error('Please set up your test database URL in .env.test');
  console.error('Run: bun run db:test:setup for setup instructions');
  console.error('');
  console.error('💡 Quick setup options:');
  console.error('1. Copy .env.test.example to .env.test and configure');
  console.error(
    '2. Use local PostgreSQL: postgresql://postgres:password@localhost:5432/mastra_chat_test',
  );
  console.error('3. Use Neon test branch: https://console.neon.tech/');
  process.exit(1);
}

/* Use process.env.PORT by default and fallback to port 3000 */
const PORT = process.env.PORT || 3000;

/**
 * Set webServer.url and use.baseURL with the location
 * of the WebServer respecting the correct set port
 */
const baseURL = `http://localhost:${PORT}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup'),
  globalTeardown: require.resolve('./tests/global-teardown'),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : 8,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
  },

  /* Configure global timeout for each test */
  timeout: 30 * 1000, // 30 seconds - aggressive timeout to prevent hanging
  expect: {
    timeout: 10 * 1000, // 10 seconds - fast failure detection
  },

  /* Configure projects */
  projects: [
    {
      name: 'e2e',
      testMatch: /e2e\/.*.test.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'routes',
      testMatch: /routes\/.*.test.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'stagehand',
      testMatch: /stagehand\/.*.test.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Stagehand-specific settings for better reliability
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
        },
      },
      // Stagehand tests run longer due to AI processing
      timeout: 60 * 1000, // 60 seconds per test
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'bun run dev',
    url: `${baseURL}`,
    timeout: 60 * 1000, // Reduced to 60s to fail faster if server won't start
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    // Add health check endpoint
    ignoreHTTPSErrors: true,
    env: {
      NODE_ENV: 'test',
      PLAYWRIGHT: 'true',
    },
  },
});
