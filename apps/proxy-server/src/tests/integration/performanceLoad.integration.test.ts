/**
 * Performance and Load Integration Tests
 * Testing concurrent requests, large datasets, and performance under load
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { Database as DatabaseType } from 'better-sqlite3';
import { performance } from 'perf_hooks';
import { 
  TRPGCampaign, 
  TRPGSession, 
  TRPGCharacter, 
  Location,
  DiceRoll,
  ChatMessage,
  APIResponse 
} from '@ai-agent-trpg/types';
import { campaignsRouter } from '../../routes/campaigns';
import { sessionsRouter } from '../../routes/sessions';
import { charactersRouter } from '../../routes/characters';
import { locationsRouter } from '../../routes/locations';
import { aiAgentRouter } from '../../routes/aiAgent';
import { errorHandler } from '../../middleware/errorHandler';
import { fullIntegrationMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('Performance and Load Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let mockServices: MockServerServices;

  beforeAll(async () => {
    // Set up test database with performance optimizations
    db = testDatabase.createTestDatabase();
    setupPerformanceIndexes(db);
    
    // Set up express app with all routes
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/api/campaigns', campaignsRouter);
    app.use('/api/sessions', sessionsRouter);
    app.use('/api/characters', charactersRouter);
    app.use('/api/locations', locationsRouter);
    app.use('/api/ai-agent', aiAgentRouter);
    app.use(errorHandler);

    // Initialize mock services with performance monitoring
    mockServices = await fullIntegrationMockSetup();
    
    // Start server
    server = app.listen(0);

    // Increase test timeout for performance tests
    jest.setTimeout(60000);
  });

  afterAll(async () => {
    await mockServices.cleanup();
    testDatabase.closeAllDatabases();
    server.close();
  });

  beforeEach(async () => {
    testDatabase.resetDatabase(db);
    setupPerformanceIndexes(db);
    await mockServices.reset();
  });

  describe('大量データセット処理性能', () => {
    it('Should handle large campaign creation with thousands of entities efficiently', async () => {
      // Create base campaign
      const campaign = TestDataFactory.createTestCampaign();
      
      const startTime = performance.now();
      
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .send(campaign)
        .expect(201);
      
      const campaignCreationTime = performance.now() - startTime;
      expect(campaignCreationTime).toBeLessThan(1000); // Should complete within 1 second

      const campaignId = campaignResponse.body.data.id;

      // Create large number of characters (simulating a large campaign)
      const characterCount = 500;
      const characters = Array.from({ length: characterCount }, (_, i) => 
        TestDataFactory.createTestCharacter(campaignId, {
          name: `Character ${i + 1}`,
          type: i % 3 === 0 ? 'PC' : i % 3 === 1 ? 'NPC' : 'Enemy',
          description: `Generated character ${i + 1} for performance testing with detailed background and extensive statistics.`
        })
      );

      const batchCharacterCreationStart = performance.now();
      
      // Use batch creation for better performance
      const batchResponse = await request(app)
        .post('/api/characters/batch')
        .send({ characters })
        .expect(201);

      const batchCreationTime = performance.now() - batchCharacterCreationStart;
      expect(batchCreationTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(batchResponse.body.data.created).toHaveLength(characterCount);

      // Verify database performance for large query
      const queryStart = performance.now();
      const allCharacters = await request(app)
        .get(`/api/characters?campaignId=${campaignId}&limit=1000`)
        .expect(200);
      
      const queryTime = performance.now() - queryStart;
      expect(queryTime).toBeLessThan(2000); // Query should complete within 2 seconds
      expect(allCharacters.body.data).toHaveLength(characterCount);

      // Test pagination performance
      const paginationStart = performance.now();
      const paginatedResponse = await request(app)
        .get(`/api/characters?campaignId=${campaignId}&page=1&limit=50`)
        .expect(200);
      
      const paginationTime = performance.now() - paginationStart;
      expect(paginationTime).toBeLessThan(500); // Pagination should be very fast
      expect(paginatedResponse.body.data).toHaveLength(50);
      expect(paginatedResponse.body.pagination.total).toBe(characterCount);
    });

    it('Should handle large location datasets with complex relationships efficiently', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Create hierarchical location structure
      const locationCount = 1000;
      const locations: Location[] = [];

      // Create root locations
      for (let i = 0; i < 10; i++) {
        locations.push(TestDataFactory.createTestLocation(campaign.id, {
          name: `Region ${i + 1}`,
          locationType: 'region',
          description: `Large region ${i + 1} with multiple sub-locations and detailed geographical features.`
        }));
      }

      // Create sub-locations for each region
      for (let regionIndex = 0; regionIndex < 10; regionIndex++) {
        for (let subIndex = 0; subIndex < 99; subIndex++) {
          locations.push(TestDataFactory.createTestLocation(campaign.id, {
            name: `Location ${regionIndex}-${subIndex}`,
            locationType: 'settlement',
            parentLocationId: locations[regionIndex].id,
            description: `Sub-location in region ${regionIndex + 1} with complex connections and detailed features.`
          }));
        }
      }

      const bulkLocationStart = performance.now();
      
      // Bulk create locations
      const bulkResponse = await request(app)
        .post('/api/locations/bulk')
        .send({ locations })
        .expect(201);

      const bulkCreationTime = performance.now() - bulkLocationStart;
      expect(bulkCreationTime).toBeLessThan(8000); // Should complete within 8 seconds
      expect(bulkResponse.body.data.created).toHaveLength(locationCount);

      // Test complex hierarchical query performance
      const hierarchyQueryStart = performance.now();
      const hierarchyResponse = await request(app)
        .get(`/api/locations/hierarchy?campaignId=${campaign.id}`)
        .expect(200);
      
      const hierarchyQueryTime = performance.now() - hierarchyQueryStart;
      expect(hierarchyQueryTime).toBeLessThan(3000); // Complex query should complete within 3 seconds
      expect(hierarchyResponse.body.data.regions).toHaveLength(10);

      // Test search performance on large dataset
      const searchStart = performance.now();
      const searchResponse = await request(app)
        .get(`/api/locations/search?q=Location&campaignId=${campaign.id}`)
        .expect(200);
      
      const searchTime = performance.now() - searchStart;
      expect(searchTime).toBeLessThan(1000); // Search should complete within 1 second
      expect(searchResponse.body.data.length).toBeGreaterThan(0);
    });

    it('Should manage large session data with extensive timeline efficiently', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const session = TestDataFactory.createTestSession(campaign.id);
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .send(session)
        .expect(201);

      const sessionId = sessionResponse.body.data.id;

      // Generate large timeline data
      const eventCount = 5000;
      const timelineEvents = Array.from({ length: eventCount }, (_, i) => ({
        id: `event-${i}`,
        type: i % 4 === 0 ? 'player_action' : 
              i % 4 === 1 ? 'gm_narration' :
              i % 4 === 2 ? 'dice_roll' : 'system_event',
        content: `Event ${i + 1}: This is a detailed event description with complex data structures and extensive metadata for performance testing.`,
        timestamp: new Date(Date.now() - (eventCount - i) * 60000).toISOString(),
        characterId: i % 2 === 0 ? 'char-1' : 'char-2',
        metadata: {
          location: `location-${i % 10}`,
          importance: i % 5,
          tags: [`tag-${i % 3}`, `category-${i % 7}`],
          additionalData: {
            complexity: 'high',
            processingTime: Math.random() * 1000,
            relatedEvents: Array.from({ length: 3 }, (_, j) => `event-${i + j - 1}`)
          }
        }
      }));

      const timelineUpdateStart = performance.now();
      
      // Update session with large timeline
      const timelineResponse = await request(app)
        .patch(`/api/sessions/${sessionId}/timeline`)
        .send({ events: timelineEvents })
        .expect(200);

      const timelineUpdateTime = performance.now() - timelineUpdateStart;
      expect(timelineUpdateTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Test timeline query performance
      const timelineQueryStart = performance.now();
      const queryResponse = await request(app)
        .get(`/api/sessions/${sessionId}/timeline?limit=100&offset=0`)
        .expect(200);
      
      const queryTime = performance.now() - timelineQueryStart;
      expect(queryTime).toBeLessThan(1000); // Timeline query should be fast
      expect(queryResponse.body.data.events).toHaveLength(100);

      // Test timeline search performance
      const searchStart = performance.now();
      const searchResponse = await request(app)
        .get(`/api/sessions/${sessionId}/timeline/search?q=player_action&type=player_action`)
        .expect(200);
      
      const searchTime = performance.now() - searchStart;
      expect(searchTime).toBeLessThan(2000); // Search should complete within 2 seconds
      expect(searchResponse.body.data.events.length).toBeGreaterThan(0);
    });
  });

  describe('同時接続とリクエスト負荷テスト', () => {
    it('Should handle high concurrency for campaign operations without performance degradation', async () => {
      const concurrentRequests = 50;
      const campaigns = Array.from({ length: concurrentRequests }, (_, i) => 
        TestDataFactory.createTestCampaign({
          name: `Concurrent Campaign ${i + 1}`,
          description: `Performance test campaign ${i + 1} for concurrent operation testing.`
        })
      );

      const concurrentStart = performance.now();
      
      // Execute concurrent campaign creation
      const responses = await Promise.allSettled(
        campaigns.map(campaign =>
          request(app)
            .post('/api/campaigns')
            .send(campaign)
        )
      );

      const concurrentTime = performance.now() - concurrentStart;
      expect(concurrentTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Verify all requests succeeded
      const successfulResponses = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      expect(successfulResponses).toHaveLength(concurrentRequests);

      // Test concurrent read operations
      const readStart = performance.now();
      const readResponses = await Promise.allSettled(
        Array.from({ length: concurrentRequests }, () =>
          request(app).get('/api/campaigns')
        )
      );

      const readTime = performance.now() - readStart;
      expect(readTime).toBeLessThan(5000); // Concurrent reads should be faster

      const successfulReads = readResponses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      expect(successfulReads).toHaveLength(concurrentRequests);
    });

    it('Should maintain performance under mixed read/write load patterns', async () => {
      // Create base data
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const session = TestDataFactory.createTestSession(campaign.id);
      await request(app).post('/api/sessions').send(session).expect(201);

      // Define mixed workload
      const workloadSize = 100;
      const operations = Array.from({ length: workloadSize }, (_, i) => {
        const operationType = i % 4;
        
        switch (operationType) {
          case 0: // Create character
            return () => request(app)
              .post('/api/characters')
              .send(TestDataFactory.createTestCharacter(campaign.id, { name: `Load Test Char ${i}` }));
          
          case 1: // Read characters
            return () => request(app)
              .get(`/api/characters?campaignId=${campaign.id}`);
          
          case 2: // Update session
            return () => request(app)
              .patch(`/api/sessions/${session.id}`)
              .send({ notes: `Updated notes ${i}` });
          
          case 3: // Create location
            return () => request(app)
              .post('/api/locations')
              .send(TestDataFactory.createTestLocation(campaign.id, { name: `Load Test Location ${i}` }));
          
          default:
            return () => request(app).get('/api/campaigns');
        }
      });

      const mixedWorkloadStart = performance.now();
      
      // Execute mixed workload
      const workloadResponses = await Promise.allSettled(
        operations.map(op => op())
      );

      const workloadTime = performance.now() - mixedWorkloadStart;
      expect(workloadTime).toBeLessThan(20000); // Should complete within 20 seconds

      // Analyze response distribution
      const successfulOps = workloadResponses.filter(r => 
        r.status === 'fulfilled' && [200, 201].includes(r.value.status)
      );
      
      // Should have high success rate even under load
      const successRate = successfulOps.length / workloadSize;
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate minimum

      // Verify database consistency after mixed load
      const campaignCheck = await request(app)
        .get(`/api/campaigns/${campaign.id}`)
        .expect(200);
      
      expect(campaignCheck.body.success).toBe(true);
    });

    it('Should handle AI request batching under high load efficiently', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Create batch AI requests
      const batchSize = 20;
      const aiRequests = Array.from({ length: batchSize }, (_, i) => ({
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        characterType: 'NPC',
        characterBasics: {
          name: `Batch Character ${i + 1}`,
          role: 'villager',
          personality: 'friendly'
        },
        campaignContext: {
          campaignId: campaign.id,
          location: 'Village'
        }
      }));

      const batchStart = performance.now();
      
      // Execute batch AI character generation
      const batchResponse = await request(app)
        .post('/api/ai-agent/character/batch-generate')
        .send({ requests: aiRequests })
        .expect(200);

      const batchTime = performance.now() - batchStart;
      expect(batchTime).toBeLessThan(30000); // Should complete within 30 seconds

      expect(batchResponse.body.success).toBe(true);
      expect(batchResponse.body.data.results).toHaveLength(batchSize);
      expect(batchResponse.body.metadata.totalProcessingTime).toBeDefined();
      expect(batchResponse.body.metadata.averageResponseTime).toBeDefined();

      // Verify batch processing efficiency
      const averageTime = batchResponse.body.metadata.averageResponseTime;
      expect(averageTime).toBeLessThan(2000); // Average response time should be reasonable

      // Test concurrent batch requests
      const concurrentBatchStart = performance.now();
      const concurrentBatches = await Promise.allSettled([
        request(app)
          .post('/api/ai-agent/narrative/batch-generate')
          .send({ 
            requests: Array.from({ length: 5 }, (_, i) => ({
              provider: 'anthropic',
              apiKey: 'test-api-key',
              sessionId: 'test-session',
              context: { location: `Location ${i}` },
              narrativeType: 'description'
            }))
          }),
        request(app)
          .post('/api/ai-agent/character/batch-generate')
          .send({ requests: aiRequests.slice(0, 10) }),
        request(app)
          .post('/api/ai-agent/scenario/batch-generate')
          .send({
            requests: Array.from({ length: 3 }, (_, i) => ({
              provider: 'openai',
              apiKey: 'test-api-key',
              scenarioType: 'encounter',
              difficulty: 'medium'
            }))
          })
      ]);

      const concurrentBatchTime = performance.now() - concurrentBatchStart;
      expect(concurrentBatchTime).toBeLessThan(45000); // Should handle concurrent batches

      const successfulBatches = concurrentBatches.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      expect(successfulBatches).toHaveLength(3);
    });
  });

  describe('メモリ使用量と資源管理', () => {
    it('Should manage memory efficiently during large data processing operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create campaign with extensive data
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Process large character dataset
      const largeCharacterSet = Array.from({ length: 1000 }, (_, i) => 
        TestDataFactory.createTestCharacter(campaign.id, {
          name: `Memory Test Character ${i}`,
          description: `Character ${i} with extensive background: ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50)}`,
          stats: {
            attributes: Array.from({ length: 20 }, (_, j) => ({ name: `Stat${j}`, value: Math.random() * 100 })),
            skills: Array.from({ length: 30 }, (_, j) => ({ name: `Skill${j}`, level: Math.floor(Math.random() * 10) })),
            equipment: Array.from({ length: 50 }, (_, j) => ({ name: `Item${j}`, quantity: Math.floor(Math.random() * 10) }))
          }
        })
      );

      const memoryIntensiveStart = performance.now();
      
      // Process in chunks to test memory management
      const chunkSize = 100;
      for (let i = 0; i < largeCharacterSet.length; i += chunkSize) {
        const chunk = largeCharacterSet.slice(i, i + chunkSize);
        await request(app)
          .post('/api/characters/batch')
          .send({ characters: chunk })
          .expect(201);
        
        // Check memory usage periodically
        const currentMemory = process.memoryUsage();
        const memoryIncrease = (currentMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB
        
        // Memory increase should be reasonable (less than 200MB for this test)
        expect(memoryIncrease).toBeLessThan(200);
      }

      const processingTime = performance.now() - memoryIntensiveStart;
      expect(processingTime).toBeLessThan(60000); // Should complete within 1 minute

      // Verify data integrity after memory-intensive operations
      const characterCount = await request(app)
        .get(`/api/characters/count?campaignId=${campaign.id}`)
        .expect(200);
      
      expect(characterCount.body.data.count).toBe(1000);

      // Test garbage collection efficiency
      const preGCMemory = process.memoryUsage();
      
      // Trigger garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait a moment for GC
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const postGCMemory = process.memoryUsage();
      
      // Memory should have been freed (or at least not increased significantly)
      const memoryDifference = postGCMemory.heapUsed - preGCMemory.heapUsed;
      expect(memoryDifference).toBeLessThan(50 * 1024 * 1024); // Less than 50MB difference
    });

    it('Should handle database connection pooling under high load efficiently', async () => {
      // Test with high number of concurrent database operations
      const concurrentDbOps = 100;
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const connectionPoolStart = performance.now();
      
      // Create concurrent database-intensive operations
      const dbOperations = Array.from({ length: concurrentDbOps }, (_, i) => {
        if (i % 3 === 0) {
          // Create operation
          return request(app)
            .post('/api/characters')
            .send(TestDataFactory.createTestCharacter(campaign.id, { name: `Pool Test ${i}` }));
        } else if (i % 3 === 1) {
          // Read operation
          return request(app)
            .get(`/api/campaigns/${campaign.id}`);
        } else {
          // Update operation
          return request(app)
            .patch(`/api/campaigns/${campaign.id}`)
            .send({ description: `Updated description ${i}` });
        }
      });

      const responses = await Promise.allSettled(dbOperations);
      const poolingTime = performance.now() - connectionPoolStart;
      
      expect(poolingTime).toBeLessThan(30000); // Should handle concurrent DB ops efficiently

      // Verify high success rate despite concurrent load
      const successfulOps = responses.filter(r => 
        r.status === 'fulfilled' && [200, 201].includes(r.value.status)
      );
      
      const successRate = successfulOps.length / concurrentDbOps;
      expect(successRate).toBeGreaterThan(0.90); // 90% success rate minimum

      // Verify database consistency
      const finalCampaign = await request(app)
        .get(`/api/campaigns/${campaign.id}`)
        .expect(200);
      
      expect(finalCampaign.body.success).toBe(true);
      
      // Check that database connections are properly managed
      const dbStats = db.prepare('PRAGMA database_list').all();
      expect(dbStats).toBeDefined();
    });

    it('Should optimize query performance with proper indexing and caching', async () => {
      // Create test dataset for performance analysis
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Create characters with searchable attributes
      const searchableCharacters = Array.from({ length: 500 }, (_, i) => 
        TestDataFactory.createTestCharacter(campaign.id, {
          name: `Searchable Character ${i}`,
          type: ['PC', 'NPC', 'Enemy'][i % 3],
          description: `Character with search term ${i % 10} and category ${i % 5}`,
          stats: {
            level: Math.floor(i / 10) + 1,
            class: ['Fighter', 'Wizard', 'Rogue', 'Cleric'][i % 4],
            race: ['Human', 'Elf', 'Dwarf', 'Halfling'][i % 4]
          }
        })
      );

      await request(app)
        .post('/api/characters/batch')
        .send({ characters: searchableCharacters })
        .expect(201);

      // Test various query patterns for performance
      const queryTests = [
        // Simple index query
        { 
          path: `/api/characters?campaignId=${campaign.id}&type=PC`,
          expectedTime: 500 
        },
        // Compound index query
        { 
          path: `/api/characters?campaignId=${campaign.id}&type=NPC&level=5`,
          expectedTime: 800 
        },
        // Text search query
        { 
          path: `/api/characters/search?q=search%20term%205&campaignId=${campaign.id}`,
          expectedTime: 1000 
        },
        // Aggregation query
        { 
          path: `/api/characters/stats?campaignId=${campaign.id}&groupBy=type`,
          expectedTime: 1200 
        },
        // Complex filter query
        { 
          path: `/api/characters?campaignId=${campaign.id}&class=Fighter&race=Human&minLevel=5`,
          expectedTime: 1500 
        }
      ];

      for (const test of queryTests) {
        const queryStart = performance.now();
        const response = await request(app)
          .get(test.path)
          .expect(200);
        
        const queryTime = performance.now() - queryStart;
        expect(queryTime).toBeLessThan(test.expectedTime);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }

      // Test query plan optimization
      const complexQueryStart = performance.now();
      const complexQuery = await request(app)
        .get(`/api/characters/complex-search`)
        .query({
          campaignId: campaign.id,
          filters: JSON.stringify({
            type: ['PC', 'NPC'],
            levelRange: [1, 10],
            classes: ['Fighter', 'Wizard'],
            hasDescription: true,
            sortBy: 'level',
            sortOrder: 'desc'
          })
        })
        .expect(200);
      
      const complexQueryTime = performance.now() - complexQueryStart;
      expect(complexQueryTime).toBeLessThan(2000); // Complex query should still be performant
      expect(complexQuery.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('スケーラビリティとボトルネック分析', () => {
    it('Should identify and handle bottlenecks in AI request processing', async () => {
      // Configure AI provider to simulate varying response times
      mockServices.aiProviders.setScenario('variable_performance');
      
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Test AI request queue management
      const aiRequestCount = 30;
      const aiRequests = Array.from({ length: aiRequestCount }, (_, i) => ({
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        requestType: 'character_generation',
        characterBasics: {
          name: `AI Bottleneck Test ${i}`,
          type: 'NPC'
        },
        campaignContext: {
          campaignId: campaign.id
        },
        priority: i < 10 ? 'high' : i < 20 ? 'medium' : 'low'
      }));

      const aiBottleneckStart = performance.now();
      
      // Send all requests concurrently to test queue management
      const aiResponses = await Promise.allSettled(
        aiRequests.map(req =>
          request(app)
            .post('/api/ai-agent/character/generate')
            .send(req)
        )
      );

      const aiProcessingTime = performance.now() - aiBottleneckStart;
      expect(aiProcessingTime).toBeLessThan(45000); // Should handle queue efficiently

      // Analyze response patterns
      const successfulAIResponses = aiResponses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      
      // Should have high success rate even with bottlenecks
      expect(successfulAIResponses.length / aiRequestCount).toBeGreaterThan(0.8);

      // Verify priority queue functionality
      const highPriorityTimes: number[] = [];
      const lowPriorityTimes: number[] = [];

      successfulAIResponses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          const metadata = response.value.body.metadata;
          if (metadata && metadata.queueWaitTime !== undefined) {
            if (index < 10) {
              highPriorityTimes.push(metadata.queueWaitTime);
            } else if (index >= 20) {
              lowPriorityTimes.push(metadata.queueWaitTime);
            }
          }
        }
      });

      // High priority requests should generally have shorter wait times
      if (highPriorityTimes.length > 0 && lowPriorityTimes.length > 0) {
        const avgHighPriorityTime = highPriorityTimes.reduce((a, b) => a + b, 0) / highPriorityTimes.length;
        const avgLowPriorityTime = lowPriorityTimes.reduce((a, b) => a + b, 0) / lowPriorityTimes.length;
        
        expect(avgHighPriorityTime).toBeLessThanOrEqual(avgLowPriorityTime);
      }
    });

    it('Should maintain acceptable response times under increasing load patterns', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Test increasing load pattern
      const loadSteps = [10, 25, 50, 75, 100];
      const responseTimeThresholds = [1000, 2000, 4000, 6000, 8000]; // Progressive degradation allowed
      
      for (let step = 0; step < loadSteps.length; step++) {
        const loadSize = loadSteps[step];
        const threshold = responseTimeThresholds[step];
        
        console.log(`Testing load step: ${loadSize} concurrent requests`);
        
        const stepRequests = Array.from({ length: loadSize }, (_, i) => 
          request(app)
            .post('/api/characters')
            .send(TestDataFactory.createTestCharacter(campaign.id, { name: `Load Step ${step}-${i}` }))
        );

        const stepStart = performance.now();
        const stepResponses = await Promise.allSettled(stepRequests);
        const stepTime = performance.now() - stepStart;

        // Response time should degrade gracefully
        expect(stepTime).toBeLessThan(threshold);
        
        // Success rate should remain high
        const successfulStepResponses = stepResponses.filter(r => 
          r.status === 'fulfilled' && r.value.status === 201
        );
        
        const stepSuccessRate = successfulStepResponses.length / loadSize;
        expect(stepSuccessRate).toBeGreaterThan(0.85); // 85% minimum success rate

        console.log(`Step ${step + 1}: ${loadSize} requests in ${stepTime.toFixed(2)}ms, success rate: ${(stepSuccessRate * 100).toFixed(1)}%`);
        
        // Brief pause between load steps
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    });

    it('Should provide performance metrics and monitoring data', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Generate load to collect metrics
      const metricsLoadSize = 50;
      const metricsRequests = Array.from({ length: metricsLoadSize }, (_, i) => {
        const operationType = i % 4;
        
        switch (operationType) {
          case 0:
            return request(app)
              .post('/api/characters')
              .send(TestDataFactory.createTestCharacter(campaign.id, { name: `Metrics Test ${i}` }));
          case 1:
            return request(app)
              .get(`/api/campaigns/${campaign.id}`);
          case 2:
            return request(app)
              .post('/api/locations')
              .send(TestDataFactory.createTestLocation(campaign.id, { name: `Metrics Location ${i}` }));
          case 3:
            return request(app)
              .get(`/api/characters?campaignId=${campaign.id}`);
          default:
            return request(app).get('/api/campaigns');
        }
      });

      await Promise.allSettled(metricsRequests);

      // Get performance metrics
      const metricsResponse = await request(app)
        .get('/api/system/metrics')
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.data.performance).toBeDefined();
      
      const metrics = metricsResponse.body.data.performance;
      expect(metrics.averageResponseTime).toBeDefined();
      expect(metrics.requestCount).toBeGreaterThanOrEqual(metricsLoadSize);
      expect(metrics.errorRate).toBeLessThan(0.1); // Error rate should be low
      expect(metrics.throughput).toBeGreaterThan(0);

      // Test database performance metrics
      expect(metrics.database).toBeDefined();
      expect(metrics.database.averageQueryTime).toBeDefined();
      expect(metrics.database.connectionPoolUsage).toBeDefined();

      // Test memory metrics
      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.heapUsed).toBeGreaterThan(0);
      expect(metrics.memory.heapTotal).toBeGreaterThan(0);
    });
  });
});

// Helper function to set up performance indexes
function setupPerformanceIndexes(db: DatabaseType): void {
  // Character indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_characters_campaign_id ON characters(campaign_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_characters_type ON characters(type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_characters_campaign_type ON characters(campaign_id, type)`);

  // Location indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_locations_campaign_id ON locations(campaign_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_location_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(location_type)`);

  // Session indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_campaign_id ON sessions(campaign_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at)`);

  // Campaign indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_campaigns_gm_id ON campaigns(gm_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at)`);
}