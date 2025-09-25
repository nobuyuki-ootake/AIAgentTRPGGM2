/**
 * AI Entity Condition Evaluator
 * JSON条件式の動的評価システム
 */

import { AIConditionExpression } from '@ai-agent-trpg/types';

export interface GameState {
  player: {
    id: string;
    name: string;
    level: number;
    location: string;
    stats: Record<string, number>;
    items: string[];
    status: string[];
    relationships: Record<string, number>;
  };
  world: {
    time: number;
    weather: string;
    events: string[];
    flags: Record<string, boolean>;
  };
  session: {
    turn: number;
    phase: 'exploration' | 'combat' | 'social' | 'rest';
    location: string;
    npcs_present: string[];
  };
}

export interface EvaluationContext {
  entityId: string;
  entityType: 'item' | 'quest' | 'event' | 'npc' | 'enemy';
  gameState: GameState;
  metadata?: Record<string, any>;
}

export class ConditionEvaluator {
  /**
   * AIConditionExpressionを動的に評価
   */
  async evaluateCondition(
    condition: AIConditionExpression,
    context: EvaluationContext
  ): Promise<boolean> {
    try {
      switch (condition.type) {
        case 'simple':
          return this.evaluateSimpleCondition(condition, context);
        case 'compound':
          return this.evaluateCompoundCondition(condition, context);
        case 'function':
          return this.evaluateFunctionCondition(condition, context);
        case 'contextual':
          return this.evaluateContextualCondition(condition, context);
        default:
          console.warn(`Unknown condition type: ${condition.type}`);
          return false;
      }
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  /**
   * 単純条件の評価
   */
  private evaluateSimpleCondition(
    condition: AIConditionExpression,
    context: EvaluationContext
  ): boolean {
    const { field, operator, value } = condition;
    const fieldValue = this.getFieldValue(field || '', context);

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'greater_equal':
        return Number(fieldValue) >= Number(value);
      case 'less_equal':
        return Number(fieldValue) <= Number(value);
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(value);
        }
        return String(fieldValue).includes(String(value));
      case 'not_contains':
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(value);
        }
        return !String(fieldValue).includes(String(value));
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * 複合条件の評価（AND/OR/NOT）
   */
  private async evaluateCompoundCondition(
    condition: AIConditionExpression,
    context: EvaluationContext
  ): Promise<boolean> {
    const { operator, conditions } = condition;

    if (!conditions || conditions.length === 0) {
      return false;
    }

    switch (operator) {
      case 'and':
        for (const subCondition of conditions) {
          const result = await this.evaluateCondition(subCondition, context);
          if (!result) return false;
        }
        return true;

      case 'or':
        for (const subCondition of conditions) {
          const result = await this.evaluateCondition(subCondition, context);
          if (result) return true;
        }
        return false;

      case 'not':
        if (conditions.length !== 1) {
          console.warn('NOT operator requires exactly one condition');
          return false;
        }
        const result = await this.evaluateCondition(conditions[0], context);
        return !result;

      default:
        console.warn(`Unknown compound operator: ${operator}`);
        return false;
    }
  }

  /**
   * 関数型条件の評価
   */
  private evaluateFunctionCondition(
    condition: AIConditionExpression,
    context: EvaluationContext
  ): boolean {
    const { function_name, parameters } = condition;

    switch (function_name) {
      case 'distance':
        return this.evaluateDistance(parameters, context);
      case 'has_item':
        return this.evaluateHasItem(parameters, context);
      case 'relationship_level':
        return this.evaluateRelationshipLevel(parameters, context);
      case 'time_between':
        return this.evaluateTimeBetween(parameters, context);
      case 'probability':
        return this.evaluateProbability(parameters, context);
      case 'dice_roll':
        return this.evaluateDiceRoll(parameters, context);
      default:
        console.warn(`Unknown function: ${function_name}`);
        return false;
    }
  }

  /**
   * コンテキスト依存条件の評価
   */
  private evaluateContextualCondition(
    condition: AIConditionExpression,
    context: EvaluationContext
  ): boolean {
    const { context_type, context_data } = condition;

    switch (context_type) {
      case 'story_phase':
        return this.evaluateStoryPhase(context_data, context);
      case 'player_behavior':
        return this.evaluatePlayerBehavior(context_data, context);
      case 'world_state':
        return this.evaluateWorldState(context_data, context);
      case 'session_context':
        return this.evaluateSessionContext(context_data, context);
      default:
        console.warn(`Unknown context type: ${context_type}`);
        return false;
    }
  }

  /**
   * フィールド値の取得（dot notation対応）
   */
  private getFieldValue(field: string, context: EvaluationContext): any {
    const path = field.split('.');
    let value: any = context.gameState;

    for (const key of path) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * 距離計算
   */
  private evaluateDistance(parameters: any, context: EvaluationContext): boolean {
    const { from, to, operator, value } = parameters;
    
    // 簡略化された距離計算（実際の実装では座標系を使用）
    const distance = this.calculateDistance(from, to, context);
    
    switch (operator) {
      case 'less_than':
        return distance < value;
      case 'greater_than':
        return distance > value;
      case 'equals':
        return distance === value;
      default:
        return false;
    }
  }

  /**
   * アイテム所持チェック
   */
  private evaluateHasItem(parameters: any, context: EvaluationContext): boolean {
    const { item_id, quantity = 1 } = parameters;
    const playerItems = context.gameState.player.items;
    
    if (Array.isArray(playerItems)) {
      const itemCount = playerItems.filter(id => id === item_id).length;
      return itemCount >= quantity;
    }
    
    return false;
  }

  /**
   * 関係レベルチェック
   */
  private evaluateRelationshipLevel(parameters: any, context: EvaluationContext): boolean {
    const { npc_id, operator, value } = parameters;
    const relationships = context.gameState.player.relationships;
    const currentLevel = relationships[npc_id] || 0;

    switch (operator) {
      case 'greater_than':
        return currentLevel > value;
      case 'less_than':
        return currentLevel < value;
      case 'equals':
        return currentLevel === value;
      case 'greater_equal':
        return currentLevel >= value;
      case 'less_equal':
        return currentLevel <= value;
      default:
        return false;
    }
  }

  /**
   * 時間範囲チェック
   */
  private evaluateTimeBetween(parameters: any, context: EvaluationContext): boolean {
    const { start, end } = parameters;
    const currentTime = context.gameState.world.time;
    return currentTime >= start && currentTime <= end;
  }

  /**
   * 確率評価
   */
  private evaluateProbability(parameters: any, _context: EvaluationContext): boolean {
    const { chance } = parameters;
    return Math.random() < chance;
  }

  /**
   * ダイスロール評価
   */
  private evaluateDiceRoll(parameters: any, _context: EvaluationContext): boolean {
    const { dice, sides, target, operator = 'greater_equal' } = parameters;
    let total = 0;
    
    for (let i = 0; i < dice; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }

    switch (operator) {
      case 'greater_than':
        return total > target;
      case 'greater_equal':
        return total >= target;
      case 'less_than':
        return total < target;
      case 'less_equal':
        return total <= target;
      case 'equals':
        return total === target;
      default:
        return false;
    }
  }

  /**
   * ストーリーフェーズ評価
   */
  private evaluateStoryPhase(contextData: any, context: EvaluationContext): boolean {
    const { required_phase, story_flags } = contextData;
    
    // 現在のセッションフェーズチェック
    if (required_phase && context.gameState.session.phase !== required_phase) {
      return false;
    }

    // ストーリーフラグチェック
    if (story_flags) {
      for (const flag of story_flags) {
        if (!context.gameState.world.flags[flag]) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * プレイヤー行動評価
   */
  private evaluatePlayerBehavior(contextData: any, context: EvaluationContext): boolean {
    const { behavior_pattern, threshold } = contextData;
    
    // 実装簡略化：メタデータからプレイヤー行動パターンを評価
    const behaviorScore = context.metadata?.playerBehaviorScore?.[behavior_pattern] || 0;
    return behaviorScore >= threshold;
  }

  /**
   * 世界状態評価
   */
  private evaluateWorldState(contextData: any, context: EvaluationContext): boolean {
    const { required_events, weather_conditions } = contextData;

    // 必要イベントチェック
    if (required_events) {
      for (const event of required_events) {
        if (!context.gameState.world.events.includes(event)) {
          return false;
        }
      }
    }

    // 天候条件チェック
    if (weather_conditions && !weather_conditions.includes(context.gameState.world.weather)) {
      return false;
    }

    return true;
  }

  /**
   * セッションコンテキスト評価
   */
  private evaluateSessionContext(contextData: any, context: EvaluationContext): boolean {
    const { turn_range, required_npcs, location_type } = contextData;

    // ターン範囲チェック
    if (turn_range) {
      const currentTurn = context.gameState.session.turn;
      if (currentTurn < turn_range.min || currentTurn > turn_range.max) {
        return false;
      }
    }

    // 必要NPC存在チェック
    if (required_npcs) {
      for (const npcId of required_npcs) {
        if (!context.gameState.session.npcs_present.includes(npcId)) {
          return false;
        }
      }
    }

    // 場所タイプチェック
    if (location_type && !context.gameState.session.location.includes(location_type)) {
      return false;
    }

    return true;
  }

  /**
   * 簡略化された距離計算
   */
  private calculateDistance(from: string, to: string, context: EvaluationContext): number {
    // 実装簡略化：場所名ベースの簡単な距離計算
    if (from === to) return 0;
    
    // プレイヤーの現在位置との距離
    if (from === 'player') {
      return context.gameState.player.location === to ? 0 : 1;
    }
    
    return 1; // デフォルト距離
  }

  /**
   * 複数条件の並列評価
   */
  async evaluateConditions(
    conditions: AIConditionExpression[],
    context: EvaluationContext
  ): Promise<boolean[]> {
    return Promise.all(
      conditions.map(condition => this.evaluateCondition(condition, context))
    );
  }

  /**
   * 条件評価のバッチ処理
   */
  async batchEvaluate(
    conditionBatches: { id: string; condition: AIConditionExpression }[],
    context: EvaluationContext
  ): Promise<{ id: string; result: boolean }[]> {
    const results = await Promise.all(
      conditionBatches.map(async ({ id, condition }) => ({
        id,
        result: await this.evaluateCondition(condition, context)
      }))
    );

    return results;
  }
}

export const conditionEvaluator = new ConditionEvaluator();