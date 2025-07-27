/**
 * campaignService Unit Tests
 * Tests for Campaign Service - CRUD Operations and Campaign Management
 * t-WADA naming convention: campaignService.unit.test.ts
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';
import { getCampaignService } from './campaignService';
import { DatabaseError, ValidationError } from '../middleware/errorHandler';
import type { TRPGCampaign, PaginatedResponse } from '@ai-agent-trpg/types';
import { TestDataFactory, DatabaseTestUtils } from '../tests/setup';
import { databaseOnlyMockSetup } from '../tests/mocks';

// Mock dependencies
jest.mock('../database/database', () => ({
  getDatabase: jest.fn(),
  withTransaction: jest.fn()
}));
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import { getDatabase, withTransaction } from '../database/database';

describe('CampaignService - Campaign Management CRUD Operations', () => {
  let campaignService: ReturnType<typeof getCampaignService>;
  let testDb: Database;
  let mockDatabase: jest.Mocked<Database>;
  let mockPrepare: jest.Mock;
  let mockStatement: jest.Mocked<any>;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup database-only mock environment
    await databaseOnlyMockSetup();
    
    // Create service instance
    campaignService = getCampaignService();
    
    // Use global test database
    testDb = global.testDb;
    
    // Setup mock database and statements
    mockStatement = {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    };
    mockPrepare = jest.fn().mockReturnValue(mockStatement);
    mockDatabase = {
      prepare: mockPrepare
    } as any;
    
    (getDatabase as jest.Mock).mockReturnValue(mockDatabase);
    (withTransaction as jest.Mock).mockImplementation((callback) => callback(mockDatabase));
  });

  describe('getCampaigns - Campaign Listing with Pagination', () => {
    test('should return paginated campaigns with default filters', async () => {
      // Arrange
      const testCampaigns = [
        TestDataFactory.createTestCampaign({ name: 'Campaign 1', status: 'active' }),
        TestDataFactory.createTestCampaign({ name: 'Campaign 2', status: 'planning' })
      ];
      
      mockStatement.get.mockReturnValue({ total: 2 });
      mockStatement.all.mockReturnValue([
        {
          id: testCampaigns[0].id,
          name: testCampaigns[0].name,
          description: testCampaigns[0].description,
          status: testCampaigns[0].status,
          settings: '{}',
          current_level: 1,
          characters: '[]',
          quests: '[]',
          events: '[]',
          sessions: '[]',
          locations: '[]',
          factions: '[]',
          goals: '{}',
          notes: '{}',
          ai_content: '{}',
          tags: '[]',
          created_at: testCampaigns[0].createdAt,
          updated_at: testCampaigns[0].updatedAt,
          total_play_time: 0
        },
        {
          id: testCampaigns[1].id,
          name: testCampaigns[1].name,
          description: testCampaigns[1].description,
          status: testCampaigns[1].status,
          settings: '{}',
          current_level: 1,
          characters: '[]',
          quests: '[]',
          events: '[]',
          sessions: '[]',
          locations: '[]',
          factions: '[]',
          goals: '{}',
          notes: '{}',
          ai_content: '{}',
          tags: '[]',
          created_at: testCampaigns[1].createdAt,
          updated_at: testCampaigns[1].updatedAt,
          total_play_time: 0
        }
      ]);

      // Act
      const result = await campaignService.getCampaigns({ page: 1, limit: 10 });

      // Assert
      expect(result).toEqual(expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Campaign 1' }),
          expect.objectContaining({ name: 'Campaign 2' })
        ]),
        totalCount: 2,
        pageSize: 10,
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      }));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*)'));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM campaigns'));
    });

    test('should filter campaigns by status', async () => {
      // Arrange
      mockStatement.get.mockReturnValue({ total: 1 });
      mockStatement.all.mockReturnValue([]);

      // Act
      await campaignService.getCampaigns({ page: 1, limit: 10, status: 'active' });

      // Assert
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('AND status = ?'));
      expect(mockStatement.get).toHaveBeenCalledWith(['active']);
      expect(mockStatement.all).toHaveBeenCalledWith(['active', 10, 0]);
    });

    test('should filter campaigns by search term', async () => {
      // Arrange
      const searchTerm = 'fantasy';
      mockStatement.get.mockReturnValue({ total: 1 });
      mockStatement.all.mockReturnValue([]);

      // Act
      await campaignService.getCampaigns({ page: 1, limit: 10, search: searchTerm });

      // Assert
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('AND (name LIKE ? OR description LIKE ?)'));
      expect(mockStatement.get).toHaveBeenCalledWith([`%${searchTerm}%`, `%${searchTerm}%`]);
    });

    test('should combine status and search filters', async () => {
      // Arrange
      mockStatement.get.mockReturnValue({ total: 0 });
      mockStatement.all.mockReturnValue([]);

      // Act
      await campaignService.getCampaigns({ 
        page: 1, 
        limit: 5, 
        status: 'active', 
        search: 'dragon' 
      });

      // Assert
      expect(mockStatement.get).toHaveBeenCalledWith(['active', '%dragon%', '%dragon%']);
    });

    test('should calculate pagination correctly', async () => {
      // Arrange
      mockStatement.get.mockReturnValue({ total: 25 });
      mockStatement.all.mockReturnValue([]);

      // Act
      const result = await campaignService.getCampaigns({ page: 3, limit: 10 });

      // Assert
      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
      expect(mockStatement.all).toHaveBeenCalledWith([10, 20]); // LIMIT 10 OFFSET 20
    });

    test('should throw DatabaseError when query fails', async () => {
      // Arrange
      mockStatement.get.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Act & Assert
      await expect(
        campaignService.getCampaigns({ page: 1, limit: 10 })
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('getCampaignById - Single Campaign Retrieval', () => {
    test('should return campaign when found', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign();
      const mockRow = {
        id: testCampaign.id,
        name: testCampaign.name,
        description: testCampaign.description,
        status: testCampaign.status,
        settings: JSON.stringify(testCampaign.settings),
        current_level: testCampaign.currentLevel,
        characters: JSON.stringify(testCampaign.characters),
        quests: JSON.stringify(testCampaign.quests),
        events: JSON.stringify(testCampaign.events),
        sessions: JSON.stringify(testCampaign.sessions),
        locations: JSON.stringify(testCampaign.locations),
        factions: JSON.stringify(testCampaign.factions),
        goals: JSON.stringify(testCampaign.goals),
        notes: JSON.stringify(testCampaign.notes),
        ai_content: JSON.stringify(testCampaign.aiContent),
        tags: JSON.stringify(testCampaign.tags),
        created_at: testCampaign.createdAt,
        updated_at: testCampaign.updatedAt,
        total_play_time: testCampaign.totalPlayTime
      };
      mockStatement.get.mockReturnValue(mockRow);

      // Act
      const result = await campaignService.getCampaignById(testCampaign.id);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: testCampaign.id,
        name: testCampaign.name,
        description: testCampaign.description,
        status: testCampaign.status
      }));
      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM campaigns WHERE id = ?');
      expect(mockStatement.get).toHaveBeenCalledWith(testCampaign.id);
    });

    test('should return null when campaign not found', async () => {
      // Arrange
      mockStatement.get.mockReturnValue(null);

      // Act
      const result = await campaignService.getCampaignById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });

    test('should throw DatabaseError when query fails', async () => {
      // Arrange
      mockStatement.get.mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act & Assert
      await expect(
        campaignService.getCampaignById('test-id')
      ).rejects.toThrow(DatabaseError);
    });

    test('should map database row to campaign with default values', async () => {
      // Arrange
      const minimalRow = {
        id: 'test-id',
        name: 'Test Campaign',
        description: 'Test Description',
        status: 'planning',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };
      mockStatement.get.mockReturnValue(minimalRow);

      // Act
      const result = await campaignService.getCampaignById('test-id');

      // Assert
      expect(result).toEqual(expect.objectContaining({
        system: 'D&D 5e',
        theme: 'ファンタジー',
        setting: '未設定',
        settings: {},
        currentLevel: 1,
        gameMasterId: 'default-gm',
        playerIds: [],
        characterIds: [],
        characters: [],
        quests: [],
        events: [],
        locations: [],
        factions: [],
        expectedDuration: 10,
        totalPlayTime: 0
      }));
    });
  });

  describe('createCampaign - Campaign Creation', () => {
    test('should create campaign with minimal data', async () => {
      // Arrange
      const campaignData = {
        name: 'New Campaign',
        description: 'A new TRPG campaign'
      };
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act
      const result = await campaignService.createCampaign(campaignData);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: 'New Campaign',
        description: 'A new TRPG campaign',
        status: 'planning'
      }));
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO campaigns'));
    });

    test('should create campaign with full data', async () => {
      // Arrange
      const fullCampaignData = TestDataFactory.createTestCampaign({
        name: 'Full Campaign',
        system: 'Pathfinder',
        theme: 'Horror',
        currentLevel: 5,
        expectedDuration: 20
      });
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act
      const result = await campaignService.createCampaign(fullCampaignData);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: 'Full Campaign',
        system: 'Pathfinder',
        theme: 'Horror',
        currentLevel: 5,
        expectedDuration: 20
      }));
      expect(mockStatement.run).toHaveBeenCalledWith(
        expect.any(String), // id
        'Full Campaign',
        expect.any(String), // description
        expect.any(String), // settings JSON
        expect.any(String), // status
        5, // current_level
        expect.any(String), // start_date
        null, // end_date
        20, // expected_duration
        expect.any(String), // goals JSON
        expect.any(String), // characters JSON
        expect.any(String), // quests JSON
        expect.any(String), // events JSON
        expect.any(String), // sessions JSON
        expect.any(String), // locations JSON
        expect.any(String), // factions JSON
        expect.any(String), // notes JSON
        expect.any(String), // ai_content JSON
        expect.any(String), // created_at
        expect.any(String), // updated_at
        0 // total_play_time
      );
    });

    test('should throw DatabaseError when creation fails', async () => {
      // Arrange
      mockStatement.run.mockImplementation(() => {
        throw new Error('Database constraint violation');
      });

      // Act & Assert
      await expect(
        campaignService.createCampaign({ name: 'Test Campaign' })
      ).rejects.toThrow(DatabaseError);
    });

    test('should set default values for missing fields', async () => {
      // Arrange
      const minimalData = { name: 'Minimal Campaign' };
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act
      const result = await campaignService.createCampaign(minimalData);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        system: 'D&D 5e',
        theme: 'ファンタジー',
        setting: '未設定',
        status: 'planning',
        level: 1,
        currentLevel: 1,
        gameMasterId: 'default-gm',
        playerIds: [],
        characterIds: [],
        expectedDuration: 10,
        totalPlayTime: 0
      }));
    });
  });

  describe('updateCampaign - Campaign Updates', () => {
    test('should update existing campaign', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign();
      
      // Mock getCampaignById to return existing campaign
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(testCampaign);
      mockStatement.run.mockReturnValue({ changes: 1 });

      const updateData = {
        name: 'Updated Campaign Name',
        description: 'Updated description',
        status: 'active' as const
      };

      // Act
      const result = await campaignService.updateCampaign(testCampaign.id, updateData);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: testCampaign.id,
        name: 'Updated Campaign Name',
        description: 'Updated description',
        status: 'active',
        createdAt: testCampaign.createdAt // Should not change
      }));
      expect(result!.updatedAt).not.toBe(testCampaign.updatedAt); // Should be updated
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE campaigns SET'));
    });

    test('should return null when campaign not found', async () => {
      // Arrange
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(null);

      // Act
      const result = await campaignService.updateCampaign('non-existent-id', { name: 'New Name' });

      // Assert
      expect(result).toBeNull();
    });

    test('should preserve immutable fields during update', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign();
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(testCampaign);
      mockStatement.run.mockReturnValue({ changes: 1 });

      const maliciousUpdate = {
        id: 'different-id',
        createdAt: '2025-01-01T00:00:00.000Z',
        name: 'Updated Name'
      };

      // Act
      const result = await campaignService.updateCampaign(testCampaign.id, maliciousUpdate);

      // Assert
      expect(result!.id).toBe(testCampaign.id); // Should not change
      expect(result!.createdAt).toBe(testCampaign.createdAt); // Should not change
      expect(result!.name).toBe('Updated Name'); // Should change
    });

    test('should throw DatabaseError when update fails', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign();
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(testCampaign);
      mockStatement.run.mockImplementation(() => {
        throw new Error('Database update failed');
      });

      // Act & Assert
      await expect(
        campaignService.updateCampaign(testCampaign.id, { name: 'New Name' })
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateCampaignStatus - Status Updates', () => {
    test('should update campaign status with valid status', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign();
      jest.spyOn(campaignService, 'updateCampaign').mockResolvedValue({
        ...testCampaign,
        status: 'active'
      });

      // Act
      const result = await campaignService.updateCampaignStatus(testCampaign.id, 'active');

      // Assert
      expect(result!.status).toBe('active');
      expect(campaignService.updateCampaign).toHaveBeenCalledWith(testCampaign.id, { status: 'active' });
    });

    test('should throw ValidationError for invalid status', async () => {
      // Act & Assert
      await expect(
        campaignService.updateCampaignStatus('test-id', 'invalid-status')
      ).rejects.toThrow(ValidationError);
      
      await expect(
        campaignService.updateCampaignStatus('test-id', 'invalid-status')
      ).rejects.toThrow('Invalid status: invalid-status');
    });

    test('should accept all valid statuses', async () => {
      // Arrange
      const validStatuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
      const testCampaign = TestDataFactory.createTestCampaign();
      
      for (const status of validStatuses) {
        jest.spyOn(campaignService, 'updateCampaign').mockResolvedValue({
          ...testCampaign,
          status: status as any
        });

        // Act & Assert
        await expect(
          campaignService.updateCampaignStatus(testCampaign.id, status)
        ).resolves.not.toThrow();
      }
    });
  });

  describe('deleteCampaign - Campaign Deletion', () => {
    test('should delete existing campaign', async () => {
      // Arrange
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act
      const result = await campaignService.deleteCampaign('test-id');

      // Assert
      expect(result).toBe(true);
      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM campaigns WHERE id = ?');
      expect(mockStatement.run).toHaveBeenCalledWith('test-id');
    });

    test('should return false when campaign not found', async () => {
      // Arrange
      mockStatement.run.mockReturnValue({ changes: 0 });

      // Act
      const result = await campaignService.deleteCampaign('non-existent-id');

      // Assert
      expect(result).toBe(false);
    });

    test('should throw DatabaseError when deletion fails', async () => {
      // Arrange
      mockStatement.run.mockImplementation(() => {
        throw new Error('Database deletion failed');
      });

      // Act & Assert
      await expect(
        campaignService.deleteCampaign('test-id')
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('Character Management - addCharacterToCampaign', () => {
    test('should add character to campaign', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign({
        characters: ['char1', 'char2']
      });
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(testCampaign);
      jest.spyOn(campaignService, 'updateCampaign').mockResolvedValue({
        ...testCampaign,
        characters: ['char1', 'char2', 'char3']
      });

      // Act
      const result = await campaignService.addCharacterToCampaign(testCampaign.id, 'char3');

      // Assert
      expect(result!.characters).toEqual(['char1', 'char2', 'char3']);
      expect(campaignService.updateCampaign).toHaveBeenCalledWith(
        testCampaign.id, 
        { characters: ['char1', 'char2', 'char3'] }
      );
    });

    test('should not add duplicate character', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign({
        characters: ['char1', 'char2']
      });
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(testCampaign);

      // Act
      const result = await campaignService.addCharacterToCampaign(testCampaign.id, 'char1');

      // Assert
      expect(result).toEqual(testCampaign);
      expect(campaignService.updateCampaign).not.toHaveBeenCalled();
    });

    test('should return null when campaign not found', async () => {
      // Arrange
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(null);

      // Act
      const result = await campaignService.addCharacterToCampaign('non-existent-id', 'char1');

      // Assert
      expect(result).toBeNull();
    });

    test('should handle campaign with no existing characters', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign({
        characters: undefined
      });
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(testCampaign);
      jest.spyOn(campaignService, 'updateCampaign').mockResolvedValue({
        ...testCampaign,
        characters: ['char1']
      });

      // Act
      const result = await campaignService.addCharacterToCampaign(testCampaign.id, 'char1');

      // Assert
      expect(result!.characters).toEqual(['char1']);
    });
  });

  describe('Character Management - removeCharacterFromCampaign', () => {
    test('should remove character from campaign', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign({
        characters: ['char1', 'char2', 'char3']
      });
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(testCampaign);
      jest.spyOn(campaignService, 'updateCampaign').mockResolvedValue({
        ...testCampaign,
        characters: ['char1', 'char3']
      });

      // Act
      const result = await campaignService.removeCharacterFromCampaign(testCampaign.id, 'char2');

      // Assert
      expect(result!.characters).toEqual(['char1', 'char3']);
      expect(campaignService.updateCampaign).toHaveBeenCalledWith(
        testCampaign.id,
        { characters: ['char1', 'char3'] }
      );
    });

    test('should return campaign unchanged when character not found', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign({
        characters: ['char1', 'char2']
      });
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(testCampaign);

      // Act
      const result = await campaignService.removeCharacterFromCampaign(testCampaign.id, 'char3');

      // Assert
      expect(result).toEqual(testCampaign);
      expect(campaignService.updateCampaign).not.toHaveBeenCalled();
    });

    test('should return null when campaign not found', async () => {
      // Arrange
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(null);

      // Act
      const result = await campaignService.removeCharacterFromCampaign('non-existent-id', 'char1');

      // Assert
      expect(result).toBeNull();
    });

    test('should handle campaign with no characters', async () => {
      // Arrange
      const testCampaign = TestDataFactory.createTestCampaign({
        characters: undefined
      });
      jest.spyOn(campaignService, 'getCampaignById').mockResolvedValue(testCampaign);

      // Act
      const result = await campaignService.removeCharacterFromCampaign(testCampaign.id, 'char1');

      // Assert
      expect(result).toEqual(testCampaign);
      expect(campaignService.updateCampaign).not.toHaveBeenCalled();
    });
  });

  describe('Service Singleton Pattern', () => {
    test('should return same instance from getCampaignService', () => {
      // Act
      const instance1 = getCampaignService();
      const instance2 = getCampaignService();

      // Assert
      expect(instance1).toBe(instance2);
    });
  });

  describe('Data Mapping - mapRowToCampaign', () => {
    test('should map complete database row to campaign object', async () => {
      // Arrange
      const completeRow = {
        id: 'test-id',
        name: 'Test Campaign',
        description: 'Test Description',
        status: 'active',
        system: 'Pathfinder',
        theme: 'Sci-Fi',
        setting: 'Space Station',
        settings: '{"difficulty":"hard"}',
        current_level: 10,
        game_master_id: 'gm-123',
        player_ids: '["player1","player2"]',
        character_ids: '["char1","char2"]',
        world_settings: '{"techLevel":"futuristic","magicLevel":"low"}',
        sessions: '["session1"]',
        current_session_id: 'current-session',
        main_quest_id: 'main-quest',
        characters: '["char1","char2"]',
        quests: '["quest1","quest2"]',
        events: '["event1"]',
        locations: '["loc1","loc2"]',
        factions: '["faction1"]',
        start_date: '2024-01-01T00:00:00.000Z',
        estimated_end_date: '2024-12-31T23:59:59.999Z',
        end_date: null,
        last_played_date: '2024-06-01T12:00:00.000Z',
        expected_duration: 25,
        goals: '{"mainQuest":"Save the galaxy","subQuests":["Find the artifact"]}',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-06-01T12:00:00.000Z',
        last_played_at: '2024-06-01T12:00:00.000Z',
        total_play_time: 120,
        notes: '{"gm":"Important plot points"}',
        ai_content: '{"generated":"NPC dialogue"}',
        tags: '["space","adventure"]',
        image_url: 'https://example.com/image.jpg'
      };
      mockStatement.get.mockReturnValue(completeRow);

      // Act
      const result = await campaignService.getCampaignById('test-id');

      // Assert
      expect(result).toEqual({
        id: 'test-id',
        name: 'Test Campaign',
        description: 'Test Description',
        status: 'active',
        system: 'Pathfinder',
        theme: 'Sci-Fi',
        setting: 'Space Station',
        settings: { difficulty: 'hard' },
        level: 10,
        currentLevel: 10,
        gameMasterId: 'gm-123',
        playerIds: ['player1', 'player2'],
        characterIds: ['char1', 'char2'],
        worldSettings: { techLevel: 'futuristic', magicLevel: 'low' },
        sessions: ['session1'],
        currentSessionId: 'current-session',
        mainQuestId: 'main-quest',
        characters: ['char1', 'char2'],
        quests: ['quest1', 'quest2'],
        events: ['event1'],
        locations: ['loc1', 'loc2'],
        factions: ['faction1'],
        startDate: '2024-01-01T00:00:00.000Z',
        estimatedEndDate: '2024-12-31T23:59:59.999Z',
        endDate: null,
        lastPlayedDate: '2024-06-01T12:00:00.000Z',
        expectedDuration: 25,
        goals: { mainQuest: 'Save the galaxy', subQuests: ['Find the artifact'] },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-06-01T12:00:00.000Z',
        lastPlayedAt: '2024-06-01T12:00:00.000Z',
        totalPlayTime: 120,
        notes: { gm: 'Important plot points' },
        aiContent: { generated: 'NPC dialogue' },
        tags: ['space', 'adventure'],
        imageUrl: 'https://example.com/image.jpg'
      });
    });
  });
});