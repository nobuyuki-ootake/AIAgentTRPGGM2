import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import { getDatabase } from '../database/database';

// マイグレーション定義の型
export interface Migration {
  id: string;
  version: string;
  description: string;
  up: (db: Database.Database) => Promise<void> | void;
  down: (db: Database.Database) => Promise<void> | void;
  timestamp: string;
}

// マイグレーション実行結果の型
export interface MigrationResult {
  id: string;
  version: string;
  description: string;
  status: 'success' | 'error' | 'skipped';
  executionTime: number;
  error?: string;
}

// マイグレーション状態の型
export interface MigrationStatus {
  id: string;
  version: string;
  description: string;
  applied_at: string;
  execution_time: number;
  checksum: string;
}

/**
 * データベースマイグレーションサービス
 * 
 * このサービスは以下の機能を提供します：
 * - マイグレーションの実行とロールバック
 * - バージョン管理
 * - 実行状態の追跡
 * - チェックサム検証
 */
export class MigrationService {
  private db: Database.Database;
  private migrations: Migration[] = [];
  private migrationsDir: string;

  constructor(migrationsDir?: string) {
    this.db = getDatabase();
    this.migrationsDir = migrationsDir || path.join(process.cwd(), 'src', 'migrations');
    this.initializeMigrationTable();
  }

  /**
   * マイグレーション管理テーブルを初期化
   */
  private initializeMigrationTable(): void {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        execution_time INTEGER NOT NULL,
        checksum TEXT NOT NULL
      )
    `;

    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
      ON schema_migrations(version)
    `;

    try {
      this.db.exec(createTableSQL);
      this.db.exec(createIndexSQL);
      logger.info('Migration table initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize migration table:', error);
      throw error;
    }
  }

  /**
   * マイグレーションを登録
   */
  public registerMigration(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * ディレクトリからマイグレーションを読み込み
   */
  public async loadMigrationsFromDirectory(): Promise<void> {
    if (!fs.existsSync(this.migrationsDir)) {
      logger.warn(`Migrations directory not found: ${this.migrationsDir}`);
      return;
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
      .sort();

    for (const file of files) {
      const filePath = path.join(this.migrationsDir, file);
      
      try {
        const migrationModule = await import(filePath);
        if (migrationModule.default && typeof migrationModule.default === 'object') {
          this.registerMigration(migrationModule.default);
          logger.info(`Loaded migration: ${file}`);
        } else {
          logger.warn(`Invalid migration file: ${file}`);
        }
      } catch (error) {
        logger.error(`Failed to load migration ${file}:`, error);
      }
    }
  }

  /**
   * 適用済みマイグレーションを取得
   */
  public getAppliedMigrations(): MigrationStatus[] {
    const stmt = this.db.prepare(`
      SELECT id, version, description, applied_at, execution_time, checksum
      FROM schema_migrations
      ORDER BY version ASC
    `);

    return stmt.all() as MigrationStatus[];
  }

  /**
   * 未適用のマイグレーションを取得
   */
  public getPendingMigrations(): Migration[] {
    const applied = this.getAppliedMigrations();
    const appliedIds = new Set(applied.map(m => m.id));
    
    return this.migrations.filter(m => !appliedIds.has(m.id));
  }

  /**
   * マイグレーションのチェックサムを計算
   */
  private calculateChecksum(migration: Migration): string {
    const content = migration.id + migration.version + migration.description + migration.up.toString();
    return Buffer.from(content).toString('base64');
  }

  /**
   * 単一のマイグレーションを実行
   */
  public async runMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();
    const checksum = this.calculateChecksum(migration);

    try {
      logger.info(`Running migration: ${migration.id} - ${migration.description}`);

      // トランザクション内でマイグレーションを実行
      const transaction = this.db.transaction(() => {
        // マイグレーションの実行
        return migration.up(this.db);
      });

      await transaction();

      // 実行時間を計算
      const executionTime = Date.now() - startTime;

      // マイグレーション記録を保存
      const insertStmt = this.db.prepare(`
        INSERT INTO schema_migrations (id, version, description, applied_at, execution_time, checksum)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        migration.id,
        migration.version,
        migration.description,
        new Date().toISOString(),
        executionTime,
        checksum
      );

      logger.info(`Migration completed: ${migration.id} (${executionTime}ms)`);

      return {
        id: migration.id,
        version: migration.version,
        description: migration.description,
        status: 'success',
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`Migration failed: ${migration.id}`, error);

      return {
        id: migration.id,
        version: migration.version,
        description: migration.description,
        status: 'error',
        executionTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * マイグレーションをロールバック
   */
  public async rollbackMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      logger.info(`Rolling back migration: ${migration.id} - ${migration.description}`);

      // トランザクション内でロールバックを実行
      const transaction = this.db.transaction(() => {
        return migration.down(this.db);
      });

      await transaction();

      // 実行時間を計算
      const executionTime = Date.now() - startTime;

      // マイグレーション記録を削除
      const deleteStmt = this.db.prepare(`
        DELETE FROM schema_migrations WHERE id = ?
      `);

      deleteStmt.run(migration.id);

      logger.info(`Migration rolled back: ${migration.id} (${executionTime}ms)`);

      return {
        id: migration.id,
        version: migration.version,
        description: migration.description,
        status: 'success',
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`Migration rollback failed: ${migration.id}`, error);

      return {
        id: migration.id,
        version: migration.version,
        description: migration.description,
        status: 'error',
        executionTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * すべての未適用マイグレーションを実行
   */
  public async runPendingMigrations(): Promise<MigrationResult[]> {
    const pending = this.getPendingMigrations();
    const results: MigrationResult[] = [];

    logger.info(`Found ${pending.length} pending migrations`);

    for (const migration of pending) {
      const result = await this.runMigration(migration);
      results.push(result);

      // エラーが発生した場合は実行を停止
      if (result.status === 'error') {
        logger.error(`Migration failed, stopping execution: ${migration.id}`);
        break;
      }
    }

    return results;
  }

  /**
   * マイグレーションを特定のバージョンまでロールバック
   */
  public async rollbackToVersion(targetVersion: string): Promise<MigrationResult[]> {
    const applied = this.getAppliedMigrations();
    const results: MigrationResult[] = [];

    // ターゲットバージョン以降のマイグレーションを特定
    const toRollback = applied.filter(m => m.version > targetVersion);

    logger.info(`Rolling back ${toRollback.length} migrations to version ${targetVersion}`);

    // 逆順でロールバック
    toRollback.reverse();

    for (const appliedMigration of toRollback) {
      const migration = this.migrations.find(m => m.id === appliedMigration.id);
      
      if (!migration) {
        logger.warn(`Migration not found in registry: ${appliedMigration.id}`);
        continue;
      }

      const result = await this.rollbackMigration(migration);
      results.push(result);

      // エラーが発生した場合は実行を停止
      if (result.status === 'error') {
        logger.error(`Rollback failed, stopping execution: ${migration.id}`);
        break;
      }
    }

    return results;
  }

  /**
   * マイグレーションの整合性チェック
   */
  public validateMigrations(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const applied = this.getAppliedMigrations();

    // 適用済みマイグレーションのチェックサム検証
    for (const appliedMigration of applied) {
      const migration = this.migrations.find(m => m.id === appliedMigration.id);
      
      if (!migration) {
        errors.push(`Applied migration not found in registry: ${appliedMigration.id}`);
        continue;
      }

      const currentChecksum = this.calculateChecksum(migration);
      if (currentChecksum !== appliedMigration.checksum) {
        errors.push(`Checksum mismatch for migration ${appliedMigration.id}`);
      }
    }

    // 重複チェック
    const ids = this.migrations.map(m => m.id);
    const versions = this.migrations.map(m => m.version);
    
    if (new Set(ids).size !== ids.length) {
      errors.push('Duplicate migration IDs found');
    }

    if (new Set(versions).size !== versions.length) {
      errors.push('Duplicate migration versions found');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * マイグレーション状態の表示
   */
  public getStatus(): {
    applied: number;
    pending: number;
    total: number;
    lastApplied?: MigrationStatus;
  } {
    const applied = this.getAppliedMigrations();
    const pending = this.getPendingMigrations();
    const lastApplied = applied.length > 0 ? applied[applied.length - 1] : undefined;

    return {
      applied: applied.length,
      pending: pending.length,
      total: this.migrations.length,
      lastApplied
    };
  }
}