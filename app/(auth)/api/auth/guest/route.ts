import { signIn } from '@/app/(auth)/auth';
import { isDevelopmentEnvironment, isTestEnvironment } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get('redirectUrl') || '/';

  console.log('Guest auth route called with:', {
    redirectUrl,
    isTestEnvironment,
  });

  let token: any;
  try {
    token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: !isDevelopmentEnvironment,
    });
  } catch (error) {
    console.error('Error getting token in guest route:', error);
    // If token check fails, continue with guest creation
  }

  // If we already have a valid token, redirect to the intended destination
  if (token) {
    console.log('Valid token found, redirecting to:', redirectUrl);
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Create a guest session for both test and non-test environments
  try {
    console.log('Creating guest session...');
    const result = await signIn('guest', {
      redirect: true,
      redirectTo: redirectUrl,
    });
    console.log('Guest sign-in result:', result);
    return result;
  } catch (error) {
    // Check if this is a NextJS redirect (which is expected)
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      console.log('Guest sign-in successful, redirect occurred');
      // Re-throw the redirect error so Next.js can handle it properly
      throw error;
    }

    console.error('Failed to sign in guest user:', error);

    // If guest sign in fails, return an error response instead of redirect
    return NextResponse.json(
      {
        error: 'Failed to create guest session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
