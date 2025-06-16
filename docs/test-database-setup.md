# Test Database Setup Guide

This guide explains how to set up and use the comprehensive test database system for E2E testing with Neon database test branches.

## Overview

The test database system provides:
- **Isolated Testing**: Complete separation from production data
- **Neon Test Branches**: Cost-effective, fast test database isolation
- **Automated Setup**: One-command database preparation
- **Sample Data**: Pre-loaded RoboRail test scenarios
- **Easy Reset**: Quick cleanup between test runs
- **RAG Testing**: Document chunks for search functionality testing

## Quick Start

### 1. Configure Test Database

Create or update your `.env.test` file:

```bash
# Copy the template
cp .env.test .env.test.local

# Edit with your actual test database URL
# RECOMMENDED: Use a Neon test branch
POSTGRES_URL=postgresql://user:pass@test-branch-project.region.neon.tech/dbname?sslmode=require
```

### 2. Set Up Test Database

```bash
# One-command setup (recommended)
bun run db:test:setup

# Or step by step:
bun run db:test:migrate  # Run migrations
bun run db:test:seed     # Add sample data
bun run db:test:validate # Verify setup
```

### 3. Run Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run specific test suites
bun run test:routes
bun run test:unit

# Run with database validation
bun run db:test:validate && bun run test:e2e
```

## Neon Test Branch Setup

### Benefits of Neon Test Branches

- **Complete Isolation**: Separate database instance for testing
- **Cost Effective**: Only pay for compute time used
- **Fast Creation**: Instant branch creation from main database
- **Schema Sync**: Automatically inherits production schema
- **Easy Reset**: Delete and recreate branches quickly

### Creating a Neon Test Branch

1. **Login to Neon Console**
   ```
   https://console.neon.tech/
   ```

2. **Navigate to Your Project**
   - Select your project from the dashboard

3. **Create Test Branch**
   - Go to "Branches" tab
   - Click "Create Branch"
   - Name: `test-main` or `test-e2e`
   - Parent: Select your main branch
   - Click "Create Branch"

4. **Get Connection String**
   - Copy the connection string for your test branch
   - Format: `postgresql://user:pass@test-branch-project.region.neon.tech/dbname?sslmode=require`

5. **Update Configuration**
   ```bash
   # Add to .env.test
   POSTGRES_URL=your-test-branch-connection-string
   ```

### Managing Test Branches

```bash
# Validate branch configuration
bun run db:test:validate

# Reset branch data
bun run db:test:reset

# Clean up test data
bun run db:test:clean
```

## Available Commands

### Database Management

```bash
# Setup and configuration
bun run db:test:setup      # Complete test database setup
bun run db:test:validate   # Validate configuration and connectivity
bun run db:test:migrate    # Run database migrations
bun run db:test:seed       # Seed with sample RoboRail data
bun run db:test:reset      # Reset and re-seed database
bun run db:test:clean      # Clean up test data
```

### Testing Commands

```bash
# Run tests with proper environment
bun run test:e2e           # End-to-end tests
bun run test:routes        # API route tests  
bun run test:unit          # Unit tests
bun run test:all           # All test suites

# Development testing
bun run test:watch         # Watch mode for development
bun run test:tdd           # TDD mode with stagehand tests
```

## Test Database Features

### Sample Data

The test database includes realistic RoboRail sample data:

**Users:**
- `test-operator@roborail.com` - Machine operator
- `test-maintenance@roborail.com` - Maintenance technician  
- `test-supervisor@roborail.com` - Supervisor

**Chat Conversations:**
- Startup procedures discussion
- Safety protocols Q&A
- Maintenance scheduling chat

**Document Chunks:**
- RoboRail operation manual excerpts
- Safety procedure guidelines
- Emergency response protocols
- Maintenance checklists

### Database Helper Functions

Use the database helper in your tests:

```typescript
import { getTestDatabase, resetBetweenTests } from '../helpers/database';

test.describe('My Test Suite', () => {
  let testDb: any;

  test.beforeAll(async () => {
    testDb = await getTestDatabase();
  });

  test.beforeEach(async () => {
    await resetBetweenTests(); // Clean slate for each test
  });

  test('should create test data', async () => {
    // Create test user
    const user = await testDb.createTestUser({
      email: 'test@example.com'
    });

    // Create test chat
    const chat = await testDb.createTestChat(user.id, {
      title: 'Test Chat'
    });

    // Verify in database
    const stats = await testDb.getTestStats();
    expect(stats.users).toBeGreaterThan(0);
  });
});
```

### Available Helper Methods

```typescript
// User management
await testDb.createTestUser(overrides)
await testDb.createTestChat(userId, overrides) 
await testDb.createTestMessage(chatId, overrides)

// Document testing
await testDb.createTestDocumentChunks(count)

// Database operations
await testDb.getTestStats()
await testDb.executeRawSQL(query, params)
await testDb.reset()
await testDb.seed()

// Cleanup
await testDb.cleanupTestData(patterns)
```

## Configuration Options

### Environment Variables

```bash
# Database connection
POSTGRES_URL=your-test-database-url
DATABASE_URL=your-test-database-url  # Alternative name

# Test behavior
TEST_MODE=true
TEST_DB_RESET_ON_START=false
TEST_DB_SEED_SAMPLE_DATA=true
TEST_PARALLEL_WORKERS=4

# Timeouts (milliseconds)
TEST_TIMEOUT_DEFAULT=30000
TEST_TIMEOUT_E2E=60000
TEST_TIMEOUT_DATABASE=10000

# Features during testing
ENABLE_VOICE_CHAT=true
ENABLE_DOCUMENT_UPLOAD=true
ENABLE_RAG_SYSTEM=true
ENABLE_GUEST_ACCESS=false

# API keys (same as development)
OPENAI_API_KEY=your-key
COHERE_API_KEY=your-key
BLOB_READ_WRITE_TOKEN=your-token
```

### Test Database Validation

The system automatically validates:

✅ Database URL is configured and accessible  
✅ Not accidentally using production database  
✅ pgvector extension is available  
✅ All required tables exist after migration  
✅ Sample data is properly seeded  
✅ CRUD operations work correctly  

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check configuration
bun run db:test:validate

# Verify URL format
echo $POSTGRES_URL

# Test connection manually
psql $POSTGRES_URL -c "SELECT 1;"
```

**Migration Failures**
```bash
# Reset and retry
bun run db:test:reset
bun run db:test:migrate

# Check permissions
# Ensure test database allows DDL operations
```

**pgvector Extension Missing**
```sql
-- Connect to test database and run:
CREATE EXTENSION IF NOT EXISTS vector;

-- Or ask your database provider to enable it
```

**Sample Data Conflicts**
```bash
# Clean and re-seed
bun run db:test:clean
bun run db:test:seed

# Or complete reset
bun run db:test:reset
```

**Test Isolation Issues**
```bash
# Verify proper cleanup
bun run db:test:validate

# Check for leaked data
psql $POSTGRES_URL -c "SELECT COUNT(*) FROM \"User\" WHERE email LIKE '%@test.%';"
```

### Performance Issues

**Slow Test Execution**
- Use fewer parallel workers: `TEST_PARALLEL_WORKERS=2`
- Enable connection pooling in test database
- Consider using local test database for development

**Database Timeouts**
- Increase timeout values in `.env.test`
- Check network connectivity to test database
- Verify test database has sufficient resources

### Security Considerations

**Database Safety**
- Never use production database URLs in tests
- Regularly rotate test database credentials
- Monitor test database usage and costs
- Clean up test branches periodically

**Data Privacy**
- Test data should not contain real user information
- Use synthetic data for realistic testing scenarios
- Regularly audit test data for sensitive information

## Advanced Usage

### Custom Test Scenarios

```typescript
// Create complex test data
const scenario = await testDb.createTestScenario({
  users: 3,
  chatsPerUser: 2,
  messagesPerChat: 5,
  documentChunks: 10
});

// Test specific conditions
await testDb.simulateHighLoad(100); // 100 concurrent operations
await testDb.testDatabaseRecovery(); // Simulate connection issues
```

### Integration with CI/CD

```yaml
# GitHub Actions example
- name: Setup Test Database
  run: bun run db:test:setup

- name: Validate Test Environment  
  run: bun run db:test:validate

- name: Run E2E Tests
  run: bun run test:e2e

- name: Cleanup
  run: bun run db:test:clean
  if: always()
```

### Monitoring and Debugging

```bash
# Enable SQL debugging
DEBUG_SQL=true bun run test:e2e

# Monitor database performance
bun run db:test:validate --verbose

# Export test data for analysis
bun run db:test:export --format=json
```

## Best Practices

### Test Design
1. **Use isolated test data** - Create fresh data for each test
2. **Clean up after tests** - Don't leave orphaned test data
3. **Test realistic scenarios** - Use sample data that matches production patterns
4. **Verify data integrity** - Check both success and failure cases

### Performance
1. **Minimize database resets** - Only reset when necessary
2. **Use transactions** - Group related operations
3. **Parallel test safety** - Ensure tests don't interfere with each other
4. **Connection management** - Properly close connections

### Maintenance
1. **Regular validation** - Run `db:test:validate` periodically
2. **Update sample data** - Keep test scenarios current
3. **Monitor costs** - Track test database usage
4. **Branch cleanup** - Remove unused test branches

## Support

For issues with test database setup:

1. **Run validation**: `bun run db:test:validate`
2. **Check logs**: Review error messages in test output
3. **Verify configuration**: Ensure `.env.test` is properly configured
4. **Test manually**: Try database operations outside of tests
5. **Reset environment**: `bun run db:test:reset` for clean slate

The test database system is designed to make E2E testing reliable, fast, and maintainable. Follow this guide to get the most out of your testing infrastructure.