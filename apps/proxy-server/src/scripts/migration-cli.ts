#!/usr/bin/env node

/**
 * マイグレーション管理CLI
 * 
 * 本番運用に必要なマイグレーション機能を提供：
 * - マイグレーションの実行
 * - ロールバック
 * - 状態確認
 * - 整合性チェック
 */

import { Command } from 'commander';
import { MigrationService } from '../services/migrationService';
import { initializeDatabase } from '../database/database';
import { logger } from '../utils/logger';

// 色付きログ出力
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg: string) => console.log(`${colors.green}[INFO]${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  header: (msg: string) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  table: (data: any[]) => console.table(data)
};

class MigrationCLI {
  private migrationService: MigrationService;

  constructor() {
    this.migrationService = new MigrationService();
  }

  async init(): Promise<void> {
    try {
      await initializeDatabase();
      await this.migrationService.loadMigrationsFromDirectory();
      log.info('Migration CLI initialized successfully');
    } catch (error) {
      log.error('Failed to initialize migration CLI');
      logger.error('Migration CLI initialization error:', error);
      process.exit(1);
    }
  }

  async status(): Promise<void> {
    log.header('=== Migration Status ===');
    
    const status = this.migrationService.getStatus();
    const applied = this.migrationService.getAppliedMigrations();
    const pending = this.migrationService.getPendingMigrations();

    log.info(`Applied: ${status.applied}/${status.total}`);
    log.info(`Pending: ${status.pending}/${status.total}`);
    
    if (status.lastApplied) {
      log.info(`Last applied: ${status.lastApplied.id} (${status.lastApplied.version})`);
      log.info(`Applied at: ${status.lastApplied.applied_at}`);
    }

    if (applied.length > 0) {
      log.header('\nApplied Migrations:');
      log.table(applied.map(m => ({
        ID: m.id,
        Version: m.version,
        Description: m.description,
        'Applied At': new Date(m.applied_at).toLocaleString(),
        'Execution Time': `${m.execution_time}ms`
      })));
    }

    if (pending.length > 0) {
      log.header('\nPending Migrations:');
      log.table(pending.map(m => ({
        ID: m.id,
        Version: m.version,
        Description: m.description,
        Timestamp: new Date(m.timestamp).toLocaleString()
      })));
    }
  }

  async up(): Promise<void> {
    log.header('=== Running Migrations ===');
    
    const pending = this.migrationService.getPendingMigrations();
    
    if (pending.length === 0) {
      log.info('No pending migrations found');
      return;
    }

    log.info(`Found ${pending.length} pending migrations`);
    
    const results = await this.migrationService.runPendingMigrations();
    
    log.header('\nMigration Results:');
    log.table(results.map(r => ({
      ID: r.id,
      Version: r.version,
      Status: r.status,
      'Execution Time': `${r.executionTime}ms`,
      Error: r.error || '-'
    })));

    const succeeded = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    if (failed > 0) {
      log.error(`${failed} migrations failed`);
      process.exit(1);
    } else {
      log.success(`${succeeded} migrations completed successfully`);
    }
  }

  async down(targetVersion?: string): Promise<void> {
    log.header('=== Rolling Back Migrations ===');
    
    if (!targetVersion) {
      log.error('Target version is required for rollback');
      process.exit(1);
    }

    const applied = this.migrationService.getAppliedMigrations();
    const toRollback = applied.filter(m => m.version > targetVersion);

    if (toRollback.length === 0) {
      log.info(`No migrations to rollback to version ${targetVersion}`);
      return;
    }

    log.warn(`This will rollback ${toRollback.length} migrations`);
    log.warn('Are you sure? This action cannot be undone.');
    
    // 実際のプロダクションでは確認プロンプトを追加する
    const results = await this.migrationService.rollbackToVersion(targetVersion);
    
    log.header('\nRollback Results:');
    log.table(results.map(r => ({
      ID: r.id,
      Version: r.version,
      Status: r.status,
      'Execution Time': `${r.executionTime}ms`,
      Error: r.error || '-'
    })));

    const succeeded = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    if (failed > 0) {
      log.error(`${failed} rollbacks failed`);
      process.exit(1);
    } else {
      log.success(`${succeeded} rollbacks completed successfully`);
    }
  }

  async validate(): Promise<void> {
    log.header('=== Validating Migrations ===');
    
    const validation = this.migrationService.validateMigrations();
    
    if (validation.valid) {
      log.success('All migrations are valid');
    } else {
      log.error('Migration validation failed:');
      validation.errors.forEach(error => {
        log.error(`  - ${error}`);
      });
      process.exit(1);
    }
  }

  async create(name: string): Promise<void> {
    log.header('=== Creating New Migration ===');
    
    if (!name) {
      log.error('Migration name is required');
      process.exit(1);
    }

    const timestamp = new Date().toISOString();
    const status = this.migrationService.getStatus();
    const nextVersion = String(status.total + 1).padStart(3, '0');
    
    const migrationTemplate = `import { Migration } from '../services/migrationService';

/**
 * ${name}
 * 
 * Description: Add your migration description here
 */
const migration: Migration = {
  id: '${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}',
  version: '${nextVersion}',
  description: '${name}',
  timestamp: '${timestamp}',

  up: async (db) => {
    // Add your migration code here
    console.log('Applying migration: ${name}');
    
    // Example:
    // db.exec(\`
    //   ALTER TABLE table_name 
    //   ADD COLUMN new_column TEXT
    // \`);
  },

  down: async (db) => {
    // Add your rollback code here
    console.log('Rolling back migration: ${name}');
    
    // Example:
    // db.exec(\`
    //   ALTER TABLE table_name 
    //   DROP COLUMN new_column
    // \`);
  }
};

export default migration;`;

    const migrationsDir = process.cwd() + '/src/migrations';
    const fileName = `${nextVersion}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ts`;
    const filePath = `${migrationsDir}/${fileName}`;

    try {
      const fs = await import('fs');
      fs.writeFileSync(filePath, migrationTemplate);
      log.success(`Migration created: ${filePath}`);
    } catch (error) {
      log.error(`Failed to create migration: ${error}`);
      process.exit(1);
    }
  }
}

// CLI設定
const program = new Command();

program
  .name('migration-cli')
  .description('Database migration management CLI')
  .version('1.0.0');

program
  .command('status')
  .description('Show migration status')
  .action(async () => {
    const cli = new MigrationCLI();
    await cli.init();
    await cli.status();
  });

program
  .command('up')
  .description('Run pending migrations')
  .action(async () => {
    const cli = new MigrationCLI();
    await cli.init();
    await cli.up();
  });

program
  .command('down')
  .description('Rollback migrations to specified version')
  .argument('<version>', 'Target version to rollback to')
  .action(async (version: string) => {
    const cli = new MigrationCLI();
    await cli.init();
    await cli.down(version);
  });

program
  .command('validate')
  .description('Validate migration integrity')
  .action(async () => {
    const cli = new MigrationCLI();
    await cli.init();
    await cli.validate();
  });

program
  .command('create')
  .description('Create a new migration')
  .argument('<name>', 'Migration name')
  .action(async (name: string) => {
    const cli = new MigrationCLI();
    await cli.init();
    await cli.create(name);
  });

// エラーハンドリング
program.configureOutput({
  writeErr: (str) => process.stderr.write(`${colors.red}${str}${colors.reset}`)
});

// 未処理のエラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  process.exit(1);
});

// CLI実行
if (require.main === module) {
  program.parse(process.argv);
}