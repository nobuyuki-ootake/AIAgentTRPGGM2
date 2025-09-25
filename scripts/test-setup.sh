#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Test Setup
# ===================================================================
# 
# Main test setup orchestrator that calls all setup components:
# - Environment setup
# - Database initialization
# - Dependency installation
# - Test data seeding
# ===================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[TEST-SETUP]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[TEST-SETUP]${NC} $1" >&2
}

main() {
    log_info "Starting comprehensive test setup..."
    
    # Setup test environment
    "$SCRIPT_DIR/test-env-setup.sh"
    
    # Initialize test databases
    "$SCRIPT_DIR/test-db-init.sh"
    
    # Seed test databases with data
    "$SCRIPT_DIR/test-db-seed.sh"
    
    log_success "Test setup completed successfully"
}

main "$@"