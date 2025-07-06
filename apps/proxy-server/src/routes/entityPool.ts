import { Router, Request, Response } from 'express';
import { 
  EntityPool, 
  CoreEntities,
  BonusEntities,
  APIResponse
} from '@ai-agent-trpg/types';
import { getDatabaseManagerService } from '../services/DatabaseManagerService';
import { logger } from '../utils/logger';
import { ValidationError, DatabaseError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/entity-pool/:sessionId
 * セッションのエンティティプールを取得
 */
router.get('/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    const dbService = getDatabaseManagerService();
    const entityPool = await dbService.getEntityPoolBySession(sessionId);
    
    const response: APIResponse<EntityPool | null> = {
      success: true,
      data: entityPool,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get entity pool:', error);
    throw new DatabaseError(
      'Failed to retrieve entity pool', 
      { sessionId: req.params.sessionId, originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

/**
 * PUT /api/entity-pool/:sessionId/entity
 * エンティティプール内の特定エンティティを更新
 */
router.put('/:sessionId/entity', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { 
      entityType,  // 'enemies', 'events', 'npcs', 'items', 'quests', 'practicalRewards', 'trophyItems', 'mysteryItems'
      entityCategory, // 'core' | 'bonus'
      entityId,
      updates 
    } = req.body;
    
    if (!sessionId || !entityType || !entityCategory || !entityId || !updates) {
      throw new ValidationError('Session ID, entity type, category, entity ID, and updates are required');
    }

    const dbService = getDatabaseManagerService();
    
    // 現在のエンティティプールを取得
    const currentPool = await dbService.getEntityPoolBySession(sessionId);
    if (!currentPool) {
      throw new ValidationError('Entity pool not found for this session');
    }

    // エンティティプールの構造を確認・更新
    const entityCollection = currentPool!.entities;
    let targetEntities: any[] = [];
    
    if (entityCategory === 'core') {
      if (!entityCollection.coreEntities) {
        throw new ValidationError('Core entities not found in entity pool');
      }
      targetEntities = entityCollection.coreEntities[entityType as keyof CoreEntities] || [];
    } else {
      if (!entityCollection.bonusEntities) {
        throw new ValidationError('Bonus entities not found in entity pool');
      }
      targetEntities = entityCollection.bonusEntities[entityType as keyof BonusEntities] || [];
    }

    // エンティティを検索・更新
    const entityIndex = targetEntities.findIndex(entity => 
      entity.id === entityId || entity.name === entityId
    );
    
    if (entityIndex === -1) {
      throw new ValidationError('Entity not found');
    }

    // エンティティを更新
    targetEntities[entityIndex] = {
      ...targetEntities[entityIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // エンティティプールを保存
    await dbService.saveEntityPool(sessionId, currentPool!);
    
    const response: APIResponse<{ success: boolean; entity: any }> = {
      success: true,
      data: {
        success: true,
        entity: targetEntities[entityIndex]
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
    logger.info(`Entity updated: ${entityType}.${entityId} in session ${sessionId}`);
  } catch (error) {
    logger.error('Failed to update entity:', error);
    throw new DatabaseError(
      'Failed to update entity', 
      { 
        sessionId: req.params.sessionId, 
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        originalError: error instanceof Error ? error.message : 'Unknown error' 
      }
    );
  }
});

/**
 * POST /api/entity-pool/:sessionId/entity
 * エンティティプールに新しいエンティティを追加
 */
router.post('/:sessionId/entity', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { 
      entityType,
      entityCategory,
      entityData 
    } = req.body;
    
    if (!sessionId || !entityType || !entityCategory || !entityData) {
      throw new ValidationError('Session ID, entity type, category, and entity data are required');
    }

    const dbService = getDatabaseManagerService();
    
    // 現在のエンティティプールを取得または作成
    let currentPool = await dbService.getEntityPoolBySession(sessionId);
    if (!currentPool) {
      // 新しいエンティティプールを作成
      currentPool = {
        id: `pool_${sessionId}_${Date.now()}`,
        campaignId: 'default-campaign', // デフォルト値
        themeId: 'default-theme', // デフォルト値
        sessionId,
        entities: {
          coreEntities: {
            enemies: [],
            events: [],
            npcs: [],
            items: [],
            quests: []
          },
          bonusEntities: {
            practicalRewards: [],
            trophyItems: [],
            mysteryItems: []
          },
          // EntityPoolCollectionとの互換性のため
          enemies: [],
          events: [],
          npcs: [],
          items: [],
          quests: []
        },
        generatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }

    const entityCollection = currentPool!.entities;
    
    // 新しいエンティティを準備
    const newEntity = {
      ...entityData,
      id: entityData.id || `${entityType}_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // エンティティを追加
    if (entityCategory === 'core') {
      if (!entityCollection.coreEntities) {
        entityCollection.coreEntities = {
          enemies: [],
          events: [],
          npcs: [],
          items: [],
          quests: []
        };
      }
      
      const targetArray = entityCollection.coreEntities[entityType as keyof CoreEntities];
      if (Array.isArray(targetArray)) {
        targetArray.push(newEntity);
      }
    } else {
      if (!entityCollection.bonusEntities) {
        entityCollection.bonusEntities = {
          practicalRewards: [],
          trophyItems: [],
          mysteryItems: []
        };
      }
      
      const targetArray = entityCollection.bonusEntities[entityType as keyof BonusEntities];
      if (Array.isArray(targetArray)) {
        targetArray.push(newEntity);
      }
    }

    // エンティティプールを保存
    await dbService.saveEntityPool(sessionId, currentPool!);
    
    const response: APIResponse<{ success: boolean; entity: any }> = {
      success: true,
      data: {
        success: true,
        entity: newEntity
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
    logger.info(`Entity added: ${entityType}.${newEntity.id} to session ${sessionId}`);
  } catch (error) {
    logger.error('Failed to add entity:', error);
    throw new DatabaseError(
      'Failed to add entity', 
      { 
        sessionId: req.params.sessionId, 
        entityType: req.body.entityType,
        originalError: error instanceof Error ? error.message : 'Unknown error' 
      }
    );
  }
});

/**
 * DELETE /api/entity-pool/:sessionId/entity
 * エンティティプールからエンティティを削除
 */
router.delete('/:sessionId/entity', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { 
      entityType,
      entityCategory,
      entityId 
    } = req.body;
    
    if (!sessionId || !entityType || !entityCategory || !entityId) {
      throw new ValidationError('Session ID, entity type, category, and entity ID are required');
    }

    const dbService = getDatabaseManagerService();
    
    // 現在のエンティティプールを取得
    const currentPool = await dbService.getEntityPoolBySession(sessionId);
    if (!currentPool) {
      throw new ValidationError('Entity pool not found for this session');
    }

    const entityCollection = currentPool!.entities;
    let targetEntities: any[] = [];
    
    if (entityCategory === 'core') {
      if (!entityCollection.coreEntities) {
        throw new ValidationError('Core entities not found in entity pool');
      }
      targetEntities = entityCollection.coreEntities[entityType as keyof CoreEntities] || [];
    } else {
      if (!entityCollection.bonusEntities) {
        throw new ValidationError('Bonus entities not found in entity pool');
      }
      targetEntities = entityCollection.bonusEntities[entityType as keyof BonusEntities] || [];
    }

    // エンティティを検索・削除
    const entityIndex = targetEntities.findIndex(entity => 
      entity.id === entityId || entity.name === entityId
    );
    
    if (entityIndex === -1) {
      throw new ValidationError('Entity not found');
    }

    const deletedEntity = targetEntities.splice(entityIndex, 1)[0];

    // エンティティプールを保存
    await dbService.saveEntityPool(sessionId, currentPool!);
    
    const response: APIResponse<{ success: boolean; deletedEntity: any }> = {
      success: true,
      data: {
        success: true,
        deletedEntity
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
    logger.info(`Entity deleted: ${entityType}.${entityId} from session ${sessionId}`);
  } catch (error) {
    logger.error('Failed to delete entity:', error);
    throw new DatabaseError(
      'Failed to delete entity', 
      { 
        sessionId: req.params.sessionId, 
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        originalError: error instanceof Error ? error.message : 'Unknown error' 
      }
    );
  }
});

/**
 * DELETE /api/entity-pool/:sessionId/entities/bulk
 * エンティティプールから複数エンティティを一括削除
 */
router.delete('/:sessionId/entities/bulk', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { entityIds } = req.body; // Array of { entityType, entityCategory, entityId }
    
    if (!sessionId || !Array.isArray(entityIds) || entityIds.length === 0) {
      throw new ValidationError('Session ID and non-empty entity IDs array are required');
    }

    const dbService = getDatabaseManagerService();
    
    // 現在のエンティティプールを取得
    const currentPool = await dbService.getEntityPoolBySession(sessionId);
    if (!currentPool) {
      throw new ValidationError('Entity pool not found for this session');
    }

    const entityCollection = currentPool!.entities;
    const deletedEntities: any[] = [];

    // 各エンティティを削除
    for (const { entityType, entityCategory, entityId } of entityIds) {
      let targetEntities: any[] = [];
      
      if (entityCategory === 'core') {
        if (entityCollection.coreEntities) {
          targetEntities = entityCollection.coreEntities[entityType as keyof CoreEntities] || [];
        }
      } else {
        if (entityCollection.bonusEntities) {
          targetEntities = entityCollection.bonusEntities[entityType as keyof BonusEntities] || [];
        }
      }

      const entityIndex = targetEntities.findIndex(entity => 
        entity.id === entityId || entity.name === entityId
      );
      
      if (entityIndex !== -1) {
        const deletedEntity = targetEntities.splice(entityIndex, 1)[0];
        deletedEntities.push(deletedEntity);
      }
    }

    // エンティティプールを保存
    await dbService.saveEntityPool(sessionId, currentPool!);
    
    const response: APIResponse<{ success: boolean; deletedCount: number; deletedEntities: any[] }> = {
      success: true,
      data: {
        success: true,
        deletedCount: deletedEntities.length,
        deletedEntities
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
    logger.info(`Bulk deleted ${deletedEntities.length} entities from session ${sessionId}`);
  } catch (error) {
    logger.error('Failed to bulk delete entities:', error);
    throw new DatabaseError(
      'Failed to bulk delete entities', 
      { 
        sessionId: req.params.sessionId,
        originalError: error instanceof Error ? error.message : 'Unknown error' 
      }
    );
  }
});

export { router as entityPoolRouter };