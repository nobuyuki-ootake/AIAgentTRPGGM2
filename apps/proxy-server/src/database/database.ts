import * as Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import { DatabaseError } from '../middleware/errorHandler';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'trpg.db');
const DB_DIR = path.dirname(DB_PATH);

let db: Database.Database | null = null;

export async function initializeDatabase(): Promise<void> {
  try {
    // データベースディレクトリを作成
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
      logger.info(`Created database directory: ${DB_DIR}`);
    }

    // データベース接続
    db = new (Database as any)(DB_PATH);
    logger.info(`Connected to database: ${DB_PATH}`);

    // WALモードを有効化（Litestreamとの互換性）
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
    db.exec('PRAGMA temp_store = memory;');
    db.exec('PRAGMA mmap_size = 268435456;'); // 256MB

    // データベーススキーマの作成
    await createTables();
    
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    logger.error('Error details:', JSON.stringify(error));
    throw new DatabaseError('Failed to initialize database', { error });
  }
}

async function createTables(): Promise<void> {
  if (!db) throw new DatabaseError('Database not initialized');

  const tables = [
    // キャンペーンテーブル
    `CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      settings TEXT NOT NULL, -- JSON
      status TEXT NOT NULL,
      current_level INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      expected_duration INTEGER,
      goals TEXT, -- JSON
      characters TEXT, -- JSON array of IDs
      quests TEXT, -- JSON array of IDs
      events TEXT, -- JSON array of IDs
      sessions TEXT, -- JSON array of IDs
      locations TEXT, -- JSON array
      factions TEXT, -- JSON array
      notes TEXT, -- JSON
      ai_content TEXT, -- JSON
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_played_at TEXT,
      total_play_time INTEGER DEFAULT 0
    )`,

    // キャラクターテーブル
    `CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      character_type TEXT NOT NULL,
      description TEXT,
      age INTEGER,
      race TEXT,
      class TEXT,
      level INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      base_stats TEXT NOT NULL,
      derived_stats TEXT NOT NULL,
      skills TEXT,
      feats TEXT,
      equipment TEXT,
      status_effects TEXT,
      appearance TEXT,
      background TEXT,
      character_data TEXT,
      current_location_id TEXT,
      location_history TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE,
      FOREIGN KEY (current_location_id) REFERENCES locations (id) ON DELETE SET NULL
    )`,

    // クエストテーブル
    `CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      objectives TEXT, -- JSON array
      prerequisites TEXT, -- JSON array
      followups TEXT, -- JSON array
      rewards TEXT, -- JSON
      time_limit TEXT,
      estimated_duration INTEGER,
      giver TEXT, -- NPC ID
      location TEXT,
      level INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
    )`,

    // イベントテーブル
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      duration INTEGER,
      actual_start_time TEXT,
      actual_end_time TEXT,
      quest_id TEXT,
      location_id TEXT, -- 場所ID
      participants TEXT, -- JSON array
      difficulty TEXT,
      challenge_rating REAL,
      outcomes TEXT, -- JSON
      ai_generated INTEGER DEFAULT 0,
      seed_prompt TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE,
      FOREIGN KEY (quest_id) REFERENCES quests (id) ON DELETE SET NULL,
      FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE SET NULL
    )`,

    // セッションテーブル
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      session_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      mode TEXT,
      participants TEXT, -- JSON array
      gamemaster TEXT,
      start_time TEXT,
      end_time TEXT,
      breaks TEXT, -- JSON array
      current_event TEXT,
      event_queue TEXT, -- JSON array
      completed_events TEXT, -- JSON array
      combat TEXT, -- JSON (combat state)
      chat_log TEXT, -- JSON array
      dice_rolls TEXT, -- JSON array
      notes TEXT, -- JSON
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
    )`,

    // AIリクエストログテーブル
    `CREATE TABLE IF NOT EXISTS ai_requests (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt TEXT NOT NULL,
      context TEXT, -- JSON
      response TEXT,
      tokens_used INTEGER,
      processing_time INTEGER,
      error TEXT,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE SET NULL
    )`,

    // システム設定テーブル
    `CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    // AI行動ログテーブル
    `CREATE TABLE IF NOT EXISTS ai_actions (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      subtype TEXT,
      details TEXT NOT NULL, -- JSON
      context TEXT NOT NULL, -- JSON
      ai_decision TEXT NOT NULL, -- JSON
      timestamp TEXT NOT NULL,
      executed_at TEXT,
      duration INTEGER,
      success INTEGER DEFAULT 0,
      feedback_rating INTEGER,
      feedback_comment TEXT,
      FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )`,

    // AI行動パターンテーブル
    `CREATE TABLE IF NOT EXISTS ai_behavior_patterns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      character_types TEXT NOT NULL, -- JSON array
      session_modes TEXT NOT NULL, -- JSON array
      conditions TEXT NOT NULL, -- JSON
      behavior_rules TEXT NOT NULL, -- JSON
      active INTEGER DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      success_rate REAL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    // AIセッション制御テーブル
    `CREATE TABLE IF NOT EXISTS ai_session_controllers (
      session_id TEXT PRIMARY KEY,
      settings TEXT NOT NULL, -- JSON
      character_controllers TEXT NOT NULL, -- JSON
      progression_control TEXT NOT NULL, -- JSON
      performance_metrics TEXT NOT NULL, -- JSON
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )`,

    // AIキャラクター制御状態テーブル
    `CREATE TABLE IF NOT EXISTS ai_character_controllers (
      character_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      settings TEXT NOT NULL, -- JSON
      active_patterns TEXT NOT NULL, -- JSON array
      learning_data TEXT NOT NULL, -- JSON
      current_state TEXT NOT NULL, -- JSON
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )`,

    // 場所テーブル
    `CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      parent_location_id TEXT,
      child_location_ids TEXT NOT NULL, -- JSON array
      coordinates TEXT, -- JSON
      connections TEXT NOT NULL, -- JSON array
      environment TEXT NOT NULL, -- JSON
      present_entities TEXT NOT NULL, -- JSON
      access TEXT NOT NULL, -- JSON
      properties TEXT NOT NULL, -- JSON
      discovery TEXT NOT NULL, -- JSON
      gameplay TEXT NOT NULL, -- JSON
      ai_data TEXT, -- JSON
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_visited TEXT,
      visit_count INTEGER DEFAULT 0,
      FOREIGN KEY (parent_location_id) REFERENCES locations (id) ON DELETE SET NULL
    )`,

    // 場所移動テーブル
    `CREATE TABLE IF NOT EXISTS location_movements (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      from_location_id TEXT NOT NULL,
      to_location_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      estimated_duration INTEGER NOT NULL,
      actual_duration INTEGER,
      movement_type TEXT NOT NULL,
      transport_method TEXT,
      status TEXT NOT NULL,
      interruption TEXT, -- JSON
      travel_events TEXT NOT NULL, -- JSON array
      costs TEXT NOT NULL, -- JSON
      companions TEXT NOT NULL, -- JSON array
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
      FOREIGN KEY (from_location_id) REFERENCES locations (id) ON DELETE CASCADE,
      FOREIGN KEY (to_location_id) REFERENCES locations (id) ON DELETE CASCADE
    )`,

    // 場所相互作用テーブル
    `CREATE TABLE IF NOT EXISTS location_interactions (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      interaction_type TEXT NOT NULL,
      details TEXT NOT NULL, -- JSON
      context TEXT NOT NULL, -- JSON
      effects TEXT NOT NULL, -- JSON
      timestamp TEXT NOT NULL,
      FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
    )`,

    // キャラクター間会話テーブル
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      participants TEXT NOT NULL, -- JSON array of character IDs
      initiator_id TEXT NOT NULL,
      title TEXT,
      status TEXT NOT NULL, -- 'active', 'paused', 'ended'
      start_time TEXT NOT NULL,
      end_time TEXT,
      conversation_type TEXT NOT NULL, -- 'casual', 'negotiation', etc.
      mood TEXT NOT NULL, -- 'friendly', 'neutral', etc.
      context TEXT NOT NULL, -- JSON
      FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
      FOREIGN KEY (initiator_id) REFERENCES characters (id) ON DELETE CASCADE
    )`,

    // 会話メッセージテーブル
    `CREATE TABLE IF NOT EXISTS conversation_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      speaker_id TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL, -- 'dialogue', 'action', 'thought', 'narration'
      timestamp TEXT NOT NULL,
      emotion TEXT,
      volume TEXT,
      tone TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
      FOREIGN KEY (speaker_id) REFERENCES characters (id) ON DELETE CASCADE
    )`,

    // ターン状態管理テーブル
    `CREATE TABLE IF NOT EXISTS turn_states (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      current_day INTEGER NOT NULL DEFAULT 1,
      max_days INTEGER NOT NULL DEFAULT 30,
      current_phase TEXT NOT NULL DEFAULT 'planning',
      active_character_id TEXT,
      turn_order TEXT NOT NULL DEFAULT '[]', -- JSON array
      phase_start_time TEXT NOT NULL,
      settings TEXT NOT NULL, -- JSON
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE,
      FOREIGN KEY (active_character_id) REFERENCES characters (id)
    )`,

    // ゲーム内日数管理テーブル
    `CREATE TABLE IF NOT EXISTS game_days (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      current_period TEXT NOT NULL,
      remaining_actions INTEGER NOT NULL DEFAULT 0,
      events TEXT NOT NULL DEFAULT '[]', -- JSON array
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
    )`,

    // 日次イベント管理テーブル
    `CREATE TABLE IF NOT EXISTS day_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      game_day_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      period TEXT NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      character_ids TEXT DEFAULT '[]', -- JSON array
      outcome TEXT,
      metadata TEXT DEFAULT '{}', -- JSON
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (game_day_id) REFERENCES game_days (id) ON DELETE CASCADE
    )`,

    // AI マイルストーンテーブル - Phase 1.2実装
    `CREATE TABLE IF NOT EXISTS ai_milestones (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      target_entity_ids TEXT NOT NULL DEFAULT '[]', -- JSON array
      milestone_targets TEXT NOT NULL DEFAULT '[]', -- JSON array  
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER NOT NULL DEFAULT 0,
      required_conditions TEXT NOT NULL DEFAULT '[]',
      reward TEXT NOT NULL DEFAULT '{}',
      player_hints TEXT NOT NULL DEFAULT '[]', -- JSON array
      guidance_messages TEXT NOT NULL DEFAULT '[]', -- JSON array
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )`,

    // AI エンティティプールテーブル - Phase 1.2実装  
    `CREATE TABLE IF NOT EXISTS entity_pools (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      theme_id TEXT NOT NULL,
      pool_type TEXT NOT NULL DEFAULT 'mixed', -- 'core', 'bonus', 'mixed'
      entities TEXT NOT NULL, -- JSON object {core: EntityPool, bonus: EntityPool}
      generated_at TEXT NOT NULL,
      last_updated TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}', -- JSON
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )`,

    // 場所エンティティマッピングテーブル - Phase 1.2実装
    `CREATE TABLE IF NOT EXISTS location_entity_mappings (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      entity_type TEXT NOT NULL, -- 'npc', 'item', 'event', 'quest', 'enemy'
      entity_id TEXT NOT NULL,
      mapping_type TEXT NOT NULL, -- 'permanent', 'temporary', 'dynamic'
      placement_reason TEXT, -- AI決定理由
      accessibility TEXT NOT NULL DEFAULT 'public', -- 'public', 'hidden', 'conditional'
      discovery_conditions TEXT DEFAULT '[]', -- JSON array
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT, -- 一時的配置の場合
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
    )`
  ];

  for (const tableSQL of tables) {
    try {
      db.exec(tableSQL);
      logger.info(`Table created successfully: ${tableSQL.split('(')[0].replace('CREATE TABLE IF NOT EXISTS ', '').trim()}`);
    } catch (error) {
      logger.error(`Failed to create table: ${error}`);
      logger.error(`SQL: ${tableSQL.substring(0, 100)}...`);
      throw error;
    }
  }

  // インデックス作成
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_characters_type ON characters(character_type)',
    'CREATE INDEX IF NOT EXISTS idx_quests_campaign ON quests(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status)',
    'CREATE INDEX IF NOT EXISTS idx_events_campaign ON events(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_scheduled ON events(scheduled_date)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON sessions(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_requests_campaign ON ai_requests(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_requests_created ON ai_requests(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_ai_actions_character ON ai_actions(character_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_actions_session ON ai_actions(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_actions_timestamp ON ai_actions(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_ai_character_controllers_session ON ai_character_controllers(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_behavior_patterns_active ON ai_behavior_patterns(active)',
    'CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type)',
    'CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_location_id)',
    'CREATE INDEX IF NOT EXISTS idx_conversations_location ON conversations(location_id)',
    'CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status)',
    'CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id)',
    'CREATE INDEX IF NOT EXISTS idx_conversation_messages_speaker ON conversation_messages(speaker_id)',
    // AI関連テーブルのインデックス - Phase 1.2実装
    'CREATE INDEX IF NOT EXISTS idx_ai_milestones_campaign ON ai_milestones(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_milestones_session ON ai_milestones(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_milestones_status ON ai_milestones(status)',
    'CREATE INDEX IF NOT EXISTS idx_entity_pools_campaign ON entity_pools(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_entity_pools_session ON entity_pools(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_entity_pools_theme ON entity_pools(theme_id)',
    'CREATE INDEX IF NOT EXISTS idx_location_entity_mappings_campaign ON location_entity_mappings(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_location_entity_mappings_location ON location_entity_mappings(location_id)',
    'CREATE INDEX IF NOT EXISTS idx_location_entity_mappings_entity ON location_entity_mappings(entity_type, entity_id)',
    // 'CREATE INDEX IF NOT EXISTS idx_characters_location ON characters(current_location_id)',
    // 'CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_id)',
    // 'CREATE INDEX IF NOT EXISTS idx_location_movements_character ON location_movements(character_id)',
    // 'CREATE INDEX IF NOT EXISTS idx_location_movements_status ON location_movements(status)',
    // 'CREATE INDEX IF NOT EXISTS idx_location_interactions_location ON location_interactions(location_id)',
    // 'CREATE INDEX IF NOT EXISTS idx_location_interactions_character ON location_interactions(character_id)',
  ];

  for (const indexSQL of indexes) {
    try {
      db.exec(indexSQL);
      logger.info(`Index created successfully: ${indexSQL.split(' ON ')[0].replace('CREATE INDEX IF NOT EXISTS ', '').trim()}`);
    } catch (error) {
      logger.error(`Failed to create index: ${error}`);
      logger.error(`SQL: ${indexSQL}`);
      throw error;
    }
  }

  logger.info('Database tables and indexes created successfully');
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new DatabaseError('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// Export database instance for service files
export const database = {
  prepare: (sql: string) => getDatabase().prepare(sql),
  exec: (sql: string) => getDatabase().exec(sql),
  transaction: (fn: (db: Database.Database) => any) => getDatabase().transaction(fn),
};

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

// データベーストランザクション用ヘルパー
export function withTransaction<T>(
  callback: (db: Database.Database) => T
): T {
  const database = getDatabase();
  const transaction = database.transaction(callback);
  return transaction(database);
}