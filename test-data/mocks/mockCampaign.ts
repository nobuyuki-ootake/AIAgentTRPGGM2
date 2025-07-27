/**
 * モック: 基本的なキャンペーンデータ
 * t-WADA命名規則: mockCampaign.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: ユニットテスト、コンポーネント表示テスト、API レスポンステスト
 */

import { TRPGCampaign, Quest, Location } from '@ai-agent-trpg/types';

// 基本的なテストキャンペーン
export const mockCampaign: TRPGCampaign = {
  id: 'mock-campaign-001',
  title: 'モックキャンペーン：基本テスト',
  description: 'これはユニットテスト用のモックキャンペーンです。',
  gameSystem: 'D&D5e',
  gmId: 'mock-gm-001',
  playerIds: ['mock-player-001', 'mock-player-002'],
  characterIds: ['mock-character-001', 'mock-character-002'],
  currentLocationId: 'mock-location-001',
  currentTimelineId: 'mock-timeline-001',
  status: 'active',
  settings: {
    aiAssistanceLevel: 'standard',
    difficultyLevel: 'normal',
    sessionDuration: 180,
    maxPlayers: 4,
    useVoiceChat: false,
    allowPlayerActions: true
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

// 空の設定を持つキャンペーン
export const mockCampaignEmpty: TRPGCampaign = {
  id: 'mock-campaign-empty',
  title: '',
  description: '',
  gameSystem: 'D&D5e',
  gmId: '',
  playerIds: [],
  characterIds: [],
  status: 'preparing',
  settings: {
    aiAssistanceLevel: 'standard',
    difficultyLevel: 'normal',
    sessionDuration: 180,
    maxPlayers: 4,
    useVoiceChat: false,
    allowPlayerActions: true
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

// 最大設定のキャンペーン
export const mockCampaignMaxSettings: TRPGCampaign = {
  id: 'mock-campaign-max',
  title: 'モックキャンペーン：最大設定',
  description: '最大設定でのテスト用キャンペーン',
  gameSystem: 'D&D5e',
  gmId: 'mock-gm-max',
  playerIds: [
    'mock-player-001',
    'mock-player-002', 
    'mock-player-003',
    'mock-player-004',
    'mock-player-005',
    'mock-player-006'
  ],
  characterIds: [
    'mock-character-001',
    'mock-character-002',
    'mock-character-003',
    'mock-character-004',
    'mock-character-005',
    'mock-character-006'
  ],
  currentLocationId: 'mock-location-max',
  currentTimelineId: 'mock-timeline-max',
  currentSessionId: 'mock-session-max',
  status: 'active',
  settings: {
    aiAssistanceLevel: 'expert',
    difficultyLevel: 'extreme',
    sessionDuration: 480,
    maxPlayers: 6,
    useVoiceChat: true,
    allowPlayerActions: true,
    customRules: {
      criticalHitMultiplier: 3,
      deathSavingThrowsRequired: 5,
      restHealingRate: 0.25,
      experienceMultiplier: 1.5,
      lootMultiplier: 2.0
    }
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z',
  lastSessionDate: '2024-01-01T10:00:00Z'
};

// 完了済みキャンペーン
export const mockCampaignCompleted: TRPGCampaign = {
  id: 'mock-campaign-completed',
  title: 'モックキャンペーン：完了済み',
  description: '完了済みキャンペーンのテストデータ',
  gameSystem: 'D&D5e',
  gmId: 'mock-gm-completed',
  playerIds: ['mock-player-001', 'mock-player-002'],
  characterIds: ['mock-character-001', 'mock-character-002'],
  currentLocationId: 'mock-location-final',
  currentTimelineId: 'mock-timeline-final',
  status: 'completed',
  settings: {
    aiAssistanceLevel: 'standard',
    difficultyLevel: 'normal',
    sessionDuration: 180,
    maxPlayers: 4,
    useVoiceChat: false,
    allowPlayerActions: true
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-31T23:59:59Z',
  completedAt: '2024-01-31T23:59:59Z',
  lastSessionDate: '2024-01-31T18:00:00Z'
};

// キャンセル済みキャンペーン
export const mockCampaignCancelled: TRPGCampaign = {
  id: 'mock-campaign-cancelled',
  title: 'モックキャンペーン：キャンセル',
  description: 'キャンセルされたキャンペーンのテストデータ',
  gameSystem: 'D&D5e',
  gmId: 'mock-gm-cancelled',
  playerIds: ['mock-player-001'],
  characterIds: ['mock-character-001'],
  status: 'cancelled',
  settings: {
    aiAssistanceLevel: 'standard',
    difficultyLevel: 'normal',
    sessionDuration: 180,
    maxPlayers: 4,
    useVoiceChat: false,
    allowPlayerActions: true
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T12:00:00Z'
};

// テスト用クエスト
export const mockQuest: Quest = {
  id: 'mock-quest-001',
  campaignId: 'mock-campaign-001',
  title: 'モッククエスト：基本テスト',
  description: 'ユニットテスト用のクエストデータ',
  status: 'active',
  priority: 'medium',
  objectives: [
    {
      id: 'mock-obj-001',
      description: 'テスト目標1',
      completed: false,
      required: true
    },
    {
      id: 'mock-obj-002', 
      description: 'テスト目標2',
      completed: true,
      required: false
    }
  ],
  rewards: {
    experience: 100,
    gold: 50,
    items: ['mock_item_001']
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

// 完了済みクエスト
export const mockQuestCompleted: Quest = {
  id: 'mock-quest-completed',
  campaignId: 'mock-campaign-001',
  title: 'モッククエスト：完了済み',
  description: '完了済みクエストのテストデータ',
  status: 'completed',
  priority: 'high',
  objectives: [
    {
      id: 'mock-obj-comp-001',
      description: '完了済み目標1',
      completed: true,
      required: true
    },
    {
      id: 'mock-obj-comp-002',
      description: '完了済み目標2', 
      completed: true,
      required: true
    }
  ],
  rewards: {
    experience: 500,
    gold: 200,
    items: ['mock_item_sword', 'mock_item_potion']
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-10T00:00:00Z',
  completedAt: '2024-01-10T00:00:00Z'
};

// テスト用場所
export const mockLocation: Location = {
  id: 'mock-location-001',
  name: 'モック場所：テスト村',
  description: 'ユニットテスト用の場所データ',
  type: 'settlement',
  parentLocationId: undefined,
  childLocationIds: ['mock-location-child-001'],
  coordinates: { x: 0, y: 0 },
  climate: 'temperate',
  terrain: ['plains', 'forest'],
  npcs: ['mock-npc-001'],
  items: ['mock-item-001'],
  events: ['mock-event-001'],
  isDiscovered: true,
  visitCount: 1,
  tags: ['safe', 'starting_area'],
  imageUrl: 'https://example.com/mock-location.jpg'
};

// 未発見の場所
export const mockLocationUndiscovered: Location = {
  id: 'mock-location-undiscovered',
  name: '未知の場所',
  description: '未発見の場所のテストデータ',
  type: 'dungeon',
  parentLocationId: 'mock-location-001',
  childLocationIds: [],
  coordinates: { x: 10, y: 10 },
  climate: 'underground',
  terrain: ['cave', 'underground'],
  npcs: [],
  items: [],
  events: [],
  isDiscovered: false,
  visitCount: 0,
  tags: ['dangerous', 'unexplored']
};

// キャンペーンリスト（複数選択テスト用）
export const mockCampaignList: TRPGCampaign[] = [
  mockCampaign,
  mockCampaignEmpty,
  mockCampaignMaxSettings,
  mockCampaignCompleted,
  mockCampaignCancelled
];

// ステータス別リスト
export const mockActiveCampaigns: TRPGCampaign[] = 
  mockCampaignList.filter(campaign => campaign.status === 'active');

export const mockCompletedCampaigns: TRPGCampaign[] = 
  mockCampaignList.filter(campaign => campaign.status === 'completed');

// クエストリスト
export const mockQuestList: Quest[] = [
  mockQuest,
  mockQuestCompleted
];

// 場所リスト  
export const mockLocationList: Location[] = [
  mockLocation,
  mockLocationUndiscovered
];