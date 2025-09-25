/**
 * Test Utilities - Common testing helpers and mocks
 */

import { Request, Response, NextFunction } from 'express';
import { jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';
import { 
  TRPGCampaign, 
  TRPGCharacter, 
  TRPGSession,
  AIGameContext,
  ChatMessage 
} from '@ai-agent-trpg/types';

/**
 * Mock Express Request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    method: 'GET',
    url: '/',
    user: { id: 'test_user' },
    ...overrides
  };
}

/**
 * Mock Express Response object
 */
export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    locals: {}
  };
  return res;
}

/**
 * Mock Express NextFunction
 */
export function createMockNext(): NextFunction {
  return jest.fn();
}

/**
 * AI Provider Mocks
 */
export class AIProviderMocks {
  /**
   * Mock OpenAI response
   */
  static mockOpenAIResponse(content: string = 'Mock OpenAI response') {
    return {
      choices: [{
        message: {
          content,
          role: 'assistant' as const
        },
        finish_reason: 'stop' as const
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    };
  }

  /**
   * Mock Anthropic (Claude) response
   */
  static mockAnthropicResponse(content: string = 'Mock Claude response') {
    return {
      content: [{ text: content, type: 'text' as const }],
      id: 'mock_id',
      model: 'claude-3-sonnet-20240229',
      role: 'assistant' as const,
      stop_reason: 'end_turn' as const,
      stop_sequence: null,
      type: 'message' as const,
      usage: {
        input_tokens: 10,
        output_tokens: 20
      }
    };
  }

  /**
   * Mock Google (Gemini) response
   */
  static mockGoogleResponse(content: string = 'Mock Gemini response') {
    return {
      response: {
        text: () => content,
        candidates: [{
          content: {
            parts: [{ text: content }],
            role: 'model'
          },
          finishReason: 'STOP',
          index: 0
        }]
      }
    };
  }
}

/**
 * Database Test Utilities
 */
export class DatabaseTestUtils {
  /**
   * Insert test campaign into database
   */
  static insertTestCampaign(db: Database, campaign: TRPGCampaign): void {
    const stmt = db.prepare(`
      INSERT INTO campaigns (
        id, name, description, status, gm_id, settings,
        scenario_description, scenario_summary, base_scenario_illustration,
        created_at, updated_at, version, last_modified_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      campaign.id,
      campaign.name,
      campaign.description,
      campaign.status,
      campaign.gmId,
      JSON.stringify(campaign.settings),
      campaign.scenarioDescription,
      campaign.scenarioSummary,
      campaign.baseScenarioIllustration,
      campaign.createdAt.toISOString(),
      campaign.updatedAt.toISOString(),
      campaign.version,
      campaign.lastModifiedBy
    );
  }

  /**
   * Insert test character into database
   */
  static insertTestCharacter(db: Database, character: TRPGCharacter): void {
    const stmt = db.prepare(`
      INSERT INTO characters (
        id, campaign_id, name, type, description, stats, status,
        player_id, portrait_url, ai_personality, location_id,
        created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      character.id,
      character.campaignId,
      character.name,
      character.type,
      character.description,
      JSON.stringify(character.stats),
      character.status,
      character.playerId,
      character.portraitUrl,
      character.aiPersonality ? JSON.stringify(character.aiPersonality) : null,
      character.locationId,
      character.createdAt.toISOString(),
      character.updatedAt.toISOString(),
      character.version
    );
  }

  /**
   * Get campaign from database
   */
  static getCampaign(db: Database, campaignId: string): TRPGCampaign | null {
    const stmt = db.prepare('SELECT * FROM campaigns WHERE id = ?');
    const row = stmt.get(campaignId) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      gmId: row.gm_id,
      settings: JSON.parse(row.settings || '{}'),
      scenarioDescription: row.scenario_description,
      scenarioSummary: row.scenario_summary,
      baseScenarioIllustration: row.base_scenario_illustration,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      version: row.version,
      lastModifiedBy: row.last_modified_by
    };
  }

  /**
   * Get character from database
   */
  static getCharacter(db: Database, characterId: string): TRPGCharacter | null {
    const stmt = db.prepare('SELECT * FROM characters WHERE id = ?');
    const row = stmt.get(characterId) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      campaignId: row.campaign_id,
      name: row.name,
      type: row.type,
      description: row.description,
      stats: JSON.parse(row.stats || '{}'),
      status: row.status,
      playerId: row.player_id,
      portraitUrl: row.portrait_url,
      aiPersonality: row.ai_personality ? JSON.parse(row.ai_personality) : null,
      locationId: row.location_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      version: row.version
    };
  }

  /**
   * Count records in table
   */
  static countRecords(db: Database, tableName: string): number {
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
    const result = stmt.get() as { count: number };
    return result.count;
  }
}

/**
 * Async Test Utilities
 */
export class AsyncTestUtils {
  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) return;
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Mock async delay
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run function with timeout
   */
  static async withTimeout<T>(
    fn: () => Promise<T>,
    timeout: number = 10000
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }
}

/**
 * Validation Test Utilities
 */
export class ValidationTestUtils {
  /**
   * Validate TRPG Campaign structure
   */
  static validateCampaign(campaign: any): boolean {
    const requiredFields = ['id', 'name', 'status', 'createdAt', 'updatedAt'];
    return requiredFields.every(field => campaign && typeof campaign[field] !== 'undefined');
  }

  /**
   * Validate TRPG Character structure
   */
  static validateCharacter(character: any): boolean {
    const requiredFields = ['id', 'campaignId', 'name', 'type', 'stats'];
    return requiredFields.every(field => character && typeof character[field] !== 'undefined');
  }

  /**
   * Validate AI Response structure
   */
  static validateAIResponse(response: any): boolean {
    return response && 
           typeof response === 'object' && 
           typeof response.content === 'string' && 
           response.content.length > 0;
  }

  /**
   * Validate Chat Message structure
   */
  static validateChatMessage(message: any): boolean {
    const requiredFields = ['id', 'content', 'sender', 'timestamp'];
    return requiredFields.every(field => message && typeof message[field] !== 'undefined');
  }
}

/**
 * Environment Test Utilities
 */
export class EnvironmentTestUtils {
  /**
   * Set test environment variables
   */
  static setTestEnv(vars: Record<string, string>): void {
    Object.entries(vars).forEach(([key, value]) => {
      process.env[key] = value;
    });
  }

  /**
   * Clear test environment variables
   */
  static clearTestEnv(vars: string[]): void {
    vars.forEach(key => {
      delete process.env[key];
    });
  }

  /**
   * Mock environment for testing
   */
  static mockTestEnvironment(): void {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = ':memory:';
    process.env.LOG_LEVEL = 'error';
    
    // Clear API keys to prevent real API calls
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  }

  /**
   * Restore original environment
   */
  static restoreEnvironment(): void {
    // This would restore from backed up env vars if needed
    // For now, just ensure test state
    this.mockTestEnvironment();
  }
}

/**
 * Error Test Utilities
 */
export class ErrorTestUtils {
  /**
   * Create mock error for testing
   */
  static createMockError(message: string = 'Test error', code?: string): Error {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    return error;
  }

  /**
   * Test that function throws specific error
   */
  static async expectThrows(
    fn: () => Promise<any>,
    expectedMessage?: string
  ): Promise<Error> {
    try {
      await fn();
      throw new Error('Expected function to throw, but it did not');
    } catch (error) {
      if (expectedMessage && error instanceof Error) {
        expect(error.message).toContain(expectedMessage);
      }
      return error as Error;
    }
  }
}

// Export all utilities
export {
  createMockRequest,
  createMockResponse,
  createMockNext,
  AIProviderMocks,
  DatabaseTestUtils,
  AsyncTestUtils,
  ValidationTestUtils,
  EnvironmentTestUtils,
  ErrorTestUtils
};