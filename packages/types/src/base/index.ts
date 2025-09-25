// ==========================================
// 基本型定義
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
  [key: string]: number;  // インデックスシグネチャ
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
  ability: keyof BaseStats; // 対応する能力値
  proficiency: boolean;   // 習熟しているか
  bonus: number;          // 追加ボーナス
}

export interface Feat {
  id: ID;
  name: string;
  description: string;
  prerequisites: string[]; // 前提条件
  benefits: string[];     // 効果
}

// ==========================================
// 装備品
// ==========================================

export type EquipmentType = 'weapon' | 'armor' | 'shield' | 'accessory' | 'consumable' | 'tool';
export type WeaponType = 'melee' | 'ranged' | 'magic';
export type ArmorType = 'light' | 'medium' | 'heavy';

export interface Equipment {
  id: ID;
  name: string;
  description: string;
  type: EquipmentType;
  weight: number;
  cost: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  properties: string[];
  isEquipped: boolean;
}

export interface Weapon extends Equipment {
  type: 'weapon';
  weaponType: WeaponType;
  damage: string;        // "1d8", "2d6+2" など
  damageType: string;    // "slashing", "piercing", "bludgeoning", "fire" など
  range: number;         // 射程（フィート）
  criticalRange: number; // クリティカル範囲
}

export interface Armor extends Equipment {
  type: 'armor';
  armorType: ArmorType;
  armorClass: number;
  maxDexBonus: number;   // 敏捷修正値の上限
  checkPenalty: number;  // 技能判定ペナルティ
  spellFailure: number;  // 呪文失敗率
}

// デフォルト値
export const DEFAULT_BASE_STATS: BaseStats = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10
};

export const DEFAULT_DERIVED_STATS: DerivedStats = {
  hitPoints: 10,
  maxHitPoints: 10,
  magicPoints: 0,
  maxMagicPoints: 0,
  armorClass: 10,
  initiative: 0,
  speed: 30
};

// ==========================================
// API レスポンス型
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