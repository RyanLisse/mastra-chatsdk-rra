import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Use test environment for Stagehand tests
config({
  path: '.env.test',
});

// Set PLAYWRIGHT environment variable for test runner
process.env.PLAYWRIGHT = 'true';

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  /* No global setup/teardown for Stagehand to avoid server-only conflicts */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  timeout: 90 * 1000,
  expect: {
    timeout: 15 * 1000,
  },
  projects: [
    {
      name: 'stagehand',
      testMatch: /stagehand\/.*.test.ts/,
      use: {
        ...devices['Desktop Chrome'],
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
      timeout: 90 * 1000,
    },
  ],
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    ignoreHTTPSErrors: true,
    env: {
      NODE_ENV: 'development',
      PLAYWRIGHT: 'true',
    },
  },
});
