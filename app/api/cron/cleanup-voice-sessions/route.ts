import type { NextRequest } from 'next/server';
import { cleanupInactiveSessions } from '@/lib/db/queries/voice-sessions';

// This endpoint can be called by a cron job service (e.g., Vercel Cron, Upstash, etc.)
// to clean up expired voice sessions periodically
export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized (add your own auth mechanism)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Clean up sessions inactive for more than 30 minutes
    const expiredSessionIds = await cleanupInactiveSessions(30 * 60 * 1000);
    
    console.log(`Voice session cleanup completed. Expired sessions: ${expiredSessionIds.length}`);
    
    return Response.json({
      success: true,
      expiredSessions: expiredSessionIds.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Voice session cleanup failed:', error);
    return Response.json(
      {
        success: false,
        error: 'Cleanup failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}