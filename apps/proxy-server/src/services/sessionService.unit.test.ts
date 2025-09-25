/**
 * sessionService Unit Tests
 * Tests for Session Service - Session Management, Chat, Dice Rolling, and Combat
 * t-WADA naming convention: sessionService.unit.test.ts
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';
import { getSessionService } from './sessionService';
import { DatabaseError, ValidationError } from '../middleware/errorHandler';
import type { TRPGSession, ChatMessage, DiceRoll, SessionStatus } from '@ai-agent-trpg/types';
import { TestDataFactory, DatabaseTestUtils } from '../tests/setup';
import { websocketOnlyMockSetup } from '../tests/mocks';

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
jest.mock('./characterService', () => ({
  getCharacterService: jest.fn(() => ({
    getCharactersByCampaign: jest.fn().mockResolvedValue([])
  }))
}));
jest.mock('socket.io');

import { getDatabase, withTransaction } from '../database/database';
import { getCharacterService } from './characterService';
import { Server as SocketIOServer } from 'socket.io';

describe('SessionService - Session Management and Real-time Features', () => {
  let sessionService: ReturnType<typeof getSessionService>;
  let testDb: Database;
  let mockDatabase: jest.Mocked<Database>;
  let mockPrepare: jest.Mock;
  let mockStatement: jest.Mocked<any>;
  let mockSocketIO: jest.Mocked<SocketIOServer>;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup WebSocket-only mock environment
    await websocketOnlyMockSetup();
    
    // Create service instance
    sessionService = getSessionService();
    
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

    // Setup mock Socket.IO
    mockSocketIO = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    } as any;
    sessionService.setSocketIO(mockSocketIO);
  });

  describe('Session Creation and Retrieval', () => {
    test('should create session with minimal data', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      mockStatement.get.mockReturnValue({ max_number: 0 }); // For getNextSessionNumber
      mockStatement.run.mockReturnValue({ changes: 1 });

      const sessionData = {
        campaignId,
        gamemaster: 'gm-123'
      };

      // Act
      const result = await sessionService.createSessionPublic(sessionData);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        campaignId,
        gameMasterId: 'gm-123',
        status: 'preparing',
        mode: 'exploration',
        sessionNumber: 1
      }));
      expect(result.id).toBeDefined();
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO sessions'));
    });

    test('should create session with full data', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      mockStatement.get.mockReturnValue({ max_number: 2 }); // Existing sessions
      mockStatement.run.mockReturnValue({ changes: 1 });

      const sessionData = {
        campaignId,
        status: 'active' as SessionStatus,
        mode: 'combat',
        participants: ['player1', 'player2'],
        gamemaster: 'gm-123',
        eventQueue: [{ id: 'event1', type: 'encounter' }]
      };

      // Act
      const result = await sessionService.createSessionPublic(sessionData);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        campaignId,
        status: 'active',
        mode: 'combat',
        players: ['player1', 'player2'],
        gameMasterId: 'gm-123',
        sessionNumber: 3
      }));
    });

    test('should throw ValidationError when campaignId is missing', async () => {
      // Act & Assert
      await expect(
        sessionService.createSessionPublic({})
      ).rejects.toThrow(ValidationError);
      
      await expect(
        sessionService.createSessionPublic({})
      ).rejects.toThrow('Campaign ID is required');
    });

    test('should retrieve sessions by campaign', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const mockRows = [
        {
          id: 'session-1',
          campaign_id: campaignId,
          session_number: 1,
          status: 'completed',
          mode: 'exploration',
          participants: '["player1","player2"]',
          gamemaster: 'gm-123',
          start_time: '2024-01-01T10:00:00.000Z',
          end_time: '2024-01-01T14:00:00.000Z',
          breaks: '[]',
          current_event: null,
          event_queue: '[]',
          completed_events: '[]',
          combat: null,
          chat_log: '[]',
          dice_rolls: '[]',
          notes: '""',
          created_at: '2024-01-01T09:00:00.000Z',
          updated_at: '2024-01-01T14:00:00.000Z'
        },
        {
          id: 'session-2',
          campaign_id: campaignId,
          session_number: 2,
          status: 'active',
          mode: 'combat',
          participants: '["player1","player2","player3"]',
          gamemaster: 'gm-123',
          start_time: '2024-01-02T10:00:00.000Z',
          end_time: null,
          breaks: '[]',
          current_event: null,
          event_queue: '[]',
          completed_events: '[]',
          combat: '{"active":true,"round":3}',
          chat_log: '[]',
          dice_rolls: '[]',
          notes: '""',
          created_at: '2024-01-02T09:00:00.000Z',
          updated_at: '2024-01-02T11:30:00.000Z'
        }
      ];
      mockStatement.all.mockReturnValue(mockRows);

      // Act
      const result = await sessionService.getSessionsByCampaignPublic(campaignId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'session-1',
        campaignId,
        sessionNumber: 1,
        status: 'completed',
        mode: 'exploration'
      }));
      expect(result[1]).toEqual(expect.objectContaining({
        id: 'session-2',
        campaignId,
        sessionNumber: 2,
        status: 'active',
        mode: 'combat'
      }));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY session_number DESC'));
    });

    test('should retrieve session by id', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const mockRow = {
        id: sessionId,
        campaign_id: 'campaign-123',
        session_number: 1,
        status: 'active',
        mode: 'exploration',
        participants: '["player1"]',
        gamemaster: 'gm-123',
        start_time: '2024-01-01T10:00:00.000Z',
        end_time: null,
        breaks: '[]',
        current_event: null,
        event_queue: '[]',
        completed_events: '[]',
        combat: null,
        chat_log: '[{"id":"msg1","timestamp":"2024-01-01T10:30:00.000Z","speaker":"Player 1","message":"Hello","type":"ic"}]',
        dice_rolls: '[]',
        notes: '""',
        created_at: '2024-01-01T09:00:00.000Z',
        updated_at: '2024-01-01T10:30:00.000Z'
      };
      mockStatement.get.mockReturnValue(mockRow);

      // Act
      const result = await sessionService.getSessionByIdPublic(sessionId);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: sessionId,
        campaignId: 'campaign-123',
        sessionNumber: 1,
        status: 'active',
        mode: 'exploration',
        gameMasterId: 'gm-123'
      }));
      expect(result!.chatLog).toHaveLength(1);
      expect(result!.chatLog[0].speaker).toBe('Player 1');
    });

    test('should return null when session not found', async () => {
      // Arrange
      mockStatement.get.mockReturnValue(null);

      // Act
      const result = await sessionService.getSessionByIdPublic('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Session Status Management', () => {
    test('should update session status from preparing to active', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const existingSession = {
        id: sessionId,
        campaignId: 'campaign-123',
        sessionNumber: 1,
        status: 'preparing',
        mode: 'exploration',
        participants: [],
        gamemaster: 'gm-123',
        startTime: undefined,
        endTime: undefined,
        breaks: [],
        currentEvent: undefined,
        eventQueue: [],
        completedEvents: [],
        combat: undefined,
        chatLog: [],
        diceRolls: [],
        notes: '',
        createdAt: '2024-01-01T09:00:00.000Z',
        updatedAt: '2024-01-01T09:00:00.000Z'
      };
      
      // Mock getSessionById to return existing session
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act
      const result = await sessionService.updateSessionStatusPublic(sessionId, 'active');

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: sessionId,
        status: 'active'
      }));
      expect(result!.actualStartTime).toBeDefined(); // Should set start time
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE sessions SET'));
    });

    test('should update session status from active to completed', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const existingSession = {
        id: sessionId,
        campaignId: 'campaign-123',
        sessionNumber: 1,
        status: 'active',
        mode: 'exploration',
        participants: [],
        gamemaster: 'gm-123',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: undefined,
        breaks: [],
        currentEvent: undefined,
        eventQueue: [],
        completedEvents: [],
        combat: undefined,
        chatLog: [],
        diceRolls: [],
        notes: '',
        createdAt: '2024-01-01T09:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z'
      };
      
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act
      const result = await sessionService.updateSessionStatusPublic(sessionId, 'completed');

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: sessionId,
        status: 'completed'
      }));
      expect(result!.actualEndTime).toBeDefined(); // Should set end time
    });

    test('should throw ValidationError for invalid status', async () => {
      // Act & Assert
      await expect(
        sessionService.updateSessionStatusPublic('test-id', 'invalid-status')
      ).rejects.toThrow(ValidationError);
      
      await expect(
        sessionService.updateSessionStatusPublic('test-id', 'invalid-status')
      ).rejects.toThrow('Invalid status: invalid-status');
    });

    test('should accept all valid statuses', async () => {
      // Arrange
      const validStatuses = ['preparing', 'active', 'paused', 'completed', 'cancelled'];
      const sessionId = 'test-session-id';
      const existingSession = {
        id: sessionId,
        status: 'preparing',
        updatedAt: '2024-01-01T09:00:00.000Z'
      };
      
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act & Assert
      for (const status of validStatuses) {
        await expect(
          sessionService.updateSessionStatusPublic(sessionId, status)
        ).resolves.not.toThrow();
      }
    });

    test('should return null when session not found for status update', async () => {
      // Arrange
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(null);

      // Act
      const result = await sessionService.updateSessionStatusPublic('non-existent-id', 'active');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Chat Message Management', () => {
    test('should add chat message to session', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const existingSession = {
        id: sessionId,
        chatLog: [],
        updatedAt: '2024-01-01T10:00:00.000Z'
      };
      
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      jest.spyOn(sessionService, 'updateSessionData' as any).mockResolvedValue({
        ...existingSession,
        chatLog: [expect.objectContaining({ speaker: 'Player 1', message: 'Hello everyone!' })]
      });

      const messageData = {
        speaker: 'Player 1',
        characterId: 'char-123',
        message: 'Hello everyone!',
        type: 'ic' as const
      };

      // Act
      const result = await sessionService.addChatMessage(sessionId, messageData);

      // Assert
      expect(result).toBeDefined();
      expect(result!.chatLog).toHaveLength(1);
      expect(result!.chatLog[0]).toEqual(expect.objectContaining({
        speaker: 'Player 1',
        message: 'Hello everyone!',
        type: 'ic'
      }));
    });

    test('should throw ValidationError when required message fields are missing', async () => {
      // Act & Assert
      await expect(
        sessionService.addChatMessage('session-id', { speaker: 'Player 1' })
      ).rejects.toThrow(ValidationError);
      
      await expect(
        sessionService.addChatMessage('session-id', { message: 'Hello' })
      ).rejects.toThrow(ValidationError);
      
      await expect(
        sessionService.addChatMessage('session-id', {})
      ).rejects.toThrow('Speaker and message are required');
    });

    test('should return null when session not found for chat message', async () => {
      // Arrange
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(null);

      // Act
      const result = await sessionService.addChatMessage('non-existent-id', {
        speaker: 'Player 1',
        message: 'Hello'
      });

      // Assert
      expect(result).toBeNull();
    });

    test('should broadcast chat message via WebSocket', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const existingSession = {
        id: sessionId,
        chatLog: [],
        updatedAt: '2024-01-01T10:00:00.000Z'
      };
      
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      mockStatement.run.mockReturnValue({ changes: 1 });

      const messageData = {
        speaker: 'Player 1',
        message: 'Hello everyone!'
      };

      // Act
      await sessionService.addChatMessage(sessionId, messageData);

      // Assert
      expect(mockSocketIO.to).toHaveBeenCalledWith(`session-${sessionId}`);
      expect(mockSocketIO.emit).toHaveBeenCalledWith('chat-message', expect.objectContaining({
        sessionId,
        message: expect.objectContaining({
          speaker: 'Player 1',
          message: 'Hello everyone!'
        })
      }));
    });
  });

  describe('Dice Rolling System', () => {
    test('should add dice roll to session', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const existingSession = {
        id: sessionId,
        chatLog: [],
        diceRolls: [],
        updatedAt: '2024-01-01T10:00:00.000Z'
      };
      
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      jest.spyOn(sessionService, 'updateSessionData' as any).mockResolvedValue({
        ...existingSession,
        diceRolls: [expect.objectContaining({ roller: 'Player 1', dice: '1d20+3' })],
        chatLog: [expect.objectContaining({ speaker: 'System' })]
      });

      const diceData = {
        roller: 'Player 1',
        characterId: 'char-123',
        dice: '1d20+3',
        purpose: 'Attack roll',
        target: 15
      };

      // Act
      const result = await sessionService.addDiceRoll(sessionId, diceData);

      // Assert
      expect(result).toBeDefined();
      expect(result!.sessionLog).toContainEqual(expect.objectContaining({
        type: 'dialogue',
        content: expect.stringContaining('System:')
      }));
    });

    test('should calculate dice roll results correctly', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const existingSession = {
        id: sessionId,
        chatLog: [],
        diceRolls: [],
        updatedAt: '2024-01-01T10:00:00.000Z'
      };
      
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      
      // Mock Math.random to return predictable results
      const originalMath = Math.random;
      Math.random = jest.fn()
        .mockReturnValueOnce(0.99) // Roll 20 on d20
        .mockReturnValue(0.5);
      
      jest.spyOn(sessionService, 'updateSessionData' as any).mockResolvedValue(existingSession);

      const diceData = {
        roller: 'Player 1',
        dice: '1d20+5',
        purpose: 'Skill check'
      };

      // Act
      await sessionService.addDiceRoll(sessionId, diceData);

      // Assert
      expect(sessionService.updateSessionData as any).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          diceRolls: expect.arrayContaining([
            expect.objectContaining({
              roller: 'Player 1',
              dice: '1d20+5',
              results: [20],
              total: 25
            })
          ])
        })
      );

      // Restore Math.random
      Math.random = originalMath;
    });

    test('should throw ValidationError for invalid dice format', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const existingSession = { id: sessionId };
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);

      const diceData = {
        roller: 'Player 1',
        dice: 'invalid-dice-format'
      };

      // Act & Assert
      await expect(
        sessionService.addDiceRoll(sessionId, diceData)
      ).rejects.toThrow(ValidationError);
      
      await expect(
        sessionService.addDiceRoll(sessionId, diceData)
      ).rejects.toThrow('Invalid dice format');
    });

    test('should throw ValidationError when required dice fields are missing', async () => {
      // Act & Assert
      await expect(
        sessionService.addDiceRoll('session-id', { roller: 'Player 1' })
      ).rejects.toThrow(ValidationError);
      
      await expect(
        sessionService.addDiceRoll('session-id', { dice: '1d20' })
      ).rejects.toThrow(ValidationError);
      
      await expect(
        sessionService.addDiceRoll('session-id', {})
      ).rejects.toThrow('Roller and dice are required');
    });

    test('should handle dice rolls with target and success calculation', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const existingSession = {
        id: sessionId,
        chatLog: [],
        diceRolls: [],
        updatedAt: '2024-01-01T10:00:00.000Z'
      };
      
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      
      // Mock successful roll
      const originalMath = Math.random;
      Math.random = jest.fn().mockReturnValue(0.99); // Roll 20
      
      jest.spyOn(sessionService, 'updateSessionData' as any).mockResolvedValue(existingSession);

      const diceData = {
        roller: 'Player 1',
        dice: '1d20',
        purpose: 'Saving throw',
        target: 15
      };

      // Act
      await sessionService.addDiceRoll(sessionId, diceData);

      // Assert
      expect(sessionService.updateSessionData as any).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          diceRolls: expect.arrayContaining([
            expect.objectContaining({
              total: 20,
              target: 15,
              success: true
            })
          ])
        })
      );

      // Restore Math.random
      Math.random = originalMath;
    });
  });

  describe('Combat System', () => {
    test('should start combat with initiative order', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const existingSession = {
        id: sessionId,
        mode: 'exploration',
        combat: undefined,
        updatedAt: '2024-01-01T10:00:00.000Z'
      };
      
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      jest.spyOn(sessionService, 'updateSessionData' as any).mockResolvedValue({
        ...existingSession,
        mode: 'combat',
        combat: expect.objectContaining({ active: true })
      });

      const participants = [
        { characterId: 'char-1', initiative: 15 },
        { characterId: 'char-2', initiative: 22 },
        { characterId: 'char-3', initiative: 8 }
      ];

      // Act
      const result = await sessionService.startCombatPublic(sessionId, participants);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        mode: 'combat'
      }));
      expect(sessionService.updateSessionData as any).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          mode: 'combat',
          combat: expect.objectContaining({
            active: true,
            currentTurn: 0,
            round: 1,
            turnOrder: [
              { characterId: 'char-2', initiative: 22, hasActed: false },
              { characterId: 'char-1', initiative: 15, hasActed: false },
              { characterId: 'char-3', initiative: 8, hasActed: false }
            ]
          })
        })
      );
    });

    test('should end combat and return to exploration mode', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const existingSession = {
        id: sessionId,
        mode: 'combat',
        combat: { active: true, round: 3 },
        updatedAt: '2024-01-01T10:00:00.000Z'
      };
      
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      jest.spyOn(sessionService, 'updateSessionData' as any).mockResolvedValue({
        ...existingSession,
        mode: 'exploration',
        combat: undefined
      });

      // Act
      const result = await sessionService.endCombatPublic(sessionId);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        mode: 'exploration'
      }));
      expect(sessionService.updateSessionData as any).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          mode: 'exploration',
          combat: undefined
        })
      );
    });

    test('should return null when session not found for combat operations', async () => {
      // Arrange
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(null);

      // Act
      const startResult = await sessionService.startCombatPublic('non-existent-id', []);
      const endResult = await sessionService.endCombatPublic('non-existent-id');

      // Assert
      expect(startResult).toBeNull();
      expect(endResult).toBeNull();
    });
  });

  describe('Session Companions - NPC Management', () => {
    test('should get session companions from campaign characters', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const campaignId = 'campaign-123';
      const existingSession = {
        id: sessionId,
        campaignId
      };
      
      const mockCharacters = [
        TestDataFactory.createTestCharacter(campaignId, { 
          name: 'Party Helper', 
          type: 'NPC', 
          characterType: 'NPC' 
        }),
        TestDataFactory.createTestCharacter(campaignId, { 
          name: 'Main Character', 
          type: 'PC', 
          characterType: 'PC' 
        }),
        TestDataFactory.createTestCharacter(campaignId, { 
          name: 'Enemy', 
          type: 'Enemy', 
          characterType: 'Enemy' 
        })
      ];
      
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      (getCharacterService as jest.Mock).mockReturnValue({
        getCharactersByCampaign: jest.fn().mockResolvedValue(mockCharacters)
      });

      // Act
      const result = await sessionService.getSessionCompanions(sessionId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Party Helper');
      expect(result[0].characterType).toBe('NPC');
    });

    test('should return empty array when session not found for companions', async () => {
      // Arrange
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(null);

      // Act
      const result = await sessionService.getSessionCompanions('non-existent-id');

      // Assert
      expect(result).toEqual([]);
    });

    test('should handle errors gracefully when getting companions', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      jest.spyOn(sessionService, 'getSessionById' as any).mockRejectedValue(new Error('Database error'));

      // Act
      const result = await sessionService.getSessionCompanions(sessionId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('WebSocket Integration', () => {
    test('should broadcast session updates via WebSocket', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      mockStatement.run.mockReturnValue({ changes: 1 });

      // Act - Call private method through public interface
      const existingSession = {
        id: sessionId,
        status: 'active',
        updatedAt: '2024-01-01T10:00:00.000Z'
      };
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      
      await sessionService.updateSessionStatusPublic(sessionId, 'paused');

      // Assert
      expect(mockSocketIO.to).toHaveBeenCalledWith(`session-${sessionId}`);
      expect(mockSocketIO.emit).toHaveBeenCalledWith('session-updated', expect.objectContaining({
        sessionId,
        timestamp: expect.any(String)
      }));
    });

    test('should handle missing Socket.IO gracefully', async () => {
      // Arrange
      const sessionServiceWithoutIO = getSessionService();
      const sessionId = 'test-session-id';
      mockStatement.run.mockReturnValue({ changes: 1 });

      const existingSession = {
        id: sessionId,
        status: 'active',
        updatedAt: '2024-01-01T10:00:00.000Z'
      };
      jest.spyOn(sessionServiceWithoutIO, 'getSessionById' as any).mockResolvedValue(existingSession);

      // Act - Should not throw when no Socket.IO instance
      await expect(
        sessionServiceWithoutIO.updateSessionStatusPublic(sessionId, 'paused')
      ).resolves.not.toThrow();
    });
  });

  describe('Service Singleton Pattern', () => {
    test('should return same instance from getSessionService', () => {
      // Act
      const instance1 = getSessionService();
      const instance2 = getSessionService();

      // Assert
      expect(instance1).toBe(instance2);
    });
  });

  describe('Data Mapping and Conversion', () => {
    test('should convert SessionState to TRPGSession correctly', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const mockRow = {
        id: sessionId,
        campaign_id: 'campaign-123',
        session_number: 5,
        status: 'active',
        mode: 'combat',
        participants: '["player1","player2"]',
        gamemaster: 'gm-123',
        start_time: '2024-01-01T10:00:00.000Z',
        end_time: null,
        breaks: '[]',
        current_event: '{"id":"event1","type":"encounter"}',
        event_queue: '[]',
        completed_events: '["completed1","completed2"]',
        combat: '{"active":true,"round":2}',
        chat_log: '[{"id":"msg1","timestamp":"2024-01-01T10:30:00.000Z","speaker":"Player 1","message":"Attack!","type":"ic"}]',
        dice_rolls: '[{"id":"roll1","timestamp":"2024-01-01T10:31:00.000Z","roller":"Player 1","dice":"1d20+5","results":[15],"total":20}]',
        notes: '"Important session notes"',
        created_at: '2024-01-01T09:00:00.000Z',
        updated_at: '2024-01-01T10:30:00.000Z'
      };
      mockStatement.get.mockReturnValue(mockRow);

      // Act
      const result = await sessionService.getSessionByIdPublic(sessionId);

      // Assert
      expect(result).toEqual({
        id: sessionId,
        campaignId: 'campaign-123',
        name: 'Session 5',
        description: 'Important session notes',
        status: 'active',
        mode: 'combat',
        scheduledStartTime: '2024-01-01T10:00:00.000Z',
        actualStartTime: '2024-01-01T10:00:00.000Z',
        actualEndTime: null,
        estimatedDuration: 120,
        players: ['player1', 'player2'],
        characterIds: [],
        gameMasterId: 'gm-123',
        notes: 'Important session notes',
        sessionNumber: 5,
        isRecordingEnabled: false,
        currentEventId: 'event1',
        completedEvents: ['completed1', 'completed2'],
        sessionLog: [
          {
            id: 'msg1',
            timestamp: '2024-01-01T10:30:00.000Z',
            type: 'dialogue',
            characterId: undefined,
            content: 'Player 1: Attack!',
            metadata: { type: 'ic', speaker: 'Player 1' }
          }
        ],
        chatLog: [
          {
            id: 'msg1',
            timestamp: '2024-01-01T10:30:00.000Z',
            speaker: 'Player 1',
            message: 'Attack!',
            type: 'ic'
          }
        ]
      });
    });
  });

  describe('Error Handling', () => {
    test('should throw DatabaseError when session retrieval fails', async () => {
      // Arrange
      mockStatement.all.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Act & Assert
      await expect(
        sessionService.getSessionsByCampaignPublic('campaign-id')
      ).rejects.toThrow(DatabaseError);
    });

    test('should throw DatabaseError when session creation fails', async () => {
      // Arrange
      mockStatement.get.mockReturnValue({ max_number: 0 });
      mockStatement.run.mockImplementation(() => {
        throw new Error('Database constraint violation');
      });

      // Act & Assert
      await expect(
        sessionService.createSessionPublic({ campaignId: 'campaign-id' })
      ).rejects.toThrow(DatabaseError);
    });

    test('should throw DatabaseError when session update fails', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const existingSession = {
        id: sessionId,
        status: 'preparing'
      };
      
      jest.spyOn(sessionService, 'getSessionById' as any).mockResolvedValue(existingSession);
      mockStatement.run.mockImplementation(() => {
        throw new Error('Database update failed');
      });

      // Act & Assert
      await expect(
        sessionService.updateSessionStatusPublic(sessionId, 'active')
      ).rejects.toThrow(DatabaseError);
    });
  });
});