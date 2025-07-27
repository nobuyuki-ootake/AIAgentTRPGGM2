#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Test Database Seeding
# ===================================================================
# 
# Seeds test databases with:
# - Consistent test data
# - Known test scenarios
# - Predictable test state
# ===================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[TEST-DB-SEED]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[TEST-DB-SEED]${NC} $1" >&2
}

seed_proxy_server_test_db() {
    log_info "Seeding proxy-server test database..."
    
    cd "$PROJECT_ROOT/apps/proxy-server"
    
    export NODE_ENV=test
    export DATABASE_URL="data/test/trpg-test.db"
    
    # Insert test data using SQLite
    sqlite3 data/test/trpg-test.db << 'EOF'
-- Test Campaign
INSERT OR REPLACE INTO campaigns (id, name, description, created_at, updated_at) VALUES 
('test-campaign-1', 'Test Campaign', 'A test campaign for automated testing', datetime('now'), datetime('now'));

-- Test Characters
INSERT OR REPLACE INTO characters (id, campaign_id, name, type, created_at, updated_at) VALUES 
('test-character-pc-1', 'test-campaign-1', 'Test Hero', 'PC', datetime('now'), datetime('now')),
('test-character-npc-1', 'test-campaign-1', 'Test Guide', 'NPC', datetime('now'), datetime('now')),
('test-character-enemy-1', 'test-campaign-1', 'Test Monster', 'Enemy', datetime('now'), datetime('now'));

-- Test Sessions
INSERT OR REPLACE INTO sessions (id, campaign_id, name, status, created_at, updated_at) VALUES 
('test-session-1', 'test-campaign-1', 'Test Session 1', 'planned', datetime('now'), datetime('now')),
('test-session-2', 'test-campaign-1', 'Test Session 2', 'active', datetime('now'), datetime('now'));

-- Test Locations
INSERT OR REPLACE INTO locations (id, campaign_id, name, description, created_at, updated_at) VALUES 
('test-location-1', 'test-campaign-1', 'Test Village', 'A peaceful test village', datetime('now'), datetime('now')),
('test-location-2', 'test-campaign-1', 'Test Dungeon', 'A dangerous test dungeon', datetime('now'), datetime('now'));

-- Test Milestones
INSERT OR REPLACE INTO milestones (id, campaign_id, title, description, status, created_at, updated_at) VALUES 
('test-milestone-1', 'test-campaign-1', 'Complete Tutorial', 'Finish the tutorial quest', 'pending', datetime('now'), datetime('now')),
('test-milestone-2', 'test-campaign-1', 'Reach Level 5', 'Character reaches level 5', 'in_progress', datetime('now'), datetime('now'));
EOF
    
    log_success "Proxy-server test database seeded"
}

seed_additional_test_data() {
    log_info "Seeding additional test data..."
    
    cd "$PROJECT_ROOT/apps/proxy-server"
    
    export NODE_ENV=test
    export DATABASE_URL="data/test/trpg-test.db"
    
    # Add more complex test scenarios
    sqlite3 data/test/trpg-test.db << 'EOF'
-- Additional test campaigns for different scenarios
INSERT OR REPLACE INTO campaigns (id, name, description, created_at, updated_at) VALUES 
('test-campaign-empty', 'Empty Campaign', 'Campaign with no content for testing edge cases', datetime('now'), datetime('now')),
('test-campaign-large', 'Large Campaign', 'Campaign with lots of content for performance testing', datetime('now'), datetime('now'));

-- Performance testing data (large campaign)
INSERT OR REPLACE INTO characters (id, campaign_id, name, type, created_at, updated_at)
SELECT 
    'test-char-' || seq,
    'test-campaign-large',
    'Character ' || seq,
    CASE WHEN seq % 3 = 0 THEN 'PC' WHEN seq % 3 = 1 THEN 'NPC' ELSE 'Enemy' END,
    datetime('now'),
    datetime('now')
FROM (
    WITH RECURSIVE seq(seq) AS (
        SELECT 1
        UNION ALL
        SELECT seq + 1 FROM seq WHERE seq < 100
    )
    SELECT seq FROM seq
);

-- Performance testing locations
INSERT OR REPLACE INTO locations (id, campaign_id, name, description, created_at, updated_at)
SELECT 
    'test-loc-' || seq,
    'test-campaign-large',
    'Location ' || seq,
    'Test location number ' || seq,
    datetime('now'),
    datetime('now')
FROM (
    WITH RECURSIVE seq(seq) AS (
        SELECT 1
        UNION ALL
        SELECT seq + 1 FROM seq WHERE seq < 50
    )
    SELECT seq FROM seq
);
EOF
    
    log_success "Additional test data seeded"
}

main() {
    log_info "Seeding test databases..."
    
    cd "$PROJECT_ROOT"
    
    # Seed proxy-server test database
    seed_proxy_server_test_db
    
    # Seed additional test data
    seed_additional_test_data
    
    log_success "All test databases seeded successfully"
}

main "$@"