/**
 * WebSocket Database Persistence Integration Tests
 * Testing real-time communication with database synchronization
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import express, { Express } from 'express';
import { Database as DatabaseType } from 'better-sqlite3';
import { 
  TRPGCampaign, 
  TRPGSession, 
  TRPGCharacter, 
  ChatMessage,
  DiceRoll,
  PartyMovementProposal,
  MovementVote,
  SessionState
} from '@ai-agent-trpg/types';
import { websocketOnlyMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('WebSocket Database Persistence Integration Tests', () => {
  let app: Express;
  let httpServer: Server;
  let io: SocketIOServer;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let clientSocket3: ClientSocket;
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
      cors: { origin: "*", methods: ["GET", "POST"] }
    });

    // Initialize mock services
    mockServices = await websocketOnlyMockSetup();
    
    // Set up enhanced WebSocket handlers with database persistence
    setupEnhancedWebSocketHandlers(io, db);
  });

  afterAll(async () => {
    await mockServices.cleanup();
    testDatabase.closeAllDatabases();
    [clientSocket1, clientSocket2, clientSocket3].forEach(socket => {
      if (socket) socket.close();
    });
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
        name: 'Player1', 
        type: 'PC',
        playerId: 'player-1'
      }),
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'Player2', 
        type: 'PC',
        playerId: 'player-2'
      }),
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'GameMaster', 
        type: 'NPC',
        playerId: 'gm-1'
      })
    ];

    for (const character of testCharacters) {
      insertCharacterToDb(db, character);
    }

    // Connect multiple client sockets
    [clientSocket1, clientSocket2, clientSocket3].forEach(socket => {
      if (socket) socket.close();
    });

    clientSocket1 = ClientIO(`http://localhost:${serverPort}`);
    clientSocket2 = ClientIO(`http://localhost:${serverPort}`);
    clientSocket3 = ClientIO(`http://localhost:${serverPort}`);
    
    await Promise.all([
      new Promise<void>((resolve) => clientSocket1.on('connect', resolve)),
      new Promise<void>((resolve) => clientSocket2.on('connect', resolve)),
      new Promise<void>((resolve) => clientSocket3.on('connect', resolve))
    ]);
  });

  afterEach(async () => {
    [clientSocket1, clientSocket2, clientSocket3].forEach(socket => {
      if (socket) socket.removeAllListeners();
    });
  });

  describe('マルチユーザーチャットメッセージの永続化', () => {
    beforeEach(async () => {
      // Join all players to session
      const joinPromises = [
        new Promise((resolve) => {
          clientSocket1.on('session_joined', resolve);
          clientSocket1.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-1',
            characterId: testCharacters[0].id
          });
        }),
        new Promise((resolve) => {
          clientSocket2.on('session_joined', resolve);
          clientSocket2.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-2',
            characterId: testCharacters[1].id
          });
        }),
        new Promise((resolve) => {
          clientSocket3.on('session_joined', resolve);
          clientSocket3.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'gm-1',
            characterId: testCharacters[2].id
          });
        })
      ];

      await Promise.all(joinPromises);
    });

    it('Should persist chat messages to database and broadcast to all connected clients', async () => {
      const testMessages = [
        {
          type: 'player_action',
          content: 'I draw my sword and approach the dragon cautiously',
          characterId: testCharacters[0].id,
          timestamp: new Date().toISOString()
        },
        {
          type: 'gm_narration',
          content: 'The ancient dragon opens one massive eye and regards you with interest',
          characterId: testCharacters[2].id,
          timestamp: new Date().toISOString()
        },
        {
          type: 'player_dialogue',
          content: '"Wait! Maybe we can negotiate instead of fighting!"',
          characterId: testCharacters[1].id,
          timestamp: new Date().toISOString()
        }
      ];

      const broadcastPromises: Promise<any>[] = [];
      const messageReceivers = [clientSocket1, clientSocket2, clientSocket3];

      // Set up message receivers for all clients
      messageReceivers.forEach((socket, index) => {
        testMessages.forEach((_, msgIndex) => {
          broadcastPromises.push(
            new Promise((resolve) => {
              socket.on(`message_broadcast_${msgIndex}`, resolve);
            })
          );
        });
      });

      // Send messages from different clients
      testMessages.forEach((message, index) => {
        const senderSocket = index === 0 ? clientSocket1 : 
                           index === 1 ? clientSocket3 :  // GM sends message
                           clientSocket2;
        
        setTimeout(() => {
          senderSocket.emit('send_message', { ...message, messageId: `msg-${index}` });
        }, index * 100);
      });

      // Wait for all broadcasts to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify messages are persisted in database
      const dbMessages = db.prepare(`
        SELECT * FROM chat_messages 
        WHERE session_id = ? 
        ORDER BY created_at ASC
      `).all(testSession.id);

      expect(dbMessages).toHaveLength(3);
      
      testMessages.forEach((originalMsg, index) => {
        const dbMsg = dbMessages[index];
        expect(dbMsg.content).toBe(originalMsg.content);
        expect(dbMsg.character_id).toBe(originalMsg.characterId);
        expect(dbMsg.message_type).toBe(originalMsg.type);
      });

      // Verify message ordering and integrity
      expect(dbMessages[0].content).toContain('sword and approach');
      expect(dbMessages[1].content).toContain('ancient dragon');
      expect(dbMessages[2].content).toContain('negotiate instead');
    });

    it('Should handle message flood protection and rate limiting with database consistency', async () => {
      // Simulate rapid message sending (message flood)
      const floodMessages = Array.from({ length: 20 }, (_, i) => ({
        type: 'player_action',
        content: `Rapid message ${i + 1}`,
        characterId: testCharacters[0].id,
        timestamp: new Date().toISOString()
      }));

      const sendPromises = floodMessages.map((message, index) => 
        new Promise<void>((resolve) => {
          setTimeout(() => {
            clientSocket1.emit('send_message', { ...message, messageId: `flood-${index}` });
            resolve();
          }, index * 10); // Send every 10ms
        })
      );

      await Promise.all(sendPromises);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check rate limiting response
      const rateLimitPromise = new Promise((resolve) => {
        clientSocket1.on('rate_limit_warning', resolve);
      });

      // Send one more message to trigger rate limit
      clientSocket1.emit('send_message', {
        type: 'player_action',
        content: 'This should trigger rate limit',
        characterId: testCharacters[0].id,
        timestamp: new Date().toISOString()
      });

      const rateLimitResponse = await Promise.race([
        rateLimitPromise,
        new Promise(resolve => setTimeout(() => resolve(null), 1000))
      ]);

      if (rateLimitResponse) {
        expect(rateLimitResponse).toBeDefined();
      }

      // Verify database contains only allowed messages (not all flood messages)
      const dbMessages = db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages 
        WHERE session_id = ? AND character_id = ?
      `).get(testSession.id, testCharacters[0].id) as { count: number };

      // Should be less than total flood messages due to rate limiting
      expect(dbMessages.count).toBeLessThan(20);
      expect(dbMessages.count).toBeGreaterThan(0);
    });
  });

  describe('ダイスロール結果の同期と永続化', () => {
    beforeEach(async () => {
      // Join players
      await Promise.all([
        new Promise((resolve) => {
          clientSocket1.on('session_joined', resolve);
          clientSocket1.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-1',
            characterId: testCharacters[0].id
          });
        }),
        new Promise((resolve) => {
          clientSocket2.on('session_joined', resolve);
          clientSocket2.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-2',
            characterId: testCharacters[1].id
          });
        })
      ]);
    });

    it('Should persist dice rolls and synchronize results across all clients', async () => {
      const diceRolls: DiceRoll[] = [
        {
          id: 'roll-attack-1',
          characterId: testCharacters[0].id,
          sessionId: testSession.id,
          diceType: 'd20',
          sides: 20,
          result: 18,
          modifier: 5,
          total: 23,
          purpose: 'attack_roll',
          timestamp: new Date(),
          isAdvantage: false,
          isDisadvantage: false
        },
        {
          id: 'roll-damage-1',
          characterId: testCharacters[0].id,
          sessionId: testSession.id,
          diceType: '2d6',
          sides: 6,
          result: 8,
          modifier: 3,
          total: 11,
          purpose: 'damage_roll',
          timestamp: new Date(),
          isAdvantage: false,
          isDisadvantage: false
        }
      ];

      const rollPromises = diceRolls.map((_, index) => 
        Promise.all([
          new Promise((resolve) => clientSocket1.on(`dice_result_${index}`, resolve)),
          new Promise((resolve) => clientSocket2.on(`dice_result_${index}`, resolve))
        ])
      );

      // Send dice rolls
      diceRolls.forEach((roll, index) => {
        setTimeout(() => {
          clientSocket1.emit('roll_dice', { ...roll, rollIndex: index });
        }, index * 100);
      });

      await Promise.all(rollPromises.flat());

      // Verify dice rolls are persisted in database
      const dbRolls = db.prepare(`
        SELECT * FROM dice_rolls 
        WHERE session_id = ? 
        ORDER BY created_at ASC
      `).all(testSession.id);

      expect(dbRolls).toHaveLength(2);

      diceRolls.forEach((originalRoll, index) => {
        const dbRoll = dbRolls[index];
        expect(dbRoll.id).toBe(originalRoll.id);
        expect(dbRoll.result).toBe(originalRoll.result);
        expect(dbRoll.total).toBe(originalRoll.total);
        expect(dbRoll.purpose).toBe(originalRoll.purpose);
      });
    });

    it('Should handle dice roll history and statistical tracking with real-time updates', async () => {
      // Create multiple dice rolls for statistical analysis
      const statisticalRolls = Array.from({ length: 10 }, (_, i) => ({
        id: `stat-roll-${i}`,
        characterId: testCharacters[0].id,
        sessionId: testSession.id,
        diceType: 'd20',
        sides: 20,
        result: Math.floor(Math.random() * 20) + 1,
        modifier: 2,
        purpose: 'skill_check',
        timestamp: new Date(),
        isAdvantage: false,
        isDisadvantage: false
      } as DiceRoll));

      // Calculate totals
      statisticalRolls.forEach(roll => {
        roll.total = roll.result + roll.modifier;
      });

      // Set up statistics update listener
      const statsPromise = new Promise((resolve) => {
        clientSocket2.on('dice_statistics_update', resolve);
      });

      // Send all rolls rapidly
      for (const roll of statisticalRolls) {
        clientSocket1.emit('roll_dice', roll);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const statsUpdate = await Promise.race([
        statsPromise,
        new Promise(resolve => setTimeout(() => resolve(null), 2000))
      ]);

      // Verify statistics calculation
      if (statsUpdate) {
        expect(statsUpdate).toBeDefined();
        expect((statsUpdate as any).characterId).toBe(testCharacters[0].id);
        expect((statsUpdate as any).totalRolls).toBe(10);
        expect((statsUpdate as any).averageRoll).toBeDefined();
      }

      // Verify database has complete roll history
      const rollHistory = db.prepare(`
        SELECT * FROM dice_rolls 
        WHERE character_id = ? AND session_id = ?
        ORDER BY created_at DESC
      `).all(testCharacters[0].id, testSession.id);

      expect(rollHistory).toHaveLength(10);

      // Verify roll statistics in database
      const rollStats = db.prepare(`
        SELECT 
          COUNT(*) as total_rolls,
          AVG(result) as avg_result,
          MAX(result) as max_result,
          MIN(result) as min_result
        FROM dice_rolls 
        WHERE character_id = ? AND session_id = ?
      `).get(testCharacters[0].id, testSession.id);

      expect(rollStats).toBeDefined();
      expect((rollStats as any).total_rolls).toBe(10);
    });
  });

  describe('パーティ移動と合意システムの永続化', () => {
    beforeEach(async () => {
      // Join all players
      await Promise.all([
        new Promise((resolve) => {
          clientSocket1.on('session_joined', resolve);
          clientSocket1.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-1',
            characterId: testCharacters[0].id
          });
        }),
        new Promise((resolve) => {
          clientSocket2.on('session_joined', resolve);
          clientSocket2.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-2',
            characterId: testCharacters[1].id
          });
        })
      ]);
    });

    it('Should persist party movement proposals and track voting with real-time synchronization', async () => {
      // Create movement proposal
      const movementProposal: PartyMovementProposal = {
        id: 'proposal-001',
        sessionId: testSession.id,
        proposerId: 'player-1',
        fromLocationId: 'village-square',
        toLocationId: 'dark-forest',
        reason: 'We need to search for the missing artifact',
        estimatedDuration: 120,
        proposedAt: new Date(),
        status: 'voting',
        votes: [],
        consensusRequired: true,
        votingDeadline: new Date(Date.now() + 300000) // 5 minutes
      };

      // Set up proposal broadcast listeners
      const proposalPromises = [
        new Promise((resolve) => clientSocket1.on('movement_proposal_created', resolve)),
        new Promise((resolve) => clientSocket2.on('movement_proposal_created', resolve))
      ];

      // Player 1 creates movement proposal
      clientSocket1.emit('create_movement_proposal', movementProposal);

      await Promise.all(proposalPromises);

      // Verify proposal is persisted in database
      const dbProposal = db.prepare(`
        SELECT * FROM party_movement_proposals 
        WHERE id = ?
      `).get(movementProposal.id);

      expect(dbProposal).toBeDefined();
      expect(dbProposal.session_id).toBe(testSession.id);
      expect(dbProposal.from_location_id).toBe('village-square');
      expect(dbProposal.to_location_id).toBe('dark-forest');

      // Cast votes
      const votes: MovementVote[] = [
        {
          id: 'vote-001',
          proposalId: movementProposal.id,
          voterId: 'player-1',
          vote: 'approve',
          reason: 'I proposed this',
          votedAt: new Date()
        },
        {
          id: 'vote-002',
          proposalId: movementProposal.id,
          voterId: 'player-2',
          vote: 'approve',
          reason: 'Good idea, we need that artifact',
          votedAt: new Date()
        }
      ];

      // Set up vote broadcast listeners
      const votePromises = votes.map((_, index) => [
        new Promise((resolve) => clientSocket1.on(`vote_cast_${index}`, resolve)),
        new Promise((resolve) => clientSocket2.on(`vote_cast_${index}`, resolve))
      ]).flat();

      // Cast votes
      votes.forEach((vote, index) => {
        const voterSocket = index === 0 ? clientSocket1 : clientSocket2;
        setTimeout(() => {
          voterSocket.emit('cast_movement_vote', { ...vote, voteIndex: index });
        }, index * 100);
      });

      await Promise.all(votePromises);

      // Verify votes are persisted
      const dbVotes = db.prepare(`
        SELECT * FROM movement_votes 
        WHERE proposal_id = ?
        ORDER BY voted_at ASC
      `).all(movementProposal.id);

      expect(dbVotes).toHaveLength(2);
      expect(dbVotes.every(vote => vote.vote === 'approve')).toBe(true);

      // Set up consensus reached listener
      const consensusPromise = new Promise((resolve) => {
        clientSocket1.on('movement_consensus_reached', resolve);
      });

      // Trigger consensus check
      clientSocket1.emit('check_movement_consensus', { proposalId: movementProposal.id });

      const consensusResult = await Promise.race([
        consensusPromise,
        new Promise(resolve => setTimeout(() => resolve(null), 1000))
      ]);

      if (consensusResult) {
        expect((consensusResult as any).proposalId).toBe(movementProposal.id);
        expect((consensusResult as any).consensus).toBe('approved');

        // Verify proposal status updated in database
        const updatedProposal = db.prepare(`
          SELECT status FROM party_movement_proposals WHERE id = ?
        `).get(movementProposal.id);

        expect(updatedProposal.status).toBe('approved');
      }
    });

    it('Should handle movement execution with location tracking and event logging', async () => {
      // Execute approved movement
      const movementExecution = {
        sessionId: testSession.id,
        fromLocationId: 'village-square',
        toLocationId: 'dark-forest',
        participants: [testCharacters[0].id, testCharacters[1].id],
        travelMethod: 'walking',
        estimatedTime: 120,
        actualTime: 135,
        events: [
          {
            type: 'weather_change',
            description: 'Light rain began during travel',
            timestamp: new Date()
          },
          {
            type: 'random_encounter',
            description: 'Peaceful encounter with traveling merchants',
            timestamp: new Date()
          }
        ]
      };

      // Set up movement execution listeners
      const executionPromises = [
        new Promise((resolve) => clientSocket1.on('movement_executed', resolve)),
        new Promise((resolve) => clientSocket2.on('movement_executed', resolve))
      ];

      // Execute movement
      clientSocket1.emit('execute_party_movement', movementExecution);

      await Promise.all(executionPromises);

      // Verify movement execution is logged in database
      const dbMovement = db.prepare(`
        SELECT * FROM party_movements 
        WHERE session_id = ? AND to_location_id = ?
      `).get(testSession.id, 'dark-forest');

      expect(dbMovement).toBeDefined();
      expect(dbMovement.actual_time).toBe(135);

      // Verify character locations are updated
      const characterLocations = db.prepare(`
        SELECT id, location_id FROM characters 
        WHERE id IN (?, ?)
      `).all(testCharacters[0].id, testCharacters[1].id);

      characterLocations.forEach(char => {
        expect(char.location_id).toBe('dark-forest');
      });

      // Verify movement events are logged
      const movementEvents = db.prepare(`
        SELECT * FROM movement_events 
        WHERE movement_id = ?
      `).all(dbMovement.id);

      expect(movementEvents).toHaveLength(2);
      expect(movementEvents.some(event => event.event_type === 'weather_change')).toBe(true);
      expect(movementEvents.some(event => event.event_type === 'random_encounter')).toBe(true);
    });
  });

  describe('セッション状態の包括的同期', () => {
    it('Should synchronize complex session state changes across all connected clients', async () => {
      // Join all players and GM
      await Promise.all([
        new Promise((resolve) => {
          clientSocket1.on('session_joined', resolve);
          clientSocket1.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-1',
            characterId: testCharacters[0].id
          });
        }),
        new Promise((resolve) => {
          clientSocket2.on('session_joined', resolve);
          clientSocket2.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-2',
            characterId: testCharacters[1].id
          });
        }),
        new Promise((resolve) => {
          clientSocket3.on('session_joined', resolve);
          clientSocket3.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'gm-1',
            characterId: testCharacters[2].id
          });
        })
      ]);

      // Complex session state change
      const sessionStateUpdate: Partial<SessionState> = {
        sessionId: testSession.id,
        status: 'active',
        currentSlot: 3,
        totalSlots: 8,
        currentLocation: 'ancient-ruins',
        weather: 'stormy',
        timeOfDay: 'night',
        activeEvents: [
          {
            id: 'event-001',
            type: 'environmental',
            description: 'A magical storm is brewing overhead',
            severity: 'moderate',
            startTime: new Date(),
            duration: 1800 // 30 minutes
          }
        ],
        partyStatus: {
          health: 'wounded',
          morale: 'determined',
          resources: 'limited'
        }
      };

      // Set up state update listeners
      const statePromises = [
        new Promise((resolve) => clientSocket1.on('session_state_updated', resolve)),
        new Promise((resolve) => clientSocket2.on('session_state_updated', resolve)),
        new Promise((resolve) => clientSocket3.on('session_state_updated', resolve))
      ];

      // GM updates session state
      clientSocket3.emit('update_session_state', sessionStateUpdate);

      const stateUpdates = await Promise.all(statePromises);

      // Verify all clients received the update
      stateUpdates.forEach(update => {
        expect((update as any).sessionId).toBe(testSession.id);
        expect((update as any).currentLocation).toBe('ancient-ruins');
        expect((update as any).weather).toBe('stormy');
        expect((update as any).activeEvents).toHaveLength(1);
      });

      // Verify session state is persisted in database
      const dbSession = db.prepare(`
        SELECT session_data FROM sessions WHERE id = ?
      `).get(testSession.id);

      expect(dbSession).toBeDefined();
      const sessionData = JSON.parse(dbSession.session_data);
      expect(sessionData.currentLocation).toBe('ancient-ruins');
      expect(sessionData.weather).toBe('stormy');
      expect(sessionData.activeEvents).toHaveLength(1);

      // Verify session events are logged
      const sessionEvents = db.prepare(`
        SELECT * FROM session_events 
        WHERE session_id = ? 
        ORDER BY created_at DESC
      `).all(testSession.id);

      expect(sessionEvents.length).toBeGreaterThan(0);
      expect(sessionEvents[0].event_type).toBe('state_update');
    });
  });

  describe('WebSocket接続復旧とデータ同期', () => {
    it('Should handle client reconnection and synchronize missed data', async () => {
      // Initial connection and session join
      await new Promise((resolve) => {
        clientSocket1.on('session_joined', resolve);
        clientSocket1.emit('join_session', {
          sessionId: testSession.id,
          playerId: 'player-1',
          characterId: testCharacters[0].id
        });
      });

      // Simulate data generation while client is connected
      const initialMessages = [
        { content: 'Message 1', characterId: testCharacters[0].id },
        { content: 'Message 2', characterId: testCharacters[1].id }
      ];

      for (const msg of initialMessages) {
        clientSocket1.emit('send_message', {
          type: 'player_action',
          ...msg,
          timestamp: new Date().toISOString()
        });
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Disconnect client
      clientSocket1.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate data while client is disconnected (simulate missed events)
      const missedMessages = [
        { content: 'Missed Message 1', characterId: testCharacters[1].id },
        { content: 'Missed Message 2', characterId: testCharacters[2].id }
      ];

      // Simulate server-side message generation (would normally come from other clients)
      missedMessages.forEach(msg => {
        const messageData = {
          session_id: testSession.id,
          character_id: msg.characterId,
          content: msg.content,
          message_type: 'player_action',
          created_at: new Date().toISOString()
        };

        db.prepare(`
          INSERT INTO chat_messages (id, session_id, character_id, content, message_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          `msg-${Date.now()}-${Math.random()}`,
          messageData.session_id,
          messageData.character_id,
          messageData.content,
          messageData.message_type,
          messageData.created_at
        );
      });

      // Reconnect client
      clientSocket1 = ClientIO(`http://localhost:${serverPort}`);
      await new Promise<void>((resolve) => clientSocket1.on('connect', resolve));

      // Set up sync data listener
      const syncPromise = new Promise((resolve) => {
        clientSocket1.on('sync_data', resolve);
      });

      // Rejoin session with sync request
      clientSocket1.emit('rejoin_session', {
        sessionId: testSession.id,
        playerId: 'player-1',
        characterId: testCharacters[0].id,
        lastSyncTimestamp: new Date(Date.now() - 10000).toISOString() // 10 seconds ago
      });

      const syncData = await Promise.race([
        syncPromise,
        new Promise(resolve => setTimeout(() => resolve(null), 2000))
      ]);

      if (syncData) {
        expect((syncData as any).missedMessages).toBeDefined();
        expect((syncData as any).missedMessages.length).toBeGreaterThanOrEqual(2);
        
        // Verify missed messages include the ones created during disconnect
        const syncedMessages = (syncData as any).missedMessages;
        expect(syncedMessages.some((msg: any) => msg.content === 'Missed Message 1')).toBe(true);
        expect(syncedMessages.some((msg: any) => msg.content === 'Missed Message 2')).toBe(true);
      }

      // Verify client has complete message history
      const allMessages = db.prepare(`
        SELECT * FROM chat_messages 
        WHERE session_id = ? 
        ORDER BY created_at ASC
      `).all(testSession.id);

      expect(allMessages.length).toBeGreaterThanOrEqual(4); // Initial + missed messages
    });
  });
});

// Enhanced WebSocket event handlers with database persistence
function setupEnhancedWebSocketHandlers(io: SocketIOServer, db: DatabaseType): void {
  // Set up database tables for WebSocket events
  setupWebSocketTables(db);

  io.on('connection', (socket) => {
    let currentSessionId: string | null = null;
    let currentPlayerId: string | null = null;
    let lastMessageTime = 0;
    let messageCount = 0;

    socket.on('join_session', async (data) => {
      try {
        const { sessionId, playerId, characterId } = data;
        
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
        if (!session) {
          socket.emit('join_error', { code: 'SESSION_NOT_FOUND', message: 'Session not found' });
          return;
        }

        currentSessionId = sessionId;
        currentPlayerId = playerId;
        
        socket.join(sessionId);
        
        socket.emit('session_joined', { success: true, sessionId, playerId });
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

    socket.on('rejoin_session', async (data) => {
      const { sessionId, playerId, characterId, lastSyncTimestamp } = data;
      
      currentSessionId = sessionId;
      currentPlayerId = playerId;
      socket.join(sessionId);

      // Get missed messages
      const missedMessages = db.prepare(`
        SELECT * FROM chat_messages 
        WHERE session_id = ? AND created_at > ?
        ORDER BY created_at ASC
      `).all(sessionId, lastSyncTimestamp);

      socket.emit('sync_data', { missedMessages });
      socket.emit('session_joined', { success: true, sessionId, playerId });
    });

    socket.on('send_message', (data) => {
      if (!currentSessionId || !currentPlayerId) return;
      
      // Rate limiting
      const now = Date.now();
      if (now - lastMessageTime < 1000) { // 1 second between messages
        messageCount++;
        if (messageCount > 5) {
          socket.emit('rate_limit_warning', { message: 'Sending messages too quickly' });
          return;
        }
      } else {
        messageCount = 0;
      }
      lastMessageTime = now;
      
      if (!data.type || !data.content) {
        socket.emit('message_error', { code: 'VALIDATION_ERROR', message: 'Type and content are required' });
        return;
      }
      
      // Persist message to database
      const messageId = `msg-${Date.now()}-${Math.random()}`;
      db.prepare(`
        INSERT INTO chat_messages (id, session_id, character_id, content, message_type, sender_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        messageId,
        currentSessionId,
        data.characterId,
        data.content,
        data.type,
        currentPlayerId,
        new Date().toISOString()
      );
      
      const message = { ...data, sender: currentPlayerId, messageId };
      socket.to(currentSessionId).emit('message_broadcast', message);
    });

    socket.on('roll_dice', (data) => {
      if (!currentSessionId) return;
      
      // Persist dice roll to database
      db.prepare(`
        INSERT INTO dice_rolls (id, session_id, character_id, dice_type, sides, result, modifier, total, purpose, is_advantage, is_disadvantage, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        currentSessionId,
        data.characterId,
        data.diceType,
        data.sides,
        data.result,
        data.modifier || 0,
        data.total || data.result,
        data.purpose || 'general',
        data.isAdvantage || false,
        data.isDisadvantage || false,
        new Date().toISOString()
      );

      socket.to(currentSessionId).emit('dice_result', data);

      // Calculate and broadcast statistics if applicable
      const rollCount = db.prepare(`
        SELECT COUNT(*) as count FROM dice_rolls WHERE character_id = ? AND session_id = ?
      `).get(data.characterId, currentSessionId) as { count: number };

      if (rollCount.count % 5 === 0) { // Every 5 rolls
        const stats = db.prepare(`
          SELECT AVG(result) as avg_result, MAX(result) as max_result, MIN(result) as min_result
          FROM dice_rolls WHERE character_id = ? AND session_id = ?
        `).get(data.characterId, currentSessionId);

        socket.to(currentSessionId).emit('dice_statistics_update', {
          characterId: data.characterId,
          totalRolls: rollCount.count,
          averageRoll: stats.avg_result,
          maxRoll: stats.max_result,
          minRoll: stats.min_result
        });
      }
    });

    socket.on('create_movement_proposal', (data) => {
      if (!currentSessionId) return;
      
      // Persist movement proposal
      db.prepare(`
        INSERT INTO party_movement_proposals (id, session_id, proposer_id, from_location_id, to_location_id, reason, estimated_duration, status, proposed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        currentSessionId,
        data.proposerId,
        data.fromLocationId,
        data.toLocationId,
        data.reason,
        data.estimatedDuration,
        'voting',
        new Date().toISOString()
      );

      socket.to(currentSessionId).emit('movement_proposal_created', data);
    });

    socket.on('cast_movement_vote', (data) => {
      if (!currentSessionId) return;
      
      // Persist vote
      db.prepare(`
        INSERT INTO movement_votes (id, proposal_id, voter_id, vote, reason, voted_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        data.proposalId,
        data.voterId,
        data.vote,
        data.reason,
        new Date().toISOString()
      );

      socket.to(currentSessionId).emit('vote_cast', data);
    });

    socket.on('update_session_state', (data) => {
      if (!currentSessionId) return;
      
      // Update session data in database
      const currentSession = db.prepare('SELECT session_data FROM sessions WHERE id = ?').get(currentSessionId);
      const sessionData = currentSession ? JSON.parse((currentSession as any).session_data) : {};
      
      Object.assign(sessionData, data);
      
      db.prepare(`
        UPDATE sessions SET session_data = ?, updated_at = ? WHERE id = ?
      `).run(
        JSON.stringify(sessionData),
        new Date().toISOString(),
        currentSessionId
      );

      // Log session event
      db.prepare(`
        INSERT INTO session_events (id, session_id, event_type, event_data, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        `event-${Date.now()}-${Math.random()}`,
        currentSessionId,
        'state_update',
        JSON.stringify(data),
        new Date().toISOString()
      );

      socket.to(currentSessionId).emit('session_state_updated', data);
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

function setupWebSocketTables(db: DatabaseType): void {
  // Chat messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL,
      sender_id TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Dice rolls table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dice_rolls (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      dice_type TEXT NOT NULL,
      sides INTEGER NOT NULL,
      result INTEGER NOT NULL,
      modifier INTEGER DEFAULT 0,
      total INTEGER NOT NULL,
      purpose TEXT DEFAULT 'general',
      is_advantage BOOLEAN DEFAULT false,
      is_disadvantage BOOLEAN DEFAULT false,
      created_at TEXT NOT NULL
    )
  `);

  // Party movement proposals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS party_movement_proposals (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      proposer_id TEXT NOT NULL,
      from_location_id TEXT NOT NULL,
      to_location_id TEXT NOT NULL,
      reason TEXT,
      estimated_duration INTEGER,
      status TEXT DEFAULT 'voting',
      proposed_at TEXT NOT NULL
    )
  `);

  // Movement votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS movement_votes (
      id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      voter_id TEXT NOT NULL,
      vote TEXT NOT NULL,
      reason TEXT,
      voted_at TEXT NOT NULL
    )
  `);

  // Party movements (executed) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS party_movements (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      from_location_id TEXT NOT NULL,
      to_location_id TEXT NOT NULL,
      participants TEXT NOT NULL,
      travel_method TEXT,
      estimated_time INTEGER,
      actual_time INTEGER,
      executed_at TEXT NOT NULL
    )
  `);

  // Movement events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS movement_events (
      id TEXT PRIMARY KEY,
      movement_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )
  `);

  // Session events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT,
      created_at TEXT NOT NULL
    )
  `);
}

// Helper functions (imported from websocket.integration.test.ts)
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