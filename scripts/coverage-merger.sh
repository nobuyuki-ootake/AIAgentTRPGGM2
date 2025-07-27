#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Coverage Merger
# ===================================================================
# 
# Merges coverage reports from multiple packages:
# - Frontend coverage (Playwright)
# - Backend coverage (Jest)
# - Shared types coverage
# - Creates unified coverage report
# ===================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly COVERAGE_DIR="$PROJECT_ROOT/coverage"

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[COVERAGE-MERGER]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[COVERAGE-MERGER]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[COVERAGE-MERGER]${NC} $1" >&2
}

setup_coverage_directory() {
    log_info "Setting up coverage directory..."
    
    # Create coverage directories
    mkdir -p "$COVERAGE_DIR"/{raw,merged,reports}
    
    # Clean previous coverage data
    rm -rf "$COVERAGE_DIR"/raw/*
    rm -rf "$COVERAGE_DIR"/merged/*
    rm -rf "$COVERAGE_DIR"/reports/*
}

collect_proxy_server_coverage() {
    log_info "Collecting proxy-server coverage..."
    
    local proxy_coverage="$PROJECT_ROOT/apps/proxy-server/coverage"
    
    if [[ -d "$proxy_coverage" ]]; then
        # Copy proxy-server coverage
        cp -r "$proxy_coverage"/* "$COVERAGE_DIR/raw/proxy-server/" 2>/dev/null || {
            mkdir -p "$COVERAGE_DIR/raw/proxy-server"
            log_warning "No proxy-server coverage found"
        }
        
        # Copy lcov file if it exists
        if [[ -f "$proxy_coverage/lcov.info" ]]; then
            cp "$proxy_coverage/lcov.info" "$COVERAGE_DIR/raw/proxy-server-lcov.info"
        fi
    else
        log_warning "Proxy-server coverage directory not found"
        mkdir -p "$COVERAGE_DIR/raw/proxy-server"
    fi
}

collect_frontend_coverage() {
    log_info "Collecting frontend coverage..."
    
    local frontend_coverage="$PROJECT_ROOT/apps/frontend/coverage"
    
    if [[ -d "$frontend_coverage" ]]; then
        # Copy frontend coverage
        cp -r "$frontend_coverage"/* "$COVERAGE_DIR/raw/frontend/" 2>/dev/null || {
            mkdir -p "$COVERAGE_DIR/raw/frontend"
            log_warning "No frontend coverage found"
        }
        
        # Copy lcov file if it exists
        if [[ -f "$frontend_coverage/lcov.info" ]]; then
            cp "$frontend_coverage/lcov.info" "$COVERAGE_DIR/raw/frontend-lcov.info"
        fi
    else
        log_warning "Frontend coverage directory not found"
        mkdir -p "$COVERAGE_DIR/raw/frontend"
    fi
}

collect_types_coverage() {
    log_info "Collecting types package coverage..."
    
    local types_coverage="$PROJECT_ROOT/packages/types/coverage"
    
    if [[ -d "$types_coverage" ]]; then
        # Copy types coverage
        cp -r "$types_coverage"/* "$COVERAGE_DIR/raw/types/" 2>/dev/null || {
            mkdir -p "$COVERAGE_DIR/raw/types"
            log_warning "No types coverage found"
        }
        
        # Copy lcov file if it exists
        if [[ -f "$types_coverage/lcov.info" ]]; then
            cp "$types_coverage/lcov.info" "$COVERAGE_DIR/raw/types-lcov.info"
        fi
    else
        log_warning "Types coverage directory not found"
        mkdir -p "$COVERAGE_DIR/raw/types"
    fi
}

merge_lcov_files() {
    log_info "Merging LCOV files..."
    
    local lcov_files=()
    
    # Collect all LCOV files
    for file in "$COVERAGE_DIR"/raw/*-lcov.info; do
        if [[ -f "$file" ]]; then
            lcov_files+=("$file")
        fi
    done
    
    if [[ ${#lcov_files[@]} -gt 0 ]]; then
        # Check if lcov is available
        if command -v lcov &> /dev/null; then
            log_info "Using lcov to merge coverage files..."
            
            # Merge LCOV files
            lcov \
                --add-tracefile "${lcov_files[@]/#/--add-tracefile }" \
                --output-file "$COVERAGE_DIR/merged/lcov.info" \
                2>/dev/null || {
                log_warning "LCOV merge failed, creating manual merge..."
                cat "${lcov_files[@]}" > "$COVERAGE_DIR/merged/lcov.info"
            }
        else
            log_warning "LCOV not available, creating manual merge..."
            cat "${lcov_files[@]}" > "$COVERAGE_DIR/merged/lcov.info"
        fi
    else
        log_warning "No LCOV files found to merge"
        touch "$COVERAGE_DIR/merged/lcov.info"
    fi
}

generate_html_report() {
    log_info "Generating HTML coverage report..."
    
    if [[ -f "$COVERAGE_DIR/merged/lcov.info" ]] && [[ -s "$COVERAGE_DIR/merged/lcov.info" ]]; then
        if command -v genhtml &> /dev/null; then
            genhtml \
                "$COVERAGE_DIR/merged/lcov.info" \
                --output-directory "$COVERAGE_DIR/reports/html" \
                --title "AI Agent TRPG GM - Coverage Report" \
                --show-details \
                --highlight \
                --legend \
                2>/dev/null || {
                log_warning "HTML report generation failed"
            }
        else
            log_warning "genhtml not available, skipping HTML report"
        fi
    else
        log_warning "No merged coverage data available for HTML report"
    fi
}

generate_summary_report() {
    log_info "Generating coverage summary report..."
    
    local summary_file="$COVERAGE_DIR/reports/summary.txt"
    local json_file="$COVERAGE_DIR/reports/summary.json"
    
    cat > "$summary_file" << EOF
AI Agent TRPG GM - Coverage Summary Report
Generated: $(date)
===========================================

EOF
    
    # Initialize JSON structure
    cat > "$json_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "packages": {},
  "overall": {
    "lines": {"covered": 0, "total": 0, "percentage": 0},
    "functions": {"covered": 0, "total": 0, "percentage": 0},
    "branches": {"covered": 0, "total": 0, "percentage": 0},
    "statements": {"covered": 0, "total": 0, "percentage": 0}
  }
}
EOF
    
    # Process individual package coverage
    for package in proxy-server frontend types; do
        local package_dir="$COVERAGE_DIR/raw/$package"
        
        if [[ -d "$package_dir" ]]; then
            echo "Package: $package" >> "$summary_file"
            echo "-------------------" >> "$summary_file"
            
            # Try to find coverage summary files
            if [[ -f "$package_dir/coverage-summary.json" ]]; then
                # Extract summary from Jest coverage
                local coverage_data=$(cat "$package_dir/coverage-summary.json")
                echo "Coverage data found for $package" >> "$summary_file"
            elif [[ -f "$package_dir/index.html" ]]; then
                # Extract from HTML if available
                echo "HTML coverage report found for $package" >> "$summary_file"
            else
                echo "No detailed coverage data found for $package" >> "$summary_file"
            fi
            
            echo "" >> "$summary_file"
        fi
    done
    
    # Add overall summary
    echo "Overall Coverage" >> "$summary_file"
    echo "===============" >> "$summary_file"
    
    if [[ -f "$COVERAGE_DIR/merged/lcov.info" ]] && [[ -s "$COVERAGE_DIR/merged/lcov.info" ]]; then
        # Calculate basic statistics from LCOV
        local total_lines=$(grep -c "^DA:" "$COVERAGE_DIR/merged/lcov.info" 2>/dev/null || echo "0")
        local covered_lines=$(grep "^DA:" "$COVERAGE_DIR/merged/lcov.info" | grep -v ",0$" | wc -l 2>/dev/null || echo "0")
        
        if [[ $total_lines -gt 0 ]]; then
            local percentage=$((covered_lines * 100 / total_lines))
            echo "Lines: $covered_lines / $total_lines ($percentage%)" >> "$summary_file"
        else
            echo "Lines: No coverage data available" >> "$summary_file"
        fi
    else
        echo "Lines: No merged coverage data available" >> "$summary_file"
    fi
    
    echo "" >> "$summary_file"
    echo "Coverage files location: $COVERAGE_DIR" >> "$summary_file"
    echo "HTML Report: $COVERAGE_DIR/reports/html/index.html" >> "$summary_file"
}

main() {
    log_info "Starting coverage merge process..."
    
    cd "$PROJECT_ROOT"
    
    # Setup coverage directory
    setup_coverage_directory
    
    # Collect coverage from all packages
    collect_proxy_server_coverage
    collect_frontend_coverage
    collect_types_coverage
    
    # Merge coverage files
    merge_lcov_files
    
    # Generate reports
    generate_html_report
    generate_summary_report
    
    log_success "Coverage merge completed"
    log_info "Coverage reports available at: $COVERAGE_DIR/reports/"
    
    if [[ -f "$COVERAGE_DIR/reports/html/index.html" ]]; then
        log_success "HTML report: $COVERAGE_DIR/reports/html/index.html"
    fi
    
    if [[ -f "$COVERAGE_DIR/reports/summary.txt" ]]; then
        log_success "Summary report: $COVERAGE_DIR/reports/summary.txt"
        echo ""
        cat "$COVERAGE_DIR/reports/summary.txt"
    fi
}

main "$@"