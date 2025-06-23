import { Router, Request, Response } from 'express';
import { 
  MilestoneGenerationRequest, 
  MilestoneGenerationResponse,
  AIMilestone,
  EntityPool,
  SessionDurationConfig
} from '@ai-agent-trpg/types';
import { getAIMilestoneGenerationService } from '../services/aiMilestoneGenerationService';
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
        enemies: response.entityPool.entities.enemies.length,
        events: response.entityPool.entities.events.length,
        npcs: response.entityPool.entities.npcs.length,
        items: response.entityPool.entities.items.length,
        quests: response.entityPool.entities.quests.length
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

    if (!entityPool) {
      res.status(404).json({
        success: false,
        error: 'Entity pool not found for this session',
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info('✅ エンティティプール取得完了', { 
      sessionId,
      entityCounts: {
        enemies: entityPool.entities.enemies.length,
        events: entityPool.entities.events.length,
        npcs: entityPool.entities.npcs.length,
        items: entityPool.entities.items.length,
        quests: entityPool.entities.quests.length
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