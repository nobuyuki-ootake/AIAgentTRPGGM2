// ==========================================
// GM通知システム型定義
// マイルストーン完了時のGM専用通知機能
// ==========================================

/**
 * GM通知タイプ
 */
export type GMNotificationType = 
  | 'milestone_completed'      // マイルストーン完了通知
  | 'story_progression'        // ストーリー進行通知
  | 'narrative_change'         // ナラティブ変化通知
  | 'entity_unlocked'          // エンティティ解放通知
  | 'session_event'            // セッションイベント通知
  | 'ai_recommendation';       // AI推奨アクション通知

/**
 * 通知優先度
 */
export type GMNotificationPriority = 'high' | 'medium' | 'low';

/**
 * 通知状態
 */
export type GMNotificationStatus = 'unread' | 'read' | 'acknowledged' | 'dismissed' | 'expired';

/**
 * GM通知アクション
 */
export interface GMNotificationAction {
  id: string;
  label: string;
  actionType: 'trigger_progression' | 'dismiss' | 'postpone' | 'mark_read' | 'custom';
  endpoint?: string;
  payload?: Record<string, any>;
  requiresConfirmation: boolean;
  buttonColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

/**
 * GM通知メインインターフェース
 */
export interface GMNotification {
  id: string;
  type: GMNotificationType;
  sessionId: string;
  priority: GMNotificationPriority;
  status: GMNotificationStatus;
  title: string;
  message: string;
  shortDescription?: string;
  
  // イベント関連データ
  eventData: {
    milestoneId?: string;
    milestoneName?: string;
    entityId?: string;
    entityName?: string;
    progressPercentage?: number;
    completionDetails?: any;
    narrativeProgression?: {
      startNarrative: string;
      progressNarrative: string;
      completionNarrative: string;
    };
    [key: string]: any;
  };
  
  // 利用可能なアクション
  actions?: GMNotificationAction[];
  
  // メタデータ
  metadata?: {
    categoryTags?: string[];
    relatedEntities?: string[];
    gmRecommendations?: string[];
    playerVisibility?: 'hidden' | 'partial' | 'visible';
  };
  
  // タイムスタンプ
  timestamp: string;
  acknowledgedAt?: string;
  expiresAt?: string;
  
  // 表示制御
  autoExpire: boolean;
  persistAfterRead: boolean;
  requiresAcknowledgment: boolean;
}

/**
 * WebSocket GM通知イベント
 */
export interface GMNotificationEvent {
  type: 'gm-notification';
  notification: GMNotification;
  sessionId: string;
}

/**
 * GM通知リスト取得リクエスト
 */
export interface GetGMNotificationsRequest {
  sessionId: string;
  status?: GMNotificationStatus[];
  type?: GMNotificationType[];
  priority?: GMNotificationPriority[];
  limit?: number;
  offset?: number;
  includeExpired?: boolean;
}

/**
 * GM通知リスト取得レスポンス
 */
export interface GetGMNotificationsResponse {
  success: boolean;
  notifications: GMNotification[];
  totalCount: number;
  unreadCount: number;
  highPriorityCount: number;
  error?: string;
}

/**
 * GM通知アクション実行リクエスト
 */
export interface ExecuteGMNotificationActionRequest {
  notificationId: string;
  actionId: string;
  sessionId: string;
  gmCharacterId: string;
  additionalParams?: Record<string, any>;
}

/**
 * GM通知アクション実行レスポンス
 */
export interface ExecuteGMNotificationActionResponse {
  success: boolean;
  actionResult?: {
    progressionTriggered?: boolean;
    newEntitiesUnlocked?: string[];
    narrativeChanges?: string[];
    nextRecommendedActions?: string[];
  };
  updatedNotification?: GMNotification;
  error?: string;
}

/**
 * GM通知状態更新リクエスト
 */
export interface UpdateGMNotificationStatusRequest {
  notificationId: string;
  newStatus: GMNotificationStatus;
  sessionId: string;
  gmCharacterId: string;
}

/**
 * GM通知状態更新レスポンス
 */
export interface UpdateGMNotificationStatusResponse {
  success: boolean;
  updatedNotification?: GMNotification;
  error?: string;
}

/**
 * GM通知設定
 */
export interface GMNotificationSettings {
  sessionId: string;
  enableRealtimeNotifications: boolean;
  autoAcknowledgeAfterRead: boolean;
  notificationRetentionHours: number;
  priorityFilters: {
    high: boolean;
    medium: boolean;
    low: boolean;
  };
  typeFilters: {
    milestone_completed: boolean;
    story_progression: boolean;
    narrative_change: boolean;
    entity_unlocked: boolean;
    session_event: boolean;
    ai_recommendation: boolean;
  };
  soundNotifications: boolean;
  desktopNotifications: boolean;
}

/**
 * GM通知統計情報
 */
export interface GMNotificationStats {
  sessionId: string;
  totalNotifications: number;
  unreadCount: number;
  readCount: number;
  acknowledgedCount: number;
  dismissedCount: number;
  expiredCount: number;
  
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  
  byType: {
    milestone_completed: number;
    story_progression: number;
    narrative_change: number;
    entity_unlocked: number;
    session_event: number;
    ai_recommendation: number;
  };
  
  averageResponseTime: number; // 通知から承認までの平均時間（秒）
  mostActiveHour: number; // 最も通知が多い時間帯
}

/**
 * マイルストーン完了通知用の専用ファクトリー関数用型
 */
export interface CreateMilestoneCompletionNotificationParams {
  milestoneId: string;
  milestoneName: string;
  sessionId: string;
  completionData: {
    completedAt: string;
    completionStatus: any;
    narrativeProgression?: {
      startNarrative: string;
      progressNarrative: string;
      completionNarrative: string;
    };
    relatedEntities?: string[];
    progressPercentage: number;
  };
  gmRecommendations?: string[];
  enableStoryProgression?: boolean;
}