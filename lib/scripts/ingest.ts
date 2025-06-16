// lib/scripts/ingest.ts
import { config } from 'dotenv';
import { createCohere } from '@ai-sdk/cohere';
import { embed } from 'ai';
import { db } from '@vercel/postgres';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Load environment variables
config({ path: '.env.local' });

const cohere = createCohere({ apiKey: process.env.COHERE_API_KEY });
const embeddingModel = cohere.embedding('embed-english-v3.0');

// Simple chunking function
function chunkText(text: string, chunkSize = 250, overlap = 50): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

export async function ingestDocuments() {
  const client = await db.connect();
  try {
    const docPath = path.join(process.cwd(), 'knowledge-base', 'robo-manual.md');
    const document = await fs.readFile(docPath, 'utf-8');
    const chunks = chunkText(document);

    console.log(`Processing ${chunks.length} chunks...`);

    // Process chunks one by one to avoid memory issues
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
      const { embedding } = await embed({
        model: embeddingModel,
        value: chunks[i],
      });

      console.log(`Embedding dimensions: ${embedding?.length || 'undefined'}`);
      
      if (!embedding || embedding.length !== 1024) {
        console.error(`Invalid embedding dimensions: expected 1024, got ${embedding?.length || 'undefined'}`);
        continue;
      }

      await client.sql`
        INSERT INTO "DocumentChunk" (content, embedding)
        VALUES (${chunks[i]}, ${JSON.stringify(embedding)})
      `;
    }

    console.log('Successfully ingested documents.');
    return { success: true, chunkCount: chunks.length };
  } catch (error) {
    console.error('Error during ingestion:', error);
    return { success: false, error };
  } finally {
    client.release();
  }
}

console.log('Starting document ingestion...');
ingestDocuments().then(({ success, chunkCount, error }) => {
  if (success) {
    console.log(`Ingestion complete. Stored ${chunkCount} document chunks.`);
    process.exit(0);
  } else {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
});