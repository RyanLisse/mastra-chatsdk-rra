#!/usr/bin/env bun

/**
 * Test script for RAG document upload system
 * This script tests the upload system with actual RoboRail documentation files
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DocumentProcessor } from '@/lib/rag/processor';
import { progressTracker } from '@/lib/rag/progress';
import { validateFile, detectFileType } from '@/lib/rag/validation';
import { nanoid } from 'nanoid';

async function testRoboRailDocuments() {
  console.log('🚀 Testing RAG Upload System with RoboRail Documents\n');

  const dataDir = path.join(process.cwd(), 'data');
  
  try {
    // List all files in data directory
    const files = await fs.readdir(dataDir);
    const markdownFiles = files.filter(f => f.endsWith('.md'));
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`Found ${markdownFiles.length} markdown files and ${jsonFiles.length} JSON files\n`);

    // Test with one markdown file
    if (markdownFiles.length > 0) {
      const testFile = markdownFiles[0];
      console.log(`📄 Testing with: ${testFile}`);
      
      const filePath = path.join(dataDir, testFile);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Create a mock File object
      const file = new File([content], testFile, {
        type: 'text/markdown',
        lastModified: Date.now()
      });
      
      // Validate file
      console.log('🔍 Validating file...');
      const validation = validateFile(file);
      if (!validation.success) {
        console.error('❌ File validation failed:', validation.error);
        return;
      }
      console.log('✅ File validation passed');
      
      // Detect type
      const fileType = detectFileType(file);
      console.log(`📋 Detected type: ${fileType}`);
      
      // Generate document ID
      const documentId = nanoid();
      console.log(`🆔 Document ID: ${documentId}`);
      
      // Set up progress tracking
      console.log('\n📈 Setting up progress tracking...');
      progressTracker.subscribe(documentId, (event) => {
        console.log(`Progress: ${event.stage} - ${event.progress}% (${event.status})`);
        if (event.error) {
          console.error(`Error: ${event.error}`);
        }
      });
      
      // Create processor (without userId for testing)
      const processor = new DocumentProcessor({
        chunkSize: 512,
        chunkOverlap: 50,
        maxEmbeddingRetries: 3,
        batchSize: 3
      });
      
      try {
        console.log('\n🔄 Starting document processing...');
        const result = await processor.process(content, testFile, fileType, documentId);
        
        console.log('\n✅ Processing completed!');
        console.log(`📊 Results:`);
        console.log(`   - Document ID: ${result.documentId}`);
        console.log(`   - Filename: ${result.filename}`);
        console.log(`   - Chunks: ${result.chunkCount}`);
        console.log(`   - Embeddings: ${result.embeddingCount}`);
        console.log(`   - Status: ${result.status}`);
        
        if (result.errors?.length) {
          console.log(`   - Errors: ${result.errors.join(', ')}`);
        }
        
        // Show sample chunks
        console.log('\n📝 Sample chunks:');
        result.chunks.slice(0, 3).forEach((chunk, i) => {
          console.log(`   ${i + 1}. ${chunk.text.substring(0, 100)}...`);
        });
        
      } catch (error) {
        console.error('\n❌ Processing failed:', error);
        
        // Check final progress state
        const finalState = progressTracker.getState(documentId);
        if (finalState) {
          console.log(`Final state: ${finalState.stage} - ${finalState.status}`);
          if (finalState.error) {
            console.log(`Error: ${finalState.error}`);
          }
        }
      }
    }
    
    // Test with JSON file if available
    if (jsonFiles.length > 0) {
      console.log(`\n📄 Testing JSON file: ${jsonFiles[0]}`);
      
      const filePath = path.join(dataDir, jsonFiles[0]);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Validate JSON structure 
      try {
        const parsed = JSON.parse(content);
        console.log('✅ Valid JSON structure');
        console.log(`📊 Keys: ${Object.keys(parsed).join(', ')}`);
        
        if (Array.isArray(parsed)) {
          console.log(`📝 Array with ${parsed.length} items`);
        }
      } catch (error) {
        console.error('❌ Invalid JSON:', error);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Health check function
async function healthCheck() {
  console.log('🏥 Running health checks...\n');
  
  try {
    // Check if required environment variables are set
    if (!process.env.COHERE_API_KEY) {
      console.warn('⚠️  COHERE_API_KEY not set - embedding generation will fail');
    } else {
      console.log('✅ COHERE_API_KEY is set');
    }
    
    if (!process.env.POSTGRES_URL) {
      console.warn('⚠️  POSTGRES_URL not set - database operations will fail');
    } else {
      console.log('✅ POSTGRES_URL is set');
    }
    
    // Test data directory access
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.access(dataDir);
      const files = await fs.readdir(dataDir);
      console.log(`✅ Data directory accessible with ${files.length} files`);
    } catch (error) {
      console.error('❌ Cannot access data directory:', error);
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--health')) {
    await healthCheck();
  } else {
    await healthCheck();
    console.log(''); // Empty line
    await testRoboRailDocuments();
  }
}

// Run if called directly (Bun-specific check)
// @ts-ignore
if (import.meta.main) {
  main().catch(console.error);
}

export { testRoboRailDocuments, healthCheck };