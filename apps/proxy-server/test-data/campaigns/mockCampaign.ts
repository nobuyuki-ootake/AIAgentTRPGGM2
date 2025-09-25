/**
 * テストキャンペーンデータ
 * t-WADA命名規則: mockCampaign.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 */

import { TRPGCampaign, Quest, Location } from '@ai-agent-trpg/types';

// 基本的なテストキャンペーン
export const mockCampaign: TRPGCampaign = {
  id: 'test-campaign-001',
  title: 'テストキャンペーン：古の遺跡探索',
  description: 'これはテスト用のキャンペーンです。古の遺跡を探索し、失われた宝を見つける冒険です。',
  gameSystem: 'D&D5e',
  gmId: 'test-gm-001',
  playerIds: ['test-player-001', 'test-player-002'],
  characterIds: ['test-character-001', 'test-character-002'],
  currentLocationId: 'test-location-village',
  currentTimelineId: 'test-timeline-001',
  status: 'active',
  settings: {
    aiAssistanceLevel: 'standard',
    difficultyLevel: 'normal',
    sessionDuration: 180,
    maxPlayers: 4,
    useVoiceChat: false,
    allowPlayerActions: true
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// キャラクター付きキャンペーン
export const mockCampaignWithCharacters: TRPGCampaign = {
  ...mockCampaign,
  id: 'test-campaign-002',
  title: 'テストキャンペーン：キャラクター編成済み',
  characterIds: [
    'test-character-warrior',
    'test-character-mage',
    'test-character-rogue',
    'test-character-healer'
  ]
};

// 進行中セッション付きキャンペーン
export const mockCampaignWithActiveSession: TRPGCampaign = {
  ...mockCampaign,
  id: 'test-campaign-003',
  title: 'テストキャンペーン：セッション進行中',
  status: 'in_session',
  currentSessionId: 'test-session-001'
};

// 完了済みキャンペーン
export const mockCampaignCompleted: TRPGCampaign = {
  ...mockCampaign,
  id: 'test-campaign-004',
  title: 'テストキャンペーン：完了済み',
  status: 'completed',
  completedAt: new Date('2024-01-31T23:59:59Z')
};

// 複雑な設定のキャンペーン
export const mockCampaignAdvanced: TRPGCampaign = {
  ...mockCampaign,
  id: 'test-campaign-005',
  title: 'テストキャンペーン：上級設定',
  settings: {
    aiAssistanceLevel: 'advanced',
    difficultyLevel: 'hard',
    sessionDuration: 240,
    maxPlayers: 6,
    useVoiceChat: true,
    allowPlayerActions: true,
    customRules: {
      criticalHitMultiplier: 3,
      deathSavingThrowsRequired: 5,
      restHealingRate: 0.5
    }
  }
};

// テスト用クエスト
export const mockQuest: Quest = {
  id: 'test-quest-001',
  campaignId: 'test-campaign-001',
  title: 'テストクエスト：村の守護',
  description: '村を脅かすゴブリンを討伐してください',
  status: 'active',
  priority: 'high',
  objectives: [
    {
      id: 'obj-001',
      description: 'ゴブリンの巣窟を発見する',
      completed: false,
      required: true
    },
    {
      id: 'obj-002',
      description: 'ゴブリンリーダーを倒す',
      completed: false,
      required: true
    }
  ],
  rewards: {
    experience: 500,
    gold: 200,
    items: ['healing_potion', 'magic_sword']
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// テスト用場所
export const mockLocation: Location = {
  id: 'test-location-village',
  campaignId: 'test-campaign-001',
  name: 'テスト村',
  description: '平和な田舎の村。冒険の出発点となる場所です。',
  type: 'settlement',
  parentLocationId: null,
  coordinates: { x: 0, y: 0 },
  isDiscovered: true,
  npcs: ['test-npc-mayor', 'test-npc-shopkeeper'],
  items: ['village_key', 'old_map'],
  events: ['test-event-001'],
  connections: ['test-location-forest', 'test-location-ruins'],
  dangerLevel: 'safe',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// キャンペーンのリスト（複数選択テスト用）
export const mockCampaignList: TRPGCampaign[] = [
  mockCampaign,
  mockCampaignWithCharacters,
  mockCampaignWithActiveSession,
  mockCampaignCompleted,
  mockCampaignAdvanced
];