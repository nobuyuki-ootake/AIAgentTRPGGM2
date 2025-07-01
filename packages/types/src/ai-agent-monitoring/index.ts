// ==========================================
// AI Agent動作監視・ログシステム型定義
// ==========================================

import { ID, DateTime } from '../base';
import { VoteChoice } from '../party-movement';

// ==========================================
// AI Agent動作ログ
// ==========================================

export type AIAgentActionType = 'movement_vote' | 'combat_action' | 'dialogue_response' | 'skill_check' | 'exploration_action' | 'decision_making';

export type AIAgentLogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface AIAgentActionLog {
  id: ID;
  sessionId: ID;
  characterId: ID;
  characterName: string;
  
  // アクション情報
  actionType: AIAgentActionType;
  actionContext: string; // アクションの文脈・状況
  actionDescription: string; // 実行したアクション
  
  // AI判断情報
  decisionReasoning: string; // AI判断の理由
  alternativesConsidered: string[]; // 検討された他の選択肢
  confidenceScore: number; // 判断の確信度 (0-100)
  
  // 実行結果
  executionResult: 'success' | 'failure' | 'partial' | 'error';
  resultDetails: string;
  
  // メタデータ
  timestamp: DateTime;
  logLevel: AIAgentLogLevel;
  processingTimeMs: number; // AI処理時間
  tags: string[];
}

// ==========================================
// 移動投票特化ログ
// ==========================================

export interface AIMovementVoteLog extends AIAgentActionLog {
  actionType: 'movement_vote';
  
  // 移動投票特有の情報
  proposalId: ID;
  targetLocationId: ID;
  movementReason: string;
  urgency: 'low' | 'medium' | 'high';
  
  // 投票判断の詳細
  voteChoice: VoteChoice;
  voteReason: string;
  influencingFactors: {
    characterPersonality: string;
    situationalFactors: string[];
    riskAssessment: string;
    partyConsideration: string;
  };
}

// ==========================================
// AI Agent性能分析
// ==========================================

export interface AIAgentPerformanceMetrics {
  characterId: ID;
  sessionId: ID;
  
  // 実行統計
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  averageProcessingTime: number;
  averageConfidenceScore: number;
  
  // アクション種別統計
  actionTypeBreakdown: Record<AIAgentActionType, {
    count: number;
    successRate: number;
    averageConfidence: number;
  }>;
  
  // 判断品質分析
  decisionQuality: {
    consistencyScore: number; // 一貫性スコア (0-100)
    adaptabilityScore: number; // 適応性スコア (0-100)
    rationalityScore: number; // 合理性スコア (0-100)
    collaborationScore: number; // 協調性スコア (0-100)
  };
  
  // 期間情報
  analysisStartTime: DateTime;
  analysisEndTime: DateTime;
  lastUpdated: DateTime;
}

// ==========================================
// AI Agent監視設定
// ==========================================

export interface AIAgentMonitoringSettings {
  sessionId: ID;
  
  // ログ設定
  enableDetailedLogging: boolean;
  minimumLogLevel: AIAgentLogLevel;
  maxLogRetentionDays: number;
  
  // 性能監視設定
  enablePerformanceTracking: boolean;
  performanceAnalysisInterval: number; // 分
  alertThresholds: {
    lowSuccessRate: number; // %
    highProcessingTime: number; // ms
    lowConfidenceScore: number; // %
  };
  
  // UI表示設定
  showInGameMasterPanel: boolean;
  showInDeveloperMode: boolean;
  realTimeNotifications: boolean;
  
  // プライバシー設定
  anonymizePlayerData: boolean;
  restrictedViewForPlayers: boolean;
}

// ==========================================
// API要求・応答型
// ==========================================

export interface GetAIAgentLogsRequest {
  sessionId: ID;
  characterId?: ID;
  actionType?: AIAgentActionType;
  logLevel?: AIAgentLogLevel;
  
  // フィルタ条件
  startTime?: DateTime;
  endTime?: DateTime;
  limit?: number;
  offset?: number;
  
  // ソート条件
  sortBy?: 'timestamp' | 'confidence' | 'processing_time';
  sortOrder?: 'asc' | 'desc';
}

export interface GetAIAgentLogsResponse {
  success: boolean;
  logs: AIAgentActionLog[];
  totalCount: number;
  hasMore: boolean;
  error?: string;
}

export interface GetAIAgentPerformanceRequest {
  sessionId: ID;
  characterId?: ID;
  timeRange?: {
    start: DateTime;
    end: DateTime;
  };
}

export interface GetAIAgentPerformanceResponse {
  success: boolean;
  metrics: AIAgentPerformanceMetrics[];
  summary: {
    totalAgents: number;
    overallSuccessRate: number;
    averageResponseTime: number;
  };
  error?: string;
}

export interface UpdateMonitoringSettingsRequest {
  sessionId: ID;
  settings: Partial<AIAgentMonitoringSettings>;
}

export interface UpdateMonitoringSettingsResponse {
  success: boolean;
  settings?: AIAgentMonitoringSettings;
  error?: string;
}

// ==========================================
// リアルタイム通知
// ==========================================

export interface AIAgentAlert {
  id: ID;
  sessionId: ID;
  characterId: ID;
  characterName: string;
  
  alertType: 'performance_degradation' | 'error_spike' | 'unusual_behavior' | 'system_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  title: string;
  description: string;
  suggestedActions: string[];
  
  timestamp: DateTime;
  acknowledged: boolean;
  acknowledgedBy?: ID;
  acknowledgedAt?: DateTime;
}

export interface AIAgentNotification {
  id: ID;
  sessionId: ID;
  
  notificationType: 'log_entry' | 'performance_update' | 'alert' | 'status_change';
  priority: 'low' | 'normal' | 'high';
  
  title: string;
  message: string;
  data: Record<string, any>;
  
  timestamp: DateTime;
  read: boolean;
  readAt?: DateTime;
}

// ==========================================
// 統合監視ダッシュボード
// ==========================================

export interface AIAgentMonitoringDashboard {
  sessionId: ID;
  
  // 概要統計
  overview: {
    activeAgents: number;
    totalActionsToday: number;
    averageSuccessRate: number;
    systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  };
  
  // 最新ログ（直近5件）
  recentLogs: AIAgentActionLog[];
  
  // アクティブアラート
  activeAlerts: AIAgentAlert[];
  
  // 性能トレンド
  performanceTrends: {
    timeLabels: string[];
    successRates: number[];
    responseTimes: number[];
    actionCounts: number[];
  };
  
  // エージェント別状態
  agentStatuses: Array<{
    characterId: ID;
    characterName: string;
    status: 'active' | 'idle' | 'error' | 'offline';
    lastAction: DateTime;
    currentConfidence: number;
    todayActionCount: number;
  }>;
  
  lastUpdated: DateTime;
}

export interface GetMonitoringDashboardRequest {
  sessionId: ID;
  timeRange?: '1h' | '6h' | '24h' | '7d';
}

export interface GetMonitoringDashboardResponse {
  success: boolean;
  dashboard?: AIAgentMonitoringDashboard;
  error?: string;
}