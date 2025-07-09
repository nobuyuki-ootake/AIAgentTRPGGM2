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

// ==========================================
// フロントエンドが要求するエンドポイント実装
// ==========================================

// エンティティクエリ実行
router.post('/query', async (req: Request, res: Response): Promise<void> => {
  logger.info('🔍 AI Entity query requested');
  
  try {
    const { filter, gameContext, options } = req.body;
    
    if (!filter || !gameContext) {
      res.status(400).json({
        success: false,
        error: 'Filter and gameContext are required'
      });
      return;
    }

    // 現在は仮実装として空の結果を返す
    const entities = [
      {
        entityId: 'item-001' as ID,
        entityType: 'item' as const,
        relevanceScore: 0.9,
        availability: true,
        metadata: { name: 'Magic Sword', rarity: 'rare' }
      },
      {
        entityId: 'quest-001' as ID,
        entityType: 'quest' as const,
        relevanceScore: 0.8,
        availability: true,
        metadata: { name: 'Rescue Mission', difficulty: 'medium' }
      }
    ];

    const result = {
      entities,
      pagination: {
        total: entities.length,
        limit: options?.limit || 20,
        offset: options?.offset || 0,
        hasMore: false
      }
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('AI Entity query error:', error);
    res.status(500).json({
      success: false,
      error: 'Entity query failed'
    });
  }
});

// AI推奨エンティティ取得
router.post('/recommend', async (req: Request, res: Response): Promise<void> => {
  logger.info('🎯 AI Entity recommendations requested');
  
  try {
    const { entityType, gameContext, maxRecommendations } = req.body;
    
    if (!entityType || !gameContext) {
      res.status(400).json({
        success: false,
        error: 'EntityType and gameContext are required'
      });
      return;
    }

    // 現在は仮実装として事前定義された推奨を返す
    const recommendations = [
      {
        entityId: `${entityType}-rec-001` as ID,
        entityType,
        relevanceScore: 0.95,
        reasoning: `Highly relevant ${entityType} for current game context`,
        expectedImpact: {
          story: 0.8,
          character: 0.7,
          gameplay: 0.9
        },
        suggestedTiming: 'immediate' as const
      },
      {
        entityId: `${entityType}-rec-002` as ID,
        entityType,
        relevanceScore: 0.85,
        reasoning: `Good secondary ${entityType} option`,
        expectedImpact: {
          story: 0.6,
          character: 0.8,
          gameplay: 0.7
        },
        suggestedTiming: 'short_term' as const
      }
    ].slice(0, maxRecommendations || 5);

    const result = {
      recommendations
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('AI Entity recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Entity recommendations failed'
    });
  }
});

// エンジン統計情報取得
router.get('/statistics', async (_req: Request, res: Response): Promise<void> => {
  logger.info('📊 AI Entity engine statistics requested');
  
  try {
    // 現在は仮実装として静的な統計を返す
    const statistics = {
      totalEntities: 150,
      entitiesByType: {
        item: 45,
        quest: 30,
        event: 25,
        npc: 35,
        enemy: 15
      },
      totalRelationships: 89,
      relationshipsByType: {
        dependency: 25,
        conflict: 15,
        synergy: 20,
        sequence: 18,
        alternative: 11
      },
      avgRelationshipsPerEntity: 2.4,
      cacheHitRate: 0.78,
      lastProcessingTime: 450,
      memoryUsage: {
        entities: 2.1,
        relationships: 1.5,
        cache: 0.8
      }
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('AI Entity statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Statistics retrieval failed'
    });
  }
});

// エンティティ評価
router.post('/evaluate', async (req: Request, res: Response): Promise<void> => {
  logger.info('⚖️ AI Entity evaluation requested');
  
  try {
    const { entityId, conditions, gameContext } = req.body;
    
    if (!entityId || !conditions || !gameContext) {
      res.status(400).json({
        success: false,
        error: 'EntityId, conditions, and gameContext are required'
      });
      return;
    }

    // 現在は仮実装として評価結果を返す
    const result = {
      entityId,
      available: true,
      conditionResults: conditions.map((condition: any, index: number) => ({
        condition,
        satisfied: index % 2 === 0, // 交互に満足/不満足
        reason: `Condition ${index + 1} evaluation result`
      })),
      effects: [
        {
          type: 'story_progression',
          description: 'Advances main storyline',
          value: 0.7
        }
      ],
      learningData: {
        accuracy: 0.85,
        confidence: 0.9,
        adaptationSuggestions: ['Consider player preferences', 'Adjust difficulty based on context']
      }
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('AI Entity evaluation error:', error);
    res.status(500).json({
      success: false,
      error: 'Entity evaluation failed'
    });
  }
});

// エンティティ可用性チェック
router.post('/check-availability', async (req: Request, res: Response): Promise<void> => {
  logger.info('✅ AI Entity availability check requested');
  
  try {
    const { entityId, conditions, gameContext } = req.body;
    
    if (!entityId || !conditions || !gameContext) {
      res.status(400).json({
        success: false,
        error: 'EntityId, conditions, and gameContext are required'
      });
      return;
    }

    // 現在は仮実装として可用性結果を返す
    const result = {
      entityId,
      available: true,
      availability: 0.9,
      blockedByConditions: [],
      availableAt: null,
      recommendations: ['Entity is ready for immediate use']
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('AI Entity availability check error:', error);
    res.status(500).json({
      success: false,
      error: 'Availability check failed'
    });
  }
});

export default router;