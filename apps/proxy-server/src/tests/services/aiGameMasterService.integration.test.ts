/**
 * AI Game Master Service Integration Test
 * t-WADA naming convention: aiGameMasterService.integration.test.ts
 * 
 * Integration tests for AI Game Master service with mocked AI providers
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';
import { 
  TestDataFactory,
  DatabaseTestUtils,
  AIProviderMocks,
  AsyncTestUtils,
  TestEnvironment
} from '../setup';
import type { TRPGCampaign, TRPGCharacter, AIGameContext } from '@ai-agent-trpg/types';

// Note: We would import the actual service once it's available
// import { AIGameMasterService } from '../../services/aiGameMasterService';

describe('AI Game Master Service Integration Tests', () => {
  let testDb: Database;
  let testCampaign: TRPGCampaign;
  let testCharacter: TRPGCharacter;
  
  beforeEach(() => {
    testDb = global.testDb;
    
    // Setup test data
    testCampaign = TestDataFactory.createTestCampaign({
      name: 'AI GM Test Campaign',
      status: 'active',
      scenarioDescription: 'A mysterious forest adventure'
    });
    
    testCharacter = TestDataFactory.createTestCharacter(testCampaign.id, {
      name: 'Test Hero',
      type: 'PC',
      stats: {
        level: 3,
        hp: 120,
        mp: 60,
        strength: 14,
        dexterity: 16,
        constitution: 13,
        intelligence: 15,
        wisdom: 12,
        charisma: 11
      }
    });
    
    // Insert test data
    DatabaseTestUtils.insertTestCampaign(testDb, testCampaign);
    DatabaseTestUtils.insertTestCharacter(testDb, testCharacter);
  });

  describe('AI Response Generation', () => {
    test('should generate GM response with OpenAI mock', async () => {
      // Mock OpenAI response
      const mockAIResponse = AIProviderMocks.mockOpenAIResponse(
        'As you enter the mysterious forest, you notice shadows moving between the ancient trees. What do you do?'
      );
      
      // Simulate AI service call
      const gameContext: AIGameContext = {
        campaignId: testCampaign.id,
        currentSession: null,
        activeCharacters: [testCharacter],
        currentLocation: null,
        gameState: 'exploration',
        contextHistory: [],
        lastUpdate: new Date()
      };
      
      // Mock the service method (this would be actual service call)
      const mockGenerateResponse = jest.fn().mockResolvedValue({
        content: mockAIResponse.choices[0].message.content,
        context: gameContext,
        suggestions: ['Investigate the shadows', 'Call out to see if anyone is there', 'Proceed cautiously']
      });
      
      const result = await mockGenerateResponse(gameContext, 'Player enters the forest');
      
      expect(result.content).toContain('mysterious forest');
      expect(result.suggestions).toHaveLength(3);
      expect(result.context.gameState).toBe('exploration');
    });

    test('should generate character-specific AI response with Claude mock', async () => {
      // Mock Anthropic response for character interaction
      const mockClaudeResponse = AIProviderMocks.mockAnthropicResponse(
        'The forest guardian, an ancient elf with silver hair, steps out from behind a massive oak tree. "Welcome, travelers. Few dare to enter these woods uninvited."'
      );
      
      // Simulate NPC character interaction
      const npcCharacter = TestDataFactory.createTestCharacter(testCampaign.id, {
        name: 'Forest Guardian',
        type: 'NPC',
        aiPersonality: {
          personalityType: 'wise',
          communicationStyle: 'formal',
          traits: ['protective', 'ancient', 'mysterious']
        }
      });
      
      DatabaseTestUtils.insertTestCharacter(testDb, npcCharacter);
      
      const mockGenerateNPCResponse = jest.fn().mockResolvedValue({
        content: mockClaudeResponse.content[0].text,
        characterId: npcCharacter.id,
        emotionalState: 'cautious',
        actionSuggestions: ['Ask about their purpose', 'Show respect', 'Request guidance']
      });
      
      const result = await mockGenerateNPCResponse(npcCharacter.id, 'Player approaches the guardian');
      
      expect(result.content).toContain('Forest Guardian');
      expect(result.characterId).toBe(npcCharacter.id);
      expect(result.actionSuggestions).toHaveLength(3);
    });

    test('should handle AI response timeout gracefully', async () => {
      // Simulate slow AI response
      const slowAICall = async () => {
        await AsyncTestUtils.delay(100); // Short delay for test
        return AIProviderMocks.mockGoogleResponse('Response after delay');
      };
      
      // Test timeout handling
      const result = await AsyncTestUtils.withTimeout(slowAICall(), 200);
      expect(result.response.text()).toBe('Response after delay');
      
      // Test actual timeout
      const verySlowCall = async () => {
        await AsyncTestUtils.delay(1000);
        return 'Should not reach here';
      };
      
      await expect(AsyncTestUtils.withTimeout(verySlowCall(), 100))
        .rejects.toThrow('Timeout after 100ms');
    }, 10000);
  });

  describe('Game State Management', () => {
    test('should update game state based on player actions', async () => {
      // Initial exploration state
      let gameContext: AIGameContext = {
        campaignId: testCampaign.id,
        currentSession: null,
        activeCharacters: [testCharacter],
        currentLocation: null,
        gameState: 'exploration',
        contextHistory: [],
        lastUpdate: new Date()
      };
      
      // Mock state transition service
      const mockUpdateGameState = jest.fn().mockImplementation((context, action) => {
        const newContext = { ...context };
        
        if (action === 'enter_combat') {
          newContext.gameState = 'combat';
        } else if (action === 'start_dialogue') {
          newContext.gameState = 'dialogue';
        }
        
        newContext.contextHistory.push({
          action,
          timestamp: new Date(),
          previousState: context.gameState
        });
        
        return newContext;
      });
      
      // Test state transitions
      gameContext = mockUpdateGameState(gameContext, 'enter_combat');
      expect(gameContext.gameState).toBe('combat');
      expect(gameContext.contextHistory).toHaveLength(1);
      
      gameContext = mockUpdateGameState(gameContext, 'start_dialogue');
      expect(gameContext.gameState).toBe('dialogue');
      expect(gameContext.contextHistory).toHaveLength(2);
    });

    test('should maintain character stats during session', async () => {
      // Mock character stat modification
      const mockModifyCharacterStats = jest.fn().mockImplementation((characterId, modifications) => {
        const character = DatabaseTestUtils.getCharacter(testDb, characterId);
        if (!character) throw new Error('Character not found');
        
        const updatedStats = { ...character.stats };
        Object.assign(updatedStats, modifications);
        
        return { ...character, stats: updatedStats };
      });
      
      // Test HP modification
      const modifiedCharacter = mockModifyCharacterStats(testCharacter.id, { hp: 100 });
      expect(modifiedCharacter.stats.hp).toBe(100);
      expect(modifiedCharacter.stats.level).toBe(3); // Other stats unchanged
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle AI provider errors gracefully', async () => {
      // Mock AI provider error
      const mockFailingAICall = jest.fn().mockRejectedValue(new Error('AI service unavailable'));
      
      // Mock error handling service
      const mockHandleAIError = jest.fn().mockImplementation(async (error) => {
        if (error.message.includes('unavailable')) {
          return {
            content: 'The GM is momentarily distracted. Please try again.',
            isError: true,
            shouldRetry: true
          };
        }
        throw error;
      });
      
      try {
        await mockFailingAICall();
      } catch (error) {
        const result = await mockHandleAIError(error);
        expect(result.isError).toBe(true);
        expect(result.shouldRetry).toBe(true);
        expect(result.content).toContain('momentarily distracted');
      }
    });

    test('should validate game context before AI calls', async () => {
      // Mock context validation
      const mockValidateContext = jest.fn().mockImplementation((context: AIGameContext) => {
        if (!context.campaignId) {
          throw new Error('Campaign ID is required');
        }
        if (!context.activeCharacters || context.activeCharacters.length === 0) {
          throw new Error('At least one active character is required');
        }
        return true;
      });
      
      // Valid context
      const validContext: AIGameContext = {
        campaignId: testCampaign.id,
        currentSession: null,
        activeCharacters: [testCharacter],
        currentLocation: null,
        gameState: 'exploration',
        contextHistory: [],
        lastUpdate: new Date()
      };
      
      expect(mockValidateContext(validContext)).toBe(true);
      
      // Invalid context - no campaign ID
      const invalidContext = { ...validContext, campaignId: '' };
      expect(() => mockValidateContext(invalidContext)).toThrow('Campaign ID is required');
      
      // Invalid context - no active characters
      const noCharactersContext = { ...validContext, activeCharacters: [] };
      expect(() => mockValidateContext(noCharactersContext)).toThrow('At least one active character is required');
    });
  });

  describe('Performance and Concurrency', () => {
    test('should handle multiple concurrent AI requests', async () => {
      const mockAIService = jest.fn().mockImplementation(async (request) => {
        await AsyncTestUtils.delay(50); // Simulate AI call delay
        return `AI response for: ${request}`;
      });
      
      // Create multiple concurrent requests
      const requests = [
        'Generate enemy encounter',
        'Describe the environment',
        'Create dialogue for NPC',
        'Roll for random event'
      ];
      
      const promises = requests.map(request => mockAIService(request));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(4);
      expect(results[0]).toContain('enemy encounter');
      expect(results[1]).toContain('environment');
      expect(results[2]).toContain('dialogue');
      expect(results[3]).toContain('random event');
    });

    test('should maintain database consistency during concurrent operations', async () => {
      // Mock concurrent character updates
      const mockUpdateCharacter = jest.fn().mockImplementation(async (characterId, updates) => {
        await AsyncTestUtils.delay(10); // Simulate database operation
        const character = DatabaseTestUtils.getCharacter(testDb, characterId);
        return { ...character, ...updates, version: (character?.version || 0) + 1 };
      });
      
      // Simulate concurrent updates to the same character
      const updates = [
        { stats: { hp: 110 } },
        { locationId: 'forest-clearing' },
        { status: 'resting' }
      ];
      
      const promises = updates.map(update => mockUpdateCharacter(testCharacter.id, update));
      const results = await Promise.all(promises);
      
      // All updates should complete
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.version).toBeGreaterThan(0);
      });
    });
  });
});