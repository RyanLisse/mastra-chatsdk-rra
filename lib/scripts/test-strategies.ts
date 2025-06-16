#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import path from 'path';
import { MarkdownStrategy } from '../rag/strategies/markdown';
import { JSONStrategy } from '../rag/strategies/json';

/**
 * Simple test script to validate strategy implementations
 * without database dependencies
 */

const DATA_DIR = path.join(process.cwd(), 'data');

async function testStrategies() {
  console.log('🧪 Testing Document Processing Strategies\n');

  // Initialize strategies
  const markdownStrategy = new MarkdownStrategy({
    chunkSize: 512,
    chunkOverlap: 50,
    preserveHeaders: true,
    chunkByHeaders: true,
    extractMetadata: true
  });

  const jsonStrategy = new JSONStrategy({
    chunkSize: 512,
    chunkOverlap: 50,
    preserveStructure: true,
    groupRelatedItems: true,
    extractMetadata: true
  });

  // Test with a few sample files
  const testFiles = [
    'FAQ_RoboRail_measurement_v0.0_020524.extraction.md',
    'Confirm the calibration.extraction.md',
    'roborail_qa_dataset_no_vectors.json'
  ];

  for (const filename of testFiles) {
    const filePath = path.join(DATA_DIR, filename);
    
    try {
      console.log(`📄 Testing: ${filename}`);
      console.log('─'.repeat(50));

      // Check if file exists
      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`   Content length: ${content.length} characters`);

      if (filename.endsWith('.md')) {
        // Test markdown strategy
        console.log('   🔤 Testing Markdown Strategy');
        
        const parseResult = markdownStrategy.parse(content);
        console.log(`      Frontmatter keys: ${Object.keys(parseResult.frontmatter).join(', ')}`);
        console.log(`      Headers found: ${parseResult.headers.length}`);
        console.log(`      Metadata type: ${parseResult.metadata.type}`);
        console.log(`      Category: ${parseResult.metadata.category || 'none'}`);
        
        if (parseResult.metadata.technicalTerms) {
          console.log(`      Technical terms: ${parseResult.metadata.technicalTerms.join(', ')}`);
        }

        const chunks = markdownStrategy.chunk(parseResult);
        console.log(`      Chunks created: ${chunks.length}`);
        
        // Show sample chunks
        chunks.slice(0, 2).forEach((chunk, i) => {
          console.log(`      Chunk ${i + 1}:`);
          console.log(`        - Type: ${chunk.metadata.chunkType}`);
          console.log(`        - Length: ${chunk.text.length} chars`);
          if (chunk.metadata.headerText) {
            console.log(`        - Header: ${chunk.metadata.headerText}`);
          }
          console.log(`        - Preview: ${chunk.text.substring(0, 100)}...`);
        });

      } else if (filename.endsWith('.json')) {
        // Test JSON strategy
        console.log('   📊 Testing JSON Strategy');
        
        const parseResult = jsonStrategy.parse(content);
        console.log(`      Schema type: ${parseResult.schema.type}`);
        console.log(`      Item count: ${parseResult.schema.itemCount}`);
        console.log(`      Properties: ${parseResult.schema.properties.join(', ')}`);
        console.log(`      Depth: ${parseResult.schema.depth}`);

        if (parseResult.metadata.questionCount) {
          console.log(`      Questions: ${parseResult.metadata.questionCount}`);
        }
        if (parseResult.metadata.categories) {
          console.log(`      Categories: ${parseResult.metadata.categories.join(', ')}`);
        }

        const chunks = jsonStrategy.chunk(parseResult);
        console.log(`      Chunks created: ${chunks.length}`);
        
        // Show sample chunks
        chunks.slice(0, 2).forEach((chunk, i) => {
          console.log(`      Chunk ${i + 1}:`);
          console.log(`        - Type: ${chunk.metadata.chunkType}`);
          console.log(`        - Length: ${chunk.text.length} chars`);
          if (chunk.metadata.category) {
            console.log(`        - Category: ${chunk.metadata.category}`);
          }
          if (chunk.metadata.itemCount) {
            console.log(`        - Items: ${chunk.metadata.itemCount}`);
          }
          console.log(`        - Preview: ${chunk.text.substring(0, 150)}...`);
        });
      }

    } catch (error) {
      console.log(`   ❌ Error with ${filename}:`);
      console.log(`      ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log();
  }

  console.log('✅ Strategy testing completed!');
}

// Run the test
testStrategies().catch(console.error);