import type { NextAuthConfig } from 'next-auth';
import { generateUUID } from '@/lib/utils';

/**
 * Test-specific auth configuration that bypasses database calls
 * and provides mock authentication for tests
 */
export const testAuthConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    {
      id: 'test-guest',
      name: 'Test Guest',
      type: 'credentials',
      credentials: {},
      async authorize() {
        // Return a mock guest user for tests
        return {
          id: generateUUID(),
          email: `guest-test-${Date.now()}`,
          type: 'guest' as const,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type || 'guest';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type || 'guest';
      }
      return session;
    },
  },
};

/**
 * Mock authentication context for tests
 */
export function createMockAuthContext() {
  const mockUser = {
    id: generateUUID(),
    email: `test-user-${Date.now()}@test.com`,
    type: 'guest' as const,
  };

  return {
    user: mockUser,
    session: {
      user: mockUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    token: {
      id: mockUser.id,
      email: mockUser.email,
      type: mockUser.type,
    },
  };
}
