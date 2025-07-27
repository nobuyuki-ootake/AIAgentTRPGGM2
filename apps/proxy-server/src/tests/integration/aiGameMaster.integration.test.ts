/**
 * AI Game Master Integration Tests
 * Testing AI Game Master service endpoints with mock AI providers
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { Database as DatabaseType } from 'better-sqlite3';
import { TRPGCampaign, TRPGSession, TRPGCharacter, APIResponse, SessionDurationConfig } from '@ai-agent-trpg/types';
import { aiGameMasterRouter } from '../../routes/aiGameMaster';
import { errorHandler } from '../../middleware/errorHandler';
import { fullIntegrationMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('AI Game Master Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let mockServices: MockServerServices;
  let testCampaign: TRPGCampaign;
  let testSession: TRPGSession;
  let testCharacters: TRPGCharacter[] = [];

  beforeAll(async () => {
    // Set up test database
    db = testDatabase.createTestDatabase();
    
    // Mock the database service
    jest.mock('../../database/database', () => ({
      getDatabase: () => db
    }));

    // Set up express app
    app = express();
    app.use(express.json());
    app.use('/api/ai-game-master', aiGameMasterRouter);
    app.use(errorHandler);
    
    // Initialize mock services
    mockServices = await fullIntegrationMockSetup();
    
    // Start server
    server = app.listen(0);
  });

  afterAll(async () => {
    await mockServices.cleanup();
    testDatabase.closeAllDatabases();
    server.close();
  });

  beforeEach(async () => {
    // Reset database and mock services
    testDatabase.resetDatabase(db);
    await mockServices.reset();
    
    // Create test data
    testCampaign = TestDataFactory.createTestCampaign({
      name: 'Test TRPG Campaign',
      scenarioDescription: 'A fantasy adventure in a mystical realm'
    });
    insertCampaignToDb(db, testCampaign);

    testSession = TestDataFactory.createTestSession(testCampaign.id, {
      name: 'First Adventure',
      status: 'active'
    });
    insertSessionToDb(db, testSession);

    testCharacters = [
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'Hero Warrior', 
        type: 'PC',
        stats: { level: 3, hp: 120, mp: 50 }
      }),
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'Village Elder', 
        type: 'NPC',
        aiPersonality: { traits: ['wise', 'helpful'], speechPattern: 'formal' }
      }),
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'Orc Warrior', 
        type: 'Enemy',
        stats: { level: 2, hp: 80, challengeRating: 1 }
      })
    ];

    for (const character of testCharacters) {
      insertCharacterToDb(db, character);
    }
  });

  describe('POST /api/ai-game-master/event-introduction - イベント導入生成', () => {
    it('戦闘イベントの導入シーンを正常に生成する', async () => {
      // Arrange
      const eventRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        eventType: 'combat',
        context: {
          location: 'Dark Forest',
          enemies: [testCharacters[2]], // Orc Warrior
          partyCharacters: [testCharacters[0]], // Hero Warrior
          situation: 'Ambush while traveling'
        },
        provider: 'openai',
        model: 'gpt-4'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/event-introduction')
        .send(eventRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<{ content: string }>;
      expect(body.success).toBe(true);
      expect(body.data.content).toBeDefined();
      expect(body.data.content.length).toBeGreaterThan(50);
      expect(body.data.content).toContain('Dark Forest');
      expect(body.timestamp).toBeDefined();
    });

    it('探索イベントの導入シーンを生成する', async () => {
      // Arrange
      const explorationRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        eventType: 'exploration',
        context: {
          location: 'Ancient Ruins',
          partyCharacters: [testCharacters[0]],
          discoveredItems: ['Ancient Map Fragment'],
          mood: 'mysterious'
        },
        provider: 'anthropic',
        model: 'claude-3-sonnet'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/event-introduction')
        .send(explorationRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<{ content: string }>;
      expect(body.success).toBe(true);
      expect(body.data.content).toBeDefined();
      expect(body.data.content).toContain('Ancient Ruins');
    });

    it('社交イベントの導入シーンを生成する', async () => {
      // Arrange
      const socialRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        eventType: 'social',
        context: {
          location: 'Village Tavern',
          npcs: [testCharacters[1]], // Village Elder
          partyCharacters: [testCharacters[0]],
          objective: 'Gather information about missing villagers'
        },
        provider: 'google',
        model: 'gemini-pro'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/event-introduction')
        .send(socialRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<{ content: string }>;
      expect(body.success).toBe(true);
      expect(body.data.content).toBeDefined();
      expect(body.data.content).toContain('Village Tavern');
    });

    it('カスタムプロンプト付きでイベント導入を生成する', async () => {
      // Arrange
      const customRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        eventType: 'mystery',
        context: {
          location: 'Abandoned Manor',
          clues: ['Bloody handprint', 'Torn letter'],
          mood: 'horror'
        },
        provider: 'openai',
        customPrompt: 'Focus on creating a suspenseful atmosphere with detailed sensory descriptions'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/event-introduction')
        .send(customRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<{ content: string }>;
      expect(body.success).toBe(true);
      expect(body.data.content).toBeDefined();
      expect(body.data.content).toContain('Abandoned Manor');
    });

    it('必須フィールドが欠けている場合バリデーションエラーを返す', async () => {
      // Arrange
      const invalidRequest = {
        sessionId: testSession.id,
        // Missing campaignId, eventType, context, provider
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/event-introduction')
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('required');
    });
  });

  describe('POST /api/ai-game-master/game-overview - ゲーム概要生成', () => {
    it('セッション開始時のゲーム概要を生成する', async () => {
      // Arrange
      const overviewRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        context: {
          sessionName: testSession.name,
          campaignDescription: testCampaign.scenarioDescription,
          playerCharacters: [testCharacters[0]],
          currentLocation: 'Starting Village',
          sessionGoals: ['Find the missing artifact', 'Rescue the villagers'],
          timeConfig: {
            totalDuration: 240,
            timeSlots: 8
          } as SessionDurationConfig
        },
        provider: 'openai',
        model: 'gpt-4'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/game-overview')
        .send(overviewRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.sessionSummary).toBeDefined();
      expect(body.data.objectives).toBeDefined();
      expect(body.data.keyCharacters).toBeDefined();
      expect(body.data.worldState).toBeDefined();
    });

    it('複数のプレイヤーキャラクターを含むゲーム概要を生成する', async () => {
      // Arrange
      const multiCharacterOverview = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        context: {
          sessionName: 'Party Adventure',
          playerCharacters: [
            testCharacters[0],
            TestDataFactory.createTestCharacter(testCampaign.id, { 
              name: 'Wizard Ally', 
              type: 'PC',
              stats: { level: 3, hp: 80, mp: 120 }
            })
          ],
          currentLocation: 'Crossroads Inn',
          sessionGoals: ['Form party alliance', 'Plan next expedition']
        },
        provider: 'google',
        model: 'gemini-pro'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/game-overview')
        .send(multiCharacterOverview)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data.keyCharacters).toHaveLength(2);
      expect(body.data.sessionSummary).toContain('Party Adventure');
    });

    it('AIサービスエラー時に適切なエラーハンドリングを行う', async () => {
      // Arrange
      mockServices.aiProviders.setScenario('api_error');
      const errorRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        context: {
          sessionName: 'Error Test',
          playerCharacters: [testCharacters[0]]
        },
        provider: 'openai'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/game-overview')
        .send(errorRequest)
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AI_SERVICE_ERROR');
      expect(response.body.error.provider).toBe('openai');
    });
  });

  describe('POST /api/ai-game-master/npc-response - NPC応答生成', () => {
    it('NPCの会話応答を生成する', async () => {
      // Arrange
      const npcResponseRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        npcId: testCharacters[1].id, // Village Elder
        playerInput: 'Tell me about the strange happenings in the village',
        context: {
          location: 'Village Center',
          mood: 'concerned',
          previousInteractions: []
        },
        provider: 'anthropic',
        model: 'claude-3-opus'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/npc-response')
        .send(npcResponseRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data.response).toBeDefined();
      expect(body.data.emotion).toBeDefined();
      expect(body.data.actionSuggestions).toBeDefined();
    });

    it('NPCの戦闘中の台詞を生成する', async () => {
      // Arrange
      const combatNpcRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        npcId: testCharacters[2].id, // Orc Warrior (Enemy)
        situationType: 'combat',
        context: {
          combatPhase: 'beginning',
          playerActions: ['Hero charges forward'],
          healthStatus: 'full'
        },
        provider: 'google'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/npc-response')
        .send(combatNpcRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data.response).toBeDefined();
      expect(body.data.combatAction).toBeDefined();
    });
  });

  describe('POST /api/ai-game-master/scene-transition - シーン遷移', () => {
    it('場所移動時のシーン遷移を生成する', async () => {
      // Arrange
      const transitionRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        transitionType: 'location_change',
        fromLocation: 'Village',
        toLocation: 'Dark Forest',
        context: {
          characters: [testCharacters[0]],
          timeOfDay: 'dusk',
          weather: 'foggy',
          travelMethod: 'on_foot'
        },
        provider: 'openai'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/scene-transition')
        .send(transitionRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data.narrative).toBeDefined();
      expect(body.data.environmentalChanges).toBeDefined();
      expect(body.data.narrative).toContain('Dark Forest');
    });

    it('時間経過のシーン遷移を生成する', async () => {
      // Arrange
      const timeTransitionRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        transitionType: 'time_skip',
        timeSkip: {
          amount: 8,
          unit: 'hours'
        },
        context: {
          characters: [testCharacters[0]],
          restType: 'long_rest',
          location: 'Camp Site'
        },
        provider: 'anthropic'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/scene-transition')
        .send(timeTransitionRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data.narrative).toBeDefined();
      expect(body.data.timeEffects).toBeDefined();
    });
  });

  describe('エラーハンドリングとレート制限', () => {
    it('レート制限エラーを適切に処理する', async () => {
      // Arrange
      mockServices.aiProviders.setScenario('rate_limit');
      const request_data = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        eventType: 'combat',
        context: { location: 'Test' },
        provider: 'openai'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/event-introduction')
        .send(request_data)
        .expect('Content-Type', /json/)
        .expect(429);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AI_SERVICE_ERROR');
      expect(response.body.error.details).toContain('rate limit');
    });

    it('無効なプロバイダーでエラーを返す', async () => {
      // Arrange
      const invalidProviderRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        eventType: 'combat',
        context: { location: 'Test' },
        provider: 'invalid_provider'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-game-master/event-introduction')
        .send(invalidProviderRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('コンテキスト管理と継続性', () => {
    it('セッション内での会話履歴を保持する', async () => {
      // Arrange - First interaction
      const firstRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        npcId: testCharacters[1].id,
        playerInput: 'What is your name?',
        context: { location: 'Village' },
        provider: 'openai'
      };

      // Act - First interaction
      const firstResponse = await request(app)
        .post('/api/ai-game-master/npc-response')
        .send(firstRequest)
        .expect(200);

      // Arrange - Second interaction with history
      const secondRequest = {
        sessionId: testSession.id,
        campaignId: testCampaign.id,
        npcId: testCharacters[1].id,
        playerInput: 'Can you help us with our quest?',
        context: { 
          location: 'Village',
          previousInteractions: [
            {
              playerInput: 'What is your name?',
              npcResponse: firstResponse.body.data.response
            }
          ]
        },
        provider: 'openai'
      };

      // Act - Second interaction
      const secondResponse = await request(app)
        .post('/api/ai-game-master/npc-response')
        .send(secondRequest)
        .expect(200);

      // Assert
      expect(secondResponse.body.success).toBe(true);
      expect(secondResponse.body.data.response).toBeDefined();
      // The response should acknowledge previous interaction
    });
  });
});

// Helper functions
function insertCampaignToDb(db: DatabaseType, campaign: TRPGCampaign): void {
  const stmt = db.prepare(`
    INSERT INTO campaigns (id, name, description, status, gm_id, settings, scenario_description, scenario_summary, base_scenario_illustration, created_at, updated_at, version, last_modified_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

function insertSessionToDb(db: DatabaseType, session: TRPGSession): void {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, campaign_id, name, status, start_time, end_time, session_data, notes, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    session.id,
    session.campaignId,
    session.name,
    session.status,
    session.startTime?.toISOString() || null,
    session.endTime?.toISOString() || null,
    JSON.stringify(session.sessionData),
    session.notes,
    session.createdAt.toISOString(),
    session.updatedAt.toISOString(),
    session.version
  );
}

function insertCharacterToDb(db: DatabaseType, character: TRPGCharacter): void {
  const stmt = db.prepare(`
    INSERT INTO characters (id, campaign_id, name, type, description, stats, status, player_id, portrait_url, ai_personality, location_id, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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