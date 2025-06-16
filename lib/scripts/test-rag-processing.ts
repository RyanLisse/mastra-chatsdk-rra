#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import path from 'path';
import { DocumentProcessor } from '../rag/processor';
import { detectFileType } from '../rag/validation';

/**
 * Test script to process actual RoboRail data files
 * and validate the advanced document processing pipeline
 */

const DATA_DIR = path.join(process.cwd(), 'data');

async function testRoboRailProcessing() {
  console.log('🤖 Testing RoboRail Document Processing Pipeline\n');

  try {
    // Initialize processor
    const processor = new DocumentProcessor({
      chunkSize: 512,
      chunkOverlap: 50,
      userId: 'test-user' // For testing purposes
    });

    // Get all files in data directory
    const files = await fs.readdir(DATA_DIR);
    const dataFiles = files.filter(file => 
      file.endsWith('.md') || file.endsWith('.json')
    );

    console.log(`Found ${dataFiles.length} data files to process:\n`);
    dataFiles.forEach(file => console.log(`  - ${file}`));
    console.log();

    // Process each file
    for (const filename of dataFiles) {
      const filePath = path.join(DATA_DIR, filename);
      console.log(`📄 Processing: ${filename}`);
      console.log('─'.repeat(60));

      try {
        // Read file content
        const content = await fs.readFile(filePath, 'utf-8');
        console.log(`   Content length: ${content.length} characters`);

        // Detect file type
        const mockFile = new File([content], filename, { 
          type: filename.endsWith('.json') ? 'application/json' : 'text/markdown' 
        });
        const fileType = detectFileType(mockFile);
        console.log(`   Detected type: ${fileType}`);

        // Generate unique document ID for testing
        const documentId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Process the document
        const startTime = Date.now();
        const result = await processor.process(content, filename, fileType, documentId);
        const processingTime = Date.now() - startTime;

        // Display results
        console.log(`   ✅ Processing completed in ${processingTime}ms`);
        console.log(`   📊 Results:`);
        console.log(`      - Status: ${result.status}`);
        console.log(`      - Chunks: ${result.chunkCount}`);
        console.log(`      - Embeddings: ${result.embeddingCount}`);
        
        if (result.metadata) {
          console.log(`      - Metadata keys: ${Object.keys(result.metadata).join(', ')}`);
          
          // Show specific metadata based on type
          if (fileType === 'markdown') {
            const md = result.metadata as any;
            if (md?.title) console.log(`      - Title: ${md.title}`);
            if (md?.category) console.log(`      - Category: ${md.category}`);
            if (md?.headerCount) console.log(`      - Headers: ${md.headerCount}`);
            if (md?.technicalTerms) console.log(`      - Technical terms: ${md.technicalTerms.join(', ')}`);
          } else if (fileType === 'json') {
            const json = result.metadata as any;
            if (json?.jsonType) console.log(`      - JSON type: ${json.jsonType}`);
            if (json?.questionCount) console.log(`      - Questions: ${json.questionCount}`);
            if (json?.categories) console.log(`      - Categories: ${json.categories.join(', ')}`);
          }
        }

        // Show chunk details
        if (result.chunks.length > 0) {
          console.log(`   📑 Chunk details:`);
          result.chunks.slice(0, 3).forEach((chunk, i) => {
            console.log(`      Chunk ${i + 1}:`);
            console.log(`        - ID: ${chunk.id}`);
            console.log(`        - Length: ${chunk.text.length} chars`);
            console.log(`        - Preview: ${chunk.text.substring(0, 100)}...`);
            if (chunk.metadata.chunkType) {
              console.log(`        - Type: ${chunk.metadata.chunkType}`);
            }
            if (chunk.metadata.headerText) {
              console.log(`        - Header: ${chunk.metadata.headerText}`);
            }
          });
          
          if (result.chunks.length > 3) {
            console.log(`      ... and ${result.chunks.length - 3} more chunks`);
          }
        }

      } catch (error) {
        console.log(`   ❌ Error processing ${filename}:`);
        console.log(`      ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      console.log();
    }

    // Summary
    console.log('📋 Processing Summary');
    console.log('─'.repeat(60));
    console.log(`Total files processed: ${dataFiles.length}`);
    console.log('✅ Advanced document processing pipeline test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testRoboRailProcessing().catch(console.error);
}

export { testRoboRailProcessing };