// ==========================================
// マイルストーン・エンティティプール関連型定義
// ==========================================

import { ID, DateTime } from '../base';
import { AIConditionExpression } from './ai-conditions';
import { EntityRelationships } from './entity-relationships';

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
  
  // 🆕 Phase1で追加: エンティティ関係性管理（後方互換性のため）
  entityRelationships?: EntityRelationships;
  
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
// 拡張AIMilestone（Phase1で拡張予定）
// ==========================================

export interface AIMilestone {
  id: ID;
  name: string;
  description: string;
  type: 'story' | 'combat' | 'exploration' | 'social';
  conditions: AIConditionExpression[];
  rewards: Record<string, any>;
  difficulty: number;
  estimatedTime: number;
  
  // 🆕 Phase1で追加: エンティティ関係性管理
  entityRelationships?: EntityRelationships;
}

export interface EntityPool {
  id: ID;
  name: string;
  description: string;
  entities: any[];
  conditions: AIConditionExpression[];
  priority: number;
}

export interface EntityPoolCollection {
  id: ID;
  campaignId: ID;
  pools: EntityPool[];
  metadata: Record<string, any>;
}

// ==========================================
// マイルストーン生成関連
// ==========================================

export interface MilestoneGenerationRequest {
  campaignId: ID;
  theme: string;
  difficulty: number;
  previousMilestones: string[];
  playerPreferences: string[];
}

export interface MilestoneGenerationResponse {
  milestones: AIMilestone[];
  narrative: string;
  estimatedDuration: number;
}

// ==========================================
// 統合マイルストーン型（Phase1で追加）
// ==========================================

// 統合マイルストーン型: 既存のAIPoolMilestoneと新しいAIMilestoneの両方をサポート
export type UnifiedMilestone = AIPoolMilestone | AIMilestone;

// マイルストーン型の基本情報を取得するヘルパー型
export interface MilestoneBaseInfo {
  id: ID;
  name: string;
  description: string;
  entityRelationships?: EntityRelationships;
}

// ==========================================
// 型ガード関数とユーティリティ関数
// ==========================================

// AIPoolMilestone型かどうかを判定
export function isAIPoolMilestone(milestone: UnifiedMilestone): milestone is AIPoolMilestone {
  return 'title' in milestone && 'targetDetails' in milestone && 'progress' in milestone;
}

// AIMilestone型かどうかを判定
export function isAIMilestone(milestone: UnifiedMilestone): milestone is AIMilestone {
  return 'name' in milestone && 'conditions' in milestone && 'difficulty' in milestone;
}

// 統合マイルストーンから基本情報を取得
export function getMilestoneBaseInfo(milestone: UnifiedMilestone): MilestoneBaseInfo {
  if (isAIPoolMilestone(milestone)) {
    return {
      id: milestone.id,
      name: milestone.title, // AIPoolMilestoneではtitleがnameに相当
      description: milestone.description,
      entityRelationships: milestone.entityRelationships
    };
  } else {
    return {
      id: milestone.id,
      name: milestone.name,
      description: milestone.description,
      entityRelationships: milestone.entityRelationships
    };
  }
}

// AIPoolMilestoneからAIMilestoneへの変換
export function convertAIPoolMilestoneToAIMilestone(poolMilestone: AIPoolMilestone): AIMilestone {
  return {
    id: poolMilestone.id,
    name: poolMilestone.title,
    description: poolMilestone.description,
    type: poolMilestone.type === 'enemy_defeat' ? 'combat' : 
          poolMilestone.type === 'event_clear' ? 'exploration' :
          poolMilestone.type === 'npc_communication' ? 'social' : 'story',
    conditions: poolMilestone.targetDetails.specificConditions || [],
    rewards: {},
    difficulty: poolMilestone.aiDifficultyRating,
    estimatedTime: 0, // デフォルト値
    entityRelationships: poolMilestone.entityRelationships
  };
}