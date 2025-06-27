/**
 * AI Query & Filtering API
 * エンティティ検索・フィルタリングシステム
 */

import { 
  AIQueryFilter, 
  EntityRelationshipGraph,
  AIGameContext,
  ID 
} from '@ai-agent-trpg/types';
import { conditionEvaluator, GameState, EvaluationContext } from './conditionEvaluator';

// GameStateExtended を削除し、AIGameContext を直接使用
// AIGameContext との型整合性のため、GameState を AIGameContext から変換する関数を使用

export interface EntitySearchResult<T = any> {
  entities: T[];
  totalCount: number;
  relevanceScores: number[];
  executionTime: number;
  metadata: {
    filtersApplied: string[];
    sortedBy: string;
    contextFactors: string[];
  };
}

export interface AIQueryOptions {
  maxResults?: number;
  includeRelated?: boolean;
  contextWeight?: number;
  sortBy?: 'relevance' | 'priority' | 'timestamp' | 'custom';
  includeMetadata?: boolean;
}

export class AIQueryProcessor {
  private entityCache = new Map<string, any>();
  private relationshipGraph?: EntityRelationshipGraph;

  constructor(relationshipGraph?: EntityRelationshipGraph) {
    this.relationshipGraph = relationshipGraph;
  }

  /**
   * AI向けエンティティクエリ実行
   */
  async queryEntities<T>(
    filter: AIQueryFilter,
    gameContext: AIGameContext,
    options: AIQueryOptions = {}
  ): Promise<EntitySearchResult<T>> {
    const startTime = Date.now();
    
    try {
      let entities = await this.getEntitiesByType(filter.entityTypes || []);
      
      // 基本フィルタリング
      entities = await this.applyBasicFilters(entities, filter);
      
      // 条件式評価
      entities = await this.applyConditionFilters(entities, filter, gameContext);
      
      // コンテキスト評価
      entities = await this.applyContextFilters(entities, filter, gameContext);
      
      // 関連エンティティ取得
      if (options.includeRelated && this.relationshipGraph) {
        entities = await this.includeRelatedEntities(entities, gameContext);
      }
      
      // 関連性スコア計算
      const scoredEntities = await this.calculateRelevanceScores(entities, filter, gameContext);
      
      // ソート
      const sortedEntities = this.sortEntities(scoredEntities, options.sortBy || 'relevance');
      
      // 結果制限
      const limitedEntities = this.limitResults(sortedEntities, options.maxResults || 50);
      
      const executionTime = Date.now() - startTime;
      
      return {
        entities: limitedEntities.map(e => e.entity),
        totalCount: entities.length,
        relevanceScores: limitedEntities.map(e => e.score),
        executionTime,
        metadata: {
          filtersApplied: this.getAppliedFilters(filter),
          sortedBy: options.sortBy || 'relevance',
          contextFactors: this.getContextFactors(gameContext)
        }
      };
    } catch (error) {
      console.error('AI Query processing failed:', error);
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * タイプ別エンティティ取得
   */
  private async getEntitiesByType(entityTypes: string[]): Promise<any[]> {
    const allEntities: any[] = [];
    
    for (const type of entityTypes) {
      const cached = this.entityCache.get(type);
      if (cached) {
        allEntities.push(...cached);
        continue;
      }
      
      // 実際のデータベースクエリ（簡略化）
      const entities = await this.fetchEntitiesFromDatabase(type);
      this.entityCache.set(type, entities);
      allEntities.push(...entities);
    }
    
    return allEntities;
  }

  /**
   * 基本フィルタ適用
   */
  private async applyBasicFilters(
    entities: any[],
    filter: AIQueryFilter
  ): Promise<any[]> {
    let filtered = entities;

    // タグフィルタ
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(entity => 
        filter.tags!.some(tag => entity.tags?.includes(tag))
      );
    }

    // 優先度フィルタ
    if (filter.priority) {
      filtered = filtered.filter(entity => entity.priority >= filter.priority!);
    }

    // 場所フィルタ
    if (filter.location) {
      filtered = filtered.filter(entity => 
        !entity.location || entity.location === filter.location
      );
    }

    // 時間制約フィルタ
    if (filter.timeConstraints) {
      filtered = await this.applyTimeConstraints(filtered, filter.timeConstraints);
    }

    return filtered;
  }

  /**
   * 条件式フィルタ適用
   */
  private async applyConditionFilters(
    entities: any[],
    filter: AIQueryFilter,
    gameContext: AIGameContext
  ): Promise<any[]> {
    if (!filter.conditions || filter.conditions.length === 0) {
      return entities;
    }

    const filtered: any[] = [];
    
    for (const entity of entities) {
      const context: EvaluationContext = {
        entityId: entity.id,
        entityType: entity.type,
        gameState: this.convertToGameState(gameContext),
        metadata: entity.metadata
      };

      let allConditionsMet = true;
      for (const condition of filter.conditions) {
        const result = await conditionEvaluator.evaluateCondition(condition, context);
        if (!result) {
          allConditionsMet = false;
          break;
        }
      }

      if (allConditionsMet) {
        filtered.push(entity);
      }
    }

    return filtered;
  }

  /**
   * コンテキストフィルタ適用
   */
  private async applyContextFilters(
    entities: any[],
    filter: AIQueryFilter,
    gameContext: AIGameContext
  ): Promise<any[]> {
    if (!filter.contextFactors || Object.keys(filter.contextFactors).length === 0) {
      return entities;
    }

    return entities.filter(entity => {
      for (const [factorKey] of Object.entries(filter.contextFactors!)) {
        if (!this.evaluateContextFactor(entity, factorKey, gameContext)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 関連エンティティ取得
   */
  private async includeRelatedEntities(
    entities: any[],
    gameContext: AIGameContext
  ): Promise<any[]> {
    if (!this.relationshipGraph) return entities;

    const relatedEntities: any[] = [];
    const processedIds = new Set(entities.map(e => e.id));

    for (const entity of entities) {
      const related = await this.getRelatedEntities(entity.id, gameContext);
      for (const relatedEntity of related) {
        if (!processedIds.has(relatedEntity.id)) {
          relatedEntities.push(relatedEntity);
          processedIds.add(relatedEntity.id);
        }
      }
    }

    return [...entities, ...relatedEntities];
  }

  /**
   * 関連性スコア計算
   */
  private async calculateRelevanceScores(
    entities: any[],
    filter: AIQueryFilter,
    gameContext: AIGameContext
  ): Promise<{ entity: any; score: number }[]> {
    return entities.map(entity => ({
      entity,
      score: this.calculateEntityRelevance(entity, filter, gameContext)
    }));
  }

  /**
   * エンティティの関連性計算
   */
  private calculateEntityRelevance(
    entity: any,
    filter: AIQueryFilter,
    gameContext: AIGameContext
  ): number {
    let score = 0;

    // 基本優先度スコア
    score += (entity.priority || 0) * 0.3;

    // タグマッチスコア
    if (filter.tags) {
      const tagMatches = filter.tags.filter(tag => entity.tags?.includes(tag)).length;
      score += (tagMatches / filter.tags.length) * 0.2;
    }

    // 場所関連性スコア
    if (filter.location && entity.location === filter.location) {
      score += 0.2;
    }

    // プレイヤーレベル適合性スコア
    const playerLevel = gameContext.currentState.player?.level || 1;
    const levelDiff = Math.abs((entity.requiredLevel || playerLevel) - playerLevel);
    score += Math.max(0, (10 - levelDiff) / 10) * 0.15;

    // ストーリー進行関連性スコア
    if (entity.storyRelevance && gameContext.currentState.story) {
      score += entity.storyRelevance * 0.15;
    }

    return Math.min(score, 1.0);
  }

  /**
   * エンティティソート
   */
  private sortEntities(
    scoredEntities: { entity: any; score: number }[],
    sortBy: string
  ): { entity: any; score: number }[] {
    switch (sortBy) {
      case 'relevance':
        return scoredEntities.sort((a, b) => b.score - a.score);
      case 'priority':
        return scoredEntities.sort((a, b) => (b.entity.priority || 0) - (a.entity.priority || 0));
      case 'timestamp':
        return scoredEntities.sort((a, b) => 
          new Date(b.entity.timestamp || 0).getTime() - new Date(a.entity.timestamp || 0).getTime()
        );
      default:
        return scoredEntities;
    }
  }

  /**
   * 結果数制限
   */
  private limitResults(
    entities: { entity: any; score: number }[],
    maxResults: number
  ): { entity: any; score: number }[] {
    return entities.slice(0, maxResults);
  }

  /**
   * 時間制約適用
   */
  private async applyTimeConstraints(
    entities: any[],
    timeConstraints: any
  ): Promise<any[]> {    
    return entities.filter(entity => {
      if (timeConstraints.before && entity.availableUntil) {
        if (new Date(entity.availableUntil).getTime() > timeConstraints.before) {
          return false;
        }
      }
      
      if (timeConstraints.after && entity.availableFrom) {
        if (new Date(entity.availableFrom).getTime() < timeConstraints.after) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * コンテキスト要因評価
   */
  private evaluateContextFactor(
    entity: any,
    factor: string,
    gameContext: AIGameContext
  ): boolean {
    switch (factor) {
      case 'story_appropriate':
        return this.isStoryAppropriate(entity, gameContext);
      case 'player_ready':
        return this.isPlayerReady(entity, gameContext);
      case 'dramatic_timing':
        return this.isDramaticTiming(entity, gameContext);
      case 'resource_available':
        return this.areResourcesAvailable(entity, gameContext);
      default:
        return true;
    }
  }

  /**
   * ストーリー適合性チェック
   */
  private isStoryAppropriate(entity: any, gameContext: AIGameContext): boolean {
    if (!entity.storyRequirements) return true;
    
    // AIGameContextからセッションの状態を取得
    const currentPhase = gameContext.sessionMode || 'exploration';
    const requiredPhase = entity.storyRequirements.phase;
    
    return !requiredPhase || currentPhase === requiredPhase;
  }

  /**
   * プレイヤー準備状況チェック
   */
  private isPlayerReady(entity: any, gameContext: AIGameContext): boolean {
    const player = gameContext.currentState.player;
    if (!player || !entity.requirements) return true;

    // レベル要件チェック
    if (entity.requirements.level && player.level < entity.requirements.level) {
      return false;
    }

    // アイテム要件チェック
    if (entity.requirements.items) {
      for (const itemId of entity.requirements.items) {
        if (!player.items?.includes(itemId)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * ドラマティックタイミングチェック
   */
  private isDramaticTiming(entity: any, gameContext: AIGameContext): boolean {
    // 簡略化：最近のイベントとの間隔をチェック
    const lastEvent = gameContext.recentHistory?.events?.[0];
    const lastEventTime = lastEvent?.actualStartTime || lastEvent?.scheduledDate;
    if (!lastEventTime) return true;

    const timeSinceLastEvent = Date.now() - new Date(lastEventTime).getTime();
    const minInterval = entity.dramaticTiming?.minInterval || 300000; // 5分

    return timeSinceLastEvent >= minInterval;
  }

  /**
   * リソース利用可能性チェック
   */
  private areResourcesAvailable(entity: any, gameContext: AIGameContext): boolean {
    if (!entity.resourceRequirements) return true;

    const player = gameContext.currentState.player;
    if (!player) return false;

    // HP/MPチェック (statsオブジェクトから取得)
    if (entity.resourceRequirements.hp && (player.stats?.hp || player.stats?.hitPoints || 100) < entity.resourceRequirements.hp) {
      return false;
    }
    if (entity.resourceRequirements.mp && (player.stats?.mp || player.stats?.magicPoints || 100) < entity.resourceRequirements.mp) {
      return false;
    }

    return true;
  }

  /**
   * 関連エンティティ取得
   */
  private async getRelatedEntities(entityId: ID, gameContext: AIGameContext): Promise<any[]> {
    if (!this.relationshipGraph) return [];

    const relationships = this.relationshipGraph?.relationships?.[entityId] || [];
    const relatedEntities: any[] = [];

    for (const relationship of relationships) {
      const relatedEntity = await this.fetchEntityById(relationship.targetId);
      if (relatedEntity && this.isRelationshipRelevant(relationship, gameContext)) {
        relatedEntities.push(relatedEntity);
      }
    }

    return relatedEntities;
  }

  /**
   * 関係の関連性チェック
   */
  private isRelationshipRelevant(relationship: any, gameContext: AIGameContext): boolean {
    // 関係の強度が十分かチェック
    if (relationship.strength < 0.3) return false;

    // 現在のコンテキストで有効な関係かチェック
    if (relationship.context && !gameContext.contextTags?.includes(relationship.context)) {
      return false;
    }

    return true;
  }

  /**
   * ゲームコンテキストをGameStateに変換
   */
  private convertToGameState(gameContext: AIGameContext): GameState {
    return {
      player: {
        id: gameContext.currentState.player?.id || '',
        name: gameContext.currentState.player?.name || '',
        level: gameContext.currentState.player?.level || 1,
        location: gameContext.currentState.player?.location || '',
        stats: gameContext.currentState.player?.stats || {},
        items: gameContext.currentState.player?.items || [],
        status: gameContext.currentState.player?.status || [],
        relationships: gameContext.currentState.player?.relationships || {}
      },
      world: {
        time: gameContext.currentState.time?.hour || 0,
        weather: typeof gameContext.currentState.weather === 'string' 
          ? gameContext.currentState.weather 
          : gameContext.currentState.weather?.type || 'clear',
        events: gameContext.contextTags || [],
        flags: gameContext.currentState.flags || {}
      },
      session: {
        turn: gameContext.metadata?.turn || 1,
        phase: this.mapSessionModeToPhase(gameContext.sessionMode) || 'exploration',
        location: gameContext.currentState.player?.location || '',
        npcs_present: gameContext.npcsPresent || []
      }
    };
  }

  /**
   * セッションモードをGameStateのphaseにマッピング
   */
  private mapSessionModeToPhase(sessionMode?: string): 'exploration' | 'combat' | 'social' | 'rest' {
    switch (sessionMode) {
      case 'combat':
        return 'combat';
      case 'social':
      case 'conversation':
        return 'social';
      case 'rest':
      case 'break':
        return 'rest';
      case 'exploration':
      case 'planning':
      default:
        return 'exploration';
    }
  }

  /**
   * 適用されたフィルタ一覧取得
   */
  private getAppliedFilters(filter: AIQueryFilter): string[] {
    const applied: string[] = [];
    if (filter.tags) applied.push('tags');
    if (filter.priority) applied.push('priority');
    if (filter.location) applied.push('location');
    if (filter.conditions) applied.push('conditions');
    if (filter.contextFactors) applied.push('contextFactors');
    if (filter.timeConstraints) applied.push('timeConstraints');
    return applied;
  }

  /**
   * コンテキスト要因一覧取得
   */
  private getContextFactors(gameContext: AIGameContext): string[] {
    const factors: string[] = [];
    if (gameContext.currentState.story) factors.push('story_context');
    if (gameContext.currentState.player) factors.push('player_context');
    if (gameContext.sessionId) factors.push('session_context');
    if (gameContext.contextTags) factors.push('tag_context');
    return factors;
  }

  /**
   * データベースからエンティティ取得（簡略化）
   */
  private async fetchEntitiesFromDatabase(_type: string): Promise<any[]> {
    // 実際の実装ではデータベースクエリを実行
    // ここでは簡略化してモックデータを返す
    return [];
  }

  /**
   * IDでエンティティ取得
   */
  private async fetchEntityById(_id: ID): Promise<any | null> {
    // 実際の実装ではデータベースクエリを実行
    return null;
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.entityCache.clear();
  }

  /**
   * キャッシュサイズ取得
   */
  getCacheSize(): number {
    return this.entityCache.size;
  }
}

export const aiQueryProcessor = new AIQueryProcessor();