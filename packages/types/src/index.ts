// ==========================================
// TRPG共通型定義
// ==========================================

// 基本的なID型
export type ID = string;

// 日時型
export type DateTime = string; // ISO 8601 format

// ==========================================
// 基本能力値とステータス
// ==========================================

export interface BaseStats {
  strength: number;       // 筋力
  dexterity: number;      // 敏捷
  constitution: number;   // 体力
  intelligence: number;   // 知力
  wisdom: number;         // 判断力
  charisma: number;       // 魅力
}

export interface DerivedStats {
  hitPoints: number;      // HP
  maxHitPoints: number;   // 最大HP
  magicPoints: number;    // MP
  maxMagicPoints: number; // 最大MP
  armorClass: number;     // AC/防御力
  initiative: number;     // イニシアチブ
  speed: number;          // 移動速度
}

export interface StatusEffect {
  id: ID;
  name: string;
  description: string;
  duration: number;       // ターン数、-1は永続
  type: 'buff' | 'debuff' | 'neutral';
  effects: Record<string, number>; // 能力値への影響
}

// ==========================================
// スキルと特技
// ==========================================

export interface Skill {
  id: ID;
  name: string;
  description: string;
  attribute: keyof BaseStats; // 関連能力値
  level: number;
  experience: number;
  isClassSkill: boolean;
}

export interface Feat {
  id: ID;
  name: string;
  description: string;
  prerequisites: string[];
  effects: string[];
  category: 'combat' | 'magic' | 'social' | 'utility';
}

// ==========================================
// アイテムと装備
// ==========================================

export interface Item {
  id: ID;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'tool' | 'misc';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  value: number; // 価値（通貨単位）
  weight: number; // 重量
  quantity: number;
  properties: Record<string, any>;
}

export interface Equipment {
  weapon: Item | null;
  armor: Item | null;
  shield: Item | null;
  accessories: Item[];
  inventory: Item[];
  totalWeight: number;
  carryingCapacity: number;
}

// ==========================================
// キャラクター共通インターフェース
// ==========================================

export interface BaseCharacter {
  id: ID;
  name: string;
  description: string;
  age: number;
  race: string;
  class: string;
  level: number;
  experience: number;
  
  // 能力値
  baseStats: BaseStats;
  derivedStats: DerivedStats;
  
  // スキルと特技
  skills: Skill[];
  feats: Feat[];
  
  // 装備とアイテム
  equipment: Equipment;
  
  // 状態管理
  statusEffects: StatusEffect[];
  
  // 外見と設定
  appearance: {
    height: string;
    weight: string;
    eyeColor: string;
    hairColor: string;
    skinColor: string;
    distinguishingFeatures: string;
    image?: string; // 画像URL
    avatar?: string; // アバター画像URL
  };
  
  // 背景設定
  background: {
    backstory: string;
    personality: string;
    ideals: string;
    bonds: string;
    flaws: string;
    languages: string[];
    proficiencies: string[];
  };
  
  // 位置情報
  currentLocationId?: ID; // 現在いる場所
  locationHistory: Array<{
    locationId: ID;
    enteredAt: DateTime;
    leftAt?: DateTime;
  }>;
  
  // メタデータ
  createdAt: DateTime;
  updatedAt: DateTime;
}

// ==========================================
// PC（プレイヤーキャラクター）
// ==========================================

export interface TRPGCharacter extends BaseCharacter {
  characterType: 'PC';
  playerId?: ID; // プレイヤーID（セッション時）
  
  // PC固有の情報
  growth: {
    levelUpHistory: Array<{
      level: number;
      date: DateTime;
      improvements: string[];
    }>;
    nextLevelExp: number;
    unspentSkillPoints: number;
    unspentFeatPoints: number;
  };
  
  // パーティ情報
  party: {
    role: 'tank' | 'dps' | 'healer' | 'support' | 'utility';
    position: 'front' | 'middle' | 'back';
    leadership: boolean;
  };
  
  // プレイヤー関連
  playerNotes: string;
  gmNotes: string;
}

// ==========================================
// NPC（ノンプレイヤーキャラクター）
// ==========================================

export interface NPCCharacter extends BaseCharacter {
  characterType: 'NPC';
  
  // NPC固有の情報
  npcData: {
    importance: 'major' | 'minor' | 'background';
    disposition: 'friendly' | 'neutral' | 'hostile' | 'unknown';
    occupation: string;
    location: string;
    
    // AI行動パターン
    aiPersonality: {
      traits: string[];
      goals: string[];
      motivations: string[];
      fears: string[];
      
      // AI自律制御設定
      autonomyLevel: 'manual' | 'assisted' | 'autonomous'; // 制御レベル
      decisionMaking: {
        aggressiveness: number; // -10 to 10 (消極的 ↔ 積極的)
        curiosity: number; // 0 to 10 (好奇心)
        loyalty: number; // -10 to 10 (裏切り ↔ 忠誠)
        rationality: number; // 0 to 10 (感情的 ↔ 論理的)
        sociability: number; // -10 to 10 (内向的 ↔ 外向的)
      };
      
      // 行動優先度
      actionPriorities: {
        self_preservation: number; // 自己保存 (0-10)
        goal_achievement: number; // 目標達成 (0-10)
        relationship_maintenance: number; // 関係維持 (0-10)
        information_gathering: number; // 情報収集 (0-10)
        conflict_avoidance: number; // 争い回避 (0-10)
      };
      
      // AI応答パターン
      responsePatterns: {
        greetings: string[];
        farewells: string[];
        agreements: string[];
        disagreements: string[];
        questions: string[];
        combat_taunts: string[];
        help_requests: string[];
        thank_you: string[];
      };
      relationships: Record<ID, {
        characterId: ID;
        relationship: string;
        attitude: number; // -10 to 10
      }>;
    };
    
    // ストーリー統合
    storyRole: {
      questInvolvement: ID[]; // 関連クエストID
      plotHooks: string[];
      secrets: string[];
      information: string[];
    };
    
    // 動的進化
    memory: {
      interactions: Array<{
        date: DateTime;
        summary: string;
        playerCharacters: ID[];
        outcome: string;
      }>;
      relationshipChanges: Array<{
        date: DateTime;
        characterId: ID;
        oldAttitude: number;
        newAttitude: number;
        reason: string;
      }>;
    };
  };
}

// ==========================================
// Enemy（敵キャラクター）
// ==========================================

export interface EnemyCharacter extends BaseCharacter {
  characterType: 'Enemy';
  
  // Enemy固有の情報
  enemyData: {
    category: 'minion' | 'elite' | 'boss' | 'legendary';
    challengeRating: number;
    encounterLevel: number;
    
    // 戦闘データ
    combat: {
      tactics: string[];
      specialAbilities: Array<{
        name: string;
        description: string;
        cooldown: number;
        cost: number;
        type: 'active' | 'passive' | 'reaction';
      }>;
      weaknesses: string[];
      resistances: string[];
      immunities: string[];
      
      // AI戦闘制御
      aiCombatBehavior: {
        autonomyLevel: 'manual' | 'assisted' | 'autonomous';
        aggression: number; // 0-10 (防御的 ↔ 攻撃的)
        intelligence: number; // 0-10 (単純 ↔ 戦術的)
        teamwork: number; // 0-10 (個人戦 ↔ 連携重視)
        preservation: number; // 0-10 (無謀 ↔ 慎重)
        
        // 行動パターン
        preferredTargets: ('weakest' | 'strongest' | 'healer' | 'caster' | 'closest' | 'random')[];
        combatDialogue: {
          battle_start: string[];
          taking_damage: string[];
          dealing_damage: string[];
          low_health: string[];
          victory: string[];
          defeat: string[];
        };
        
        // 戦術的判断
        tacticalDecisions: {
          retreat_threshold: number; // HP% で撤退判断
          ability_usage_strategy: 'conservative' | 'balanced' | 'aggressive';
          positioning_preference: 'front' | 'back' | 'flanking' | 'adaptive';
          focus_fire: boolean; // 集中攻撃するか
        };
      };
    };
    
    // 遭遇管理
    encounter: {
      environment: string[];
      companions: ID[]; // 同時出現する敵ID
      tactics: string;
      escapeThreshold: number; // HP閾値
      morale: number;
    };
    
    // 戦利品
    loot: {
      experience: number;
      currency: number;
      items: Array<{
        itemId: ID;
        dropRate: number; // 0-1
        quantity: number;
      }>;
    };
  };
}

// 統合キャラクター型
export type Character = TRPGCharacter | NPCCharacter | EnemyCharacter;

// ==========================================
// クエストとイベント
// ==========================================

export interface QuestObjective {
  id: ID;
  description: string;
  completed: boolean;
  optional: boolean;
  progress: number; // 0-100%
  requirements: string[];
}

export interface Quest {
  id: ID;
  title: string;
  description: string;
  type: 'main' | 'side' | 'personal' | 'faction';
  status: 'not_started' | 'active' | 'completed' | 'failed' | 'cancelled';
  
  // 進行管理
  objectives: QuestObjective[];
  prerequisites: ID[]; // 前提クエストID
  followups: ID[]; // 後続クエストID
  
  // 報酬
  rewards: {
    experience: number;
    currency: number;
    items: ID[];
    reputation: Record<string, number>; // 派閥名 -> 評価値
    storyProgression: string[];
  };
  
  // 時間管理
  timeLimit?: DateTime;
  estimatedDuration: number; // 分
  
  // 関連情報
  giver: ID; // NPCのID
  location: string;
  level: number;
  
  // メタデータ
  createdAt: DateTime;
  updatedAt: DateTime;
  completedAt?: DateTime;
}

export interface TRPGEvent {
  id: ID;
  title: string;
  description: string;
  type: 'story' | 'combat' | 'social' | 'exploration' | 'puzzle' | 'rest';
  
  // 時間管理
  scheduledDate: DateTime;
  duration: number; // 分
  actualStartTime?: DateTime;
  actualEndTime?: DateTime;
  
  // 関連情報
  questId?: ID;
  locationId?: ID; // 発生場所のID
  participants: ID[]; // キャラクターID
  
  // 場所条件
  locationRequirements?: {
    requiredLocationType?: Location['type'];
    requiredProperties?: Array<keyof Location['properties']>;
    excludedLocations?: ID[];
    minimumSafetyLevel?: number;
  };
  
  // 難易度とバランス
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme';
  challengeRating: number;
  
  // 結果と成果
  outcomes: {
    success: boolean;
    experience: number;
    rewards: string[];
    consequences: string[];
    storyImpact: string[];
  };
  
  // AI生成情報
  aiGenerated: boolean;
  seedPrompt?: string;
  
  // メタデータ
  createdAt: DateTime;
  updatedAt: DateTime;
  completedAt?: DateTime;
}

// ==========================================
// セッション管理
// ==========================================

export interface SessionParticipant {
  characterId: ID;
  playerId?: string; // プレイヤー識別子
  connectionStatus: 'connected' | 'disconnected' | 'away';
  lastActivity: DateTime;
}

export interface SessionState {
  id: ID;
  campaignId: ID;
  sessionNumber: number;
  
  // セッション状態
  status: 'preparing' | 'active' | 'paused' | 'completed' | 'cancelled';
  mode: 'exploration' | 'combat' | 'social' | 'planning';
  
  // 参加者管理
  participants: SessionParticipant[];
  gamemaster: string; // GM識別子
  
  // 時間管理
  startTime?: DateTime;
  endTime?: DateTime;
  breaks: Array<{
    startTime: DateTime;
    endTime?: DateTime;
    reason: string;
  }>;
  
  // ゲーム状態
  currentEvent?: ID;
  eventQueue: ID[];
  completedEvents: ID[];
  
  // 戦闘状態（combat modeの場合）
  combat?: {
    active: boolean;
    currentTurn: number;
    turnOrder: Array<{
      characterId: ID;
      initiative: number;
      hasActed: boolean;
    }>;
    round: number;
    conditions: StatusEffect[];
  };
  
  // チャットログ
  chatLog: Array<{
    id: ID;
    timestamp: DateTime;
    speaker: string; // プレイヤー名またはキャラクター名
    characterId?: ID;
    message: string;
    type: 'ic' | 'ooc' | 'system' | 'dice' | 'whisper';
    recipients?: string[]; // whisperの場合
  }>;
  
  // ダイスロール履歴
  diceRolls: Array<{
    id: ID;
    timestamp: DateTime;
    roller: string;
    characterId?: ID;
    dice: string; // "2d6+3" 形式
    results: number[];
    total: number;
    purpose: string; // "Attack roll", "Skill check", etc.
    target?: number;
    success?: boolean;
  }>;
  
  // セッションノート
  notes: {
    gm: string;
    players: Record<string, string>; // playerId -> notes
    shared: string;
  };
  
  // メタデータ
  createdAt: DateTime;
  updatedAt: DateTime;
}

// ==========================================
// キャンペーン管理
// ==========================================

export interface CampaignSettings {
  // 基本設定
  gameSystem: string; // "D&D 5e", "Pathfinder", "オリジナル" など
  theme: string;
  setting: string;
  
  // 世界設定
  world: {
    name: string;
    description: string;
    technologyLevel: 'stone_age' | 'medieval' | 'renaissance' | 'industrial' | 'modern' | 'futuristic';
    magicLevel: 'none' | 'low' | 'medium' | 'high' | 'epic';
    scale: 'local' | 'regional' | 'continental' | 'global' | 'planar';
    tone: 'light' | 'serious' | 'dark' | 'comedic' | 'mixed';
  };
  
  // プレイヤー設定
  players: {
    expectedCount: number;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    playStyle: 'combat' | 'roleplay' | 'exploration' | 'puzzle' | 'balanced';
    sessionLength: number; // 時間（分）
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'irregular';
  };
  
  // ルール設定
  rules: {
    allowMulticlassing: boolean;
    allowOptionalRules: boolean;
    deathSaves: boolean;
    criticalHitRules: string;
    restVariant: 'standard' | 'gritty' | 'heroic';
    experienceType: 'xp' | 'milestone';
  };
  
  // AI設定
  ai: {
    assistanceLevel: 'minimal' | 'moderate' | 'extensive';
    autoGenerateNPCs: boolean;
    autoGenerateEvents: boolean;
    dynamicDifficulty: boolean;
    preferredProviders: string[];
  };
}

export interface TRPGCampaign {
  id: ID;
  name: string;
  description: string;
  
  // キャンペーン設定
  settings: CampaignSettings;
  
  // キャンペーン状態
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  currentLevel: number;
  
  // 時間管理
  startDate?: DateTime;
  endDate?: DateTime;
  expectedDuration: number; // セッション数
  
  // 目標設定
  goals: {
    mainQuest: string;
    subQuests: string[];
    characterGoals: Record<ID, string[]>; // characterId -> goals
    storyArcs: Array<{
      name: string;
      description: string;
      status: 'planned' | 'active' | 'completed';
      estimatedSessions: number;
    }>;
  };
  
  // 関連データ
  characters: ID[]; // キャラクターID
  quests: ID[]; // クエストID
  events: ID[]; // イベントID
  sessions: ID[]; // セッションID
  
  // 世界データ
  locations: Array<{
    id: ID;
    name: string;
    description: string;
    type: 'city' | 'dungeon' | 'wilderness' | 'building' | 'room';
    parentLocation?: ID;
    connections: ID[];
    npcs: ID[];
    quests: ID[];
    secrets: string[];
  }>;
  
  // 派閥・組織
  factions: Array<{
    id: ID;
    name: string;
    description: string;
    alignment: string;
    goals: string[];
    resources: string[];
    allies: ID[];
    enemies: ID[];
    reputation: Record<ID, number>; // characterId -> reputation
  }>;
  
  // キャンペーンノート
  notes: {
    gm: string;
    world: string;
    npcs: string;
    plot: string;
    sessions: Record<number, string>; // sessionNumber -> notes
  };
  
  // AI生成コンテンツ
  aiContent: {
    generatedNPCs: ID[];
    generatedEvents: ID[];
    generatedQuests: ID[];
    seedPrompts: Array<{
      type: string;
      prompt: string;
      result: string;
      usedAt: DateTime;
    }>;
  };
  
  // メタデータ
  createdAt: DateTime;
  updatedAt: DateTime;
  lastPlayedAt?: DateTime;
  totalPlayTime: number; // 分
}

// ==========================================
// AI統合型定義
// ==========================================

export interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'custom';
  endpoint?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  available: boolean;
}

export interface AIRequest {
  id: ID;
  provider: string;
  model: string;
  prompt: string;
  context: Record<string, any>;
  timestamp: DateTime;
  
  // レスポンス
  response?: string;
  tokensUsed?: number;
  processingTime?: number;
  error?: string;
  
  // 用途分類
  category: 'character_generation' | 'world_building' | 'event_generation' | 
           'npc_behavior' | 'dialogue' | 'combat_assistance' | 'rule_clarification';
}

export interface AIPersona {
  id: ID;
  name: string;
  description: string;
  systemPrompt: string;
  category: 'gm_assistant' | 'world_builder' | 'character_creator' | 
           'story_teller' | 'rule_advisor' | 'balance_checker';
  
  // 専門化設定
  specialization: {
    gameSystem?: string;
    focus: string[];
    restrictions: string[];
  };
  
  // 性能設定
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  
  // 使用統計
  usage: {
    timesUsed: number;
    averageRating: number;
    lastUsed?: DateTime;
  };
}

// ==========================================
// ユーティリティ型
// ==========================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  timestamp: DateTime;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ==========================================
// 型ガード関数
// ==========================================

export function isTRPGCharacter(character: Character): character is TRPGCharacter {
  return character.characterType === 'PC';
}

export function isNPCCharacter(character: Character): character is NPCCharacter {
  return character.characterType === 'NPC';
}

export function isEnemyCharacter(character: Character): character is EnemyCharacter {
  return character.characterType === 'Enemy';
}

// ==========================================
// 場所管理システム型定義
// ==========================================

export interface Location {
  id: ID;
  name: string;
  description: string;
  type: 'region' | 'settlement' | 'building' | 'room' | 'dungeon' | 'wilderness' | 'landmark';
  
  // 階層構造
  parentLocationId?: ID;
  childLocationIds: ID[];
  
  // 地理情報
  coordinates?: {
    x: number;
    y: number;
    z?: number; // 高度/階層
  };
  
  // 接続情報
  connections: Array<{
    locationId: ID;
    connectionType: 'path' | 'door' | 'stairs' | 'portal' | 'bridge' | 'boat' | 'teleport';
    description?: string;
    requirements?: string[]; // 通行に必要な条件
    travelTime?: number; // 移動時間（分）
    difficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
  }>;
  
  // 環境情報
  environment: {
    lighting: 'bright' | 'dim' | 'dark' | 'magical';
    temperature: 'freezing' | 'cold' | 'cool' | 'comfortable' | 'warm' | 'hot' | 'scorching';
    weather?: 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy';
    terrain: 'urban' | 'forest' | 'mountain' | 'desert' | 'swamp' | 'underground' | 'water' | 'air';
    hazards: string[]; // 環境的危険
    resources: string[]; // 利用可能なリソース
  };
  
  // 存在するエンティティ
  presentEntities: {
    characters: ID[]; // 現在この場所にいるキャラクター
    npcs: ID[]; // 常駐NPC
    enemies: ID[]; // 敵キャラクター
    events: ID[]; // この場所で発生するイベント
    items: ID[]; // 配置されているアイテム
    structures: string[]; // 建造物や設備
  };
  
  // アクセス制御
  access: {
    isPublic: boolean;
    requiredPermissions: string[];
    restrictedGroups: string[];
    entranceFee?: number;
    operatingHours?: {
      open: string; // HH:MM format
      close: string;
    };
  };
  
  // 場所固有の特性
  properties: {
    isRestArea: boolean; // 休息可能
    hasShops: boolean; // 商店がある
    hasTeleporter: boolean; // テレポート地点
    isSecret: boolean; // 秘密の場所
    isDangerous: boolean; // 危険地帯
    magicLevel: 'none' | 'low' | 'medium' | 'high' | 'extreme'; // 魔法レベル
    sanctity: 'cursed' | 'neutral' | 'blessed'; // 聖性
  };
  
  // 発見状態（プレイヤー視点）
  discovery: {
    isKnown: boolean; // プレイヤーが知っている
    isExplored: boolean; // 詳細が判明している
    discoveredAt?: DateTime;
    discoveredBy?: ID[]; // 発見したキャラクター
    explorationLevel: number; // 0-100の探索度
  };
  
  // ゲーム機能
  gameplay: {
    encounterRate: number; // 0-1 (ランダムエンカウント率)
    lootSpawnRate: number; // 0-1 (アイテム出現率)
    experienceModifier: number; // 経験値倍率
    difficultyModifier: number; // 難易度修正
    stealthModifier: number; // 隠密行動への影響
  };
  
  // AI制御情報
  aiData?: {
    atmosphere: string; // AI生成用の雰囲気設定
    suggestedActions: string[]; // 推奨される行動
    narrativeHooks: string[]; // 物語のフック
    ambientDescriptions: string[]; // 環境描写のバリエーション
  };
  
  // メタデータ
  createdAt: DateTime;
  updatedAt: DateTime;
  lastVisited?: DateTime;
  visitCount: number;
}

export interface LocationMovement {
  id: ID;
  characterId: ID;
  fromLocationId: ID;
  toLocationId: ID;
  
  // 移動情報
  startTime: DateTime;
  endTime?: DateTime;
  estimatedDuration: number; // 分
  actualDuration?: number;
  
  // 移動方法
  movementType: 'walk' | 'run' | 'ride' | 'fly' | 'teleport' | 'swim' | 'climb';
  transportMethod?: string; // 馬、船、魔法など
  
  // 移動状態
  status: 'planning' | 'traveling' | 'completed' | 'interrupted' | 'failed';
  interruption?: {
    reason: string;
    location: ID; // 中断された場所
    timestamp: DateTime;
  };
  
  // 移動中のイベント
  travelEvents: Array<{
    eventId?: ID;
    description: string;
    timestamp: DateTime;
    resolved: boolean;
  }>;
  
  // コスト
  costs: {
    energy?: number; // スタミナ消費
    currency?: number; // 交通費
    resources?: Array<{ itemId: ID; quantity: number }>; // 消費アイテム
  };
  
  // 同行者
  companions: ID[]; // 一緒に移動するキャラクター
  
  // メタデータ
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface LocationInteraction {
  id: ID;
  locationId: ID;
  characterId: ID;
  
  // 相互作用の種類
  interactionType: 'enter' | 'exit' | 'search' | 'rest' | 'shop' | 'talk' | 'combat' | 'craft' | 'study';
  
  // 詳細情報
  details: {
    description: string;
    targetEntityId?: ID; // 相互作用の対象
    targetType?: 'character' | 'item' | 'structure' | 'environment';
    duration?: number; // 所要時間（分）
    success?: boolean;
    results?: string[];
  };
  
  // コンテキスト
  context: {
    sessionId?: ID;
    eventId?: ID;
    questId?: ID;
    triggeredBy: 'player' | 'ai' | 'event' | 'system';
  };
  
  // 効果
  effects: {
    characterChanges?: Record<string, any>; // キャラクターへの影響
    locationChanges?: Record<string, any>; // 場所への影響
    itemsGained?: Array<{ itemId: ID; quantity: number }>;
    itemsLost?: Array<{ itemId: ID; quantity: number }>;
    experienceGained?: number;
  };
  
  timestamp: DateTime;
}

// 場所検索・フィルタリング用
export interface LocationQuery {
  name?: string;
  type?: Location['type'][];
  parentLocationId?: ID;
  hasCharacter?: ID;
  hasNPC?: ID;
  hasEnemy?: ID;
  hasEvent?: ID;
  isAccessible?: boolean;
  isKnown?: boolean;
  properties?: Partial<Location['properties']>;
  maxDistance?: number; // 指定地点からの最大距離
  fromLocationId?: ID; // 距離計算の起点
  page?: number; // ページ番号
  limit?: number; // 1ページあたりの件数
}

// 場所間の関係性
export interface LocationRelationship {
  fromLocationId: ID;
  toLocationId: ID;
  relationship: 'parent' | 'child' | 'sibling' | 'connected' | 'near' | 'far' | 'hostile' | 'allied';
  distance?: number; // 単位: km
  travelTime?: number; // 単位: 分
  description?: string;
}

// ==========================================
// AI自律制御システム型定義
// ==========================================

export interface AIAction {
  id: ID;
  characterId: ID;
  type: 'dialogue' | 'movement' | 'combat' | 'interaction' | 'skill_use' | 'spell_cast';
  subtype?: string;
  
  // アクション詳細
  details: {
    description: string;
    target?: ID; // 対象キャラクターID
    parameters: Record<string, any>;
    success?: boolean;
    result?: string;
  };
  
  // コンテキスト情報
  context: {
    sessionId: ID;
    round?: number;
    turn?: number;
    sessionMode: 'exploration' | 'combat' | 'social' | 'planning';
    currentEvent?: ID;
    triggerReason: string;
  };
  
  // AI判断情報
  aiDecision: {
    confidence: number; // 0-1 (判断の確信度)
    reasoning: string;
    alternativeOptions: string[];
    personalityFactors: string[];
  };
  
  // 実行情報
  timestamp: DateTime;
  executedAt?: DateTime;
  duration?: number; // 実行時間（秒）
}

export interface AIBehaviorPattern {
  id: ID;
  name: string;
  description: string;
  
  // 適用条件
  conditions: {
    characterTypes: ('NPC' | 'Enemy')[];
    sessionModes: ('exploration' | 'combat' | 'social' | 'planning')[];
    healthThresholds?: {
      min?: number; // 最小HP%
      max?: number; // 最大HP%
    };
    relationship?: {
      withPCs: 'friendly' | 'neutral' | 'hostile';
      withNPCs?: string[];
    };
    contextTriggers: string[]; // 特定のキーワードや状況
  };
  
  // 行動ルール
  behaviorRules: {
    priority: number; // 1-10 (高いほど優先)
    frequency: 'always' | 'often' | 'sometimes' | 'rarely'; // 発動頻度
    
    actions: Array<{
      type: AIAction['type'];
      weight: number; // 選択重み
      conditions?: string[];
      templates: string[]; // テンプレート文
    }>;
    
    // 連鎖行動
    followUpActions?: Array<{
      trigger: string;
      nextAction: string;
      delay?: number; // 秒
    }>;
  };
}

export interface AIDecisionContext {
  sessionId: ID;
  characterId: ID;
  
  // セッション状態
  sessionState: {
    mode: 'exploration' | 'combat' | 'social' | 'planning';
    round?: number;
    turn?: number;
    activeEvent?: ID;
    lastActions: AIAction[];
  };
  
  // キャラクター状態
  characterState: {
    currentHP: number;
    maxHP: number;
    statusEffects: StatusEffect[];
    position?: string;
    lastSpoke?: DateTime;
    mood?: string;
  };
  
  // 周囲の状況
  environmentContext: {
    presentCharacters: ID[];
    location: string;
    timeOfDay?: string;
    weather?: string;
    ambiance?: string;
  };
  
  // 関係性コンテキスト
  relationshipContext: {
    pcRelationships: Record<ID, number>; // PC IDと関係値
    npcRelationships: Record<ID, number>; // NPC IDと関係値
    recentInteractions: Array<{
      characterId: ID;
      type: string;
      outcome: string;
      timestamp: DateTime;
    }>;
  };
  
  // ゲーム進行コンテキスト
  gameContext: {
    currentQuests: Quest[];
    recentEvents: TRPGEvent[];
    partyMood: string;
    storyTension: number; // 0-10
    plotDeveopments: string[];
  };
}

export interface AICharacterController {
  characterId: ID;
  
  // 制御設定
  settings: {
    enabled: boolean;
    autonomyLevel: 'manual' | 'assisted' | 'autonomous';
    interventionThreshold: number; // 0-1 (GM介入の閾値)
    responseDelay: number; // 応答遅延（秒）
    randomness: number; // 0-1 (行動のランダム性)
  };
  
  // アクティブなパターン
  activeBehaviorPatterns: ID[];
  
  // 学習データ
  learningData: {
    successfulActions: AIAction[];
    failedActions: AIAction[];
    playerFeedback: Array<{
      actionId: ID;
      rating: number; // 1-5
      comment?: string;
    }>;
    adaptiveWeights: Record<string, number>;
  };
  
  // 状態管理
  currentState: {
    lastDecision?: DateTime;
    nextDecisionDue?: DateTime;
    pendingActions: AIAction[];
    suppressedUntil?: DateTime; // 一時停止
  };
}

export interface AISessionController {
  sessionId: ID;
  
  // セッション全体の制御
  sessionSettings: {
    aiAutomationLevel: 'minimal' | 'moderate' | 'extensive';
    gmInterventionMode: 'reactive' | 'proactive' | 'hands_off';
    pacingControl: boolean; // AIがセッションペースを制御するか
    narrativeAssistance: boolean; // 物語生成支援
  };
  
  // アクティブなコントローラー
  characterControllers: Record<ID, AICharacterController>;
  
  // セッション進行管理
  progressionControl: {
    autoAdvanceEvents: boolean;
    suggestionSystem: boolean;
    conflictResolution: 'auto' | 'suggest' | 'manual';
    moodTracking: boolean;
  };
  
  // パフォーマンス監視
  performance: {
    actionsPerMinute: number;
    averageResponseTime: number;
    playerSatisfaction: number;
    gmWorkloadReduction: number;
  };
}

// ==========================================
// 定数定義
// ==========================================

export const CHARACTER_TYPES = ['PC', 'NPC', 'Enemy'] as const;
export const SESSION_STATUSES = ['preparing', 'active', 'paused', 'completed', 'cancelled'] as const;
export const CAMPAIGN_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const;
export const QUEST_STATUSES = ['not_started', 'active', 'completed', 'failed', 'cancelled'] as const;
export const EVENT_TYPES = ['story', 'combat', 'social', 'exploration', 'puzzle', 'rest'] as const;
export const DIFFICULTY_LEVELS = ['trivial', 'easy', 'medium', 'hard', 'extreme'] as const;

// デフォルト値
export const DEFAULT_BASE_STATS: BaseStats = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

export const DEFAULT_DERIVED_STATS: DerivedStats = {
  hitPoints: 20,
  maxHitPoints: 20,
  magicPoints: 10,
  maxMagicPoints: 10,
  armorClass: 10,
  initiative: 0,
  speed: 30,
};

// ==========================================
// キャラクター間会話システム
// ==========================================

export interface CharacterConversation {
  id: ID;
  locationId: ID;
  participants: ID[]; // 参加キャラクターのID
  initiatorId: ID; // 会話を開始したキャラクター
  title?: string; // 会話のタイトル
  messages: ConversationMessage[];
  status: 'active' | 'paused' | 'ended';
  startTime: DateTime;
  endTime?: DateTime;
  conversationType: 'casual' | 'negotiation' | 'information' | 'conflict' | 'romance' | 'quest';
  mood: 'friendly' | 'neutral' | 'tense' | 'hostile' | 'intimate' | 'formal';
  context: ConversationContext;
}

export interface ConversationMessage {
  id: ID;
  conversationId: ID;
  speakerId: ID; // 発言者のキャラクターID
  content: string; // メッセージ内容
  messageType: 'dialogue' | 'action' | 'thought' | 'narration';
  timestamp: DateTime;
  reactions?: ConversationReaction[]; // 他キャラクターの反応
  metadata?: {
    emotion?: 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'confused';
    volume?: 'whisper' | 'normal' | 'loud' | 'shout';
    tone?: 'serious' | 'joking' | 'sarcastic' | 'caring' | 'threatening';
    language?: string; // 使用言語
  };
}

export interface ConversationReaction {
  characterId: ID;
  type: 'like' | 'dislike' | 'agree' | 'disagree' | 'surprise' | 'confusion' | 'interest';
  expression?: string; // 表情や仕草の描写
  timestamp: DateTime;
}

export interface ConversationContext {
  currentQuest?: ID; // 現在関連しているクエスト
  recentEvents: TRPGEvent[]; // 最近の関連イベント
  relationshipChanges: Record<ID, number>; // 会話による関係値変化
  informationShared: string[]; // 共有された情報
  decisionsAgreed: string[]; // 合意された決定事項
  secretsRevealed: string[]; // 明かされた秘密
  itemsExchanged?: Array<{
    fromCharacterId: ID;
    toCharacterId: ID;
    itemName: string;
    quantity: number;
  }>;
}

export interface ConversationStartRequest {
  initiatorId: ID;
  targetCharacterIds: ID[];
  locationId: ID;
  conversationType?: CharacterConversation['conversationType'];
  initialMessage?: string;
  context?: Partial<ConversationContext>;
}

export interface AIConversationResponse {
  characterId: ID;
  response: string;
  action?: string; // キャラクターのアクション（例：「うなずく」「首を振る」）
  emotion?: 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'confused';
  relationshipChanges?: Record<ID, number>; // 他キャラクターとの関係値変化
  nextAction?: 'continue' | 'change_topic' | 'end_conversation' | 'invite_others';
}