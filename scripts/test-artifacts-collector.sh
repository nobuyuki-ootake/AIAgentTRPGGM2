#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Test Artifacts Collector
# ===================================================================
# 
# Collects and organizes test artifacts:
# - Screenshots and videos from E2E tests
# - Coverage reports
# - Test logs
# - Performance data
# - CI/CD outputs
# ===================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly ARTIFACTS_DIR="$PROJECT_ROOT/test-artifacts"

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[ARTIFACTS-COLLECTOR]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[ARTIFACTS-COLLECTOR]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[ARTIFACTS-COLLECTOR]${NC} $1" >&2
}

setup_artifacts_directory() {
    log_info "Setting up artifacts directory..."
    
    mkdir -p "$ARTIFACTS_DIR"/{logs,coverage,screenshots,videos,reports,ci-outputs,performance}
    
    # Create index file
    cat > "$ARTIFACTS_DIR/index.txt" << EOF
AI Agent TRPG GM - Test Artifacts Index
Generated: $(date)
======================================

Directory Structure:
- logs/           : Test execution logs
- coverage/       : Coverage reports and data
- screenshots/    : E2E test screenshots
- videos/         : E2E test videos
- reports/        : Generated test reports
- ci-outputs/     : CI/CD compatible outputs
- performance/    : Performance metrics and data

EOF
}

collect_test_logs() {
    log_info "Collecting test logs..."
    
    local logs_dir="$ARTIFACTS_DIR/logs"
    local source_dir="$PROJECT_ROOT/test-logs"
    
    if [[ -d "$source_dir" ]]; then
        # Copy all log files
        cp -r "$source_dir"/* "$logs_dir/" 2>/dev/null || true
        
        # Create log index
        cat > "$logs_dir/index.txt" << EOF
Test Logs Index
===============

$(ls -la "$logs_dir" | grep -v "^total" | grep -v "index.txt")

Log File Descriptions:
- unit-*.log          : Unit test execution logs
- integration-*.log   : Integration test execution logs
- e2e-*.log          : End-to-end test execution logs
- smoke-*.log        : Smoke test execution logs
- performance-*.log  : Performance test execution logs

EOF
        
        log_success "Test logs collected"
    else
        log_warning "No test logs directory found"
        echo "No test logs found" > "$logs_dir/no-logs.txt"
    fi
}

collect_coverage_artifacts() {
    log_info "Collecting coverage artifacts..."
    
    local coverage_dir="$ARTIFACTS_DIR/coverage"
    local source_dir="$PROJECT_ROOT/coverage"
    
    if [[ -d "$source_dir" ]]; then
        # Copy coverage data
        cp -r "$source_dir"/* "$coverage_dir/" 2>/dev/null || true
        
        # Create coverage index
        cat > "$coverage_dir/index.txt" << EOF
Coverage Artifacts Index
========================

$(find "$coverage_dir" -type f -name "*.html" -o -name "*.json" -o -name "*.info" | sort)

Coverage File Types:
- *.html     : HTML coverage reports
- *.json     : JSON coverage data
- *.info     : LCOV coverage files
- reports/   : Generated coverage reports

EOF
        
        log_success "Coverage artifacts collected"
    else
        log_warning "No coverage directory found"
        echo "No coverage data found" > "$coverage_dir/no-coverage.txt"
    fi
}

collect_e2e_artifacts() {
    log_info "Collecting E2E test artifacts..."
    
    local screenshots_dir="$ARTIFACTS_DIR/screenshots"
    local videos_dir="$ARTIFACTS_DIR/videos"
    local e2e_dir="$PROJECT_ROOT/apps/frontend"
    
    # Collect screenshots
    if [[ -d "$e2e_dir/test-results" ]]; then
        find "$e2e_dir/test-results" -name "*.png" -exec cp {} "$screenshots_dir/" \; 2>/dev/null || true
        
        # Create screenshot index
        local screenshot_count=$(ls -1 "$screenshots_dir"/*.png 2>/dev/null | wc -l)
        cat > "$screenshots_dir/index.txt" << EOF
E2E Screenshots Index
====================

Total Screenshots: $screenshot_count

$(ls -la "$screenshots_dir" | grep ".png" | awk '{print $9, $5, $6, $7, $8}')

Screenshot Types:
- *-actual.png    : Actual test screenshots
- *-expected.png  : Expected screenshots
- *-diff.png      : Visual difference screenshots

EOF
        
        log_success "Screenshots collected: $screenshot_count files"
    else
        log_warning "No E2E test results directory found"
        echo "No screenshots found" > "$screenshots_dir/no-screenshots.txt"
    fi
    
    # Collect videos
    if [[ -d "$e2e_dir/test-results" ]]; then
        find "$e2e_dir/test-results" -name "*.webm" -exec cp {} "$videos_dir/" \; 2>/dev/null || true
        
        # Create video index
        local video_count=$(ls -1 "$videos_dir"/*.webm 2>/dev/null | wc -l)
        cat > "$videos_dir/index.txt" << EOF
E2E Videos Index
===============

Total Videos: $video_count

$(ls -la "$videos_dir" | grep ".webm" | awk '{print $9, $5, $6, $7, $8}')

Video Types:
- *.webm     : Test execution recordings

EOF
        
        log_success "Videos collected: $video_count files"
    else
        echo "No videos found" > "$videos_dir/no-videos.txt"
    fi
    
    # Collect Playwright reports
    if [[ -d "$e2e_dir/playwright-report" ]]; then
        cp -r "$e2e_dir/playwright-report" "$ARTIFACTS_DIR/reports/playwright-report" 2>/dev/null || true
        log_success "Playwright reports collected"
    fi
}

collect_performance_data() {
    log_info "Collecting performance data..."
    
    local perf_dir="$ARTIFACTS_DIR/performance"
    
    # Collect Jest performance data
    find "$PROJECT_ROOT" -name "*.perf.json" -exec cp {} "$perf_dir/" \; 2>/dev/null || true
    
    # Collect system performance data
    if command -v top &> /dev/null; then
        top -bn1 > "$perf_dir/system-snapshot.txt" 2>/dev/null || true
    fi
    
    if command -v free &> /dev/null; then
        free -h > "$perf_dir/memory-usage.txt" 2>/dev/null || true
    fi
    
    if command -v df &> /dev/null; then
        df -h > "$perf_dir/disk-usage.txt" 2>/dev/null || true
    fi
    
    # Create performance index
    cat > "$perf_dir/index.txt" << EOF
Performance Data Index
=====================

$(ls -la "$perf_dir" | grep -v "^total" | grep -v "index.txt")

Performance Files:
- *.perf.json        : Jest performance data
- system-snapshot.txt: System state during tests
- memory-usage.txt   : Memory usage snapshot
- disk-usage.txt     : Disk usage snapshot

EOF
    
    log_success "Performance data collected"
}

collect_ci_outputs() {
    log_info "Collecting CI/CD outputs..."
    
    local ci_dir="$ARTIFACTS_DIR/ci-outputs"
    
    # Collect JUnit XML files
    find "$PROJECT_ROOT" -name "*junit*.xml" -exec cp {} "$ci_dir/" \; 2>/dev/null || true
    
    # Collect coverage badges and CI data
    if [[ -d "$PROJECT_ROOT/coverage/reports" ]]; then
        cp "$PROJECT_ROOT/coverage/reports"/*.json "$ci_dir/" 2>/dev/null || true
        cp "$PROJECT_ROOT/coverage/reports"/*.xml "$ci_dir/" 2>/dev/null || true
        cp "$PROJECT_ROOT/coverage/reports"/*.txt "$ci_dir/" 2>/dev/null || true
    fi
    
    # Create CI outputs index
    cat > "$ci_dir/index.txt" << EOF
CI/CD Outputs Index
==================

$(ls -la "$ci_dir" | grep -v "^total" | grep -v "index.txt")

CI Output Types:
- *junit*.xml    : JUnit test results
- badge-*.json   : Coverage badge data
- *.xml          : CI/CD compatible reports
- *.json         : Machine-readable data

EOF
    
    log_success "CI/CD outputs collected"
}

generate_artifacts_manifest() {
    log_info "Generating artifacts manifest..."
    
    local manifest_file="$ARTIFACTS_DIR/manifest.json"
    local timestamp=$(date -Iseconds)
    
    cat > "$manifest_file" << EOF
{
  "timestamp": "$timestamp",
  "collection_info": {
    "script_version": "1.0.0",
    "project": "AI Agent TRPG GM",
    "collection_time": "$timestamp"
  },
  "artifacts": {
    "logs": {
      "count": $(find "$ARTIFACTS_DIR/logs" -type f | wc -l),
      "size_bytes": $(du -sb "$ARTIFACTS_DIR/logs" 2>/dev/null | cut -f1 || echo "0")
    },
    "coverage": {
      "count": $(find "$ARTIFACTS_DIR/coverage" -type f | wc -l),
      "size_bytes": $(du -sb "$ARTIFACTS_DIR/coverage" 2>/dev/null | cut -f1 || echo "0")
    },
    "screenshots": {
      "count": $(find "$ARTIFACTS_DIR/screenshots" -name "*.png" | wc -l),
      "size_bytes": $(du -sb "$ARTIFACTS_DIR/screenshots" 2>/dev/null | cut -f1 || echo "0")
    },
    "videos": {
      "count": $(find "$ARTIFACTS_DIR/videos" -name "*.webm" | wc -l),
      "size_bytes": $(du -sb "$ARTIFACTS_DIR/videos" 2>/dev/null | cut -f1 || echo "0")
    },
    "reports": {
      "count": $(find "$ARTIFACTS_DIR/reports" -type f | wc -l),
      "size_bytes": $(du -sb "$ARTIFACTS_DIR/reports" 2>/dev/null | cut -f1 || echo "0")
    },
    "ci_outputs": {
      "count": $(find "$ARTIFACTS_DIR/ci-outputs" -type f | wc -l),
      "size_bytes": $(du -sb "$ARTIFACTS_DIR/ci-outputs" 2>/dev/null | cut -f1 || echo "0")
    },
    "performance": {
      "count": $(find "$ARTIFACTS_DIR/performance" -type f | wc -l),
      "size_bytes": $(du -sb "$ARTIFACTS_DIR/performance" 2>/dev/null | cut -f1 || echo "0")
    }
  },
  "total": {
    "file_count": $(find "$ARTIFACTS_DIR" -type f | wc -l),
    "total_size_bytes": $(du -sb "$ARTIFACTS_DIR" 2>/dev/null | cut -f1 || echo "0")
  }
}
EOF
    
    log_success "Artifacts manifest generated"
}

create_archive() {
    log_info "Creating artifacts archive..."
    
    local archive_name="test-artifacts-$(date +%Y%m%d-%H%M%S).tar.gz"
    local archive_path="$PROJECT_ROOT/$archive_name"
    
    cd "$PROJECT_ROOT"
    tar -czf "$archive_path" test-artifacts/ 2>/dev/null || {
        log_warning "Archive creation failed"
        return 1
    }
    
    local archive_size=$(du -h "$archive_path" | cut -f1)
    
    log_success "Archive created: $archive_name ($archive_size)"
    
    # Update manifest with archive info
    local temp_file=$(mktemp)
    jq --arg archive_name "$archive_name" \
       --arg archive_size "$archive_size" \
       '.archive = {
           "name": $archive_name,
           "size": $archive_size,
           "created": now | strftime("%Y-%m-%dT%H:%M:%SZ")
       }' "$ARTIFACTS_DIR/manifest.json" > "$temp_file" && mv "$temp_file" "$ARTIFACTS_DIR/manifest.json"
}

generate_summary() {
    log_info "Generating collection summary..."
    
    local summary_file="$ARTIFACTS_DIR/collection-summary.txt"
    
    cat > "$summary_file" << EOF
AI Agent TRPG GM - Test Artifacts Collection Summary
Generated: $(date)
===================================================

Collection Statistics:
$(jq -r '
"- Total Files: " + (.total.file_count | tostring) + "\n" +
"- Total Size: " + (.total.total_size_bytes | tostring) + " bytes\n" +
"- Logs: " + (.artifacts.logs.count | tostring) + " files\n" +
"- Screenshots: " + (.artifacts.screenshots.count | tostring) + " files\n" +
"- Videos: " + (.artifacts.videos.count | tostring) + " files\n" +
"- Coverage Files: " + (.artifacts.coverage.count | tostring) + " files\n" +
"- Reports: " + (.artifacts.reports.count | tostring) + " files\n" +
"- CI Outputs: " + (.artifacts.ci_outputs.count | tostring) + " files\n" +
"- Performance Data: " + (.artifacts.performance.count | tostring) + " files"
' "$ARTIFACTS_DIR/manifest.json")

Directory Structure:
$(tree "$ARTIFACTS_DIR" 2>/dev/null || find "$ARTIFACTS_DIR" -type d | sort)

Important Files:
- manifest.json         : Complete artifacts inventory
- collection-summary.txt: This summary file
- index.txt            : Directory overview
- */index.txt          : Category-specific indexes

EOF
    
    log_success "Collection summary generated"
}

main() {
    log_info "Starting test artifacts collection..."
    
    cd "$PROJECT_ROOT"
    
    # Setup artifacts directory
    setup_artifacts_directory
    
    # Collect artifacts from different sources
    collect_test_logs
    collect_coverage_artifacts
    collect_e2e_artifacts
    collect_performance_data
    collect_ci_outputs
    
    # Generate metadata
    generate_artifacts_manifest
    generate_summary
    
    # Create archive (optional)
    if [[ "${CREATE_ARCHIVE:-false}" == "true" ]]; then
        create_archive
    fi
    
    log_success "Test artifacts collection completed"
    log_info "Artifacts location: $ARTIFACTS_DIR"
    
    # Display summary
    echo ""
    echo "Collection Summary:"
    echo "=================="
    cat "$ARTIFACTS_DIR/collection-summary.txt"
}

main "$@"