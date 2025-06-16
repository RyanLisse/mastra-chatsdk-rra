import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { validateEnvironment, logEnvironmentStatus } from '../env-validation';

describe('Environment Validation', () => {
  // Store original environment
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear AI provider environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GROQ_API_KEY;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('validateEnvironment', () => {
    it('should report no providers when no API keys are set', () => {
      const status = validateEnvironment();
      
      expect(status.isValid).toBe(false);
      expect(status.availableProviders).toHaveLength(0);
      expect(status.missingProviders).toHaveLength(4);
      expect(status.errors).toContain('No valid AI providers are configured. Please set at least one valid API key.');
    });

    it('should validate OpenAI API key format', () => {
      process.env.OPENAI_API_KEY = 'sk-test123456789012345678901234567890';
      
      const status = validateEnvironment();
      
      expect(status.availableProviders).toContain('openai');
      expect(status.missingProviders).not.toContain('openai');
    });

    it('should reject invalid OpenAI API key format', () => {
      process.env.OPENAI_API_KEY = 'invalid-key';
      
      const status = validateEnvironment();
      
      expect(status.availableProviders).not.toContain('openai');
      expect(status.invalidKeys).toContainEqual({
        provider: 'openai',
        reason: 'Invalid format. Should start with "sk-" followed by alphanumeric characters'
      });
    });

    it('should validate Anthropic API key format', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test123456789012345678901234567890';
      
      const status = validateEnvironment();
      
      expect(status.availableProviders).toContain('anthropic');
      expect(status.missingProviders).not.toContain('anthropic');
    });

    it('should reject invalid Anthropic API key format', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test123';
      
      const status = validateEnvironment();
      
      expect(status.availableProviders).not.toContain('anthropic');
      expect(status.invalidKeys).toContainEqual({
        provider: 'anthropic',
        reason: 'Invalid format. Should start with "sk-ant-" followed by alphanumeric characters'
      });
    });

    it('should validate Google API key format', () => {
      process.env.GOOGLE_API_KEY = 'AIzaSyAbc123456789012345678901234567890123456';
      
      const status = validateEnvironment();
      
      expect(status.availableProviders).toContain('google');
      expect(status.missingProviders).not.toContain('google');
    });

    it('should reject invalid Google API key format', () => {
      process.env.GOOGLE_API_KEY = 'invalid-google-key';
      
      const status = validateEnvironment();
      
      expect(status.availableProviders).not.toContain('google');
      expect(status.invalidKeys).toContainEqual({
        provider: 'google',
        reason: 'Invalid format. Should start with "AIza" followed by alphanumeric characters'
      });
    });

    it('should validate Groq API key format', () => {
      process.env.GROQ_API_KEY = 'gsk_test123456789012345678901234567890';
      
      const status = validateEnvironment();
      
      expect(status.availableProviders).toContain('groq');
      expect(status.missingProviders).not.toContain('groq');
    });

    it('should reject invalid Groq API key format', () => {
      process.env.GROQ_API_KEY = 'invalid-groq-key';
      
      const status = validateEnvironment();
      
      expect(status.availableProviders).not.toContain('groq');
      expect(status.invalidKeys).toContainEqual({
        provider: 'groq',
        reason: 'Invalid format. Should start with "gsk_" followed by alphanumeric characters'
      });
    });

    it('should handle multiple valid providers', () => {
      process.env.OPENAI_API_KEY = 'sk-test123456789012345678901234567890';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test123456789012345678901234567890';
      
      const status = validateEnvironment();
      
      expect(status.isValid).toBe(true);
      expect(status.availableProviders).toContain('openai');
      expect(status.availableProviders).toContain('anthropic');
      expect(status.availableProviders).toHaveLength(2);
      expect(status.missingProviders).toHaveLength(2);
    });

    it('should provide warnings for missing providers', () => {
      process.env.OPENAI_API_KEY = 'sk-test123456789012345678901234567890';
      
      const status = validateEnvironment();
      
      expect(status.warnings).toContain('ANTHROPIC API key not found. Set ANTHROPIC_API_KEY to enable anthropic models.');
      expect(status.warnings).toContain('GOOGLE API key not found. Set GOOGLE_API_KEY to enable google models.');
      expect(status.warnings).toContain('GROQ API key not found. Set GROQ_API_KEY to enable groq models.');
    });

    it('should warn when OpenAI is not available', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test123456789012345678901234567890';
      
      const status = validateEnvironment();
      
      expect(status.warnings).toContain('OpenAI is the default fallback provider. Consider setting OPENAI_API_KEY for better reliability.');
    });
  });

  describe('logEnvironmentStatus', () => {
    it('should not throw when logging status', () => {
      // Mock console.log to prevent output during tests
      const originalConsoleLog = console.log;
      console.log = () => {};
      
      expect(() => logEnvironmentStatus()).not.toThrow();
      
      // Restore console.log
      console.log = originalConsoleLog;
    });
  });
});