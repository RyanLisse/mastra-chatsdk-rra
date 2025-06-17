/**
 * Centralized database connection management for the application
 *
 * This module provides a unified approach to managing PostgreSQL connections
 * across different parts of the application with proper pooling and cleanup.
 */

// Only import server-only in actual server environments (not in Playwright tests)
// Skip server-only for Playwright tests completely
if (
  typeof window === 'undefined' &&
  process.env.PLAYWRIGHT !== 'true' &&
  process.env.NODE_ENV !== 'test'
) {
  try {
    require('server-only');
  } catch (e) {
    // Ignore if server-only fails to load in test environments
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

// biome-ignore lint/complexity/noStaticOnlyClass: Connection manager singleton pattern
export class DatabaseConnectionManager {
  private static instances: Map<
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
  static getConnection(
    name: string,
    config: ConnectionConfig,
  ): {
    db: PostgresJsDatabase;
    connection: postgres.Sql;
  } {
    const existing = DatabaseConnectionManager.instances.get(name);
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

    DatabaseConnectionManager.instances.set(name, { db, connection, config });

    return { db, connection };
  }

  /**
   * Test connectivity for a specific connection
   */
  static async testConnection(name: string): Promise<boolean> {
    const instance = DatabaseConnectionManager.instances.get(name);
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
  static async closeConnection(name: string): Promise<void> {
    const instance = DatabaseConnectionManager.instances.get(name);
    if (!instance) {
      return;
    }

    try {
      await instance.connection.end();
    } catch (error) {
      console.error(`Error closing connection ${name}:`, error);
    } finally {
      DatabaseConnectionManager.instances.delete(name);
    }
  }

  /**
   * Close all connections
   */
  static async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(
      DatabaseConnectionManager.instances.keys(),
    ).map((name) => DatabaseConnectionManager.closeConnection(name));

    await Promise.all(closePromises);
  }

  /**
   * Get statistics about active connections
   */
  static getConnectionStats(): {
    activeConnections: number;
    connectionNames: string[];
  } {
    return {
      activeConnections: DatabaseConnectionManager.instances.size,
      connectionNames: Array.from(DatabaseConnectionManager.instances.keys()),
    };
  }

  /**
   * Force cleanup all connections (useful for emergency cleanup)
   */
  static async forceCleanup(): Promise<void> {
    const forceClosePromises = Array.from(
      DatabaseConnectionManager.instances.entries(),
    ).map(async ([name, instance]) => {
      try {
        await instance.connection.end({ timeout: 5 });
      } catch (error) {
        console.error(`Error during force cleanup of ${name}:`, error);
      }
    });

    await Promise.all(forceClosePromises);
    DatabaseConnectionManager.instances.clear();
  }

  /**
   * Health check for all connections
   */
  static async healthCheck(): Promise<{
    healthy: string[];
    unhealthy: string[];
  }> {
    const results = await Promise.allSettled(
      Array.from(DatabaseConnectionManager.instances.keys()).map(
        async (name) => ({
          name,
          healthy: await DatabaseConnectionManager.testConnection(name),
        }),
      ),
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
