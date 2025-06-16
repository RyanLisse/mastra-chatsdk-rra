# Contributing to Mastra Chat SDK

Thank you for your interest in contributing to the Mastra Chat SDK! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **🐛 Bug Reports**: Help us identify and fix issues
- **✨ Feature Requests**: Suggest new features or improvements
- **📝 Documentation**: Improve docs, guides, and examples
- **💻 Code Contributions**: Bug fixes, new features, optimizations
- **🧪 Testing**: Add or improve tests
- **🎨 UI/UX**: Improve user interface and experience

## 🚀 Getting Started

### Development Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/your-username/mastra-chatsdk-rra.git
   cd mastra-chatsdk-rra
   ```

2. **Install Dependencies**
   ```bash
   # Using npm
   npm install
   
   # Using bun (recommended)
   bun install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Database Setup**
   ```bash
   # Setup local PostgreSQL with pgvector
   # Or use a cloud database (see README.md)
   
   npm run db:migrate
   npm run db:setup
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Development Workflow

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make Changes**
   - Follow our coding standards (see below)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   # Run all tests
   npm run test:all
   
   # Run specific test types
   npm run test:unit
   npm run test:e2e
   npm run test:routes
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request on GitHub
   ```

## 📋 Coding Standards

### TypeScript Guidelines

- **Type Safety**: Avoid `any` types, use proper TypeScript types
- **Interfaces**: Define clear interfaces for all data structures
- **Generics**: Use generics for reusable components and functions
- **Error Handling**: Implement proper error types and handling

```typescript
// Good
interface UserProfile {
  id: string;
  email: string;
  name?: string;
}

async function fetchUser(id: string): Promise<UserProfile | null> {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

// Avoid
function fetchUser(id: any): any {
  return api.get(`/users/${id}`);
}
```

### React Guidelines

- **Functional Components**: Use functional components with hooks
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Error Boundaries**: Implement error boundaries for robustness
- **Performance**: Use `memo`, `useMemo`, `useCallback` appropriately

```typescript
// Good
interface ChatMessageProps {
  message: Message;
  onEdit?: (id: string) => void;
}

export const ChatMessage = memo(({ message, onEdit }: ChatMessageProps) => {
  const handleEdit = useCallback(() => {
    onEdit?.(message.id);
  }, [message.id, onEdit]);

  return (
    <div className="message">
      <p>{message.content}</p>
      {onEdit && (
        <button onClick={handleEdit}>Edit</button>
      )}
    </div>
  );
});
```

### API Guidelines

- **RESTful Design**: Follow REST conventions for API endpoints
- **Error Handling**: Return appropriate HTTP status codes
- **Validation**: Use Zod schemas for request/response validation
- **Documentation**: Document API endpoints with clear examples

```typescript
// Good API Route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createMessageSchema.parse(body);
    
    const message = await createMessage(validatedData);
    
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Database Guidelines

- **Migrations**: Use Drizzle migrations for schema changes
- **Types**: Keep database types in sync with TypeScript
- **Indexes**: Add appropriate indexes for performance
- **Transactions**: Use transactions for data consistency

```typescript
// Good
export const createMessageWithAttachments = async (
  data: CreateMessageData
) => {
  return await db.transaction(async (tx) => {
    const message = await tx.insert(messageTable).values(data.message).returning();
    
    if (data.attachments.length > 0) {
      await tx.insert(attachmentTable).values(
        data.attachments.map(att => ({ ...att, messageId: message[0].id }))
      );
    }
    
    return message[0];
  });
};
```

## 🧪 Testing Guidelines

### Unit Tests

- **Coverage**: Aim for >80% code coverage
- **Isolation**: Test components and functions in isolation
- **Mocking**: Mock external dependencies appropriately
- **Edge Cases**: Test error conditions and edge cases

```typescript
// Example unit test
import { describe, test, expect, mock } from 'bun:test';
import { createRoboRailAgent } from '@/lib/ai/agents/roborail-agent';

describe('RoboRail Agent', () => {
  test('should create agent with valid session', () => {
    const agent = createRoboRailAgent({
      sessionId: 'test-session',
      selectedChatModel: 'gpt-4'
    });
    
    expect(agent).toBeDefined();
    expect(agent.sessionId).toBe('test-session');
  });
  
  test('should handle invalid session gracefully', () => {
    expect(() => {
      createRoboRailAgent({ sessionId: '', selectedChatModel: 'gpt-4' });
    }).toThrow('Session ID is required');
  });
});
```

### Integration Tests

- **API Testing**: Test API endpoints with real requests
- **Database Testing**: Test database operations
- **Authentication**: Test auth flows
- **Error Scenarios**: Test error handling

```typescript
// Example integration test
import { test, expect } from '@playwright/test';

test('chat flow integration', async ({ page }) => {
  await page.goto('/');
  
  // Test authentication
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="login"]');
  
  // Test chat interaction
  await page.fill('[data-testid="message-input"]', 'Hello, RoboRail assistant!');
  await page.click('[data-testid="send-button"]');
  
  // Verify response
  await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
});
```

### E2E Tests

- **User Flows**: Test complete user journeys
- **Cross-browser**: Test on multiple browsers
- **Mobile**: Test responsive design
- **Performance**: Monitor performance metrics

## 📝 Documentation Standards

### Code Documentation

- **JSDoc**: Document complex functions and classes
- **README**: Keep README.md up to date
- **API Docs**: Document API endpoints
- **Examples**: Provide clear usage examples

```typescript
/**
 * Processes a document for RAG ingestion
 * @param file - The uploaded file to process
 * @param options - Processing options
 * @returns Promise resolving to processing result
 * @throws {ValidationError} When file format is unsupported
 * @throws {ProcessingError} When processing fails
 * 
 * @example
 * ```typescript
 * const result = await processDocument(file, {
 *   chunkSize: 512,
 *   overlap: 50
 * });
 * console.log(`Processed ${result.chunkCount} chunks`);
 * ```
 */
export async function processDocument(
  file: File,
  options: ProcessingOptions
): Promise<ProcessingResult> {
  // Implementation
}
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(rag): add markdown frontmatter extraction
fix(auth): resolve session timeout issue
docs(api): update chat endpoint documentation
test(voice): add voice integration tests
```

## 🔍 Code Review Process

### Pull Request Guidelines

1. **Clear Description**: Explain what changes were made and why
2. **Screenshots**: Include screenshots for UI changes
3. **Testing**: Confirm all tests pass
4. **Breaking Changes**: Clearly document any breaking changes
5. **Small PRs**: Keep PRs focused and reasonably sized

### Review Checklist

**Functionality**
- [ ] Code works as expected
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] Performance considerations addressed

**Code Quality**
- [ ] Code is readable and well-structured
- [ ] TypeScript types are proper
- [ ] No unnecessary complexity
- [ ] Follows project conventions

**Testing**
- [ ] Adequate test coverage
- [ ] Tests are meaningful and thorough
- [ ] All tests pass
- [ ] No test-only changes in production code

**Documentation**
- [ ] Code is self-documenting or properly commented
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] Breaking changes documented

## 🏗️ Architecture Guidelines

### Project Structure

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (chat)/            # Chat application routes
│   ├── api/               # API endpoints
│   └── documents/         # Document management
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── rag/              # RAG-specific components
│   └── ...               # Feature-specific components
├── lib/                  # Utility libraries
│   ├── ai/               # AI agents and tools
│   ├── db/               # Database utilities
│   ├── mastra/           # Mastra integrations
│   └── rag/              # RAG system
├── hooks/                # React hooks
├── tests/                # Test suites
└── docs/                 # Documentation
```

### Component Guidelines

- **Single Responsibility**: Each component should have one clear purpose
- **Composition**: Prefer composition over inheritance
- **Props Interface**: Define clear props interfaces
- **Default Props**: Use default parameters for optional props

```typescript
// Good component structure
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children
}: ButtonProps) => {
  return (
    <button
      className={cn(
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        disabled && 'btn-disabled'
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### State Management

- **Local State**: Use useState for component-local state
- **Global State**: Use context or external libraries for global state
- **Server State**: Use SWR or TanStack Query for server state
- **URL State**: Use search params for shareable state

```typescript
// Good state management example
const useChatState = (chatId: string) => {
  const { data: messages, mutate } = useSWR(
    `/api/chat/${chatId}/messages`,
    fetcher
  );
  
  const [isTyping, setIsTyping] = useState(false);
  
  const sendMessage = useCallback(async (content: string) => {
    setIsTyping(true);
    try {
      const newMessage = await api.post(`/api/chat/${chatId}/messages`, {
        content
      });
      mutate([...messages, newMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [chatId, messages, mutate]);
  
  return { messages, isTyping, sendMessage };
};
```

## 🎯 Feature Development Process

### 1. Planning Phase
- **Requirements**: Clearly define what needs to be built
- **Design**: Create wireframes or mockups for UI features
- **Architecture**: Plan the technical implementation
- **Dependencies**: Identify any new dependencies needed

### 2. Implementation Phase
- **Feature Flag**: Use feature flags for gradual rollout
- **Incremental**: Build and test incrementally
- **Documentation**: Document as you build
- **Testing**: Write tests alongside implementation

### 3. Review Phase
- **Self-Review**: Review your own code before submitting
- **Peer Review**: Get feedback from other contributors
- **Testing**: Ensure all tests pass
- **Performance**: Check for performance implications

### 4. Deployment Phase
- **Staging**: Test in staging environment
- **Gradual Rollout**: Use feature flags for gradual release
- **Monitoring**: Monitor for issues after deployment
- **Documentation**: Update user-facing documentation

## 🐛 Bug Report Guidelines

### Information to Include

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: 
   - OS and version
   - Browser and version
   - Node.js version
   - App version
6. **Screenshots**: Include screenshots if relevant
7. **Error Messages**: Include any error messages or logs

### Bug Report Template

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS, Windows, macOS]
 - Browser: [e.g. chrome, safari]
 - Version: [e.g. 22]

**Additional Context**
Add any other context about the problem here.
```

## ✨ Feature Request Guidelines

### Information to Include

1. **Problem Statement**: What problem does this solve?
2. **Proposed Solution**: How should this feature work?
3. **Alternatives**: Any alternative solutions considered?
4. **Use Cases**: Who would use this feature and how?
5. **Priority**: How important is this feature?

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 📚 Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Mastra AI Documentation](https://mastra.ai/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)

### Tools
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Playwright Testing](https://playwright.dev/)
- [Bun Runtime](https://bun.sh/)

### Community
- [GitHub Discussions](https://github.com/your-repo/discussions)
- [Discord Server](https://discord.gg/your-server)
- [Twitter](https://twitter.com/your-handle)

## 🏆 Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Annual contributor highlights
- Special thanks in documentation

## 📞 Getting Help

If you need help with contributing:

1. **Check Documentation**: Review this guide and project README
2. **Search Issues**: Look for similar questions in GitHub issues
3. **Ask Questions**: Open a discussion or issue for questions
4. **Join Community**: Join our Discord for real-time help

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to Mastra Chat SDK! 🎉