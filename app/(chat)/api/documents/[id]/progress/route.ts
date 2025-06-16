import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { progressTracker } from '@/lib/rag/progress';
import type { ErrorResponse } from '@/lib/rag/validation';

export const dynamic = 'force-dynamic';

interface Params {
  id: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      const errorResponse: ErrorResponse = {
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { id: documentId } = await params;

    // Validate document ID format (should be nanoid)
    if (
      !documentId ||
      typeof documentId !== 'string' ||
      documentId.length < 10
    ) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid document ID',
        code: 'INVALID_DOCUMENT_ID',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Check if document exists in progress tracker
    if (!progressTracker.exists(documentId)) {
      const errorResponse: ErrorResponse = {
        error: 'Document not found or processing not started',
        code: 'DOCUMENT_NOT_FOUND',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Create SSE stream
    const stream = progressTracker.createSSEStream(documentId);

    // Return streaming response with SSE headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Expose-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Progress endpoint error:', error);

    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
