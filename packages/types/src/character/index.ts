// ==========================================
// キャラクター型定義
// ==========================================

import { ID, DateTime, BaseStats, DerivedStats, StatusEffect, Skill, Feat, Equipment } from '../base';

// ==========================================
// キャラクター基本型
// ==========================================

export type CharacterType = 'PC' | 'NPC' | 'Enemy';

export interface Character {
  id: ID;
  name: string;
  description: string;
  characterType: CharacterType;
  
  // ビジュアル
  appearance: string;
  imageUrl?: string;
  
  // ゲーム統計
  baseStats: BaseStats;
  derivedStats: DerivedStats;
  level: number;
  experience: number;
  
  // ゲームプレイ要素
  skills: Skill[];
  feats: Feat[];
  equipment: Equipment[];
  statusEffects: StatusEffect[];
  
  // メタデータ
  createdAt: DateTime;
  updatedAt: DateTime;
  campaignId: ID;
  
  // プレイ記録
  sessionHistory: ID[]; // 参加したセッションのID
  noteHistory: CharacterNote[];
}

export interface CharacterNote {
  id: ID;
  timestamp: DateTime;
  content: string;
  type: 'general' | 'combat' | 'roleplay' | 'progression';
  authorId: ID; // 記録者（GM or プレイヤー）
}

// ==========================================
// PC（プレイヤーキャラクター）
// ==========================================

export interface TRPGCharacter extends Character {
  characterType: 'PC';
  playerId: ID;
  
  // キャラクター作成情報
  race: string;
  class: string;
  background: string;
  alignment: string;
  
  // プレイヤー固有情報
  personalityTraits: string[];
  ideals: string[];
  bonds: string[];
  flaws: string[];
  
  // 進行状況
  questIds: ID[]; // 参加中・完了したクエスト
  relationshipIds: ID[]; // 他キャラクターとの関係
}

// ==========================================
// NPC（ノンプレイヤーキャラクター）
// ==========================================

export interface NPCCharacter extends Character {
  characterType: 'NPC';
  
  // NPC固有設定
  faction?: string;
  location: string; // 通常いる場所
  occupation: string;
  
  // 役割と行動
  role: 'questGiver' | 'merchant' | 'ally' | 'neutral' | 'informant' | 'guard';
  disposition: 'friendly' | 'neutral' | 'hostile' | 'unknown';
  
  // 対話システム
  dialoguePatterns: DialoguePattern[];
  questIds: ID[]; // 提供するクエスト
  
  // AI行動設定
  behaviorTags: string[];
  scheduleEntries: NPCScheduleEntry[];
}

export interface DialoguePattern {
  trigger: string;
  response: string;
  conditions?: string[];
  outcomes?: string[];
}

export interface NPCScheduleEntry {
  timeOfDay: string;
  location: string;
  activity: string;
  availability: boolean; // プレイヤーと対話可能か
}

// ==========================================
// 敵キャラクター
// ==========================================

export interface EnemyCharacter extends Character {
  characterType: 'Enemy';
  
  // 戦闘設定
  challengeRating: number;
  armorClass: number;
  hitDice: string; // "3d8+6" など
  
  // 特殊能力
  specialAbilities: SpecialAbility[];
  legendaryActions?: LegendaryAction[];
  
  // 戦術AI
  combatTactics: string[];
  combatRole: 'tank' | 'damage' | 'support' | 'controller' | 'striker';
  
  // 遭遇設定
  environment: string[]; // 出現する環境
  groupSize: { min: number; max: number };
  treasureIds: ID[]; // ドロップする宝物
}

export interface SpecialAbility {
  name: string;
  description: string;
  recharge: 'short_rest' | 'long_rest' | 'per_day' | 'recharge_5_6' | 'always';
  usesRemaining: number;
}

export interface LegendaryAction {
  name: string;
  description: string;
  cost: number; // アクション消費数
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