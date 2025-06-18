import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import { config } from 'dotenv';

// Always use .env.test for Playwright tests
config({
  path: '.env.test',
});

// Import our test setup to ensure no tests are skipped
import './tests/setup-tests';

// Note: Signal handlers are managed by global-setup.ts and global-teardown.ts
// to prevent conflicts and ensure proper cleanup hierarchy

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
  /* Reduced workers to prevent connection conflicts and browser resource issues */
  workers: process.env.CI ? 1 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording */
    video: 'retain-on-failure',
  },

  /* Configure global timeout for each test */
  timeout: 45 * 1000, // 45 seconds - balanced for normal tests
  expect: {
    timeout: 10 * 1000, // 10 seconds - reasonable for most assertions
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
            '--disable-blink-features=AutomationControlled',
            '--force-color-profile=srgb',
          ],
          // Faster browser startup
          handleSIGINT: false,
          handleSIGTERM: false,
          handleSIGHUP: false,
        },
        // Prevent navigation timeout issues
        navigationTimeout: 20000,
        actionTimeout: 15000,
      },
      // Stagehand tests run longer due to AI processing
      timeout: 60 * 1000, // 60 seconds per test - more headroom
      retries: 0, // No retries to prevent hanging
      // Run Stagehand tests serially within the project
      fullyParallel: false,
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
    timeout: 45 * 1000, // 45s to start server
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    ignoreHTTPSErrors: true,
    env: {
      NODE_ENV: 'test',
      PLAYWRIGHT_TEST: 'true',
    },
  },

  /* Add graceful shutdown handling */
  globalTimeout: 5 * 60 * 1000, // 5 minutes for entire test suite - prevent hanging
});
