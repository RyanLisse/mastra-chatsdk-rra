import { generateDummyPassword } from './db/utils';

export const isProductionEnvironment = process.env.NODE_ENV === 'production';
export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT ||
    process.env.NODE_ENV === 'test',
);

// Debug logging for test environment detection
if (process.env.NODE_ENV === 'development') {
  console.log('Environment detection:', {
    NODE_ENV: process.env.NODE_ENV,
    PLAYWRIGHT_TEST_BASE_URL: process.env.PLAYWRIGHT_TEST_BASE_URL,
    PLAYWRIGHT: process.env.PLAYWRIGHT,
    CI_PLAYWRIGHT: process.env.CI_PLAYWRIGHT,
    isTestEnvironment,
  });
}

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();
