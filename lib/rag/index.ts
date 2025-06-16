// RAG System Core Exports
export { validateFile, detectFileType, validateJSON } from './validation';
export { DocumentProcessor } from './processor';
export { ragDatabase } from './database';
export { progressTracker } from './progress';
export { RAGError, ValidationError, ProcessingError } from './errors';

// Export all types
export type {
  DocumentUpload,
  ProcessingResult,
  DocumentChunk,
  SupportedFileType,
  DocumentMetadata,
  MarkdownFrontmatter,
  JSONDocument,
  UploadResponse,
  ErrorResponse,
} from './validation';

export type {
  ProcessingStage,
  ProcessingStatus,
  ProgressState,
  ProgressUpdate,
  ProgressEvent,
} from './progress';

export type { ProcessorConfig } from './processor';

export type {
  StoreChunkParams,
  UpdateProcessingStatusParams,
} from './database';

export type {
  MarkdownProcessingOptions,
  MarkdownParseResult,
  HeaderInfo,
} from './strategies/markdown';

export type {
  JSONProcessingOptions,
  JSONParseResult,
  JSONSchemaInfo,
} from './strategies/json';
