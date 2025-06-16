// lib/scripts/setup-db.ts
import { config } from 'dotenv';
import { db } from '@vercel/postgres';

// Load environment variables
config({ path: '.env.local' });

async function setupDatabase() {
  const client = await db.connect();
  try {
    // Enable the pgvector extension
    await client.sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('Vector extension enabled.');

    // Drop dependent tables first, then recreate
    await client.sql`DROP TABLE IF EXISTS "DocumentEmbedding" CASCADE`;
    await client.sql`DROP TABLE IF EXISTS "DocumentChunk" CASCADE`;
    await client.sql`DROP TABLE IF EXISTS "chat_sessions" CASCADE`;
    
    // Create the DocumentChunk table for RAG system
    // The embedding dimension (1024) must match the OpenAI text-embedding-ada-002 model's output
    await client.sql`
      CREATE TABLE "DocumentChunk" (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        embedding VECTOR(1024),
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log('DocumentChunk table created or already exists.');

    // Create the chat_sessions table for multi-turn conversations
    await client.sql`
      CREATE TABLE "chat_sessions" (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        message JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('chat_sessions table created or already exists.');
  } catch (error) {
    console.error('Error setting up the database:', error);
    throw error;
  } finally {
    client.release();
  }
}

setupDatabase().then(() => {
  console.log('Database setup complete.');
  process.exit(0);
}).catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});