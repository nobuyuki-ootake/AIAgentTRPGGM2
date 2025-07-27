/**
 * AI Entity Management Integration Tests
 * Testing AI-powered entity generation and management endpoints
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { Database as DatabaseType } from 'better-sqlite3';
import { TRPGCampaign, TRPGSession, APIResponse } from '@ai-agent-trpg/types';
import { aiEntityManagementRouter } from '../../routes/aiEntityManagement';
import { errorHandler } from '../../middleware/errorHandler';
import { fullIntegrationMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('AI Entity Management Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let mockServices: MockServerServices;
  let testCampaign: TRPGCampaign;
  let testSession: TRPGSession;

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
    app.use('/api/ai-entity', aiEntityManagementRouter);
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
      name: 'Entity Test Campaign',
      scenarioDescription: 'A campaign for testing entity management'
    });
    insertCampaignToDb(db, testCampaign);

    testSession = TestDataFactory.createTestSession(testCampaign.id, {
      name: 'Entity Test Session',
      status: 'active'
    });
    insertSessionToDb(db, testSession);
  });

  describe('POST /api/ai-entity/query - エンティティクエリ', () => {
    it('キャンペーン内の全エンティティを検索する', async () => {
      // Arrange
      const queryRequest = {
        campaignId: testCampaign.id,
        entityTypes: ['characters', 'locations', 'items'],
        filters: {
          status: 'active'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/query')
        .send(queryRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.entities).toBeDefined();
      expect(body.totalCount).toBeDefined();
      expect(body.filters).toEqual(queryRequest.filters);
    });

    it('特定の場所のエンティティをフィルタリングする', async () => {
      // Arrange
      const locationQueryRequest = {
        campaignId: testCampaign.id,
        locationId: 'village-center',
        entityTypes: ['characters'],
        filters: {
          type: 'NPC'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/query')
        .send(locationQueryRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.entities).toBeInstanceOf(Array);
      expect(body.filters.type).toBe('NPC');
    });

    it('セッション固有のエンティティを検索する', async () => {
      // Arrange
      const sessionQueryRequest = {
        campaignId: testCampaign.id,
        sessionId: testSession.id,
        entityTypes: ['events', 'encounters'],
        filters: {
          difficulty: 'medium'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/query')
        .send(sessionQueryRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.filters.difficulty).toBe('medium');
    });

    it('複雑なフィルター条件でエンティティを検索する', async () => {
      // Arrange
      const complexQueryRequest = {
        campaignId: testCampaign.id,
        entityTypes: ['characters', 'items'],
        filters: {
          level: { min: 1, max: 5 },
          rarity: ['common', 'uncommon'],
          tags: ['combat', 'social'],
          status: 'active'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/query')
        .send(complexQueryRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.filters).toEqual(complexQueryRequest.filters);
    });

    it('無効なリクエストでエラーハンドリングを確認する', async () => {
      // Arrange
      const invalidRequest = {
        // Missing campaignId
        entityTypes: ['characters']
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/query')
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/ai-entity/generate - AI エンティティ生成', () => {
    it('NPCキャラクターを複数生成する', async () => {
      // Arrange
      const npcGenerationRequest = {
        campaignId: testCampaign.id,
        sessionId: testSession.id,
        entityType: 'characters',
        count: 3,
        theme: 'medieval_fantasy',
        subType: 'npc',
        context: {
          location: 'village_tavern',
          purpose: 'social_interaction',
          powerLevel: 'civilian'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/generate')
        .send(npcGenerationRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.entities).toHaveLength(3);
      expect(body.generatedCount).toBe(3);
      expect(body.entities[0]).toHaveProperty('name');
      expect(body.entities[0]).toHaveProperty('type');
      expect(body.entities[0]).toHaveProperty('aiPersonality');
    });

    it('敵キャラクターを戦闘用に生成する', async () => {
      // Arrange
      const enemyGenerationRequest = {
        campaignId: testCampaign.id,
        sessionId: testSession.id,
        entityType: 'characters',
        count: 2,
        theme: 'dark_fantasy',
        subType: 'enemy',
        context: {
          encounterType: 'combat',
          challengeRating: 3,
          environment: 'forest',
          tactics: 'ambush'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/generate')
        .send(enemyGenerationRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.entities).toHaveLength(2);
      expect(body.entities[0].type).toBe('Enemy');
      expect(body.entities[0]).toHaveProperty('stats');
      expect(body.entities[0].stats).toHaveProperty('challengeRating');
    });

    it('場所とロケーションを生成する', async () => {
      // Arrange
      const locationGenerationRequest = {
        campaignId: testCampaign.id,
        entityType: 'locations',
        count: 4,
        theme: 'urban_fantasy',
        context: {
          locationType: 'district',
          parentLocation: 'main_city',
          atmosphere: 'mysterious',
          keyFeatures: ['shops', 'alleys', 'landmarks']
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/generate')
        .send(locationGenerationRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.entities).toHaveLength(4);
      expect(body.entities[0]).toHaveProperty('name');
      expect(body.entities[0]).toHaveProperty('description');
      expect(body.entities[0]).toHaveProperty('type');
      expect(body.entities[0]).toHaveProperty('properties');
    });

    it('マジックアイテムを生成する', async () => {
      // Arrange
      const itemGenerationRequest = {
        campaignId: testCampaign.id,
        sessionId: testSession.id,
        entityType: 'items',
        count: 5,
        theme: 'high_fantasy',
        context: {
          itemType: 'magic_items',
          rarity: 'uncommon',
          purpose: 'utility',
          level: 5
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/generate')
        .send(itemGenerationRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.entities).toHaveLength(5);
      expect(body.entities[0]).toHaveProperty('name');
      expect(body.entities[0]).toHaveProperty('description');
      expect(body.entities[0]).toHaveProperty('rarity');
      expect(body.entities[0]).toHaveProperty('properties');
    });

    it('全エンティティタイプを一括生成する', async () => {
      // Arrange
      const bulkGenerationRequest = {
        campaignId: testCampaign.id,
        entityType: 'all',
        count: 10,
        theme: 'classic_fantasy',
        context: {
          adventureType: 'exploration',
          setting: 'wilderness',
          partyLevel: 3
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/generate')
        .send(bulkGenerationRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.entities.length).toBeGreaterThan(0);
      
      // Check that multiple entity types are included
      const entityTypes = new Set(body.entities.map((e: any) => e.entityType));
      expect(entityTypes.size).toBeGreaterThan(1);
    });

    it('カスタムテーマでエンティティを生成する', async () => {
      // Arrange
      const customThemeRequest = {
        campaignId: testCampaign.id,
        entityType: 'characters',
        count: 2,
        theme: 'cyberpunk',
        context: {
          setting: 'dystopian_city',
          technology: 'high_tech',
          atmosphere: 'noir'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/generate')
        .send(customThemeRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.entities).toHaveLength(2);
      // Should reflect cyberpunk theme in generated content
      expect(JSON.stringify(body.entities).toLowerCase()).toMatch(/cyber|tech|digital|corp/);
    });

    it('無効なパラメータでバリデーションエラーを返す', async () => {
      // Arrange
      const invalidRequest = {
        campaignId: testCampaign.id,
        entityType: 'invalid_type',
        count: -1 // Invalid count
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/generate')
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('AIサービスエラー時に適切なエラーハンドリングを行う', async () => {
      // Arrange
      mockServices.aiProviders.setScenario('api_error');
      const request_data = {
        campaignId: testCampaign.id,
        entityType: 'characters',
        count: 1,
        theme: 'fantasy'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/generate')
        .send(request_data)
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to generate entities');
    });
  });

  describe('POST /api/ai-entity/update - エンティティ更新', () => {
    it('既存エンティティの AI 特性を更新する', async () => {
      // Arrange
      const updateRequest = {
        campaignId: testCampaign.id,
        entityId: 'npc-123',
        entityType: 'character',
        updates: {
          aiPersonality: {
            traits: ['mysterious', 'knowledgeable'],
            speechPattern: 'speaks in riddles',
            goals: ['protect ancient secrets']
          },
          relationships: {
            'player-character-1': 'cautious_ally'
          }
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/update')
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.updated).toBe(true);
      expect(body.entityId).toBe('npc-123');
    });

    it('場所エンティティの接続情報を更新する', async () => {
      // Arrange
      const locationUpdateRequest = {
        campaignId: testCampaign.id,
        entityId: 'location-forest-1',
        entityType: 'location',
        updates: {
          connections: ['location-village-1', 'location-mountain-1'],
          properties: {
            difficulty: 'moderate',
            encounters: ['bandits', 'wild_animals'],
            resources: ['herbs', 'wood']
          }
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/update')
        .send(locationUpdateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.entityId).toBe('location-forest-1');
    });
  });

  describe('DELETE /api/ai-entity/:id - エンティティ削除', () => {
    it('指定されたエンティティを削除する', async () => {
      // Arrange
      const entityId = 'entity-to-delete-123';

      // Act
      const response = await request(app)
        .delete(`/api/ai-entity/${entityId}`)
        .query({ campaignId: testCampaign.id })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.deleted).toBe(true);
      expect(body.entityId).toBe(entityId);
    });

    it('存在しないエンティティの削除で適切なエラーを返す', async () => {
      // Arrange
      const nonExistentEntityId = 'non-existent-entity';

      // Act
      const response = await request(app)
        .delete(`/api/ai-entity/${nonExistentEntityId}`)
        .query({ campaignId: testCampaign.id })
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('パフォーマンスとスケーラビリティ', () => {
    it('大量エンティティ生成要求を効率的に処理する', async () => {
      // Arrange
      const largeGenerationRequest = {
        campaignId: testCampaign.id,
        entityType: 'all',
        count: 50,
        theme: 'epic_fantasy'
      };

      const startTime = Date.now();

      // Act
      const response = await request(app)
        .post('/api/ai-entity/generate')
        .send(largeGenerationRequest)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.entities.length).toBeGreaterThan(0);
      expect(responseTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('並行する複数のエンティティ生成リクエストを処理する', async () => {
      // Arrange
      const requests = Array.from({ length: 5 }, (_, i) => ({
        campaignId: testCampaign.id,
        entityType: 'characters',
        count: 2,
        theme: `theme_${i}`,
        context: { batch: i }
      }));

      // Act - Send concurrent requests
      const promises = requests.map(req =>
        request(app)
          .post('/api/ai-entity/generate')
          .send(req)
      );

      const responses = await Promise.all(promises);

      // Assert
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('エンティティ関係性管理', () => {
    it('エンティティ間の関係性を生成する', async () => {
      // Arrange
      const relationshipRequest = {
        campaignId: testCampaign.id,
        sourceEntityId: 'npc-merchant-1',
        targetEntityId: 'location-shop-1',
        relationType: 'owner',
        context: {
          strength: 'strong',
          nature: 'business',
          history: 'established 10 years ago'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/relationships')
        .send(relationshipRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.relationship).toBeDefined();
      expect(body.relationship.type).toBe('owner');
    });

    it('既存関係性に基づいて関連エンティティを提案する', async () => {
      // Arrange
      const suggestionRequest = {
        campaignId: testCampaign.id,
        entityId: 'npc-merchant-1',
        suggestionType: 'related_entities',
        context: {
          relationship_types: ['customer', 'supplier', 'competitor'],
          max_suggestions: 3
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-entity/suggest')
        .send(suggestionRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as any;
      expect(body.success).toBe(true);
      expect(body.suggestions).toBeInstanceOf(Array);
      expect(body.suggestions.length).toBeLessThanOrEqual(3);
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