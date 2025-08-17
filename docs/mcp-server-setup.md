# MCP Server Setup Guide

This guide helps you set up and use the Browserbase and Stagehand MCP servers with Claude Desktop.

## Your Current MCP Server Configuration

Based on your Claude Desktop configuration, you have two MCP servers set up:

### 1. Browserbase MCP Server (`mcp-browserbase`)
- **Path**: `/Users/neo/Developer/mcp_servers/mcp-server-browserbase/browserbase/dist/index.js`
- **Purpose**: Direct Browserbase session management
- **API Keys**: 
  - `BROWSERBASE_API_KEY`: `bb_live_drblBnDSdwgbUmZ21_1WRDR1YdU`
  - `BROWSERBASE_PROJECT_ID`: `7d2480c9-9254-408a-ae06-26db175b1376`

### 2. Stagehand MCP Server (`mcp-stagehand`)
- **Path**: `/Users/neo/Developer/mcp_servers/mcp-server-browserbase/stagehand/dist/index.js`
- **Purpose**: AI-powered web automation with Stagehand
- **API Keys**: 
  - `BROWSERBASE_API_KEY`: `your-browserbase-api-key`
  - `BROWSERBASE_PROJECT_ID`: `your-browserbase-project-id`
  - `OPENAI_API_KEY`: `your-openai-api-key`

## Setting Up Your Project Environment

### 1. Update Your `.env.local` File

Add these environment variables to your `.env.local` file:

```bash
# Browserbase Configuration
BROWSERBASE_API_KEY=your-browserbase-api-key
BROWSERBASE_PROJECT_ID=your-browserbase-project-id

# OpenAI Configuration (for Stagehand)
OPENAI_API_KEY=your-openai-api-key

# Stagehand Configuration
STAGEHAND_ENV=BROWSERBASE
STAGEHAND_VERBOSE=true
STAGEHAND_DEBUG_DOM=false
STAGEHAND_HEADLESS=true
STAGEHAND_DOM_SETTLE_TIMEOUT=30000
STAGEHAND_TIMEOUT=60000
STAGEHAND_NAVIGATION_TIMEOUT=30000
STAGEHAND_ACTION_TIMEOUT=15000
```

### 2. Test Your Configuration

Run the connection test to verify everything is working:

```bash
npm run test:browserbase
```

This will test:
- ✅ Browserbase API connection
- ✅ Stagehand with Browserbase integration
- ✅ Local Stagehand functionality

### 3. Update Test Environment (Optional)

If you want to run Stagehand tests, update your `.env.test` file:

```bash
# Add to .env.test
BROWSERBASE_API_KEY=your-browserbase-api-key
BROWSERBASE_PROJECT_ID=your-browserbase-project-id
OPENAI_API_KEY=your-openai-api-key
STAGEHAND_ENV=BROWSERBASE
```

## Using the MCP Servers with Claude Desktop

### Available Tools

#### Browserbase MCP Server Tools:
- `browserbase_create_session` - Create a new browser session
- `browserbase_get_session` - Get session details
- `browserbase_list_sessions` - List all sessions
- `browserbase_update_session` - Update session settings

#### Stagehand MCP Server Tools:
- `stagehand_navigate` - Navigate to any URL
- `stagehand_act` - Perform actions on web pages
- `stagehand_extract` - Extract data from web pages
- `stagehand_observe` - Observe possible actions on pages

### Example Usage in Claude Desktop

#### 1. Basic Web Automation
```
Please navigate to https://docs.stagehand.dev/ and extract the main heading and description from the page.
```

Claude will:
1. Use `stagehand_navigate` to go to the URL
2. Use `stagehand_extract` to get the heading and description
3. Return the structured data

#### 2. Interactive Web Actions
```
Please go to https://example.com, find the search box, and search for "web automation".
```

Claude will:
1. Navigate to the site
2. Use `stagehand_observe` to find the search box
3. Use `stagehand_act` to perform the search

#### 3. Session Management
```
Create a new Browserbase session and show me the session details.
```

Claude will:
1. Use `browserbase_create_session` to create a session
2. Use `browserbase_get_session` to show details
3. Provide session ID and debug URL

## Project Integration

### Using Server Actions

```typescript
import { stagehandNavigate, stagehandExtract } from '@/lib/stagehand/actions';

// Navigate to a page
const result = await stagehandNavigate({
  url: 'https://docs.stagehand.dev/',
});

// Extract data
const data = await stagehandExtract({
  instruction: 'Extract the page title and main heading',
  schema: z.object({
    title: z.string(),
    heading: z.string(),
  }),
});
```

### Using React Components

```tsx
import { StagehandDemo } from '@/components/stagehand/stagehand-demo';

export default function AutomationPage() {
  return (
    <div>
      <h1>Web Automation Demo</h1>
      <StagehandDemo />
    </div>
  );
}
```

### Running CLI Demos

```bash
# Demo with your Browserbase setup
npm run stagehand:demo -- --remote

# Demo with local browser
npm run stagehand:demo -- --local

# Custom URL with remote browser
npm run stagehand:demo -- --url https://your-site.com --remote
```

## Troubleshooting

### Common Issues

1. **MCP Server Not Found**
   - Verify the paths in your Claude Desktop config match your actual file locations
   - Check that the MCP server files exist at the specified paths

2. **API Key Issues**
   - Ensure your API keys are valid and not expired
   - Check that the keys have the correct permissions

3. **Session Creation Failures**
   - Verify your Browserbase project ID is correct
   - Check your Browserbase account limits and usage

### Debug Commands

```bash
# Test your configuration
npm run test:browserbase

# Run Stagehand tests (requires valid API keys)
npm run test:stagehand

# Demo with verbose output
npm run stagehand:demo -- --remote

# Check MCP server setup
npm run setup:mcp
```

### Logs and Debugging

- Check Claude Desktop logs for MCP server errors
- Enable verbose logging: `STAGEHAND_VERBOSE=true`
- Use debug mode: `STAGEHAND_DEBUG_DOM=true`
- Monitor Browserbase dashboard for session activity

## Security Notes

- ✅ Your API keys are properly configured in environment variables
- ✅ MCP servers use environment variable substitution
- ⚠️ Be careful not to commit real API keys to version control
- ✅ Use different keys for development and production environments

## Next Steps

1. **Test the setup**: Run `npm run test:browserbase`
2. **Try Claude integration**: Use the MCP tools in Claude Desktop
3. **Integrate into your app**: Use the server actions and components
4. **Monitor usage**: Check Browserbase and OpenAI usage dashboards
5. **Scale up**: Consider rate limiting and error handling for production use

Your MCP server setup is now ready for advanced web automation with both direct Browserbase control and AI-powered Stagehand interactions!
