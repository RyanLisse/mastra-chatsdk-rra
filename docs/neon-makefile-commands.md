# Neon Database Branching with Makefile

This document explains how to use the Neon database branching commands integrated into the project's Makefile. These commands allow you to create isolated test databases for testing, CI/CD pipelines, and development workflows.

## Prerequisites

1. **Neon API Key**: Get your API key from [Neon Console](https://console.neon.tech/app/settings/api-keys)
2. **Environment Setup**: Add `NEON_API_KEY` to your `.env.local` file
3. **neonctl CLI**: Automatically installed with `bun install`

## Setup Commands

### `make neon-setup`
Validates Neon CLI installation and API key configuration.

```bash
make neon-setup
```

**What it does:**
- Checks if `NEON_API_KEY` is set in `.env.local`
- Installs `neonctl` CLI if not available
- Tests API connection to Neon
- Extracts project ID from `DATABASE_URL`

### `make neon-validate`
Validates Neon configuration using the NeonBranchManager.

```bash
make neon-validate
```

**What it does:**
- Uses the TypeScript NeonBranchManager to validate setup
- More comprehensive validation than `neon-setup`

## Branch Management Commands

### `make test-branch-create`
Creates a new test branch for isolated testing.

```bash
make test-branch-create
```

**What it does:**
- Creates a branch named `test-{current-git-branch}-{timestamp}`
- Based on your current Git branch for easy identification
- Provides instructions on how to get the connection string

### `make test-branch-list`
Lists all branches in the project.

```bash
make test-branch-list
```

**Output:** Table format showing all branches with their status and metadata.

### `make test-branch-status`
Shows only test branches with their status.

```bash
make test-branch-status
```

**Output:** Filtered view showing only branches containing "test" in their name.

### `make test-branch-connection BRANCH=branch-name`
Gets the connection string for a specific branch.

```bash
make test-branch-connection BRANCH=test-feature-20241217-143022
```

**What it does:**
- Retrieves the full PostgreSQL connection string
- Shows how to use it in your tests with `DATABASE_URL_TEST`

## Cleanup Commands

### `make test-branch-cleanup`
Cleans up old test branches (older than 24 hours).

```bash
make test-branch-cleanup
```

**What it does:**
- Uses the NeonBranchManager cleanup script
- Interactive confirmation before deletion
- Skips primary and protected branches

### `make test-branch-cleanup-dry`
Shows what would be cleaned up without actually deleting.

```bash
make test-branch-cleanup-dry
```

**Use case:** Preview cleanup operations before running them.

### `make test-branch-cleanup-ci`
Cleans up only CI test branches.

```bash
make test-branch-cleanup-ci
```

**What it does:**
- Targets branches with "ci-test" pattern
- Useful for CI/CD cleanup workflows

## Testing Integration Commands

### `make test-with-neon-branch`
Runs tests with a fresh Neon test branch.

```bash
make test-with-neon-branch
```

**What it does:**
1. Creates a temporary test branch
2. Runs the unit test suite with the test database
3. Automatically cleans up the branch afterward
4. Perfect for isolated testing

### `make neon-branch-manager-test`
Tests the NeonBranchManager functionality.

```bash
make neon-branch-manager-test
```

**What it does:**
- Validates NeonBranchManager setup
- Lists projects and branches
- Ensures TypeScript integration works

## CI/CD Integration Commands

### `make neon-ci-setup`
Sets up a test branch for CI/CD pipelines.

```bash
make neon-ci-setup
```

**What it does:**
- Creates a branch with CI-specific naming
- Writes environment file (`.env.ci`)
- Designed for automated CI workflows

### `make neon-ci-cleanup`
Cleans up CI test branches.

```bash
make neon-ci-cleanup
```

**What it does:**
- Removes CI branches older than 1 hour
- Cleans up environment files
- Safe for automated execution

## Environment Management

### `make env-check`
Enhanced to show Neon configuration status.

```bash
make env-check
```

**New output includes:**
- Neon API Key status
- Detected Neon Project ID
- Connection validation status

## Usage Examples

### Development Workflow

```bash
# 1. Set up and validate Neon
make neon-setup

# 2. Create a test branch for your feature
make test-branch-create

# 3. Get the connection string (note the branch name from step 2)
make test-branch-connection BRANCH=test-main-20241217-143022

# 4. Use the connection string in your tests
DATABASE_URL_TEST="postgresql://..." bun run test:unit

# 5. Clean up when done
make test-branch-cleanup-dry  # Preview
make test-branch-cleanup      # Actually clean up
```

### Isolated Testing

```bash
# Run tests with automatic branch management
make test-with-neon-branch
```

### CI/CD Pipeline

```bash
# In your CI workflow:
make neon-ci-setup
# ... run your tests using the .env.ci file
make neon-ci-cleanup
```

## Branch Naming Conventions

The system uses consistent naming patterns:

- **Manual test branches**: `test-{git-branch}-{timestamp}`
- **CI branches**: `ci-test-{run-id}-{timestamp}`
- **Test run branches**: `test-run-{timestamp}`

## Safety Features

1. **Protected Branch Safety**: Never deletes primary or protected branches
2. **Test Pattern Matching**: Only operates on branches with "test" patterns
3. **Age-based Cleanup**: Only cleans up branches older than specified time
4. **Dry Run Options**: Preview operations before execution
5. **Error Handling**: Graceful failure with informative messages

## Troubleshooting

### "Could not detect Neon project ID"
- Ensure `DATABASE_URL` is properly set in `.env.local`
- The URL should be in Neon format: `postgresql://...@host.region.neon.tech/db`

### "NEON_API_KEY not found"
- Add your Neon API key to `.env.local`
- Get it from [Neon Console](https://console.neon.tech/app/settings/api-keys)

### "Authentication failed"
- Verify your `NEON_API_KEY` is correct and active
- Check if the API key has necessary permissions

### "neonctl CLI not found"
- Run `bun install` to install the CLI
- Or run `make neon-setup` which will install it automatically

## Advanced Usage

### Custom Cleanup Patterns

The cleanup scripts support custom patterns:

```bash
# Clean up branches matching specific pattern
bun run scripts/cleanup-neon-test-branches.ts --pattern "feature-test"

# Clean up branches older than 6 hours
bun run scripts/cleanup-neon-test-branches.ts --max-age 6
```

### Custom Branch Creation

```bash
# Create branch with custom name
bun run scripts/setup-neon-test-branch.ts --branch-name "my-custom-test"
```

## Integration with Testing

The commands integrate seamlessly with the existing test infrastructure:

- Use `DATABASE_URL_TEST` environment variable for test database
- Compatible with existing test setup scripts
- Supports both unit and integration testing
- Works with Playwright and other test runners

This integration provides isolated, reproducible test environments while maintaining the simplicity of the existing test workflow.