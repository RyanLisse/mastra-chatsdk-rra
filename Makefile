# RoboRail Assistant Makefile
# Built with Bun for improved performance

.PHONY: help install dev build test clean lint format setup db-setup db-migrate db-studio test-setup test-all test-stagehand test-playwright commit-check deploy-check kill-port kill-all-dev-ports show-ports dev-clean neon-setup neon-validate test-branch-create test-branch-cleanup test-branch-cleanup-dry test-branch-cleanup-ci test-branch-list test-branch-status test-branch-connection neon-ci-setup neon-ci-cleanup test-with-neon-branch neon-branch-manager-test

# Default target
.DEFAULT_GOAL := help

# Variables
NODE_ENV ?= development
DATABASE_URL ?= $(shell grep "^DATABASE_URL" .env.local 2>/dev/null | cut -d'=' -f2-)
NEON_API_KEY ?= $(shell grep "^NEON_API_KEY" .env.local 2>/dev/null | cut -d'=' -f2-)
NEON_PROJECT_ID ?= $(shell echo "$(DATABASE_URL)" | sed -n 's/.*@\([^.]*\)\..*\.neon\.tech.*/\1/p' | sed 's/.*-\([^-]*-[^-]*\)$$/\1/')
COMMIT_MSG ?= "feat: automated commit"
DEV_PORT ?= 3000

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
PURPLE = \033[0;35m
CYAN = \033[0;36m
NC = \033[0m # No Color

## Help
help: ## Display this help message
	@echo "$(CYAN)RoboRail Assistant - Development Commands$(NC)"
	@echo ""
	@echo "$(YELLOW)Available commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

## Installation & Setup
install: ## Install all dependencies using Bun
	@echo "$(BLUE)Installing dependencies with Bun...$(NC)"
	bun install
	@echo "$(GREEN)Dependencies installed successfully!$(NC)"

setup: install db-setup ## Complete project setup (install + database setup)
	@echo "$(GREEN)Project setup complete!$(NC)"

## Development
kill-port: ## Kill any process running on the development port
	@echo "$(YELLOW)Checking for processes on port $(DEV_PORT)...$(NC)"
	@PID=$$(lsof -t -i:$(DEV_PORT) 2>/dev/null); \
	if [ ! -z "$$PID" ]; then \
		echo "$(RED)Killing process $$PID on port $(DEV_PORT)...$(NC)"; \
		kill -9 $$PID && \
		echo "$(GREEN)Process killed successfully!$(NC)"; \
	else \
		echo "$(GREEN)No process found on port $(DEV_PORT)$(NC)"; \
	fi

dev: kill-port ## Start development server (kills existing processes first)
	@echo "$(BLUE)Starting development server...$(NC)"
	bun run dev

dev-turbo: kill-port ## Start development server with Turbopack (kills existing processes first)
	@echo "$(BLUE)Starting development server with Turbopack...$(NC)"
	bun run dev --turbo

dev-clean: kill-port clean ## Clean, kill port, and start fresh development server
	@echo "$(BLUE)Starting clean development server...$(NC)"
	bun install && bun run dev

## Build & Production
build: ## Build the application for production
	@echo "$(BLUE)Building application...$(NC)"
	bun run build
	@echo "$(GREEN)Build completed successfully!$(NC)"

start: ## Start production server
	@echo "$(BLUE)Starting production server...$(NC)"
	bun run start

## Database Operations
db-setup: ## Set up the database (run migrations)
	@echo "$(BLUE)Setting up database...$(NC)"
	bun run db:migrate
	@echo "$(GREEN)Database setup complete!$(NC)"

db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	bun run db:migrate

db-generate: ## Generate new migration files
	@echo "$(BLUE)Generating database migration...$(NC)"
	bun run db:generate

db-studio: ## Open Drizzle Studio
	@echo "$(BLUE)Opening Drizzle Studio...$(NC)"
	bun run db:studio

db-push: ## Push schema changes to database
	@echo "$(BLUE)Pushing schema changes...$(NC)"
	bun run db:push

db-pull: ## Pull schema from database
	@echo "$(BLUE)Pulling schema from database...$(NC)"
	bun run db:pull

## Testing
test-setup: ## Set up test environment and database
	@echo "$(BLUE)Setting up test environment...$(NC)"
	@if [ ! -f .env.test ]; then \
		echo "$(YELLOW)Creating .env.test file...$(NC)"; \
		cp .env.local .env.test; \
		echo "NODE_ENV=test" >> .env.test; \
		echo "PLAYWRIGHT=true" >> .env.test; \
	fi
	@echo "$(GREEN)Test environment ready!$(NC)"

test-stagehand: test-setup ## Run Stagehand tests (AI-powered E2E tests)
	@echo "$(BLUE)Running Stagehand tests...$(NC)"
	bun run test:stagehand

test-playwright: test-setup ## Run Playwright tests
	@echo "$(BLUE)Running Playwright tests...$(NC)"
	bun run test:e2e

test-unit: ## Run unit tests (safe subset)
	@echo "$(BLUE)Running unit tests...$(NC)"
	bun run test:unit:safe

test-unit-all: ## Run all unit tests (including database-dependent)
	@echo "$(BLUE)Running all unit tests...$(NC)"
	bun run test:unit


test-all: test-setup test-unit test-stagehand test-playwright ## Run all tests (Stagehand + Playwright)
	@echo "$(GREEN)All tests completed!$(NC)"

test-all-quick: ## Run quick tests (safe subset only)
	@echo "$(BLUE)Running quick test suite...$(NC)"
	bun run test:all:quick

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	bun test --watch

## Code Quality
lint: ## Run ESLint
	@echo "$(BLUE)Running ESLint...$(NC)"
	bun run lint

lint-fix: ## Run ESLint with auto-fix
	@echo "$(BLUE)Running ESLint with auto-fix...$(NC)"
	bun run lint:fix

format: ## Format code with Biome
	@echo "$(BLUE)Formatting code...$(NC)"
	bun run format

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running TypeScript type check...$(NC)"
	bunx tsc --noEmit

## Pre-commit Checks
commit-check: lint type-check build test-all ## Run all checks before committing
	@echo "$(GREEN)All checks passed! Ready to commit.$(NC)"

## Deployment
deploy-check: commit-check ## Run deployment checks
	@echo "$(BLUE)Running deployment checks...$(NC)"
	@echo "$(GREEN)Deployment checks passed!$(NC)"

## Utility Commands
clean: ## Clean build artifacts and node_modules
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf .next
	rm -rf node_modules
	rm -rf dist
	rm -rf .turbo
	@echo "$(GREEN)Clean completed!$(NC)"

clean-install: clean install ## Clean and reinstall dependencies
	@echo "$(GREEN)Clean install completed!$(NC)"

logs: ## Show application logs
	@echo "$(BLUE)Showing application logs...$(NC)"
	bun run dev 2>&1 | tee -a logs/app.log

## Git Operations
git-status: ## Show git status
	@git status

commit: ## Commit changes with conventional commit message
	@echo "$(BLUE)Committing changes...$(NC)"
	git add .
	git commit -m "$(COMMIT_MSG)"
	@echo "$(GREEN)Changes committed!$(NC)"

push: ## Push changes to remote repository
	@echo "$(BLUE)Pushing changes to remote...$(NC)"
	git push
	@echo "$(GREEN)Changes pushed!$(NC)"

commit-and-push: commit push ## Commit and push changes
	@echo "$(GREEN)Commit and push completed!$(NC)"

## Neon Database Branching (for advanced testing)
neon-setup: ## Validate Neon CLI installation and API key
	@echo "$(BLUE)Validating Neon setup...$(NC)"
	@if [ -z "$(NEON_API_KEY)" ]; then \
		echo "$(RED)❌ NEON_API_KEY not found in .env.local$(NC)"; \
		echo "$(YELLOW)Please add NEON_API_KEY=your-api-key to .env.local$(NC)"; \
		echo "$(YELLOW)Get your API key at: https://console.neon.tech/app/settings/api-keys$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Neon API Key found$(NC)"
	@if ! npx neonctl --version >/dev/null 2>&1; then \
		echo "$(RED)❌ neonctl CLI not found$(NC)"; \
		echo "$(YELLOW)Installing neonctl...$(NC)"; \
		bun install; \
	fi
	@echo "$(GREEN)✅ neonctl CLI available: $$(npx neonctl --version)$(NC)"
	@echo "$(BLUE)Testing API connection...$(NC)"
	@if npx neonctl projects list --api-key "$(NEON_API_KEY)" >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Neon API connection successful$(NC)"; \
	else \
		echo "$(RED)❌ Neon API connection failed$(NC)"; \
		echo "$(YELLOW)Please verify your NEON_API_KEY$(NC)"; \
		exit 1; \
	fi

neon-validate: ## Validate Neon configuration using NeonBranchManager
	@echo "$(BLUE)Validating Neon configuration...$(NC)"
	@bun run -e "import { createNeonBranchManager } from './lib/db/neon-branch-manager.ts'; const manager = createNeonBranchManager(); await manager.validateSetup(); console.log('✅ Neon configuration valid');"

test-branch-create: neon-setup ## Create a new Neon test branch
	@echo "$(BLUE)Creating Neon test branch...$(NC)"
	@if [ -z "$(NEON_PROJECT_ID)" ]; then \
		echo "$(RED)❌ Could not detect Neon project ID from DATABASE_URL$(NC)"; \
		echo "$(YELLOW)Please ensure DATABASE_URL is set correctly in .env.local$(NC)"; \
		exit 1; \
	fi
	@BRANCH_NAME="test-$$(git branch --show-current | sed 's/[^a-zA-Z0-9-]/-/g')-$$(date +%Y%m%d-%H%M%S)"; \
	echo "$(BLUE)Creating branch: $$BRANCH_NAME$(NC)"; \
	npx neonctl branches create "$$BRANCH_NAME" \
		--project-id "$(NEON_PROJECT_ID)" \
		--api-key "$(NEON_API_KEY)" && \
	echo "$(GREEN)✅ Test branch created: $$BRANCH_NAME$(NC)" && \
	echo "$(YELLOW)💡 To get connection string: make test-branch-connection BRANCH=$$BRANCH_NAME$(NC)"

test-branch-list: neon-setup ## List all branches in the project
	@echo "$(BLUE)Listing Neon branches...$(NC)"
	@if [ -z "$(NEON_PROJECT_ID)" ]; then \
		echo "$(RED)❌ Could not detect Neon project ID$(NC)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Project ID: $(NEON_PROJECT_ID)$(NC)"
	@npx neonctl branches list \
		--project-id "$(NEON_PROJECT_ID)" \
		--api-key "$(NEON_API_KEY)" \
		--output table

test-branch-status: neon-setup ## Show status of test branches
	@echo "$(BLUE)Checking test branch status...$(NC)"
	@if [ -z "$(NEON_PROJECT_ID)" ]; then \
		echo "$(RED)❌ Could not detect Neon project ID$(NC)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Test branches in project $(NEON_PROJECT_ID):$(NC)"
	@npx neonctl branches list \
		--project-id "$(NEON_PROJECT_ID)" \
		--api-key "$(NEON_API_KEY)" \
		--output json | \
	bunx jq -r '.branches[] | select(.name | test("test")) | "🌿 \(.name) - \(.current_state) - Created: \(.created_at | split("T")[0])"' || \
	echo "$(YELLOW)No test branches found$(NC)"

test-branch-cleanup: neon-setup ## Clean up old test branches (older than 1 day)
	@echo "$(BLUE)Cleaning up old test branches using NeonBranchManager...$(NC)"
	@bun run scripts/cleanup-neon-test-branches.ts

test-branch-cleanup-dry: neon-setup ## Show what test branches would be cleaned up (dry run)
	@echo "$(BLUE)Dry run - showing test branches that would be cleaned up...$(NC)"
	@bun run scripts/cleanup-neon-test-branches.ts --dry-run

test-branch-cleanup-ci: neon-setup ## Clean up CI test branches only
	@echo "$(BLUE)Cleaning up CI test branches...$(NC)"
	@bun run scripts/cleanup-neon-test-branches.ts --ci-only

test-branch-connection: neon-setup ## Get connection string for a test branch (usage: make test-branch-connection BRANCH=branch-name)
	@if [ -z "$(BRANCH)" ]; then \
		echo "$(RED)❌ Please specify BRANCH name: make test-branch-connection BRANCH=your-branch-name$(NC)"; \
		exit 1; \
	fi
	@if [ -z "$(NEON_PROJECT_ID)" ]; then \
		echo "$(RED)❌ Could not detect Neon project ID$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Getting connection string for branch: $(BRANCH)$(NC)"
	@CONNECTION_STRING=$$(npx neonctl connection-string "$(BRANCH)" \
		--project-id "$(NEON_PROJECT_ID)" \
		--api-key "$(NEON_API_KEY)" 2>/dev/null); \
	if [ $$? -eq 0 ]; then \
		echo "$(GREEN)✅ Connection string:$(NC)"; \
		echo "$$CONNECTION_STRING"; \
		echo ""; \
		echo "$(YELLOW)💡 To use this in tests, set DATABASE_URL_TEST=$$CONNECTION_STRING$(NC)"; \
	else \
		echo "$(RED)❌ Failed to get connection string for branch: $(BRANCH)$(NC)"; \
		echo "$(YELLOW)💡 Check if branch exists with: make test-branch-list$(NC)"; \
		exit 1; \
	fi

neon-ci-setup: neon-setup ## Set up test branch for CI/CD pipeline
	@echo "$(BLUE)Setting up CI/CD test branch using setup script...$(NC)"
	@bun run scripts/setup-neon-test-branch.ts --ci-mode --write-env

neon-ci-cleanup: ## Clean up CI test branches
	@echo "$(BLUE)Cleaning up CI test branches using cleanup script...$(NC)"
	@bun run scripts/cleanup-neon-test-branches.ts --ci-only --max-age 1
	@rm -f .ci-database-url .env.ci

test-with-neon-branch: ## Run tests with a fresh Neon test branch
	@echo "$(BLUE)Running tests with fresh Neon test branch...$(NC)"
	@BRANCH_INFO=$$(bun run scripts/setup-neon-test-branch.ts --write-env 2>/dev/null | tail -2); \
	TEST_CONNECTION_STRING=$$(echo "$$BRANCH_INFO" | grep "CONNECTION_STRING=" | cut -d'=' -f2-); \
	TEST_BRANCH_NAME=$$(echo "$$BRANCH_INFO" | grep "BRANCH_NAME=" | cut -d'=' -f2-); \
	if [ -n "$$TEST_CONNECTION_STRING" ] && [ -n "$$TEST_BRANCH_NAME" ]; then \
		echo "$(GREEN)✅ Test branch created: $$TEST_BRANCH_NAME$(NC)"; \
		echo "$(BLUE)Running tests with test database...$(NC)"; \
		DATABASE_URL_TEST="$$TEST_CONNECTION_STRING" bun run test:unit || TEST_RESULT=$$?; \
		echo "$(BLUE)Cleaning up test branch...$(NC)"; \
		bun run scripts/cleanup-neon-test-branches.ts --pattern "$$TEST_BRANCH_NAME" --max-age 0 >/dev/null 2>&1 || \
		echo "$(YELLOW)⚠️  Failed to delete test branch$(NC)"; \
		if [ "$$TEST_RESULT" -eq 0 ]; then \
			echo "$(GREEN)✅ Tests passed with Neon test branch$(NC)"; \
		else \
			echo "$(RED)❌ Tests failed$(NC)"; \
			exit $$TEST_RESULT; \
		fi; \
	else \
		echo "$(RED)❌ Failed to create test branch$(NC)"; \
		exit 1; \
	fi

neon-branch-manager-test: ## Test NeonBranchManager functionality
	@echo "$(BLUE)Testing NeonBranchManager...$(NC)"
	@bun run -e "import { createNeonBranchManager } from './lib/db/neon-branch-manager.ts'; \
		const manager = createNeonBranchManager(); \
		console.log('🔍 Validating setup...'); \
		await manager.validateSetup(); \
		console.log('📋 Listing projects...'); \
		const projects = await manager.listProjects(); \
		console.log('✅ Found', projects.length, 'projects'); \
		console.log('📋 Listing branches...'); \
		const branches = await manager.listBranches(); \
		console.log('✅ Found', branches.length, 'branches'); \
		console.log('🧪 NeonBranchManager test completed successfully');"

## Development Workflow
workflow-new-feature: ## Start new feature development
	@echo "$(BLUE)Starting new feature development workflow...$(NC)"
	@read -p "Enter feature name: " FEATURE_NAME; \
	git checkout -b "feat/$$FEATURE_NAME" && \
	echo "$(GREEN)Feature branch 'feat/$$FEATURE_NAME' created!$(NC)"

workflow-test-feature: test-all ## Test current feature
	@echo "$(GREEN)Feature testing completed!$(NC)"

workflow-finish-feature: commit-check ## Finish feature development
	@echo "$(BLUE)Finishing feature development...$(NC)"
	@CURRENT_BRANCH=$$(git branch --show-current); \
	git checkout main && \
	git merge "$$CURRENT_BRANCH" && \
	git branch -d "$$CURRENT_BRANCH" && \
	echo "$(GREEN)Feature '$$CURRENT_BRANCH' merged and cleaned up!$(NC)"

## Documentation
docs-serve: ## Serve documentation locally
	@echo "$(BLUE)Serving documentation...$(NC)"
	@echo "Documentation available in docs/ folder"

## Environment Management
env-check: ## Check environment variables
	@echo "$(BLUE)Checking environment variables...$(NC)"
	@echo "NODE_ENV: $(NODE_ENV)"
	@echo "Database URL: $(if $(DATABASE_URL),✅ Set,❌ Not set)"
	@echo "OpenAI API Key: $(if $(shell grep OPENAI_API_KEY .env.local 2>/dev/null),✅ Set,❌ Not set)"
	@echo "Neon API Key: $(if $(NEON_API_KEY),✅ Set,❌ Not set)"
	@echo "Neon Project ID: $(if $(NEON_PROJECT_ID),✅ $(NEON_PROJECT_ID),❌ Not detected)"

env-template: ## Create environment template
	@echo "$(BLUE)Creating environment template...$(NC)"
	@echo "# Copy this to .env.local and fill in your values" > .env.template
	@echo "OPENAI_API_KEY=your-openai-api-key-here" >> .env.template
	@echo "DATABASE_URL=your-database-url-here" >> .env.template
	@echo "NEON_API_KEY=your-neon-api-key-here" >> .env.template
	@echo "AUTH_SECRET=your-auth-secret-here" >> .env.template
	@echo "$(GREEN)Environment template created: .env.template$(NC)"

## Quick Start
quickstart: install db-setup ## Quick start for new developers
	@echo "$(GREEN)🚀 Quick start completed!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Copy .env.example to .env.local and configure"
	@echo "  2. Run 'make dev' to start development server"
	@echo "  3. Visit http://localhost:3000"

## Health Check
health-check: ## Run system health check
	@echo "$(BLUE)Running system health check...$(NC)"
	@echo "Bun version: $$(bun --version)"
	@echo "Node.js version: $$(node --version)"
	@echo "Git status: $$(git status --porcelain | wc -l) files changed"
	@echo "Database connection: $(if $(DATABASE_URL),✅ Configured,❌ Not configured)"
	@echo "$(GREEN)Health check completed!$(NC)"

## Performance
perf-analyze: ## Analyze bundle performance
	@echo "$(BLUE)Analyzing bundle performance...$(NC)"
	ANALYZE=true bun run build

perf-lighthouse: ## Run Lighthouse performance audit
	@echo "$(BLUE)Running Lighthouse audit...$(NC)"
	bunx lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html

## Troubleshooting
debug-build: ## Debug build issues
	@echo "$(BLUE)Debugging build...$(NC)"
	DEBUG=1 bun run build

debug-test: ## Debug test issues
	@echo "$(BLUE)Debugging tests...$(NC)"
	DEBUG=1 PLAYWRIGHT=true bun run playwright test --debug

troubleshoot: ## Run troubleshooting diagnostics
	@echo "$(BLUE)Running troubleshooting diagnostics...$(NC)"
	@echo "=== System Info ==="
	@make health-check
	@echo ""
	@echo "=== Environment ==="
	@make env-check
	@echo ""
	@echo "=== Git Status ==="
	@make git-status

## Port Management
kill-all-dev-ports: ## Kill processes on common dev ports (3000, 3001, 5173, 8080)
	@echo "$(YELLOW)Killing processes on common development ports...$(NC)"
	@for port in 3000 3001 5173 8080; do \
		PID=$$(lsof -t -i:$$port 2>/dev/null); \
		if [ ! -z "$$PID" ]; then \
			echo "$(RED)Killing process $$PID on port $$port...$(NC)"; \
			kill -9 $$PID; \
		else \
			echo "$(GREEN)No process on port $$port$(NC)"; \
		fi; \
	done
	@echo "$(GREEN)Port cleanup completed!$(NC)"

show-ports: ## Show processes running on common dev ports
	@echo "$(BLUE)Checking common development ports...$(NC)"
	@for port in 3000 3001 5173 8080; do \
		PID=$$(lsof -t -i:$$port 2>/dev/null); \
		if [ ! -z "$$PID" ]; then \
			PROCESS=$$(ps -p $$PID -o comm= 2>/dev/null); \
			echo "Port $$port: $(RED)$$PROCESS (PID: $$PID)$(NC)"; \
		else \
			echo "Port $$port: $(GREEN)Available$(NC)"; \
		fi; \
	done