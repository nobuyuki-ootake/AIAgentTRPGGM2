/**
 * AI Entity Engine - Main Integration Point
 * AI基盤データ構造システムの統合エクスポート
 */

import { 
  AIConditionExpression,
  AIQueryFilter,
  AIGameContext,
  EntityRelationshipGraph,
  ID
} from '@ai-agent-trpg/types';

import { ConditionEvaluator, conditionEvaluator, GameState, EvaluationContext } from './conditionEvaluator';
import { AIQueryProcessor, aiQueryProcessor, EntitySearchResult, AIQueryOptions } from './aiQueryProcessor';
import { RelationshipManager, RelationshipAnalysis, PathfindingResult, GraphMetrics } from './relationshipManager';

export interface AIEntityEngineOptions {
  enableCaching?: boolean;
  maxCacheSize?: number;
  relationshipGraph?: EntityRelationshipGraph;
  debugMode?: boolean;
}

export interface EntityProcessingResult {
  success: boolean;
  entityId: ID;
  processingTime: number;
  conditions: {
    evaluated: number;
    passed: number;
    failed: number;
  };
  effects: any[];
  errors?: string[];
}

export interface BatchProcessingResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  processingTime: number;
  results: EntityProcessingResult[];
  errors: string[];
}

/**
 * AI Entity Engine - メインクラス
 * 全ての AI エンティティ管理機能を統合
 */
export class AIEntityEngine {
  private conditionEvaluator: ConditionEvaluator;
  private queryProcessor: AIQueryProcessor;
  private relationshipManager: RelationshipManager;
  private options: AIEntityEngineOptions;
  private debugMode: boolean;

  constructor(options: AIEntityEngineOptions = {}) {
    this.options = {
      enableCaching: true,
      maxCacheSize: 1000,
      debugMode: false,
      ...options
    };

    this.debugMode = this.options.debugMode || false;
    
    this.conditionEvaluator = new ConditionEvaluator();
    this.relationshipManager = new RelationshipManager(options.relationshipGraph);
    this.queryProcessor = new AIQueryProcessor(this.relationshipManager.exportGraph());

    if (this.debugMode) {
      console.log('AI Entity Engine initialized with options:', this.options);
    }
  }

  /**
   * エンティティ条件評価（単一）
   */
  async evaluateEntity(
    entityId: ID,
    conditions: AIConditionExpression[],
    gameContext: AIGameContext
  ): Promise<EntityProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      const evaluationContext: EvaluationContext = {
        entityId,
        entityType: this.determineEntityType(entityId),
        gameState: this.convertToGameState(gameContext),
        metadata: {}
      };

      let passed = 0;
      let failed = 0;

      for (const condition of conditions) {
        try {
          const result = await this.conditionEvaluator.evaluateCondition(condition, evaluationContext);
          if (result) {
            passed++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
          errors.push(`Condition evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        success: failed === 0,
        entityId,
        processingTime,
        conditions: {
          evaluated: conditions.length,
          passed,
          failed
        },
        effects: [], // 実際の効果は別途計算
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        success: false,
        entityId,
        processingTime,
        conditions: {
          evaluated: conditions.length,
          passed: 0,
          failed: conditions.length
        },
        effects: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * バッチエンティティ処理
   */
  async batchProcessEntities(
    entityConditions: { entityId: ID; conditions: AIConditionExpression[] }[],
    gameContext: AIGameContext
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const results: EntityProcessingResult[] = [];
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    for (const { entityId, conditions } of entityConditions) {
      try {
        const result = await this.evaluateEntity(entityId, conditions, gameContext);
        results.push(result);
        
        if (result.success) {
          successful++;
        } else {
          failed++;
          if (result.errors) {
            errors.push(...result.errors);
          }
        }
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Entity ${entityId}: ${errorMsg}`);
        results.push({
          success: false,
          entityId,
          processingTime: 0,
          conditions: { evaluated: 0, passed: 0, failed: conditions.length },
          effects: [],
          errors: [errorMsg]
        });
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      totalProcessed: entityConditions.length,
      successful,
      failed,
      processingTime,
      results,
      errors
    };
  }

  /**
   * 高度なエンティティクエリ実行
   */
  async queryEntities<T>(
    filter: AIQueryFilter,
    gameContext: AIGameContext,
    options: AIQueryOptions = {}
  ): Promise<EntitySearchResult<T>> {
    try {
      return await this.queryProcessor.queryEntities<T>(filter, gameContext, options);
    } catch (error) {
      if (this.debugMode) {
        console.error('Query execution failed:', error);
      }
      throw error;
    }
  }

  /**
   * エンティティ関係性分析
   */
  analyzeEntityRelationships(entityId: ID): RelationshipAnalysis {
    return this.relationshipManager.analyzeRelationships(entityId);
  }

  /**
   * エンティティ間パス検索
   */
  findEntityPath(fromId: ID, toId: ID, _maxHops = 5): PathfindingResult | null {
    return this.relationshipManager.findPath(fromId, toId);
  }

  /**
   * 関係性グラフメトリクス取得
   */
  getGraphMetrics(): GraphMetrics {
    return this.relationshipManager.calculateGraphMetrics();
  }

  /**
   * エンティティ関係性追加
   */
  addEntityRelationship(relationship: any): void {
    this.relationshipManager.addRelationship(relationship);
  }

  /**
   * エンティティ関係性削除
   */
  removeEntityRelationship(sourceId: ID, targetId: ID, relationshipType?: string): boolean {
    this.relationshipManager.removeRelationship(sourceId, targetId, relationshipType);
    return true;
  }

  /**
   * 強結合エンティティグループ検出
   */
  findEntityGroups(_minStrength = 0.7): ID[][] {
    const metrics = this.relationshipManager.calculateGraphMetrics();
    return metrics.stronglyConnectedComponents;
  }

  /**
   * AI推奨エンティティ取得
   */
  async getRecommendedEntities(
    entityType: string,
    gameContext: AIGameContext,
    maxRecommendations = 5
  ): Promise<EntitySearchResult<any>> {
    const filter: AIQueryFilter = {
      entityTypes: [entityType],
      aiCriteria: {
        recommendationScore: { min: 0.5, max: 1.0 },
        playerAlignment: { min: 0.3 }
        // urgency は型定義に存在しないため削除
      }
    };

    const options: AIQueryOptions = {
      maxResults: maxRecommendations,
      includeRelated: true,
      sortBy: 'relevance'
    };

    return this.queryEntities(filter, gameContext, options);
  }

  /**
   * エンティティ実行可能性チェック
   */
  async checkEntityAvailability(
    entityId: ID,
    conditions: AIConditionExpression[],
    gameContext: AIGameContext
  ): Promise<{ available: boolean; reason?: string; confidence: number }> {
    const result = await this.evaluateEntity(entityId, conditions, gameContext);
    
    const totalConditions = result.conditions.evaluated;
    const passedConditions = result.conditions.passed;
    const confidence = totalConditions > 0 ? passedConditions / totalConditions : 0;

    return {
      available: result.success,
      reason: result.errors?.[0],
      confidence
    };
  }

  /**
   * エンティティタイプ判定
   */
  private determineEntityType(entityId: ID): 'item' | 'quest' | 'event' | 'npc' | 'enemy' {
    // 実装簡略化：IDプレフィックスによる判定
    if (entityId.startsWith('item_')) return 'item';
    if (entityId.startsWith('quest_')) return 'quest';
    if (entityId.startsWith('event_')) return 'event';
    if (entityId.startsWith('npc_')) return 'npc';
    if (entityId.startsWith('enemy_')) return 'enemy';
    
    return 'item'; // デフォルト
  }

  /**
   * ゲームコンテキストをGameStateに変換
   */
  private convertToGameState(gameContext: AIGameContext): GameState {
    // Use player directly from currentState
    const playerCharacter = gameContext.currentState.player;
    
    return {
      player: {
        id: playerCharacter?.id || '',
        name: playerCharacter?.name || '',
        level: playerCharacter?.level || 1,
        location: playerCharacter?.location || '',
        stats: playerCharacter?.stats || {},
        items: playerCharacter?.items || [],
        status: playerCharacter?.status || [],
        relationships: {} // TODO: Implement relationship extraction
      },
      world: {
        time: gameContext.currentState.time ? Date.now() : Date.now(), // TODO: proper time conversion
        weather: typeof gameContext.currentState.weather === 'string' ? gameContext.currentState.weather : 'clear',
        events: gameContext.recentHistory?.events?.map(event => event.type) || [],
        flags: gameContext.currentState.flags || {}
      },
      session: {
        turn: 1, // TODO: Extract turn from context
        phase: 'exploration',
        location: playerCharacter?.location || '',
        npcs_present: gameContext.npcsPresent || [] // Use npcsPresent from context
      }
    };
  }

  /**
   * エンジン統計情報取得
   */
  getEngineStatistics() {
    return {
      conditionEvaluator: {
        // 条件評価エンジンの統計
      },
      queryProcessor: {
        cacheSize: this.queryProcessor.getCacheSize()
      },
      relationshipManager: this.relationshipManager.calculateGraphMetrics()
    };
  }

  /**
   * キャッシュクリア
   */
  clearCaches(): void {
    this.queryProcessor.clearCache();
    // clearCaches is a private method, so we need to trigger cache clearing differently
    this.relationshipManager.importGraph(this.relationshipManager.exportGraph());
  }

  /**
   * エンジン設定更新
   */
  updateOptions(newOptions: Partial<AIEntityEngineOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.debugMode = this.options.debugMode || false;
  }
}

// シングルトンインスタンス
export const aiEntityEngine = new AIEntityEngine();

// 個別コンポーネントのエクスポート
export {
  ConditionEvaluator,
  conditionEvaluator,
  AIQueryProcessor,
  aiQueryProcessor,
  RelationshipManager
};

// 型定義のエクスポート
export type {
  GameState,
  EvaluationContext,
  EntitySearchResult,
  AIQueryOptions,
  RelationshipAnalysis,
  PathfindingResult,
  GraphMetrics
};