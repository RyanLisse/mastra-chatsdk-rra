# Signal Handlers Implementation Summary

This document summarizes the comprehensive signal handler implementation for graceful shutdown across the test infrastructure and main application.

## Overview

We have implemented robust process signal handlers that ensure proper cleanup of database connections and other resources when processes are interrupted or terminated.

## Implementation Details

### 1. Core Signal Handler Utility (`tests/helpers/signal-handlers.ts`)
- **Purpose**: Centralized signal handling utility for test processes
- **Signals Handled**: SIGTERM, SIGINT, SIGQUIT
- **Features**:
  - Prevents multiple signal handler executions
  - Supports custom shutdown callbacks
  - Comprehensive error handling
  - Detailed logging with timing information
  - Force cleanup fallback mechanism
  - Maximum shutdown time enforcement (15 seconds)

### 2. Enhanced Test Setup (`tests/setup.ts`)
- **Purpose**: Global test setup with signal handlers
- **Features**:
  - Registers comprehensive signal handlers on startup
  - Adds custom cleanup callbacks for test-specific cleanup
  - Integrates with existing test cleanup functions
  - Imports from centralized signal handler utility

### 3. Playwright Global Setup Enhancement (`tests/global-setup.ts`)
- **Purpose**: Signal handlers for Playwright test setup process
- **Features**:
  - Handles interruption during test environment setup
  - Cleans up database connections on signal
  - Prevents multiple handler registration
  - Error recovery with force cleanup

### 4. Playwright Global Teardown Enhancement (`tests/global-teardown.ts`)
- **Purpose**: Signal handlers for Playwright test teardown process
- **Features**:
  - Enhanced cleanup with connection health checking
  - Multi-step cleanup process with verification
  - Force cleanup fallback for stubborn connections
  - Comprehensive logging

### 5. Playwright Configuration Enhancement (`playwright.config.ts`)
- **Purpose**: Configuration-level signal handlers
- **Features**:
  - Registers signal handlers at configuration level
  - Handles web server process termination gracefully
  - Uses SIGTERM for graceful server shutdown
  - Timeout and retry configuration

### 6. Main Application Signal Handlers (`instrumentation.ts`)
- **Purpose**: Production application signal handling
- **Features**:
  - Automatically loaded by Next.js runtime
  - Only activates in Node.js runtime (not during build)
  - Uses existing cleanup functions from `lib/db/cleanup.ts`
  - Integrates with OpenTelemetry instrumentation

### 7. Enhanced Database Cleanup (`lib/db/cleanup.ts`)
- **Purpose**: Improved application-level signal handling
- **Features**:
  - Prevents duplicate signal handler registration
  - Proper exit codes for different signals
  - Timing information for shutdown process
  - Enhanced error handling and logging

## Signal Handler Coverage

### Test Infrastructure
- ✅ Unit tests (`tests/setup.ts`)
- ✅ Playwright E2E tests (`tests/global-setup.ts`, `tests/global-teardown.ts`)
- ✅ Playwright configuration (`playwright.config.ts`)
- ✅ Individual test processes (via signal handler utility)

### Main Application
- ✅ Next.js application (`instrumentation.ts`)
- ✅ Database connections (`lib/db/cleanup.ts`)
- ✅ Server processes (via Playwright web server config)

## Signals Handled

| Signal | Exit Code | Description |
|--------|-----------|-------------|
| SIGTERM | 0 | Graceful termination request |
| SIGINT | 130 | Interrupt from keyboard (Ctrl+C) |
| SIGQUIT | 131 | Quit from keyboard (Ctrl+\\) |

## Additional Error Handling

- **uncaughtException**: Force cleanup + exit code 1
- **unhandledRejection**: Force cleanup + exit code 1
- **process warnings**: Logged for debugging

## Cleanup Functions Called

When signals are received, the following cleanup functions are executed:

1. **Custom shutdown callbacks** (test-specific)
2. **cleanupAllConnections()** - Graceful cleanup
3. **forceCleanupAllConnections()** - Emergency cleanup (if graceful fails)
4. **Connection health verification** - Ensures cleanup success

## Key Features

### 1. Prevention of Multiple Executions
- Global flags prevent signal handlers from running multiple times
- Each context (test, setup, teardown, application) has its own flag

### 2. Timeout Management
- Maximum shutdown time: 15 seconds for tests, 10 seconds for application
- Prevents hanging processes during cleanup

### 3. Comprehensive Logging
- Step-by-step cleanup process logging
- Timing information for performance monitoring
- Error details with stack traces
- Connection health statistics

### 4. Fallback Mechanisms
- Graceful cleanup first, force cleanup as fallback
- Multiple retry attempts for stubborn connections
- Different exit codes based on cleanup success

### 5. Context Awareness
- Different handlers for different process types
- Appropriate cleanup strategies for each context
- Custom callbacks for test-specific cleanup

## Testing

The implementation includes comprehensive tests:

- `tests/signal-handlers.test.ts` - Core functionality tests
- `tests/signal-integration.test.ts` - Integration tests
- All tests pass and verify proper signal handler registration

## Usage

### In Tests
Signal handlers are automatically registered when importing `tests/setup.ts`:

```typescript
import './setup'; // Automatically registers signal handlers
```

### Custom Cleanup
Add custom cleanup logic:

```typescript
import { addShutdownCallback } from './tests/helpers/signal-handlers';

addShutdownCallback(async () => {
  // Your cleanup code here
});
```

### In Production
Signal handlers are automatically registered via Next.js instrumentation.

## Benefits

1. **Prevents Resource Leaks**: Database connections are always cleaned up
2. **Prevents Test Hanging**: Tests can be interrupted gracefully
3. **Improves Developer Experience**: Ctrl+C works reliably
4. **Production Safety**: Application shuts down cleanly
5. **Debugging Support**: Comprehensive logging helps identify issues
6. **Robustness**: Multiple fallback mechanisms ensure cleanup happens

## Files Modified/Created

### Created Files
- `tests/helpers/signal-handlers.ts` - Core signal handler utility
- `tests/signal-handlers.test.ts` - Signal handler tests  
- `tests/signal-integration.test.ts` - Integration tests
- `docs/signal-handlers-implementation.md` - This documentation

### Enhanced Files
- `tests/setup.ts` - Added signal handler registration
- `tests/global-setup.ts` - Added Playwright setup signal handlers
- `tests/global-teardown.ts` - Enhanced teardown with signal handlers
- `playwright.config.ts` - Added configuration-level signal handlers
- `instrumentation.ts` - Added application signal handlers
- `lib/db/cleanup.ts` - Enhanced application cleanup functions

## Verification

All signal handlers have been tested and verified to:
- Register correctly without conflicts
- Handle signals appropriately 
- Execute cleanup functions properly
- Prevent multiple executions
- Log detailed information
- Exit with correct codes
- Work across different test environments

The implementation provides comprehensive coverage for graceful shutdown across the entire test infrastructure and main application.