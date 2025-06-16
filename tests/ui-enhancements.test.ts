import { describe, it, expect } from 'bun:test';

describe('UI Enhancement Components', () => {
  it('should export loading indicator components', async () => {
    const loadingModule = await import('../components/ui/loading-indicators');

    expect(loadingModule.LoadingDots).toBeDefined();
    expect(loadingModule.ThinkingIndicator).toBeDefined();
    expect(loadingModule.ProgressSpinner).toBeDefined();
    expect(loadingModule.ProcessingIndicator).toBeDefined();
    expect(loadingModule.LoadingOverlay).toBeDefined();
  });

  it('should export error boundary components', async () => {
    const errorModule = await import('../components/ui/error-boundary');

    expect(errorModule.ErrorBoundary).toBeDefined();
    expect(errorModule.ChatErrorBoundary).toBeDefined();
    expect(errorModule.useErrorBoundary).toBeDefined();
  });

  it('should export global error handler components', async () => {
    const globalErrorModule = await import(
      '../components/ui/global-error-handler'
    );

    expect(globalErrorModule.GlobalErrorProvider).toBeDefined();
    expect(globalErrorModule.useGlobalError).toBeDefined();
    expect(globalErrorModule.createChatError).toBeDefined();
    expect(globalErrorModule.createNetworkError).toBeDefined();
    expect(globalErrorModule.createTimeoutError).toBeDefined();
  });

  it('should create proper error objects', async () => {
    const { createChatError, createNetworkError } = await import(
      '../components/ui/global-error-handler'
    );

    const chatError = createChatError('Test error message');
    expect(chatError.type).toBe('api');
    expect(chatError.title).toBe('Chat Error');
    expect(chatError.message).toBe('Test error message');
    expect(chatError.retryable).toBe(false);
    expect(chatError.dismissible).toBe(true);

    const networkError = createNetworkError();
    expect(networkError.type).toBe('network');
    expect(networkError.title).toBe('Connection Error');
    expect(networkError.retryable).toBe(false);
    expect(networkError.dismissible).toBe(true);
  });
});
