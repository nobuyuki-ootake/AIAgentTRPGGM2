/**
 * Sample Unit Test - Demonstrates test setup usage
 * t-WADA naming convention: sample.unit.test.ts
 * 
 * This file demonstrates how to use the comprehensive Jest setup
 * for testing backend services with production types
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import type { Database } from 'better-sqlite3';
import { 
  TestDataFactory,
  DatabaseTestUtils,
  createMockRequest,
  createMockResponse,
  AIProviderMocks,
  ValidationTestUtils
} from './setup';
import type { TRPGCampaign, TRPGCharacter } from '@ai-agent-trpg/types';

describe('Sample Unit Tests - Test Setup Demonstration', () => {
  let testDb: Database;

  beforeEach(() => {
    // Test database is available globally from jest.setup.ts
    testDb = global.testDb;
  });

  describe('Database Test Utilities', () => {
    test('should create and retrieve test campaign using production types', () => {
      // Create test campaign using production types
      const testCampaign = TestDataFactory.createTestCampaign({
        name: 'Unit Test Campaign',
        status: 'active'
      });

      // Insert into test database
      DatabaseTestUtils.insertTestCampaign(testDb, testCampaign);

      // Retrieve and verify
      const retrievedCampaign = DatabaseTestUtils.getCampaign(testDb, testCampaign.id);
      
      expect(retrievedCampaign).not.toBeNull();
      expect(retrievedCampaign?.name).toBe('Unit Test Campaign');
      expect(retrievedCampaign?.status).toBe('active');
      expect(retrievedCampaign).toBeValidTRPGCampaign();
    });

    test('should create and retrieve test character using production types', () => {
      // First create a campaign
      const testCampaign = TestDataFactory.createTestCampaign();
      DatabaseTestUtils.insertTestCampaign(testDb, testCampaign);

      // Create test character
      const testCharacter = TestDataFactory.createTestCharacter(testCampaign.id, {
        name: 'Test Hero',
        type: 'PC',
        stats: {
          level: 5,
          hp: 150,
          mp: 75,
          strength: 15,
          dexterity: 12,
          constitution: 14,
          intelligence: 13,
          wisdom: 11,
          charisma: 16
        }
      });

      // Insert into test database
      DatabaseTestUtils.insertTestCharacter(testDb, testCharacter);

      // Retrieve and verify
      const retrievedCharacter = DatabaseTestUtils.getCharacter(testDb, testCharacter.id);
      
      expect(retrievedCharacter).not.toBeNull();
      expect(retrievedCharacter?.name).toBe('Test Hero');
      expect(retrievedCharacter?.type).toBe('PC');
      expect(retrievedCharacter?.stats.level).toBe(5);
      expect(retrievedCharacter).toBeValidTRPGCharacter();
    });

    test('should handle database record counting', () => {
      // Initially empty
      expect(DatabaseTestUtils.countRecords(testDb, 'campaigns')).toBe(1); // Default test campaign from setup

      // Add more campaigns
      const campaign1 = TestDataFactory.createTestCampaign({ name: 'Campaign 1' });
      const campaign2 = TestDataFactory.createTestCampaign({ name: 'Campaign 2' });
      
      DatabaseTestUtils.insertTestCampaign(testDb, campaign1);
      DatabaseTestUtils.insertTestCampaign(testDb, campaign2);

      expect(DatabaseTestUtils.countRecords(testDb, 'campaigns')).toBe(3);
    });
  });

  describe('Mock Utilities', () => {
    test('should create mock Express request and response', () => {
      const mockReq = createMockRequest({
        method: 'POST',
        body: { campaignId: 'test-campaign-123' },
        params: { id: 'test-id' }
      });

      const mockRes = createMockResponse();

      expect(mockReq.method).toBe('POST');
      expect(mockReq.body.campaignId).toBe('test-campaign-123');
      expect(mockReq.params?.id).toBe('test-id');
      expect(mockRes.status).toBeDefined();
      expect(mockRes.json).toBeDefined();
    });
  });

  describe('AI Provider Mocks', () => {
    test('should provide OpenAI mock response', () => {
      const mockResponse = AIProviderMocks.mockOpenAIResponse('Test AI response content');
      
      expect(mockResponse.choices).toHaveLength(1);
      expect(mockResponse.choices[0].message.content).toBe('Test AI response content');
      expect(mockResponse.choices[0].message.role).toBe('assistant');
      expect(mockResponse.usage).toBeDefined();
    });

    test('should provide Anthropic mock response', () => {
      const mockResponse = AIProviderMocks.mockAnthropicResponse('Test Claude response');
      
      expect(mockResponse.content).toHaveLength(1);
      expect(mockResponse.content[0].text).toBe('Test Claude response');
      expect(mockResponse.role).toBe('assistant');
      expect(mockResponse.usage).toBeDefined();
    });

    test('should provide Google mock response', () => {
      const mockResponse = AIProviderMocks.mockGoogleResponse('Test Gemini response');
      
      expect(mockResponse.response.text()).toBe('Test Gemini response');
      expect(mockResponse.response.candidates).toHaveLength(1);
    });
  });

  describe('Validation Utilities', () => {
    test('should validate TRPG entities correctly', () => {
      const validCampaign = TestDataFactory.createTestCampaign();
      const validCharacter = TestDataFactory.createTestCharacter('test-campaign-id');
      
      expect(ValidationTestUtils.validateCampaign(validCampaign)).toBe(true);
      expect(ValidationTestUtils.validateCharacter(validCharacter)).toBe(true);
      
      // Test invalid entities
      expect(ValidationTestUtils.validateCampaign({})).toBe(false);
      expect(ValidationTestUtils.validateCharacter({ name: 'incomplete' })).toBe(false);
    });

    test('should validate AI responses correctly', () => {
      const validResponse = { content: 'Valid AI response' };
      const invalidResponse = { data: 'no content field' };
      
      expect(ValidationTestUtils.validateAIResponse(validResponse)).toBe(true);
      expect(ValidationTestUtils.validateAIResponse(invalidResponse)).toBe(false);
      expect(validResponse).toBeValidAIResponse();
    });
  });

  describe('Custom Jest Matchers', () => {
    test('should use custom toBeValidTRPGCampaign matcher', () => {
      const campaign = TestDataFactory.createTestCampaign();
      expect(campaign).toBeValidTRPGCampaign();
      
      const invalidCampaign = { name: 'incomplete' };
      expect(invalidCampaign).not.toBeValidTRPGCampaign();
    });

    test('should use custom toBeValidTRPGCharacter matcher', () => {
      const character = TestDataFactory.createTestCharacter('test-campaign-id');
      expect(character).toBeValidTRPGCharacter();
      
      const invalidCharacter = { name: 'incomplete' };
      expect(invalidCharacter).not.toBeValidTRPGCharacter();
    });

    test('should use custom toBeValidAIResponse matcher', () => {
      const response = { content: 'Valid response' };
      expect(response).toBeValidAIResponse();
      
      const invalidResponse = {};
      expect(invalidResponse).not.toBeValidAIResponse();
    });
  });

  describe('Environment and Timeout Testing', () => {
    test('should run in test environment', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.DATABASE_URL).toBe(':memory:');
    });

    test('should handle test timeouts properly', async () => {
      // This test verifies our 30-second timeout configuration
      const quickOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'completed';
      };

      const result = await quickOperation();
      expect(result).toBe('completed');
    }, 30000); // Should complete well within timeout
  });
});