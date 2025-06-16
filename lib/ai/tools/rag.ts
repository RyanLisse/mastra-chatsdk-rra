import { tool } from 'ai';
import { createCohere } from '@ai-sdk/cohere';
import { embed } from 'ai';
import { db } from '@vercel/postgres';
import { z } from 'zod';
import { traceRAGTool } from '../../mastra/langsmith';

const cohere = createCohere({ apiKey: process.env.COHERE_API_KEY });
const embeddingModel = cohere.embedding('embed-english-v3.0');

export const ragTool = tool({
  description: 'Searches the RoboRail technical documentation to answer questions about operations, safety, and troubleshooting.',
  parameters: z.object({
    query: z.string().describe('The question to ask the knowledge base.'),
  }),
  execute: async ({ query }) => {
    return traceRAGTool(
      query,
      async () => {
        try {
          const { embedding } = await embed({
            model: embeddingModel,
            value: query,
          });

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
          console.error("Error searching knowledge base:", error);
          return { error: 'Failed to search knowledge base.' };
        }
      }
    );
  },
});