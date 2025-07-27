/**
 * Character Routes Integration Tests
 * Testing the full request-response cycle for character management endpoints
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { Database as DatabaseType } from 'better-sqlite3';
import { TRPGCharacter, TRPGCampaign, APIResponse } from '@ai-agent-trpg/types';
import { characterRouter } from '../../routes/characters';
import { errorHandler } from '../../middleware/errorHandler';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('Character Routes Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let testCampaign: TRPGCampaign;

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
    app.use('/api/characters', characterRouter);
    app.use(errorHandler);
    
    // Start server
    server = app.listen(0);
  });

  afterAll(async () => {
    testDatabase.closeAllDatabases();
    server.close();
  });

  beforeEach(async () => {
    // Reset database and create test campaign
    testDatabase.resetDatabase(db);
    testCampaign = TestDataFactory.createTestCampaign();
    insertCampaignToDb(db, testCampaign);
  });

  describe('GET /api/characters - キャラクター一覧取得', () => {
    it('キャンペーンIDが未指定の場合バリデーションエラーを返す', async () => {
      // Act
      const response = await request(app)
        .get('/api/characters')
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Campaign ID is required');
    });

    it('指定されたキャンペーンの全キャラクターを返す', async () => {
      // Arrange
      const characters = [
        TestDataFactory.createTestCharacter(testCampaign.id, { name: 'Hero PC', type: 'PC' }),
        TestDataFactory.createTestCharacter(testCampaign.id, { name: 'Shopkeeper NPC', type: 'NPC' }),
        TestDataFactory.createTestCharacter(testCampaign.id, { name: 'Orc Enemy', type: 'Enemy' })
      ];

      for (const character of characters) {
        insertCharacterToDb(db, character);
      }

      // Act
      const response = await request(app)
        .get(`/api/characters?campaignId=${testCampaign.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter[]>;
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
      expect(body.data.map(c => c.name)).toEqual(['Hero PC', 'Shopkeeper NPC', 'Orc Enemy']);
      expect(body.data.every(c => c.campaignId === testCampaign.id)).toBe(true);
    });

    it('キャラクタータイプでフィルタリングされたキャラクターを返す', async () => {
      // Arrange
      const pcCharacters = [
        TestDataFactory.createTestCharacter(testCampaign.id, { name: 'Fighter', type: 'PC' }),
        TestDataFactory.createTestCharacter(testCampaign.id, { name: 'Wizard', type: 'PC' })
      ];
      const npcCharacters = [
        TestDataFactory.createTestCharacter(testCampaign.id, { name: 'Bartender', type: 'NPC' }),
        TestDataFactory.createTestCharacter(testCampaign.id, { name: 'Mayor', type: 'NPC' })
      ];
      const enemyCharacters = [
        TestDataFactory.createTestCharacter(testCampaign.id, { name: 'Goblin', type: 'Enemy' })
      ];

      for (const character of [...pcCharacters, ...npcCharacters, ...enemyCharacters]) {
        insertCharacterToDb(db, character);
      }

      // Act - Filter for PC characters
      const pcResponse = await request(app)
        .get(`/api/characters?campaignId=${testCampaign.id}&characterType=PC`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert PC characters
      const pcBody = pcResponse.body as APIResponse<TRPGCharacter[]>;
      expect(pcBody.data).toHaveLength(2);
      expect(pcBody.data.every(c => c.type === 'PC')).toBe(true);

      // Act - Filter for NPC characters
      const npcResponse = await request(app)
        .get(`/api/characters?campaignId=${testCampaign.id}&characterType=NPC`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert NPC characters
      const npcBody = npcResponse.body as APIResponse<TRPGCharacter[]>;
      expect(npcBody.data).toHaveLength(2);
      expect(npcBody.data.every(c => c.type === 'NPC')).toBe(true);
    });

    it('キャラクターが存在しないキャンペーンの場合空の配列を返す', async () => {
      // Act
      const response = await request(app)
        .get(`/api/characters?campaignId=${testCampaign.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter[]>;
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });
  });

  describe('GET /api/characters/:id - キャラクター詳細取得', () => {
    it('存在するキャラクターの詳細を返す', async () => {
      // Arrange
      const character = TestDataFactory.createTestCharacter(testCampaign.id, {
        name: 'Detailed Character',
        description: 'A character with full details',
        stats: {
          level: 5,
          hp: 120,
          mp: 80,
          strength: 16,
          dexterity: 14,
          constitution: 15,
          intelligence: 12,
          wisdom: 13,
          charisma: 10
        }
      });
      insertCharacterToDb(db, character);

      // Act
      const response = await request(app)
        .get(`/api/characters/${character.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(character.id);
      expect(body.data.name).toBe(character.name);
      expect(body.data.description).toBe(character.description);
      expect(body.data.stats).toEqual(character.stats);
      expect(body.data.campaignId).toBe(testCampaign.id);
    });

    it('存在しないキャラクターIDで404エラーを返す', async () => {
      // Act
      const response = await request(app)
        .get('/api/characters/non-existent-character-id')
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.resource).toBe('Character');
    });
  });

  describe('POST /api/characters - キャラクター作成', () => {
    it('PCキャラクターを正常に作成する', async () => {
      // Arrange
      const newCharacterData = {
        name: 'New Hero',
        campaignId: testCampaign.id,
        characterType: 'PC',
        description: 'A brave new hero',
        stats: {
          level: 1,
          hp: 100,
          mp: 50,
          strength: 14,
          dexterity: 12,
          constitution: 13,
          intelligence: 15,
          wisdom: 11,
          charisma: 16
        },
        playerId: 'player-123'
      };

      // Act
      const response = await request(app)
        .post('/api/characters')
        .send(newCharacterData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe(newCharacterData.name);
      expect(body.data.type).toBe('PC');
      expect(body.data.campaignId).toBe(testCampaign.id);
      expect(body.data.stats).toEqual(newCharacterData.stats);
      expect(body.data.playerId).toBe(newCharacterData.playerId);
      expect(body.data.status).toBe('active');
      expect(body.data.version).toBe(1);

      // Verify in database
      const dbCharacter = db.prepare('SELECT * FROM characters WHERE id = ?').get(body.data.id) as any;
      expect(dbCharacter).toBeDefined();
      expect(dbCharacter.name).toBe(newCharacterData.name);
      expect(dbCharacter.type).toBe('PC');
    });

    it('NPCキャラクターをAIパーソナリティ付きで作成する', async () => {
      // Arrange
      const npcData = {
        name: 'Wise Elder',
        campaignId: testCampaign.id,
        characterType: 'NPC',
        description: 'A knowledgeable village elder',
        aiPersonality: {
          traits: ['wise', 'patient', 'helpful'],
          speechPattern: 'speaks slowly and thoughtfully',
          goals: ['guide young adventurers', 'protect the village'],
          quirks: ['always strokes beard when thinking']
        },
        locationId: 'village-center'
      };

      // Act
      const response = await request(app)
        .post('/api/characters')
        .send(npcData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.name).toBe(npcData.name);
      expect(body.data.type).toBe('NPC');
      expect(body.data.aiPersonality).toEqual(npcData.aiPersonality);
      expect(body.data.locationId).toBe(npcData.locationId);
      expect(body.data.playerId).toBeNull();
    });

    it('エネミーキャラクターを戦闘ステータス付きで作成する', async () => {
      // Arrange
      const enemyData = {
        name: 'Fierce Dragon',
        campaignId: testCampaign.id,
        characterType: 'Enemy',
        description: 'An ancient red dragon',
        stats: {
          level: 15,
          hp: 500,
          mp: 200,
          strength: 25,
          dexterity: 10,
          constitution: 23,
          intelligence: 16,
          wisdom: 15,
          charisma: 21,
          armorClass: 22,
          challengeRating: 17
        }
      };

      // Act
      const response = await request(app)
        .post('/api/characters')
        .send(enemyData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.name).toBe(enemyData.name);
      expect(body.data.type).toBe('Enemy');
      expect(body.data.stats.challengeRating).toBe(17);
      expect(body.data.stats.armorClass).toBe(22);
    });

    it('必須フィールドが欠けている場合バリデーションエラーを返す', async () => {
      // Arrange
      const invalidData = {
        description: 'Missing required fields'
        // Missing name, campaignId, characterType
      };

      // Act
      const response = await request(app)
        .post('/api/characters')
        .send(invalidData)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Character name, campaign ID, and character type are required');
    });

    it('存在しないキャンペーンIDで外部キー制約エラーを返す', async () => {
      // Arrange
      const invalidData = {
        name: 'Invalid Character',
        campaignId: 'non-existent-campaign',
        characterType: 'PC'
      };

      // Act
      const response = await request(app)
        .post('/api/characters')
        .send(invalidData)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('FOREIGN_KEY_ERROR');
    });
  });

  describe('PUT /api/characters/:id - キャラクター更新', () => {
    it('キャラクターの基本情報を更新する', async () => {
      // Arrange
      const character = TestDataFactory.createTestCharacter(testCampaign.id, {
        name: 'Original Name',
        stats: { level: 1, hp: 100, mp: 50 }
      });
      insertCharacterToDb(db, character);

      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        stats: {
          level: 2,
          hp: 120,
          mp: 60,
          strength: 15,
          dexterity: 13,
          constitution: 14,
          intelligence: 12,
          wisdom: 11,
          charisma: 10
        }
      };

      // Act
      const response = await request(app)
        .put(`/api/characters/${character.id}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(character.id);
      expect(body.data.name).toBe(updateData.name);
      expect(body.data.description).toBe(updateData.description);
      expect(body.data.stats).toEqual(updateData.stats);
      expect(body.data.version).toBe(2);

      // Verify in database
      const dbCharacter = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id) as any;
      expect(dbCharacter.name).toBe(updateData.name);
      expect(dbCharacter.version).toBe(2);
    });

    it('NPCのAIパーソナリティを更新する', async () => {
      // Arrange
      const npc = TestDataFactory.createTestCharacter(testCampaign.id, {
        type: 'NPC',
        aiPersonality: {
          traits: ['friendly'],
          speechPattern: 'casual'
        }
      });
      insertCharacterToDb(db, npc);

      const updatedPersonality = {
        aiPersonality: {
          traits: ['wise', 'mysterious'],
          speechPattern: 'speaks in riddles',
          goals: ['protect ancient secrets'],
          quirks: ['always speaks in third person']
        }
      };

      // Act
      const response = await request(app)
        .put(`/api/characters/${npc.id}`)
        .send(updatedPersonality)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.data.aiPersonality).toEqual(updatedPersonality.aiPersonality);
    });

    it('存在しないキャラクターIDで404エラーを返す', async () => {
      // Arrange
      const updateData = { name: 'Cannot Update' };

      // Act
      const response = await request(app)
        .put('/api/characters/non-existent-id')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/characters/:id - キャラクター削除', () => {
    it('キャラクターを正常に削除する', async () => {
      // Arrange
      const character = TestDataFactory.createTestCharacter(testCampaign.id);
      insertCharacterToDb(db, character);

      // Verify character exists
      const before = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
      expect(before).toBeDefined();

      // Act
      const response = await request(app)
        .delete(`/api/characters/${character.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<{ deleted: boolean }>;
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);

      // Verify character is deleted
      const after = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
      expect(after).toBeUndefined();
    });

    it('存在しないキャラクターIDで404エラーを返す', async () => {
      // Act
      const response = await request(app)
        .delete('/api/characters/non-existent-id')
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('キャラクター関連データの整合性テスト', () => {
    it('キャンペーン削除時にキャラクターがカスケード削除される', async () => {
      // Arrange
      const characters = [
        TestDataFactory.createTestCharacter(testCampaign.id, { name: 'Hero' }),
        TestDataFactory.createTestCharacter(testCampaign.id, { name: 'NPC' }),
        TestDataFactory.createTestCharacter(testCampaign.id, { name: 'Enemy' })
      ];

      for (const character of characters) {
        insertCharacterToDb(db, character);
      }

      // Verify characters exist
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM characters WHERE campaign_id = ?')
        .get(testCampaign.id) as any;
      expect(beforeCount.count).toBe(3);

      // Act - Delete campaign
      db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaign.id);

      // Assert - Characters should be cascade deleted
      const afterCount = db.prepare('SELECT COUNT(*) as count FROM characters WHERE campaign_id = ?')
        .get(testCampaign.id) as any;
      expect(afterCount.count).toBe(0);
    });

    it('同じ名前のキャラクターを同一キャンペーン内で作成できる', async () => {
      // Arrange - Different types can have same name
      const sameName = 'Robin';
      const characterData1 = {
        name: sameName,
        campaignId: testCampaign.id,
        characterType: 'PC'
      };
      const characterData2 = {
        name: sameName,
        campaignId: testCampaign.id,
        characterType: 'NPC'
      };

      // Act
      const response1 = await request(app)
        .post('/api/characters')
        .send(characterData1)
        .expect(201);

      const response2 = await request(app)
        .post('/api/characters')
        .send(characterData2)
        .expect(201);

      // Assert
      expect(response1.body.data.name).toBe(sameName);
      expect(response2.body.data.name).toBe(sameName);
      expect(response1.body.data.type).toBe('PC');
      expect(response2.body.data.type).toBe('NPC');
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のキャラクター一覧取得でも適切に応答する', async () => {
      // Arrange - Create 100 characters
      const characters = [];
      for (let i = 0; i < 100; i++) {
        const character = TestDataFactory.createTestCharacter(testCampaign.id, {
          name: `Character ${i + 1}`,
          type: i % 3 === 0 ? 'PC' : i % 3 === 1 ? 'NPC' : 'Enemy'
        });
        characters.push(character);
        insertCharacterToDb(db, character);
      }

      const startTime = Date.now();

      // Act
      const response = await request(app)
        .get(`/api/characters?campaignId=${testCampaign.id}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Assert
      expect(response.body.data).toHaveLength(100);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
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