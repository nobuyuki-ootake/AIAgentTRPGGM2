#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Test Database Cleanup
# ===================================================================
# 
# Cleans test databases:
# - Removes test data
# - Resets database state
# - Prepares for fresh test runs
# ===================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[TEST-DB-CLEAN]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[TEST-DB-CLEAN]${NC} $1" >&2
}

clean_proxy_server_test_db() {
    log_info "Cleaning proxy-server test database..."
    
    cd "$PROJECT_ROOT/apps/proxy-server"
    
    export NODE_ENV=test
    export DATABASE_URL="data/test/trpg-test.db"
    
    if [[ -f "data/test/trpg-test.db" ]]; then
        # Clean all test data but keep schema
        sqlite3 data/test/trpg-test.db << 'EOF'
-- Clean all data tables
DELETE FROM milestones;
DELETE FROM sessions;
DELETE FROM locations;
DELETE FROM characters;
DELETE FROM campaigns;

-- Reset any auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('campaigns', 'characters', 'sessions', 'locations', 'milestones');

-- Vacuum database to reclaim space
VACUUM;
EOF
        log_success "Proxy-server test database cleaned"
    else
        log_info "Test database does not exist, skipping cleanup"
    fi
}

clean_mastra_test_db() {
    log_info "Cleaning Mastra test database..."
    
    cd "$PROJECT_ROOT/apps/proxy-server"
    
    # Remove Mastra test database files
    rm -f mastra-trpg-test.db*
    
    log_success "Mastra test database cleaned"
}

clean_test_artifacts() {
    log_info "Cleaning test artifacts..."
    
    cd "$PROJECT_ROOT"
    
    # Clean frontend test artifacts
    rm -rf apps/frontend/test-results/* || true
    rm -rf apps/frontend/playwright-report/* || true
    rm -rf apps/frontend/coverage/* || true
    
    # Clean proxy-server test artifacts
    rm -rf apps/proxy-server/coverage/* || true
    rm -rf apps/proxy-server/test-results/* || true
    
    # Clean root test artifacts
    rm -rf test-logs/* || true
    rm -rf test-artifacts/* || true
    rm -rf coverage/* || true
    
    log_success "Test artifacts cleaned"
}

main() {
    log_info "Cleaning test databases and artifacts..."
    
    cd "$PROJECT_ROOT"
    
    # Clean proxy-server test database
    clean_proxy_server_test_db
    
    # Clean Mastra test database
    clean_mastra_test_db
    
    # Clean test artifacts
    clean_test_artifacts
    
    log_success "All test databases and artifacts cleaned successfully"
}

main "$@"