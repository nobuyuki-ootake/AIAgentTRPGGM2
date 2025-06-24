import { Router, Request, Response } from 'express';
import { 
  getPlayerExperienceService, 
  MaskedProgressInfo, 
  SessionContext
} from '../services/playerExperienceService';
import { logger } from '../utils/logger';
import { ValidationError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/player-experience/session/:sessionId/masked-progress
 * マスクされた進捗情報取得（プレイヤー向け）
 */
router.get('/session/:sessionId/masked-progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    logger.info('🎭 マスク進捗情報取得', { sessionId });

    const service = getPlayerExperienceService();
    const maskedProgress: MaskedProgressInfo = await service.getMaskedProgressInfo(sessionId);

    logger.info('✅ マスク進捗情報取得完了', { 
      sessionId,
      explorationProgress: maskedProgress.explorationProgress,
      availableActionsCount: maskedProgress.availableActions.length,
      hintsCount: maskedProgress.ambiguousHints.length,
      discoveredElementsCount: maskedProgress.discoveredElements.length
    });

    res.json({
      success: true,
      data: maskedProgress,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ マスク進捗情報取得エラー', { error });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get masked progress information',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/player-experience/session/:sessionId/available-actions
 * 利用可能アクション取得（プレイヤー向け）
 */
router.get('/session/:sessionId/available-actions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { locationId } = req.query;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    logger.info('🎮 利用可能アクション取得', { sessionId, locationId });

    const service = getPlayerExperienceService();
    const maskedProgress: MaskedProgressInfo = await service.getMaskedProgressInfo(sessionId);

    // 場所に関係なく全般的なアクションを返す
    const availableActions = maskedProgress.availableActions;

    logger.info('✅ 利用可能アクション取得完了', { 
      sessionId,
      locationId,
      actionsCount: availableActions.length
    });

    res.json({
      success: true,
      data: {
        sessionId,
        locationId,
        availableActions,
        explorationProgress: maskedProgress.explorationProgress,
        count: availableActions.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ 利用可能アクション取得エラー', { error });
    
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
      error: 'Failed to get available actions',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/player-experience/session/:sessionId/subtle-hints
 * 暗示的ヒント取得（プレイヤー向け）
 */
router.get('/session/:sessionId/subtle-hints', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { milestoneId, count = 3 } = req.query;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    const hintsCount = Math.min(parseInt(count as string) || 3, 10); // 最大10個まで

    logger.info('💭 暗示的ヒント取得', { sessionId, milestoneId, hintsCount });

    const service = getPlayerExperienceService();

    let hints: string[] = [];

    if (milestoneId && typeof milestoneId === 'string') {
      // 特定マイルストーンのヒント
      hints = await service.generateSubtleHints(0, milestoneId);
    } else {
      // セッション全体のヒント
      const maskedProgress = await service.getMaskedProgressInfo(sessionId);
      hints = maskedProgress.ambiguousHints;
    }

    // 要求数に制限
    const limitedHints = hints.slice(0, hintsCount);

    logger.info('✅ 暗示的ヒント取得完了', { 
      sessionId,
      milestoneId,
      totalHints: hints.length,
      returnedHints: limitedHints.length
    });

    res.json({
      success: true,
      data: {
        sessionId,
        milestoneId,
        hints: limitedHints,
        totalCount: hints.length,
        returnedCount: limitedHints.length
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
 * POST /api/player-experience/generate-natural-guidance
 * 自然な誘導メッセージ生成
 */
router.post('/generate-natural-guidance', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      sessionId, 
      campaignId, 
      themeId, 
      currentLocationId, 
      playerQuery,
      sessionDuration 
    } = req.body;

    if (!sessionId || !campaignId || !themeId || !currentLocationId) {
      throw new ValidationError('Required fields missing', {
        missingFields: ['sessionId', 'campaignId', 'themeId', 'currentLocationId'].filter(field => !req.body[field])
      });
    }

    logger.info('🧭 自然な誘導メッセージ生成', { 
      sessionId, 
      campaignId, 
      themeId, 
      currentLocationId,
      hasPlayerQuery: !!playerQuery
    });

    const sessionContext: SessionContext = {
      sessionId,
      campaignId,
      themeId,
      currentLocationId,
      playerActions: req.body.playerActions || [],
      discoveredEntities: req.body.discoveredEntities || [],
      sessionDuration: sessionDuration || { duration: 70, unit: 'minutes' }
    };

    const service = getPlayerExperienceService();
    const guidanceMessage: string = await service.generateNaturalGuidance(sessionContext);

    logger.info('✅ 自然な誘導メッセージ生成完了', { 
      sessionId,
      messageLength: guidanceMessage.length
    });

    res.json({
      success: true,
      data: {
        sessionId,
        currentLocationId,
        guidanceMessage,
        generatedAt: new Date().toISOString(),
        sessionContext: {
          themeId,
          explorationState: 'active'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ 自然な誘導メッセージ生成エラー', { error });
    
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
      error: 'Failed to generate natural guidance',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/player-experience/filter-content
 * プレイヤー表示コンテンツフィルタリング
 */
router.post('/filter-content', async (req: Request, res: Response): Promise<void> => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'object') {
      throw new ValidationError('Content object is required');
    }

    logger.info('🔍 プレイヤー表示コンテンツフィルタリング', { 
      contentKeys: Object.keys(content) 
    });

    const service = getPlayerExperienceService();
    const filteredContent = await service.filterPlayerVisibleContent(content);

    logger.info('✅ プレイヤー表示コンテンツフィルタリング完了', { 
      originalKeys: Object.keys(content).length,
      filteredKeys: Object.keys(filteredContent).length
    });

    res.json({
      success: true,
      data: {
        filteredContent,
        originalFieldCount: Object.keys(content).length,
        filteredFieldCount: Object.keys(filteredContent).length,
        filteredAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ プレイヤー表示コンテンツフィルタリングエラー', { error });
    
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
      error: 'Failed to filter player visible content',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/player-experience/create-reward-message
 * 曖昧な報酬メッセージ作成
 */
router.post('/create-reward-message', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reward } = req.body;

    if (!reward || typeof reward !== 'object') {
      throw new ValidationError('Reward object is required');
    }

    logger.info('🎁 曖昧な報酬メッセージ作成', { 
      hasItems: !!reward.items,
      hasInformation: !!reward.information,
      hasExperience: !!reward.experiencePoints
    });

    const service = getPlayerExperienceService();
    const rewardMessage: string = await service.createAmbiguousRewardMessage(reward);

    logger.info('✅ 曖昧な報酬メッセージ作成完了', { 
      messageLength: rewardMessage.length
    });

    res.json({
      success: true,
      data: {
        rewardMessage,
        originalReward: {
          hasItems: !!reward.items,
          hasInformation: !!reward.information,
          hasExperience: !!reward.experiencePoints
        },
        createdAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ 曖昧な報酬メッセージ作成エラー', { error });
    
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
      error: 'Failed to create ambiguous reward message',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/player-experience/health
 * ヘルスチェック
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Player Experience',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;