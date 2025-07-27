/**
 * AI Entity Engine Unit Tests
 * Tests for AI Entity Management, Condition Evaluation, and Relationship Analysis
 * t-WADA naming convention: aiEntityEngine.unit.test.ts
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { 
  AIEntityEngine, 
  AIEntityEngineOptions,
  EntityProcessingResult,
  BatchProcessingResult
} from './index';
import type { 
  AIConditionExpression, 
  AIQueryFilter, 
  AIGameContext,
  EntityRelationshipGraph,
  ID 
} from '@ai-agent-trpg/types';

// Mock the individual components
jest.mock('./conditionEvaluator', () => ({
  ConditionEvaluator: jest.fn().mockImplementation(() => ({
    evaluateCondition: jest.fn()
  })),
  conditionEvaluator: {
    evaluateCondition: jest.fn()
  }
}));

jest.mock('./aiQueryProcessor', () => ({
  AIQueryProcessor: jest.fn().mockImplementation(() => ({
    queryEntities: jest.fn(),
    getCacheSize: jest.fn(() => 0),
    clearCache: jest.fn()
  })),
  aiQueryProcessor: {
    queryEntities: jest.fn()
  }
}));

jest.mock('./relationshipManager', () => ({
  RelationshipManager: jest.fn().mockImplementation(() => ({
    exportGraph: jest.fn(() => ({})),
    analyzeRelationships: jest.fn(),
    findPath: jest.fn(),
    calculateGraphMetrics: jest.fn(() => ({
      nodeCount: 0,
      edgeCount: 0,
      stronglyConnectedComponents: []
    })),
    addRelationship: jest.fn(),
    removeRelationship: jest.fn(),
    importGraph: jest.fn()
  }))
}));

import { ConditionEvaluator } from './conditionEvaluator';
import { AIQueryProcessor } from './aiQueryProcessor';
import { RelationshipManager } from './relationshipManager';

describe('AIEntityEngine - AI Entity Management and Relationship Analysis', () => {
  let engine: AIEntityEngine;
  let mockConditionEvaluator: jest.Mocked<InstanceType<typeof ConditionEvaluator>>;
  let mockQueryProcessor: jest.Mocked<InstanceType<typeof AIQueryProcessor>>;
  let mockRelationshipManager: jest.Mocked<InstanceType<typeof RelationshipManager>>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create fresh mock instances
    mockConditionEvaluator = {
      evaluateCondition: jest.fn()
    } as any;

    mockQueryProcessor = {
      queryEntities: jest.fn(),
      getCacheSize: jest.fn(() => 0),
      clearCache: jest.fn()
    } as any;

    mockRelationshipManager = {
      exportGraph: jest.fn(() => ({})),
      analyzeRelationships: jest.fn(),
      findPath: jest.fn(),
      calculateGraphMetrics: jest.fn(() => ({
        nodeCount: 0,
        edgeCount: 0,
        stronglyConnectedComponents: []
      })),
      addRelationship: jest.fn(),
      removeRelationship: jest.fn(),
      importGraph: jest.fn()
    } as any;

    // Mock the constructors to return our mocks
    (ConditionEvaluator as jest.Mock).mockImplementation(() => mockConditionEvaluator);
    (AIQueryProcessor as jest.Mock).mockImplementation(() => mockQueryProcessor);
    (RelationshipManager as jest.Mock).mockImplementation(() => mockRelationshipManager);

    // Create fresh engine instance
    engine = new AIEntityEngine({
      enableCaching: true,
      maxCacheSize: 100,
      debugMode: false
    });

    // Clear console logs to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Engine Initialization and Configuration', () => {
    test('should initialize engine with default options', () => {
      // Arrange & Act
      const defaultEngine = new AIEntityEngine();

      // Assert
      expect(ConditionEvaluator).toHaveBeenCalled();
      expect(AIQueryProcessor).toHaveBeenCalled();
      expect(RelationshipManager).toHaveBeenCalled();
    });

    test('should initialize engine with custom options', () => {
      // Arrange
      const options: AIEntityEngineOptions = {
        enableCaching: false,
        maxCacheSize: 500,
        debugMode: true,
        relationshipGraph: { nodes: [], edges: [] } as EntityRelationshipGraph
      };

      // Act
      const customEngine = new AIEntityEngine(options);

      // Assert
      expect(RelationshipManager).toHaveBeenCalledWith(options.relationshipGraph);
      expect(console.log).toHaveBeenCalledWith('AI Entity Engine initialized with options:', expect.objectContaining(options));
    });

    test('should update engine options', () => {
      // Arrange
      const newOptions = {
        debugMode: true,
        maxCacheSize: 200
      };

      // Act
      engine.updateOptions(newOptions);

      // Assert - should not throw and should accept the options
      expect(() => engine.updateOptions(newOptions)).not.toThrow();
    });
  });

  describe('Single Entity Evaluation', () => {
    test('should evaluate entity conditions successfully', async () => {
      // Arrange
      const entityId: ID = 'item_magic_sword';
      const conditions: AIConditionExpression[] = [
        {
          type: 'player_level',
          operator: 'gte',
          value: 5,
          target: 'player.level'
        },
        {
          type: 'inventory_space',
          operator: 'gt',
          value: 0,
          target: 'player.inventory.available'
        }
      ];
      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Test Hero',
            level: 7,
            location: 'village_square',
            stats: { hp: 100, mp: 50 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockConditionEvaluator.evaluateCondition
        .mockResolvedValueOnce(true)  // player_level >= 5
        .mockResolvedValueOnce(true); // inventory_space > 0

      // Act
      const result = await engine.evaluateEntity(entityId, conditions, gameContext);

      // Assert
      expect(result).toEqual({
        success: true,
        entityId,
        processingTime: expect.any(Number),
        conditions: {
          evaluated: 2,
          passed: 2,
          failed: 0
        },
        effects: [],
        errors: undefined
      });
      expect(mockConditionEvaluator.evaluateCondition).toHaveBeenCalledTimes(2);
    });

    test('should handle failed entity conditions', async () => {
      // Arrange
      const entityId: ID = 'quest_advanced_magic';
      const conditions: AIConditionExpression[] = [
        {
          type: 'player_level',
          operator: 'gte',
          value: 15,
          target: 'player.level'
        },
        {
          type: 'prerequisite_quest',
          operator: 'eq',
          value: 'completed',
          target: 'quests.basic_magic.status'
        }
      ];
      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Novice Mage',
            level: 8, // Too low level
            location: 'magic_academy',
            stats: { hp: 60, mp: 80 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockConditionEvaluator.evaluateCondition
        .mockResolvedValueOnce(false) // player_level < 15
        .mockResolvedValueOnce(false); // prerequisite not completed

      // Act
      const result = await engine.evaluateEntity(entityId, conditions, gameContext);

      // Assert
      expect(result).toEqual({
        success: false,
        entityId,
        processingTime: expect.any(Number),
        conditions: {
          evaluated: 2,
          passed: 0,
          failed: 2
        },
        effects: [],
        errors: undefined
      });
    });

    test('should handle condition evaluation errors gracefully', async () => {
      // Arrange
      const entityId: ID = 'event_mystical_encounter';
      const conditions: AIConditionExpression[] = [
        {
          type: 'invalid_condition',
          operator: 'unknown',
          value: 'impossible',
          target: 'nonexistent.field'
        }
      ];
      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Test Player',
            level: 1,
            location: 'starting_area',
            stats: { hp: 100, mp: 20 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockConditionEvaluator.evaluateCondition.mockRejectedValue(new Error('Invalid condition type'));

      // Act
      const result = await engine.evaluateEntity(entityId, conditions, gameContext);

      // Assert
      expect(result).toEqual({
        success: false,
        entityId,
        processingTime: expect.any(Number),
        conditions: {
          evaluated: 1,
          passed: 0,
          failed: 1
        },
        effects: [],
        errors: ['Condition evaluation failed: Invalid condition type']
      });
    });

    test('should handle complete entity evaluation failure', async () => {
      // Arrange
      const entityId: ID = 'corrupted_entity';
      const conditions: AIConditionExpression[] = [
        {
          type: 'test_condition',
          operator: 'eq',
          value: 'test',
          target: 'test.value'
        }
      ];
      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Test Player',
            level: 1,
            location: 'test_location',
            stats: { hp: 100, mp: 20 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      // Mock a complete failure during evaluation setup
      mockConditionEvaluator.evaluateCondition.mockImplementation(() => {
        throw new Error('Critical evaluation failure');
      });

      // Act
      const result = await engine.evaluateEntity(entityId, conditions, gameContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Condition evaluation failed: Critical evaluation failure');
    });
  });

  describe('Batch Entity Processing', () => {
    test('should process multiple entities successfully', async () => {
      // Arrange
      const entityConditions = [
        {
          entityId: 'item_health_potion' as ID,
          conditions: [{
            type: 'player_health',
            operator: 'lt',
            value: 50,
            target: 'player.stats.hp'
          }]
        },
        {
          entityId: 'item_mana_potion' as ID,
          conditions: [{
            type: 'player_mana',
            operator: 'lt',
            value: 30,
            target: 'player.stats.mp'
          }]
        },
        {
          entityId: 'npc_merchant' as ID,
          conditions: [{
            type: 'location',
            operator: 'eq',
            value: 'marketplace',
            target: 'player.location'
          }]
        }
      ];

      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Injured Adventurer',
            level: 5,
            location: 'marketplace',
            stats: { hp: 30, mp: 15 }, // Low health and mana
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockConditionEvaluator.evaluateCondition
        .mockResolvedValueOnce(true)  // health potion: hp < 50
        .mockResolvedValueOnce(true)  // mana potion: mp < 30
        .mockResolvedValueOnce(true); // merchant: location = marketplace

      // Act
      const result = await engine.batchProcessEntities(entityConditions, gameContext);

      // Assert
      expect(result).toEqual({
        totalProcessed: 3,
        successful: 3,
        failed: 0,
        processingTime: expect.any(Number),
        results: [
          expect.objectContaining({ success: true, entityId: 'item_health_potion' }),
          expect.objectContaining({ success: true, entityId: 'item_mana_potion' }),
          expect.objectContaining({ success: true, entityId: 'npc_merchant' })
        ],
        errors: []
      });
    });

    test('should handle partial batch processing failures', async () => {
      // Arrange
      const entityConditions = [
        {
          entityId: 'quest_easy' as ID,
          conditions: [{
            type: 'player_level',
            operator: 'gte',
            value: 1,
            target: 'player.level'
          }]
        },
        {
          entityId: 'quest_impossible' as ID,
          conditions: [{
            type: 'player_level',
            operator: 'gte',
            value: 999,
            target: 'player.level'
          }]
        },
        {
          entityId: 'quest_moderate' as ID,
          conditions: [{
            type: 'player_level',
            operator: 'gte',
            value: 5,
            target: 'player.level'
          }]
        }
      ];

      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Mid-level Adventurer',
            level: 7,
            location: 'guild_hall',
            stats: { hp: 100, mp: 60 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockConditionEvaluator.evaluateCondition
        .mockResolvedValueOnce(true)  // quest_easy: level >= 1
        .mockResolvedValueOnce(false) // quest_impossible: level >= 999
        .mockResolvedValueOnce(true); // quest_moderate: level >= 5

      // Act
      const result = await engine.batchProcessEntities(entityConditions, gameContext);

      // Assert
      expect(result.totalProcessed).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results[1].success).toBe(false); // quest_impossible failed
    });

    test('should handle entity processing errors in batch', async () => {
      // Arrange
      const entityConditions = [
        {
          entityId: 'valid_entity' as ID,
          conditions: [{
            type: 'simple_condition',
            operator: 'eq',
            value: 'test',
            target: 'test.field'
          }]
        },
        {
          entityId: 'error_entity' as ID,
          conditions: [{
            type: 'error_condition',
            operator: 'invalid',
            value: 'causes_error',
            target: 'invalid.field'
          }]
        }
      ];

      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Test Player',
            level: 1,
            location: 'test_area',
            stats: { hp: 100, mp: 50 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockConditionEvaluator.evaluateCondition
        .mockResolvedValueOnce(true) // valid_entity succeeds
        .mockRejectedValueOnce(new Error('Evaluation error')); // error_entity fails

      // Act
      const result = await engine.batchProcessEntities(entityConditions, gameContext);

      // Assert
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('Condition evaluation failed: Evaluation error');
    });
  });

  describe('Entity Query Processing', () => {
    test('should execute entity queries successfully', async () => {
      // Arrange
      const filter: AIQueryFilter = {
        entityTypes: ['item', 'quest'],
        aiCriteria: {
          recommendationScore: { min: 0.7, max: 1.0 },
          playerAlignment: { min: 0.5 }
        }
      };

      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Test Player',
            level: 10,
            location: 'adventure_zone',
            stats: { hp: 100, mp: 80 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      const expectedResult = {
        entities: [
          { id: 'item_legendary_sword', type: 'item', score: 0.9 },
          { id: 'quest_epic_adventure', type: 'quest', score: 0.8 }
        ],
        totalCount: 2,
        searchTime: 150
      };

      mockQueryProcessor.queryEntities.mockResolvedValue(expectedResult);

      // Act
      const result = await engine.queryEntities(filter, gameContext);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockQueryProcessor.queryEntities).toHaveBeenCalledWith(filter, gameContext, {});
    });

    test('should execute entity queries with options', async () => {
      // Arrange
      const filter: AIQueryFilter = {
        entityTypes: ['npc'],
        aiCriteria: {
          recommendationScore: { min: 0.5, max: 1.0 }
        }
      };

      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Social Player',
            level: 5,
            location: 'tavern',
            stats: { hp: 80, mp: 40 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      const queryOptions = {
        maxResults: 5,
        includeRelated: true,
        sortBy: 'relevance' as const
      };

      const expectedResult = {
        entities: [
          { id: 'npc_bartender', type: 'npc', score: 0.95 },
          { id: 'npc_bard', type: 'npc', score: 0.85 }
        ],
        totalCount: 2,
        searchTime: 100
      };

      mockQueryProcessor.queryEntities.mockResolvedValue(expectedResult);

      // Act
      const result = await engine.queryEntities(filter, gameContext, queryOptions);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockQueryProcessor.queryEntities).toHaveBeenCalledWith(filter, gameContext, queryOptions);
    });

    test('should handle query processing errors', async () => {
      // Arrange
      const filter: AIQueryFilter = {
        entityTypes: ['invalid_type'],
        aiCriteria: {
          recommendationScore: { min: 0.0, max: 1.0 }
        }
      };

      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Test Player',
            level: 1,
            location: 'error_zone',
            stats: { hp: 100, mp: 50 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockQueryProcessor.queryEntities.mockRejectedValue(new Error('Invalid entity type'));

      // Act & Assert
      await expect(engine.queryEntities(filter, gameContext)).rejects.toThrow('Invalid entity type');
    });
  });

  describe('Relationship Management', () => {
    test('should analyze entity relationships', () => {
      // Arrange
      const entityId: ID = 'npc_village_elder';
      const expectedAnalysis = {
        entityId,
        directConnections: ['npc_blacksmith', 'npc_merchant'],
        relationshipStrength: { total: 15, average: 7.5 },
        centralityScore: 0.8,
        communityId: 'village_leaders'
      };

      mockRelationshipManager.analyzeRelationships.mockReturnValue(expectedAnalysis);

      // Act
      const result = engine.analyzeEntityRelationships(entityId);

      // Assert
      expect(result).toEqual(expectedAnalysis);
      expect(mockRelationshipManager.analyzeRelationships).toHaveBeenCalledWith(entityId);
    });

    test('should find paths between entities', () => {
      // Arrange
      const fromId: ID = 'player_character';
      const toId: ID = 'npc_quest_giver';
      const expectedPath = {
        path: ['player_character', 'npc_friend', 'npc_quest_giver'],
        distance: 2,
        totalWeight: 1.5,
        relationships: ['friendship', 'professional']
      };

      mockRelationshipManager.findPath.mockReturnValue(expectedPath);

      // Act
      const result = engine.findEntityPath(fromId, toId);

      // Assert
      expect(result).toEqual(expectedPath);
      expect(mockRelationshipManager.findPath).toHaveBeenCalledWith(fromId, toId);
    });

    test('should return null when no path exists', () => {
      // Arrange
      const fromId: ID = 'isolated_entity';
      const toId: ID = 'unreachable_entity';

      mockRelationshipManager.findPath.mockReturnValue(null);

      // Act
      const result = engine.findEntityPath(fromId, toId);

      // Assert
      expect(result).toBeNull();
    });

    test('should get graph metrics', () => {
      // Arrange
      const expectedMetrics = {
        nodeCount: 25,
        edgeCount: 47,
        density: 0.15,
        averageClustering: 0.3,
        stronglyConnectedComponents: [
          ['npc_1', 'npc_2', 'npc_3'],
          ['quest_1', 'quest_2']
        ]
      };

      mockRelationshipManager.calculateGraphMetrics.mockReturnValue(expectedMetrics);

      // Act
      const result = engine.getGraphMetrics();

      // Assert
      expect(result).toEqual(expectedMetrics);
    });

    test('should add entity relationships', () => {
      // Arrange
      const relationship = {
        sourceId: 'npc_mentor',
        targetId: 'player_character',
        type: 'mentorship',
        strength: 0.9
      };

      // Act
      engine.addEntityRelationship(relationship);

      // Assert
      expect(mockRelationshipManager.addRelationship).toHaveBeenCalledWith(relationship);
    });

    test('should remove entity relationships', () => {
      // Arrange
      const sourceId: ID = 'npc_former_friend';
      const targetId: ID = 'player_character';
      const relationshipType = 'friendship';

      // Act
      const result = engine.removeEntityRelationship(sourceId, targetId, relationshipType);

      // Assert
      expect(result).toBe(true);
      expect(mockRelationshipManager.removeRelationship).toHaveBeenCalledWith(sourceId, targetId, relationshipType);
    });

    test('should find entity groups', () => {
      // Arrange
      const expectedGroups = [
        ['npc_group_1_member_1', 'npc_group_1_member_2'],
        ['quest_chain_1', 'quest_chain_2', 'quest_chain_3']
      ];

      mockRelationshipManager.calculateGraphMetrics.mockReturnValue({
        nodeCount: 10,
        edgeCount: 15,
        stronglyConnectedComponents: expectedGroups
      });

      // Act
      const result = engine.findEntityGroups(0.8);

      // Assert
      expect(result).toEqual(expectedGroups);
    });
  });

  describe('AI Recommendations and Availability', () => {
    test('should get recommended entities', async () => {
      // Arrange
      const entityType = 'quest';
      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Quest Seeker',
            level: 8,
            location: 'adventure_hub',
            stats: { hp: 100, mp: 70 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      const expectedRecommendations = {
        entities: [
          { id: 'quest_dragon_slaying', type: 'quest', score: 0.9 },
          { id: 'quest_artifact_recovery', type: 'quest', score: 0.8 }
        ],
        totalCount: 2,
        searchTime: 120
      };

      mockQueryProcessor.queryEntities.mockResolvedValue(expectedRecommendations);

      // Act
      const result = await engine.getRecommendedEntities(entityType, gameContext, 3);

      // Assert
      expect(result).toEqual(expectedRecommendations);
      expect(mockQueryProcessor.queryEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          entityTypes: ['quest'],
          aiCriteria: expect.objectContaining({
            recommendationScore: { min: 0.5, max: 1.0 },
            playerAlignment: { min: 0.3 }
          })
        }),
        gameContext,
        expect.objectContaining({
          maxResults: 3,
          includeRelated: true,
          sortBy: 'relevance'
        })
      );
    });

    test('should check entity availability successfully', async () => {
      // Arrange
      const entityId: ID = 'item_advanced_spell_tome';
      const conditions: AIConditionExpression[] = [
        {
          type: 'player_level',
          operator: 'gte',
          value: 10,
          target: 'player.level'
        },
        {
          type: 'spell_school_affinity',
          operator: 'gte',
          value: 0.7,
          target: 'player.affinities.arcane'
        }
      ];
      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Arcane Scholar',
            level: 12,
            location: 'magic_library',
            stats: { hp: 80, mp: 120 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockConditionEvaluator.evaluateCondition
        .mockResolvedValueOnce(true)  // level check passes
        .mockResolvedValueOnce(true); // affinity check passes

      // Act
      const result = await engine.checkEntityAvailability(entityId, conditions, gameContext);

      // Assert
      expect(result).toEqual({
        available: true,
        reason: undefined,
        confidence: 1.0
      });
    });

    test('should check entity availability with partial success', async () => {
      // Arrange
      const entityId: ID = 'quest_master_tier';
      const conditions: AIConditionExpression[] = [
        {
          type: 'player_level',
          operator: 'gte',
          value: 20,
          target: 'player.level'
        },
        {
          type: 'prerequisite_complete',
          operator: 'eq',
          value: 'completed',
          target: 'quests.journeyman_tier.status'
        },
        {
          type: 'reputation',
          operator: 'gte',
          value: 500,
          target: 'player.reputation.guild'
        }
      ];
      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Aspiring Master',
            level: 18, // Below required level
            location: 'guild_hall',
            stats: { hp: 150, mp: 100 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockConditionEvaluator.evaluateCondition
        .mockResolvedValueOnce(false) // level check fails
        .mockResolvedValueOnce(true)  // prerequisite passes
        .mockResolvedValueOnce(true); // reputation passes

      // Act
      const result = await engine.checkEntityAvailability(entityId, conditions, gameContext);

      // Assert
      expect(result).toEqual({
        available: false,
        reason: undefined,
        confidence: 2/3 // 2 out of 3 conditions passed
      });
    });

    test('should check entity availability with errors', async () => {
      // Arrange
      const entityId: ID = 'broken_entity';
      const conditions: AIConditionExpression[] = [
        {
          type: 'invalid_condition',
          operator: 'unknown',
          value: 'error',
          target: 'nonexistent.field'
        }
      ];
      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Test Player',
            level: 1,
            location: 'test_area',
            stats: { hp: 100, mp: 50 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockConditionEvaluator.evaluateCondition.mockRejectedValue(new Error('Condition evaluation failed'));

      // Act
      const result = await engine.checkEntityAvailability(entityId, conditions, gameContext);

      // Assert
      expect(result.available).toBe(false);
      expect(result.reason).toBe('Condition evaluation failed: Condition evaluation failed');
      expect(result.confidence).toBe(0);
    });
  });

  describe('Engine Statistics and Maintenance', () => {
    test('should get engine statistics', () => {
      // Arrange
      const expectedMetrics = {
        nodeCount: 50,
        edgeCount: 75,
        density: 0.2,
        stronglyConnectedComponents: []
      };

      mockQueryProcessor.getCacheSize.mockReturnValue(25);
      mockRelationshipManager.calculateGraphMetrics.mockReturnValue(expectedMetrics);

      // Act
      const stats = engine.getEngineStatistics();

      // Assert
      expect(stats).toEqual({
        conditionEvaluator: {},
        queryProcessor: {
          cacheSize: 25
        },
        relationshipManager: expectedMetrics
      });
    });

    test('should clear caches', () => {
      // Act
      engine.clearCaches();

      // Assert
      expect(mockQueryProcessor.clearCache).toHaveBeenCalled();
      expect(mockRelationshipManager.importGraph).toHaveBeenCalled();
    });
  });

  describe('Entity Type Determination', () => {
    test('should determine entity types from ID prefixes', async () => {
      // This test indirectly checks the private determineEntityType method
      // by observing its effect through entity evaluation
      
      // Arrange
      const testCases = [
        { entityId: 'item_magic_sword' as ID, expectedType: 'item' },
        { entityId: 'quest_dragon_hunt' as ID, expectedType: 'quest' },
        { entityId: 'event_royal_festival' as ID, expectedType: 'event' },
        { entityId: 'npc_village_elder' as ID, expectedType: 'npc' },
        { entityId: 'enemy_goblin_chief' as ID, expectedType: 'enemy' },
        { entityId: 'unknown_entity' as ID, expectedType: 'item' } // default
      ];

      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Test Player',
            level: 1,
            location: 'test_area',
            stats: { hp: 100, mp: 50 },
            items: [],
            status: []
          },
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockConditionEvaluator.evaluateCondition.mockResolvedValue(true);

      // Act & Assert
      for (const testCase of testCases) {
        await engine.evaluateEntity(testCase.entityId, [], gameContext);
        
        expect(mockConditionEvaluator.evaluateCondition).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            entityId: testCase.entityId,
            entityType: testCase.expectedType
          })
        );
      }
    });
  });

  describe('Game Context Conversion', () => {
    test('should convert AIGameContext to GameState properly', async () => {
      // Arrange
      const entityId: ID = 'test_entity';
      const gameContext: AIGameContext = {
        currentState: {
          player: {
            id: 'player_1',
            name: 'Context Test Player',
            level: 15,
            location: 'mystical_forest',
            stats: { hp: 200, mp: 150, strength: 18, dexterity: 14 },
            items: ['sword_of_power', 'healing_potion'],
            status: ['blessed', 'well_rested']
          },
          flags: { 'dragon_defeated': true, 'village_saved': true },
          time: 1640995200000, // January 1, 2022
          weather: 'stormy'
        },
        recentHistory: {
          events: [
            { type: 'combat_victory', timestamp: Date.now() - 3600000 },
            { type: 'quest_completed', timestamp: Date.now() - 7200000 }
          ],
          playerActions: []
        },
        npcsPresent: ['npc_forest_guardian', 'npc_lost_traveler']
      };

      mockConditionEvaluator.evaluateCondition.mockResolvedValue(true);

      // Act
      await engine.evaluateEntity(entityId, [], gameContext);

      // Assert
      expect(mockConditionEvaluator.evaluateCondition).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          gameState: expect.objectContaining({
            player: expect.objectContaining({
              id: 'player_1',
              name: 'Context Test Player',
              level: 15,
              location: 'mystical_forest',
              stats: { hp: 200, mp: 150, strength: 18, dexterity: 14 },
              items: ['sword_of_power', 'healing_potion'],
              status: ['blessed', 'well_rested']
            }),
            world: expect.objectContaining({
              weather: 'stormy',
              events: ['combat_victory', 'quest_completed'],
              flags: { 'dragon_defeated': true, 'village_saved': true }
            }),
            session: expect.objectContaining({
              location: 'mystical_forest',
              npcs_present: ['npc_forest_guardian', 'npc_lost_traveler']
            })
          })
        })
      );
    });

    test('should handle missing player data gracefully', async () => {
      // Arrange
      const entityId: ID = 'test_entity';
      const gameContext: AIGameContext = {
        currentState: {
          flags: {},
          time: Date.now()
        },
        recentHistory: {
          events: [],
          playerActions: []
        },
        npcsPresent: []
      };

      mockConditionEvaluator.evaluateCondition.mockResolvedValue(true);

      // Act
      await engine.evaluateEntity(entityId, [], gameContext);

      // Assert
      expect(mockConditionEvaluator.evaluateCondition).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          gameState: expect.objectContaining({
            player: expect.objectContaining({
              id: '',
              name: '',
              level: 1,
              location: '',
              stats: {},
              items: [],
              status: []
            })
          })
        })
      );
    });
  });
});