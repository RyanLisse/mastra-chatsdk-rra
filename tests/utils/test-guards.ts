// tests/utils/test-guards.ts
// Utility functions for test guards and skipping

export const skipIfDatabaseUnavailable = (test: any) => {
  const isDatabaseAvailable = () => {
    return (
      process.env.POSTGRES_URL &&
      !process.env.POSTGRES_URL.includes('your-test-postgres-url-here') &&
      !process.env.POSTGRES_URL.includes('placeholder')
    );
  };

  if (!isDatabaseAvailable()) {
    test.skip('Database not available for testing');
    return true;
  }
  return false;
};

export const skipIfPlaywrightUnavailable = (test: any) => {
  if (process.env.PLAYWRIGHT !== 'true') {
    test.skip('Playwright environment not configured');
    return true;
  }
  return false;
};

export const skipIfStagehandUnavailable = (test: any) => {
  try {
    const { Stagehand } = require('@browserbasehq/stagehand');
    if (typeof Stagehand !== 'function') {
      throw new Error('Stagehand class not available');
    }
    return false;
  } catch {
    test.skip('Stagehand not available');
    return true;
  }
};

export const createTimeoutWrapper = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out',
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
    ),
  ]);
};

export const safeCleanup = async (
  cleanupFn: () => Promise<void>,
  timeoutMs = 3000,
) => {
  try {
    await createTimeoutWrapper(cleanupFn(), timeoutMs, 'Cleanup timed out');
  } catch (error) {
    console.warn('Cleanup failed (expected in test environment):', error);
  }
};
