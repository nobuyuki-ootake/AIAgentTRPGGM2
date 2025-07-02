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

// AI戦術設定システム
export * from './ai-tactics';

// パーティ統一移動システム
export * from './party-movement';

// AI Agent監視・ログシステム
export * from './ai-agent-monitoring';

// 探索アクション・エンティティ発見システム
export * from './exploration-actions';

// マイルストーン進捗更新システム
export * from './milestone-progress';

// GM通知システム
export * from './gm-notifications';

// 互換性のための型エイリアス
export type { Character, TRPGCharacter, NPCCharacter, EnemyCharacter } from './character';
export type { TRPGCampaign, Quest, Location } from './location';
export type { TRPGSession, TRPGEvent, Timeline, SessionState, ChatMessage, DiceRoll, PartyLocation, MovementProposal } from './session';
export type { AIGameContext, AIConditionExpression } from './ai-entities';
export type { 
  EnemyTacticsLevel, 
  TacticsLevel, 
  FocusType, 
  CharacterAISettings,
  ActionPriority,
  PersonalityType,
  CommunicationStyle,
  ActionAnalysis,
  AIDecisionLog,
  GMTacticsResponse,
  UpdateTacticsRequest,
  CharacterAISettingsResponse,
  UpdateCharacterAIRequest,
  AITacticsSettings,
  AgentChainResult,
  TriggerChainRequest,
  TriggerChainResponse
} from './ai-tactics';
export type {
  PartyMovementProposal,
  MovementVote,
  VotingSummary,
  PartyMovementState,
  CreateMovementProposalRequest,
  CreateMovementProposalResponse,
  CastMovementVoteRequest,
  CastMovementVoteResponse,
  ExecutePartyMovementRequest,
  ExecutePartyMovementResponse,
  ConsensusSettings,
  PartyMovementSystem,
  MovementProposalStatus,
  VoteChoice,
  GetPartyMovementStateResponse,
  UpdateConsensusSettingsRequest,
  UpdateConsensusSettingsResponse
} from './party-movement';

// 明示的定数エクスポート（Vite開発環境対応）
export { 
  DAY_PERIODS_3_ACTIONS, 
  DAY_PERIODS_4_ACTIONS, 
  SESSION_DURATION_PRESETS 
} from './session';