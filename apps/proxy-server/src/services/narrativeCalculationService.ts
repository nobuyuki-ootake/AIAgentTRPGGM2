// ==========================================
// 物語的進捗計算サービス
// Phase 2-3: 物語的進捗計算アルゴリズム実装
// ==========================================

import { database } from '../database/database';
import { logger } from '../utils/logger';
import {
  UnifiedMilestone,
  EntityRelationshipRule,
  getMilestoneBaseInfo,
  ID
} from '@repo/types';

// ==========================================
// 物語的進捗計算用データ型
// ==========================================

export interface EntityCompletionDetail {
  entityId: string;
  completedAt: string;
  successQuality: number;        // 0-1: 成功の質（判定結果、ユーザーアプローチの質等）
  storyTimingScore: number;      // 0-1: 物語的タイミングの適切性
  narrativeImportance: number;   // 0-1: 物語における重要度
  contextualRelevance: number;   // 0-1: 現在の文脈での関連性
  characterInvolvement: string;  // 完了に関わったキャラクター
  approachMethod: string;        // 使用されたアプローチ方法
  resultDescription: string;     // 結果の説明
}

export interface NarrativeState {
  sessionId: string;
  currentTheme: string;
  storyPhase: 'introduction' | 'development' | 'climax' | 'resolution';
  tensionLevel: number;          // 0-1: 現在の緊張度
  characterInvolvement: Record<string, number>; // キャラクター関与度
  completedMilestones: string[]; // 完了済みマイルストーン
  activeStoryElements: string[]; // アクティブな物語要素
  narrativeCoherence: number;    // 0-1: 物語の一貫性
}

export interface TimingProximityResult {
  proximity: number;             // 0-1: タイミングの近さ
  sequenceScore: number;         // 0-1: 順序的適切性
  contextualRelevance: number;   // 0-1: 文脈的関連性
}

export class NarrativeCalculationService {

  // ==========================================
  // Phase 2-3: 物語的進捗計算アルゴリズム
  // ==========================================

  /**
   * ルール別の物語的進捗計算
   */
  async calculateAdvancedRuleProgress(
    rule: EntityRelationshipRule,
    sessionId: string
  ): Promise<number> {
    try {
      const completedEntities = await this.getCompletedEntities(sessionId, rule.entityIds);
      const entityDetails = await this.getEntityCompletionDetails(sessionId, rule.entityIds);
      
      switch (rule.type) {
        case 'sequential':
          return await this.calculateSequentialStoryProgress(rule, completedEntities, entityDetails);
          
        case 'required_all':
          return await this.calculateRequiredAllStoryProgress(rule, completedEntities, entityDetails);
          
        case 'required_any':
          return await this.calculateRequiredAnyStoryProgress(rule, completedEntities, entityDetails);
          
        case 'story_meaning':
          return await this.calculateStoryMeaningProgress(rule, completedEntities, entityDetails, sessionId);
          
        default:
          return 0.0;
      }

    } catch (error) {
      logger.error('Failed to calculate advanced rule progress:', error);
      return 0.0;
    }
  }

  /**
   * 順序関係の物語的進捗計算（Phase 3-1 強化版）
   */
  private async calculateSequentialStoryProgress(
    rule: EntityRelationshipRule,
    completedEntities: string[],
    entityDetails: Map<string, EntityCompletionDetail>
  ): Promise<number> {
    try {
      let consecutiveCompleted = 0;
      let storyProgressBonus = 0;
      let lastCompletionTime: Date | null = null;
      
      // Phase 3-1: 強化された順序進捗計算
      const sequentialAnalysis = {
        consecutiveStreak: 0,
        timeConsistency: 0,
        qualityProgression: 0,
        narrativeMomentum: 0
      };
      
      // 順序に従った完了チェックと時系列解析
      for (let i = 0; i < rule.entityIds.length; i++) {
        const entityId = rule.entityIds[i];
        
        if (completedEntities.includes(entityId)) {
          consecutiveCompleted++;
          sequentialAnalysis.consecutiveStreak++;
          
          const detail = entityDetails.get(entityId);
          if (detail) {
            const completionTime = new Date(detail.completedAt);
            
            // 時系列の一貫性評価
            if (lastCompletionTime && consecutiveCompleted > 1) {
              const timeDiff = completionTime.getTime() - lastCompletionTime.getTime();
              const hoursDiff = timeDiff / (1000 * 60 * 60);
              
              // 理想的な間隔: 0.5〜3時間（TRPGセッション内での適切な進行）
              const idealInterval = hoursDiff >= 0.5 && hoursDiff <= 3.0;
              sequentialAnalysis.timeConsistency += idealInterval ? 1 : 0.5;
            }
            
            // 品質の進行評価（後のエンティティほど高品質であることを評価）
            const qualityExpectation = 0.5 + (i / rule.entityIds.length) * 0.3; // 後半ほど高い期待値
            if (detail.successQuality >= qualityExpectation) {
              sequentialAnalysis.qualityProgression += 1;
            } else {
              sequentialAnalysis.qualityProgression += 0.5;
            }
            
            // 物語的重要度に基づくボーナス計算
            const qualityBonus = detail.successQuality * 0.1;
            const timingBonus = detail.storyTimingScore * 0.05;
            const positionBonus = (i / rule.entityIds.length) * 0.03; // 後の位置ほどボーナス
            
            storyProgressBonus += qualityBonus + timingBonus + positionBonus;
            lastCompletionTime = completionTime;
          }
        } else {
          break; // 順序が途切れたら停止
        }
      }
      
      // Phase 3-1: 物語的勢い（momentum）の計算
      if (consecutiveCompleted > 1) {
        const avgTimeConsistency = sequentialAnalysis.timeConsistency / (consecutiveCompleted - 1);
        const avgQualityProgression = sequentialAnalysis.qualityProgression / consecutiveCompleted;
        
        sequentialAnalysis.narrativeMomentum = (
          (avgTimeConsistency * 0.4) +
          (avgQualityProgression * 0.6)
        );
        
        // 勢いボーナス（連続完了が多いほど強化）
        const momentumBonus = sequentialAnalysis.narrativeMomentum * (consecutiveCompleted / rule.entityIds.length) * 0.15;
        storyProgressBonus += momentumBonus;
      }
      
      // 基本進捗にストーリーボーナスを加算
      const baseProgress = consecutiveCompleted / rule.entityIds.length;
      const normalizedBonus = storyProgressBonus / rule.entityIds.length;
      const finalProgress = Math.min(1.0, baseProgress + normalizedBonus);
      
      logger.info(`Sequential story progress (Phase 3-1): base=${baseProgress.toFixed(3)}, consecutive=${consecutiveCompleted}/${rule.entityIds.length}, momentum=${sequentialAnalysis.narrativeMomentum.toFixed(3)}, final=${finalProgress.toFixed(3)}`);
      
      return finalProgress;

    } catch (error) {
      logger.error('Failed to calculate sequential story progress:', error);
      // フォールバック: 基本的な連続計算
      let fallbackConsecutive = 0;
      for (const entityId of rule.entityIds) {
        if (completedEntities.includes(entityId)) {
          fallbackConsecutive++;
        } else {
          break;
        }
      }
      return fallbackConsecutive / rule.entityIds.length;
    }
  }

  /**
   * 全要求型の物語的進捗計算（Phase 3-2 強化版）
   */
  private async calculateRequiredAllStoryProgress(
    rule: EntityRelationshipRule,
    completedEntities: string[],
    entityDetails: Map<string, EntityCompletionDetail>
  ): Promise<number> {
    try {
      const baseProgress = completedEntities.length / rule.entityIds.length;
      
      // Phase 3-2: AND条件の詳細解析
      const allAnalysis = {
        completionCoverage: baseProgress,
        qualityConsistency: 0,
        timingCoherence: 0,
        narrativeSynergy: 0,
        remainingCriticalEntities: rule.entityIds.filter(id => !completedEntities.includes(id))
      };
      
      if (completedEntities.length === 0) {
        return 0;
      }
      
      // 品質一貫性解析
      let totalQualityScore = 0;
      let totalTimingScore = 0;
      let totalContextScore = 0;
      let qualityVariance = 0;
      const qualityScores = [];
      
      for (const entityId of completedEntities) {
        const detail = entityDetails.get(entityId);
        if (detail) {
          qualityScores.push(detail.successQuality);
          totalQualityScore += detail.successQuality;
          totalTimingScore += detail.storyTimingScore;
          totalContextScore += detail.contextualRelevance;
        }
      }
      
      const avgQuality = totalQualityScore / completedEntities.length;
      const avgTiming = totalTimingScore / completedEntities.length;
      const avgContext = totalContextScore / completedEntities.length;
      
      // 品質のバラツキ計算（一貫性指標）
      if (qualityScores.length > 1) {
        const variance = qualityScores.reduce((acc, score) => 
          acc + Math.pow(score - avgQuality, 2), 0) / qualityScores.length;
        qualityVariance = Math.sqrt(variance);
        allAnalysis.qualityConsistency = Math.max(0, 1 - qualityVariance);
      } else {
        allAnalysis.qualityConsistency = avgQuality;
      }
      
      // タイミングの一貫性（同時期に完了されたか）
      allAnalysis.timingCoherence = avgTiming;
      
      // 物語的シナジー（組み合わせの相乗効果）
      if (completedEntities.length >= 2) {
        // 複数エンティティの組み合わせ効果を評価
        const synergyMultiplier = Math.min(1.5, 1 + (completedEntities.length - 1) * 0.1);
        allAnalysis.narrativeSynergy = avgContext * synergyMultiplier;
      } else {
        allAnalysis.narrativeSynergy = avgContext;
      }
      
      // Phase 3-2: 総合ボーナス計算
      let comprehensiveBonus = 0;
      
      // 1. 高品質一貫性ボーナス
      if (allAnalysis.qualityConsistency > 0.8) {
        comprehensiveBonus += 0.15; // 一貫して高品質
      } else if (allAnalysis.qualityConsistency > 0.6) {
        comprehensiveBonus += 0.08;
      }
      
      // 2. タイミング一貫性ボーナス
      if (allAnalysis.timingCoherence > 0.7) {
        comprehensiveBonus += 0.1;
      }
      
      // 3. シナジーボーナス
      if (allAnalysis.narrativeSynergy > 1.0) {
        comprehensiveBonus += (allAnalysis.narrativeSynergy - 1.0) * 0.2;
      }
      
      // 4. 完了率ボーナス（全て完了時の特別ボーナス）
      if (baseProgress >= 1.0) {
        comprehensiveBonus += 0.2; // 全完了ボーナス
      }
      
      const finalProgress = Math.min(1.0, baseProgress + comprehensiveBonus);
      
      logger.info(`Required-all progress (Phase 3-2): base=${baseProgress.toFixed(3)}, completed=${completedEntities.length}/${rule.entityIds.length}, quality=${allAnalysis.qualityConsistency.toFixed(3)}, synergy=${allAnalysis.narrativeSynergy.toFixed(3)}, final=${finalProgress.toFixed(3)}`);
      
      return finalProgress;

    } catch (error) {
      logger.error('Failed to calculate enhanced required-all story progress:', error);
      return completedEntities.length / rule.entityIds.length;
    }
  }

  /**
   * いずれか要求型の物語的進捗計算（Phase 3-2 強化版）
   */
  private async calculateRequiredAnyStoryProgress(
    rule: EntityRelationshipRule,
    completedEntities: string[],
    entityDetails: Map<string, EntityCompletionDetail>
  ): Promise<number> {
    try {
      if (completedEntities.length === 0) {
        return 0.0;
      }
      
      // Phase 3-2: OR条件の詳細解析
      const anyAnalysis = {
        completedCount: completedEntities.length,
        totalOptions: rule.entityIds.length,
        bestQualityEntity: null as string | null,
        overachievementBonus: 0,
        diversityBonus: 0
      };
      
      // 最高品質エンティティの特定
      let bestStoryValue = 0;
      let bestEntityId = null;
      let totalStoryValue = 0;
      
      const entityValues = [];
      
      for (const entityId of completedEntities) {
        const detail = entityDetails.get(entityId);
        if (detail) {
          // 素素、品質、タイミング、文脈を総合的に評価
          const storyValue = (
            detail.successQuality * 0.4 +
            detail.storyTimingScore * 0.25 +
            detail.narrativeImportance * 0.25 +
            detail.contextualRelevance * 0.1
          );
          
          entityValues.push({ entityId, storyValue, detail });
          totalStoryValue += storyValue;
          
          if (storyValue > bestStoryValue) {
            bestStoryValue = storyValue;
            bestEntityId = entityId;
            anyAnalysis.bestQualityEntity = entityId;
          }
        }
      }
      
      // Phase 3-2: オーバーアチーブメントボーナス計算
      // （必要最低限を超えて複数完了した場合）
      if (completedEntities.length > 1) {
        // 複数選択肢の完了による多様性ボーナス
        const diversityFactor = Math.min(0.3, (completedEntities.length - 1) * 0.1);
        anyAnalysis.diversityBonus = diversityFactor;
        
        // 平均品質ボーナス
        const avgQuality = totalStoryValue / completedEntities.length;
        if (avgQuality > 0.7) {
          anyAnalysis.overachievementBonus += 0.15;
        } else if (avgQuality > 0.5) {
          anyAnalysis.overachievementBonus += 0.1;
        }
      }
      
      // 特別ボーナス: 最高品質エンティティが異常に高い場合
      let exceptionalQualityBonus = 0;
      if (bestStoryValue > 0.9) {
        exceptionalQualityBonus = 0.2; // 例外的高品質
      } else if (bestStoryValue > 0.8) {
        exceptionalQualityBonus = 0.1;
      }
      
      // 最終スコア計算（OR条件は基本1.0からスタート）
      const baseProgress = 1.0; // OR条件は一つでも完了で基本完了
      const totalBonus = anyAnalysis.overachievementBonus + anyAnalysis.diversityBonus + exceptionalQualityBonus;
      const finalProgress = Math.min(1.0, baseProgress + totalBonus);
      
      logger.info(`Required-any progress (Phase 3-2): completed=${completedEntities.length}/${rule.entityIds.length}, bestValue=${bestStoryValue.toFixed(3)}, diversity=${anyAnalysis.diversityBonus.toFixed(3)}, exceptional=${exceptionalQualityBonus.toFixed(3)}, final=${finalProgress.toFixed(3)}`);
      
      return Math.max(1.0, finalProgress); // OR条件の最低保証は1.0

    } catch (error) {
      logger.error('Failed to calculate enhanced required-any story progress:', error);
      return 1.0;
    }
  }

  /**
   * 物語的意味型の進捗計算
   */
  private async calculateStoryMeaningProgress(
    rule: EntityRelationshipRule,
    completedEntities: string[],
    entityDetails: Map<string, EntityCompletionDetail>,
    sessionId: string
  ): Promise<number> {
    try {
      // 基本進捗計算
      const baseProgress = completedEntities.length / rule.entityIds.length;
      
      // 物語的組み合わせの評価
      const narrativeCombinationScore = await this.evaluateNarrativeCombination(
        rule,
        completedEntities,
        entityDetails,
        sessionId
      );
      
      // 物語的タイミングと文脈の評価
      const contextualScore = await this.evaluateStoryContext(
        rule,
        completedEntities,
        sessionId
      );
      
      // 最終スコア計算（基本進捗 × 重み × ボーナス）
      const bonusMultiplier = 1 + (narrativeCombinationScore * 0.3) + (contextualScore * 0.2);
      const finalProgress = Math.min(1.0, baseProgress * rule.completionWeight * bonusMultiplier);
      
      logger.debug(`Story-meaning progress: base=${baseProgress}, narrative=${narrativeCombinationScore}, context=${contextualScore}, final=${finalProgress}`);
      return finalProgress;

    } catch (error) {
      logger.error('Failed to calculate story-meaning progress:', error);
      return (completedEntities.length / rule.entityIds.length) * rule.completionWeight;
    }
  }

  // ==========================================
  // 物語的評価ヘルパーメソッド
  // ==========================================

  /**
   * 物語的組み合わせの評価
   */
  private async evaluateNarrativeCombination(
    rule: EntityRelationshipRule,
    completedEntities: string[],
    entityDetails: Map<string, EntityCompletionDetail>,
    sessionId: string
  ): Promise<number> {
    try {
      if (completedEntities.length < 2) {
        return 0.0; // 組み合わせ評価には最低2つのエンティティが必要
      }
      
      let combinationScore = 0;
      
      // エンティティ間のストーリー的関連性を評価
      for (let i = 0; i < completedEntities.length; i++) {
        for (let j = i + 1; j < completedEntities.length; j++) {
          const entity1 = completedEntities[i];
          const entity2 = completedEntities[j];
          
          const detail1 = entityDetails.get(entity1);
          const detail2 = entityDetails.get(entity2);
          
          if (detail1 && detail2) {
            // 完了タイミングの近さ
            const timingProximity = this.calculateTimingProximity(detail1, detail2);
            // 物語的関連性
            const narrativeRelation = await this.calculateNarrativeRelation(entity1, entity2, sessionId);
            
            combinationScore += (timingProximity * 0.4) + (narrativeRelation * 0.6);
          }
        }
      }
      
      // 組み合わせ数で正規化
      const combinationCount = (completedEntities.length * (completedEntities.length - 1)) / 2;
      return combinationCount > 0 ? combinationScore / combinationCount : 0;

    } catch (error) {
      logger.error('Failed to evaluate narrative combination:', error);
      return 0.0;
    }
  }

  /**
   * 物語的文脈の評価
   */
  private async evaluateStoryContext(
    rule: EntityRelationshipRule,
    completedEntities: string[],
    sessionId: string
  ): Promise<number> {
    try {
      // セッションの現在の物語状態を取得
      const currentNarrativeState = await this.getCurrentNarrativeState(sessionId);
      
      // ルールの物語的意味との適合性
      const meaningAlignment = rule.storyMeaning ? 
        this.calculateMeaningAlignment(rule.storyMeaning, currentNarrativeState) : 0.5;
      
      // 完了されたエンティティの物語的重要度
      const completedImportance = await this.calculateCompletedEntitiesImportance(
        completedEntities,
        sessionId
      );
      
      // 物語の進行における適切性
      const progressionAppropriatenesss = await this.calculateProgressionAppropriateness(
        rule,
        completedEntities,
        sessionId
      );
      
      return (meaningAlignment * 0.4) + (completedImportance * 0.3) + (progressionAppropriatenesss * 0.3);

    } catch (error) {
      logger.error('Failed to evaluate story context:', error);
      return 0.5; // デフォルト値
    }
  }

  // ==========================================
  // エンティティ詳細情報取得
  // ==========================================

  /**
   * エンティティ完了詳細情報を取得
   */
  async getEntityCompletionDetails(
    sessionId: string,
    entityIds: string[]
  ): Promise<Map<string, EntityCompletionDetail>> {
    try {
      const detailsMap = new Map<string, EntityCompletionDetail>();
      
      if (entityIds.length === 0) {
        return detailsMap;
      }

      const placeholders = entityIds.map(() => '?').join(',');
      const query = `
        SELECT 
          eea.entity_id,
          eea.last_interaction_time,
          eae.success,
          eae.user_approach,
          eae.ai_result_narration,
          eae.character_name,
          eae.dice_roll
        FROM entity_exploration_actions eea
        LEFT JOIN exploration_action_executions eae ON eea.entity_id = eae.target_entity_id
        WHERE eea.session_id = ? AND eea.entity_id IN (${placeholders}) AND eea.is_interacted = 1
        ORDER BY eea.last_interaction_time DESC
      `;

      const rows = database.prepare(query).all(sessionId, ...entityIds) as any[];

      for (const row of rows) {
        if (!detailsMap.has(row.entity_id)) {
          const diceRoll = row.dice_roll ? JSON.parse(row.dice_roll) : null;
          const successQuality = this.calculateSuccessQuality(row.success, diceRoll, row.user_approach);
          const storyTimingScore = await this.calculateStoryTimingScore(row.entity_id, row.last_interaction_time, sessionId);
          const narrativeImportance = await this.calculateNarrativeImportance(row.entity_id, sessionId);
          const contextualRelevance = await this.calculateContextualRelevance(row.entity_id, sessionId);

          detailsMap.set(row.entity_id, {
            entityId: row.entity_id,
            completedAt: row.last_interaction_time,
            successQuality,
            storyTimingScore,
            narrativeImportance,
            contextualRelevance,
            characterInvolvement: row.character_name || 'unknown',
            approachMethod: row.user_approach || 'default',
            resultDescription: row.ai_result_narration || 'completed'
          });
        }
      }

      return detailsMap;

    } catch (error) {
      logger.error('Failed to get entity completion details:', error);
      return new Map();
    }
  }

  // ==========================================
  // 計算ヘルパーメソッド
  // ==========================================

  /**
   * 成功の質を計算
   */
  private calculateSuccessQuality(success: boolean, diceRoll: any, userApproach: string): number {
    let qualityScore = success ? 0.7 : 0.3; // 基本成功/失敗スコア
    
    // ダイスロール結果による調整
    if (diceRoll && diceRoll.result) {
      const rollQuality = (diceRoll.result / 20); // d20を0-1に正規化
      qualityScore += rollQuality * 0.2; // 最大20%のボーナス
    }
    
    // ユーザーアプローチの質による調整
    if (userApproach && userApproach.length > 20) {
      qualityScore += 0.1; // 詳細なアプローチに10%ボーナス
    }
    
    return Math.min(1.0, qualityScore);
  }

  /**
   * 物語的タイミングスコアを計算
   */
  private async calculateStoryTimingScore(entityId: string, completedAt: string, sessionId: string): Promise<number> {
    try {
      // セッション開始からの経過時間を取得
      const sessionStartTime = await this.getSessionStartTime(sessionId);
      const completionTime = new Date(completedAt).getTime();
      const sessionStart = new Date(sessionStartTime).getTime();
      const elapsedHours = (completionTime - sessionStart) / (1000 * 60 * 60);
      
      // 物語の理想的な進行曲線（一般的にはセッション中盤が最も活発）
      const idealTiming = this.calculateIdealTimingCurve(elapsedHours);
      
      // 他のエンティティとの完了タイミングの分散を考慮
      const timingVariance = await this.calculateTimingVariance(entityId, completedAt, sessionId);
      
      return (idealTiming * 0.7) + (timingVariance * 0.3);

    } catch (error) {
      logger.error('Failed to calculate story timing score:', error);
      return 0.5; // デフォルト値
    }
  }

  /**
   * タイミング近接性を計算
   */
  private calculateTimingProximity(detail1: EntityCompletionDetail, detail2: EntityCompletionDetail): number {
    try {
      const time1 = new Date(detail1.completedAt).getTime();
      const time2 = new Date(detail2.completedAt).getTime();
      const timeDiff = Math.abs(time1 - time2) / (1000 * 60 * 60); // 時間差を時間単位で
      
      // 1時間以内なら1.0、24時間で0.0になる減衰曲線
      return Math.max(0, 1 - (timeDiff / 24));

    } catch (error) {
      logger.error('Failed to calculate timing proximity:', error);
      return 0.0;
    }
  }

  // ==========================================
  // ユーティリティメソッド（簡易実装）
  // ==========================================

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

  private async calculateNarrativeRelation(entity1: string, entity2: string, sessionId: string): Promise<number> {
    // 簡易実装
    return 0.3;
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
      activeStoryElements: ['exploration', 'mystery'],
      narrativeCoherence: 0.7
    };
  }

  private calculateMeaningAlignment(ruleMeaning: string, narrativeState: NarrativeState): number {
    // 簡易実装: キーワードベースのマッチング
    return 0.5;
  }

  private async calculateCompletedEntitiesImportance(completedEntities: string[], sessionId: string): Promise<number> {
    // 簡易実装
    return 0.6;
  }

  private async calculateProgressionAppropriateness(
    rule: EntityRelationshipRule,
    completedEntities: string[],
    sessionId: string
  ): Promise<number> {
    // 簡易実装
    return 0.5;
  }

  private async calculateNarrativeImportance(entityId: string, sessionId: string): Promise<number> {
    // 簡易実装
    return 0.5;
  }

  private async calculateContextualRelevance(entityId: string, sessionId: string): Promise<number> {
    // 簡易実装
    return 0.5;
  }

  private async getSessionStartTime(sessionId: string): Promise<string> {
    const row = database.prepare(`SELECT created_at FROM sessions WHERE id = ?`).get(sessionId) as any;
    return row ? row.created_at : new Date().toISOString();
  }

  private calculateIdealTimingCurve(elapsedHours: number): number {
    // セッション中盤（2-4時間）で最高値を取る曲線
    const peak = 3; // 3時間でピーク
    const spread = 2; // 分散
    return Math.exp(-Math.pow(elapsedHours - peak, 2) / (2 * Math.pow(spread, 2)));
  }

  private async calculateTimingVariance(entityId: string, completedAt: string, sessionId: string): Promise<number> {
    // 簡易実装
    return 0.7;
  }
}

// シングルトンインスタンス
export const narrativeCalculationService = new NarrativeCalculationService();