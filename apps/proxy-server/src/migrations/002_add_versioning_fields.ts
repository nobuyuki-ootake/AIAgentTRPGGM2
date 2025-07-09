import { Migration } from '../services/migrationService';

/**
 * Phase 2 データベースマイグレーション: バージョン管理フィールド追加
 * 
 * 主要テーブルにバージョン管理フィールドを追加：
 * - schema_version: スキーマバージョン
 * - data_version: データバージョン
 * - last_migration_id: 最後に適用されたマイグレーションID
 */
const migration: Migration = {
  id: 'add_versioning_fields',
  version: '002',
  description: 'Add versioning fields to main tables',
  timestamp: '2025-01-09T01:00:00.000Z',

  up: async (db) => {
    // 各テーブルにバージョン管理フィールドを追加
    const tables = [
      'campaigns',
      'characters',
      'sessions',
      'quests',
      'events',
      'locations'
    ];

    for (const table of tables) {
      // テーブルが存在するかチェック
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(table);

      if (!tableExists) {
        console.log(`Table ${table} does not exist, skipping`);
        continue;
      }

      // 現在のテーブル構造を確認
      const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
      const existingColumns = new Set(tableInfo.map((col: any) => col.name));

      // バージョン管理フィールドを追加
      const fieldsToAdd = [
        { name: 'schema_version', type: 'TEXT', default: "'1.0.0'" },
        { name: 'data_version', type: 'INTEGER', default: '1' },
        { name: 'last_migration_id', type: 'TEXT' }
      ];

      for (const field of fieldsToAdd) {
        if (!existingColumns.has(field.name)) {
          let sql = `ALTER TABLE ${table} ADD COLUMN ${field.name} ${field.type}`;
          if (field.default) {
            sql += ` DEFAULT ${field.default}`;
          }
          db.exec(sql);
          console.log(`Added ${field.name} field to ${table} table`);
        } else {
          console.log(`Field ${field.name} already exists in ${table}, skipping`);
        }
      }
    }

    // システム設定テーブルにバージョン情報を追加
    const versionSettings = [
      { key: 'schema_version', value: '1.0.0' },
      { key: 'migration_version', value: '002' },
      { key: 'last_migration_date', value: new Date().toISOString() }
    ];

    const upsertStmt = db.prepare(`
      INSERT OR REPLACE INTO system_settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    for (const setting of versionSettings) {
      upsertStmt.run(setting.key, setting.value, new Date().toISOString());
      console.log(`Updated system setting: ${setting.key} = ${setting.value}`);
    }
  },

  down: async (db) => {
    // バージョン管理フィールドの削除（SQLiteでは困難）
    console.log('Warning: SQLite does not support dropping columns directly');
    console.log('Manual intervention required to remove versioning fields');
    
    // システム設定からバージョン情報を削除
    const deleteStmt = db.prepare(`
      DELETE FROM system_settings 
      WHERE key IN ('schema_version', 'migration_version', 'last_migration_date')
    `);
    
    deleteStmt.run();
    console.log('Removed version settings from system_settings');
    
    // 他のフィールドについてはエラーとして扱う
    throw new Error('Column removal not supported in SQLite. Manual intervention required.');
  }
};

export default migration;