# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with Next.js Turbo
- `npm run dev:mastra` - Start Mastra development mode
- `npm run build` - Production build (runs database migrations first)
- `npm run build:local` - Local build without migration checks
- `npm run start` - Start production server

### Database Operations
- `npm run db:migrate` - Run database migrations
- `npm run db:migrate:safe` - Run migrations with error handling
- `npm run db:generate` - Generate new migration files
- `npm run db:studio` - Open Drizzle Studio for database management
- `npm run db:setup` - Initialize database with default data
- `npm run db:ingest` - Run RAG document ingestion

### Code Quality
- `npm run lint` - Run Next.js ESLint and Biome linter
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Biome

### Testing
- `npm run test:unit` - Run unit tests (excludes Playwright tests)
- `npm run test:unit:safe` - Run core unit tests with shorter timeouts
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:routes` - Test API routes
- `npm run test:stagehand` - Run Stagehand browser automation tests
- `npm run test:all` - Run comprehensive test suite
- `npm run test:watch` - Run tests in watch mode

### Validation & Setup
- `npm run validate:providers` - Check AI provider configurations and available models

## Architecture Overview

### Core Technologies
- **Frontend**: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- **AI Framework**: Mastra AI with multi-provider support (OpenAI, Anthropic, Google, Groq)
- **Database**: PostgreSQL with pgvector extension for vector storage
- **Authentication**: NextAuth.js with credential-based auth
- **Code Quality**: Biome for linting/formatting, TypeScript for type safety

### Key Architecture Patterns

#### Multi-Provider AI System
The application uses a provider abstraction layer in `lib/ai/`:
- `providers.ts` - Provider configuration and model instantiation
- `models.ts` - Model definitions with capabilities and tiers
- `provider-config.ts` - Provider availability and model mapping
- Environment-based provider selection with graceful fallbacks

#### RAG (Retrieval-Augmented Generation) System
Located in `lib/rag/`, implements document processing pipeline:
- Document upload → parsing → chunking → embedding → storage
- Uses Cohere embeddings (1024 dimensions) with pgvector similarity search
- Real-time processing progress via Server-Sent Events
- Supports Markdown and JSON document formats

#### Memory System
PostgreSQL-based conversation memory in `lib/mastra/memory.ts`:
- Session-based conversation persistence
- Multi-turn context awareness for AI agents
- Used by RoboRail agents for context-aware responses

#### Agent System
Specialized AI agents in `lib/ai/agents/`:
- `RoboRailAgent` - Technical documentation assistance with memory
- `roborail-voice-agent.ts` - Voice interaction capabilities
- Integrated with RAG tools and LangSmith tracing

### Database Schema
Key tables in `lib/db/schema.ts`:
- `User`, `Chat`, `Message_v2` - Core chat functionality
- `Document`, `DocumentChunk` - RAG document storage
- `DocumentProcessing` - RAG processing status tracking
- Uses UUID primary keys, timestamps, and vector embeddings

### API Architecture
RESTful API routes in `app/api/`:
- `/api/chat` - Main chat endpoint with streaming responses
- `/api/voice` - Voice interaction initialization
- `/api/documents/*` - Document upload and processing
- `/api/providers` - Available AI providers and models
- All routes use Next.js 15 App Router conventions

### Component Structure
- `components/ui/` - Base UI components (shadcn/ui style)
- `components/rag/` - RAG-specific upload and progress components
- `components/` - Feature-specific components (chat, voice, model selection)
- Follows React Server Components patterns where applicable

## Development Guidelines

### Environment Setup
- Requires `.env.local` with database URL and AI provider keys
- PostgreSQL with pgvector extension is mandatory
- At least one AI provider (OpenAI recommended) and Cohere API key required

### Code Standards
- Uses Biome for consistent formatting (2-space indentation, single quotes)
- TypeScript strict mode enforced
- React 19 patterns with Server Components where appropriate
- Database queries use Drizzle ORM with raw SQL for complex operations

### Testing Strategy
- Unit tests use Bun test runner
- E2E tests use Playwright with browser automation
- Separate test database configuration in `drizzle.config.test.ts`
- Test utilities in `tests/helpers/` for common operations

### AI Provider Integration
- Provider availability checked at runtime
- Graceful fallbacks to OpenAI GPT-4o-mini if providers unavailable
- Model capabilities defined with context windows, vision support, etc.
- Environment validation on application startup

### RAG System Considerations
- Documents chunked at 512 characters with 50-character overlap
- Metadata preserved from frontmatter for enhanced search
- Processing tracked in real-time with progress updates
- Error handling for unsupported formats and processing failures