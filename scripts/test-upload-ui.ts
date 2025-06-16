#!/usr/bin/env bun

/**
 * Test script for upload UI functionality
 * Tests file validation, type detection, and upload process
 */

import { validateFile, detectFileType } from '../lib/rag/validation';
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

const TEST_FILES = [
  'FAQ Data collection.extraction.md',
  'FAQ No communication to PMAC.extraction.md', 
  'FAQ_RoboRail_Chuck_alignment_calibration_v0.0_080424.extraction.md',
  'roborail_qa_dataset_no_vectors.json'
];

async function createMockFile(filePath: string): Promise<File> {
  const fullPath = join(process.cwd(), 'data', filePath);
  const content = readFileSync(fullPath, 'utf-8');
  const stats = statSync(fullPath);
  
  // Create a mock File object
  const blob = new Blob([content], { 
    type: filePath.endsWith('.json') ? 'application/json' : 'text/markdown' 
  });
  
  return new File([blob], filePath, { 
    type: blob.type,
    lastModified: stats.mtime.getTime()
  });
}

async function testFileValidation() {
  console.log('🧪 Testing file validation...\n');
  
  for (const fileName of TEST_FILES) {
    try {
      const file = await createMockFile(fileName);
      const validation = validateFile(file);
      const fileType = detectFileType(file);
      
      console.log(`📄 ${fileName}`);
      console.log(`   Size: ${(file.size / 1024).toFixed(1)} KB`);
      console.log(`   Type: ${fileType}`);
      console.log(`   Valid: ${validation.success ? '✅' : '❌'}`);
      if (!validation.success) {
        console.log(`   Error: ${validation.error}`);
      }
      console.log();
      
    } catch (error) {
      console.error(`❌ Failed to test ${fileName}:`, error);
    }
  }
}

async function testFileSizeLimits() {
  console.log('🧪 Testing file size limits...\n');
  
  // Test with a large file (simulate 60MB)
  const largeContent = 'x'.repeat(60 * 1024 * 1024);
  const largeBlob = new Blob([largeContent], { type: 'text/markdown' });
  const largeFile = new File([largeBlob], 'large-file.md', { type: 'text/markdown' });
  
  const validation = validateFile(largeFile);
  console.log(`📄 Large File Test (60MB)`);
  console.log(`   Valid: ${validation.success ? '✅' : '❌'}`);
  console.log(`   Error: ${validation.error || 'None'}`);
  console.log();
}

async function testFileTypeDetection() {
  console.log('🧪 Testing file type detection...\n');
  
  const testCases = [
    { name: 'test.md', type: 'text/markdown', expected: 'markdown' },
    { name: 'test.markdown', type: 'text/markdown', expected: 'markdown' },
    { name: 'test.json', type: 'application/json', expected: 'json' },
    { name: 'test.txt', type: 'text/plain', expected: 'markdown' }, // Should default to markdown
  ];
  
  for (const testCase of testCases) {
    const blob = new Blob(['test content'], { type: testCase.type });
    const file = new File([blob], testCase.name, { type: testCase.type });
    const detectedType = detectFileType(file);
    
    console.log(`📄 ${testCase.name} (${testCase.type})`);
    console.log(`   Expected: ${testCase.expected}`);
    console.log(`   Detected: ${detectedType}`);
    console.log(`   Correct: ${detectedType === testCase.expected ? '✅' : '❌'}`);
    console.log();
  }
}

async function main() {
  console.log('🚀 Starting Upload UI Test Suite\n');
  console.log('=' .repeat(50));
  
  try {
    await testFileValidation();
    console.log('=' .repeat(50));
    await testFileSizeLimits();
    console.log('=' .repeat(50));
    await testFileTypeDetection();
    console.log('=' .repeat(50));
    
    console.log('✅ Upload UI tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Only run if this script is executed directly (Bun-specific check)
// @ts-ignore
if (import.meta.main) {
  main();
}