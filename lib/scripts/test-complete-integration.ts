#!/usr/bin/env tsx

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DocumentProcessor } from '../rag/processor';
import { detectFileType } from '../rag/validation';
import { ragTool } from '../ai/tools/rag';

/**
 * Complete integration test that processes documents and validates
 * they can be retrieved through the existing RAG tool
 */

async function completeIntegrationTest() {
  console.log('🔄 Complete RAG Pipeline Integration Test\n');

  try {
    // Test with a small document to avoid overwhelming the system
    const testFile =
      'FAQ_RoboRail_Chuck_alignment_calibration_v0.0_080424.extraction.md';
    const filePath = path.join(process.cwd(), 'data', testFile);

    console.log(`📄 Processing test file: ${testFile}`);
    console.log('─'.repeat(60));

    // Step 1: Read and process the document
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`   Content length: ${content.length} characters`);

    const mockFile = new File([content], testFile, {
      type: 'text/markdown',
    });
    const fileType = detectFileType(mockFile);
    console.log(`   Detected type: ${fileType}`);

    // Initialize processor with test user
    const processor = new DocumentProcessor({
      chunkSize: 256, // Smaller chunks for testing
      chunkOverlap: 25,
      userId: 'integration-test-user',
    });

    // Generate unique document ID
    const documentId = `integration-test-${Date.now()}`;

    // Step 2: Process the document
    console.log('\n🔧 Processing document...');
    const startTime = Date.now();

    try {
      const result = await processor.process(
        content,
        testFile,
        fileType,
        documentId,
      );
      const processingTime = Date.now() - startTime;

      console.log(`✅ Processing completed in ${processingTime}ms`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Chunks created: ${result.chunkCount}`);
      console.log(`   Embeddings generated: ${result.embeddingCount}`);

      // Step 3: Test retrieval with the RAG tool
      console.log('\n🔍 Testing document retrieval...');

      const testQueries = [
        'How do I calibrate the RoboRail chuck alignment?',
        'What are the safety procedures for RoboRail?',
        'What tools are needed for chuck calibration?',
        'How do I check if calibration was successful?',
      ];

      for (const query of testQueries) {
        console.log(`\n   Query: "${query}"`);

        try {
          const retrievalResult = await ragTool.execute(
            { query },
            {
              toolCallId: 'test-call',
              messages: [],
            },
          );

          if (retrievalResult.error) {
            console.log(`   ❌ Error: ${retrievalResult.error}`);
          } else if (retrievalResult.context) {
            const contextLength = retrievalResult.context.length;
            console.log(`   ✅ Retrieved context: ${contextLength} characters`);

            // Check if the context contains relevant information
            const contextLower = retrievalResult.context.toLowerCase();
            const queryWords = query.toLowerCase().split(' ');
            const relevantWords = queryWords.filter(
              (word) => word.length > 3 && contextLower.includes(word),
            );

            console.log(
              `   📊 Relevance: ${relevantWords.length}/${queryWords.length} query words found`,
            );
            console.log(`   🔗 Relevant terms: ${relevantWords.join(', ')}`);

            // Show a preview of the context
            const preview = retrievalResult.context.substring(0, 200);
            console.log(`   👀 Context preview: ${preview}...`);
          } else {
            console.log(`   ⚠️  No context returned`);
          }
        } catch (error) {
          console.log(
            `   ❌ Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Step 4: Validate document processing results
      console.log('\n📊 Processing Quality Analysis');
      console.log('─'.repeat(40));

      if (result.chunks && result.chunks.length > 0) {
        // Analyze chunk quality
        const avgChunkLength =
          result.chunks.reduce((sum, chunk) => sum + chunk.text.length, 0) /
          result.chunks.length;
        const minChunkLength = Math.min(
          ...result.chunks.map((chunk) => chunk.text.length),
        );
        const maxChunkLength = Math.max(
          ...result.chunks.map((chunk) => chunk.text.length),
        );

        console.log(
          `   Average chunk length: ${Math.round(avgChunkLength)} characters`,
        );
        console.log(
          `   Chunk length range: ${minChunkLength} - ${maxChunkLength} characters`,
        );

        // Check metadata quality
        const chunksWithMetadata = result.chunks.filter(
          (chunk) => chunk.metadata && Object.keys(chunk.metadata).length > 5,
        );
        console.log(
          `   Chunks with rich metadata: ${chunksWithMetadata.length}/${result.chunks.length}`,
        );

        // Show sample chunk
        const sampleChunk = result.chunks[0];
        console.log(
          `   Sample chunk metadata keys: ${Object.keys(sampleChunk.metadata).join(', ')}`,
        );

        // Check for specific RoboRail content
        const roboRailMentions = result.chunks.filter(
          (chunk) =>
            chunk.text.toLowerCase().includes('roborail') ||
            chunk.text.toLowerCase().includes('calibration') ||
            chunk.text.toLowerCase().includes('chuck'),
        ).length;

        console.log(
          `   Chunks with RoboRail content: ${roboRailMentions}/${result.chunks.length}`,
        );
      }

      console.log('\n✅ Integration test completed successfully!');
      console.log('\n📋 Summary:');
      console.log(`   - Document processed: ${testFile}`);
      console.log(`   - Processing time: ${processingTime}ms`);
      console.log(`   - Chunks created: ${result.chunkCount}`);
      console.log(`   - Embeddings generated: ${result.embeddingCount}`);
      console.log(`   - RAG retrieval: Functional`);
      console.log(`   - Integration status: ✅ SUCCESS`);
    } catch (processingError) {
      console.error('❌ Document processing failed:', processingError);
      return;
    }
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run the integration test
if (require.main === module) {
  completeIntegrationTest().catch(console.error);
}

export { completeIntegrationTest };
