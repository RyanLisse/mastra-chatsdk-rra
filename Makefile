# RoboRail Assistant Makefile
# Built with Bun for improved performance

.PHONY: help install dev build test clean lint format setup db-setup db-migrate db-studio test-setup test-all test-stagehand test-playwright commit-check deploy-check kill-port kill-all-dev-ports show-ports dev-clean

# Default target
.DEFAULT_GOAL := help

# Variables
NODE_ENV ?= development
DATABASE_URL ?= $(shell grep "^DATABASE_URL" .env.local 2>/dev/null | cut -d'=' -f2-)
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
	PLAYWRIGHT=true bun test tests/stagehand/

test-playwright: test-setup ## Run Playwright tests
	@echo "$(BLUE)Running Playwright tests...$(NC)"
	PLAYWRIGHT=true bun run playwright test

test-unit: ## Run unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	bun test --exclude tests/stagehand/ --exclude tests/e2e/ --exclude tests/routes/

test-all: test-setup test-stagehand test-playwright ## Run all tests (Stagehand + Playwright)
	@echo "$(GREEN)All tests completed!$(NC)"

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
test-branch-create: ## Create a new Neon test branch
	@echo "$(BLUE)Creating Neon test branch...$(NC)"
	@BRANCH_NAME="test/$$(git branch --show-current)-$$(date +%Y%m%d-%H%M%S)"; \
	neonctl branches create --name "$$BRANCH_NAME" && \
	echo "Test branch created: $$BRANCH_NAME"

test-branch-cleanup: ## Clean up old test branches
	@echo "$(BLUE)Cleaning up old test branches...$(NC)"
	@neonctl branches list --output json | bunx jq -r '.[] | select(.name | startswith("test/")) | select(.created_at < (now - 86400)) | .name' | xargs -I {} neonctl branches delete --name {}

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

env-template: ## Create environment template
	@echo "$(BLUE)Creating environment template...$(NC)"
	@echo "# Copy this to .env.local and fill in your values" > .env.template
	@echo "OPENAI_API_KEY=your-openai-api-key-here" >> .env.template
	@echo "DATABASE_URL=your-database-url-here" >> .env.template
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