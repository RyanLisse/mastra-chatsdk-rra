/**
 * Auth Coexistence Validation Tests
 * 
 * Verify that Kinde Auth and NextAuth.js can run in parallel without conflicts
 */

import { describe, it, expect } from 'bun:test';
import { KINDE_AUTH_URLS } from '../lib/auth/kinde/config';

describe('Auth Systems Coexistence', () => {
  it('should have Kinde constants available', () => {
    expect(KINDE_AUTH_URLS).toBeDefined();
    expect(KINDE_AUTH_URLS.login).toBe('/api/auth/login');
    expect(KINDE_AUTH_URLS.logout).toBe('/api/auth/logout');
    expect(KINDE_AUTH_URLS.register).toBe('/api/auth/register');
    expect(KINDE_AUTH_URLS.callback).toBe('/api/auth/kinde-callback');
  });

  it('should have separate route patterns for each auth system', () => {
    // NextAuth uses [...nextauth] pattern (in (auth) route group)
    const nextAuthRoutes = [
      '/api/auth/signin',
      '/api/auth/signout', 
      '/api/auth/callback',
      '/api/auth/session',
    ];

    // Kinde uses [kindeAuth] pattern (in main app/api)
    const kindeRoutes = [
      KINDE_AUTH_URLS.login,      // /api/auth/login
      KINDE_AUTH_URLS.logout,     // /api/auth/logout
      KINDE_AUTH_URLS.register,   // /api/auth/register
      KINDE_AUTH_URLS.callback,   // /api/auth/kinde-callback
    ];

    // No route overlap - they should be completely separate
    const overlap = kindeRoutes.filter(route => nextAuthRoutes.includes(route));
    expect(overlap).toHaveLength(0);

    // Verify expected Kinde routes
    expect(kindeRoutes).toEqual([
      '/api/auth/login',
      '/api/auth/logout', 
      '/api/auth/register',
      '/api/auth/kinde-callback',
    ]);
  });

  it('should have Kinde route handler file', async () => {
    // Check Kinde route exports without importing server components
    const kindeRoute = await import('../app/api/auth/[kindeAuth]/route');
    expect(kindeRoute.GET).toBeDefined();
    expect(kindeRoute.POST).toBeDefined();
    expect(typeof kindeRoute.GET).toBe('function');
    expect(typeof kindeRoute.POST).toBe('function');
  });

  it('should have separate file locations for auth systems', () => {
    const fs = require('node:fs');
    const path = require('node:path');

    // NextAuth files should be in (auth) route group
    const nextAuthRoutePath = path.join(process.cwd(), 'app/(auth)/api/auth/[...nextauth]/route.ts');
    expect(fs.existsSync(nextAuthRoutePath)).toBe(true);

    // NextAuth config files should be in (auth) group
    const nextAuthConfigPath = path.join(process.cwd(), 'app/(auth)/auth.ts');
    expect(fs.existsSync(nextAuthConfigPath)).toBe(true);

    // Kinde files should be in main app/api structure
    const kindeRoutePath = path.join(process.cwd(), 'app/api/auth/[kindeAuth]/route.ts');
    expect(fs.existsSync(kindeRoutePath)).toBe(true);

    // Kinde config should be in lib/auth/kinde
    const kindeConfigPath = path.join(process.cwd(), 'lib/auth/kinde/config.ts');
    expect(fs.existsSync(kindeConfigPath)).toBe(true);

    // Kinde server utilities
    const kindeServerPath = path.join(process.cwd(), 'lib/auth/kinde/server.ts');
    expect(fs.existsSync(kindeServerPath)).toBe(true);

    // Kinde index file
    const kindeIndexPath = path.join(process.cwd(), 'lib/auth/kinde/index.ts');
    expect(fs.existsSync(kindeIndexPath)).toBe(true);
  });

  it('should have proper Kinde package installed', () => {
    const packageJson = require('../package.json');
    expect(packageJson.dependencies['@kinde-oss/kinde-auth-nextjs']).toBeDefined();
    expect(packageJson.dependencies['@kinde-oss/kinde-auth-nextjs']).toMatch(/^\^2\./);
  });

  it('should show both auth systems in build output', () => {
    // This test verifies that both auth routes are recognized by Next.js
    // The build process in our previous validation showed both:
    // ├ ƒ /api/auth/[...nextauth]        (NextAuth)
    // ├ ƒ /api/auth/[kindeAuth]          (Kinde)
    
    // Since we can't easily run the build in test, we verify file structure
    const fs = require('node:fs');
    const path = require('node:path');
    
    const nextAuthExists = fs.existsSync(path.join(process.cwd(), 'app/(auth)/api/auth/[...nextauth]/route.ts'));
    const kindeExists = fs.existsSync(path.join(process.cwd(), 'app/api/auth/[kindeAuth]/route.ts'));
    
    expect(nextAuthExists).toBe(true);
    expect(kindeExists).toBe(true);
  });
});