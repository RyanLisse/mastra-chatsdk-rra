#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import path from 'path';
import { MarkdownStrategy } from '../rag/strategies/markdown';
import { JSONStrategy } from '../rag/strategies/json';

async function simpleTest() {
  console.log('🧪 Simple Strategy Test\n');

  // Test markdown with a small file
  try {
    console.log('📄 Testing Markdown Strategy');
    const markdownPath = path.join(process.cwd(), 'data', 'FAQ_RoboRail_Chuck_alignment_calibration_v0.0_080424.extraction.md');
    const markdownContent = await fs.readFile(markdownPath, 'utf-8');
    console.log(`Content length: ${markdownContent.length} chars`);

    const markdownStrategy = new MarkdownStrategy({
      chunkSize: 256, // Smaller for testing
      chunkOverlap: 25,
      preserveHeaders: true,
      chunkByHeaders: true
    });

    const parseResult = markdownStrategy.parse(markdownContent);
    console.log(`✅ Parsed successfully:`);
    console.log(`   - Headers: ${parseResult.headers.length}`);
    console.log(`   - Category: ${parseResult.metadata.category}`);
    console.log(`   - Word count: ${parseResult.metadata.wordCount}`);

    const chunks = markdownStrategy.chunk(parseResult);
    console.log(`   - Chunks: ${chunks.length}`);
    console.log(`   - First chunk: ${chunks[0]?.text.substring(0, 100)}...\n`);

  } catch (error) {
    console.error('❌ Markdown test failed:', error);
  }

  // Test JSON with a small sample
  try {
    console.log('📊 Testing JSON Strategy');
    
    // Create a small sample JSON for testing
    const sampleJSON = JSON.stringify([
      {
        "question": "What procedures should be performed before starting the Roborail Machine?",
        "answer": "Check the machine for any visible damage, ensure all safety guards are in place, and confirm that the area is clear of obstructions.",
        "chunk_id": "test1"
      },
      {
        "question": "How can you fix a malfunctioning rail sensor on the Roborail Machine?",
        "answer": "Inspect the wiring for damage and ensure the sensor is correctly aligned with the rail.",
        "chunk_id": "test1"
      }
    ], null, 2);

    console.log(`Sample JSON length: ${sampleJSON.length} chars`);

    const jsonStrategy = new JSONStrategy({
      chunkSize: 256,
      chunkOverlap: 25,
      preserveStructure: true,
      groupRelatedItems: true
    });

    const parseResult = jsonStrategy.parse(sampleJSON);
    console.log(`✅ Parsed successfully:`);
    console.log(`   - Schema type: ${parseResult.schema.type}`);
    console.log(`   - Item count: ${parseResult.schema.itemCount}`);
    console.log(`   - Properties: ${parseResult.schema.properties.join(', ')}`);

    const chunks = jsonStrategy.chunk(parseResult);
    console.log(`   - Chunks: ${chunks.length}`);
    if (chunks.length > 0) {
      console.log(`   - First chunk type: ${chunks[0].metadata.chunkType}`);
      console.log(`   - First chunk preview: ${chunks[0].text.substring(0, 100)}...\n`);
    }

  } catch (error) {
    console.error('❌ JSON test failed:', error);
  }

  console.log('✅ Simple test completed!');
}

simpleTest().catch(console.error);