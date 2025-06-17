/**
 * Centralized database connection management for the application
 *
 * This module provides a unified approach to managing PostgreSQL connections
 * across different parts of the application with proper pooling and cleanup.
 */

// Only import server-only in actual server environments (not in tests)
// Skip server-only import entirely in test/Playwright environments
const isTestEnvironment =
  process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT === 'true';
const isClientSide = typeof window !== 'undefined';

if (!isTestEnvironment && !isClientSide) {
  try {
    require('server-only');
  } catch (error) {
    // Silently ignore server-only import errors in edge cases
  }
}

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export interface ConnectionConfig {
  url: string;
  max?: number;
  idle_timeout?: number;
  max_lifetime?: number;
  prepare?: boolean;
  debug?: boolean;
  onnotice?: () => void;
}

export namespace DatabaseConnectionManager {
  const instances: Map<
    string,
    {
      db: PostgresJsDatabase;
      connection: postgres.Sql;
      config: ConnectionConfig;
    }
  > = new Map();

  /**
   * Get or create a database connection with the specified configuration
   */
  export function getConnection(
    name: string,
    config: ConnectionConfig,
  ): {
    db: PostgresJsDatabase;
    connection: postgres.Sql;
  } {
    const existing = instances.get(name);
    if (existing) {
      return { db: existing.db, connection: existing.connection };
    }

    // Create new connection with pooling settings
    const connection = postgres(config.url, {
      max: config.max || 10,
      idle_timeout: config.idle_timeout || 20,
      max_lifetime: config.max_lifetime || 1800,
      prepare: config.prepare !== undefined ? config.prepare : false,
      debug: config.debug || false,
      onnotice: config.onnotice || (() => {}),
    });

    const db = drizzle(connection);

    instances.set(name, { db, connection, config });

    return { db, connection };
  }

  /**
   * Test connectivity for a specific connection
   */
  export async function testConnection(name: string): Promise<boolean> {
    const instance = instances.get(name);
    if (!instance) {
      return false;
    }

    try {
      await instance.db.execute(sql`SELECT 1`);
      return true;
    } catch (error) {
      console.error(`Database connection test failed for ${name}:`, error);
      return false;
    }
  }

  /**
   * Close a specific connection
   */
  export async function closeConnection(name: string): Promise<void> {
    const instance = instances.get(name);
    if (!instance) {
      return;
    }

    try {
      await instance.connection.end();
    } catch (error) {
      console.error(`Error closing connection ${name}:`, error);
    } finally {
      instances.delete(name);
    }
  }

  /**
   * Close all connections
   */
  export async function closeAllConnections(): Promise<void> {
    const closePromises = Array.from(instances.keys()).map((name) =>
      closeConnection(name),
    );

    await Promise.all(closePromises);
  }

  /**
   * Get statistics about active connections
   */
  export function getConnectionStats(): {
    activeConnections: number;
    connectionNames: string[];
  } {
    return {
      activeConnections: instances.size,
      connectionNames: Array.from(instances.keys()),
    };
  }

  /**
   * Force cleanup all connections (useful for emergency cleanup)
   */
  export async function forceCleanup(): Promise<void> {
    const forceClosePromises = Array.from(instances.entries()).map(
      async ([name, instance]) => {
        try {
          await instance.connection.end({ timeout: 5 });
        } catch (error) {
          console.error(`Error during force cleanup of ${name}:`, error);
        }
      },
    );

    await Promise.all(forceClosePromises);
    instances.clear();
  }

  /**
   * Health check for all connections
   */
  export async function healthCheck(): Promise<{
    healthy: string[];
    unhealthy: string[];
  }> {
    const results = await Promise.allSettled(
      Array.from(instances.keys()).map(async (name) => ({
        name,
        healthy: await testConnection(name),
      })),
    );

    const healthy: string[] = [];
    const unhealthy: string[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.healthy) {
          healthy.push(result.value.name);
        } else {
          unhealthy.push(result.value.name);
        }
      } else {
        // If the promise was rejected, consider it unhealthy
        unhealthy.push('unknown');
      }
    });

    return { healthy, unhealthy };
  }
}

/**
 * Convenience function to cleanup all database connections
 * Should be called during application shutdown or test teardown
 */
export async function cleanupAllDatabaseConnections(): Promise<void> {
  await DatabaseConnectionManager.closeAllConnections();
}

/**
 * Force cleanup all database connections
 * Should be used for emergency cleanup scenarios
 */
export async function forceCleanupAllDatabaseConnections(): Promise<void> {
  await DatabaseConnectionManager.forceCleanup();
}
