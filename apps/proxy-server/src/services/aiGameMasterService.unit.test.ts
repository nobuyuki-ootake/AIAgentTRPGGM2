/**
 * aiGameMasterService Unit Tests
 * Tests for AI Game Master Service - GM Assistance and Session Management
 * t-WADA naming convention: aiGameMasterService.unit.test.ts
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';
import { getAIGameMasterService, AIGameMasterService, type GameOverview, type TaskExplanation, type ResultJudgment, type ScenarioAdjustment, type SessionContext } from './aiGameMasterService';
import type { TRPGSession, Character, Quest, Milestone, SessionDurationConfig } from '@ai-agent-trpg/types';
import { TestDataFactory } from '../tests/setup';
import { aiOnlyMockSetup } from '../tests/mocks';

// Mock dependencies
jest.mock('../database/database', () => ({
  getDatabase: jest.fn()
}));
jest.mock('./aiService', () => ({
  getAIService: jest.fn(() => ({
    chat: jest.fn()
  }))
}));
jest.mock('./sessionService', () => ({
  getSessionService: jest.fn(() => ({
    addChatMessage: jest.fn()
  }))
}));
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-12345')
}));

import { getDatabase } from '../database/database';
import { getAIService } from './aiService';
import { getSessionService } from './sessionService';

describe('AIGameMasterService - AI Game Master Assistance', () => {
  let aiGameMasterService: AIGameMasterService;
  let testDb: Database;
  let mockDatabase: jest.Mocked<Database>;
  let mockAIService: jest.Mocked<ReturnType<typeof getAIService>>;
  let mockSessionService: jest.Mocked<ReturnType<typeof getSessionService>>;
  let mockExec: jest.Mock;
  let mockPrepare: jest.Mock;
  let mockStatement: jest.Mocked<any>;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup AI-only mock environment
    await aiOnlyMockSetup();
    
    // Create service instance
    aiGameMasterService = getAIGameMasterService();
    
    // Use global test database
    testDb = global.testDb;
    
    // Setup mock database and statements
    mockStatement = {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    };
    mockPrepare = jest.fn().mockReturnValue(mockStatement);
    mockExec = jest.fn();
    mockDatabase = {
      prepare: mockPrepare,
      exec: mockExec
    } as any;
    
    (getDatabase as jest.Mock).mockReturnValue(mockDatabase);
    
    // Setup mock AI service
    mockAIService = {
      chat: jest.fn()
    } as any;
    (getAIService as jest.Mock).mockReturnValue(mockAIService);
    
    // Setup mock session service
    mockSessionService = {
      addChatMessage: jest.fn()
    } as any;
    (getSessionService as jest.Mock).mockReturnValue(mockSessionService);

    // Setup environment variables for API keys
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GOOGLE_API_KEY = 'test-google-key';
  });

  describe('Database Initialization', () => {
    test('should initialize all required database tables', () => {
      // Act - Constructor already called, check exec calls
      
      // Assert
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS game_overviews'));
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS task_explanations'));
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS result_judgments'));
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS scenario_adjustments'));
    });
  });

  describe('Game Overview Generation', () => {
    test('should generate game overview successfully', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const campaignId = 'test-campaign-id';
      const aiSettings = { provider: 'openai', model: 'gpt-3.5-turbo' };
      
      const sessionContext: SessionContext = {
        currentSession: {
          id: sessionId,
          status: 'active',
          mode: 'exploration'
        } as TRPGSession,
        characters: [
          TestDataFactory.createTestCharacter(campaignId, { name: 'Test Hero', level: 5 })
        ] as Character[],
        activeQuests: [],
        completedMilestones: [],
        recentEvents: ['Party entered the ancient ruins'],
        campaignTension: 60,
        playerEngagement: 80,
        storyProgression: 30,
        difficulty: 'medium',
        mood: 'mysterious'
      };

      const mockAIResponse = {
        message: '# 古代遺跡の探索\n\n勇敢なる冒険者たちよ、ついに古代遺跡の入り口に到達しました。石造りの巨大な扉が目の前に聳え立ち、謎めいた文字が刻まれています。'
      };

      mockAIService.chat.mockResolvedValue(mockAIResponse);
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockSessionService.addChatMessage.mockResolvedValue(null);

      // Act
      const result = await aiGameMasterService.generateGameOverview(
        sessionId,
        campaignId,
        sessionContext,
        aiSettings
      );

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: 'mock-uuid-12345',
        sessionId,
        campaignId,
        sessionSummary: mockAIResponse.message,
        playerBriefing: mockAIResponse.message,
        aiProvider: 'openai'
      }));
      expect(mockAIService.chat).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        persona: 'gm_assistant'
      }));
      expect(mockSessionService.addChatMessage).toHaveBeenCalledWith(sessionId, {
        speaker: 'ゲームマスター',
        message: mockAIResponse.message,
        type: 'system'
      });
    });

    test('should throw error when AI service fails', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const campaignId = 'test-campaign-id';
      const sessionContext = {
        currentSession: { status: 'active' },
        characters: [],
        activeQuests: [],
        completedMilestones: [],
        recentEvents: [],
        campaignTension: 50,
        playerEngagement: 70,
        storyProgression: 20,
        difficulty: 'medium',
        mood: 'neutral'
      } as SessionContext;

      mockAIService.chat.mockRejectedValue(new Error('AI service unavailable'));

      // Act & Assert
      await expect(
        aiGameMasterService.generateGameOverview(
          sessionId,
          campaignId,
          sessionContext,
          { provider: 'openai' }
        )
      ).rejects.toThrow('ゲーム概要生成に失敗しました: AI service unavailable');
    });

    test('should handle empty AI response gracefully', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const campaignId = 'test-campaign-id';
      const sessionContext = {
        currentSession: { status: 'active' },
        characters: [],
        activeQuests: [],
        completedMilestones: [],
        recentEvents: [],
        campaignTension: 50,
        playerEngagement: 70,
        storyProgression: 20,
        difficulty: 'medium',
        mood: 'neutral'
      } as SessionContext;

      mockAIService.chat.mockResolvedValue({ message: '' });
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockSessionService.addChatMessage.mockResolvedValue(null);

      // Act
      const result = await aiGameMasterService.generateGameOverview(
        sessionId,
        campaignId,
        sessionContext,
        { provider: 'anthropic' }
      );

      // Assert
      expect(result.sessionSummary).toBe('');
      expect(result.playerBriefing).toBe('');
    });
  });

  describe('Task Explanation Generation', () => {
    test('should generate task explanation successfully', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const taskContext = {
        questId: 'quest-123',
        taskTitle: 'Investigate the Mysterious Tower',
        basicDescription: 'A tall tower has appeared overnight'
      };
      const sessionContext = {
        characters: [{ name: 'Mage', characterType: 'PC' }],
        mood: 'mysterious',
        difficulty: 'medium',
        campaignTension: 70
      } as SessionContext;

      const mockAIResponse = {
        message: JSON.stringify({
          taskTitle: 'The Enigmatic Spire of Shadows',
          taskDescription: 'A magnificent tower of obsidian has materialized...',
          objectives: [
            {
              id: 'obj1',
              description: 'Investigate the tower entrance',
              type: 'primary',
              completed: false,
              requirements: ['Approach the tower'],
              rewards: {
                experience: 100,
                items: ['Ancient Key'],
                story: ['Tower mysteries revealed']
              }
            }
          ],
          backgroundContext: 'The tower appeared during the lunar eclipse',
          relevantHistory: ['Similar towers in ancient texts'],
          stakeholders: ['Local villagers', 'Tower guardian'],
          approachSuggestions: ['Stealth approach', 'Direct confrontation'],
          potentialChallenges: ['Magical wards', 'Unknown guardians'],
          successCriteria: ['Enter the tower', 'Discover the source'],
          failureConsequences: ['Tower vanishes', 'Cursed by shadows'],
          atmosphericDetails: 'Dark energy radiates from the obsidian walls',
          sensoryDescriptions: 'Cold whispers echo in the wind',
          moodSetting: 'Ominous and foreboding',
          difficulty: 'hard',
          estimatedDuration: 120
        })
      };

      mockAIService.chat.mockResolvedValue(mockAIResponse);
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act
      const result = await aiGameMasterService.generateTaskExplanation(
        sessionId,
        taskContext,
        sessionContext,
        { provider: 'anthropic', apiKey: 'test-key', model: 'claude-3-sonnet' }
      );

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: 'mock-uuid-12345',
        sessionId,
        questId: 'quest-123',
        taskTitle: 'The Enigmatic Spire of Shadows',
        taskDescription: 'A magnificent tower of obsidian has materialized...',
        difficulty: 'hard',
        estimatedDuration: 120
      }));
      expect(result.objectives).toHaveLength(1);
      expect(result.objectives[0].description).toBe('Investigate the tower entrance');
    });

    test('should throw error when JSON parsing fails', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const taskContext = {
        taskTitle: 'Invalid Task',
        basicDescription: 'Test task'
      };
      const sessionContext = {} as SessionContext;

      mockAIService.chat.mockResolvedValue({ message: 'Invalid JSON response' });

      // Act & Assert
      await expect(
        aiGameMasterService.generateTaskExplanation(
          sessionId,
          taskContext,
          sessionContext,
          { provider: 'openai', apiKey: 'test-key' }
        )
      ).rejects.toThrow('タスク説明生成に失敗しました');
    });
  });

  describe('Result Judgment Generation', () => {
    test('should generate result judgment successfully', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const characterId = 'char-123';
      const actionDescription = 'Cast fireball at the goblin';
      const checkResult = {
        outcome: 'success' as const,
        successLevel: 85,
        difficulty: 15,
        modifiers: ['high ground', 'spell focus']
      };
      const sessionContext = {
        mood: 'intense',
        campaignTension: 80
      } as SessionContext;

      const mockAIResponse = {
        message: JSON.stringify({
          immediateResults: 'The fireball explodes brilliantly, singeing the goblin',
          longtermConsequences: ['Other goblins flee in terror'],
          characterImpact: 'Increased confidence in spellcasting',
          storyProgression: 'The battle turns in your favor',
          dramaticDescription: 'Flames dance through the air in a spectacular display',
          atmosphericChanges: 'The cavern fills with smoke and the smell of sulfur',
          npcReactions: [
            {
              npcId: 'goblin-chief',
              npcName: 'Goblin Chief',
              reaction: 'Roars in anger and charges forward'
            }
          ],
          newOpportunities: ['Use the smoke for cover'],
          emergingChallenges: ['Goblin reinforcements arrive'],
          suggestedFollowups: ['Press the advantage', 'Retreat while possible']
        })
      };

      mockAIService.chat.mockResolvedValue(mockAIResponse);
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act
      const result = await aiGameMasterService.generateResultJudgment(
        sessionId,
        characterId,
        actionDescription,
        checkResult,
        sessionContext,
        { provider: 'google', apiKey: 'test-key', model: 'gemini-pro' }
      );

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: 'mock-uuid-12345',
        sessionId,
        characterId,
        actionDescription,
        outcome: 'success',
        successLevel: 85,
        immediateResults: 'The fireball explodes brilliantly, singeing the goblin',
        aiProvider: 'google'
      }));
      expect(result.npcReactions).toHaveLength(1);
      expect(result.npcReactions[0].npcName).toBe('Goblin Chief');
    });

    test('should handle malformed AI response for result judgment', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const characterId = 'char-123';
      const checkResult = {
        outcome: 'failure' as const,
        successLevel: 20,
        difficulty: 18,
        modifiers: []
      };

      mockAIService.chat.mockResolvedValue({ message: '{ invalid json }' });

      // Act & Assert
      await expect(
        aiGameMasterService.generateResultJudgment(
          sessionId,
          characterId,
          'Test action',
          checkResult,
          {} as SessionContext,
          { provider: 'openai', apiKey: 'test-key' }
        )
      ).rejects.toThrow('結果判定生成に失敗しました');
    });
  });

  describe('Scenario Adjustment Generation', () => {
    test('should generate scenario adjustment successfully', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const trigger = 'player_success';
      const triggerContext = 'Players defeated the boss too easily';
      const sessionContext = {
        playerEngagement: 60,
        storyProgression: 40,
        campaignTension: 30,
        difficulty: 'medium',
        mood: 'confident'
      } as SessionContext;

      const mockAIResponse = {
        message: JSON.stringify({
          analysis: 'Players are overpowered for current content',
          adjustmentType: 'difficulty',
          adjustments: [
            {
              element: 'Enemy HP',
              change: 'Increase by 50%',
              reasoning: 'Match player power level'
            }
          ],
          newElements: [
            {
              type: 'npc',
              name: 'Elite Guard',
              description: 'A seasoned warrior',
              purpose: 'Increase challenge'
            }
          ],
          implementationGuide: 'Introduce reinforcements gradually',
          timingRecommendations: ['After next room', 'During boss phase 2'],
          playerCommunication: 'Describe as tactical response',
          confidence: 90
        })
      };

      mockAIService.chat.mockResolvedValue(mockAIResponse);
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act
      const result = await aiGameMasterService.generateScenarioAdjustment(
        sessionId,
        trigger,
        triggerContext,
        sessionContext,
        { provider: 'anthropic', apiKey: 'test-key' }
      );

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: 'mock-uuid-12345',
        sessionId,
        trigger: 'player_success',
        analysis: 'Players are overpowered for current content',
        adjustmentType: 'difficulty',
        confidence: 90,
        aiProvider: 'anthropic'
      }));
      expect(result.adjustments).toHaveLength(1);
      expect(result.newElements).toHaveLength(1);
      expect(result.newElements[0].name).toBe('Elite Guard');
    });

    test('should handle different trigger types', async () => {
      // Arrange
      const triggerTypes = ['player_failure', 'unexpected_action', 'pacing_issue', 'story_balance'];
      
      for (const trigger of triggerTypes) {
        mockAIService.chat.mockResolvedValue({
          message: JSON.stringify({
            analysis: `Analysis for ${trigger}`,
            adjustmentType: 'story',
            adjustments: [],
            newElements: [],
            implementationGuide: 'Test guide',
            timingRecommendations: [],
            playerCommunication: 'Test communication',
            confidence: 75
          })
        });
        mockStatement.run.mockReturnValue({ changes: 1 });

        // Act
        const result = await aiGameMasterService.generateScenarioAdjustment(
          'session-id',
          trigger as any,
          'Test context',
          {} as SessionContext,
          { provider: 'openai', apiKey: 'test-key' }
        );

        // Assert
        expect(result.trigger).toBe(trigger);
        expect(result.analysis).toBe(`Analysis for ${trigger}`);
      }
    });
  });

  describe('Data Retrieval Methods', () => {
    test('should retrieve game overview by session ID', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const mockRow = {
        id: 'overview-123',
        session_id: sessionId,
        campaign_id: 'campaign-123',
        session_summary: 'Test summary',
        current_objectives: '["Objective 1", "Objective 2"]',
        key_npcs: '[{"id":"npc1","name":"Guard","role":"protector","status":"active"}]',
        current_situation: 'Peaceful town',
        atmosphere: 'Calm and serene',
        tensions: '["Economic uncertainty"]',
        opportunities: '["Trade agreement"]',
        player_briefing: 'Welcome to the adventure',
        suggested_actions: '["Explore", "Talk to NPCs"]',
        warnings_and_hints: '["Be careful at night"]',
        generated_at: '2024-01-01T10:00:00.000Z',
        ai_provider: 'openai',
        context: '{"mood":"peaceful"}'
      };
      mockStatement.get.mockReturnValue(mockRow);

      // Act
      const result = await aiGameMasterService.getGameOverview(sessionId);

      // Assert
      expect(result).toEqual({
        id: 'overview-123',
        sessionId,
        campaignId: 'campaign-123',
        sessionSummary: 'Test summary',
        currentObjectives: ['Objective 1', 'Objective 2'],
        keyNPCs: [{ id: 'npc1', name: 'Guard', role: 'protector', status: 'active' }],
        currentSituation: 'Peaceful town',
        atmosphere: 'Calm and serene',
        tensions: ['Economic uncertainty'],
        opportunities: ['Trade agreement'],
        playerBriefing: 'Welcome to the adventure',
        suggestedActions: ['Explore', 'Talk to NPCs'],
        warningsAndHints: ['Be careful at night'],
        generatedAt: '2024-01-01T10:00:00.000Z',
        aiProvider: 'openai',
        context: { mood: 'peaceful' }
      });
    });

    test('should return null when game overview not found', async () => {
      // Arrange
      mockStatement.get.mockReturnValue(null);

      // Act
      const result = await aiGameMasterService.getGameOverview('non-existent-session');

      // Assert
      expect(result).toBeNull();
    });

    test('should retrieve task explanation by session ID', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const mockRow = {
        id: 'task-123',
        session_id: sessionId,
        quest_id: 'quest-456',
        milestone_id: null,
        task_title: 'Find the Crystal',
        task_description: 'Locate the ancient crystal in the cave',
        objectives: '[{"id":"obj1","description":"Enter cave","type":"primary","completed":false}]',
        background_context: 'The crystal holds great power',
        relevant_history: '["Ancient texts mention the crystal"]',
        stakeholders: '["Village elder", "Cave guardian"]',
        approach_suggestions: '["Stealth", "Negotiation"]',
        potential_challenges: '["Cave monsters", "Traps"]',
        success_criteria: '["Find crystal", "Return safely"]',
        failure_consequences: '["Crystal lost forever"]',
        atmospheric_details: 'Damp and echoing caves',
        sensory_descriptions: 'Dripping water, musty air',
        mood_setting: 'Mysterious and dangerous',
        difficulty: 'medium',
        estimated_duration: 90,
        generated_at: '2024-01-01T11:00:00.000Z',
        ai_provider: 'anthropic'
      };
      mockStatement.get.mockReturnValue(mockRow);

      // Act
      const result = await aiGameMasterService.getTaskExplanation(sessionId);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: 'task-123',
        sessionId,
        questId: 'quest-456',
        taskTitle: 'Find the Crystal',
        difficulty: 'medium',
        estimatedDuration: 90
      }));
      expect(result!.objectives).toHaveLength(1);
      expect(result!.relevantHistory).toEqual(['Ancient texts mention the crystal']);
    });

    test('should retrieve recent result judgments', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const mockRows = [
        {
          id: 'judgment-1',
          session_id: sessionId,
          character_id: 'char-123',
          action_description: 'Attack with sword',
          outcome: 'success',
          success_level: 85,
          immediate_results: 'Hit successfully',
          longterm_consequences: '["Enemy retreats"]',
          character_impact: 'Gained confidence',
          story_progression: 'Battle won',
          dramatic_description: 'Blade strikes true',
          atmospheric_changes: 'Tension decreases',
          npc_reactions: '[]',
          new_opportunities: '["Chase the enemy"]',
          emerging_challenges: '[]',
          suggested_followups: '["Pursue"]',
          difficulty: 15,
          modifiers: '["good positioning"]',
          timestamp: '2024-01-01T12:00:00.000Z',
          ai_provider: 'google'
        }
      ];
      mockStatement.all.mockReturnValue(mockRows);

      // Act
      const result = await aiGameMasterService.getRecentResultJudgments(sessionId, 5);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'judgment-1',
        sessionId,
        characterId: 'char-123',
        actionDescription: 'Attack with sword',
        outcome: 'success',
        successLevel: 85
      }));
    });
  });

  describe('Session Initialization System', () => {
    test('should initialize session with AI successfully', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const campaignId = 'test-campaign-id';
      const durationConfig: SessionDurationConfig = {
        totalDays: 3,
        actionsPerDay: 3,
        milestoneCount: 4
      };
      const characters = [
        TestDataFactory.createTestCharacter(campaignId, { name: 'Hero', level: 3 })
      ] as Character[];
      const campaignTheme = 'クラシックファンタジー';
      const aiSettings = { provider: 'openai', model: 'gpt-4' };

      // Mock AI responses
      mockAIService.chat
        .mockResolvedValueOnce({
          message: '冒険の始まり！勇者たちは村の広場に集まりました。'
        })
        .mockResolvedValueOnce({
          message: '```json\n[{"title":"村の謎を解明","description":"村に起きている不思議な現象を調査する","category":"investigation","importance":"high","estimatedTime":60,"requirements":["村人との会話"],"rewards":["経験値"]}]\n```'
        })
        .mockResolvedValueOnce({
          message: '```json\n{"enemies":[{"name":"ゴブリン","description":"小さな緑の怪物","level":2,"hitPoints":15,"abilities":["素早い攻撃"],"theme":"クラシックファンタジー"}],"events":[{"title":"謎の足跡発見","description":"森で奇妙な足跡を発見","eventType":"investigation","difficulty":"easy","choices":["調査する","無視する"],"theme":"クラシックファンタジー"}],"npcs":[{"name":"村長","description":"親切な老人","personality":"知恵深い","role":"情報提供者","communicationConditions":["昼間に会う"],"theme":"クラシックファンタジー"}],"items":[{"name":"古い地図","description":"謎の場所が記された地図","itemType":"key","rarity":"uncommon","obtainMethods":["村長から受け取る"],"theme":"クラシックファンタジー"}],"quests":[{"title":"失われた宝物","description":"古代の宝物を見つける","questType":"main","difficulty":"medium","requirements":["古い地図を持つ"],"rewards":["ゴールド"],"theme":"クラシックファンタジー"}]}\n```'
        });

      mockStatement.run.mockReturnValue({ changes: 1 });
      mockSessionService.addChatMessage.mockResolvedValue(null);

      const progressCallback = jest.fn();

      // Act
      const result = await aiGameMasterService.initializeSessionWithAI(
        sessionId,
        campaignId,
        durationConfig,
        characters,
        campaignTheme,
        aiSettings,
        progressCallback
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.milestones).toHaveLength(1);
      expect(result.entityPool).toBeDefined();
      expect(result.gameOverview).toBeDefined();
      expect(progressCallback).toHaveBeenCalledWith('scenario', 0, 'シナリオ設定を準備中...');
      expect(progressCallback).toHaveBeenCalledWith('entity', 100, 'エンティティ生成完了');
    });

    test('should handle AI failure during session initialization', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const campaignId = 'test-campaign-id';
      const durationConfig: SessionDurationConfig = {
        totalDays: 2,
        actionsPerDay: 2,
        milestoneCount: 2
      };

      mockAIService.chat.mockRejectedValue(new Error('AI service down'));

      // Act & Assert
      await expect(
        aiGameMasterService.initializeSessionWithAI(
          sessionId,
          campaignId,
          durationConfig,
          [],
          'テストテーマ',
          { provider: 'openai' }
        )
      ).rejects.toThrow('セッション初期化に失敗しました: AI service down');
    });
  });

  describe('Player Action Response System', () => {
    test('should generate player action response successfully', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const playerCharacterId = 'char-123';
      const playerAction = 'I search the room for clues';
      const sessionContext = {
        characters: [
          { id: 'char-123', name: 'Detective', characterType: 'PC', level: 4 }
        ],
        currentSession: { status: 'active', mode: 'exploration' },
        activeQuests: [{ title: 'Solve the Mystery', status: 'in_progress' }],
        recentEvents: ['Entered the mansion'],
        campaignTension: 60,
        mood: 'tense'
      } as SessionContext;

      const mockAIResponse = {
        message: 'あなたが部屋を注意深く調べていると、暖炉の陰に隠された小さな紙片を発見します。それには謎めいた文字が書かれており...'
      };

      mockAIService.chat.mockResolvedValue(mockAIResponse);
      mockSessionService.addChatMessage.mockResolvedValue(null);

      // Act
      await aiGameMasterService.generatePlayerActionResponse(
        sessionId,
        playerCharacterId,
        playerAction,
        sessionContext,
        { provider: 'anthropic', model: 'claude-3-sonnet' }
      );

      // Assert
      expect(mockAIService.chat).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        persona: 'gm_assistant',
        message: expect.stringContaining('Detectiveの行動: "I search the room for clues"')
      }));
      expect(mockSessionService.addChatMessage).toHaveBeenCalledWith(sessionId, {
        speaker: 'ゲームマスター',
        message: mockAIResponse.message,
        type: 'system'
      });
    });

    test('should throw error when player action response fails', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const playerCharacterId = 'char-123';
      const playerAction = 'Test action';
      const sessionContext = {
        characters: [{ id: 'char-123', name: 'Player' }]
      } as SessionContext;

      mockAIService.chat.mockRejectedValue(new Error('Network timeout'));

      // Act & Assert
      await expect(
        aiGameMasterService.generatePlayerActionResponse(
          sessionId,
          playerCharacterId,
          playerAction,
          sessionContext,
          { provider: 'google' }
        )
      ).rejects.toThrow('プレイヤーアクション応答生成に失敗しました: Network timeout');
    });
  });

  describe('Event Introduction Generation', () => {
    test('should generate event introduction successfully', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const campaignId = 'test-campaign-id';
      const eventType = 'combat';
      const context = {
        characters: [
          { name: 'Warrior', class: 'Fighter', level: 5 },
          { name: 'Mage', class: 'Wizard', level: 4 }
        ],
        setting: 'Dark Forest',
        playerCharacter: 'Warrior',
        currentScenario: 'The Goblin Raids'
      };

      const mockAIResponse = {
        message: '突然、森の奥から不穏な唸り声が響いてきました。WarriorとMageの前に現れたのは、牙をむき出しにした凶暴なゴブリンの群れです。皆さんはどうしますか？'
      };

      mockAIService.chat.mockResolvedValue(mockAIResponse);
      mockSessionService.addChatMessage.mockResolvedValue(null);

      // Act
      const result = await aiGameMasterService.generateEventIntroduction(
        sessionId,
        campaignId,
        eventType,
        context,
        { provider: 'openai', model: 'gpt-4' }
      );

      // Assert
      expect(result).toBe(mockAIResponse.message);
      expect(mockSessionService.addChatMessage).toHaveBeenCalledWith(sessionId, {
        speaker: 'ゲームマスター',
        message: mockAIResponse.message,
        type: 'system'
      });
      expect(mockAIService.chat).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('combatイベントにふさわしい緊張感や雰囲気を演出')
      }));
    });

    test('should use custom prompt when provided', async () => {
      // Arrange
      const customPrompt = 'Custom event introduction prompt';
      const mockAIResponse = { message: 'Custom response' };

      mockAIService.chat.mockResolvedValue(mockAIResponse);
      mockSessionService.addChatMessage.mockResolvedValue(null);

      // Act
      await aiGameMasterService.generateEventIntroduction(
        'session-id',
        'campaign-id',
        'exploration',
        { characters: [], setting: '', playerCharacter: '', currentScenario: '' },
        { provider: 'google' },
        customPrompt
      );

      // Assert
      expect(mockAIService.chat).toHaveBeenCalledWith(expect.objectContaining({
        message: customPrompt
      }));
    });
  });

  describe('API Key Management', () => {
    test('should get API key for different providers', async () => {
      // Arrange - API keys are set in beforeEach
      
      // Test through initializeSessionWithAI which calls private method
      mockAIService.chat.mockResolvedValue({ message: 'test response' });
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act & Assert - Should not throw for valid providers
      await expect(
        aiGameMasterService.initializeSessionWithAI(
          'session-id',
          'campaign-id',
          { totalDays: 1, actionsPerDay: 1, milestoneCount: 1 },
          [],
          'test',
          { provider: 'openai' }
        )
      ).resolves.toBeDefined();
    });

    test('should throw error when API key not found', async () => {
      // Arrange
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      // Act & Assert
      await expect(
        aiGameMasterService.initializeSessionWithAI(
          'session-id',
          'campaign-id',
          { totalDays: 1, actionsPerDay: 1, milestoneCount: 1 },
          [],
          'test',
          { provider: 'openai' }
        )
      ).rejects.toThrow('API key not found for provider: openai');
    });
  });

  describe('Service Singleton Pattern', () => {
    test('should return same instance from getAIGameMasterService', () => {
      // Act
      const instance1 = getAIGameMasterService();
      const instance2 = getAIGameMasterService();

      // Assert
      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    test('should handle database save failures gracefully', async () => {
      // Arrange
      const sessionContext = {
        currentSession: { status: 'active' },
        characters: [],
        activeQuests: [],
        completedMilestones: [],
        recentEvents: [],
        campaignTension: 50,
        playerEngagement: 70,
        storyProgression: 20,
        difficulty: 'medium',
        mood: 'neutral'
      } as SessionContext;

      mockAIService.chat.mockResolvedValue({ message: 'AI response' });
      mockStatement.run.mockImplementation(() => {
        throw new Error('Database constraint violation');
      });

      // Act & Assert
      await expect(
        aiGameMasterService.generateGameOverview(
          'session-id',
          'campaign-id',
          sessionContext,
          { provider: 'openai' }
        )
      ).rejects.toThrow();
    });

    test('should handle chat message posting failures gracefully', async () => {
      // Arrange
      const sessionContext = {
        currentSession: { status: 'active' },
        characters: [],
        activeQuests: [],
        completedMilestones: [],
        recentEvents: [],
        campaignTension: 50,
        playerEngagement: 70,
        storyProgression: 20,
        difficulty: 'medium',
        mood: 'neutral'
      } as SessionContext;

      mockAIService.chat.mockResolvedValue({ message: 'AI response' });
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockSessionService.addChatMessage.mockRejectedValue(new Error('Chat service down'));

      // Act - Should not throw despite chat failure
      const result = await aiGameMasterService.generateGameOverview(
        'session-id',
        'campaign-id',
        sessionContext,
        { provider: 'anthropic' }
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.sessionSummary).toBe('AI response');
    });
  });
});