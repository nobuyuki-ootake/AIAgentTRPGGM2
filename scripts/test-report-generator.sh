#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Test Report Generator
# ===================================================================
# 
# Generates comprehensive test reports:
# - Test execution summary
# - Performance metrics
# - Failure analysis
# - Historical trending
# ===================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly REPORT_DIR="$PROJECT_ROOT/test-artifacts/reports"
readonly LOG_DIR="$PROJECT_ROOT/test-logs"

# Color output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[TEST-REPORTER]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[TEST-REPORTER]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[TEST-REPORTER]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[TEST-REPORTER]${NC} $1" >&2
}

setup_report_directory() {
    log_info "Setting up report directory..."
    
    mkdir -p "$REPORT_DIR"/{summary,details,trends,artifacts}
    
    # Clean previous reports
    rm -rf "$REPORT_DIR"/summary/*
    rm -rf "$REPORT_DIR"/details/*
}

analyze_test_logs() {
    log_info "Analyzing test logs..."
    
    local summary_file="$REPORT_DIR/summary/test-execution-summary.txt"
    local json_file="$REPORT_DIR/summary/test-execution-summary.json"
    
    # Initialize summary
    cat > "$summary_file" << EOF
AI Agent TRPG GM - Test Execution Summary
Generated: $(date)
========================================

EOF
    
    # Initialize JSON
    cat > "$json_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "execution": {
    "start_time": null,
    "end_time": null,
    "duration_seconds": 0
  },
  "results": {
    "unit": {"passed": 0, "failed": 0, "skipped": 0, "total": 0},
    "integration": {"passed": 0, "failed": 0, "skipped": 0, "total": 0},
    "e2e": {"passed": 0, "failed": 0, "skipped": 0, "total": 0}
  },
  "performance": {
    "slowest_tests": [],
    "average_duration": 0
  },
  "coverage": {
    "overall_percentage": 0,
    "threshold_met": false
  }
}
EOF
    
    # Analyze unit test logs
    if [[ -f "$LOG_DIR/unit-proxy-server.log" ]]; then
        log_info "Analyzing unit test results..."
        
        echo "Unit Tests (Proxy Server):" >> "$summary_file"
        echo "=========================" >> "$summary_file"
        
        # Extract Jest results
        local passed=$(grep -o "✓.*passed" "$LOG_DIR/unit-proxy-server.log" | wc -l || echo "0")
        local failed=$(grep -o "✗.*failed" "$LOG_DIR/unit-proxy-server.log" | wc -l || echo "0")
        local total=$((passed + failed))
        
        echo "  Passed: $passed" >> "$summary_file"
        echo "  Failed: $failed" >> "$summary_file"
        echo "  Total: $total" >> "$summary_file"
        echo "" >> "$summary_file"
        
        # Update JSON
        local temp_file=$(mktemp)
        jq --argjson passed "$passed" \
           --argjson failed "$failed" \
           --argjson total "$total" \
           '.results.unit = {
               "passed": $passed,
               "failed": $failed,
               "skipped": 0,
               "total": $total
           }' "$json_file" > "$temp_file" && mv "$temp_file" "$json_file"
    fi
    
    # Analyze integration test logs
    if [[ -f "$LOG_DIR/integration-proxy-server.log" ]]; then
        log_info "Analyzing integration test results..."
        
        echo "Integration Tests (Proxy Server):" >> "$summary_file"
        echo "================================" >> "$summary_file"
        
        # Extract Jest results
        local passed=$(grep -o "✓.*passed" "$LOG_DIR/integration-proxy-server.log" | wc -l || echo "0")
        local failed=$(grep -o "✗.*failed" "$LOG_DIR/integration-proxy-server.log" | wc -l || echo "0")
        local total=$((passed + failed))
        
        echo "  Passed: $passed" >> "$summary_file"
        echo "  Failed: $failed" >> "$summary_file"
        echo "  Total: $total" >> "$summary_file"
        echo "" >> "$summary_file"
        
        # Update JSON
        local temp_file=$(mktemp)
        jq --argjson passed "$passed" \
           --argjson failed "$failed" \
           --argjson total "$total" \
           '.results.integration = {
               "passed": $passed,
               "failed": $failed,
               "skipped": 0,
               "total": $total
           }' "$json_file" > "$temp_file" && mv "$temp_file" "$json_file"
    fi
    
    # Analyze E2E test logs
    if [[ -f "$LOG_DIR/e2e-frontend.log" ]]; then
        log_info "Analyzing E2E test results..."
        
        echo "E2E Tests (Frontend):" >> "$summary_file"
        echo "====================" >> "$summary_file"
        
        # Extract Playwright results
        local passed=$(grep -o "[0-9]* passed" "$LOG_DIR/e2e-frontend.log" | tail -1 | grep -o "[0-9]*" || echo "0")
        local failed=$(grep -o "[0-9]* failed" "$LOG_DIR/e2e-frontend.log" | tail -1 | grep -o "[0-9]*" || echo "0")
        local skipped=$(grep -o "[0-9]* skipped" "$LOG_DIR/e2e-frontend.log" | tail -1 | grep -o "[0-9]*" || echo "0")
        local total=$((passed + failed + skipped))
        
        echo "  Passed: $passed" >> "$summary_file"
        echo "  Failed: $failed" >> "$summary_file"
        echo "  Skipped: $skipped" >> "$summary_file"
        echo "  Total: $total" >> "$summary_file"
        echo "" >> "$summary_file"
        
        # Update JSON
        local temp_file=$(mktemp)
        jq --argjson passed "$passed" \
           --argjson failed "$failed" \
           --argjson skipped "$skipped" \
           --argjson total "$total" \
           '.results.e2e = {
               "passed": $passed,
               "failed": $failed,
               "skipped": $skipped,
               "total": $total
           }' "$json_file" > "$temp_file" && mv "$temp_file" "$json_file"
    fi
    
    # Calculate overall results
    local total_passed=$(jq '.results.unit.passed + .results.integration.passed + .results.e2e.passed' "$json_file")
    local total_failed=$(jq '.results.unit.failed + .results.integration.failed + .results.e2e.failed' "$json_file")
    local total_skipped=$(jq '.results.unit.skipped + .results.integration.skipped + .results.e2e.skipped' "$json_file")
    local grand_total=$((total_passed + total_failed + total_skipped))
    
    echo "Overall Results:" >> "$summary_file"
    echo "===============" >> "$summary_file"
    echo "  Total Passed: $total_passed" >> "$summary_file"
    echo "  Total Failed: $total_failed" >> "$summary_file"
    echo "  Total Skipped: $total_skipped" >> "$summary_file"
    echo "  Grand Total: $grand_total" >> "$summary_file"
    echo "" >> "$summary_file"
    
    if [[ $total_failed -eq 0 ]]; then
        echo "Result: ✓ ALL TESTS PASSED" >> "$summary_file"
    else
        echo "Result: ✗ SOME TESTS FAILED" >> "$summary_file"
    fi
}

analyze_performance_metrics() {
    log_info "Analyzing performance metrics..."
    
    local perf_file="$REPORT_DIR/details/performance-analysis.txt"
    local perf_json="$REPORT_DIR/details/performance-analysis.json"
    
    cat > "$perf_file" << EOF
AI Agent TRPG GM - Performance Analysis
Generated: $(date)
======================================

EOF
    
    # Initialize performance JSON
    cat > "$perf_json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "test_execution": {
    "unit_tests": {"duration_ms": 0, "tests_per_second": 0},
    "integration_tests": {"duration_ms": 0, "tests_per_second": 0},
    "e2e_tests": {"duration_ms": 0, "tests_per_second": 0}
  },
  "slowest_tests": [],
  "resource_usage": {
    "peak_memory_mb": 0,
    "cpu_usage_percent": 0
  }
}
EOF
    
    # Analyze test execution times
    echo "Test Execution Performance:" >> "$perf_file"
    echo "===========================" >> "$perf_file"
    
    # Extract execution times from logs
    for test_type in unit integration e2e; do
        local log_files=("$LOG_DIR"/${test_type}-*.log)
        
        if [[ -f "${log_files[0]}" ]]; then
            echo "" >> "$perf_file"
            echo "${test_type^} Tests:" >> "$perf_file"
            echo "$(printf '%.0s-' {1..20})" >> "$perf_file"
            
            # Try to extract timing information
            local duration=$(grep -o "Test Suites.*Time:.*" "${log_files[0]}" 2>/dev/null | head -1 || echo "")
            if [[ -n "$duration" ]]; then
                echo "  $duration" >> "$perf_file"
            else
                echo "  Duration: Not available" >> "$perf_file"
            fi
            
            # Count tests
            local test_count=$(grep -c "✓\|✗" "${log_files[0]}" 2>/dev/null || echo "0")
            echo "  Test Count: $test_count" >> "$perf_file"
        fi
    done
    
    echo "" >> "$perf_file"
    echo "Resource Usage:" >> "$perf_file"
    echo "===============" >> "$perf_file"
    
    # Get current system information
    if command -v free &> /dev/null; then
        local memory_info=$(free -m | grep "^Mem:" | awk '{print $3}')
        echo "  Current Memory Usage: ${memory_info}MB" >> "$perf_file"
    fi
    
    if command -v top &> /dev/null; then
        local cpu_info=$(top -bn1 | grep "^%Cpu" | awk '{print $2}' | sed 's/%us,//')
        echo "  Current CPU Usage: ${cpu_info}%" >> "$perf_file"
    fi
}

analyze_failure_patterns() {
    log_info "Analyzing failure patterns..."
    
    local failure_file="$REPORT_DIR/details/failure-analysis.txt"
    local failure_json="$REPORT_DIR/details/failure-analysis.json"
    
    cat > "$failure_file" << EOF
AI Agent TRPG GM - Failure Analysis
Generated: $(date)
==================================

EOF
    
    # Initialize failure JSON
    cat > "$failure_json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "failures": [],
  "common_patterns": [],
  "recommendations": []
}
EOF
    
    # Look for failures in all log files
    local found_failures=false
    
    for log_file in "$LOG_DIR"/*.log; do
        if [[ -f "$log_file" ]]; then
            local basename=$(basename "$log_file" .log)
            
            # Look for error patterns
            local errors=$(grep -i "error\|fail\|exception" "$log_file" 2>/dev/null || true)
            
            if [[ -n "$errors" ]]; then
                found_failures=true
                echo "Failures in $basename:" >> "$failure_file"
                echo "$(printf '%.0s-' {1..30})" >> "$failure_file"
                echo "$errors" >> "$failure_file"
                echo "" >> "$failure_file"
            fi
        fi
    done
    
    if [[ "$found_failures" == false ]]; then
        echo "No failures detected in test logs." >> "$failure_file"
        echo "" >> "$failure_file"
        echo "✓ All tests appear to have passed successfully!" >> "$failure_file"
    else
        echo "Recommendations:" >> "$failure_file"
        echo "===============" >> "$failure_file"
        echo "1. Review failed test logs for specific error messages" >> "$failure_file"
        echo "2. Check environment setup and dependencies" >> "$failure_file"
        echo "3. Verify test data and database state" >> "$failure_file"
        echo "4. Consider running tests individually to isolate issues" >> "$failure_file"
    fi
}

generate_html_report() {
    log_info "Generating HTML report..."
    
    local html_file="$REPORT_DIR/summary/test-report.html"
    
    cat > "$html_file" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agent TRPG GM - Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #007bff;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .metric-label {
            color: #666;
            font-size: 0.9em;
        }
        .status-passed {
            color: #28a745;
            border-left-color: #28a745;
        }
        .status-failed {
            color: #dc3545;
            border-left-color: #dc3545;
        }
        .test-results {
            margin-bottom: 30px;
        }
        .test-category {
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
        .timestamp {
            color: #666;
            font-size: 0.9em;
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎲 AI Agent TRPG GM</h1>
            <h2>Test Execution Report</h2>
        </div>
        
        <div class="metrics">
            <div class="metric-card" id="total-tests">
                <div class="metric-value">--</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card" id="passed-tests">
                <div class="metric-value">--</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric-card" id="failed-tests">
                <div class="metric-value">--</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric-card" id="coverage">
                <div class="metric-value">--%</div>
                <div class="metric-label">Coverage</div>
            </div>
        </div>
        
        <div class="test-results">
            <h3>Test Categories</h3>
            
            <div class="test-category">
                <h4>Unit Tests</h4>
                <div>Passed: <span id="unit-passed">--</span> | Failed: <span id="unit-failed">--</span> | Total: <span id="unit-total">--</span></div>
                <div class="progress-bar">
                    <div class="progress-fill" id="unit-progress" style="width: 0%"></div>
                </div>
            </div>
            
            <div class="test-category">
                <h4>Integration Tests</h4>
                <div>Passed: <span id="integration-passed">--</span> | Failed: <span id="integration-failed">--</span> | Total: <span id="integration-total">--</span></div>
                <div class="progress-bar">
                    <div class="progress-fill" id="integration-progress" style="width: 0%"></div>
                </div>
            </div>
            
            <div class="test-category">
                <h4>E2E Tests</h4>
                <div>Passed: <span id="e2e-passed">--</span> | Failed: <span id="e2e-failed">--</span> | Total: <span id="e2e-total">--</span></div>
                <div class="progress-bar">
                    <div class="progress-fill" id="e2e-progress" style="width: 0%"></div>
                </div>
            </div>
        </div>
        
        <div class="timestamp">
            Generated: <span id="timestamp">--</span>
        </div>
    </div>
    
    <script>
        // Load test data and update UI
        fetch('./test-execution-summary.json')
            .then(response => response.json())
            .then(data => {
                // Update overall metrics
                const totalTests = data.results.unit.total + data.results.integration.total + data.results.e2e.total;
                const totalPassed = data.results.unit.passed + data.results.integration.passed + data.results.e2e.passed;
                const totalFailed = data.results.unit.failed + data.results.integration.failed + data.results.e2e.failed;
                
                document.getElementById('total-tests').querySelector('.metric-value').textContent = totalTests;
                document.getElementById('passed-tests').querySelector('.metric-value').textContent = totalPassed;
                document.getElementById('failed-tests').querySelector('.metric-value').textContent = totalFailed;
                
                // Set status colors
                if (totalFailed === 0) {
                    document.getElementById('passed-tests').classList.add('status-passed');
                    document.getElementById('failed-tests').classList.add('status-passed');
                } else {
                    document.getElementById('failed-tests').classList.add('status-failed');
                }
                
                // Update category details
                ['unit', 'integration', 'e2e'].forEach(category => {
                    const categoryData = data.results[category];
                    document.getElementById(`${category}-passed`).textContent = categoryData.passed;
                    document.getElementById(`${category}-failed`).textContent = categoryData.failed;
                    document.getElementById(`${category}-total`).textContent = categoryData.total;
                    
                    const progress = categoryData.total > 0 ? (categoryData.passed / categoryData.total) * 100 : 0;
                    document.getElementById(`${category}-progress`).style.width = `${progress}%`;
                });
                
                // Update timestamp
                document.getElementById('timestamp').textContent = new Date(data.timestamp).toLocaleString();
            })
            .catch(error => {
                console.error('Error loading test data:', error);
            });
    </script>
</body>
</html>
EOF
    
    log_success "HTML report generated: $html_file"
}

main() {
    log_info "Starting test report generation..."
    
    cd "$PROJECT_ROOT"
    
    # Setup report directory
    setup_report_directory
    
    # Analyze test logs
    analyze_test_logs
    
    # Analyze performance metrics
    analyze_performance_metrics
    
    # Analyze failure patterns
    analyze_failure_patterns
    
    # Generate HTML report
    generate_html_report
    
    log_success "Test report generation completed"
    log_info "Reports available at: $REPORT_DIR/"
    
    # List generated reports
    echo ""
    echo "Generated Reports:"
    echo "=================="
    find "$REPORT_DIR" -name "*.txt" -o -name "*.json" -o -name "*.html" | sort
}

main "$@"