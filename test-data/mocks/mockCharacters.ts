/**
 * モック: 基本的なキャラクターデータ
 * t-WADA命名規則: mockCharacters.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: ユニットテスト、コンポーネント表示テスト、キャラクター管理テスト
 */

import { 
  TRPGCharacter, 
  NPCCharacter, 
  EnemyCharacter,
  DEFAULT_BASE_STATS,
  DEFAULT_DERIVED_STATS 
} from '@ai-agent-trpg/types';

// ===================================
// PC (プレイヤーキャラクター) モック
// ===================================

// 基本的なPCキャラクター
export const mockCharacterPC: TRPGCharacter = {
  id: 'mock-character-pc-001',
  name: 'モックヒーロー',
  description: 'ユニットテスト用のPCキャラクター',
  characterType: 'PC',
  
  // 基本情報
  age: 25,
  race: 'human',
  characterClass: 'fighter',
  background: 'soldier',
  playerId: 'mock-player-001',
  
  // ビジュアル
  appearance: 'ユニットテスト用のキャラクター外見',
  
  // ゲーム統計
  baseStats: {
    ...DEFAULT_BASE_STATS,
    strength: 16,
    constitution: 14
  },
  
  derivedStats: {
    ...DEFAULT_DERIVED_STATS,
    hitPoints: 12,
    maxHitPoints: 12,
    armorClass: 16
  },
  
  level: 1,
  experience: 0,
  
  // スキルと特技
  skills: [
    {
      id: 'athletics',
      name: '運動',
      description: '筋力を使った活動',
      ability: 'strength',
      proficiency: true,
      bonus: 5
    }
  ],
  
  feats: [],
  equipment: [],
  statusEffects: [],
  
  // 位置情報
  currentLocationId: 'mock-location-001',
  
  // PC固有情報
  personalityTraits: ['勇敢', 'モック'],
  ideals: ['正義'],
  bonds: ['テスト用の絆'],
  flaws: ['テスト用の欠点'],
  
  // メタデータ
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  campaignId: 'mock-campaign-001'
};

// 空の設定を持つPCキャラクター
export const mockCharacterPCEmpty: TRPGCharacter = {
  id: 'mock-character-pc-empty',
  name: '',
  description: '',
  characterType: 'PC',
  
  appearance: '',
  
  baseStats: DEFAULT_BASE_STATS,
  derivedStats: DEFAULT_DERIVED_STATS,
  
  level: 1,
  experience: 0,
  
  skills: [],
  feats: [],
  equipment: [],
  statusEffects: [],
  
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  campaignId: 'mock-campaign-001'
};

// 高レベルPCキャラクター
export const mockCharacterPCHighLevel: TRPGCharacter = {
  id: 'mock-character-pc-high',
  name: 'モック伝説ヒーロー',
  description: '高レベルテスト用キャラクター',
  characterType: 'PC',
  
  age: 35,
  race: 'elf',
  characterClass: 'wizard',
  background: 'sage',
  playerId: 'mock-player-high',
  
  appearance: '高レベルキャラクターの外見',
  
  baseStats: {
    strength: 12,
    dexterity: 16,
    constitution: 14,
    intelligence: 20,
    wisdom: 15,
    charisma: 13
  },
  
  derivedStats: {
    hitPoints: 68,
    maxHitPoints: 68,
    magicPoints: 30,
    maxMagicPoints: 30,
    armorClass: 17,
    initiative: 3,
    speed: 30
  },
  
  level: 15,
  experience: 165000,
  
  skills: [
    {
      id: 'arcana',
      name: '魔法学',
      description: '魔法に関する知識',
      ability: 'intelligence',
      proficiency: true,
      bonus: 10
    },
    {
      id: 'history',
      name: '歴史',
      description: '歴史的知識',
      ability: 'intelligence',
      proficiency: true,
      bonus: 10
    }
  ],
  
  feats: [
    {
      id: 'feat-spell-focus',
      name: 'Spell Focus',
      description: '呪文の効果向上',
      prerequisites: ['Wizard level 1'],
      benefits: ['呪文DC+1']
    }
  ],
  
  equipment: [
    {
      id: 'staff-of-power',
      name: 'パワースタッフ',
      description: '強力な魔法の杖',
      type: 'weapon',
      weight: 4,
      cost: 50000,
      rarity: 'legendary',
      properties: ['magical', 'spell_focus'],
      isEquipped: true
    }
  ],
  
  statusEffects: [],
  currentLocationId: 'mock-location-high',
  
  personalityTraits: ['知識欲', '冷静'],
  ideals: ['知識', '真理'],
  bonds: ['魔法学院'],
  flaws: ['プライドが高い'],
  
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  campaignId: 'mock-campaign-high'
};

// ===================================
// NPC (ノンプレイヤーキャラクター) モック
// ===================================

// 基本的なNPCキャラクター
export const mockCharacterNPC: NPCCharacter = {
  id: 'mock-character-npc-001',
  name: 'モック村長',
  description: 'ユニットテスト用のNPCキャラクター',
  characterType: 'NPC',
  
  age: 55,
  race: 'human',
  characterClass: 'commoner',
  background: 'folk_hero',
  
  appearance: 'テスト用NPCの外見',
  
  baseStats: DEFAULT_BASE_STATS,
  derivedStats: DEFAULT_DERIVED_STATS,
  
  level: 1,
  experience: 0,
  
  skills: [
    {
      id: 'persuasion',
      name: '説得',
      description: '他者を説得する',
      ability: 'charisma',
      proficiency: true,
      bonus: 3
    }
  ],
  
  feats: [],
  equipment: [],
  statusEffects: [],
  
  currentLocationId: 'mock-location-001',
  
  // NPC固有設定
  faction: 'villagers',
  location: 'mock-village',
  occupation: 'mayor',
  
  role: 'questGiver',
  disposition: 'friendly',
  
  dialoguePatterns: [
    {
      trigger: 'greeting',
      response: 'こんにちは、冒険者の皆さん！',
      conditions: [],
      outcomes: []
    }
  ],
  
  questIds: ['mock-quest-001'],
  behaviorTags: ['helpful', 'talkative'],
  
  npcData: {
    importance: 'major',
    disposition: 'friendly',
    occupation: 'mayor',
    location: 'mock-village',
    aiPersonality: {
      traits: ['helpful', 'wise'],
      speechPattern: 'formal'
    }
  },
  
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  campaignId: 'mock-campaign-001'
};

// 敵対的なNPC
export const mockCharacterNPCHostile: NPCCharacter = {
  id: 'mock-character-npc-hostile',
  name: 'モック悪徳商人',
  description: '敵対的なNPCのテストデータ',
  characterType: 'NPC',
  
  age: 40,
  race: 'human',
  characterClass: 'rogue',
  background: 'criminal',
  
  appearance: '怪しげな商人の外見',
  
  baseStats: {
    ...DEFAULT_BASE_STATS,
    dexterity: 14,
    charisma: 16
  },
  
  derivedStats: DEFAULT_DERIVED_STATS,
  
  level: 3,
  experience: 900,
  
  skills: [
    {
      id: 'deception',
      name: '欺瞞',
      description: '嘘をつく',
      ability: 'charisma',
      proficiency: true,
      bonus: 5
    }
  ],
  
  feats: [],
  equipment: [],
  statusEffects: [],
  
  currentLocationId: 'mock-location-market',
  
  role: 'neutral',
  disposition: 'hostile',
  
  dialoguePatterns: [
    {
      trigger: 'greeting',
      response: '何の用だ？',
      conditions: [],
      outcomes: []
    }
  ],
  
  questIds: [],
  behaviorTags: ['suspicious', 'greedy'],
  
  npcData: {
    importance: 'minor',
    disposition: 'hostile',
    occupation: 'merchant',
    location: 'mock-market',
    aiPersonality: {
      traits: ['greedy', 'suspicious'],
      speechPattern: 'rude'
    }
  },
  
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  campaignId: 'mock-campaign-001'
};

// ===================================
// Enemy (敵キャラクター) モック
// ===================================

// 基本的な敵キャラクター
export const mockCharacterEnemy: EnemyCharacter = {
  id: 'mock-character-enemy-001',
  name: 'モックゴブリン',
  description: 'ユニットテスト用の敵キャラクター',
  characterType: 'Enemy',
  
  race: 'goblin',
  characterClass: 'warrior',
  
  appearance: 'テスト用敵の外見',
  
  baseStats: {
    strength: 8,
    dexterity: 14,
    constitution: 10,
    intelligence: 10,
    wisdom: 8,
    charisma: 8
  },
  
  derivedStats: {
    hitPoints: 7,
    maxHitPoints: 7,
    magicPoints: 0,
    maxMagicPoints: 0,
    armorClass: 15,
    initiative: 2,
    speed: 30
  },
  
  level: 1,
  experience: 0,
  
  skills: [
    {
      id: 'stealth',
      name: '隠密',
      description: '隠れる',
      ability: 'dexterity',
      proficiency: true,
      bonus: 4
    }
  ],
  
  feats: [],
  equipment: [],
  statusEffects: [],
  
  currentLocationId: 'mock-location-forest',
  
  // Enemy固有設定
  challengeRating: 0.25,
  hitDice: '2d6',
  
  specialAbilities: [
    {
      name: 'Nimble Escape',
      description: 'ボーナスアクションで離脱',
      recharge: 'always',
      usesRemaining: -1
    }
  ],
  
  legendaryActions: [],
  
  combatTactics: ['群れで攻撃', '有利な位置取り'],
  combatRole: 'striker',
  
  environment: ['forest', 'caves'],
  groupSize: { min: 2, max: 6 },
  treasureIds: ['mock-treasure-001'],
  
  enemyData: {
    category: 'humanoid',
    challengeRating: 0.25,
    encounterLevel: 1,
    combat: {
      tactics: 'swarm',
      preferred_range: 'melee'
    },
    encounter: {
      environment: ['forest'],
      time_of_day: 'any'
    },
    loot: {
      coins: '1d6 copper',
      items: ['crude weapon']
    }
  },
  
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  campaignId: 'mock-campaign-001'
};

// ボス敵キャラクター
export const mockCharacterEnemyBoss: EnemyCharacter = {
  id: 'mock-character-enemy-boss',
  name: 'モックドラゴン',
  description: 'ボス敵のテストデータ',
  characterType: 'Enemy',
  
  race: 'dragon',
  characterClass: 'sorcerer',
  
  appearance: '巨大なドラゴンの外見',
  
  baseStats: {
    strength: 22,
    dexterity: 10,
    constitution: 21,
    intelligence: 14,
    wisdom: 13,
    charisma: 17
  },
  
  derivedStats: {
    hitPoints: 152,
    maxHitPoints: 152,
    magicPoints: 20,
    maxMagicPoints: 20,
    armorClass: 18,
    initiative: 0,
    speed: 40
  },
  
  level: 10,
  experience: 0,
  
  skills: [
    {
      id: 'perception',
      name: '知覚',
      description: '感知能力',
      ability: 'wisdom',
      proficiency: true,
      bonus: 6
    }
  ],
  
  feats: [],
  equipment: [],
  statusEffects: [],
  
  currentLocationId: 'mock-location-lair',
  
  challengeRating: 8,
  hitDice: '15d12+45',
  
  specialAbilities: [
    {
      name: 'Fire Breath',
      description: '炎のブレス攻撃',
      recharge: 'recharge_5_6',
      usesRemaining: 1
    },
    {
      name: 'Frightful Presence',
      description: '恐怖のオーラ',
      recharge: 'per_day',
      usesRemaining: 3
    }
  ],
  
  legendaryActions: [
    {
      name: 'Tail Attack',
      description: '尻尾による攻撃',
      cost: 1
    },
    {
      name: 'Wing Attack',
      description: '翼による範囲攻撃',
      cost: 2
    }
  ],
  
  combatTactics: ['空中戦', 'ブレス攻撃', '恐怖効果'],
  combatRole: 'controller',
  
  environment: ['mountains', 'caves'],
  groupSize: { min: 1, max: 1 },
  treasureIds: ['mock-treasure-hoard'],
  
  enemyData: {
    category: 'dragon',
    challengeRating: 8,
    encounterLevel: 10,
    combat: {
      tactics: 'aerial_superiority',
      preferred_range: 'mixed'
    },
    encounter: {
      environment: ['lair'],
      time_of_day: 'any'
    },
    loot: {
      coins: '1000d10 gold',
      items: ['legendary weapon', 'magic armor']
    }
  },
  
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  campaignId: 'mock-campaign-boss'
};

// ===================================
// キャラクターリスト（複数選択テスト用）
// ===================================

export const mockCharacterList: (TRPGCharacter | NPCCharacter | EnemyCharacter)[] = [
  mockCharacterPC,
  mockCharacterPCEmpty,
  mockCharacterPCHighLevel,
  mockCharacterNPC,
  mockCharacterNPCHostile,
  mockCharacterEnemy,
  mockCharacterEnemyBoss
];

// タイプ別リスト
export const mockPCList: TRPGCharacter[] = [
  mockCharacterPC,
  mockCharacterPCEmpty,
  mockCharacterPCHighLevel
];

export const mockNPCList: NPCCharacter[] = [
  mockCharacterNPC,
  mockCharacterNPCHostile
];

export const mockEnemyList: EnemyCharacter[] = [
  mockCharacterEnemy,
  mockCharacterEnemyBoss
];

// レベル別リスト
export const mockLowLevelCharacters = mockCharacterList.filter(char => char.level <= 3);
export const mockHighLevelCharacters = mockCharacterList.filter(char => char.level > 10);