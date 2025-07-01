// ==========================================
// 場所別エンティティ管理サービス
// ==========================================

import {
  LocationEntity,
  GetLocationEntitiesDisplayRequest,
  GetLocationEntitiesDisplayResponse,
  UpdateEntityStatusRequest,
  UpdateEntityStatusResponse,
  RefreshLocationEntitiesRequest,
  RefreshLocationEntitiesResponse,
  EntityExplorationAction,
  ID
} from '@repo/types';
import { logger } from '../utils/logger';

class LocationEntityService {
  
  // ==========================================
  // 場所別エンティティ表示データ取得
  // ==========================================

  async getLocationEntitiesDisplay(request: GetLocationEntitiesDisplayRequest): Promise<GetLocationEntitiesDisplayResponse> {
    try {
      logger.info('Getting location entities display:', { request });

      // TODO: 実際のデータベース実装
      // const entities = await this.getEntitiesFromDatabase(request.sessionId, request.locationId);
      
      // モックデータ（実装時に削除）
      const mockEntities = this.generateMockLocationEntities(request.locationId, request.sessionId);

      // ソート処理
      const sortedEntities = this.sortEntities(mockEntities, request.sortBy, request.sortOrder);

      // 隠しエンティティのフィルタリング
      const filteredEntities = request.includeHidden 
        ? sortedEntities 
        : sortedEntities.filter(entity => entity.status !== 'undiscovered');

      // 統計情報の計算
      const locationStats = this.calculateLocationStats(mockEntities);

      return {
        success: true,
        locationEntities: filteredEntities,
        locationStats,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get location entities display:', error);
      return {
        success: false,
        locationEntities: [],
        locationStats: {
          totalEntities: 0,
          discoveredEntities: 0,
          interactableEntities: 0,
          dangerousEntities: 0
        },
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : '場所エンティティの取得に失敗しました'
      };
    }
  }

  // ==========================================
  // エンティティ状態更新
  // ==========================================

  async updateEntityStatus(request: UpdateEntityStatusRequest): Promise<UpdateEntityStatusResponse> {
    try {
      logger.info('Updating entity status:', { request });

      // TODO: 実際のデータベース更新実装
      // const updatedEntity = await this.updateEntityInDatabase(request);

      // モック更新（実装時に削除）
      const mockUpdatedEntity: LocationEntity = {
        id: `entity-${Date.now()}`,
        entityId: request.entityId,
        name: 'Updated Entity',
        type: 'object',
        status: request.newStatus,
        discoveryMethod: 'exploration',
        interactionCount: 1,
        lastInteractionTime: new Date().toISOString(),
        availableActionsCount: 2,
        displayInfo: {
          shortDescription: '状態が更新されたエンティティ',
          dangerLevel: 'low',
          iconType: 'neutral',
          statusColor: 'info'
        },
        locationId: 'current-location',
        sessionId: request.sessionId,
        updatedAt: new Date().toISOString()
      };

      return {
        success: true,
        updatedEntity: mockUpdatedEntity
      };

    } catch (error) {
      logger.error('Failed to update entity status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'エンティティ状態の更新に失敗しました'
      };
    }
  }

  // ==========================================
  // 場所エンティティ更新・再生成
  // ==========================================

  async refreshLocationEntities(request: RefreshLocationEntitiesRequest): Promise<RefreshLocationEntitiesResponse> {
    try {
      logger.info('Refreshing location entities:', { request });

      // TODO: AI生成による新エンティティ作成実装
      // const newEntities = await this.generateEntitiesWithAI(request);

      // モック再生成（実装時に削除）
      const refreshedEntities = this.generateMockLocationEntities(request.locationId, request.sessionId);
      const newEntitiesGenerated = request.forceRegeneration ? 2 : 0;

      if (request.forceRegeneration) {
        // 強制再生成時は新しいエンティティを追加
        const newEntity: LocationEntity = {
          id: `new-entity-${Date.now()}`,
          entityId: `new-${Date.now()}`,
          name: 'AI生成エンティティ',
          type: 'mystery',
          status: 'undiscovered',
          discoveryMethod: 'ai_generated',
          interactionCount: 0,
          availableActionsCount: 3,
          displayInfo: {
            shortDescription: 'AIによって新たに生成されたエンティティ',
            dangerLevel: 'medium',
            iconType: 'mystery',
            statusColor: 'info'
          },
          locationId: request.locationId,
          sessionId: request.sessionId,
          updatedAt: new Date().toISOString()
        };

        refreshedEntities.push(newEntity);
      }

      return {
        success: true,
        refreshedEntities,
        newEntitiesGenerated
      };

    } catch (error) {
      logger.error('Failed to refresh location entities:', error);
      return {
        success: false,
        refreshedEntities: [],
        newEntitiesGenerated: 0,
        error: error instanceof Error ? error.message : '場所エンティティの更新に失敗しました'
      };
    }
  }

  // ==========================================
  // 既存探索システムとの統合
  // ==========================================

  async convertExplorationActionToLocationEntity(
    explorationAction: EntityExplorationAction
  ): Promise<LocationEntity> {
    return {
      id: `location-entity-${explorationAction.id}`,
      entityId: explorationAction.entityId,
      name: explorationAction.entityName,
      type: explorationAction.entityType,
      status: explorationAction.isDiscovered 
        ? (explorationAction.isInteracted ? 'investigating' : 'discovered')
        : 'undiscovered',
      discoveryMethod: 'exploration',
      interactionCount: explorationAction.timesInteracted,
      lastInteractionTime: explorationAction.lastInteractionTime,
      availableActionsCount: explorationAction.availableActions.length,
      displayInfo: {
        shortDescription: this.generateShortDescription(explorationAction),
        dangerLevel: this.calculateDangerLevel(explorationAction.availableActions),
        iconType: this.getIconType(explorationAction.entityType),
        statusColor: this.getStatusColor(explorationAction)
      },
      locationId: explorationAction.locationId,
      sessionId: explorationAction.sessionId,
      discoveredBy: explorationAction.discoveredBy,
      discoveredAt: explorationAction.isDiscovered ? explorationAction.createdAt : undefined,
      updatedAt: explorationAction.updatedAt
    };
  }

  // ==========================================
  // プライベートメソッド
  // ==========================================

  private generateMockLocationEntities(locationId: ID, sessionId: ID): LocationEntity[] {
    const now = new Date().toISOString();
    
    return [
      {
        id: 'entity-1',
        entityId: 'treasure-chest-1',
        name: '古い宝箱',
        type: 'treasure',
        status: 'discovered',
        discoveryMethod: 'exploration',
        interactionCount: 0,
        availableActionsCount: 3,
        displayInfo: {
          shortDescription: '錆びた金具の古い木製宝箱',
          dangerLevel: 'medium',
          iconType: 'treasure',
          statusColor: 'warning'
        },
        locationId,
        sessionId,
        discoveredBy: 'char-1',
        discoveredAt: new Date(Date.now() - 30000).toISOString(),
        updatedAt: now
      },
      {
        id: 'entity-2',
        entityId: 'suspicious-npc-1',
        name: '怪しい商人',
        type: 'npc',
        status: 'investigating',
        discoveryMethod: 'initial',
        interactionCount: 2,
        lastInteractionTime: new Date(Date.now() - 60000).toISOString(),
        availableActionsCount: 4,
        displayInfo: {
          shortDescription: 'フードを深く被った謎の商人',
          dangerLevel: 'low',
          iconType: 'neutral',
          statusColor: 'info'
        },
        locationId,
        sessionId,
        discoveredAt: new Date(Date.now() - 120000).toISOString(),
        updatedAt: now
      },
      {
        id: 'entity-3',
        entityId: 'hidden-passage-1',
        name: '隠し通路',
        type: 'location_feature',
        status: 'undiscovered',
        interactionCount: 0,
        availableActionsCount: 2,
        displayInfo: {
          shortDescription: '壁の奥に何かありそうな気配',
          dangerLevel: 'safe',
          iconType: 'mystery',
          statusColor: 'default'
        },
        locationId,
        sessionId,
        updatedAt: now
      },
      {
        id: 'entity-4',
        entityId: 'dangerous-trap-1',
        name: '魔法の罠',
        type: 'hazard',
        status: 'discovered',
        discoveryMethod: 'story_event',
        interactionCount: 0,
        availableActionsCount: 5,
        displayInfo: {
          shortDescription: '古代魔法で仕掛けられた危険な罠',
          dangerLevel: 'dangerous',
          iconType: 'enemy',
          statusColor: 'error'
        },
        locationId,
        sessionId,
        discoveredBy: 'char-2',
        discoveredAt: new Date(Date.now() - 45000).toISOString(),
        updatedAt: now
      }
    ];
  }

  private sortEntities(
    entities: LocationEntity[],
    sortBy?: string,
    sortOrder?: string
  ): LocationEntity[] {
    const sorted = [...entities];

    sorted.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'discovery_time':
          aValue = a.discoveredAt ? new Date(a.discoveredAt).getTime() : 0;
          bValue = b.discoveredAt ? new Date(b.discoveredAt).getTime() : 0;
          break;
        case 'danger_level':
          const dangerOrder = { safe: 0, low: 1, medium: 2, high: 3, dangerous: 4 };
          aValue = dangerOrder[a.displayInfo.dangerLevel as keyof typeof dangerOrder] || 0;
          bValue = dangerOrder[b.displayInfo.dangerLevel as keyof typeof dangerOrder] || 0;
          break;
        case 'interaction_count':
          aValue = a.interactionCount;
          bValue = b.interactionCount;
          break;
        case 'name':
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
      }

      if (aValue < bValue) return sortOrder === 'desc' ? 1 : -1;
      if (aValue > bValue) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });

    return sorted;
  }

  private calculateLocationStats(entities: LocationEntity[]) {
    return {
      totalEntities: entities.length,
      discoveredEntities: entities.filter(e => e.status !== 'undiscovered').length,
      interactableEntities: entities.filter(e => e.availableActionsCount > 0).length,
      dangerousEntities: entities.filter(e => ['high', 'dangerous'].includes(e.displayInfo.dangerLevel)).length,
      lastDiscoveryTime: entities
        .filter(e => e.discoveredAt)
        .sort((a, b) => new Date(b.discoveredAt!).getTime() - new Date(a.discoveredAt!).getTime())[0]?.discoveredAt
    };
  }

  private generateShortDescription(action: EntityExplorationAction): string {
    const typeMap = {
      object: '調査可能なオブジェクト',
      npc: 'この場所にいるキャラクター',
      location_feature: '場所の特徴的な要素',
      hazard: '危険な要素',
      treasure: '価値のありそうなアイテム'
    };
    return typeMap[action.entityType] || '未知のエンティティ';
  }

  private calculateDangerLevel(actions: EntityExplorationAction['availableActions']): LocationEntity['displayInfo']['dangerLevel'] {
    const maxRiskLevel = actions.reduce((max, action) => {
      const riskOrder = { safe: 0, low: 1, medium: 2, high: 3, dangerous: 4 };
      const currentLevel = riskOrder[action.riskLevel];
      const maxLevel = riskOrder[max];
      return currentLevel > maxLevel ? action.riskLevel : max;
    }, 'safe' as const);

    return maxRiskLevel;
  }

  private getIconType(entityType: EntityExplorationAction['entityType']): LocationEntity['displayInfo']['iconType'] {
    const iconMap = {
      object: 'neutral' as const,
      npc: 'friendly' as const,
      location_feature: 'location' as const,
      hazard: 'enemy' as const,
      treasure: 'treasure' as const
    };
    return iconMap[entityType] || 'mystery';
  }

  private getStatusColor(action: EntityExplorationAction): LocationEntity['displayInfo']['statusColor'] {
    if (!action.isDiscovered) return 'default';
    if (action.isInteracted) return 'info';
    return 'success';
  }
}

export const locationEntityService = new LocationEntityService();