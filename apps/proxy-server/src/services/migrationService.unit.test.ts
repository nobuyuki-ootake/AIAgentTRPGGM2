import { jest } from '@jest/globals';
import type { TRPGCampaign } from '@ai-agent-trpg/types';

// モックの設定
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../database/database', () => ({
  getDatabase: jest.fn()
}));

jest.mock('fs');
jest.mock('path');

describe('MigrationService', () => {
  let MigrationService: any;
  let migrationService: any;
  let mockDb: any;
  let mockLogger: any;
  let mockFs: any;
  let mockPath: any;

  beforeEach(async () => {
    // モジュールのリセット
    jest.resetModules();
    
    // データベースモックの初期化
    const mockPrepare = jest.fn();
    const mockExec = jest.fn();
    const mockTransaction = jest.fn();
    const mockRun = jest.fn();
    const mockAll = jest.fn();
    const mockGet = jest.fn();

    const mockStatement = {
      run: mockRun,
      get: mockGet,
      all: mockAll
    };

    mockPrepare.mockReturnValue(mockStatement);
    mockTransaction.mockImplementation((fn) => fn);

    mockDb = {
      exec: mockExec,
      prepare: mockPrepare,
      transaction: mockTransaction
    };

    // モジュールのモック
    const databaseModule = await import('../database/database');
    (databaseModule.getDatabase as jest.Mock).mockReturnValue(mockDb);

    const loggerModule = await import('../utils/logger');
    mockLogger = loggerModule.logger;

    mockFs = await import('fs');
    mockPath = await import('path');

    // MigrationServiceをインポート
    const migrationModule = await import('./migrationService');
    MigrationService = migrationModule.MigrationService;
    
    migrationService = new MigrationService('/test/migrations');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MigrationServiceの初期化', () => {
    it('コンストラクタがマイグレーションテーブルを初期化すること', () => {
      // Given: MigrationServiceのインスタンス化（beforeEachで実行済み）

      // Then: マイグレーションテーブルの作成SQLが実行される
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations')
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_schema_migrations_version')
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Migration table initialized successfully');
    });

    it('マイグレーションテーブル初期化エラーが適切に処理されること', () => {
      // Given: データベースエラー
      mockDb.exec.mockImplementation(() => {
        throw new Error('Database error');
      });

      // When/Then: エラーがスローされる
      expect(() => new MigrationService()).toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize migration table:',
        expect.any(Error)
      );
    });

    it('デフォルトのマイグレーションディレクトリが設定されること', () => {
      // Given: ディレクトリを指定せずに初期化
      mockPath.join.mockReturnValue('/default/migrations/path');

      // When: デフォルトコンストラクタを呼ぶ
      const service = new MigrationService();

      // Then: デフォルトパスが使用される
      expect(mockPath.join).toHaveBeenCalledWith(
        process.cwd(), 'src', 'migrations'
      );
    });
  });

  describe('マイグレーションの登録', () => {
    it('registerMigrationがマイグレーションを正しく登録すること', () => {
      // Given: マイグレーション定義
      const migration = {
        id: 'migration_001',
        version: '1.0.0',
        description: 'Initial schema',
        up: jest.fn(),
        down: jest.fn(),
        timestamp: '2025-01-01T00:00:00Z'
      };

      // When: マイグレーションを登録
      migrationService.registerMigration(migration);

      // Then: マイグレーションが追加される
      expect(migrationService.migrations).toContain(migration);
    });

    it('複数のマイグレーションがバージョン順にソートされること', () => {
      // Given: バージョンが順序通りでないマイグレーション
      const migrations = [
        {
          id: 'migration_003',
          version: '3.0.0',
          description: 'Third migration',
          up: jest.fn(),
          down: jest.fn(),
          timestamp: '2025-01-03T00:00:00Z'
        },
        {
          id: 'migration_001',
          version: '1.0.0',
          description: 'First migration',
          up: jest.fn(),
          down: jest.fn(),
          timestamp: '2025-01-01T00:00:00Z'
        },
        {
          id: 'migration_002',
          version: '2.0.0',
          description: 'Second migration',
          up: jest.fn(),
          down: jest.fn(),
          timestamp: '2025-01-02T00:00:00Z'
        }
      ];

      // When: マイグレーションを登録
      migrations.forEach(m => migrationService.registerMigration(m));

      // Then: バージョン順にソートされる
      const versions = migrationService.migrations.map((m: any) => m.version);
      expect(versions).toEqual(['1.0.0', '2.0.0', '3.0.0']);
    });
  });

  describe('ディレクトリからのマイグレーション読み込み', () => {
    it('loadMigrationsFromDirectoryが正しくファイルを読み込むこと', async () => {
      // Given: マイグレーションファイルが存在
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        '001_initial_schema.ts',
        '002_add_features.js',
        'readme.md' // 無視されるファイル
      ]);
      mockPath.join.mockImplementation((dir: string, file: string) => `${dir}/${file}`);

      // マイグレーションモジュールのモック
      const mockMigration = {
        id: 'migration_001',
        version: '1.0.0',
        description: 'Test migration',
        up: jest.fn(),
        down: jest.fn(),
        timestamp: '2025-01-01T00:00:00Z'
      };

      // dynamic import のモック
      const originalImport = global.eval('import');
      global.eval = jest.fn().mockReturnValue(
        jest.fn().mockImplementation((expression: string) => {
          if (expression.includes('import')) {
            return Promise.resolve({ default: mockMigration });
          }
          return originalImport(expression);
        })
      ) as any;

      // When: ディレクトリから読み込み
      await migrationService.loadMigrationsFromDirectory();

      // Then: TSとJSファイルのみ処理される
      expect(mockFs.readdirSync).toHaveBeenCalledWith('/test/migrations');
      expect(mockLogger.info).toHaveBeenCalledWith('Loaded migration: 001_initial_schema.ts');
    });

    it('ディレクトリが存在しない場合は警告を出力すること', async () => {
      // Given: ディレクトリが存在しない
      mockFs.existsSync.mockReturnValue(false);

      // When: ディレクトリから読み込み
      await migrationService.loadMigrationsFromDirectory();

      // Then: 警告が出力される
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Migrations directory not found: /test/migrations'
      );
    });

    it('無効なマイグレーションファイルの場合は警告を出力すること', async () => {
      // Given: 無効なマイグレーションファイル
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['invalid_migration.ts']);
      mockPath.join.mockReturnValue('/test/migrations/invalid_migration.ts');

      // 無効なモジュールのモック
      global.eval = jest.fn().mockReturnValue(
        jest.fn().mockResolvedValue({ default: null })
      ) as any;

      // When: ディレクトリから読み込み
      await migrationService.loadMigrationsFromDirectory();

      // Then: 警告が出力される
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid migration file: invalid_migration.ts'
      );
    });
  });

  describe('適用済みマイグレーション管理', () => {
    it('getAppliedMigrationsが適用済みマイグレーションを返すこと', () => {
      // Given: 適用済みマイグレーション
      const appliedMigrations = [
        {
          id: 'migration_001',
          version: '1.0.0',
          description: 'Initial schema',
          applied_at: '2025-01-01T00:00:00Z',
          execution_time: 100,
          checksum: 'abc123'
        }
      ];

      mockDb.prepare().all.mockReturnValue(appliedMigrations);

      // When: 適用済みマイグレーションを取得
      const result = migrationService.getAppliedMigrations();

      // Then: 適用済みマイグレーションが返される
      expect(result).toEqual(appliedMigrations);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, version, description')
      );
    });

    it('getPendingMigrationsが未適用マイグレーションを返すこと', () => {
      // Given: 登録されたマイグレーションと適用済みマイグレーション
      const migration1 = {
        id: 'migration_001',
        version: '1.0.0',
        description: 'Applied migration',
        up: jest.fn(),
        down: jest.fn(),
        timestamp: '2025-01-01T00:00:00Z'
      };

      const migration2 = {
        id: 'migration_002',
        version: '2.0.0',
        description: 'Pending migration',
        up: jest.fn(),
        down: jest.fn(),
        timestamp: '2025-01-02T00:00:00Z'
      };

      migrationService.registerMigration(migration1);
      migrationService.registerMigration(migration2);

      // migration_001は適用済み
      mockDb.prepare().all.mockReturnValue([
        { id: 'migration_001', version: '1.0.0' }
      ]);

      // When: 未適用マイグレーションを取得
      const pending = migrationService.getPendingMigrations();

      // Then: migration_002のみ返される
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('migration_002');
    });
  });

  describe('チェックサム計算', () => {
    it('calculateChecksumが一貫したチェックサムを生成すること', () => {
      // Given: 同じマイグレーション
      const migration = {
        id: 'test_migration',
        version: '1.0.0',
        description: 'Test migration',
        up: () => {},
        down: () => {},
        timestamp: '2025-01-01T00:00:00Z'
      };

      // When: チェックサムを計算（複数回）
      const checksum1 = migrationService.calculateChecksum(migration);
      const checksum2 = migrationService.calculateChecksum(migration);

      // Then: 同じチェックサムが生成される
      expect(checksum1).toBe(checksum2);
      expect(typeof checksum1).toBe('string');
      expect(checksum1.length).toBeGreaterThan(0);
    });

    it('異なるマイグレーションで異なるチェックサムが生成されること', () => {
      // Given: 異なる2つのマイグレーション
      const migration1 = {
        id: 'migration_001',
        version: '1.0.0',
        description: 'First migration',
        up: () => { console.log('first'); },
        down: () => {},
        timestamp: '2025-01-01T00:00:00Z'
      };

      const migration2 = {
        id: 'migration_002',
        version: '2.0.0',
        description: 'Second migration',
        up: () => { console.log('second'); },
        down: () => {},
        timestamp: '2025-01-02T00:00:00Z'
      };

      // When: チェックサムを計算
      const checksum1 = migrationService.calculateChecksum(migration1);
      const checksum2 = migrationService.calculateChecksum(migration2);

      // Then: 異なるチェックサムが生成される
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('マイグレーション実行', () => {
    it('runMigrationが正常にマイグレーションを実行すること', async () => {
      // Given: マイグレーション定義
      const upMock = jest.fn().mockResolvedValue(undefined);
      const migration = {
        id: 'migration_001',
        version: '1.0.0',
        description: 'Test migration',
        up: upMock,
        down: jest.fn(),
        timestamp: '2025-01-01T00:00:00Z'
      };

      mockDb.prepare().run.mockReturnValue({ changes: 1 });

      // When: マイグレーションを実行
      const result = await migrationService.runMigration(migration);

      // Then: 正常に実行される
      expect(result.status).toBe('success');
      expect(result.id).toBe('migration_001');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(upMock).toHaveBeenCalledWith(mockDb);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO schema_migrations')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Running migration: migration_001 - Test migration'
      );
    });

    it('マイグレーション実行エラーが適切に処理されること', async () => {
      // Given: エラーを発生するマイグレーション
      const error = new Error('Migration execution failed');
      const migration = {
        id: 'migration_error',
        version: '1.0.0',
        description: 'Error migration',
        up: jest.fn().mockRejectedValue(error),
        down: jest.fn(),
        timestamp: '2025-01-01T00:00:00Z'
      };

      // When: マイグレーションを実行
      const result = await migrationService.runMigration(migration);

      // Then: エラーが記録される
      expect(result.status).toBe('error');
      expect(result.error).toBe('Migration execution failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Migration failed: migration_error',
        error
      );
    });

    it('トランザクション内でマイグレーションが実行されること', async () => {
      // Given: マイグレーション
      const migration = {
        id: 'migration_transaction',
        version: '1.0.0',
        description: 'Transaction test',
        up: jest.fn(),
        down: jest.fn(),
        timestamp: '2025-01-01T00:00:00Z'
      };

      // When: マイグレーションを実行
      await migrationService.runMigration(migration);

      // Then: トランザクションが使用される
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe('マイグレーションロールバック', () => {
    it('rollbackMigrationが正常にロールバックを実行すること', async () => {
      // Given: ロールバック対象のマイグレーション
      const downMock = jest.fn().mockResolvedValue(undefined);
      const migration = {
        id: 'migration_rollback',
        version: '1.0.0',
        description: 'Rollback test',
        up: jest.fn(),
        down: downMock,
        timestamp: '2025-01-01T00:00:00Z'
      };

      mockDb.prepare().run.mockReturnValue({ changes: 1 });

      // When: ロールバックを実行
      const result = await migrationService.rollbackMigration(migration);

      // Then: 正常にロールバックされる
      expect(result.status).toBe('success');
      expect(downMock).toHaveBeenCalledWith(mockDb);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM schema_migrations WHERE id = ?')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rolling back migration: migration_rollback - Rollback test'
      );
    });

    it('ロールバックエラーが適切に処理されること', async () => {
      // Given: エラーを発生するロールバック
      const error = new Error('Rollback failed');
      const migration = {
        id: 'migration_rollback_error',
        version: '1.0.0',
        description: 'Rollback error test',
        up: jest.fn(),
        down: jest.fn().mockRejectedValue(error),
        timestamp: '2025-01-01T00:00:00Z'
      };

      // When: ロールバックを実行
      const result = await migrationService.rollbackMigration(migration);

      // Then: エラーが記録される
      expect(result.status).toBe('error');
      expect(result.error).toBe('Rollback failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Migration rollback failed: migration_rollback_error',
        error
      );
    });
  });

  describe('一括マイグレーション実行', () => {
    it('runPendingMigrationsがすべての未適用マイグレーションを実行すること', async () => {
      // Given: 複数の未適用マイグレーション
      const migrations = [
        {
          id: 'migration_001',
          version: '1.0.0',
          description: 'First migration',
          up: jest.fn().mockResolvedValue(undefined),
          down: jest.fn(),
          timestamp: '2025-01-01T00:00:00Z'
        },
        {
          id: 'migration_002',
          version: '2.0.0',
          description: 'Second migration',
          up: jest.fn().mockResolvedValue(undefined),
          down: jest.fn(),
          timestamp: '2025-01-02T00:00:00Z'
        }
      ];

      migrations.forEach(m => migrationService.registerMigration(m));
      mockDb.prepare().all.mockReturnValue([]); // 適用済みなし
      mockDb.prepare().run.mockReturnValue({ changes: 1 });

      // When: 未適用マイグレーションを実行
      const results = await migrationService.runPendingMigrations();

      // Then: すべて実行される
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('success');
      expect(migrations[0].up).toHaveBeenCalled();
      expect(migrations[1].up).toHaveBeenCalled();
    });

    it('マイグレーションエラー時に実行が停止されること', async () => {
      // Given: 1つ目が成功、2つ目がエラーのマイグレーション
      const migrations = [
        {
          id: 'migration_success',
          version: '1.0.0',
          description: 'Success migration',
          up: jest.fn().mockResolvedValue(undefined),
          down: jest.fn(),
          timestamp: '2025-01-01T00:00:00Z'
        },
        {
          id: 'migration_error',
          version: '2.0.0',
          description: 'Error migration',
          up: jest.fn().mockRejectedValue(new Error('Failed')),
          down: jest.fn(),
          timestamp: '2025-01-02T00:00:00Z'
        },
        {
          id: 'migration_skipped',
          version: '3.0.0',
          description: 'Skipped migration',
          up: jest.fn(),
          down: jest.fn(),
          timestamp: '2025-01-03T00:00:00Z'
        }
      ];

      migrations.forEach(m => migrationService.registerMigration(m));
      mockDb.prepare().all.mockReturnValue([]);
      mockDb.prepare().run.mockReturnValue({ changes: 1 });

      // When: マイグレーションを実行
      const results = await migrationService.runPendingMigrations();

      // Then: エラー後の実行は停止
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('error');
      expect(migrations[2].up).not.toHaveBeenCalled();
    });
  });

  describe('バージョン指定ロールバック', () => {
    it('rollbackToVersionが指定バージョンまでロールバックすること', async () => {
      // Given: 適用済みマイグレーション
      const migrations = [
        {
          id: 'migration_001',
          version: '1.0.0',
          description: 'Keep this',
          up: jest.fn(),
          down: jest.fn().mockResolvedValue(undefined),
          timestamp: '2025-01-01T00:00:00Z'
        },
        {
          id: 'migration_002',
          version: '2.0.0',
          description: 'Rollback this',
          up: jest.fn(),
          down: jest.fn().mockResolvedValue(undefined),
          timestamp: '2025-01-02T00:00:00Z'
        },
        {
          id: 'migration_003',
          version: '3.0.0',
          description: 'Rollback this too',
          up: jest.fn(),
          down: jest.fn().mockResolvedValue(undefined),
          timestamp: '2025-01-03T00:00:00Z'
        }
      ];

      migrations.forEach(m => migrationService.registerMigration(m));

      // すべて適用済みと仮定
      mockDb.prepare().all.mockReturnValue([
        { id: 'migration_001', version: '1.0.0' },
        { id: 'migration_002', version: '2.0.0' },
        { id: 'migration_003', version: '3.0.0' }
      ]);
      mockDb.prepare().run.mockReturnValue({ changes: 1 });

      // When: バージョン1.0.0までロールバック
      const results = await migrationService.rollbackToVersion('1.0.0');

      // Then: バージョン2.0.0以降がロールバックされる
      expect(results).toHaveLength(2);
      expect(migrations[2].down).toHaveBeenCalled(); // 3.0.0から先に
      expect(migrations[1].down).toHaveBeenCalled(); // 2.0.0
      expect(migrations[0].down).not.toHaveBeenCalled(); // 1.0.0は残す
    });

    it('存在しないマイグレーションのロールバック時は警告を出力すること', async () => {
      // Given: レジストリにないマイグレーション
      mockDb.prepare().all.mockReturnValue([
        { id: 'unknown_migration', version: '1.0.0' }
      ]);

      // When: ロールバックを実行
      const results = await migrationService.rollbackToVersion('0.0.0');

      // Then: 警告が出力される
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Migration not found in registry: unknown_migration'
      );
      expect(results).toHaveLength(0);
    });
  });

  describe('マイグレーション整合性チェック', () => {
    it('validateMigrationsが正常なマイグレーションでvalidを返すこと', () => {
      // Given: 正常なマイグレーション
      const migration = {
        id: 'migration_001',
        version: '1.0.0',
        description: 'Valid migration',
        up: () => {},
        down: () => {},
        timestamp: '2025-01-01T00:00:00Z'
      };

      migrationService.registerMigration(migration);
      
      const checksum = migrationService.calculateChecksum(migration);
      mockDb.prepare().all.mockReturnValue([
        {
          id: 'migration_001',
          version: '1.0.0',
          checksum
        }
      ]);

      // When: 整合性チェックを実行
      const result = migrationService.validateMigrations();

      // Then: 有効と判定される
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('チェックサムが一致しない場合はエラーを返すこと', () => {
      // Given: チェックサムが一致しないマイグレーション
      const migration = {
        id: 'migration_001',
        version: '1.0.0',
        description: 'Modified migration',
        up: () => { console.log('modified'); },
        down: () => {},
        timestamp: '2025-01-01T00:00:00Z'
      };

      migrationService.registerMigration(migration);
      
      mockDb.prepare().all.mockReturnValue([
        {
          id: 'migration_001',
          version: '1.0.0',
          checksum: 'different_checksum'
        }
      ]);

      // When: 整合性チェックを実行
      const result = migrationService.validateMigrations();

      // Then: エラーが検出される
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Checksum mismatch for migration migration_001');
    });

    it('重複IDが検出されること', () => {
      // Given: 重複IDのマイグレーション
      const migration1 = {
        id: 'duplicate_id',
        version: '1.0.0',
        description: 'First',
        up: () => {},
        down: () => {},
        timestamp: '2025-01-01T00:00:00Z'
      };

      const migration2 = {
        id: 'duplicate_id',
        version: '2.0.0',
        description: 'Second',
        up: () => {},
        down: () => {},
        timestamp: '2025-01-02T00:00:00Z'
      };

      migrationService.registerMigration(migration1);
      migrationService.registerMigration(migration2);
      mockDb.prepare().all.mockReturnValue([]);

      // When: 整合性チェックを実行
      const result = migrationService.validateMigrations();

      // Then: 重複IDエラーが検出される
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate migration IDs found');
    });

    it('重複バージョンが検出されること', () => {
      // Given: 重複バージョンのマイグレーション
      const migration1 = {
        id: 'migration_001',
        version: '1.0.0',
        description: 'First',
        up: () => {},
        down: () => {},
        timestamp: '2025-01-01T00:00:00Z'
      };

      const migration2 = {
        id: 'migration_002',
        version: '1.0.0',
        description: 'Second',
        up: () => {},
        down: () => {},
        timestamp: '2025-01-02T00:00:00Z'
      };

      migrationService.registerMigration(migration1);
      migrationService.registerMigration(migration2);
      mockDb.prepare().all.mockReturnValue([]);

      // When: 整合性チェックを実行
      const result = migrationService.validateMigrations();

      // Then: 重複バージョンエラーが検出される
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate migration versions found');
    });
  });

  describe('マイグレーション状態', () => {
    it('getStatusが正しい状態を返すこと', () => {
      // Given: マイグレーションと適用状態
      const migrations = [
        {
          id: 'migration_001',
          version: '1.0.0',
          description: 'Applied',
          up: jest.fn(),
          down: jest.fn(),
          timestamp: '2025-01-01T00:00:00Z'
        },
        {
          id: 'migration_002',
          version: '2.0.0',
          description: 'Pending',
          up: jest.fn(),
          down: jest.fn(),
          timestamp: '2025-01-02T00:00:00Z'
        }
      ];

      migrations.forEach(m => migrationService.registerMigration(m));

      const appliedMigrations = [
        {
          id: 'migration_001',
          version: '1.0.0',
          description: 'Applied',
          applied_at: '2025-01-01T00:00:00Z',
          execution_time: 100,
          checksum: 'abc123'
        }
      ];

      mockDb.prepare().all.mockReturnValue(appliedMigrations);

      // When: 状態を取得
      const status = migrationService.getStatus();

      // Then: 正しい状態が返される
      expect(status.applied).toBe(1);
      expect(status.pending).toBe(1);
      expect(status.total).toBe(2);
      expect(status.lastApplied).toEqual(appliedMigrations[0]);
    });

    it('適用済みマイグレーションがない場合は適切な状態を返すこと', () => {
      // Given: 適用済みマイグレーションなし
      mockDb.prepare().all.mockReturnValue([]);

      // When: 状態を取得
      const status = migrationService.getStatus();

      // Then: lastAppliedがundefined
      expect(status.applied).toBe(0);
      expect(status.lastApplied).toBeUndefined();
    });
  });

  describe('TRPGスキーマ関連のマイグレーション', () => {
    it('TRPGキャンペーンテーブル作成マイグレーションが実行されること', async () => {
      // Given: キャンペーンテーブル作成マイグレーション
      const campaignMigration = {
        id: 'create_campaigns_table',
        version: '1.0.0',
        description: 'Create campaigns table for TRPG',
        up: jest.fn().mockImplementation((db: any) => {
          db.exec(`
            CREATE TABLE campaigns (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
          `);
        }),
        down: jest.fn().mockImplementation((db: any) => {
          db.exec('DROP TABLE campaigns');
        }),
        timestamp: '2025-01-01T00:00:00Z'
      };

      // When: マイグレーションを実行
      const result = await migrationService.runMigration(campaignMigration);

      // Then: 正常に実行される
      expect(result.status).toBe('success');
      expect(campaignMigration.up).toHaveBeenCalledWith(mockDb);
    });

    it('キャラクターデータ追加マイグレーションが実行されること', async () => {
      // Given: キャラクター関連フィールド追加マイグレーション
      const characterFieldsMigration = {
        id: 'add_character_fields',
        version: '2.0.0',
        description: 'Add character management fields',
        up: jest.fn().mockImplementation((db: any) => {
          db.exec('ALTER TABLE characters ADD COLUMN ai_generated INTEGER DEFAULT 0');
          db.exec('ALTER TABLE characters ADD COLUMN personality_traits TEXT');
        }),
        down: jest.fn().mockImplementation((db: any) => {
          db.exec('ALTER TABLE characters DROP COLUMN ai_generated');
          db.exec('ALTER TABLE characters DROP COLUMN personality_traits');
        }),
        timestamp: '2025-01-02T00:00:00Z'
      };

      // When: マイグレーションを実行
      const result = await migrationService.runMigration(characterFieldsMigration);

      // Then: 正常に実行される
      expect(result.status).toBe('success');
      expect(characterFieldsMigration.up).toHaveBeenCalledWith(mockDb);
    });
  });
});