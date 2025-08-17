import { isTestEnvironment } from '@/lib/constants';
import { auth } from '@/app/(auth)/auth';
import type { UserType } from '@/app/(auth)/auth';

/**
 * Test-aware authentication function that returns a mock session in test environments
 * and real authentication in production environments
 */
export async function getTestAwareSession() {
  if (isTestEnvironment) {
    // Return a mock session for test environments using a seeded test user ID
    return {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440001', // Use existing test user ID from seed data
        email: 'test-operator@roborail.com',
        type: 'guest' as UserType,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // Use real authentication for non-test environments
  return await auth();
}
