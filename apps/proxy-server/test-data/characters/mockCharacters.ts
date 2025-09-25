/**
 * テストキャラクターデータ
 * t-WADA命名規則: mockCharacters.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 */

import { TRPGCharacter, NPCCharacter, EnemyCharacter, CharacterStats, CharacterSkills } from '@ai-agent-trpg/types';

// 基本的な能力値
export const mockStatsBasic: CharacterStats = {
  strength: 14,
  dexterity: 12,
  constitution: 16,
  intelligence: 10,
  wisdom: 13,
  charisma: 8,
  hitPoints: 25,
  maxHitPoints: 25,
  armorClass: 16,
  speed: 30
};

// 高レベル能力値
export const mockStatsAdvanced: CharacterStats = {
  strength: 18,
  dexterity: 16,
  constitution: 18,
  intelligence: 14,
  wisdom: 16,
  charisma: 12,
  hitPoints: 68,
  maxHitPoints: 68,
  armorClass: 20,
  speed: 30
};

// 基本的なスキル
export const mockSkillsBasic: CharacterSkills = {
  athletics: 2,
  acrobatics: 1,
  sleightOfHand: 0,
  stealth: 1,
  arcana: 0,
  history: 0,
  investigation: 0,
  nature: 0,
  religion: 0,
  animalHandling: 1,
  insight: 2,
  medicine: 1,
  perception: 3,
  survival: 2,
  deception: -1,
  intimidation: 1,
  performance: -1,
  persuasion: 0
};

// テスト用PCキャラクター（戦士）
export const mockCharacterWarrior: TRPGCharacter = {
  id: 'test-character-warrior',
  campaignId: 'test-campaign-001',
  playerId: 'test-player-001',
  name: 'テスト戦士',
  description: 'テスト用の戦士キャラクター。勇敢で力強い戦士です。',
  type: 'player_character',
  race: 'human',
  class: 'fighter',
  level: 3,
  experience: 900,
  stats: mockStatsBasic,
  skills: mockSkillsBasic,
  equipment: [
    'longsword',
    'shield',
    'chain_mail',
    'healing_potion'
  ],
  background: 'soldier',
  personality: {
    traits: ['勇敢', '正義感が強い'],
    ideals: ['正義', '勇気'],
    bonds: ['仲間への忠誠'],
    flaws: ['時として無謀']
  },
  appearance: {
    age: 25,
    height: '180cm',
    weight: '75kg',
    eyeColor: 'brown',
    hairColor: 'black',
    description: '筋肉質で背が高く、鋭い眼差しを持つ'
  },
  backstory: 'かつて王国の兵士として仕えていたが、今は冒険者として旅をしている。',
  status: 'active',
  position: { x: 0, y: 0 },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// テスト用PCキャラクター（魔法使い）
export const mockCharacterMage: TRPGCharacter = {
  id: 'test-character-mage',
  campaignId: 'test-campaign-001',
  playerId: 'test-player-002',
  name: 'テスト魔法使い',
  description: 'テスト用の魔法使いキャラクター。知識豊富で魔法に長けています。',
  type: 'player_character',
  race: 'elf',
  class: 'wizard',
  level: 3,
  experience: 900,
  stats: {
    strength: 8,
    dexterity: 14,
    constitution: 12,
    intelligence: 16,
    wisdom: 13,
    charisma: 10,
    hitPoints: 18,
    maxHitPoints: 18,
    armorClass: 12,
    speed: 30
  },
  skills: {
    ...mockSkillsBasic,
    arcana: 5,
    history: 3,
    investigation: 3,
    religion: 2
  },
  equipment: [
    'quarterstaff',
    'spellbook',
    'robes',
    'component_pouch'
  ],
  spells: [
    'magic_missile',
    'shield',
    'detect_magic',
    'identify'
  ],
  background: 'sage',
  personality: {
    traits: ['好奇心旺盛', '理論的'],
    ideals: ['知識', '理解'],
    bonds: ['古い書物への愛'],
    flaws: ['実戦経験不足']
  },
  appearance: {
    age: 120,
    height: '165cm',
    weight: '55kg',
    eyeColor: 'blue',
    hairColor: 'silver',
    description: '細身で上品な雰囲気、銀髪の長い髪を持つエルフ'
  },
  backstory: '古代の知識を求めて図書館で長年研究していたが、実地経験を積むため冒険に出た。',
  status: 'active',
  position: { x: 0, y: 0 },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// テスト用NPCキャラクター（村長）
export const mockNPCMayor: NPCCharacter = {
  id: 'test-npc-mayor',
  campaignId: 'test-campaign-001',
  name: 'テスト村長',
  description: '村の年老いた村長。親切で知恵のある老人です。',
  type: 'npc',
  role: 'quest_giver',
  race: 'human',
  class: 'commoner',
  level: 1,
  stats: {
    strength: 10,
    dexterity: 10,
    constitution: 12,
    intelligence: 14,
    wisdom: 16,
    charisma: 13,
    hitPoints: 8,
    maxHitPoints: 8,
    armorClass: 10,
    speed: 30
  },
  skills: mockSkillsBasic,
  location: 'test-location-village',
  disposition: 'friendly',
  questIds: ['test-quest-001'],
  dialogue: {
    greeting: 'こんにちは、冒険者の皆さん。我が村へようこそ。',
    questOffer: '実は村に困ったことが起きているのです。お手伝いいただけませんか？',
    questComplete: 'ありがとうございます！村の皆が感謝しています。',
    farewell: 'また何かあればお声かけください。'
  },
  backstory: '若い頃は冒険者だったが、今は村の平和を守ることに専念している。',
  status: 'active',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// テスト用エネミーキャラクター（ゴブリン）
export const mockEnemyGoblin: EnemyCharacter = {
  id: 'test-enemy-goblin',
  campaignId: 'test-campaign-001',
  name: 'ゴブリン戦士',
  description: 'テスト用のゴブリン敵キャラクター。小柄だが狡猾です。',
  type: 'enemy',
  race: 'goblin',
  class: 'warrior',
  level: 1,
  stats: {
    strength: 8,
    dexterity: 14,
    constitution: 10,
    intelligence: 10,
    wisdom: 8,
    charisma: 8,
    hitPoints: 7,
    maxHitPoints: 7,
    armorClass: 15,
    speed: 30
  },
  skills: {
    ...mockSkillsBasic,
    stealth: 6,
    perception: 1
  },
  equipment: [
    'scimitar',
    'shortbow',
    'leather_armor',
    'shield'
  ],
  abilities: [
    {
      name: 'Nimble Escape',
      description: 'ボーナスアクションで隠れたり離脱したりできる',
      type: 'passive'
    }
  ],
  challengeRating: 0.25,
  experienceValue: 50,
  behavior: {
    aggressive: true,
    tactics: '群れで行動し、有利な立場から攻撃する',
    morale: 'low'
  },
  loot: [
    'small_coin_pouch',
    'crude_weapon'
  ],
  backstory: '森の奥深くに住むゴブリンの一族。人間の村を襲うことがある。',
  status: 'active',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// テスト用ボスエネミー（ゴブリンキング）
export const mockEnemyGoblinKing: EnemyCharacter = {
  id: 'test-enemy-goblin-king',
  campaignId: 'test-campaign-001',
  name: 'ゴブリンキング',
  description: 'テスト用のゴブリンキング。ゴブリン族のリーダーです。',
  type: 'enemy',
  race: 'goblin',
  class: 'fighter',
  level: 3,
  stats: {
    strength: 16,
    dexterity: 12,
    constitution: 16,
    intelligence: 12,
    wisdom: 10,
    charisma: 14,
    hitPoints: 32,
    maxHitPoints: 32,
    armorClass: 17,
    speed: 30
  },
  skills: {
    ...mockSkillsBasic,
    intimidation: 4,
    athletics: 5
  },
  equipment: [
    'magic_scimitar',
    'plate_armor',
    'crown_of_goblins'
  ],
  abilities: [
    {
      name: 'Leadership',
      description: '仲間のゴブリンの攻撃力を上げる',
      type: 'aura'
    },
    {
      name: 'Multiattack',
      description: '1ターンに2回攻撃できる',
      type: 'action'
    }
  ],
  challengeRating: 3,
  experienceValue: 700,
  behavior: {
    aggressive: true,
    tactics: '仲間を指揮しながら戦う',
    morale: 'high'
  },
  loot: [
    'magic_sword',
    'royal_crown',
    'treasure_chest'
  ],
  backstory: 'ゴブリン族を統一した強力なリーダー。人間との戦争を画策している。',
  status: 'active',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// キャラクターのリスト（複数選択テスト用）
export const mockCharacterList: TRPGCharacter[] = [
  mockCharacterWarrior,
  mockCharacterMage
];

export const mockNPCList: NPCCharacter[] = [
  mockNPCMayor
];

export const mockEnemyList: EnemyCharacter[] = [
  mockEnemyGoblin,
  mockEnemyGoblinKing
];