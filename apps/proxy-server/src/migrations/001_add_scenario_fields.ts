import { Migration } from '../services/migrationService';

/**
 * Phase 1 データベースマイグレーション: シナリオフィールド追加
 * 
 * セッションテーブルに以下のフィールドを追加：
 * - scenario_title: シナリオタイトル
 * - scenario_description: 400字程度の物語概要  
 * - scenario_theme: シナリオテーマ（ミステリー、冒険、ホラーなど）
 */
const migration: Migration = {
  id: 'add_scenario_fields',
  version: '001',
  description: 'Add scenario fields to sessions table',
  timestamp: '2025-01-09T00:00:00.000Z',

  up: async (db) => {
    // 現在のテーブル構造を確認
    const tableInfo = db.prepare("PRAGMA table_info(sessions)").all();
    const existingColumns = new Set(tableInfo.map((col: any) => col.name));

    // シナリオフィールドを追加
    const fieldsToAdd = [
      { name: 'scenario_title', type: 'TEXT' },
      { name: 'scenario_description', type: 'TEXT' },
      { name: 'scenario_theme', type: 'TEXT' }
    ];

    for (const field of fieldsToAdd) {
      if (!existingColumns.has(field.name)) {
        db.exec(`ALTER TABLE sessions ADD COLUMN ${field.name} ${field.type}`);
        console.log(`Added ${field.name} field to sessions table`);
      } else {
        console.log(`Field ${field.name} already exists, skipping`);
      }
    }
  },

  down: async (db) => {
    // SQLiteではALTER TABLE DROP COLUMNがサポートされていないため、
    // テーブルを再作成する必要がある
    console.log('Warning: SQLite does not support dropping columns directly');
    console.log('Manual intervention required to remove scenario fields');
    
    // 安全のため、エラーとして扱う
    throw new Error('Column removal not supported in SQLite. Manual intervention required.');
  }
};

export default migration;