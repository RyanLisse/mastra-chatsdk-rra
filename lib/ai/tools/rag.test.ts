// lib/ai/tools/rag.test.ts
// Test-specific mock for RAG tool to avoid Vercel Postgres import issues

import { tool } from 'ai';
import { z } from 'zod';

export const ragTool = tool({
  description: 'Mock RAG tool for testing - searches technical documentation',
  parameters: z.object({
    query: z.string().describe('The question to ask the knowledge base.'),
  }),
  execute: async ({ query }) => {
    // Mock implementation for testing
    return {
      context: `Mock RAG response for query: ${query}`,
    };
  },
});
