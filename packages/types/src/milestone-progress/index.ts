// ==========================================
// マイルストーン進捗更新システム型定義
// ==========================================

import { ID, DateTime } from '../base';
import { AIPoolMilestone, MilestoneTargetDetails, MilestoneStatus } from '../ai-entities';
import { EntityExplorationAction } from '../exploration-actions';

// ==========================================
// エンティティクリアイベント
// ==========================================

export type EntityClearEventType = 
  | 'entity_discovered'      // エンティティ発見
  | 'entity_completed'       // エンティティ完了
  | 'entity_failed'          // エンティティ失敗
  | 'entity_partially_completed'; // エンティティ部分完了

export interface EntityClearEvent {
  id: ID;
  sessionId: ID;
  campaignId: ID;
  
  // イベント基本情報
  eventType: EntityClearEventType;
  entityId: ID;
  entityName: string;
  entityType: EntityExplorationAction['entityType'];
  
  // 実行情報
  characterId: ID;
  characterName: string;
  clearedAt: DateTime;
  
  // 進捗情報
  progressValue: number; // 0-1 (完了度)
  isFullCompletion: boolean;
  previousProgress?: number;
  
  // マイルストーン関連
  affectedMilestoneIds: ID[];
  triggerData: {
    actionType: string;
    skillCheckResult?: {
      success: boolean;
      roll: number;
      target: number;
    };
    discoveries?: string[];
    consequences?: string[];
  };
  
  // メタデータ
  createdAt: DateTime;
  processedAt?: DateTime;
}

// ==========================================
// マイルストーン進捗システム
// ==========================================

export interface MilestoneProgressState {
  milestoneId: ID;
  currentProgress: number; // 0-1
  targetCount: number;
  currentCount: number;
  
  // 進捗詳細
  progressHistory: Array<{
    timestamp: DateTime;
    previousProgress: number;
    newProgress: number;
    triggerEntityId: ID;
    triggerEventId: ID;
    description: string;
  }>;
  
  // 完了状態
  isCompleted: boolean;
  completedAt?: DateTime;
  completionMethod: 'entity_clear' | 'manual' | 'script_trigger' | 'condition_met';
  
  // 予測情報
  estimatedCompletionTime?: DateTime;
  recommendedActions?: string[];
  
  lastUpdated: DateTime;
}

export interface MilestoneProgressUpdate {
  milestoneId: ID;
  entityClearEventId: ID;
  progressDelta: number; // 進捗の変化量
  newProgress: number;
  isCompleted: boolean;
  
  // 完了時の詳細
  completionDetails?: {
    finalEntityId: ID;
    finalEntityName: string;
    completionMessage: string;
    unlockedContent?: string[];
    nextMilestones?: ID[];
  };
  
  timestamp: DateTime;
}

// ==========================================
// シナリオ進行トリガーシステム
// ==========================================

export type ScenarioTriggerType = 
  | 'milestone_completed'    // マイルストーン完了
  | 'milestone_failed'       // マイルストーン失敗
  | 'progress_threshold'     // 進捗閾値到達
  | 'time_limit_reached'     // 制限時間到達
  | 'condition_chain';       // 条件チェーン発火

export interface ScenarioProgressionTrigger {
  id: ID;
  campaignId: ID;
  sessionId: ID;
  
  // トリガー情報
  triggerType: ScenarioTriggerType;
  milestoneId: ID;
  milestoneName: string;
  
  // 進行情報
  triggeredAt: DateTime;
  triggerReason: string;
  
  // シナリオ変更
  scenarioChanges: {
    newEventsAdded: ID[];
    eventsModified: ID[];
    eventsRemoved: ID[];
    newEntitiesGenerated: ID[];
    npcBehaviorChanges: ID[];
    worldStateChanges: Record<string, any>;
  };
  
  // プレイヤー通知
  playerNotification: {
    title: string;
    message: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    showModal: boolean;
    autoAdvanceTime?: boolean;
  };
  
  // AI生成コンテンツ
  aiGeneratedContent?: {
    narrativeText: string;
    newDialogueOptions: string[];
    adaptedDifficulty?: number;
    contextualHints?: string[];
  };
  
  processedAt?: DateTime;
  isProcessed: boolean;
}

// ==========================================
// 進捗可視化データ
// ==========================================

export interface MilestoneProgressVisualization {
  milestoneId: ID;
  milestoneName: string;
  progress: number; // 0-1
  
  // 表示情報
  displayStatus: 'not_started' | 'in_progress' | 'near_completion' | 'completed' | 'blocked';
  statusColor: 'grey' | 'blue' | 'orange' | 'green' | 'red';
  progressBarAnimation: boolean;
  
  // 詳細情報
  targetEntities: Array<{
    entityId: ID;
    entityName: string;
    isCompleted: boolean;
    contributionWeight: number; // この エンティティのマイルストーンへの寄与度
  }>;
  
  // 予測・推奨情報
  estimatedTimeToCompletion?: string;
  recommendedNextActions: Array<{
    entityId: ID;
    entityName: string;
    actionDescription: string;
    difficulty: 'easy' | 'normal' | 'hard';
    estimatedTime: number; // 分
  }>;
  
  // フィードバック情報
  recentAchievements: Array<{
    description: string;
    timestamp: DateTime;
    celebrationLevel: 'small' | 'medium' | 'large';
  }>;
  
  lastUpdated: DateTime;
}

export interface CampaignProgressOverview {
  campaignId: ID;
  sessionId: ID;
  
  // 全体進捗
  overallProgress: number; // 0-1
  completedMilestones: number;
  totalMilestones: number;
  
  // マイルストーン別進捗
  milestoneProgresses: MilestoneProgressVisualization[];
  
  // 統計情報
  statistics: {
    totalEntitiesCleared: number;
    averageCompletionTime: number; // 分
    difficultyAdaptations: number;
    playerEngagementScore: number; // 0-1
  };
  
  // 次の目標
  upcomingObjectives: Array<{
    milestoneId: ID;
    priority: 'low' | 'medium' | 'high';
    description: string;
    estimatedDifficulty: number;
  }>;
  
  lastUpdated: DateTime;
}

// ==========================================
// リアルタイム更新システム
// ==========================================

export interface ProgressUpdateNotification {
  id: ID;
  type: 'progress_update' | 'milestone_completed' | 'scenario_progression' | 'achievement_unlocked';
  
  // 通知データ
  title: string;
  message: string;
  details?: Record<string, any>;
  
  // 表示設定
  displayDuration: number; // ミリ秒
  priority: 'low' | 'medium' | 'high';
  showAnimation: boolean;
  soundNotification: boolean;
  
  // 受信者情報
  recipientIds: ID[]; // 通知を受け取るキャラクター/プレイヤーID
  sessionId: ID;
  
  // タイムスタンプ
  createdAt: DateTime;
  expiresAt?: DateTime;
  viewedBy: Array<{
    userId: ID;
    viewedAt: DateTime;
  }>;
}

export interface ProgressUpdateBatch {
  batchId: ID;
  sessionId: ID;
  
  // バッチ更新内容
  entityClearEvents: EntityClearEvent[];
  progressUpdates: MilestoneProgressUpdate[];
  scenarioTriggers: ScenarioProgressionTrigger[];
  notifications: ProgressUpdateNotification[];
  
  // バッチ処理情報
  processingStartedAt: DateTime;
  processingCompletedAt?: DateTime;
  isProcessingComplete: boolean;
  
  // エラー処理
  processingErrors: Array<{
    errorType: string;
    errorMessage: string;
    affectedItemId: ID;
    timestamp: DateTime;
  }>;
}

// ==========================================
// API リクエスト・レスポンス型
// ==========================================

export interface ProcessEntityClearRequest {
  sessionId: ID;
  entityClearEvent: Omit<EntityClearEvent, 'id' | 'createdAt' | 'affectedMilestoneIds'>;
}

export interface ProcessEntityClearResponse {
  success: boolean;
  processedEvent?: EntityClearEvent;
  progressUpdates: MilestoneProgressUpdate[];
  scenarioTriggers: ScenarioProgressionTrigger[];
  notifications: ProgressUpdateNotification[];
  error?: string;
}

export interface GetMilestoneProgressRequest {
  sessionId: ID;
  milestoneIds?: ID[]; // 指定なしの場合全マイルストーン
}

export interface GetMilestoneProgressResponse {
  success: boolean;
  progressStates: MilestoneProgressState[];
  visualizationData: MilestoneProgressVisualization[];
  campaignOverview: CampaignProgressOverview;
  error?: string;
}

export interface UpdateProgressSettingsRequest {
  sessionId: ID;
  settings: {
    autoProgressEnabled: boolean;
    notificationSettings: {
      showProgressUpdates: boolean;
      showMilestoneCompletions: boolean;
      showScenarioProgression: boolean;
      soundEnabled: boolean;
    };
    visualizationSettings: {
      showProgressBars: boolean;
      showEstimatedTimes: boolean;
      showRecommendations: boolean;
      animationsEnabled: boolean;
    };
  };
}

export interface UpdateProgressSettingsResponse {
  success: boolean;
  updatedSettings?: any;
  error?: string;
}

// ==========================================
// イベント駆動アーキテクチャ
// ==========================================

export interface ProgressEventHandler {
  id: ID;
  eventType: string;
  handlerName: string;
  priority: number; // 実行順序 (1が最高優先度)
  isEnabled: boolean;
  
  // ハンドラー設定
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  }>;
  
  // 処理設定
  processingConfig: {
    async: boolean;
    timeout: number; // ミリ秒
    retryCount: number;
    retryDelay: number; // ミリ秒
  };
  
  // 統計情報
  executionStats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number; // ミリ秒
    lastExecutedAt?: DateTime;
  };
}

export interface EventProcessingQueue {
  id: ID;
  sessionId: ID;
  
  // キュー状態
  pendingEvents: Array<{
    eventId: ID;
    eventType: string;
    priority: number;
    scheduledAt: DateTime;
    attempts: number;
  }>;
  
  // 処理状態
  isProcessing: boolean;
  currentEventId?: ID;
  processingStartedAt?: DateTime;
  
  // 統計
  processedEventsCount: number;
  failedEventsCount: number;
  averageProcessingTime: number; // ミリ秒
  
  lastUpdated: DateTime;
}

// ==========================================
// 型ガード関数
// ==========================================

export function isEntityClearEvent(obj: any): obj is EntityClearEvent {
  return obj && obj.eventType && obj.entityId && obj.characterId && obj.clearedAt;
}

export function isMilestoneProgressUpdate(obj: any): obj is MilestoneProgressUpdate {
  return obj && obj.milestoneId && typeof obj.newProgress === 'number';
}

export function isScenarioProgressionTrigger(obj: any): obj is ScenarioProgressionTrigger {
  return obj && obj.triggerType && obj.milestoneId && obj.scenarioChanges;
}

// ==========================================
// ユーティリティ関数
// ==========================================

export function calculateMilestoneProgress(
  targetDetails: MilestoneTargetDetails,
  completedEntities: ID[]
): number {
  const requiredCount = targetDetails.requiredCount || 1;
  const currentCount = Math.min(completedEntities.length, requiredCount);
  return currentCount / requiredCount;
}

export function determineMilestoneDisplayStatus(
  progress: number,
  isCompleted: boolean
): MilestoneProgressVisualization['displayStatus'] {
  if (isCompleted) return 'completed';
  if (progress === 0) return 'not_started';
  if (progress >= 0.8) return 'near_completion';
  return 'in_progress';
}

export function formatProgressEstimation(
  currentProgress: number,
  averageCompletionTime: number
): string {
  const remainingProgress = 1 - currentProgress;
  const estimatedMinutes = Math.ceil(averageCompletionTime * remainingProgress);
  
  if (estimatedMinutes < 60) {
    return `約${estimatedMinutes}分`;
  } else {
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;
    return `約${hours}時間${minutes > 0 ? minutes + '分' : ''}`;
  }
}