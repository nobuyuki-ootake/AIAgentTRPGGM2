import { Router, Request, Response } from 'express';
import { getTimeManagementService } from '../services/timeManagementService';
import { ID, SessionDurationConfig } from '@ai-agent-trpg/types';

const router = Router();

/**
 * @route POST /api/time-management/initialize
 * @desc セッションのターン状態を初期化
 */
router.post('/initialize', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, campaignId, config } = req.body as {
      sessionId: ID;
      campaignId: ID;
      config?: SessionDurationConfig;
    };
    
    if (!sessionId || !campaignId) {
      res.status(400).json({
        error: 'Session ID and Campaign ID are required'
      });
      return;
    }

    const turnState = await getTimeManagementService().initializeTurnState(sessionId, campaignId, config);
    
    res.status(201).json({
      success: true,
      data: turnState
    });
  } catch (error) {
    console.error('Error initializing turn state:', error);
    res.status(500).json({
      error: 'Failed to initialize turn state',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/time-management/session/:sessionId
 * @desc セッションのターン状態を取得
 */
router.get('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      res.status(400).json({
        error: 'Session ID is required'
      });
      return;
    }

    const turnState = await getTimeManagementService().getTurnState(sessionId);
    
    if (!turnState) {
      res.status(404).json({
        error: 'Turn state not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: turnState
    });
  } catch (error) {
    console.error('Error fetching turn state:', error);
    res.status(500).json({
      error: 'Failed to fetch turn state',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route PUT /api/time-management/session/:sessionId
 * @desc セッションのターン状態を更新
 */
router.put('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;
    
    if (!sessionId) {
      res.status(400).json({
        error: 'Session ID is required'
      });
      return;
    }

    const turnState = await getTimeManagementService().updateTurnState(sessionId, updates);
    
    res.json({
      success: true,
      data: turnState
    });
  } catch (error) {
    console.error('Error updating turn state:', error);
    
    if (error instanceof Error && error.message === 'Turn state not found') {
      res.status(404).json({
        error: 'Turn state not found'
      });
    } else {
      res.status(500).json({
        error: 'Failed to update turn state',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * @route GET /api/time-management/campaign/:campaignId/current-day
 * @desc キャンペーンの現在の日を取得
 */
router.get('/campaign/:campaignId/current-day', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      res.status(400).json({
        error: 'Campaign ID is required'
      });
      return;
    }

    const currentDay = await getTimeManagementService().getCurrentGameDay(campaignId);
    
    res.json({
      success: true,
      data: currentDay
    });
  } catch (error) {
    console.error('Error fetching current day:', error);
    res.status(500).json({
      error: 'Failed to fetch current day',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/time-management/campaign/:campaignId/day/:dayNumber
 * @desc 特定の日の情報を取得
 */
router.get('/campaign/:campaignId/day/:dayNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId, dayNumber } = req.params;
    
    if (!campaignId || !dayNumber) {
      res.status(400).json({
        error: 'Campaign ID and day number are required'
      });
      return;
    }

    const gameDay = await getTimeManagementService().getGameDay(campaignId, parseInt(dayNumber));
    
    if (!gameDay) {
      res.status(404).json({
        error: 'Game day not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: gameDay
    });
  } catch (error) {
    console.error('Error fetching game day:', error);
    res.status(500).json({
      error: 'Failed to fetch game day',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/time-management/campaign/:campaignId/action
 * @desc アクションを実行
 */
router.post('/campaign/:campaignId/action', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const { characterId, description, metadata } = req.body;
    
    if (!campaignId || !characterId || !description) {
      res.status(400).json({
        error: 'Campaign ID, character ID, and description are required'
      });
      return;
    }

    const result = await getTimeManagementService().executeAction(
      campaignId,
      characterId,
      description,
      metadata || {}
    );
    
    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Error executing action:', error);
    res.status(500).json({
      error: 'Failed to execute action',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/time-management/campaign/:campaignId/advance-time
 * @desc 時間を進行
 */
router.post('/campaign/:campaignId/advance-time', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      res.status(400).json({
        error: 'Campaign ID is required'
      });
      return;
    }

    const result = await getTimeManagementService().advanceTime(campaignId);
    
    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Error advancing time:', error);
    res.status(500).json({
      error: 'Failed to advance time',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/time-management/campaign/:campaignId/rest
 * @desc 休息を取る
 */
router.post('/campaign/:campaignId/rest', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      res.status(400).json({
        error: 'Campaign ID is required'
      });
      return;
    }

    const result = await getTimeManagementService().takeRest(campaignId);
    
    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Error taking rest:', error);
    res.status(500).json({
      error: 'Failed to take rest',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/time-management/campaign/:campaignId/status
 * @desc キャンペーンの時間管理状況を取得
 */
router.get('/campaign/:campaignId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      res.status(400).json({
        error: 'Campaign ID is required'
      });
      return;
    }

    const [turnState, currentDay, endCheck] = await Promise.all([
      getTimeManagementService().getTurnStateByCompaign(campaignId),
      getTimeManagementService().getCurrentGameDay(campaignId),
      getTimeManagementService().checkCampaignEnd(campaignId)
    ]);
    
    res.json({
      success: true,
      data: {
        turnState,
        currentDay,
        endCheck
      }
    });
  } catch (error) {
    console.error('Error fetching campaign status:', error);
    res.status(500).json({
      error: 'Failed to fetch campaign status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/time-management/campaign/:campaignId/create-day
 * @desc 新しい日を作成
 */
router.post('/campaign/:campaignId/create-day', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const { sessionId, dayNumber } = req.body;
    
    if (!campaignId) {
      res.status(400).json({
        error: 'Campaign ID is required'
      });
      return;
    }

    const gameDay = await getTimeManagementService().createGameDay(campaignId, sessionId, dayNumber);
    
    res.status(201).json({
      success: true,
      data: gameDay
    });
  } catch (error) {
    console.error('Error creating game day:', error);
    res.status(500).json({
      error: 'Failed to create game day',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as timeManagementRouter };