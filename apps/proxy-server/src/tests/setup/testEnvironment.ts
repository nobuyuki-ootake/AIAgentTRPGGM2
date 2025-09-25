/**
 * Test Environment Configuration
 * Manages test environment isolation and configuration
 */

import { jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';
import { testDatabase, TestDataFactory } from './testDatabase';
import { EnvironmentTestUtils } from '../utils/testUtils';

/**
 * Test Environment Manager
 * Handles setup and teardown of isolated test environments
 */
export class TestEnvironment {
  private static instances: Map<string, TestEnvironment> = new Map();
  private db: Database | null = null;
  private envBackup: Record<string, string | undefined> = {};
  
  constructor(private testId: string) {
    TestEnvironment.instances.set(testId, this);
  }

  /**
   * Initialize test environment
   */
  async setup(): Promise<void> {
    // Backup current environment
    this.backupEnvironment();
    
    // Set test environment
    EnvironmentTestUtils.mockTestEnvironment();
    
    // Create test database
    this.db = testDatabase.createTestDatabase(this.testId);
    
    // Setup test data if needed
    await this.setupTestData();
    
    // Configure mocks
    this.setupMocks();
  }

  /**
   * Clean up test environment
   */
  async teardown(): Promise<void> {
    // Restore mocks
    jest.restoreAllMocks();
    
    // Close database
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    // Restore environment
    this.restoreEnvironment();
    
    // Remove from instances
    TestEnvironment.instances.delete(this.testId);
  }

  /**
   * Get test database instance
   */
  getDatabase(): Database {
    if (!this.db) {
      throw new Error('Test database not initialized. Call setup() first.');
    }
    return this.db;
  }

  /**
   * Reset test environment to clean state
   */
  async reset(): Promise<void> {
    if (this.db) {
      testDatabase.resetDatabase(this.db);
      await this.setupTestData();
    }
    
    // Clear all mocks
    jest.clearAllMocks();
  }

  /**
   * Setup initial test data
   */
  private async setupTestData(): Promise<void> {
    if (!this.db) return;

    // Create a default test campaign for most tests
    const defaultCampaign = TestDataFactory.createTestCampaign({
      id: 'default_test_campaign',
      name: 'Default Test Campaign'
    });

    const stmt = this.db.prepare(`
      INSERT INTO campaigns (
        id, name, description, status, gm_id, settings,
        scenario_description, scenario_summary, base_scenario_illustration,
        created_at, updated_at, version, last_modified_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      defaultCampaign.id,
      defaultCampaign.name,
      defaultCampaign.description,
      defaultCampaign.status,
      defaultCampaign.gmId,
      JSON.stringify(defaultCampaign.settings),
      defaultCampaign.scenarioDescription,
      defaultCampaign.scenarioSummary,
      defaultCampaign.baseScenarioIllustration,
      defaultCampaign.createdAt.toISOString(),
      defaultCampaign.updatedAt.toISOString(),
      defaultCampaign.version,
      defaultCampaign.lastModifiedBy
    );
  }

  /**
   * Setup test-specific mocks
   */
  private setupMocks(): void {
    // Mock console to reduce test noise but keep errors
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Keep console.error for debugging

    // Mock Date.now for consistent timestamps in tests
    const mockDate = new Date('2024-01-01T00:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());

    // Mock Math.random for predictable IDs
    let randomCounter = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => {
      randomCounter++;
      return randomCounter / 1000; // Predictable but unique values
    });
  }

  /**
   * Backup current environment variables
   */
  private backupEnvironment(): void {
    const keysToBackup = [
      'NODE_ENV',
      'DATABASE_URL',
      'LOG_LEVEL',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GOOGLE_API_KEY',
      'JWT_SECRET',
      'PORT'
    ];

    keysToBackup.forEach(key => {
      this.envBackup[key] = process.env[key];
    });
  }

  /**
   * Restore environment variables
   */
  private restoreEnvironment(): void {
    Object.entries(this.envBackup).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }

  /**
   * Create test environment for specific test
   */
  static async create(testId: string): Promise<TestEnvironment> {
    const env = new TestEnvironment(testId);
    await env.setup();
    return env;
  }

  /**
   * Get existing test environment
   */
  static get(testId: string): TestEnvironment | undefined {
    return TestEnvironment.instances.get(testId);
  }

  /**
   * Clean up all test environments
   */
  static async cleanupAll(): Promise<void> {
    const promises = Array.from(TestEnvironment.instances.values()).map(env => env.teardown());
    await Promise.all(promises);
    TestEnvironment.instances.clear();
  }
}

/**
 * Test Environment Decorator
 * Use this to automatically setup/teardown test environments
 */
export function withTestEnvironment(testId?: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const envId = testId || `${target.constructor.name}_${propertyKey}`;

    descriptor.value = async function(...args: any[]) {
      const env = await TestEnvironment.create(envId);
      
      try {
        return await originalMethod.apply(this, [...args, env]);
      } finally {
        await env.teardown();
      }
    };

    return descriptor;
  };
}

/**
 * Test Suite Environment Manager
 * Manages environment for entire test suites
 */
export class TestSuiteEnvironment {
  private static suiteEnv: TestEnvironment | null = null;

  /**
   * Setup environment for test suite
   */
  static async setupSuite(suiteId: string): Promise<TestEnvironment> {
    if (TestSuiteEnvironment.suiteEnv) {
      throw new Error('Test suite environment already initialized');
    }

    TestSuiteEnvironment.suiteEnv = await TestEnvironment.create(suiteId);
    return TestSuiteEnvironment.suiteEnv;
  }

  /**
   * Get current suite environment
   */
  static getSuite(): TestEnvironment {
    if (!TestSuiteEnvironment.suiteEnv) {
      throw new Error('Test suite environment not initialized');
    }
    return TestSuiteEnvironment.suiteEnv;
  }

  /**
   * Reset suite environment
   */
  static async resetSuite(): Promise<void> {
    if (TestSuiteEnvironment.suiteEnv) {
      await TestSuiteEnvironment.suiteEnv.reset();
    }
  }

  /**
   * Teardown suite environment
   */
  static async teardownSuite(): Promise<void> {
    if (TestSuiteEnvironment.suiteEnv) {
      await TestSuiteEnvironment.suiteEnv.teardown();
      TestSuiteEnvironment.suiteEnv = null;
    }
  }
}

// Export convenience functions
export const createTestEnvironment = TestEnvironment.create;
export const getTestEnvironment = TestEnvironment.get;
export const cleanupAllTestEnvironments = TestEnvironment.cleanupAll;