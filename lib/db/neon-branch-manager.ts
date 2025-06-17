import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from 'dotenv';

const execAsync = promisify(exec);

// Load environment configuration
config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local',
});

export interface NeonBranch {
  id: string;
  name: string;
  project_id: string;
  parent_id?: string;
  parent_lsn?: string;
  parent_timestamp?: string;
  primary?: boolean;
  protected?: boolean;
  cpu_used_sec: number;
  creation_source: string;
  created_at: string;
  updated_at: string;
  current_state: string;
  pending_state?: string;
  logical_size: number;
  physical_size: number;
}

export interface NeonProject {
  id: string;
  name: string;
  platform_id: string;
  region_id: string;
  pg_version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBranchOptions {
  name: string;
  projectId?: string;
  parentBranch?: string;
  parentLsn?: string;
  parentTimestamp?: string;
}

export interface NeonBranchManagerConfig {
  apiKey?: string;
  defaultProjectId?: string;
  timeoutMs?: number;
}

export class NeonBranchManager {
  private apiKey: string;
  private defaultProjectId?: string;
  private timeoutMs: number;

  constructor(config: NeonBranchManagerConfig = {}) {
    this.apiKey = config.apiKey || process.env.NEON_API_KEY || '';
    this.defaultProjectId = config.defaultProjectId;
    this.timeoutMs = config.timeoutMs || 30000; // 30 seconds default timeout

    if (!this.apiKey) {
      throw new Error(
        'NEON_API_KEY is required. Please set it in your environment or pass it in the config.'
      );
    }
  }

  /**
   * Validates that neonctl is available and API key is configured
   */
  async validateSetup(): Promise<void> {
    try {
      // Check if neonctl is available
      await execAsync('npx neonctl --version', { timeout: this.timeoutMs });
      
      // Test API key by trying to list projects
      await this.listProjects();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Authentication failed')) {
          throw new Error(
            `Invalid NEON_API_KEY. Please check your API key at https://console.neon.tech/app/settings/api-keys`
          );
        }
        if (error.message.includes('neonctl: command not found')) {
          throw new Error(
            'neonctl CLI not found. Please install it with: bun install'
          );
        }
        throw new Error(`Neon setup validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Lists all projects accessible with the current API key
   */
  async listProjects(): Promise<NeonProject[]> {
    try {
      const { stdout } = await execAsync(
        `npx neonctl projects list --api-key "${this.apiKey}" --output json`,
        { timeout: this.timeoutMs }
      );
      
      const result = JSON.parse(stdout);
      return result.projects || [];
    } catch (error) {
      throw this.handleNeonError('list projects', error);
    }
  }

  /**
   * Lists all branches for a project
   */
  async listBranches(projectId?: string): Promise<NeonBranch[]> {
    const pid = projectId || this.defaultProjectId;
    if (!pid) {
      throw new Error('Project ID is required. Provide it as parameter or set defaultProjectId');
    }

    try {
      const { stdout } = await execAsync(
        `npx neonctl branches list --project-id "${pid}" --api-key "${this.apiKey}" --output json`,
        { timeout: this.timeoutMs }
      );
      
      const result = JSON.parse(stdout);
      return result.branches || [];
    } catch (error) {
      throw this.handleNeonError(`list branches for project ${pid}`, error);
    }
  }

  /**
   * Gets details for a specific branch
   */
  async getBranch(branchName: string, projectId?: string): Promise<NeonBranch> {
    const pid = projectId || this.defaultProjectId;
    if (!pid) {
      throw new Error('Project ID is required. Provide it as parameter or set defaultProjectId');
    }

    try {
      const { stdout } = await execAsync(
        `npx neonctl branches get "${branchName}" --project-id "${pid}" --api-key "${this.apiKey}" --output json`,
        { timeout: this.timeoutMs }
      );
      
      const result = JSON.parse(stdout);
      return result.branch;
    } catch (error) {
      throw this.handleNeonError(`get branch ${branchName}`, error);
    }
  }

  /**
   * Creates a new branch for testing
   */
  async createBranch(options: CreateBranchOptions): Promise<NeonBranch> {
    const pid = options.projectId || this.defaultProjectId;
    if (!pid) {
      throw new Error('Project ID is required. Provide it in options or set defaultProjectId');
    }

    // Validate branch name for testing
    if (!options.name.includes('test') && !options.name.startsWith('test-')) {
      console.warn(`⚠️  Branch name "${options.name}" doesn't indicate it's for testing`);
    }

    try {
      let command = `npx neonctl branches create "${options.name}" --project-id "${pid}" --api-key "${this.apiKey}" --output json`;
      
      // Add optional parameters
      if (options.parentBranch) {
        command += ` --parent "${options.parentBranch}"`;
      }
      if (options.parentLsn) {
        command += ` --parent-lsn "${options.parentLsn}"`;
      }
      if (options.parentTimestamp) {
        command += ` --parent-timestamp "${options.parentTimestamp}"`;
      }

      console.log(`🌿 Creating branch "${options.name}" in project ${pid}...`);
      
      const { stdout } = await execAsync(command, { timeout: this.timeoutMs });
      const result = JSON.parse(stdout);

      console.log(`✅ Branch "${options.name}" created successfully`);
      return result.branch;
    } catch (error) {
      throw this.handleNeonError(`create branch ${options.name}`, error);
    }
  }

  /**
   * Deletes a branch (with safety checks)
   */
  async deleteBranch(branchName: string, projectId?: string, force = false): Promise<void> {
    const pid = projectId || this.defaultProjectId;
    if (!pid) {
      throw new Error('Project ID is required. Provide it as parameter or set defaultProjectId');
    }

    // Safety check: prevent deletion of production branches
    if (!force && !branchName.includes('test') && !branchName.startsWith('test-')) {
      throw new Error(
        `Branch "${branchName}" doesn't appear to be a test branch. Use force=true to override this safety check.`
      );
    }

    try {
      // Check if branch exists and get its details
      const branch = await this.getBranch(branchName, pid);
      
      if (branch.primary && !force) {
        throw new Error(
          `Cannot delete primary branch "${branchName}". Use force=true to override (not recommended).`
        );
      }

      if (branch.protected && !force) {
        throw new Error(
          `Cannot delete protected branch "${branchName}". Use force=true to override (not recommended).`
        );
      }

      console.log(`🗑️  Deleting branch "${branchName}" from project ${pid}...`);
      
      await execAsync(
        `npx neonctl branches delete "${branchName}" --project-id "${pid}" --api-key "${this.apiKey}"`,
        { timeout: this.timeoutMs }
      );

      console.log(`✅ Branch "${branchName}" deleted successfully`);
    } catch (error) {
      throw this.handleNeonError(`delete branch ${branchName}`, error);
    }
  }

  /**
   * Creates a test branch with automatic naming
   */
  async createTestBranch(testName: string, projectId?: string): Promise<NeonBranch> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const branchName = `test-${testName}-${timestamp}`;

    return this.createBranch({
      name: branchName,
      projectId,
    });
  }

  /**
   * Deletes all test branches (matching test naming pattern)
   */
  async cleanupTestBranches(projectId?: string, dryRun = false): Promise<string[]> {
    const pid = projectId || this.defaultProjectId;
    if (!pid) {
      throw new Error('Project ID is required. Provide it as parameter or set defaultProjectId');
    }

    try {
      const branches = await this.listBranches(pid);
      const testBranches = branches.filter(
        branch => 
          (branch.name.includes('test') || branch.name.startsWith('test-')) &&
          !branch.primary &&
          !branch.protected
      );

      if (testBranches.length === 0) {
        console.log('🧹 No test branches found to clean up');
        return [];
      }

      console.log(`🧹 Found ${testBranches.length} test branches to clean up`);

      if (dryRun) {
        const branchNames = testBranches.map(b => b.name);
        console.log('Dry run - would delete:', branchNames);
        return branchNames;
      }

      const deletedBranches: string[] = [];
      for (const branch of testBranches) {
        try {
          await this.deleteBranch(branch.name, pid, true);
          deletedBranches.push(branch.name);
        } catch (error) {
          console.error(`Failed to delete branch ${branch.name}:`, error);
        }
      }

      console.log(`✅ Cleaned up ${deletedBranches.length} test branches`);
      return deletedBranches;
    } catch (error) {
      throw this.handleNeonError('cleanup test branches', error);
    }
  }

  /**
   * Gets the connection string for a branch
   */
  async getBranchConnectionString(branchName: string, projectId?: string, database?: string): Promise<string> {
    const pid = projectId || this.defaultProjectId;
    if (!pid) {
      throw new Error('Project ID is required. Provide it as parameter or set defaultProjectId');
    }

    try {
      let command = `npx neonctl connection-string "${branchName}" --project-id "${pid}" --api-key "${this.apiKey}"`;
      
      if (database) {
        command += ` --database-name "${database}"`;
      }

      const { stdout } = await execAsync(command, { timeout: this.timeoutMs });
      return stdout.trim();
    } catch (error) {
      throw this.handleNeonError(`get connection string for branch ${branchName}`, error);
    }
  }

  /**
   * Creates a temporary test database with automatic cleanup
   */
  async createTempTestDatabase(testName: string, projectId?: string): Promise<{
    branch: NeonBranch;
    connectionString: string;
    cleanup: () => Promise<void>;
  }> {
    const branch = await this.createTestBranch(testName, projectId);
    const connectionString = await this.getBranchConnectionString(branch.name, projectId);

    const cleanup = async () => {
      try {
        await this.deleteBranch(branch.name, projectId, true);
      } catch (error) {
        console.error(`Error cleaning up test branch ${branch.name}:`, error);
      }
    };

    return {
      branch,
      connectionString,
      cleanup,
    };
  }

  /**
   * Handles errors from neonctl commands
   */
  private handleNeonError(operation: string, error: any): Error {
    if (error instanceof Error) {
      const message = error.message;
      
      if (message.includes('Authentication failed')) {
        return new Error(
          `Authentication failed for operation "${operation}". Please check your NEON_API_KEY.`
        );
      }
      
      if (message.includes('Project not found')) {
        return new Error(
          `Project not found for operation "${operation}". Please check your project ID.`
        );
      }
      
      if (message.includes('Branch not found')) {
        return new Error(
          `Branch not found for operation "${operation}". Please check the branch name.`
        );
      }
      
      if (message.includes('timeout')) {
        return new Error(
          `Operation "${operation}" timed out after ${this.timeoutMs}ms. Network or Neon API might be slow.`
        );
      }
      
      if (message.includes('ENOTFOUND') || message.includes('network')) {
        return new Error(
          `Network error during operation "${operation}". Please check your internet connection.`
        );
      }

      return new Error(`Neon operation "${operation}" failed: ${message}`);
    }
    
    return new Error(`Neon operation "${operation}" failed: ${String(error)}`);
  }
}

/**
 * Creates a configured NeonBranchManager instance
 */
export function createNeonBranchManager(config: NeonBranchManagerConfig = {}): NeonBranchManager {
  return new NeonBranchManager(config);
}

/**
 * Helper function to extract project ID from a Neon connection string
 */
export function extractProjectIdFromConnectionString(connectionString: string): string | null {
  try {
    const url = new URL(connectionString);
    const hostParts = url.hostname.split('.');
    
    // Neon URLs typically follow: branch-name-project-id.region.neon.tech
    if (hostParts.length >= 4 && hostParts[hostParts.length - 2] === 'neon') {
      const branchProject = hostParts[0];
      const parts = branchProject.split('-');
      if (parts.length >= 3) {
        // Last 2 parts are typically the project ID
        return parts.slice(-2).join('-');
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper function to extract branch name from a Neon connection string
 */
export function extractBranchNameFromConnectionString(connectionString: string): string | null {
  try {
    const url = new URL(connectionString);
    const hostParts = url.hostname.split('.');
    
    // Neon URLs typically follow: branch-name-project-id.region.neon.tech
    if (hostParts.length >= 4 && hostParts[hostParts.length - 2] === 'neon') {
      const branchProject = hostParts[0];
      const parts = branchProject.split('-');
      if (parts.length >= 3) {
        // Everything except last 2 parts is the branch name
        return parts.slice(0, -2).join('-');
      }
    }
    
    return null;
  } catch {
    return null;
  }
}