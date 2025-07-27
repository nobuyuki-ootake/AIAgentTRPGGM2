/**
 * テストセッションデータ
 * t-WADA命名規則: mockSessions.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 */

import { TRPGSession, TRPGEvent, Timeline, SessionState, ChatMessage, DiceRoll } from '@ai-agent-trpg/types';

// テスト用基本セッション
export const mockSession: TRPGSession = {
  id: 'test-session-001',
  campaignId: 'test-campaign-001',
  title: 'テストセッション：第1話',
  description: 'キャンペーンの最初のセッション。村で情報収集を行う。',
  sessionNumber: 1,
  gmId: 'test-gm-001',
  playerIds: ['test-player-001', 'test-player-002'],
  characterIds: ['test-character-warrior', 'test-character-mage'],
  status: 'planned',
  scheduledStart: new Date('2024-01-15T19:00:00Z'),
  actualStart: null,
  actualEnd: null,
  duration: 180,
  currentSceneId: null,
  notes: 'プレイヤーたちは村で冒険を始める',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// 進行中のセッション
export const mockSessionInProgress: TRPGSession = {
  ...mockSession,
  id: 'test-session-002',
  title: 'テストセッション：第2話（進行中）',
  status: 'in_progress',
  actualStart: new Date('2024-01-15T19:00:00Z'),
  currentSceneId: 'test-scene-tavern'
};

// 完了したセッション
export const mockSessionCompleted: TRPGSession = {
  ...mockSession,
  id: 'test-session-003',
  title: 'テストセッション：第3話（完了）',
  status: 'completed',
  actualStart: new Date('2024-01-15T19:00:00Z'),
  actualEnd: new Date('2024-01-15T22:00:00Z'),
  summary: 'プレイヤーたちは村の問題を解決し、次の目的地に向かった。',
  experienceAwarded: 500
};

// テスト用タイムライン
export const mockTimeline: Timeline = {
  id: 'test-timeline-001',
  campaignId: 'test-campaign-001',
  title: 'テストキャンペーンタイムライン',
  description: 'キャンペーンの主要イベントを記録するタイムライン',
  events: ['test-event-001', 'test-event-002'],
  currentEventIndex: 0,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// テスト用イベント
export const mockEvent: TRPGEvent = {
  id: 'test-event-001',
  timelineId: 'test-timeline-001',
  sessionId: 'test-session-001',
  title: 'テストイベント：村での出会い',
  description: 'プレイヤーたちが村で村長と出会う',
  type: 'story',
  timestamp: new Date('2024-01-15T19:30:00Z'),
  participants: ['test-character-warrior', 'test-character-mage', 'test-npc-mayor'],
  location: 'test-location-village',
  outcomes: {
    questReceived: 'test-quest-001',
    informationGained: '村の問題について知る',
    relationshipChanges: {
      'test-npc-mayor': 'friendly'
    }
  },
  createdAt: new Date('2024-01-15T19:30:00Z'),
  updatedAt: new Date('2024-01-15T19:30:00Z')
};

// テスト用戦闘イベント
export const mockCombatEvent: TRPGEvent = {
  id: 'test-event-002',
  timelineId: 'test-timeline-001',
  sessionId: 'test-session-002',
  title: 'テスト戦闘：ゴブリン襲撃',
  description: '村の外でゴブリンとの戦闘が発生',
  type: 'combat',
  timestamp: new Date('2024-01-15T20:00:00Z'),
  participants: [
    'test-character-warrior',
    'test-character-mage',
    'test-enemy-goblin'
  ],
  location: 'test-location-forest',
  outcomes: {
    victory: true,
    experienceGained: 200,
    lootObtained: ['small_coin_pouch', 'crude_weapon'],
    injuries: []
  },
  createdAt: new Date('2024-01-15T20:00:00Z'),
  updatedAt: new Date('2024-01-15T20:15:00Z')
};

// テスト用セッション状態
export const mockSessionState: SessionState = {
  sessionId: 'test-session-002',
  currentPhase: 'exploration',
  currentScene: {
    id: 'test-scene-tavern',
    name: 'テスト酒場',
    description: '村の中心にある賑やかな酒場',
    participants: ['test-character-warrior', 'test-character-mage', 'test-npc-mayor']
  },
  activeCharacters: ['test-character-warrior', 'test-character-mage'],
  turnOrder: [],
  currentTurn: null,
  gameTime: {
    day: 1,
    hour: 19,
    minute: 30,
    period: 'evening'
  },
  partyLocation: 'test-location-village',
  partyResources: {
    gold: 150,
    supplies: 3,
    health: 'good'
  },
  flags: {
    'met_mayor': true,
    'learned_about_goblins': true,
    'accepted_quest': true
  }
};

// テスト用チャットメッセージ
export const mockChatMessage: ChatMessage = {
  id: 'test-message-001',
  sessionId: 'test-session-002',
  senderId: 'test-player-001',
  senderName: 'テストプレイヤー1',
  senderType: 'player',
  content: 'テスト用のチャットメッセージです。',
  type: 'chat',
  timestamp: new Date('2024-01-15T19:45:00Z'),
  isInCharacter: true,
  characterId: 'test-character-warrior'
};

// テスト用システムメッセージ
export const mockSystemMessage: ChatMessage = {
  id: 'test-message-002',
  sessionId: 'test-session-002',
  senderId: 'system',
  senderName: 'システム',
  senderType: 'system',
  content: 'テスト戦士がダイスを振りました: 1d20 + 3 = 18',
  type: 'system',
  timestamp: new Date('2024-01-15T19:46:00Z'),
  isInCharacter: false
};

// テスト用GMメッセージ
export const mockGMMessage: ChatMessage = {
  id: 'test-message-003',
  sessionId: 'test-session-002',
  senderId: 'test-gm-001',
  senderName: 'テストGM',
  senderType: 'gm',
  content: '君たちは酒場の中で村長と出会う。村長は心配そうな表情を浮かべている。',
  type: 'narrative',
  timestamp: new Date('2024-01-15T19:47:00Z'),
  isInCharacter: false
};

// テスト用ダイスロール
export const mockDiceRoll: DiceRoll = {
  id: 'test-roll-001',
  sessionId: 'test-session-002',
  playerId: 'test-player-001',
  characterId: 'test-character-warrior',
  rollType: 'skill_check',
  dice: '1d20',
  modifier: 3,
  result: 15,
  total: 18,
  difficulty: 15,
  success: true,
  skillName: 'perception',
  description: '周囲を警戒する',
  timestamp: new Date('2024-01-15T19:46:00Z')
};

// テスト用攻撃ダイスロール
export const mockAttackRoll: DiceRoll = {
  id: 'test-roll-002',
  sessionId: 'test-session-002',
  playerId: 'test-player-001',
  characterId: 'test-character-warrior',
  rollType: 'attack',
  dice: '1d20',
  modifier: 5,
  result: 14,
  total: 19,
  difficulty: 15,
  success: true,
  weaponName: 'longsword',
  targetId: 'test-enemy-goblin',
  description: 'ロングソードで攻撃',
  timestamp: new Date('2024-01-15T20:05:00Z')
};

// テスト用ダメージロール
export const mockDamageRoll: DiceRoll = {
  id: 'test-roll-003',
  sessionId: 'test-session-002',
  playerId: 'test-player-001',
  characterId: 'test-character-warrior',
  rollType: 'damage',
  dice: '1d8',
  modifier: 2,
  result: 6,
  total: 8,
  weaponName: 'longsword',
  targetId: 'test-enemy-goblin',
  description: 'ロングソードダメージ',
  timestamp: new Date('2024-01-15T20:05:30Z')
};

// セッションのリスト（複数選択テスト用）
export const mockSessionList: TRPGSession[] = [
  mockSession,
  mockSessionInProgress,
  mockSessionCompleted
];

// イベントのリスト
export const mockEventList: TRPGEvent[] = [
  mockEvent,
  mockCombatEvent
];

// チャットメッセージのリスト
export const mockChatMessageList: ChatMessage[] = [
  mockChatMessage,
  mockSystemMessage,
  mockGMMessage
];

// ダイスロールのリスト
export const mockDiceRollList: DiceRoll[] = [
  mockDiceRoll,
  mockAttackRoll,
  mockDamageRoll
];