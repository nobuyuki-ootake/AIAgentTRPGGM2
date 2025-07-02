// ==========================================
// マイルストーン進捗管理サービス
// Phase 2-1, 2-2: マイルストーン検索・進捗チェック機能
// ==========================================

import { v4 as uuidv4 } from 'uuid';
import { database } from '../database/database';
import { logger } from '../utils/logger';
import {
  UnifiedMilestone,
  EntityRelationships,
  EntityRelationshipRule,
  getMilestoneBaseInfo,
  isAIPoolMilestone,
  ID
} from '@repo/types';
import { entityUnlockService } from './entityUnlockService';
import { storyProgressionService } from './storyProgressionService';
import { narrativeFeedbackService } from './narrativeFeedbackService';

export class MilestoneProgressService {

  constructor() {
    this.initializeDatabase();
  }

  // ==========================================
  // データベース初期化
  // ==========================================

  private initializeDatabase() {
    try {
      // マイルストーン関連テーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS session_milestones (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          milestone_data TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      database.exec(`
        CREATE TABLE IF NOT EXISTS milestone_completions (
          milestone_id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          completed_by TEXT NOT NULL,
          completed_at TEXT NOT NULL,
          milestone_data TEXT NOT NULL
        )
      `);

      // インデックス作成
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_session_milestones_session_id 
        ON session_milestones(session_id)
      `);

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_milestone_completions_session_id 
        ON milestone_completions(session_id)
      `);

      logger.info('Milestone progress database initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize milestone progress database:', error);
      throw error;
    }
  }

  // ==========================================
  // 🆕 Phase 2-2: 公開マイルストーン検索API
  // ==========================================

  /**
   * エンティティIDから関連マイルストーンを取得（公開API）
   */
  async getMilestonesByEntityId(sessionId: string, entityId: string): Promise<UnifiedMilestone[]> {
    return await this.findMilestonesByEntityId(sessionId, entityId);
  }

  /**
   * 複数エンティティIDから関連マイルストーンマップを取得（公開API）
   */
  async getMilestonesByEntityIds(
    sessionId: string, 
    entityIds: string[]
  ): Promise<Map<string, UnifiedMilestone[]>> {
    return await this.findMilestonesByEntityIds(sessionId, entityIds);
  }

  /**
   * セッションの全マイルストーンを取得（公開API）
   */
  async getSessionMilestonesList(sessionId: string): Promise<UnifiedMilestone[]> {
    return await this.getSessionMilestones(sessionId);
  }

  /**
   * マイルストーン-エンティティ関係性マップを取得（公開API）
   */
  async getMilestoneEntityRelationshipMap(sessionId: string): Promise<Map<string, string[]>> {
    return await this.buildMilestoneEntityRelationshipMap(sessionId);
  }

  /**
   * 特定のマイルストーンの進捗状況を取得（公開API）
   */
  async getMilestoneProgress(sessionId: string, milestoneId: string): Promise<{
    milestoneId: string;
    overallProgress: number;
    ruleProgresses: Array<{
      ruleType: string;
      description: string;
      progress: number;
      isOptional: boolean;
      completionWeight: number;
    }>;
    isCompleted: boolean;
  } | null> {
    try {
      const milestones = await this.getSessionMilestones(sessionId);
      const milestone = milestones.find(m => getMilestoneBaseInfo(m).id === milestoneId);
      
      if (!milestone) {
        return null;
      }

      const baseInfo = getMilestoneBaseInfo(milestone);
      const relationships = baseInfo.entityRelationships;
      
      if (!relationships) {
        return {
          milestoneId,
          overallProgress: 0,
          ruleProgresses: [],
          isCompleted: false
        };
      }

      // 各ルールの進捗を計算
      const ruleProgresses = [];
      let totalProgress = 0;
      let totalWeight = 0;

      for (const rule of relationships.rules) {
        const ruleProgress = await this.calculateRuleProgress(rule, sessionId);
        
        ruleProgresses.push({
          ruleType: rule.type,
          description: rule.description,
          progress: ruleProgress,
          isOptional: rule.isOptional,
          completionWeight: rule.completionWeight
        });

        if (!rule.isOptional || ruleProgress > 0) {
          totalProgress += ruleProgress * rule.completionWeight;
          totalWeight += rule.completionWeight;
        }
      }

      const overallProgress = totalWeight > 0 ? totalProgress / totalWeight : 0;
      const isCompleted = await this.checkMilestoneCompletion(milestone, sessionId);

      return {
        milestoneId,
        overallProgress,
        ruleProgresses,
        isCompleted
      };

    } catch (error) {
      logger.error('Failed to get milestone progress:', error);
      return null;
    }
  }

  // ==========================================
  // Phase 2-1: マイルストーン進捗チェック機能
  // ==========================================

  /**
   * エンティティ完了時のマイルストーン進捗チェック
   */
  async checkMilestoneProgressOnEntityCompletion(
    sessionId: string,
    entityId: string,
    characterId: string
  ): Promise<void> {
    try {
      // エンティティIDから関連マイルストーンのみを効率的に検索
      const relatedMilestones = await this.findMilestonesByEntityId(sessionId, entityId);
      
      if (relatedMilestones.length === 0) {
        logger.debug(`No milestones related to entity ${entityId}, skipping progress check`);
        return;
      }

      logger.info(`Found ${relatedMilestones.length} milestones related to entity ${entityId}`);

      // 関連するマイルストーンのみについて進捗をチェック
      for (const milestone of relatedMilestones) {
        const baseInfo = getMilestoneBaseInfo(milestone);

        const progressChanged = await this.updateMilestoneProgress(
          milestone,
          entityId,
          sessionId
        );

        if (progressChanged) {
          logger.info(`Milestone progress updated for milestone ${baseInfo.id} due to entity ${entityId} completion`);
          
          // マイルストーン完了チェック
          const isCompleted = await this.checkMilestoneCompletion(milestone, sessionId);
          
          if (isCompleted) {
            await this.handleMilestoneCompletion(milestone, sessionId, characterId);
          }
          
          // Phase 3-3: 進捗変化に基づくエンティティ解放チェック
          const currentProgress = await this.calculateOverallMilestoneProgress(milestone, sessionId);
          await entityUnlockService.checkUnlockConditionsOnMilestoneProgress(
            sessionId,
            baseInfo.id,
            currentProgress,
            characterId
          );
        }
      }

    } catch (error) {
      logger.error('Failed to check milestone progress on entity completion:', error);
      // エラーが発生してもメインの探索フローを止めない
    }
  }

  /**
   * マイルストーンの進捗を更新
   */
  private async updateMilestoneProgress(
    milestone: UnifiedMilestone,
    completedEntityId: string,
    sessionId: string
  ): Promise<boolean> {
    try {
      const baseInfo = getMilestoneBaseInfo(milestone);
      const relationships = baseInfo.entityRelationships;
      
      if (!relationships) {
        return false;
      }

      let progressChanged = false;

      // 各ルールについてエンティティ完了をチェック
      for (const rule of relationships.rules) {
        if (rule.entityIds.includes(completedEntityId)) {
          progressChanged = true;
          
          // ルールタイプ別の進捗計算
          const ruleProgress = await this.calculateRuleProgress(rule, sessionId);
          
          logger.info(`Rule ${rule.type} progress updated: ${ruleProgress * 100}%`);
        }
      }

      return progressChanged;

    } catch (error) {
      logger.error('Failed to update milestone progress:', error);
      return false;
    }
  }

  // ==========================================
  // Phase 2-2: マイルストーン検索機能
  // ==========================================

  /**
   * セッションのマイルストーン一覧を取得
   */
  private async getSessionMilestones(sessionId: string): Promise<UnifiedMilestone[]> {
    try {
      const rows = database.prepare(`
        SELECT milestone_data FROM session_milestones WHERE session_id = ?
        ORDER BY created_at ASC
      `).all(sessionId) as any[];

      return rows.map(row => JSON.parse(row.milestone_data));

    } catch (error) {
      logger.error('Failed to get session milestones:', error);
      return [];
    }
  }

  /**
   * エンティティIDから関連マイルストーンを検索
   */
  private async findMilestonesByEntityId(
    sessionId: string,
    entityId: string
  ): Promise<UnifiedMilestone[]> {
    try {
      const allMilestones = await this.getSessionMilestones(sessionId);
      const relatedMilestones: UnifiedMilestone[] = [];

      for (const milestone of allMilestones) {
        const baseInfo = getMilestoneBaseInfo(milestone);
        
        if (!baseInfo.entityRelationships) {
          continue;
        }

        // エンティティが含まれるルールを検索
        const hasEntity = baseInfo.entityRelationships.rules.some(rule =>
          rule.entityIds.includes(entityId)
        );

        if (hasEntity) {
          relatedMilestones.push(milestone);
        }
      }

      return relatedMilestones;

    } catch (error) {
      logger.error('Failed to find milestones by entity ID:', error);
      return [];
    }
  }

  /**
   * 複数エンティティIDから関連マイルストーンを検索
   */
  private async findMilestonesByEntityIds(
    sessionId: string,
    entityIds: string[]
  ): Promise<Map<string, UnifiedMilestone[]>> {
    try {
      const result = new Map<string, UnifiedMilestone[]>();
      const allMilestones = await this.getSessionMilestones(sessionId);

      // 各エンティティに対して関連マイルストーンを検索
      for (const entityId of entityIds) {
        const relatedMilestones: UnifiedMilestone[] = [];

        for (const milestone of allMilestones) {
          const baseInfo = getMilestoneBaseInfo(milestone);
          
          if (!baseInfo.entityRelationships) {
            continue;
          }

          const hasEntity = baseInfo.entityRelationships.rules.some(rule =>
            rule.entityIds.includes(entityId)
          );

          if (hasEntity) {
            relatedMilestones.push(milestone);
          }
        }

        result.set(entityId, relatedMilestones);
      }

      return result;

    } catch (error) {
      logger.error('Failed to find milestones by entity IDs:', error);
      return new Map();
    }
  }

  /**
   * マイルストーン-エンティティ関係性マップ構築
   */
  private async buildMilestoneEntityRelationshipMap(
    sessionId: string
  ): Promise<Map<string, string[]>> {
    try {
      const relationshipMap = new Map<string, string[]>();
      const allMilestones = await this.getSessionMilestones(sessionId);

      for (const milestone of allMilestones) {
        const baseInfo = getMilestoneBaseInfo(milestone);
        
        if (!baseInfo.entityRelationships) {
          continue;
        }

        // マイルストーンに関連するすべてのエンティティIDを収集
        const allEntityIds: string[] = [];
        
        for (const rule of baseInfo.entityRelationships.rules) {
          allEntityIds.push(...rule.entityIds);
        }

        // 重複を除去
        const uniqueEntityIds = [...new Set(allEntityIds)];
        relationshipMap.set(baseInfo.id, uniqueEntityIds);
      }

      return relationshipMap;

    } catch (error) {
      logger.error('Failed to build milestone-entity relationship map:', error);
      return new Map();
    }
  }

  // ==========================================
  // 基本的な進捗計算（narrativeCalculationServiceで詳細実装）
  // ==========================================

  /**
   * ルール別の基本進捗計算
   */
  private async calculateRuleProgress(
    rule: EntityRelationshipRule,
    sessionId: string
  ): Promise<number> {
    try {
      const completedEntities = await this.getCompletedEntities(sessionId, rule.entityIds);
      
      switch (rule.type) {
        case 'sequential':
          // 順序関係: 連続完了エンティティ数 / 総エンティティ数（Phase 3-1 強化版）
          return await this.calculateSequentialProgress(rule.entityIds, completedEntities, sessionId);
          
        case 'required_all':
          // AND条件: 完了エンティティ数 / 総エンティティ数（Phase 3-2 強化版）
          return await this.calculateRequiredAllProgress(rule.entityIds, completedEntities, sessionId);
          
        case 'required_any':
          // OR条件: 1つでも完了していれば1.0、そうでなければ0.0（Phase 3-2 強化版）
          return await this.calculateRequiredAnyProgress(rule.entityIds, completedEntities, sessionId);
          
        case 'story_meaning':
          // 物語的意味: required_allと同じ計算だが、重み付きスコア
          const baseProgress = completedEntities.length / rule.entityIds.length;
          return baseProgress * rule.completionWeight;
          
        default:
          return 0.0;
      }

    } catch (error) {
      logger.error('Failed to calculate rule progress:', error);
      return 0.0;
    }
  }

  /**
   * 順序関係の進捗計算（Phase 3-1 強化版）
   */
  private async calculateSequentialProgress(
    entityIds: string[], 
    completedEntities: string[], 
    sessionId: string
  ): Promise<number> {
    try {
      let consecutiveCompleted = 0;
      let sequentialBonus = 0;
      
      // Phase 3-1: 順序関係の詳細解析
      const sequentialMetrics = {
        gapAnalysis: [],
        completionDensity: 0,
        orderConsistency: 1.0
      };
      
      // 順序チェックとギャップ解析
      for (let i = 0; i < entityIds.length; i++) {
        const entityId = entityIds[i];
        const isCompleted = completedEntities.includes(entityId);
        
        if (isCompleted) {
          consecutiveCompleted++;
          
          // 順序一貫性ボーナス（連続完了の場合）
          if (i === consecutiveCompleted - 1) {
            sequentialBonus += 0.02; // 順序通りの完了に2%ボーナス
          }
          
          // 位置重み（後半のエンティティほど重要）
          const positionWeight = 1 + (i / entityIds.length) * 0.5;
          sequentialBonus += positionWeight * 0.01;
          
        } else {
          // ギャップを記録（将来の解析用）
          sequentialMetrics.gapAnalysis.push({
            position: i,
            entityId,
            isBlocker: true
          });
          break; // 順序が途切れたら停止
        }
      }
      
      // 完了密度の計算（全体に対する連続完了の割合）
      sequentialMetrics.completionDensity = consecutiveCompleted / entityIds.length;
      
      // 最終スコア計算
      const baseProgress = consecutiveCompleted / entityIds.length;
      const finalProgress = Math.min(1.0, baseProgress + sequentialBonus);
      
      // Phase 3-1: 詳細ログ出力
      if (consecutiveCompleted > 0) {
        logger.info(`Sequential progress analysis: consecutive=${consecutiveCompleted}/${entityIds.length}, density=${sequentialMetrics.completionDensity.toFixed(3)}, bonus=${sequentialBonus.toFixed(3)}, final=${finalProgress.toFixed(3)}`);
      }
      
      return finalProgress;

    } catch (error) {
      logger.error('Failed to calculate enhanced sequential progress:', error);
      // フォールバック: シンプル計算
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

  /**
   * 完了済みエンティティ一覧を取得
   */
  private async getCompletedEntities(sessionId: string, entityIds: string[]): Promise<string[]> {
    try {
      if (entityIds.length === 0) {
        return [];
      }

      const placeholders = entityIds.map(() => '?').join(',');
      const query = `
        SELECT entity_id FROM entity_exploration_actions 
        WHERE session_id = ? AND entity_id IN (${placeholders}) AND is_interacted = 1
      `;

      const rows = database.prepare(query).all(sessionId, ...entityIds) as any[];
      return rows.map(row => row.entity_id);

    } catch (error) {
      logger.error('Failed to get completed entities:', error);
      return [];
    }
  }

  // ==========================================
  // Phase 3-2: 複合関係進捗計算メソッド
  // ==========================================

  /**
   * required_all（AND条件）の強化進捗計算
   */
  private async calculateRequiredAllProgress(
    entityIds: string[], 
    completedEntities: string[], 
    sessionId: string
  ): Promise<number> {
    try {
      const baseProgress = completedEntities.length / entityIds.length;
      
      if (completedEntities.length === 0) {
        return 0;
      }
      
      // Phase 3-2: AND条件特有の解析
      const allMetrics = {
        completionRatio: baseProgress,
        missingCriticalCount: entityIds.length - completedEntities.length,
        coverageBonus: 0,
        balanceScore: 0
      };
      
      // カバレッジボーナス（全体の何割が完了したか）
      if (baseProgress >= 0.8) {
        allMetrics.coverageBonus = 0.15; // 80%以上で大きなボーナス
      } else if (baseProgress >= 0.6) {
        allMetrics.coverageBonus = 0.1;
      } else if (baseProgress >= 0.4) {
        allMetrics.coverageBonus = 0.05;
      }
      
      // バランススコア（各エンティティが均等に重要）
      const entityGroups = await this.groupEntitiesByImportance(entityIds, sessionId);
      let groupCompletions = 0;
      let totalGroups = 0;
      
      for (const [importance, groupEntityIds] of entityGroups.entries()) {
        const groupCompleted = groupEntityIds.filter(id => completedEntities.includes(id)).length;
        const groupTotal = groupEntityIds.length;
        
        if (groupTotal > 0) {
          totalGroups++;
          const groupRatio = groupCompleted / groupTotal;
          
          // 重要度別重み付け
          const importanceWeight = importance === 'high' ? 1.5 : importance === 'medium' ? 1.0 : 0.7;
          groupCompletions += groupRatio * importanceWeight;
        }
      }
      
      allMetrics.balanceScore = totalGroups > 0 ? groupCompletions / totalGroups : baseProgress;
      
      // 最終スコア計算
      const finalProgress = Math.min(1.0, baseProgress + allMetrics.coverageBonus + (allMetrics.balanceScore - baseProgress) * 0.1);
      
      logger.info(`Required-all progress: base=${baseProgress.toFixed(3)}, completed=${completedEntities.length}/${entityIds.length}, coverage=${allMetrics.coverageBonus.toFixed(3)}, balance=${allMetrics.balanceScore.toFixed(3)}, final=${finalProgress.toFixed(3)}`);
      
      return finalProgress;

    } catch (error) {
      logger.error('Failed to calculate enhanced required-all progress:', error);
      return completedEntities.length / entityIds.length;
    }
  }

  /**
   * required_any（OR条件）の強化進捗計算
   */
  private async calculateRequiredAnyProgress(
    entityIds: string[], 
    completedEntities: string[], 
    sessionId: string
  ): Promise<number> {
    try {
      if (completedEntities.length === 0) {
        return 0.0;
      }
      
      // Phase 3-2: OR条件特有の解析
      const anyMetrics = {
        optionsFulfilled: completedEntities.length,
        totalOptions: entityIds.length,
        redundancyBonus: 0,
        choiceQualityBonus: 0
      };
      
      // 冗長性ボーナス（複数選択肢を完了した場合）
      if (completedEntities.length > 1) {
        const redundancyFactor = Math.min(0.25, (completedEntities.length - 1) * 0.08);
        anyMetrics.redundancyBonus = redundancyFactor;
      }
      
      // 選択肢の品質ボーナス（難しい選択肢を選んだ場合）
      const entityQualities = await this.assessEntityQualities(completedEntities, sessionId);
      const avgQuality = entityQualities.length > 0 ? 
        entityQualities.reduce((sum, q) => sum + q, 0) / entityQualities.length : 0.5;
      
      if (avgQuality > 0.8) {
        anyMetrics.choiceQualityBonus = 0.15;
      } else if (avgQuality > 0.6) {
        anyMetrics.choiceQualityBonus = 0.1;
      }
      
      // OR条件は基本1.0からスタートしてボーナスを加算
      const baseProgress = 1.0;
      const totalBonus = anyMetrics.redundancyBonus + anyMetrics.choiceQualityBonus;
      const finalProgress = Math.min(1.0, baseProgress + totalBonus);
      
      logger.info(`Required-any progress: completed=${completedEntities.length}/${entityIds.length}, redundancy=${anyMetrics.redundancyBonus.toFixed(3)}, quality=${anyMetrics.choiceQualityBonus.toFixed(3)}, final=${finalProgress.toFixed(3)}`);
      
      return Math.max(1.0, finalProgress);

    } catch (error) {
      logger.error('Failed to calculate enhanced required-any progress:', error);
      return 1.0;
    }
  }

  // ==========================================
  // Phase 3-2 ヘルパーメソッド
  // ==========================================

  /**
   * エンティティを重要度でグループ化
   */
  private async groupEntitiesByImportance(
    entityIds: string[], 
    sessionId: string
  ): Promise<Map<string, string[]>> {
    const groups = new Map<string, string[]>();
    groups.set('high', []);
    groups.set('medium', []);
    groups.set('low', []);
    
    // 簡易実装（将来的にはAIやメタデータで判定）
    entityIds.forEach((entityId, index) => {
      if (index < entityIds.length * 0.3) {
        groups.get('high')!.push(entityId);
      } else if (index < entityIds.length * 0.7) {
        groups.get('medium')!.push(entityId);
      } else {
        groups.get('low')!.push(entityId);
      }
    });
    
    return groups;
  }

  /**
   * エンティティの品質を評価
   */
  private async assessEntityQualities(
    completedEntityIds: string[], 
    sessionId: string
  ): Promise<number[]> {
    const qualities = [];
    
    for (const entityId of completedEntityIds) {
      try {
        // 実際の探索アクション結果から品質を計算
        const executionRow = database.prepare(`
          SELECT success, dice_roll, user_approach FROM exploration_action_executions 
          WHERE target_entity_id = ? AND session_id = ? 
          ORDER BY resolved_at DESC LIMIT 1
        `).get(entityId, sessionId) as any;
        
        if (executionRow) {
          let quality = executionRow.success ? 0.7 : 0.3;
          
          // ダイス結果による調整
          if (executionRow.dice_roll) {
            const diceRoll = JSON.parse(executionRow.dice_roll);
            quality += (diceRoll.result / 20) * 0.2;
          }
          
          // ユーザーアプローチの詳細度による調整
          if (executionRow.user_approach && executionRow.user_approach.length > 30) {
            quality += 0.1;
          }
          
          qualities.push(Math.min(1.0, quality));
        } else {
          qualities.push(0.5); // デフォルト品質
        }
      } catch (error) {
        qualities.push(0.5);
      }
    }
    
    return qualities;
  }

  /**
   * マイルストーン完了チェック（基本版）
   */
  private async checkMilestoneCompletion(
    milestone: UnifiedMilestone,
    sessionId: string
  ): Promise<boolean> {
    try {
      const baseInfo = getMilestoneBaseInfo(milestone);
      const relationships = baseInfo.entityRelationships;
      
      if (!relationships) {
        return this.checkLegacyMilestoneCompletion(milestone, sessionId);
      }

      let totalProgress = 0;
      let totalWeight = 0;

      // 各ルールの進捗を集計
      for (const rule of relationships.rules) {
        const ruleProgress = await this.calculateRuleProgress(rule, sessionId);
        const weight = rule.completionWeight;
        
        if (rule.isOptional && ruleProgress === 0) {
          // オプショナルルールで進捗0の場合はスキップ
          continue;
        }
        
        totalProgress += ruleProgress * weight;
        totalWeight += weight;
      }

      if (totalWeight === 0) {
        return false;
      }

      const averageProgress = totalProgress / totalWeight;

      // 完了条件別の判定
      switch (relationships.completionCondition) {
        case 'all_rules':
          return averageProgress >= 1.0;
          
        case 'any_rule':
          return averageProgress > 0.0;
          
        case 'weighted_threshold':
          const threshold = relationships.weightedThreshold || 0.8;
          return averageProgress >= threshold;
          
        default:
          return averageProgress >= 1.0;
      }

    } catch (error) {
      logger.error('Failed to check milestone completion:', error);
      return false;
    }
  }

  /**
   * レガシーマイルストーン完了チェック
   */
  private async checkLegacyMilestoneCompletion(
    milestone: UnifiedMilestone,
    sessionId: string
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

  /**
   * マイルストーン完了処理（AI自律判断統合版）
   */
  private async handleMilestoneCompletion(
    milestone: UnifiedMilestone,
    sessionId: string,
    characterId: string
  ): Promise<void> {
    try {
      const baseInfo = getMilestoneBaseInfo(milestone);
      
      logger.info(`🎉 Milestone completed: ${baseInfo.name} (${baseInfo.id})`);
      
      // マイルストーン完了をデータベースに記録
      await this.recordMilestoneCompletion(milestone, sessionId, characterId);
      
      // 物語進行のナラティブを生成
      const narrativeText = baseInfo.entityRelationships?.narrativeProgression?.completionNarrative 
        || `マイルストーン「${baseInfo.name}」が完了しました。`;
      
      logger.info(`Milestone completion narrative: ${narrativeText}`);

      // 🆕 Phase 4-2.3: AI自律シナリオ進行判断・実行
      try {
        await storyProgressionService.processStoryProgression(
          milestone,
          sessionId,
          characterId,
          narrativeText
        );
      } catch (progressionError) {
        logger.error('Story progression processing failed:', progressionError);
        // ストーリー進行エラーがあってもマイルストーン完了処理は継続
      }

      // 🆕 Phase 4-4.1: 詳細ナラティブフィードバック生成・投稿
      try {
        await narrativeFeedbackService.processNarrativeFeedback(
          milestone,
          sessionId,
          characterId,
          narrativeText
        );
        logger.info('Narrative feedback processing completed successfully');
      } catch (feedbackError) {
        logger.error('Narrative feedback processing failed:', feedbackError);
        // ナラティブフィードバックエラーがあってもマイルストーン完了処理は継続
      }

    } catch (error) {
      logger.error('Failed to handle milestone completion:', error);
    }
  }

  /**
   * マイルストーン完了を記録
   */
  private async recordMilestoneCompletion(
    milestone: UnifiedMilestone,
    sessionId: string,
    characterId: string
  ): Promise<void> {
    try {
      const baseInfo = getMilestoneBaseInfo(milestone);
      const timestamp = new Date().toISOString();

      const stmt = database.prepare(`
        INSERT OR REPLACE INTO milestone_completions (
          milestone_id, session_id, completed_by, completed_at, milestone_data
        ) VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        baseInfo.id,
        sessionId,
        characterId,
        timestamp,
        JSON.stringify(milestone)
      );

      logger.info(`Recorded milestone completion: ${baseInfo.id}`);

    } catch (error) {
      logger.error('Failed to record milestone completion:', error);
    }
  }

  /**
   * マイルストーンの総合進捗を計算（Phase 3-3 統合用）
   */
  private async calculateOverallMilestoneProgress(
    milestone: UnifiedMilestone,
    sessionId: string
  ): Promise<number> {
    try {
      const baseInfo = getMilestoneBaseInfo(milestone);
      const relationships = baseInfo.entityRelationships;
      
      if (!relationships) {
        return 0;
      }

      let totalProgress = 0;
      let totalWeight = 0;

      // 各ルールの進捗を集計
      for (const rule of relationships.rules) {
        const ruleProgress = await this.calculateRuleProgress(rule, sessionId);
        const weight = rule.completionWeight;
        
        if (rule.isOptional && ruleProgress === 0) {
          // オプショナルルールで進捗がない場合はスキップ
          continue;
        }
        
        totalProgress += ruleProgress * weight;
        totalWeight += weight;
      }

      return totalWeight > 0 ? totalProgress / totalWeight : 0;

    } catch (error) {
      logger.error('Failed to calculate overall milestone progress:', error);
      return 0;
    }
  }
}

// シングルトンインスタンス
export const milestoneProgressService = new MilestoneProgressService();