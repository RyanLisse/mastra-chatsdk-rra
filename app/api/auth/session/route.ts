import { NextResponse } from 'next/server';
import { isTestEnvironment } from '@/lib/constants';
import { auth } from '@/app/(auth)/auth';

export async function GET(request: Request) {
  // During tests, return a mock session to support client-side useSession hook
  if (isTestEnvironment) {
    console.log(
      'Test environment: returning mock session for /api/auth/session',
    );
    return NextResponse.json({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440001', // Use existing test user ID from seed data
        email: 'test-operator@roborail.com',
        type: 'guest',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // In non-test environments, use the normal NextAuth session handling
  try {
    const session = await auth();
    return NextResponse.json(session);
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(null);
  }
}
