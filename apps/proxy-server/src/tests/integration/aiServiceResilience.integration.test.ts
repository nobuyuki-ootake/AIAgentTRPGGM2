/**
 * AI Service Resilience Integration Tests
 * Testing AI service integration with error recovery and fallback scenarios
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
  AIGameContext,
  TriggerChainRequest,
  EnemyTacticsLevel
} from '@ai-agent-trpg/types';
import { aiAgentRouter } from '../../routes/aiAgent';
import { errorHandler } from '../../middleware/errorHandler';
import { fullIntegrationMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('AI Service Resilience Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let mockServices: MockServerServices;

  beforeAll(async () => {
    // Set up test database
    db = testDatabase.createTestDatabase();
    
    // Set up express app with AI routes
    app = express();
    app.use(express.json());
    app.use('/api/ai-agent', aiAgentRouter);
    app.use(errorHandler);

    // Initialize mock services with resilience testing capabilities
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

  describe('AIプロバイダー障害とフォールバック', () => {
    it('Should handle primary AI provider failure and attempt fallback providers', async () => {
      // Configure primary provider to fail
      mockServices.aiProviders.setScenario('service_unavailable');
      
      const characterRequest = {
        provider: 'openai', // Primary provider (will fail)
        apiKey: 'test-api-key',
        model: 'gpt-4',
        characterType: 'PC',
        characterBasics: {
          name: 'Test Hero',
          class: 'Fighter',
          race: 'Human'
        },
        campaignContext: {
          campaignId: 'campaign-123',
          worldType: 'fantasy'
        },
        fallbackProviders: [
          { provider: 'anthropic', apiKey: 'fallback-key-1', model: 'claude-3-opus' },
          { provider: 'google', apiKey: 'fallback-key-2', model: 'gemini-pro' }
        ]
      };

      // Primary request should fail, but fallback should succeed
      const response = await request(app)
        .post('/api/ai-agent/character/generate')
        .send(characterRequest)
        .expect(200); // Should succeed with fallback

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Test Hero');
      
      // Response should indicate fallback was used
      expect(response.body.metadata).toBeDefined();
      expect(response.body.metadata.usedFallback).toBe(true);
      expect(response.body.metadata.originalProvider).toBe('openai');
      expect(response.body.metadata.successfulProvider).toBe('anthropic');
    });

    it('Should handle cascading provider failures and return appropriate error', async () => {
      // Configure all providers to fail
      mockServices.aiProviders.setScenario('service_unavailable');
      
      const characterRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        characterType: 'NPC',
        characterBasics: {
          name: 'Merchant',
          role: 'shopkeeper'
        },
        campaignContext: {
          campaignId: 'campaign-123'
        },
        fallbackProviders: [
          { provider: 'anthropic', apiKey: 'fallback-key-1', model: 'claude-3-opus' },
          { provider: 'google', apiKey: 'fallback-key-2', model: 'gemini-pro' }
        ]
      };

      const response = await request(app)
        .post('/api/ai-agent/character/generate')
        .send(characterRequest)
        .expect(503); // Service unavailable

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AI_SERVICE_ERROR');
      expect(response.body.error.message).toContain('All AI providers failed');
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.failedProviders).toHaveLength(3);
    });

    it('Should handle rate limiting with exponential backoff and retry logic', async () => {
      // Configure rate limiting scenario
      mockServices.aiProviders.setScenario('rate_limit');
      
      const gmRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        sessionId: 'session-123',
        playerAction: {
          characterId: 'char-123',
          action: 'investigate',
          target: 'mysterious artifact',
          description: 'I examine the artifact carefully'
        },
        context: {
          currentLocation: 'Ancient Temple',
          activeQuests: ['Find the Sacred Relic'],
          partyStatus: 'exploring'
        },
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000
        }
      };

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/ai-agent/session/gm-response')
        .send(gmRequest)
        .expect(200); // Should eventually succeed after retries

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Should have taken time due to retries with backoff
      expect(duration).toBeGreaterThan(2000); // At least 2 seconds for retries
      
      // Response metadata should indicate retries were used
      expect(response.body.metadata.retryAttempts).toBeGreaterThan(0);
      expect(response.body.metadata.totalDuration).toBeGreaterThan(2000);
    });

    it('Should handle partial AI response corruption and request regeneration', async () => {
      // Configure corrupted response scenario
      mockServices.aiProviders.setScenario('corrupted_response');
      
      const scenarioRequest = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
        model: 'claude-3-opus',
        campaignBasics: {
          name: 'The Dragon\'s Lair',
          systemType: 'D&D 5e',
          worldType: 'fantasy'
        },
        requirements: {
          scenarioLength: 'medium',
          difficulty: 'moderate',
          themes: ['exploration', 'combat', 'puzzle']
        },
        validationRules: {
          requiresNarrative: true,
          requiresEncounters: true,
          requiresObjectives: true,
          minWordCount: 500
        }
      };

      const response = await request(app)
        .post('/api/ai-agent/scenario/generate')
        .send(scenarioRequest)
        .expect(200); // Should succeed after regeneration

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.narrative).toBeDefined();
      expect(response.body.data.encounters).toBeDefined();
      expect(response.body.data.objectives).toBeDefined();
      
      // Should indicate regeneration occurred
      expect(response.body.metadata.regenerationAttempts).toBeGreaterThan(0);
      expect(response.body.metadata.validationPassed).toBe(true);
    });
  });

  describe('AI応答品質の監視と自動修正', () => {
    it('Should detect low-quality AI responses and request improvement', async () => {
      // Configure low-quality response scenario
      mockServices.aiProviders.setScenario('low_quality_response');
      
      const narrativeRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        sessionId: 'session-123',
        context: {
          currentLocation: 'Enchanted Forest',
          recentEvents: ['Party discovered ancient ruins'],
          partyMood: 'curious',
          timeOfDay: 'afternoon'
        },
        narrativeType: 'environmental_description',
        qualityRequirements: {
          minLength: 100,
          maxLength: 500,
          requiredElements: ['sensory_details', 'atmosphere', 'potential_interactions'],
          prohibitedContent: ['violence', 'inappropriate_language'],
          creativityLevel: 'high'
        }
      };

      const response = await request(app)
        .post('/api/ai-agent/narrative/generate')
        .send(narrativeRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.narrative).toBeDefined();
      
      // Should indicate quality improvement was applied
      expect(response.body.metadata.qualityScore).toBeGreaterThan(0.7);
      expect(response.body.metadata.improvementAttempts).toBeGreaterThan(0);
      expect(response.body.metadata.finalQualityCheck).toBe('passed');
      
      // Verify narrative meets quality requirements
      const narrative = response.body.data.narrative;
      expect(narrative.length).toBeGreaterThanOrEqual(100);
      expect(narrative.length).toBeLessThanOrEqual(500);
      expect(narrative).toMatch(/forest|trees|nature/i); // Should be contextually relevant
    });

    it('Should handle AI response timeout and implement circuit breaker pattern', async () => {
      // Configure timeout scenario
      mockServices.aiProviders.setScenario('timeout');
      
      const complexAnalysisRequest = {
        provider: 'google',
        apiKey: 'test-api-key',
        model: 'gemini-pro',
        analysisType: 'tactical_evaluation',
        battleContext: {
          terrain: 'mountainous',
          weather: 'stormy',
          timeOfDay: 'night',
          visibility: 'poor'
        },
        partyComposition: [
          { class: 'Fighter', level: 5, health: 'wounded' },
          { class: 'Wizard', level: 4, health: 'full', spellSlots: 'limited' },
          { class: 'Rogue', level: 5, health: 'full' }
        ],
        enemyForces: [
          { type: 'Orc Warrior', count: 3, threat: 'medium' },
          { type: 'Orc Shaman', count: 1, threat: 'high' }
        ],
        timeoutConfig: {
          requestTimeout: 5000, // 5 seconds
          circuitBreakerThreshold: 3,
          circuitBreakerTimeout: 30000 // 30 seconds
        }
      };

      const response = await request(app)
        .post('/api/ai-agent/analysis/tactical')
        .send(complexAnalysisRequest)
        .expect(408); // Request timeout

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AI_SERVICE_TIMEOUT');
      expect(response.body.error.message).toContain('timed out');
      
      // Circuit breaker should be triggered
      expect(response.body.error.circuitBreakerTriggered).toBe(true);
      
      // Subsequent requests should fail fast due to circuit breaker
      const subsequentResponse = await request(app)
        .post('/api/ai-agent/analysis/tactical')
        .send(complexAnalysisRequest)
        .expect(503);

      expect(subsequentResponse.body.error.code).toBe('CIRCUIT_BREAKER_OPEN');
      expect(subsequentResponse.body.error.message).toContain('circuit breaker is open');
    });

    it('Should handle concurrent AI requests with proper resource management', async () => {
      // Create multiple concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        characterType: 'NPC',
        characterBasics: {
          name: `Character ${i + 1}`,
          role: 'villager',
          personality: 'friendly'
        },
        campaignContext: {
          campaignId: 'campaign-123',
          location: 'Village'
        },
        concurrencyConfig: {
          maxConcurrentRequests: 5,
          queueTimeout: 10000
        }
      }));

      const startTime = Date.now();
      
      // Execute all requests concurrently
      const responses = await Promise.allSettled(
        concurrentRequests.map(req =>
          request(app)
            .post('/api/ai-agent/character/generate')
            .send(req)
        )
      );

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // All requests should succeed
      const successfulResponses = responses.filter(r => r.status === 'fulfilled');
      expect(successfulResponses).toHaveLength(10);

      // Should take reasonable time considering concurrency limits
      expect(totalDuration).toBeLessThan(30000); // Less than 30 seconds total
      
      // Verify resource management worked
      successfulResponses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          expect(response.value.status).toBe(200);
          const body = response.value.body;
          expect(body.success).toBe(true);
          expect(body.data.name).toBe(`Character ${index + 1}`);
          
          // Should include concurrency metadata
          expect(body.metadata).toBeDefined();
          expect(body.metadata.queuePosition).toBeDefined();
          expect(body.metadata.queueWaitTime).toBeDefined();
        }
      });
    });
  });

  describe('AIコンテキスト管理と状態一貫性', () => {
    let campaign: TRPGCampaign;
    let session: TRPGSession;
    let characters: TRPGCharacter[];

    beforeEach(async () => {
      // Set up test campaign context
      campaign = TestDataFactory.createTestCampaign();
      session = TestDataFactory.createTestSession(campaign.id);
      characters = [
        TestDataFactory.createTestCharacter(campaign.id, { name: 'Hero', type: 'PC' }),
        TestDataFactory.createTestCharacter(campaign.id, { name: 'Villain', type: 'Enemy' })
      ];

      // Insert test data into database
      const campaignStmt = db.prepare(`
        INSERT INTO campaigns (id, name, description, status, gm_id, settings, created_at, updated_at, version, last_modified_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      campaignStmt.run(
        campaign.id, campaign.name, campaign.description, campaign.status,
        campaign.gmId, JSON.stringify(campaign.settings),
        campaign.createdAt.toISOString(), campaign.updatedAt.toISOString(),
        campaign.version, campaign.lastModifiedBy
      );

      const sessionStmt = db.prepare(`
        INSERT INTO sessions (id, campaign_id, name, status, session_data, created_at, updated_at, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      sessionStmt.run(
        session.id, session.campaignId, session.name, session.status,
        JSON.stringify(session.sessionData),
        session.createdAt.toISOString(), session.updatedAt.toISOString(),
        session.version
      );

      characters.forEach(char => {
        const charStmt = db.prepare(`
          INSERT INTO characters (id, campaign_id, name, type, description, stats, status, created_at, updated_at, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        charStmt.run(
          char.id, char.campaignId, char.name, char.type,
          char.description, JSON.stringify(char.stats), char.status,
          char.createdAt.toISOString(), char.updatedAt.toISOString(),
          char.version
        );
      });
    });

    it('Should maintain AI context consistency across multiple related requests', async () => {
      // Step 1: Generate initial game context
      const contextRequest = {
        campaignId: campaign.id,
        sessionId: session.id,
        includeCharacters: true,
        includeRecentEvents: true,
        includeLocations: true,
        contextDepth: 'comprehensive'
      };

      const contextResponse = await request(app)
        .post('/api/ai-agent/context/generate')
        .send(contextRequest)
        .expect(200);

      expect(contextResponse.body.success).toBe(true);
      const gameContext = contextResponse.body.data as AIGameContext;
      expect(gameContext.campaignId).toBe(campaign.id);

      // Step 2: Use context for character interaction
      const interactionRequest = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
        model: 'claude-3-opus',
        contextId: gameContext.id,
        characterId: characters[0].id,
        targetId: characters[1].id,
        interactionType: 'dialogue',
        playerInput: 'I challenge you to a duel!',
        maintainConsistency: true
      };

      const interactionResponse = await request(app)
        .post('/api/ai-agent/character/interact')
        .send(interactionRequest)
        .expect(200);

      expect(interactionResponse.body.success).toBe(true);
      const interaction = interactionResponse.body.data;
      expect(interaction.response).toBeDefined();
      expect(interaction.contextConsistency).toBe(true);

      // Step 3: Generate follow-up narration using same context
      const narrativeRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        contextId: gameContext.id,
        previousInteraction: interaction.id,
        narrativeType: 'consequence',
        maintainTone: true,
        continueStoryline: true
      };

      const narrativeResponse = await request(app)
        .post('/api/ai-agent/narrative/continue')
        .send(narrativeRequest)
        .expect(200);

      expect(narrativeResponse.body.success).toBe(true);
      expect(narrativeResponse.body.data.narrative).toBeDefined();
      
      // Verify context consistency across all requests
      expect(narrativeResponse.body.metadata.contextConsistency).toBe(true);
      expect(narrativeResponse.body.metadata.referenceInteraction).toBe(interaction.id);

      // Verify context is properly stored and retrievable
      const savedContext = db.prepare(`
        SELECT * FROM ai_contexts WHERE id = ?
      `).get(gameContext.id);

      expect(savedContext).toBeDefined();
      expect(JSON.parse(savedContext.context_data).campaignId).toBe(campaign.id);
    });

    it('Should handle context corruption and implement automatic recovery', async () => {
      // Create corrupted context scenario
      const corruptedContextId = 'corrupted-context-123';
      
      // Insert corrupted context into database
      db.prepare(`
        INSERT INTO ai_contexts (id, campaign_id, session_id, context_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        corruptedContextId,
        campaign.id,
        session.id,
        '{"invalid": "json data", "corrupted": true', // Intentionally malformed JSON
        new Date().toISOString(),
        new Date().toISOString()
      );

      const requestWithCorruptedContext = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        contextId: corruptedContextId,
        requestType: 'gm_response',
        playerAction: {
          characterId: characters[0].id,
          action: 'explore',
          description: 'I look around the room'
        },
        enableRecovery: true
      };

      const response = await request(app)
        .post('/api/ai-agent/session/gm-response')
        .send(requestWithCorruptedContext)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Should indicate context recovery occurred
      expect(response.body.metadata.contextRecovery).toBe(true);
      expect(response.body.metadata.recoveryMethod).toBe('regenerated');
      expect(response.body.metadata.newContextId).toBeDefined();
      expect(response.body.metadata.newContextId).not.toBe(corruptedContextId);

      // Verify new context is valid
      const newContext = db.prepare(`
        SELECT * FROM ai_contexts WHERE id = ?
      `).get(response.body.metadata.newContextId);

      expect(newContext).toBeDefined();
      expect(() => JSON.parse(newContext.context_data)).not.toThrow();
    });

    it('Should handle memory management for large context datasets', async () => {
      // Create large context dataset
      const largeContextRequest = {
        campaignId: campaign.id,
        sessionId: session.id,
        includeFullHistory: true,
        includeAllCharacters: true,
        includeAllLocations: true,
        includeAllEvents: true,
        contextSize: 'maximum',
        compressionLevel: 'adaptive',
        memoryLimits: {
          maxContextSize: 50000, // 50KB limit
          maxTokens: 10000,
          compressionThreshold: 30000
        }
      };

      // Generate large amount of test data
      const largeHistoryData = Array.from({ length: 100 }, (_, i) => ({
        eventId: `event-${i}`,
        type: 'player_action',
        description: `This is event ${i} with lots of descriptive text that makes the context very large and detailed, including character interactions, environmental descriptions, and complex narrative elements that would normally make the context exceed memory limits.`,
        timestamp: new Date(Date.now() - i * 60000).toISOString()
      }));

      // Insert large history into database
      largeHistoryData.forEach(event => {
        db.prepare(`
          INSERT INTO session_events (id, session_id, event_type, event_data, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          event.eventId,
          session.id,
          event.type,
          JSON.stringify(event),
          event.timestamp
        );
      });

      const response = await request(app)
        .post('/api/ai-agent/context/generate')
        .send(largeContextRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      const context = response.body.data;
      expect(context).toBeDefined();
      
      // Should have applied compression
      expect(response.body.metadata.compressionApplied).toBe(true);
      expect(response.body.metadata.originalSize).toBeGreaterThan(response.body.metadata.compressedSize);
      expect(response.body.metadata.compressionRatio).toBeGreaterThan(0);
      
      // Should stay within memory limits
      const contextSize = JSON.stringify(context).length;
      expect(contextSize).toBeLessThanOrEqual(50000);
      
      // Should still contain essential information
      expect(context.campaignId).toBe(campaign.id);
      expect(context.sessionId).toBe(session.id);
      expect(context.recentEvents).toBeDefined();
      expect(context.activeCharacters).toBeDefined();
    });
  });

  describe('AIエラー回復と緊急対応', () => {
    it('Should implement emergency fallback for critical AI failures during live session', async () => {
      // Simulate critical failure during live session
      const emergencyScenario = {
        sessionId: session.id,
        criticalFailure: true,
        failureType: 'all_providers_down',
        sessionState: 'active',
        playersConnected: 4,
        urgencyLevel: 'high',
        fallbackMode: 'emergency_templates'
      };

      // Configure all AI providers to fail
      mockServices.aiProviders.setScenario('total_failure');

      const emergencyRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        sessionId: session.id,
        emergencyMode: true,
        playerAction: {
          characterId: characters[0].id,
          action: 'attack',
          target: 'orc',
          description: 'I swing my sword at the orc'
        },
        context: {
          combatActive: true,
          criticalMoment: true,
          playersWaiting: true
        },
        fallbackOptions: {
          useTemplates: true,
          usePregenerated: true,
          useBehaviorTrees: true,
          maxWaitTime: 2000
        }
      };

      const response = await request(app)
        .post('/api/ai-agent/session/emergency-response')
        .send(emergencyRequest)
        .expect(200); // Should succeed with emergency fallback

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.response).toBeDefined();
      
      // Should indicate emergency mode was used
      expect(response.body.metadata.emergencyMode).toBe(true);
      expect(response.body.metadata.fallbackMethod).toBe('template_based');
      expect(response.body.metadata.responseTime).toBeLessThan(2000);
      
      // Response should be contextually appropriate even without AI
      expect(response.body.data.response).toContain('attack');
      expect(response.body.data.actionResult).toBeDefined();
    });

    it('Should handle gradual service degradation with quality scaling', async () => {
      // Configure degraded service scenario
      mockServices.aiProviders.setScenario('degraded_performance');
      
      const adaptiveRequest = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
        model: 'claude-3-opus',
        sessionId: session.id,
        requestType: 'narrative_generation',
        complexity: 'high',
        adaptiveQuality: true,
        qualityScaling: {
          detectDegradation: true,
          autoScale: true,
          minQualityLevel: 'basic',
          preferredQualityLevel: 'premium',
          scalingThresholds: {
            responseTime: 5000,
            errorRate: 0.1,
            qualityScore: 0.7
          }
        },
        narrativeRequest: {
          scene: 'climactic_battle',
          characters: [characters[0].id, characters[1].id],
          tone: 'epic',
          length: 'detailed'
        }
      };

      const response = await request(app)
        .post('/api/ai-agent/narrative/adaptive')
        .send(adaptiveRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.narrative).toBeDefined();
      
      // Should indicate quality scaling occurred
      expect(response.body.metadata.qualityScaling).toBe(true);
      expect(response.body.metadata.degradationDetected).toBe(true);
      expect(response.body.metadata.scaledFromLevel).toBe('premium');
      expect(response.body.metadata.scaledToLevel).toBeDefined();
      
      // Should still provide usable content
      expect(response.body.data.narrative.length).toBeGreaterThan(100);
      expect(response.body.data.qualityLevel).toBeDefined();
    });

    it('Should implement distributed load balancing across multiple AI provider instances', async () => {
      const loadBalancingRequest = {
        provider: 'distributed',
        instances: [
          { provider: 'openai', apiKey: 'key1', endpoint: 'instance1', weight: 3 },
          { provider: 'openai', apiKey: 'key2', endpoint: 'instance2', weight: 2 },
          { provider: 'anthropic', apiKey: 'key3', endpoint: 'instance3', weight: 1 }
        ],
        loadBalancing: {
          strategy: 'weighted_round_robin',
          healthChecks: true,
          failoverEnabled: true,
          maxRetriesPerInstance: 2
        },
        batchRequests: Array.from({ length: 6 }, (_, i) => ({
          id: `req-${i}`,
          type: 'character_generation',
          characterBasics: {
            name: `Character ${i}`,
            type: 'NPC'
          },
          campaignContext: {
            campaignId: campaign.id
          }
        }))
      };

      const response = await request(app)
        .post('/api/ai-agent/batch/distributed')
        .send(loadBalancingRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(6);
      
      // Verify load distribution
      expect(response.body.metadata.loadDistribution).toBeDefined();
      expect(response.body.metadata.instanceUsage).toBeDefined();
      
      // Should show proper distribution based on weights
      const distribution = response.body.metadata.instanceUsage;
      expect(distribution.instance1).toBeGreaterThan(distribution.instance2);
      expect(distribution.instance2).toBeGreaterThan(distribution.instance3);
      
      // All requests should have succeeded
      const successfulResults = response.body.data.results.filter((r: any) => r.success);
      expect(successfulResults).toHaveLength(6);
    });
  });
});