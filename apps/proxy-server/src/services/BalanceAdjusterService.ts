import { 
  AIMilestone, 
  EntityPoolCollection
} from '@ai-agent-trpg/types';
import { logger } from '../utils/logger';

/**
 * バランス調整専用サービス
 * 生成されたマイルストーン・エンティティシステムの最終調整を担当
 */
export class BalanceAdjusterService {

  /**
   * Phase 3.2: システム全体のバランス調整
   * 生成されたシステム全体のバランスを最終調整
   */
  async balanceSystem(
    detailedMilestones: AIMilestone[],
    coreEntities: any,
    bonusEntities: any
  ): Promise<{
    milestones: AIMilestone[],
    entityPool: EntityPoolCollection
  }> {
    logger.info('⚖️ システムバランス調整開始', {
      milestonesCount: detailedMilestones.length,
      coreEntitiesCount: this.countTotalEntities(coreEntities),
      bonusEntitiesCount: this.countTotalEntities(bonusEntities)
    });

    // 1. マイルストーン進捗配分の調整
    const balancedMilestones = this.adjustMilestoneProgressBalance(detailedMilestones);

    // 2. エンティティ報酬の調整
    const balancedCoreEntities = this.adjustEntityRewards(coreEntities, 'core');
    const balancedBonusEntities = this.adjustEntityRewards(bonusEntities, 'bonus');

    // 3. 全体的な経験値バランスの調整
    const finalMilestones = this.adjustExperienceBalance(balancedMilestones);

    // 4. エンティティプール構造の最終化
    const entityPool: EntityPoolCollection = {
      coreEntities: {
        enemies: balancedCoreEntities.enemies || [],
        events: balancedCoreEntities.events || [],
        npcs: balancedCoreEntities.npcs || [],
        items: balancedCoreEntities.items || [],
        quests: balancedCoreEntities.quests || []
      },
      bonusEntities: {
        practicalRewards: balancedBonusEntities.practicalRewards || [],
        trophyItems: balancedBonusEntities.trophyItems || [],
        mysteryItems: balancedBonusEntities.mysteryItems || []
      },
      // 後方互換性のため
      enemies: balancedCoreEntities.enemies || [],
      events: balancedCoreEntities.events || [],
      npcs: balancedCoreEntities.npcs || [],
      items: balancedCoreEntities.items || [],
      quests: balancedCoreEntities.quests || []
    };

    logger.info('✅ システムバランス調整完了', {
      finalMilestonesCount: finalMilestones.length,
      totalExperiencePoints: finalMilestones.reduce((sum, m) => sum + (m.reward?.experiencePoints || 0), 0),
      coreEntitiesBalance: this.calculateEntityBalance(entityPool.coreEntities),
      bonusEntitiesBalance: this.calculateEntityBalance(entityPool.bonusEntities)
    });

    return {
      milestones: finalMilestones,
      entityPool
    };
  }

  /**
   * マイルストーン進捗配分の調整
   * 各マイルストーンの進捗貢献度を正規化
   */
  private adjustMilestoneProgressBalance(milestones: AIMilestone[]): AIMilestone[] {
    return milestones.map(milestone => {
      const contributions = milestone.progressContributions || [];
      const total = contributions.reduce((sum, c) => sum + c, 0);
      
      // 進捗合計が100%になるよう正規化
      const normalizedContributions = total > 0 
        ? contributions.map(c => Math.round((c / total) * 100))
        : [33, 33, 34]; // デフォルト配分

      // 端数調整
      const normalizedTotal = normalizedContributions.reduce((sum, c) => sum + c, 0);
      if (normalizedTotal !== 100) {
        const diff = 100 - normalizedTotal;
        normalizedContributions[normalizedContributions.length - 1] += diff;
      }

      return {
        ...milestone,
        progressContributions: normalizedContributions
      };
    });
  }

  /**
   * エンティティ報酬の調整
   * エンティティタイプに応じた適切な報酬バランスを設定
   */
  private adjustEntityRewards(entities: any, entityType: 'core' | 'bonus'): any {
    const multiplier = entityType === 'core' ? 1.0 : 0.6; // ボーナスは控えめ

    if (Array.isArray(entities)) {
      return entities.map(entity => this.adjustSingleEntityReward(entity, multiplier));
    }

    // オブジェクト形式の場合、各カテゴリを処理
    const adjusted: any = {};
    for (const [category, items] of Object.entries(entities)) {
      if (Array.isArray(items)) {
        adjusted[category] = items.map((item: any) => this.adjustSingleEntityReward(item, multiplier));
      } else {
        adjusted[category] = items;
      }
    }

    return adjusted;
  }

  /**
   * 単一エンティティの報酬調整
   */
  private adjustSingleEntityReward(entity: any, multiplier: number): any {
    if (!entity.rewards) return entity;

    const adjustedRewards = { ...entity.rewards };
    
    // 経験値の調整
    if (adjustedRewards.experience) {
      adjustedRewards.experience = Math.round(adjustedRewards.experience * multiplier);
    }

    // アイテム報酬の調整（量の調整）
    if (adjustedRewards.items && Array.isArray(adjustedRewards.items)) {
      adjustedRewards.items = adjustedRewards.items.map((item: any) => ({
        ...item,
        quantity: item.quantity ? Math.max(1, Math.round(item.quantity * multiplier)) : 1
      }));
    }

    return {
      ...entity,
      rewards: adjustedRewards
    };
  }

  /**
   * 全体的な経験値バランスの調整
   * セッション時間に応じて経験値を調整
   */
  private adjustExperienceBalance(milestones: AIMilestone[]): AIMilestone[] {
    const currentTotal = milestones.reduce((sum, m) => sum + (m.reward?.experiencePoints || 0), 0);
    const targetTotal = milestones.length * 100; // マイルストーンあたり100XP目安
    
    if (currentTotal === 0) return milestones;

    const adjustmentRatio = targetTotal / currentTotal;
    
    return milestones.map(milestone => ({
      ...milestone,
      reward: {
        ...milestone.reward,
        experiencePoints: Math.round((milestone.reward?.experiencePoints || 0) * adjustmentRatio)
      }
    }));
  }

  /**
   * エンティティ総数のカウント
   */
  private countTotalEntities(entities: any): number {
    if (Array.isArray(entities)) {
      return entities.length;
    }

    let total = 0;
    for (const items of Object.values(entities)) {
      if (Array.isArray(items)) {
        total += items.length;
      }
    }
    return total;
  }

  /**
   * エンティティバランスの計算
   */
  private calculateEntityBalance(entities: any): { [key: string]: number } {
    const balance: { [key: string]: number } = {};
    
    for (const [category, items] of Object.entries(entities)) {
      if (Array.isArray(items)) {
        balance[category] = items.length;
      }
    }
    
    return balance;
  }

  /**
   * セッション時間に基づくコンテンツ量の調整
   */
  adjustContentForSessionDuration(
    milestones: AIMilestone[],
    entityPool: EntityPoolCollection,
    sessionDurationMinutes: number
  ): { milestones: AIMilestone[], entityPool: EntityPoolCollection } {
    logger.info('⏰ セッション時間に基づくコンテンツ調整', { sessionDurationMinutes });

    // セッション時間に基づく調整係数
    const timeRatio = sessionDurationMinutes / 60; // 60分を基準とする
    const contentMultiplier = Math.max(0.5, Math.min(2.0, timeRatio)); // 0.5倍～2.0倍の範囲

    // マイルストーン数の調整（時間が短い場合は減らす）
    const targetMilestoneCount = Math.max(1, Math.round(milestones.length * contentMultiplier));
    const adjustedMilestones = milestones.slice(0, targetMilestoneCount);

    // エンティティ数の調整
    const adjustedEntityPool = this.adjustEntityPoolSize(entityPool, contentMultiplier);

    logger.info('✅ セッション時間調整完了', {
      originalMilestones: milestones.length,
      adjustedMilestones: adjustedMilestones.length,
      contentMultiplier
    });

    return {
      milestones: adjustedMilestones,
      entityPool: adjustedEntityPool
    };
  }

  /**
   * エンティティプールサイズの調整
   */
  private adjustEntityPoolSize(
    entityPool: EntityPoolCollection,
    multiplier: number
  ): EntityPoolCollection {
    const adjustCategory = (items: any[]) => 
      items.slice(0, Math.max(1, Math.round(items.length * multiplier)));

    return {
      coreEntities: {
        enemies: adjustCategory(entityPool.coreEntities?.enemies || []),
        events: adjustCategory(entityPool.coreEntities?.events || []),
        npcs: adjustCategory(entityPool.coreEntities?.npcs || []),
        items: adjustCategory(entityPool.coreEntities?.items || []),
        quests: adjustCategory(entityPool.coreEntities?.quests || [])
      },
      bonusEntities: {
        practicalRewards: adjustCategory(entityPool.bonusEntities?.practicalRewards || []),
        trophyItems: adjustCategory(entityPool.bonusEntities?.trophyItems || []),
        mysteryItems: adjustCategory(entityPool.bonusEntities?.mysteryItems || [])
      },
      // 後方互換性のため
      enemies: adjustCategory(entityPool.coreEntities?.enemies || []),
      events: adjustCategory(entityPool.coreEntities?.events || []),
      npcs: adjustCategory(entityPool.coreEntities?.npcs || []),
      items: adjustCategory(entityPool.coreEntities?.items || []),
      quests: adjustCategory(entityPool.coreEntities?.quests || [])
    };
  }
}

// Lazy initialization
let _balanceAdjusterService: BalanceAdjusterService | null = null;
export function getBalanceAdjusterService(): BalanceAdjusterService {
  if (!_balanceAdjusterService) {
    _balanceAdjusterService = new BalanceAdjusterService();
  }
  return _balanceAdjusterService;
}