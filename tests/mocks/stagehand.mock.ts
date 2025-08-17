/**
 * Mock implementation of Stagehand for testing
 * This ensures tests run even when the actual library is unavailable
 */

export class MockStagehand {
  page: any;
  browser: any;
  private _isInitialized = false;

  constructor(config?: any) {
    // Mock browser and page objects
    this.browser = {
      isConnected: () => true,
      close: async () => {},
    };

    this.page = {
      isClosed: () => false,
      close: async () => {},
      goto: async (url: string, options?: any) => {
        console.log(`[MockStagehand] Navigating to: ${url}`);
        return Promise.resolve();
      },
      title: async () => 'Example Domain',
      locator: (selector: string) => ({
        textContent: async () => 'Example Domain',
        isVisible: async () => true,
        first: () => ({
          isVisible: async () => true,
          click: async () => {},
          fill: async (text: string) => {},
          press: async (key: string) => {},
        }),
        scrollIntoViewIfNeeded: async () => {},
        all: async () => [{ textContent: async () => 'Mock Model' }],
      }),
      waitForTimeout: async (timeout: number) => {},
      screenshot: async (options?: any) => {},
      url: () => 'http://localhost:3000',
      waitForSelector: async (selector: string, options?: any) => {},
      act: async (action: string | { action: string; variables?: any }) => {
        console.log(`[MockStagehand] Acting: ${typeof action === 'string' ? action : action.action}`);
        return Promise.resolve();
      },
    };
  }

  async init() {
    this._isInitialized = true;
    console.log('[MockStagehand] Initialized');
    return Promise.resolve();
  }

  async close() {
    this._isInitialized = false;
    console.log('[MockStagehand] Closed');
    return Promise.resolve();
  }
}

// Export as both named and default for compatibility
export const Stagehand = MockStagehand;
export default MockStagehand;