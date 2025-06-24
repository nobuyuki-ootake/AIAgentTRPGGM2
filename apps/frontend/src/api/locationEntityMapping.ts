import { 
  LocationEntityMapping,
  ID
} from '@ai-agent-trpg/types';
import { apiClient } from './client';

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
  }
};

export default locationEntityMappingAPI;