/**
 * フィクスチャ: バランスの取れたキャラクターパーティ
 * t-WADA命名規則: fixtureCharacterParty.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: パーティバランステスト、戦闘シミュレーション、UI表示確認
 */

import { 
  TRPGCharacter, 
  NPCCharacter, 
  EnemyCharacter,
  DEFAULT_BASE_STATS,
  DEFAULT_DERIVED_STATS 
} from '@ai-agent-trpg/types';

// ===================================
// 典型的な4人パーティ（レベル3）
// ===================================

// タンク役: ヒューマンファイター
export const fixtureCharacterTank: TRPGCharacter = {
  id: 'fixture-char-tank-001',
  name: 'ガレス・ドラゴンベイン',
  description: '王国騎士団出身の頼れる戦士。盾を持ち、仲間を守ることを信条とする。',
  characterType: 'PC',
  
  // 基本情報
  age: 28,
  race: 'human',
  characterClass: 'fighter',
  background: 'soldier',
  playerId: 'player-tank-main',
  
  // ビジュアル
  appearance: '背が高く筋肉質な体格。傷だらけの顔には決意が宿っている。常に磨き上げられた鎧を身につけ、家紋の入った盾を携える。',
  
  // ゲーム統計
  baseStats: {
    strength: 16,      // +3 (主能力値)
    dexterity: 12,     // +1
    constitution: 15,  // +2 (耐久力重視)
    intelligence: 10,  // +0
    wisdom: 13,        // +1 (知覚重要)
    charisma: 14       // +2 (リーダーシップ)
  },
  
  derivedStats: {
    hitPoints: 34,        // レベル3 ファイター (10+2+2+10+2+8) 
    maxHitPoints: 34,
    magicPoints: 0,
    maxMagicPoints: 0,
    armorClass: 18,       // チェインメール(16) + 盾(+2)
    initiative: 1,        // DEX修正値
    speed: 30
  },
  
  level: 3,
  experience: 900,
  
  // スキルと特技
  skills: [
    { id: 'athletics', name: '運動', description: '登攀、跳躍、水泳', ability: 'strength', proficiency: true, bonus: 5 },
    { id: 'intimidation', name: '威圧', description: '相手を恐怖させる', ability: 'charisma', proficiency: true, bonus: 4 },
    { id: 'perception', name: '知覚', description: '周囲の状況を察知', ability: 'wisdom', proficiency: false, bonus: 1 },
    { id: 'insight', name: '洞察', description: '相手の真意を見抜く', ability: 'wisdom', proficiency: false, bonus: 1 }
  ],
  
  feats: [
    {
      id: 'feat-protection',
      name: 'Protection Fighting Style',
      description: '盾を使って仲間を守ることができる',
      prerequisites: ['Fighter level 1'],
      benefits: ['仲間への攻撃に対してリアクションで AC+2']
    }
  ],
  
  // 装備
  equipment: [
    {
      id: 'longsword-masterwork',
      name: '高品質ロングソード',
      description: '丁寧に鍛造された長剣',
      type: 'weapon',
      weight: 3,
      cost: 315,
      rarity: 'common',
      properties: ['versatile', 'masterwork'],
      isEquipped: true
    },
    {
      id: 'chain-mail-fitted',
      name: '調整済みチェインメール',
      description: '体型に合わせて調整された鎖帷子',
      type: 'armor',
      weight: 55,
      cost: 75,
      rarity: 'common',
      properties: ['fitted'],
      isEquipped: true
    },
    {
      id: 'shield-heraldic',
      name: '紋章盾',
      description: '家紋が描かれた鋼鉄の盾',
      type: 'shield',
      weight: 6,
      cost: 10,
      rarity: 'common',
      properties: ['heraldic'],
      isEquipped: true
    }
  ],
  
  statusEffects: [],
  
  // 位置情報
  currentLocationId: 'location-village-greenhill',
  
  // PC固有情報
  personalityTraits: ['仲間思い', '責任感が強い', '正義感に燃える'],
  ideals: ['正義', '守護', '名誉'],
  bonds: ['王国騎士団への忠誠', '守るべき民への責任'],
  flaws: ['時として無謀', '頑固すぎる面がある'],
  
  // メタデータ
  createdAt: '2024-01-01T19:00:00Z',
  updatedAt: '2024-01-22T21:30:00Z',
  campaignId: 'fixture-campaign-beginner'
};

// ヒーラー役: ドワーフクレリック
export const fixtureCharacterHealer: TRPGCharacter = {
  id: 'fixture-char-healer-001',
  name: 'ソーリン・ストーンハート',
  description: '山の神殿で修行を積んだドワーフの僧侶。治癒と加護の専門家として仲間を支える。',
  characterType: 'PC',
  
  age: 87,
  race: 'dwarf',
  characterClass: 'cleric',
  background: 'acolyte',
  playerId: 'player-healer-support',
  
  appearance: '白いひげを蓄えた小柄なドワーフ。神聖なシンボルを首から下げ、温厚な表情を浮かべている。',
  
  baseStats: {
    strength: 13,      // +1
    dexterity: 10,     // +0
    constitution: 14,  // +2
    intelligence: 12,  // +1
    wisdom: 16,        // +3 (主能力値)
    charisma: 11       // +0
  },
  
  derivedStats: {
    hitPoints: 26,        // レベル3 クレリック (8+2+2+8+2+4)
    maxHitPoints: 26,
    magicPoints: 8,       // 呪文スロット相当
    maxMagicPoints: 8,
    armorClass: 15,       // スケールメール(14) + DEX(0) + 盾(+1)
    initiative: 0,
    speed: 25             // ドワーフの移動速度
  },
  
  level: 3,
  experience: 900,
  
  skills: [
    { id: 'medicine', name: '医術', description: '治療と診断', ability: 'wisdom', proficiency: true, bonus: 5 },
    { id: 'religion', name: '宗教', description: '神学知識', ability: 'intelligence', proficiency: true, bonus: 3 },
    { id: 'insight', name: '洞察', description: '相手の真意を見抜く', ability: 'wisdom', proficiency: true, bonus: 5 },
    { id: 'persuasion', name: '説得', description: '交渉と説得', ability: 'charisma', proficiency: false, bonus: 0 }
  ],
  
  feats: [
    {
      id: 'feat-life-domain',
      name: 'Life Domain',
      description: '生命の領域の僧侶として治癒に特化',
      prerequisites: ['Cleric level 1'],
      benefits: ['治癒呪文の効果向上', '重装鎧習熟']
    }
  ],
  
  equipment: [
    {
      id: 'mace-blessed',
      name: '祝福されたメイス',
      description: '神聖な力が宿る戦棍',
      type: 'weapon',
      weight: 4,
      cost: 5,
      rarity: 'common',
      properties: ['blessed'],
      isEquipped: true
    },
    {
      id: 'scale-mail',
      name: 'スケールメール',
      description: '鱗状の金属片を重ねた鎧',
      type: 'armor',
      weight: 45,
      cost: 50,
      rarity: 'common',
      properties: [],
      isEquipped: true
    }
  ],
  
  statusEffects: [],
  currentLocationId: 'location-village-greenhill',
  
  personalityTraits: ['慈悲深い', '忍耐強い', '信仰に篤い'],
  ideals: ['慈悲', '癒し', '奉仕'],
  bonds: ['故郷の山の神殿', '困っている人々への使命'],
  flaws: ['やや頑固', '説教臭い時がある'],
  
  createdAt: '2024-01-01T19:00:00Z',
  updatedAt: '2024-01-22T21:30:00Z',
  campaignId: 'fixture-campaign-beginner'
};

// DPS役: エルフウィザード
export const fixtureCharacterDPS: TRPGCharacter = {
  id: 'fixture-char-dps-001',
  name: 'エリアンドラ・ムーンウィスパー',
  description: '古代の魔法学院で学んだエルフの魔法使い。破壊と制御の呪文を得意とする知識欲旺盛な学者。',
  characterType: 'PC',
  
  age: 156,
  race: 'elf',
  characterClass: 'wizard',
  background: 'sage',
  playerId: 'player-dps-ranged',
  
  appearance: '銀色の長い髪と鋭い青い目を持つ美しいエルフ。魔法の杖を手に、常に思考に耽っている。',
  
  baseStats: {
    strength: 8,       // -1
    dexterity: 14,     // +2
    constitution: 12,  // +1
    intelligence: 16,  // +3 (主能力値)
    wisdom: 13,        // +1
    charisma: 11       // +0
  },
  
  derivedStats: {
    hitPoints: 20,        // レベル3 ウィザード (6+1+1+6+1+5)
    maxHitPoints: 20,
    magicPoints: 12,      // 呪文スロット相当
    maxMagicPoints: 12,
    armorClass: 12,       // 魔法使いの鎧なし (10 + DEX修正値)
    initiative: 2,
    speed: 30
  },
  
  level: 3,
  experience: 900,
  
  skills: [
    { id: 'arcana', name: '魔法学', description: '魔法に関する知識', ability: 'intelligence', proficiency: true, bonus: 5 },
    { id: 'history', name: '歴史', description: '歴史的事実の知識', ability: 'intelligence', proficiency: true, bonus: 5 },
    { id: 'investigation', name: '捜査', description: '手がかりの発見', ability: 'intelligence', proficiency: true, bonus: 5 },
    { id: 'insight', name: '洞察', description: '相手の真意を見抜く', ability: 'wisdom', proficiency: false, bonus: 1 }
  ],
  
  feats: [
    {
      id: 'feat-evocation-school',
      name: 'School of Evocation',
      description: '破壊魔法の専門家',
      prerequisites: ['Wizard level 2'],
      benefits: ['呪文威力向上', '仲間への誤射回避']
    }
  ],
  
  equipment: [
    {
      id: 'quarterstaff-arcane',
      name: '魔法の杖',
      description: '魔力を増幅する杖',
      type: 'weapon',
      weight: 4,
      cost: 2,
      rarity: 'common',
      properties: ['arcane_focus'],
      isEquipped: true
    },
    {
      id: 'robes-wizard',
      name: '魔法使いのローブ',
      description: '機能的な魔法使いの服装',
      type: 'accessory',
      weight: 4,
      cost: 2,
      rarity: 'common',
      properties: ['spellcaster_garb'],
      isEquipped: true
    }
  ],
  
  statusEffects: [],
  currentLocationId: 'location-village-greenhill',
  
  personalityTraits: ['好奇心旺盛', '理論的思考', '完璧主義'],
  ideals: ['知識', '真理の探求', '理解'],
  bonds: ['魔法学院での師匠', '古代の秘密の書物'],
  flaws: ['実戦経験不足', '理論偏重'],
  
  createdAt: '2024-01-01T19:00:00Z',
  updatedAt: '2024-01-22T21:30:00Z',
  campaignId: 'fixture-campaign-beginner'
};

// ユーティリティ役: ハーフリングローグ
export const fixtureCharacterUtility: TRPGCharacter = {
  id: 'fixture-char-utility-001',
  name: 'ピップ・ライトフィンガー',
  description: '盗賊ギルド出身の器用なハーフリング。鍵開けや隠密行動、情報収集を得意とする。',
  characterType: 'PC',
  
  age: 22,
  race: 'halfling',
  characterClass: 'rogue',
  background: 'criminal',
  playerId: 'player-utility-rogue',
  
  appearance: '小柄で俊敏なハーフリング。いつも笑顔を浮かべているが、その目は鋭く周囲を観察している。',
  
  baseStats: {
    strength: 10,      // +0
    dexterity: 16,     // +3 (主能力値)
    constitution: 13,  // +1
    intelligence: 14,  // +2
    wisdom: 12,        // +1
    charisma: 11       // +0
  },
  
  derivedStats: {
    hitPoints: 24,        // レベル3 ローグ (8+1+1+8+1+5)
    maxHitPoints: 24,
    magicPoints: 0,
    maxMagicPoints: 0,
    armorClass: 14,       // レザーアーマー(11) + DEX修正値(+3)
    initiative: 3,
    speed: 25             // ハーフリングの移動速度
  },
  
  level: 3,
  experience: 900,
  
  skills: [
    { id: 'stealth', name: '隠密', description: '気づかれずに行動', ability: 'dexterity', proficiency: true, bonus: 5 },
    { id: 'sleightOfHand', name: '手先の早業', description: '器用な手技', ability: 'dexterity', proficiency: true, bonus: 5 },
    { id: 'investigation', name: '捜査', description: '手がかりの発見', ability: 'intelligence', proficiency: true, bonus: 4 },
    { id: 'perception', name: '知覚', description: '周囲の状況察知', ability: 'wisdom', proficiency: true, bonus: 3 },
    { id: 'deception', name: '欺瞞', description: '嘘やごまかし', ability: 'charisma', proficiency: true, bonus: 2 },
    { id: 'acrobatics', name: '軽業', description: 'バランスと敏捷性', ability: 'dexterity', proficiency: true, bonus: 5 }
  ],
  
  feats: [
    {
      id: 'feat-sneak-attack',
      name: 'Sneak Attack',
      description: '不意討ちによる追加ダメージ',
      prerequisites: ['Rogue level 1'],
      benefits: ['2d6追加ダメージ（条件付き）']
    },
    {
      id: 'feat-thieves-cant',
      name: "Thieves' Cant",
      description: '盗賊の隠語',
      prerequisites: ['Rogue level 1'],
      benefits: ['盗賊との秘密の意思疎通']
    }
  ],
  
  equipment: [
    {
      id: 'shortsword-keen',
      name: '鋭利なショートソード',
      description: 'よく手入れされた短剣',
      type: 'weapon',
      weight: 2,
      cost: 10,
      rarity: 'common',
      properties: ['finesse', 'light', 'keen'],
      isEquipped: true
    },
    {
      id: 'leather-armor-studded',
      name: 'スタッデッドレザー',
      description: '金属鋲付きの革鎧',
      type: 'armor',
      weight: 13,
      cost: 45,
      rarity: 'common',
      properties: ['light'],
      isEquipped: true
    },
    {
      id: 'thieves-tools-masterwork',
      name: '高品質盗賊道具',
      description: '精密に作られた鍵開け道具',
      type: 'tool',
      weight: 1,
      cost: 25,
      rarity: 'uncommon',
      properties: ['masterwork', '+2_bonus'],
      isEquipped: true
    }
  ],
  
  statusEffects: [],
  currentLocationId: 'location-village-greenhill',
  
  personalityTraits: ['楽観的', '機敏', '社交的'],
  ideals: ['自由', '仲間への忠義', '効率性'],
  bonds: ['古い盗賊ギルドの仲間', '育ての親への恩'],
  flaws: ['財宝への強い欲望', '時々調子に乗りすぎる'],
  
  createdAt: '2024-01-01T19:00:00Z',
  updatedAt: '2024-01-22T21:30:00Z',
  campaignId: 'fixture-campaign-beginner'
};

// ===================================
// バランスの取れたパーティ編成
// ===================================

export const fixtureBalancedParty: TRPGCharacter[] = [
  fixtureCharacterTank,
  fixtureCharacterHealer,
  fixtureCharacterDPS,
  fixtureCharacterUtility
];

// パーティ統計
export const fixturePartyStats = {
  totalLevel: 12,
  averageLevel: 3,
  totalHitPoints: 104,
  totalArmorClass: {
    min: 12,
    max: 18,
    average: 14.75
  },
  roles: {
    tank: 1,
    healer: 1,
    dps: 1,
    utility: 1
  },
  races: ['human', 'dwarf', 'elf', 'halfling'],
  classes: ['fighter', 'cleric', 'wizard', 'rogue']
};