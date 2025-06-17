/**
 * Kinde Auth Module
 * 
 * Main export file for Kinde authentication functionality
 * Runs parallel to existing NextAuth.js setup
 */

// Configuration
export {
  getKindeConfig,
  isKindeConfigured,
  validateKindeConfig,
  KINDE_AUTH_URLS,
  KINDE_DEFAULTS,
  type KindeConfig,
} from './config';

// Server utilities
export {
  getKindeSession,
  isKindeAuthenticated,
  getKindeUser,
  type KindeUser,
  type KindeSession,
} from './server';

// Re-export Kinde SDK functions for convenience
export {
  getKindeServerSession,
  LogoutLink,
  LoginLink,
  RegisterLink,
} from '@kinde-oss/kinde-auth-nextjs/server';