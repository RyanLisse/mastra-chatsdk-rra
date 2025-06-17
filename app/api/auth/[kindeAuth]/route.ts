import { handleAuth } from '@kinde-oss/kinde-auth-nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Kinde Auth Route Handler for Next.js 15 App Router
 * 
 * This handles all Kinde authentication endpoints:
 * - /api/auth/kinde-callback - Handle auth callback
 * - /api/auth/login - Initiate login flow  
 * - /api/auth/logout - Initiate logout flow
 * - /api/auth/register - Initiate registration flow
 * 
 * This runs parallel to the existing NextAuth.js setup
 * NextAuth routes: /api/auth/[...nextauth] (in (auth) route group)
 * Kinde routes: /api/auth/[kindeAuth] (in main app/api)
 */

interface Params {
  kindeAuth: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  try {
    const { kindeAuth: endpoint } = await params;
    
    // Convert handleAuth result to proper Response
    const authHandler = await handleAuth(request, endpoint);
    
    // If it's already a Response, return it
    if (authHandler instanceof Response) {
      return authHandler;
    }
    
    // If it's a function (as Kinde SDK sometimes returns), call it
    if (typeof authHandler === 'function') {
      const result = authHandler(request, { params: { kindeAuth: endpoint } });
      return result instanceof Response ? result : NextResponse.json(result);
    }
    
    // Otherwise, wrap in JSON response
    return NextResponse.json(authHandler);
  } catch (error) {
    console.error('Kinde auth GET error:', error);
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  try {
    const { kindeAuth: endpoint } = await params;
    
    // Convert handleAuth result to proper Response  
    const authHandler = await handleAuth(request, endpoint);
    
    // If it's already a Response, return it
    if (authHandler instanceof Response) {
      return authHandler;
    }
    
    // If it's a function (as Kinde SDK sometimes returns), call it
    if (typeof authHandler === 'function') {
      const result = authHandler(request, { params: { kindeAuth: endpoint } });
      return result instanceof Response ? result : NextResponse.json(result);
    }
    
    // Otherwise, wrap in JSON response
    return NextResponse.json(authHandler);
  } catch (error) {
    console.error('Kinde auth POST error:', error);
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    );
  }
}