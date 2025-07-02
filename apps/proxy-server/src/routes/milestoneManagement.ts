import express from 'express';
import { MilestoneManagementService } from '../services/milestoneManagementService';
import { logger } from '../utils/logger';

const router = express.Router();
const milestoneManagementService = MilestoneManagementService.getInstance();

/**
 * マイルストーン進捗情報を取得
 * POST /api/milestone-management/progress
 */
router.post('/progress', async (req, res) => {
  try {
    const { sessionId, milestoneId } = req.body;

    if (!sessionId || !milestoneId) {
      return res.status(400).json({
        error: 'sessionId and milestoneId are required',
      });
    }

    logger.info(`API: Getting milestone progress for session ${sessionId}, milestone ${milestoneId}`);

    const progressInfo = await milestoneManagementService.getMilestoneProgress(sessionId, milestoneId);

    res.json(progressInfo);

  } catch (error) {
    logger.error('Error in /milestone-management/progress:', error);
    res.status(500).json({
      error: 'Failed to get milestone progress',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * マイルストーンを手動で完了
 * POST /api/milestone-management/complete
 */
router.post('/complete', async (req, res) => {
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

    res.json(result);

  } catch (error) {
    logger.error('Error in /milestone-management/complete:', error);
    res.status(500).json({
      error: 'Failed to complete milestone manually',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GMナラティブアナウンスを投稿
 * POST /api/milestone-management/gm-announcement
 */
router.post('/gm-announcement', async (req, res) => {
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

    res.json(result);

  } catch (error) {
    logger.error('Error in /milestone-management/gm-announcement:', error);
    res.status(500).json({
      error: 'Failed to post GM narrative announcement',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * シナリオ進行をトリガー
 * POST /api/milestone-management/scenario-progression
 */
router.post('/scenario-progression', async (req, res) => {
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

    res.json(result);

  } catch (error) {
    logger.error('Error in /milestone-management/scenario-progression:', error);
    res.status(500).json({
      error: 'Failed to trigger scenario progression',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * デバッグ用: セッションのマイルストーン一覧取得
 * GET /api/milestone-management/session/:sessionId/milestones
 */
router.get('/session/:sessionId/milestones', async (req, res) => {
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

    res.json({
      sessionId,
      milestones,
      count: milestones.length,
    });

  } catch (error) {
    logger.error('Error in /milestone-management/session/:sessionId/milestones:', error);
    res.status(500).json({
      error: 'Failed to get session milestones',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * ヘルスチェック
 * GET /api/milestone-management/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'milestone-management',
    timestamp: new Date().toISOString(),
  });
});

export default router;