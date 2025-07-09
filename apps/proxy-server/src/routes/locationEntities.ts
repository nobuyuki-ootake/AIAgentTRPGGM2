// ==========================================
// 場所別エンティティ管理API
// ==========================================

import { Router } from 'express';
import { locationEntityService } from '../services/locationEntityService';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import {
  GetLocationEntitiesDisplayRequest,
  UpdateEntityStatusRequest,
  RefreshLocationEntitiesRequest
} from '@ai-agent-trpg/types';

const router = Router();

// ==========================================
// 場所別エンティティ表示データ取得
// ==========================================

router.get('/display/:sessionId/:locationId', asyncHandler(async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const locationId = req.params.locationId;
    
    const request: GetLocationEntitiesDisplayRequest = {
      sessionId,
      locationId,
      includeHidden: req.query.includeHidden === 'true',
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any
    };

    // 必須フィールドの検証
    if (!sessionId || !locationId) {
      return res.status(400).json({
        success: false,
        locationEntities: [],
        locationStats: {
          totalEntities: 0,
          discoveredEntities: 0,
          interactableEntities: 0,
          dangerousEntities: 0
        },
        lastUpdated: new Date().toISOString(),
        error: 'セッションIDまたは場所IDが必要です'
      });
    }

    const response = await locationEntityService.getLocationEntitiesDisplay(request);
    return res.json(response);

  } catch (error) {
    logger.error('Failed to get location entities display:', error);
    return res.status(500).json({
      success: false,
      locationEntities: [],
      locationStats: {
        totalEntities: 0,
        discoveredEntities: 0,
        interactableEntities: 0,
        dangerousEntities: 0
      },
      lastUpdated: new Date().toISOString(),
      error: '場所エンティティの取得に失敗しました'
    });
  }
}));

// ==========================================
// エンティティ状態更新
// ==========================================

router.put('/status', asyncHandler(async (req, res) => {
  try {
    const request: UpdateEntityStatusRequest = {
      sessionId: req.body.sessionId,
      entityId: req.body.entityId,
      newStatus: req.body.newStatus,
      reason: req.body.reason
    };

    // 必須フィールドの検証
    if (!request.sessionId || !request.entityId || !request.newStatus) {
      return res.status(400).json({
        success: false,
        error: 'セッションID、エンティティID、新しい状態が必要です'
      });
    }

    // 状態値の検証
    const validStatuses = ['undiscovered', 'discovered', 'investigating', 'completed', 'unavailable'];
    if (!validStatuses.includes(request.newStatus)) {
      return res.status(400).json({
        success: false,
        error: '無効な状態値です'
      });
    }

    const response = await locationEntityService.updateEntityStatus(request);
    
    if (response.success) {
      // WebSocketで全セッション参加者にエンティティ状態変更を通知
      const io = req.app.get('socketio');
      if (io) {
        io.to(`session-${request.sessionId}`).emit('location-entities-updated', {
          type: 'entity-status-changed',
          sessionId: request.sessionId,
          locationId: response.updatedEntity?.locationId || 'unknown',
          entityId: request.entityId,
          newStatus: request.newStatus,
          timestamp: new Date().toISOString()
        });
        logger.debug(`Broadcasted entity status update to session ${request.sessionId}`);
      }
    }
    
    return res.json(response);

  } catch (error) {
    logger.error('Failed to update entity status:', error);
    return res.status(500).json({
      success: false,
      error: 'エンティティ状態の更新に失敗しました'
    });
  }
}));

// ==========================================
// 場所エンティティ更新・再生成
// ==========================================

router.post('/refresh', asyncHandler(async (req, res) => {
  try {
    const request: RefreshLocationEntitiesRequest = {
      sessionId: req.body.sessionId,
      locationId: req.body.locationId,
      forceRegeneration: req.body.forceRegeneration === true
    };

    // 必須フィールドの検証
    if (!request.sessionId || !request.locationId) {
      return res.status(400).json({
        success: false,
        refreshedEntities: [],
        newEntitiesGenerated: 0,
        error: 'セッションIDまたは場所IDが必要です'
      });
    }

    const response = await locationEntityService.refreshLocationEntities(request);
    
    if (response.success) {
      // WebSocketで全セッション参加者にエンティティ更新を通知
      const io = req.app.get('socketio');
      if (io) {
        const entityIds = response.refreshedEntities?.map(entity => entity.id) || [];
        io.to(`session-${request.sessionId}`).emit('location-entities-updated', {
          type: 'entities-refreshed',
          sessionId: request.sessionId,
          locationId: request.locationId,
          entityIds,
          timestamp: new Date().toISOString()
        });
        logger.debug(`Broadcasted entities refresh to session ${request.sessionId}`);
      }
    }
    
    return res.json(response);

  } catch (error) {
    logger.error('Failed to refresh location entities:', error);
    return res.status(500).json({
      success: false,
      refreshedEntities: [],
      newEntitiesGenerated: 0,
      error: '場所エンティティの更新に失敗しました'
    });
  }
}));

// ==========================================
// エンティティ詳細取得
// ==========================================

router.get('/detail/:sessionId/:entityId', asyncHandler(async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const entityId = req.params.entityId;

    if (!sessionId || !entityId) {
      return res.status(400).json({
        success: false,
        error: 'セッションIDまたはエンティティIDが必要です'
      });
    }

    // TODO: エンティティ詳細取得の実装
    // const entityDetail = await locationEntityService.getEntityDetail(sessionId, entityId);

    // モック詳細情報（実装時に削除）
    const mockDetail = {
      id: entityId,
      name: 'サンプルエンティティ',
      type: 'object',
      fullDescription: 'このエンティティの詳細な説明です。',
      availableActions: [
        { id: 'action-1', name: '調査する', description: '詳しく調べます' },
        { id: 'action-2', name: '触れる', description: '慎重に触れてみます' }
      ],
      history: [
        { timestamp: new Date().toISOString(), action: '発見', performer: 'Player 1' }
      ]
    };

    return res.json({
      success: true,
      entityDetail: mockDetail
    });

  } catch (error) {
    logger.error('Failed to get entity detail:', error);
    return res.status(500).json({
      success: false,
      error: 'エンティティ詳細の取得に失敗しました'
    });
  }
}));

// ==========================================
// 場所統計情報取得
// ==========================================

router.get('/stats/:sessionId/:locationId', asyncHandler(async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const locationId = req.params.locationId;

    if (!sessionId || !locationId) {
      return res.status(400).json({
        success: false,
        error: 'セッションIDまたは場所IDが必要です'
      });
    }

    // 基本統計は表示データ取得と同じロジックを使用
    const displayResponse = await locationEntityService.getLocationEntitiesDisplay({
      sessionId,
      locationId
    });

    if (displayResponse.success) {
      return res.json({
        success: true,
        stats: displayResponse.locationStats,
        lastUpdated: displayResponse.lastUpdated
      });
    } else {
      return res.status(500).json({
        success: false,
        error: displayResponse.error || '統計情報の取得に失敗しました'
      });
    }

  } catch (error) {
    logger.error('Failed to get location stats:', error);
    return res.status(500).json({
      success: false,
      error: '場所統計の取得に失敗しました'
    });
  }
}));

// ==========================================
// ヘルスチェック
// ==========================================

router.get('/health', asyncHandler(async (_req, res) => {
  try {
    return res.json({
      success: true,
      service: 'location-entities',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: [
        'location_entity_display',
        'entity_status_update',
        'entity_refresh',
        'entity_detail',
        'location_stats'
      ]
    });
  } catch (error) {
    logger.error('Location entities health check failed:', error);
    return res.status(500).json({
      success: false,
      service: 'location-entities',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '不明なエラー'
    });
  }
}));

export default router;