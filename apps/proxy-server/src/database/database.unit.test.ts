import { jest } from '@jest/globals';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import type { 
  TRPGCampaign, 
  TRPGCharacter, 
  TRPGQuest, 
  TRPGEvent, 
  TRPGSession 
} from '@ai-agent-trpg/types';

// モジュールモック
jest.mock('fs');
jest.mock('better-sqlite3');
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('database', () => {
  let mockDb: jest.Mocked<Database.Database>;
  let mockExec: jest.Mock;
  let mockPrepare: jest.Mock;
  let mockRun: jest.Mock;
  let mockGet: jest.Mock;
  let mockAll: jest.Mock;

  beforeEach(() => {
    // データベースモックの初期化
    mockExec = jest.fn();
    mockPrepare = jest.fn();
    mockRun = jest.fn();
    mockGet = jest.fn();
    mockAll = jest.fn();

    const mockStatement = {
      run: mockRun,
      get: mockGet,
      all: mockAll
    };

    mockPrepare.mockReturnValue(mockStatement);

    mockDb = {
      exec: mockExec,
      prepare: mockPrepare,
      close: jest.fn(),
      pragma: jest.fn(),
      backup: jest.fn(),
      serialize: jest.fn(),
      parallelize: jest.fn(),
      loadExtension: jest.fn(),
      defaultSafeIntegers: jest.fn(),
      aggregate: jest.fn(),
      function: jest.fn(),
      table: jest.fn(),
      unsafeMode: jest.fn(),
      transaction: jest.fn(),
      memory: false,
      readonly: false,
      name: 'test.db',
      open: true,
      inTransaction: false,
    } as any;

    // better-sqlite3のモック
    (Database as unknown as jest.Mock).mockReturnValue(mockDb);

    // fsのモック
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation();

    // モジュールキャッシュをクリア
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeDatabase関数はデータベースを適切に初期化すること', () => {
    it('データベースディレクトリが存在しない場合は作成すること', async () => {
      // Given: ディレクトリが存在しない
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // When: データベースを初期化
      const { initializeDatabase } = await import('./database');
      await initializeDatabase();

      // Then: ディレクトリが作成される
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('data'),
        { recursive: true }
      );
    });

    it('データベースディレクトリが既に存在する場合は作成しないこと', async () => {
      // Given: ディレクトリが存在する
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // When: データベースを初期化
      const { initializeDatabase } = await import('./database');
      await initializeDatabase();

      // Then: ディレクトリは作成されない
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('WALモードとパフォーマンス設定が適用されること', async () => {
      // Given: データベースモック

      // When: データベースを初期化
      const { initializeDatabase } = await import('./database');
      await initializeDatabase();

      // Then: 各種PRAGMAが実行される
      expect(mockExec).toHaveBeenCalledWith('PRAGMA journal_mode = WAL;');
      expect(mockExec).toHaveBeenCalledWith('PRAGMA synchronous = NORMAL;');
      expect(mockExec).toHaveBeenCalledWith('PRAGMA temp_store = memory;');
      expect(mockExec).toHaveBeenCalledWith('PRAGMA mmap_size = 268435456;');
    });

    it('データベース接続エラーの場合は適切なエラーをスローすること', async () => {
      // Given: データベース接続エラー
      const dbError = new Error('Connection failed');
      (Database as unknown as jest.Mock).mockImplementation(() => {
        throw dbError;
      });

      // When/Then: エラーがスローされる
      const { initializeDatabase } = await import('./database');
      await expect(initializeDatabase()).rejects.toThrow('Failed to initialize database');
    });

    it('カスタムデータベースパスが環境変数から読み込まれること', async () => {
      // Given: カスタムパス
      process.env.DATABASE_PATH = '/custom/path/test.db';

      // When: データベースを初期化
      const { initializeDatabase } = await import('./database');
      await initializeDatabase();

      // Then: カスタムパスが使用される
      expect(Database).toHaveBeenCalledWith('/custom/path/test.db');
      
      // クリーンアップ
      delete process.env.DATABASE_PATH;
    });
  });

  describe('getDatabase関数はデータベース接続を適切に管理すること', () => {
    it('初期化前にgetDatabaseを呼ぶとエラーをスローすること', async () => {
      // Given: データベース未初期化

      // When/Then: エラーがスローされる
      const { getDatabase } = await import('./database');
      expect(() => getDatabase()).toThrow('Database not initialized');
    });

    it('初期化後はデータベースインスタンスを返すこと', async () => {
      // Given: データベース初期化済み
      const { initializeDatabase, getDatabase } = await import('./database');
      await initializeDatabase();

      // When: データベースを取得
      const db = getDatabase();

      // Then: データベースインスタンスが返される
      expect(db).toBe(mockDb);
    });

    it('複数回呼んでも同じインスタンスを返すこと', async () => {
      // Given: データベース初期化済み
      const { initializeDatabase, getDatabase } = await import('./database');
      await initializeDatabase();

      // When: 複数回データベースを取得
      const db1 = getDatabase();
      const db2 = getDatabase();

      // Then: 同じインスタンスが返される
      expect(db1).toBe(db2);
    });
  });

  describe('closeDatabase関数はデータベース接続を適切にクローズすること', () => {
    it('データベースが初期化されていない場合は何もしないこと', async () => {
      // Given: データベース未初期化

      // When: クローズを実行
      const { closeDatabase } = await import('./database');
      await closeDatabase();

      // Then: エラーは発生しない（何もしない）
      expect(mockDb.close).not.toHaveBeenCalled();
    });

    it('データベースが初期化されている場合は接続をクローズすること', async () => {
      // Given: データベース初期化済み
      const { initializeDatabase, closeDatabase } = await import('./database');
      await initializeDatabase();

      // When: クローズを実行
      await closeDatabase();

      // Then: closeが呼ばれる
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('クローズ後はgetDatabaseがエラーをスローすること', async () => {
      // Given: データベース初期化済み
      const { initializeDatabase, closeDatabase, getDatabase } = await import('./database');
      await initializeDatabase();

      // When: クローズを実行
      await closeDatabase();

      // Then: getDatabaseはエラーをスロー
      expect(() => getDatabase()).toThrow('Database not initialized');
    });

    it('クローズ中のエラーはログに記録されるが例外はスローしないこと', async () => {
      // Given: closeがエラーをスロー
      const closeError = new Error('Close failed');
      mockDb.close.mockImplementation(() => {
        throw closeError;
      });

      const { initializeDatabase, closeDatabase } = await import('./database');
      await initializeDatabase();

      // When: クローズを実行
      await closeDatabase();

      // Then: エラーはログに記録されるが例外はスローされない
      const { logger } = await import('../utils/logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to close database:', 
        expect.objectContaining({ error: closeError })
      );
    });
  });

  describe('テーブル作成が適切に実行されること', () => {
    it('すべての必要なテーブルが作成されること', async () => {
      // Given: データベースモック

      // When: データベースを初期化
      const { initializeDatabase } = await import('./database');
      await initializeDatabase();

      // Then: 各テーブルのCREATE文が実行される
      const execCalls = mockExec.mock.calls.map(call => call[0]);
      const createTableCalls = execCalls.filter(sql => 
        sql.includes('CREATE TABLE IF NOT EXISTS')
      );

      // 必要なテーブルが作成されることを確認
      expect(createTableCalls.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS campaigns'))).toBe(true);
      expect(createTableCalls.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS characters'))).toBe(true);
      expect(createTableCalls.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS quests'))).toBe(true);
      expect(createTableCalls.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS events'))).toBe(true);
      expect(createTableCalls.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS sessions'))).toBe(true);
      expect(createTableCalls.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS ai_requests'))).toBe(true);
      expect(createTableCalls.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS locations'))).toBe(true);
      expect(createTableCalls.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS user_settings'))).toBe(true);
    });

    it('インデックスが適切に作成されること', async () => {
      // Given: データベースモック

      // When: データベースを初期化
      const { initializeDatabase } = await import('./database');
      await initializeDatabase();

      // Then: インデックスが作成される
      const execCalls = mockExec.mock.calls.map(call => call[0]);
      const indexCalls = execCalls.filter(sql => 
        sql.includes('CREATE INDEX IF NOT EXISTS')
      );

      // 重要なインデックスが作成されることを確認
      expect(indexCalls.some(sql => sql.includes('idx_characters_campaign_id'))).toBe(true);
      expect(indexCalls.some(sql => sql.includes('idx_quests_campaign_id'))).toBe(true);
      expect(indexCalls.some(sql => sql.includes('idx_events_campaign_id'))).toBe(true);
      expect(indexCalls.some(sql => sql.includes('idx_sessions_campaign_id'))).toBe(true);
      expect(indexCalls.some(sql => sql.includes('idx_ai_requests_campaign_id'))).toBe(true);
    });

    it('外部キー制約が適切に設定されること', async () => {
      // Given: データベースモック

      // When: データベースを初期化
      const { initializeDatabase } = await import('./database');
      await initializeDatabase();

      // Then: 外部キー制約が含まれる
      const execCalls = mockExec.mock.calls.map(call => call[0]);
      const foreignKeyCalls = execCalls.filter(sql => 
        sql.includes('FOREIGN KEY')
      );

      // 外部キー制約が設定されることを確認
      expect(foreignKeyCalls.length).toBeGreaterThan(0);
      expect(foreignKeyCalls.some(sql => sql.includes('ON DELETE CASCADE'))).toBe(true);
    });
  });

  describe('データベーストランザクション管理', () => {
    it('beginTransaction関数がBEGIN文を実行すること', async () => {
      // Given: データベース初期化済み
      const { initializeDatabase, beginTransaction } = await import('./database');
      await initializeDatabase();

      // When: トランザクション開始
      beginTransaction();

      // Then: BEGIN文が実行される
      expect(mockExec).toHaveBeenCalledWith('BEGIN');
    });

    it('commitTransaction関数がCOMMIT文を実行すること', async () => {
      // Given: データベース初期化済み
      const { initializeDatabase, commitTransaction } = await import('./database');
      await initializeDatabase();

      // When: トランザクションコミット
      commitTransaction();

      // Then: COMMIT文が実行される
      expect(mockExec).toHaveBeenCalledWith('COMMIT');
    });

    it('rollbackTransaction関数がROLLBACK文を実行すること', async () => {
      // Given: データベース初期化済み
      const { initializeDatabase, rollbackTransaction } = await import('./database');
      await initializeDatabase();

      // When: トランザクションロールバック
      rollbackTransaction();

      // Then: ROLLBACK文が実行される
      expect(mockExec).toHaveBeenCalledWith('ROLLBACK');
    });

    it('トランザクション関数がデータベース未初期化時にエラーをスローすること', async () => {
      // Given: データベース未初期化

      // When/Then: 各関数がエラーをスロー
      const { beginTransaction, commitTransaction, rollbackTransaction } = await import('./database');
      expect(() => beginTransaction()).toThrow('Database not initialized');
      expect(() => commitTransaction()).toThrow('Database not initialized');
      expect(() => rollbackTransaction()).toThrow('Database not initialized');
    });
  });

  describe('データベースヘルパー関数', () => {
    it('runQuery関数がクエリを実行して結果を返すこと', async () => {
      // Given: データベース初期化済みとクエリ結果
      const mockResult = { changes: 1, lastInsertRowid: 123 };
      mockRun.mockReturnValue(mockResult);

      const { initializeDatabase, runQuery } = await import('./database');
      await initializeDatabase();

      // When: クエリ実行
      const result = runQuery('INSERT INTO campaigns (id, name) VALUES (?, ?)', ['test-id', 'Test Campaign']);

      // Then: 結果が返される
      expect(mockPrepare).toHaveBeenCalledWith('INSERT INTO campaigns (id, name) VALUES (?, ?)');
      expect(mockRun).toHaveBeenCalledWith('test-id', 'Test Campaign');
      expect(result).toBe(mockResult);
    });

    it('getQuery関数が単一レコードを取得すること', async () => {
      // Given: データベース初期化済みとクエリ結果
      const mockRecord = { id: 'test-id', name: 'Test Campaign' };
      mockGet.mockReturnValue(mockRecord);

      const { initializeDatabase, getQuery } = await import('./database');
      await initializeDatabase();

      // When: クエリ実行
      const result = getQuery('SELECT * FROM campaigns WHERE id = ?', ['test-id']);

      // Then: レコードが返される
      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM campaigns WHERE id = ?');
      expect(mockGet).toHaveBeenCalledWith('test-id');
      expect(result).toBe(mockRecord);
    });

    it('allQuery関数が複数レコードを取得すること', async () => {
      // Given: データベース初期化済みとクエリ結果
      const mockRecords = [
        { id: 'test-1', name: 'Campaign 1' },
        { id: 'test-2', name: 'Campaign 2' }
      ];
      mockAll.mockReturnValue(mockRecords);

      const { initializeDatabase, allQuery } = await import('./database');
      await initializeDatabase();

      // When: クエリ実行
      const result = allQuery('SELECT * FROM campaigns WHERE status = ?', ['active']);

      // Then: レコードが返される
      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM campaigns WHERE status = ?');
      expect(mockAll).toHaveBeenCalledWith('active');
      expect(result).toBe(mockRecords);
    });

    it('クエリ実行時のエラーは適切に伝播すること', async () => {
      // Given: クエリエラー
      const queryError = new Error('Query failed');
      mockPrepare.mockImplementation(() => {
        throw queryError;
      });

      const { initializeDatabase, runQuery } = await import('./database');
      await initializeDatabase();

      // When/Then: エラーが伝播する
      expect(() => runQuery('INVALID SQL')).toThrow('Query failed');
    });
  });

  describe('データベースバックアップ機能', () => {
    it('backupDatabase関数がバックアップを作成すること', async () => {
      // Given: バックアップ先のパス
      const backupPath = '/backup/test.db';
      const mockBackupDb = {
        close: jest.fn()
      };
      const mockBackup = jest.fn().mockReturnValue({
        step: jest.fn().mockReturnValue(-1),
        close: jest.fn()
      });
      mockDb.backup.mockReturnValue(mockBackup());

      const { initializeDatabase, backupDatabase } = await import('./database');
      await initializeDatabase();

      // When: バックアップ実行
      await backupDatabase(backupPath);

      // Then: バックアップが作成される
      expect(Database).toHaveBeenCalledWith(backupPath);
      expect(mockDb.backup).toHaveBeenCalled();
    });

    it('バックアップディレクトリが存在しない場合は作成すること', async () => {
      // Given: ディレクトリが存在しない
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const backupPath = '/backup/subdir/test.db';

      const mockBackup = jest.fn().mockReturnValue({
        step: jest.fn().mockReturnValue(-1),
        close: jest.fn()
      });
      mockDb.backup.mockReturnValue(mockBackup());

      const { initializeDatabase, backupDatabase } = await import('./database');
      await initializeDatabase();

      // When: バックアップ実行
      await backupDatabase(backupPath);

      // Then: ディレクトリが作成される
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        '/backup/subdir',
        { recursive: true }
      );
    });
  });

  describe('データベース統計情報', () => {
    it('getDatabaseStats関数がデータベース統計を返すこと', async () => {
      // Given: 統計情報のモック
      mockGet.mockImplementation((query: string) => {
        if (query.includes('page_count')) return { page_count: 100 };
        if (query.includes('page_size')) return { page_size: 4096 };
        if (query.includes('COUNT(*)')) {
          if (query.includes('campaigns')) return { count: 10 };
          if (query.includes('characters')) return { count: 50 };
          if (query.includes('sessions')) return { count: 30 };
        }
        return null;
      });

      const { initializeDatabase, getDatabaseStats } = await import('./database');
      await initializeDatabase();

      // When: 統計情報取得
      const stats = getDatabaseStats();

      // Then: 統計情報が返される
      expect(stats).toEqual({
        pageCount: 100,
        pageSize: 4096,
        totalSize: 409600,
        tables: {
          campaigns: 10,
          characters: 50,
          sessions: 30
        }
      });
    });
  });

  describe('データベースメンテナンス機能', () => {
    it('vacuum関数がVACUUM文を実行すること', async () => {
      // Given: データベース初期化済み
      const { initializeDatabase, vacuum } = await import('./database');
      await initializeDatabase();

      // When: VACUUM実行
      await vacuum();

      // Then: VACUUM文が実行される
      expect(mockExec).toHaveBeenCalledWith('VACUUM;');
    });

    it('analyze関数がANALYZE文を実行すること', async () => {
      // Given: データベース初期化済み
      const { initializeDatabase, analyze } = await import('./database');
      await initializeDatabase();

      // When: ANALYZE実行
      await analyze();

      // Then: ANALYZE文が実行される
      expect(mockExec).toHaveBeenCalledWith('ANALYZE;');
    });

    it('optimizeDatabase関数がVACUUMとANALYZEを実行すること', async () => {
      // Given: データベース初期化済み
      const { initializeDatabase, optimizeDatabase } = await import('./database');
      await initializeDatabase();

      // When: 最適化実行
      await optimizeDatabase();

      // Then: VACUUMとANALYZEが実行される
      expect(mockExec).toHaveBeenCalledWith('VACUUM;');
      expect(mockExec).toHaveBeenCalledWith('ANALYZE;');
    });
  });

  describe('エラーハンドリングとリカバリ', () => {
    it('データベース破損時に再初期化を試みること', async () => {
      // Given: データベースエラー
      let errorCount = 0;
      mockExec.mockImplementation(() => {
        if (errorCount++ === 0) {
          throw new Error('database disk image is malformed');
        }
      });

      const { initializeDatabase, handleDatabaseError } = await import('./database');
      await initializeDatabase();

      // When: エラーハンドリング
      await handleDatabaseError(new Error('database disk image is malformed'));

      // Then: 再初期化が試みられる
      expect(Database).toHaveBeenCalledTimes(2);
    });

    it('リトライ回数を超えた場合はエラーをスローすること', async () => {
      // Given: 継続的なエラー
      mockExec.mockImplementation(() => {
        throw new Error('database disk image is malformed');
      });

      const { initializeDatabase, handleDatabaseError } = await import('./database');
      
      // When/Then: 最大リトライ後にエラー
      await expect(handleDatabaseError(
        new Error('database disk image is malformed'),
        3
      )).rejects.toThrow('Failed to recover database after 3 attempts');
    });
  });
});