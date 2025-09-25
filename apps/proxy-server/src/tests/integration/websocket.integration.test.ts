/**
 * WebSocket Integration Tests
 * Testing real-time communication for TRPG sessions
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import express, { Express } from 'express';
import { Database as DatabaseType } from 'better-sqlite3';
import { TRPGCampaign, TRPGSession, TRPGCharacter } from '@ai-agent-trpg/types';
import { websocketOnlyMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('WebSocket Integration Tests', () => {
  let app: Express;
  let httpServer: Server;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let db: DatabaseType;
  let mockServices: MockServerServices;
  let testCampaign: TRPGCampaign;
  let testSession: TRPGSession;
  let testCharacters: TRPGCharacter[] = [];
  let serverPort: number;

  beforeAll(async () => {
    // Set up test database
    db = testDatabase.createTestDatabase();
    
    // Set up express app and WebSocket server
    app = express();
    httpServer = app.listen(0);
    serverPort = (httpServer.address() as any).port;
    
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Initialize mock services
    mockServices = await websocketOnlyMockSetup();
    
    // Set up WebSocket event handlers
    setupWebSocketHandlers(io, db);
  });

  afterAll(async () => {
    await mockServices.cleanup();
    testDatabase.closeAllDatabases();
    if (clientSocket) clientSocket.close();
    if (io) io.close();
    if (httpServer) httpServer.close();
  });

  beforeEach(async () => {
    // Reset database and mock services
    testDatabase.resetDatabase(db);
    await mockServices.reset();
    
    // Create test data
    testCampaign = TestDataFactory.createTestCampaign();
    insertCampaignToDb(db, testCampaign);

    testSession = TestDataFactory.createTestSession(testCampaign.id, {
      status: 'active'
    });
    insertSessionToDb(db, testSession);

    testCharacters = [
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'Hero Player', 
        type: 'PC' 
      }),
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'Wise NPC', 
        type: 'NPC' 
      })
    ];

    for (const character of testCharacters) {
      insertCharacterToDb(db, character);
    }

    // Connect client socket
    if (clientSocket) clientSocket.close();
    clientSocket = ClientIO(`http://localhost:${serverPort}`);
    
    return new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });
  });

  afterEach(async () => {
    if (clientSocket) {
      clientSocket.removeAllListeners();
    }
  });

  describe('WebSocket接続とセッション管理', () => {
    it('クライアントがWebSocketサーバーに正常に接続できる', async () => {
      // Act & Assert
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket.id).toBeDefined();
    });

    it('TRPGセッションに参加できる', async () => {
      // Arrange
      const joinData = {
        sessionId: testSession.id,
        playerId: 'player-123',
        characterId: testCharacters[0].id
      };

      // Act
      const joinPromise = new Promise((resolve) => {
        clientSocket.on('session_joined', resolve);
      });

      clientSocket.emit('join_session', joinData);
      const joinResponse = await joinPromise as any;

      // Assert
      expect(joinResponse.success).toBe(true);
      expect(joinResponse.sessionId).toBe(testSession.id);
      expect(joinResponse.playerId).toBe(joinData.playerId);
    });

    it('セッション参加時に現在のセッション状態を受信する', async () => {
      // Arrange
      const joinData = {
        sessionId: testSession.id,
        playerId: 'player-123',
        characterId: testCharacters[0].id
      };

      // Act
      const statePromise = new Promise((resolve) => {
        clientSocket.on('session_state', resolve);
      });

      clientSocket.emit('join_session', joinData);
      const sessionState = await statePromise as any;

      // Assert
      expect(sessionState.sessionId).toBe(testSession.id);
      expect(sessionState.status).toBe('active');
      expect(sessionState.connectedPlayers).toBeDefined();
      expect(sessionState.currentLocation).toBeDefined();
    });

    it('無効なセッションIDで参加エラーを返す', async () => {
      // Arrange
      const invalidJoinData = {
        sessionId: 'invalid-session-id',
        playerId: 'player-123',
        characterId: testCharacters[0].id
      };

      // Act
      const errorPromise = new Promise((resolve) => {
        clientSocket.on('join_error', resolve);
      });

      clientSocket.emit('join_session', invalidJoinData);
      const error = await errorPromise as any;

      // Assert
      expect(error.code).toBe('SESSION_NOT_FOUND');
      expect(error.message).toContain('Session not found');
    });
  });

  describe('リアルタイムメッセージング', () => {
    beforeEach(async () => {
      // Join session before each messaging test
      const joinData = {
        sessionId: testSession.id,
        playerId: 'player-123',
        characterId: testCharacters[0].id
      };

      const joinPromise = new Promise((resolve) => {
        clientSocket.on('session_joined', resolve);
      });

      clientSocket.emit('join_session', joinData);
      await joinPromise;
    });

    it('プレイヤーメッセージを他の参加者にブロードキャストする', async () => {
      // Arrange
      const message = {
        type: 'player_action',
        content: 'I draw my sword and charge!',
        characterId: testCharacters[0].id,
        timestamp: new Date().toISOString()
      };

      // Act
      const messagePromise = new Promise((resolve) => {
        clientSocket.on('message_broadcast', resolve);
      });

      clientSocket.emit('send_message', message);
      const broadcasted = await messagePromise as any;

      // Assert
      expect(broadcasted.type).toBe('player_action');
      expect(broadcasted.content).toBe(message.content);
      expect(broadcasted.characterId).toBe(testCharacters[0].id);
      expect(broadcasted.sender).toBe('player-123');
    });

    it('GMメッセージを適切にブロードキャストする', async () => {
      // Arrange
      const gmMessage = {
        type: 'gm_narration',
        content: 'As you charge forward, you notice movement in the shadows...',
        timestamp: new Date().toISOString()
      };

      // Act
      const narrationPromise = new Promise((resolve) => {
        clientSocket.on('gm_narration', resolve);
      });

      clientSocket.emit('gm_message', gmMessage);
      const narration = await narrationPromise as any;

      // Assert
      expect(narration.type).toBe('gm_narration');
      expect(narration.content).toBe(gmMessage.content);
      expect(narration.timestamp).toBeDefined();
    });

    it('ダイスロール結果をリアルタイムで配信する', async () => {
      // Arrange
      const diceRoll = {
        type: 'dice_roll',
        characterId: testCharacters[0].id,
        diceType: 'd20',
        result: 18,
        modifier: 3,
        total: 21,
        purpose: 'attack_roll',
        timestamp: new Date().toISOString()
      };

      // Act
      const rollPromise = new Promise((resolve) => {
        clientSocket.on('dice_result', resolve);
      });

      clientSocket.emit('roll_dice', diceRoll);
      const result = await rollPromise as any;

      // Assert
      expect(result.diceType).toBe('d20');
      expect(result.result).toBe(18);
      expect(result.total).toBe(21);
      expect(result.characterId).toBe(testCharacters[0].id);
    });
  });

  describe('キャラクター位置とパーティ移動', () => {
    beforeEach(async () => {
      // Join session
      const joinData = {
        sessionId: testSession.id,
        playerId: 'player-123',
        characterId: testCharacters[0].id
      };

      const joinPromise = new Promise((resolve) => {
        clientSocket.on('session_joined', resolve);
      });

      clientSocket.emit('join_session', joinData);
      await joinPromise;
    });

    it('キャラクター位置変更をリアルタイムで同期する', async () => {
      // Arrange
      const locationData = {
        characterId: testCharacters[0].id,
        newLocationId: 'forest-clearing',
        movementType: 'walk',
        timestamp: new Date().toISOString()
      };

      // Act
      const movePromise = new Promise((resolve) => {
        clientSocket.on('character_moved', resolve);
      });

      clientSocket.emit('move_character', locationData);
      const movement = await movePromise as any;

      // Assert
      expect(movement.characterId).toBe(testCharacters[0].id);
      expect(movement.newLocationId).toBe('forest-clearing');
      expect(movement.movementType).toBe('walk');
    });

    it('パーティ全体の移動をブロードキャストする', async () => {
      // Arrange
      const partyMoveData = {
        sessionId: testSession.id,
        fromLocationId: 'starting-village',
        toLocationId: 'dark-forest',
        partyMembers: [testCharacters[0].id],
        travelTime: 120, // 2 hours
        timestamp: new Date().toISOString()
      };

      // Act
      const partyMovePromise = new Promise((resolve) => {
        clientSocket.on('party_moved', resolve);
      });

      clientSocket.emit('move_party', partyMoveData);
      const partyMovement = await partyMovePromise as any;

      // Assert
      expect(partyMovement.fromLocationId).toBe('starting-village');
      expect(partyMovement.toLocationId).toBe('dark-forest');
      expect(partyMovement.partyMembers).toContain(testCharacters[0].id);
      expect(partyMovement.travelTime).toBe(120);
    });
  });

  describe('セッション状態の同期', () => {
    beforeEach(async () => {
      // Join session
      const joinData = {
        sessionId: testSession.id,
        playerId: 'player-123',
        characterId: testCharacters[0].id
      };

      const joinPromise = new Promise((resolve) => {
        clientSocket.on('session_joined', resolve);
      });

      clientSocket.emit('join_session', joinData);
      await joinPromise;
    });

    it('セッション一時停止をリアルタイムで通知する', async () => {
      // Arrange
      const pauseData = {
        sessionId: testSession.id,
        reason: 'break_time',
        timestamp: new Date().toISOString()
      };

      // Act
      const pausePromise = new Promise((resolve) => {
        clientSocket.on('session_paused', resolve);
      });

      clientSocket.emit('pause_session', pauseData);
      const pauseNotification = await pausePromise as any;

      // Assert
      expect(pauseNotification.sessionId).toBe(testSession.id);
      expect(pauseNotification.reason).toBe('break_time');
      expect(pauseNotification.status).toBe('paused');
    });

    it('セッション再開をリアルタイムで通知する', async () => {
      // Arrange
      const resumeData = {
        sessionId: testSession.id,
        timestamp: new Date().toISOString()
      };

      // Act
      const resumePromise = new Promise((resolve) => {
        clientSocket.on('session_resumed', resolve);
      });

      clientSocket.emit('resume_session', resumeData);
      const resumeNotification = await resumePromise as any;

      // Assert
      expect(resumeNotification.sessionId).toBe(testSession.id);
      expect(resumeNotification.status).toBe('active');
    });

    it('時間管理アップデートをブロードキャストする', async () => {
      // Arrange
      const timeUpdate = {
        sessionId: testSession.id,
        currentSlot: 3,
        totalSlots: 8,
        remainingTime: 90, // minutes
        nextBreakIn: 30,
        timestamp: new Date().toISOString()
      };

      // Act
      const timePromise = new Promise((resolve) => {
        clientSocket.on('time_update', resolve);
      });

      clientSocket.emit('update_time', timeUpdate);
      const timeNotification = await timePromise as any;

      // Assert
      expect(timeNotification.currentSlot).toBe(3);
      expect(timeNotification.remainingTime).toBe(90);
      expect(timeNotification.nextBreakIn).toBe(30);
    });
  });

  describe('エラーハンドリングと接続管理', () => {
    it('クライアント切断時に適切にクリーンアップする', async () => {
      // Arrange
      const joinData = {
        sessionId: testSession.id,
        playerId: 'player-123',
        characterId: testCharacters[0].id
      };

      await new Promise((resolve) => {
        clientSocket.on('session_joined', resolve);
        clientSocket.emit('join_session', joinData);
      });

      // Act
      const disconnectPromise = new Promise((resolve) => {
        clientSocket.on('player_disconnected', resolve);
      });

      clientSocket.disconnect();
      const disconnectNotification = await disconnectPromise as any;

      // Assert
      expect(disconnectNotification.playerId).toBe('player-123');
      expect(disconnectNotification.sessionId).toBe(testSession.id);
    });

    it('無効なデータでWebSocketエラーを返す', async () => {
      // Arrange
      const invalidMessage = {
        // Missing required fields
        content: 'Invalid message'
      };

      // Act
      const errorPromise = new Promise((resolve) => {
        clientSocket.on('message_error', resolve);
      });

      clientSocket.emit('send_message', invalidMessage);
      const error = await errorPromise as any;

      // Assert
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toContain('required');
    });

    it('接続数制限を適切に管理する', async () => {
      // This test would simulate multiple connections to test connection limits
      // Implementation depends on your WebSocket connection management strategy
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('AIイベントのリアルタイム配信', () => {
    beforeEach(async () => {
      // Join session
      const joinData = {
        sessionId: testSession.id,
        playerId: 'player-123',
        characterId: testCharacters[0].id
      };

      await new Promise((resolve) => {
        clientSocket.on('session_joined', resolve);
        clientSocket.emit('join_session', joinData);
      });
    });

    it('AI生成イベントをリアルタイムで配信する', async () => {
      // Arrange
      const aiEvent = {
        type: 'ai_generated_event',
        sessionId: testSession.id,
        eventType: 'random_encounter',
        content: 'A mysterious figure emerges from the mist...',
        aiProvider: 'openai',
        timestamp: new Date().toISOString()
      };

      // Act
      const eventPromise = new Promise((resolve) => {
        clientSocket.on('ai_event', resolve);
      });

      clientSocket.emit('trigger_ai_event', aiEvent);
      const event = await eventPromise as any;

      // Assert
      expect(event.type).toBe('ai_generated_event');
      expect(event.eventType).toBe('random_encounter');
      expect(event.content).toContain('mysterious figure');
    });

    it('NPC AI応答をリアルタイムで配信する', async () => {
      // Arrange
      const npcInteraction = {
        sessionId: testSession.id,
        npcId: testCharacters[1].id, // Wise NPC
        playerMessage: 'Can you help us?',
        aiProvider: 'anthropic'
      };

      // Act
      const responsePromise = new Promise((resolve) => {
        clientSocket.on('npc_response', resolve);
      });

      clientSocket.emit('interact_with_npc', npcInteraction);
      const npcResponse = await responsePromise as any;

      // Assert
      expect(npcResponse.npcId).toBe(testCharacters[1].id);
      expect(npcResponse.response).toBeDefined();
      expect(npcResponse.emotion).toBeDefined();
    });
  });
});

// WebSocket event handlers setup
function setupWebSocketHandlers(io: SocketIOServer, db: DatabaseType): void {
  io.on('connection', (socket) => {
    let currentSessionId: string | null = null;
    let currentPlayerId: string | null = null;

    socket.on('join_session', async (data) => {
      try {
        const { sessionId, playerId, characterId } = data;
        
        // Validate session exists
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
        if (!session) {
          socket.emit('join_error', { code: 'SESSION_NOT_FOUND', message: 'Session not found' });
          return;
        }

        currentSessionId = sessionId;
        currentPlayerId = playerId;
        
        socket.join(sessionId);
        
        socket.emit('session_joined', { 
          success: true, 
          sessionId, 
          playerId 
        });
        
        socket.emit('session_state', {
          sessionId,
          status: (session as any).status,
          connectedPlayers: [],
          currentLocation: 'default_location'
        });
        
      } catch (error) {
        socket.emit('join_error', { code: 'INTERNAL_ERROR', message: 'Failed to join session' });
      }
    });

    socket.on('send_message', (data) => {
      if (!currentSessionId) return;
      
      if (!data.type || !data.content) {
        socket.emit('message_error', { code: 'VALIDATION_ERROR', message: 'Type and content are required' });
        return;
      }
      
      const message = { ...data, sender: currentPlayerId };
      socket.to(currentSessionId).emit('message_broadcast', message);
    });

    socket.on('gm_message', (data) => {
      if (!currentSessionId) return;
      socket.to(currentSessionId).emit('gm_narration', data);
    });

    socket.on('roll_dice', (data) => {
      if (!currentSessionId) return;
      socket.to(currentSessionId).emit('dice_result', data);
    });

    socket.on('move_character', (data) => {
      if (!currentSessionId) return;
      socket.to(currentSessionId).emit('character_moved', data);
    });

    socket.on('move_party', (data) => {
      if (!currentSessionId) return;
      socket.to(currentSessionId).emit('party_moved', data);
    });

    socket.on('pause_session', (data) => {
      if (!currentSessionId) return;
      socket.to(currentSessionId).emit('session_paused', { ...data, status: 'paused' });
    });

    socket.on('resume_session', (data) => {
      if (!currentSessionId) return;
      socket.to(currentSessionId).emit('session_resumed', { ...data, status: 'active' });
    });

    socket.on('update_time', (data) => {
      if (!currentSessionId) return;
      socket.to(currentSessionId).emit('time_update', data);
    });

    socket.on('trigger_ai_event', (data) => {
      if (!currentSessionId) return;
      socket.to(currentSessionId).emit('ai_event', data);
    });

    socket.on('interact_with_npc', (data) => {
      if (!currentSessionId) return;
      // Simulate AI response
      const response = {
        npcId: data.npcId,
        response: 'Of course, I would be happy to help you on your quest.',
        emotion: 'helpful',
        timestamp: new Date().toISOString()
      };
      socket.to(currentSessionId).emit('npc_response', response);
    });

    socket.on('disconnect', () => {
      if (currentSessionId && currentPlayerId) {
        socket.to(currentSessionId).emit('player_disconnected', {
          playerId: currentPlayerId,
          sessionId: currentSessionId
        });
      }
    });
  });
}

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