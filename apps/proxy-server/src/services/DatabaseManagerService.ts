import { Database } from 'better-sqlite3';
import { 
  AIMilestone, 
  EntityPool, 
  EntityPoolCollection,
  ID
} from '@ai-agent-trpg/types';
import { getDatabase } from '../database/database';
import { logger } from '../utils/logger';

/**
 * データベース操作専用サービス
 * マイルストーン・エンティティプール関連のCRUD操作を担当
 */
export class DatabaseManagerService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
    this.initTables();
  }

  /**
   * テーブル初期化
   */
  private initTables(): void {
    // AI マイルストーンテーブル（実際のスキーマに合わせて修正）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_milestones (
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
      )
    `);

    // エンティティプールテーブル（拡張版）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entity_pools (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        theme_id TEXT NOT NULL,
        entities TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        last_updated TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )
    `);

    // 場所エンティティマッピングテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS location_entity_mappings (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        location_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_category TEXT NOT NULL,
        time_conditions TEXT,
        prerequisite_entities TEXT,
        is_available BOOLEAN DEFAULT TRUE,
        discovered_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // マイルストーン生成履歴テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS milestone_generation_history (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        generation_metadata TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )
    `);

    logger.info('✅ データベーステーブル初期化完了');
  }

  /**
   * 生成結果のデータベース一括コミット
   */
  async commitToDatabase(
    milestones: AIMilestone[], 
    entityPool: EntityPool,
    campaignId: ID,
    sessionId: ID,
    themeId: ID
  ): Promise<{ milestones: AIMilestone[], entityPool: EntityPool }> {
    const transaction = this.db.transaction(() => {
      // マイルストーンを保存
      const milestoneStmt = this.db.prepare(`
        INSERT INTO ai_milestones (
          id, campaign_id, session_id, title, description, type, 
          target_entity_ids, milestone_targets, 
          status, progress, required_conditions, 
          reward, player_hints, guidance_messages, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      milestones.forEach(milestone => {
        const currentTime = new Date().toISOString();
        milestoneStmt.run(
          milestone.id,
          campaignId, // Use parameter instead of non-existent property
          sessionId, // Use parameter instead of non-existent property
          milestone.name, // Use name instead of title
          milestone.description,
          milestone.type,
          JSON.stringify([]), // Empty array for target_entity_ids
          JSON.stringify([]), // Empty array for milestone_targets
          'pending', // Default status
          0, // Default progress
          JSON.stringify(milestone.conditions),
          JSON.stringify(milestone.rewards),
          JSON.stringify([]), // player_hints - empty for now
          JSON.stringify([]), // guidance_messages - empty for now
          currentTime, // Use current time instead of non-existent createdAt
          currentTime
        );
      });

      // エンティティプールを保存
      const poolStmt = this.db.prepare(`
        INSERT OR REPLACE INTO entity_pools (
          id, campaign_id, session_id, theme_id, 
          entities, generated_at, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const entityPoolId = `pool_${sessionId}_${Date.now()}`;
      const currentTime = new Date().toISOString();

      // EntityPoolCollectionを適切な形式で保存
      poolStmt.run(
        entityPoolId,
        campaignId,
        sessionId,
        themeId,
        JSON.stringify(entityPool.entities),
        currentTime,
        currentTime
      );

      // 生成履歴を保存
      const historyStmt = this.db.prepare(`
        INSERT INTO milestone_generation_history (
          id, campaign_id, session_id, generation_metadata, generated_at
        ) VALUES (?, ?, ?, ?, ?)
      `);

      // EntityPoolCollectionから適切にエンティティ数を計算
      const entityCollection = entityPool.entities as EntityPoolCollection;
      const entitiesCount = 
        (entityCollection.coreEntities?.enemies?.length || 0) +
        (entityCollection.coreEntities?.events?.length || 0) +
        (entityCollection.coreEntities?.npcs?.length || 0) +
        (entityCollection.coreEntities?.items?.length || 0) +
        (entityCollection.coreEntities?.quests?.length || 0) +
        (entityCollection.bonusEntities?.practicalRewards?.length || 0) +
        (entityCollection.bonusEntities?.trophyItems?.length || 0) +
        (entityCollection.bonusEntities?.mysteryItems?.length || 0);

      historyStmt.run(
        `history_${sessionId}_${Date.now()}`,
        campaignId,
        sessionId,
        JSON.stringify({
          milestonesGenerated: milestones.length,
          entitiesGenerated: entitiesCount,
          poolId: entityPoolId,
          themeId: themeId
        }),
        currentTime
      );

      return {
        milestones,
        entityPool: {
          id: entityPoolId,
          campaignId,
          sessionId,
          themeId,
          entities: entityPool.entities,
          generatedAt: currentTime,
          lastUpdated: currentTime
        } as EntityPool
      };
    });

    const result = transaction();
    
    logger.info('✅ データベースコミット成功', { 
      milestonesCount: milestones.length,
      entityPoolId: result.entityPool.id
    });

    return result;
  }

  /**
   * キャンペーンのAIマイルストーン一覧取得
   */
  async getAIMilestonesByCampaign(campaignId: ID): Promise<AIMilestone[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM ai_milestones 
      WHERE campaign_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(campaignId) as any[];
    
    const milestones: AIMilestone[] = rows.map(row => ({
      id: row.id,
      name: row.title || 'Milestone',
      description: row.description,
      type: row.type as ('story' | 'combat' | 'exploration' | 'social'),
      conditions: JSON.parse(row.required_conditions || '[]'),
      rewards: JSON.parse(row.reward || '{}'),
      difficulty: 5, // Default difficulty
      estimatedTime: 30 // Default 30 minutes
    }));

    logger.info('✅ マイルストーン一覧取得成功', { 
      campaignId,
      count: milestones.length 
    });

    return milestones;
  }

  /**
   * セッションのエンティティプール取得
   */
  async getEntityPoolBySession(sessionId: ID): Promise<EntityPool | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM entity_pools 
      WHERE session_id = ?
      ORDER BY last_updated DESC
      LIMIT 1
    `);

    const row = stmt.get(sessionId) as any;
    
    if (!row) {
      logger.info('エンティティプールが見つかりません', { sessionId });
      return null;
    }

    const entitiesData = JSON.parse(row.entities || '{}') as EntityPoolCollection;

    // EntityPoolCollectionの構造を確保
    const entities: EntityPoolCollection = {
      coreEntities: entitiesData.coreEntities || {
        enemies: [],
        events: [],
        npcs: [],
        items: [],
        quests: []
      },
      bonusEntities: entitiesData.bonusEntities || {
        practicalRewards: [],
        trophyItems: [],
        mysteryItems: []
      },
      // 後方互換性
      enemies: entitiesData.enemies || [],
      events: entitiesData.events || [],
      npcs: entitiesData.npcs || [],
      items: entitiesData.items || [],
      quests: entitiesData.quests || []
    };

    const entityPool: EntityPool = {
      id: row.id,
      campaignId: row.campaign_id,
      sessionId: row.session_id,
      themeId: row.theme_id,
      entities: entities,
      generatedAt: row.generated_at,
      lastUpdated: row.last_updated
    };

    logger.info('✅ エンティティプール取得成功', { 
      sessionId,
      poolId: entityPool.id 
    });

    return entityPool;
  }

  /**
   * エンティティプールを更新・保存
   */
  async saveEntityPool(sessionId: ID, entityPool: EntityPool): Promise<void> {
    const updateStmt = this.db.prepare(`
      UPDATE entity_pools 
      SET entities = ?, last_updated = ?
      WHERE session_id = ?
    `);

    // EntityPoolCollectionを適切に保存
    const currentTime = new Date().toISOString();
    
    const result = updateStmt.run(
      JSON.stringify(entityPool.entities),
      currentTime,
      sessionId
    );

    if (result.changes === 0) {
      logger.warn('エンティティプールの更新に失敗しました', { sessionId });
      throw new Error('Failed to update entity pool');
    }

    logger.info('✅ エンティティプール更新成功', { sessionId });
  }

  /**
   * マイルストーン進捗更新
   */
  async updateMilestoneProgress(
    milestoneId: ID, 
    progress: number, 
    status?: 'pending' | 'in_progress' | 'completed'
  ): Promise<void> {
    // 現在のマイルストーンを取得
    const getMilestoneStmt = this.db.prepare('SELECT * FROM ai_milestones WHERE id = ?');
    const milestone = getMilestoneStmt.get(milestoneId) as any;
    
    if (!milestone) {
      throw new Error(`Milestone with ID ${milestoneId} not found`);
    }

    // 進捗に基づいてステータスを自動設定
    let newStatus = status || milestone.status;
    if (!status) {
      if (progress === 0) {
        newStatus = 'pending';
      } else if (progress === 100) {
        newStatus = 'completed';
      } else {
        newStatus = 'in_progress';
      }
    }

    // 更新実行
    const updateStmt = this.db.prepare(`
      UPDATE ai_milestones 
      SET 
        progress = ?,
        status = ?,
        completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END
      WHERE id = ?
    `);

    const result = updateStmt.run(progress, newStatus, newStatus, milestoneId);
    
    if (result.changes === 0) {
      throw new Error(`Failed to update milestone with ID ${milestoneId}`);
    }

    logger.info('✅ マイルストーン進捗更新成功', { 
      milestoneId,
      progress,
      status: newStatus,
      updated: result.changes
    });
  }

  /**
   * マイルストーン削除
   */
  async deleteAIMilestone(milestoneId: ID): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM ai_milestones WHERE id = ?
    `);

    const result = stmt.run(milestoneId);
    
    if (result.changes === 0) {
      throw new Error(`Milestone with ID ${milestoneId} not found`);
    }

    logger.info('✅ マイルストーン削除成功', { 
      milestoneId,
      deletedRows: result.changes 
    });
  }
}

// Lazy initialization
let _databaseManagerService: DatabaseManagerService | null = null;
export function getDatabaseManagerService(): DatabaseManagerService {
  if (!_databaseManagerService) {
    _databaseManagerService = new DatabaseManagerService();
  }
  return _databaseManagerService;
}