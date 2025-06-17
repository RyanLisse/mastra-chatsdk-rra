import { tool, embed } from 'ai';
import { createCohere } from '@ai-sdk/cohere';
import { z } from 'zod';
import { traceRAGTool } from '../../mastra/langsmith';

// Conditional import for @vercel/postgres to avoid test environment issues
let db: any;
if (process.env.NODE_ENV !== 'test' && process.env.PLAYWRIGHT !== 'true') {
  try {
    db = require('@vercel/postgres').db;
  } catch (error) {
    console.warn('Vercel Postgres not available, RAG tool will use fallback');
  }
}

const cohere = createCohere({ apiKey: process.env.COHERE_API_KEY });
const embeddingModel = cohere.embedding('embed-english-v3.0');

export const ragTool = tool({
  description:
    'Searches the RoboRail technical documentation to answer questions about operations, safety, and troubleshooting.',
  parameters: z.object({
    query: z.string().describe('The question to ask the knowledge base.'),
  }),
  execute: async ({ query }) => {
    return traceRAGTool(query, async () => {
      try {
        const { embedding } = await embed({
          model: embeddingModel,
          value: query,
        });

        if (!db) {
          return {
            error: 'Database connection not available in test environment.',
          };
        }

        const client = await db.connect();
        // Find the 3 most similar documents using cosine distance
        const { rows } = await client.sql`
            SELECT content FROM "DocumentChunk"
            ORDER BY embedding <=> ${JSON.stringify(embedding)}
            LIMIT 3
          `;
        client.release();

        const context = rows.map((row: any) => row.content).join('\n---\n');
        return { context };
      } catch (error) {
        console.error('Error searching knowledge base:', error);
        return { error: 'Failed to search knowledge base.' };
      }
    });
  },
});
