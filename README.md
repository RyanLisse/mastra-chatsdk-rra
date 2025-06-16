# Mastra Chat SDK - RoboRail Assistant

A comprehensive AI-powered chat application built with Next.js 15, Mastra AI framework, and advanced RAG (Retrieval-Augmented Generation) capabilities. This application serves as an intelligent assistant for RoboRail technical documentation and operations.

<p align="center">
  <img alt="Mastra Chat SDK" src="app/(chat)/opengraph-image.png" width="400">
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#architecture"><strong>Architecture</strong></a> ·
  <a href="#getting-started"><strong>Getting Started</strong></a> ·
  <a href="#deployment"><strong>Deployment</strong></a> ·
  <a href="#api-reference"><strong>API Reference</strong></a>
</p>

## 🚀 Features

### Core Capabilities
- **🤖 Multi-Agent AI System**: Specialized RoboRail agents with memory and context awareness
- **🎙️ Voice Interaction**: Real-time speech-to-speech communication with OpenAI Realtime API
- **📚 Advanced RAG System**: Document upload, processing, and intelligent retrieval
- **💾 Persistent Memory**: Multi-turn conversation memory with context retention
- **📊 Observability**: Comprehensive tracing with LangSmith integration
- **🔐 Authentication**: Secure user authentication with NextAuth.js
- **📱 Real-time Updates**: Server-Sent Events for live progress tracking

### Technical Features
- **Next.js 15**: App Router with React Server Components and Server Actions
- **Mastra AI Framework**: Advanced agent orchestration and tool integration
- **PostgreSQL + pgvector**: Vector database for semantic search
- **TypeScript**: Full type safety throughout the application
- **Responsive Design**: Mobile-first design with accessibility support
- **Error Handling**: Comprehensive error boundaries and recovery mechanisms

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                   │
├─────────────────────────────────────────────────────────────┤
│  • Chat Interface    • Voice UI    • Document Upload       │
│  • Real-time Updates • Error Handling • Progress Tracking  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                 API Layer (Next.js API Routes)             │
├─────────────────────────────────────────────────────────────┤
│  • /api/chat         • /api/voice      • /api/documents     │
│  • /api/auth         • /api/history    • /api/suggestions   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Mastra AI Agents                        │
├─────────────────────────────────────────────────────────────┤
│  • RoboRail Agent    • Voice Agent     • Memory System     │
│  • RAG Tools         • Document Processing                 │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                External Services & Storage                  │
├─────────────────────────────────────────────────────────────┤
│  • PostgreSQL/pgvector  • OpenAI API  • Cohere API         │
│  • Vercel Blob         • LangSmith    • Redis (Optional)   │
└─────────────────────────────────────────────────────────────┘
```

### Core Technologies

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI/ML**: Mastra AI, OpenAI GPT-4, Cohere Embeddings, LangSmith
- **Database**: PostgreSQL with pgvector extension
- **Authentication**: NextAuth.js with credential-based auth
- **Storage**: Vercel Blob for file uploads
- **Observability**: LangSmith tracing, built-in error tracking

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun runtime
- PostgreSQL database with pgvector extension
- OpenAI API key
- Cohere API key (for embeddings)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mastra-chatsdk-rra
   ```

2. **Install dependencies**
   ```bash
   # Using npm
   npm install
   
   # Using bun (recommended)
   bun install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration (see [Environment Variables](#environment-variables))

4. **Database Setup**
   ```bash
   # Generate database migrations
   npm run db:generate
   
   # Apply migrations
   npm run db:migrate
   
   # Optional: Setup initial data
   npm run db:setup
   ```

5. **Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Create an account or use guest mode
   - Start chatting with the RoboRail assistant!

### Environment Variables

Create a `.env.local` file with the following variables:

#### Required Variables

```env
# Authentication
AUTH_SECRET=your-auth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Database
POSTGRES_URL=postgresql://user:password@host:port/database

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key
COHERE_API_KEY=your-cohere-api-key

# File Storage
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

#### Optional Variables

```env
# LangSmith Observability
LANGSMITH_API_KEY=ls__your-langsmith-api-key
LANGSMITH_PROJECT=your-project-name

# Redis (for enhanced caching)
REDIS_URL=redis://localhost:6379

# xAI (alternative to OpenAI)
XAI_API_KEY=xai-your-xai-api-key
```

## 📚 Feature Documentation

### 🤖 AI Agents

The application uses specialized Mastra AI agents:

#### RoboRail Agent
- **Purpose**: Technical documentation assistance
- **Capabilities**: Query processing, RAG integration, context awareness
- **Memory**: Persistent conversation history
- **Tools**: Document search, suggestion generation

#### Voice Agent
- **Purpose**: Speech-to-speech interaction
- **Capabilities**: Real-time audio processing, voice commands
- **Integration**: OpenAI Realtime API
- **Features**: Voice activity detection, audio streaming

### 📚 RAG System

#### Document Processing
- **Supported Formats**: Markdown (.md), JSON (.json)
- **Processing Pipeline**: Parse → Chunk → Embed → Store
- **Chunk Strategy**: 512 characters with 50-character overlap
- **Embeddings**: Cohere embed-english-v3.0 (1024 dimensions)

#### Upload Interface
- **Method**: Drag-and-drop file upload
- **Progress**: Real-time processing updates via Server-Sent Events
- **Validation**: File type, size (50MB max), content validation
- **Storage**: PostgreSQL with vector similarity search

#### Search Capabilities
- **Similarity Search**: Cosine similarity with metadata filtering
- **Context Preservation**: Header-aware chunking for documents
- **Frontmatter Extraction**: YAML metadata parsing for enhanced search

### 🎙️ Voice Features

#### Setup Requirements
- Microphone permissions
- Modern browser with Web Audio API support
- Stable internet connection

#### Voice Interaction Flow
1. **Activation**: Click voice button or use keyboard shortcut
2. **Permission**: Grant microphone access
3. **Recording**: Speak your query
4. **Processing**: Real-time audio transcription and response
5. **Playback**: AI response played back as audio

### 💾 Memory System

#### Conversation Persistence
- **Storage**: PostgreSQL with session-based organization
- **Retention**: Full conversation history per user session
- **Context**: Multi-turn conversation awareness
- **Search**: Historical conversation search and retrieval

#### Memory Integration
- **Agent Memory**: Each agent maintains conversation context
- **Cross-Session**: Memory persists across application sessions
- **RAG Integration**: Document context combined with conversation memory

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Prerequisites**
   - Vercel account
   - PostgreSQL database (recommend Neon or Vercel Postgres)
   - Required API keys

2. **Deploy Steps**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy
   vercel --prod
   ```

3. **Environment Configuration**
   - Set all environment variables in Vercel dashboard
   - Enable PostgreSQL integration
   - Configure Vercel Blob storage

4. **Database Setup**
   ```bash
   # Run migrations on production
   vercel env pull .env.production
   npm run build  # This runs migrations
   ```

### Alternative Deployment Options

#### Docker Deployment
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### Manual Server Deployment
1. Build the application: `npm run build`
2. Set environment variables
3. Run the application: `npm start`
4. Configure reverse proxy (nginx/Apache)
5. Set up SSL certificates

### Production Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Error monitoring configured
- [ ] Performance monitoring enabled
- [ ] Backup strategy implemented
- [ ] CDN configured for static assets

## 📖 API Reference

### Chat API

#### POST /api/chat
Processes chat messages and returns AI responses.

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "How do I calibrate the RoboRail system?"
    }
  ],
  "chatId": "optional-chat-id",
  "model": "gpt-4"
}
```

**Response:** 
- Server-Sent Events stream with AI response
- Message persistence and memory integration

### Voice API

#### POST /api/voice
Initializes voice session for real-time interaction.

**Response:**
```json
{
  "sessionId": "voice-session-uuid",
  "status": "connected"
}
```

### Document API

#### POST /api/documents/upload
Uploads and processes documents for RAG system.

**Request:** Multipart form data with file
**Response:** 
```json
{
  "documentId": "doc-uuid",
  "status": "processing"
}
```

#### GET /api/documents/[id]/progress
Server-Sent Events stream for upload progress.

**Response Stream:**
```json
{
  "stage": "parsing",
  "progress": 25,
  "message": "Parsing document content..."
}
```

### Authentication API

#### POST /api/auth/guest
Creates guest user session.

#### GET /api/auth/session
Returns current user session information.

## 🧪 Testing

### Test Suites

#### Unit Tests
```bash
# Run unit tests
npm run test:unit

# Run with coverage
npm run test:unit -- --coverage
```

#### Integration Tests
```bash
# Test API routes
npm run test:routes

# Test RAG system
npm run test:rag
```

#### End-to-End Tests
```bash
# Run E2E tests
npm run test:e2e

# Run specific test
npm run test:e2e -- tests/chat.test.ts
```

#### Voice Testing
```bash
# Voice interaction tests
npm run test:voice
```

### Test Configuration

Tests use Playwright for E2E testing and Bun for unit tests:
- **Test Environment**: Isolated test database
- **Mocking**: API endpoints and external services
- **Coverage**: High coverage for critical paths

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:mastra       # Start Mastra development mode

# Building
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate migrations
npm run db:migrate      # Run migrations
npm run db:studio       # Open Drizzle Studio
npm run db:setup        # Setup initial data

# Testing
npm run test            # Run all tests
npm run test:unit       # Unit tests only
npm run test:e2e        # End-to-end tests
npm run test:watch      # Watch mode

# Code Quality
npm run lint            # Lint code
npm run lint:fix        # Fix lint issues
npm run format          # Format code
```

### Project Structure

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (chat)/            # Chat application
│   ├── api/               # API routes
│   └── documents/         # Document management
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── rag/              # RAG-specific components
│   └── ...               # Feature components
├── lib/                  # Utility libraries
│   ├── ai/               # AI agents and tools
│   ├── db/               # Database utilities
│   ├── mastra/           # Mastra integrations
│   └── rag/              # RAG system
├── hooks/                # React hooks
├── tests/                # Test suites
└── docs/                 # Documentation
```

### Contributing Guidelines

1. **Code Style**: Follow the established patterns
2. **Testing**: Add tests for new features
3. **Documentation**: Update docs for significant changes
4. **Type Safety**: Maintain full TypeScript coverage
5. **Performance**: Consider performance implications

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connection
npm run db:check

# Reset database
npm run db:reset
```

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### Voice Issues
- Check microphone permissions
- Verify WebRTC support
- Test with different browsers

#### RAG Processing Issues
- Verify Cohere API key
- Check file format support
- Monitor processing logs

### Performance Optimization

#### Database Optimization
- Index frequently queried columns
- Use connection pooling
- Monitor query performance

#### Frontend Optimization
- Implement code splitting
- Optimize image loading
- Use React.memo for expensive components

#### API Optimization
- Implement request caching
- Use streaming responses
- Monitor API response times

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Mastra AI Team** for the comprehensive AI framework
- **Vercel** for the deployment platform and AI SDK
- **OpenAI** for language models and Realtime API
- **Cohere** for embedding models
- **RoboRail** for domain expertise and documentation

## 📞 Support

- **Documentation**: [Full documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@yourdomain.com

---

Built with ❤️ using [Mastra AI](https://mastra.ai) and [Next.js](https://nextjs.org)