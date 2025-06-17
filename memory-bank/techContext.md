# Technical Context

## Technology Stack

### Frontend Technologies
- **Framework**: Next.js 15 with App Router and React Server Components
- **React Version**: 19.1.0 with latest features and concurrent rendering
- **TypeScript**: Full type safety throughout the application
- **Styling**: Tailwind CSS with custom design system components
- **State Management**: React hooks and Server Actions (minimal client state)
- **Package Manager**: Bun (preferred) or npm for dependency management

### Backend & API
- **Runtime**: Node.js with Bun runtime support
- **API Framework**: Next.js API Routes with App Router
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: NextAuth.js v5.0.0-beta.25 with credential provider
- **File Storage**: Vercel Blob for document and asset storage

### Database & Vector Storage
- **Primary Database**: PostgreSQL with ACID compliance
- **Vector Extension**: pgvector for semantic search capabilities
- **Connection Management**: Custom connection pooling with graceful cleanup
- **Migrations**: Drizzle Kit for schema management and migrations
- **Environment Separation**: Dedicated test and production database configurations

### AI & Machine Learning
- **AI Framework**: Mastra AI (@mastra/core v0.10.5) for agent orchestration
- **AI SDK**: Vercel AI SDK (v4.3.16) for streaming and tool integration
- **Multi-Provider Support**: 
  - OpenAI (primary): GPT-4, GPT-4o, o3, o4 models
  - Anthropic: Claude 3.5, Claude 4 models
  - Google: Gemini 2.5 Pro, Gemini 2.0 Flash
  - Groq: LLaMA models for high-speed inference
- **Embeddings**: Cohere API for document vectorization
- **Voice Processing**: OpenAI Realtime API for speech-to-speech interaction

## Dependency Management

### Core Dependencies
```json
{
  "@mastra/core": "^0.10.5",
  "@mastra/voice-openai-realtime": "^0.10.1",
  "ai": "4.3.16",
  "next": "^15.4.0-canary.83",
  "react": "19.1.0",
  "drizzle-orm": "^0.44.2",
  "next-auth": "5.0.0-beta.25"
}
```

### Development Tools
- **Linting**: Biome for code formatting and linting
- **Testing**: Playwright for E2E tests, Jest for unit tests
- **Type Checking**: TypeScript with strict mode enabled
- **Database**: Drizzle Kit for migrations and schema management

## Environment Configuration

### Secret Management Strategy
**Policy**: All secrets and configuration through environment variables - ABSOLUTELY NO hardcoded values

### Required Environment Variables

#### Authentication & Security
```bash
# Authentication secrets (CRITICAL - Generate secure values)
AUTH_SECRET=<32-character-random-string>     # Generate: https://generate-secret.vercel.app/32
NEXTAUTH_URL=http://localhost:3000           # Application base URL

# Database connection (CRITICAL - Database access)
POSTGRES_URL=postgresql://user:password@host:port/database
```

#### AI Provider Configuration
```bash
# Primary AI Provider (REQUIRED - Core functionality)
OPENAI_API_KEY=sk-<openai-api-key>

# Embeddings Provider (REQUIRED - RAG functionality)
COHERE_API_KEY=<cohere-api-key>

# Optional AI Providers (Multi-provider support)
ANTHROPIC_API_KEY=sk-ant-<anthropic-api-key>
GOOGLE_API_KEY=AIzaSy-<google-api-key>
GROQ_API_KEY=gsk_<groq-api-key>
```

#### Storage & File Management
```bash
# File storage (REQUIRED - Document upload)
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
```

#### Observability & Monitoring
```bash
# LangSmith (OPTIONAL - AI tracing)
LANGSMITH_API_KEY=ls__<langsmith-api-key>
LANGSMITH_PROJECT=<project-name>

# Redis (OPTIONAL - Enhanced caching)
REDIS_URL=redis://localhost:6379
```

#### Feature Flags
```bash
# Feature toggles (OPTIONAL - Default: true)
ENABLE_VOICE_CHAT=true
ENABLE_DOCUMENT_UPLOAD=true
```

### Environment File Structure
```bash
# Development
.env.local              # Local development (gitignored)
.env.local.example      # Minimal development template
.env.example           # Complete configuration reference

# Production
# Environment variables set through deployment platform
```

## Development Constraints

### File Size Enforcement
- **Hard Limit**: 500 lines per source file
- **Monitoring**: Manual review and automated checks during development
- **Enforcement Strategy**: Refactor large files into smaller, focused modules
- **Exception Handling**: Test files may exceed limit if necessary for comprehensive coverage

### Code Quality Standards
- **TypeScript**: Strict mode enabled, no `any` types allowed
- **Linting**: Biome configuration with strict rules
- **Testing**: Comprehensive test coverage for all features
- **Documentation**: JSDoc for complex functions and modules

### Security Requirements
- **Input Validation**: Zod schemas for all API inputs
- **Authentication**: Protected routes with NextAuth.js middleware
- **Environment Variables**: Runtime validation of required variables
- **SQL Injection**: Parameterized queries through Drizzle ORM
- **CORS**: Properly configured for production deployment

## Testing Strategy

### Test Environment Setup
- **Database**: Dedicated test database with automatic cleanup
- **Isolation**: Each test suite runs in isolation
- **Fixtures**: Standardized test data and mocks
- **Cleanup**: Automatic resource cleanup after test execution

### Testing Stack
```json
{
  "@playwright/test": "^1.53.0",
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.6.3"
}
```

### Test Categories
- **Unit Tests**: Individual component and function testing
- **Integration Tests**: API routes and database operations
- **E2E Tests**: Full user workflow testing with Playwright
- **Stagehand Tests**: AI-powered testing for complex interactions

## Performance Considerations

### Response Time Targets
- **Chat Responses**: < 2 seconds with RAG context
- **Voice Processing**: < 1 second for transcription
- **Document Upload**: Real-time progress tracking
- **Page Load**: < 3 seconds for initial render

### Optimization Strategies
- **Server Components**: Minimize client-side JavaScript
- **Streaming**: Real-time response streaming for better UX
- **Vector Search**: Optimized pgvector queries with proper indexing
- **Connection Pooling**: Efficient database connection management
- **Caching**: Redis for frequently accessed data (when available)

## Deployment Requirements

### Platform Compatibility
- **Primary**: Vercel (optimized for Next.js)
- **Alternative**: Any Node.js-compatible platform
- **Database**: PostgreSQL with pgvector extension support
- **Storage**: Vercel Blob or compatible object storage

### Environment Preparation
1. Database setup with pgvector extension
2. Environment variable configuration
3. Document ingestion and vectorization
4. Health check validation
5. Monitoring and observability setup

### Monitoring & Observability
- **LangSmith**: AI interaction tracing and performance monitoring
- **Vercel Analytics**: Application performance and usage metrics
- **Database Monitoring**: Connection pool and query performance
- **Error Tracking**: Comprehensive error logging and alerting 