/**
 * AI Service Advanced Integration Tests
 * Testing complex AI workflows, error recovery, and provider fallback
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
  AIProvider,
  AIRequestLog,
  APIResponse 
} from '@ai-agent-trpg/types';
import { aiAgentRouter } from '../../routes/aiAgent';
import { campaignsRouter } from '../../routes/campaigns';
import { sessionsRouter } from '../../routes/sessions';
import { charactersRouter } from '../../routes/characters';
import { errorHandler } from '../../middleware/errorHandler';
import { aiMiddleware } from '../../middleware/ai.middleware';
import { fullIntegrationMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('AI Service Advanced Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let mockServices: MockServerServices;

  beforeAll(async () => {
    // Set up test database
    db = testDatabase.createTestDatabase();
    setupAITables(db);
    
    // Set up express app with AI middleware
    app = express();
    app.use(express.json());
    app.use(aiMiddleware.rateLimiter());
    app.use(aiMiddleware.contextManager());
    app.use('/api/ai-agent', aiAgentRouter);
    app.use('/api/campaigns', campaignsRouter);
    app.use('/api/sessions', sessionsRouter);
    app.use('/api/characters', charactersRouter);
    app.use(errorHandler);

    // Initialize mock services with advanced scenarios
    mockServices = await fullIntegrationMockSetup({
      aiProviders: {
        scenarios: ['timeout', 'rate_limit', 'partial_failure', 'degraded_performance']
      }
    });
    
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
    setupAITables(db);
    await mockServices.reset();
  });

  describe('複雑なAIワークフローと段階的生成', () => {
    it('Should handle multi-stage campaign creation with context accumulation', async () => {
      // Stage 1: Generate campaign concept
      const conceptRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        stage: 'concept',
        userInput: {
          genre: 'dark fantasy',
          themes: ['political intrigue', 'ancient magic', 'moral ambiguity'],
          inspirations: ['Game of Thrones', 'The Witcher', 'Malazan'],
          playerCount: 4,
          experienceLevel: 'intermediate'
        }
      };

      const conceptResponse = await request(app)
        .post('/api/ai-agent/campaign/generate-staged')
        .send(conceptRequest)
        .expect(200);

      expect(conceptResponse.body.success).toBe(true);
      const contextId = conceptResponse.body.data.contextId;
      expect(contextId).toBeDefined();
      expect(conceptResponse.body.data.concept).toBeDefined();
      expect(conceptResponse.body.data.concept.worldName).toBeDefined();
      expect(conceptResponse.body.data.concept.coreConcepts).toHaveLength(3);

      // Stage 2: Expand world details using context
      const worldRequest = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
        model: 'claude-3-opus',
        stage: 'world_building',
        contextId: contextId,
        refinements: {
          focus: 'political_factions',
          depth: 'detailed',
          includeHistory: true
        }
      };

      const worldResponse = await request(app)
        .post('/api/ai-agent/campaign/generate-staged')
        .send(worldRequest)
        .expect(200);

      expect(worldResponse.body.data.worldDetails).toBeDefined();
      expect(worldResponse.body.data.worldDetails.factions).toHaveLength(5);
      expect(worldResponse.body.data.worldDetails.timeline).toBeDefined();
      expect(worldResponse.body.data.contextId).toBe(contextId);

      // Stage 3: Generate interconnected NPCs based on factions
      const npcRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        stage: 'npc_generation',
        contextId: contextId,
        requirements: {
          npcCount: 10,
          includeRelationships: true,
          factionDistribution: 'balanced'
        }
      };

      const npcResponse = await request(app)
        .post('/api/ai-agent/campaign/generate-staged')
        .send(npcRequest)
        .expect(200);

      expect(npcResponse.body.data.npcs).toHaveLength(10);
      expect(npcResponse.body.data.relationshipWeb).toBeDefined();
      
      // Verify NPCs are connected to factions from previous stage
      const npcsWithFactions = npcResponse.body.data.npcs.filter((npc: any) => 
        npc.faction && worldResponse.body.data.worldDetails.factions.some((f: any) => 
          f.name === npc.faction
        )
      );
      expect(npcsWithFactions.length).toBeGreaterThan(5);

      // Stage 4: Generate initial campaign arc
      const campaignArcRequest = {
        provider: 'google',
        apiKey: 'test-api-key',
        model: 'gemini-pro',
        stage: 'campaign_arc',
        contextId: contextId,
        arcParameters: {
          length: 'medium',
          startingLevel: 3,
          endingLevel: 10,
          majorPlotPoints: 5
        }
      };

      const arcResponse = await request(app)
        .post('/api/ai-agent/campaign/generate-staged')
        .send(campaignArcRequest)
        .expect(200);

      expect(arcResponse.body.data.campaignArc).toBeDefined();
      expect(arcResponse.body.data.campaignArc.acts).toHaveLength(3);
      expect(arcResponse.body.data.campaignArc.majorEvents).toHaveLength(5);

      // Final stage: Compile into complete campaign
      const compileRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        stage: 'compile',
        contextId: contextId,
        outputFormat: 'complete_campaign'
      };

      const finalResponse = await request(app)
        .post('/api/ai-agent/campaign/generate-staged')
        .send(compileRequest)
        .expect(200);

      expect(finalResponse.body.data.campaign).toBeDefined();
      const campaign = finalResponse.body.data.campaign;
      expect(campaign.name).toBeDefined();
      expect(campaign.description).toContain(conceptResponse.body.data.concept.worldName);
      expect(campaign.npcs).toHaveLength(10);
      expect(campaign.locations).toBeDefined();
      expect(campaign.campaignArc).toBeDefined();

      // Verify context was properly accumulated
      const contextHistory = await request(app)
        .get(`/api/ai-agent/context/${contextId}/history`)
        .expect(200);

      expect(contextHistory.body.data.stages).toHaveLength(5);
      expect(contextHistory.body.data.totalTokensUsed).toBeGreaterThan(0);
      expect(contextHistory.body.data.providersUsed).toContain('openai');
      expect(contextHistory.body.data.providersUsed).toContain('anthropic');
      expect(contextHistory.body.data.providersUsed).toContain('google');
    });

    it('Should handle dynamic prompt refinement based on quality feedback', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Initial character generation
      const initialRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        characterType: 'NPC',
        characterBasics: {
          name: 'Mysterious Merchant',
          role: 'quest_giver'
        },
        campaignContext: {
          campaignId: campaign.id,
          setting: 'medieval fantasy'
        },
        qualityRequirements: {
          minDetailLevel: 8,
          requiredElements: ['backstory', 'motivations', 'secrets', 'mannerisms'],
          coherenceThreshold: 0.85
        }
      };

      const initialResponse = await request(app)
        .post('/api/ai-agent/character/generate-with-quality')
        .send(initialRequest)
        .expect(200);

      expect(initialResponse.body.data.character).toBeDefined();
      expect(initialResponse.body.data.qualityMetrics).toBeDefined();
      
      const qualityScore = initialResponse.body.data.qualityMetrics.overallScore;
      const refinementAttempts = initialResponse.body.data.refinementAttempts || 0;

      // If quality is below threshold, system should have automatically refined
      if (qualityScore < 8) {
        expect(refinementAttempts).toBeGreaterThan(0);
        expect(initialResponse.body.data.refinementHistory).toBeDefined();
        
        // Verify progressive improvement
        const history = initialResponse.body.data.refinementHistory;
        for (let i = 1; i < history.length; i++) {
          expect(history[i].qualityScore).toBeGreaterThanOrEqual(history[i-1].qualityScore);
        }
      }

      // Manual refinement request
      const refinementRequest = {
        characterId: initialResponse.body.data.character.id,
        refinementFocus: ['add_unique_quirks', 'deepen_backstory', 'create_plot_hooks'],
        userFeedback: 'The character feels too generic. Need more unique personality traits and specific connections to the world.',
        targetQualityScore: 9
      };

      const refinedResponse = await request(app)
        .post('/api/ai-agent/character/refine')
        .send(refinementRequest)
        .expect(200);

      expect(refinedResponse.body.data.improvedCharacter).toBeDefined();
      expect(refinedResponse.body.data.changes).toBeDefined();
      expect(refinedResponse.body.data.newQualityScore).toBeGreaterThan(qualityScore);

      // Verify specific improvements were made
      const improvements = refinedResponse.body.data.changes;
      expect(improvements.addedElements).toContain('unique_quirks');
      expect(improvements.enhancedSections).toContain('backstory');
      expect(improvements.newConnections).toBeDefined();
    });
  });

  describe('AIプロバイダー障害とフォールバック戦略', () => {
    it('Should handle provider failures with intelligent fallback and retry logic', async () => {
      // Configure providers with different failure scenarios
      mockServices.aiProviders.setProviderScenario('openai', 'timeout');
      mockServices.aiProviders.setProviderScenario('anthropic', 'rate_limit');
      mockServices.aiProviders.setProviderScenario('google', 'healthy');

      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Request with primary provider that will fail
      const request1 = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        fallbackProviders: [
          { provider: 'anthropic', apiKey: 'test-key-2', model: 'claude-3' },
          { provider: 'google', apiKey: 'test-key-3', model: 'gemini-pro' }
        ],
        sessionContext: {
          sessionId: 'test-session',
          currentNarrative: 'The party enters the ancient temple...'
        },
        request: {
          type: 'continue_narrative',
          style: 'descriptive',
          length: 'medium'
        }
      };

      const response1 = await request(app)
        .post('/api/ai-agent/narrative/generate')
        .send(request1)
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response1.body.data.narrative).toBeDefined();
      expect(response1.body.metadata.usedProvider).toBe('google'); // Should fallback to healthy provider
      expect(response1.body.metadata.attemptedProviders).toContain('openai');
      expect(response1.body.metadata.attemptedProviders).toContain('anthropic');
      expect(response1.body.metadata.failureReasons.openai).toBe('timeout');
      expect(response1.body.metadata.failureReasons.anthropic).toBe('rate_limit');

      // Test with circuit breaker pattern
      // Make multiple requests to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        mockServices.aiProviders.setProviderScenario('openai', 'error');
        await request(app)
          .post('/api/ai-agent/narrative/generate')
          .send({ ...request1, provider: 'openai' });
      }

      // Circuit breaker should now be open
      const circuitBreakerResponse = await request(app)
        .post('/api/ai-agent/narrative/generate')
        .send({ ...request1, provider: 'openai' })
        .expect(200);

      expect(circuitBreakerResponse.body.metadata.circuitBreakerStatus).toBe('open');
      expect(circuitBreakerResponse.body.metadata.skippedProvider).toBe('openai');
      expect(circuitBreakerResponse.body.metadata.usedProvider).not.toBe('openai');

      // Test retry with exponential backoff
      mockServices.aiProviders.setProviderScenario('anthropic', 'intermittent_failure');
      
      const retryRequest = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
        model: 'claude-3',
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          maxBackoffMs: 5000
        },
        request: {
          type: 'generate_encounter',
          difficulty: 'medium'
        }
      };

      const retryResponse = await request(app)
        .post('/api/ai-agent/encounter/generate')
        .send(retryRequest)
        .expect(200);

      expect(retryResponse.body.success).toBe(true);
      expect(retryResponse.body.metadata.retryAttempts).toBeGreaterThan(0);
      expect(retryResponse.body.metadata.totalLatency).toBeGreaterThan(0);
    });

    it('Should handle partial failures and assemble complete responses', async () => {
      // Simulate a complex request that requires multiple AI calls
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const session = TestDataFactory.createTestSession(campaign.id);
      await request(app).post('/api/sessions').send(session).expect(201);

      // Configure mixed provider health
      mockServices.aiProviders.setProviderScenario('openai', 'partial_success');
      mockServices.aiProviders.setProviderScenario('anthropic', 'healthy');
      mockServices.aiProviders.setProviderScenario('google', 'degraded');

      const complexRequest = {
        sessionId: session.id,
        requests: [
          {
            type: 'npc_dialogue',
            provider: 'openai',
            npcName: 'Wizard Eldrin',
            context: 'Asked about ancient artifact'
          },
          {
            type: 'environment_description',
            provider: 'anthropic',
            location: 'Mystic Library',
            detail: 'high'
          },
          {
            type: 'random_encounter',
            provider: 'google',
            difficulty: 'easy',
            environment: 'library'
          },
          {
            type: 'loot_generation',
            provider: 'openai',
            encounterType: 'exploration',
            rarity: 'uncommon'
          }
        ],
        assemblyStrategy: 'best_effort',
        minimumSuccessRate: 0.5
      };

      const complexResponse = await request(app)
        .post('/api/ai-agent/session/multi-generate')
        .send(complexRequest)
        .expect(200);

      expect(complexResponse.body.success).toBe(true);
      expect(complexResponse.body.data.results).toBeDefined();
      expect(complexResponse.body.data.successRate).toBeGreaterThanOrEqual(0.5);
      
      const results = complexResponse.body.data.results;
      expect(results.npc_dialogue).toBeDefined();
      expect(results.environment_description).toBeDefined();
      
      // Some results might be fallback or degraded
      expect(complexResponse.body.metadata.partialFailures).toBeDefined();
      expect(complexResponse.body.metadata.fallbacksUsed).toBeDefined();
      
      // Verify assembly strategy worked
      expect(complexResponse.body.data.assembledNarrative).toBeDefined();
      expect(complexResponse.body.data.assembledNarrative).toContain('Eldrin');
      expect(complexResponse.body.data.assembledNarrative).toContain('Library');
    });

    it('Should implement smart caching and request deduplication', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Make identical requests concurrently
      const identicalRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        request: {
          type: 'location_description',
          locationName: 'The Crimson Tower',
          style: 'atmospheric',
          length: 'medium'
        },
        cacheConfig: {
          ttl: 3600,
          scope: 'campaign',
          scopeId: campaign.id
        }
      };

      // Send 5 identical requests concurrently
      const concurrentRequests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/ai-agent/location/describe')
          .send(identicalRequest)
      );

      const responses = await Promise.all(concurrentRequests);

      // All should succeed
      responses.forEach(r => expect(r.status).toBe(200));

      // Check that deduplication worked
      const cacheHits = responses.filter(r => r.body.metadata.cacheHit === true);
      const aiCalls = responses.filter(r => r.body.metadata.cacheHit === false);

      expect(aiCalls.length).toBe(1); // Only one actual AI call
      expect(cacheHits.length).toBe(4); // Others hit cache

      // Verify all responses are identical
      const firstResponse = responses[0].body.data.description;
      responses.forEach(r => {
        expect(r.body.data.description).toBe(firstResponse);
      });

      // Test cache invalidation
      const updateRequest = {
        campaignId: campaign.id,
        updates: {
          setting: 'post-apocalyptic' // Major setting change
        }
      };

      await request(app)
        .patch(`/api/campaigns/${campaign.id}`)
        .send(updateRequest)
        .expect(200);

      // Same request should now bypass cache due to campaign update
      const postUpdateResponse = await request(app)
        .post('/api/ai-agent/location/describe')
        .send(identicalRequest)
        .expect(200);

      expect(postUpdateResponse.body.metadata.cacheHit).toBe(false);
      expect(postUpdateResponse.body.metadata.cacheInvalidationReason).toBe('campaign_updated');

      // Test smart cache warming
      const cacheWarmRequest = {
        campaignId: campaign.id,
        warmupTargets: [
          { type: 'common_npcs', count: 10 },
          { type: 'location_descriptions', locationIds: ['loc1', 'loc2', 'loc3'] },
          { type: 'encounter_tables', difficulties: ['easy', 'medium', 'hard'] }
        ],
        provider: 'openai',
        apiKey: 'test-api-key'
      };

      const warmupResponse = await request(app)
        .post('/api/ai-agent/cache/warmup')
        .send(cacheWarmRequest)
        .expect(200);

      expect(warmupResponse.body.data.warmedEntries).toBeGreaterThan(0);
      expect(warmupResponse.body.data.estimatedHitRate).toBeGreaterThan(0.7);
    });
  });

  describe('コンテキスト管理と長期記憶', () => {
    it('Should maintain context across long gaming sessions with memory optimization', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const session = TestDataFactory.createTestSession(campaign.id);
      await request(app).post('/api/sessions').send(session).expect(201);

      // Simulate a long gaming session with many interactions
      let sessionContextId: string | null = null;
      const interactions = [];

      // Hour 1: Session start and character introductions
      const startResponse = await request(app)
        .post('/api/ai-agent/session/start-context')
        .send({
          sessionId: session.id,
          campaignId: campaign.id,
          players: ['Player1', 'Player2', 'Player3', 'Player4'],
          startingLocation: 'Tavern of the Broken Crown',
          sessionGoals: ['Meet the mysterious patron', 'Investigate disappearances']
        })
        .expect(200);

      sessionContextId = startResponse.body.data.contextId;
      expect(sessionContextId).toBeDefined();

      // Simulate 50 interactions over "4 hours" of gameplay
      for (let hour = 0; hour < 4; hour++) {
        for (let interaction = 0; interaction < 12; interaction++) {
          const interactionTypes = [
            'player_action',
            'npc_dialogue',
            'combat_round',
            'skill_check',
            'exploration',
            'puzzle_solving'
          ];

          const type = interactionTypes[interaction % interactionTypes.length];
          
          const interactionRequest = {
            contextId: sessionContextId,
            provider: ['openai', 'anthropic', 'google'][interaction % 3],
            apiKey: 'test-api-key',
            interaction: {
              type: type,
              timestamp: new Date(Date.now() + (hour * 3600000) + (interaction * 300000)).toISOString(),
              content: `${type} interaction ${hour}-${interaction}`,
              importance: interaction % 4 === 0 ? 'high' : 'normal'
            }
          };

          const response = await request(app)
            .post('/api/ai-agent/session/add-interaction')
            .send(interactionRequest)
            .expect(200);

          interactions.push(response.body.data);

          // Check context size management
          expect(response.body.metadata.contextSize).toBeLessThan(100000); // 100KB limit
          expect(response.body.metadata.summarizationOccurred).toBeDefined();

          if (response.body.metadata.summarizationOccurred) {
            expect(response.body.metadata.preservedKeyEvents).toBeDefined();
            expect(response.body.metadata.compressionRatio).toBeGreaterThan(0.5);
          }
        }
      }

      // Test context recall
      const recallRequest = {
        contextId: sessionContextId,
        query: 'What happened with the mysterious patron?',
        timeRange: 'last_2_hours',
        relevanceThreshold: 0.7
      };

      const recallResponse = await request(app)
        .post('/api/ai-agent/session/recall')
        .send(recallRequest)
        .expect(200);

      expect(recallResponse.body.data.relevantEvents).toBeDefined();
      expect(recallResponse.body.data.relevantEvents.length).toBeGreaterThan(0);
      expect(recallResponse.body.data.summary).toBeDefined();

      // Test context branching for "what-if" scenarios
      const branchRequest = {
        contextId: sessionContextId,
        branchPoint: interactions[25].id, // Branch from middle of session
        branchName: 'alternate_timeline_1',
        alterations: [
          { eventId: interactions[25].id, newOutcome: 'failure' }
        ]
      };

      const branchResponse = await request(app)
        .post('/api/ai-agent/session/branch-context')
        .send(branchRequest)
        .expect(200);

      const branchContextId = branchResponse.body.data.branchContextId;
      expect(branchContextId).toBeDefined();
      expect(branchContextId).not.toBe(sessionContextId);

      // Add interactions to branch
      const branchInteraction = await request(app)
        .post('/api/ai-agent/session/add-interaction')
        .send({
          contextId: branchContextId,
          provider: 'openai',
          apiKey: 'test-api-key',
          interaction: {
            type: 'alternate_outcome',
            content: 'The party failed to convince the patron and must find another way'
          }
        })
        .expect(200);

      expect(branchInteraction.body.data.contextBranch).toBe('alternate_timeline_1');

      // Compare timelines
      const comparisonResponse = await request(app)
        .post('/api/ai-agent/session/compare-timelines')
        .send({
          mainContextId: sessionContextId,
          branchContextId: branchContextId,
          comparisonFocus: ['key_events', 'outcomes', 'character_states']
        })
        .expect(200);

      expect(comparisonResponse.body.data.differences).toBeDefined();
      expect(comparisonResponse.body.data.divergencePoint).toBe(interactions[25].id);
      expect(comparisonResponse.body.data.impactAnalysis).toBeDefined();
    });

    it('Should implement semantic memory for improved NPC consistency', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Create NPC with semantic memory
      const npcRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        characterType: 'NPC',
        characterBasics: {
          name: 'Aldrich the Merchant',
          occupation: 'Traveling Merchant',
          personality: 'Shrewd but fair'
        },
        enableSemanticMemory: true,
        memoryConfig: {
          importantTopics: ['prices', 'trade_routes', 'local_politics', 'personal_history'],
          relationshipTracking: true,
          emotionalMemory: true
        }
      };

      const npcResponse = await request(app)
        .post('/api/ai-agent/character/generate')
        .send(npcRequest)
        .expect(200);

      const npcId = npcResponse.body.data.id;
      const memoryId = npcResponse.body.data.semanticMemoryId;
      expect(memoryId).toBeDefined();

      // Simulate multiple interactions with the NPC over time
      const interactions = [
        {
          speaker: 'Player1',
          content: 'How much for the healing potions?',
          context: 'First meeting, player is injured'
        },
        {
          speaker: 'Player1',
          content: 'You gave me a discount last time, remember?',
          context: 'Second meeting, trying to negotiate'
        },
        {
          speaker: 'Player2',
          content: 'Player1 said you might have information about the northern trade routes',
          context: 'Different player, referencing previous interaction'
        },
        {
          speaker: 'Player1',
          content: 'We helped clear those bandits from the trade route you mentioned',
          context: 'Much later, referencing past information'
        }
      ];

      const interactionResponses = [];
      for (const [index, interaction] of interactions.entries()) {
        // Add time delay between interactions
        const timeSinceLastInteraction = index === 0 ? 0 : (index * 24 * 60 * 60 * 1000); // Days apart
        
        const response = await request(app)
          .post('/api/ai-agent/npc/interact')
          .send({
            npcId: npcId,
            memoryId: memoryId,
            provider: 'openai',
            apiKey: 'test-api-key',
            interaction: {
              ...interaction,
              timestamp: new Date(Date.now() + timeSinceLastInteraction).toISOString()
            }
          })
          .expect(200);

        interactionResponses.push(response.body);
        
        // Verify NPC remembers previous interactions
        if (index > 0) {
          expect(response.body.data.response).toBeDefined();
          expect(response.body.metadata.memoryRecall).toBeDefined();
          expect(response.body.metadata.memoryRecall.recognizedEntities).toBeDefined();
          
          // Should remember Player1 from previous interactions
          if (interaction.speaker === 'Player1') {
            expect(response.body.metadata.memoryRecall.relationshipStatus).toBeDefined();
            expect(response.body.metadata.memoryRecall.previousInteractions).toBeGreaterThan(0);
          }
        }
      }

      // Test memory consistency
      expect(interactionResponses[1].data.response).toMatch(/discount|previous|remember/i);
      expect(interactionResponses[3].data.response).toMatch(/bandits|trade route|grateful/i);

      // Query NPC memory
      const memoryQueryResponse = await request(app)
        .get(`/api/ai-agent/memory/${memoryId}/query`)
        .query({
          topics: ['Player1', 'healing_potions', 'trade_routes'],
          includeEmotions: true
        })
        .expect(200);

      expect(memoryQueryResponse.body.data.memories).toBeDefined();
      expect(memoryQueryResponse.body.data.relationships.Player1).toBeDefined();
      expect(memoryQueryResponse.body.data.relationships.Player1.interactions).toBe(3);
      expect(memoryQueryResponse.body.data.relationships.Player1.sentiment).toBeGreaterThan(0);

      // Test memory persistence across sessions
      const newSessionMemoryCheck = await request(app)
        .post('/api/ai-agent/npc/interact')
        .send({
          npcId: npcId,
          memoryId: memoryId,
          provider: 'anthropic',
          apiKey: 'test-api-key',
          interaction: {
            speaker: 'Player1',
            content: 'Good to see you again, Aldrich! How has business been?',
            context: 'New session, weeks later'
          }
        })
        .expect(200);

      expect(newSessionMemoryCheck.body.metadata.memoryRecall.timeBasedContext).toBeDefined();
      expect(newSessionMemoryCheck.body.data.response).toMatch(/Player1|familiar|remember/i);
    });
  });

  describe('マルチモーダルAI統合', () => {
    it('Should process image inputs for map and character analysis', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Test map image analysis
      const mapAnalysisRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4-vision',
        imageUrl: 'https://example.com/campaign-map.jpg',
        analysisType: 'map_analysis',
        analysisRequests: [
          'identify_key_locations',
          'suggest_encounter_areas',
          'analyze_strategic_points',
          'describe_terrain_features'
        ],
        campaignContext: {
          campaignId: campaign.id,
          mapType: 'regional',
          scale: '1_inch_10_miles'
        }
      };

      const mapResponse = await request(app)
        .post('/api/ai-agent/vision/analyze')
        .send(mapAnalysisRequest)
        .expect(200);

      expect(mapResponse.body.success).toBe(true);
      expect(mapResponse.body.data.keyLocations).toBeDefined();
      expect(mapResponse.body.data.keyLocations.length).toBeGreaterThan(0);
      expect(mapResponse.body.data.encounterSuggestions).toBeDefined();
      expect(mapResponse.body.data.terrainAnalysis).toBeDefined();
      expect(mapResponse.body.data.strategicPoints).toBeDefined();

      // Each location should have coordinates and description
      mapResponse.body.data.keyLocations.forEach((location: any) => {
        expect(location.coordinates).toBeDefined();
        expect(location.name).toBeDefined();
        expect(location.description).toBeDefined();
        expect(location.suggestedPurpose).toBeDefined();
      });

      // Test character art interpretation
      const characterImageRequest = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
        model: 'claude-3-opus',
        imageUrl: 'https://example.com/character-art.jpg',
        analysisType: 'character_interpretation',
        generateStats: true,
        generatePersonality: true,
        generateBackstory: true,
        targetSystem: 'D&D 5e'
      };

      const characterResponse = await request(app)
        .post('/api/ai-agent/vision/analyze')
        .send(characterImageRequest)
        .expect(200);

      expect(characterResponse.body.data.character).toBeDefined();
      expect(characterResponse.body.data.character.appearance).toBeDefined();
      expect(characterResponse.body.data.character.suggestedClass).toBeDefined();
      expect(characterResponse.body.data.character.suggestedRace).toBeDefined();
      expect(characterResponse.body.data.character.stats).toBeDefined();
      expect(characterResponse.body.data.character.personality).toBeDefined();
      expect(characterResponse.body.data.character.backstoryHooks).toBeDefined();

      // Test scene/mood analysis from image
      const sceneAnalysisRequest = {
        provider: 'google',
        apiKey: 'test-api-key',
        model: 'gemini-pro-vision',
        imageUrl: 'https://example.com/scene-reference.jpg',
        analysisType: 'scene_mood',
        generateNarrative: true,
        suggestMusic: true,
        identifyThemes: true
      };

      const sceneResponse = await request(app)
        .post('/api/ai-agent/vision/analyze')
        .send(sceneAnalysisRequest)
        .expect(200);

      expect(sceneResponse.body.data.mood).toBeDefined();
      expect(sceneResponse.body.data.narrative).toBeDefined();
      expect(sceneResponse.body.data.musicSuggestions).toBeDefined();
      expect(sceneResponse.body.data.themes).toBeDefined();
      expect(sceneResponse.body.data.lightingDescription).toBeDefined();
      expect(sceneResponse.body.data.atmosphericElements).toBeDefined();
    });

    it('Should generate images based on campaign context', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const character = TestDataFactory.createTestCharacter(campaign.id, {
        name: 'Valeria Stormblade',
        description: 'A tall elven warrior with silver hair and storm-blue eyes',
        stats: { class: 'Fighter', race: 'Elf', level: 8 }
      });
      await request(app).post('/api/characters').send(character).expect(201);

      // Generate character portrait
      const portraitRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'dall-e-3',
        generationType: 'character_portrait',
        subject: {
          characterId: character.id,
          enhancementPrompts: [
            'heroic pose',
            'detailed armor',
            'mystical background'
          ]
        },
        styleParameters: {
          artStyle: 'fantasy_realism',
          colorPalette: 'cool_tones',
          lighting: 'dramatic',
          composition: 'three_quarter_view'
        },
        quality: 'hd',
        variations: 3
      };

      const portraitResponse = await request(app)
        .post('/api/ai-agent/image/generate')
        .send(portraitRequest)
        .expect(200);

      expect(portraitResponse.body.success).toBe(true);
      expect(portraitResponse.body.data.images).toHaveLength(3);
      expect(portraitResponse.body.data.images[0].url).toBeDefined();
      expect(portraitResponse.body.data.images[0].metadata).toBeDefined();
      expect(portraitResponse.body.data.prompt).toContain('Valeria');
      expect(portraitResponse.body.data.prompt).toContain('elven');

      // Generate location scene
      const location = TestDataFactory.createTestLocation(campaign.id, {
        name: 'The Crystal Caverns',
        description: 'A vast underground cave system filled with glowing crystals'
      });
      await request(app).post('/api/locations').send(location).expect(201);

      const sceneRequest = {
        provider: 'stability',
        apiKey: 'test-api-key',
        model: 'stable-diffusion-xl',
        generationType: 'location_scene',
        subject: {
          locationId: location.id,
          timeOfDay: 'eternal_twilight',
          weather: 'mystical_mist',
          includeElements: ['glowing_crystals', 'underground_river', 'ancient_formations']
        },
        styleParameters: {
          artStyle: 'environmental_concept_art',
          mood: 'mysterious',
          detailLevel: 'high'
        },
        aspectRatio: '16:9',
        upscale: true
      };

      const sceneResponse = await request(app)
        .post('/api/ai-agent/image/generate')
        .send(sceneRequest)
        .expect(200);

      expect(sceneResponse.body.data.images).toBeDefined();
      expect(sceneResponse.body.data.images[0].dimensions.width).toBe(1920);
      expect(sceneResponse.body.data.images[0].dimensions.height).toBe(1080);
      expect(sceneResponse.body.data.images[0].upscaled).toBe(true);

      // Test batch generation for campaign assets
      const batchRequest = {
        campaignId: campaign.id,
        batchType: 'campaign_assets',
        requests: [
          {
            type: 'item',
            name: 'Sword of Storms',
            description: 'An ancient blade crackling with lightning'
          },
          {
            type: 'creature',
            name: 'Crystal Golem',
            description: 'A magical construct made of living crystal'
          },
          {
            type: 'symbol',
            name: 'Guild Emblem',
            description: 'The symbol of the Adventurers Guild'
          }
        ],
        provider: 'openai',
        apiKey: 'test-api-key',
        consistencyToken: 'campaign-style-guide-v1'
      };

      const batchResponse = await request(app)
        .post('/api/ai-agent/image/generate-batch')
        .send(batchRequest)
        .expect(200);

      expect(batchResponse.body.data.generatedAssets).toHaveLength(3);
      expect(batchResponse.body.data.consistencyScore).toBeGreaterThan(0.8);
      expect(batchResponse.body.data.styleGuideUpdated).toBe(true);
    });
  });

  describe('高度なエラー処理とレジリエンス', () => {
    it('Should handle cascading failures with graceful degradation', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Configure cascading failure scenario
      mockServices.aiProviders.setScenario('cascading_failure');

      const complexRequest = {
        type: 'campaign_summary_generation',
        campaignId: campaign.id,
        components: [
          {
            name: 'world_overview',
            provider: 'openai',
            required: true,
            fallbackContent: null
          },
          {
            name: 'character_summaries',
            provider: 'anthropic',
            required: true,
            fallbackContent: 'Characters information temporarily unavailable'
          },
          {
            name: 'recent_events',
            provider: 'google',
            required: false,
            fallbackContent: 'No recent events to display'
          },
          {
            name: 'upcoming_quests',
            provider: 'openai',
            required: false,
            fallbackContent: 'Quest information pending'
          }
        ],
        degradationStrategy: 'progressive',
        minimumViableResponse: ['world_overview']
      };

      const response = await request(app)
        .post('/api/ai-agent/campaign/generate-summary')
        .send(complexRequest)
        .expect(200);

      expect(response.body.partialSuccess).toBe(true);
      expect(response.body.data.completionRate).toBeLessThan(1);
      expect(response.body.data.generatedComponents).toBeDefined();
      expect(response.body.data.failedComponents).toBeDefined();
      expect(response.body.data.fallbacksUsed).toBeDefined();

      // Should have at least minimum viable response
      expect(response.body.data.generatedComponents).toContain('world_overview');
      
      // Verify degradation metadata
      expect(response.body.metadata.degradationLevel).toBeDefined();
      expect(response.body.metadata.recoveryActions).toBeDefined();
      expect(response.body.metadata.retryAfter).toBeDefined();

      // Test recovery mechanism
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for recovery

      mockServices.aiProviders.setScenario('recovered');

      const retryResponse = await request(app)
        .post('/api/ai-agent/campaign/retry-failed-components')
        .send({
          originalRequestId: response.body.requestId,
          componentsToRetry: response.body.data.failedComponents
        })
        .expect(200);

      expect(retryResponse.body.data.recoveredComponents).toBeDefined();
      expect(retryResponse.body.data.stillFailing).toBeDefined();
      expect(retryResponse.body.data.recoveredComponents.length).toBeGreaterThan(0);
    });

    it('Should implement adaptive timeout and performance monitoring', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Configure variable latency scenario
      mockServices.aiProviders.setScenario('variable_latency');

      // Make multiple requests to build performance profile
      const requests = [];
      for (let i = 0; i < 10; i++) {
        const req = request(app)
          .post('/api/ai-agent/character/generate')
          .send({
            provider: 'openai',
            apiKey: 'test-api-key',
            characterType: 'NPC',
            characterBasics: { name: `Test NPC ${i}` },
            campaignContext: { campaignId: campaign.id },
            performanceHints: {
              acceptableLatency: 5000,
              preferLatencyOverQuality: i % 2 === 0
            }
          });
        requests.push(req);
      }

      const responses = await Promise.all(requests);

      // Analyze performance adaptation
      const latencies = responses.map(r => r.body.metadata.latency);
      const timeouts = responses.filter(r => r.body.metadata.timeout).length;
      const adaptations = responses.filter(r => r.body.metadata.performanceAdapted).length;

      expect(timeouts).toBeLessThan(3); // Should adapt to prevent excessive timeouts
      expect(adaptations).toBeGreaterThan(5); // Should adapt frequently

      // Check if system learned optimal timeout
      const performanceProfile = await request(app)
        .get('/api/ai-agent/performance/profile')
        .query({ provider: 'openai' })
        .expect(200);

      expect(performanceProfile.body.data.averageLatency).toBeDefined();
      expect(performanceProfile.body.data.p95Latency).toBeDefined();
      expect(performanceProfile.body.data.recommendedTimeout).toBeDefined();
      expect(performanceProfile.body.data.adaptiveTimeoutEnabled).toBe(true);

      // Test real-time performance adjustment
      const rtRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        request: { type: 'quick_description', subject: 'tavern' },
        sla: {
          maxLatency: 1000,
          minQuality: 0.6,
          adaptiveStrategy: 'latency_priority'
        }
      };

      const rtResponse = await request(app)
        .post('/api/ai-agent/realtime/generate')
        .send(rtRequest)
        .expect(200);

      expect(rtResponse.body.metadata.latency).toBeLessThan(1200); // Some tolerance
      expect(rtResponse.body.metadata.qualityScore).toBeGreaterThan(0.6);
      expect(rtResponse.body.metadata.adaptations).toBeDefined();

      if (rtResponse.body.metadata.adaptations.length > 0) {
        expect(rtResponse.body.metadata.adaptations).toContain(
          expect.objectContaining({
            type: expect.stringMatching(/model_switch|prompt_simplification|cache_hit/)
          })
        );
      }
    });
  });
});

// Helper function to set up AI-specific tables
function setupAITables(db: DatabaseType): void {
  // AI request logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_request_logs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      request_type TEXT NOT NULL,
      request_data TEXT,
      response_data TEXT,
      latency INTEGER,
      tokens_used INTEGER,
      cost REAL,
      error TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // AI context storage
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_contexts (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      campaign_id TEXT,
      context_data TEXT NOT NULL,
      summary TEXT,
      token_count INTEGER,
      last_accessed TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT
    )
  `);

  // Semantic memory for NPCs
  db.exec(`
    CREATE TABLE IF NOT EXISTS npc_memories (
      id TEXT PRIMARY KEY,
      npc_id TEXT NOT NULL,
      memory_type TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      importance REAL,
      emotional_valence REAL,
      related_entities TEXT,
      created_at TEXT NOT NULL,
      last_recalled TEXT
    )
  `);

  // AI provider health
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_provider_health (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      success_rate REAL,
      average_latency INTEGER,
      last_error TEXT,
      circuit_breaker_state TEXT,
      checked_at TEXT NOT NULL
    )
  `);

  // Performance profiles
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_performance_profiles (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      avg_latency INTEGER,
      p50_latency INTEGER,
      p95_latency INTEGER,
      p99_latency INTEGER,
      success_rate REAL,
      sample_count INTEGER,
      updated_at TEXT NOT NULL
    )
  `);

  // AI cache
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_response_cache (
      id TEXT PRIMARY KEY,
      cache_key TEXT UNIQUE NOT NULL,
      provider TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      response_data TEXT NOT NULL,
      metadata TEXT,
      hit_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )
  `);
}