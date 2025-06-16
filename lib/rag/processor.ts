import { createCohere } from '@ai-sdk/cohere';
import { embed } from 'ai';
import {
  type DocumentChunk,
  type ProcessingResult,
  type SupportedFileType,
  ProcessingResultSchema,
} from './validation';
import { progressTracker, type ProgressUpdate } from './progress';
import { ragDatabase, type StoreChunkParams } from './database';
import { MarkdownStrategy } from './strategies/markdown';
import { JSONStrategy } from './strategies/json';

// Initialize embedding model
const cohere = createCohere({
  apiKey: process.env.COHERE_API_KEY || '',
});
const embeddingModel = cohere.embedding('embed-english-v3.0');

export interface ProcessorConfig {
  chunkSize?: number;
  chunkOverlap?: number;
  maxEmbeddingRetries?: number;
  batchSize?: number;
  userId?: string; // Required for database operations
}

export class DocumentProcessor {
  private config: ProcessorConfig;
  private markdownStrategy: MarkdownStrategy;
  private jsonStrategy: JSONStrategy;

  constructor(config: ProcessorConfig = {}) {
    this.config = {
      chunkSize: 512,
      chunkOverlap: 50,
      maxEmbeddingRetries: 3,
      batchSize: 10,
      ...config,
    };

    // Initialize processing strategies
    this.markdownStrategy = new MarkdownStrategy({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
      preserveHeaders: true,
      chunkByHeaders: true,
      extractMetadata: true,
    });

    this.jsonStrategy = new JSONStrategy({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
      preserveStructure: true,
      groupRelatedItems: true,
      extractMetadata: true,
      maxDepth: 5,
    });
  }

  /**
   * Process a document through the complete RAG pipeline
   */
  async process(
    content: string,
    filename: string,
    type: SupportedFileType,
    documentId: string,
  ): Promise<ProcessingResult> {
    try {
      // Initialize progress tracking
      progressTracker.initialize(documentId, filename);

      // Create processing record in database if userId is provided
      if (this.config.userId) {
        await ragDatabase.createProcessingRecord(
          documentId,
          filename,
          this.config.userId,
          { type, fileSize: content.length },
        );
      }

      // Stage 1: Parse and chunk document (50%)
      await this.updateProgress(documentId, {
        stage: 'parsing',
        progress: 25,
        status: 'processing',
      });

      const { chunks, metadata } = await this.parseDocument(content, type);

      await this.updateProgress(documentId, {
        stage: 'chunking',
        progress: 50,
        status: 'processing',
      });

      // Stage 2: Generate embeddings (75%)
      await this.updateProgress(documentId, {
        stage: 'embedding',
        progress: 75,
        status: 'processing',
      });

      const embeddings = await this.generateEmbeddings(
        chunks.map((c) => c.text),
      );

      // Stage 3: Store in database (90%)
      await this.updateProgress(documentId, {
        stage: 'storing',
        progress: 90,
        status: 'processing',
      });

      await this.storeChunks(chunks, embeddings, documentId, filename);

      // Stage 4: Complete (100%)
      await this.updateProgress(documentId, {
        stage: 'completed',
        progress: 100,
        status: 'completed',
      });

      const result: ProcessingResult = {
        documentId,
        filename,
        chunks: chunks.map((chunk, i) => ({
          ...chunk,
          embedding: embeddings[i],
        })),
        status: 'completed',
        metadata,
        processedAt: new Date(),
        chunkCount: chunks.length,
        embeddingCount: embeddings.length,
      };

      return ProcessingResultSchema.parse(result);
    } catch (error) {
      // Handle processing errors
      await this.updateProgress(documentId, {
        stage: 'error',
        progress: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Parse document based on type using advanced strategies
   */
  private async parseDocument(
    content: string,
    type: SupportedFileType,
  ): Promise<{ chunks: DocumentChunk[]; metadata: any }> {
    switch (type) {
      case 'markdown':
        return this.parseMarkdown(content);
      case 'json':
        return this.parseJSON(content);
      default:
        throw new Error(`Unsupported file type: ${type}`);
    }
  }

  /**
   * Parse markdown with advanced frontmatter support and header-aware chunking
   */
  private parseMarkdown(content: string): {
    chunks: DocumentChunk[];
    metadata: any;
  } {
    try {
      const parseResult = this.markdownStrategy.parse(content);
      const chunks = this.markdownStrategy.chunk(parseResult);

      return {
        chunks,
        metadata: parseResult.metadata,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse markdown: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Parse JSON document with structure-aware chunking
   */
  private parseJSON(content: string): {
    chunks: DocumentChunk[];
    metadata: any;
  } {
    try {
      const parseResult = this.jsonStrategy.parse(content);
      const chunks = this.jsonStrategy.chunk(parseResult);

      return {
        chunks,
        metadata: parseResult.metadata,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate embeddings with retry logic
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += this.config.batchSize || 10) {
      const batch = texts.slice(i, i + (this.config.batchSize || 10));
      let retries = 0;

      while (retries < (this.config.maxEmbeddingRetries || 3)) {
        try {
          const batchEmbeddings = await Promise.all(
            batch.map(async (text) => {
              const result = await embed({
                model: embeddingModel,
                value: text,
              });
              return result.embedding;
            }),
          );

          embeddings.push(...batchEmbeddings);
          break;
        } catch (error) {
          retries++;
          if (retries >= (this.config.maxEmbeddingRetries || 3)) {
            throw new Error(
              `Failed to generate embeddings after ${retries} retries: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }

          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, retries) * 1000),
          );
        }
      }
    }

    return embeddings;
  }

  /**
   * Store chunks and embeddings in database
   */
  private async storeChunks(
    chunks: DocumentChunk[],
    embeddings: number[][],
    documentId: string,
    filename?: string,
  ): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error('Chunks and embeddings arrays must have the same length');
    }

    // Prepare chunks for database storage
    const storeChunks: StoreChunkParams[] = chunks.map((chunk, index) => ({
      documentId,
      filename: filename || '',
      chunkIndex: index,
      text: chunk.text,
      embedding: embeddings[index],
      metadata: chunk.metadata,
    }));

    // Store using the database layer
    await ragDatabase.storeChunks(storeChunks);
  }

  /**
   * Update progress with error handling
   */
  private async updateProgress(
    documentId: string,
    update: ProgressUpdate,
  ): Promise<void> {
    try {
      await progressTracker.update(documentId, update);

      // Also update database if userId is provided
      if (
        this.config.userId &&
        update.stage &&
        update.status &&
        typeof update.progress === 'number'
      ) {
        await ragDatabase.updateProcessingStatus({
          documentId,
          status: update.status,
          stage: update.stage,
          progress: update.progress,
          errorMessage: update.error,
        });
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
      // Don't throw - progress tracking errors shouldn't stop processing
    }
  }
}
