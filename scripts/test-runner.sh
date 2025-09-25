#!/bin/bash

# ===================================================================
# AI Agent TRPG GM - Test Execution Orchestrator
# ===================================================================
# 
# Comprehensive test runner supporting t-WADA test execution patterns:
# - Unit tests (fast, isolated)
# - Integration tests (database, API)
# - E2E tests (full application flow)
#
# Features:
# - Parallel execution where possible
# - Coverage aggregation
# - Test environment isolation
# - Performance monitoring
# - CI/CD pipeline integration
# ===================================================================

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly LOG_DIR="${PROJECT_ROOT}/test-logs"
readonly COVERAGE_DIR="${PROJECT_ROOT}/coverage"
readonly ARTIFACTS_DIR="${PROJECT_ROOT}/test-artifacts"

# Test execution timing
readonly START_TIME=$(date +%s)

# Color output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Test Execution Options:
  --unit          Run unit tests only
  --integration   Run integration tests only
  --e2e           Run E2E tests only
  --all           Run all test types (default)
  --smoke         Run smoke tests (critical path only)
  --performance   Run performance tests

Execution Options:
  --watch         Run tests in watch mode
  --parallel      Enable parallel test execution
  --ci            CI mode (no interactive features)
  --coverage      Generate coverage reports
  --verbose       Verbose output

Environment Options:
  --docker        Use Docker test environment
  --local         Use local test environment
  --clean         Clean test environment before running

Examples:
  $0                           # Run all tests
  $0 --unit --coverage         # Run unit tests with coverage
  $0 --e2e --docker           # Run E2E tests in Docker
  $0 --ci --parallel          # CI mode with parallel execution
  $0 --smoke --performance    # Quick smoke + performance tests

EOF
}

# Default configuration
RUN_UNIT=false
RUN_INTEGRATION=false
RUN_E2E=false
RUN_ALL=true
RUN_SMOKE=false
RUN_PERFORMANCE=false
WATCH_MODE=false
PARALLEL_MODE=false
CI_MODE=false
COVERAGE_MODE=false
VERBOSE=false
DOCKER_MODE=false
LOCAL_MODE=false
CLEAN_MODE=false

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit)
                RUN_UNIT=true
                RUN_ALL=false
                shift
                ;;
            --integration)
                RUN_INTEGRATION=true
                RUN_ALL=false
                shift
                ;;
            --e2e)
                RUN_E2E=true
                RUN_ALL=false
                shift
                ;;
            --all)
                RUN_ALL=true
                shift
                ;;
            --smoke)
                RUN_SMOKE=true
                RUN_ALL=false
                shift
                ;;
            --performance)
                RUN_PERFORMANCE=true
                RUN_ALL=false
                shift
                ;;
            --watch)
                WATCH_MODE=true
                shift
                ;;
            --parallel)
                PARALLEL_MODE=true
                shift
                ;;
            --ci)
                CI_MODE=true
                shift
                ;;
            --coverage)
                COVERAGE_MODE=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --docker)
                DOCKER_MODE=true
                LOCAL_MODE=false
                shift
                ;;
            --local)
                LOCAL_MODE=true
                DOCKER_MODE=false
                shift
                ;;
            --clean)
                CLEAN_MODE=true
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # If no specific test type selected, run all
    if [[ "$RUN_UNIT" == false && "$RUN_INTEGRATION" == false && "$RUN_E2E" == false && "$RUN_SMOKE" == false && "$RUN_PERFORMANCE" == false ]]; then
        RUN_ALL=true
    fi
}

# Setup test environment
setup_test_environment() {
    log_info "Setting up test environment..."
    
    # Create directories
    mkdir -p "$LOG_DIR" "$COVERAGE_DIR" "$ARTIFACTS_DIR"
    
    # Clean if requested
    if [[ "$CLEAN_MODE" == true ]]; then
        log_info "Cleaning test environment..."
        "$SCRIPT_DIR/test-env-teardown.sh"
        rm -rf "$LOG_DIR"/* "$COVERAGE_DIR"/* "$ARTIFACTS_DIR"/*
    fi
    
    # Setup environment
    "$SCRIPT_DIR/test-env-setup.sh"
    
    # Initialize test database
    "$SCRIPT_DIR/test-db-init.sh"
}

# Cleanup test environment
cleanup_test_environment() {
    log_info "Cleaning up test environment..."
    
    if [[ "$CI_MODE" == false ]]; then
        "$SCRIPT_DIR/test-env-teardown.sh"
    fi
}

# Trap cleanup on exit
trap cleanup_test_environment EXIT

# Run unit tests
run_unit_tests() {
    log_info "Running unit tests..."
    
    local test_cmd="pnpm test"
    local coverage_flag=""
    
    if [[ "$COVERAGE_MODE" == true ]]; then
        coverage_flag="--coverage"
    fi
    
    if [[ "$WATCH_MODE" == true ]]; then
        test_cmd="$test_cmd --watch"
    fi
    
    # Run proxy-server unit tests
    log_info "Running proxy-server unit tests..."
    cd "$PROJECT_ROOT/apps/proxy-server"
    
    if [[ "$PARALLEL_MODE" == true ]]; then
        $test_cmd $coverage_flag --testNamePattern="unit" --maxWorkers=4 2>&1 | tee "$LOG_DIR/unit-proxy-server.log" &
        local unit_proxy_pid=$!
    else
        $test_cmd $coverage_flag --testNamePattern="unit" 2>&1 | tee "$LOG_DIR/unit-proxy-server.log"
    fi
    
    # Run types package unit tests if they exist
    if [[ -f "$PROJECT_ROOT/packages/types/package.json" ]]; then
        log_info "Running types package unit tests..."
        cd "$PROJECT_ROOT/packages/types"
        
        if [[ "$PARALLEL_MODE" == true ]]; then
            $test_cmd $coverage_flag 2>&1 | tee "$LOG_DIR/unit-types.log" &
            local unit_types_pid=$!
        else
            $test_cmd $coverage_flag 2>&1 | tee "$LOG_DIR/unit-types.log"
        fi
    fi
    
    # Wait for parallel jobs if running in parallel mode
    if [[ "$PARALLEL_MODE" == true ]]; then
        log_info "Waiting for unit tests to complete..."
        wait $unit_proxy_pid || log_error "Proxy server unit tests failed"
        [[ -n "${unit_types_pid:-}" ]] && wait $unit_types_pid || log_error "Types unit tests failed"
    fi
    
    log_success "Unit tests completed"
}

# Run integration tests
run_integration_tests() {
    log_info "Running integration tests..."
    
    # Ensure test database is properly seeded
    "$SCRIPT_DIR/test-db-seed.sh"
    
    local test_cmd="pnpm test"
    local coverage_flag=""
    
    if [[ "$COVERAGE_MODE" == true ]]; then
        coverage_flag="--coverage"
    fi
    
    # Run proxy-server integration tests
    log_info "Running proxy-server integration tests..."
    cd "$PROJECT_ROOT/apps/proxy-server"
    
    $test_cmd $coverage_flag --testNamePattern="integration" 2>&1 | tee "$LOG_DIR/integration-proxy-server.log"
    
    log_success "Integration tests completed"
}

# Run E2E tests
run_e2e_tests() {
    log_info "Running E2E tests..."
    
    # Start development server if not already running
    local server_started=false
    if [[ "$DOCKER_MODE" == true ]]; then
        log_info "Starting Docker development environment for E2E tests..."
        cd "$PROJECT_ROOT"
        ./start-dev.sh --docker --detach 2>&1 | tee "$LOG_DIR/e2e-server.log" &
        server_started=true
        
        # Wait for server to be ready
        log_info "Waiting for development server to be ready..."
        timeout 120 bash -c 'until curl -s http://localhost:3000 > /dev/null; do sleep 2; done'
    fi
    
    # Run E2E tests
    cd "$PROJECT_ROOT/apps/frontend"
    
    local e2e_cmd="pnpm playwright test"
    
    if [[ "$CI_MODE" == true ]]; then
        e2e_cmd="$e2e_cmd --reporter=junit"
    fi
    
    if [[ "$VERBOSE" == true ]]; then
        e2e_cmd="$e2e_cmd --verbose"
    fi
    
    $e2e_cmd 2>&1 | tee "$LOG_DIR/e2e-frontend.log"
    
    # Stop server if we started it
    if [[ "$server_started" == true && "$CI_MODE" == false ]]; then
        log_info "Stopping development server..."
        cd "$PROJECT_ROOT"
        pkill -f "start-dev.sh" || true
        docker-compose down || true
    fi
    
    log_success "E2E tests completed"
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests (critical path only)..."
    
    # Basic health checks
    log_info "Running basic health checks..."
    cd "$PROJECT_ROOT/apps/proxy-server"
    pnpm test --testNamePattern="smoke|health" 2>&1 | tee "$LOG_DIR/smoke-proxy-server.log"
    
    # Critical E2E flows
    log_info "Running critical E2E flows..."
    cd "$PROJECT_ROOT/apps/frontend"
    pnpm playwright test --grep="smoke|critical" 2>&1 | tee "$LOG_DIR/smoke-frontend.log"
    
    log_success "Smoke tests completed"
}

# Run performance tests
run_performance_tests() {
    log_info "Running performance tests..."
    
    # Performance tests for backend
    log_info "Running backend performance tests..."
    cd "$PROJECT_ROOT/apps/proxy-server"
    pnpm test --testNamePattern="performance" --runInBand 2>&1 | tee "$LOG_DIR/performance-proxy-server.log"
    
    # Performance tests for frontend (if they exist)
    if [[ -d "$PROJECT_ROOT/apps/frontend/e2e/performance" ]]; then
        log_info "Running frontend performance tests..."
        cd "$PROJECT_ROOT/apps/frontend"
        pnpm playwright test e2e/performance/ 2>&1 | tee "$LOG_DIR/performance-frontend.log"
    fi
    
    log_success "Performance tests completed"
}

# Generate test reports
generate_reports() {
    if [[ "$COVERAGE_MODE" == true ]]; then
        log_info "Generating coverage reports..."
        "$SCRIPT_DIR/coverage-merger.sh"
        "$SCRIPT_DIR/coverage-reporter.sh"
    fi
    
    log_info "Generating test reports..."
    "$SCRIPT_DIR/test-report-generator.sh"
    
    log_info "Collecting test artifacts..."
    "$SCRIPT_DIR/test-artifacts-collector.sh"
}

# Calculate execution time
calculate_execution_time() {
    local end_time=$(date +%s)
    local execution_time=$((end_time - START_TIME))
    local minutes=$((execution_time / 60))
    local seconds=$((execution_time % 60))
    
    log_success "Test execution completed in ${minutes}m ${seconds}s"
}

# Main execution function
main() {
    log_info "Starting AI Agent TRPG GM test execution..."
    log_info "Configuration: RUN_ALL=$RUN_ALL, UNIT=$RUN_UNIT, INTEGRATION=$RUN_INTEGRATION, E2E=$RUN_E2E"
    log_info "Options: PARALLEL=$PARALLEL_MODE, CI=$CI_MODE, COVERAGE=$COVERAGE_MODE, DOCKER=$DOCKER_MODE"
    
    # Parse arguments
    parse_args "$@"
    
    # Setup test environment
    setup_test_environment
    
    # Execute tests based on configuration
    local test_results=0
    
    if [[ "$RUN_ALL" == true ]]; then
        run_unit_tests || test_results=$?
        run_integration_tests || test_results=$?
        run_e2e_tests || test_results=$?
    else
        [[ "$RUN_UNIT" == true ]] && (run_unit_tests || test_results=$?)
        [[ "$RUN_INTEGRATION" == true ]] && (run_integration_tests || test_results=$?)
        [[ "$RUN_E2E" == true ]] && (run_e2e_tests || test_results=$?)
        [[ "$RUN_SMOKE" == true ]] && (run_smoke_tests || test_results=$?)
        [[ "$RUN_PERFORMANCE" == true ]] && (run_performance_tests || test_results=$?)
    fi
    
    # Generate reports
    generate_reports
    
    # Calculate execution time
    calculate_execution_time
    
    # Exit with appropriate code
    if [[ $test_results -eq 0 ]]; then
        log_success "All tests passed successfully!"
    else
        log_error "Some tests failed. Check logs in $LOG_DIR for details."
    fi
    
    exit $test_results
}

# Execute main function with all arguments
main "$@"