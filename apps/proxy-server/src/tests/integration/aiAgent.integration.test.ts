/**
 * AI Agent Routes Integration Tests
 * Testing the full request-response cycle for AI agent endpoints
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { APIResponse, TriggerChainRequest, TriggerChainResponse, EnemyTacticsLevel } from '@ai-agent-trpg/types';
import { aiAgentRouter } from '../../routes/aiAgent';
import { errorHandler } from '../../middleware/errorHandler';
import { fullIntegrationMockSetup, MockServerServices } from '../mocks';
import { TestDataFactory } from '../setup/testDatabase';

describe('AI Agent Routes Integration Tests', () => {
  let app: Express;
  let server: Server;
  let mockServices: MockServerServices;

  beforeAll(async () => {
    // Set up express app with middleware
    app = express();
    app.use(express.json());
    app.use('/api/ai-agent', aiAgentRouter);
    app.use(errorHandler);

    // Initialize mock services
    mockServices = await fullIntegrationMockSetup();
    
    // Start server
    server = app.listen(0); // Random port
  });

  afterAll(async () => {
    await mockServices.cleanup();
    server.close();
  });

  beforeEach(async () => {
    await mockServices.reset();
  });

  describe('POST /api/ai-agent/test-key - APIキー検証エンドポイント', () => {
    it('有効なAPIキーで成功レスポンスを返す', async () => {
      // Arrange
      const validRequest = {
        provider: 'openai',
        apiKey: 'test-api-key-123',
        model: 'gpt-4'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/test-key')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<{ valid: boolean; provider: string }>;
      expect(body.success).toBe(true);
      expect(body.data).toEqual({
        valid: true,
        provider: 'openai'
      });
      expect(body.timestamp).toBeDefined();
    });

    it('プロバイダーが未指定の場合バリデーションエラーを返す', async () => {
      // Arrange
      const invalidRequest = {
        apiKey: 'test-api-key-123'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/test-key')
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Provider and API key are required');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('無効なAPIキーで失敗レスポンスを返す', async () => {
      // Arrange
      mockServices.aiProviders.setScenario('invalid_key');
      const invalidKeyRequest = {
        provider: 'openai',
        apiKey: 'invalid-key',
        model: 'gpt-4'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/test-key')
        .send(invalidKeyRequest)
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AI_SERVICE_ERROR');
    });
  });

  describe('POST /api/ai-agent/campaign/create-assistance - キャンペーン作成支援', () => {
    it('完全なリクエストデータでキャンペーン作成支援を成功させる', async () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign();
      const assistanceRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        campaignBasics: {
          name: campaign.name,
          description: campaign.description,
          systemType: campaign.settings.systemType
        },
        worldSettings: {
          worldType: 'fantasy',
          magicLevel: 'high',
          technologyLevel: 'medieval'
        },
        playerInfo: {
          playerCount: 4,
          experienceLevel: 'beginner'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/campaign/create-assistance')
        .send(assistanceRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.scenarios).toBeDefined();
      expect(body.data.worldDetails).toBeDefined();
      expect(body.data.suggestions).toBeDefined();
    });

    it('必須フィールドが欠けている場合バリデーションエラーを返す', async () => {
      // Arrange
      const incompleteRequest = {
        provider: 'openai',
        apiKey: 'test-api-key'
        // Missing campaignBasics
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/campaign/create-assistance')
        .send(incompleteRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/ai-agent/character/generate - キャラクター生成', () => {
    it('PCキャラクターを正常に生成する', async () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign();
      const characterRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        characterType: 'PC',
        characterBasics: {
          name: 'Test Hero',
          class: 'Warrior',
          race: 'Human'
        },
        campaignContext: {
          campaignId: campaign.id,
          worldType: 'fantasy',
          powerLevel: 'heroic'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/character/generate')
        .send(characterRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe('Test Hero');
      expect(body.data.type).toBe('PC');
      expect(body.data.stats).toBeDefined();
    });

    it('NPCキャラクターを正常に生成する', async () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign();
      const npcRequest = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
        model: 'claude-3-opus',
        characterType: 'NPC',
        characterBasics: {
          name: 'Shop Keeper',
          role: 'merchant',
          personality: 'friendly'
        },
        campaignContext: {
          campaignId: campaign.id,
          location: 'Market District'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/character/generate')
        .send(npcRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data.type).toBe('NPC');
      expect(body.data.aiPersonality).toBeDefined();
    });
  });

  describe('POST /api/ai-agent/session/gm-response - GMレスポンス生成', () => {
    it('プレイヤーアクションに対してGMレスポンスを生成する', async () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign();
      const session = TestDataFactory.createTestSession(campaign.id);
      const gmRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        sessionId: session.id,
        playerAction: {
          characterId: 'char-123',
          action: 'investigate',
          target: 'mysterious door',
          description: 'I carefully examine the door for traps'
        },
        context: {
          currentLocation: 'Ancient Temple',
          activeQuests: ['Find the Sacred Artifact'],
          partyStatus: 'cautious'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/session/gm-response')
        .send(gmRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data.narration).toBeDefined();
      expect(body.data.outcomes).toBeDefined();
      expect(body.data.skillChecks).toBeDefined();
    });
  });

  describe('POST /api/ai-agent/trigger-chain - トリガーチェーン実行', () => {
    it('有効なトリガーチェーンリクエストを処理する', async () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign();
      const triggerRequest: TriggerChainRequest = {
        campaignId: campaign.id,
        sessionId: 'session-123',
        trigger: {
          type: 'location_entry',
          source: 'party',
          target: 'location-456',
          context: {
            previousLocation: 'location-123',
            partySize: 4
          }
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/trigger-chain')
        .send(triggerRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TriggerChainResponse>;
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.executedTriggers).toBeDefined();
      expect(body.data.stateChanges).toBeDefined();
      expect(body.data.notifications).toBeDefined();
    });

    it('無効なトリガータイプでエラーを返す', async () => {
      // Arrange
      const invalidTriggerRequest = {
        campaignId: 'campaign-123',
        trigger: {
          type: 'invalid_type',
          source: 'party'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/trigger-chain')
        .send(invalidTriggerRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/ai-agent/tactics/evaluate - 戦術評価', () => {
    it('エネミーの戦術レベルを評価する', async () => {
      // Arrange
      const tacticsRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        campaignId: 'campaign-123',
        sessionId: 'session-123',
        enemyId: 'enemy-456',
        battleContext: {
          terrain: 'forest',
          weather: 'foggy',
          timeOfDay: 'night'
        },
        partyStatus: {
          averageLevel: 5,
          formation: 'defensive',
          resources: 'low'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/tactics/evaluate')
        .send(tacticsRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data.tacticsLevel).toBeDefined();
      expect(['low', 'medium', 'high', 'extreme']).toContain(body.data.tacticsLevel);
      expect(body.data.recommendations).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('AIサービスがダウンしている場合適切なエラーを返す', async () => {
      // Arrange
      mockServices.aiProviders.setScenario('service_unavailable');
      const request_data = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/test-key')
        .send(request_data)
        .expect('Content-Type', /json/)
        .expect(503);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AI_SERVICE_ERROR');
      expect(response.body.error.provider).toBe('openai');
    });

    it('レート制限エラーを適切に処理する', async () => {
      // Arrange
      mockServices.aiProviders.setScenario('rate_limit');
      const request_data = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
        characterType: 'PC',
        characterBasics: { name: 'Test' }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-agent/character/generate')
        .send(request_data)
        .expect('Content-Type', /json/)
        .expect(429);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AI_SERVICE_ERROR');
      expect(response.body.error.details).toContain('rate limit');
    });
  });
});