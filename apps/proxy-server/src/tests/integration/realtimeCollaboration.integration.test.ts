/**
 * Real-time Collaboration Integration Tests
 * Testing multiple users in same session with live updates
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

describe('Real-time Collaboration Integration Tests', () => {
  let app: Express;
  let httpServer: Server;
  let io: SocketIOServer;
  let playerSockets: ClientSocket[] = [];
  let gmSocket: ClientSocket;
  let db: DatabaseType;
  let mockServices: MockServerServices;
  let testCampaign: TRPGCampaign;
  let testSession: TRPGSession;
  let testCharacters: TRPGCharacter[] = [];
  let serverPort: number;

  beforeAll(async () => {
    // Set up test database
    db = testDatabase.createTestDatabase();
    setupCollaborationTables(db);
    
    // Set up express app and WebSocket server
    app = express();
    httpServer = app.listen(0);
    serverPort = (httpServer.address() as any).port;
    
    io = new SocketIOServer(httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });

    // Initialize mock services
    mockServices = await websocketOnlyMockSetup();
    
    // Set up enhanced WebSocket handlers for collaboration
    setupCollaborationWebSocketHandlers(io, db);
  });

  afterAll(async () => {
    await mockServices.cleanup();
    testDatabase.closeAllDatabases();
    [...playerSockets, gmSocket].forEach(socket => {
      if (socket) socket.close();
    });
    if (io) io.close();
    if (httpServer) httpServer.close();
  });

  beforeEach(async () => {
    // Reset database and mock services
    testDatabase.resetDatabase(db);
    setupCollaborationTables(db);
    await mockServices.reset();
    
    // Create test data
    testCampaign = TestDataFactory.createTestCampaign();
    insertCampaignToDb(db, testCampaign);

    testSession = TestDataFactory.createTestSession(testCampaign.id, {
      status: 'active',
      sessionData: {
        timeline: { events: [], currentEvent: null, startTime: new Date().toISOString() },
        participants: [],
        currentLocation: 'village-square',
        activeQuests: [],
        sessionSettings: {
          maxPlayers: 6,
          allowSpectators: true,
          requireApprovalForActions: false
        }
      }
    });
    insertSessionToDb(db, testSession);

    // Create multiple test characters (4 players + 1 GM character)
    testCharacters = [
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'Aria Spellweaver', 
        type: 'PC',
        playerId: 'player-1'
      }),
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'Thorin Ironbeard', 
        type: 'PC',
        playerId: 'player-2'
      }),
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'Luna Shadowstep', 
        type: 'PC',
        playerId: 'player-3'
      }),
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'Marcus Lightbringer', 
        type: 'PC',
        playerId: 'player-4'
      }),
      TestDataFactory.createTestCharacter(testCampaign.id, { 
        name: 'Wise Elder', 
        type: 'NPC',
        playerId: 'gm-1'
      })
    ];

    for (const character of testCharacters) {
      insertCharacterToDb(db, character);
    }

    // Close any existing sockets
    [...playerSockets, gmSocket].forEach(socket => {
      if (socket) socket.close();
    });
    playerSockets = [];

    // Connect multiple player sockets + GM socket
    for (let i = 0; i < 4; i++) {
      const socket = ClientIO(`http://localhost:${serverPort}`);
      playerSockets.push(socket);
    }
    gmSocket = ClientIO(`http://localhost:${serverPort}`);
    
    // Wait for all connections
    await Promise.all([
      ...playerSockets.map(socket => new Promise<void>((resolve) => socket.on('connect', resolve))),
      new Promise<void>((resolve) => gmSocket.on('connect', resolve))
    ]);
  });

  afterEach(async () => {
    [...playerSockets, gmSocket].forEach(socket => {
      if (socket) socket.removeAllListeners();
    });
  });

  describe('マルチプレイヤーセッション参加と同期', () => {
    it('Should handle multiple players joining session simultaneously and sync initial state', async () => {
      // All players and GM join session simultaneously
      const joinPromises = [
        ...playerSockets.map((socket, index) => 
          new Promise((resolve) => {
            socket.on('session_joined', resolve);
            socket.emit('join_session', {
              sessionId: testSession.id,
              playerId: `player-${index + 1}`,
              characterId: testCharacters[index].id,
              role: 'player'
            });
          })
        ),
        new Promise((resolve) => {
          gmSocket.on('session_joined', resolve);
          gmSocket.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'gm-1',
            characterId: testCharacters[4].id,
            role: 'gm'
          });
        })
      ];

      const joinResults = await Promise.all(joinPromises);

      // Verify all joins succeeded
      joinResults.forEach(result => {
        expect((result as any).success).toBe(true);
        expect((result as any).sessionId).toBe(testSession.id);
      });

      // Verify session state synchronization
      const statePromises = [
        ...playerSockets.map(socket => 
          new Promise((resolve) => socket.on('session_state_sync', resolve))
        ),
        new Promise((resolve) => gmSocket.on('session_state_sync', resolve))
      ];

      // Trigger state sync
      gmSocket.emit('request_session_state', { sessionId: testSession.id });

      const stateResults = await Promise.all(statePromises);

      // All clients should receive consistent session state
      stateResults.forEach(state => {
        expect((state as any).sessionId).toBe(testSession.id);
        expect((state as any).connectedPlayers).toHaveLength(5); // 4 players + 1 GM
        expect((state as any).currentLocation).toBe('village-square');
        expect((state as any).status).toBe('active');
      });

      // Verify database reflects all connected users
      const sessionParticipants = db.prepare(`
        SELECT * FROM session_participants 
        WHERE session_id = ? AND is_connected = 1
      `).all(testSession.id);

      expect(sessionParticipants).toHaveLength(5);
    });

    it('Should handle player reconnection and state restoration after temporary disconnect', async () => {
      // Initial connection
      await new Promise((resolve) => {
        playerSockets[0].on('session_joined', resolve);
        playerSockets[0].emit('join_session', {
          sessionId: testSession.id,
          playerId: 'player-1',
          characterId: testCharacters[0].id
        });
      });

      // Generate some session activity while player is connected
      const initialMessages = [
        { type: 'player_action', content: 'I examine the ancient door', characterId: testCharacters[0].id },
        { type: 'dice_roll', result: 18, characterId: testCharacters[0].id }
      ];

      for (const msg of initialMessages) {
        playerSockets[0].emit('send_message', {
          ...msg,
          timestamp: new Date().toISOString()
        });
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Disconnect player
      const lastSeenTimestamp = new Date().toISOString();
      playerSockets[0].disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate activity while player is disconnected
      await new Promise((resolve) => {
        gmSocket.on('session_joined', resolve);
        gmSocket.emit('join_session', {
          sessionId: testSession.id,
          playerId: 'gm-1',
          characterId: testCharacters[4].id
        });
      });

      const missedMessages = [
        { type: 'gm_narration', content: 'The door creaks open revealing a dark corridor', characterId: testCharacters[4].id },
        { type: 'system_event', content: 'Party has discovered a secret passage' }
      ];

      for (const msg of missedMessages) {
        gmSocket.emit('send_message', {
          ...msg,
          timestamp: new Date().toISOString()
        });
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Reconnect player
      playerSockets[0] = ClientIO(`http://localhost:${serverPort}`);
      await new Promise<void>((resolve) => playerSockets[0].on('connect', resolve));

      // Request state restoration
      const stateRestorationPromise = new Promise((resolve) => {
        playerSockets[0].on('state_restoration', resolve);
      });

      playerSockets[0].emit('rejoin_session', {
        sessionId: testSession.id,
        playerId: 'player-1',
        characterId: testCharacters[0].id,
        lastSeenTimestamp: lastSeenTimestamp
      });

      const restoredState = await stateRestorationPromise;

      // Verify state restoration includes missed content
      expect((restoredState as any).missedMessages).toBeDefined();
      expect((restoredState as any).missedMessages.length).toBeGreaterThanOrEqual(2);
      expect((restoredState as any).currentSessionState).toBeDefined();
      expect((restoredState as any).currentSessionState.connectedPlayers).toContain('gm-1');
    });

    it('Should manage session capacity and handle overflow with spectator mode', async () => {
      // Update session to have low capacity for testing
      db.prepare(`
        UPDATE sessions 
        SET session_data = json_set(session_data, '$.sessionSettings.maxPlayers', 2)
        WHERE id = ?
      `).run(testSession.id);

      // First 2 players should join successfully
      const firstPlayerJoins = await Promise.all([
        new Promise((resolve) => {
          playerSockets[0].on('session_joined', resolve);
          playerSockets[0].emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-1',
            characterId: testCharacters[0].id,
            role: 'player'
          });
        }),
        new Promise((resolve) => {
          playerSockets[1].on('session_joined', resolve);
          playerSockets[1].emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-2',
            characterId: testCharacters[1].id,
            role: 'player'
          });
        })
      ]);

      firstPlayerJoins.forEach(result => {
        expect((result as any).success).toBe(true);
        expect((result as any).role).toBe('player');
      });

      // GM should still be able to join
      const gmJoinResult = await new Promise((resolve) => {
        gmSocket.on('session_joined', resolve);
        gmSocket.emit('join_session', {
          sessionId: testSession.id,
          playerId: 'gm-1',
          characterId: testCharacters[4].id,
          role: 'gm'
        });
      });

      expect((gmJoinResult as any).success).toBe(true);
      expect((gmJoinResult as any).role).toBe('gm');

      // 3rd player should be offered spectator mode
      const spectatorJoinResult = await new Promise((resolve) => {
        playerSockets[2].on('session_join_response', resolve);
        playerSockets[2].emit('join_session', {
          sessionId: testSession.id,
          playerId: 'player-3',
          characterId: testCharacters[2].id,
          role: 'player'
        });
      });

      expect((spectatorJoinResult as any).success).toBe(true);
      expect((spectatorJoinResult as any).role).toBe('spectator');
      expect((spectatorJoinResult as any).reason).toContain('session full');

      // 4th player should be queued if spectators not allowed
      db.prepare(`
        UPDATE sessions 
        SET session_data = json_set(session_data, '$.sessionSettings.allowSpectators', false)
        WHERE id = ?
      `).run(testSession.id);

      const queuedJoinResult = await new Promise((resolve) => {
        playerSockets[3].on('session_join_response', resolve);
        playerSockets[3].emit('join_session', {
          sessionId: testSession.id,
          playerId: 'player-4',
          characterId: testCharacters[3].id,
          role: 'player'
        });
      });

      expect((queuedJoinResult as any).success).toBe(false);
      expect((queuedJoinResult as any).queuePosition).toBeDefined();
      expect((queuedJoinResult as any).estimatedWaitTime).toBeDefined();
    });
  });

  describe('リアルタイム協調アクションと決定', () => {
    beforeEach(async () => {
      // Connect all players and GM for collaboration tests
      await Promise.all([
        ...playerSockets.map((socket, index) => 
          new Promise((resolve) => {
            socket.on('session_joined', resolve);
            socket.emit('join_session', {
              sessionId: testSession.id,
              playerId: `player-${index + 1}`,
              characterId: testCharacters[index].id
            });
          })
        ),
        new Promise((resolve) => {
          gmSocket.on('session_joined', resolve);
          gmSocket.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'gm-1',
            characterId: testCharacters[4].id
          });
        })
      ]);
    });

    it('Should coordinate group decision making with real-time voting and consensus', async () => {
      // Player 1 proposes a group action
      const groupActionProposal = {
        id: 'action-proposal-1',
        sessionId: testSession.id,
        proposerId: 'player-1',
        actionType: 'location_change',
        description: 'Should we enter the mysterious dungeon?',
        options: [
          { id: 'option-1', text: 'Enter immediately', risk: 'high', reward: 'high' },
          { id: 'option-2', text: 'Scout first', risk: 'low', reward: 'medium' },
          { id: 'option-3', text: 'Find another route', risk: 'medium', reward: 'low' }
        ],
        votingDeadline: new Date(Date.now() + 30000).toISOString(), // 30 seconds
        consensusThreshold: 0.75 // 75% agreement needed
      };

      // Set up vote listeners for all players
      const votePromises = playerSockets.map(socket => 
        new Promise((resolve) => socket.on('group_action_proposed', resolve))
      );
      const gmVotePromise = new Promise((resolve) => gmSocket.on('group_action_proposed', resolve));

      // Player 1 creates the proposal
      playerSockets[0].emit('propose_group_action', groupActionProposal);

      await Promise.all([...votePromises, gmVotePromise]);

      // Players cast votes
      const votes = [
        { playerId: 'player-1', optionId: 'option-1', reasoning: 'Fortune favors the bold!' },
        { playerId: 'player-2', optionId: 'option-2', reasoning: 'Better safe than sorry' },
        { playerId: 'player-3', optionId: 'option-1', reasoning: 'I agree with player 1' },
        { playerId: 'player-4', optionId: 'option-2', reasoning: 'Scouting is wise' }
      ];

      const voteResultPromises = playerSockets.map(socket => 
        new Promise((resolve) => socket.on('vote_update', resolve))
      );

      // Cast votes sequentially to test real-time updates
      for (let i = 0; i < votes.length; i++) {
        playerSockets[i].emit('cast_group_vote', {
          proposalId: groupActionProposal.id,
          ...votes[i]
        });
        
        // Wait a bit between votes to see real-time updates
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      await Promise.all(voteResultPromises);

      // Check final consensus result
      const consensusPromise = new Promise((resolve) => {
        gmSocket.on('consensus_reached', resolve);
      });

      // GM can trigger consensus check or it happens automatically
      gmSocket.emit('check_group_consensus', { proposalId: groupActionProposal.id });

      const consensusResult = await consensusPromise;

      expect((consensusResult as any).proposalId).toBe(groupActionProposal.id);
      expect((consensusResult as any).winningOption).toBeDefined();
      expect((consensusResult as any).voteBreakdown).toBeDefined();

      // Verify consensus is stored in database
      const dbConsensus = db.prepare(`
        SELECT * FROM group_decisions 
        WHERE proposal_id = ?
      `).get(groupActionProposal.id);

      expect(dbConsensus).toBeDefined();
      expect(dbConsensus.status).toBe('resolved');
    });

    it('Should handle simultaneous turn-based actions with priority and timing', async () => {
      // Simulate combat scenario where players need to declare actions simultaneously
      const combatRound = {
        id: 'combat-round-1',
        sessionId: testSession.id,
        roundNumber: 1,
        timeLimit: 15000, // 15 seconds to declare actions
        actionPhase: 'declaration',
        participants: [
          { characterId: testCharacters[0].id, initiative: 18 },
          { characterId: testCharacters[1].id, initiative: 15 },
          { characterId: testCharacters[2].id, initiative: 12 },
          { characterId: testCharacters[3].id, initiative: 9 }
        ]
      };

      // GM starts combat round
      const combatStartPromises = playerSockets.map(socket => 
        new Promise((resolve) => socket.on('combat_round_started', resolve))
      );

      gmSocket.emit('start_combat_round', combatRound);
      await Promise.all(combatStartPromises);

      // Players declare actions simultaneously
      const actionDeclarations = [
        { 
          characterId: testCharacters[0].id, 
          action: 'cast_spell', 
          target: 'orc_warrior',
          timing: 'instant',
          declaredAt: Date.now()
        },
        { 
          characterId: testCharacters[1].id, 
          action: 'charge_attack', 
          target: 'orc_warrior',
          timing: 'immediate',
          declaredAt: Date.now() + 100
        },
        { 
          characterId: testCharacters[2].id, 
          action: 'stealth_move', 
          target: 'behind_pillar',
          timing: 'delayed',
          declaredAt: Date.now() + 200
        },
        { 
          characterId: testCharacters[3].id, 
          action: 'heal_ally', 
          target: testCharacters[1].id,
          timing: 'reaction',
          declaredAt: Date.now() + 300
        }
      ];

      const actionDeclarationPromises = playerSockets.map(socket => 
        new Promise((resolve) => socket.on('action_declared', resolve))
      );

      // Declare actions
      for (let i = 0; i < actionDeclarations.length; i++) {
        playerSockets[i].emit('declare_action', {
          roundId: combatRound.id,
          ...actionDeclarations[i]
        });
      }

      await Promise.all(actionDeclarationPromises);

      // GM resolves actions based on initiative order
      const resolutionPromise = new Promise((resolve) => {
        gmSocket.on('round_resolution_complete', resolve);
      });

      gmSocket.emit('resolve_combat_round', { roundId: combatRound.id });
      const resolution = await resolutionPromise;

      expect((resolution as any).roundId).toBe(combatRound.id);
      expect((resolution as any).actionResults).toHaveLength(4);
      expect((resolution as any).initiativeOrder).toBeDefined();

      // Verify actions were resolved in initiative order
      const results = (resolution as any).actionResults;
      expect(results[0].characterId).toBe(testCharacters[0].id); // Highest initiative
      expect(results[3].characterId).toBe(testCharacters[3].id); // Lowest initiative
    });

    it('Should synchronize shared game state changes across all connected clients', async () => {
      // Set up listeners for game state changes
      const stateChangePromises = [
        ...playerSockets.map(socket => 
          new Promise((resolve) => socket.on('game_state_changed', resolve))
        ),
        new Promise((resolve) => gmSocket.on('game_state_changed', resolve))
      ];

      // GM makes multiple state changes
      const stateChanges = [
        {
          type: 'location_change',
          fromLocation: 'village-square',
          toLocation: 'dark-forest',
          trigger: 'party_movement',
          timestamp: new Date().toISOString()
        },
        {
          type: 'weather_change',
          newWeather: 'heavy_rain',
          visibility: 'poor',
          effects: ['movement_penalty', 'stealth_bonus'],
          timestamp: new Date().toISOString()
        },
        {
          type: 'quest_update',
          questId: 'find-artifact',
          status: 'in_progress',
          newObjective: 'Search the forest ruins for clues',
          timestamp: new Date().toISOString()
        },
        {
          type: 'npc_spawn',
          npcId: 'forest-guardian',
          location: 'dark-forest',
          disposition: 'neutral',
          timestamp: new Date().toISOString()
        }
      ];

      // Apply state changes sequentially
      for (const change of stateChanges) {
        gmSocket.emit('update_game_state', {
          sessionId: testSession.id,
          change: change
        });
        
        // Small delay between changes to test synchronization
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const stateChangeResults = await Promise.all(stateChangePromises);

      // All clients should receive all state changes
      stateChangeResults.forEach(result => {
        expect((result as any).changes).toHaveLength(4);
        expect((result as any).sessionId).toBe(testSession.id);
        expect((result as any).currentState).toBeDefined();
      });

      // Verify final state consistency across all clients
      const finalStatePromises = [
        ...playerSockets.map(socket => 
          new Promise((resolve) => {
            socket.emit('request_current_state', { sessionId: testSession.id });
            socket.on('current_state_response', resolve);
          })
        ),
        new Promise((resolve) => {
          gmSocket.emit('request_current_state', { sessionId: testSession.id });
          gmSocket.on('current_state_response', resolve);
        })
      ];

      const finalStates = await Promise.all(finalStatePromises);

      // All clients should have identical state
      const referenceState = finalStates[0];
      finalStates.forEach(state => {
        expect((state as any).currentLocation).toBe((referenceState as any).currentLocation);
        expect((state as any).weather).toBe((referenceState as any).weather);
        expect((state as any).activeQuests).toEqual((referenceState as any).activeQuests);
        expect((state as any).npcsPresent).toEqual((referenceState as any).npcsPresent);
      });
    });
  });

  describe('同時編集と競合解決', () => {
    beforeEach(async () => {
      // Connect players for simultaneous editing tests
      await Promise.all([
        new Promise((resolve) => {
          playerSockets[0].on('session_joined', resolve);
          playerSockets[0].emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-1',
            characterId: testCharacters[0].id
          });
        }),
        new Promise((resolve) => {
          playerSockets[1].on('session_joined', resolve);
          playerSockets[1].emit('join_session', {
            sessionId: testSession.id,
            playerId: 'player-2',
            characterId: testCharacters[1].id
          });
        }),
        new Promise((resolve) => {
          gmSocket.on('session_joined', resolve);
          gmSocket.emit('join_session', {
            sessionId: testSession.id,
            playerId: 'gm-1',
            characterId: testCharacters[4].id
          });
        })
      ]);
    });

    it('Should handle concurrent character sheet editing with operational transformation', async () => {
      const characterId = testCharacters[0].id;

      // Set up edit conflict listeners
      const conflictPromises = [
        new Promise((resolve) => playerSockets[0].on('edit_conflict_resolved', resolve)),
        new Promise((resolve) => playerSockets[1].on('edit_conflict_resolved', resolve))
      ];

      // Both players try to edit the same character simultaneously
      const edits = [
        {
          characterId: characterId,
          field: 'stats.health',
          oldValue: 100,
          newValue: 85,
          operation: 'update',
          timestamp: Date.now(),
          editId: 'edit-1'
        },
        {
          characterId: characterId,
          field: 'stats.health',
          oldValue: 100,
          newValue: 90,
          operation: 'update',
          timestamp: Date.now() + 50,
          editId: 'edit-2'
        }
      ];

      // Send edits simultaneously
      playerSockets[0].emit('edit_character', edits[0]);
      playerSockets[1].emit('edit_character', edits[1]);

      const resolutions = await Promise.all(conflictPromises);

      // Verify conflict resolution
      expect((resolutions[0] as any).conflictResolution).toBeDefined();
      expect((resolutions[1] as any).conflictResolution).toBeDefined();
      
      // Final value should be consistently resolved
      const finalValue1 = (resolutions[0] as any).finalValue;
      const finalValue2 = (resolutions[1] as any).finalValue;
      expect(finalValue1).toBe(finalValue2);

      // Verify character state in database
      const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
      const stats = JSON.parse(character.stats);
      expect(stats.health).toBe(finalValue1);
    });

    it('Should manage shared document editing with real-time collaborative features', async () => {
      // Create shared session notes document
      const documentId = 'session-notes-1';
      const sharedDocument = {
        id: documentId,
        sessionId: testSession.id,
        type: 'session_notes',
        content: 'Initial session notes content.',
        editors: [],
        version: 1
      };

      gmSocket.emit('create_shared_document', sharedDocument);

      // Players start collaborative editing
      const collaborativeEdits = [
        {
          documentId: documentId,
          operation: 'insert',
          position: 32, // After "content."
          text: ' Player 1 adds this note.',
          editorId: 'player-1',
          timestamp: Date.now()
        },
        {
          documentId: documentId,
          operation: 'insert',
          position: 32, // Same position - conflict!
          text: ' Player 2 adds different text.',
          editorId: 'player-2',
          timestamp: Date.now() + 100
        },
        {
          documentId: documentId,
          operation: 'delete',
          position: 0,
          length: 7, // Delete "Initial"
          editorId: 'player-1',
          timestamp: Date.now() + 200
        }
      ];

      const editPromises = [
        new Promise((resolve) => playerSockets[0].on('document_updated', resolve)),
        new Promise((resolve) => playerSockets[1].on('document_updated', resolve)),
        new Promise((resolve) => gmSocket.on('document_updated', resolve))
      ];

      // Apply edits
      playerSockets[0].emit('edit_document', collaborativeEdits[0]);
      playerSockets[1].emit('edit_document', collaborativeEdits[1]);
      playerSockets[0].emit('edit_document', collaborativeEdits[2]);

      const updates = await Promise.all(editPromises);

      // All clients should have consistent final document state
      updates.forEach(update => {
        expect((update as any).documentId).toBe(documentId);
        expect((update as any).finalContent).toBeDefined();
        expect((update as any).version).toBeGreaterThan(1);
      });

      // Verify operational transformation worked correctly
      const finalDocument = db.prepare('SELECT * FROM shared_documents WHERE id = ?').get(documentId);
      expect(finalDocument).toBeDefined();
      expect(finalDocument.content).toContain('adds');
      expect(finalDocument.version).toBeGreaterThan(1);
    });

    it('Should coordinate inventory and resource management across multiple players', async () => {
      // Create shared party inventory
      const partyInventory = {
        id: 'party-inventory-1',
        sessionId: testSession.id,
        items: [
          { id: 'gold-coins', name: 'Gold Coins', quantity: 1000, type: 'currency' },
          { id: 'health-potions', name: 'Health Potions', quantity: 5, type: 'consumable' },
          { id: 'magic-sword', name: 'Enchanted Sword', quantity: 1, type: 'weapon' },
          { id: 'rope', name: 'Rope (50ft)', quantity: 2, type: 'tool' }
        ],
        accessRules: {
          requireApproval: true,
          approvers: ['gm-1'],
          votingThreshold: 0.5
        }
      };

      gmSocket.emit('create_party_inventory', partyInventory);

      // Multiple players try to take/use items
      const inventoryActions = [
        {
          playerId: 'player-1',
          action: 'take',
          itemId: 'health-potions',
          quantity: 2,
          reason: 'Preparing for dangerous area'
        },
        {
          playerId: 'player-2',
          action: 'take',
          itemId: 'health-potions',
          quantity: 3,
          reason: 'Need for upcoming fight'
        },
        {
          playerId: 'player-1',
          action: 'spend',
          itemId: 'gold-coins',
          quantity: 200,
          reason: 'Buying supplies from merchant'
        }
      ];

      const actionPromises = [
        new Promise((resolve) => playerSockets[0].on('inventory_action_response', resolve)),
        new Promise((resolve) => playerSockets[1].on('inventory_action_response', resolve)),
        new Promise((resolve) => gmSocket.on('inventory_approval_request', resolve))
      ];

      // Execute inventory actions
      playerSockets[0].emit('inventory_action', inventoryActions[0]);
      playerSockets[1].emit('inventory_action', inventoryActions[1]);
      playerSockets[0].emit('inventory_action', inventoryActions[2]);

      const responses = await Promise.all(actionPromises);

      // Check for conflicts and approval requests
      expect((responses[2] as any).approvalRequests).toBeDefined();
      expect((responses[2] as any).approvalRequests.length).toBeGreaterThan(0);

      // GM approves/denies actions
      const approvalDecisions = [
        { actionId: 'action-1', decision: 'approve', reason: 'Reasonable request' },
        { actionId: 'action-2', decision: 'partial', quantity: 1, reason: 'Limited supplies' },
        { actionId: 'action-3', decision: 'approve', reason: 'Party funds available' }
      ];

      const finalInventoryPromises = [
        new Promise((resolve) => playerSockets[0].on('inventory_updated', resolve)),
        new Promise((resolve) => playerSockets[1].on('inventory_updated', resolve))
      ];

      gmSocket.emit('approve_inventory_actions', {
        inventoryId: partyInventory.id,
        decisions: approvalDecisions
      });

      const finalInventory = await Promise.all(finalInventoryPromises);

      // Verify inventory consistency
      finalInventory.forEach(inv => {
        expect((inv as any).items).toBeDefined();
        expect((inv as any).version).toBeGreaterThan(1);
      });

      // Check database for final inventory state
      const dbInventory = db.prepare('SELECT * FROM party_inventories WHERE id = ?').get(partyInventory.id);
      const items = JSON.parse(dbInventory.items);
      
      expect(items.find((item: any) => item.id === 'health-potions').quantity).toBe(2); // 5 - 2 - 1
      expect(items.find((item: any) => item.id === 'gold-coins').quantity).toBe(800); // 1000 - 200
    });
  });

  describe('パフォーマンスと負荷分散', () => {
    it('Should maintain performance with many connected users and high message volume', async () => {
      // Connect maximum number of users
      const maxUsers = 12; // 10 players + 2 GMs
      const allSockets: ClientSocket[] = [];

      // Create connections
      for (let i = 0; i < maxUsers; i++) {
        const socket = ClientIO(`http://localhost:${serverPort}`);
        allSockets.push(socket);
        await new Promise<void>((resolve) => socket.on('connect', resolve));
      }

      // All users join session
      await Promise.all(
        allSockets.map((socket, index) => 
          new Promise((resolve) => {
            socket.on('session_joined', resolve);
            socket.emit('join_session', {
              sessionId: testSession.id,
              playerId: `user-${index + 1}`,
              characterId: index < 4 ? testCharacters[index].id : testCharacters[0].id,
              role: index >= 10 ? 'gm' : 'player'
            });
          })
        )
      );

      // Generate high message volume
      const messageCount = 100;
      const startTime = Date.now();

      const messagePromises: Promise<any>[] = [];
      
      for (let i = 0; i < messageCount; i++) {
        const senderIndex = i % maxUsers;
        const message = {
          type: 'player_action',
          content: `High volume message ${i + 1} from user ${senderIndex + 1}`,
          characterId: testCharacters[0].id,
          timestamp: new Date().toISOString()
        };

        messagePromises.push(
          new Promise((resolve) => {
            allSockets[senderIndex].on(`message_${i}`, resolve);
            allSockets[senderIndex].emit('send_message', { ...message, messageIndex: i });
          })
        );

        // Small delay to prevent overwhelming
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      await Promise.allSettled(messagePromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Performance should be reasonable
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      
      // Check message delivery rate
      const deliveryRate = messageCount / (totalTime / 1000);
      expect(deliveryRate).toBeGreaterThan(5); // At least 5 messages per second

      // Cleanup
      allSockets.forEach(socket => socket.close());
    });

    it('Should handle graceful degradation under extreme load conditions', async () => {
      // Simulate extreme load
      const extremeLoadUsers = 20;
      const extremeSockets: ClientSocket[] = [];

      // Create many connections rapidly
      const connectionPromises = Array.from({ length: extremeLoadUsers }, async (_, i) => {
        const socket = ClientIO(`http://localhost:${serverPort}`);
        extremeSockets.push(socket);
        
        return new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
          socket.on('connect', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      });

      const connectionResults = await Promise.allSettled(connectionPromises);
      const successfulConnections = connectionResults.filter(r => r.status === 'fulfilled').length;

      // Should handle at least some connections
      expect(successfulConnections).toBeGreaterThan(extremeLoadUsers * 0.7); // 70% success rate

      // Test message broadcasting under load
      const broadcastPromises = extremeSockets.slice(0, successfulConnections).map((socket, index) =>
        Promise.race([
          new Promise((resolve) => {
            socket.on('load_test_broadcast', resolve);
            socket.emit('send_message', {
              type: 'load_test',
              content: `Load test message ${index}`,
              timestamp: new Date().toISOString()
            });
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Broadcast timeout')), 10000))
        ])
      );

      const broadcastResults = await Promise.allSettled(broadcastPromises);
      const successfulBroadcasts = broadcastResults.filter(r => r.status === 'fulfilled').length;

      // Should maintain reasonable success rate even under extreme load
      expect(successfulBroadcasts / successfulConnections).toBeGreaterThan(0.5); // 50% success rate

      // Cleanup
      extremeSockets.forEach(socket => socket.close());
    });
  });
});

// Helper functions
function setupCollaborationTables(db: DatabaseType): void {
  // Session participants tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_participants (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      character_id TEXT,
      role TEXT DEFAULT 'player',
      is_connected BOOLEAN DEFAULT 1,
      last_seen TEXT NOT NULL,
      joined_at TEXT NOT NULL
    )
  `);

  // Group decisions and voting
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_decisions (
      id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      proposer_id TEXT NOT NULL,
      description TEXT NOT NULL,
      options TEXT NOT NULL,
      votes TEXT,
      status TEXT DEFAULT 'voting',
      winning_option TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    )
  `);

  // Shared documents
  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_documents (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      editors TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Party inventories
  db.exec(`
    CREATE TABLE IF NOT EXISTS party_inventories (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      items TEXT NOT NULL,
      access_rules TEXT,
      version INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Collaborative edit operations
  db.exec(`
    CREATE TABLE IF NOT EXISTS edit_operations (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      editor_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      operation_data TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      applied BOOLEAN DEFAULT 0
    )
  `);
}

function setupCollaborationWebSocketHandlers(io: SocketIOServer, db: DatabaseType): void {
  io.on('connection', (socket) => {
    let currentSessionId: string | null = null;
    let currentUserId: string | null = null;
    let currentRole: string = 'player';

    socket.on('join_session', async (data) => {
      try {
        const { sessionId, playerId, characterId, role = 'player' } = data;
        
        // Check session exists and capacity
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
        if (!session) {
          socket.emit('session_join_response', { 
            success: false, 
            error: 'Session not found' 
          });
          return;
        }

        const sessionData = JSON.parse(session.session_data);
        const currentParticipants = db.prepare(`
          SELECT COUNT(*) as count FROM session_participants 
          WHERE session_id = ? AND is_connected = 1 AND role = 'player'
        `).get(sessionId) as { count: number };

        // Check capacity for players (GMs can always join)
        if (role === 'player' && currentParticipants.count >= sessionData.sessionSettings?.maxPlayers) {
          if (sessionData.sessionSettings?.allowSpectators) {
            // Offer spectator mode
            socket.emit('session_join_response', {
              success: true,
              role: 'spectator',
              reason: 'session full, joined as spectator'
            });
            currentRole = 'spectator';
          } else {
            // Add to queue
            socket.emit('session_join_response', {
              success: false,
              queuePosition: 1,
              estimatedWaitTime: 300000 // 5 minutes
            });
            return;
          }
        } else {
          currentRole = role;
        }

        currentSessionId = sessionId;
        currentUserId = playerId;
        
        socket.join(sessionId);
        
        // Record participant
        db.prepare(`
          INSERT OR REPLACE INTO session_participants 
          (id, session_id, user_id, character_id, role, is_connected, last_seen, joined_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `${sessionId}-${playerId}`,
          sessionId,
          playerId,
          characterId,
          currentRole,
          1,
          new Date().toISOString(),
          new Date().toISOString()
        );
        
        socket.emit('session_joined', { 
          success: true, 
          sessionId, 
          playerId,
          role: currentRole 
        });
        
        // Send session state to new participant
        const participants = db.prepare(`
          SELECT * FROM session_participants 
          WHERE session_id = ? AND is_connected = 1
        `).all(sessionId);

        socket.emit('session_state_sync', {
          sessionId,
          status: session.status,
          connectedPlayers: participants.map(p => p.user_id),
          currentLocation: sessionData.currentLocation || 'unknown',
          participants: participants
        });
        
      } catch (error) {
        socket.emit('session_join_response', { 
          success: false, 
          error: 'Failed to join session' 
        });
      }
    });

    socket.on('rejoin_session', async (data) => {
      const { sessionId, playerId, characterId, lastSeenTimestamp } = data;
      
      currentSessionId = sessionId;
      currentUserId = playerId;
      socket.join(sessionId);

      // Get missed messages and events
      const missedMessages = db.prepare(`
        SELECT * FROM chat_messages 
        WHERE session_id = ? AND created_at > ?
        ORDER BY created_at ASC
      `).all(sessionId, lastSeenTimestamp);

      const currentSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
      
      socket.emit('state_restoration', {
        missedMessages,
        currentSessionState: JSON.parse(currentSession.session_data)
      });

      socket.emit('session_joined', { success: true, sessionId, playerId });
    });

    socket.on('send_message', (data) => {
      if (!currentSessionId || !currentUserId) return;
      
      const messageId = `msg-${Date.now()}-${Math.random()}`;
      
      // Store message
      db.prepare(`
        INSERT INTO chat_messages (id, session_id, character_id, content, message_type, sender_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        messageId,
        currentSessionId,
        data.characterId,
        data.content,
        data.type,
        currentUserId,
        new Date().toISOString()
      );
      
      // Broadcast to all session participants
      socket.to(currentSessionId).emit('message_broadcast', {
        ...data,
        sender: currentUserId,
        messageId
      });
    });

    socket.on('propose_group_action', (data) => {
      if (!currentSessionId) return;
      
      // Store proposal
      db.prepare(`
        INSERT INTO group_decisions (id, proposal_id, session_id, proposer_id, description, options, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `decision-${Date.now()}`,
        data.id,
        currentSessionId,
        data.proposerId,
        data.description,
        JSON.stringify(data.options),
        'voting',
        new Date().toISOString()
      );
      
      socket.to(currentSessionId).emit('group_action_proposed', data);
    });

    socket.on('cast_group_vote', (data) => {
      if (!currentSessionId) return;
      
      // Update votes
      const decision = db.prepare('SELECT * FROM group_decisions WHERE proposal_id = ?').get(data.proposalId);
      if (decision) {
        const votes = JSON.parse(decision.votes || '[]');
        votes.push({
          playerId: data.playerId,
          optionId: data.optionId,
          reasoning: data.reasoning,
          timestamp: new Date().toISOString()
        });
        
        db.prepare('UPDATE group_decisions SET votes = ? WHERE proposal_id = ?')
          .run(JSON.stringify(votes), data.proposalId);
        
        socket.to(currentSessionId).emit('vote_update', {
          proposalId: data.proposalId,
          votes: votes
        });
      }
    });

    socket.on('update_game_state', (data) => {
      if (!currentSessionId || currentRole !== 'gm') return;
      
      // Update session data
      const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(currentSessionId);
      const sessionData = JSON.parse(session.session_data);
      
      // Apply state change
      switch (data.change.type) {
        case 'location_change':
          sessionData.currentLocation = data.change.toLocation;
          break;
        case 'weather_change':
          sessionData.weather = data.change.newWeather;
          break;
        case 'quest_update':
          if (!sessionData.activeQuests) sessionData.activeQuests = [];
          const questIndex = sessionData.activeQuests.findIndex((q: any) => q.id === data.change.questId);
          if (questIndex >= 0) {
            sessionData.activeQuests[questIndex].status = data.change.status;
          } else {
            sessionData.activeQuests.push({
              id: data.change.questId,
              status: data.change.status,
              objective: data.change.newObjective
            });
          }
          break;
        case 'npc_spawn':
          if (!sessionData.npcsPresent) sessionData.npcsPresent = [];
          sessionData.npcsPresent.push({
            id: data.change.npcId,
            location: data.change.location,
            disposition: data.change.disposition
          });
          break;
      }
      
      // Save updated session data
      db.prepare('UPDATE sessions SET session_data = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(sessionData), new Date().toISOString(), currentSessionId);
      
      // Broadcast state change
      io.to(currentSessionId).emit('game_state_changed', {
        sessionId: currentSessionId,
        changes: [data.change],
        currentState: sessionData
      });
    });

    socket.on('request_current_state', (data) => {
      if (!currentSessionId) return;
      
      const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(data.sessionId);
      if (session) {
        socket.emit('current_state_response', JSON.parse(session.session_data));
      }
    });

    socket.on('disconnect', () => {
      if (currentSessionId && currentUserId) {
        // Mark as disconnected
        db.prepare(`
          UPDATE session_participants 
          SET is_connected = 0, last_seen = ? 
          WHERE session_id = ? AND user_id = ?
        `).run(new Date().toISOString(), currentSessionId, currentUserId);
        
        socket.to(currentSessionId).emit('player_disconnected', {
          playerId: currentUserId,
          sessionId: currentSessionId
        });
      }
    });
  });
}

// Helper functions from previous tests
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