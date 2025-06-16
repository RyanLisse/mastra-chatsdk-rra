import { z } from 'zod';

// Progress stages for document processing
export const ProcessingStage = z.enum([
  'upload',
  'parsing', 
  'chunking',
  'embedding',
  'storing',
  'completed',
  'error'
]);

// Processing status
export const ProcessingStatus = z.enum([
  'pending',
  'processing', 
  'completed',
  'failed'
]);

// Progress state schema
export const ProgressStateSchema = z.object({
  documentId: z.string().uuid(),
  filename: z.string(),
  stage: ProcessingStage,
  progress: z.number().min(0).max(100),
  status: ProcessingStatus,
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Progress update schema
export const ProgressUpdateSchema = z.object({
  stage: ProcessingStage,
  progress: z.number().min(0).max(100),
  status: ProcessingStatus,
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

// Export types
export type ProcessingStage = z.infer<typeof ProcessingStage>;
export type ProcessingStatus = z.infer<typeof ProcessingStatus>;
export type ProgressState = z.infer<typeof ProgressStateSchema>;
export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>;

// Progress event for SSE
export interface ProgressEvent {
  documentId: string;
  stage: ProcessingStage;
  progress: number;
  status: ProcessingStatus;
  error?: string;
  timestamp: string;
}