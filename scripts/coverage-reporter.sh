#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Coverage Reporter
# ===================================================================
# 
# Generates comprehensive coverage reports:
# - Coverage trending analysis
# - Threshold enforcement
# - CI/CD compatible outputs
# - Performance metrics
# ===================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly COVERAGE_DIR="$PROJECT_ROOT/coverage"

# Coverage thresholds
readonly LINE_THRESHOLD=80
readonly FUNCTION_THRESHOLD=80
readonly BRANCH_THRESHOLD=80
readonly STATEMENT_THRESHOLD=80

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[COVERAGE-REPORTER]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[COVERAGE-REPORTER]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[COVERAGE-REPORTER]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[COVERAGE-REPORTER]${NC} $1" >&2
}

analyze_coverage_trends() {
    log_info "Analyzing coverage trends..."
    
    local trends_file="$COVERAGE_DIR/reports/trends.json"
    local current_date=$(date -Iseconds)
    
    # Create trends file if it doesn't exist
    if [[ ! -f "$trends_file" ]]; then
        cat > "$trends_file" << EOF
{
  "history": [],
  "last_updated": "$current_date"
}
EOF
    fi
    
    # Read current coverage data
    local current_coverage="{}"
    if [[ -f "$COVERAGE_DIR/reports/summary.json" ]]; then
        current_coverage=$(cat "$COVERAGE_DIR/reports/summary.json")
    fi
    
    # Add current data to trends
    local temp_file=$(mktemp)
    jq --arg date "$current_date" --argjson coverage "$current_coverage" '
        .history += [{
            "date": $date,
            "coverage": $coverage
        }] |
        .last_updated = $date |
        # Keep only last 30 entries
        .history = (.history | if length > 30 then .[-30:] else . end)
    ' "$trends_file" > "$temp_file" && mv "$temp_file" "$trends_file"
    
    log_success "Coverage trends updated"
}

check_coverage_thresholds() {
    log_info "Checking coverage thresholds..."
    
    local threshold_report="$COVERAGE_DIR/reports/threshold-check.txt"
    local threshold_json="$COVERAGE_DIR/reports/threshold-check.json"
    local exit_code=0
    
    cat > "$threshold_report" << EOF
AI Agent TRPG GM - Coverage Threshold Check
Generated: $(date)
==========================================

Thresholds:
- Lines: ${LINE_THRESHOLD}%
- Functions: ${FUNCTION_THRESHOLD}%
- Branches: ${BRANCH_THRESHOLD}%
- Statements: ${STATEMENT_THRESHOLD}%

Results:
--------

EOF
    
    # Initialize threshold check JSON
    cat > "$threshold_json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "thresholds": {
    "lines": $LINE_THRESHOLD,
    "functions": $FUNCTION_THRESHOLD,
    "branches": $BRANCH_THRESHOLD,
    "statements": $STATEMENT_THRESHOLD
  },
  "results": {},
  "passed": true,
  "overall_pass": true
}
EOF
    
    # Check each package
    for package in proxy-server frontend types; do
        local package_dir="$COVERAGE_DIR/raw/$package"
        
        if [[ -d "$package_dir" ]] && [[ -f "$package_dir/coverage-summary.json" ]]; then
            log_info "Checking thresholds for $package..."
            
            local coverage_file="$package_dir/coverage-summary.json"
            
            # Extract coverage percentages
            local line_pct=$(jq -r '.total.lines.pct // 0' "$coverage_file" | sed 's/%//')
            local function_pct=$(jq -r '.total.functions.pct // 0' "$coverage_file" | sed 's/%//')
            local branch_pct=$(jq -r '.total.branches.pct // 0' "$coverage_file" | sed 's/%//')
            local statement_pct=$(jq -r '.total.statements.pct // 0' "$coverage_file" | sed 's/%//')
            
            # Check thresholds
            local package_pass=true
            
            echo "Package: $package" >> "$threshold_report"
            
            if (( $(echo "$line_pct >= $LINE_THRESHOLD" | bc -l) )); then
                echo "  ✓ Lines: ${line_pct}% (>= ${LINE_THRESHOLD}%)" >> "$threshold_report"
            else
                echo "  ✗ Lines: ${line_pct}% (< ${LINE_THRESHOLD}%)" >> "$threshold_report"
                package_pass=false
                exit_code=1
            fi
            
            if (( $(echo "$function_pct >= $FUNCTION_THRESHOLD" | bc -l) )); then
                echo "  ✓ Functions: ${function_pct}% (>= ${FUNCTION_THRESHOLD}%)" >> "$threshold_report"
            else
                echo "  ✗ Functions: ${function_pct}% (< ${FUNCTION_THRESHOLD}%)" >> "$threshold_report"
                package_pass=false
                exit_code=1
            fi
            
            if (( $(echo "$branch_pct >= $BRANCH_THRESHOLD" | bc -l) )); then
                echo "  ✓ Branches: ${branch_pct}% (>= ${BRANCH_THRESHOLD}%)" >> "$threshold_report"
            else
                echo "  ✗ Branches: ${branch_pct}% (< ${BRANCH_THRESHOLD}%)" >> "$threshold_report"
                package_pass=false
                exit_code=1
            fi
            
            if (( $(echo "$statement_pct >= $STATEMENT_THRESHOLD" | bc -l) )); then
                echo "  ✓ Statements: ${statement_pct}% (>= ${STATEMENT_THRESHOLD}%)" >> "$threshold_report"
            else
                echo "  ✗ Statements: ${statement_pct}% (< ${STATEMENT_THRESHOLD}%)" >> "$threshold_report"
                package_pass=false
                exit_code=1
            fi
            
            echo "" >> "$threshold_report"
            
            # Update JSON
            local temp_file=$(mktemp)
            jq --arg pkg "$package" \
               --argjson line_pct "$line_pct" \
               --argjson function_pct "$function_pct" \
               --argjson branch_pct "$branch_pct" \
               --argjson statement_pct "$statement_pct" \
               --argjson pass "$package_pass" \
               '.results[$pkg] = {
                   "lines": $line_pct,
                   "functions": $function_pct,
                   "branches": $branch_pct,
                   "statements": $statement_pct,
                   "passed": $pass
               } |
               .overall_pass = (.overall_pass and $pass)' \
               "$threshold_json" > "$temp_file" && mv "$temp_file" "$threshold_json"
        else
            echo "Package: $package" >> "$threshold_report"
            echo "  ! No coverage data available" >> "$threshold_report"
            echo "" >> "$threshold_report"
        fi
    done
    
    # Final result
    if [[ $exit_code -eq 0 ]]; then
        echo "Overall Result: ✓ ALL THRESHOLDS PASSED" >> "$threshold_report"
        log_success "All coverage thresholds passed"
    else
        echo "Overall Result: ✗ SOME THRESHOLDS FAILED" >> "$threshold_report"
        log_error "Some coverage thresholds failed"
    fi
    
    # Display report
    cat "$threshold_report"
    
    return $exit_code
}

generate_ci_reports() {
    log_info "Generating CI/CD compatible reports..."
    
    # JUnit XML for coverage results
    local junit_file="$COVERAGE_DIR/reports/coverage-junit.xml"
    
    cat > "$junit_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Coverage Thresholds" tests="4" failures="0" time="0">
  <testsuite name="Coverage Thresholds" tests="4" failures="0" time="0">
EOF
    
    # Check if thresholds passed
    local threshold_passed=true
    if [[ -f "$COVERAGE_DIR/reports/threshold-check.json" ]]; then
        threshold_passed=$(jq -r '.overall_pass' "$COVERAGE_DIR/reports/threshold-check.json")
    fi
    
    if [[ "$threshold_passed" == "true" ]]; then
        cat >> "$junit_file" << EOF
    <testcase name="Line Coverage" classname="Coverage" time="0"/>
    <testcase name="Function Coverage" classname="Coverage" time="0"/>
    <testcase name="Branch Coverage" classname="Coverage" time="0"/>
    <testcase name="Statement Coverage" classname="Coverage" time="0"/>
EOF
    else
        cat >> "$junit_file" << EOF
    <testcase name="Line Coverage" classname="Coverage" time="0">
      <failure message="Line coverage below threshold"/>
    </testcase>
    <testcase name="Function Coverage" classname="Coverage" time="0">
      <failure message="Function coverage below threshold"/>
    </testcase>
    <testcase name="Branch Coverage" classname="Coverage" time="0">
      <failure message="Branch coverage below threshold"/>
    </testcase>
    <testcase name="Statement Coverage" classname="Coverage" time="0">
      <failure message="Statement coverage below threshold"/>
    </testcase>
EOF
    fi
    
    cat >> "$junit_file" << EOF
  </testsuite>
</testsuites>
EOF
    
    # GitHub Actions annotations
    local github_file="$COVERAGE_DIR/reports/github-annotations.txt"
    
    if [[ "$threshold_passed" == "false" ]]; then
        echo "::error::Coverage thresholds not met. Check coverage reports for details." > "$github_file"
    else
        echo "::notice::All coverage thresholds passed successfully." > "$github_file"
    fi
    
    # Badge generation data
    local badge_file="$COVERAGE_DIR/reports/badge-data.json"
    
    # Calculate overall coverage percentage
    local overall_pct=0
    if [[ -f "$COVERAGE_DIR/merged/lcov.info" ]] && [[ -s "$COVERAGE_DIR/merged/lcov.info" ]]; then
        local total_lines=$(grep -c "^DA:" "$COVERAGE_DIR/merged/lcov.info" 2>/dev/null || echo "0")
        local covered_lines=$(grep "^DA:" "$COVERAGE_DIR/merged/lcov.info" | grep -v ",0$" | wc -l 2>/dev/null || echo "0")
        
        if [[ $total_lines -gt 0 ]]; then
            overall_pct=$((covered_lines * 100 / total_lines))
        fi
    fi
    
    local badge_color="red"
    if [[ $overall_pct -ge 80 ]]; then
        badge_color="brightgreen"
    elif [[ $overall_pct -ge 60 ]]; then
        badge_color="yellow"
    elif [[ $overall_pct -ge 40 ]]; then
        badge_color="orange"
    fi
    
    cat > "$badge_file" << EOF
{
  "schemaVersion": 1,
  "label": "coverage",
  "message": "${overall_pct}%",
  "color": "$badge_color"
}
EOF
    
    log_success "CI/CD reports generated"
}

generate_performance_metrics() {
    log_info "Generating coverage performance metrics..."
    
    local perf_file="$COVERAGE_DIR/reports/performance.json"
    local start_time=$(date +%s)
    
    # Calculate coverage collection time
    local coverage_time=0
    if [[ -f "$COVERAGE_DIR/reports/summary.txt" ]]; then
        local file_time=$(stat -c %Y "$COVERAGE_DIR/reports/summary.txt" 2>/dev/null || echo "$start_time")
        coverage_time=$((start_time - file_time))
    fi
    
    # Count coverage files
    local file_count=$(find "$COVERAGE_DIR/raw" -name "*.json" -o -name "*.info" -o -name "*.html" | wc -l)
    
    # Calculate total coverage data size
    local data_size=$(du -sb "$COVERAGE_DIR" 2>/dev/null | cut -f1 || echo "0")
    
    cat > "$perf_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "metrics": {
    "collection_time_seconds": $coverage_time,
    "file_count": $file_count,
    "data_size_bytes": $data_size,
    "packages_processed": ["proxy-server", "frontend", "types"]
  },
  "efficiency": {
    "files_per_second": $(echo "scale=2; $file_count / ($coverage_time + 1)" | bc -l),
    "bytes_per_second": $(echo "scale=2; $data_size / ($coverage_time + 1)" | bc -l)
  }
}
EOF
    
    log_success "Performance metrics generated"
}

main() {
    log_info "Starting coverage reporting process..."
    
    cd "$PROJECT_ROOT"
    
    # Ensure coverage directory exists
    mkdir -p "$COVERAGE_DIR/reports"
    
    # Analyze coverage trends
    analyze_coverage_trends
    
    # Check coverage thresholds
    local threshold_exit=0
    check_coverage_thresholds || threshold_exit=$?
    
    # Generate CI/CD reports
    generate_ci_reports
    
    # Generate performance metrics
    generate_performance_metrics
    
    log_success "Coverage reporting completed"
    log_info "Reports available at: $COVERAGE_DIR/reports/"
    
    # List generated reports
    echo ""
    echo "Generated Reports:"
    echo "=================="
    ls -la "$COVERAGE_DIR/reports/" | grep -v "^total" | grep -v "^d"
    
    exit $threshold_exit
}

main "$@"