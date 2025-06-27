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
  level: number;
  
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
  
  // タイムライン
  startDate: DateTime;
  estimatedEndDate?: DateTime;
  lastPlayedDate?: DateTime;
  
  // メタデータ
  createdAt: DateTime;
  updatedAt: DateTime;
  tags: string[];
  imageUrl?: string;
}

export interface WorldSettings {
  // 世界観設定
  techLevel: 'stone_age' | 'medieval' | 'renaissance' | 'industrial' | 'modern' | 'futuristic';
  magicLevel: 'none' | 'low' | 'medium' | 'high' | 'ubiquitous';
  scale: 'local' | 'regional' | 'continental' | 'global' | 'planar';
  
  // ゲームプレイ設定
  playerCount: number;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  playStyle: 'combat_heavy' | 'roleplay_heavy' | 'exploration_heavy' | 'balanced';
  sessionLength: number; // 分
  
  // ハウスルール
  houseRules: string[];
  customContent: boolean;
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
  currentObjectiveIndex: number;
  
  // 関連情報
  questGiverId?: ID;
  campaignId: ID;
  locationIds: ID[]; // 関連する場所
  characterIds: ID[]; // 関連するキャラクター
  
  // 報酬
  experienceReward: number;
  goldReward: number;
  itemRewards: ID[];
  storyRewards: string[];
  
  // 進行管理
  startDate?: DateTime;
  completionDate?: DateTime;
  timeLimit?: DateTime;
  
  // メタデータ
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme';
  estimatedDuration: number; // セッション数
  prerequisites: string[];
  
  // プレイヤー追跡
  playerNotes: string[];
  gmNotes: string[];
}

export interface QuestObjective {
  id: ID;
  description: string;
  isCompleted: boolean;
  isOptional: boolean;
  completionCondition: string;
  hints: string[];
  relatedLocationIds: ID[];
  relatedCharacterIds: ID[];
  relatedItemIds: ID[];
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