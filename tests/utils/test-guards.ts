// tests/utils/test-guards.ts
// Utility functions for test guards and skipping

export const skipIfDatabaseUnavailable = (test: any) => {
  // No longer skip - we'll use mock database if real one is unavailable
  return false;
};

export const skipIfPlaywrightUnavailable = (test: any) => {
  // Playwright tests should run in all environments
  return false;
};

export const skipIfStagehandUnavailable = (test: any) => {
  // No longer skip - we'll use mock if real Stagehand is unavailable
  return false;
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
