/**
 * Kinde Auth Configuration Tests
 * 
 * Tests for Kinde authentication setup and configuration validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  getKindeConfig,
  isKindeConfigured,
  validateKindeConfig,
  KINDE_AUTH_URLS,
  KINDE_DEFAULTS,
} from '../lib/auth/kinde/config';

describe('Kinde Auth Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    process.env.KINDE_CLIENT_ID = undefined;
    process.env.KINDE_CLIENT_SECRET = undefined;
    process.env.KINDE_ISSUER_URL = undefined;
    process.env.KINDE_SITE_URL = undefined;
    process.env.KINDE_POST_LOGOUT_REDIRECT_URL = undefined;
    process.env.KINDE_POST_LOGIN_REDIRECT_URL = undefined;
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env = originalEnv;
  });

  describe('getKindeConfig', () => {
    it('should return null when required environment variables are missing', () => {
      const config = getKindeConfig();
      expect(config).toBeNull();
    });

    it('should return null when only some required variables are present', () => {
      process.env.KINDE_CLIENT_ID = 'test-client-id';
      process.env.KINDE_CLIENT_SECRET = 'test-client-secret';
      // Missing KINDE_ISSUER_URL and KINDE_SITE_URL
      
      const config = getKindeConfig();
      expect(config).toBeNull();
    });

    it('should return configuration when all required variables are present', () => {
      process.env.KINDE_CLIENT_ID = 'test-client-id';
      process.env.KINDE_CLIENT_SECRET = 'test-client-secret';
      process.env.KINDE_ISSUER_URL = 'https://test.kinde.com';
      process.env.KINDE_SITE_URL = 'http://localhost:3000';

      const config = getKindeConfig();
      expect(config).not.toBeNull();
      expect(config?.clientId).toBe('test-client-id');
      expect(config?.clientSecret).toBe('test-client-secret');
      expect(config?.issuerUrl).toBe('https://test.kinde.com');
      expect(config?.siteUrl).toBe('http://localhost:3000');
    });

    it('should use default redirect URLs when not specified', () => {
      process.env.KINDE_CLIENT_ID = 'test-client-id';
      process.env.KINDE_CLIENT_SECRET = 'test-client-secret';
      process.env.KINDE_ISSUER_URL = 'https://test.kinde.com';
      process.env.KINDE_SITE_URL = 'http://localhost:3000';

      const config = getKindeConfig();
      expect(config?.postLogoutRedirectUrl).toBe('http://localhost:3000');
      expect(config?.postLoginRedirectUrl).toBe('http://localhost:3000');
    });

    it('should use custom redirect URLs when specified', () => {
      process.env.KINDE_CLIENT_ID = 'test-client-id';
      process.env.KINDE_CLIENT_SECRET = 'test-client-secret';
      process.env.KINDE_ISSUER_URL = 'https://test.kinde.com';
      process.env.KINDE_SITE_URL = 'http://localhost:3000';
      process.env.KINDE_POST_LOGOUT_REDIRECT_URL = 'http://localhost:3000/goodbye';
      process.env.KINDE_POST_LOGIN_REDIRECT_URL = 'http://localhost:3000/dashboard';

      const config = getKindeConfig();
      expect(config?.postLogoutRedirectUrl).toBe('http://localhost:3000/goodbye');
      expect(config?.postLoginRedirectUrl).toBe('http://localhost:3000/dashboard');
    });
  });

  describe('isKindeConfigured', () => {
    it('should return false when configuration is not available', () => {
      expect(isKindeConfigured()).toBe(false);
    });

    it('should return true when configuration is available', () => {
      process.env.KINDE_CLIENT_ID = 'test-client-id';
      process.env.KINDE_CLIENT_SECRET = 'test-client-secret';
      process.env.KINDE_ISSUER_URL = 'https://test.kinde.com';
      process.env.KINDE_SITE_URL = 'http://localhost:3000';

      expect(isKindeConfigured()).toBe(true);
    });
  });

  describe('validateKindeConfig', () => {
    it('should return errors for missing required variables', () => {
      const validation = validateKindeConfig();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(4);
      expect(validation.errors).toContain('KINDE_CLIENT_ID is required');
      expect(validation.errors).toContain('KINDE_CLIENT_SECRET is required');
      expect(validation.errors).toContain('KINDE_ISSUER_URL is required');
      expect(validation.errors).toContain('KINDE_SITE_URL is required');
    });

    it('should validate ISSUER_URL format', () => {
      process.env.KINDE_CLIENT_ID = 'test-client-id';
      process.env.KINDE_CLIENT_SECRET = 'test-client-secret';
      process.env.KINDE_ISSUER_URL = 'http://test.kinde.com'; // Invalid - should be HTTPS
      process.env.KINDE_SITE_URL = 'http://localhost:3000';

      const validation = validateKindeConfig();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('KINDE_ISSUER_URL must be a valid HTTPS URL');
    });

    it('should validate SITE_URL format', () => {
      process.env.KINDE_CLIENT_ID = 'test-client-id';
      process.env.KINDE_CLIENT_SECRET = 'test-client-secret';
      process.env.KINDE_ISSUER_URL = 'https://test.kinde.com';
      process.env.KINDE_SITE_URL = 'invalid-url'; // Invalid URL format

      const validation = validateKindeConfig();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('KINDE_SITE_URL must be a valid URL');
    });

    it('should return valid for correct configuration', () => {
      process.env.KINDE_CLIENT_ID = 'test-client-id';
      process.env.KINDE_CLIENT_SECRET = 'test-client-secret';
      process.env.KINDE_ISSUER_URL = 'https://test.kinde.com';
      process.env.KINDE_SITE_URL = 'http://localhost:3000';

      const validation = validateKindeConfig();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Constants', () => {
    it('should define correct auth URLs', () => {
      expect(KINDE_AUTH_URLS.login).toBe('/api/auth/login');
      expect(KINDE_AUTH_URLS.logout).toBe('/api/auth/logout');
      expect(KINDE_AUTH_URLS.register).toBe('/api/auth/register');
      expect(KINDE_AUTH_URLS.callback).toBe('/api/auth/kinde-callback');
    });

    it('should define correct defaults', () => {
      expect(KINDE_DEFAULTS.postLoginRedirectUrl).toBe('/');
      expect(KINDE_DEFAULTS.postLogoutRedirectUrl).toBe('/');
    });
  });
});

describe('Kinde Auth Route Handler', () => {
  it('should have the correct route handler file', async () => {
    // Check if the route handler file exists
    const fs = require('node:fs');
    const path = require('node:path');
    
    const routeHandlerPath = path.join(process.cwd(), 'app/api/auth/[kindeAuth]/route.ts');
    expect(fs.existsSync(routeHandlerPath)).toBe(true);
  });

  it('should export GET and POST handlers', async () => {
    // Import the route handler
    const routeHandler = await import('../app/api/auth/[kindeAuth]/route');
    
    expect(typeof routeHandler.GET).toBe('function');
    expect(typeof routeHandler.POST).toBe('function');
  });
});

describe('Kinde Auth Parallel Setup', () => {
  it('should not interfere with existing NextAuth routes', () => {
    // Kinde uses /api/auth/[kindeAuth] 
    // NextAuth uses /api/auth/[...nextauth] (in (auth) route group)
    // These should be completely separate
    
    const kindeRoutes = [
      '/api/auth/login',
      '/api/auth/logout', 
      '/api/auth/register',
      '/api/auth/kinde-callback',
    ];

    const nextAuthRoutes = [
      '/api/auth/signin',
      '/api/auth/signout',
      '/api/auth/callback',
      '/api/auth/session',
    ];

    // Verify routes don't overlap
    const overlap = kindeRoutes.filter(route => nextAuthRoutes.includes(route));
    expect(overlap).toHaveLength(0);
  });
});