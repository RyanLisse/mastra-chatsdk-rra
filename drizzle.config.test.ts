import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load test environment configuration
config({
  path: '.env.test',
});

// Validate test database configuration
const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!postgresUrl) {
  throw new Error(
    'POSTGRES_URL or DATABASE_URL is not defined in test environment',
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

// Warn if URL doesn't look like a test database
if (!postgresUrl.includes('test') && !postgresUrl.includes('localhost')) {
  console.warn(
    '⚠️  WARNING: Database URL does not appear to be a test database.',
  );
  console.warn(
    '   Current URL pattern:',
    postgresUrl.replace(/\/\/[^@]*@/, '//***:***@'),
  );
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: postgresUrl,
  },
  verbose: true,
  strict: true,
  // Test-specific settings
  migrations: {
    prefix: 'timestamp',
  },
});
