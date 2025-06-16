import { chromium, type FullConfig } from '@playwright/test';
import { config } from 'dotenv';
import {
  validateTestDatabaseConfig,
  runTestMigrations,
  createTestDatabase,
} from '../lib/db/test-config';

// Load test environment
config({ path: '.env.test' });

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...');

  try {
    // Step 1: Validate test database configuration
    console.log('1️⃣ Validating test database configuration...');
    const dbConfig = validateTestDatabaseConfig();
    console.log(
      `   ✅ Using ${dbConfig.isTestBranch ? 'Neon test branch' : 'test database'}`,
    );
    if (dbConfig.branchName) {
      console.log(`   🌿 Branch: ${dbConfig.branchName}`);
    }

    // Step 2: Ensure migrations are up to date
    console.log('2️⃣ Ensuring test database migrations are current...');
    await runTestMigrations();
    console.log('   ✅ Migrations completed');

    // Step 3: Set up test database with sample data
    console.log('3️⃣ Preparing test database...');
    const testDb = await createTestDatabase();

    // Only seed if specifically requested or if database is empty
    if (process.env.TEST_DB_SEED_SAMPLE_DATA === 'true') {
      console.log('   🌱 Seeding sample data...');
      await testDb.seed();
      console.log('   ✅ Sample data seeded');
    }

    // Step 4: Verify database is ready
    console.log('4️⃣ Verifying test database readiness...');
    const stats = await testDb.connection`
      SELECT 
        (SELECT COUNT(*) FROM "User") as users,
        (SELECT COUNT(*) FROM "Chat") as chats,
        (SELECT COUNT(*) FROM "Message_v2") as messages;
    `;

    console.log(
      `   📊 Database contains: ${stats[0].users} users, ${stats[0].chats} chats, ${stats[0].messages} messages`,
    );
    console.log('   ✅ Database is ready for testing');

    // Clean up setup connection
    await testDb.cleanup();

    // Step 5: Pre-warm browser for faster test execution
    if (process.env.CI !== 'true') {
      console.log('5️⃣ Pre-warming browser...');
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      // Quick page load to warm up browser
      try {
        await page.goto('about:blank');
        console.log('   ✅ Browser pre-warmed');
      } catch (error) {
        console.log('   ⚠️  Browser pre-warm failed (non-critical)');
      }

      await browser.close();
    }

    console.log('🎉 Global setup completed successfully!');
    console.log('📋 Test environment is ready for E2E testing\n');
  } catch (error) {
    console.error('❌ Global setup failed:', error);

    // Provide helpful error messages
    if (error instanceof Error && error.message?.includes('connect')) {
      console.error('\n🔧 Database connection failed:');
      console.error(
        '   1. Check your .env.test file has the correct POSTGRES_URL',
      );
      console.error('   2. Ensure your test database/branch is accessible');
      console.error('   3. Verify your database credentials');
      console.error(
        '   4. Run: bun run db:test:validate for detailed diagnosis',
      );
    } else if (error instanceof Error && error.message?.includes('migration')) {
      console.error('\n🔧 Database migration failed:');
      console.error('   1. Ensure your test database is properly set up');
      console.error('   2. Check database permissions');
      console.error('   3. Run: bun run db:test:migrate manually');
    }

    throw error;
  }
}

export default globalSetup;
