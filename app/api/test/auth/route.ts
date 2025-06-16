import { NextResponse } from 'next/server';
import { isTestEnvironment } from '@/lib/constants';

/**
 * Test-only authentication endpoint that bypasses normal auth flow
 * This endpoint is only available during test runs
 */
export async function POST(request: Request) {
  // Only allow in test environment
  if (!isTestEnvironment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { email = `test-user-${Date.now()}@test.com`, type = 'guest' } = body;

    // Return a mock auth response
    return NextResponse.json({
      success: true,
      user: {
        id: `test-${Date.now()}`,
        email,
        type,
      },
      message: 'Test authentication successful',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to authenticate test user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Only allow in test environment
  if (!isTestEnvironment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Test auth endpoint is available',
    testEnvironment: true,
  });
}
