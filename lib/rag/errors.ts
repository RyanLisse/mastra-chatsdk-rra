/**
 * Custom error classes for RAG document processing
 */

export class RAGError extends Error {
  public readonly code: string;
  public readonly stage?: string;
  public readonly documentId?: string;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    options: {
      stage?: string;
      documentId?: string;
      recoverable?: boolean;
      cause?: Error;
    } = {},
  ) {
    super(message);
    this.name = 'RAGError';
    this.code = code;
    this.stage = options.stage;
    this.documentId = options.documentId;
    this.recoverable = options.recoverable ?? false;

    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export class ValidationError extends RAGError {
  constructor(message: string, documentId?: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', {
      stage: 'parsing',
      documentId,
      recoverable: false,
      cause,
    });
    this.name = 'ValidationError';
  }
}

export class ProcessingError extends RAGError {
  constructor(
    message: string,
    stage: string,
    documentId?: string,
    recoverable = false,
    cause?: Error,
  ) {
    super(message, 'PROCESSING_ERROR', {
      stage,
      documentId,
      recoverable,
      cause,
    });
    this.name = 'ProcessingError';
  }
}

export class EmbeddingError extends RAGError {
  public readonly retryCount: number;

  constructor(
    message: string,
    retryCount: number,
    documentId?: string,
    cause?: Error,
  ) {
    super(message, 'EMBEDDING_ERROR', {
      stage: 'embedding',
      documentId,
      recoverable: true,
      cause,
    });
    this.name = 'EmbeddingError';
    this.retryCount = retryCount;
  }
}

export class DatabaseError extends RAGError {
  constructor(
    message: string,
    stage: string,
    documentId?: string,
    cause?: Error,
  ) {
    super(message, 'DATABASE_ERROR', {
      stage,
      documentId,
      recoverable: true,
      cause,
    });
    this.name = 'DatabaseError';
  }
}

export class FileError extends RAGError {
  public readonly fileSize?: number;
  public readonly fileType?: string;

  constructor(
    message: string,
    documentId?: string,
    options: {
      fileSize?: number;
      fileType?: string;
      cause?: Error;
    } = {},
  ) {
    super(message, 'FILE_ERROR', {
      stage: 'upload',
      documentId,
      recoverable: false,
      cause: options.cause,
    });
    this.name = 'FileError';
    this.fileSize = options.fileSize;
    this.fileType = options.fileType;
  }
}

/**
 * Error recovery strategies
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Retry decorator with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: Error) => void,
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on the last attempt
      if (attempt > maxRetries) {
        break;
      }

      // Don't retry non-recoverable errors
      if (error instanceof RAGError && !error.recoverable) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay,
      );

      // Call retry callback if provided
      onRetry?.(attempt, error as Error);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry attempts failed with no error details');
}

/**
 * Circuit breaker pattern for external service calls
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ProcessingError(
          'Circuit breaker is OPEN - too many recent failures',
          'circuit_breaker',
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

/**
 * Error reporting and logging utilities
 */
export interface ErrorReport {
  documentId?: string;
  stage?: string;
  error: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
  context: {
    timestamp: string;
    userId?: string;
    filename?: string;
    fileSize?: number;
    metadata?: Record<string, unknown>;
  };
  recoverable: boolean;
  retryCount?: number;
}

export function createErrorReport(
  error: Error,
  context: {
    documentId?: string;
    userId?: string;
    filename?: string;
    fileSize?: number;
    metadata?: Record<string, unknown>;
  },
): ErrorReport {
  const report: ErrorReport = {
    documentId: context.documentId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context: {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      filename: context.filename,
      fileSize: context.fileSize,
      metadata: context.metadata,
    },
    recoverable: false,
  };

  if (error instanceof RAGError) {
    report.stage = error.stage;
    report.error.code = error.code;
    report.recoverable = error.recoverable;
  }

  if (error instanceof EmbeddingError) {
    report.retryCount = error.retryCount;
  }

  return report;
}

/**
 * Error logger with different severity levels
 */
export function logError(report: ErrorReport): void {
  console.error('[RAG_ERROR]', JSON.stringify(report, null, 2));
}

export function logWarn(
  message: string,
  context?: Record<string, unknown>,
): void {
  console.warn(
    '[RAG_WARN]',
    message,
    context ? JSON.stringify(context, null, 2) : '',
  );
}

export function logInfo(
  message: string,
  context?: Record<string, unknown>,
): void {
  console.info(
    '[RAG_INFO]',
    message,
    context ? JSON.stringify(context, null, 2) : '',
  );
}

export function logDebug(
  message: string,
  context?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug(
      '[RAG_DEBUG]',
      message,
      context ? JSON.stringify(context, null, 2) : '',
    );
  }
}

/**
 * Health check utilities
 */
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

export async function checkEmbeddingServiceHealth(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Simple health check - try to generate embedding for small text
    const { embed } = await import('ai');
    const { createCohere } = await import('@ai-sdk/cohere');

    const cohere = createCohere({ apiKey: process.env.COHERE_API_KEY || '' });
    const model = cohere.embedding('embed-english-v3.0');

    await embed({
      model,
      value: 'health check',
    });

    return {
      service: 'cohere-embedding',
      status: 'healthy',
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      service: 'cohere-embedding',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    };
  }
}

export async function checkDatabaseHealth(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Skip database health check in test environment
    if (process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT === 'true') {
      return {
        service: 'postgres',
        status: 'degraded',
        responseTime: Date.now() - start,
        error: 'Database health check skipped in test environment',
        lastChecked: new Date().toISOString(),
      };
    }

    const { db } = await import('@vercel/postgres');
    const client = await db.connect();

    try {
      await client.sql`SELECT 1`;
      client.release();

      return {
        service: 'postgres',
        status: 'healthy',
        responseTime: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    return {
      service: 'postgres',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    };
  }
}
