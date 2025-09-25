/**
 * Database Integration Tests
 * Testing database operations, connectivity, and data integrity
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Database as DatabaseType } from 'better-sqlite3';
import { TRPGCampaign, TRPGCharacter, TRPGSession, Location, Quest } from '@ai-agent-trpg/types';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('Database Integration Tests', () => {
  let db: DatabaseType;

  beforeAll(async () => {
    db = testDatabase.createTestDatabase();
  });

  afterAll(async () => {
    testDatabase.closeAllDatabases();
  });

  beforeEach(async () => {
    testDatabase.resetDatabase(db);
  });

  describe('データベース接続とスキーマ', () => {
    it('データベース接続が正常に確立される', () => {
      // Act & Assert
      expect(db.open).toBe(true);
      expect(() => db.prepare('SELECT 1').get()).not.toThrow();
    });

    it('全てのテーブルが正しく作成されている', () => {
      // Arrange
      const expectedTables = [
        'campaigns',
        'characters', 
        'sessions',
        'locations',
        'quests',
        'ai_game_context',
        'milestones',
        'entity_relationships'
      ];

      // Act
      const tableQuery = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      const actualTables = tableQuery.all().map((row: any) => row.name);

      // Assert
      expect(actualTables).toEqual(expectedTables.sort());
    });

    it('外部キー制約が有効になっている', () => {
      // Act
      const foreignKeysResult = db.prepare('PRAGMA foreign_keys').get() as any;

      // Assert
      expect(foreignKeysResult.foreign_keys).toBe(1);
    });
  });

  describe('キャンペーンテーブル操作', () => {
    it('キャンペーンを正常に挿入できる', () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign({
        name: 'Database Test Campaign',
        description: 'Testing database operations'
      });

      // Act
      const stmt = db.prepare(`
        INSERT INTO campaigns (id, name, description, status, gm_id, settings, scenario_description, scenario_summary, base_scenario_illustration, created_at, updated_at, version, last_modified_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
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

      // Assert
      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeDefined();

      // Verify data
      const retrieved = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign.id) as any;
      expect(retrieved.name).toBe(campaign.name);
      expect(retrieved.status).toBe(campaign.status);
      expect(JSON.parse(retrieved.settings)).toEqual(campaign.settings);
    });

    it('キャンペーンを正常に更新できる', () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign();
      insertCampaignToDb(db, campaign);

      const updatedName = 'Updated Campaign Name';
      const updatedStatus = 'active';

      // Act
      const updateStmt = db.prepare(`
        UPDATE campaigns 
        SET name = ?, status = ?, version = version + 1, updated_at = ?
        WHERE id = ?
      `);
      
      const result = updateStmt.run(
        updatedName,
        updatedStatus,
        new Date().toISOString(),
        campaign.id
      );

      // Assert
      expect(result.changes).toBe(1);

      const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign.id) as any;
      expect(updated.name).toBe(updatedName);
      expect(updated.status).toBe(updatedStatus);
      expect(updated.version).toBe(2);
    });

    it('重複するキャンペーンIDで一意制約エラーが発生する', () => {
      // Arrange
      const campaign1 = TestDataFactory.createTestCampaign();
      const campaign2 = TestDataFactory.createTestCampaign({ id: campaign1.id }); // Same ID

      // Act & Assert
      insertCampaignToDb(db, campaign1);
      
      expect(() => {
        insertCampaignToDb(db, campaign2);
      }).toThrow(/UNIQUE constraint failed/);
    });
  });

  describe('キャラクターテーブル操作', () => {
    let testCampaign: TRPGCampaign;

    beforeEach(() => {
      testCampaign = TestDataFactory.createTestCampaign();
      insertCampaignToDb(db, testCampaign);
    });

    it('キャラクターを正常に挿入できる', () => {
      // Arrange
      const character = TestDataFactory.createTestCharacter(testCampaign.id, {
        name: 'Test Character',
        type: 'PC'
      });

      // Act
      insertCharacterToDb(db, character);

      // Assert
      const retrieved = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id) as any;
      expect(retrieved.name).toBe(character.name);
      expect(retrieved.type).toBe(character.type);
      expect(retrieved.campaign_id).toBe(testCampaign.id);
      expect(JSON.parse(retrieved.stats)).toEqual(character.stats);
    });

    it('外部キー制約により存在しないキャンペーンIDでエラーが発生する', () => {
      // Arrange
      const character = TestDataFactory.createTestCharacter('non-existent-campaign-id');

      // Act & Assert
      expect(() => {
        insertCharacterToDb(db, character);
      }).toThrow(/FOREIGN KEY constraint failed/);
    });

    it('キャンペーン削除時にキャラクターがカスケード削除される', () => {
      // Arrange
      const character1 = TestDataFactory.createTestCharacter(testCampaign.id, { name: 'PC 1' });
      const character2 = TestDataFactory.createTestCharacter(testCampaign.id, { name: 'NPC 1' });
      
      insertCharacterToDb(db, character1);
      insertCharacterToDb(db, character2);

      // Verify characters exist
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM characters WHERE campaign_id = ?')
        .get(testCampaign.id) as any;
      expect(beforeCount.count).toBe(2);

      // Act - Delete campaign
      db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaign.id);

      // Assert - Characters should be cascade deleted
      const afterCount = db.prepare('SELECT COUNT(*) as count FROM characters WHERE campaign_id = ?')
        .get(testCampaign.id) as any;
      expect(afterCount.count).toBe(0);
    });
  });

  describe('セッションテーブル操作', () => {
    let testCampaign: TRPGCampaign;

    beforeEach(() => {
      testCampaign = TestDataFactory.createTestCampaign();
      insertCampaignToDb(db, testCampaign);
    });

    it('セッションを正常に挿入できる', () => {
      // Arrange
      const session = TestDataFactory.createTestSession(testCampaign.id, {
        name: 'Test Session',
        status: 'planned'
      });

      // Act
      insertSessionToDb(db, session);

      // Assert
      const retrieved = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as any;
      expect(retrieved.name).toBe(session.name);
      expect(retrieved.status).toBe(session.status);
      expect(retrieved.campaign_id).toBe(testCampaign.id);
      expect(JSON.parse(retrieved.session_data)).toEqual(session.sessionData);
    });

    it('セッション状態遷移の履歴を追跡できる', () => {
      // Arrange
      const session = TestDataFactory.createTestSession(testCampaign.id, {
        status: 'planned'
      });
      insertSessionToDb(db, session);

      const statusHistory = ['planned', 'active', 'paused', 'active', 'completed'];

      // Act - Update status multiple times
      const updateStmt = db.prepare(`
        UPDATE sessions 
        SET status = ?, version = version + 1, updated_at = ?
        WHERE id = ?
      `);

      for (let i = 1; i < statusHistory.length; i++) {
        updateStmt.run(
          statusHistory[i],
          new Date().toISOString(),
          session.id
        );
      }

      // Assert
      const final = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as any;
      expect(final.status).toBe('completed');
      expect(final.version).toBe(statusHistory.length);
    });
  });

  describe('場所テーブル操作', () => {
    let testCampaign: TRPGCampaign;

    beforeEach(() => {
      testCampaign = TestDataFactory.createTestCampaign();
      insertCampaignToDb(db, testCampaign);
    });

    it('場所を正常に挿入できる', () => {
      // Arrange
      const location = TestDataFactory.createTestLocation(testCampaign.id, {
        name: 'Test Location',
        type: 'town'
      });

      // Act
      insertLocationToDb(db, location);

      // Assert
      const retrieved = db.prepare('SELECT * FROM locations WHERE id = ?').get(location.id) as any;
      expect(retrieved.name).toBe(location.name);
      expect(retrieved.type).toBe(location.type);
      expect(retrieved.campaign_id).toBe(testCampaign.id);
    });

    it('親子関係のある場所を正しく管理できる', () => {
      // Arrange
      const parentLocation = TestDataFactory.createTestLocation(testCampaign.id, {
        name: 'Kingdom',
        type: 'region'
      });
      insertLocationToDb(db, parentLocation);

      const childLocation = TestDataFactory.createTestLocation(testCampaign.id, {
        name: 'Capital City',
        type: 'city',
        parentLocationId: parentLocation.id
      });

      // Act
      insertLocationToDb(db, childLocation);

      // Assert
      const child = db.prepare('SELECT * FROM locations WHERE id = ?').get(childLocation.id) as any;
      expect(child.parent_location_id).toBe(parentLocation.id);

      // Test cascade deletion
      db.prepare('DELETE FROM locations WHERE id = ?').run(parentLocation.id);
      const orphanedChild = db.prepare('SELECT * FROM locations WHERE id = ?').get(childLocation.id) as any;
      expect(orphanedChild.parent_location_id).toBeNull();
    });
  });

  describe('クエストテーブル操作', () => {
    let testCampaign: TRPGCampaign;

    beforeEach(() => {
      testCampaign = TestDataFactory.createTestCampaign();
      insertCampaignToDb(db, testCampaign);
    });

    it('クエストを正常に挿入できる', () => {
      // Arrange
      const quest = TestDataFactory.createTestQuest(testCampaign.id, {
        title: 'Test Quest',
        status: 'not_started',
        priority: 1
      });

      // Act
      insertQuestToDb(db, quest);

      // Assert
      const retrieved = db.prepare('SELECT * FROM quests WHERE id = ?').get(quest.id) as any;
      expect(retrieved.title).toBe(quest.title);
      expect(retrieved.status).toBe(quest.status);
      expect(retrieved.priority).toBe(quest.priority);
      expect(JSON.parse(retrieved.requirements)).toEqual(quest.requirements);
      expect(JSON.parse(retrieved.rewards)).toEqual(quest.rewards);
    });

    it('クエスト進行状況を正しく更新できる', () => {
      // Arrange
      const quest = TestDataFactory.createTestQuest(testCampaign.id, {
        status: 'not_started'
      });
      insertQuestToDb(db, quest);

      const progressStates = ['not_started', 'in_progress', 'completed'];

      // Act - Progress through quest states
      const updateStmt = db.prepare(`
        UPDATE quests 
        SET status = ?, version = version + 1, updated_at = ?
        WHERE id = ?
      `);

      for (let i = 1; i < progressStates.length; i++) {
        updateStmt.run(
          progressStates[i],
          new Date().toISOString(),
          quest.id
        );
      }

      // Assert
      const final = db.prepare('SELECT * FROM quests WHERE id = ?').get(quest.id) as any;
      expect(final.status).toBe('completed');
      expect(final.version).toBe(progressStates.length);
    });
  });

  describe('トランザクションと整合性', () => {
    it('トランザクション内での操作が正常にコミットされる', () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign();
      const character = TestDataFactory.createTestCharacter(campaign.id);
      const session = TestDataFactory.createTestSession(campaign.id);

      // Act - Execute in transaction
      const transaction = db.transaction(() => {
        insertCampaignToDb(db, campaign);
        insertCharacterToDb(db, character);
        insertSessionToDb(db, session);
      });

      transaction();

      // Assert
      const campaignExists = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE id = ?')
        .get(campaign.id) as any;
      const characterExists = db.prepare('SELECT COUNT(*) as count FROM characters WHERE id = ?')
        .get(character.id) as any;
      const sessionExists = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE id = ?')
        .get(session.id) as any;

      expect(campaignExists.count).toBe(1);
      expect(characterExists.count).toBe(1);
      expect(sessionExists.count).toBe(1);
    });

    it('トランザクション内でエラーが発生した場合ロールバックされる', () => {
      // Arrange
      const validCampaign = TestDataFactory.createTestCampaign();
      const invalidCharacter = TestDataFactory.createTestCharacter('invalid-campaign-id');

      // Act & Assert - Transaction should fail and rollback
      const transaction = db.transaction(() => {
        insertCampaignToDb(db, validCampaign);
        insertCharacterToDb(db, invalidCharacter); // This will fail
      });

      expect(() => transaction()).toThrow();

      // Verify rollback - campaign should not exist
      const campaignExists = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE id = ?')
        .get(validCampaign.id) as any;
      expect(campaignExists.count).toBe(0);
    });
  });

  describe('パフォーマンスとインデックス', () => {
    it('大量データ挿入でも適切なパフォーマンスを維持する', () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign();
      insertCampaignToDb(db, campaign);

      const startTime = Date.now();
      const characterCount = 1000;

      // Act - Insert many characters
      const insertStmt = db.prepare(`
        INSERT INTO characters (id, campaign_id, name, type, description, stats, status, created_at, updated_at, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction(() => {
        for (let i = 0; i < characterCount; i++) {
          const character = TestDataFactory.createTestCharacter(campaign.id, {
            name: `Character ${i + 1}`
          });
          
          insertStmt.run(
            character.id,
            character.campaignId,
            character.name,
            character.type,
            character.description,
            JSON.stringify(character.stats),
            character.status,
            character.createdAt.toISOString(),
            character.updatedAt.toISOString(),
            character.version
          );
        }
      });

      transaction();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      const count = db.prepare('SELECT COUNT(*) as count FROM characters WHERE campaign_id = ?')
        .get(campaign.id) as any;
      expect(count.count).toBe(characterCount);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('外部キーを使ったクエリが効率的に実行される', () => {
      // Arrange
      const campaign = TestDataFactory.createTestCampaign();
      insertCampaignToDb(db, campaign);

      // Insert related data
      for (let i = 0; i < 100; i++) {
        const character = TestDataFactory.createTestCharacter(campaign.id);
        insertCharacterToDb(db, character);
        
        const session = TestDataFactory.createTestSession(campaign.id);
        insertSessionToDb(db, session);
      }

      const startTime = Date.now();

      // Act - Complex join query
      const result = db.prepare(`
        SELECT c.name as campaign_name, 
               COUNT(DISTINCT ch.id) as character_count,
               COUNT(DISTINCT s.id) as session_count
        FROM campaigns c
        LEFT JOIN characters ch ON c.id = ch.campaign_id
        LEFT JOIN sessions s ON c.id = s.campaign_id
        WHERE c.id = ?
        GROUP BY c.id
      `).get(campaign.id);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(queryTime).toBeLessThan(100); // Should be very fast
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

function insertLocationToDb(db: DatabaseType, location: Location): void {
  const stmt = db.prepare(`
    INSERT INTO locations (id, campaign_id, name, description, type, parent_location_id, connections, properties, illustration_url, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    location.id,
    location.campaignId,
    location.name,
    location.description,
    location.type,
    location.parentLocationId,
    JSON.stringify(location.connections),
    JSON.stringify(location.properties),
    location.illustrationUrl,
    location.createdAt.toISOString(),
    location.updatedAt.toISOString(),
    location.version
  );
}

function insertQuestToDb(db: DatabaseType, quest: Quest): void {
  const stmt = db.prepare(`
    INSERT INTO quests (id, campaign_id, title, description, status, priority, requirements, rewards, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    quest.id,
    quest.campaignId,
    quest.title,
    quest.description,
    quest.status,
    quest.priority,
    JSON.stringify(quest.requirements),
    JSON.stringify(quest.rewards),
    quest.createdAt.toISOString(),
    quest.updatedAt.toISOString(),
    quest.version
  );
}