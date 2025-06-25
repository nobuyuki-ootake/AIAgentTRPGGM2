import { Router, Request, Response } from 'express';
import { 
  MilestoneGenerationRequest, 
  MilestoneGenerationResponse,
  ScenarioGenerationRequest,
  ScenarioGenerationResponse,
  SessionScenario,
  AIMilestone,
  EntityPool,
  SessionDurationConfig
} from '@ai-agent-trpg/types';
import { getAIMilestoneGenerationService } from '../services/aiMilestoneGenerationService';
import { getPlayerExperienceService, MaskedProgressInfo } from '../services/playerExperienceService';
import { getLocationEntityMappingService } from '../services/locationEntityMappingService';
import { logger } from '../utils/logger';
import { ValidationError, AIServiceError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/ai-milestone-generation/generate
 * セッション開始時のマイルストーン・プール生成
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      campaignId, 
      sessionId, 
      themeId, 
      sessionDuration, 
      milestoneCount = 3,
      existingContent 
    } = req.body;

    // バリデーション
    if (!campaignId || !sessionId || !themeId || !sessionDuration) {
      throw new ValidationError('Required fields missing', {
        missingFields: ['campaignId', 'sessionId', 'themeId', 'sessionDuration'].filter(field => !req.body[field])
      });
    }

    logger.info('🎯 AI マイルストーン生成リクエスト', { 
      campaignId, 
      sessionId, 
      themeId,
      milestoneCount 
    });

    const request: MilestoneGenerationRequest = {
      campaignId,
      sessionId,
      themeId,
      sessionDuration: sessionDuration as SessionDurationConfig,
      milestoneCount,
      existingContent
    };

    const service = getAIMilestoneGenerationService();
    const response: MilestoneGenerationResponse = await service.generateMilestonesAndPools(request);

    logger.info('✅ AI マイルストーン生成完了', { 
      milestonesGenerated: response.milestones.length,
      entitiesGenerated: {
        coreEntities: {
          enemies: response.entityPool.entities.coreEntities?.enemies?.length || 0,
          events: response.entityPool.entities.coreEntities?.events?.length || 0,
          npcs: response.entityPool.entities.coreEntities?.npcs?.length || 0,
          items: response.entityPool.entities.coreEntities?.items?.length || 0,
          quests: response.entityPool.entities.coreEntities?.quests?.length || 0
        },
        bonusEntities: {
          practicalRewards: response.entityPool.entities.bonusEntities?.practicalRewards?.length || 0,
          trophyItems: response.entityPool.entities.bonusEntities?.trophyItems?.length || 0,
          mysteryItems: response.entityPool.entities.bonusEntities?.mysteryItems?.length || 0
        }
      },
      processingTime: response.generationMetadata.processingTime
    });

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ AI マイルストーン生成エラー', { error });
    
    if (error instanceof ValidationError || error instanceof AIServiceError) {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during milestone generation',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/ai-milestone-generation/campaign/:campaignId/milestones
 * キャンペーンのAIマイルストーン一覧取得
 */
router.get('/campaign/:campaignId/milestones', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    if (!campaignId) {
      throw new ValidationError('Campaign ID is required');
    }

    logger.info('📋 AI マイルストーン一覧取得', { campaignId });

    const service = getAIMilestoneGenerationService();
    const milestones: AIMilestone[] = await service.getAIMilestonesByCampaign(campaignId);

    logger.info('✅ AI マイルストーン一覧取得完了', { 
      campaignId,
      milestonesCount: milestones.length 
    });

    res.json({
      success: true,
      data: milestones,
      count: milestones.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ AI マイルストーン一覧取得エラー', { error });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get AI milestones',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/ai-milestone-generation/session/:sessionId/entity-pool
 * セッションのエンティティプール取得
 */
router.get('/session/:sessionId/entity-pool', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    logger.info('🎲 エンティティプール取得', { sessionId });

    const service = getAIMilestoneGenerationService();
    const entityPool: EntityPool | null = await service.getEntityPoolBySession(sessionId);

    // データが存在しない場合は空のエンティティプールを返す（404エラーではない）
    if (!entityPool) {
      const emptyEntityPool: EntityPool = {
        id: '',
        campaignId: '',
        sessionId,
        themeId: '',
        entities: {
          coreEntities: {
            enemies: [],
            events: [],
            npcs: [],
            items: [],
            quests: []
          },
          bonusEntities: {
            practicalRewards: [],
            trophyItems: [],
            mysteryItems: []
          },
          // 後方互換性のため
          enemies: [],
          events: [],
          npcs: [],
          items: [],
          quests: []
        },
        generatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      logger.info('✅ エンティティプール取得完了（未生成のため空）', { 
        sessionId,
        entityCounts: {
          coreEntities: {
            enemies: 0,
            events: 0,
            npcs: 0,
            items: 0,
            quests: 0
          },
          bonusEntities: {
            practicalRewards: 0,
            trophyItems: 0,
            mysteryItems: 0
          }
        }
      });

      res.json({
        success: true,
        data: emptyEntityPool,
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info('✅ エンティティプール取得完了', { 
      sessionId,
      entityCounts: {
        coreEntities: {
          enemies: entityPool.entities.coreEntities?.enemies?.length || 0,
          events: entityPool.entities.coreEntities?.events?.length || 0,
          npcs: entityPool.entities.coreEntities?.npcs?.length || 0,
          items: entityPool.entities.coreEntities?.items?.length || 0,
          quests: entityPool.entities.coreEntities?.quests?.length || 0
        },
        bonusEntities: {
          practicalRewards: entityPool.entities.bonusEntities?.practicalRewards?.length || 0,
          trophyItems: entityPool.entities.bonusEntities?.trophyItems?.length || 0,
          mysteryItems: entityPool.entities.bonusEntities?.mysteryItems?.length || 0
        }
      }
    });

    res.json({
      success: true,
      data: entityPool,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ エンティティプール取得エラー', { error });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get entity pool',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/ai-milestone-generation/milestone/:milestoneId/progress
 * マイルストーン進捗更新
 */
router.patch('/milestone/:milestoneId/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const { milestoneId } = req.params;
    const { progress, status } = req.body;

    if (!milestoneId) {
      throw new ValidationError('Milestone ID is required');
    }

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      throw new ValidationError('Valid progress (0-100) is required');
    }

    if (status && !['pending', 'in_progress', 'completed'].includes(status)) {
      throw new ValidationError('Invalid status. Must be: pending, in_progress, or completed');
    }

    logger.info('📈 マイルストーン進捗更新', { 
      milestoneId, 
      progress, 
      status 
    });

    const service = getAIMilestoneGenerationService();
    await service.updateMilestoneProgress(milestoneId, progress, status);

    logger.info('✅ マイルストーン進捗更新完了', { 
      milestoneId,
      newProgress: progress,
      newStatus: status 
    });

    res.json({
      success: true,
      message: 'Milestone progress updated successfully',
      data: {
        milestoneId,
        progress,
        status
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ マイルストーン進捗更新エラー', { error });
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update milestone progress',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/ai-milestone-generation/regenerate/:sessionId
 * セッションのマイルストーン・プール再生成
 */
router.post('/regenerate/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { 
      campaignId, 
      themeId, 
      sessionDuration, 
      milestoneCount = 3,
      existingContent 
    } = req.body;

    if (!sessionId || !campaignId || !themeId || !sessionDuration) {
      throw new ValidationError('Required fields missing', {
        missingFields: ['sessionId', 'campaignId', 'themeId', 'sessionDuration'].filter(field => {
          const value = field === 'sessionId' ? sessionId : req.body[field];
          return !value;
        })
      });
    }

    logger.info('🔄 AI マイルストーン・プール再生成', { 
      sessionId,
      campaignId, 
      themeId 
    });

    const request: MilestoneGenerationRequest = {
      campaignId,
      sessionId,
      themeId,
      sessionDuration: sessionDuration as SessionDurationConfig,
      milestoneCount,
      existingContent
    };

    const service = getAIMilestoneGenerationService();
    const response: MilestoneGenerationResponse = await service.generateMilestonesAndPools(request);

    logger.info('✅ AI マイルストーン・プール再生成完了', { 
      sessionId,
      milestonesRegenerated: response.milestones.length,
      processingTime: response.generationMetadata.processingTime
    });

    res.json({
      success: true,
      data: response,
      message: 'Milestones and entity pool regenerated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ AI マイルストーン・プール再生成エラー', { error });
    
    if (error instanceof ValidationError || error instanceof AIServiceError) {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during regeneration',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/ai-milestone-generation/milestone/:milestoneId
 * マイルストーン削除
 */
router.delete('/milestone/:milestoneId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { milestoneId } = req.params;

    if (!milestoneId) {
      throw new ValidationError('Milestone ID is required');
    }

    logger.info('🗑️ マイルストーン削除リクエスト', { milestoneId });

    const service = getAIMilestoneGenerationService();
    await service.deleteAIMilestone(milestoneId);

    logger.info('✅ マイルストーン削除完了', { milestoneId });

    res.json({
      success: true,
      message: 'Milestone deleted successfully',
      data: {
        milestoneId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ マイルストーン削除エラー', { error });
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete milestone',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/ai-milestone-generation/generate-scenario-topdown
 * トップダウンアプローチによるシナリオ生成
 */
router.post('/generate-scenario-topdown', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      campaignId, 
      sessionId, 
      themeId, 
      sessionDuration, 
      milestoneCount = 3,
      existingContent 
    } = req.body;

    // バリデーション
    if (!campaignId || !sessionId || !themeId || !sessionDuration) {
      throw new ValidationError('Required fields missing', {
        missingFields: ['campaignId', 'sessionId', 'themeId', 'sessionDuration'].filter(field => !req.body[field])
      });
    }

    logger.info('🎯 トップダウンシナリオ生成リクエスト', { 
      campaignId, 
      sessionId, 
      themeId,
      milestoneCount 
    });

    const request: MilestoneGenerationRequest = {
      campaignId,
      sessionId,
      themeId,
      sessionDuration: sessionDuration as SessionDurationConfig,
      milestoneCount,
      existingContent
    };

    const service = getAIMilestoneGenerationService();
    const response: MilestoneGenerationResponse = await service.generateMilestonesAndPools(request);

    logger.info('✅ トップダウンシナリオ生成完了', { 
      milestonesGenerated: response.milestones.length,
      processingTime: response.generationMetadata.processingTime
    });

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ トップダウンシナリオ生成エラー', { error });
    
    if (error instanceof ValidationError || error instanceof AIServiceError) {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during top-down scenario generation',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/ai-milestone-generation/session/:sessionId/player-progress
 * プレイヤー向けマスクされた進捗情報取得
 */
router.get('/session/:sessionId/player-progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    logger.info('🎭 プレイヤー進捗情報取得', { sessionId });

    const playerExperienceService = getPlayerExperienceService();
    const maskedProgress: MaskedProgressInfo = await playerExperienceService.getMaskedProgressInfo(sessionId);

    logger.info('✅ プレイヤー進捗情報取得完了', { 
      sessionId,
      explorationProgress: maskedProgress.explorationProgress,
      availableActionsCount: maskedProgress.availableActions.length,
      hintsCount: maskedProgress.ambiguousHints.length
    });

    res.json({
      success: true,
      data: maskedProgress,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ プレイヤー進捗情報取得エラー', { error });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get player progress information',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/ai-milestone-generation/location/:locationId/available-actions
 * 場所で利用可能なアクション取得
 */
router.get('/location/:locationId/available-actions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { locationId } = req.params;
    const { sessionId } = req.query;

    if (!locationId) {
      throw new ValidationError('Location ID is required');
    }

    if (!sessionId || typeof sessionId !== 'string') {
      throw new ValidationError('Session ID is required as query parameter');
    }

    logger.info('📍 場所利用可能アクション取得', { locationId, sessionId });

    const locationMappingService = getLocationEntityMappingService();
    const availableEntities = await locationMappingService.getAvailableEntitiesForLocation(locationId, sessionId);

    // エンティティをプレイヤー向けアクションに変換
    const availableActions = availableEntities.map(entity => ({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      category: entity.category,
      isAvailable: entity.isAvailable,
      isDiscovered: !!entity.discoveredAt
    }));

    logger.info('✅ 場所利用可能アクション取得完了', { 
      locationId,
      sessionId,
      availableActionsCount: availableActions.length
    });

    res.json({
      success: true,
      data: {
        locationId,
        sessionId,
        availableActions,
        totalCount: availableActions.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ 場所利用可能アクション取得エラー', { error });
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get available actions for location',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/ai-milestone-generation/entity/:entityId/discover
 * エンティティ発見マーク
 */
router.patch('/entity/:entityId/discover', async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityId } = req.params;
    const { sessionId, characterId } = req.body;

    if (!entityId) {
      throw new ValidationError('Entity ID is required');
    }

    if (!sessionId) {
      throw new ValidationError('Session ID is required in request body');
    }

    if (!characterId) {
      throw new ValidationError('Character ID is required in request body');
    }

    logger.info('🔍 エンティティ発見マーク', { entityId, sessionId, characterId });

    const locationMappingService = getLocationEntityMappingService();
    
    // エンティティのマッピングを取得
    const mappings = await locationMappingService.getMappingsByEntity(entityId);
    
    if (mappings.length === 0) {
      throw new ValidationError(`No mappings found for entity ${entityId}`);
    }

    // セッションに該当するマッピングを発見済みとしてマーク
    let discoveredMappings = 0;
    for (const mapping of mappings) {
      if (mapping.sessionId === sessionId) {
        await locationMappingService.markDiscovered(mapping.id);
        discoveredMappings++;
      }
    }

    // TODO: マイルストーン進捗の自動チェック・更新を将来実装
    // const milestoneService = getAIMilestoneGenerationService();
    // const progressUpdate = await milestoneService.checkAndUpdateMilestoneProgress(entityId, sessionId, characterId);
    const progressUpdate = null; // 仮実装

    logger.info('✅ エンティティ発見マーク完了', { 
      entityId,
      sessionId,
      characterId,
      discoveredMappings,
      milestoneProgress: progressUpdate
    });

    res.json({
      success: true,
      data: {
        discovered: discoveredMappings > 0,
        milestone: undefined, // TODO: 関連マイルストーン情報を将来返却
        progressUpdate: progressUpdate ? {
          milestoneId: 'temp-id', // TODO: 実際のマイルストーンID
          oldProgress: 0,
          newProgress: 0
        } : undefined
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ エンティティ発見マークエラー', { error });
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to mark entity as discovered',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/ai-milestone-generation/session/:sessionId/subtle-hints
 * 暗示的ヒント取得
 */
router.get('/session/:sessionId/subtle-hints', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { milestoneId } = req.query;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    logger.info('💭 暗示的ヒント取得', { sessionId, milestoneId });

    const playerExperienceService = getPlayerExperienceService();

    let hints: string[] = [];

    if (milestoneId && typeof milestoneId === 'string') {
      // 特定マイルストーンのヒント
      hints = await playerExperienceService.generateSubtleHints(0, milestoneId);
    } else {
      // セッション全体のヒント
      const maskedProgress = await playerExperienceService.getMaskedProgressInfo(sessionId);
      hints = maskedProgress.ambiguousHints;
    }

    logger.info('✅ 暗示的ヒント取得完了', { 
      sessionId,
      milestoneId,
      hintsCount: hints.length
    });

    res.json({
      success: true,
      data: {
        sessionId,
        milestoneId,
        hints,
        count: hints.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ 暗示的ヒント取得エラー', { error });
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get subtle hints',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/ai-milestone-generation/generate-scenario
 * 3層統合生成：シナリオ→マイルストーン→エンティティプールの一括生成
 * Phase 1 実装：AI Agent GM 対話による物語追体験システム
 */
router.post('/generate-scenario', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      campaignId,
      sessionId,
      themeId,
      sessionDuration,
      scenarioPreferences,
      existingContent,
      generationOptions = {}
    } = req.body;

    // バリデーション
    if (!campaignId || !sessionId || !themeId || !sessionDuration || !scenarioPreferences) {
      throw new ValidationError('Required fields missing for scenario generation', {
        missingFields: ['campaignId', 'sessionId', 'themeId', 'sessionDuration', 'scenarioPreferences']
          .filter(field => !req.body[field])
      });
    }

    // シナリオ設定のバリデーション
    if (!scenarioPreferences.theme || !scenarioPreferences.complexity || !scenarioPreferences.narrativeStyle) {
      throw new ValidationError('Scenario preferences incomplete', {
        missingPreferences: ['theme', 'complexity', 'narrativeStyle']
          .filter(field => !scenarioPreferences[field])
      });
    }

    logger.info('🎭 3層統合シナリオ生成リクエスト', {
      campaignId,
      sessionId,
      themeId,
      theme: scenarioPreferences.theme,
      complexity: scenarioPreferences.complexity,
      targetPlayTime: scenarioPreferences.targetPlayTime
    });

    // リクエスト構築
    const request: ScenarioGenerationRequest = {
      campaignId,
      sessionId,
      themeId,
      sessionDuration: sessionDuration as SessionDurationConfig,
      scenarioPreferences: {
        theme: scenarioPreferences.theme,
        complexity: scenarioPreferences.complexity || 'moderate',
        focusAreas: scenarioPreferences.focusAreas || ['探索', '謎解き'],
        narrativeStyle: scenarioPreferences.narrativeStyle || 'immersive',
        targetPlayTime: scenarioPreferences.targetPlayTime || 240
      },
      existingContent,
      generationOptions: {
        guidanceLevel: generationOptions.guidanceLevel || 'moderate',
        mysteryLevel: generationOptions.mysteryLevel || 'hinted',
        milestoneCount: generationOptions.milestoneCount || 3,
        entityComplexity: generationOptions.entityComplexity || 'detailed'
      }
    };

    // サービス取得
    const aiMilestoneService = getAIMilestoneGenerationService();

    // 3層統合生成実行
    logger.info('🚀 3層統合生成開始', { sessionId });
    const startTime = Date.now();

    // Phase 1実装: 既存のマイルストーン生成を拡張して使用
    // TODO: Phase 2でシナリオ特化生成ロジックを実装
    const milestoneRequest: MilestoneGenerationRequest = {
      campaignId: request.campaignId,
      sessionId: request.sessionId,
      themeId: request.themeId,
      sessionDuration: request.sessionDuration,
      milestoneCount: request.generationOptions?.milestoneCount || 3,
      existingContent: request.existingContent
    };

    const milestoneResponse = await aiMilestoneService.generateMilestonesAndPools(milestoneRequest);
    const processingTime = Date.now() - startTime;

    // シナリオ概要を生成（Phase 1実装）
    const scenario: SessionScenario = {
      sessionId: request.sessionId,
      title: `${request.scenarioPreferences.theme}シナリオ`,
      scenario: `${request.scenarioPreferences.theme}をテーマとした物語。` +
               `${request.scenarioPreferences.focusAreas.join('と')}を中心とした体験を通じて、` +
               `プレイヤーは段階的に謎を解き明かしていく。` +
               `AI Agent GMとの対話により、没入感の高い${request.sessionDuration.description}の物語を追体験できる。`,
      theme: request.scenarioPreferences.theme,
      estimatedPlayTime: request.scenarioPreferences.targetPlayTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generatedBy: 'ai',
      narrativeStyle: request.scenarioPreferences.narrativeStyle,
      guidanceLevel: request.generationOptions?.guidanceLevel || 'moderate',
      mysteryLevel: request.generationOptions?.mysteryLevel || 'hinted'
    };

    // レスポンス構築
    const response: ScenarioGenerationResponse = {
      scenario,
      milestones: milestoneResponse.milestones,
      entityPool: milestoneResponse.entityPool,
      themeAdaptation: milestoneResponse.themeAdaptation,
      narrativeFlow: {
        introduction: `${scenario.theme}の世界へようこそ。あなたの冒険が始まります。`,
        progression: [
          '情報収集フェーズ：周囲を探索し、手がかりを集める',
          '推理・検証フェーズ：集めた情報から仮説を立てる',
          '解決・実行フェーズ：決断を下し、行動に移す'
        ],
        climax: '全ての手がかりが繋がり、真相に辿り着く瞬間',
        resolution: 'プレイヤーの選択によって結末が決まる'
      },
      gmPersona: {
        style: 'プレイヤーの想像力を刺激する自然な誘導',
        specializations: request.scenarioPreferences.focusAreas,
        responsePatterns: [
          '興味を引く情報の段階的開示',
          '選択肢の自然な提示',
          '物語世界への没入感促進'
        ]
      },
      generationMetadata: {
        model: milestoneResponse.generationMetadata.model,
        totalTokensUsed: milestoneResponse.generationMetadata.tokensUsed,
        processingTime,
        generatedAt: new Date().toISOString(),
        layersGenerated: ['scenario', 'milestones', 'entities'],
        qualityScore: 85 // Phase 1暫定値
      }
    };

    logger.info('✅ 3層統合生成完了', {
      sessionId,
      processingTime,
      milestoneCount: response.milestones.length,
      scenarioTitle: response.scenario.title
    });

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ 3層統合生成エラー', { error });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (error instanceof AIServiceError) {
      res.status(503).json({
        success: false,
        error: 'AI service error during scenario generation',
        details: error.details,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate scenario',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/ai-milestone-generation/health
 * ヘルスチェック
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'AI Milestone Generation',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;