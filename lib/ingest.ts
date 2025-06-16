import { createCohere } from '@ai-sdk/cohere';
import { embed } from 'ai';
import { db } from '@vercel/postgres';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const cohere = createCohere({
  apiKey: process.env.COHERE_API_KEY || '',
});
const embeddingModel = cohere.embedding('embed-english-v3.0');

/**
 * Splits text into manageable chunks with optional overlap
 * @param text - The text to chunk
 * @param chunkSize - Maximum size of each chunk
 * @param overlap - Number of characters to overlap between chunks
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  chunkSize = 250,
  overlap = 50,
): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.substring(start, end);

    // If we're not at the end and the chunk doesn't end with a sentence boundary,
    // try to find a good breaking point
    if (end < text.length && !chunk.match(/[.!?]\s*$/)) {
      const lastSentenceEnd = chunk.lastIndexOf('.');
      const lastExclamation = chunk.lastIndexOf('!');
      const lastQuestion = chunk.lastIndexOf('?');
      const lastBoundary = Math.max(
        lastSentenceEnd,
        lastExclamation,
        lastQuestion,
      );

      if (lastBoundary > chunk.length * 0.5) {
        chunk = chunk.substring(0, lastBoundary + 1);
      }
    }

    chunks.push(chunk.trim());

    // Move start position, accounting for overlap
    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Generates embeddings for an array of text chunks using Cohere
 * @param chunks - Array of text chunks
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(
  chunks: string[],
): Promise<number[][]> {
  try {
    const embeddings = [];

    for (const chunk of chunks) {
      const result = await embed({
        model: embeddingModel,
        value: chunk,
      });
      embeddings.push(result.embedding);
    }

    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
}

/**
 * Stores document chunks and their embeddings in PostgreSQL
 * @param chunks - Array of text chunks
 * @param embeddings - Array of corresponding embeddings
 * @returns Number of chunks stored
 */
export async function storeChunks(
  chunks: string[],
  embeddings: number[][],
): Promise<number> {
  if (chunks.length !== embeddings.length) {
    throw new Error('Chunks and embeddings arrays must have the same length');
  }

  const client = await db.connect();
  let storedCount = 0;

  try {
    for (let i = 0; i < chunks.length; i++) {
      await client.sql`
        INSERT INTO "DocumentChunk" (content, embedding)
        VALUES (${chunks[i]}, ${JSON.stringify(embeddings[i])})
      `;
      storedCount++;
    }
  } catch (error) {
    console.error('Error storing chunks:', error);
    throw new Error('Failed to store chunks in database');
  } finally {
    client.release();
  }

  return storedCount;
}

/**
 * Main function to ingest documents from the knowledge base
 * @param customPath - Optional custom path to document (for testing)
 * @returns Result object with success status and metadata
 */
export async function ingestDocuments(customPath?: string): Promise<{
  success: boolean;
  chunkCount?: number;
  error?: any;
}> {
  try {
    // Determine the document path
    const docPath =
      customPath ||
      path.join(process.cwd(), 'knowledge-base', 'robo-manual.md');

    // Check if file exists
    try {
      await fs.access(docPath);
    } catch {
      throw new Error(`Document not found at path: ${docPath}`);
    }

    console.log(`Reading document from: ${docPath}`);

    // Read the document
    const document = await fs.readFile(docPath, 'utf-8');

    if (!document.trim()) {
      throw new Error('Document is empty');
    }

    console.log(
      `Document read successfully. Length: ${document.length} characters`,
    );

    // Chunk the document
    const chunks = chunkText(document);
    console.log(`Document split into ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error('No chunks generated from document');
    }

    // Generate embeddings
    console.log('Generating embeddings...');
    const embeddings = await generateEmbeddings(chunks);
    console.log('Embeddings generated successfully');

    // Store in database
    console.log('Storing chunks in database...');
    const storedCount = await storeChunks(chunks, embeddings);
    console.log(`Successfully stored ${storedCount} chunks`);

    return {
      success: true,
      chunkCount: storedCount,
    };
  } catch (error) {
    console.error('Error during document ingestion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
