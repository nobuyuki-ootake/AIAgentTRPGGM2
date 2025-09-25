#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Test Teardown
# ===================================================================
# 
# Main test teardown orchestrator that calls all cleanup components:
# - Environment teardown
# - Database cleanup
# - Temporary file removal
# - Process cleanup
# ===================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[TEST-TEARDOWN]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[TEST-TEARDOWN]${NC} $1" >&2
}

main() {
    log_info "Starting comprehensive test teardown..."
    
    # Clean test databases
    "$SCRIPT_DIR/test-db-clean.sh"
    
    # Teardown test environment
    "$SCRIPT_DIR/test-env-teardown.sh"
    
    log_success "Test teardown completed successfully"
}

main "$@"