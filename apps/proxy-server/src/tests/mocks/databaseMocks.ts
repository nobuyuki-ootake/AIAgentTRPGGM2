// ==========================================
// データベースモッククラス群
// better-sqlite3 と Litestream のモック
// 参照整合性を維持したテストデータ管理
// ==========================================

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { 
  TRPGCampaign, 
  TRPGCharacter, 
  TRPGSession, 
  TRPGEvent, 
  Quest, 
  Location,
  AIRequest
} from '@ai-agent-trpg/types';

// ==========================================
// 型定義
// ==========================================

export interface MockDatabaseOptions {
  inMemory?: boolean;
  autoCommit?: boolean;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
  simulateLatency?: number;
  simulateErrors?: boolean;
  errorRate?: number;
}

export interface MockQueryResult {
  changes: number;
  lastInsertRowid: number;
}

export interface MockStatement {
  all<T = any>(...params: any[]): T[];
  get<T = any>(...params: any[]): T | undefined;
  run(...params: any[]): MockQueryResult;
  pluck(): MockStatement;
  bind(...params: any[]): MockStatement;
}

// ==========================================
// インメモリデータストレージ
// ==========================================

class MockDataStore {
  private tables: Map<string, Map<string, any>> = new Map();
  private sequences: Map<string, number> = new Map();
  private foreignKeys: Map<string, { table: string; column: string; references: { table: string; column: string } }[]> = new Map();

  constructor() {
    this.initializeTables();
    this.setupForeignKeys();
  }

  private initializeTables(): void {
    // メインテーブル
    this.tables.set('campaigns', new Map());
    this.tables.set('characters', new Map());
    this.tables.set('sessions', new Map());
    this.tables.set('events', new Map());
    this.tables.set('quests', new Map());
    this.tables.set('locations', new Map());
    this.tables.set('ai_requests', new Map());
    
    // 関係テーブル
    this.tables.set('campaign_characters', new Map());
    this.tables.set('session_participants', new Map());
    this.tables.set('character_events', new Map());
    this.tables.set('location_entities', new Map());
    this.tables.set('milestone_progress', new Map());
    
    // 初期シーケンス値
    this.sequences.set('campaigns', 1);
    this.sequences.set('characters', 1);
    this.sequences.set('sessions', 1);
    this.sequences.set('events', 1);
    this.sequences.set('quests', 1);
    this.sequences.set('locations', 1);
    this.sequences.set('ai_requests', 1);
  }

  private setupForeignKeys(): void {
    // 外部キー制約の定義
    this.foreignKeys.set('characters', [
      { table: 'characters', column: 'campaign_id', references: { table: 'campaigns', column: 'id' } }
    ]);
    
    this.foreignKeys.set('sessions', [
      { table: 'sessions', column: 'campaign_id', references: { table: 'campaigns', column: 'id' } }
    ]);
    
    this.foreignKeys.set('events', [
      { table: 'events', column: 'session_id', references: { table: 'sessions', column: 'id' } }
    ]);
    
    this.foreignKeys.set('quests', [
      { table: 'quests', column: 'campaign_id', references: { table: 'campaigns', column: 'id' } }
    ]);
    
    this.foreignKeys.set('locations', [
      { table: 'locations', column: 'campaign_id', references: { table: 'campaigns', column: 'id' } }
    ]);
  }

  getTable(tableName: string): Map<string, any> {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table ${tableName} does not exist`);
    }
    return table;
  }

  getNextId(tableName: string): number {
    const current = this.sequences.get(tableName) || 1;
    this.sequences.set(tableName, current + 1);
    return current;
  }

  validateForeignKeys(tableName: string, data: any): void {
    const constraints = this.foreignKeys.get(tableName);
    if (!constraints) return;

    for (const constraint of constraints) {
      const value = data[constraint.column];
      if (value !== null && value !== undefined) {
        const referencedTable = this.getTable(constraint.references.table);
        const referencedRow = Array.from(referencedTable.values())
          .find(row => row[constraint.references.column] === value);
        
        if (!referencedRow) {
          throw new Error(
            `Foreign key constraint violation: ${constraint.table}.${constraint.column} references non-existent ${constraint.references.table}.${constraint.references.column} = ${value}`
          );
        }
      }
    }
  }

  insert(tableName: string, data: any): number {
    this.validateForeignKeys(tableName, data);
    
    const table = this.getTable(tableName);
    const id = data.id || this.getNextId(tableName);
    const row = { ...data, id };
    
    table.set(id.toString(), row);
    return id;
  }

  update(tableName: string, id: string, data: any): number {
    this.validateForeignKeys(tableName, data);
    
    const table = this.getTable(tableName);
    const existing = table.get(id);
    
    if (!existing) {
      return 0; // No rows affected
    }
    
    const updated = { ...existing, ...data };
    table.set(id, updated);
    return 1; // One row affected
  }

  delete(tableName: string, id: string): number {
    const table = this.getTable(tableName);
    const existed = table.has(id);
    table.delete(id);
    return existed ? 1 : 0;
  }

  select(tableName: string, conditions: any = {}): any[] {
    const table = this.getTable(tableName);
    let results = Array.from(table.values());
    
    // 条件でフィルタリング
    Object.keys(conditions).forEach(key => {
      const value = conditions[key];
      results = results.filter(row => row[key] === value);
    });
    
    return results;
  }

  clear(): void {
    this.tables.forEach(table => table.clear());
    this.sequences.clear();
    this.initializeTables();
  }
}

// ==========================================
// MockStatement クラス
// ==========================================

class MockStatementImpl implements MockStatement {
  private boundParams: any[] = [];
  private isPlucked: boolean = false;

  constructor(
    private sql: string,
    private dataStore: MockDataStore,
    private options: MockDatabaseOptions
  ) {}

  all<T = any>(...params: any[]): T[] {
    const allParams = [...this.boundParams, ...params];
    return this.executeQuery(allParams) as T[];
  }

  get<T = any>(...params: any[]): T | undefined {
    const allParams = [...this.boundParams, ...params];
    const results = this.executeQuery(allParams);
    return results[0] as T | undefined;
  }

  run(...params: any[]): MockQueryResult {
    const allParams = [...this.boundParams, ...params];
    return this.executeUpdate(allParams);
  }

  pluck(): MockStatement {
    this.isPlucked = true;
    return this;
  }

  bind(...params: any[]): MockStatement {
    this.boundParams.push(...params);
    return this;
  }

  private async simulateLatency(): Promise<void> {
    if (this.options.simulateLatency && this.options.simulateLatency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.options.simulateLatency));
    }
  }

  private simulateError(): void {
    if (this.options.simulateErrors) {
      const errorRate = this.options.errorRate || 0.05;
      if (Math.random() < errorRate) {
        throw new Error(`Simulated database error for query: ${this.sql.substring(0, 50)}...`);
      }
    }
  }

  private executeQuery(params: any[]): any[] {
    this.simulateError();

    // 簡単なSQL解析（実際のSQLパーサーの代替）
    const sql = this.sql.toLowerCase().trim();
    
    // SELECT文の処理
    if (sql.startsWith('select')) {
      return this.handleSelect(params);
    }
    
    return [];
  }

  private executeUpdate(params: any[]): MockQueryResult {
    this.simulateError();

    const sql = this.sql.toLowerCase().trim();
    
    if (sql.startsWith('insert')) {
      return this.handleInsert(params);
    } else if (sql.startsWith('update')) {
      return this.handleUpdate(params);
    } else if (sql.startsWith('delete')) {
      return this.handleDelete(params);
    }
    
    return { changes: 0, lastInsertRowid: 0 };
  }

  private handleSelect(params: any[]): any[] {
    // 基本的なSELECT文の処理（テーブル名を抽出）
    const sql = this.sql.toLowerCase();
    
    // campaigns テーブル
    if (sql.includes('from campaigns')) {
      return this.dataStore.select('campaigns');
    }
    
    // characters テーブル
    if (sql.includes('from characters')) {
      const results = this.dataStore.select('characters');
      if (sql.includes('where campaign_id')) {
        const campaignId = params[0];
        return results.filter(char => char.campaign_id === campaignId);
      }
      return results;
    }
    
    // sessions テーブル
    if (sql.includes('from sessions')) {
      const results = this.dataStore.select('sessions');
      if (sql.includes('where campaign_id')) {
        const campaignId = params[0];
        return results.filter(session => session.campaign_id === campaignId);
      }
      return results;
    }
    
    // events テーブル
    if (sql.includes('from events')) {
      return this.dataStore.select('events');
    }
    
    // ai_requests テーブル
    if (sql.includes('from ai_requests')) {
      return this.dataStore.select('ai_requests');
    }
    
    return [];
  }

  private handleInsert(params: any[]): MockQueryResult {
    const sql = this.sql.toLowerCase();
    
    // テーブル名を抽出
    const tableMatch = sql.match(/insert into (\w+)/);
    if (!tableMatch) {
      throw new Error('Invalid INSERT statement');
    }
    
    const tableName = tableMatch[1];
    
    // カラム名を抽出
    const columnsMatch = sql.match(/\(([^)]+)\)/);
    if (!columnsMatch) {
      throw new Error('Invalid INSERT statement - no columns specified');
    }
    
    const columns = columnsMatch[1].split(',').map(col => col.trim());
    
    // データオブジェクトを構築
    const data: any = {};
    columns.forEach((column, index) => {
      if (params[index] !== undefined) {
        data[column] = params[index];
      }
    });
    
    const id = this.dataStore.insert(tableName, data);
    return { changes: 1, lastInsertRowid: id };
  }

  private handleUpdate(params: any[]): MockQueryResult {
    // UPDATE文の基本的な処理
    return { changes: 1, lastInsertRowid: 0 };
  }

  private handleDelete(params: any[]): MockQueryResult {
    // DELETE文の基本的な処理
    return { changes: 1, lastInsertRowid: 0 };
  }
}

// ==========================================
// MockDatabase クラス
// ==========================================

export class MockDatabase extends EventEmitter {
  private dataStore: MockDataStore;
  private isOpen: boolean = true;
  private options: MockDatabaseOptions;

  constructor(filename?: string, options: MockDatabaseOptions = {}) {
    super();
    this.options = {
      inMemory: true,
      autoCommit: true,
      enableWAL: false,
      enableForeignKeys: true,
      simulateLatency: 0,
      simulateErrors: false,
      errorRate: 0.05,
      ...options
    };
    
    this.dataStore = new MockDataStore();
    logger.debug(`Mock database created: ${filename || ':memory:'}`);
  }

  prepare(sql: string): MockStatement {
    if (!this.isOpen) {
      throw new Error('Database is closed');
    }
    
    return new MockStatementImpl(sql, this.dataStore, this.options);
  }

  exec(sql: string): this {
    if (!this.isOpen) {
      throw new Error('Database is closed');
    }
    
    // PRAGMA文やスキーマ作成文は無視
    logger.debug(`Mock database exec: ${sql.substring(0, 100)}...`);
    return this;
  }

  close(): this {
    this.isOpen = false;
    this.emit('close');
    logger.debug('Mock database closed');
    return this;
  }

  // テストデータセットアップ用のヘルパーメソッド
  seedTestData(): void {
    this.seedCampaigns();
    this.seedCharacters();
    this.seedSessions();
    this.seedEvents();
    this.seedQuests();
    this.seedLocations();
    this.seedAIRequests();
  }

  private seedCampaigns(): void {
    const campaigns: Partial<TRPGCampaign>[] = [
      {
        id: '1',
        name: 'テストキャンペーン1',
        description: 'ファンタジー世界での冒険',
        gameSystem: 'D&D 5e',
        gmId: 'gm1',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '2', 
        name: 'テストキャンペーン2',
        description: 'サイバーパンク世界での調査',
        gameSystem: 'Cyberpunk 2020',
        gmId: 'gm2',
        status: 'planning',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      }
    ];

    campaigns.forEach(campaign => {
      this.dataStore.insert('campaigns', campaign);
    });
  }

  private seedCharacters(): void {
    const characters: Partial<TRPGCharacter>[] = [
      {
        id: '1',
        name: 'エルフの弓使い アリア',
        race: 'エルフ',
        characterClass: 'レンジャー',
        level: 3,
        campaignId: '1',
        characterType: 'PC',
        playerId: 'player1',
        createdAt: '2024-01-01T01:00:00Z',
        updatedAt: '2024-01-01T01:00:00Z'
      },
      {
        id: '2',
        name: 'ドワーフの戦士 グリム',
        race: 'ドワーフ', 
        characterClass: 'ファイター',
        level: 4,
        campaignId: '1',
        characterType: 'PC',
        playerId: 'player2',
        createdAt: '2024-01-01T01:30:00Z',
        updatedAt: '2024-01-01T01:30:00Z'
      },
      {
        id: '3',
        name: '村の長老 ウィズダム',
        race: 'ヒューマン',
        characterClass: 'クレリック',
        level: 8,
        campaignId: '1',
        characterType: 'NPC',
        createdAt: '2024-01-01T02:00:00Z',
        updatedAt: '2024-01-01T02:00:00Z'
      }
    ];

    characters.forEach(character => {
      this.dataStore.insert('characters', character);
    });
  }

  private seedSessions(): void {
    const sessions: Partial<TRPGSession>[] = [
      {
        id: '1',
        campaignId: '1',
        sessionNumber: 1,
        title: '冒険の始まり',
        status: 'completed',
        scheduledStartTime: '2024-01-05T19:00:00Z',
        actualStartTime: '2024-01-05T19:05:00Z',
        actualEndTime: '2024-01-05T22:30:00Z',
        createdAt: '2024-01-05T18:00:00Z',
        updatedAt: '2024-01-05T22:30:00Z'
      },
      {
        id: '2',
        campaignId: '1', 
        sessionNumber: 2,
        title: '古い遺跡の探索',
        status: 'scheduled',
        scheduledStartTime: '2024-01-12T19:00:00Z',
        createdAt: '2024-01-06T10:00:00Z',
        updatedAt: '2024-01-06T10:00:00Z'
      }
    ];

    sessions.forEach(session => {
      this.dataStore.insert('sessions', session);
    });
  }

  private seedEvents(): void {
    const events: Partial<TRPGEvent>[] = [
      {
        id: '1',
        sessionId: '1',
        title: 'ゴブリンとの遭遇',
        description: '森で3匹のゴブリンと遭遇した',
        eventType: 'combat',
        timestamp: '2024-01-05T20:00:00Z',
        createdAt: '2024-01-05T20:00:00Z',
        updatedAt: '2024-01-05T20:15:00Z'
      },
      {
        id: '2',
        sessionId: '1',
        title: '宝箱の発見',
        description: 'ゴブリンの隠れ家で古い宝箱を発見',
        eventType: 'discovery',
        timestamp: '2024-01-05T21:00:00Z',
        createdAt: '2024-01-05T21:00:00Z',
        updatedAt: '2024-01-05T21:00:00Z'
      }
    ];

    events.forEach(event => {
      this.dataStore.insert('events', event);
    });
  }

  private seedQuests(): void {
    const quests: Partial<Quest>[] = [
      {
        id: '1',
        campaignId: '1',
        title: '失われた遺物の探索',
        description: '古代エルフの遺物を見つけて村に持ち帰る',
        status: 'active',
        difficulty: 'medium',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-05T22:30:00Z'
      }
    ];

    quests.forEach(quest => {
      this.dataStore.insert('quests', quest);
    });
  }

  private seedLocations(): void {
    const locations: Partial<Location>[] = [
      {
        id: '1',
        campaignId: '1',
        name: 'エルフの村 グリーンリーフ',
        description: '緑豊かな森に囲まれた小さなエルフの村',
        locationType: 'settlement',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        campaignId: '1',
        name: '古代の遺跡',
        description: '森の奥にある謎に満ちた石造りの遺跡',
        locationType: 'dungeon',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ];

    locations.forEach(location => {
      this.dataStore.insert('locations', location);
    });
  }

  private seedAIRequests(): void {
    const aiRequests: Partial<AIRequest>[] = [
      {
        id: '1',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        prompt: 'Generate a fantasy character',
        context: {},
        timestamp: '2024-01-01T10:00:00Z',
        response: 'Generated character data...',
        tokensUsed: 150,
        processingTime: 1200,
        category: 'character_generation'
      }
    ];

    aiRequests.forEach(request => {
      this.dataStore.insert('ai_requests', request);
    });
  }

  // データクリア
  clearAllData(): void {
    this.dataStore.clear();
  }

  // データストアの直接アクセス（テスト用）
  getDataStore(): MockDataStore {
    return this.dataStore;
  }
}

// ==========================================
// データベーステストヘルパー
// ==========================================

export class DatabaseTestHelper {
  private mockDb: MockDatabase;

  constructor(options: MockDatabaseOptions = {}) {
    this.mockDb = new MockDatabase(':memory:', options);
  }

  async setupTestDatabase(): Promise<MockDatabase> {
    this.mockDb.seedTestData();
    return this.mockDb;
  }

  async createTestCampaign(data: Partial<TRPGCampaign> = {}): Promise<TRPGCampaign> {
    const campaign: Partial<TRPGCampaign> = {
      name: 'テストキャンペーン',
      description: 'テスト用のキャンペーン',
      gameSystem: 'D&D 5e',
      gmId: 'test-gm',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };

    const id = this.mockDb.getDataStore().insert('campaigns', campaign);
    return { ...campaign, id: id.toString() } as TRPGCampaign;
  }

  async createTestCharacter(campaignId: string, data: Partial<TRPGCharacter> = {}): Promise<TRPGCharacter> {
    const character: Partial<TRPGCharacter> = {
      name: 'テストキャラクター',
      race: 'ヒューマン',
      characterClass: 'ファイター',
      level: 1,
      campaignId,
      characterType: 'PC',
      playerId: 'test-player',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };

    const id = this.mockDb.getDataStore().insert('characters', character);
    return { ...character, id: id.toString() } as TRPGCharacter;
  }

  async createTestSession(campaignId: string, data: Partial<TRPGSession> = {}): Promise<TRPGSession> {
    const session: Partial<TRPGSession> = {
      campaignId,
      sessionNumber: 1,
      title: 'テストセッション',
      status: 'scheduled',
      scheduledStartTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };

    const id = this.mockDb.getDataStore().insert('sessions', session);
    return { ...session, id: id.toString() } as TRPGSession;
  }

  getDatabase(): MockDatabase {
    return this.mockDb;
  }

  cleanup(): void {
    this.mockDb.close();
  }
}

// ==========================================
// Jest 設定
// ==========================================

export function setupDatabaseMocks(): void {
  // better-sqlite3 モック
  jest.mock('better-sqlite3', () => {
    return {
      __esModule: true,
      default: jest.fn().mockImplementation((filename, options) => {
        return new MockDatabase(filename, options);
      })
    };
  });

  logger.debug('Database mocks configured for Jest');
}

// ==========================================
// エクスポート
// ==========================================

export {
  MockDatabase,
  MockDataStore,
  DatabaseTestHelper
};