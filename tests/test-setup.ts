// tests/test-setup.ts
import { afterEach, beforeEach } from 'bun:test';

// Global test environment setup
beforeEach(() => {
  // Set test environment variables
  (process.env as any).NODE_ENV = 'test';
  process.env.PLAYWRIGHT = 'false';
  process.env.TEST_MODE = 'true';

  // Mock console.error to avoid noise in test output
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Filter out expected database connection errors in test environment
    const message = args.join(' ');
    if (
      message.includes('POSTGRES_URL is still set to placeholder') ||
      message.includes('Failed to clear session') ||
      message.includes('Database connection failed')
    ) {
      // Suppress these expected errors in test environment
      return;
    }
    originalConsoleError(...args);
  };
});

afterEach(() => {
  // Clean up any test artifacts
  if (global.gc) {
    global.gc();
  }
});

// Export test utilities
export const mockAgent = {
  generate: async (prompt: string) => ({
    text: 'Mock response',
    content: 'Mock response content',
  }),
  getSessionId: () => 'mock-session-id',
  clearMemory: async () => {
    // Mock clearMemory that doesn't fail
    console.log('Mock clearMemory called');
  },
};

export const createMockDatabaseConfig = () => ({
  isTestBranch: true,
  branchName: 'test-branch',
  isValid: false, // Mark as invalid to skip actual DB operations
});

export const skipDatabaseTests = (
  reason = 'Database not configured for tests',
) => {
  console.log(`⚠️  Skipping database-dependent test: ${reason}`);
  return true;
};
