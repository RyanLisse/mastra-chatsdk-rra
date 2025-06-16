#!/usr/bin/env tsx

import { config } from 'dotenv';
import { validateTestDatabaseConfig, createTestDatabase } from '../lib/db/test-config';

// Load test environment configuration
config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local',
});

interface ValidationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

async function validateTestDatabase(): Promise<void> {
  console.log('🔍 Validating test database configuration and setup...\n');

  const results: ValidationResult[] = [];
  let testDb: any = null;

  try {
    // Phase 1: Configuration Validation
    console.log('📋 Phase 1: Configuration Validation');
    console.log('=====================================');

    try {
      const dbConfig = validateTestDatabaseConfig();
      results.push({
        category: 'Configuration',
        test: 'Database URL Configuration',
        status: 'PASS',
        message: 'Database URL is properly configured',
        details: {
          isTestBranch: dbConfig.isTestBranch,
          branchName: dbConfig.branchName,
          projectId: dbConfig.projectId
        }
      });

      if (dbConfig.isTestBranch) {
        console.log('   ✅ Using Neon test branch');
        console.log(`   🌿 Branch: ${dbConfig.branchName || 'auto-detected'}`);
      } else {
        console.log('   ⚠️  Not using Neon test branch - ensure this is a test database');
      }

    } catch (error) {
      results.push({
        category: 'Configuration',
        test: 'Database URL Configuration',
        status: 'FAIL',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    // Check environment variables
    const requiredEnvVars = ['POSTGRES_URL', 'OPENAI_API_KEY', 'COHERE_API_KEY'];
    const optionalEnvVars = ['BLOB_READ_WRITE_TOKEN', 'LANGSMITH_API_KEY'];

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar] && !process.env[envVar]?.includes('your-')) {
        results.push({
          category: 'Environment',
          test: `${envVar} Configuration`,
          status: 'PASS',
          message: `${envVar} is configured`
        });
      } else {
        results.push({
          category: 'Environment',
          test: `${envVar} Configuration`,
          status: 'FAIL',
          message: `${envVar} is not configured or contains placeholder`
        });
      }
    }

    for (const envVar of optionalEnvVars) {
      if (process.env[envVar] && !process.env[envVar]?.includes('your-')) {
        results.push({
          category: 'Environment',
          test: `${envVar} Configuration`,
          status: 'PASS',
          message: `${envVar} is configured`
        });
      } else {
        results.push({
          category: 'Environment',
          test: `${envVar} Configuration`,
          status: 'WARN',
          message: `${envVar} is not configured (optional)`
        });
      }
    }

    // Phase 2: Database Connection
    console.log('\n🔌 Phase 2: Database Connection');
    console.log('===============================');

    try {
      testDb = await createTestDatabase();
      results.push({
        category: 'Connection',
        test: 'Database Connection',
        status: 'PASS',
        message: 'Successfully connected to test database'
      });
      console.log('   ✅ Database connection established');
    } catch (error) {
      results.push({
        category: 'Connection',
        test: 'Database Connection',
        status: 'FAIL',
        message: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`
      });
      console.log(`   ❌ Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (testDb) {
      // Phase 3: Schema Validation
      console.log('\n📊 Phase 3: Schema Validation');
      console.log('=============================');

      try {
        const tables = await testDb.connection`
          SELECT table_name, table_type
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `;

        const expectedTables = [
          'User', 'Chat', 'Message_v2', 'Vote_v2', 'Document', 
          'DocumentChunk', 'DocumentProcessing', 'Suggestion', 'Stream'
        ];

        const foundTables = tables.map((t: any) => t.table_name);
        const missingTables = expectedTables.filter((t: string) => !foundTables.includes(t));
        const extraTables = foundTables.filter((t: string) => !expectedTables.includes(t) && !t.startsWith('drizzle'));

        if (missingTables.length === 0) {
          results.push({
            category: 'Schema',
            test: 'Required Tables',
            status: 'PASS',
            message: 'All required tables are present',
            details: { foundTables: foundTables.length }
          });
          console.log(`   ✅ Found ${foundTables.length} tables`);
        } else {
          results.push({
            category: 'Schema',
            test: 'Required Tables',
            status: 'FAIL',
            message: `Missing tables: ${missingTables.join(', ')}`,
            details: { missingTables, foundTables }
          });
          console.log(`   ❌ Missing tables: ${missingTables.join(', ')}`);
        }

        if (extraTables.length > 0) {
          console.log(`   ℹ️  Extra tables: ${extraTables.join(', ')}`);
        }

      } catch (error) {
        results.push({
          category: 'Schema',
          test: 'Schema Inspection',
          status: 'FAIL',
          message: `Failed to inspect schema: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      // Phase 4: Extension Validation
      console.log('\n🧩 Phase 4: Extension Validation');
      console.log('=================================');

      try {
        const vectorExtension = await testDb.connection`
          SELECT * FROM pg_extension WHERE extname = 'vector';
        `;

        if (vectorExtension.length > 0) {
          results.push({
            category: 'Extensions',
            test: 'pgvector Extension',
            status: 'PASS',
            message: 'pgvector extension is installed and available'
          });
          console.log('   ✅ pgvector extension is available');

          // Test vector operations
          try {
            await testDb.connection`
              SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector as distance;
            `;
            results.push({
              category: 'Extensions',
              test: 'Vector Operations',
              status: 'PASS',
              message: 'Vector operations are working correctly'
            });
            console.log('   ✅ Vector operations working');
          } catch (error) {
            results.push({
              category: 'Extensions',
              test: 'Vector Operations',
              status: 'FAIL',
              message: `Vector operations failed: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        } else {
          results.push({
            category: 'Extensions',
            test: 'pgvector Extension',
            status: 'WARN',
            message: 'pgvector extension not found - RAG features may not work'
          });
          console.log('   ⚠️  pgvector extension not found');
        }
      } catch (error) {
        results.push({
          category: 'Extensions',
          test: 'Extension Check',
          status: 'FAIL',
          message: `Failed to check extensions: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      // Phase 5: Data Operations
      console.log('\n📝 Phase 5: Data Operations');
      console.log('===========================');

      try {
        // Test basic CRUD operations
        const testUserId = `test-validation-${Date.now()}`;
        
        // Create
        await testDb.connection`
          INSERT INTO "User" (id, email, password) 
          VALUES (${testUserId}, 'validation@test.com', 'test-hash');
        `;

        // Read
        const users = await testDb.connection`
          SELECT * FROM "User" WHERE id = ${testUserId};
        `;

        // Update
        await testDb.connection`
          UPDATE "User" SET email = 'updated@test.com' WHERE id = ${testUserId};
        `;

        // Delete
        await testDb.connection`
          DELETE FROM "User" WHERE id = ${testUserId};
        `;

        if (users.length === 1) {
          results.push({
            category: 'Operations',
            test: 'CRUD Operations',
            status: 'PASS',
            message: 'All CRUD operations working correctly'
          });
          console.log('   ✅ CRUD operations working');
        } else {
          results.push({
            category: 'Operations',
            test: 'CRUD Operations',
            status: 'FAIL',
            message: 'CRUD operations failed validation'
          });
        }

      } catch (error) {
        results.push({
          category: 'Operations',
          test: 'CRUD Operations',
          status: 'FAIL',
          message: `CRUD operations failed: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      // Phase 6: Sample Data Validation
      console.log('\n🌱 Phase 6: Sample Data Validation');
      console.log('===================================');

      try {
        const sampleDataCounts = await testDb.connection`
          SELECT 
            (SELECT COUNT(*) FROM "User" WHERE email LIKE '%@roborail.com') as sample_users,
            (SELECT COUNT(*) FROM "Chat") as sample_chats,
            (SELECT COUNT(*) FROM "Message_v2") as sample_messages,
            (SELECT COUNT(*) FROM "DocumentChunk") as sample_chunks;
        `;

        const counts = sampleDataCounts[0];
        
        if (counts.sample_users > 0 && counts.sample_chats > 0 && counts.sample_messages > 0) {
          results.push({
            category: 'Sample Data',
            test: 'Sample Data Presence',
            status: 'PASS',
            message: 'Sample data is properly seeded',
            details: counts
          });
          console.log('   ✅ Sample data is available');
          console.log(`      Users: ${counts.sample_users}, Chats: ${counts.sample_chats}, Messages: ${counts.sample_messages}, Chunks: ${counts.sample_chunks}`);
        } else {
          results.push({
            category: 'Sample Data',
            test: 'Sample Data Presence',
            status: 'WARN',
            message: 'Sample data appears to be missing or incomplete',
            details: counts
          });
          console.log('   ⚠️  Sample data may be missing');
        }

      } catch (error) {
        results.push({
          category: 'Sample Data',
          test: 'Sample Data Check',
          status: 'FAIL',
          message: `Failed to check sample data: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      // Cleanup
      await testDb.cleanup();
    }

    // Phase 7: Results Summary
    console.log('\n📊 Validation Results Summary');
    console.log('=============================');

    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const warnCount = results.filter(r => r.status === 'WARN').length;

    console.log(`✅ PASSED: ${passCount}`);
    console.log(`❌ FAILED: ${failCount}`);
    console.log(`⚠️  WARNINGS: ${warnCount}`);
    console.log(`📋 TOTAL: ${results.length}`);

    if (failCount > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`   - ${result.category}: ${result.test}`);
        console.log(`     ${result.message}`);
      });
    }

    if (warnCount > 0) {
      console.log('\n⚠️  Warnings:');
      results.filter(r => r.status === 'WARN').forEach(result => {
        console.log(`   - ${result.category}: ${result.test}`);
        console.log(`     ${result.message}`);
      });
    }

    console.log('\n🎯 Recommendations:');
    
    if (failCount === 0) {
      console.log('   🎉 Your test database is properly configured and ready for testing!');
      console.log('   ✅ You can now run comprehensive E2E tests');
      console.log('   🚀 Execute: bun run test:e2e');
    } else {
      console.log('   🔧 Please address the failed tests above before running tests');
      console.log('   📖 Check the .env.test configuration guide');
      console.log('   🛠️  Run: bun run db:test:setup to fix common issues');
    }

    if (warnCount > 0) {
      console.log('   💡 Consider addressing warnings for optimal test experience');
    }

    // Exit with appropriate code
    process.exit(failCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  validateTestDatabase();
}

export { validateTestDatabase };