/**
 * テストAIエンティティデータ
 * t-WADA命名規則: mockAIEntities.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 */

import { 
  AIGameContext,
  AIConditionExpression,
  AIEntity,
  Milestone,
  AIScenario,
  EntityRelationship,
  AIQuery
} from '@ai-agent-trpg/types';

// テスト用AIゲームコンテキスト
export const mockAIGameContext: AIGameContext = {
  campaignId: 'test-campaign-001',
  sessionId: 'test-session-001',
  currentLocationId: 'test-location-village',
  partyLevel: 3,
  partyComposition: [
    {
      characterId: 'test-character-warrior',
      role: 'tank',
      level: 3
    },
    {
      characterId: 'test-character-mage',
      role: 'damage',
      level: 3
    }
  ],
  gamePhase: 'exploration',
  timeOfDay: 'evening',
  weatherConditions: 'clear',
  threatLevel: 'low',
  activeQuests: ['test-quest-001'],
  recentEvents: ['test-event-001'],
  aiAssistanceLevel: 'standard',
  playerPreferences: {
    combatFrequency: 'moderate',
    roleplayFocus: 'high',
    difficultyPreference: 'challenging'
  }
};

// テスト用AI条件式
export const mockAICondition: AIConditionExpression = {
  id: 'test-condition-001',
  type: 'and',
  conditions: [
    {
      id: 'condition-location',
      type: 'location',
      operator: 'equals',
      value: 'test-location-village'
    },
    {
      id: 'condition-party-level',
      type: 'party_level',
      operator: 'greater_than',
      value: 2
    }
  ]
};

// テスト用AIエンティティ
export const mockAIEntity: AIEntity = {
  id: 'test-ai-entity-001',
  campaignId: 'test-campaign-001',
  type: 'character',
  name: 'テストAIエンティティ',
  description: 'テスト用のAIエンティティです',
  entityData: {
    characterId: 'test-npc-mayor',
    personality: 'helpful',
    knowledge: ['village_history', 'local_threats'],
    relationships: {
      'test-character-warrior': 'friendly',
      'test-character-mage': 'neutral'
    }
  },
  activationConditions: [mockAICondition],
  isActive: true,
  priority: 'medium',
  tags: ['npc', 'quest_giver', 'village'],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// テスト用マイルストーン
export const mockMilestone: Milestone = {
  id: 'test-milestone-001',
  campaignId: 'test-campaign-001',
  title: 'テストマイルストーン：村の救済',
  description: '村をゴブリンの脅威から救う',
  category: 'main_quest',
  status: 'in_progress',
  priority: 'high',
  requirements: [
    {
      id: 'req-001',
      description: 'ゴブリンの巣窟を発見する',
      completed: false,
      type: 'location_discovery'
    },
    {
      id: 'req-002',
      description: 'ゴブリンリーダーを倒す',
      completed: false,
      type: 'combat_victory'
    }
  ],
  rewards: {
    experience: 1000,
    gold: 500,
    items: ['magic_sword', 'healing_potion'],
    unlocks: ['new_area', 'new_quest']
  },
  dependencies: [],
  unlocks: ['test-milestone-002'],
  estimatedDifficulty: 'medium',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// テスト用AIシナリオ
export const mockAIScenario: AIScenario = {
  id: 'test-scenario-001',
  campaignId: 'test-campaign-001',
  title: 'テストシナリオ：村での情報収集',
  description: '村で情報を集めてクエストを進める',
  category: 'investigation',
  triggerConditions: [mockAICondition],
  outcomes: [
    {
      id: 'outcome-001',
      description: '村長から情報を得る',
      probability: 0.8,
      effects: {
        questProgress: 'test-quest-001',
        relationshipChanges: {
          'test-npc-mayor': 'friendly'
        }
      }
    }
  ],
  difficulty: 'easy',
  estimatedDuration: 30,
  requiredResources: [],
  tags: ['roleplay', 'information_gathering'],
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// テスト用エンティティ関係
export const mockEntityRelationship: EntityRelationship = {
  id: 'test-relationship-001',
  campaignId: 'test-campaign-001',
  sourceEntityId: 'test-character-warrior',
  targetEntityId: 'test-npc-mayor',
  relationshipType: 'trust',
  strength: 0.7,
  isActive: true,
  context: {
    establishedReason: 'quest_completion',
    lastInteraction: new Date('2024-01-15T19:30:00Z'),
    sharedExperiences: ['village_defense', 'goblin_threat_discussion']
  },
  effects: {
    dialogueModifiers: ['friendly_greeting', 'helpful_attitude'],
    questAccessibility: ['village_quests'],
    serviceDiscounts: ['inn', 'shop']
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T19:30:00Z')
};

// テスト用AIクエリ
export const mockAIQuery: AIQuery = {
  id: 'test-query-001',
  campaignId: 'test-campaign-001',
  sessionId: 'test-session-001',
  queryType: 'narrative_generation',
  context: mockAIGameContext,
  parameters: {
    scene_type: 'tavern_encounter',
    npcs_present: ['test-npc-mayor'],
    mood: 'serious',
    focus: 'quest_delivery'
  },
  requestedAt: new Date('2024-01-15T19:30:00Z'),
  status: 'pending'
};

// テスト用AIクエリレスポンス
export const mockAIQueryResponse: AIQuery = {
  ...mockAIQuery,
  id: 'test-query-002',
  status: 'completed',
  response: {
    narrative: '村長は君たちを見つめ、心配そうな表情を浮かべながら近づいてくる。',
    suggestions: ['話しかける', '様子を見る', '酒場の他の客に話を聞く'],
    contextUpdates: {
      mood: 'tense',
      available_actions: ['conversation', 'investigation']
    }
  },
  processedAt: new Date('2024-01-15T19:31:00Z')
};

// AIエンティティのリスト（複数選択テスト用）
export const mockAIEntityList: AIEntity[] = [
  mockAIEntity,
  {
    ...mockAIEntity,
    id: 'test-ai-entity-002',
    name: 'テストAIエンティティ2',
    type: 'location',
    entityData: {
      locationId: 'test-location-village',
      atmosphere: 'peaceful',
      resources: ['inn', 'shop', 'blacksmith']
    }
  }
];

// マイルストーンのリスト
export const mockMilestoneList: Milestone[] = [
  mockMilestone,
  {
    ...mockMilestone,
    id: 'test-milestone-002',
    title: 'テストマイルストーン：新たな脅威',
    description: '新たに現れた脅威を調査する',
    status: 'locked',
    dependencies: ['test-milestone-001']
  }
];

// AIシナリオのリスト
export const mockAIScenarioList: AIScenario[] = [
  mockAIScenario,
  {
    ...mockAIScenario,
    id: 'test-scenario-002',
    title: 'テストシナリオ：戦闘遭遇',
    description: 'ゴブリンとの戦闘が発生する',
    category: 'combat',
    difficulty: 'medium'
  }
];