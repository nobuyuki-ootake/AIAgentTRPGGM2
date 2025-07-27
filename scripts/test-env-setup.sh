#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Test Environment Setup
# ===================================================================
# 
# Sets up isolated test environment with:
# - Test-specific environment variables
# - Test database initialization
# - Docker containers for testing (if needed)
# - Mock services configuration
# ===================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[TEST-ENV-SETUP]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[TEST-ENV-SETUP]${NC} $1" >&2
}

main() {
    log_info "Setting up test environment..."
    
    cd "$PROJECT_ROOT"
    
    # Load test environment variables
    if [[ -f .env.test ]]; then
        log_info "Loading test environment variables..."
        export $(grep -v '^#' .env.test | xargs)
    fi
    
    # Create test directories
    log_info "Creating test directories..."
    mkdir -p test-logs
    mkdir -p test-artifacts
    mkdir -p coverage
    
    # Setup test database directory
    mkdir -p apps/proxy-server/data/test
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]] || [[ ! -d "apps/frontend/node_modules" ]] || [[ ! -d "apps/proxy-server/node_modules" ]]; then
        log_info "Installing dependencies..."
        pnpm install
    fi
    
    # Build types package
    log_info "Building shared types..."
    cd packages/types
    pnpm build || true  # Don't fail if already built
    
    cd "$PROJECT_ROOT"
    
    # Build applications for testing
    log_info "Building applications for testing..."
    pnpm build:typescript || true
    
    # Setup proxy-server test environment
    log_info "Setting up proxy-server test environment..."
    cd apps/proxy-server
    
    # Create test database
    if [[ ! -f "data/test/trpg-test.db" ]]; then
        log_info "Creating test database..."
        NODE_ENV=test npm run migrate:up || true
    fi
    
    cd "$PROJECT_ROOT"
    
    # Setup frontend test environment
    log_info "Setting up frontend test environment..."
    cd apps/frontend
    
    # Install Playwright browsers if needed
    if [[ ! -d "$HOME/.cache/ms-playwright" ]]; then
        log_info "Installing Playwright browsers..."
        pnpm playwright install chromium firefox webkit
    fi
    
    cd "$PROJECT_ROOT"
    
    log_success "Test environment setup completed"
}

main "$@"