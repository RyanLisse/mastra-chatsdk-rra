# System Patterns & Architecture

## Core Architectural Patterns

### 1. Vertical Slice Architecture
**Pattern**: Organize features as complete, end-to-end slices rather than horizontal layers
**Implementation**: Each slice (Basic Setup, RAG, Memory, Voice, Observability) is independently deployable
**Benefits**: 
- Reduced coupling between features
- Independent development and testing
- Clear feature boundaries
- Easier maintenance and debugging

### 2. Modular AI Agent System
**Pattern**: Separate AI agents by domain and capability
**Implementation**:
- `RoboRailAgent`: Domain-specific knowledge and tools
- `RoboRailVoiceAgent`: Voice interaction specialization
- Tool-based architecture with clear interfaces
**Benefits**:
- Single Responsibility Principle
- Easy to extend with new agents
- Clear separation of concerns
- Testable in isolation

### 3. Provider Abstraction Pattern
**Pattern**: Abstract AI providers behind common interfaces
**Implementation**: 
- Provider registry with standardized model definitions
- Unified model configuration system
- Fallback and load balancing capabilities
**Benefits**:
- Multi-vendor support without vendor lock-in
- Easy provider switching and comparison
- Resilience through redundancy
- Cost optimization through provider selection

## Database & Persistence Patterns

### 1. Connection Management Pattern
**Pattern**: Centralized database connection management with cleanup
**Implementation**:
- `ConnectionManager` class for pooled connections
- Automatic cleanup on process termination
- Test vs production environment separation
**Benefits**:
- Resource efficiency
- Prevents connection leaks
- Environment-specific configurations
- Graceful shutdown handling

### 2. Vector Storage Pattern
**Pattern**: Hybrid storage for structured and vector data
**Implementation**:
- PostgreSQL with pgvector extension
- Separate tables for documents, chunks, and vectors
- Optimized indices for similarity search
**Benefits**:
- Single database for all data types
- ACID compliance for structured data
- Efficient vector similarity search
- Backup and recovery simplicity

### 3. Memory Persistence Pattern
**Pattern**: Session-based memory with PostgreSQL storage
**Implementation**:
- Memory provider interface with database backend
- Session-scoped memory retention
- Automatic cleanup and archiving
**Benefits**:
- Persistent conversation context
- Scalable memory management
- Data durability and backup
- Privacy through session isolation

## Frontend Architecture Patterns

### 1. Server Components + Client Islands
**Pattern**: Use React Server Components with selective client-side interactivity
**Implementation**:
- Server Components for static content and data fetching
- Client Components for interactive elements (chat input, voice controls)
- Streaming for real-time updates
**Benefits**:
- Reduced JavaScript bundle size
- Improved SEO and initial load performance
- Better user experience with streaming
- Clear separation of server/client logic

### 2. Compound Component Pattern
**Pattern**: Build complex UI components from smaller, focused components
**Implementation**:
- Chat interface composed of Message, Input, Voice, and Action components
- Each component handles single responsibility
- Props interface for communication
**Benefits**:
- Reusable component library
- Easier testing and maintenance
- Clear component boundaries
- Flexible composition patterns

### 3. Error Boundary Pattern
**Pattern**: Hierarchical error handling with recovery mechanisms
**Implementation**:
- Global error boundary for application-level errors
- Feature-specific boundaries for graceful degradation
- User-friendly error messages and recovery actions
**Benefits**:
- Improved user experience
- Better error reporting and debugging
- Graceful failure handling
- System stability

## API Design Patterns

### 1. RESTful Resource Pattern
**Pattern**: Resource-based API design with standard HTTP methods
**Implementation**:
- `/api/chat` for conversation management
- `/api/documents` for file operations
- `/api/voice` for audio processing
**Benefits**:
- Predictable API structure
- Standard HTTP semantics
- Easy to document and test
- Client library generation

### 2. Streaming Response Pattern
**Pattern**: Stream AI responses for real-time user feedback
**Implementation**:
- Server-Sent Events for real-time updates
- Chunked response processing
- Progress tracking for long operations
**Benefits**:
- Improved perceived performance
- Real-time feedback to users
- Better handling of long operations
- Progressive content delivery

### 3. Tool-Based Agent Pattern
**Pattern**: Extend agent capabilities through composable tools
**Implementation**:
- RAG tool for document retrieval
- Weather tool for environmental data
- Document creation and update tools
**Benefits**:
- Modular capability extension
- Easy to add new functionalities
- Clear separation between core agent and tools
- Testable tool implementations

## Security & Configuration Patterns

### 1. Environment-Based Configuration
**Pattern**: All secrets and configuration through environment variables
**Implementation**:
- No hardcoded credentials in source code
- Environment-specific configuration files
- Runtime validation of required variables
**Benefits**:
- Security through externalized secrets
- Environment-specific deployments
- Easy configuration management
- Compliance with security best practices

### 2. Authentication Middleware Pattern
**Pattern**: Centralized authentication with route protection
**Implementation**:
- NextAuth.js middleware for route protection
- Session-based authentication
- Guest user support for demos
**Benefits**:
- Consistent authentication across routes
- Clear security boundaries
- Easy to audit and maintain
- Flexible authentication options

### 3. Input Validation Pattern
**Pattern**: Validate all inputs at API boundaries
**Implementation**:
- Zod schemas for runtime validation
- Type safety through TypeScript
- Sanitization of user inputs
**Benefits**:
- Security through input validation
- Type safety and better developer experience
- Consistent validation across the application
- Runtime error prevention

## File Size & Modularity Constraints

### File Size Limit: <500 Lines
**Enforcement**: All source files must remain under 500 lines
**Strategies**:
- Extract utility functions to separate modules
- Use composition over inheritance
- Split large components into smaller ones
- Create focused, single-purpose modules

### Module Organization
**Pattern**: Feature-based module organization
**Structure**:
```
lib/
  ai/           # AI-related modules
  db/           # Database operations
  rag/          # RAG-specific functionality
  mastra/       # Mastra framework integration
components/
  ui/           # Reusable UI components
  rag/          # RAG-specific components
```

**Benefits**:
- Clear feature boundaries
- Easy to locate and modify code
- Reduced cognitive load
- Better collaboration between team members 