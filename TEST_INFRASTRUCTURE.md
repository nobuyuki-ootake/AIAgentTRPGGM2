# Test Infrastructure - AI Agent TRPG GM

This document describes the comprehensive test execution scripts and CI/CD configuration for the AI Agent TRPG GM project.

## Overview

The test infrastructure follows t-WADA (Test-driven Web Application Development) patterns with:

- **Unit Tests**: Fast, isolated component tests
- **Integration Tests**: Database and API integration tests  
- **E2E Tests**: Full application workflow tests using Playwright
- **Performance Tests**: Load and performance monitoring
- **Coverage Aggregation**: Cross-package coverage reporting

## Test Execution Scripts

### Main Test Runner

```bash
# Run all tests (default)
pnpm test

# Run specific test types
pnpm test:unit           # Unit tests only
pnpm test:integration    # Integration tests only  
pnpm test:e2e           # End-to-end tests only
pnpm test:performance   # Performance tests only
pnpm test:smoke         # Smoke tests (critical path)

# Execution options
pnpm test:coverage      # Run with coverage
pnpm test:watch         # Watch mode
pnpm test:parallel      # Parallel execution
pnpm test:ci            # CI mode
```

### Environment Management

```bash
# Setup test environment
pnpm test:setup

# Teardown test environment  
pnpm test:teardown

# Database operations
pnpm test:db:init       # Initialize test database
pnpm test:db:seed       # Seed test data
pnpm test:db:clean      # Clean test database
```

### Reporting and Artifacts

```bash
# Generate reports
pnpm test:report        # Generate test reports
pnpm test:artifacts     # Collect test artifacts

# Coverage operations
pnpm test:coverage:merge   # Merge coverage reports
pnpm test:coverage:report  # Generate coverage reports
```

## Test Environment Configuration

### Environment Variables (.env.test)

Key test environment settings:

```bash
NODE_ENV=test
DATABASE_URL=data/test/trpg-test.db
MASTRA_DATABASE_URL=mastra-trpg-test.db

# Test AI providers (mock keys)
OPENAI_API_KEY=test-openai-key-do-not-use-in-production
ANTHROPIC_API_KEY=test-anthropic-key-do-not-use-in-production
GOOGLE_AI_API_KEY=test-google-key-do-not-use-in-production

# Performance settings
PERFORMANCE_TEST_MODE=true
MEMORY_LIMIT_MB=512
CPU_LIMIT_PERCENT=80

# Coverage thresholds
COVERAGE_THRESHOLD_LINES=80
COVERAGE_THRESHOLD_FUNCTIONS=80
COVERAGE_THRESHOLD_BRANCHES=80
COVERAGE_THRESHOLD_STATEMENTS=80
```

## Docker Test Environment

### Test Services (docker-compose.test.yml)

- **frontend-test**: Test frontend on port 3001
- **proxy-server-test**: Test backend on port 5001
- **test-db**: SQLite test database
- **mock-ai-service**: Mock AI provider responses
- **test-redis**: Redis for session testing
- **performance-monitor**: Prometheus metrics
- **test-storage**: Mock file storage
- **playwright-runner**: E2E test execution

### Running Docker Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run E2E tests in Docker
docker-compose -f docker-compose.test.yml --profile e2e up

# Cleanup
docker-compose -f docker-compose.test.yml down --volumes
```

## CI/CD Pipeline (.github/workflows/ci.yml)

### Pipeline Stages

1. **Setup & Validation**
   - Dependency caching
   - Project structure validation
   - Change detection

2. **Code Quality**
   - TypeScript type checking
   - ESLint linting
   - Prettier format checking
   - Security audit

3. **Unit Tests**
   - Matrix testing (Node 18, 20)
   - Coverage collection
   - Artifact upload

4. **Integration Tests**
   - Database integration
   - API testing
   - Service communication

5. **E2E Tests**
   - Multi-browser testing (Chromium, Firefox, WebKit)
   - Screenshot/video capture
   - Docker environment

6. **Performance Tests**
   - Load testing
   - Performance monitoring
   - Resource usage analysis

7. **Docker Tests**
   - Container build verification
   - Health checks
   - Smoke tests

8. **Coverage Aggregation**
   - Multi-package coverage merging
   - Threshold enforcement
   - PR comments

9. **Test Reports**
   - Comprehensive reporting
   - Artifact collection
   - JUnit XML generation

10. **Deployment**
    - Production deployment (main branch)
    - Success notifications

### Triggered On

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Daily scheduled runs (2 AM UTC)

## Test Data Management

### Test Database Structure

Test databases are isolated and include:

- **Test campaigns**: Predefined test scenarios
- **Test characters**: PC/NPC/Enemy characters
- **Test sessions**: Various session states
- **Test locations**: World locations
- **Test milestones**: Quest milestones

### Test Data Files

- `apps/proxy-server/test-data/`: Mock data structures
- `apps/frontend/e2e/data/`: E2E test data
- Test data follows production types from `packages/types/`

## Coverage Reporting

### Coverage Thresholds

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Coverage Reports

- **HTML Reports**: `coverage/reports/html/index.html`
- **LCOV Files**: `coverage/merged/lcov.info`
- **JSON Data**: `coverage/reports/summary.json`
- **CI Reports**: JUnit XML, GitHub annotations

### Coverage Aggregation

The system merges coverage from:
- Frontend tests (Playwright)
- Backend tests (Jest)
- Types package tests

## Performance Monitoring

### Metrics Collected

- Test execution times
- Memory usage during tests
- CPU usage during tests
- Database query performance
- API response times

### Performance Reports

- Execution time analysis
- Resource usage tracking
- Performance trends
- Bottleneck identification

## Test Artifacts

### Collected Artifacts

- **Logs**: All test execution logs
- **Screenshots**: E2E test screenshots
- **Videos**: E2E test recordings
- **Coverage**: Coverage reports and data
- **Performance**: Performance metrics
- **CI Outputs**: JUnit XML, badges, annotations

### Artifact Organization

```
test-artifacts/
├── logs/           # Test execution logs
├── coverage/       # Coverage reports
├── screenshots/    # E2E screenshots
├── videos/        # E2E videos
├── reports/       # Generated reports
├── ci-outputs/    # CI/CD outputs
└── performance/   # Performance data
```

## Local Development

### Running Tests Locally

```bash
# Quick smoke test
pnpm test:smoke

# Full test suite
pnpm test:all

# Watch mode for development
pnpm test:watch

# Docker environment
pnpm test --docker
```

### Test Development Guidelines

1. **Unit Tests**: Use t-WADA patterns
2. **Integration Tests**: Test database interactions
3. **E2E Tests**: Focus on user workflows
4. **Performance Tests**: Monitor resource usage
5. **Test Data**: Use production types
6. **Mocking**: Mock external services appropriately

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Check ports 3001, 5001, 6380, 8080, 9090
2. **Database Locks**: Clean test databases between runs
3. **Docker Issues**: Ensure Docker daemon is running
4. **Memory Issues**: Adjust test memory limits
5. **Timeout Issues**: Increase test timeouts for slow systems

### Debug Commands

```bash
# Check test environment
./scripts/test-env-setup.sh

# Verify database state
./scripts/test-db-init.sh

# Check Docker containers
docker-compose -f docker-compose.test.yml ps

# View test logs
tail -f test-logs/*.log
```

## Best Practices

### Test Organization

- Follow t-WADA naming conventions
- Use production types for test data
- Isolate test environments
- Clean up after tests

### Performance

- Run tests in parallel where possible
- Use appropriate timeouts
- Monitor resource usage
- Cache dependencies

### CI/CD

- Fast feedback loops
- Comprehensive coverage
- Artifact retention
- Clear failure reporting

### Security

- Never commit real API keys
- Use mock services for external APIs
- Isolate test data
- Secure test environments

## Support

For issues with the test infrastructure:

1. Check the test logs in `test-logs/`
2. Review the test artifacts in `test-artifacts/`
3. Verify environment setup with `./scripts/test-env-setup.sh`
4. Run database diagnostics with `./scripts/test-db-init.sh`

The test infrastructure is designed to be robust, comprehensive, and maintainable, supporting the development of a high-quality AI-powered TRPG application.