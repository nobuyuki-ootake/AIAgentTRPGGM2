/**
 * AI Entity Management API Client
 * AIエンティティ管理システムのフロントエンドAPIクライアント
 */

import { apiClient } from './client';
import { 
  AIQueryFilter,
  AIGameContext,
  AIConditionExpression,
  EntityRelationship,
  ID 
} from '@ai-agent-trpg/types';

// Request/Response 型定義
export interface EntityEvaluationRequest {
  entityId: ID;
  conditions: AIConditionExpression[];
  gameContext: AIGameContext;
}

export interface EntityEvaluationResult {
  entityId: ID;
  available: boolean;
  conditionResults: Array<{
    condition: AIConditionExpression;
    satisfied: boolean;
    reason: string;
  }>;
  effects: Array<{
    type: string;
    description: string;
    value: any;
  }>;
  learningData: {
    accuracy: number;
    confidence: number;
    adaptationSuggestions: string[];
  };
}

export interface BatchEntityEvaluationRequest {
  entityConditions: Array<{
    entityId: ID;
    conditions: AIConditionExpression[];
  }>;
  gameContext: AIGameContext;
}

export interface BatchEntityEvaluationResult {
  results: EntityEvaluationResult[];
  summary: {
    totalEntities: number;
    availableEntities: number;
    unavailableEntities: number;
    averageConfidence: number;
  };
}

export interface EntityQueryRequest {
  filter: AIQueryFilter;
  gameContext: AIGameContext;
  options?: {
    includeUnavailable?: boolean;
    sortBy?: 'relevance' | 'priority' | 'availability';
    limit?: number;
    offset?: number;
  };
}

export interface EntityQueryResult {
  entities: Array<{
    entityId: ID;
    entityType: 'item' | 'quest' | 'event' | 'npc' | 'enemy';
    relevanceScore: number;
    availability: boolean;
    metadata: Record<string, any>;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface EntityRecommendationRequest {
  entityType: 'item' | 'quest' | 'event' | 'npc' | 'enemy';
  gameContext: AIGameContext;
  maxRecommendations?: number;
}

export interface EntityRecommendationResult {
  recommendations: Array<{
    entityId: ID;
    entityType: string;
    relevanceScore: number;
    reasoning: string;
    expectedImpact: {
      story: number;
      character: number;
      gameplay: number;
    };
    suggestedTiming: 'immediate' | 'short_term' | 'long_term';
  }>;
}

export interface EntityAvailabilityRequest {
  entityId: ID;
  conditions: AIConditionExpression[];
  gameContext: AIGameContext;
}

export interface EntityAvailabilityResult {
  entityId: ID;
  available: boolean;
  availability: number; // 0-1 の可用性スコア
  blockedByConditions: AIConditionExpression[];
  availableAt: Date | null; // 利用可能になる予想時刻
  recommendations: string[];
}

export interface EntityRelationshipAnalysis {
  entityId: ID;
  directRelationships: EntityRelationship[];
  indirectRelationships: Array<{
    targetId: ID;
    path: ID[];
    strength: number;
    hops: number;
  }>;
  influenceScore: number;
  centralityMetrics: {
    degree: number;
    betweenness: number;
    closeness: number;
    pagerank: number;
  };
}

export interface EntityPathResult {
  fromId: ID;
  toId: ID;
  paths: Array<{
    path: ID[];
    strength: number;
    hops: number;
    pathType: 'direct' | 'dependency' | 'influence' | 'narrative';
  }>;
  shortestPath: ID[] | null;
  strongestPath: ID[] | null;
}

export interface EntityGroup {
  groupId: string;
  entities: ID[];
  groupType: 'cluster' | 'chain' | 'star' | 'complete';
  strength: number;
  description: string;
}

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgClustering: number;
  diameter: number;
  componentCount: number;
  stronglyConnectedComponents: ID[][];
}

export interface EngineStatistics {
  totalEntities: number;
  entitiesByType: Record<string, number>;
  totalRelationships: number;
  relationshipsByType: Record<string, number>;
  avgRelationshipsPerEntity: number;
  cacheHitRate: number;
  lastProcessingTime: number;
  memoryUsage: {
    entities: number;
    relationships: number;
    cache: number;
  };
}

class AIEntityManagementAPI {
  /**
   * エンティティ条件評価
   */
  async evaluateEntity(request: EntityEvaluationRequest): Promise<EntityEvaluationResult> {
    return apiClient.post<EntityEvaluationResult>('/ai-entity/evaluate', request);
  }

  /**
   * バッチエンティティ評価
   */
  async batchEvaluateEntities(request: BatchEntityEvaluationRequest): Promise<BatchEntityEvaluationResult> {
    return apiClient.post<BatchEntityEvaluationResult>('/ai-entity/batch-evaluate', request);
  }

  /**
   * エンティティクエリ実行
   */
  async queryEntities(request: EntityQueryRequest): Promise<EntityQueryResult> {
    return apiClient.post<EntityQueryResult>('/ai-entity/query', request);
  }

  /**
   * AI推奨エンティティ取得
   */
  async getRecommendedEntities(request: EntityRecommendationRequest): Promise<EntityRecommendationResult> {
    return apiClient.post<EntityRecommendationResult>('/ai-entity/recommend', request);
  }

  /**
   * エンティティ利用可能性チェック
   */
  async checkEntityAvailability(request: EntityAvailabilityRequest): Promise<EntityAvailabilityResult> {
    return apiClient.post<EntityAvailabilityResult>('/ai-entity/check-availability', request);
  }

  /**
   * エンティティ関係性分析
   */
  async analyzeEntityRelationships(entityId: ID): Promise<EntityRelationshipAnalysis> {
    return apiClient.get<EntityRelationshipAnalysis>(`/ai-entity/relationships/${entityId}`);
  }

  /**
   * エンティティ間パス検索
   */
  async findEntityPath(fromId: ID, toId: ID, maxHops: number = 5): Promise<EntityPathResult> {
    return apiClient.get<EntityPathResult>(`/ai-entity/path/${fromId}/${toId}?maxHops=${maxHops}`);
  }

  /**
   * 関係性追加
   */
  async addEntityRelationship(relationship: EntityRelationship): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/ai-entity/relationships', relationship);
  }

  /**
   * 関係性削除
   */
  async removeEntityRelationship(
    sourceId: ID, 
    targetId: ID, 
    relationshipType?: string
  ): Promise<{ success: boolean; data: { removed: boolean } }> {
    const params = relationshipType ? `?relationshipType=${relationshipType}` : '';
    return apiClient.delete<{ success: boolean; data: { removed: boolean } }>(
      `/ai-entity/relationships/${sourceId}/${targetId}${params}`
    );
  }

  /**
   * エンティティグループ検出
   */
  async findEntityGroups(minStrength: number = 0.7): Promise<EntityGroup[]> {
    return apiClient.get<EntityGroup[]>(`/ai-entity/groups?minStrength=${minStrength}`);
  }

  /**
   * グラフメトリクス取得
   */
  async getGraphMetrics(): Promise<GraphMetrics> {
    return apiClient.get<GraphMetrics>('/ai-entity/metrics');
  }

  /**
   * エンジン統計情報取得
   */
  async getEngineStatistics(): Promise<EngineStatistics> {
    return apiClient.get<EngineStatistics>('/ai-entity/statistics');
  }

  /**
   * キャッシュクリア
   */
  async clearCache(): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/ai-entity/clear-cache', {});
  }

  /**
   * ヘルスチェック
   */
  async checkHealth(): Promise<{
    success: boolean;
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    data: EngineStatistics;
  }> {
    return apiClient.get<{
      success: boolean;
      status: 'healthy' | 'unhealthy';
      timestamp: string;
      data: EngineStatistics;
    }>('/ai-entity/health');
  }

  // ゲームプレイ用の便利メソッド

  /**
   * 現在の状況に基づいて利用可能なエンティティを検索
   */
  async getAvailableEntities(
    gameContext: AIGameContext,
    entityType?: 'item' | 'quest' | 'event' | 'npc' | 'enemy'
  ): Promise<EntityQueryResult> {
    const filter: AIQueryFilter = {
      entityTypes: entityType ? [entityType] : ['item', 'quest', 'event', 'npc', 'enemy'],
      priorityRange: { min: 0.5, max: 1.0 },
      tags: [],
      excludeIds: []
    };

    return this.queryEntities({
      filter,
      gameContext,
      options: {
        includeUnavailable: false,
        sortBy: 'relevance',
        limit: 20
      }
    });
  }

  /**
   * セッション用のエンティティ推奨を取得
   */
  async getSessionRecommendations(gameContext: AIGameContext): Promise<{
    immediate: EntityRecommendationResult;
    upcoming: EntityRecommendationResult;
  }> {
    const [events, quests] = await Promise.all([
      this.getRecommendedEntities({
        entityType: 'event',
        gameContext,
        maxRecommendations: 3
      }),
      this.getRecommendedEntities({
        entityType: 'quest',
        gameContext,
        maxRecommendations: 2
      })
    ]);

    return {
      immediate: events,
      upcoming: quests
    };
  }

  /**
   * エンティティの利用状況をトラッキング
   */
  async trackEntityUsage(entityId: ID, gameContext: AIGameContext): Promise<void> {
    // エンティティ使用ログを記録
    // 実際の実装では使用統計をサーバーに送信
    console.log(`Entity ${entityId} used in context:`, gameContext);
  }
}

export const aiEntityManagementAPI = new AIEntityManagementAPI();