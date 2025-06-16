import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { auth } from '@/app/(auth)/auth';
import { 
  DocumentUploadSchema,
  validateFile,
  detectFileType,
  UploadResponseSchema,
  type UploadResponse,
  type ErrorResponse
} from '@/lib/rag/validation';
import { DocumentProcessor } from '@/lib/rag/processor';
import { progressTracker } from '@/lib/rag/progress';

// Configure for larger file uploads (50MB)
export const maxDuration = 300; // 5 minutes timeout

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      const errorResponse: ErrorResponse = {
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Check request body
    if (!request.body) {
      const errorResponse: ErrorResponse = {
        error: 'Request body is empty',
        code: 'EMPTY_BODY'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadataString = formData.get('metadata') as string;

    if (!file) {
      const errorResponse: ErrorResponse = {
        error: 'No file uploaded',
        code: 'NO_FILE'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate file
    const fileValidation = validateFile(file);
    if (!fileValidation.success) {
      const errorResponse: ErrorResponse = {
        error: fileValidation.error!,
        code: 'INVALID_FILE'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Detect file type
    const fileType = detectFileType(file);

    // Parse metadata if provided
    let metadata = {};
    if (metadataString) {
      try {
        metadata = JSON.parse(metadataString);
      } catch (error) {
        const errorResponse: ErrorResponse = {
          error: 'Invalid metadata JSON',
          code: 'INVALID_METADATA'
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
    }

    // Validate complete upload request
    const uploadValidation = DocumentUploadSchema.safeParse({
      file,
      type: fileType,
      metadata
    });

    if (!uploadValidation.success) {
      const errorMessage = uploadValidation.error.errors
        .map((error) => error.message)
        .join(', ');
      
      const errorResponse: ErrorResponse = {
        error: errorMessage,
        code: 'VALIDATION_ERROR',
        details: { errors: uploadValidation.error.errors }
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Generate unique document ID
    const documentId = nanoid();

    // Read file content
    const content = await file.text();

    // Create processor and start processing asynchronously
    const processor = new DocumentProcessor({
      chunkSize: 512,
      chunkOverlap: 50,
      maxEmbeddingRetries: 3,
      batchSize: 5,
      userId: session.user?.id
    });

    // Start processing in background (don't await)
    processor.process(content, file.name, fileType, documentId).catch((error) => {
      console.error(`Processing failed for document ${documentId}:`, error);
      
      // Update progress to failed state
      progressTracker.update(documentId, {
        stage: 'error',
        progress: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Processing failed'
      }).catch(console.error);
    });

    // Return immediate response with document ID
    const response: UploadResponse = {
      documentId,
      filename: file.name,
      type: fileType,
      status: 'processing',
      message: 'Document upload received and processing started'
    };

    return NextResponse.json(UploadResponseSchema.parse(response), { 
      status: 202 // Accepted - processing in background
    });

  } catch (error) {
    console.error('Upload endpoint error:', error);
    
    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR'
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}