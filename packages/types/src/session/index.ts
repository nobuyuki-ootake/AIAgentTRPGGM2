// ==========================================
// セッション・タイムライン型定義
// ==========================================

import { ID, DateTime } from '../base';

// ==========================================
// セッション管理
// ==========================================

export type SessionStatus = 'preparing' | 'active' | 'paused' | 'completed' | 'cancelled';
export type SessionMode = 'exploration' | 'combat' | 'social' | 'rest' | 'planning';

export interface TRPGSession {
  id: ID;
  campaignId: ID;
  name: string;
  description: string;
  status: SessionStatus;
  mode: SessionMode;
  
  // 時間管理
  scheduledStartTime: DateTime;
  actualStartTime?: DateTime;
  actualEndTime?: DateTime;
  estimatedDuration: number; // 分
  
  // 参加者
  players: ID[]; // プレイヤーIDの配列
  characterIds: ID[]; // 参加キャラクターIDの配列
  gameMasterId: ID;
  
  // セッション設定
  notes: string;
  sessionNumber: number;
  isRecordingEnabled: boolean;
  
  // 進行状況
  currentEventId?: ID;
  completedEvents: ID[];
  sessionLog: SessionLogEntry[];
}

export interface SessionLogEntry {
  id: ID;
  timestamp: DateTime;
  type: 'action' | 'dialogue' | 'system' | 'dice_roll' | 'note';
  characterId?: ID;
  content: string;
  metadata?: Record<string, any>;
}

// ==========================================
// イベント管理
// ==========================================

export type EventType = 'story' | 'combat' | 'social' | 'exploration' | 'puzzle' | 'rest';

export interface TRPGEvent {
  id: ID;
  title: string;
  description: string;
  type: EventType;
  
  // 時間管理
  scheduledDate: DateTime;
  duration: number; // 分
  actualStartTime?: DateTime;
  actualEndTime?: DateTime;
  
  // 関連情報
  questId?: ID;
  locationId?: ID; // 発生場所のID
  participants: ID[]; // 関連キャラクター (database schema uses 'participants')
  
  // 難易度設定
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme';
  challengeRating: number;
  
  // 実行結果
  outcomes: {
    success: boolean;
    experience: number;
    rewards: string[];
    consequences: string[];
    storyImpact: string[];
  };
  
  // AI生成・管理
  aiGenerated: boolean;
  seedPrompt?: string;
  
  // タイムスタンプ
  createdAt: DateTime;
  updatedAt: DateTime;
  completedAt?: DateTime;
}

// ==========================================
// セッション持続時間管理
// ==========================================

export type SessionDurationType = 'short' | 'medium' | 'long' | 'custom';

export interface DayPeriodConfig {
  id: string;
  name: string;
  description: string;
  order: number;
  icon: string;
}

export interface SessionDurationConfig {
  type: SessionDurationType;
  totalDays: number;
  actionsPerDay: number;
  dayPeriods: DayPeriodConfig[];
  estimatedPlayTime: number; // 分
  milestoneCount: number;
  description: string;
}

// 日単位分割システム定義
export const DAY_PERIODS_3_ACTIONS: DayPeriodConfig[] = [
  { id: 'morning', name: '朝', description: '1日の始まり。情報収集や準備に適した時間', order: 0, icon: 'morning' },
  { id: 'day', name: '昼', description: 'メインの活動時間。探索や調査、戦闘など', order: 1, icon: 'day' },
  { id: 'night', name: '夜', description: '1日の終わり。休息や振り返りの時間', order: 2, icon: 'night' }
];

export const DAY_PERIODS_4_ACTIONS: DayPeriodConfig[] = [
  { id: 'morning', name: '朝', description: '1日の始まり。情報収集や準備に適した時間', order: 0, icon: 'morning' },
  { id: 'day', name: '昼', description: 'メインの活動時間。探索や調査など', order: 1, icon: 'day' },
  { id: 'evening', name: '夕方', description: '社交や情報交換に適した時間', order: 2, icon: 'evening' },
  { id: 'night', name: '夜', description: '1日の終わり。休息や振り返りの時間', order: 3, icon: 'night' }
];

// セッション時間の事前定義
export const SESSION_DURATION_PRESETS: Record<SessionDurationType, SessionDurationConfig> = {
  short: {
    type: 'short',
    totalDays: 3,
    actionsPerDay: 3,
    dayPeriods: DAY_PERIODS_3_ACTIONS,
    estimatedPlayTime: 30,
    milestoneCount: 1,
    description: '短時間プレイ: 3日間、日単位分割数3回、1つの最終マイルストーン、約30分'
  },
  medium: {
    type: 'medium',
    totalDays: 7,
    actionsPerDay: 4,
    dayPeriods: DAY_PERIODS_4_ACTIONS,
    estimatedPlayTime: 70,
    milestoneCount: 3,
    description: '中時間プレイ: 7日間、日単位分割数4回、3つのマイルストーン（中間2つ）、約70分'
  },
  long: {
    type: 'long',
    totalDays: 11,
    actionsPerDay: 4,
    dayPeriods: DAY_PERIODS_4_ACTIONS,
    estimatedPlayTime: 120,
    milestoneCount: 5,
    description: '長時間プレイ: 11日間、日単位分割数4回、5つのマイルストーン（中間3つ、最終条件分岐）、約2時間'
  },
  custom: {
    type: 'custom',
    totalDays: 5,
    actionsPerDay: 3,
    dayPeriods: DAY_PERIODS_3_ACTIONS,
    estimatedPlayTime: 60,
    milestoneCount: 2,
    description: 'カスタム設定: 自由に設定可能'
  }
};

// ==========================================
// 時間管理型定義
// ==========================================

export interface DayPeriod {
  id: string;
  name: string;
  description: string;
  order: number;
  icon?: string; // 互換性のため
  actionsAllowed?: number; // 互換性のため
  isRestPeriod?: boolean; // 互換性のため
}

export interface GameDay {
  id: ID;
  sessionId?: ID; // optional for compatibility
  campaignId?: ID; // 互換性のため
  dayNumber: number;
  currentPeriod: string;
  currentDayPeriod?: string | number; // 互換性のため
  completedPeriods: string[];
  events: DayEvent[];
  isComplete: boolean;
  actionsRemaining?: number;
  completedAt?: DateTime;
  createdAt: DateTime;
  updatedAt?: DateTime;
}

export interface DayEvent {
  id: ID;
  dayId?: ID; // 互換性のため
  period?: string;
  dayPeriod?: string | number; // 互換性のため
  description: string;
  completed?: boolean; // 互換性のため
  timestamp: DateTime;
  type?: string;
  characterId?: ID;
  metadata?: Record<string, any>;
}

export interface TurnState {
  id?: ID; // 互換性のため
  sessionId: ID;
  campaignId?: ID; // 互換性のため
  currentDay: number;
  maxDays?: number; // 互換性のため
  currentPeriod: string;
  currentPhase?: string; // 互換性のため
  activeCharacterId?: ID; // 互換性のため
  turnOrder?: any[]; // 互換性のため
  phaseStartTime?: DateTime; // 互換性のため
  totalDays: number;
  actionsPerDay: number;
  dayPeriods: DayPeriod[];
  settings?: TurnSettings; // 互換性のため
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface TurnSettings {
  actionsPerDay: number;
  dayPeriods: DayPeriod[];
  totalDays: number;
  maxActionsPerDay?: number; // 互換性のため
  maxDays?: number; // 互換性のため
  autoProgressDay?: boolean;
  restRequired?: boolean;
  simultaneousTurns?: boolean;
}

// ==========================================
// セッション状態管理（データベース用）
// ==========================================

// ==========================================
// パーティ位置管理
// ==========================================

export interface PartyLocation {
  sessionId: string;
  currentLocationId: string;
  memberIds: string[];
  lastMoveTime: DateTime;
  moveInitiator?: string; // 移動提案者
  movementHistory: Array<{
    fromLocationId: string;
    toLocationId: string;
    timestamp: DateTime;
    initiator: string;
    reason?: string;
  }>;
}

export interface MovementProposal {
  id: string;
  proposerId: string;
  destinationId: string;
  destinationName: string;
  reason: string;
  estimatedTime: number;
  dangerLevel: 'safe' | 'moderate' | 'dangerous';
  requiredConsensus: boolean; // 危険な場所は合意必須
  votes: Array<{
    characterId: string;
    decision: 'agree' | 'disagree' | 'abstain';
    comment?: string;
    timestamp: DateTime;
  }>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: DateTime;
  expiresAt: DateTime;
}

export interface SessionState {
  id: ID;
  campaignId: ID;
  sessionNumber: number;
  status: SessionStatus;
  mode: SessionMode;
  participants: string[]; // 参加者ID配列
  gamemaster: string;
  startTime?: DateTime;
  endTime?: DateTime;
  breaks: Array<{ start: DateTime; end: DateTime }>;
  currentEvent?: string;
  eventQueue: string[];
  completedEvents: string[];
  
  // パーティ位置管理
  partyLocation: PartyLocation;
  currentMovementProposal?: MovementProposal;
  
  // 例外的分離行動
  separatedMembers?: Array<{
    characterId: string;
    temporaryLocationId: string;
    reunionPlan: string;
    separationTime: DateTime;
  }>;
  
  combat?: {
    active: boolean;
    currentTurn: number;
    turnOrder: Array<{
      characterId: string;
      initiative: number;
      hasActed: boolean;
    }>;
    round: number;
    conditions: any[];
  };
  chatLog: ChatMessage[];
  diceRolls: DiceRoll[];
  notes: {
    gm: string;
    players: Record<string, string>;
    shared: string;
  };
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface ChatMessage {
  id: ID;
  timestamp: DateTime;
  speaker: string;
  characterId?: ID;
  message: string;
  type: 'ic' | 'ooc' | 'system' | 'private';
  recipients?: string[];
}

export interface DiceRoll {
  id: ID;
  timestamp: DateTime;
  roller: string;
  characterId?: ID;
  dice: string;
  results: number[];
  total: number;
  purpose: string;
  target?: number;
  success?: boolean;
}

// ==========================================
// タイムライン
// ==========================================

export interface Timeline {
  id: ID;
  campaignId: ID;
  name: string;
  description: string;
  startDate: DateTime;
  endDate?: DateTime;
  events: ID[]; // TimelineEntry のID配列
}

export interface TimelineEntry {
  id: ID;
  timelineId: ID;
  date: DateTime;
  title: string;
  description: string;
  type: 'event' | 'milestone' | 'session' | 'note';
  relatedIds: ID[]; // 関連するイベント、キャラクター、場所など
  isCompleted: boolean;
  tags: string[];
}