import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'ai-chatbot' });

  // Only set up signal handlers in Node.js runtime (not during build or in edge runtime)
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    typeof process !== 'undefined' &&
    process.env.NODE_ENV !== 'production'
  ) {
    console.log(
      '🔧 Setting up graceful shutdown handlers for main application...',
    );

    // Dynamically import to avoid pulling in Node.js modules during build
    import('./lib/db/cleanup')
      .then(({ setupGracefulShutdown }) => {
        setupGracefulShutdown();
        console.log(
          '✅ Main application graceful shutdown handlers registered',
        );
      })
      .catch((error) => {
        console.warn('⚠️ Could not set up graceful shutdown handlers:', error);
      });
  }
}
