/**
 * Session Routes Integration Tests
 * Testing the full request-response cycle for session management endpoints
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { Database as DatabaseType } from 'better-sqlite3';
import { TRPGSession, TRPGCampaign, APIResponse, SessionDurationConfig } from '@ai-agent-trpg/types';
import { sessionRouter } from '../../routes/sessions';
import { errorHandler } from '../../middleware/errorHandler';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('Session Routes Integration Tests', () => {
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
    app.use('/api/sessions', sessionRouter);
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

  describe('GET /api/sessions - セッション一覧取得', () => {
    it('キャンペーンIDが指定されていない場合バリデーションエラーを返す', async () => {
      // Act
      const response = await request(app)
        .get('/api/sessions')
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Campaign ID is required');
    });

    it('指定されたキャンペーンのセッション一覧を返す', async () => {
      // Arrange
      const sessions = [
        TestDataFactory.createTestSession(testCampaign.id, { name: 'Session 1', status: 'planned' }),
        TestDataFactory.createTestSession(testCampaign.id, { name: 'Session 2', status: 'active' }),
        TestDataFactory.createTestSession(testCampaign.id, { name: 'Session 3', status: 'completed' })
      ];

      for (const session of sessions) {
        insertSessionToDb(db, session);
      }

      // Act
      const response = await request(app)
        .get(`/api/sessions?campaignId=${testCampaign.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGSession[]>;
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
      expect(body.data.map(s => s.name)).toEqual(['Session 1', 'Session 2', 'Session 3']);
      expect(body.data.every(s => s.campaignId === testCampaign.id)).toBe(true);
    });

    it('セッションが存在しないキャンペーンの場合空の配列を返す', async () => {
      // Act
      const response = await request(app)
        .get(`/api/sessions?campaignId=${testCampaign.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGSession[]>;
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });
  });

  describe('GET /api/sessions/:id - セッション詳細取得', () => {
    it('存在するセッションの詳細を返す', async () => {
      // Arrange
      const session = TestDataFactory.createTestSession(testCampaign.id, {
        name: 'Detailed Session',
        notes: 'This session contains detailed information'
      });
      insertSessionToDb(db, session);

      // Act
      const response = await request(app)
        .get(`/api/sessions/${session.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGSession>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(session.id);
      expect(body.data.name).toBe(session.name);
      expect(body.data.notes).toBe(session.notes);
      expect(body.data.campaignId).toBe(testCampaign.id);
      expect(body.data.sessionData).toEqual(session.sessionData);
    });

    it('存在しないセッションIDで404エラーを返す', async () => {
      // Act
      const response = await request(app)
        .get('/api/sessions/non-existent-session-id')
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.resource).toBe('Session');
    });
  });

  describe('POST /api/sessions - セッション作成', () => {
    it('有効なデータで新しいセッションを作成する', async () => {
      // Arrange
      const newSessionData = {
        campaignId: testCampaign.id,
        name: 'New Adventure Session',
        sessionData: {
          timeline: [],
          currentTimeSlot: 0,
          sessionType: 'main'
        },
        notes: 'Starting a new adventure'
      };

      // Act
      const response = await request(app)
        .post('/api/sessions')
        .send(newSessionData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Assert
      const body = response.body as APIResponse<TRPGSession>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.campaignId).toBe(testCampaign.id);
      expect(body.data.name).toBe(newSessionData.name);
      expect(body.data.notes).toBe(newSessionData.notes);
      expect(body.data.status).toBe('planned');
      expect(body.data.version).toBe(1);

      // Verify in database
      const dbSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(body.data.id) as any;
      expect(dbSession).toBeDefined();
      expect(dbSession.name).toBe(newSessionData.name);
      expect(dbSession.campaign_id).toBe(testCampaign.id);
    });

    it('キャンペーンIDが未指定の場合バリデーションエラーを返す', async () => {
      // Arrange
      const invalidSessionData = {
        name: 'Session without campaign',
        notes: 'This should fail'
      };

      // Act
      const response = await request(app)
        .post('/api/sessions')
        .send(invalidSessionData)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Campaign ID is required');
    });

    it('存在しないキャンペーンIDで外部キー制約エラーを返す', async () => {
      // Arrange
      const invalidSessionData = {
        campaignId: 'non-existent-campaign-id',
        name: 'Session for invalid campaign'
      };

      // Act
      const response = await request(app)
        .post('/api/sessions')
        .send(invalidSessionData)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('FOREIGN_KEY_ERROR');
    });
  });

  describe('PATCH /api/sessions/:id/status - セッション状態更新', () => {
    it('セッションステータスを正常に更新する', async () => {
      // Arrange
      const session = TestDataFactory.createTestSession(testCampaign.id, {
        status: 'planned'
      });
      insertSessionToDb(db, session);

      // Act
      const response = await request(app)
        .patch(`/api/sessions/${session.id}/status`)
        .send({ status: 'active' })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGSession>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(session.id);
      expect(body.data.status).toBe('active');
      expect(body.data.version).toBe(2);

      // Verify in database
      const dbSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as any;
      expect(dbSession.status).toBe('active');
      expect(dbSession.version).toBe(2);
    });

    it('セッション開始時に時間管理システムを初期化する', async () => {
      // Arrange
      const session = TestDataFactory.createTestSession(testCampaign.id, {
        status: 'planned'
      });
      insertSessionToDb(db, session);

      const timeConfig: SessionDurationConfig = {
        totalDuration: 240, // 4 hours
        timeSlots: 8,
        breakDuration: 15,
        warningThresholds: [30, 10, 5]
      };

      // Act
      const response = await request(app)
        .patch(`/api/sessions/${session.id}/status`)
        .send({ 
          status: 'active',
          timeConfig 
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGSession>;
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('active');
      expect(body.data.startTime).toBeDefined();

      // Verify time management system initialization (if applicable)
      // This would check if time management service was called with proper config
    });

    it('セッション完了時に終了時刻を設定する', async () => {
      // Arrange
      const session = TestDataFactory.createTestSession(testCampaign.id, {
        status: 'active',
        startTime: new Date()
      });
      insertSessionToDb(db, session);

      // Act
      const response = await request(app)
        .patch(`/api/sessions/${session.id}/status`)
        .send({ status: 'completed' })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGSession>;
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('completed');
      expect(body.data.endTime).toBeDefined();
      expect(new Date(body.data.endTime!).getTime()).toBeGreaterThan(
        new Date(session.startTime!).getTime()
      );
    });

    it('ステータスが未指定の場合バリデーションエラーを返す', async () => {
      // Arrange
      const session = TestDataFactory.createTestSession(testCampaign.id);
      insertSessionToDb(db, session);

      // Act
      const response = await request(app)
        .patch(`/api/sessions/${session.id}/status`)
        .send({}) // Empty body
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Status is required');
    });

    it('存在しないセッションIDで404エラーを返す', async () => {
      // Act
      const response = await request(app)
        .patch('/api/sessions/non-existent-id/status')
        .send({ status: 'active' })
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('セッション状態遷移テスト', () => {
    it('セッションの状態遷移が正しく動作する', async () => {
      // Arrange
      const session = TestDataFactory.createTestSession(testCampaign.id, {
        status: 'planned'
      });
      insertSessionToDb(db, session);

      // Act & Assert - planned to active
      const activateResponse = await request(app)
        .patch(`/api/sessions/${session.id}/status`)
        .send({ status: 'active' })
        .expect(200);

      expect(activateResponse.body.data.status).toBe('active');
      expect(activateResponse.body.data.startTime).toBeDefined();

      // Act & Assert - active to paused
      const pauseResponse = await request(app)
        .patch(`/api/sessions/${session.id}/status`)
        .send({ status: 'paused' })
        .expect(200);

      expect(pauseResponse.body.data.status).toBe('paused');

      // Act & Assert - paused to active
      const resumeResponse = await request(app)
        .patch(`/api/sessions/${session.id}/status`)
        .send({ status: 'active' })
        .expect(200);

      expect(resumeResponse.body.data.status).toBe('active');

      // Act & Assert - active to completed
      const completeResponse = await request(app)
        .patch(`/api/sessions/${session.id}/status`)
        .send({ status: 'completed' })
        .expect(200);

      expect(completeResponse.body.data.status).toBe('completed');
      expect(completeResponse.body.data.endTime).toBeDefined();
    });

    it('無効な状態遷移を拒否する', async () => {
      // Arrange
      const session = TestDataFactory.createTestSession(testCampaign.id, {
        status: 'completed'
      });
      insertSessionToDb(db, session);

      // Act - Try to activate completed session
      const response = await request(app)
        .patch(`/api/sessions/${session.id}/status`)
        .send({ status: 'active' })
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('PUT /api/sessions/:id - セッション更新', () => {
    it('セッションの詳細情報を更新する', async () => {
      // Arrange
      const session = TestDataFactory.createTestSession(testCampaign.id, {
        name: 'Original Session',
        notes: 'Original notes'
      });
      insertSessionToDb(db, session);

      const updateData = {
        name: 'Updated Session Name',
        notes: 'Updated session notes with more details',
        sessionData: {
          timeline: [
            { time: '19:00', event: 'Session start', type: 'system' },
            { time: '19:15', event: 'Party enters tavern', type: 'narrative' }
          ],
          currentTimeSlot: 1,
          sessionType: 'main'
        }
      };

      // Act
      const response = await request(app)
        .put(`/api/sessions/${session.id}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGSession>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(session.id);
      expect(body.data.name).toBe(updateData.name);
      expect(body.data.notes).toBe(updateData.notes);
      expect(body.data.sessionData).toEqual(updateData.sessionData);
      expect(body.data.version).toBe(2);

      // Verify in database
      const dbSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as any;
      expect(dbSession.name).toBe(updateData.name);
      expect(dbSession.version).toBe(2);
    });
  });

  describe('DELETE /api/sessions/:id - セッション削除', () => {
    it('セッションを正常に削除する', async () => {
      // Arrange
      const session = TestDataFactory.createTestSession(testCampaign.id);
      insertSessionToDb(db, session);

      // Verify session exists
      const before = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
      expect(before).toBeDefined();

      // Act
      const response = await request(app)
        .delete(`/api/sessions/${session.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<{ deleted: boolean }>;
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);

      // Verify session is deleted
      const after = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
      expect(after).toBeUndefined();
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