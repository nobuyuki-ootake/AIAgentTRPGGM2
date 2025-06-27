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
  characterIds: ID[]; // 関連キャラクター
  
  // 実行条件
  prerequisites: string[];
  isOptional: boolean;
  
  // 実行結果
  isCompleted: boolean;
  outcomes: string[];
  experience: number; // 獲得経験値
  rewards: string[]; // 報酬
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