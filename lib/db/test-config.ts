import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Load test environment configuration
config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local',
});

export interface TestDatabaseConfig {
  url: string;
  isTestBranch: boolean;
  branchName?: string;
  projectId?: string;
}

export interface DatabaseTestSetup {
  db: PostgresJsDatabase;
  connection: postgres.Sql;
  cleanup: () => Promise<void>;
  reset: () => Promise<void>;
  seed: () => Promise<void>;
}

/**
 * Validates that we're using a proper test database configuration
 */
export function validateTestDatabaseConfig(): TestDatabaseConfig {
  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (!postgresUrl) {
    throw new Error('POSTGRES_URL or DATABASE_URL environment variable is required for testing');
  }

  if (postgresUrl.includes('your-test-postgres-url-here') || 
      postgresUrl.includes('your-test-database-url-here')) {
    throw new Error('Test database URL is not configured. Please set up a proper test database connection.');
  }

  // Check if this is a Neon test branch URL
  const isNeonTestBranch = postgresUrl.includes('neon.tech') && 
                          (postgresUrl.includes('-test-') || 
                           postgresUrl.includes('test.') ||
                           postgresUrl.includes('/test'));

  // Extract branch name if available
  let branchName: string | undefined;
  let projectId: string | undefined;

  if (isNeonTestBranch) {
    const url = new URL(postgresUrl);
    const hostParts = url.hostname.split('.');
    
    // Neon URLs typically follow: branch-name-project-id.region.neon.tech
    if (hostParts.length >= 4 && hostParts[hostParts.length - 2] === 'neon') {
      const branchProject = hostParts[0];
      const parts = branchProject.split('-');
      if (parts.length >= 3) {
        branchName = parts.slice(0, -2).join('-'); // Everything except last 2 parts
        projectId = parts.slice(-2).join('-'); // Last 2 parts
      }
    }
  }

  // Ensure we're not accidentally using production database
  if (!isNeonTestBranch && !postgresUrl.includes('test') && !postgresUrl.includes('localhost')) {
    console.warn('⚠️  WARNING: Database URL does not appear to be a test database. Please ensure you are using a test database.');
  }

  return {
    url: postgresUrl,
    isTestBranch: isNeonTestBranch,
    branchName,
    projectId
  };
}

/**
 * Creates a test database connection with proper configuration
 */
export async function createTestDatabase(): Promise<DatabaseTestSetup> {
  const config = validateTestDatabaseConfig();
  
  console.log(`🔧 Setting up test database${config.isTestBranch ? ` (Neon branch: ${config.branchName})` : ''}`);

  // Create connection with test-specific settings
  const connection = postgres(config.url, {
    max: 10, // Limit connections for testing
    idle_timeout: 20, // Close idle connections quickly
    max_lifetime: 60 * 30, // 30 minutes max connection lifetime
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
    await connection.end();
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
      console.warn('⚠️  Could not enable pgvector extension (may require superuser privileges):', error);
    }

    console.log('✅ Test database seeded with RoboRail sample data');
  };

  return {
    db,
    connection,
    cleanup,
    reset,
    seed
  };
}

/**
 * Runs database migrations in test environment
 */
export async function runTestMigrations(): Promise<void> {
  const config = validateTestDatabaseConfig();
  
  console.log('⏳ Running test database migrations...');
  
  const connection = postgres(config.url, { max: 1 });
  const db = drizzle(connection);

  try {
    const start = Date.now();
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    const end = Date.now();
    
    console.log(`✅ Test migrations completed in ${end - start}ms`);
  } catch (error) {
    console.error('❌ Test migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

/**
 * Global test database setup for use in test files
 */
let globalTestDb: DatabaseTestSetup | null = null;

export async function getGlobalTestDatabase(): Promise<DatabaseTestSetup> {
  if (!globalTestDb) {
    globalTestDb = await createTestDatabase();
    
    // Ensure migrations are run
    await runTestMigrations();
    
    // Seed with initial data
    await globalTestDb.seed();
  }
  
  return globalTestDb;
}

export async function cleanupGlobalTestDatabase(): Promise<void> {
  if (globalTestDb) {
    await globalTestDb.cleanup();
    globalTestDb = null;
  }
}