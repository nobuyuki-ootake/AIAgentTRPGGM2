/**
 * モック: 基本的なセッションデータ
 * t-WADA命名規則: mockSessions.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: ユニットテスト、セッション管理テスト、タイムライン表示テスト
 */

import { TRPGSession, TRPGEvent, SessionLogEntry, ChatMessage, DiceRoll } from '@ai-agent-trpg/types';

// ===================================
// セッション基本データ
// ===================================

// 基本的なテストセッション
export const mockSession: TRPGSession = {
  id: 'mock-session-001',
  campaignId: 'mock-campaign-001',
  name: 'モックセッション：基本テスト',
  description: 'ユニットテスト用のセッションデータ',
  status: 'preparing',
  mode: 'exploration',
  
  // 時間管理
  scheduledStartTime: '2024-01-01T19:00:00Z',
  estimatedDuration: 180, // 3時間
  
  // 参加者
  players: ['mock-player-001', 'mock-player-002'],
  characterIds: ['mock-character-001', 'mock-character-002'],
  gameMasterId: 'mock-gm-001',
  
  // セッション設定
  notes: 'テスト用セッションノート',
  sessionNumber: 1,
  isRecordingEnabled: false,
  
  // 進行状況
  completedEvents: [],
  sessionLog: []
};

// 進行中セッション
export const mockSessionActive: TRPGSession = {
  id: 'mock-session-active',
  campaignId: 'mock-campaign-001',
  name: 'モックセッション：進行中',
  description: '進行中のセッションテストデータ',
  status: 'active',
  mode: 'combat',
  
  scheduledStartTime: '2024-01-01T19:00:00Z',
  actualStartTime: '2024-01-01T19:05:00Z',
  estimatedDuration: 180,
  
  players: ['mock-player-001', 'mock-player-002', 'mock-player-003'],
  characterIds: ['mock-character-001', 'mock-character-002', 'mock-character-003'],
  gameMasterId: 'mock-gm-001',
  
  notes: '進行中セッションのノート',
  sessionNumber: 3,
  isRecordingEnabled: true,
  
  currentEventId: 'mock-event-combat-001',
  completedEvents: ['mock-event-exploration-001', 'mock-event-social-001'],
  sessionLog: [
    {
      id: 'mock-log-001',
      timestamp: '2024-01-01T19:10:00Z',
      type: 'action',
      characterId: 'mock-character-001',
      content: 'ゴブリンに攻撃',
      metadata: { action: 'attack', target: 'goblin-001' }
    },
    {
      id: 'mock-log-002',
      timestamp: '2024-01-01T19:11:00Z',
      type: 'dice_roll',
      characterId: 'mock-character-001',
      content: 'ダイス振り: 1d20+5 = 18',
      metadata: { dice: '1d20+5', result: 18, success: true }
    }
  ]
};

// 完了済みセッション
export const mockSessionCompleted: TRPGSession = {
  id: 'mock-session-completed',
  campaignId: 'mock-campaign-001',
  name: 'モックセッション：完了済み',
  description: '完了済みセッションのテストデータ',
  status: 'completed',
  mode: 'rest',
  
  scheduledStartTime: '2024-01-01T19:00:00Z',
  actualStartTime: '2024-01-01T19:00:00Z',
  actualEndTime: '2024-01-01T22:30:00Z',
  estimatedDuration: 180,
  
  players: ['mock-player-001', 'mock-player-002'],
  characterIds: ['mock-character-001', 'mock-character-002'],
  gameMasterId: 'mock-gm-001',
  
  notes: '完了済みセッションのノート\n- 村の問題解決\n- ゴブリン討伐完了\n- 経験値獲得',
  sessionNumber: 5,
  isRecordingEnabled: true,
  
  completedEvents: [
    'mock-event-investigation',
    'mock-event-combat-goblins',
    'mock-event-reward-ceremony'
  ],
  sessionLog: [
    {
      id: 'mock-log-start',
      timestamp: '2024-01-01T19:00:00Z',
      type: 'system',
      content: 'セッション開始',
      metadata: { event: 'session_start' }
    },
    {
      id: 'mock-log-end',
      timestamp: '2024-01-01T22:30:00Z',
      type: 'system',
      content: 'セッション終了',
      metadata: { event: 'session_end', duration: 210 }
    }
  ]
};

// ===================================
// イベントデータ
// ===================================

// 基本的なイベント
export const mockEvent: TRPGEvent = {
  id: 'mock-event-001',
  title: 'モックイベント：基本テスト',
  description: 'ユニットテスト用のイベントデータ',
  type: 'story',
  
  scheduledDate: '2024-01-01T20:00:00Z',
  duration: 30,
  
  questId: 'mock-quest-001',
  locationId: 'mock-location-001',
  participants: ['mock-character-001', 'mock-character-002'],
  
  difficulty: 'medium',
  challengeRating: 2,
  
  outcomes: {
    success: false,
    experience: 0,
    rewards: [],
    consequences: [],
    storyImpact: []
  },
  
  aiGenerated: false,
  
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

// 戦闘イベント
export const mockEventCombat: TRPGEvent = {
  id: 'mock-event-combat-001',
  title: 'ゴブリンとの戦闘',
  description: '森でゴブリンの一団に遭遇',
  type: 'combat',
  
  scheduledDate: '2024-01-01T20:30:00Z',
  duration: 45,
  actualStartTime: '2024-01-01T20:30:00Z',
  actualEndTime: '2024-01-01T21:15:00Z',
  
  questId: 'mock-quest-goblin-hunt',
  locationId: 'mock-location-forest',
  participants: ['mock-character-001', 'mock-character-002', 'mock-enemy-goblin-001'],
  
  difficulty: 'medium',
  challengeRating: 3,
  
  outcomes: {
    success: true,
    experience: 150,
    rewards: ['ゴブリンの耳', 'わずかな銅貨'],
    consequences: ['軽傷を負った'],
    storyImpact: ['ゴブリンの脅威を減らした']
  },
  
  aiGenerated: true,
  seedPrompt: '森でゴブリンとの戦闘',
  
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T21:15:00Z',
  completedAt: '2024-01-01T21:15:00Z'
};

// 社交イベント
export const mockEventSocial: TRPGEvent = {
  id: 'mock-event-social-001',
  title: '村長との交渉',
  description: '村の問題について村長と話し合う',
  type: 'social',
  
  scheduledDate: '2024-01-01T19:30:00Z',
  duration: 20,
  actualStartTime: '2024-01-01T19:30:00Z',
  actualEndTime: '2024-01-01T19:50:00Z',
  
  questId: 'mock-quest-village-help',
  locationId: 'mock-location-village-hall',
  participants: ['mock-character-001', 'mock-character-002', 'mock-npc-mayor'],
  
  difficulty: 'easy',
  challengeRating: 1,
  
  outcomes: {
    success: true,
    experience: 50,
    rewards: ['村長の信頼', 'クエスト情報'],
    consequences: [],
    storyImpact: ['村との関係改善']
  },
  
  aiGenerated: false,
  
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T19:50:00Z',
  completedAt: '2024-01-01T19:50:00Z'
};

// ===================================
// チャットメッセージとダイスロール
// ===================================

// 基本的なチャットメッセージ
export const mockChatMessage: ChatMessage = {
  id: 'mock-chat-001',
  senderId: 'mock-player-001',
  senderName: 'モックプレイヤー1',
  senderType: 'player',
  content: 'テスト用チャットメッセージ',
  timestamp: '2024-01-01T20:00:00Z',
  isSystemMessage: false
};

// GMメッセージ
export const mockChatMessageGM: ChatMessage = {
  id: 'mock-chat-gm-001',
  senderId: 'mock-gm-001',
  senderName: 'モックGM',
  senderType: 'gm',
  content: 'GMからのメッセージです',
  timestamp: '2024-01-01T20:01:00Z',
  isSystemMessage: false
};

// システムメッセージ
export const mockChatMessageSystem: ChatMessage = {
  id: 'mock-chat-system-001',
  senderId: 'system',
  senderName: 'システム',
  senderType: 'system',
  content: 'セッションが開始されました',
  timestamp: '2024-01-01T19:00:00Z',
  isSystemMessage: true
};

// 基本的なダイスロール
export const mockDiceRoll: DiceRoll = {
  id: 'mock-dice-001',
  playerId: 'mock-player-001',
  playerName: 'モックプレイヤー1',
  diceExpression: '1d20+5',
  result: 18,
  individualRolls: [13],
  modifier: 5,
  purpose: '攻撃ロール',
  timestamp: '2024-01-01T20:15:00Z',
  isSuccess: true,
  difficulty: 15
};

// 複数ダイスロール
export const mockDiceRollMultiple: DiceRoll = {
  id: 'mock-dice-002',
  playerId: 'mock-player-002',
  playerName: 'モックプレイヤー2',
  diceExpression: '3d6+2',
  result: 14,
  individualRolls: [4, 5, 3],
  modifier: 2,
  purpose: 'ダメージロール',
  timestamp: '2024-01-01T20:16:00Z',
  isSuccess: true,
  difficulty: 0
};

// クリティカル失敗
export const mockDiceRollCriticalFail: DiceRoll = {
  id: 'mock-dice-crit-fail',
  playerId: 'mock-player-001',
  playerName: 'モックプレイヤー1',
  diceExpression: '1d20+3',
  result: 4,
  individualRolls: [1],
  modifier: 3,
  purpose: '技能判定',
  timestamp: '2024-01-01T20:17:00Z',
  isSuccess: false,
  difficulty: 15,
  isCriticalFailure: true
};

// ===================================
// リスト（複数選択テスト用）
// ===================================

export const mockSessionList: TRPGSession[] = [
  mockSession,
  mockSessionActive,
  mockSessionCompleted
];

export const mockEventList: TRPGEvent[] = [
  mockEvent,
  mockEventCombat,
  mockEventSocial
];

export const mockChatMessageList: ChatMessage[] = [
  mockChatMessage,
  mockChatMessageGM,
  mockChatMessageSystem
];

export const mockDiceRollList: DiceRoll[] = [
  mockDiceRoll,
  mockDiceRollMultiple,
  mockDiceRollCriticalFail
];

// ステータス別リスト
export const mockActiveSessions: TRPGSession[] = 
  mockSessionList.filter(session => session.status === 'active');

export const mockCompletedSessions: TRPGSession[] = 
  mockSessionList.filter(session => session.status === 'completed');

// タイプ別イベントリスト
export const mockCombatEvents: TRPGEvent[] = 
  mockEventList.filter(event => event.type === 'combat');

export const mockSocialEvents: TRPGEvent[] = 
  mockEventList.filter(event => event.type === 'social');