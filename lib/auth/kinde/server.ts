/**
 * Kinde Auth Server Utilities
 * 
 * Server-side utilities for Kinde authentication
 * Compatible with Next.js 15 App Router and Server Components
 */

import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { isKindeConfigured } from './config';

export type KindeUser = {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  picture: string | null;
};

export type KindeSession = {
  user: KindeUser | null;
  isAuthenticated: boolean;
};

/**
 * Get Kinde session in Server Components
 * Returns null if Kinde is not configured
 */
export async function getKindeSession(): Promise<KindeSession | null> {
  if (!isKindeConfigured()) {
    return null;
  }

  try {
    const { getUser, isAuthenticated } = getKindeServerSession();
    const user = await getUser();
    const authenticated = await isAuthenticated();

    return {
      user: user ? {
        id: user.id,
        email: user.email || null,
        given_name: user.given_name || null,
        family_name: user.family_name || null,
        picture: user.picture || null,
      } : null,
      isAuthenticated: authenticated || false,
    };
  } catch (error) {
    console.error('Error getting Kinde session:', error);
    return {
      user: null,
      isAuthenticated: false,
    };
  }
}

/**
 * Check if user is authenticated via Kinde
 */
export async function isKindeAuthenticated(): Promise<boolean> {
  const session = await getKindeSession();
  return session?.isAuthenticated || false;
}

/**
 * Get Kinde user if authenticated
 */
export async function getKindeUser(): Promise<KindeUser | null> {
  const session = await getKindeSession();
  return session?.user || null;
}