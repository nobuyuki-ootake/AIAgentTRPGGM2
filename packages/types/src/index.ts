// ==========================================
// TRPG共通型定義 - モジュール分割版
// ==========================================

// 基本型定義
export * from './base';

// キャラクター関連
export * from './character';

// 場所・キャンペーン管理
export * from './location';

// セッション・タイムライン
export * from './session';

// AI基盤システム
export * from './ai-entities';

// 互換性のための型エイリアス
export type { Character, TRPGCharacter, NPCCharacter, EnemyCharacter } from './character';
export type { TRPGCampaign, Quest, Location } from './location';
export type { TRPGSession, TRPGEvent, Timeline, SessionState, ChatMessage, DiceRoll } from './session';
export type { AIGameContext, AIConditionExpression } from './ai-entities';

// 明示的定数エクスポート（Vite開発環境対応）
export { 
  DAY_PERIODS_3_ACTIONS, 
  DAY_PERIODS_4_ACTIONS, 
  SESSION_DURATION_PRESETS 
} from './session';