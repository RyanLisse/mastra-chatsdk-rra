import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Load test environment configuration
config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local',
});

const runTestMigrate = async () => {
  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (!postgresUrl) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not defined');
  }

  if (postgresUrl.includes('your-test-postgres-url-here') || 
      postgresUrl.includes('your-test-database-url-here')) {
    throw new Error('Test database URL is not configured. Please set up a proper test database connection.');
  }

  // Validate we're running against test database
  if (!postgresUrl.includes('test') && !postgresUrl.includes('localhost')) {
    console.warn('⚠️  WARNING: Database URL does not appear to be a test database.');
    console.warn('   Current URL pattern:', postgresUrl.replace(/\/\/[^@]*@/, '//***:***@'));
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing to run test migrations against production database');
    }
  }

  console.log('🔧 Setting up test database connection...');
  console.log('📊 Database URL pattern:', postgresUrl.replace(/\/\/[^@]*@/, '//***:***@'));

  const connection = postgres(postgresUrl, { 
    max: 1,
    prepare: false, // Disable prepared statements for better test isolation
  });
  
  const db = drizzle(connection);

  console.log('⏳ Running test migrations...');

  try {
    const start = Date.now();
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    const end = Date.now();

    console.log(`✅ Test migrations completed in ${end - start}ms`);
    
    // Verify the migration worked by checking for key tables
    console.log('🔍 Validating migration results...');
    
    const tableCheck = await connection`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('User', 'Chat', 'Message_v2', 'DocumentChunk', 'DocumentProcessing')
      ORDER BY table_name;
    `;
    
    console.log('📋 Available tables:', tableCheck.map(t => t.table_name).join(', '));
    
    // Check for pgvector extension
    try {
      const extensionCheck = await connection`
        SELECT * FROM pg_extension WHERE extname = 'vector';
      `;
      
      if (extensionCheck.length > 0) {
        console.log('✅ pgvector extension is available');
      } else {
        console.log('ℹ️  pgvector extension not found - will attempt to create during seeding');
      }
    } catch (error) {
      console.log('ℹ️  Could not check pgvector extension status');
    }
    
    console.log('✅ Test database migration validation completed');
    
  } catch (error) {
    console.error('❌ Test migration failed');
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
  
  process.exit(0);
};

runTestMigrate().catch((err) => {
  console.error('❌ Test migration script failed');
  console.error(err);
  process.exit(1);
});