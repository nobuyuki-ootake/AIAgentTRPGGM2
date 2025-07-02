// ==========================================
// エンティティ関係性管理関連型定義
// ==========================================

import { ID, DateTime } from '../base';
import { AIConditionExpression } from './ai-conditions';

// ==========================================
// AI関係性管理
// ==========================================

export interface EntityRelationship {
  id: ID;
  sourceEntityId: ID;
  targetEntityId: ID;
  targetId?: ID; // 互換性のため
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

export interface LocationEntityMapping {
  locationId: ID;
  entityId: ID;
  entityType: string;
  conditions: AIConditionExpression[];
  spawnProbability: number;
}

// ==========================================
// 型ガード関数（関係性用）
// ==========================================

export function isAIIntegratedEntity(entity: any): entity is AIIntegratedEntityBase {
  return entity && entity.aiProcessor && entity.aiContext;
}

export function isEntityRelationshipGraph(obj: any): obj is EntityRelationshipGraph {
  return obj && obj.relationships && obj.metadata && typeof obj.metadata.totalNodes === 'number';
}

// ==========================================
// マイルストーン専用エンティティ関係性型定義
// ==========================================

export type EntityRelationshipType = 
  | 'sequential'     // 順序関係：A→B→Cの順番でクリア
  | 'required_all'   // AND条件：すべてのエンティティをクリア
  | 'required_any'   // OR条件：いずれかのエンティティをクリア
  | 'story_meaning'; // 物語的意味：特定の組み合わせで物語が進む

export interface EntityRelationshipRule {
  type: EntityRelationshipType;
  entityIds: ID[];
  description: string;
  storyMeaning?: string;     // story_meaningタイプ時の物語的説明
  completionWeight: number;  // このルールの完了がマイルストーン全体に与える重み（0-1）
  isOptional: boolean;       // このルールはオプショナルか
}

export interface EntityRelationships {
  rules: EntityRelationshipRule[];
  globalStoryMeaning: string;  // このマイルストーン全体の物語的意味
  completionCondition: 'all_rules' | 'any_rule' | 'weighted_threshold'; // 完了条件
  weightedThreshold?: number;  // weighted_threshold時の閾値（0-1）
  narrativeProgression: {
    startNarrative: string;    // マイルストーン開始時の物語
    progressNarrative: string; // 進行中の物語変化
    completionNarrative: string; // 完了時の物語変化
  };
}