/**
 * AI Entity Management API Routes
 * AI エンティティ管理システムのAPIエンドポイント
 */

import { Router, Request, Response } from 'express';
import { 
  aiEntityEngine,
  AIQueryOptions,
  EntityProcessingResult,
  BatchProcessingResult
} from '../services/ai-entity-engine';
import { 
  AIQueryFilter,
  AIGameContext,
  EntityRelationship 
} from '../../../../packages/types/src/index';

const router = Router();

/**
 * エンティティ条件評価
 * POST /api/ai-entity/evaluate
 */
router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const { entityId, conditions, gameContext } = req.body;

    if (!entityId || !conditions || !gameContext) {
      return res.status(400).json({
        error: 'Missing required fields: entityId, conditions, gameContext'
      });
    }

    const result: EntityProcessingResult = await aiEntityEngine.evaluateEntity(
      entityId,
      conditions,
      gameContext
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Entity evaluation error:', error);
    return res.status(500).json({
      error: 'Entity evaluation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * バッチエンティティ評価
 * POST /api/ai-entity/batch-evaluate
 */
router.post('/batch-evaluate', async (req, res) => {
  try {
    const { entityConditions, gameContext } = req.body;

    if (!entityConditions || !gameContext) {
      return res.status(400).json({
        error: 'Missing required fields: entityConditions, gameContext'
      });
    }

    const result: BatchProcessingResult = await aiEntityEngine.batchProcessEntities(
      entityConditions,
      gameContext
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Batch evaluation error:', error);
    return res.status(500).json({
      error: 'Batch evaluation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * エンティティクエリ実行
 * POST /api/ai-entity/query
 */
router.post('/query', async (req, res) => {
  try {
    const { filter, gameContext, options = {} } = req.body;

    if (!filter || !gameContext) {
      return res.status(400).json({
        error: 'Missing required fields: filter, gameContext'
      });
    }

    const result = await aiEntityEngine.queryEntities(
      filter as AIQueryFilter,
      gameContext as AIGameContext,
      options as AIQueryOptions
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Entity query error:', error);
    return res.status(500).json({
      error: 'Entity query failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * AI推奨エンティティ取得
 * POST /api/ai-entity/recommend
 */
router.post('/recommend', async (req, res) => {
  try {
    const { entityType, gameContext, maxRecommendations = 5 } = req.body;

    if (!entityType || !gameContext) {
      return res.status(400).json({
        error: 'Missing required fields: entityType, gameContext'
      });
    }

    const result = await aiEntityEngine.getRecommendedEntities(
      entityType,
      gameContext,
      maxRecommendations
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Entity recommendation error:', error);
    return res.status(500).json({
      error: 'Entity recommendation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * エンティティ利用可能性チェック
 * POST /api/ai-entity/check-availability
 */
router.post('/check-availability', async (req, res) => {
  try {
    const { entityId, conditions, gameContext } = req.body;

    if (!entityId || !conditions || !gameContext) {
      return res.status(400).json({
        error: 'Missing required fields: entityId, conditions, gameContext'
      });
    }

    const result = await aiEntityEngine.checkEntityAvailability(
      entityId,
      conditions,
      gameContext
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Availability check error:', error);
    return res.status(500).json({
      error: 'Availability check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * エンティティ関係性分析
 * GET /api/ai-entity/relationships/:entityId
 */
router.get('/relationships/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;

    if (!entityId) {
      return res.status(400).json({
        error: 'Entity ID is required'
      });
    }

    const result = aiEntityEngine.analyzeEntityRelationships(entityId);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Relationship analysis error:', error);
    return res.status(500).json({
      error: 'Relationship analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * エンティティ間パス検索
 * GET /api/ai-entity/path/:fromId/:toId
 */
router.get('/path/:fromId/:toId', async (req, res) => {
  try {
    const { fromId, toId } = req.params;
    const { maxHops = 5 } = req.query;

    if (!fromId || !toId) {
      return res.status(400).json({
        error: 'Both fromId and toId are required'
      });
    }

    const result = aiEntityEngine.findEntityPath(
      fromId,
      toId,
      parseInt(maxHops as string) || 5
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Path finding error:', error);
    return res.status(500).json({
      error: 'Path finding failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 関係性追加
 * POST /api/ai-entity/relationships
 */
router.post('/relationships', async (req, res) => {
  try {
    const relationship = req.body as EntityRelationship;

    if (!relationship.sourceId || !relationship.targetId || !relationship.type) {
      return res.status(400).json({
        error: 'Missing required fields: sourceId, targetId, type'
      });
    }

    aiEntityEngine.addEntityRelationship(relationship);

    return res.json({
      success: true,
      message: 'Relationship added successfully'
    });
  } catch (error) {
    console.error('Add relationship error:', error);
    return res.status(500).json({
      error: 'Failed to add relationship',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 関係性削除
 * DELETE /api/ai-entity/relationships/:sourceId/:targetId
 */
router.delete('/relationships/:sourceId/:targetId', async (req, res) => {
  try {
    const { sourceId, targetId } = req.params;
    const { relationshipType } = req.query;

    if (!sourceId || !targetId) {
      return res.status(400).json({
        error: 'Both sourceId and targetId are required'
      });
    }

    const removed = aiEntityEngine.removeEntityRelationship(
      sourceId,
      targetId,
      relationshipType as string
    );

    return res.json({
      success: true,
      data: { removed }
    });
  } catch (error) {
    console.error('Remove relationship error:', error);
    return res.status(500).json({
      error: 'Failed to remove relationship',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * エンティティグループ検出
 * GET /api/ai-entity/groups
 */
router.get('/groups', async (req, res) => {
  try {
    const { minStrength = 0.7 } = req.query;

    const result = aiEntityEngine.findEntityGroups(
      parseFloat(minStrength as string) || 0.7
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Group detection error:', error);
    return res.status(500).json({
      error: 'Group detection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * グラフメトリクス取得
 * GET /api/ai-entity/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const result = aiEntityEngine.getGraphMetrics();

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return res.status(500).json({
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * エンジン統計情報取得
 * GET /api/ai-entity/statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const result = aiEntityEngine.getEngineStatistics();

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Statistics error:', error);
    return res.status(500).json({
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * キャッシュクリア
 * POST /api/ai-entity/clear-cache
 */
router.post('/clear-cache', async (req, res) => {
  try {
    aiEntityEngine.clearCaches();

    return res.json({
      success: true,
      message: 'Caches cleared successfully'
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    return res.status(500).json({
      error: 'Failed to clear caches',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * ヘルスチェック
 * GET /api/ai-entity/health
 */
router.get('/health', async (req, res) => {
  try {
    const statistics = aiEntityEngine.getEngineStatistics();
    
    return res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      data: statistics
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;