import { Router, Request, Response } from 'express';
import { getMilestoneService } from '../services/milestoneService';
import { Milestone } from '@ai-agent-trpg/types';

const router = Router();

/**
 * @route GET /api/milestones/campaign/:campaignId
 * @desc キャンペーンのマイルストーン一覧を取得
 */
router.get('/campaign/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      res.status(400).json({
        error: 'Campaign ID is required'
      });
      return;
    }

    const milestones = await getMilestoneService().getMilestonesByCampaign(campaignId);
    
    res.json({
      success: true,
      data: milestones
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({
      error: 'Failed to fetch milestones',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * @route GET /api/milestones/:milestoneId
 * @desc 特定のマイルストーンを取得
 */
router.get('/:milestoneId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { milestoneId } = req.params;
    
    if (!milestoneId) {
      res.status(400).json({
        error: 'Milestone ID is required'
      });
      return;
    }

    const milestone = await getMilestoneService().getMilestoneById(milestoneId);
    
    if (!milestone) {
      res.status(404).json({
        error: 'Milestone not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: milestone
    });
  } catch (error) {
    console.error('Error fetching milestone:', error);
    res.status(500).json({
      error: 'Failed to fetch milestone',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * @route POST /api/milestones
 * @desc 新しいマイルストーンを作成
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const milestoneData: Partial<Milestone> = req.body;
    
    if (!milestoneData.campaignId) {
      res.status(400).json({
        error: 'Campaign ID is required'
      });
      return;
    }

    if (!('title' in milestoneData) || !milestoneData.title || !('description' in milestoneData) || !milestoneData.description) {
      res.status(400).json({
        error: 'Title and description are required'
      });
      return;
    }

    const milestone = await getMilestoneService().createMilestone(milestoneData);
    
    res.status(201).json({
      success: true,
      data: milestone
    });
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({
      error: 'Failed to create milestone',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * @route PUT /api/milestones/:milestoneId
 * @desc マイルストーンを更新
 */
router.put('/:milestoneId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { milestoneId } = req.params;
    const updates: Partial<Milestone> = req.body;
    
    if (!milestoneId) {
      res.status(400).json({
        error: 'Milestone ID is required'
      });
      return;
    }

    const milestone = await getMilestoneService().updateMilestone(milestoneId, updates);
    
    res.json({
      success: true,
      data: milestone
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    
    if (error instanceof Error && error.message === 'Milestone not found') {
      res.status(404).json({
        error: 'Milestone not found'
      });
      return;
    } else {
      res.status(500).json({
        error: 'Failed to update milestone',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }
});

/**
 * @route DELETE /api/milestones/:milestoneId
 * @desc マイルストーンを削除
 */
router.delete('/:milestoneId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { milestoneId } = req.params;
    
    if (!milestoneId) {
      res.status(400).json({
        error: 'Milestone ID is required'
      });
      return;
    }

    await getMilestoneService().deleteMilestone(milestoneId);
    
    res.json({
      success: true,
      message: 'Milestone deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    
    if (error instanceof Error && error.message === 'Milestone not found') {
      res.status(404).json({
        error: 'Milestone not found'
      });
      return;
    } else {
      res.status(500).json({
        error: 'Failed to delete milestone',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }
});

/**
 * @route GET /api/milestones/progress/:campaignId
 * @desc キャンペーンの進捗トラッカーを取得
 */
router.get('/progress/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      res.status(400).json({
        error: 'Campaign ID is required'
      });
      return;
    }

    const progressTracker = await getMilestoneService().getProgressTracker(campaignId);
    
    res.json({
      success: true,
      data: progressTracker
    });
  } catch (error) {
    console.error('Error fetching progress tracker:', error);
    res.status(500).json({
      error: 'Failed to fetch progress tracker',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * @route GET /api/milestones/levelups/:campaignId
 * @desc キャンペーンのレベルアップイベントを取得
 */
router.get('/levelups/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      res.status(400).json({
        error: 'Campaign ID is required'
      });
      return;
    }

    const levelUpEvents = await getMilestoneService().getLevelUpEventsByCampaign(campaignId);
    
    res.json({
      success: true,
      data: levelUpEvents
    });
  } catch (error) {
    console.error('Error fetching level up events:', error);
    res.status(500).json({
      error: 'Failed to fetch level up events',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * @route GET /api/milestones/completion/:campaignId
 * @desc キャンペーンの完了状況を取得
 */
router.get('/completion/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      res.status(400).json({
        error: 'Campaign ID is required'
      });
      return;
    }

    const completion = await getMilestoneService().getCampaignCompletion(campaignId);
    
    res.json({
      success: true,
      data: completion
    });
  } catch (error) {
    console.error('Error fetching campaign completion:', error);
    res.status(500).json({
      error: 'Failed to fetch campaign completion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * @route POST /api/milestones/complete-campaign/:campaignId
 * @desc キャンペーンを完了させる
 */
router.post('/complete-campaign/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const { completionType, completionNotes } = req.body;
    
    if (!campaignId) {
      res.status(400).json({
        error: 'Campaign ID is required'
      });
      return;
    }

    if (!completionType || !['success', 'failure', 'abandoned'].includes(completionType)) {
      res.status(400).json({
        error: 'Valid completion type is required (success, failure, abandoned)'
      });
      return;
    }

    const completion = await getMilestoneService().completeCampaign(
      campaignId,
      completionType,
      completionNotes
    );
    
    res.status(201).json({
      success: true,
      data: completion
    });
  } catch (error) {
    console.error('Error completing campaign:', error);
    res.status(500).json({
      error: 'Failed to complete campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

export { router as milestoneRouter };