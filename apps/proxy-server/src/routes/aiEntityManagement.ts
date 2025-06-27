import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { 
  AIGameContext,
  AIConditionExpression,
  ID
} from '@ai-agent-trpg/types';
// Step 5: AI エンティティエンジンの型修正完了後、再インポート
import { aiEntityEngine } from '../services/ai-entity-engine';

const router = Router();

router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  logger.info('🏥 AI Entity Management health check requested');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'AI Entity Management Service is running'
  });
});

// Step 2: 型を使用する簡単なエンドポイントを追加
router.post('/test-types', async (req: Request, res: Response): Promise<void> => {
  logger.info('🧪 Testing AI Entity Management types');
  
  const gameContext: Partial<AIGameContext> = {
    sessionId: req.body.sessionId || 'test-session',
    campaignId: req.body.campaignId || 'test-campaign'
  };
  
  const condition: Partial<AIConditionExpression> = {
    type: 'simple',
    description: 'Test condition'
  };
  
  res.json({
    success: true,
    message: 'Types working correctly',
    data: {
      gameContext,
      condition,
      testId: 'test-' + Date.now() as ID
    }
  });
});

// Step 4: Express ルート型エラーテスト用エンドポイント
router.post('/validate-request', async (req: Request, res: Response): Promise<void> => {
  logger.info('✅ Testing Express route type handling');
  
  try {
    // リクエストボディからAIGameContext構造をテスト
    const requestData = req.body as {
      sessionId?: string;
      campaignId?: string;
      gameContext?: Partial<AIGameContext>;
    };
    
    const responseData = {
      success: true,
      message: 'Express route types working correctly',
      receivedData: {
        sessionId: requestData.sessionId,
        campaignId: requestData.campaignId,
        hasGameContext: !!requestData.gameContext
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(responseData);
  } catch (error) {
    logger.error('Request validation error:', error);
    res.status(400).json({
      success: false,
      error: 'Request validation failed'
    });
  }
});

// Step 6: AI エンティティエンジンを使用するエンドポイント
router.get('/engine-status', async (_req: Request, res: Response): Promise<void> => {
  logger.info('🔍 AI Entity Engine status check');
  
  try {
    // AI エンティティエンジンの状態を確認
    const engineInfo = {
      available: !!aiEntityEngine,
      timestamp: new Date().toISOString(),
      engineType: 'AIEntityEngine'
    };
    
    res.json({
      success: true,
      message: 'AI Entity Engine accessible after type fixes',
      data: engineInfo
    });
  } catch (error) {
    logger.error('AI Entity Engine error:', error);
    res.status(500).json({
      success: false,
      error: 'AI Entity Engine not accessible'
    });
  }
});

export default router;