import { 
  AIMilestone, 
  EntityPool, 
  MilestoneGenerationRequest,
  MilestoneGenerationResponse,
  ID
} from '@ai-agent-trpg/types';
import { logger } from '../utils/logger';
import { AIServiceError } from '../middleware/errorHandler';
import { getDatabaseManagerService } from './DatabaseManagerService';
import { getTopDownGeneratorService } from './TopDownGeneratorService';
import { getBalanceAdjusterService } from './BalanceAdjusterService';

/**
 * メインマイルストーン生成サービス（オーケストレーション層）
 * 各専門サービスを統合してトップダウンアプローチを実現
 */
export class AIMilestoneGenerationService {
  private databaseManager = getDatabaseManagerService();
  private topDownGenerator = getTopDownGeneratorService();
  private balanceAdjuster = getBalanceAdjusterService();

  /**
   * セッション開始時のマイルストーン・プール生成（トップダウンアプローチ）
   * 各専門サービスを統合したメインオーケストレーション
   */
  async generateMilestonesAndPools(request: MilestoneGenerationRequest): Promise<MilestoneGenerationResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('🎯 AI マイルストーン生成開始（トップダウン統合）', { 
        campaignId: request.campaignId,
        theme: request.theme,
        difficulty: request.difficulty,
        milestoneCount: 3 // Default value
      });

      // Phase 1: 目標設計
      logger.info('📋 Phase 1: 目標設計開始');
      const themeAdaptation = await this.topDownGenerator.generateThemeAdaptation(request.theme);
      const milestoneOutlines = await this.topDownGenerator.generateMilestoneOutlines(request, themeAdaptation);
      const milestoneRelations = await this.topDownGenerator.defineMilestoneRelations(milestoneOutlines);
      
      // Phase 2: コンテンツ生成
      logger.info('🎲 Phase 2: コンテンツ生成開始');
      const coreEntityRequirements = await this.topDownGenerator.defineCoreEntityRequirements(milestoneRelations, themeAdaptation);
      const coreEntities = await this.topDownGenerator.generateCoreEntities(coreEntityRequirements, request, themeAdaptation);
      const bonusEntities = await this.topDownGenerator.generateBonusEntities(request, coreEntities, themeAdaptation);
      await this.topDownGenerator.generateLocationMappings(coreEntities, bonusEntities);
      
      // Phase 3: 最終調整
      logger.info('⚖️ Phase 3: 最終調整開始');
      const detailedMilestones = await this.topDownGenerator.detailizeMilestones(milestoneOutlines, coreEntities);
      const balancedSystem = await this.balanceAdjuster.balanceSystem(detailedMilestones, coreEntities, bonusEntities);
      
      // セッション時間に基づく最終調整
      const sessionAdjustedSystem = this.balanceAdjuster.adjustContentForSessionDuration(
        balancedSystem.milestones,
        balancedSystem.entityPool,
        240 // Default 4 hours session
      );

      // マイルストーンにキャンペーン情報を設定
      const finalMilestones = sessionAdjustedSystem.milestones.map(milestone => ({
        ...milestone,
        campaignId: request.campaignId
      }));

      // Phase 4: データベースコミット
      logger.info('💾 Phase 4: データベースコミット開始');
      
      // EntityPoolCollectionをEntityPoolに変換
      const convertedEntityPool: EntityPool = {
        id: `pool-${Date.now()}`,
        campaignId: request.campaignId,
        sessionId: `session-${Date.now()}`,
        themeId: request.theme,
        entities: {
          coreEntities: {
            enemies: sessionAdjustedSystem.entityPool?.coreEntities?.enemies || [],
            events: sessionAdjustedSystem.entityPool?.coreEntities?.events || [],
            npcs: sessionAdjustedSystem.entityPool?.coreEntities?.npcs || [],
            items: sessionAdjustedSystem.entityPool?.coreEntities?.items || [],
            quests: sessionAdjustedSystem.entityPool?.coreEntities?.quests || []
          },
          bonusEntities: {
            practicalRewards: sessionAdjustedSystem.entityPool?.bonusEntities?.practicalRewards || [],
            trophyItems: sessionAdjustedSystem.entityPool?.bonusEntities?.trophyItems || [],
            mysteryItems: sessionAdjustedSystem.entityPool?.bonusEntities?.mysteryItems || []
          }
        },
        generatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      const commitResult = await this.databaseManager.commitToDatabase(
        finalMilestones,
        convertedEntityPool,
        request.campaignId,
        `session-${Date.now()}`, // Generate session ID
        request.theme
      );

      const processingTime = Date.now() - startTime;

      const response: MilestoneGenerationResponse = {
        milestones: commitResult.milestones,
        narrative: `${request.theme}をテーマとしたマイルストーンを生成しました。`,
        estimatedDuration: 240 // Default 4 hours
      };

      logger.info('✅ AI マイルストーン生成完了（統合）', { 
        milestonesGenerated: response.milestones.length,
        narrative: response.narrative,
        processingTime 
      });

      return response;

    } catch (error) {
      logger.error('❌ AI マイルストーン生成エラー（統合）', { error });
      throw new AIServiceError('Failed to generate milestones and pools', 'milestone-generation');
    }
  }

  /**
   * キャンペーンのAIマイルストーン一覧取得
   */
  async getAIMilestonesByCampaign(campaignId: ID): Promise<AIMilestone[]> {
    return this.databaseManager.getAIMilestonesByCampaign(campaignId);
  }

  /**
   * セッションのエンティティプール取得
   */
  async getEntityPoolBySession(sessionId: ID): Promise<EntityPool | null> {
    return this.databaseManager.getEntityPoolBySession(sessionId);
  }

  /**
   * マイルストーン進捗更新
   */
  async updateMilestoneProgress(
    milestoneId: ID, 
    progress: number, 
    status?: 'pending' | 'in_progress' | 'completed'
  ): Promise<void> {
    return this.databaseManager.updateMilestoneProgress(milestoneId, progress, status);
  }

  /**
   * マイルストーン削除
   */
  async deleteAIMilestone(milestoneId: ID): Promise<void> {
    return this.databaseManager.deleteAIMilestone(milestoneId);
  }


  /**
   * 開発・デバッグ用: 生成システムの詳細情報取得
   */
  async getGenerationSystemInfo(): Promise<{
    services: string[],
    capabilities: string[],
    version: string
  }> {
    return {
      services: [
        'DatabaseManagerService',
        'TopDownGeneratorService', 
        'BalanceAdjusterService'
      ],
      capabilities: [
        'トップダウンマイルストーン生成',
        '二層構造エンティティプール',
        '自動バランス調整',
        'セッション時間適応',
        '場所ベースエンティティ配置'
      ],
      version: '2.0.0-modular'
    };
  }

  /**
   * ヘルスチェック: 各サービスの状態確認
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy',
    services: { [serviceName: string]: boolean },
    timestamp: string
  }> {
    const services = {
      databaseManager: false,
      topDownGenerator: false,
      balanceAdjuster: false
    };

    try {
      // データベースマネージャーのチェック
      await this.databaseManager.getAIMilestonesByCampaign('health-check');
      services.databaseManager = true;
    } catch (error) {
      logger.warn('DatabaseManagerService health check failed', { error });
    }

    try {
      // トップダウン生成サービスのチェック（軽量テスト）
      await this.topDownGenerator.generateThemeAdaptation('health-check');
      services.topDownGenerator = true;
    } catch (error) {
      logger.warn('TopDownGeneratorService health check failed', { error });
    }

    // バランス調整サービスは常にヘルシー（純粋関数）
    services.balanceAdjuster = true;

    const healthyCount = Object.values(services).filter(Boolean).length;
    const totalCount = Object.keys(services).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      status = 'healthy';
    } else if (healthyCount >= Math.ceil(totalCount / 2)) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services,
      timestamp: new Date().toISOString()
    };
  }
}

// Lazy initialization
let _aiMilestoneGenerationService: AIMilestoneGenerationService | null = null;
export function getAIMilestoneGenerationService(): AIMilestoneGenerationService {
  if (!_aiMilestoneGenerationService) {
    _aiMilestoneGenerationService = new AIMilestoneGenerationService();
  }
  return _aiMilestoneGenerationService;
}