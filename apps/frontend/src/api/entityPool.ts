import { apiClient } from './client';
import { 
  EntityPool, 
  APIResponse,
  ID 
} from '@ai-agent-trpg/types';

export interface EntityUpdateRequest {
  entityType: string;
  entityCategory: 'core' | 'bonus';
  entityId: ID;
  updates: Record<string, any>;
}

export interface EntityCreateRequest {
  entityType: string;
  entityCategory: 'core' | 'bonus';
  entityData: Record<string, any>;
}

export interface EntityDeleteRequest {
  entityType: string;
  entityCategory: 'core' | 'bonus';
  entityId: ID;
}

export interface BulkDeleteRequest {
  entityIds: Array<{
    entityType: string;
    entityCategory: 'core' | 'bonus';
    entityId: ID;
  }>;
}

/**
 * エンティティプール管理API
 */
export const entityPoolAPI = {
  /**
   * セッションのエンティティプールを取得
   */
  async getEntityPool(sessionId: ID): Promise<EntityPool | null> {
    const response = await apiClient.get<EntityPool | null>(
      `/ai-milestone-generation/session/${sessionId}/entity-pool`
    );
    // apiClient.getは自動的にresponse.data.dataを返すため、直接返す
    return response;
  },

  /**
   * エンティティプール内の特定エンティティを更新
   */
  async updateEntity(sessionId: ID, request: EntityUpdateRequest): Promise<any> {
    const response = await apiClient.put<{ success: boolean; entity: any }>(
      `/entity-pool/${sessionId}/entity`,
      request
    );
    return response;
  },

  /**
   * エンティティプールに新しいエンティティを追加
   */
  async createEntity(sessionId: ID, request: EntityCreateRequest): Promise<any> {
    const response = await apiClient.post<{ success: boolean; entity: any }>(
      `/entity-pool/${sessionId}/entity`,
      request
    );
    return response;
  },

  /**
   * エンティティプールからエンティティを削除
   */
  async deleteEntity(sessionId: ID, request: EntityDeleteRequest): Promise<any> {
    const response = await apiClient.delete<{ success: boolean; deletedEntity: any }>(
      `/entity-pool/${sessionId}/entity`,
      { data: request }
    );
    return response;
  },

  /**
   * エンティティプールから複数エンティティを一括削除
   */
  async bulkDeleteEntities(sessionId: ID, request: BulkDeleteRequest): Promise<any> {
    const response = await apiClient.delete<{ success: boolean; deletedCount: number; deletedEntities: any[] }>(
      `/entity-pool/${sessionId}/entities/bulk`,
      { data: request }
    );
    return response;
  },

  /**
   * クイック編集（名前・説明のみ更新）
   */
  async quickUpdateEntity(
    sessionId: ID, 
    entityType: string, 
    entityCategory: 'core' | 'bonus',
    entityId: ID, 
    name: string, 
    description: string
  ): Promise<any> {
    return this.updateEntity(sessionId, {
      entityType,
      entityCategory,
      entityId,
      updates: { name, description }
    });
  }
};