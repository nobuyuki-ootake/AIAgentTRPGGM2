/**
 * AI Character Generation Integration Tests
 * Testing AI-powered character generation endpoints with full request/response cycles
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { Database as DatabaseType } from 'better-sqlite3';
import { TRPGCampaign, TRPGCharacter, APIResponse } from '@ai-agent-trpg/types';
import { aiCharacterGenerationRouter } from '../../routes/aiCharacterGeneration';
import { errorHandler } from '../../middleware/errorHandler';
import { fullIntegrationMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('AI Character Generation Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let mockServices: MockServerServices;
  let testCampaign: TRPGCampaign;

  beforeAll(async () => {
    // Set up test database
    db = testDatabase.createTestDatabase();
    
    // Mock the database service
    jest.mock('../../database/database', () => ({
      getDatabase: () => db
    }));

    // Set up express app
    app = express();
    app.use(express.json());
    app.use('/api/ai-character-generation', aiCharacterGenerationRouter);
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
    // Reset database and mock services
    testDatabase.resetDatabase(db);
    await mockServices.reset();
    
    // Create test campaign
    testCampaign = TestDataFactory.createTestCampaign({
      name: 'Character Generation Test Campaign',
      scenarioDescription: 'A fantasy campaign for testing character generation'
    });
    insertCampaignToDb(db, testCampaign);
  });

  describe('POST /api/ai-character-generation/generate-pc - PCキャラクター生成', () => {
    it('戦士系PCキャラクターを完全生成する', async () => {
      // Arrange
      const pcRequest = {
        campaignId: testCampaign.id,
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        characterConcept: {
          name: 'Theron Ironshield',
          class: 'Fighter',
          race: 'Human',
          background: 'Soldier',
          level: 3
        },
        playerPreferences: {
          playstyle: 'tank',
          personality: 'brave but reckless',
          backstory: 'former city guard seeking redemption'
        },
        campaignContext: {
          setting: 'medieval fantasy',
          powerLevel: 'heroic',
          groupRole: 'frontline fighter'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-pc')
        .send(pcRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Theron Ironshield');
      expect(body.data.type).toBe('PC');
      expect(body.data.campaignId).toBe(testCampaign.id);
      expect(body.data.stats).toBeDefined();
      expect(body.data.stats.level).toBe(3);
      expect(body.data.description).toContain('soldier');
    });

    it('魔法使い系PCキャラクターを詳細設定付きで生成する', async () => {
      // Arrange
      const wizardRequest = {
        campaignId: testCampaign.id,
        provider: 'anthropic',
        apiKey: 'test-api-key',
        model: 'claude-3-opus',
        characterConcept: {
          name: 'Lyra Starweaver',
          class: 'Wizard',
          race: 'Elf',
          background: 'Scholar',
          level: 5
        },
        playerPreferences: {
          playstyle: 'support',
          personality: 'curious and analytical',
          favoriteSchools: ['Divination', 'Enchantment']
        },
        campaignContext: {
          setting: 'high fantasy',
          magicLevel: 'high',
          groupRole: 'spellcaster'
        },
        detailedGeneration: true
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-pc')
        .send(wizardRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Lyra Starweaver');
      expect(body.data.stats.level).toBe(5);
      expect(body.data.stats.mp).toBeGreaterThan(body.data.stats.hp); // Wizard should have more MP
      expect(body.data.description).toContain('scholar');
      expect(body.data.equipment).toBeDefined();
      expect(body.data.spells).toBeDefined();
    });

    it('カスタム種族のPCキャラクターを生成する', async () => {
      // Arrange
      const customRaceRequest = {
        campaignId: testCampaign.id,
        provider: 'google',
        apiKey: 'test-api-key',
        characterConcept: {
          name: 'Zix Shadowclaw',
          class: 'Rogue',
          race: 'Dragonborn',
          background: 'Criminal',
          level: 2
        },
        playerPreferences: {
          playstyle: 'stealth',
          personality: 'sly and opportunistic'
        },
        raceTraits: {
          breathWeapon: 'acid',
          damageResistance: 'acid',
          culturalBackground: 'urban underground'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-pc')
        .send(customRaceRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Zix Shadowclaw');
      expect(body.data.stats.dexterity).toBeGreaterThan(body.data.stats.strength); // Rogue stats
      expect(body.data.description).toContain('dragonborn');
      expect(body.data.racialTraits).toContain('breath weapon');
    });

    it('必須フィールドが欠けている場合バリデーションエラーを返す', async () => {
      // Arrange
      const invalidRequest = {
        campaignId: testCampaign.id,
        // Missing provider, characterConcept
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-pc')
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/ai-character-generation/generate-npc - NPCキャラクター生成', () => {
    it('村人NPCを社交用に生成する', async () => {
      // Arrange
      const villagerRequest = {
        campaignId: testCampaign.id,
        provider: 'openai',
        apiKey: 'test-api-key',
        npcType: 'social',
        role: 'shopkeeper',
        location: 'village marketplace',
        purpose: 'provide information and services',
        interactionLevel: 'frequent',
        characterTraits: {
          personality: ['helpful', 'gossipy', 'greedy'],
          appearance: 'middle-aged human with calloused hands',
          quirks: ['always counts coins twice', 'knows everyone\'s business']
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-npc')
        .send(villagerRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.type).toBe('NPC');
      expect(body.data.aiPersonality).toBeDefined();
      expect(body.data.aiPersonality.traits).toContain('helpful');
      expect(body.data.aiPersonality.speechPattern).toBeDefined();
      expect(body.data.description).toContain('shopkeeper');
    });

    it('重要NPCを詳細な背景付きで生成する', async () => {
      // Arrange
      const importantNpcRequest = {
        campaignId: testCampaign.id,
        provider: 'anthropic',
        apiKey: 'test-api-key',
        npcType: 'story_important',
        role: 'guild_master',
        location: 'adventurers guild',
        purpose: 'quest giver and mentor',
        importance: 'major',
        characterTraits: {
          personality: ['wise', 'stern', 'protective'],
          background: 'former legendary adventurer',
          secrets: ['knows the true location of the ancient artifact'],
          relationships: {
            'local_nobles': 'respected',
            'criminal_underground': 'feared'
          }
        },
        detailedGeneration: true
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-npc')
        .send(importantNpcRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.aiPersonality.goals).toBeDefined();
      expect(body.data.aiPersonality.secrets).toBeDefined();
      expect(body.data.relationships).toBeDefined();
      expect(body.data.backstory).toContain('legendary adventurer');
    });

    it('敵対NPCを戦術的特性付きで生成する', async () => {
      // Arrange
      const antagonistRequest = {
        campaignId: testCampaign.id,
        provider: 'google',
        apiKey: 'test-api-key',
        npcType: 'antagonist',
        role: 'bandit_leader',
        location: 'forest hideout',
        purpose: 'recurring villain',
        threatLevel: 'moderate',
        characterTraits: {
          personality: ['cunning', 'cruel', 'charismatic'],
          motivations: ['wealth', 'power', 'revenge against nobility'],
          tactics: ['ambush', 'intimidation', 'divide and conquer']
        },
        combatRole: 'leader'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-npc')
        .send(antagonistRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.aiPersonality.tactics).toBeDefined();
      expect(body.data.stats.leadership).toBeDefined();
      expect(body.data.description).toContain('bandit');
    });
  });

  describe('POST /api/ai-character-generation/generate-enemy - 敵キャラクター生成', () => {
    it('低レベル敵を単体戦闘用に生成する', async () => {
      // Arrange
      const basicEnemyRequest = {
        campaignId: testCampaign.id,
        provider: 'openai',
        apiKey: 'test-api-key',
        enemyType: 'monster',
        challengeRating: 1,
        encounterRole: 'minion',
        environment: 'forest',
        behaviorPattern: 'aggressive',
        characterTraits: {
          species: 'goblin',
          size: 'small',
          intelligence: 'low',
          specialAbilities: ['pack tactics']
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-enemy')
        .send(basicEnemyRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.type).toBe('Enemy');
      expect(body.data.stats.challengeRating).toBe(1);
      expect(body.data.combatTactics).toBeDefined();
      expect(body.data.description).toContain('goblin');
    });

    it('ボス敵を複雑な能力付きで生成する', async () => {
      // Arrange
      const bossEnemyRequest = {
        campaignId: testCampaign.id,
        provider: 'anthropic',
        apiKey: 'test-api-key',
        enemyType: 'boss',
        challengeRating: 8,
        encounterRole: 'solo_boss',
        environment: 'ancient_temple',
        behaviorPattern: 'tactical',
        characterTraits: {
          species: 'lich',
          size: 'medium',
          intelligence: 'genius',
          specialAbilities: [
            'spellcasting',
            'legendary_actions',
            'phylactery_protection'
          ]
        },
        phaseSystem: {
          phases: 3,
          triggers: ['75% health', '50% health', '25% health'],
          escalation: 'abilities and tactics become more desperate'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-enemy')
        .send(bossEnemyRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.stats.challengeRating).toBe(8);
      expect(body.data.legendaryActions).toBeDefined();
      expect(body.data.phaseAbilities).toBeDefined();
      expect(body.data.spells).toBeDefined();
      expect(body.data.description).toContain('lich');
    });

    it('群れ敵を連携戦術付きで生成する', async () => {
      // Arrange
      const swarmEnemyRequest = {
        campaignId: testCampaign.id,
        provider: 'google',
        apiKey: 'test-api-key',
        enemyType: 'swarm',
        challengeRating: 3,
        encounterRole: 'crowd_control',
        environment: 'underground_cavern',
        behaviorPattern: 'coordinated',
        swarmProperties: {
          individualCR: 0.25,
          swarmSize: 12,
          coordination: 'high',
          specialTactics: ['surround', 'overwhelm', 'retreat_when_isolated']
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-enemy')
        .send(swarmEnemyRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.swarmTactics).toBeDefined();
      expect(body.data.groupBehavior).toBeDefined();
      expect(body.data.stats.numbers).toBe(12);
    });
  });

  describe('POST /api/ai-character-generation/enhance-existing - 既存キャラクター強化', () => {
    it('既存PCキャラクターのAI特性を追加する', async () => {
      // Arrange
      const existingPC = TestDataFactory.createTestCharacter(testCampaign.id, {
        name: 'Basic Fighter',
        type: 'PC',
        description: 'A simple fighter character'
      });
      insertCharacterToDb(db, existingPC);

      const enhanceRequest = {
        campaignId: testCampaign.id,
        characterId: existingPC.id,
        provider: 'openai',
        apiKey: 'test-api-key',
        enhancementType: 'add_personality',
        playerInput: {
          personality: 'brave but inexperienced',
          backstory: 'farm boy who left home to become a hero',
          goals: 'prove himself worthy of his fathers legacy'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/enhance-existing')
        .send(enhanceRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(existingPC.id);
      expect(body.data.backstory).toContain('farm boy');
      expect(body.data.personalityTraits).toBeDefined();
    });

    it('NPCキャラクターの関係性情報を拡張する', async () => {
      // Arrange
      const existingNPC = TestDataFactory.createTestCharacter(testCampaign.id, {
        name: 'Village Elder',
        type: 'NPC',
        description: 'An old man who leads the village'
      });
      insertCharacterToDb(db, existingNPC);

      const relationshipRequest = {
        campaignId: testCampaign.id,
        characterId: existingNPC.id,
        provider: 'anthropic',
        apiKey: 'test-api-key',
        enhancementType: 'expand_relationships',
        context: {
          newRelationships: [
            { character: 'village_blacksmith', relationship: 'old_friend' },
            { character: 'local_noble', relationship: 'respectful_distance' }
          ],
          socialPosition: 'respected community leader'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/enhance-existing')
        .send(relationshipRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter>;
      expect(body.success).toBe(true);
      expect(body.data.relationships).toBeDefined();
      expect(body.data.socialConnections).toBeDefined();
    });
  });

  describe('POST /api/ai-character-generation/batch-generate - バッチ生成', () => {
    it('複数キャラクターを一度に生成する', async () => {
      // Arrange
      const batchRequest = {
        campaignId: testCampaign.id,
        provider: 'openai',
        apiKey: 'test-api-key',
        characters: [
          {
            type: 'NPC',
            role: 'tavern_owner',
            importance: 'minor'
          },
          {
            type: 'NPC', 
            role: 'merchant',
            importance: 'minor'
          },
          {
            type: 'Enemy',
            challengeRating: 2,
            encounterRole: 'guard'
          }
        ],
        theme: 'frontier_town',
        context: {
          location: 'border settlement',
          atmosphere: 'rough but friendly'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/batch-generate')
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      const body = response.body as APIResponse<TRPGCharacter[]>;
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
      expect(body.data[0].type).toBe('NPC');
      expect(body.data[1].type).toBe('NPC');
      expect(body.data[2].type).toBe('Enemy');
    });
  });

  describe('エラーハンドリングとエッジケース', () => {
    it('AIサービスエラー時に適切なエラーハンドリングを行う', async () => {
      // Arrange
      mockServices.aiProviders.setScenario('api_error');
      const request_data = {
        campaignId: testCampaign.id,
        provider: 'openai',
        apiKey: 'test-api-key',
        characterConcept: {
          name: 'Test Character',
          class: 'Fighter'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-pc')
        .send(request_data)
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AI_SERVICE_ERROR');
    });

    it('レート制限エラーを適切に処理する', async () => {
      // Arrange
      mockServices.aiProviders.setScenario('rate_limit');
      const request_data = {
        campaignId: testCampaign.id,
        provider: 'openai',
        apiKey: 'test-api-key',
        npcType: 'social',
        role: 'shopkeeper'
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-npc')
        .send(request_data)
        .expect('Content-Type', /json/)
        .expect(429);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.details).toContain('rate limit');
    });

    it('存在しないキャンペーンIDでエラーを返す', async () => {
      // Arrange
      const invalidRequest = {
        campaignId: 'non-existent-campaign',
        provider: 'openai',
        apiKey: 'test-api-key',
        characterConcept: {
          name: 'Test',
          class: 'Fighter'
        }
      };

      // Act
      const response = await request(app)
        .post('/api/ai-character-generation/generate-pc')
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('CAMPAIGN_NOT_FOUND');
    });
  });
});

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