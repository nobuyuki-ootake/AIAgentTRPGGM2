/**
 * Test Database Utilities - In-Memory SQLite for Testing
 * Provides isolated database instances for each test suite
 */

import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { 
  TRPGCampaign, 
  TRPGCharacter, 
  TRPGSession, 
  Quest, 
  Location,
  AIGameContext 
} from '@ai-agent-trpg/types';

/**
 * Database schema for testing
 * Matches the production database structure
 */
const TEST_SCHEMA = `
  -- Campaigns table
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planning',
    gm_id TEXT,
    settings TEXT, -- JSON
    scenario_description TEXT,
    scenario_summary TEXT,
    base_scenario_illustration TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    last_modified_by TEXT
  );

  -- Characters table
  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'PC', 'NPC', 'Enemy'
    description TEXT,
    stats TEXT, -- JSON
    status TEXT NOT NULL DEFAULT 'active',
    player_id TEXT,
    portrait_url TEXT,
    ai_personality TEXT, -- JSON
    location_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  -- Sessions table
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned',
    start_time DATETIME,
    end_time DATETIME,
    session_data TEXT, -- JSON
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  -- Locations table
  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    parent_location_id TEXT,
    connections TEXT, -- JSON array of location IDs
    properties TEXT, -- JSON
    illustration_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_location_id) REFERENCES locations(id) ON DELETE SET NULL
  );

  -- Quests table
  CREATE TABLE IF NOT EXISTS quests (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    priority INTEGER DEFAULT 1,
    requirements TEXT, -- JSON
    rewards TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  -- AI Context table for game state
  CREATE TABLE IF NOT EXISTS ai_game_context (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    session_id TEXT,
    context_type TEXT NOT NULL,
    context_data TEXT NOT NULL, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  -- Milestones table
  CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'not_reached',
    conditions TEXT, -- JSON
    rewards TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  -- Entity relationships for AI system
  CREATE TABLE IF NOT EXISTS entity_relationships (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    relationship_data TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );
`;

/**
 * Test Database Manager
 */
export class TestDatabase {
  private static instance: TestDatabase;
  private databases: Map<string, DatabaseType> = new Map();

  constructor() {
    if (TestDatabase.instance) {
      return TestDatabase.instance;
    }
    TestDatabase.instance = this;
  }

  /**
   * Create a new in-memory test database
   */
  createTestDatabase(dbId?: string): DatabaseType {
    const id = dbId || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create in-memory SQLite database
    const db = new Database(':memory:', { verbose: undefined });
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create schema
    db.exec(TEST_SCHEMA);
    
    // Store reference
    this.databases.set(id, db);
    
    return db;
  }

  /**
   * Reset database to clean state
   */
  resetDatabase(db: DatabaseType): void {
    // Drop all data but keep schema
    const tables = [
      'entity_relationships',
      'milestones', 
      'ai_game_context',
      'quests',
      'locations',
      'sessions',
      'characters',
      'campaigns'
    ];
    
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  }

  /**
   * Close database connection
   */
  closeDatabase(dbId: string): void {
    const db = this.databases.get(dbId);
    if (db) {
      db.close();
      this.databases.delete(dbId);
    }
  }

  /**
   * Close all test databases
   */
  closeAllDatabases(): void {
    for (const [id, db] of this.databases.entries()) {
      db.close();
    }
    this.databases.clear();
  }
}

/**
 * Test Data Factory using production types
 */
export class TestDataFactory {
  /**
   * Create a test TRPG campaign using production types
   */
  static createTestCampaign(overrides: Partial<TRPGCampaign> = {}): TRPGCampaign {
    const baseId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    return {
      id: baseId,
      name: 'Test Campaign',
      description: 'A test campaign for unit testing',
      status: 'planning',
      gmId: 'test_gm_id',
      settings: {
        systemType: 'custom',
        difficulty: 'normal',
        playerCount: 4
      },
      scenarioDescription: 'Test scenario description',
      scenarioSummary: 'Test scenario summary',
      baseScenarioIllustration: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      lastModifiedBy: 'test_user',
      ...overrides
    };
  }

  /**
   * Create a test TRPG character using production types
   */
  static createTestCharacter(campaignId: string, overrides: Partial<TRPGCharacter> = {}): TRPGCharacter {
    const baseId = `character_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    return {
      id: baseId,
      campaignId,
      name: 'Test Character',
      type: 'PC',
      description: 'A test character for unit testing',
      stats: {
        level: 1,
        hp: 100,
        mp: 50,
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
      },
      status: 'active',
      playerId: 'test_player_id',
      portraitUrl: null,
      aiPersonality: null,
      locationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      ...overrides
    };
  }

  /**
   * Create a test TRPG session using production types
   */
  static createTestSession(campaignId: string, overrides: Partial<TRPGSession> = {}): TRPGSession {
    const baseId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    return {
      id: baseId,
      campaignId,
      name: 'Test Session',
      status: 'planned',
      startTime: null,
      endTime: null,
      sessionData: {
        timeline: [],
        currentTimeSlot: 0,
        sessionType: 'main'
      },
      notes: 'Test session notes',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      ...overrides
    };
  }

  /**
   * Create a test location using production types
   */
  static createTestLocation(campaignId: string, overrides: Partial<Location> = {}): Location {
    const baseId = `location_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    return {
      id: baseId,
      campaignId,
      name: 'Test Location',
      description: 'A test location for unit testing',
      type: 'town',
      parentLocationId: null,
      connections: [],
      properties: {},
      illustrationUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      ...overrides
    };
  }

  /**
   * Create a test quest using production types
   */
  static createTestQuest(campaignId: string, overrides: Partial<Quest> = {}): Quest {
    const baseId = `quest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    return {
      id: baseId,
      campaignId,
      title: 'Test Quest',
      description: 'A test quest for unit testing',
      status: 'not_started',
      priority: 1,
      requirements: [],
      rewards: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      ...overrides
    };
  }

  /**
   * Create test AI game context using production types
   */
  static createTestAIGameContext(campaignId: string, overrides: Partial<AIGameContext> = {}): AIGameContext {
    return {
      campaignId,
      currentSession: null,
      activeCharacters: [],
      currentLocation: null,
      gameState: 'exploration',
      contextHistory: [],
      lastUpdate: new Date(),
      ...overrides
    };
  }
}

// Export singleton instance
export const testDatabase = new TestDatabase();