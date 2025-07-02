// ==========================================
// エンティティ解放システム
// Phase 3-3: マイルストーン進捗に応じた新エンティティの動的解放機能
// ==========================================

import { v4 as uuidv4 } from 'uuid';
import { database } from '../database/database';
import { logger } from '../utils/logger';
import {
  UnifiedMilestone,
  EntityRelationships,
  EntityRelationshipRule,
  getMilestoneBaseInfo,
  ExplorationActionType,
  SkillCheckType,
  ID
} from '@repo/types';
import { explorationActionService } from './explorationActionService';
import { milestoneProgressService } from './milestoneProgressService';

// ==========================================
// エンティティ解放システム用型定義
// ==========================================

export interface EntityUnlockCondition {
  id: string;
  name: string;
  description: string;
  triggerType: 'milestone_progress' | 'milestone_completion' | 'entity_interaction' | 'combined';
  conditions: UnlockConditionRule[];
  unlockTargets: EntityUnlockTarget[];
  isActive: boolean;
  priority: number;
  sessionId: string;
  createdAt: string;
  lastTriggered?: string;
}

export interface UnlockConditionRule {
  type: 'milestone_progress_threshold' | 'milestone_completed' | 'entity_completed' | 'character_action';
  targetId: string;
  threshold?: number;
  operator: 'gte' | 'lte' | 'eq' | 'contains';
  value: any;
  isOptional: boolean;
  weight: number;
}

export interface EntityUnlockTarget {
  entityType: 'object' | 'npc' | 'location_feature' | 'hazard' | 'treasure';
  entityName: string;
  entityDescription: string;
  locationId: string;
  availableActions: Array<{
    actionType: ExplorationActionType;
    actionName: string;
    description: string;
    difficulty: 'easy' | 'normal' | 'hard' | 'expert';
    requiredSkill?: SkillCheckType;
    riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'dangerous';
  }>;
  unlockMessage: string;
  narrativeContext: string;
  isRevealed: boolean;
  unlockWeight: number;
}

export interface UnlockEvent {
  id: string;
  conditionId: string;
  sessionId: string;
  triggeredAt: string;
  triggerCharacterId?: string;
  unlockedEntities: string[];
  narrativeDescription: string;
  notificationSent: boolean;
}

export class EntityUnlockService {

  constructor() {
    this.initializeDatabase();
  }

  // ==========================================
  // データベース初期化
  // ==========================================

  private initializeDatabase() {
    try {
      // エンティティ解放条件テーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS entity_unlock_conditions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          trigger_type TEXT NOT NULL,
          conditions TEXT NOT NULL,
          unlock_targets TEXT NOT NULL,
          is_active BOOLEAN NOT NULL,
          priority INTEGER NOT NULL,
          session_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          last_triggered TEXT
        )
      `);

      // エンティティ解放イベントテーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS entity_unlock_events (
          id TEXT PRIMARY KEY,
          condition_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          triggered_at TEXT NOT NULL,
          trigger_character_id TEXT,
          unlocked_entities TEXT NOT NULL,
          narrative_description TEXT NOT NULL,
          notification_sent BOOLEAN NOT NULL
        )
      `);

      // インデックス作成
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_unlock_conditions_session_active 
        ON entity_unlock_conditions(session_id, is_active)
      `);

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_unlock_events_session 
        ON entity_unlock_events(session_id)
      `);

      logger.info('Entity unlock system database initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize entity unlock database:', error);
      throw error;
    }
  }

  // ==========================================
  // Phase 3-3: エンティティ解放条件管理
  // ==========================================

  /**
   * エンティティ解放条件を登録
   */
  async registerUnlockCondition(condition: Omit<EntityUnlockCondition, 'id' | 'createdAt'>): Promise<string> {
    try {
      const conditionId = uuidv4();
      const timestamp = new Date().toISOString();

      const fullCondition: EntityUnlockCondition = {
        ...condition,
        id: conditionId,
        createdAt: timestamp
      };

      const stmt = database.prepare(`
        INSERT INTO entity_unlock_conditions (
          id, name, description, trigger_type, conditions, unlock_targets,
          is_active, priority, session_id, created_at, last_triggered
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        conditionId,
        condition.name,
        condition.description,
        condition.triggerType,
        JSON.stringify(condition.conditions),
        JSON.stringify(condition.unlockTargets),
        condition.isActive,
        condition.priority,
        condition.sessionId,
        timestamp,
        null
      );

      logger.info(`Registered unlock condition: ${condition.name} (${conditionId})`);
      return conditionId;

    } catch (error) {
      logger.error('Failed to register unlock condition:', error);
      throw error;
    }
  }

  /**
   * マイルストーン進捗に基づく解放チェック
   */
  async checkUnlockConditionsOnMilestoneProgress(
    sessionId: string,
    milestoneId: string,
    currentProgress: number,
    characterId?: string
  ): Promise<void> {
    try {
      const activeConditions = await this.getActiveUnlockConditions(sessionId);
      
      for (const condition of activeConditions) {
        if (condition.triggerType === 'milestone_progress' || condition.triggerType === 'combined') {
          const shouldUnlock = await this.evaluateUnlockCondition(
            condition,
            { milestoneId, progress: currentProgress, characterId }
          );

          if (shouldUnlock) {
            await this.executeEntityUnlock(condition, characterId);
          }
        }
      }

    } catch (error) {
      logger.error('Failed to check unlock conditions on milestone progress:', error);
    }
  }

  /**
   * マイルストーン完了に基づく解放チェック
   */
  async checkUnlockConditionsOnMilestoneCompletion(
    sessionId: string,
    completedMilestone: UnifiedMilestone,
    characterId?: string
  ): Promise<void> {
    try {
      const baseInfo = getMilestoneBaseInfo(completedMilestone);
      const activeConditions = await this.getActiveUnlockConditions(sessionId);
      
      for (const condition of activeConditions) {
        if (condition.triggerType === 'milestone_completion' || condition.triggerType === 'combined') {
          const shouldUnlock = await this.evaluateUnlockCondition(
            condition,
            { milestoneId: baseInfo.id, completed: true, characterId }
          );

          if (shouldUnlock) {
            await this.executeEntityUnlock(condition, characterId);
          }
        }
      }

    } catch (error) {
      logger.error('Failed to check unlock conditions on milestone completion:', error);
    }
  }

  /**
   * エンティティ相互作用に基づく解放チェック
   */
  async checkUnlockConditionsOnEntityInteraction(
    sessionId: string,
    entityId: string,
    characterId: string,
    interactionSuccess: boolean
  ): Promise<void> {
    try {
      const activeConditions = await this.getActiveUnlockConditions(sessionId);
      
      for (const condition of activeConditions) {
        if (condition.triggerType === 'entity_interaction' || condition.triggerType === 'combined') {
          const shouldUnlock = await this.evaluateUnlockCondition(
            condition,
            { entityId, characterId, success: interactionSuccess }
          );

          if (shouldUnlock) {
            await this.executeEntityUnlock(condition, characterId);
          }
        }
      }

    } catch (error) {
      logger.error('Failed to check unlock conditions on entity interaction:', error);
    }
  }

  // ==========================================
  // Phase 3-3: 解放条件評価エンジン
  // ==========================================

  /**
   * 解放条件の評価
   */
  private async evaluateUnlockCondition(
    condition: EntityUnlockCondition,
    context: any
  ): Promise<boolean> {
    try {
      let totalScore = 0;
      let totalWeight = 0;
      let requiredRulesMet = 0;
      let totalRequiredRules = 0;

      for (const rule of condition.conditions) {
        const ruleResult = await this.evaluateConditionRule(rule, context, condition.sessionId);
        
        if (!rule.isOptional) {
          totalRequiredRules++;
          if (ruleResult) {
            requiredRulesMet++;
          }
        }

        if (ruleResult || !rule.isOptional) {
          totalScore += ruleResult ? rule.weight : 0;
          totalWeight += rule.weight;
        }
      }

      // 必須ルールがすべて満たされているかチェック
      const requiredRulesSatisfied = totalRequiredRules === 0 || requiredRulesMet === totalRequiredRules;
      
      // 重み付きスコアが閾値を超えているかチェック
      const weightedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
      const scoreThresholdMet = weightedScore >= 0.8; // 80%の条件を満たす必要

      const shouldUnlock = requiredRulesSatisfied && scoreThresholdMet;

      logger.debug(`Unlock condition evaluation: ${condition.name}, required=${requiredRulesSatisfied}, score=${weightedScore.toFixed(3)}, unlock=${shouldUnlock}`);
      
      return shouldUnlock;

    } catch (error) {
      logger.error('Failed to evaluate unlock condition:', error);
      return false;
    }
  }

  /**
   * 個別の条件ルールを評価
   */
  private async evaluateConditionRule(
    rule: UnlockConditionRule,
    context: any,
    sessionId: string
  ): Promise<boolean> {
    try {
      switch (rule.type) {
        case 'milestone_progress_threshold':
          return await this.evaluateMilestoneProgressRule(rule, context, sessionId);
          
        case 'milestone_completed':
          return await this.evaluateMilestoneCompletedRule(rule, context, sessionId);
          
        case 'entity_completed':
          return await this.evaluateEntityCompletedRule(rule, context, sessionId);
          
        case 'character_action':
          return await this.evaluateCharacterActionRule(rule, context, sessionId);
          
        default:
          logger.warn(`Unknown condition rule type: ${rule.type}`);
          return false;
      }

    } catch (error) {
      logger.error('Failed to evaluate condition rule:', error);
      return false;
    }
  }

  /**
   * マイルストーン進捗ルールの評価
   */
  private async evaluateMilestoneProgressRule(
    rule: UnlockConditionRule,
    context: any,
    sessionId: string
  ): Promise<boolean> {
    try {
      if (context.milestoneId !== rule.targetId) {
        return false;
      }

      const currentProgress = context.progress || 0;
      const threshold = rule.threshold || 0.5;

      switch (rule.operator) {
        case 'gte':
          return currentProgress >= threshold;
        case 'lte':
          return currentProgress <= threshold;
        case 'eq':
          return Math.abs(currentProgress - threshold) < 0.01;
        default:
          return false;
      }

    } catch (error) {
      logger.error('Failed to evaluate milestone progress rule:', error);
      return false;
    }
  }

  /**
   * マイルストーン完了ルールの評価
   */
  private async evaluateMilestoneCompletedRule(
    rule: UnlockConditionRule,
    context: any,
    sessionId: string
  ): Promise<boolean> {
    try {
      // 現在の文脈での完了チェック
      if (context.milestoneId === rule.targetId && context.completed) {
        return true;
      }

      // データベースでの完了状況確認
      const completionRow = database.prepare(`
        SELECT COUNT(*) as count FROM milestone_completions 
        WHERE milestone_id = ? AND session_id = ?
      `).get(rule.targetId, sessionId) as any;

      return completionRow && completionRow.count > 0;

    } catch (error) {
      logger.error('Failed to evaluate milestone completed rule:', error);
      return false;
    }
  }

  /**
   * エンティティ完了ルールの評価
   */
  private async evaluateEntityCompletedRule(
    rule: UnlockConditionRule,
    context: any,
    sessionId: string
  ): Promise<boolean> {
    try {
      // 現在の文脈でのエンティティ完了チェック
      if (context.entityId === rule.targetId && context.success) {
        return true;
      }

      // データベースでの完了状況確認
      const entityRow = database.prepare(`
        SELECT is_interacted FROM entity_exploration_actions 
        WHERE entity_id = ? AND session_id = ?
      `).get(rule.targetId, sessionId) as any;

      return entityRow && entityRow.is_interacted;

    } catch (error) {
      logger.error('Failed to evaluate entity completed rule:', error);
      return false;
    }
  }

  /**
   * キャラクターアクションルールの評価
   */
  private async evaluateCharacterActionRule(
    rule: UnlockConditionRule,
    context: any,
    sessionId: string
  ): Promise<boolean> {
    try {
      if (context.characterId !== rule.targetId) {
        return false;
      }

      // 特定のアクション条件をチェック
      const actionRequirement = rule.value;
      
      if (actionRequirement.type === 'interaction_success' && context.success) {
        return true;
      }

      if (actionRequirement.type === 'any_interaction') {
        return true;
      }

      return false;

    } catch (error) {
      logger.error('Failed to evaluate character action rule:', error);
      return false;
    }
  }

  // ==========================================
  // Phase 3-3: エンティティ解放実行
  // ==========================================

  /**
   * エンティティ解放を実行
   */
  private async executeEntityUnlock(
    condition: EntityUnlockCondition,
    characterId?: string
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const unlockedEntityIds: string[] = [];
      const narrativeDescriptions: string[] = [];

      // 各解放対象エンティティを生成
      for (const target of condition.unlockTargets) {
        const entityId = await explorationActionService.generateNewEntity(
          condition.sessionId,
          target.locationId,
          target.entityName,
          target.entityType,
          target.availableActions
        );

        unlockedEntityIds.push(entityId.entityId);
        narrativeDescriptions.push(target.narrativeContext);

        logger.info(`Unlocked entity: ${target.entityName} (${entityId.entityId}) in ${target.locationId}`);
      }

      // 解放イベントを記録
      const unlockEvent: UnlockEvent = {
        id: uuidv4(),
        conditionId: condition.id,
        sessionId: condition.sessionId,
        triggeredAt: timestamp,
        triggerCharacterId: characterId,
        unlockedEntities: unlockedEntityIds,
        narrativeDescription: narrativeDescriptions.join('\n'),
        notificationSent: false
      };

      await this.recordUnlockEvent(unlockEvent);

      // 条件の最終トリガー時刻を更新
      await this.updateConditionLastTriggered(condition.id, timestamp);

      // GM通知を準備（Phase 4-1で実装予定）
      await this.queueUnlockNotification(unlockEvent);

      logger.info(`🔓 Entity unlock executed: ${condition.name}, unlocked ${unlockedEntityIds.length} entities`);

    } catch (error) {
      logger.error('Failed to execute entity unlock:', error);
    }
  }

  /**
   * 解放イベントを記録
   */
  private async recordUnlockEvent(event: UnlockEvent): Promise<void> {
    try {
      const stmt = database.prepare(`
        INSERT INTO entity_unlock_events (
          id, condition_id, session_id, triggered_at, trigger_character_id,
          unlocked_entities, narrative_description, notification_sent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        event.id,
        event.conditionId,
        event.sessionId,
        event.triggeredAt,
        event.triggerCharacterId || null,
        JSON.stringify(event.unlockedEntities),
        event.narrativeDescription,
        event.notificationSent
      );

    } catch (error) {
      logger.error('Failed to record unlock event:', error);
    }
  }

  // ==========================================
  // ユーティリティメソッド
  // ==========================================

  /**
   * アクティブな解放条件を取得
   */
  private async getActiveUnlockConditions(sessionId: string): Promise<EntityUnlockCondition[]> {
    try {
      const rows = database.prepare(`
        SELECT * FROM entity_unlock_conditions 
        WHERE session_id = ? AND is_active = 1 
        ORDER BY priority DESC
      `).all(sessionId) as any[];

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        triggerType: row.trigger_type,
        conditions: JSON.parse(row.conditions),
        unlockTargets: JSON.parse(row.unlock_targets),
        isActive: row.is_active,
        priority: row.priority,
        sessionId: row.session_id,
        createdAt: row.created_at,
        lastTriggered: row.last_triggered
      }));

    } catch (error) {
      logger.error('Failed to get active unlock conditions:', error);
      return [];
    }
  }

  /**
   * 条件の最終トリガー時刻を更新
   */
  private async updateConditionLastTriggered(conditionId: string, timestamp: string): Promise<void> {
    try {
      const stmt = database.prepare(`
        UPDATE entity_unlock_conditions 
        SET last_triggered = ? 
        WHERE id = ?
      `);

      stmt.run(timestamp, conditionId);

    } catch (error) {
      logger.error('Failed to update condition last triggered:', error);
    }
  }

  /**
   * 解放通知をキューに追加（Phase 4-1で実装予定）
   */
  private async queueUnlockNotification(event: UnlockEvent): Promise<void> {
    // TODO: Phase 4-1で実装
    logger.debug('Queued unlock notification:', event.id);
  }

  // ==========================================
  // 公開API
  // ==========================================

  /**
   * セッションの解放履歴を取得
   */
  async getSessionUnlockHistory(sessionId: string): Promise<UnlockEvent[]> {
    try {
      const rows = database.prepare(`
        SELECT * FROM entity_unlock_events 
        WHERE session_id = ? 
        ORDER BY triggered_at DESC
      `).all(sessionId) as any[];

      return rows.map(row => ({
        id: row.id,
        conditionId: row.condition_id,
        sessionId: row.session_id,
        triggeredAt: row.triggered_at,
        triggerCharacterId: row.trigger_character_id,
        unlockedEntities: JSON.parse(row.unlocked_entities),
        narrativeDescription: row.narrative_description,
        notificationSent: row.notification_sent
      }));

    } catch (error) {
      logger.error('Failed to get session unlock history:', error);
      return [];
    }
  }

  /**
   * 解放条件を無効化
   */
  async deactivateUnlockCondition(conditionId: string): Promise<boolean> {
    try {
      const stmt = database.prepare(`
        UPDATE entity_unlock_conditions 
        SET is_active = 0 
        WHERE id = ?
      `);

      const result = stmt.run(conditionId);
      return result.changes > 0;

    } catch (error) {
      logger.error('Failed to deactivate unlock condition:', error);
      return false;
    }
  }
}

// シングルトンインスタンス
export const entityUnlockService = new EntityUnlockService();