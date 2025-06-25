import { Router, Request, Response } from 'express';
import { LocationEntityMapping } from '@ai-agent-trpg/types';
import { 
  getLocationEntityMappingService, 
  EntityReference, 
  ExplorationResult 
} from '../services/locationEntityMappingService';
import { logger } from '../utils/logger';
import { ValidationError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/location-entity-mapping/location/:locationId/entities
 * 特定場所のエンティティ一覧取得
 */
router.get('/location/:locationId/entities', async (req: Request, res: Response): Promise<void> => {
  try {
    const { locationId } = req.params;
    const { sessionId } = req.query;

    if (!locationId) {
      throw new ValidationError('Location ID is required');
    }

    if (!sessionId || typeof sessionId !== 'string') {
      throw new ValidationError('Session ID is required as query parameter');
    }

    logger.info('📍 場所エンティティ一覧取得', { locationId, sessionId });

    const service = getLocationEntityMappingService();
    const availableEntities: EntityReference[] = await service.getAvailableEntitiesForLocation(locationId, sessionId);

    logger.info('✅ 場所エンティティ一覧取得完了', { 
      locationId,
      sessionId,
      entitiesCount: availableEntities.length
    });

    res.json({
      success: true,
      data: {
        locationId,
        sessionId,
        entities: availableEntities,
        totalCount: availableEntities.length,
        availableCount: availableEntities.filter(e => e.isAvailable).length,
        discoveredCount: availableEntities.filter(e => e.discoveredAt).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ 場所エンティティ一覧取得エラー', { error });
    
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
      error: 'Failed to get entities for location',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/location-entity-mapping/create-mappings
 * 場所エンティティマッピング一括作成
 */
router.post('/create-mappings', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, mappings } = req.body;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    if (!Array.isArray(mappings) || mappings.length === 0) {
      throw new ValidationError('Mappings array is required and must not be empty');
    }

    // マッピングデータの基本バリデーション
    for (const mapping of mappings) {
      if (!mapping.locationId || !mapping.entityId || !mapping.entityType || !mapping.entityCategory) {
        throw new ValidationError('Each mapping must have locationId, entityId, entityType, and entityCategory');
      }

      if (!['core', 'bonus'].includes(mapping.entityType)) {
        throw new ValidationError('entityType must be either "core" or "bonus"');
      }

      if (!['enemy', 'event', 'npc', 'item', 'quest', 'practical', 'trophy', 'mystery'].includes(mapping.entityCategory)) {
        throw new ValidationError('Invalid entityCategory');
      }
    }

    logger.info('📍 場所エンティティマッピング一括作成', { 
      sessionId, 
      mappingsCount: mappings.length 
    });

    const service = getLocationEntityMappingService();
    await service.createMappings(sessionId, mappings);

    logger.info('✅ 場所エンティティマッピング一括作成完了', { 
      sessionId,
      createdCount: mappings.length
    });

    res.json({
      success: true,
      message: 'Location entity mappings created successfully',
      data: {
        sessionId,
        createdCount: mappings.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ 場所エンティティマッピング一括作成エラー', { error });
    
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
      error: 'Failed to create location entity mappings',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/location-entity-mapping/:mappingId/availability
 * マッピング利用可能性更新
 */
router.patch('/:mappingId/availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mappingId } = req.params;
    const { isAvailable } = req.body;

    if (!mappingId) {
      throw new ValidationError('Mapping ID is required');
    }

    if (typeof isAvailable !== 'boolean') {
      throw new ValidationError('isAvailable must be a boolean value');
    }

    logger.info('🔄 マッピング利用可能性更新', { mappingId, isAvailable });

    const service = getLocationEntityMappingService();
    await service.updateAvailability(mappingId, isAvailable);

    logger.info('✅ マッピング利用可能性更新完了', { 
      mappingId,
      newAvailability: isAvailable
    });

    res.json({
      success: true,
      message: 'Mapping availability updated successfully',
      data: {
        mappingId,
        isAvailable,
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ マッピング利用可能性更新エラー', { error });
    
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
      error: 'Failed to update mapping availability',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/location-entity-mapping/:mappingId/discover
 * エンティティ発見マーク
 */
router.patch('/:mappingId/discover', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mappingId } = req.params;

    if (!mappingId) {
      throw new ValidationError('Mapping ID is required');
    }

    logger.info('🔍 エンティティ発見マーク', { mappingId });

    const service = getLocationEntityMappingService();
    await service.markDiscovered(mappingId);

    logger.info('✅ エンティティ発見マーク完了', { 
      mappingId,
      discoveredAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Entity marked as discovered successfully',
      data: {
        mappingId,
        discoveredAt: new Date().toISOString()
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
 * GET /api/location-entity-mapping/session/:sessionId/all-mappings
 * セッションの全マッピング取得
 */
router.get('/session/:sessionId/all-mappings', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { locationId, entityType, isAvailable } = req.query;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    logger.info('📋 セッション全マッピング取得', { 
      sessionId, 
      locationId,
      entityType,
      isAvailable 
    });

    // TODO: フィルタリング機能の実装
    // 現在は簡易実装として、特定場所のマッピングのみ対応
    if (locationId && typeof locationId === 'string') {
      const service = getLocationEntityMappingService();
      const mappings: LocationEntityMapping[] = await service.getMappingsByLocation(locationId, sessionId);

      // 追加フィルタリング
      let filteredMappings = mappings;

      if (entityType && typeof entityType === 'string') {
        filteredMappings = filteredMappings.filter(m => m.entityType === entityType);
      }

      if (isAvailable !== undefined) {
        const availabilityFilter = isAvailable === 'true';
        filteredMappings = filteredMappings.filter(m => m.isAvailable === availabilityFilter);
      }

      logger.info('✅ セッション全マッピング取得完了', { 
        sessionId,
        totalMappings: mappings.length,
        filteredMappings: filteredMappings.length
      });

      res.json({
        success: true,
        data: {
          sessionId,
          locationId,
          mappings: filteredMappings,
          totalCount: mappings.length,
          filteredCount: filteredMappings.length
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 場所指定なしの場合は空配列を返す（簡易実装）
    logger.info('✅ セッション全マッピング取得完了（場所指定なし）', { sessionId });

    res.json({
      success: true,
      data: {
        sessionId,
        mappings: [],
        totalCount: 0,
        filteredCount: 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ セッション全マッピング取得エラー', { error });
    
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
      error: 'Failed to get session mappings',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/location-entity-mapping/session/:sessionId/update-dynamic-availability
 * セッションの動的利用可能性一括更新
 */
router.put('/session/:sessionId/update-dynamic-availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    logger.info('🔄 動的利用可能性一括更新', { sessionId });

    const service = getLocationEntityMappingService();
    await service.updateDynamicAvailability(sessionId);

    logger.info('✅ 動的利用可能性一括更新完了', { sessionId });

    res.json({
      success: true,
      message: 'Dynamic availability updated successfully',
      data: {
        sessionId,
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ 動的利用可能性一括更新エラー', { error });
    
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
      error: 'Failed to update dynamic availability',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/location-entity-mapping/location/:locationId/explore
 * 場所探索アクション - 「探索している感」の核心機能
 */
router.post('/location/:locationId/explore', async (req: Request, res: Response): Promise<void> => {
  try {
    const { locationId } = req.params;
    const { 
      characterId, 
      sessionId, 
      explorationIntensity = 'thorough' 
    } = req.body;

    // バリデーション
    if (!locationId) {
      throw new ValidationError('Location ID is required');
    }

    if (!characterId || !sessionId) {
      throw new ValidationError('Character ID and Session ID are required', {
        missingFields: ['characterId', 'sessionId'].filter(field => !req.body[field])
      });
    }

    const validIntensities = ['light', 'thorough', 'exhaustive'];
    if (!validIntensities.includes(explorationIntensity)) {
      throw new ValidationError('Invalid exploration intensity', {
        validValues: validIntensities,
        provided: explorationIntensity
      });
    }

    logger.info('🔍 場所探索アクション開始', { 
      locationId, 
      characterId, 
      sessionId,
      explorationIntensity 
    });

    const service = getLocationEntityMappingService();
    const explorationResult: ExplorationResult = await service.exploreLocation(
      locationId,
      characterId, 
      sessionId,
      explorationIntensity as 'light' | 'thorough' | 'exhaustive'
    );

    logger.info('✅ 場所探索完了', { 
      locationId,
      discoveredCount: explorationResult.discoveredEntities.length,
      totalExplorationLevel: explorationResult.totalExplorationLevel,
      timeSpent: explorationResult.timeSpent,
      isFullyExplored: explorationResult.isFullyExplored
    });

    res.json({
      success: true,
      data: explorationResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ 場所探索エラー', { 
      locationId: req.params.locationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

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
      error: 'Failed to explore location',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/location-entity-mapping/location/:locationId/exploration-status
 * 場所の探索状況取得
 */
router.get('/location/:locationId/exploration-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { locationId } = req.params;
    const { sessionId } = req.query;

    if (!locationId) {
      throw new ValidationError('Location ID is required');
    }

    if (!sessionId || typeof sessionId !== 'string') {
      throw new ValidationError('Session ID is required as query parameter');
    }

    logger.info('📊 場所探索状況取得', { locationId, sessionId });

    const service = getLocationEntityMappingService();
    
    // 利用可能エンティティ取得
    const allEntities = await service.getAvailableEntitiesForLocation(locationId, sessionId);
    const discoveredEntities = allEntities.filter(e => e.discoveredAt);
    const hiddenEntities = allEntities.filter(e => !e.discoveredAt);
    
    // Phase 1実装：簡易探索レベル計算
    const explorationLevel = allEntities.length > 0 
      ? Math.round((discoveredEntities.length / allEntities.length) * 100)
      : 100;

    const explorationStatus = {
      locationId,
      sessionId,
      explorationLevel,
      isFullyExplored: explorationLevel >= 100 && hiddenEntities.length === 0,
      totalEntities: allEntities.length,
      discoveredEntities: discoveredEntities.length,
      hiddenEntities: hiddenEntities.length,
      discoveredEntityList: discoveredEntities.map(e => ({
        id: e.id,
        name: e.name,
        category: e.category,
        discoveredAt: e.discoveredAt
      })),
      explorationHints: hiddenEntities.length > 0 
        ? ['まだ隠されたものがありそうです。'] 
        : ['この場所は完全に探索されました。']
    };

    logger.info('✅ 場所探索状況取得完了', { 
      locationId,
      explorationLevel,
      discoveredCount: discoveredEntities.length,
      hiddenCount: hiddenEntities.length
    });

    res.json({
      success: true,
      data: explorationStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ 場所探索状況取得エラー', { error });

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
      error: 'Failed to get exploration status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/location-entity-mapping/health
 * ヘルスチェック
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Location Entity Mapping',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;