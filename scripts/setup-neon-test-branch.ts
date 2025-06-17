#!/usr/bin/env bun
/**
 * Setup script for creating a Neon test branch and configuring environment
 * Used by Makefile commands and CI/CD pipelines
 */

import { createNeonBranchManager } from '../lib/db/neon-branch-manager';
import { writeFileSync, } from 'node:fs';
import { config } from 'dotenv';

// Load environment
config({ path: '.env.local' });

interface SetupOptions {
  branchName?: string;
  cleanup?: boolean;
  ciMode?: boolean;
  writeEnvFile?: boolean;
}

async function setupNeonTestBranch(options: SetupOptions = {}) {
  const manager = createNeonBranchManager();
  
  try {
    console.log('🔍 Validating Neon setup...');
    await manager.validateSetup();
    
    // Generate branch name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const branchName = options.branchName || 
      (options.ciMode ? `ci-test-${timestamp}` : `test-run-${timestamp}`);
    
    console.log(`🌿 Creating test branch: ${branchName}`);
    const branch = await manager.createBranch({
      name: branchName,
    });
    
    console.log(`✅ Branch created: ${branch.name}`);
    
    // Get connection string
    console.log('🔗 Getting connection string...');
    const connectionString = await manager.getBranchConnectionString(branch.name);
    
    console.log(`✅ Connection string obtained`);
    
    // Write to environment file if requested
    if (options.writeEnvFile) {
      const envFile = options.ciMode ? '.env.ci' : '.env.test';
      const envContent = `DATABASE_URL_TEST=${connectionString}\nNEON_TEST_BRANCH=${branch.name}\n`;
      
      writeFileSync(envFile, envContent);
      console.log(`📝 Environment file written: ${envFile}`);
    }
    
    // Output for Makefile consumption
    console.log(`BRANCH_NAME=${branch.name}`);
    console.log(`CONNECTION_STRING=${connectionString}`);
    
    return {
      branchName: branch.name,
      connectionString,
      cleanup: async () => {
        if (options.cleanup) {
          console.log(`🗑️  Cleaning up branch: ${branch.name}`);
          await manager.deleteBranch(branch.name, undefined, true);
          console.log(`✅ Branch deleted: ${branch.name}`);
        }
      },
    };
    
  } catch (error) {
    console.error('❌ Failed to setup Neon test branch:', error);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SetupOptions = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--branch-name':
        options.branchName = args[++i];
        break;
      case '--cleanup':
        options.cleanup = true;
        break;
      case '--ci-mode':
        options.ciMode = true;
        break;
      case '--write-env':
        options.writeEnvFile = true;
        break;
      case '--help':
        console.log(`
Setup Neon Test Branch

Usage: bun run scripts/setup-neon-test-branch.ts [options]

Options:
  --branch-name NAME    Custom branch name
  --cleanup            Enable automatic cleanup
  --ci-mode            CI/CD mode (uses ci-test prefix)
  --write-env          Write environment file
  --help               Show this help

Examples:
  bun run scripts/setup-neon-test-branch.ts --write-env
  bun run scripts/setup-neon-test-branch.ts --ci-mode --cleanup
        `);
        process.exit(0);
    }
  }
  
  setupNeonTestBranch(options);
}

export { setupNeonTestBranch };