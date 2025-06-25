import { 
  LocationEntityMapping,
  ID
} from '@ai-agent-trpg/types';
import { apiClient } from './client';

// 探索システム関連の型定義
export interface EntityReference {
  id: string;
  name: string;
  type: 'core' | 'bonus';
  category: 'enemy' | 'event' | 'npc' | 'item' | 'quest' | 'practical' | 'trophy' | 'mystery';
  description: string;
  isAvailable: boolean;
  timeConditions?: string[];
  prerequisiteEntities?: string[];
  discoveredAt?: string;
}

export interface ExplorationResult {
  success: boolean;
  locationId: string;
  characterId: string;
  explorationLevel: number; // 0-100 この探索での達成レベル
  totalExplorationLevel: number; // 0-100 場所の総探索レベル
  
  // 発見されたエンティティ
  discoveredEntities: {
    entity: EntityReference;
    discoveryMessage: string; // AI generated discovery message
    rarity: 'common' | 'uncommon' | 'rare' | 'epic';
  }[];
  
  // 探索情報
  timeSpent: number; // 分
  encounterChance: number; // 0-1 遭遇確率
  
  // AI生成コンテンツ
  narrativeDescription: string; // 探索の物語的描写
  hints: string[]; // 次の探索に向けたヒント
  
  // 探索状態
  isFullyExplored: boolean;
  hiddenEntitiesRemaining: number;
}

export interface ExplorationStatus {
  locationId: string;
  sessionId: string;
  explorationLevel: number;
  isFullyExplored: boolean;
  totalEntities: number;
  discoveredEntities: number;
  hiddenEntities: number;
  discoveredEntityList: Array<{
    id: string;
    name: string;
    category: string;
    discoveredAt: string;
  }>;
  explorationHints: string[];
}

export interface UpdateAvailabilityRequest {
  isAvailable: boolean;
  reason?: string;
}

export interface DiscoverEntityRequest {
  sessionId: ID;
  characterId: ID;
  locationId: ID;
}

export const locationEntityMappingAPI = {
  /**
   * 場所に関連付けられたエンティティを取得
   */
  async getEntitiesByLocation(locationId: ID, sessionId: ID): Promise<LocationEntityMapping[]> {
    console.log('📍 Fetching entities for location', { locationId, sessionId });
    
    const response = await apiClient.get<LocationEntityMapping[]>(
      `/location-entity-mapping/location/${locationId}?sessionId=${sessionId}`
    );
    
    console.log('✅ Location entities fetched successfully', {
      locationId,
      entitiesCount: response.length
    });
    
    return response;
  },

  /**
   * エンティティマッピングの利用可能状態を更新
   */
  async updateAvailability(mappingId: ID, request: UpdateAvailabilityRequest): Promise<void> {
    console.log('🔄 Updating entity mapping availability', { mappingId, request });
    
    await apiClient.patch<any>(
      `/location-entity-mapping/${mappingId}/availability`,
      request
    );
    
    console.log('✅ Entity mapping availability updated', {
      mappingId,
      isAvailable: request.isAvailable
    });
  },

  /**
   * 場所でエンティティを発見
   */
  async discoverEntity(mappingId: ID, request: DiscoverEntityRequest): Promise<{
    success: boolean;
    message: string;
    entity?: any;
  }> {
    console.log('🔍 Discovering entity at location', { mappingId, request });
    
    const response = await apiClient.patch<{
      success: boolean;
      message: string;
      entity?: any;
    }>(
      `/location-entity-mapping/${mappingId}/discover`,
      request
    );
    
    console.log('✅ Entity discovery result', {
      mappingId,
      success: response.success,
      message: response.message
    });
    
    return response;
  },

  /**
   * セッション内の動的利用可能性を更新
   */
  async updateDynamicAvailability(sessionId: ID): Promise<{
    updated: number;
    entities: LocationEntityMapping[];
  }> {
    console.log('♻️ Updating dynamic availability for session', { sessionId });
    
    const response = await apiClient.put<{
      updated: number;
      entities: LocationEntityMapping[];
    }>(
      `/location-entity-mapping/session/${sessionId}/update-dynamic-availability`
    );
    
    console.log('✅ Dynamic availability updated', {
      sessionId,
      updatedCount: response.updated
    });
    
    return response;
  },

  /**
   * 現在の場所で利用可能なアクションを取得
   */
  async getAvailableActions(locationId: ID, sessionId: ID): Promise<{
    actions: Array<{
      id: ID;
      type: 'interact' | 'examine' | 'take' | 'talk' | 'fight';
      targetEntity: {
        id: ID;
        type: 'enemy' | 'event' | 'npc' | 'item' | 'quest';
        name: string;
        description: string;
      };
      requirements?: string[];
      isAvailable: boolean;
    }>;
  }> {
    console.log('🎯 Fetching available actions for location', { locationId, sessionId });
    
    const response = await apiClient.get<{
      actions: Array<{
        id: ID;
        type: 'interact' | 'examine' | 'take' | 'talk' | 'fight';
        targetEntity: {
          id: ID;
          type: 'enemy' | 'event' | 'npc' | 'item' | 'quest';
          name: string;
          description: string;
        };
        requirements?: string[];
        isAvailable: boolean;
      }>;
    }>(
      `/location-entity-mapping/location/${locationId}/available-actions?sessionId=${sessionId}`
    );
    
    console.log('✅ Available actions fetched', {
      locationId,
      actionsCount: response.actions.length,
      availableCount: response.actions.filter(a => a.isAvailable).length
    });
    
    return response;
  },

  /**
   * 場所を探索してエンティティを発見する - 「探索している感」の核心機能
   */
  async exploreLocation(
    locationId: ID, 
    characterId: ID, 
    sessionId: ID,
    explorationIntensity: 'light' | 'thorough' | 'exhaustive' = 'thorough'
  ): Promise<ExplorationResult> {
    console.log('🔍 Starting location exploration', { 
      locationId, 
      characterId, 
      sessionId,
      explorationIntensity 
    });
    
    const response = await apiClient.post<ExplorationResult>(
      `/location-entity-mapping/location/${locationId}/explore`,
      {
        characterId,
        sessionId,
        explorationIntensity
      }
    );
    
    console.log('✅ Location exploration completed', {
      locationId,
      discoveredCount: response.discoveredEntities.length,
      totalExplorationLevel: response.totalExplorationLevel,
      timeSpent: response.timeSpent,
      isFullyExplored: response.isFullyExplored
    });
    
    return response;
  },

  /**
   * 場所の探索状況を取得
   */
  async getExplorationStatus(locationId: ID, sessionId: ID): Promise<ExplorationStatus> {
    console.log('📊 Fetching exploration status for location', { locationId, sessionId });
    
    const response = await apiClient.get<ExplorationStatus>(
      `/location-entity-mapping/location/${locationId}/exploration-status?sessionId=${sessionId}`
    );
    
    console.log('✅ Exploration status fetched', {
      locationId,
      explorationLevel: response.explorationLevel,
      discoveredCount: response.discoveredEntities,
      hiddenCount: response.hiddenEntities,
      isFullyExplored: response.isFullyExplored
    });
    
    return response;
  }
};

export default locationEntityMappingAPI;