import { db } from '@vercel/postgres';
import type { 
  DocumentChunk, 
  DocumentProcessing 
} from '@/lib/db/schema';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import type { ProcessingStatus, ProcessingStage } from './progress/types';

// Create drizzle instance for database operations
const dbClient = drizzle(db);

export interface StoreChunkParams {
  documentId: string;
  filename: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface UpdateProcessingStatusParams {
  documentId: string;
  status: ProcessingStatus;
  stage: ProcessingStage;
  progress: number;
  chunkCount?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Database operations for RAG document processing
 */
export class RAGDatabase {
  
  /**
   * Create a new document processing record
   */
  async createProcessingRecord(
    documentId: string,
    filename: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<DocumentProcessing> {
    const client = await db.connect();
    
    try {
      const result = await client.sql`
        INSERT INTO "DocumentProcessing" (
          "documentId", 
          "filename", 
          "userId", 
          "metadata",
          "status",
          "stage",
          "progress"
        )
        VALUES (${documentId}, ${filename}, ${userId}, ${JSON.stringify(metadata || {})}, 'pending', 'upload', 0)
        RETURNING *
      `;
      
      return result.rows[0] as DocumentProcessing;
    } finally {
      client.release();
    }
  }

  /**
   * Update document processing status
   */
  async updateProcessingStatus(params: UpdateProcessingStatusParams): Promise<DocumentProcessing | null> {
    const client = await db.connect();
    
    try {
      const result = await client.sql`
        UPDATE "DocumentProcessing"
        SET 
          "status" = ${params.status},
          "stage" = ${params.stage},
          "progress" = ${params.progress},
          "chunkCount" = COALESCE(${params.chunkCount || null}, "chunkCount"),
          "errorMessage" = ${params.errorMessage || null},
          "metadata" = CASE 
            WHEN ${JSON.stringify(params.metadata || null)} IS NOT NULL 
            THEN ${JSON.stringify(params.metadata || {})}
            ELSE "metadata" 
          END,
          "updatedAt" = NOW()
        WHERE "documentId" = ${params.documentId}
        RETURNING *
      `;
      
      return result.rows[0] as DocumentProcessing || null;
    } finally {
      client.release();
    }
  }

  /**
   * Get document processing status
   */
  async getProcessingStatus(documentId: string): Promise<DocumentProcessing | null> {
    const client = await db.connect();
    
    try {
      const result = await client.sql`
        SELECT * FROM "DocumentProcessing"
        WHERE "documentId" = ${documentId}
        LIMIT 1
      `;
      
      return result.rows[0] as DocumentProcessing || null;
    } finally {
      client.release();
    }
  }

  /**
   * Store document chunks in database
   */
  async storeChunks(chunks: StoreChunkParams[]): Promise<void> {
    const client = await db.connect();
    
    try {
      await client.sql`BEGIN`;
      
      for (const chunk of chunks) {
        // Store chunk content as JSON with text and metadata
        const chunkContent = JSON.stringify({
          text: chunk.text,
          metadata: {
            ...chunk.metadata,
            documentId: chunk.documentId,
            filename: chunk.filename,
            chunkIndex: chunk.chunkIndex,
            storedAt: new Date().toISOString()
          }
        });
        
        await client.sql`
          INSERT INTO "DocumentChunk" (
            "content", 
            "embedding", 
            "documentId", 
            "filename", 
            "chunkIndex", 
            "metadata"
          )
          VALUES (
            ${chunkContent}, 
            ${JSON.stringify(chunk.embedding)}, 
            ${chunk.documentId}, 
            ${chunk.filename}, 
            ${chunk.chunkIndex}, 
            ${JSON.stringify(chunk.metadata)}
          )
        `;
      }
      
      await client.sql`COMMIT`;
      
    } catch (error) {
      await client.sql`ROLLBACK`;
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all chunks for a document
   */
  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    const client = await db.connect();
    
    try {
      const result = await client.sql`
        SELECT * FROM "DocumentChunk"
        WHERE "documentId" = ${documentId}
        ORDER BY "chunkIndex" ASC
      `;
      
      return result.rows as DocumentChunk[];
    } finally {
      client.release();
    }
  }

  /**
   * Get recent processing records (for monitoring)
   */
  async getRecentProcessingRecords(userId: string, limit = 10): Promise<DocumentProcessing[]> {
    const client = await db.connect();
    
    try {
      const result = await client.sql`
        SELECT * FROM "DocumentProcessing"
        WHERE "userId" = ${userId}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `;
      
      return result.rows as DocumentProcessing[];
    } finally {
      client.release();
    }
  }

  /**
   * Delete document and its chunks
   */
  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const client = await db.connect();
    
    try {
      await client.sql`BEGIN`;
      
      // Delete chunks first
      await client.sql`
        DELETE FROM "DocumentChunk"
        WHERE "documentId" = ${documentId}
      `;
      
      // Delete processing record
      const result = await client.sql`
        DELETE FROM "DocumentProcessing"
        WHERE "documentId" = ${documentId} AND "userId" = ${userId}
      `;
      
      await client.sql`COMMIT`;
      
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.sql`ROLLBACK`;
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search documents by text similarity (for RAG queries)
   */
  async searchDocuments(queryEmbedding: number[], limit = 5): Promise<DocumentChunk[]> {
    const client = await db.connect();
    
    try {
      const result = await client.sql`
        SELECT * FROM "DocumentChunk"
        ORDER BY "embedding" <=> ${JSON.stringify(queryEmbedding)}
        LIMIT ${limit}
      `;
      
      return result.rows as DocumentChunk[];
    } finally {
      client.release();
    }
  }

  /**
   * Get processing statistics (for monitoring)
   */
  async getProcessingStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const client = await db.connect();
    
    try {
      const result = await client.sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM "DocumentProcessing"
      `;
      
      const stats = result.rows[0];
      return {
        total: Number(stats.total),
        pending: Number(stats.pending),
        processing: Number(stats.processing),
        completed: Number(stats.completed),
        failed: Number(stats.failed)
      };
    } finally {
      client.release();
    }
  }
}

// Singleton instance
export const ragDatabase = new RAGDatabase();