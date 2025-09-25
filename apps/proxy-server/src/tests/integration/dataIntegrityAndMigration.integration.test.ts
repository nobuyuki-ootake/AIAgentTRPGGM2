/**
 * Data Integrity and Migration Integration Tests
 * Testing data consistency, backup/restore, and migration workflows
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { Database as DatabaseType } from 'better-sqlite3';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { 
  TRPGCampaign, 
  TRPGSession, 
  TRPGCharacter, 
  Location,
  Quest,
  APIResponse,
  DatabaseMigration
} from '@ai-agent-trpg/types';
import { campaignsRouter } from '../../routes/campaigns';
import { sessionsRouter } from '../../routes/sessions';
import { charactersRouter } from '../../routes/characters';
import { locationsRouter } from '../../routes/locations';
import { adminRouter } from '../../routes/admin';
import { errorHandler } from '../../middleware/errorHandler';
import { fullIntegrationMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('Data Integrity and Migration Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let mockServices: MockServerServices;
  const testBackupDir = join(__dirname, '../../../test-backups');

  beforeAll(async () => {
    // Create backup directory
    if (!existsSync(testBackupDir)) {
      mkdirSync(testBackupDir, { recursive: true });
    }

    // Set up test database
    db = testDatabase.createTestDatabase();
    
    // Set up express app with all routes
    app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use('/api/campaigns', campaignsRouter);
    app.use('/api/sessions', sessionsRouter);
    app.use('/api/characters', charactersRouter);
    app.use('/api/locations', locationsRouter);
    app.use('/api/admin', adminRouter);
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
    
    // Cleanup test backup directory
    if (existsSync(testBackupDir)) {
      execSync(`rm -rf ${testBackupDir}`);
    }
  });

  beforeEach(async () => {
    testDatabase.resetDatabase(db);
    await mockServices.reset();
  });

  describe('データ整合性とトランザクション管理', () => {
    it('Should maintain referential integrity across complex entity relationships', async () => {
      // Create campaign hierarchy
      const campaign = TestDataFactory.createTestCampaign();
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .send(campaign)
        .expect(201);
      
      const campaignId = campaignResponse.body.data.id;

      // Create complex entity hierarchy
      const rootLocation = TestDataFactory.createTestLocation(campaignId, {
        name: 'Root Kingdom',
        locationType: 'kingdom'
      });
      const rootLocationResponse = await request(app)
        .post('/api/locations')
        .send(rootLocation)
        .expect(201);

      // Create nested locations
      const nestedLocations = [];
      for (let i = 0; i < 5; i++) {
        const location = TestDataFactory.createTestLocation(campaignId, {
          name: `City ${i + 1}`,
          parentLocationId: rootLocationResponse.body.data.id
        });
        const response = await request(app)
          .post('/api/locations')
          .send(location)
          .expect(201);
        nestedLocations.push(response.body.data);
      }

      // Create characters at various locations
      const characters = [];
      for (let i = 0; i < 10; i++) {
        const character = TestDataFactory.createTestCharacter(campaignId, {
          name: `Character ${i + 1}`,
          locationId: nestedLocations[i % 5].id
        });
        const response = await request(app)
          .post('/api/characters')
          .send(character)
          .expect(201);
        characters.push(response.body.data);
      }

      // Create quests linking characters and locations
      const quests = [];
      for (let i = 0; i < 3; i++) {
        const quest: Quest = {
          id: `quest-${i + 1}`,
          campaignId: campaignId,
          name: `Quest ${i + 1}`,
          description: `Complex quest involving multiple entities`,
          status: 'active',
          objectives: [
            {
              id: `obj-${i}-1`,
              description: 'Primary objective',
              status: 'in_progress',
              locationId: nestedLocations[i].id,
              involvedCharacterIds: [characters[i].id, characters[i + 1].id]
            }
          ],
          assignedCharacterIds: characters.slice(i, i + 3).map(c => c.id),
          rewardItems: [],
          startLocationId: rootLocationResponse.body.data.id,
          currentLocationId: nestedLocations[i].id,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        };
        
        const response = await request(app)
          .post('/api/quests')
          .send(quest)
          .expect(201);
        quests.push(response.body.data);
      }

      // Test cascade delete behavior
      // Delete a location that has characters
      const deleteLocationResponse = await request(app)
        .delete(`/api/locations/${nestedLocations[0].id}`)
        .expect(409); // Should fail due to referential integrity

      expect(deleteLocationResponse.body.error.code).toBe('REFERENTIAL_INTEGRITY_ERROR');
      expect(deleteLocationResponse.body.error.details.relatedEntities).toContain('characters');

      // Test orphan prevention
      // Try to create a character with non-existent location
      const orphanCharacter = TestDataFactory.createTestCharacter(campaignId, {
        name: 'Orphan Character',
        locationId: 'non-existent-location-id'
      });

      const orphanResponse = await request(app)
        .post('/api/characters')
        .send(orphanCharacter)
        .expect(400);

      expect(orphanResponse.body.error.code).toBe('INVALID_REFERENCE');

      // Test data consistency after operations
      const consistencyCheck = await request(app)
        .get(`/api/admin/data-integrity/check?campaignId=${campaignId}`)
        .expect(200);

      expect(consistencyCheck.body.success).toBe(true);
      expect(consistencyCheck.body.data.issues).toHaveLength(0);
      expect(consistencyCheck.body.data.entityCounts.locations).toBe(6); // 1 root + 5 nested
      expect(consistencyCheck.body.data.entityCounts.characters).toBe(10);
      expect(consistencyCheck.body.data.entityCounts.quests).toBe(3);
    });

    it('Should handle concurrent transactions with proper isolation levels', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Create a shared resource (party treasury)
      const treasury = {
        campaignId: campaign.id,
        goldAmount: 1000,
        items: [
          { id: 'potion-1', name: 'Health Potion', quantity: 10 }
        ]
      };

      await request(app)
        .post('/api/campaigns/treasury')
        .send(treasury)
        .expect(201);

      // Simulate concurrent transactions trying to modify the same resource
      const concurrentTransactions = [
        // Transaction 1: Withdraw gold
        request(app)
          .post('/api/campaigns/treasury/transaction')
          .send({
            campaignId: campaign.id,
            type: 'withdraw',
            resource: 'gold',
            amount: 300,
            reason: 'Buy equipment'
          }),
        
        // Transaction 2: Withdraw gold (concurrent)
        request(app)
          .post('/api/campaigns/treasury/transaction')
          .send({
            campaignId: campaign.id,
            type: 'withdraw',
            resource: 'gold',
            amount: 800,
            reason: 'Pay for inn'
          }),
        
        // Transaction 3: Add items
        request(app)
          .post('/api/campaigns/treasury/transaction')
          .send({
            campaignId: campaign.id,
            type: 'deposit',
            resource: 'item',
            item: { id: 'sword-1', name: 'Magic Sword', quantity: 1 },
            reason: 'Quest reward'
          }),
        
        // Transaction 4: Use items
        request(app)
          .post('/api/campaigns/treasury/transaction')
          .send({
            campaignId: campaign.id,
            type: 'withdraw',
            resource: 'item',
            itemId: 'potion-1',
            quantity: 15, // More than available
            reason: 'Heal party'
          })
      ];

      const results = await Promise.allSettled(concurrentTransactions);

      // Analyze transaction results
      const successfulTransactions = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      const failedTransactions = results.filter(r => 
        r.status === 'fulfilled' && r.value.status !== 200
      );

      // Should have some failures due to insufficient resources
      expect(failedTransactions.length).toBeGreaterThan(0);

      // Check final treasury state
      const finalTreasury = await request(app)
        .get(`/api/campaigns/treasury?campaignId=${campaign.id}`)
        .expect(200);

      // Gold should never go negative
      expect(finalTreasury.body.data.goldAmount).toBeGreaterThanOrEqual(0);
      // Should maintain consistency
      expect(finalTreasury.body.data.goldAmount).toBeLessThanOrEqual(1000);

      // Verify transaction log
      const transactionLog = await request(app)
        .get(`/api/campaigns/treasury/transactions?campaignId=${campaign.id}`)
        .expect(200);

      expect(transactionLog.body.data.transactions).toBeDefined();
      expect(transactionLog.body.data.transactions.length).toBeGreaterThan(0);
      
      // Each transaction should have proper audit trail
      transactionLog.body.data.transactions.forEach((tx: any) => {
        expect(tx.timestamp).toBeDefined();
        expect(tx.status).toBeDefined();
        expect(tx.reason).toBeDefined();
      });
    });

    it('Should detect and repair data corruption automatically', async () => {
      // Create test data
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const character = TestDataFactory.createTestCharacter(campaign.id);
      await request(app).post('/api/characters').send(character).expect(201);

      // Simulate data corruption by directly manipulating database
      db.prepare('UPDATE campaigns SET version = NULL WHERE id = ?').run(campaign.id);
      db.prepare('UPDATE characters SET campaign_id = ? WHERE id = ?').run('invalid-id', character.id);
      db.prepare('INSERT INTO sessions (id, campaign_id, name, status) VALUES (?, ?, ?, ?)').run(
        'corrupt-session',
        'non-existent-campaign',
        'Corrupted Session',
        'active'
      );

      // Run integrity check with repair
      const repairResponse = await request(app)
        .post('/api/admin/data-integrity/repair')
        .send({ autoFix: true })
        .expect(200);

      expect(repairResponse.body.success).toBe(true);
      expect(repairResponse.body.data.issuesFound).toBeGreaterThan(0);
      expect(repairResponse.body.data.issuesFixed).toBeGreaterThan(0);
      expect(repairResponse.body.data.repairs).toBeDefined();

      // Verify repairs
      repairResponse.body.data.repairs.forEach((repair: any) => {
        expect(repair.type).toBeDefined();
        expect(repair.entity).toBeDefined();
        expect(repair.issue).toBeDefined();
        expect(repair.action).toBeDefined();
        expect(repair.result).toBe('success');
      });

      // Re-run integrity check to ensure all issues are fixed
      const verifyResponse = await request(app)
        .get('/api/admin/data-integrity/check')
        .expect(200);

      expect(verifyResponse.body.data.issues).toHaveLength(0);
      expect(verifyResponse.body.data.healthScore).toBe(100);
    });
  });

  describe('バックアップとリストア機能', () => {
    it('Should create complete system backups with all related data', async () => {
      // Create comprehensive test data
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Add various entities
      const entities = {
        characters: [],
        locations: [],
        sessions: [],
        quests: []
      };

      // Create characters
      for (let i = 0; i < 5; i++) {
        const char = TestDataFactory.createTestCharacter(campaign.id, { name: `Character ${i}` });
        const response = await request(app).post('/api/characters').send(char).expect(201);
        entities.characters.push(response.body.data);
      }

      // Create locations
      for (let i = 0; i < 3; i++) {
        const loc = TestDataFactory.createTestLocation(campaign.id, { name: `Location ${i}` });
        const response = await request(app).post('/api/locations').send(loc).expect(201);
        entities.locations.push(response.body.data);
      }

      // Create sessions with complex data
      const session = TestDataFactory.createTestSession(campaign.id, {
        sessionData: {
          timeline: {
            events: Array.from({ length: 100 }, (_, i) => ({
              id: `event-${i}`,
              type: 'player_action',
              content: `Event ${i}`,
              timestamp: new Date(Date.now() - i * 60000).toISOString()
            })),
            currentEvent: 'event-50',
            startTime: new Date().toISOString()
          },
          participants: entities.characters.map(c => c.id),
          currentLocation: entities.locations[0].id,
          activeQuests: []
        }
      });
      await request(app).post('/api/sessions').send(session).expect(201);

      // Create backup
      const backupResponse = await request(app)
        .post('/api/admin/backup')
        .send({
          type: 'full',
          includeMedia: true,
          compression: 'gzip',
          encryption: {
            enabled: true,
            passphrase: 'test-backup-password'
          }
        })
        .expect(200);

      expect(backupResponse.body.success).toBe(true);
      expect(backupResponse.body.data.backupId).toBeDefined();
      expect(backupResponse.body.data.size).toBeGreaterThan(0);
      expect(backupResponse.body.data.entityCounts).toBeDefined();
      expect(backupResponse.body.data.checksum).toBeDefined();

      // Verify backup metadata
      const backupMetadata = await request(app)
        .get(`/api/admin/backup/${backupResponse.body.data.backupId}/metadata`)
        .expect(200);

      expect(backupMetadata.body.data.version).toBeDefined();
      expect(backupMetadata.body.data.timestamp).toBeDefined();
      expect(backupMetadata.body.data.entities.campaigns).toBe(1);
      expect(backupMetadata.body.data.entities.characters).toBe(5);
      expect(backupMetadata.body.data.entities.locations).toBe(3);
      expect(backupMetadata.body.data.entities.sessions).toBe(1);

      // Clear database
      testDatabase.resetDatabase(db);

      // Verify database is empty
      const emptyCampaigns = await request(app).get('/api/campaigns').expect(200);
      expect(emptyCampaigns.body.data).toHaveLength(0);

      // Restore from backup
      const restoreResponse = await request(app)
        .post('/api/admin/restore')
        .send({
          backupId: backupResponse.body.data.backupId,
          decryption: {
            passphrase: 'test-backup-password'
          },
          options: {
            validateChecksum: true,
            preserveExisting: false,
            dryRun: false
          }
        })
        .expect(200);

      expect(restoreResponse.body.success).toBe(true);
      expect(restoreResponse.body.data.restoredEntities).toBeDefined();
      expect(restoreResponse.body.data.warnings).toHaveLength(0);

      // Verify restoration
      const restoredCampaigns = await request(app).get('/api/campaigns').expect(200);
      expect(restoredCampaigns.body.data).toHaveLength(1);
      expect(restoredCampaigns.body.data[0].id).toBe(campaign.id);

      const restoredCharacters = await request(app)
        .get(`/api/characters?campaignId=${campaign.id}`)
        .expect(200);
      expect(restoredCharacters.body.data).toHaveLength(5);

      // Verify complex session data was restored
      const restoredSessions = await request(app)
        .get(`/api/sessions?campaignId=${campaign.id}`)
        .expect(200);
      expect(restoredSessions.body.data).toHaveLength(1);
      expect(restoredSessions.body.data[0].sessionData.timeline.events).toHaveLength(100);
    });

    it('Should handle incremental backups efficiently', async () => {
      // Create initial data
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const initialCharacters = [];
      for (let i = 0; i < 3; i++) {
        const char = TestDataFactory.createTestCharacter(campaign.id, { name: `Initial ${i}` });
        const response = await request(app).post('/api/characters').send(char).expect(201);
        initialCharacters.push(response.body.data);
      }

      // Create full backup
      const fullBackupResponse = await request(app)
        .post('/api/admin/backup')
        .send({ type: 'full' })
        .expect(200);

      const fullBackupId = fullBackupResponse.body.data.backupId;

      // Make changes
      await request(app)
        .patch(`/api/characters/${initialCharacters[0].id}`)
        .send({ name: 'Modified Character' })
        .expect(200);

      // Add new characters
      for (let i = 0; i < 2; i++) {
        const char = TestDataFactory.createTestCharacter(campaign.id, { name: `New ${i}` });
        await request(app).post('/api/characters').send(char).expect(201);
      }

      // Create incremental backup
      const incrementalBackupResponse = await request(app)
        .post('/api/admin/backup')
        .send({
          type: 'incremental',
          baseBackupId: fullBackupId
        })
        .expect(200);

      expect(incrementalBackupResponse.body.success).toBe(true);
      const incrementalSize = incrementalBackupResponse.body.data.size;
      const fullSize = fullBackupResponse.body.data.size;

      // Incremental should be smaller
      expect(incrementalSize).toBeLessThan(fullSize);
      expect(incrementalBackupResponse.body.data.changesSummary).toBeDefined();
      expect(incrementalBackupResponse.body.data.changesSummary.modified).toBe(1);
      expect(incrementalBackupResponse.body.data.changesSummary.added).toBe(2);

      // Test restoration from incremental chain
      testDatabase.resetDatabase(db);

      const chainRestoreResponse = await request(app)
        .post('/api/admin/restore')
        .send({
          backupId: incrementalBackupResponse.body.data.backupId,
          options: {
            applyIncrementalChain: true
          }
        })
        .expect(200);

      expect(chainRestoreResponse.body.success).toBe(true);
      expect(chainRestoreResponse.body.data.appliedBackups).toHaveLength(2);

      // Verify all data is restored correctly
      const restoredCharacters = await request(app)
        .get(`/api/characters?campaignId=${campaign.id}`)
        .expect(200);

      expect(restoredCharacters.body.data).toHaveLength(5); // 3 initial + 2 new
      const modifiedChar = restoredCharacters.body.data.find((c: any) => c.id === initialCharacters[0].id);
      expect(modifiedChar.name).toBe('Modified Character');
    });

    it('Should validate backup integrity and handle corruption', async () => {
      // Create test data and backup
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const backupResponse = await request(app)
        .post('/api/admin/backup')
        .send({ type: 'full' })
        .expect(200);

      const backupId = backupResponse.body.data.backupId;
      const originalChecksum = backupResponse.body.data.checksum;

      // Simulate backup corruption
      const backupPath = join(testBackupDir, `${backupId}.backup`);
      if (existsSync(backupPath)) {
        const backupData = readFileSync(backupPath);
        // Corrupt some bytes
        backupData[100] = 0xFF;
        backupData[200] = 0x00;
        writeFileSync(backupPath, backupData);
      }

      // Try to restore corrupted backup
      const corruptRestoreResponse = await request(app)
        .post('/api/admin/restore')
        .send({
          backupId: backupId,
          options: {
            validateChecksum: true
          }
        })
        .expect(400);

      expect(corruptRestoreResponse.body.error.code).toBe('BACKUP_CORRUPTED');
      expect(corruptRestoreResponse.body.error.details.expectedChecksum).toBe(originalChecksum);
      expect(corruptRestoreResponse.body.error.details.actualChecksum).not.toBe(originalChecksum);

      // Test backup verification endpoint
      const verifyResponse = await request(app)
        .post('/api/admin/backup/verify')
        .send({ backupId: backupId })
        .expect(200);

      expect(verifyResponse.body.success).toBe(false);
      expect(verifyResponse.body.data.isValid).toBe(false);
      expect(verifyResponse.body.data.errors).toContain('checksum_mismatch');
    });
  });

  describe('データマイグレーションとバージョン管理', () => {
    it('Should execute database migrations with proper rollback support', async () => {
      // Get current migration status
      const statusResponse = await request(app)
        .get('/api/admin/migrations/status')
        .expect(200);

      const currentVersion = statusResponse.body.data.currentVersion;

      // Define test migration
      const testMigration: DatabaseMigration = {
        version: currentVersion + 1,
        name: 'add_campaign_tags',
        description: 'Add tags support to campaigns',
        up: `
          ALTER TABLE campaigns ADD COLUMN tags TEXT;
          CREATE INDEX idx_campaigns_tags ON campaigns(tags);
        `,
        down: `
          DROP INDEX IF EXISTS idx_campaigns_tags;
          ALTER TABLE campaigns DROP COLUMN tags;
        `,
        checksum: 'test-checksum-123'
      };

      // Apply migration
      const applyResponse = await request(app)
        .post('/api/admin/migrations/apply')
        .send({
          migration: testMigration,
          options: {
            dryRun: false,
            createBackup: true
          }
        })
        .expect(200);

      expect(applyResponse.body.success).toBe(true);
      expect(applyResponse.body.data.appliedVersion).toBe(testMigration.version);
      expect(applyResponse.body.data.backupId).toBeDefined();

      // Verify migration was applied
      const newStatusResponse = await request(app)
        .get('/api/admin/migrations/status')
        .expect(200);

      expect(newStatusResponse.body.data.currentVersion).toBe(testMigration.version);
      expect(newStatusResponse.body.data.appliedMigrations).toContainEqual(
        expect.objectContaining({
          version: testMigration.version,
          name: testMigration.name
        })
      );

      // Test using new column
      const campaignWithTags = TestDataFactory.createTestCampaign();
      const createResponse = await request(app)
        .post('/api/campaigns')
        .send({ ...campaignWithTags, tags: ['fantasy', 'epic', 'dragons'] })
        .expect(201);

      expect(createResponse.body.data.tags).toEqual(['fantasy', 'epic', 'dragons']);

      // Test rollback
      const rollbackResponse = await request(app)
        .post('/api/admin/migrations/rollback')
        .send({
          targetVersion: currentVersion,
          options: {
            createBackup: true
          }
        })
        .expect(200);

      expect(rollbackResponse.body.success).toBe(true);
      expect(rollbackResponse.body.data.rolledBackVersions).toContain(testMigration.version);

      // Verify rollback
      const rollbackStatusResponse = await request(app)
        .get('/api/admin/migrations/status')
        .expect(200);

      expect(rollbackStatusResponse.body.data.currentVersion).toBe(currentVersion);

      // Attempting to use tags should now fail
      const failedCreateResponse = await request(app)
        .post('/api/campaigns')
        .send({ ...TestDataFactory.createTestCampaign(), tags: ['should', 'fail'] })
        .expect(400);

      expect(failedCreateResponse.body.error.code).toContain('UNKNOWN_FIELD');
    });

    it('Should handle complex data transformations during migration', async () => {
      // Create legacy data structure
      const legacyCampaigns = [];
      for (let i = 0; i < 5; i++) {
        const campaign = TestDataFactory.createTestCampaign({
          name: `Legacy Campaign ${i}`,
          // Legacy structure with flat character list
          characterIds: [`char-${i}-1`, `char-${i}-2`, `char-${i}-3`]
        });
        const response = await request(app).post('/api/campaigns').send(campaign).expect(201);
        legacyCampaigns.push(response.body.data);
      }

      // Define transformation migration
      const transformMigration: DatabaseMigration = {
        version: 999,
        name: 'transform_character_relationships',
        description: 'Transform flat character IDs to relational structure',
        up: `
          -- Create new relationship table
          CREATE TABLE campaign_characters (
            campaign_id TEXT NOT NULL,
            character_id TEXT NOT NULL,
            role TEXT DEFAULT 'player',
            joined_at TEXT NOT NULL,
            PRIMARY KEY (campaign_id, character_id)
          );
          
          -- Custom transformation logic would be handled by application
        `,
        down: `
          DROP TABLE campaign_characters;
        `,
        transformFunction: async (db: DatabaseType) => {
          // Transform flat IDs to relational entries
          const campaigns = db.prepare('SELECT * FROM campaigns').all();
          const stmt = db.prepare(`
            INSERT INTO campaign_characters (campaign_id, character_id, role, joined_at)
            VALUES (?, ?, ?, ?)
          `);

          for (const campaign of campaigns) {
            const data = JSON.parse(campaign.settings || '{}');
            if (data.characterIds) {
              for (const charId of data.characterIds) {
                stmt.run(campaign.id, charId, 'player', new Date().toISOString());
              }
            }
          }
        },
        checksum: 'transform-checksum-456'
      };

      // Apply transformation migration
      const transformResponse = await request(app)
        .post('/api/admin/migrations/apply')
        .send({
          migration: transformMigration,
          options: {
            runTransform: true,
            validateData: true
          }
        })
        .expect(200);

      expect(transformResponse.body.success).toBe(true);
      expect(transformResponse.body.data.transformedRecords).toBeGreaterThan(0);

      // Verify data transformation
      const verifyResponse = await request(app)
        .get('/api/admin/data-integrity/check')
        .expect(200);

      expect(verifyResponse.body.data.issues).toHaveLength(0);

      // Test new relational structure
      for (const campaign of legacyCampaigns) {
        const relationResponse = await request(app)
          .get(`/api/campaigns/${campaign.id}/characters`)
          .expect(200);

        expect(relationResponse.body.data.relationships).toHaveLength(3);
        relationResponse.body.data.relationships.forEach((rel: any) => {
          expect(rel.campaignId).toBe(campaign.id);
          expect(rel.role).toBe('player');
          expect(rel.joinedAt).toBeDefined();
        });
      }
    });

    it('Should manage migration conflicts and dependencies', async () => {
      // Create migrations with dependencies
      const migrations: DatabaseMigration[] = [
        {
          version: 1001,
          name: 'add_user_profiles',
          dependencies: [],
          up: 'CREATE TABLE user_profiles (user_id TEXT PRIMARY KEY, bio TEXT);',
          down: 'DROP TABLE user_profiles;',
          checksum: 'dep-1'
        },
        {
          version: 1002,
          name: 'add_user_preferences',
          dependencies: [1001], // Depends on user_profiles
          up: 'CREATE TABLE user_preferences (user_id TEXT PRIMARY KEY, theme TEXT);',
          down: 'DROP TABLE user_preferences;',
          checksum: 'dep-2'
        },
        {
          version: 1003,
          name: 'add_user_achievements',
          dependencies: [1001, 1002], // Depends on both
          up: 'CREATE TABLE user_achievements (user_id TEXT, achievement_id TEXT);',
          down: 'DROP TABLE user_achievements;',
          checksum: 'dep-3'
        }
      ];

      // Try to apply out of order (should fail)
      const outOfOrderResponse = await request(app)
        .post('/api/admin/migrations/apply')
        .send({
          migration: migrations[2], // Try to apply 1003 first
          options: { enforceDependencies: true }
        })
        .expect(400);

      expect(outOfOrderResponse.body.error.code).toBe('MIGRATION_DEPENDENCY_ERROR');
      expect(outOfOrderResponse.body.error.details.missingDependencies).toContain(1001);
      expect(outOfOrderResponse.body.error.details.missingDependencies).toContain(1002);

      // Apply in correct order
      for (const migration of migrations) {
        const response = await request(app)
          .post('/api/admin/migrations/apply')
          .send({
            migration: migration,
            options: { enforceDependencies: true }
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }

      // Test batch migration application
      const batchMigrations: DatabaseMigration[] = [
        {
          version: 2001,
          name: 'batch_migration_1',
          dependencies: [],
          up: 'CREATE TABLE batch_test_1 (id TEXT PRIMARY KEY);',
          down: 'DROP TABLE batch_test_1;',
          checksum: 'batch-1'
        },
        {
          version: 2002,
          name: 'batch_migration_2',
          dependencies: [2001],
          up: 'CREATE TABLE batch_test_2 (id TEXT PRIMARY KEY);',
          down: 'DROP TABLE batch_test_2;',
          checksum: 'batch-2'
        }
      ];

      // Apply batch with automatic dependency resolution
      const batchResponse = await request(app)
        .post('/api/admin/migrations/apply-batch')
        .send({
          migrations: batchMigrations,
          options: {
            resolveDependencies: true,
            stopOnError: true
          }
        })
        .expect(200);

      expect(batchResponse.body.success).toBe(true);
      expect(batchResponse.body.data.appliedMigrations).toHaveLength(2);
      expect(batchResponse.body.data.executionOrder).toEqual([2001, 2002]);
    });
  });

  describe('クロスブラウザとモバイル互換性', () => {
    it('Should handle different data formats from various clients', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Test different date formats from various browsers
      const dateFormats = [
        // Chrome/Firefox ISO format
        { timestamp: '2024-01-15T10:30:00.000Z', browser: 'chrome' },
        // Safari with timezone
        { timestamp: '2024-01-15T10:30:00.000-08:00', browser: 'safari' },
        // Mobile with milliseconds
        { timestamp: '2024-01-15T10:30:00.123456Z', browser: 'mobile-chrome' },
        // Legacy format
        { timestamp: 'Mon Jan 15 2024 10:30:00 GMT-0800 (PST)', browser: 'legacy' }
      ];

      for (const format of dateFormats) {
        const session = TestDataFactory.createTestSession(campaign.id, {
          name: `Session from ${format.browser}`,
          startTime: new Date(format.timestamp)
        });

        const response = await request(app)
          .post('/api/sessions')
          .set('User-Agent', `test-${format.browser}`)
          .send(session)
          .expect(201);

        // All should be normalized to ISO format
        expect(response.body.data.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }

      // Test different number formats
      const numberFormats = [
        { value: '100', expected: 100 },
        { value: '100.5', expected: 100.5 },
        { value: '1,000', expected: 1000 },
        { value: '1.000,50', expected: 1000.5 }, // European format
      ];

      for (const format of numberFormats) {
        const character = TestDataFactory.createTestCharacter(campaign.id, {
          name: `Character with ${format.value} HP`,
          stats: {
            health: format.value,
            maxHealth: format.value
          }
        });

        const response = await request(app)
          .post('/api/characters')
          .send(character)
          .expect(201);

        expect(response.body.data.stats.health).toBe(format.expected);
      }

      // Test different array/object serializations
      const serializations = [
        // Standard JSON
        { tags: ['tag1', 'tag2'], contentType: 'application/json' },
        // Form data style
        { 'tags[]': ['tag1', 'tag2'], contentType: 'application/x-www-form-urlencoded' },
        // Comma separated
        { tags: 'tag1,tag2', contentType: 'text/plain' }
      ];

      for (const serialization of serializations) {
        const updateResponse = await request(app)
          .patch(`/api/campaigns/${campaign.id}`)
          .set('Content-Type', serialization.contentType)
          .send(serialization)
          .expect(200);

        // All should be normalized to array
        expect(Array.isArray(updateResponse.body.data.tags)).toBe(true);
        expect(updateResponse.body.data.tags).toHaveLength(2);
      }
    });

    it('Should handle offline sync and conflict resolution', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const character = TestDataFactory.createTestCharacter(campaign.id);
      const charResponse = await request(app).post('/api/characters').send(character).expect(201);
      const characterId = charResponse.body.data.id;
      const originalVersion = charResponse.body.data.version;

      // Simulate offline changes from multiple devices
      const offlineChanges = [
        {
          deviceId: 'mobile-device-1',
          changes: [
            {
              entityType: 'character',
              entityId: characterId,
              operation: 'update',
              data: { name: 'Mobile Edit 1', stats: { health: 90 } },
              timestamp: new Date(Date.now() - 5000).toISOString(),
              baseVersion: originalVersion
            }
          ]
        },
        {
          deviceId: 'tablet-device-2',
          changes: [
            {
              entityType: 'character',
              entityId: characterId,
              operation: 'update',
              data: { name: 'Tablet Edit 2', stats: { health: 85 } },
              timestamp: new Date(Date.now() - 3000).toISOString(),
              baseVersion: originalVersion
            }
          ]
        },
        {
          deviceId: 'desktop-device-3',
          changes: [
            {
              entityType: 'character',
              entityId: characterId,
              operation: 'update',
              data: { description: 'Desktop Edit', locationId: 'new-location' },
              timestamp: new Date(Date.now() - 1000).toISOString(),
              baseVersion: originalVersion
            }
          ]
        }
      ];

      // Submit offline changes for sync
      const syncResponses = [];
      for (const deviceChanges of offlineChanges) {
        const response = await request(app)
          .post('/api/sync/offline-changes')
          .send(deviceChanges)
          .expect(200);
        syncResponses.push(response.body);
      }

      // Verify conflict detection
      const conflictCount = syncResponses.filter(r => 
        r.data.conflicts && r.data.conflicts.length > 0
      ).length;
      expect(conflictCount).toBeGreaterThan(0);

      // Check conflict resolution
      const finalCharacter = await request(app)
        .get(`/api/characters/${characterId}`)
        .expect(200);

      // Should have applied changes based on timestamp (last write wins)
      expect(finalCharacter.body.data.description).toBe('Desktop Edit');
      // Stats should be from tablet (more recent than mobile)
      expect(finalCharacter.body.data.stats.health).toBe(85);
      expect(finalCharacter.body.data.version).toBeGreaterThan(originalVersion);

      // Get sync history
      const syncHistory = await request(app)
        .get(`/api/sync/history?entityId=${characterId}`)
        .expect(200);

      expect(syncHistory.body.data.syncEvents).toHaveLength(3);
      syncHistory.body.data.syncEvents.forEach((event: any) => {
        expect(event.deviceId).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(event.result).toBeDefined();
      });
    });
  });
});

// Helper function to simulate file corruption
function corruptFile(filePath: string, corruptionType: 'truncate' | 'randomBytes' | 'header'): void {
  if (!existsSync(filePath)) return;
  
  const data = readFileSync(filePath);
  let corrupted: Buffer;
  
  switch (corruptionType) {
    case 'truncate':
      corrupted = data.slice(0, Math.floor(data.length / 2));
      break;
    case 'randomBytes':
      corrupted = Buffer.from(data);
      for (let i = 0; i < 10; i++) {
        const pos = Math.floor(Math.random() * corrupted.length);
        corrupted[pos] = Math.floor(Math.random() * 256);
      }
      break;
    case 'header':
      corrupted = Buffer.from(data);
      // Corrupt file header
      for (let i = 0; i < Math.min(100, corrupted.length); i++) {
        corrupted[i] = 0xFF;
      }
      break;
  }
  
  writeFileSync(filePath, corrupted);
}