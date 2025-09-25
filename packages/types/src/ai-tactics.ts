// ==========================================
// AI Agent戦術設定型定義
// AI Agent可視化・制御システム用
// ==========================================

/**
 * エネミー戦術レベル
 */
export type TacticsLevel = 'basic' | 'strategic' | 'cunning';

/**
 * 行動方針タイプ
 */
export type FocusType = 'damage' | 'control' | 'survival';

/**
 * エネミー戦術設定
 */
export interface EnemyTacticsLevel {
  /** 戦術レベル */
  tacticsLevel: TacticsLevel;
  /** 主要行動方針 */
  primaryFocus: FocusType;
  /** チーム連携 */
  teamwork: boolean;
}

/**
 * キャラクター行動優先度
 */
export type ActionPriority = 'attack_focus' | 'healing_focus' | 'support_focus' | 'balanced';

/**
 * キャラクター性格タイプ
 */
export type PersonalityType = 'aggressive' | 'cautious' | 'calm';

/**
 * コミュニケーションスタイル
 */
export type CommunicationStyle = 'direct' | 'polite' | 'casual';

/**
 * キャラクターAI設定
 */
export interface CharacterAISettings {
  /** 行動優先度 */
  actionPriority: ActionPriority;
  /** 性格タイプ */
  personality: PersonalityType;
  /** コミュニケーションスタイル */
  communicationStyle: CommunicationStyle;
}

/**
 * AI行動分析結果
 */
export interface ActionAnalysis {
  /** AI発話内容 */
  dialogue: string;
  /** AI行動内容 */
  behavior: string;
  /** 判断理由 */
  reasoning: string;
  /** 適用設定 */
  appliedSettings: string;
  /** タイムスタンプ */
  timestamp: string;
}

/**
 * AI決定ログ
 */
export interface AIDecisionLog {
  id: string;
  timestamp: string;
  decisionType: 'enemy_action' | 'enemy_targeting' | 'enemy_coordination';
  context: any;
  reasoning: string;
  appliedTactics: string;
}

/**
 * GM戦術制御API - レスポンス
 */
export interface GMTacticsResponse {
  sessionId: string;
  currentSettings: EnemyTacticsLevel;
  recentDecisions: AIDecisionLog[];
}

/**
 * GM戦術制御API - 更新リクエスト
 */
export interface UpdateTacticsRequest {
  settings: Partial<EnemyTacticsLevel>;
  applyImmediately: boolean;
}

/**
 * キャラクターAI設定API - レスポンス
 */
export interface CharacterAISettingsResponse {
  characters: Array<{
    characterId: string;
    name: string;
    class: string;
    controlType: 'agent' | 'player';
    actionPriority: ActionPriority;
    personality: PersonalityType;
    communicationStyle: CommunicationStyle;
    lastAction?: ActionAnalysis;
  }>;
}

/**
 * キャラクターAI設定API - 更新リクエスト
 */
export interface UpdateCharacterAIRequest {
  actionPriority?: ActionPriority;
  personality?: PersonalityType;
  communicationStyle?: CommunicationStyle;
}

/**
 * AI戦術設定データベースエンティティ
 */
export interface AITacticsSettings {
  id: string;
  sessionId: string;
  agentType: 'gm' | 'character';
  settings: EnemyTacticsLevel | CharacterAISettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * Agent Chain実行結果
 */
export interface AgentChainResult {
  success: boolean;
  sessionId: string;
  executionTime: number;
  results: {
    companionAction: {
      decision: string;
      actionType: string;
      reasoning: string;
      expectedEffect: string;
      message: string;
    };
    storyProgression: {
      progressAnalysis: any;
      newEntities: any[];
      choiceAdjustments: any[];
      recommendations: string[];
    };
    environmentChanges: {
      weatherUpdate: any;
      npcChanges: any;
      rumorUpdates: any;
      narrative: string;
    };
  };
  nextTurnReady: boolean;
  meta: {
    agentChainVersion: string;
    executedAgents: string[];
    timestamp: string;
  };
}

/**
 * Trigger Chain APIリクエスト - Phase 0イベント駆動システム
 */
export interface TriggerChainRequest {
  sessionId: string;
  playerMessage: string;
  currentLocationId?: string;
  participants?: string[];
  triggerType?: 'player_action' | 'session_start' | 'location_change' | 'gm_event';
  context?: Record<string, any>;
}

/**
 * Trigger Chain APIレスポンス - Phase 0包括的レスポンス
 */
export interface TriggerChainResponse {
  success: boolean;
  sessionId: string;
  chainId: string;
  
  // GM Agent応答
  gmResponse: {
    message: string;
    suggestions: string[];
    appliedTactics: EnemyTacticsLevel;
    confidence: number;
  };
  
  // コンテキスト情報
  contextAnalysis: {
    currentLocation: string;
    availableEntities: Array<{
      id: string;
      type: string;
      name: string;
      available: boolean;
      relevanceScore: number;
    }>;
    partyStatus: {
      memberCount: number;
      currentActivity: string;
      lastAction: string;
    };
    environmentalFactors: {
      timeOfDay: string;
      weather: string;
      dangerLevel: number;
    };
  };
  
  // 実行情報
  executionInfo: {
    triggeredAt: string;
    processingTime: number;
    agentsInvolved: string[];
    entitiesProcessed: number;
    tacticsApplied: number;
  };
  
  // 次のアクション提案
  nextActions: Array<{
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedTime: number;
    requirements: string[];
  }>;
  
  timestamp: string;
}