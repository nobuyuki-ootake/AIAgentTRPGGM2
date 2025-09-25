/**
 * Integration Tests Index
 * Centralized export point for all integration tests
 * Following t-WADA naming conventions and using production types
 */

// ==========================================
// Critical Route Integration Tests
// ==========================================
export * from './aiAgent.integration.test';
export * from './campaigns.integration.test';
export * from './sessions.integration.test';
export * from './characters.integration.test';

// ==========================================
// AI Integration Tests
// ==========================================
export * from './aiGameMaster.integration.test';
export * from './aiEntityManagement.integration.test';
export * from './aiCharacterGeneration.integration.test';

// ==========================================
// Database and Infrastructure Tests
// ==========================================
export * from './database.integration.test';

// ==========================================
// Real-time Integration Tests
// ==========================================
export * from './websocket.integration.test';
export * from './websocketPersistence.integration.test';
export * from './realtimeCollaboration.integration.test';

// ==========================================
// Performance and Load Testing
// ==========================================
export * from './performanceLoad.integration.test';

// ==========================================
// Security Integration Tests
// ==========================================
export * from './security.integration.test';
export * from './authFlow.integration.test';

// ==========================================
// Complex Workflow Testing
// ==========================================
export * from './complexWorkflows.integration.test';
export * from './aiServiceResilience.integration.test';

// ==========================================
// Advanced Integration Tests (90% Coverage Target)
// ==========================================
export * from './dataIntegrityAndMigration.integration.test';
export * from './mediaAndFileHandling.integration.test';
export * from './aiServiceAdvanced.integration.test';
export * from './edgeCasesAndStressTesting.integration.test';

/**
 * Comprehensive Integration Test Suite Summary
 * 
 * This test suite provides extensive integration testing targeting 90% coverage for the TRPG AI Agent proxy server:
 * 
 * 1. **Critical Route Integration Tests**:
 *    - AI Agent routes (/api/ai-agent/*)
 *    - Campaign management (/api/campaigns/*)
 *    - Session management (/api/sessions/*)
 *    - Character management (/api/characters/*)
 * 
 * 2. **AI Integration Tests**:
 *    - AI Game Master services
 *    - AI Entity Management
 *    - AI Character Generation
 *    - Advanced AI workflows with context accumulation
 *    - Multi-stage AI processes and prompt refinement
 *    - AI provider fallback and error recovery
 *    - Semantic memory and NPC consistency
 *    - Multimodal AI integration (vision, image generation)
 * 
 * 3. **Database Integration Tests**:
 *    - SQLite database operations
 *    - Data integrity and constraints
 *    - Transaction management and concurrent access
 *    - Database migrations and version management
 *    - Backup and restore functionality
 *    - Data corruption detection and repair
 * 
 * 4. **Real-time Integration Tests**:
 *    - WebSocket connections and persistence
 *    - Real-time collaboration (multiple users)
 *    - Party movement synchronization and voting
 *    - Simultaneous editing and conflict resolution
 *    - Session state synchronization
 *    - Connection recovery and offline sync
 * 
 * 5. **Performance and Load Testing**:
 *    - Large dataset handling (1000+ entities)
 *    - Concurrent user sessions (100+ users)
 *    - Memory management and garbage collection
 *    - Database connection pooling under load
 *    - Query optimization with large datasets
 *    - AI request batching and caching
 * 
 * 6. **Security Integration Tests**:
 *    - Rate limiting and DDoS protection
 *    - SQL injection prevention
 *    - XSS and prompt injection protection
 *    - Authentication and authorization
 *    - CSRF protection and security headers
 *    - File upload security and validation
 *    - Audit logging and threat detection
 * 
 * 7. **Media and File Handling**:
 *    - Image upload and processing (multiple formats)
 *    - Video and audio processing with transcoding
 *    - PDF and document text extraction
 *    - Batch upload with progress tracking
 *    - Media gallery organization and tagging
 *    - CDN integration and access control
 *    - File security validation and sanitization
 * 
 * 8. **Edge Cases and Stress Testing**:
 *    - Boundary conditions and malformed input
 *    - Extreme data sizes and unicode edge cases
 *    - Network timeouts and service outages
 *    - Database lock contention and deadlocks
 *    - Security attack pattern resistance
 *    - Cross-platform compatibility testing
 * 
 * **Advanced Testing Features**:
 * - Complex multi-step TRPG workflows
 * - AI service resilience and degradation testing
 * - Real-time collaborative editing scenarios
 * - Data migration and integrity validation
 * - Cross-browser and mobile compatibility
 * - Performance monitoring under extreme load
 * - Security penetration testing scenarios
 * 
 * **Test Principles Applied**:
 * - Uses production types from @ai-agent-trpg/types exclusively
 * - Follows t-WADA naming conventions (describe what the test does)
 * - Tests actual database operations with test SQLite database
 * - Tests full request/response cycles through Express middleware
 * - Uses mock AI providers with advanced scenario simulation
 * - Verifies end-to-end data flow from API to database
 * - Tests error scenarios and proper error response formats
 * - Implements realistic TRPG user scenarios and workflows
 * - Tests edge cases and boundary conditions
 * - Validates performance under load and stress conditions
 * - Ensures security against common attack vectors
 * 
 * **Coverage Goals**:
 * - 90% line coverage across all integration scenarios
 * - Complete TRPG workflow coverage (campaign → session → gameplay)
 * - All AI provider scenarios and fallback paths
 * - Security vulnerability testing and mitigation validation
 * - Performance bottleneck identification and testing
 * - Cross-system compatibility and resilience validation
 * 
 * **Running the Tests**:
 * ```bash
 * # Run all integration tests (comprehensive suite)
 * npm test -- --testPathPattern=integration
 * 
 * # Run specific advanced test categories
 * npm test -- dataIntegrityAndMigration.integration.test.ts
 * npm test -- mediaAndFileHandling.integration.test.ts
 * npm test -- aiServiceAdvanced.integration.test.ts
 * npm test -- edgeCasesAndStressTesting.integration.test.ts
 * 
 * # Run with coverage reporting
 * npm test -- --coverage --testPathPattern=integration
 * 
 * # Run stress tests (extended timeout)
 * npm test -- --testTimeout=300000 --testPathPattern=edgeCasesAndStressTesting
 * 
 * # Run security tests
 * npm test -- --testPathPattern=security
 * 
 * # Run performance tests
 * npm test -- --testPathPattern=performance
 * ```
 */

export const INTEGRATION_TEST_CONFIG = {
  testTimeout: 30000, // 30 seconds for integration tests
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/jest.setup.ts'],
  testEnvironment: 'node',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@ai-agent-trpg/types$': '<rootDir>/../../packages/types'
  }
} as const;

export const MOCK_SCENARIOS = {
  SUCCESS: 'success',
  API_ERROR: 'api_error',
  RATE_LIMIT: 'rate_limit',
  INVALID_KEY: 'invalid_key',
  SERVICE_UNAVAILABLE: 'service_unavailable'
} as const;