import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ragDatabase } from '@/lib/rag/database';
import { ErrorResponseSchema, type ErrorResponse } from '@/lib/rag/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/documents - Get user's document processing records
 */
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      const errorResponse: ErrorResponse = {
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const includeStats = searchParams.get('stats') === 'true';

    // Get user's documents
    const documents = await ragDatabase.getRecentProcessingRecords(session.user.id, limit);

    // Get stats if requested
    let stats = undefined;
    if (includeStats) {
      stats = await ragDatabase.getProcessingStats();
    }

    return NextResponse.json({
      documents,
      stats,
      total: documents.length
    });

  } catch (error) {
    console.error('Documents endpoint error:', error);
    
    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR'
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/documents - Delete a specific document
 */
export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      const errorResponse: ErrorResponse = {
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Parse request body
    const { documentId } = await request.json();
    
    if (!documentId || typeof documentId !== 'string') {
      const errorResponse: ErrorResponse = {
        error: 'Document ID is required',
        code: 'INVALID_REQUEST'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Delete document
    const deleted = await ragDatabase.deleteDocument(documentId, session.user.id);
    
    if (!deleted) {
      const errorResponse: ErrorResponse = {
        error: 'Document not found or access denied',
        code: 'NOT_FOUND'
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Document deletion error:', error);
    
    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR'
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}