import { Router } from 'express';
import { MilestoneManagementService } from '../services/milestoneManagementService';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const milestoneManagementService = MilestoneManagementService.getInstance();

/**
 * マイルストーン進捗情報を取得
 * POST /api/milestone-management/progress
 */
router.post('/progress', asyncHandler(async (req, res) => {
  try {
    const { sessionId, milestoneId } = req.body;

    if (!sessionId || !milestoneId) {
      return res.status(400).json({
        error: 'sessionId and milestoneId are required',
      });
    }

    logger.info(`API: Getting milestone progress for session ${sessionId}, milestone ${milestoneId}`);

    const progressInfo = await milestoneManagementService.getMilestoneProgress(sessionId, milestoneId);

    return res.json(progressInfo);

  } catch (error) {
    logger.error('Error in /milestone-management/progress:', error);
    return res.status(500).json({
      error: 'Failed to get milestone progress',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * マイルストーンを手動で完了
 * POST /api/milestone-management/complete
 */
router.post('/complete', asyncHandler(async (req, res) => {
  try {
    const { sessionId, milestoneId, skipValidation, narrativeMessage, gmNote } = req.body;

    if (!sessionId || !milestoneId) {
      return res.status(400).json({
        error: 'sessionId and milestoneId are required',
      });
    }

    logger.info(`API: Manually completing milestone ${milestoneId} for session ${sessionId}`);

    const result = await milestoneManagementService.completeMilestoneManually(sessionId, milestoneId, {
      skipValidation: skipValidation || false,
      narrativeMessage,
      gmNote,
    });

    return res.json(result);

  } catch (error) {
    logger.error('Error in /milestone-management/complete:', error);
    return res.status(500).json({
      error: 'Failed to complete milestone manually',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * GMナラティブアナウンスを投稿
 * POST /api/milestone-management/gm-announcement
 */
router.post('/gm-announcement', asyncHandler(async (req, res) => {
  try {
    const { sessionId, title, message, type, priority, relatedMilestoneId } = req.body;

    if (!sessionId || !title || !message) {
      return res.status(400).json({
        error: 'sessionId, title, and message are required',
      });
    }

    // 型とプライオリティのバリデーション
    const validTypes = ['milestone_completion', 'scenario_progression', 'custom'];
    const validPriorities = ['low', 'medium', 'high'];

    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
      });
    }

    logger.info(`API: Posting GM narrative announcement for session ${sessionId}: ${title}`);

    const result = await milestoneManagementService.postGMNarrativeAnnouncement(sessionId, {
      title,
      message,
      type: type || 'custom',
      priority: priority || 'medium',
      relatedMilestoneId,
    });

    return res.json(result);

  } catch (error) {
    logger.error('Error in /milestone-management/gm-announcement:', error);
    return res.status(500).json({
      error: 'Failed to post GM narrative announcement',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * シナリオ進行をトリガー
 * POST /api/milestone-management/scenario-progression
 */
router.post('/scenario-progression', asyncHandler(async (req, res) => {
  try {
    const { sessionId, progressionType, milestoneId, customMessage, unlockEntities } = req.body;

    if (!sessionId || !progressionType) {
      return res.status(400).json({
        error: 'sessionId and progressionType are required',
      });
    }

    // progressionTypeのバリデーション
    const validProgressionTypes = ['milestone_based', 'manual', 'time_based'];
    if (!validProgressionTypes.includes(progressionType)) {
      return res.status(400).json({
        error: `Invalid progressionType. Must be one of: ${validProgressionTypes.join(', ')}`,
      });
    }

    logger.info(`API: Triggering scenario progression for session ${sessionId}, type: ${progressionType}`);

    const result = await milestoneManagementService.triggerScenarioProgression(sessionId, {
      progressionType,
      milestoneId,
      customMessage,
      unlockEntities,
    });

    return res.json(result);

  } catch (error) {
    logger.error('Error in /milestone-management/scenario-progression:', error);
    return res.status(500).json({
      error: 'Failed to trigger scenario progression',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * デバッグ用: セッションのマイルストーン一覧取得
 * GET /api/milestone-management/session/:sessionId/milestones
 */
router.get('/session/:sessionId/milestones', asyncHandler(async (req, res) => {
  try {
    const { sessionId } = req.params;

    logger.info(`API: Getting milestones for session ${sessionId}`);

    // 簡易的なマイルストーン一覧取得（デバッグ用）
    // 実際の実装では適切なサービスを使用
    const milestones = [
      {
        id: 'milestone-1',
        title: 'サンプルマイルストーン1',
        description: 'これはテスト用のマイルストーンです',
        status: 'in_progress',
        sessionId,
      },
      {
        id: 'milestone-2',
        title: 'サンプルマイルストーン2',
        description: 'これは別のテスト用マイルストーンです',
        status: 'completed',
        sessionId,
      },
    ];

    return res.json({
      sessionId,
      milestones,
      count: milestones.length,
    });

  } catch (error) {
    logger.error('Error in /milestone-management/session/:sessionId/milestones:', error);
    return res.status(500).json({
      error: 'Failed to get session milestones',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * ヘルスチェック
 * GET /api/milestone-management/health
 */
router.get('/health', asyncHandler(async (_req, res) => {
  return res.json({
    status: 'ok',
    service: 'milestone-management',
    timestamp: new Date().toISOString(),
  });
}));

export default router;