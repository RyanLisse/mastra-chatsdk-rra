# Mastra Chat SDK - Comprehensive Refactor Plan

## 1. Executive Summary

The Mastra Chat SDK codebase requires critical refactoring to address several high-priority issues:

- **Voice API**: Implementation exists but may have integration issues with the client-side hook
- **Test Reliability**: Stagehand tests are hanging, causing CI/CD pipeline failures
- **Performance**: 2.2GB node_modules indicating dependency bloat
- **Database**: Neon integration needs optimization for test branch management
- **Architecture**: 179 TypeScript files need better organization and dead code removal

**Estimated Timeline**: 4-6 weeks
**Risk Level**: High (test failures blocking deployments)
**Priority**: Critical

## 2. Critical Issues

### 2.1 Voice API Integration Issues
**Files**: 
- Client: `/hooks/use-voice-assistant.ts`
- Server: `/app/(chat)/api/voice/route.ts`
**Issue**: Potential mismatch between client expectations and server implementation
**Specific Problems**:
- Line 122: Hook expects `/api/voice` but actual route is `/app/(chat)/api/voice/route.ts`
- Line 150: SSE connection URL may be incorrect
- Audio data format conversion may be inefficient (lines 269-274)
- Previous fix: Added null safety check `audio?.length || 0` (line 141)
**Solution**: 
- Verify routing configuration in Next.js
- Add comprehensive error logging
- Implement WebSocket instead of SSE for better bidirectional communication
- Add audio format validation

### 2.2 Stagehand Test Hanging Issues
**Files**: `/tests/stagehand/*.test.ts`
**Configuration**: `/playwright.config.ts` (lines 129-152)
**Issues**:
- Tests timeout despite 30-second limit
- Browser automation failing with navigation timeouts
- Missing proper cleanup in test lifecycle
- Global setup/teardown may have signal handler conflicts (lines 10-50)
**Solution**:
- Implement proper test isolation
- Add explicit browser cleanup in afterEach hooks
- Use page.waitForLoadState('networkidle') before assertions
- Consider switching to BROWSERBASE environment for CI
- Fix signal handler registration to avoid conflicts

### 2.3 Database Connection Management
**Issue**: setInterval in voice route (line 16) runs in serverless environment
**Impact**: Memory leaks in production
**Solution**: Use cron jobs or edge functions for cleanup

## 3. Architecture Assessment

### Current Architecture Issues:
1. **Monolithic Structure**: All 179 TypeScript files in a flat structure
2. **Mixed Concerns**: UI components mixed with business logic
3. **Poor Separation**: Database logic scattered across multiple files
4. **No Domain Boundaries**: Features not properly isolated
5. **Global State Management**: Using Map for sessions (line 13) won't scale

### Proposed Architecture:
```
/src
  /domain           # Business logic
    /chat
    /voice
    /auth
    /documents
  /infrastructure   # External services
    /database
    /ai-providers
    /storage
  /presentation     # UI layer
    /components
    /hooks
    /pages
  /application      # Use cases
    /commands
    /queries
```

## 4. Code Quality Issues

### 4.1 Type Safety
- **Issue**: Using `any` types (lines 13, 117, 136, 166 in voice route)
- **Files**: `/app/(chat)/api/voice/route.ts`
- **Fix**: Create proper TypeScript interfaces for voice events

### 4.2 Error Handling
- **Issue**: Inconsistent error handling patterns
- **Example**: `/hooks/use-voice-assistant.ts` (lines 214-220) - errors logged but not properly propagated
- **Voice Route**: Generic error responses don't provide actionable feedback
- **Fix**: Implement centralized error boundary and specific error codes

### 4.3 Code Duplication
- **Issue**: Repeated authentication checks across routes
- **Files**: All `/app/api/**/route.ts` files
- **Fix**: Create middleware for authentication
- **Provider Constants**: Already consolidated in `lib/ai/provider-constants.ts` ✅

### 4.4 Memory Management
- **Issue**: Global state with setInterval in serverless (line 16-30)
- **Fix**: Move to Redis or database-backed sessions

## 5. Dead Code Analysis

### Identified Dead Code:
1. **Unused Voice Components**:
   - `/components/voice-status.tsx` - Component exists but may not be imported
   - `/lib/ai/agents/roborail-voice-agent.ts` - Check if this is the correct implementation

2. **Deprecated Test Utilities**:
   - `/tests/helpers.ts` - Old helper functions replaced by fixtures
   - `/tests/setup-dom.ts` - Not used with current Playwright setup

3. **Unused Dependencies** (package.json):
   - `prosemirror-*` packages (lines 105-112) - No editor implementation found
   - `react-data-grid` (line 114) - No grid components in codebase
   - `@types/d3-scale` (line 137) - No D3 usage found
   - `diff-match-patch` (line 88) - Check if used in diffview component
   - `orderedmap` (line 101) - Prosemirror dependency, can be removed
   - `resumable-stream` (line 121) - No streaming implementation found

### Action Items:
- Remove 15+ unused dependencies (estimated 500MB reduction)
- Delete confirmed dead code files
- Clean up unused exports in utility files

## 6. Performance Optimizations

### 6.1 Bundle Size Optimization
**Current**: 2.2GB node_modules
**Target**: < 1GB

**Actions**:
1. Remove unused dependencies:
   ```bash
   # Unused packages to remove
   - prosemirror-* (all 8 packages)
   - react-data-grid
   - @types/d3-scale
   - resumable-stream
   - orderedmap
   - diff-match-patch (verify first)
   ```

2. Replace heavy dependencies:
   - Use native crypto.randomUUID() instead of uuid package
   - Consider lighter alternatives to codemirror if not actively used

3. Lazy load AI providers:
   ```typescript
   // Before
   import { openai } from '@ai-sdk/openai';
   
   // After
   const openai = await import('@ai-sdk/openai');
   ```

### 6.2 Database Query Optimization
**Files**: `/lib/db/*.ts`
**Issues**:
- N+1 queries in chat history loading
- Missing indexes on frequently queried columns
- No connection pooling configuration

**Solutions**:
1. Add database indexes:
   ```sql
   CREATE INDEX idx_messages_chat_id ON messages(chat_id);
   CREATE INDEX idx_messages_created_at ON messages(created_at);
   CREATE INDEX idx_documents_user_id ON documents(user_id);
   CREATE INDEX idx_chats_user_id_created ON chats(user_id, created_at);
   ```

2. Implement query batching for message loading
3. Configure connection pooling in Neon

### 6.3 Client-Side Performance
- Implement virtual scrolling for chat messages
- Add React.memo to heavy components
- Use SWR for data fetching with proper cache configuration
- Fix potential memory leak in useVoiceAssistant hook (disconnect in useEffect)

### 6.4 Voice Performance
- Replace Map-based session storage with Redis
- Implement proper WebRTC for voice instead of base64 encoding
- Add audio compression before transmission

## 7. Testing Strategy

### 7.1 Fix Hanging Tests
**Immediate Actions**:
1. Fix signal handler conflicts:
   ```typescript
   // Remove duplicate signal handlers in playwright.config.ts
   // Keep only in global-setup.ts
   ```

2. Add explicit timeouts to all async operations:
   ```typescript
   // tests/stagehand/basic-stagehand.test.ts
   test('should perform action', async ({ page }) => {
     await page.goto('/', { waitUntil: 'networkidle', timeout: 10000 });
     await expect(page).toHaveURL('/', { timeout: 5000 });
   });
   ```

3. Implement proper cleanup:
   ```typescript
   test.afterEach(async ({ page, context }) => {
     await page.close();
     await context.close();
   });
   ```

4. Use test isolation:
   ```typescript
   test.describe.configure({ mode: 'serial' });
   ```

### 7.2 Test Coverage Goals
- **Current**: Unknown (no coverage reports)
- **Target**: 80% coverage with 0 skipped tests

**Implementation**:
1. Add coverage reporting:
   ```json
   {
     "scripts": {
       "test:coverage": "bunx c8 playwright test",
       "test:unit:coverage": "bun test --coverage"
     }
   }
   ```

2. Create test categories:
   - Unit tests: Business logic (Bun test)
   - Integration tests: API routes (Playwright)
   - E2E tests: User flows (Playwright)

### 7.3 Test Database Strategy
1. Fix test database setup validation (currently fails silently)
2. Implement test data factories
3. Use database transactions for test isolation
4. Create seed data for consistent testing

## 8. Dependency Optimization

### 8.1 Critical Dependencies to Update
1. **Next.js**: Using canary version (15.4.0-canary.83) - move to stable 15.3.0
2. **next-auth**: Using beta (5.0.0-beta.25) - high risk, consider stable v4

### 8.2 Dependencies to Remove
```json
// Remove from package.json
{
  "prosemirror-example-setup": "^1.2.3",
  "prosemirror-inputrules": "^1.5.0",
  "prosemirror-markdown": "^1.13.2",
  "prosemirror-model": "^1.25.1",
  "prosemirror-schema-basic": "^1.2.4",
  "prosemirror-schema-list": "^1.5.1",
  "prosemirror-state": "^1.4.3",
  "prosemirror-view": "^1.40.0",
  "react-data-grid": "7.0.0-beta.56",
  "resumable-stream": "^2.2.0",
  "orderedmap": "^2.1.1",
  "@types/d3-scale": "^4.0.9"
}
```

### 8.3 Dependencies to Consolidate
- Use either `classnames` OR `clsx` (not both) - prefer clsx
- Consolidate date handling to date-fns only

## 9. Implementation Timeline

### Phase 1: Critical Fixes (Week 1)
- [ ] Day 1: Fix voice API routing and error handling
- [ ] Day 2: Replace Map-based session storage with Redis
- [ ] Day 3-4: Fix Stagehand test hanging issues
- [ ] Day 5: Remove dead code and unused dependencies

### Phase 2: Architecture Refactor (Week 2-3)
- [ ] Week 2: Implement domain-driven structure
- [ ] Week 2: Extract business logic from components
- [ ] Week 3: Create proper service layers
- [ ] Week 3: Implement dependency injection

### Phase 3: Performance Optimization (Week 4)
- [ ] Day 1-2: Database query optimization and indexing
- [ ] Day 3-4: Bundle size reduction
- [ ] Day 5: Client-side performance improvements

### Phase 4: Testing & Quality (Week 5)
- [ ] Day 1-2: Set up test coverage reporting
- [ ] Day 3-4: Write missing unit tests
- [ ] Day 5: Fix all failing tests

### Phase 5: Documentation & Deployment (Week 6)
- [ ] Day 1-2: Update documentation
- [ ] Day 3-4: Create migration guides
- [ ] Day 5: Production deployment

## 10. Risk Assessment

### High Risk Items:
1. **Voice Session Management** 
   - Risk: Memory leaks in production with Map storage
   - Mitigation: Implement Redis-backed sessions immediately
   
2. **Test Infrastructure**
   - Risk: Continued CI/CD failures
   - Mitigation: Fix signal handlers and add proper cleanup

3. **Dependency Updates**
   - Risk: Breaking changes with canary Next.js
   - Mitigation: Downgrade to stable version first

### Medium Risk Items:
1. **Architecture Refactor**
   - Risk: Introducing new bugs
   - Mitigation: Incremental refactoring, maintain test coverage

2. **Performance Optimization**
   - Risk: Premature optimization
   - Mitigation: Measure before and after, use profiling tools

### Low Risk Items:
1. **Dead Code Removal**
   - Risk: Removing accidentally used code
   - Mitigation: Comprehensive grep search before removal

2. **Test Improvements**
   - Risk: Tests becoming too rigid
   - Mitigation: Focus on behavior, not implementation

## Specific File Changes

### Critical Files to Create:
1. `/lib/services/voice-session-manager.ts` - Redis-backed session management
2. `/lib/db/migrations/rollback.ts` - Migration rollback logic
3. `/tests/fixtures/voice-fixtures.ts` - Voice test fixtures
4. `/middleware.ts` - Add auth middleware

### Critical Files to Modify:
1. `/app/(chat)/api/voice/route.ts` - Remove setInterval, add Redis
2. `/hooks/use-voice-assistant.ts` - Fix cleanup and error handling
3. `/playwright.config.ts` - Remove duplicate signal handlers
4. `/package.json` - Remove unused dependencies
5. `/.env.example` - Add Redis configuration

### Files to Verify Before Deletion:
1. `/components/voice-status.tsx` - Check if imported anywhere
2. `/lib/ai/agents/roborail-voice-agent.ts` - Verify if correct implementation
3. `/tests/helpers.ts` - Confirm deprecated
4. `/tests/setup-dom.ts` - Confirm unused

## Success Metrics

1. **Voice Feature**: Stable WebSocket connections, < 100ms latency
2. **Test Suite**: 100% pass rate, 0 skipped tests, < 5 min execution
3. **Bundle Size**: < 1GB node_modules, < 500KB initial JS bundle
4. **Performance**: < 100ms API response time, < 3s page load
5. **Code Quality**: 0 TypeScript errors, 80% test coverage
6. **Database**: < 50ms query time for common operations

## Immediate Actions (Do Today)

1. **Fix Voice Session Storage**:
   ```typescript
   // Replace Map with Redis in /app/(chat)/api/voice/route.ts
   import { redis } from '@/lib/redis';
   
   // Store sessions in Redis with TTL
   await redis.setex(`voice:${sessionId}`, 1800, JSON.stringify(sessionData));
   ```

2. **Fix Test Signal Handlers**:
   - Remove signal handler registration from playwright.config.ts
   - Keep only in global-setup.ts

3. **Add Voice Route Logging**:
   ```typescript
   console.log(`[Voice API] ${request.method} - Session: ${sessionId}`);
   ```

4. **Create GitHub Issues**:
   - Critical: Fix voice session storage
   - Critical: Fix hanging Stagehand tests
   - High: Remove unused dependencies
   - Medium: Implement test coverage reporting

This refactor plan addresses the immediate critical issues while providing a roadmap for long-term improvements. The focus is on stability, performance, and maintainability.

## Summary of Previous Work Completed

### ✅ Phase 0: Initial Fixes (Already Completed)
1. **Voice API TypeError** - Fixed undefined `audio` variable access
2. **TypeScript Compilation** - Resolved all provider type mismatches
3. **Provider Constants Consolidation** - Created `lib/ai/provider-constants.ts`
4. **Build Success** - Application now compiles without errors

### 📊 Current State
- **Code Quality**: Zero TypeScript errors, successful builds
- **Bundle Size**: 2.2GB node_modules (needs reduction)
- **Test Status**: Hanging Stagehand tests blocking CI/CD
- **Voice Feature**: Implemented but needs session management fixes
- **Database**: Functional but needs optimization

### 🎯 Priority Focus Areas
1. **Critical**: Fix test infrastructure (hanging tests)
2. **Critical**: Fix voice session memory leaks
3. **High**: Remove 500MB+ of unused dependencies
4. **Medium**: Implement proper test coverage
5. **Medium**: Optimize database queries

---

**Document Version**: 2.0
**Last Updated**: 2025-01-18
**Status**: Ready for Phase 1 Implementation
