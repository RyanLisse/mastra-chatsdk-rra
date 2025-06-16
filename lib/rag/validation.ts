import { z } from 'zod';

// Supported file types
export const SupportedFileType = z.enum(['markdown', 'json']);

// Markdown frontmatter schema
export const MarkdownFrontmatterSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  tags: z.array(z.string()).optional(),
  draft: z.boolean().default(false).optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  source: z.string().optional()
});

// Document metadata schema
export const DocumentMetadataSchema = z.object({
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  version: z.string().optional(),
  customFields: z.record(z.unknown()).optional()
});

// File validation schema  
export const FileValidationSchema = z.object({
  file: z.instanceof(File)
    .refine(
      (file) => file.size <= 50 * 1024 * 1024,
      "File size must be less than 50MB"
    )
    .refine(
      (file) => {
        const allowedTypes = [
          'text/markdown',
          'text/plain', // for .md files that might be detected as plain text
          'application/json'
        ];
        return allowedTypes.includes(file.type) || 
               file.name.endsWith('.md') || 
               file.name.endsWith('.markdown') ||
               file.name.endsWith('.json');
      },
      "File must be a markdown (.md) or JSON (.json) file"
    )
});

// Document upload request schema
export const DocumentUploadSchema = z.object({
  file: FileValidationSchema.shape.file,
  type: SupportedFileType,
  metadata: DocumentMetadataSchema.optional()
});

// Document chunk schema
export const DocumentChunkSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Chunk text cannot be empty"),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.unknown()).default({})
});

// Processing result schema
export const ProcessingResultSchema = z.object({
  documentId: z.string().uuid(),
  filename: z.string(),
  chunks: z.array(DocumentChunkSchema),
  status: z.enum(['completed', 'failed', 'partial']),
  errors: z.array(z.string()).optional(),
  metadata: DocumentMetadataSchema.optional(),
  processedAt: z.date(),
  chunkCount: z.number().min(0),
  embeddingCount: z.number().min(0)
});

// JSON document validation (for structured documents)
export const JSONDocumentSchema = z.object({
  title: z.string().optional(),
  content: z.union([
    z.string(),
    z.array(z.unknown()),
    z.record(z.unknown())
  ]),
  metadata: z.record(z.unknown()).optional()
});

// Upload response schema
export const UploadResponseSchema = z.object({
  documentId: z.string().uuid(),
  filename: z.string(),
  type: SupportedFileType,
  status: z.literal('processing'),
  message: z.string()
});

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional()
});

// Export inferred types
export type SupportedFileType = z.infer<typeof SupportedFileType>;
export type MarkdownFrontmatter = z.infer<typeof MarkdownFrontmatterSchema>;
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type DocumentChunk = z.infer<typeof DocumentChunkSchema>;
export type ProcessingResult = z.infer<typeof ProcessingResultSchema>;
export type JSONDocument = z.infer<typeof JSONDocumentSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Validation helper functions
export function validateFile(file: File): { success: boolean; error?: string } {
  const result = FileValidationSchema.safeParse({ file });
  if (!result.success) {
    const errorMessage = result.error.errors
      .map((error) => error.message)
      .join(', ');
    return { success: false, error: errorMessage };
  }
  return { success: true };
}

export function detectFileType(file: File): SupportedFileType {
  if (file.name.endsWith('.json') || file.type === 'application/json') {
    return 'json';
  }
  // Default to markdown for .md files or plain text that might be markdown
  return 'markdown';
}

export function validateJSON(content: string): { success: boolean; data?: any; error?: string } {
  try {
    const parsed = JSON.parse(content);
    const result = JSONDocumentSchema.safeParse(parsed);
    if (!result.success) {
      return { 
        success: false, 
        error: `Invalid JSON structure: ${result.error.errors.map(e => e.message).join(', ')}` 
      };
    }
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: 'Invalid JSON format' };
  }
}