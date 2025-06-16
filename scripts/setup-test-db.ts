#!/usr/bin/env tsx

import { config } from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import readline from 'node:readline';

// Load environment variables
config({ path: '.env.test' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('🚀 RoboRail Assistant E2E Test Database Setup');
  console.log('==========================================\n');

  // Check if .env.test exists
  const envTestPath = join(process.cwd(), '.env.test');
  const envExamplePath = join(process.cwd(), '.env.test.example');

  if (!existsSync(envTestPath)) {
    console.log('📋 Creating .env.test file...');

    if (existsSync(envExamplePath)) {
      const exampleContent = readFileSync(envExamplePath, 'utf8');
      writeFileSync(envTestPath, exampleContent);
      console.log('✅ Created .env.test from example file');
    } else {
      console.log('❌ .env.test.example not found. Creating basic template...');

      const basicTemplate = `
# Test environment configuration
NODE_ENV=test
PLAYWRIGHT=true

# Test database URL - REQUIRED
POSTGRES_URL=your-test-postgres-url-here
DATABASE_URL=your-test-postgres-url-here

# Authentication
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=test-auth-secret

# AI Services (required for tests)
OPENAI_API_KEY=your-openai-key-here
COHERE_API_KEY=your-cohere-key-here

# Test configuration
TEST_MODE=true
SKIP_AUTH_IN_TESTS=true
ENABLE_TEST_ROUTES=true
`.trim();

      writeFileSync(envTestPath, basicTemplate);
      console.log('✅ Created basic .env.test template');
    }
  }

  console.log('\n🔧 Test Database Configuration');
  console.log('Choose your test database setup:\n');
  console.log('1. 🏠 Local PostgreSQL');
  console.log('2. ☁️  Neon Database (recommended)');
  console.log('3. 📝 Manual configuration');
  console.log('4. ❌ Skip database setup');

  const choice = await question('\nEnter your choice (1-4): ');

  switch (choice) {
    case '1':
      await setupLocalPostgres();
      break;
    case '2':
      await setupNeonDatabase();
      break;
    case '3':
      await manualConfiguration();
      break;
    case '4':
      console.log('⏭️  Skipping database setup...');
      break;
    default:
      console.log('❌ Invalid choice. Please run the script again.');
      break;
  }

  console.log('\n🔑 API Keys Configuration');
  await setupApiKeys();

  console.log('\n✅ Setup complete! Next steps:');
  console.log('1. Review your .env.test file');
  console.log('2. Run: bun run db:test:migrate');
  console.log('3. Run: bun run test:e2e');

  rl.close();
}

async function setupLocalPostgres() {
  console.log('\n🏠 Local PostgreSQL Setup');
  console.log('Requirements:');
  console.log('- PostgreSQL installed and running');
  console.log('- Test database created');
  console.log('- pgvector extension (optional)');

  const host = (await question('Database host (localhost): ')) || 'localhost';
  const port = (await question('Database port (5432): ')) || '5432';
  const username = (await question('Username (postgres): ')) || 'postgres';
  const password = await question('Password: ');
  const database =
    (await question('Test database name (mastra_chat_test): ')) ||
    'mastra_chat_test';

  const postgresUrl = `postgresql://${username}:${password}@${host}:${port}/${database}`;

  console.log('\n📝 Generated connection string:');
  console.log(postgresUrl);

  updateEnvFile('POSTGRES_URL', postgresUrl);
  updateEnvFile('DATABASE_URL', postgresUrl);

  console.log('\n✅ Local PostgreSQL configuration saved');
  console.log('💡 Make sure to create the test database:');
  console.log(`   CREATE DATABASE ${database};`);
}

async function setupNeonDatabase() {
  console.log('\n☁️  Neon Database Setup');
  console.log('1. Go to https://console.neon.tech/');
  console.log('2. Create a project or use existing one');
  console.log('3. Create a new branch for testing');
  console.log('4. Copy the connection string\n');

  const connectionString = await question(
    'Paste your Neon connection string: ',
  );

  if (connectionString?.includes('neon.tech')) {
    updateEnvFile('POSTGRES_URL', connectionString);
    updateEnvFile('DATABASE_URL', connectionString);

    console.log('✅ Neon database configuration saved');

    // Check if it's a test branch
    if (
      connectionString.includes('test') ||
      connectionString.includes('-test-')
    ) {
      console.log('✅ Detected test branch - good practice!');
    } else {
      console.log('⚠️  Consider using a dedicated test branch for isolation');
    }
  } else {
    console.log('❌ Invalid Neon connection string. Please try again.');
  }
}

async function manualConfiguration() {
  console.log('\n📝 Manual Configuration');
  console.log('Enter your test database connection string:');
  console.log('Format: postgresql://user:pass@host:port/database');

  const connectionString = await question('Connection string: ');

  if (
    connectionString.startsWith('postgresql://') ||
    connectionString.startsWith('postgres://')
  ) {
    updateEnvFile('POSTGRES_URL', connectionString);
    updateEnvFile('DATABASE_URL', connectionString);
    console.log('✅ Database configuration saved');
  } else {
    console.log('❌ Invalid connection string format');
  }
}

async function setupApiKeys() {
  console.log('API keys are required for E2E tests that use AI features');

  // OpenAI API Key
  const openaiKey = await question('OpenAI API Key (sk-...): ');
  if (openaiKey.startsWith('sk-')) {
    updateEnvFile('OPENAI_API_KEY', openaiKey);
    console.log('✅ OpenAI API key saved');
  } else if (openaiKey) {
    console.log('⚠️  OpenAI API key should start with "sk-"');
  }

  // Cohere API Key
  const cohereKey = await question('Cohere API Key (required for RAG tests): ');
  if (cohereKey) {
    updateEnvFile('COHERE_API_KEY', cohereKey);
    console.log('✅ Cohere API key saved');
  }

  // Optional: Blob storage for upload tests
  const blobToken = await question(
    'Vercel Blob Token (optional, for upload tests): ',
  );
  if (blobToken) {
    updateEnvFile('BLOB_READ_WRITE_TOKEN', blobToken);
    console.log('✅ Blob storage token saved');
  }
}

function updateEnvFile(key: string, value: string) {
  const envPath = join(process.cwd(), '.env.test');
  let content = readFileSync(envPath, 'utf8');

  const keyPattern = new RegExp(`^${key}=.*$`, 'm');

  if (keyPattern.test(content)) {
    // Update existing key
    content = content.replace(keyPattern, `${key}=${value}`);
  } else {
    // Add new key
    content += `\n${key}=${value}`;
  }

  writeFileSync(envPath, content);
}

main().catch(console.error);
