/**
 * Campaign Routes Integration Tests
 * Testing the full request-response cycle for campaign management endpoints
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { Database as DatabaseType } from 'better-sqlite3';
import { TRPGCampaign, APIResponse, PaginatedResponse } from '@ai-agent-trpg/types';
import { campaignRouter } from '../../routes/campaigns';
import { errorHandler } from '../../middleware/errorHandler';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';
import { initializeDatabase } from '../../database/database';

describe('Campaign Routes Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let testCampaigns: TRPGCampaign[] = [];

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
    app.use('/api/campaigns', campaignRouter);
    app.use(errorHandler);
    
    // Start server
    server = app.listen(0);
  });

  afterAll(async () => {
    testDatabase.closeAllDatabases();
    server.close();
  });

  beforeEach(async () => {
    // Reset database before each test
    testDatabase.resetDatabase(db);
    testCampaigns = [];
  });

  describe('GET /api/campaigns - キャンペーン一覧取得', () => {
    it('キャンペーンが存在しない場合空の配列を返す', async () => {
      // Act
      const response = await request(app)
        .get('/api/campaigns')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<PaginatedResponse<TRPGCampaign>>;
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual([]);
      expect(body.data.total).toBe(0);
      expect(body.data.page).toBe(1);
      expect(body.data.limit).toBe(10);
    });

    it('複数のキャンペーンをページネーション付きで返す', async () => {
      // Arrange
      for (let i = 0; i < 15; i++) {
        const campaign = TestDataFactory.createTestCampaign({
          name: `Campaign ${i + 1}`
        });
        testCampaigns.push(campaign);
        
        // Insert into database
        const stmt = db.prepare(`
          INSERT INTO campaigns (id, name, description, status, gm_id, settings, scenario_description, scenario_summary, created_at, updated_at, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          campaign.createdAt.toISOString(),
          campaign.updatedAt.toISOString(),
          campaign.version
        );
      }

      // Act - First page
      const firstPage = await request(app)
        .get('/api/campaigns?page=1&limit=10')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert first page
      const firstBody = firstPage.body as APIResponse<PaginatedResponse<TRPGCampaign>>;
      expect(firstBody.data.items).toHaveLength(10);
      expect(firstBody.data.total).toBe(15);
      expect(firstBody.data.page).toBe(1);
      expect(firstBody.data.hasNext).toBe(true);
      expect(firstBody.data.hasPrev).toBe(false);

      // Act - Second page
      const secondPage = await request(app)
        .get('/api/campaigns?page=2&limit=10')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert second page
      const secondBody = secondPage.body as APIResponse<PaginatedResponse<TRPGCampaign>>;
      expect(secondBody.data.items).toHaveLength(5);
      expect(secondBody.data.page).toBe(2);
      expect(secondBody.data.hasNext).toBe(false);
      expect(secondBody.data.hasPrev).toBe(true);
    });

    it('ステータスでフィルタリングされたキャンペーンを返す', async () => {
      // Arrange
      const planningCampaigns = 3;
      const activeCampaigns = 2;
      const completedCampaigns = 1;

      for (let i = 0; i < planningCampaigns; i++) {
        const campaign = TestDataFactory.createTestCampaign({ status: 'planning' });
        testCampaigns.push(campaign);
        insertCampaignToDb(db, campaign);
      }

      for (let i = 0; i < activeCampaigns; i++) {
        const campaign = TestDataFactory.createTestCampaign({ status: 'active' });
        testCampaigns.push(campaign);
        insertCampaignToDb(db, campaign);
      }

      for (let i = 0; i < completedCampaigns; i++) {
        const campaign = TestDataFactory.createTestCampaign({ status: 'completed' });
        testCampaigns.push(campaign);
        insertCampaignToDb(db, campaign);
      }

      // Act
      const response = await request(app)
        .get('/api/campaigns?status=active')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<PaginatedResponse<TRPGCampaign>>;
      expect(body.data.items).toHaveLength(activeCampaigns);
      expect(body.data.items.every(c => c.status === 'active')).toBe(true);
    });

    it('検索クエリでキャンペーンをフィルタリングする', async () => {
      // Arrange
      const campaigns = [
        TestDataFactory.createTestCampaign({ name: 'Dragons of Autumn' }),
        TestDataFactory.createTestCampaign({ name: 'Winter is Coming' }),
        TestDataFactory.createTestCampaign({ name: 'Autumn Harvest Festival' })
      ];

      for (const campaign of campaigns) {
        insertCampaignToDb(db, campaign);
      }

      // Act
      const response = await request(app)
        .get('/api/campaigns?search=Autumn')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<PaginatedResponse<TRPGCampaign>>;
      expect(body.data.items).toHaveLength(2);
      expect(body.data.items.every(c => c.name.includes('Autumn'))).toBe(true);
    });
  });

  describe('GET /api/campaigns/:id - キャンペーン詳細取得', () => {
    it('存在するキャンペーンの詳細を返す', async () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign({
        name: 'Test Campaign Details',
        description: 'Detailed description for testing'
      });
      insertCampaignToDb(db, campaign);

      // Act
      const response = await request(app)
        .get(`/api/campaigns/${campaign.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCampaign>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(campaign.id);
      expect(body.data.name).toBe(campaign.name);
      expect(body.data.description).toBe(campaign.description);
      expect(body.data.settings).toEqual(campaign.settings);
    });

    it('存在しないキャンペーンIDで404エラーを返す', async () => {
      // Act
      const response = await request(app)
        .get('/api/campaigns/non-existent-id')
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.resource).toBe('Campaign');
    });
  });

  describe('POST /api/campaigns - キャンペーン作成', () => {
    it('有効なデータで新しいキャンペーンを作成する', async () => {
      // Arrange
      const newCampaignData = {
        name: 'New Test Campaign',
        description: 'A brand new campaign',
        settings: {
          systemType: 'dnd5e',
          difficulty: 'normal',
          playerCount: 4
        },
        gmId: 'gm-123',
        scenarioDescription: 'Epic adventure awaits'
      };

      // Act
      const response = await request(app)
        .post('/api/campaigns')
        .send(newCampaignData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Assert
      const body = response.body as APIResponse<TRPGCampaign>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe(newCampaignData.name);
      expect(body.data.description).toBe(newCampaignData.description);
      expect(body.data.settings).toEqual(newCampaignData.settings);
      expect(body.data.status).toBe('planning');
      expect(body.data.version).toBe(1);

      // Verify in database
      const dbCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(body.data.id) as any;
      expect(dbCampaign).toBeDefined();
      expect(dbCampaign.name).toBe(newCampaignData.name);
    });

    it('必須フィールドが欠けている場合バリデーションエラーを返す', async () => {
      // Arrange
      const invalidData = {
        description: 'Missing name and settings'
      };

      // Act
      const response = await request(app)
        .post('/api/campaigns')
        .send(invalidData)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('name and settings are required');
    });
  });

  describe('PUT /api/campaigns/:id - キャンペーン更新', () => {
    it('既存のキャンペーンを正常に更新する', async () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign({
        name: 'Original Name',
        status: 'planning'
      });
      insertCampaignToDb(db, campaign);

      const updateData = {
        name: 'Updated Name',
        status: 'active',
        scenarioSummary: 'New summary added'
      };

      // Act
      const response = await request(app)
        .put(`/api/campaigns/${campaign.id}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCampaign>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(campaign.id);
      expect(body.data.name).toBe(updateData.name);
      expect(body.data.status).toBe(updateData.status);
      expect(body.data.scenarioSummary).toBe(updateData.scenarioSummary);
      expect(body.data.version).toBe(2); // Version should be incremented

      // Verify in database
      const dbCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign.id) as any;
      expect(dbCampaign.name).toBe(updateData.name);
      expect(dbCampaign.version).toBe(2);
    });

    it('存在しないキャンペーンの更新で404エラーを返す', async () => {
      // Arrange
      const updateData = {
        name: 'Cannot Update'
      };

      // Act
      const response = await request(app)
        .put('/api/campaigns/non-existent-id')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/campaigns/:id - キャンペーン削除', () => {
    it('既存のキャンペーンを正常に削除する', async () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign();
      insertCampaignToDb(db, campaign);

      // Verify campaign exists
      const before = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign.id);
      expect(before).toBeDefined();

      // Act
      const response = await request(app)
        .delete(`/api/campaigns/${campaign.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<{ deleted: boolean }>;
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);

      // Verify campaign is deleted from database
      const after = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign.id);
      expect(after).toBeUndefined();
    });

    it('存在しないキャンペーンの削除で404エラーを返す', async () => {
      // Act
      const response = await request(app)
        .delete('/api/campaigns/non-existent-id')
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('関連データがあるキャンペーンを削除するとカスケード削除される', async () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign();
      insertCampaignToDb(db, campaign);

      // Add related data
      const character = TestDataFactory.createTestCharacter(campaign.id);
      insertCharacterToDb(db, character);

      const session = TestDataFactory.createTestSession(campaign.id);
      insertSessionToDb(db, session);

      // Act
      const response = await request(app)
        .delete(`/api/campaigns/${campaign.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);

      // Verify cascade deletion
      const characters = db.prepare('SELECT * FROM characters WHERE campaign_id = ?').all(campaign.id);
      expect(characters).toHaveLength(0);

      const sessions = db.prepare('SELECT * FROM sessions WHERE campaign_id = ?').all(campaign.id);
      expect(sessions).toHaveLength(0);
    });
  });

  describe('同時実行とトランザクション', () => {
    it('同じキャンペーンへの同時更新で楽観的ロックが機能する', async () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign({ version: 1 });
      insertCampaignToDb(db, campaign);

      // First update
      const firstUpdate = {
        name: 'First Update',
        version: 1
      };

      // Second update with outdated version
      const secondUpdate = {
        name: 'Second Update',
        version: 1 // Same version, should conflict
      };

      // Act - First update succeeds
      const firstResponse = await request(app)
        .put(`/api/campaigns/${campaign.id}`)
        .send(firstUpdate)
        .expect(200);

      expect(firstResponse.body.data.version).toBe(2);

      // Act - Second update fails due to version conflict
      const secondResponse = await request(app)
        .put(`/api/campaigns/${campaign.id}`)
        .send(secondUpdate)
        .expect(409);

      // Assert
      expect(secondResponse.body.error).toBeDefined();
      expect(secondResponse.body.error.code).toBe('VERSION_CONFLICT');
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

function insertCharacterToDb(db: DatabaseType, character: any): void {
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

function insertSessionToDb(db: DatabaseType, session: any): void {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, campaign_id, name, status, start_time, end_time, session_data, notes, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    session.id,
    session.campaignId,
    session.name,
    session.status,
    session.startTime,
    session.endTime,
    JSON.stringify(session.sessionData),
    session.notes,
    session.createdAt.toISOString(),
    session.updatedAt.toISOString(),
    session.version
  );
}