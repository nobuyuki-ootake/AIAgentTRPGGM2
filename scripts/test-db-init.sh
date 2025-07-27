#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Test Database Initialization
# ===================================================================
# 
# Initializes test databases with:
# - Clean database schema
# - Test-specific configurations
# - Isolated test data
# ===================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[TEST-DB-INIT]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[TEST-DB-INIT]${NC} $1" >&2
}

init_proxy_server_test_db() {
    log_info "Initializing proxy-server test database..."
    
    cd "$PROJECT_ROOT/apps/proxy-server"
    
    # Create test data directory
    mkdir -p data/test
    
    # Set test environment
    export NODE_ENV=test
    export DATABASE_URL="data/test/trpg-test.db"
    
    # Remove existing test database
    rm -f data/test/trpg-test.db*
    
    # Run migrations for test database
    log_info "Running database migrations for test environment..."
    npm run migrate:up || {
        log_info "Migrations failed, attempting to create database manually..."
        
        # Create basic database structure if migrations fail
        sqlite3 data/test/trpg-test.db << 'EOF'
-- Basic table structure for testing
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'planned',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Test data indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_characters_campaign_id ON characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sessions_campaign_id ON sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_locations_campaign_id ON locations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_milestones_campaign_id ON milestones(campaign_id);
EOF
    }
    
    log_success "Proxy-server test database initialized"
}

init_mastra_test_db() {
    log_info "Initializing Mastra test database..."
    
    cd "$PROJECT_ROOT/apps/proxy-server"
    
    # Create Mastra test database if it doesn't exist
    export MASTRA_DATABASE_URL="mastra-trpg-test.db"
    
    # Remove existing Mastra test database
    rm -f mastra-trpg-test.db*
    
    # Mastra will auto-initialize its database on first use
    log_success "Mastra test database initialized"
}

main() {
    log_info "Initializing test databases..."
    
    cd "$PROJECT_ROOT"
    
    # Initialize proxy-server test database
    init_proxy_server_test_db
    
    # Initialize Mastra test database
    init_mastra_test_db
    
    log_success "All test databases initialized successfully"
}

main "$@"