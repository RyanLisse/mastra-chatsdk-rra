# Stagehand Integration Guide

This document provides a comprehensive guide to the Stagehand integration in this project, following best practices and modern patterns.

## Overview

Stagehand is an AI-powered web automation library that enables natural language interactions with web pages. This integration provides:

- **Server Actions**: Type-safe server actions for web automation
- **React Components**: Client components for Stagehand interactions
- **Best Practices**: Following Stagehand's recommended patterns
- **Environment Support**: Both LOCAL and BROWSERBASE environments
- **MCP Integration**: Claude Desktop integration via MCP server

## Architecture

```
lib/stagehand/
├── utils.ts          # Core utilities and initialization
├── actions.ts        # Next.js server actions
└── types.ts          # TypeScript type definitions

components/stagehand/
└── stagehand-demo.tsx # Demo React component

scripts/
├── setup-mcp-server.ts    # MCP server setup
└── stagehand-demo.ts      # CLI demo script

tests/stagehand/
├── chat.stagehand.test.ts     # Updated tests with best practices
└── model-response-test.ts     # Model testing with Stagehand
```

## Configuration

### Environment Variables

Add these variables to your `.env.local` file:

```bash
# Browserbase Configuration (Required for production)
BROWSERBASE_API_KEY=bb_your-browserbase-api-key-here
BROWSERBASE_PROJECT_ID=your-browserbase-project-id-here

# Stagehand Configuration
STAGEHAND_ENV=LOCAL                    # LOCAL or BROWSERBASE
STAGEHAND_VERBOSE=true                 # Enable verbose logging
STAGEHAND_DEBUG_DOM=true               # Enable DOM debugging
STAGEHAND_HEADLESS=false               # Run in headless mode
STAGEHAND_DOM_SETTLE_TIMEOUT=30000     # DOM settle timeout (ms)
STAGEHAND_TIMEOUT=60000                # Global timeout (ms)
STAGEHAND_NAVIGATION_TIMEOUT=30000     # Navigation timeout (ms)
STAGEHAND_ACTION_TIMEOUT=15000         # Action timeout (ms)
```

### Configuration File

The `stagehand.config.ts` file provides centralized configuration with:

- Environment variable validation
- Type safety with Zod schemas
- Support for both LOCAL and BROWSERBASE environments
- Browser launch options for stability

## Best Practices Implementation

### 1. Atomic and Specific Actions

```typescript
// ✅ Good - Atomic and specific
await stagehand.page.act('Click the "Sign In" button');

// ❌ Avoid - Too broad or multiple actions
await stagehand.page.act('Sign in and navigate to dashboard');
```

### 2. Use Variables for Sensitive Data

```typescript
// ✅ Good - Using variables
await stagehand.page.act({
  action: 'Type %email% into the email field',
  variables: {
    email: userEmail,
  },
});

// ❌ Avoid - Exposing sensitive data to LLM
await stagehand.page.act(`Type ${userEmail} into the email field`);
```

### 3. Preview Actions with observe()

```typescript
// ✅ Good - Observe first, then act
const actions = await stagehand.page.observe('find the login button');
if (actions.length > 0) {
  await stagehand.page.act(actions[0]);
}
```

### 4. Proper Error Handling and Cleanup

```typescript
const { stagehand, cleanup } = await initializeStagehand();
try {
  // Perform actions
  await navigateToUrl(stagehand, 'https://example.com');
} finally {
  await cleanup(); // Always cleanup
}
```

## Usage Examples

### Server Actions

```typescript
import { stagehandNavigate, stagehandAct, stagehandExtract } from '@/lib/stagehand/actions';

// Navigate to a URL
const result = await stagehandNavigate({
  url: 'https://docs.stagehand.dev/',
});

// Perform an action
const actionResult = await stagehandAct({
  action: 'Click the quickstart link',
});

// Extract data
const data = await stagehandExtract({
  instruction: 'Extract the page title and description',
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});
```

### React Component

```tsx
import { StagehandDemo } from '@/components/stagehand/stagehand-demo';

export default function Page() {
  return (
    <div>
      <h1>Web Automation Demo</h1>
      <StagehandDemo />
    </div>
  );
}
```

### CLI Demo

```bash
# Run demo with default settings
npm run stagehand:demo

# Run demo with custom URL and remote browser
npm run stagehand:demo -- --url https://example.com --remote

# Run demo quietly without screenshots
npm run stagehand:demo -- --quiet --no-screenshots
```

## Testing

### Updated Test Structure

The tests have been updated to follow Stagehand best practices:

```typescript
// Use observe() before act()
const signInActions = await stagehand.page.observe('find sign in button');
if (signInActions.length > 0) {
  await stagehand.page.act(signInActions[0]);
}

// Use variables for test data
await stagehand.page.act({
  action: 'Type %message% in the text area and send it',
  variables: {
    message: testMessage,
  },
});
```

### Running Tests

```bash
# Run Stagehand tests
npm run test:stagehand

# Run tests with UI mode
npm run test:tdd
```

## MCP Server Integration

### Setup

1. Install the MCP server setup:
```bash
npm run setup:mcp
```

2. Restart Claude Desktop

3. Look for the 🔨 icon to access Stagehand tools

### Available Tools

**Browserbase MCP Server:**
- **browserbase_create_session**: Create a new browser session
- **browserbase_get_session**: Get session details
- **browserbase_list_sessions**: List all sessions
- **browserbase_update_session**: Update session settings

**Stagehand MCP Server:**
- **stagehand_navigate**: Navigate to any URL
- **stagehand_act**: Perform actions on web pages
- **stagehand_extract**: Extract data from web pages
- **stagehand_observe**: Observe possible actions on pages

### Example Usage in Claude

```
Please navigate to https://docs.stagehand.dev/ and extract the main heading and description from the page.
```

Claude will use the MCP server to:
1. Navigate to the URL
2. Extract the requested information
3. Return the structured data

## Deployment Considerations

### Local Development

- Use `STAGEHAND_ENV=LOCAL` for local browser automation
- Set `STAGEHAND_HEADLESS=false` to see browser actions
- Enable `STAGEHAND_DEBUG_DOM=true` for debugging

### Production

- Use `STAGEHAND_ENV=BROWSERBASE` for remote browsers
- Set `STAGEHAND_HEADLESS=true` for performance
- Configure proper API keys and project IDs
- Consider rate limiting and resource management

## Troubleshooting

### Common Issues

1. **Browser Launch Failures**
   - Check browser launch options in config
   - Ensure proper permissions for browser execution
   - Verify system dependencies

2. **Timeout Issues**
   - Adjust timeout values in configuration
   - Check network connectivity
   - Monitor page load times

3. **Action Failures**
   - Use `observe()` to debug available actions
   - Make actions more specific and atomic
   - Check element selectors and page state

### Debug Tools

- Enable verbose logging: `STAGEHAND_VERBOSE=true`
- Use DOM debugging: `STAGEHAND_DEBUG_DOM=true`
- Take screenshots for visual debugging
- Use Browserbase debug URLs for remote sessions

## Security Considerations

- Never hardcode API keys or sensitive data
- Use environment variables for all configuration
- Implement proper authentication checks in server actions
- Consider rate limiting for production usage
- Validate all inputs with Zod schemas

## Performance Optimization

- Use appropriate timeout values
- Implement proper cleanup mechanisms
- Consider browser resource management
- Monitor memory usage in long-running sessions
- Use Browserbase for scalable remote automation

## Contributing

When contributing to the Stagehand integration:

1. Follow the established patterns and best practices
2. Add proper TypeScript types and Zod validation
3. Include comprehensive error handling
4. Write tests for new functionality
5. Update documentation as needed

## Resources

- [Stagehand Documentation](https://docs.stagehand.dev/)
- [Stagehand Best Practices](https://docs.stagehand.dev/examples/best_practices)
- [Browserbase Documentation](https://docs.browserbase.com/)
- [MCP Server Integration](https://docs.stagehand.dev/integrations/mcp-server)
