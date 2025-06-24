import { Database } from 'better-sqlite3';
import { 
  AIMilestone, 
  EntityPool, 
  EntityPoolCollection,
  ID,
  MilestoneType
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
    // AI マイルストーンテーブル（拡張版）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_milestones (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        target_entity_ids TEXT NOT NULL DEFAULT '[]',
        progress_contributions TEXT NOT NULL DEFAULT '[]',
        target_details TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        progress INTEGER NOT NULL DEFAULT 0,
        hidden_from_player BOOLEAN NOT NULL DEFAULT true,
        required_conditions TEXT NOT NULL DEFAULT '[]',
        reward TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
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
        core_entities TEXT NOT NULL DEFAULT '{}',
        bonus_entities TEXT NOT NULL DEFAULT '{}',
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
    entityPool: EntityPoolCollection,
    campaignId: ID,
    sessionId: ID,
    themeId: ID
  ): Promise<{ milestones: AIMilestone[], entityPool: EntityPool }> {
    const transaction = this.db.transaction(() => {
      // マイルストーンを保存
      const milestoneStmt = this.db.prepare(`
        INSERT INTO ai_milestones (
          id, campaign_id, session_id, title, description, type, 
          target_entity_ids, progress_contributions, target_details, 
          status, progress, hidden_from_player, required_conditions, 
          reward, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      milestones.forEach(milestone => {
        milestoneStmt.run(
          milestone.id,
          milestone.campaignId,
          milestone.sessionId,
          milestone.title,
          milestone.description,
          milestone.type,
          JSON.stringify(milestone.targetEntityIds),
          JSON.stringify(milestone.progressContributions),
          JSON.stringify(milestone.targetDetails),
          milestone.status,
          milestone.progress,
          milestone.hiddenFromPlayer ? 1 : 0,
          JSON.stringify(milestone.requiredConditions),
          JSON.stringify(milestone.reward),
          milestone.createdAt
        );
      });

      // エンティティプールを保存
      const poolStmt = this.db.prepare(`
        INSERT OR REPLACE INTO entity_pools (
          id, campaign_id, session_id, theme_id, 
          core_entities, bonus_entities, entities, 
          generated_at, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const entityPoolId = `pool_${sessionId}_${Date.now()}`;
      const currentTime = new Date().toISOString();

      // 後方互換性のため、既存のentitiesフィールドも作成
      const legacyEntities = {
        enemies: entityPool.coreEntities?.enemies || [],
        events: entityPool.coreEntities?.events || [],
        npcs: entityPool.coreEntities?.npcs || [],
        items: entityPool.coreEntities?.items || [],
        quests: entityPool.coreEntities?.quests || []
      };

      poolStmt.run(
        entityPoolId,
        campaignId,
        sessionId,
        themeId,
        JSON.stringify(entityPool.coreEntities),
        JSON.stringify(entityPool.bonusEntities),
        JSON.stringify(legacyEntities),
        currentTime,
        currentTime
      );

      // 生成履歴を保存
      const historyStmt = this.db.prepare(`
        INSERT INTO milestone_generation_history (
          id, campaign_id, session_id, generation_metadata, generated_at
        ) VALUES (?, ?, ?, ?, ?)
      `);

      historyStmt.run(
        `history_${sessionId}_${Date.now()}`,
        campaignId,
        sessionId,
        JSON.stringify({
          milestonesGenerated: milestones.length,
          coreEntitiesGenerated: {
            enemies: entityPool.coreEntities?.enemies?.length || 0,
            events: entityPool.coreEntities?.events?.length || 0,
            npcs: entityPool.coreEntities?.npcs?.length || 0,
            items: entityPool.coreEntities?.items?.length || 0,
            quests: entityPool.coreEntities?.quests?.length || 0
          },
          bonusEntitiesGenerated: {
            practicalRewards: entityPool.bonusEntities?.practicalRewards?.length || 0,
            trophyItems: entityPool.bonusEntities?.trophyItems?.length || 0,
            mysteryItems: entityPool.bonusEntities?.mysteryItems?.length || 0
          }
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
          entities: {
            ...entityPool,
            // 後方互換性
            ...legacyEntities
          },
          generatedAt: currentTime,
          lastUpdated: currentTime
        }
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
      campaignId: row.campaign_id,
      sessionId: row.session_id,
      title: row.title,
      description: row.description,
      type: row.type as MilestoneType,
      targetEntityIds: JSON.parse(row.target_entity_ids),
      progressContributions: JSON.parse(row.progress_contributions),
      targetDetails: JSON.parse(row.target_details),
      status: row.status,
      progress: row.progress,
      hiddenFromPlayer: Boolean(row.hidden_from_player),
      requiredConditions: JSON.parse(row.required_conditions),
      reward: JSON.parse(row.reward),
      createdAt: row.created_at,
      completedAt: row.completed_at
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

    const coreEntities = JSON.parse(row.core_entities);
    const bonusEntities = JSON.parse(row.bonus_entities);

    const entityPool: EntityPool = {
      id: row.id,
      campaignId: row.campaign_id,
      sessionId: row.session_id,
      themeId: row.theme_id,
      entities: {
        coreEntities,
        bonusEntities,
        // 後方互換性のため
        enemies: coreEntities?.enemies || [],
        events: coreEntities?.events || [],
        npcs: coreEntities?.npcs || [],
        items: coreEntities?.items || [],
        quests: coreEntities?.quests || []
      },
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