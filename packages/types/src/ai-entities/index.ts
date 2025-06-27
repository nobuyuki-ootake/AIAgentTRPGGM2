// ==========================================
// AI基盤データ構造システム
// ==========================================

import { ID, DateTime } from '../base';

// ==========================================
// AI条件式システム
// ==========================================

export interface AIConditionExpression {
  id?: ID;
  type: 'simple' | 'compound' | 'function' | 'contextual';
  description?: string;
  priority?: number;
  field?: string;
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'and' | 'or' | 'not';
  value?: any;
  conditions?: AIConditionExpression[];
  function_name?: string;
  parameters?: any;
  context_type?: string;
  context_data?: any;
}

// ==========================================
// AIゲームコンテキスト
// ==========================================

export interface AIGameContext {
  sessionId: ID;
  campaignId: ID;
  sessionMode: 'exploration' | 'combat' | 'social' | 'rest' | 'planning';
  
  currentState: {
    player?: {
      id: string;
      name: string;
      level: number;
      location: string;
      stats: Record<string, number>;
      items: string[];
      status: string[];
      relationships: Record<string, number>;
    };
    time?: {
      hour: number;
      day: number;
      season: string;
    };
    weather?: string | {
      type: string;
      severity: number;
    };
    flags?: Record<string, boolean>;
    story?: {
      currentChapter?: string;
      progress?: number;
      keyEvents?: string[];
    };
  };
  
  recentHistory?: {
    events: Array<{
      type: string;
      description: string;
      timestamp: string;
      actualStartTime?: DateTime;
      scheduledDate?: DateTime;
    }>;
    actions: string[];
    decisions: Array<{
      choice: string;
      outcome: string;
      timestamp: string;
    }>;
  };
  
  metadata?: {
    turn?: number;
    difficulty?: number;
    pacing?: 'slow' | 'normal' | 'fast';
  };
  
  contextTags?: string[];
  npcsPresent?: string[];
}

// ==========================================
// AIクエリシステム
// ==========================================

export interface AIQueryFilter {
  entityTypes?: string[];
  priority?: {
    min: number;
    max: number;
  };
  tags?: string[];
  excludeIds?: ID[];
  conditions?: AIConditionExpression[];
  contextFactors?: Record<string, any>;
  timeConstraints?: {
    startTime?: DateTime;
    endTime?: DateTime;
  };
  location?: string;
  
  // AI判断フィルタ
  aiCriteria?: {
    recommendationScore?: {
      min: number; // 0-1
      max: number;
    };
    playerAlignment?: {
      min: number; // プレイヤー好みとの一致度
    };
    storyRelevance?: {
      min: number; // ストーリーとの関連度
    };
    difficultyMatch?: {
      target: number; // 目標難易度
      tolerance: number; // 許容範囲
    };
  };
}

export interface AIQueryResult<T = any> {
  entities: T[];
  totalCount: number;
  executionTime: number;
  relevanceScores: number[];
  metadata: {
    filtersApplied: string[];
    sortedBy: string;
    cacheHit: boolean;
    suggestions: string[];
  };
}

// ==========================================
// AI関係性管理
// ==========================================

export interface EntityRelationship {
  id: ID;
  sourceEntityId: ID;
  targetEntityId: ID;
  relationType: 'dependency' | 'conflict' | 'synergy' | 'sequence' | 'alternative' | 'prerequisite';
  strength: number; // 0-1
  bidirectional: boolean;
  conditions?: AIConditionExpression[];
  metadata?: {
    description?: string;
    createdAt: DateTime;
    lastValidated?: DateTime;
    validationCount: number;
  };
}

export interface EntityRelationshipGraph {
  relationships: Record<ID, EntityRelationship[]>;
  metadata: {
    totalNodes: number;
    totalEdges: number;
    lastUpdated: DateTime;
    validationStatus: 'valid' | 'needs_update' | 'invalid';
  };
}

// ==========================================
// AIマイルストーン・エンティティプール
// ==========================================

export type MilestoneType = 'enemy_defeat' | 'event_clear' | 'npc_communication' | 'item_acquisition' | 'quest_completion';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed';

export interface MilestoneTargetDetails {
  entityType: 'enemy' | 'event' | 'npc' | 'item' | 'quest';
  entityId: ID;
  requiredCount?: number;
  currentCount?: number;
  specificConditions?: AIConditionExpression[];
}

export interface AIPoolMilestone {
  id: ID;
  title: string;
  description: string;
  type: MilestoneType;
  status: MilestoneStatus;
  
  targetDetails: MilestoneTargetDetails;
  
  order: number;
  isFinal: boolean;
  isOptional: boolean;
  
  // 進行状況
  progress: number; // 0-1
  estimatedCompletion: DateTime;
  actualCompletion?: DateTime;
  
  // AI管理
  aiDifficultyRating: number; // 1-10
  adaptiveParameters: {
    playerSkillLevel: number;
    engagementScore: number;
    timeSpentRatio: number;
  };
  
  // 関連エンティティ
  relatedEntityIds: ID[];
  alternativeEntityIds: ID[];
  
  // メタデータ
  createdAt: DateTime;
  lastUpdated: DateTime;
  createdBy: 'ai' | 'gm' | 'player';
}

export interface MilestoneSchedule {
  milestoneId: ID;
  estimatedStartDay: number;
  estimatedDuration: number;
  dependencies: ID[];
  flexibilityRating: number; // 0-1: スケジュール調整の柔軟性
}

// ==========================================
// 型ガード関数（AI基盤システム用）
// ==========================================

export function isAIIntegratedEntity(entity: any): entity is AIIntegratedEntityBase {
  return entity && entity.aiProcessor && entity.aiContext;
}

export function isAIConditionExpression(obj: any): obj is AIConditionExpression {
  return obj && typeof obj.type === 'string' && ['simple', 'compound', 'function', 'contextual'].includes(obj.type);
}

export function isEntityRelationshipGraph(obj: any): obj is EntityRelationshipGraph {
  return obj && obj.relationships && obj.metadata && typeof obj.metadata.totalNodes === 'number';
}

export interface AIIntegratedEntityBase {
  id: ID;
  aiContext: {
    lastAccessed?: DateTime;
    accessCount: number;
    playerInteractionHistory: Array<{
      action: string;
      outcome: string;
      satisfaction: number; // 1-5
      timestamp: DateTime;
    }>;
  };
}