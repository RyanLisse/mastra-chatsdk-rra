/**
 * Environment Manager for Branch-Specific Configuration
 *
 * Handles loading and managing environment files with branch-specific overrides:
 * - .env.test (base test configuration)
 * - .env.test.branch (branch-specific overrides)
 * - .env.test.local (local developer overrides)
 */

// Only import server-only in actual server environments (not in tests)
// Skip server-only import entirely in test/Playwright environments
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT === 'true';
const isClientSide = typeof window !== 'undefined';

if (!isTestEnvironment && !isClientSide) {
  try {
    require('server-only');
  } catch (error) {
    // Silently ignore server-only import errors in edge cases
  }
}

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface EnvironmentConfig {
  base: Record<string, string>;
  branch?: Record<string, string>;
  local?: Record<string, string>;
  merged: Record<string, string>;
}

export class EnvironmentManager {
  private static instance: EnvironmentManager | null = null;
  private config: EnvironmentConfig | null = null;

  static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  /**
   * Load environment configuration with branch-specific overrides
   */
  loadEnvironment(basePath?: string): EnvironmentConfig {
    const rootPath = basePath || process.cwd();

    // Load base test environment
    const baseEnvPath = join(rootPath, '.env.test');
    const branchEnvPath = join(rootPath, '.env.test.branch');
    const localEnvPath = join(rootPath, '.env.test.local');

    const base = this.loadEnvFile(baseEnvPath);
    const branch = existsSync(branchEnvPath)
      ? this.loadEnvFile(branchEnvPath)
      : undefined;
    const local = existsSync(localEnvPath)
      ? this.loadEnvFile(localEnvPath)
      : undefined;

    // Merge configurations: base < branch < local
    const merged = {
      ...base,
      ...(branch || {}),
      ...(local || {}),
    };

    this.config = { base, branch, local, merged };

    // Apply to process.env
    Object.entries(merged).forEach(([key, value]) => {
      process.env[key] = value;
    });

    return this.config;
  }

  /**
   * Create branch-specific environment file
   */
  createBranchEnvironment(branchConfig: {
    branchName: string;
    databaseUrl: string;
    projectId?: string;
    parentBranch?: string;
  }): string {
    const branchEnvPath = join(process.cwd(), '.env.test.branch');

    const content = [
      '# Branch-specific test environment',
      `# Generated for branch: ${branchConfig.branchName}`,
      `# Created: ${new Date().toISOString()}`,
      '',
      `POSTGRES_URL=${branchConfig.databaseUrl}`,
      `DATABASE_URL=${branchConfig.databaseUrl}`,
      `TEST_BRANCH_NAME=${branchConfig.branchName}`,
      ...(branchConfig.projectId
        ? [`NEON_PROJECT_ID=${branchConfig.projectId}`]
        : []),
      ...(branchConfig.parentBranch
        ? [`TEST_BRANCH_PARENT=${branchConfig.parentBranch}`]
        : []),
      'NODE_ENV=test',
      'PLAYWRIGHT=true',
      '',
    ].join('\n');

    writeFileSync(branchEnvPath, content, 'utf-8');
    console.log(`✅ Created branch environment file: ${branchEnvPath}`);

    return branchEnvPath;
  }

  /**
   * Clean up branch-specific environment file
   */
  cleanupBranchEnvironment(): boolean {
    const branchEnvPath = join(process.cwd(), '.env.test.branch');

    if (existsSync(branchEnvPath)) {
      try {
        require('node:fs').unlinkSync(branchEnvPath);
        console.log(`🧹 Cleaned up branch environment file: ${branchEnvPath}`);
        return true;
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup branch environment file: ${error}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get current environment configuration
   */
  getConfig(): EnvironmentConfig | null {
    return this.config;
  }

  /**
   * Get effective environment value (after merging)
   */
  get(key: string): string | undefined {
    if (!this.config) {
      this.loadEnvironment();
    }
    return this.config?.merged[key] || process.env[key];
  }

  /**
   * Check if branch-specific configuration is active
   */
  hasBranchConfig(): boolean {
    return existsSync(join(process.cwd(), '.env.test.branch'));
  }

  /**
   * Get branch information from current environment
   */
  getBranchInfo(): {
    branchName?: string;
    databaseUrl?: string;
    projectId?: string;
    parentBranch?: string;
  } {
    if (!this.config) {
      this.loadEnvironment();
    }

    return {
      branchName: this.get('TEST_BRANCH_NAME'),
      databaseUrl: this.get('POSTGRES_URL') || this.get('DATABASE_URL'),
      projectId: this.get('NEON_PROJECT_ID'),
      parentBranch: this.get('TEST_BRANCH_PARENT'),
    };
  }

  private loadEnvFile(filePath: string): Record<string, string> {
    if (!existsSync(filePath)) {
      return {};
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const result: Record<string, string> = {};

      content.split('\n').forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            result[key.trim()] = valueParts.join('=').trim();
          }
        }
      });

      return result;
    } catch (error) {
      console.warn(
        `Warning: Failed to load environment file ${filePath}: ${error}`,
      );
      return {};
    }
  }
}

/**
 * Global environment manager instance
 */
export const envManager = EnvironmentManager.getInstance();

/**
 * Initialize environment with branch-specific overrides
 */
export function initializeTestEnvironment(
  basePath?: string,
): EnvironmentConfig {
  return envManager.loadEnvironment(basePath);
}

/**
 * Create temporary branch environment for testing
 */
export async function withBranchEnvironment<T>(
  branchConfig: {
    branchName: string;
    databaseUrl: string;
    projectId?: string;
    parentBranch?: string;
  },
  callback: () => Promise<T>,
): Promise<T> {
  const originalEnv = { ...process.env };

  try {
    // Create branch environment
    envManager.createBranchEnvironment(branchConfig);
    envManager.loadEnvironment();

    // Execute callback with branch environment
    return await callback();
  } finally {
    // Restore original environment
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.entries(originalEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // Clean up branch file
    envManager.cleanupBranchEnvironment();
  }
}

/**
 * Utilities for environment file management
 */
export const envUtils = {
  /**
   * Check if all required test environment variables are set
   */
  validateTestEnvironment(): { valid: boolean; missing: string[] } {
    const required = ['POSTGRES_URL', 'DATABASE_URL'];
    const missing = required.filter((key) => !envManager.get(key));

    return {
      valid: missing.length === 0,
      missing,
    };
  },

  /**
   * Get database connection info from environment
   */
  getDatabaseInfo(): {
    url: string | undefined;
    isBranch: boolean;
    branchName?: string;
    projectId?: string;
  } {
    const url =
      envManager.get('POSTGRES_URL') || envManager.get('DATABASE_URL');
    const branchName = envManager.get('TEST_BRANCH_NAME');
    const projectId = envManager.get('NEON_PROJECT_ID');

    return {
      url,
      isBranch:
        !!branchName ||
        !!(url?.includes('.pooler.neon.tech') && url.includes('-')),
      branchName,
      projectId,
    };
  },

  /**
   * Create environment template files
   */
  createTemplates(): void {
    const templates = {
      '.env.test.example': [
        '# Test Environment Configuration',
        '# Copy this to .env.test and configure for your setup',
        '',
        '# Database Configuration',
        'POSTGRES_URL=postgresql://postgres:password@localhost:5432/mastra_chat_test',
        'DATABASE_URL=postgresql://postgres:password@localhost:5432/mastra_chat_test',
        '',
        '# Test Configuration',
        'NODE_ENV=test',
        'PLAYWRIGHT=true',
        '',
        '# Optional: Neon API Key for branch management',
        '# NEON_API_KEY=neon_api_your-key-here',
        '',
        '# Optional: Sample data seeding',
        '# TEST_DB_SEED_SAMPLE_DATA=true',
        '',
      ].join('\n'),

      '.env.test.branch.example': [
        '# Branch-Specific Test Environment',
        '# This file is automatically generated by the NeonBranchManager',
        '# DO NOT commit this file to version control',
        '',
        '# Branch Configuration',
        'TEST_BRANCH_NAME=test-my-feature-20241217-143022',
        'TEST_BRANCH_PARENT=main',
        'NEON_PROJECT_ID=your-project-id',
        '',
        '# Database URLs (automatically generated)',
        'POSTGRES_URL=postgresql://user:pass@ep-branch-id.pooler.neon.tech/dbname?sslmode=require',
        'DATABASE_URL=postgresql://user:pass@ep-branch-id.pooler.neon.tech/dbname?sslmode=require',
        '',
        '# Test Environment',
        'NODE_ENV=test',
        'PLAYWRIGHT=true',
        '',
      ].join('\n'),
    };

    Object.entries(templates).forEach(([filename, content]) => {
      const filepath = join(process.cwd(), filename);
      if (!existsSync(filepath)) {
        writeFileSync(filepath, content, 'utf-8');
        console.log(`✅ Created template: ${filename}`);
      }
    });
  },
};
