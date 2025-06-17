import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({
  path: '.env.local',
});

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log('⏳ Running migrations...');

  const start = Date.now();

  try {
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    const end = Date.now();
    console.log('✅ Migrations completed in', end - start, 'ms');
  } catch (error: any) {
    // Check if the error is due to existing tables/schema
    const errorMessage = error?.message || '';
    const errorCode = error?.cause?.code || '';

    if (errorCode === '42P07' || errorMessage.includes('already exists')) {
      console.log('ℹ️  Database tables already exist, skipping migration');
      const end = Date.now();
      console.log('✅ Migration check completed in', end - start, 'ms');
    } else {
      // Re-throw if it's a different error
      throw error;
    }
  } finally {
    await connection.end();
  }

  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
