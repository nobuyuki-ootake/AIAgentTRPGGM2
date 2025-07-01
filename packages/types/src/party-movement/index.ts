// ==========================================
// パーティ統一移動システム型定義
// ==========================================

import { ID, DateTime } from '../base';

// ==========================================
// パーティ移動の基本型定義
// ==========================================

export type MovementProposalStatus = 'pending' | 'voting' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';

export type VoteChoice = 'approve' | 'reject' | 'abstain';

export type MovementMethod = 'walk' | 'run' | 'ride' | 'fly' | 'teleport' | 'vehicle';

// ==========================================
// パーティ移動提案
// ==========================================

export interface PartyMovementProposal {
  id: ID;
  sessionId: ID;
  proposerId: ID; // 提案者のキャラクターID
  targetLocationId: ID;
  movementMethod: MovementMethod;
  
  // 提案内容
  reason: string; // 移動理由
  estimatedTime: number; // 推定所要時間（分）
  estimatedCost?: {
    actionPoints: number;
    resources?: Record<string, number>;
  };
  
  // 状態管理
  status: MovementProposalStatus;
  createdAt: DateTime;
  votingDeadline?: DateTime;
  
  // メタデータ
  urgency: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'normal' | 'hard' | 'dangerous';
  tags: string[];
}

// ==========================================
// 投票システム
// ==========================================

export interface MovementVote {
  id: ID;
  proposalId: ID;
  voterId: ID; // 投票者のキャラクターID
  choice: VoteChoice;
  reason?: string; // 投票理由
  timestamp: DateTime;
  
  // 混合投票システム用フィールド
  voterType: 'human' | 'ai_agent' | 'npc';
  aiDecisionFactors?: {
    confidenceScore: number;
    processingTimeMs: number;
    alternativesConsidered: string[];
  };
}

export interface VotingSummary {
  proposalId: ID;
  totalEligibleVoters: number;
  votes: {
    approve: number;
    reject: number;
    abstain: number;
  };
  
  // 投票の詳細
  voterDetails: Array<{
    voterId: ID;
    voterName: string;
    choice: VoteChoice;
    hasVoted: boolean;
    isProposer: boolean;
    voterType: 'human' | 'ai_agent' | 'npc';
    voteReason?: string;
    votedAt?: DateTime;
    
    // AI投票特有の情報
    aiDecisionFactors?: {
      confidenceScore: number;
      processingTimeMs: number;
      alternativesConsidered: string[];
    };
  }>;
  
  // 混合投票統計
  votingStatistics: {
    humanVoters: {
      total: number;
      voted: number;
      pending: number;
      breakdown: { approve: number; reject: number; abstain: number; };
    };
    aiVoters: {
      total: number;
      voted: number;
      processing: number;
      breakdown: { approve: number; reject: number; abstain: number; };
    };
  };
  
  // 合意状況
  consensusReached: boolean;
  consensusType: 'unanimous' | 'majority' | 'none';
  requiredApprovals: number;
  currentApprovals: number;
  
  // 投票期限・催促
  votingDeadline?: DateTime;
  remindersSent: number;
  lastReminderAt?: DateTime;
}

// ==========================================
// パーティ移動状態
// ==========================================

export interface PartyMovementState {
  sessionId: ID;
  
  // 現在のパーティ状態
  currentLocationId: ID;
  partyMembers: Array<{
    characterId: ID;
    characterName: string;
    characterType: 'PC' | 'NPC';
    isLeader: boolean;
    isPresent: boolean; // 現在パーティにいるか
  }>;
  
  // アクティブな提案
  activeProposal?: PartyMovementProposal;
  votingSummary?: VotingSummary;
  
  // 移動履歴
  recentMovements: Array<{
    fromLocationId: ID;
    toLocationId: ID;
    timestamp: DateTime;
    method: MovementMethod;
    duration: number;
    success: boolean;
  }>;
  
  // 制約・制限
  movementRestrictions: {
    canPropose: boolean;
    canVote: boolean;
    turnsPaused: boolean; // ターン進行が一時停止中か
    reasonForRestriction?: string;
  };
  
  // メタデータ
  lastUpdated: DateTime;
  version: number; // 楽観的ロック用
}

// ==========================================
// パーティ移動アクション
// ==========================================

export interface CreateMovementProposalRequest {
  sessionId: ID;
  proposerId: ID;
  targetLocationId: ID;
  movementMethod: MovementMethod;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  votingDeadline?: DateTime;
}

export interface CreateMovementProposalResponse {
  success: boolean;
  proposal?: PartyMovementProposal;
  error?: string;
}

export interface CastMovementVoteRequest {
  proposalId: ID;
  voterId: ID;
  choice: VoteChoice;
  reason?: string;
}

export interface CastMovementVoteResponse {
  success: boolean;
  votingSummary?: VotingSummary;
  consensusReached: boolean;
  error?: string;
}

export interface ExecutePartyMovementRequest {
  proposalId: ID;
  sessionId: ID;
  forceExecute?: boolean; // 管理者権限による強制実行
}

export interface ExecutePartyMovementResponse {
  success: boolean;
  movementResult?: {
    newLocationId: ID;
    actualDuration: number;
    actualCost: Record<string, number>;
    turnsAdvanced: number;
    complications?: string[];
  };
  error?: string;
}

// ==========================================
// ターン管理との連携
// ==========================================

export interface MovementTurnImpact {
  turnsToAdvance: number;
  affectedCharacters: ID[];
  rollbackData?: {
    previousLocationId: ID;
    previousTurnState: any; // ターンシステムの前状態
    canRollback: boolean;
    rollbackDeadline: DateTime;
  };
}

export interface MovementRollbackRequest {
  sessionId: ID;
  proposalId: ID;
  reason: string;
}

export interface MovementRollbackResponse {
  success: boolean;
  restoredState?: {
    locationId: ID;
    turnState: any;
  };
  error?: string;
}

// ==========================================
// コンセンサス設定
// ==========================================

export interface ConsensusSettings {
  sessionId: ID;
  
  // 投票設定
  votingSystem: 'unanimous' | 'majority' | 'leader_decision' | 'weighted';
  requiredApprovalPercentage: number; // 50-100
  votingTimeLimit: number; // 分
  allowAbstention: boolean;
  
  // リーダーシップ
  leaderCanOverride: boolean;
  leaderVoteWeight: number; // 通常は1、重み付けなら >1
  
  // 自動設定
  autoApproveIfNoResponse: boolean;
  autoApproveTimeLimit: number; // 分
  
  // 制限設定
  dailyMovementLimit?: number;
  turnBasedMovementCost: number; // 移動1回あたりのターン消費
}

// ==========================================
// エクスポート用の統合型
// ==========================================

export interface PartyMovementSystem {
  state: PartyMovementState;
  settings: ConsensusSettings;
  activeProposal?: PartyMovementProposal;
  votingSummary?: VotingSummary;
}

// ==========================================
// API応答型定義
// ==========================================

export interface GetPartyMovementStateResponse {
  success: boolean;
  movementSystem?: PartyMovementSystem;
  error?: string;
}

export interface UpdateConsensusSettingsRequest {
  sessionId: ID;
  settings: Partial<ConsensusSettings>;
}

export interface UpdateConsensusSettingsResponse {
  success: boolean;
  settings?: ConsensusSettings;
  error?: string;
}

// ==========================================
// 混合投票システム専用API
// ==========================================

export interface SendVotingReminderRequest {
  proposalId: ID;
  targetVoterIds?: ID[]; // 特定の投票者のみに送信（未指定の場合は全未投票者）
  reminderMessage?: string;
}

export interface SendVotingReminderResponse {
  success: boolean;
  remindersSent: number;
  targetVoters: Array<{
    voterId: ID;
    voterName: string;
    voterType: 'human' | 'ai_agent';
    reminderSent: boolean;
  }>;
  error?: string;
}

export interface GetMixedVotingStatusRequest {
  proposalId: ID;
}

export interface GetMixedVotingStatusResponse {
  success: boolean;
  votingSummary?: VotingSummary;
  realTimeStats: {
    humanVotingProgress: number; // 0-100%
    aiVotingProgress: number; // 0-100%
    estimatedCompletion?: DateTime;
    pendingHumanVoters: string[];
    processingAiVoters: string[];
  };
  error?: string;
}

export interface VotingNotification {
  id: ID;
  type: 'reminder' | 'deadline_warning' | 'completion' | 'ai_vote_cast' | 'human_vote_needed';
  proposalId: ID;
  targetVoterId?: ID;
  
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  
  createdAt: DateTime;
  expiresAt?: DateTime;
  acknowledged: boolean;
}

export interface SubscribeVotingNotificationsRequest {
  sessionId: ID;
  characterId: ID;
}

export interface SubscribeVotingNotificationsResponse {
  success: boolean;
  subscriptionId?: string;
  error?: string;
}

// ==========================================
// 混合投票フロー管理
// ==========================================

export interface MixedVotingFlowState {
  proposalId: ID;
  sessionId: ID;
  
  // フロー段階
  currentPhase: 'proposal_created' | 'human_voting' | 'ai_voting' | 'mixed_voting' | 'completed' | 'timeout';
  
  // タイミング管理
  humanVotingStartedAt?: DateTime;
  aiVotingStartedAt?: DateTime;
  votingTimeLimit: number; // 分
  
  // 投票順序管理
  votingOrder: 'parallel' | 'human_first' | 'ai_first' | 'sequential';
  
  // 催促管理
  reminderSettings: {
    enableReminders: boolean;
    reminderIntervals: number[]; // 分 [5, 10, 15] など
    maxReminders: number;
  };
  
  // 自動進行設定
  autoProgressSettings: {
    enableAutoProgress: boolean;
    humanVotingTimeout: number; // 分
    aiVotingTimeout: number; // 分
    autoCompleteOnMajority: boolean;
  };
  
  lastUpdated: DateTime;
}

export interface UpdateMixedVotingFlowRequest {
  proposalId: ID;
  flowSettings: Partial<MixedVotingFlowState>;
}

export interface UpdateMixedVotingFlowResponse {
  success: boolean;
  flowState?: MixedVotingFlowState;
  error?: string;
}