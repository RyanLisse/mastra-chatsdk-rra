/**
 * Kinde Auth Configuration
 * 
 * Configuration for Kinde authentication integration with Next.js 15 App Router
 * This runs parallel to the existing NextAuth.js setup
 */

export interface KindeConfig {
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  siteUrl: string;
  postLogoutRedirectUrl: string;
  postLoginRedirectUrl: string;
}

/**
 * Get Kinde configuration from environment variables
 */
export function getKindeConfig(): KindeConfig | null {
  // Check if required Kinde environment variables are present
  const clientId = process.env.KINDE_CLIENT_ID;
  const clientSecret = process.env.KINDE_CLIENT_SECRET;
  const issuerUrl = process.env.KINDE_ISSUER_URL;
  const siteUrl = process.env.KINDE_SITE_URL;

  // Return null if any required variable is missing
  if (!clientId || !clientSecret || !issuerUrl || !siteUrl) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    issuerUrl,
    siteUrl,
    postLogoutRedirectUrl: process.env.KINDE_POST_LOGOUT_REDIRECT_URL || siteUrl,
    postLoginRedirectUrl: process.env.KINDE_POST_LOGIN_REDIRECT_URL || siteUrl,
  };
}

/**
 * Check if Kinde Auth is configured and available
 */
export function isKindeConfigured(): boolean {
  return getKindeConfig() !== null;
}

/**
 * Validate Kinde environment configuration
 */
export function validateKindeConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.KINDE_CLIENT_ID) {
    errors.push('KINDE_CLIENT_ID is required');
  }
  
  if (!process.env.KINDE_CLIENT_SECRET) {
    errors.push('KINDE_CLIENT_SECRET is required');
  }
  
  if (!process.env.KINDE_ISSUER_URL) {
    errors.push('KINDE_ISSUER_URL is required');
  } else if (!process.env.KINDE_ISSUER_URL.startsWith('https://')) {
    errors.push('KINDE_ISSUER_URL must be a valid HTTPS URL');
  }
  
  if (!process.env.KINDE_SITE_URL) {
    errors.push('KINDE_SITE_URL is required');
  } else if (!process.env.KINDE_SITE_URL.startsWith('http')) {
    errors.push('KINDE_SITE_URL must be a valid URL');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Auth URLs for Kinde integration
 */
export const KINDE_AUTH_URLS = {
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  register: '/api/auth/register',
  callback: '/api/auth/kinde-callback',
} as const;

/**
 * Default configuration values
 */
export const KINDE_DEFAULTS = {
  postLoginRedirectUrl: '/',
  postLogoutRedirectUrl: '/',
} as const;