// ==========================================
// マイルストーン完了検知・イベント発火サービス
// Phase 2-4: マイルストーン完了検知とイベント発火機能
// ==========================================

import { database } from '../database/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import {
  UnifiedMilestone,
  EntityRelationshipRule,
  getMilestoneBaseInfo,
  isAIPoolMilestone,
  GMNotification,
  GMNotificationEvent
} from '@ai-agent-trpg/types';
import { NarrativeState } from './narrativeCalculationService';
import { entityUnlockService } from './entityUnlockService';

export class MilestoneCompletionService {
  private app: express.Application | null = null;
  private initialized = false;

  constructor() {
    // Lazy initialization - database will be initialized on first use
  }

  private ensureInitialized() {
    if (!this.initialized) {
      this.initializeDatabase();
      this.initialized = true;
    }
  }

  /**
   * Express アプリケーションインスタンスを設定（Socket.IO アクセス用）
   */
  setApp(app: express.Application): void {
    this.app = app;
  }

  // ==========================================
  // データベース初期化
  // ==========================================

  private initializeDatabase() {
    try {
      // マイルストーン完了詳細テーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS milestone_completion_details (
          milestone_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          completion_status TEXT NOT NULL,
          event_data TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (milestone_id, session_id)
        )
      `);

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_milestone_completion_details_session_id 
        ON milestone_completion_details(session_id)
      `);

      // Phase 4-1: GM通知システム用テーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS gm_notifications (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          session_id TEXT NOT NULL,
          priority TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'unread',
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          short_description TEXT,
          event_data TEXT NOT NULL,
          actions TEXT,
          metadata TEXT,
          timestamp TEXT NOT NULL,
          acknowledged_at TEXT,
          expires_at TEXT,
          auto_expire BOOLEAN NOT NULL DEFAULT 1,
          persist_after_read BOOLEAN NOT NULL DEFAULT 1,
          requires_acknowledgment BOOLEAN NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_gm_notifications_session_id_status 
        ON gm_notifications(session_id, status)
      `);

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_gm_notifications_type_priority 
        ON gm_notifications(type, priority)
      `);

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_gm_notifications_timestamp 
        ON gm_notifications(timestamp)
      `);

      logger.info('Milestone completion database initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize milestone completion database:', error);
      throw error;
    }
  }

  // ==========================================
  // Phase 2-4: 強化されたマイルストーン完了検知
  // ==========================================

  /**
   * マイルストーン完了チェック
   */
  async checkMilestoneCompletion(
    milestone: UnifiedMilestone,
    sessionId: string
  ): Promise<boolean> {
    this.ensureInitialized();
    try {
      const baseInfo = getMilestoneBaseInfo(milestone);
      const relationships = baseInfo.entityRelationships;
      
      if (!relationships) {
        return this.checkLegacyMilestoneCompletion(milestone, sessionId);
      }

      // 既に完了済みかチェック
      const isAlreadyCompleted = await this.isMilestoneAlreadyCompleted(baseInfo.id, sessionId);
      if (isAlreadyCompleted) {
        return true;
      }

      // 詳細な完了状況を計算
      const completionStatus = await this.calculateDetailedCompletionStatus(milestone, sessionId);
      
      if (completionStatus.isCompleted) {
        // 完了イベントを発火
        await this.fireMilestoneCompletionEvent(milestone, sessionId, completionStatus);
        return true;
      }

      return false;

    } catch (error) {
      logger.error('Failed to check milestone completion:', error);
      return false;
    }
  }

  /**
   * 詳細な完了状況計算
   */
  private async calculateDetailedCompletionStatus(
    milestone: UnifiedMilestone,
    sessionId: string
  ): Promise<{
    isCompleted: boolean;
    overallProgress: number;
    ruleCompletions: Array<{
      ruleIndex: number;
      ruleType: string;
      progress: number;
      isCompleted: boolean;
      weight: number;
      isOptional: boolean;
    }>;
    completionThreshold: number;
    completionCondition: string;
    narrativeReadiness: number;
  }> {
    try {
      const baseInfo = getMilestoneBaseInfo(milestone);
      const relationships = baseInfo.entityRelationships!;

      let totalProgress = 0;
      let totalWeight = 0;
      const ruleCompletions = [];

      // 各ルールの詳細進捗を計算
      for (let i = 0; i < relationships.rules.length; i++) {
        const rule = relationships.rules[i];
        const ruleProgress = await this.calculateRuleProgress(rule, sessionId);
        const isRuleCompleted = ruleProgress >= 1.0;
        
        ruleCompletions.push({
          ruleIndex: i,
          ruleType: rule.type,
          progress: ruleProgress,
          isCompleted: isRuleCompleted,
          weight: rule.completionWeight,
          isOptional: rule.isOptional
        });

        // 重み付き進捗計算
        if (!rule.isOptional || ruleProgress > 0) {
          totalProgress += ruleProgress * rule.completionWeight;
          totalWeight += rule.completionWeight;
        }
      }

      const overallProgress = totalWeight > 0 ? totalProgress / totalWeight : 0;
      
      // 物語的準備度を評価
      const narrativeReadiness = await this.evaluateNarrativeReadiness(milestone, sessionId);
      
      // 完了条件の判定
      let completionThreshold = 1.0;
      let isCompleted = false;

      switch (relationships.completionCondition) {
        case 'all_rules':
          isCompleted = ruleCompletions.filter(r => !r.isOptional).every(r => r.isCompleted);
          completionThreshold = 1.0;
          break;
          
        case 'any_rule':
          isCompleted = ruleCompletions.some(r => r.isCompleted);
          completionThreshold = 0.0;
          break;
          
        case 'weighted_threshold':
          completionThreshold = relationships.weightedThreshold || 0.8;
          isCompleted = overallProgress >= completionThreshold;
          break;
          
        default:
          isCompleted = overallProgress >= 1.0;
      }

      // 物語的準備度も考慮（最低60%の準備度が必要）
      if (isCompleted && narrativeReadiness < 0.6) {
        logger.info(`Milestone ${baseInfo.id} progress completed but narrative readiness insufficient: ${narrativeReadiness}`);
        isCompleted = false;
      }

      return {
        isCompleted,
        overallProgress,
        ruleCompletions,
        completionThreshold,
        completionCondition: relationships.completionCondition,
        narrativeReadiness
      };

    } catch (error) {
      logger.error('Failed to calculate detailed completion status:', error);
      return {
        isCompleted: false,
        overallProgress: 0,
        ruleCompletions: [],
        completionThreshold: 1.0,
        completionCondition: 'all_rules',
        narrativeReadiness: 0.0
      };
    }
  }

  /**
   * 物語的準備度の評価
   */
  private async evaluateNarrativeReadiness(
    milestone: UnifiedMilestone,
    sessionId: string
  ): Promise<number> {
    try {
      // TODO: Add milestone base info processing
      const currentNarrativeState = await this.getCurrentNarrativeState(sessionId);
      
      // ストーリー段階での適切性
      const phaseReadiness = this.calculatePhaseReadiness(milestone, currentNarrativeState.storyPhase);
      
      // キャラクター関与度
      const characterReadiness = this.calculateCharacterReadiness(currentNarrativeState.characterInvolvement);
      
      // 物語の一貫性
      const coherenceReadiness = currentNarrativeState.narrativeCoherence;
      
      // 緊張レベルの適切性
      const tensionReadiness = this.calculateTensionReadiness(
        currentNarrativeState.tensionLevel,
        milestone
      );

      // セッション進行の適切性
      const progressionReadiness = await this.calculateProgressionReadiness(sessionId);

      return (
        phaseReadiness * 0.25 +
        characterReadiness * 0.20 +
        coherenceReadiness * 0.20 +
        tensionReadiness * 0.20 +
        progressionReadiness * 0.15
      );

    } catch (error) {
      logger.error('Failed to evaluate narrative readiness:', error);
      return 0.5;
    }
  }

  /**
   * マイルストーン完了イベント発火
   */
  private async fireMilestoneCompletionEvent(
    milestone: UnifiedMilestone,
    sessionId: string,
    completionStatus: any
  ): Promise<void> {
    try {
      const baseInfo = getMilestoneBaseInfo(milestone);
      const timestamp = new Date().toISOString();

      // イベントデータ構築
      const eventData = {
        milestoneId: baseInfo.id,
        milestoneName: baseInfo.name,
        sessionId,
        completedAt: timestamp,
        completionStatus,
        narrativeProgression: baseInfo.entityRelationships?.narrativeProgression
      };

      // 1. データベースに完了記録
      await this.recordMilestoneCompletionWithDetails(milestone, sessionId, eventData);

      // 2. 完了通知イベント発火（Phase 4-1で実装予定）
      await this.queueMilestoneCompletionNotification(eventData);

      // 3. 物語進行トリガー（Phase 4-3で実装予定）
      await this.queueStoryProgressionTrigger(eventData);

      // 4. ナラティブ変化通知（Phase 4-4で実装予定）
      await this.queueNarrativeChangeNotification(eventData);

      // 5. 関連エンティティ解放チェック（Phase 3-3 実装完了）
      await entityUnlockService.checkUnlockConditionsOnMilestoneCompletion(
        sessionId,
        milestone,
        'system'
      );

      logger.info(`🎉 Milestone completion event fired: ${baseInfo.name} (${baseInfo.id})`);

    } catch (error) {
      logger.error('Failed to fire milestone completion event:', error);
    }
  }

  /**
   * 詳細な完了記録
   */
  private async recordMilestoneCompletionWithDetails(
    milestone: UnifiedMilestone,
    sessionId: string,
    eventData: any
  ): Promise<void> {
    try {
      const baseInfo = getMilestoneBaseInfo(milestone);
      const timestamp = new Date().toISOString();

      // 基本的な完了記録
      const basicStmt = database.prepare(`
        INSERT OR REPLACE INTO milestone_completions (
          milestone_id, session_id, completed_by, completed_at, milestone_data
        ) VALUES (?, ?, ?, ?, ?)
      `);

      basicStmt.run(
        baseInfo.id,
        sessionId,
        'system',
        timestamp,
        JSON.stringify(milestone)
      );

      // 詳細な完了記録
      const detailStmt = database.prepare(`
        INSERT OR REPLACE INTO milestone_completion_details (
          milestone_id, session_id, completion_status, event_data, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `);

      detailStmt.run(
        baseInfo.id,
        sessionId,
        JSON.stringify(eventData.completionStatus),
        JSON.stringify(eventData),
        timestamp
      );

      logger.info(`Recorded detailed milestone completion: ${baseInfo.id}`);

    } catch (error) {
      logger.error('Failed to record milestone completion with details:', error);
    }
  }

  // ==========================================
  // ヘルパーメソッド
  // ==========================================

  /**
   * 既に完了済みかチェック
   */
  private async isMilestoneAlreadyCompleted(milestoneId: string, sessionId: string): Promise<boolean> {
    try {
      const row = database.prepare(`
        SELECT COUNT(*) as count FROM milestone_completions 
        WHERE milestone_id = ? AND session_id = ?
      `).get(milestoneId, sessionId) as any;

      return row.count > 0;

    } catch (error) {
      logger.error('Failed to check if milestone already completed:', error);
      return false;
    }
  }

  /**
   * レガシーマイルストーン完了チェック
   */
  private async checkLegacyMilestoneCompletion(
    milestone: UnifiedMilestone,
    _sessionId: string
  ): Promise<boolean> {
    try {
      // AIPoolMilestone型の場合の完了チェック
      if (isAIPoolMilestone(milestone)) {
        return milestone.progress >= 1.0;
      }

      // その他のマイルストーン型での簡易チェック
      return false;

    } catch (error) {
      logger.error('Failed to check legacy milestone completion:', error);
      return false;
    }
  }

  // ==========================================
  // 準備度計算ヘルパーメソッド
  // ==========================================

  private calculatePhaseReadiness(_milestone: UnifiedMilestone, phase: string): number {
    const readiness = {
      'introduction': 0.6,
      'development': 0.9,
      'climax': 1.0,
      'resolution': 0.7
    };
    return readiness[phase as keyof typeof readiness] || 0.5;
  }

  private calculateCharacterReadiness(characterInvolvement: Record<string, number>): number {
    const involvementValues = Object.values(characterInvolvement);
    if (involvementValues.length === 0) return 0.5;
    
    const avgInvolvement = involvementValues.reduce((a, b) => a + b, 0) / involvementValues.length;
    return Math.min(1.0, avgInvolvement + 0.2); // 基本ボーナス
  }

  private calculateTensionReadiness(tensionLevel: number, _milestone: UnifiedMilestone): number {
    // 適切な緊張レベル範囲での完了を促進
    const idealTension = 0.6; // マイルストーン完了に理想的な緊張レベル
    const deviation = Math.abs(tensionLevel - idealTension);
    return Math.max(0.2, 1.0 - deviation);
  }

  private async calculateProgressionReadiness(sessionId: string): Promise<number> {
    try {
      // セッション進行の健全性をチェック
      const completedMilestones = await this.getCompletedMilestonesCount(sessionId);
      const totalEntities = await this.getTotalEntitiesCount(sessionId);
      const interactedEntities = await this.getInteractedEntitiesCount(sessionId);
      
      if (totalEntities === 0) return 0.8; // デフォルト値
      
      const explorationRatio = interactedEntities / totalEntities;
      const milestoneProgress = Math.min(1.0, completedMilestones * 0.2);
      
      return (explorationRatio * 0.7) + (milestoneProgress * 0.3);

    } catch (error) {
      logger.error('Failed to calculate progression readiness:', error);
      return 0.6;
    }
  }

  // ==========================================
  // イベント発火ヘルパーメソッド（Phase 4で実装予定）
  // ==========================================

  async queueMilestoneCompletionNotification(eventData: any): Promise<void> {
    try {
      // マイルストーン完了通知の作成
      const notification: GMNotification = {
        id: uuidv4(),
        type: 'milestone_completed',
        sessionId: eventData.sessionId,
        priority: 'high',
        status: 'unread',
        title: `マイルストーン達成: ${eventData.milestoneName}`,
        message: `🎯 **${eventData.milestoneName}** が完了しました！\n\n` +
                `達成率: 100%\n` +
                `完了時刻: ${new Date(eventData.completedAt).toLocaleString('ja-JP')}\n\n` +
                `物語が新しい段階に進行する準備が整いました。\n` +
                `シナリオ進行の実行を検討してください。`,
        shortDescription: `${eventData.milestoneName}が完了 - 物語進行準備完了`,
        
        eventData: {
          milestoneId: eventData.milestoneId,
          milestoneName: eventData.milestoneName,
          progressPercentage: 100,
          completionDetails: eventData.completionStatus,
          narrativeProgression: eventData.narrativeProgression
        },
        
        actions: [
          {
            id: 'trigger_progression',
            label: '物語を進行する',
            actionType: 'trigger_progression',
            requiresConfirmation: true,
            buttonColor: 'primary'
          },
          {
            id: 'mark_read',
            label: '確認済みにする',
            actionType: 'mark_read',
            requiresConfirmation: false,
            buttonColor: 'secondary'
          },
          {
            id: 'dismiss',
            label: '通知を非表示',
            actionType: 'dismiss',
            requiresConfirmation: false,
            buttonColor: 'secondary'
          }
        ],
        
        metadata: {
          categoryTags: ['milestone', 'completion', 'story_progression'],
          relatedEntities: eventData.completionStatus?.relatedEntities || [],
          gmRecommendations: [
            '物語の進行を実行してください',
            '新しいエンティティが解放されている可能性があります',
            'プレイヤーの反応を確認してください'
          ],
          playerVisibility: 'hidden'
        },
        
        timestamp: new Date().toISOString(),
        autoExpire: false, // マイルストーン完了は重要なので自動削除しない
        persistAfterRead: true,
        requiresAcknowledgment: true
      };

      // 24時間後に期限切れ（必要に応じて）
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      notification.expiresAt = expiresAt.toISOString();

      // データベースに保存
      await this.saveGMNotification(notification);

      // リアルタイム通知（Socket.IO）
      if (this.app) {
        const io = this.app.get('socketio');
        if (io) {
          const notificationEvent: GMNotificationEvent = {
            type: 'gm-notification',
            notification,
            sessionId: eventData.sessionId
          };

          // セッション内のGMクライアントに通知
          io.to(`session-${eventData.sessionId}`).emit('gm-notification', notificationEvent);
          
          logger.info(`GM notification sent: ${notification.title} (${notification.id})`);
        } else {
          logger.warn('Socket.IO instance not found - notification saved to database only');
        }
      } else {
        logger.warn('Express app not set - notification saved to database only');
      }

    } catch (error) {
      logger.error('Failed to queue GM milestone completion notification:', error);
      throw error;
    }
  }

  private async queueStoryProgressionTrigger(eventData: any): Promise<void> {
    // TODO: Phase 4-3で実装
    logger.debug('Queued story progression trigger:', eventData.milestoneId);
  }

  private async queueNarrativeChangeNotification(eventData: any): Promise<void> {
    // TODO: Phase 4-4で実装
    logger.debug('Queued narrative change notification:', eventData.milestoneId);
  }

  // TODO: Implement entity unlock triggers
  // private async checkEntityUnlockTriggers(_milestone: UnifiedMilestone, _sessionId: string): Promise<void> {
  //   // Phase 3-3: エンティティ解放システムとの統合完了
  //   await entityUnlockService.checkUnlockConditionsOnMilestoneCompletion(
  //     _sessionId,
  //     _milestone,
  //     'system'
  //   );
  //   logger.debug('Checked entity unlock triggers for milestone:', getMilestoneBaseInfo(_milestone).id);
  // }

  // ==========================================
  // ユーティリティメソッド（簡易実装）
  // ==========================================

  private async calculateRuleProgress(rule: EntityRelationshipRule, sessionId: string): Promise<number> {
    // 基本的な進捗計算（narrativeCalculationServiceで詳細実装）
    const completedEntities = await this.getCompletedEntities(sessionId, rule.entityIds);
    
    switch (rule.type) {
      case 'sequential':
        return await this.calculateSequentialProgress(rule.entityIds, completedEntities, sessionId);
      case 'required_all':
        return completedEntities.length / rule.entityIds.length;
      case 'required_any':
        return completedEntities.length > 0 ? 1.0 : 0.0;
      case 'story_meaning':
        return (completedEntities.length / rule.entityIds.length) * rule.completionWeight;
      default:
        return 0.0;
    }
  }

  private async calculateSequentialProgress(
    entityIds: string[], 
    completedEntities: string[], 
    _sessionId: string
  ): Promise<number> {
    try {
      let consecutiveCompleted = 0;
      let orderScore = 0;
      
      // Phase 3-1: 順序関係の完了品質評価
      for (let i = 0; i < entityIds.length; i++) {
        const entityId = entityIds[i];
        
        if (completedEntities.includes(entityId)) {
          consecutiveCompleted++;
          
          // 順序一貫性スコア（正しい順序での完了）
          if (i === consecutiveCompleted - 1) {
            orderScore += 1.0; // 正しい順序
          } else {
            orderScore += 0.5; // 順序違反だが完了済み
          }
        } else {
          break; // 順序が途切れたら停止
        }
      }
      
      // 順序品質ボーナス
      const orderQuality = consecutiveCompleted > 0 ? orderScore / consecutiveCompleted : 0;
      const baseProgress = consecutiveCompleted / entityIds.length;
      const qualityAdjustedProgress = baseProgress * (0.8 + orderQuality * 0.2); // 順序品質による調整
      
      logger.debug(`Sequential completion quality: base=${baseProgress.toFixed(3)}, orderQuality=${orderQuality.toFixed(3)}, adjusted=${qualityAdjustedProgress.toFixed(3)}`);
      return Math.min(1.0, qualityAdjustedProgress);

    } catch (error) {
      logger.error('Failed to calculate sequential progress with quality:', error);
      // フォールバック
      let consecutiveCompleted = 0;
      for (const entityId of entityIds) {
        if (completedEntities.includes(entityId)) {
          consecutiveCompleted++;
        } else {
          break;
        }
      }
      return consecutiveCompleted / entityIds.length;
    }
  }

  private async getCompletedEntities(sessionId: string, entityIds: string[]): Promise<string[]> {
    if (entityIds.length === 0) return [];

    const placeholders = entityIds.map(() => '?').join(',');
    const query = `
      SELECT entity_id FROM entity_exploration_actions 
      WHERE session_id = ? AND entity_id IN (${placeholders}) AND is_interacted = 1
    `;

    const rows = database.prepare(query).all(sessionId, ...entityIds) as any[];
    return rows.map(row => row.entity_id);
  }

  private async getCurrentNarrativeState(sessionId: string): Promise<NarrativeState> {
    // 簡易実装
    return {
      sessionId,
      currentTheme: 'exploration',
      storyPhase: 'development',
      tensionLevel: 0.5,
      characterInvolvement: {},
      completedMilestones: [],
      activeStoryElements: [],
      narrativeCoherence: 0.7
    };
  }

  private async getCompletedMilestonesCount(sessionId: string): Promise<number> {
    const row = database.prepare(`
      SELECT COUNT(*) as count FROM milestone_completions WHERE session_id = ?
    `).get(sessionId) as any;
    return row ? row.count : 0;
  }

  private async getTotalEntitiesCount(sessionId: string): Promise<number> {
    const row = database.prepare(`
      SELECT COUNT(*) as count FROM entity_exploration_actions WHERE session_id = ?
    `).get(sessionId) as any;
    return row ? row.count : 0;
  }

  private async getInteractedEntitiesCount(sessionId: string): Promise<number> {
    const row = database.prepare(`
      SELECT COUNT(*) as count FROM entity_exploration_actions 
      WHERE session_id = ? AND is_interacted = 1
    `).get(sessionId) as any;
    return row ? row.count : 0;
  }

  // ==========================================
  // Phase 4-1: GM通知システム データベース操作
  // ==========================================

  /**
   * GM通知をデータベースに保存
   */
  private async saveGMNotification(notification: GMNotification): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      const stmt = database.prepare(`
        INSERT INTO gm_notifications (
          id, type, session_id, priority, status, title, message, short_description,
          event_data, actions, metadata, timestamp, acknowledged_at, expires_at,
          auto_expire, persist_after_read, requires_acknowledgment, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        notification.id,
        notification.type,
        notification.sessionId,
        notification.priority,
        notification.status,
        notification.title,
        notification.message,
        notification.shortDescription || null,
        JSON.stringify(notification.eventData),
        JSON.stringify(notification.actions || []),
        JSON.stringify(notification.metadata || {}),
        notification.timestamp,
        notification.acknowledgedAt || null,
        notification.expiresAt || null,
        notification.autoExpire ? 1 : 0,
        notification.persistAfterRead ? 1 : 0,
        notification.requiresAcknowledgment ? 1 : 0,
        timestamp,
        timestamp
      );

      logger.debug(`GM notification saved to database: ${notification.id}`);

    } catch (error) {
      logger.error('Failed to save GM notification to database:', error);
      throw error;
    }
  }

  /**
   * GM通知の状態を更新
   */
  public async updateGMNotificationStatus(
    notificationId: string, 
    status: 'unread' | 'read' | 'acknowledged' | 'dismissed' | 'expired'
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      const stmt = database.prepare(`
        UPDATE gm_notifications 
        SET status = ?, acknowledged_at = ?, updated_at = ?
        WHERE id = ?
      `);

      const acknowledgedAt = (status === 'acknowledged') ? timestamp : null;
      
      stmt.run(status, acknowledgedAt, timestamp, notificationId);
      
      logger.debug(`GM notification status updated: ${notificationId} -> ${status}`);

    } catch (error) {
      logger.error('Failed to update GM notification status:', error);
      throw error;
    }
  }

  /**
   * セッションのGM通知一覧を取得
   */
  public async getGMNotifications(
    sessionId: string, 
    status?: string[], 
    limit: number = 50
  ): Promise<GMNotification[]> {
    try {
      let query = `
        SELECT * FROM gm_notifications 
        WHERE session_id = ?
      `;
      const params: any[] = [sessionId];

      if (status && status.length > 0) {
        const placeholders = status.map(() => '?').join(',');
        query += ` AND status IN (${placeholders})`;
        params.push(...status);
      }

      query += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      const rows = database.prepare(query).all(...params) as any[];
      
      return rows.map(row => this.rowToGMNotification(row));

    } catch (error) {
      logger.error('Failed to get GM notifications:', error);
      return [];
    }
  }

  /**
   * データベース行をGMNotificationオブジェクトに変換
   */
  private rowToGMNotification(row: any): GMNotification {
    return {
      id: row.id,
      type: row.type,
      sessionId: row.session_id,
      priority: row.priority,
      status: row.status,
      title: row.title,
      message: row.message,
      shortDescription: row.short_description,
      eventData: JSON.parse(row.event_data),
      actions: row.actions ? JSON.parse(row.actions) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      timestamp: row.timestamp,
      acknowledgedAt: row.acknowledged_at,
      expiresAt: row.expires_at,
      autoExpire: row.auto_expire === 1,
      persistAfterRead: row.persist_after_read === 1,
      requiresAcknowledgment: row.requires_acknowledgment === 1
    };
  }
}

// シングルトンインスタンス
export const milestoneCompletionService = new MilestoneCompletionService();