#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Test Environment Teardown
# ===================================================================
# 
# Cleans up test environment:
# - Stops test services
# - Cleans test databases
# - Removes temporary files
# - Stops Docker containers (if any)
# ===================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[TEST-ENV-TEARDOWN]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[TEST-ENV-TEARDOWN]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[TEST-ENV-TEARDOWN]${NC} $1" >&2
}

main() {
    log_info "Tearing down test environment..."
    
    cd "$PROJECT_ROOT"
    
    # Stop any running development servers
    log_info "Stopping development servers..."
    pkill -f "start-dev.sh" || true
    pkill -f "vite" || true
    pkill -f "nodemon" || true
    
    # Stop Docker containers if running
    log_info "Stopping Docker containers..."
    docker-compose down --remove-orphans || true
    
    # Stop any remaining Node.js processes on test ports
    log_info "Stopping processes on test ports..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5000 | xargs kill -9 2>/dev/null || true
    lsof -ti:6000 | xargs kill -9 2>/dev/null || true
    
    # Clean test database files
    log_info "Cleaning test databases..."
    rm -f apps/proxy-server/data/test/*.db* || true
    rm -f apps/proxy-server/data/test/*.log || true
    
    # Clean temporary test files
    log_info "Cleaning temporary test files..."
    rm -rf apps/frontend/test-results/* || true
    rm -rf apps/frontend/playwright-report/* || true
    rm -rf apps/proxy-server/coverage/* || true
    
    # Clean cache files
    log_info "Cleaning cache files..."
    rm -rf .turbo/cache/* || true
    rm -rf apps/frontend/.vite/cache/* || true
    
    # Clean log files older than 7 days
    log_info "Cleaning old log files..."
    find test-logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    find test-artifacts -name "*" -mtime +7 -delete 2>/dev/null || true
    
    log_success "Test environment teardown completed"
}

main "$@"