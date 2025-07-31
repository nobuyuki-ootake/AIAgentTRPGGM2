/**
 * Complex Workflow Integration Tests
 * Testing multi-step operations and cross-system interactions
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { Database as DatabaseType } from 'better-sqlite3';
import { 
  TRPGCampaign, 
  TRPGSession, 
  TRPGCharacter, 
  APIResponse, 
  ChatMessage,
  DiceRoll,
  Location,
  Quest,
  AIGameContext
} from '@ai-agent-trpg/types';
import { aiAgentRouter } from '../../routes/aiAgent';
import { campaignsRouter } from '../../routes/campaigns';
import { sessionsRouter } from '../../routes/sessions';
import { charactersRouter } from '../../routes/characters';
import { locationsRouter } from '../../routes/locations';
import { errorHandler } from '../../middleware/errorHandler';
import { fullIntegrationMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('Complex Workflow Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let mockServices: MockServerServices;

  beforeAll(async () => {
    // Set up test database
    db = testDatabase.createTestDatabase();
    
    // Set up express app with all routes
    app = express();
    app.use(express.json());
    app.use('/api/ai-agent', aiAgentRouter);
    app.use('/api/campaigns', campaignsRouter);
    app.use('/api/sessions', sessionsRouter);
    app.use('/api/characters', charactersRouter);
    app.use('/api/locations', locationsRouter);
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
  });

  beforeEach(async () => {
    testDatabase.resetDatabase(db);
    await mockServices.reset();
  });

  describe('キャンペーン作成から最初のセッション開始まで完全フロー', () => {
    it('Should create campaign with AI assistance, add characters, set locations, and start first session', async () => {
      // Step 1: AI-assisted campaign creation
      const campaignAssistanceRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        campaignBasics: {
          name: 'Lost Temple Adventure',
          description: 'A classic dungeon exploration campaign',
          systemType: 'D&D 5e'
        },
        worldSettings: {
          worldType: 'fantasy',
          magicLevel: 'high',
          technologyLevel: 'medieval'
        },
        playerInfo: {
          playerCount: 4,
          experienceLevel: 'intermediate'
        }
      };

      const assistanceResponse = await request(app)
        .post('/api/ai-agent/campaign/create-assistance')
        .send(campaignAssistanceRequest)
        .expect(200);

      expect(assistanceResponse.body.success).toBe(true);
      const suggestions = assistanceResponse.body.data;

      // Step 2: Create campaign using AI suggestions
      const campaign = TestDataFactory.createTestCampaign({
        name: campaignAssistanceRequest.campaignBasics.name,
        description: suggestions.worldDetails || campaignAssistanceRequest.campaignBasics.description,
        settings: {
          systemType: campaignAssistanceRequest.campaignBasics.systemType,
          worldType: campaignAssistanceRequest.worldSettings.worldType,
          maxPlayers: campaignAssistanceRequest.playerInfo.playerCount
        }
      });

      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .send(campaign)
        .expect(201);

      expect(campaignResponse.body.success).toBe(true);
      const createdCampaign = campaignResponse.body.data as TRPGCampaign;

      // Step 3: Generate multiple characters with AI
      const characterTypes = [
        { type: 'PC', name: 'Aria the Mage', class: 'Wizard', race: 'Elf' },
        { type: 'PC', name: 'Thorin Ironbeard', class: 'Fighter', race: 'Dwarf' },
        { type: 'NPC', name: 'Elder Sage', role: 'quest_giver', personality: 'wise' },
        { type: 'Enemy', name: 'Temple Guardian', role: 'boss', difficulty: 'medium' }
      ];

      const characters: TRPGCharacter[] = [];
      for (const charData of characterTypes) {
        const charRequest = {
          provider: 'anthropic',
          apiKey: 'test-api-key',
          model: 'claude-3-opus',
          characterType: charData.type,
          characterBasics: {
            name: charData.name,
            class: charData.class || undefined,
            race: charData.race || undefined,
            role: charData.role || undefined,
            personality: charData.personality || undefined
          },
          campaignContext: {
            campaignId: createdCampaign.id,
            worldType: 'fantasy',
            powerLevel: 'heroic'
          }
        };

        const charResponse = await request(app)
          .post('/api/ai-agent/character/generate')
          .send(charRequest)
          .expect(200);

        expect(charResponse.body.success).toBe(true);
        const character = charResponse.body.data as TRPGCharacter;
        
        // Save character to database
        const createCharResponse = await request(app)
          .post('/api/characters')
          .send(character)
          .expect(201);

        characters.push(createCharResponse.body.data);
      }

      expect(characters).toHaveLength(4);
      expect(characters.filter(c => c.type === 'PC')).toHaveLength(2);
      expect(characters.filter(c => c.type === 'NPC')).toHaveLength(1);
      expect(characters.filter(c => c.type === 'Enemy')).toHaveLength(1);

      // Step 4: Create locations with AI assistance
      const locationRequests = [
        { name: 'Village of Greenwood', type: 'settlement', description: 'Starting town' },
        { name: 'Lost Temple Entrance', type: 'dungeon', description: 'Ancient temple ruins' },
        { name: 'Temple Inner Sanctum', type: 'dungeon', description: 'Sacred chamber' }
      ];

      const locations: Location[] = [];
      for (const locData of locationRequests) {
        const location = TestDataFactory.createTestLocation(createdCampaign.id, {
          name: locData.name,
          description: locData.description,
          locationType: locData.type
        });

        const locResponse = await request(app)
          .post('/api/locations')
          .send(location)
          .expect(201);

        locations.push(locResponse.body.data);
      }

      expect(locations).toHaveLength(3);

      // Step 5: Create session with complete setup
      const session = TestDataFactory.createTestSession(createdCampaign.id, {
        name: 'Session 1: The Beginning',
        status: 'planned',
        sessionData: {
          timeline: {
            events: [],
            currentEvent: null,
            startTime: new Date().toISOString()
          },
          participants: characters.filter(c => c.type === 'PC').map(c => c.id),
          currentLocation: locations[0].id,
          activeQuests: []
        }
      });

      const sessionResponse = await request(app)
        .post('/api/sessions')
        .send(session)
        .expect(201);

      expect(sessionResponse.body.success).toBe(true);
      const createdSession = sessionResponse.body.data as TRPGSession;

      // Step 6: Start session and verify all components work together
      const startSessionResponse = await request(app)
        .patch(`/api/sessions/${createdSession.id}/start`)
        .expect(200);

      expect(startSessionResponse.body.success).toBe(true);
      expect(startSessionResponse.body.data.status).toBe('active');

      // Verify complete workflow integrity
      const finalCampaign = await request(app)
        .get(`/api/campaigns/${createdCampaign.id}`)
        .expect(200);

      expect(finalCampaign.body.data.status).toBe('active');
      
      // Verify all created entities are properly linked
      const campaignCharacters = await request(app)
        .get(`/api/characters?campaignId=${createdCampaign.id}`)
        .expect(200);

      expect(campaignCharacters.body.data).toHaveLength(4);

      const campaignLocations = await request(app)
        .get(`/api/locations?campaignId=${createdCampaign.id}`)
        .expect(200);

      expect(campaignLocations.body.data).toHaveLength(3);
    });
  });

  describe('セッション実行中の複雑なワークフロー', () => {
    let campaign: TRPGCampaign;
    let session: TRPGSession;
    let characters: TRPGCharacter[];
    let locations: Location[];

    beforeEach(async () => {
      // Set up base data for session workflow tests
      campaign = TestDataFactory.createTestCampaign();
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .send(campaign)
        .expect(201);
      campaign = campaignResponse.body.data;

      // Create characters
      characters = [
        TestDataFactory.createTestCharacter(campaign.id, { name: 'Hero', type: 'PC' }),
        TestDataFactory.createTestCharacter(campaign.id, { name: 'Merchant', type: 'NPC' }),
        TestDataFactory.createTestCharacter(campaign.id, { name: 'Goblin', type: 'Enemy' })
      ];

      for (let i = 0; i < characters.length; i++) {
        const response = await request(app)
          .post('/api/characters')
          .send(characters[i])
          .expect(201);
        characters[i] = response.body.data;
      }

      // Create locations
      locations = [
        TestDataFactory.createTestLocation(campaign.id, { name: 'Village Square' }),
        TestDataFactory.createTestLocation(campaign.id, { name: 'Forest Path' })
      ];

      for (let i = 0; i < locations.length; i++) {
        const response = await request(app)
          .post('/api/locations')
          .send(locations[i])
          .expect(201);
        locations[i] = response.body.data;
      }

      // Create and start session
      session = TestDataFactory.createTestSession(campaign.id, {
        status: 'planned',
        sessionData: {
          timeline: { events: [], currentEvent: null, startTime: new Date().toISOString() },
          participants: [characters[0].id],
          currentLocation: locations[0].id,
          activeQuests: []
        }
      });

      const sessionResponse = await request(app)
        .post('/api/sessions')
        .send(session)
        .expect(201);
      session = sessionResponse.body.data;

      await request(app)
        .patch(`/api/sessions/${session.id}/start`)
        .expect(200);
    });

    it('Should handle complex player action with AI GM response, dice rolls, and location change', async () => {
      // Step 1: Player action with AI GM response
      const playerActionRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        sessionId: session.id,
        playerAction: {
          characterId: characters[0].id,
          action: 'persuade',
          target: characters[1].id, // Merchant NPC
          description: 'I try to convince the merchant to give us a discount on supplies'
        },
        context: {
          currentLocation: locations[0].name,
          activeQuests: [],
          partyStatus: 'exploring'
        }
      };

      const gmResponse = await request(app)
        .post('/api/ai-agent/session/gm-response')
        .send(playerActionRequest)
        .expect(200);

      expect(gmResponse.body.success).toBe(true);
      expect(gmResponse.body.data.narration).toBeDefined();
      expect(gmResponse.body.data.skillChecks).toBeDefined();

      // Step 2: Handle dice roll for skill check
      const diceRoll: DiceRoll = {
        id: 'roll-123',
        characterId: characters[0].id,
        sessionId: session.id,
        diceType: 'd20',
        sides: 20,
        result: 18,
        modifier: 3,
        total: 21,
        purpose: 'persuasion_check',
        timestamp: new Date(),
        isAdvantage: false,
        isDisadvantage: false
      };

      // Simulate dice roll result processing
      const diceResponse = await request(app)
        .post(`/api/sessions/${session.id}/dice-roll`)
        .send(diceRoll)
        .expect(200);

      expect(diceResponse.body.success).toBe(true);

      // Step 3: AI evaluates dice result and provides outcome
      const outcomeRequest = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
        sessionId: session.id,
        diceResult: diceRoll,
        skillCheck: {
          type: 'persuasion',
          difficulty: 15,
          success: diceRoll.total >= 15
        },
        context: playerActionRequest.context
      };

      const outcomeResponse = await request(app)
        .post('/api/ai-agent/session/dice-outcome')
        .send(outcomeRequest)
        .expect(200);

      expect(outcomeResponse.body.success).toBe(true);
      expect(outcomeResponse.body.data.outcome).toBeDefined();

      // Step 4: Based on successful persuasion, update NPC relationship and get new quest
      if (diceRoll.total >= 15) {
        const npcUpdateRequest = {
          provider: 'openai',
          apiKey: 'test-api-key',
          npcId: characters[1].id,
          interaction: {
            type: 'persuasion_success',
            characterId: characters[0].id,
            result: 'friendly',
            context: 'merchant_discount'
          },
          sessionId: session.id
        };

        const npcResponse = await request(app)
          .post('/api/ai-agent/npc/update-relationship')
          .send(npcUpdateRequest)
          .expect(200);

        expect(npcResponse.body.success).toBe(true);
        expect(npcResponse.body.data.newQuest).toBeDefined();

        // Step 5: Party decides to move to new location for quest
        const movementRequest = {
          sessionId: session.id,
          fromLocationId: locations[0].id,
          toLocationId: locations[1].id,
          partyMembers: [characters[0].id],
          movementType: 'travel',
          estimatedTime: 60 // minutes
        };

        const movementResponse = await request(app)
          .post(`/api/sessions/${session.id}/party-movement`)
          .send(movementRequest)
          .expect(200);

        expect(movementResponse.body.success).toBe(true);

        // Step 6: AI generates random encounter during travel
        const encounterRequest = {
          provider: 'openai',
          apiKey: 'test-api-key',
          sessionId: session.id,
          trigger: {
            type: 'location_transition',
            from: locations[0].id,
            to: locations[1].id,
            travelTime: 60
          },
          partyContext: {
            members: [characters[0].id],
            averageLevel: 3,
            resources: 'full'
          }
        };

        const encounterResponse = await request(app)
          .post('/api/ai-agent/session/random-encounter')
          .send(encounterRequest)
          .expect(200);

        expect(encounterResponse.body.success).toBe(true);
        if (encounterResponse.body.data.hasEncounter) {
          expect(encounterResponse.body.data.encounter).toBeDefined();
          expect(encounterResponse.body.data.encounter.type).toBeDefined();
        }
      }

      // Verify session state has been updated throughout the workflow
      const finalSessionState = await request(app)
        .get(`/api/sessions/${session.id}`)
        .expect(200);

      expect(finalSessionState.body.data.sessionData.timeline.events.length).toBeGreaterThan(0);
    });

    it('Should handle combat encounter with multiple AI agents and environmental effects', async () => {
      // Step 1: Start combat encounter
      const combatStartRequest = {
        sessionId: session.id,
        encounterType: 'combat',
        enemies: [characters[2].id], // Goblin enemy
        environment: {
          terrain: 'forest',
          weather: 'rainy',
          visibility: 'poor',
          hazards: ['slippery_ground']
        },
        participants: [characters[0].id] // Hero PC
      };

      const combatResponse = await request(app)
        .post(`/api/sessions/${session.id}/start-combat`)
        .send(combatStartRequest)
        .expect(200);

      expect(combatResponse.body.success).toBe(true);
      const combatId = combatResponse.body.data.combatId;

      // Step 2: AI evaluates enemy tactics
      const tacticsRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        campaignId: campaign.id,
        sessionId: session.id,
        enemyId: characters[2].id,
        battleContext: {
          terrain: 'forest',
          weather: 'rainy',
          timeOfDay: 'day',
          environmentalHazards: ['slippery_ground']
        },
        partyStatus: {
          averageLevel: 3,
          formation: 'standard',
          resources: 'full'
        }
      };

      const tacticsResponse = await request(app)
        .post('/api/ai-agent/tactics/evaluate')
        .send(tacticsRequest)
        .expect(200);

      expect(tacticsResponse.body.success).toBe(true);
      expect(tacticsResponse.body.data.tacticsLevel).toBeDefined();

      // Step 3: Multiple rounds of combat with AI decision making
      for (let round = 1; round <= 3; round++) {
        // Player turn
        const playerAttackRoll = {
          id: `attack-roll-${round}`,
          characterId: characters[0].id,
          sessionId: session.id,
          diceType: 'd20',
          sides: 20,
          result: Math.floor(Math.random() * 20) + 1,
          modifier: 5,
          purpose: 'attack_roll',
          timestamp: new Date(),
          isAdvantage: false,
          isDisadvantage: false
        } as DiceRoll;
        playerAttackRoll.total = playerAttackRoll.result + playerAttackRoll.modifier;

        await request(app)
          .post(`/api/sessions/${session.id}/dice-roll`)
          .send(playerAttackRoll)
          .expect(200);

        // AI enemy turn
        const aiActionRequest = {
          provider: 'anthropic',
          apiKey: 'test-api-key',
          characterId: characters[2].id,
          combatId: combatId,
          round: round,
          tacticsLevel: tacticsResponse.body.data.tacticsLevel,
          targets: [characters[0].id],
          environment: combatStartRequest.environment
        };

        const aiActionResponse = await request(app)
          .post('/api/ai-agent/combat/ai-action')
          .send(aiActionRequest)
          .expect(200);

        expect(aiActionResponse.body.success).toBe(true);
        expect(aiActionResponse.body.data.action).toBeDefined();

        // Environmental effect processing
        const envEffectRequest = {
          sessionId: session.id,
          combatId: combatId,
          round: round,
          environment: combatStartRequest.environment,
          participants: [characters[0].id, characters[2].id]
        };

        const envResponse = await request(app)
          .post(`/api/sessions/${session.id}/environmental-effects`)
          .send(envEffectRequest)
          .expect(200);

        expect(envResponse.body.success).toBe(true);
      }

      // Step 4: End combat and process results
      const endCombatRequest = {
        combatId: combatId,
        winner: 'party',
        casualties: [],
        experience: 150,
        loot: ['small_potion', 'copper_coins']
      };

      const endCombatResponse = await request(app)
        .post(`/api/sessions/${session.id}/end-combat`)
        .send(endCombatRequest)
        .expect(200);

      expect(endCombatResponse.body.success).toBe(true);

      // Step 5: AI generates post-combat narrative
      const narrativeRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        sessionId: session.id,
        combatResult: endCombatRequest,
        environment: combatStartRequest.environment,
        participants: [characters[0].id]
      };

      const narrativeResponse = await request(app)
        .post('/api/ai-agent/session/post-combat-narrative')
        .send(narrativeRequest)
        .expect(200);

      expect(narrativeResponse.body.success).toBe(true);
      expect(narrativeResponse.body.data.narrative).toBeDefined();
    });
  });

  describe('データ整合性と同期ワークフロー', () => {
    it('Should maintain data consistency across concurrent session operations', async () => {
      // Create campaign and session
      const campaign = TestDataFactory.createTestCampaign();
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .send(campaign)
        .expect(201);

      const session = TestDataFactory.createTestSession(campaignResponse.body.data.id);
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .send(session)
        .expect(201);

      const sessionId = sessionResponse.body.data.id;

      // Simulate concurrent operations
      const operations = [
        // Operation 1: Add multiple characters simultaneously
        request(app)
          .post('/api/characters')
          .send(TestDataFactory.createTestCharacter(campaign.id, { name: 'Character1' })),
        
        request(app)
          .post('/api/characters')
          .send(TestDataFactory.createTestCharacter(campaign.id, { name: 'Character2' })),

        // Operation 2: Update session data
        request(app)
          .patch(`/api/sessions/${sessionId}`)
          .send({ 
            name: 'Updated Session Name',
            notes: 'Updated notes' 
          }),

        // Operation 3: Create locations
        request(app)
          .post('/api/locations')
          .send(TestDataFactory.createTestLocation(campaign.id, { name: 'Location1' })),

        request(app)
          .post('/api/locations')
          .send(TestDataFactory.createTestLocation(campaign.id, { name: 'Location2' }))
      ];

      // Execute all operations concurrently
      const results = await Promise.allSettled(operations);

      // Verify all operations succeeded
      for (const result of results) {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBeGreaterThanOrEqual(200);
          expect(result.value.status).toBeLessThan(300);
        }
      }

      // Verify data consistency
      const campaignData = await request(app)
        .get(`/api/campaigns/${campaign.id}`)
        .expect(200);

      const charactersData = await request(app)
        .get(`/api/characters?campaignId=${campaign.id}`)
        .expect(200);

      const locationsData = await request(app)
        .get(`/api/locations?campaignId=${campaign.id}`)
        .expect(200);

      const sessionData = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .expect(200);

      expect(charactersData.body.data).toHaveLength(2);
      expect(locationsData.body.data).toHaveLength(2);
      expect(sessionData.body.data.name).toBe('Updated Session Name');
      expect(campaignData.body.data.id).toBe(campaign.id);
    });

    it('Should handle transaction rollback on partial operation failure', async () => {
      // Create campaign
      const campaign = TestDataFactory.createTestCampaign();
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .send(campaign)
        .expect(201);

      // Try to create a complex scenario with intentional failure
      const complexOperationRequest = {
        campaignId: campaignResponse.body.data.id,
        operations: [
          {
            type: 'create_character',
            data: TestDataFactory.createTestCharacter(campaign.id, { name: 'Valid Character' })
          },
          {
            type: 'create_location',
            data: TestDataFactory.createTestLocation(campaign.id, { name: 'Valid Location' })
          },
          {
            type: 'create_character',
            data: {
              ...TestDataFactory.createTestCharacter(campaign.id, { name: 'Invalid Character' }),
              id: null // Invalid ID to cause failure
            }
          }
        ]
      };

      // This should fail due to the invalid character
      const response = await request(app)
        .post('/api/campaigns/complex-operation')
        .send(complexOperationRequest)
        .expect(400);

      expect(response.body.success).toBe(false);

      // Verify that no partial data was created due to transaction rollback
      const charactersResponse = await request(app)
        .get(`/api/characters?campaignId=${campaign.id}`)
        .expect(200);

      const locationsResponse = await request(app)
        .get(`/api/locations?campaignId=${campaign.id}`)
        .expect(200);

      // Should be empty due to rollback
      expect(charactersResponse.body.data).toHaveLength(0);
      expect(locationsResponse.body.data).toHaveLength(0);
    });
  });

  describe('AIエージェントチェーンとトリガーワークフロー', () => {
    it('Should execute complex AI agent chain with multiple triggers and state changes', async () => {
      // Setup: Create campaign with full ecosystem
      const campaign = TestDataFactory.createTestCampaign();
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .send(campaign)
        .expect(201);

      const session = TestDataFactory.createTestSession(campaignResponse.body.data.id);
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .send(session)
        .expect(201);

      const character = TestDataFactory.createTestCharacter(campaign.id, { type: 'PC' });
      const characterResponse = await request(app)
        .post('/api/characters')
        .send(character)
        .expect(201);

      const location1 = TestDataFactory.createTestLocation(campaign.id, { name: 'Start Location' });
      const location2 = TestDataFactory.createTestLocation(campaign.id, { name: 'Destination' });
      
      await request(app).post('/api/locations').send(location1).expect(201);
      await request(app).post('/api/locations').send(location2).expect(201);

      // Trigger 1: Location entry triggers environmental changes
      const locationEntryTrigger = {
        campaignId: campaignResponse.body.data.id,
        sessionId: sessionResponse.body.data.id,
        trigger: {
          type: 'location_entry',
          source: 'party',
          target: location2.id,
          context: {
            previousLocation: location1.id,
            partySize: 1,
            timeOfDay: 'evening'
          }
        }
      };

      const triggerResponse1 = await request(app)
        .post('/api/ai-agent/trigger-chain')
        .send(locationEntryTrigger)
        .expect(200);

      expect(triggerResponse1.body.success).toBe(true);
      expect(triggerResponse1.body.data.executedTriggers).toBeDefined();

      // Trigger 2: Environmental change triggers NPC spawning
      const environmentalTrigger = {
        campaignId: campaignResponse.body.data.id,
        sessionId: sessionResponse.body.data.id,
        trigger: {
          type: 'environmental_change',
          source: 'system',
          target: location2.id,
          context: {
            changeType: 'weather',
            newCondition: 'storm',
            severity: 'moderate'
          }
        }
      };

      const triggerResponse2 = await request(app)
        .post('/api/ai-agent/trigger-chain')
        .send(environmentalTrigger)
        .expect(200);

      expect(triggerResponse2.body.success).toBe(true);

      // Trigger 3: NPC spawning triggers quest generation
      const npcSpawnTrigger = {
        campaignId: campaignResponse.body.data.id,
        sessionId: sessionResponse.body.data.id,
        trigger: {
          type: 'npc_spawn',
          source: 'ai_system',
          target: 'new_npc_001',
          context: {
            spawnLocation: location2.id,
            npcType: 'quest_giver',
            urgency: 'high'
          }
        }
      };

      const triggerResponse3 = await request(app)
        .post('/api/ai-agent/trigger-chain')
        .send(npcSpawnTrigger)
        .expect(200);

      expect(triggerResponse3.body.success).toBe(true);

      // Verify cascade effects: All triggers should have created interconnected state changes
      const sessionStateResponse = await request(app)
        .get(`/api/sessions/${sessionResponse.body.data.id}`)
        .expect(200);

      expect(sessionStateResponse.body.data.sessionData.timeline.events.length).toBeGreaterThan(0);

      // Check if AI context has been updated with all changes
      const aiContextRequest = {
        campaignId: campaignResponse.body.data.id,
        sessionId: sessionResponse.body.data.id,
        includeCharacters: true,
        includeLocations: true,
        includeRecentEvents: true
      };

      const contextResponse = await request(app)
        .post('/api/ai-agent/context/generate')
        .send(aiContextRequest)
        .expect(200);

      expect(contextResponse.body.success).toBe(true);
      const context = contextResponse.body.data as AIGameContext;
      expect(context.currentSession).toBeDefined();
      expect(context.recentEvents).toBeDefined();
      expect(context.activeCharacters).toBeDefined();
    });
  });
});