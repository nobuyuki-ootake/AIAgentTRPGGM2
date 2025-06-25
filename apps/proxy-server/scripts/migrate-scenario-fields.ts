#!/usr/bin/env node

/**
 * Phase 1 データベースマイグレーション: シナリオフィールド追加
 * 
 * セッションテーブルに以下のフィールドを追加：
 * - scenario_title: シナリオタイトル
 * - scenario_description: 400字程度の物語概要  
 * - scenario_theme: シナリオテーマ（ミステリー、冒険、ホラーなど）
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'trpg.db');
const DB_DIR = path.dirname(DB_PATH);

async function migrateScenarioFields(): Promise<void> {
  let db: Database.Database | null = null;

  try {
    console.log('🔧 Starting scenario fields migration...');
    console.log(`📁 Database path: ${DB_PATH}`);

    // データベースディレクトリを確認
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
      console.log(`📂 Created database directory: ${DB_DIR}`);
    }

    // データベース接続
    db = new Database(DB_PATH);
    console.log('📊 Connected to database successfully');

    // WALモードを確認
    const journalMode = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    console.log(`📝 Journal mode: ${journalMode.journal_mode}`);

    // 現在のsessionsテーブル構造を確認
    const tableInfo = db.prepare("PRAGMA table_info(sessions)").all();
    console.log('📋 Current sessions table structure:');
    tableInfo.forEach((column: any) => {
      console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.dflt_value ? `DEFAULT ${column.dflt_value}` : ''}`);
    });

    // シナリオフィールドが既に存在するかチェック
    const hasScenarioTitle = tableInfo.some((col: any) => col.name === 'scenario_title');
    const hasScenarioDescription = tableInfo.some((col: any) => col.name === 'scenario_description');
    const hasScenarioTheme = tableInfo.some((col: any) => col.name === 'scenario_theme');

    console.log('\n🔍 Checking existing scenario fields:');
    console.log(`  - scenario_title: ${hasScenarioTitle ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - scenario_description: ${hasScenarioDescription ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - scenario_theme: ${hasScenarioTheme ? '✅ EXISTS' : '❌ MISSING'}`);

    // トランザクション開始
    const transaction = db.transaction(() => {
      let addedCount = 0;

      // scenario_title フィールド追加
      if (!hasScenarioTitle) {
        db!.exec('ALTER TABLE sessions ADD COLUMN scenario_title TEXT');
        console.log('✅ Added scenario_title field');
        addedCount++;
      }

      // scenario_description フィールド追加  
      if (!hasScenarioDescription) {
        db!.exec('ALTER TABLE sessions ADD COLUMN scenario_description TEXT');
        console.log('✅ Added scenario_description field');
        addedCount++;
      }

      // scenario_theme フィールド追加
      if (!hasScenarioTheme) {
        db!.exec('ALTER TABLE sessions ADD COLUMN scenario_theme TEXT');
        console.log('✅ Added scenario_theme field');
        addedCount++;
      }

      return addedCount;
    });

    // トランザクション実行
    const addedCount = transaction();

    // 結果確認
    const updatedTableInfo = db.prepare("PRAGMA table_info(sessions)").all();
    console.log('\n📋 Updated sessions table structure:');
    updatedTableInfo.forEach((column: any) => {
      const isNew = ['scenario_title', 'scenario_description', 'scenario_theme'].includes(column.name);
      const marker = isNew ? '🆕' : '  ';
      console.log(`${marker} ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.dflt_value ? `DEFAULT ${column.dflt_value}` : ''}`);
    });

    console.log('\n📊 Migration Summary:');
    console.log(`  - Fields added: ${addedCount}`);
    console.log(`  - Total scenario fields: 3`);
    
    if (addedCount > 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('ℹ️  All scenario fields were already present - no changes needed');
    }

    // データベース接続を閉じる
    db.close();
    console.log('🔒 Database connection closed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    if (db) {
      try {
        db.close();
        console.log('🔒 Database connection closed after error');
      } catch (closeError) {
        console.error('❌ Failed to close database connection:', closeError);
      }
    }
    
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  migrateScenarioFields()
    .then(() => {
      console.log('\n🚀 Phase 1 database migration completed successfully!');
      console.log('👉 Next step: Add SessionScenario type definitions');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateScenarioFields };