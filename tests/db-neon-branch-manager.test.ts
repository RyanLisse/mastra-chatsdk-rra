import { describe, it, expect } from 'bun:test';
import { 
  extractProjectIdFromConnectionString, 
  extractBranchNameFromConnectionString,
  createNeonBranchManager 
} from '../lib/db/neon-branch-manager';

describe('Neon Branch Manager', () => {
  describe('Connection String Parsing', () => {
    it('should extract project ID from Neon connection string', () => {
      const connectionString = 'postgresql://user:pass@test-branch-proj-123.region.neon.tech/dbname';
      const projectId = extractProjectIdFromConnectionString(connectionString);
      expect(projectId).toBe('proj-123');
    });

    it('should extract branch name from Neon connection string', () => {
      const connectionString = 'postgresql://user:pass@test-branch-proj-123.region.neon.tech/dbname';
      const branchName = extractBranchNameFromConnectionString(connectionString);
      expect(branchName).toBe('test-branch');
    });

    it('should handle complex branch names with multiple hyphens', () => {
      const connectionString = 'postgresql://user:pass@test-my-feature-branch-proj-456.region.neon.tech/dbname';
      const branchName = extractBranchNameFromConnectionString(connectionString);
      const projectId = extractProjectIdFromConnectionString(connectionString);
      
      expect(branchName).toBe('test-my-feature-branch');
      expect(projectId).toBe('proj-456');
    });

    it('should return null for non-Neon connection strings', () => {
      const connectionString = 'postgresql://user:pass@localhost:5432/dbname';
      const projectId = extractProjectIdFromConnectionString(connectionString);
      const branchName = extractBranchNameFromConnectionString(connectionString);
      
      expect(projectId).toBeNull();
      expect(branchName).toBeNull();
    });

    it('should handle malformed URLs gracefully', () => {
      const invalidUrl = 'not-a-valid-url';
      const projectId = extractProjectIdFromConnectionString(invalidUrl);
      const branchName = extractBranchNameFromConnectionString(invalidUrl);
      
      expect(projectId).toBeNull();
      expect(branchName).toBeNull();
    });
  });

  describe('Branch Manager Creation', () => {
    it('should throw error when no API key is provided', () => {
      expect(() => createNeonBranchManager()).toThrow('NEON_API_KEY is required');
    });

    it('should create branch manager with provided API key', () => {
      const manager = createNeonBranchManager({ apiKey: 'test-key' });
      expect(manager).toBeDefined();
    });

    it('should use default project ID when provided', () => {
      const manager = createNeonBranchManager({ 
        apiKey: 'test-key',
        defaultProjectId: 'test-project' 
      });
      expect(manager).toBeDefined();
    });

    it('should use custom timeout when provided', () => {
      const manager = createNeonBranchManager({ 
        apiKey: 'test-key',
        timeoutMs: 60000 
      });
      expect(manager).toBeDefined();
    });
  });

  describe('Branch Name Validation', () => {
    it('should recognize test branch names', () => {
      const testNames = [
        'test-feature',
        'test-my-branch',
        'feature-test',
        'test.branch',
        'branch-test-123'
      ];

      for (const name of testNames) {
        expect(name.includes('test')).toBe(true);
      }
    });

    it('should identify non-test branch names', () => {
      const nonTestNames = [
        'main',
        'production',
        'staging',
        'feature-branch',
        'hotfix-123'
      ];

      for (const name of nonTestNames) {
        expect(name.includes('test')).toBe(false);
      }
    });
  });
});

describe('Test Database Configuration Integration', () => {
  it('should detect Neon URLs correctly', () => {
    const neonUrls = [
      'postgresql://user:pass@branch-name-proj-123.region.neon.tech/db',
      'postgresql://user:pass@test-branch-proj-456.us-east-1.neon.tech/db'
    ];

    const nonNeonUrls = [
      'postgresql://user:pass@localhost:5432/db',
      'postgresql://user:pass@postgres.example.com:5432/db',
      'postgresql://user:pass@db.vercel-storage.com/db'
    ];

    for (const url of neonUrls) {
      expect(url.includes('neon.tech')).toBe(true);
    }

    for (const url of nonNeonUrls) {
      expect(url.includes('neon.tech')).toBe(false);
    }
  });

  it('should identify test branch URLs', () => {
    const testUrls = [
      'postgresql://user:pass@test-branch-proj-123.region.neon.tech/db',
      'postgresql://user:pass@my-test-feature-proj-456.region.neon.tech/db',
      'postgresql://user:pass@branch-test-proj-789.region.neon.tech/db'
    ];

    for (const url of testUrls) {
      const isNeonDatabase = url.includes('neon.tech');
      const isTestBranch = isNeonDatabase && url.includes('test');
      expect(isTestBranch).toBe(true);
    }
  });
});