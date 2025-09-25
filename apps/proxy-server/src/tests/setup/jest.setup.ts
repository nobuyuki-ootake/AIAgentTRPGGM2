/**
 * Jest Setup File - Backend Test Configuration
 * This file configures the test environment for the proxy-server backend tests
 */

import { jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';
import { testDatabase } from './testDatabase';

// Global test timeout for AI operations
jest.setTimeout(30000);

// Global test database instance
let globalTestDb: Database | null = null;

/**
 * Global setup before all tests
 */
beforeAll(async () => {
  try {
    // Initialize test database
    globalTestDb = testDatabase.createTestDatabase();
    
    // Make sure globalTestDb is available
    global.testDb = globalTestDb;
    
    // Set up environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = ':memory:';
    process.env.LOG_LEVEL = 'error'; // Suppress logs during tests
    
    // Mock external dependencies
    setupGlobalMocks();
    
    console.log('✅ Jest setup completed successfully');
  } catch (error) {
    console.error('❌ Jest setup failed:', error);
    throw error;
  }
});

/**
 * Global cleanup after all tests
 */
afterAll(async () => {
  // Close test database
  if (globalTestDb) {
    globalTestDb.close();
    globalTestDb = null;
  }
  
  // Clean up any remaining timers
  jest.clearAllTimers();
});

/**
 * Setup before each test
 */
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset database state
  if (globalTestDb) {
    testDatabase.resetDatabase(globalTestDb);
    // Ensure global reference is maintained
    global.testDb = globalTestDb;
  }
  
  // Reset environment variables
  resetTestEnvironment();
});

/**
 * Cleanup after each test
 */
afterEach(() => {
  // Restore all mocks
  jest.restoreAllMocks();
});

/**
 * Setup global mocks for external dependencies
 */
function setupGlobalMocks() {
  // Mock console methods to reduce test noise
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  // Mock AI provider APIs (prevent real API calls in tests)
  jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: 'Mock AI response',
                role: 'assistant'
              }
            }]
          })
        }
      }
    }))
  }));

  jest.mock('@anthropic-ai/sdk', () => ({
    Anthropic: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ text: 'Mock Claude response' }]
        })
      }
    }))
  }));

  jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue('Mock Gemini response')
          }
        })
      })
    }))
  }));

  // Mock socket.io
  jest.mock('socket.io', () => ({
    Server: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      close: jest.fn()
    }))
  }));

  // Mock Express app for route testing
  jest.mock('express', () => {
    const actualExpress = jest.requireActual('express');
    return {
      ...actualExpress,
      default: jest.fn(() => ({
        ...actualExpress(),
        listen: jest.fn((port, callback) => {
          if (callback) callback();
          return { close: jest.fn() };
        })
      }))
    };
  });
}

/**
 * Reset test environment to clean state
 */
function resetTestEnvironment() {
  // Reset critical environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = ':memory:';
  process.env.LOG_LEVEL = 'error';
  
  // Clear any test-specific environment variables
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GOOGLE_API_KEY;
}

/**
 * Global test utilities available in all tests
 */
declare global {
  var testDb: Database;
  
  namespace jest {
    interface Matchers<R> {
      toBeValidTRPGCharacter(): R;
      toBeValidTRPGCampaign(): R;
      toBeValidAIResponse(): R;
    }
  }
}

// Make test database available globally
global.testDb = globalTestDb as Database;

/**
 * Custom Jest matchers for TRPG-specific assertions
 */
expect.extend({
  toBeValidTRPGCharacter(received) {
    const requiredFields = ['id', 'name', 'type', 'stats'];
    const hasRequiredFields = requiredFields.every(field => received && typeof received[field] !== 'undefined');
    
    return {
      message: () => `Expected ${received} to be a valid TRPG character with fields: ${requiredFields.join(', ')}`,
      pass: hasRequiredFields
    };
  },
  
  toBeValidTRPGCampaign(received) {
    const requiredFields = ['id', 'name', 'status', 'createdAt'];
    const hasRequiredFields = requiredFields.every(field => received && typeof received[field] !== 'undefined');
    
    return {
      message: () => `Expected ${received} to be a valid TRPG campaign with fields: ${requiredFields.join(', ')}`,
      pass: hasRequiredFields
    };
  },
  
  toBeValidAIResponse(received) {
    const isValid = received && 
                   typeof received === 'object' && 
                   typeof received.content === 'string' && 
                   received.content.length > 0;
    
    return {
      message: () => `Expected ${received} to be a valid AI response with content string`,
      pass: isValid
    };
  }
});

// Export test database for use in tests
export { globalTestDb as testDb };