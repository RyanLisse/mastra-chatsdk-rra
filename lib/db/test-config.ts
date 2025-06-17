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

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DatabaseConnectionManager } from './connection-manager';
import {
  type NeonBranchManager,
  createNeonBranchManager,
  extractProjectIdFromConnectionString,
  extractBranchNameFromConnectionString,
  type NeonBranch,
} from './neon-branch-manager';
import { initializeTestEnvironment } from './env-manager';

// Load test environment configuration with branch-specific overrides
if (process.env.NODE_ENV === 'test') {
  initializeTestEnvironment();
} else {
  config({ path: '.env.local' });
}

export interface TestDatabaseConfig {
  url: string;
  isTestBranch: boolean;
  branchName?: string;
  projectId?: string;
  neonBranchManager?: NeonBranchManager;
  isTemporaryBranch?: boolean;
}

export interface DatabaseTestSetup {
  db: PostgresJsDatabase;
  connection: postgres.Sql;
  cleanup: () => Promise<void>;
  reset: () => Promise<void>;
  seed: () => Promise<void>;
  config: TestDatabaseConfig;
  createTestBranch?: (testName: string) => Promise<{
    branch: NeonBranch;
    connectionString: string;
    cleanup: () => Promise<void>;
  }>;
  cleanupTestBranches?: (dryRun?: boolean) => Promise<string[]>;
}

/**
 * Validates that we're using a proper test database configuration
 */
export function validateTestDatabaseConfig(): TestDatabaseConfig {
  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!postgresUrl) {
    throw new Error(
      'POSTGRES_URL or DATABASE_URL environment variable is required for testing',
    );
  }

  if (
    postgresUrl.includes('your-test-postgres-url-here') ||
    postgresUrl.includes('your-test-database-url-here')
  ) {
    throw new Error(
      'Test database URL is not configured. Please set up a proper test database connection.',
    );
  }

  // Check if this is a Neon database URL
  const isNeonDatabase =
    postgresUrl.includes('neon.tech') || postgresUrl.includes('.neon.tech');

  // Check if this is a Neon test branch URL
  const isNeonTestBranch =
    isNeonDatabase &&
    (postgresUrl.includes('-test-') ||
      postgresUrl.includes('test.') ||
      postgresUrl.includes('/test'));

  // Extract branch name and project ID using helper functions
  let branchName: string | undefined;
  let projectId: string | undefined;
  let neonBranchManager: NeonBranchManager | undefined;

  if (isNeonDatabase) {
    branchName =
      extractBranchNameFromConnectionString(postgresUrl) || undefined;
    projectId = extractProjectIdFromConnectionString(postgresUrl) || undefined;

    // Initialize Neon branch manager if API key is available
    const neonApiKey = process.env.NEON_API_KEY;
    if (neonApiKey) {
      try {
        neonBranchManager = createNeonBranchManager({
          apiKey: neonApiKey,
          defaultProjectId: projectId,
        });
      } catch (error) {
        console.warn('⚠️  Could not initialize Neon branch manager:', error);
      }
    } else if (isNeonDatabase) {
      console.log(
        '💡 NEON_API_KEY not set. Branch management features will be unavailable.',
      );
    }
  }

  // Ensure we're not accidentally using production database
  if (
    !isNeonTestBranch &&
    !postgresUrl.includes('test') &&
    !postgresUrl.includes('localhost')
  ) {
    console.warn(
      '⚠️  WARNING: Database URL does not appear to be a test database. Please ensure you are using a test database.',
    );
  }

  return {
    url: postgresUrl,
    isTestBranch: isNeonTestBranch,
    branchName,
    projectId,
    neonBranchManager,
    isTemporaryBranch: false,
  };
}

/**
 * Creates a test database connection with proper configuration
 */
export async function createTestDatabase(): Promise<DatabaseTestSetup> {
  const config = validateTestDatabaseConfig();

  console.log(
    `🔧 Setting up test database${config.isTestBranch ? ` (Neon branch: ${config.branchName})` : ''}`,
  );

  // Validate Neon setup if available
  if (config.neonBranchManager) {
    try {
      await config.neonBranchManager.validateSetup();
      console.log('✅ Neon branch manager validated successfully');
    } catch (error) {
      console.warn('⚠️  Neon branch manager validation failed:', error);
      // Continue without branch management features
    }
  }

  // Create connection with test-specific settings
  const connection = postgres(config.url, {
    max: 10, // Limit connections for testing
    idle_timeout: 20, // Close idle connections quickly
    max_lifetime: 1800, // 30 minutes max connection lifetime
    prepare: false, // Disable prepared statements for better test isolation
    debug: process.env.DEBUG_SQL === 'true',
  });

  const db = drizzle(connection);

  // Health check
  try {
    await connection`SELECT 1`;
  } catch (error) {
    await connection.end();
    throw new Error(`Failed to connect to test database: ${error}`);
  }

  const cleanup = async () => {
    console.log('🧹 Cleaning up test database connection');
    try {
      // Graceful shutdown with timeout
      await connection.end({ timeout: 10 });
    } catch (error) {
      console.error('Error during connection cleanup:', error);
      // Force close if graceful shutdown fails
      try {
        await connection.end({ timeout: 1 });
      } catch (forceError) {
        console.error('Error during forced connection cleanup:', forceError);
      }
    }
  };

  const reset = async () => {
    console.log('🔄 Resetting test database');

    // Clean up test data while preserving schema
    await db.execute(sql`
      -- Clean up test data in reverse dependency order
      DELETE FROM "Vote_v2" WHERE "chatId" IN (
        SELECT id FROM "Chat" WHERE "userId" IN (
          SELECT id FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%'
        )
      );
      
      DELETE FROM "Vote" WHERE "chatId" IN (
        SELECT id FROM "Chat" WHERE "userId" IN (
          SELECT id FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%'
        )
      );
      
      DELETE FROM "Message_v2" WHERE "chatId" IN (
        SELECT id FROM "Chat" WHERE "userId" IN (
          SELECT id FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%'
        )
      );
      
      DELETE FROM "Message" WHERE "chatId" IN (
        SELECT id FROM "Chat" WHERE "userId" IN (
          SELECT id FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%'
        )
      );
      
      DELETE FROM "Suggestion" WHERE "userId" IN (
        SELECT id FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%'
      );
      
      DELETE FROM "Document" WHERE "userId" IN (
        SELECT id FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%'
      );
      
      DELETE FROM "DocumentProcessing" WHERE "userId" IN (
        SELECT id FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%'
      );
      
      DELETE FROM "DocumentChunk" WHERE "documentId" IN (
        SELECT id FROM "DocumentProcessing" WHERE "userId" IN (
          SELECT id FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%'
        )
      );
      
      DELETE FROM "Stream" WHERE "chatId" IN (
        SELECT id FROM "Chat" WHERE "userId" IN (
          SELECT id FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%'
        )
      );
      
      DELETE FROM "Chat" WHERE "userId" IN (
        SELECT id FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%'
      );
      
      DELETE FROM "User" WHERE email LIKE '%@test.%' OR email LIKE '%@playwright.%';
      
      -- Clean up chat sessions table if it exists
      DELETE FROM chat_sessions WHERE session_id LIKE 'test-%' OR session_id LIKE '%test%';
    `);

    console.log('✅ Test database reset completed');
  };

  const seed = async () => {
    console.log('🌱 Seeding test database with RoboRail sample data');

    // Create test users
    const testUsers = await db.execute(sql`
      INSERT INTO "User" (id, email, password) VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'test-operator@roborail.com', 'test-hash'),
      ('550e8400-e29b-41d4-a716-446655440002', 'test-maintenance@roborail.com', 'test-hash'),
      ('550e8400-e29b-41d4-a716-446655440003', 'test-supervisor@roborail.com', 'test-hash')
      ON CONFLICT (id) DO NOTHING
      RETURNING id, email;
    `);

    // Create test chats
    await db.execute(sql`
      INSERT INTO "Chat" (id, "createdAt", title, "userId", visibility) VALUES
      ('550e8400-e29b-41d4-a716-446655440010', NOW(), 'RoboRail Startup Procedures', '550e8400-e29b-41d4-a716-446655440001', 'private'),
      ('550e8400-e29b-41d4-a716-446655440011', NOW(), 'Safety Protocols Discussion', '550e8400-e29b-41d4-a716-446655440002', 'private'),
      ('550e8400-e29b-41d4-a716-446655440012', NOW(), 'Maintenance Schedule', '550e8400-e29b-41d4-a716-446655440003', 'public')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Create sample messages for testing
    await db.execute(sql`
      INSERT INTO "Message_v2" (id, "chatId", role, parts, attachments, "createdAt") VALUES
      (
        '550e8400-e29b-41d4-a716-446655440020',
        '550e8400-e29b-41d4-a716-446655440010',
        'user',
        '[{"type": "text", "text": "How do I start the RoboRail machine?"}]',
        '[]',
        NOW() - INTERVAL '5 minutes'
      ),
      (
        '550e8400-e29b-41d4-a716-446655440021',
        '550e8400-e29b-41d4-a716-446655440010',
        'assistant',
        '[{"type": "text", "text": "To start the RoboRail machine, follow these steps:\\n1. Ensure the area is clear of personnel\\n2. Check emergency stop buttons are functional\\n3. Verify power connections are secure\\n4. Press the green START button on the main control panel"}]',
        '[]',
        NOW() - INTERVAL '4 minutes'
      ),
      (
        '550e8400-e29b-41d4-a716-446655440022',
        '550e8400-e29b-41d4-a716-446655440011',
        'user',
        '[{"type": "text", "text": "What safety equipment is required?"}]',
        '[]',
        NOW() - INTERVAL '3 minutes'
      ),
      (
        '550e8400-e29b-41d4-a716-446655440023',
        '550e8400-e29b-41d4-a716-446655440011',
        'assistant',
        '[{"type": "text", "text": "Required safety equipment includes:\\n- Safety glasses or goggles\\n- Steel-toed boots\\n- Hard hat\\n- High-visibility vest\\n- Cut-resistant gloves for maintenance work"}]',
        '[]',
        NOW() - INTERVAL '2 minutes'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Create sample documents for RAG testing
    await db.execute(sql`
      INSERT INTO "DocumentProcessing" (
        id, 
        "documentId", 
        filename, 
        status, 
        stage, 
        progress, 
        "chunkCount", 
        metadata, 
        "userId",
        "createdAt",
        "updatedAt"
      ) VALUES
      (
        '550e8400-e29b-41d4-a716-446655440030',
        '550e8400-e29b-41d4-a716-446655440040',
        'roborail-manual.pdf',
        'completed',
        'completed',
        100,
        15,
        '{"type": "manual", "version": "2.1", "language": "en"}',
        '550e8400-e29b-41d4-a716-446655440001',
        NOW(),
        NOW()
      ),
      (
        '550e8400-e29b-41d4-a716-446655440031',
        '550e8400-e29b-41d4-a716-446655440041',
        'safety-procedures.pdf',
        'completed',
        'completed',
        100,
        8,
        '{"type": "safety", "version": "1.5", "language": "en"}',
        '550e8400-e29b-41d4-a716-446655440002',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Create sample document chunks for RAG testing
    await db.execute(sql`
      INSERT INTO "DocumentChunk" (content, "documentId", filename, "chunkIndex", metadata, "createdAt") VALUES
      (
        'RoboRail System Overview: The RoboRail automated railway system is designed for high-efficiency cargo transport. The system consists of multiple rail segments, automated loading stations, and central control systems.',
        '550e8400-e29b-41d4-a716-446655440040',
        'roborail-manual.pdf',
        1,
        '{"section": "overview", "page": 1}',
        NOW()
      ),
      (
        'Startup Procedures: Before operating the RoboRail system, ensure all safety protocols are followed. Check that emergency stop buttons are accessible and functional. Verify that the track is clear of obstacles.',
        '550e8400-e29b-41d4-a716-446655440040',
        'roborail-manual.pdf',
        2,
        '{"section": "startup", "page": 3}',
        NOW()
      ),
      (
        'Safety Requirements: All personnel must wear appropriate personal protective equipment (PPE) when working near the RoboRail system. This includes safety glasses, steel-toed boots, and high-visibility clothing.',
        '550e8400-e29b-41d4-a716-446655440041',
        'safety-procedures.pdf',
        1,
        '{"section": "ppe", "page": 1}',
        NOW()
      ),
      (
        'Emergency Procedures: In case of system malfunction, immediately press the nearest emergency stop button. Evacuate personnel from the danger zone and contact the maintenance team immediately.',
        '550e8400-e29b-41d4-a716-446655440041',
        'safety-procedures.pdf',
        2,
        '{"section": "emergency", "page": 2}',
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Ensure pgvector extension is available for embeddings
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
      console.log('✅ pgvector extension enabled');
    } catch (error) {
      console.warn(
        '⚠️  Could not enable pgvector extension (may require superuser privileges):',
        error,
      );
    }

    console.log('✅ Test database seeded with RoboRail sample data');
  };

  // Branch management functions (only available if Neon branch manager is configured)
  const createTestBranch = config.neonBranchManager
    ? async (testName: string) => {
        if (!config.neonBranchManager) {
          throw new Error('Neon branch manager not available');
        }
        return config.neonBranchManager.createTempTestDatabase(
          testName,
          config.projectId,
        );
      }
    : undefined;

  const cleanupTestBranches = config.neonBranchManager
    ? async (dryRun = false) => {
        if (!config.neonBranchManager) {
          throw new Error('Neon branch manager not available');
        }
        return config.neonBranchManager.cleanupTestBranches(
          config.projectId,
          dryRun,
        );
      }
    : undefined;

  return {
    db,
    connection,
    cleanup,
    reset,
    seed,
    config,
    createTestBranch,
    cleanupTestBranches,
  };
}

/**
 * Runs database migrations in test environment
 */
export async function runTestMigrations(): Promise<void> {
  const config = validateTestDatabaseConfig();

  console.log('⏳ Running test database migrations...');

  const connection = postgres(config.url, {
    max: 1,
    idle_timeout: 20,
    max_lifetime: 1800,
    prepare: false,
  });
  const db = drizzle(connection);

  try {
    const start = Date.now();
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    const end = Date.now();

    console.log(`✅ Test migrations completed in ${end - start}ms`);
  } catch (error) {
    // Check if this is a "relation already exists" error, which is acceptable in test environments
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = JSON.stringify(error);
    const hasAlreadyExistsError =
      errorMessage.includes('already exists') ||
      errorString.includes('already exists') ||
      errorString.includes('42P07') || // PostgreSQL error code for "relation already exists"
      (errorMessage.includes('relation') && errorMessage.includes('exists'));

    if (hasAlreadyExistsError) {
      console.log(
        '⚠️ Some database objects already exist, skipping problematic migrations',
      );
      console.log(`✅ Test migrations completed (with existing objects)`);
    } else {
      console.error('❌ Test migration failed:', error);
      throw error;
    }
  } finally {
    await connection.end();
  }
}

/**
 * Global test database setup for use in test files
 */
let globalTestDb: DatabaseTestSetup | null = null;
let isInitializing = false;
const TEST_CONNECTION_NAME = 'global-test';

export async function getGlobalTestDatabase(): Promise<DatabaseTestSetup> {
  // Prevent multiple concurrent initializations
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing && !globalTestDb) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  if (!globalTestDb) {
    isInitializing = true;
    try {
      globalTestDb = await createTestDatabase();

      // Ensure migrations are run
      await runTestMigrations();

      // Seed with initial data
      await globalTestDb.seed();
    } finally {
      isInitializing = false;
    }
  }

  return globalTestDb;
}

export async function cleanupGlobalTestDatabase(): Promise<void> {
  if (globalTestDb) {
    try {
      await globalTestDb.cleanup();
    } catch (error) {
      console.error('Error during global test database cleanup:', error);
    } finally {
      globalTestDb = null;
      isInitializing = false;
    }
  }

  // Also cleanup via connection manager
  await DatabaseConnectionManager.closeConnection(TEST_CONNECTION_NAME);
}

/**
 * Force cleanup of global test database (useful for emergency cleanup)
 */
export async function forceCleanupGlobalTestDatabase(): Promise<void> {
  isInitializing = false;
  if (globalTestDb) {
    try {
      // Force close connections without waiting for graceful shutdown
      if (globalTestDb.connection) {
        await globalTestDb.connection.end({ timeout: 5 });
      }
    } catch (error) {
      console.error('Error during force cleanup:', error);
    } finally {
      globalTestDb = null;
    }
  }

  // Force cleanup via connection manager
  await DatabaseConnectionManager.closeConnection(TEST_CONNECTION_NAME);
}

/**
 * Check if global test database is initialized
 */
export function isGlobalTestDatabaseInitialized(): boolean {
  return globalTestDb !== null;
}

/**
 * Get connection stats for monitoring
 */
export async function getConnectionStats(): Promise<{
  isConnected: boolean;
  totalConnections?: number;
  idleConnections?: number;
}> {
  if (!globalTestDb?.connection) {
    return { isConnected: false };
  }

  try {
    await globalTestDb.connection`SELECT 1`;
    return {
      isConnected: true,
      // Note: postgres-js doesn't expose detailed connection pool stats
      // but we can at least verify connectivity
    };
  } catch (error) {
    return { isConnected: false };
  }
}
