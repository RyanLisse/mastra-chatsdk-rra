#!/usr/bin/env bun
/**
 * Cleanup script for removing old Neon test branches
 * Used by Makefile commands and CI/CD pipelines
 */

import { createNeonBranchManager } from '../lib/db/neon-branch-manager';
import { config } from 'dotenv';

// Load environment
config({ path: '.env.local' });

interface CleanupOptions {
  dryRun?: boolean;
  maxAge?: number; // in hours
  pattern?: string;
  ciOnly?: boolean;
}

async function cleanupNeonTestBranches(options: CleanupOptions = {}) {
  const manager = createNeonBranchManager();

  try {
    console.log('🔍 Validating Neon setup...');
    await manager.validateSetup();

    console.log('📋 Listing branches...');
    const branches = await manager.listBranches();

    const maxAgeMs = (options.maxAge || 24) * 60 * 60 * 1000; // Default 24 hours
    const cutoffTime = new Date(Date.now() - maxAgeMs);

    // Filter branches based on criteria
    const branchesToDelete = branches.filter((branch) => {
      // Skip primary and protected branches
      if (branch.primary || branch.protected) {
        return false;
      }

      // Check pattern matching
      const matchesPattern = options.pattern
        ? branch.name.includes(options.pattern)
        : branch.name.includes('test') || branch.name.startsWith('test-');

      if (!matchesPattern) {
        return false;
      }

      // CI-only mode
      if (options.ciOnly && !branch.name.includes('ci-test')) {
        return false;
      }

      // Check age
      const branchAge = new Date(branch.created_at);
      return branchAge < cutoffTime;
    });

    if (branchesToDelete.length === 0) {
      console.log('✅ No branches match cleanup criteria');
      return { deleted: [], errors: [] };
    }

    console.log(`🧹 Found ${branchesToDelete.length} branches to clean up:`);
    branchesToDelete.forEach((branch) => {
      const age = Math.round(
        (Date.now() - new Date(branch.created_at).getTime()) / (1000 * 60 * 60),
      );
      console.log(`  🗑️  ${branch.name} (${age}h old)`);
    });

    if (options.dryRun) {
      console.log('🔍 Dry run - no branches will be deleted');
      return { deleted: [], errors: [] };
    }

    // Confirm deletion
    if (process.stdin.isTTY) {
      const confirm = prompt(
        `Delete ${branchesToDelete.length} branches? (y/N): `,
      );
      if (confirm?.toLowerCase() !== 'y') {
        console.log('❌ Cleanup cancelled');
        return { deleted: [], errors: [] };
      }
    }

    console.log('🗑️  Deleting branches...');
    const deleted: string[] = [];
    const errors: Array<{ branch: string; error: string }> = [];

    for (const branch of branchesToDelete) {
      try {
        await manager.deleteBranch(branch.name, undefined, true);
        deleted.push(branch.name);
        console.log(`✅ Deleted: ${branch.name}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ branch: branch.name, error: errorMsg });
        console.error(`❌ Failed to delete ${branch.name}: ${errorMsg}`);
      }
    }

    console.log(
      `✅ Cleanup completed: ${deleted.length} deleted, ${errors.length} errors`,
    );

    return { deleted, errors };
  } catch (error) {
    console.error('❌ Failed to cleanup Neon test branches:', error);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: CleanupOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--max-age':
        options.maxAge = Number.parseInt(args[++i]);
        break;
      case '--pattern':
        options.pattern = args[++i];
        break;
      case '--ci-only':
        options.ciOnly = true;
        break;
      case '--help':
        console.log(`
Cleanup Neon Test Branches

Usage: bun run scripts/cleanup-neon-test-branches.ts [options]

Options:
  --dry-run            Show what would be deleted without deleting
  --max-age HOURS      Maximum age in hours (default: 24)
  --pattern TEXT       Custom pattern to match branch names
  --ci-only            Only delete CI test branches
  --help               Show this help

Examples:
  bun run scripts/cleanup-neon-test-branches.ts --dry-run
  bun run scripts/cleanup-neon-test-branches.ts --max-age 1 --ci-only
  bun run scripts/cleanup-neon-test-branches.ts --pattern "test-feature"
        `);
        process.exit(0);
    }
  }

  cleanupNeonTestBranches(options);
}

export { cleanupNeonTestBranches };
