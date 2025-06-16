import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  validateFile,
  detectFileType,
  validateJSON,
} from '@/lib/rag/validation';
import { progressStore } from '@/lib/rag/progress';

describe('RAG Document Upload System', () => {
  beforeEach(() => {
    // Clear progress store before each test
    progressStore.clear();
  });

  afterEach(() => {
    // Clean up after each test
    progressStore.clear();
  });

  describe('File Validation', () => {
    it('should validate markdown files correctly', () => {
      const mockFile = new File(['# Test Content'], 'test.md', {
        type: 'text/markdown',
        lastModified: Date.now(),
      });

      const result = validateFile(mockFile);
      expect(result.success).toBe(true);
    });

    it('should validate JSON files correctly', () => {
      const mockFile = new File(
        ['{"title": "Test", "content": "Hello"}'],
        'test.json',
        {
          type: 'application/json',
          lastModified: Date.now(),
        },
      );

      const result = validateFile(mockFile);
      expect(result.success).toBe(true);
    });

    it('should reject files that are too large', () => {
      // Create a mock file larger than 50MB
      const largeContent = 'a'.repeat(51 * 1024 * 1024);
      const mockFile = new File([largeContent], 'large.md', {
        type: 'text/markdown',
        lastModified: Date.now(),
      });

      const result = validateFile(mockFile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('50MB');
    });

    it('should reject unsupported file types', () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
        lastModified: Date.now(),
      });

      const result = validateFile(mockFile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('markdown (.md) or JSON (.json)');
    });
  });

  describe('File Type Detection', () => {
    it('should detect markdown files', () => {
      const markdownFile = new File(['# Test'], 'document.md', {
        type: 'text/markdown',
      });

      const type = detectFileType(markdownFile);
      expect(type).toBe('markdown');
    });

    it('should detect JSON files', () => {
      const jsonFile = new File(['{}'], 'data.json', {
        type: 'application/json',
      });

      const type = detectFileType(jsonFile);
      expect(type).toBe('json');
    });

    it('should default to markdown for plain text files with .md extension', () => {
      const file = new File(['# Test'], 'document.md', {
        type: 'text/plain', // Sometimes .md files are detected as plain text
      });

      const type = detectFileType(file);
      expect(type).toBe('markdown');
    });
  });

  describe('JSON Validation', () => {
    it('should validate valid JSON documents', () => {
      const validJson = JSON.stringify({
        title: 'Test Document',
        content: 'This is test content',
        metadata: { author: 'Test Author' },
      });

      const result = validateJSON(validJson);
      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Test Document');
    });

    it('should handle JSON with array content', () => {
      const jsonWithArray = JSON.stringify({
        title: 'List Document',
        content: ['Item 1', 'Item 2', 'Item 3'],
      });

      const result = validateJSON(jsonWithArray);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data?.content)).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const invalidJson = '{ invalid json }';

      const result = validateJSON(invalidJson);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON format');
    });
  });

  describe('Progress Tracking', () => {
    it('should initialize progress state correctly', () => {
      const documentId = 'test-doc-123';
      const filename = 'test.md';

      const state = progressStore.initialize(documentId, filename);

      expect(state.documentId).toBe(documentId);
      expect(state.filename).toBe(filename);
      expect(state.stage).toBe('upload');
      expect(state.progress).toBe(0);
      expect(state.status).toBe('pending');
    });

    it('should update progress state correctly', () => {
      const documentId = 'test-doc-123';
      progressStore.initialize(documentId, 'test.md');

      const updatedState = progressStore.update(documentId, {
        stage: 'parsing',
        progress: 25,
        status: 'processing',
      });

      expect(updatedState?.stage).toBe('parsing');
      expect(updatedState?.progress).toBe(25);
      expect(updatedState?.status).toBe('processing');
    });

    it('should check if document exists in store', () => {
      const documentId = 'test-doc-123';

      expect(progressStore.exists(documentId)).toBe(false);

      progressStore.initialize(documentId, 'test.md');

      expect(progressStore.exists(documentId)).toBe(true);
    });

    it('should remove documents from store', () => {
      const documentId = 'test-doc-123';
      progressStore.initialize(documentId, 'test.md');

      expect(progressStore.exists(documentId)).toBe(true);

      const removed = progressStore.remove(documentId);

      expect(removed).toBe(true);
      expect(progressStore.exists(documentId)).toBe(false);
    });
  });
});

// Integration test helpers for manual testing
const testHelpers = {
  createMockMarkdownFile: (
    content = '# Test Document\n\nThis is test content.',
    filename = 'test.md',
  ) => {
    return new File([content], filename, {
      type: 'text/markdown',
      lastModified: Date.now(),
    });
  },

  createMockJSONFile: (
    data = { title: 'Test', content: 'Test content' },
    filename = 'test.json',
  ) => {
    return new File([JSON.stringify(data, null, 2)], filename, {
      type: 'application/json',
      lastModified: Date.now(),
    });
  },

  createMockMarkdownWithFrontmatter: (
    title = 'Test Document',
    tags = ['test'],
  ) => {
    const content = `---
title: ${title}
tags: ${JSON.stringify(tags)}
date: ${new Date().toISOString()}
---

# ${title}

This is a test document with frontmatter.

## Section 1

Some content here.

## Section 2

More content here.`;

    return new File([content], 'test-with-frontmatter.md', {
      type: 'text/markdown',
      lastModified: Date.now(),
    });
  },
};
