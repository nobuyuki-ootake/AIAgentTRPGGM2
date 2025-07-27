/**
 * aiService Unit Tests
 * Tests for AI Integration Service (Facade Pattern)
 * t-WADA naming convention: aiService.unit.test.ts
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';
import { getAIService } from './aiService';
import * as aiProviderServiceModule from './aiProviderService';
import * as aiContentGenerationServiceModule from './aiContentGenerationService';
import * as aiUtilsServiceModule from './aiUtilsService';
import type { TRPGCampaign, TRPGCharacter } from '@ai-agent-trpg/types';
import { TestDataFactory } from '../tests/setup';

// Mock the dependent services
jest.mock('./aiProviderService');
jest.mock('./aiContentGenerationService');
jest.mock('./aiUtilsService');
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('AIService - AI Integration Service (Facade)', () => {
  let aiService: ReturnType<typeof getAIService>;
  let mockAiProviderService: jest.Mocked<typeof aiProviderServiceModule.aiProviderService>;
  let mockAiContentGenerationService: jest.Mocked<typeof aiContentGenerationServiceModule.aiContentGenerationService>;
  let mockAiUtilsService: jest.Mocked<typeof aiUtilsServiceModule.aiUtilsService>;
  let testDb: Database;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get service instance
    aiService = getAIService();
    
    // Setup mocked services
    mockAiProviderService = aiProviderServiceModule.aiProviderService as jest.Mocked<typeof aiProviderServiceModule.aiProviderService>;
    mockAiContentGenerationService = aiContentGenerationServiceModule.aiContentGenerationService as jest.Mocked<typeof aiContentGenerationServiceModule.aiContentGenerationService>;
    mockAiUtilsService = aiUtilsServiceModule.aiUtilsService as jest.Mocked<typeof aiUtilsServiceModule.aiUtilsService>;
    
    // Use global test database
    testDb = global.testDb;
  });

  describe('Provider Management - Delegated to aiProviderService', () => {
    test('should delegate testProviderConnection to aiProviderService', async () => {
      // Arrange
      const provider = 'openai';
      const apiKey = 'test-api-key';
      const model = 'gpt-3.5-turbo';
      mockAiProviderService.testProviderConnection.mockResolvedValue(true);

      // Act
      const result = await aiService.testProviderConnection(provider, apiKey, model);

      // Assert
      expect(mockAiProviderService.testProviderConnection).toHaveBeenCalledWith(provider, apiKey, model);
      expect(result).toBe(true);
    });

    test('should handle provider connection failure', async () => {
      // Arrange
      const provider = 'anthropic';
      const apiKey = 'invalid-api-key';
      mockAiProviderService.testProviderConnection.mockResolvedValue(false);

      // Act
      const result = await aiService.testProviderConnection(provider, apiKey);

      // Assert
      expect(mockAiProviderService.testProviderConnection).toHaveBeenCalledWith(provider, apiKey, undefined);
      expect(result).toBe(false);
    });
  });

  describe('Campaign and GM Support - Delegated to aiUtilsService', () => {
    test('should delegate getCampaignCreationAssistance to aiUtilsService', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign();
      const params = {
        provider: 'openai',
        apiKey: 'test-api-key',
        campaignBasics: {
          name: testCampaign.name,
          description: testCampaign.description
        },
        worldSettings: { genre: 'fantasy' }
      };
      const mockResponse = {
        suggestions: ['Add more NPCs', 'Define quest objectives'],
        generatedContent: { scenarioOutline: 'Epic fantasy adventure' }
      };
      mockAiUtilsService.getCampaignCreationAssistance.mockResolvedValue(mockResponse);

      // Act
      const result = await aiService.getCampaignCreationAssistance(params);

      // Assert
      expect(mockAiUtilsService.getCampaignCreationAssistance).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResponse);
    });

    test('should delegate getGMAssistance to aiUtilsService', async () => {
      // Arrange
      const params = {
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        assistanceType: 'npc-dialogue',
        sessionState: {
          currentScene: 'tavern',
          activeNPCs: ['bartender']
        },
        playerAction: 'Player asks about local rumors'
      };
      const mockResponse = {
        suggestion: 'The bartender leans in and whispers about strange happenings',
        narrativeText: 'The tavern grows quiet as the bartender speaks...'
      };
      mockAiUtilsService.getGMAssistance.mockResolvedValue(mockResponse);

      // Act
      const result = await aiService.getGMAssistance(params);

      // Assert
      expect(mockAiUtilsService.getGMAssistance).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResponse);
    });

    test('should delegate getRulesAssistance to aiUtilsService', async () => {
      // Arrange
      const params = {
        provider: 'google',
        gameSystem: 'D&D 5e',
        situation: 'combat',
        question: 'How does sneak attack work?',
        context: { characterClass: 'rogue' }
      };
      const mockResponse = {
        answer: 'Sneak attack adds extra damage when you have advantage...',
        references: ['PHB p.96']
      };
      mockAiUtilsService.getRulesAssistance.mockResolvedValue(mockResponse);

      // Act
      const result = await aiService.getRulesAssistance(params);

      // Assert
      expect(mockAiUtilsService.getRulesAssistance).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResponse);
    });

    test('should delegate chat to aiUtilsService', async () => {
      // Arrange
      const params = {
        provider: 'openai',
        message: 'Tell me about the ancient ruins',
        persona: 'wise sage',
        conversationHistory: [
          { role: 'user', content: 'Where are the ruins?' },
          { role: 'assistant', content: 'In the northern mountains...' }
        ]
      };
      const mockResponse = {
        response: 'The ancient ruins hold many secrets...',
        tokensUsed: 150
      };
      mockAiUtilsService.chat.mockResolvedValue(mockResponse);

      // Act
      const result = await aiService.chat(params);

      // Assert
      expect(mockAiUtilsService.chat).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResponse);
    });

    test('should delegate getUsageStats to aiUtilsService', async () => {
      // Arrange
      const mockStats = {
        totalRequests: 1000,
        tokensByProvider: {
          openai: 50000,
          anthropic: 30000,
          google: 20000
        },
        costEstimate: 5.50
      };
      mockAiUtilsService.getUsageStats.mockResolvedValue(mockStats);

      // Act
      const result = await aiService.getUsageStats();

      // Assert
      expect(mockAiUtilsService.getUsageStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('Content Generation - Delegated to aiContentGenerationService', () => {
    test('should delegate generateCharacter to aiContentGenerationService', async () => {
      // Arrange
      const params = {
        provider: 'anthropic',
        characterType: 'NPC' as const,
        characterBasics: {
          name: 'Eldrin',
          role: 'merchant'
        },
        campaignContext: { genre: 'fantasy', location: 'market' }
      };
      const mockCharacter = TestDataFactory.createTestCharacter('test-campaign-id', {
        name: 'Eldrin',
        type: 'NPC',
        description: 'A shrewd merchant with connections'
      });
      mockAiContentGenerationService.generateCharacter.mockResolvedValue({
        character: mockCharacter,
        generationMetadata: { tokensUsed: 500 }
      });

      // Act
      const result = await aiService.generateCharacter(params);

      // Assert
      expect(mockAiContentGenerationService.generateCharacter).toHaveBeenCalledWith(params);
      expect(result.character.name).toBe('Eldrin');
      expect(result.character.type).toBe('NPC');
    });

    test('should delegate generateEvent to aiContentGenerationService', async () => {
      // Arrange
      const params = {
        provider: 'google',
        eventType: 'random-encounter',
        campaignContext: { location: 'forest', timeOfDay: 'night' },
        difficulty: 'medium'
      };
      const mockEvent = {
        eventData: {
          type: 'combat',
          description: 'Bandits ambush the party',
          enemies: ['Bandit Leader', 'Bandit x3']
        }
      };
      mockAiContentGenerationService.generateEvent.mockResolvedValue(mockEvent);

      // Act
      const result = await aiService.generateEvent(params);

      // Assert
      expect(mockAiContentGenerationService.generateEvent).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockEvent);
    });

    test('should delegate generateNPCBehavior to aiContentGenerationService', async () => {
      // Arrange
      const params = {
        provider: 'openai',
        npcId: 'npc-123',
        npcData: {
          name: 'Guard Captain',
          personality: 'stern but fair'
        },
        situation: 'Player caught sneaking',
        playerActions: ['Player tries to talk their way out'],
        campaignContext: { location: 'city gates' }
      };
      const mockBehavior = {
        action: 'interrogate',
        dialogue: 'Halt! State your business in the city.',
        emotionalState: 'suspicious'
      };
      mockAiContentGenerationService.generateNPCBehavior.mockResolvedValue(mockBehavior);

      // Act
      const result = await aiService.generateNPCBehavior(params);

      // Assert
      expect(mockAiContentGenerationService.generateNPCBehavior).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockBehavior);
    });

    test('should delegate generateMilestones to aiContentGenerationService', async () => {
      // Arrange
      const params = {
        provider: 'anthropic',
        campaignContext: { genre: 'mystery', setting: 'victorian' },
        sessionDuration: { hours: 4 },
        themeAdaptation: { focus: 'investigation' },
        entityPool: { npcs: 10, clues: 15 },
        milestoneCount: 5
      };
      const mockMilestones = {
        milestones: [
          { id: 'm1', title: 'Discover the first clue', trigger: 'investigation' },
          { id: 'm2', title: 'Interview key witness', trigger: 'dialogue' }
        ]
      };
      mockAiContentGenerationService.generateMilestones.mockResolvedValue(mockMilestones);

      // Act
      const result = await aiService.generateMilestones(params);

      // Assert
      expect(mockAiContentGenerationService.generateMilestones).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockMilestones);
    });
  });

  describe('Theme and Difficulty Management - Delegated to aiUtilsService', () => {
    test('should delegate performThemeAdaptation to aiUtilsService', async () => {
      // Arrange
      const params = {
        provider: 'google',
        themeId: 'horror-survival',
        campaignContext: { setting: 'abandoned mansion' },
        sessionDuration: { hours: 3 },
        playerPreferences: { combatLevel: 'low', puzzleLevel: 'high' }
      };
      const mockAdaptation = {
        adaptedTheme: 'psychological horror',
        recommendations: ['Focus on atmosphere', 'Use environmental storytelling']
      };
      mockAiUtilsService.performThemeAdaptation.mockResolvedValue(mockAdaptation);

      // Act
      const result = await aiService.performThemeAdaptation(params);

      // Assert
      expect(mockAiUtilsService.performThemeAdaptation).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockAdaptation);
    });

    test('should delegate calculateDynamicDifficulty to aiUtilsService', async () => {
      // Arrange
      const params = {
        provider: 'openai',
        playerPerformance: {
          combatWinRate: 0.8,
          puzzleSolveRate: 0.6
        },
        sessionProgress: { completedEncounters: 3, totalEncounters: 10 },
        targetBalance: { challengeLevel: 'moderate' }
      };
      const mockDifficulty = {
        adjustedDifficulty: 'hard',
        modifiers: { enemyHP: 1.2, puzzleComplexity: 1.1 }
      };
      mockAiUtilsService.calculateDynamicDifficulty.mockResolvedValue(mockDifficulty);

      // Act
      const result = await aiService.calculateDynamicDifficulty(params);

      // Assert
      expect(mockAiUtilsService.calculateDynamicDifficulty).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockDifficulty);
    });
  });

  describe('Player Interaction - Delegated to aiUtilsService', () => {
    test('should delegate interpretPlayerChoice to aiUtilsService', async () => {
      // Arrange
      const params = {
        provider: 'anthropic',
        playerInput: 'I want to sneak past the guards',
        availableChoices: [
          { id: '1', action: 'fight' },
          { id: '2', action: 'stealth' },
          { id: '3', action: 'negotiate' }
        ],
        context: { location: 'castle entrance' }
      };
      const mockInterpretation = {
        selectedChoice: { id: '2', action: 'stealth' },
        confidence: 0.95,
        reasoning: 'Player expressed intent to avoid detection'
      };
      mockAiUtilsService.interpretPlayerChoice.mockResolvedValue(mockInterpretation);

      // Act
      const result = await aiService.interpretPlayerChoice(params);

      // Assert
      expect(mockAiUtilsService.interpretPlayerChoice).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockInterpretation);
    });

    test('should delegate evaluatePlayerSolution to aiUtilsService', async () => {
      // Arrange
      const params = {
        provider: 'google',
        playerSolution: 'Use the mirror to reflect sunlight and blind the monster',
        challengeContext: {
          challenge: 'Defeat the light-sensitive creature',
          availableItems: ['mirror', 'torch', 'rope']
        },
        difficultySettings: { creativityBonus: true }
      };
      const mockEvaluation = {
        success: true,
        creativity: 0.9,
        narrativeOutcome: 'The creature recoils from the blinding light...'
      };
      mockAiUtilsService.evaluatePlayerSolution.mockResolvedValue(mockEvaluation);

      // Act
      const result = await aiService.evaluatePlayerSolution(params);

      // Assert
      expect(mockAiUtilsService.evaluatePlayerSolution).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockEvaluation);
    });
  });

  describe('Unimplemented Methods - Future Expansion', () => {
    test('should warn when calling generateTaskFromChoice (not yet implemented)', async () => {
      // Arrange
      const params = {
        provider: 'openai',
        selectedChoice: { id: '1', action: 'investigate' },
        eventContext: { location: 'library' },
        playerContext: { skills: ['perception', 'investigation'] }
      };

      // Act
      const result = await aiService.generateTaskFromChoice(params);

      // Assert
      expect(result).toEqual({
        taskData: 'Not implemented',
        generatedTask: {}
      });
    });

    test('should warn when calling generateResultNarrative (not yet implemented)', async () => {
      // Arrange
      const params = {
        provider: 'anthropic',
        taskResult: { success: true, criticalSuccess: false },
        playerActions: ['rolled high on investigation'],
        eventOutcome: { discovered: 'hidden compartment' }
      };

      // Act
      const result = await aiService.generateResultNarrative(params);

      // Assert
      expect(result).toEqual({
        narrativeData: 'Not implemented',
        generatedNarrative: {}
      });
    });

    test('should warn when calling generateSubtleHints (not yet implemented)', async () => {
      // Arrange
      const params = {
        provider: 'google',
        playerStruggles: { stuckOn: 'puzzle', attempts: 3 },
        availableResources: ['knowledge check', 'NPC hint'],
        hintingStyle: 'subtle'
      };

      // Act
      const result = await aiService.generateSubtleHints(params);

      // Assert
      expect(result).toEqual({
        hintsData: 'Not implemented',
        generatedHints: []
      });
    });

    test('should warn when calling generateNaturalGuidance (not yet implemented)', async () => {
      // Arrange
      const params = {
        provider: 'openai',
        playerConfusion: { topic: 'next objective', duration: '10 minutes' },
        gameContext: { currentQuest: 'Find the lost artifact' },
        guidanceIntensity: 'moderate'
      };

      // Act
      const result = await aiService.generateNaturalGuidance(params);

      // Assert
      expect(result).toEqual({
        guidanceData: 'Not implemented',
        generatedGuidance: {}
      });
    });

    test('should warn when calling generateLocationMapping (not yet implemented)', async () => {
      // Arrange
      const params = {
        provider: 'anthropic',
        entityMappingRequirements: { npcs: 5, items: 10, encounters: 3 },
        availableLocations: ['forest', 'village', 'cave'],
        distributionStrategy: { balanced: true }
      };

      // Act
      const result = await aiService.generateLocationMapping(params);

      // Assert
      expect(result).toEqual({
        mappingData: 'Not implemented',
        generatedMapping: {}
      });
    });
  });

  describe('Service Facade Pattern', () => {
    test('should return singleton instance from getAIService', () => {
      // Act
      const instance1 = getAIService();
      const instance2 = getAIService();

      // Assert
      expect(instance1).toBe(instance2);
    });

    test('should properly delegate all provider management methods', async () => {
      // Arrange
      const testCases = [
        {
          method: 'testProviderConnection',
          args: ['openai', 'key', 'model'],
          mockReturn: true
        }
      ];

      // Act & Assert
      for (const testCase of testCases) {
        mockAiProviderService[testCase.method].mockResolvedValue(testCase.mockReturn);
        const result = await aiService[testCase.method](...testCase.args);
        expect(mockAiProviderService[testCase.method]).toHaveBeenCalledWith(...testCase.args);
        expect(result).toEqual(testCase.mockReturn);
      }
    });
  });

  describe('Error Handling', () => {
    test('should propagate errors from aiProviderService', async () => {
      // Arrange
      const error = new Error('Provider connection failed');
      mockAiProviderService.testProviderConnection.mockRejectedValue(error);

      // Act & Assert
      await expect(aiService.testProviderConnection('invalid', 'key'))
        .rejects.toThrow('Provider connection failed');
    });

    test('should propagate errors from aiContentGenerationService', async () => {
      // Arrange
      const error = new Error('Character generation failed');
      mockAiContentGenerationService.generateCharacter.mockRejectedValue(error);

      // Act & Assert
      await expect(aiService.generateCharacter({
        provider: 'openai',
        characterType: 'PC'
      })).rejects.toThrow('Character generation failed');
    });

    test('should propagate errors from aiUtilsService', async () => {
      // Arrange
      const error = new Error('Chat service unavailable');
      mockAiUtilsService.chat.mockRejectedValue(error);

      // Act & Assert
      await expect(aiService.chat({
        provider: 'anthropic',
        message: 'test'
      })).rejects.toThrow('Chat service unavailable');
    });
  });
});