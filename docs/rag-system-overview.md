# RAG System Overview

## Current Implementation

The RoboRail Assistant uses a Retrieval-Augmented Generation (RAG) system to provide accurate responses based on technical documentation.

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Document      │───▶│   Processing    │───▶│   Vector        │
│   Upload        │    │   Pipeline      │    │   Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chat          │◀───│   RAG Tool      │◀───│   Similarity    │
│   Interface     │    │   Integration   │    │   Search        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Components

#### Document Processing (`/lib/rag/`)
- **Document Upload**: API endpoint for uploading markdown and JSON files
- **Progress Tracking**: Real-time progress updates via Server-Sent Events
- **Chunking**: Smart text chunking with metadata preservation
- **Vector Storage**: PostgreSQL with pgvector extension

#### RAG Integration (`/lib/ai/tools/rag.ts`)
- **Search Tool**: AI SDK tool for document retrieval
- **Embedding**: Cohere embeddings for semantic search
- **Context Injection**: Relevant chunks injected into AI prompts

#### Database Schema
```sql
-- Document chunks with vector embeddings
DocumentChunk {
  id: string (UUID)
  documentId: string
  content: text
  embedding: vector(1024)  -- Cohere embedding dimensions
  metadata: jsonb
  createdAt: timestamp
}

-- Processing progress tracking
ProcessingJob {
  id: string (UUID)
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number (0-100)
  stage: string
  createdAt: timestamp
}
```

## Usage

### Document Upload
```typescript
// Upload documents via API
const response = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData // File + metadata
});

// Track progress
const eventSource = new EventSource(`/api/documents/${id}/progress`);
eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  console.log(`Stage: ${progress.stage}, Progress: ${progress.progress}%`);
};
```

### RAG Tool Usage
The RAG tool is automatically available to the AI agent:

```typescript
// Automatically used when relevant questions are asked
const response = await agent.generate({
  messages: [{ role: 'user', content: 'How do I start the RoboRail machine?' }]
});
// Agent automatically searches documentation and provides contextual response
```

## Configuration

### Environment Variables
```bash
# Required for RAG functionality
COHERE_API_KEY=your-cohere-key  # For embeddings
POSTGRES_URL=your-postgres-url  # With pgvector extension
```

### Supported File Types
- **Markdown (.md)**: Technical documentation with frontmatter
- **JSON (.json)**: Structured data and configuration files

### Performance
- **Chunk Size**: 512 tokens with 50 token overlap
- **Search Results**: Top 3 most relevant chunks
- **Response Time**: < 2 seconds for retrieval + generation

## Files and Directories

### Core RAG Implementation
```
lib/rag/
├── index.ts              # Main RAG exports
├── processor.ts          # Document processing logic
├── database.ts           # Vector database operations
├── validation.ts         # Input validation schemas
├── errors.ts            # Error handling
├── progress/            # Progress tracking system
│   ├── index.ts
│   ├── tracker.ts
│   ├── store.ts
│   └── types.ts
└── strategies/          # Document type handlers
    ├── markdown.ts
    └── json.ts
```

### API Routes
```
app/api/
├── documents/
│   ├── route.ts         # Document CRUD operations
│   ├── upload/
│   │   └── route.ts     # File upload handling
│   └── [id]/
│       └── progress/
│           └── route.ts # Progress tracking SSE
```

### UI Components
```
components/rag/
├── document-upload-page.tsx    # Main upload interface
├── document-upload-zone.tsx    # Drag & drop zone
├── file-queue.tsx             # Upload queue management
├── processing-card.tsx        # Progress display
├── progress-bar.tsx           # Visual progress indicator
└── error-display.tsx          # Error handling UI
```

## Testing

The RAG system includes comprehensive testing:

```bash
# Run RAG-specific tests
bun test tests/rag/

# Test document upload
bun test tests/routes/document.test.ts

# End-to-end RAG testing
bun test tests/e2e/rag-document-upload.test.ts
```

## Monitoring

The system provides observability through:
- **LangSmith**: AI interaction tracing
- **Progress Events**: Real-time processing status
- **Error Logging**: Comprehensive error tracking
- **Performance Metrics**: Response time monitoring