// ==========================================
// 探索アクション・エンティティ発見システム型定義
// ==========================================

import { ID, DateTime } from '../base';
import { DiceRoll } from '../session';

// ==========================================
// 探索アクション基本型
// ==========================================

export type ExplorationActionType = 
  | 'investigate'    // 調査する
  | 'interact'       // 話しかける・触れる
  | 'attack'         // 攻撃する
  | 'avoid'          // 回避する
  | 'search'         // 探索する
  | 'observe'        // 観察する
  | 'use_skill'      // スキル使用
  | 'negotiate'      // 交渉する
  | 'stealth'        // 隠密行動
  | 'custom';        // カスタム行動

export type ExplorationState = 
  | 'idle'           // 待機中
  | 'selecting'      // 行動選択中
  | 'processing'     // AI処理中
  | 'waiting_input'  // ユーザー入力待ち
  | 'rolling'        // 判定実行中
  | 'completed';     // 完了

export type SkillCheckType = 
  | 'perception'     // 知覚
  | 'investigation'  // 調査
  | 'insight'        // 洞察
  | 'persuasion'     // 説得
  | 'deception'      // 嘘
  | 'intimidation'   // 威圧
  | 'stealth'        // 隠密
  | 'sleight_of_hand'// 手先の器用さ
  | 'athletics'      // 運動能力
  | 'acrobatics'     // 軽業
  | 'arcana'         // 魔法学
  | 'history'        // 歴史
  | 'nature'         // 自然
  | 'religion'       // 宗教
  | 'medicine'       // 医学
  | 'survival';      // 生存

// ==========================================
// エンティティ探索アクション
// ==========================================

export interface EntityExplorationAction {
  id: ID;
  entityId: ID;
  entityName: string;
  entityType: 'object' | 'npc' | 'location_feature' | 'hazard' | 'treasure';
  
  // 利用可能なアクション
  availableActions: Array<{
    actionType: ExplorationActionType;
    actionName: string;
    description: string;
    difficulty: 'easy' | 'normal' | 'hard' | 'expert';
    requiredSkill?: SkillCheckType;
    riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'dangerous';
  }>;
  
  // 状態情報
  isDiscovered: boolean;
  isInteracted: boolean;
  timesInteracted: number;
  lastInteractionTime?: DateTime;
  
  // コンテキスト情報
  locationId: ID;
  sessionId: ID;
  discoveredBy?: ID; // 発見したキャラクターID
  
  // メタデータ
  createdAt: DateTime;
  updatedAt: DateTime;
}

// ==========================================
// 探索アクション実行
// ==========================================

export interface ExplorationActionExecution {
  id: ID;
  sessionId: ID;
  characterId: ID;
  characterName: string;
  
  // アクション詳細
  targetEntityId: ID;
  targetEntityName: string;
  actionType: ExplorationActionType;
  actionDescription: string;
  
  // ユーザー入力
  userApproach?: string; // ユーザーが入力した対応方針
  userInputRequired: boolean;
  
  // 判定情報
  skillCheck?: {
    skillType: SkillCheckType;
    targetNumber: number;
    difficulty: string;
    modifiers: Array<{
      name: string;
      value: number;
      reason: string;
    }>;
  };
  
  // 実行状態
  state: ExplorationState;
  
  // 結果
  diceRoll?: DiceRoll;
  success?: boolean;
  result?: {
    type: 'success' | 'failure' | 'critical_success' | 'critical_failure' | 'partial_success';
    description: string;
    consequences: string[];
    discoveries: string[];
    rewards?: string[];
    damage?: number;
  };
  
  // AI生成コンテンツ
  aiInitialDescription?: string;  // AI Agentの初期説明
  aiResultNarration?: string;     // AI GMの結果ナレーション
  
  // タイムスタンプ
  initiatedAt: DateTime;
  userInputAt?: DateTime;
  resolvedAt?: DateTime;
  
  // チャット統合
  chatMessageIds: ID[]; // 関連するチャットメッセージのID一覧
}

// ==========================================
// 探索フロー管理
// ==========================================

export interface ExplorationFlowState {
  sessionId: ID;
  currentLocationId: ID;
  
  // アクティブな探索
  activeExplorations: ExplorationActionExecution[];
  
  // 待機中のアクション
  pendingUserInputs: Array<{
    executionId: ID;
    characterId: ID;
    timeoutAt: DateTime;
    promptMessage: string;
  }>;
  
  // 最近の発見
  recentDiscoveries: Array<{
    entityId: ID;
    entityName: string;
    discoveredAt: DateTime;
    discoveredBy: ID;
    description: string;
  }>;
  
  // フロー設定
  settings: {
    autoProgressTimeout: number; // 秒
    allowSimultaneousActions: boolean;
    requireUserInput: boolean;
    aiNarrationEnabled: boolean;
  };
  
  lastUpdated: DateTime;
}

// ==========================================
// API要求・応答型
// ==========================================

export interface StartExplorationActionRequest {
  sessionId: ID;
  characterId: ID;
  targetEntityId: ID;
  actionType: ExplorationActionType;
  customDescription?: string; // カスタムアクション用
}

export interface StartExplorationActionResponse {
  success: boolean;
  execution?: ExplorationActionExecution;
  aiInitialMessage?: {
    messageId: ID;
    content: string;
    characterName: string; // AI Agentの名前
  };
  error?: string;
}

export interface ProvideUserInputRequest {
  executionId: ID;
  characterId: ID;
  userApproach: string;
}

export interface ProvideUserInputResponse {
  success: boolean;
  execution?: ExplorationActionExecution;
  judgmentTriggered: boolean;
  error?: string;
}

export interface ExecuteSkillCheckRequest {
  executionId: ID;
  characterId: ID;
  skillType: SkillCheckType;
  targetNumber?: number; // AIが自動設定する場合はオプション
  modifiers?: Array<{
    name: string;
    value: number;
    reason: string;
  }>;
}

export interface ExecuteSkillCheckResponse {
  success: boolean;
  execution?: ExplorationActionExecution;
  diceRoll?: DiceRoll;
  autoResultMessage?: {
    messageId: ID;
    content: string;
    isSystemMessage: boolean;
  };
  aiNarrationMessage?: {
    messageId: ID;
    content: string;
    characterName: string; // AI GMの名前
  };
  error?: string;
}

export interface GetLocationEntitiesRequest {
  sessionId: ID;
  locationId: ID;
  includeDiscovered?: boolean;
  includeHidden?: boolean;
}

export interface GetLocationEntitiesResponse {
  success: boolean;
  entities: EntityExplorationAction[];
  totalCount: number;
  error?: string;
}

export interface GetExplorationFlowStateRequest {
  sessionId: ID;
}

export interface GetExplorationFlowStateResponse {
  success: boolean;
  flowState?: ExplorationFlowState;
  error?: string;
}

// ==========================================
// チャット統合メッセージ型
// ==========================================

export interface ExplorationChatMessage {
  messageId: ID;
  executionId: ID;
  messageType: 'ai_initial' | 'user_input' | 'judgment_result' | 'ai_narration' | 'system_info';
  characterName: string;
  content: string;
  timestamp: DateTime;
  
  // 探索専用データ
  explorationData?: {
    actionType: ExplorationActionType;
    targetEntity: string;
    skillCheck?: {
      skill: SkillCheckType;
      roll: number;
      target: number;
      success: boolean;
    };
    discoveries?: string[];
  };
}

// ==========================================
// エンティティ発見・生成
// ==========================================

export interface EntityGenerationRequest {
  sessionId: ID;
  locationId: ID;
  generationType: 'random' | 'story_driven' | 'player_action';
  context?: {
    playerAction?: string;
    storyContext?: string;
    difficulty?: 'easy' | 'normal' | 'hard';
  };
}

export interface EntityGenerationResponse {
  success: boolean;
  newEntities: EntityExplorationAction[];
  totalGenerated: number;
  error?: string;
}

// ==========================================
// 探索結果処理
// ==========================================

export interface ExplorationResult {
  success: boolean;
  type: 'discovery' | 'interaction' | 'combat_trigger' | 'story_progression' | 'nothing_found';
  
  description: string;
  consequences: string[];
  
  // 発見物
  discoveries?: Array<{
    type: 'item' | 'information' | 'location' | 'character' | 'secret';
    name: string;
    description: string;
    value?: number;
  }>;
  
  // 新たなエンティティ
  newEntities?: EntityExplorationAction[];
  
  // ゲーム状態への影響
  stateChanges?: {
    healthChange?: number;
    resourceChanges?: Record<string, number>;
    statusEffects?: string[];
    questUpdates?: string[];
  };
  
  // 次のアクション提案
  suggestedFollowUpActions?: Array<{
    actionType: ExplorationActionType;
    description: string;
    targetEntity?: string;
  }>;
}

// ==========================================
// 場所別エンティティ表示システム
// ==========================================

export interface LocationEntity {
  id: ID;
  entityId: ID;
  name: string;
  type: 'object' | 'npc' | 'location_feature' | 'hazard' | 'treasure';
  
  // 表示用状態
  status: 'undiscovered' | 'discovered' | 'investigating' | 'completed' | 'unavailable';
  discoveryMethod?: 'initial' | 'exploration' | 'story_event' | 'ai_generated';
  
  // インタラクション情報
  interactionCount: number;
  lastInteractionTime?: DateTime;
  availableActionsCount: number;
  
  // 表示情報
  displayInfo: {
    shortDescription: string;
    dangerLevel: 'safe' | 'low' | 'medium' | 'high' | 'dangerous';
    iconType: 'treasure' | 'enemy' | 'friendly' | 'neutral' | 'mystery' | 'location';
    statusColor: 'success' | 'warning' | 'error' | 'info' | 'default';
  };
  
  // 位置・関連情報
  locationId: ID;
  sessionId: ID;
  discoveredBy?: ID;
  
  // タイムスタンプ
  discoveredAt?: DateTime;
  updatedAt: DateTime;
}

export interface LocationEntityGroup {
  locationId: ID;
  locationName: string;
  entities: LocationEntity[];
  
  // グループ統計
  stats: {
    total: number;
    discovered: number;
    undiscovered: number;
    investigating: number;
    completed: number;
    dangerous: number;
  };
  
  // 最終更新時刻
  lastUpdated: DateTime;
}

export interface LocationEntityDisplayState {
  sessionId: ID;
  currentLocationId: ID;
  
  // 現在の場所のエンティティ
  currentLocationEntities: LocationEntity[];
  
  // フィルター・表示設定
  displaySettings: {
    showUndiscovered: boolean;
    showCompleted: boolean;
    sortBy: 'name' | 'discovery_time' | 'danger_level' | 'interaction_count';
    sortOrder: 'asc' | 'desc';
    groupByType: boolean;
  };
  
  // 統計情報
  locationStats: {
    totalEntities: number;
    discoveredEntities: number;
    interactableEntities: number;
    dangerousEntities: number;
    lastDiscoveryTime?: DateTime;
  };
  
  // リアルタイム更新情報
  lastRefresh: DateTime;
  autoRefreshEnabled: boolean;
}

// ==========================================
// 場所別エンティティAPI型定義
// ==========================================

export interface GetLocationEntitiesDisplayRequest {
  sessionId: ID;
  locationId: ID;
  includeHidden?: boolean;
  sortBy?: 'name' | 'discovery_time' | 'danger_level' | 'interaction_count';
  sortOrder?: 'asc' | 'desc';
}

export interface GetLocationEntitiesDisplayResponse {
  success: boolean;
  locationEntities: LocationEntity[];
  locationStats: {
    totalEntities: number;
    discoveredEntities: number;
    interactableEntities: number;
    dangerousEntities: number;
    lastDiscoveryTime?: DateTime;
  };
  lastUpdated: DateTime;
  error?: string;
}

export interface UpdateEntityStatusRequest {
  sessionId: ID;
  entityId: ID;
  newStatus: LocationEntity['status'];
  reason?: string;
}

export interface UpdateEntityStatusResponse {
  success: boolean;
  updatedEntity?: LocationEntity;
  error?: string;
}

export interface RefreshLocationEntitiesRequest {
  sessionId: ID;
  locationId: ID;
  forceRegeneration?: boolean;
}

export interface RefreshLocationEntitiesResponse {
  success: boolean;
  refreshedEntities: LocationEntity[];
  newEntitiesGenerated: number;
  error?: string;
}