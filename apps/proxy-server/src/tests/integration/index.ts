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

/**
 * Integration Test Suite Summary
 * 
 * This test suite provides comprehensive integration testing for the TRPG AI Agent proxy server:
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
 * 
 * 3. **Database Integration Tests**:
 *    - SQLite database operations
 *    - Data integrity and constraints
 *    - Transaction management
 *    - Performance testing
 * 
 * 4. **Real-time Integration Tests**:
 *    - WebSocket connections
 *    - Real-time messaging
 *    - Party movement synchronization
 * 
 * **Test Principles Applied**:
 * - Uses production types from @ai-agent-trpg/types exclusively
 * - Follows t-WADA naming conventions (describe what the test does)
 * - Tests actual database operations with test SQLite database
 * - Tests full request/response cycles through Express middleware
 * - Uses mock AI providers to avoid external API calls
 * - Verifies end-to-end data flow from API to database
 * - Tests error scenarios and proper error response formats
 * 
 * **Running the Tests**:
 * ```bash
 * # Run all integration tests
 * npm test -- --testPathPattern=integration
 * 
 * # Run specific test suite
 * npm test -- campaigns.integration.test.ts
 * 
 * # Run with coverage
 * npm test -- --coverage --testPathPattern=integration
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