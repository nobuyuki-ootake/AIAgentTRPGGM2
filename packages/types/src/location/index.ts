// ==========================================
// 場所・キャンペーン管理型定義
// ==========================================

import { ID, DateTime } from '../base';

// ==========================================
// 場所管理システム
// ==========================================

export interface Location {
  id: ID;
  name: string;
  description: string;
  type: 'region' | 'settlement' | 'building' | 'room' | 'dungeon' | 'wilderness' | 'landmark';
  
  // 階層構造
  parentLocationId?: ID;
  childLocationIds: ID[];
  
  // 地理情報
  coordinates?: { x: number; y: number };
  climate: string;
  terrain: string[];
  
  // ゲームプレイ要素
  npcs: ID[]; // この場所にいるNPC
  items: ID[]; // この場所にあるアイテム
  events: ID[]; // この場所で発生するイベント
  
  // 訪問記録
  isDiscovered: boolean;
  firstVisitDate?: DateTime;
  visitCount: number;
  
  // メタデータ
  tags: string[];
  imageUrl?: string;
  mapData?: LocationMapData;
}

export interface LocationMapData {
  mapImageUrl?: string;
  exits: LocationExit[];
  pointsOfInterest: PointOfInterest[];
}

export interface LocationExit {
  direction: string;
  targetLocationId: ID;
  description: string;
  isLocked: boolean;
  requirements?: string[];
}

export interface PointOfInterest {
  id: ID;
  name: string;
  description: string;
  coordinates: { x: number; y: number };
  type: 'npc' | 'item' | 'event' | 'entrance' | 'decoration';
  relatedId?: ID;
}

// ==========================================
// キャンペーン管理
// ==========================================

export type CampaignStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface TRPGCampaign {
  id: ID;
  name: string;
  description: string;
  status: CampaignStatus;
  
  // 設定情報
  system: string; // D&D 5e, Pathfinder など
  theme: string;
  setting: string;
  settings?: any; // 互換性のための追加（将来的に削除予定）
  level: number;
  currentLevel?: number; // 互換性のための追加（将来的に削除予定）
  
  // 参加者
  gameMasterId: ID;
  playerIds: ID[];
  characterIds: ID[]; // 参加キャラクター
  
  // 世界設定
  worldSettings: WorldSettings;
  
  // 進行管理
  sessions: ID[]; // セッションIDの配列
  currentSessionId?: ID;
  mainQuestId?: ID;
  
  // エンティティ管理（データベース互換用）
  characters?: ID[]; // キャラクターIDの配列
  quests?: ID[]; // クエストIDの配列
  events?: ID[]; // イベントIDの配列
  locations?: Location[]; // 場所の配列
  factions?: any[]; // 派閥の配列
  
  // タイムライン
  startDate: DateTime;
  estimatedEndDate?: DateTime;
  endDate?: DateTime; // 互換性のための追加（将来的に削除予定）
  lastPlayedDate?: DateTime;
  expectedDuration?: number; // 予想所要時間（セッション数）
  
  // 目標設定
  goals?: {
    mainQuest: string;
    subQuests: string[];
    characterGoals: Record<string, string>;
    storyArcs: string[];
  };
  
  // メタデータ
  createdAt: DateTime;
  updatedAt: DateTime;
  lastPlayedAt?: DateTime; // データベース互換用（lastPlayedDateのエイリアス）
  totalPlayTime?: number; // 総プレイ時間（分）
  notes?: any; // JSON形式のメモ
  aiContent?: any; // AI生成コンテンツ
  tags: string[];
  imageUrl?: string;
}

export interface WorldSettings {
  // 世界観設定
  techLevel: 'stone_age' | 'medieval' | 'renaissance' | 'industrial' | 'modern' | 'futuristic';
  magicLevel: 'none' | 'low' | 'medium' | 'high' | 'ubiquitous';
  scale: 'local' | 'regional' | 'continental' | 'global' | 'planar';
  themes: string[]; // 世界観のテーマ
  restrictions: string[]; // 制限事項
  
  // ゲームプレイ設定
  playerCount?: number;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  playStyle?: 'combat_heavy' | 'roleplay_heavy' | 'exploration_heavy' | 'balanced';
  sessionLength?: number; // 分
  
  // ハウスルール
  houseRules?: string[];
  customContent?: boolean;
}

// ==========================================
// クエスト管理
// ==========================================

export type QuestStatus = 'not_started' | 'active' | 'completed' | 'failed' | 'cancelled';
export type QuestType = 'main' | 'side' | 'personal' | 'faction' | 'exploration';

export interface Quest {
  id: ID;
  title: string;
  description: string;
  type: QuestType;
  status: QuestStatus;
  
  // 構造
  objectives: QuestObjective[];
  currentObjectiveIndex?: number; // 互換性のため
  
  // 関連情報
  questGiverId?: ID;
  campaignId: ID;
  locationIds?: ID[]; // 互換性のため
  characterIds?: ID[]; // 互換性のため
  
  // 報酬
  experienceReward?: number; // 互換性のため
  goldReward?: number; // 互換性のため
  itemRewards?: ID[]; // 互換性のため
  storyRewards?: string[]; // 互換性のため
  rewards?: {
    experience?: number;
    currency?: number;
    items?: any[];
    reputation?: Record<string, any>;
    storyProgression?: any[];
  };
  
  // 進行管理
  startDate?: DateTime;
  completionDate?: DateTime;
  timeLimit?: DateTime;
  
  // メタデータ
  difficulty?: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme'; // 互換性のため
  estimatedDuration?: number; // 互換性のため
  prerequisites?: string[]; // 互換性のため
  
  // プレイヤー追跡
  playerNotes?: string[]; // 互換性のため
  gmNotes?: string[]; // 互換性のため
  
  // 互換性のため追加
  followups?: ID[];
  giver?: string;
  location?: string;
  level?: number;
  createdAt?: DateTime;
  updatedAt?: DateTime;
  completedAt?: DateTime;
}

export interface QuestObjective {
  id: ID;
  description: string;
  isCompleted?: boolean; // 互換性のため
  isOptional?: boolean; // 互換性のため
  completionCondition?: string; // 互換性のため
  hints?: string[]; // 互換性のため
  relatedLocationIds?: ID[]; // 互換性のため
  relatedCharacterIds?: ID[]; // 互換性のため
  relatedItemIds?: ID[]; // 互換性のため
  
  // 互換性のため追加
  completed?: boolean; // isCompletedのエイリアス
  optional?: boolean; // isOptionalのエイリアス
  progress?: number;
  requirements?: any[];
}

// ==========================================
// 定数定義
// ==========================================

export const CHARACTER_TYPES = ['PC', 'NPC', 'Enemy'] as const;
export const SESSION_STATUSES = ['preparing', 'active', 'paused', 'completed', 'cancelled'] as const;
export const CAMPAIGN_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const;
export const QUEST_STATUSES = ['not_started', 'active', 'completed', 'failed', 'cancelled'] as const;
export const EVENT_TYPES = ['story', 'combat', 'social', 'exploration', 'puzzle', 'rest'] as const;
export const DIFFICULTY_LEVELS = ['trivial', 'easy', 'medium', 'hard', 'extreme'] as const;

// ==========================================
// 追加の型定義（エラー修正用）
// ==========================================

export interface LocationQuery {
  currentLocation: ID;
  radius: number;
  filters: Record<string, any>;
}

export interface LocationMovement {
  fromLocation: ID;
  toLocation: ID;
  characterId: ID;
  timestamp: DateTime;
  method: string;
}

export interface LocationInteraction {
  locationId: ID;
  characterId: ID;
  interactionType: string;
  result: string;
  timestamp: DateTime;
}

export interface Milestone {
  id: ID;
  campaignId: ID;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'not_started';
  conditions: any[];
  rewards: Record<string, any>;
  order: number;
  
  // 追加プロパティ（互換性のため）
  title?: string;
  category?: string;
  importance?: number;
  progress?: number;
  requirements?: any[];
  prerequisites?: ID[];
  unlocks?: ID[];
  dependencies?: ID[];
  estimatedTimeToComplete?: number;
  estimatedTime?: number;
  difficulty?: number;
  tags?: string[];
  completedAt?: DateTime;
  createdBy?: string;
  createdAt?: DateTime;
  updatedAt?: DateTime;
}

// 追加の型定義
export interface ProgressTracker {
  id: ID;
  campaignId?: ID; // 互換性のため
  milestoneId?: ID; // 互換性のため
  currentProgress?: number; // 互換性のため
  targetProgress?: number; // 互換性のため
  lastUpdated?: DateTime; // 互換性のため
  overallProgress?: any;
  categoryProgress?: any;
  recentAchievements?: any;
  upcomingMilestones?: any[];
  statistics?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface LevelUpEvent {
  id: ID;
  characterId: ID;
  campaignId?: ID; // 互換性のため
  fromLevel?: number; // 互換性のため
  toLevel?: number; // 互換性のため
  previousLevel?: number; // 互換性のため
  newLevel?: number; // 互換性のため
  timestamp?: DateTime; // 互換性のため
  rewards?: Record<string, any>; // 互換性のため
  experienceGained?: any;
  totalExperience?: any;
  statIncreases?: any;
  statImprovements?: any;
  newSkills?: any[];
  newAbilities?: any;
  newFeats?: any; // 互換性のため
  hitPointIncrease?: any; // 互換性のため
  pendingChoices?: any; // 互換性のため
  milestoneId?: ID;
  source?: string;
}

export interface CampaignCompletion {
  id: ID;
  campaignId: ID;
  completedAt?: DateTime; // 互換性のため
  finalScore?: number; // 互換性のため
  achievements?: string[]; // 互換性のため
  isCompleted?: boolean;
  completionPercentage?: number;
  completionType?: 'success' | 'failure' | 'abandoned';
  completionDate?: string;
  completionNotes?: any;
  winConditions?: any[];
  failConditions?: any[];
  availableEndings?: any[];
  finalStatistics?: any;
}

// 型ガード関数
export function isTRPGCampaign(campaign: any): campaign is TRPGCampaign {
  return campaign && typeof campaign.name === 'string' && Array.isArray(campaign.playerIds);
}