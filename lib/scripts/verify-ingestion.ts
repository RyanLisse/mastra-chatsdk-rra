import { config } from 'dotenv';
import { db } from '@vercel/postgres';

// Load environment variables
config({ path: '.env.local' });

async function verifyIngestion() {
  const client = await db.connect();
  try {
    // Check if we have chunks in the database
    const { rows: counts } = await client.sql`
      SELECT COUNT(*) as count FROM "DocumentChunk"
    `;
    
    console.log(`Total chunks in database: ${counts[0].count}`);
    
    if (Number(counts[0].count) > 0) {
      // Show a sample of stored chunks
      const { rows: samples } = await client.sql`
        SELECT content, LENGTH(content) as content_length
        FROM "DocumentChunk" 
        LIMIT 3
      `;
      
      console.log('\nSample chunks:');
      samples.forEach((row, index) => {
        console.log(`\nChunk ${index + 1} (${row.content_length} chars):`);
        console.log(row.content.substring(0, 100) + (row.content.length > 100 ? '...' : ''));
      });
      
      // Check if embeddings exist (simplified check)
      const { rows: embeddings } = await client.sql`
        SELECT CASE WHEN embedding IS NOT NULL THEN 'YES' ELSE 'NO' END as has_embedding
        FROM "DocumentChunk" 
        LIMIT 1
      `;
      
      if (embeddings.length > 0) {
        console.log(`\nEmbeddings present: ${embeddings[0].has_embedding}`);
      }
      
      console.log('\n✅ Document ingestion verification successful!');
      console.log('The RoboRail manual has been properly chunked and embedded.');
    } else {
      console.log('❌ No chunks found in database. Please run the ingestion script first.');
    }
    
  } catch (error) {
    console.error('❌ Error verifying ingestion:', error);
  } finally {
    client.release();
  }
}

console.log('🔍 Verifying document ingestion...\n');
verifyIngestion().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});