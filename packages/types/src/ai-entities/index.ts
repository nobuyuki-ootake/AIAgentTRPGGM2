// ==========================================
// AI基盤データ構造システム - 統合エクスポート
// ==========================================

// 分割されたモジュールからすべてエクスポート
export * from './ai-providers';
export * from './ai-conditions';
export * from './ai-queries';
export * from './entity-relationships';
export * from './milestones';
export * from './scenarios';

// 型エイリアスの維持（互換性のため）
export type { 
  AIProviderType, 
  AIProvider, 
  AIRequest, 
  AIMessage 
} from './ai-providers';

export type { 
  AIConditionExpression, 
  AIGameContext,
  AIDecisionContext
} from './ai-conditions';

export type { 
  AIQueryFilter, 
  AIQueryResult 
} from './ai-queries';

export type { 
  EntityRelationship, 
  EntityRelationshipGraph,
  AIIntegratedEntityBase,
  LocationEntityMapping,
  EntityRelationshipType,
  EntityRelationshipRule,
  EntityRelationships
} from './entity-relationships';

export type { 
  MilestoneType,
  MilestoneStatus,
  MilestoneTargetDetails,
  AIPoolMilestone,
  MilestoneSchedule,
  AIMilestone,
  EntityPool,
  EntityPoolCollection,
  CoreEntities,
  BonusEntities,
  EntityPoolsContainer,
  MilestoneGenerationRequest,
  MilestoneGenerationResponse,
  UnifiedMilestone,
  MilestoneBaseInfo
} from './milestones';

export { 
  isAIPoolMilestone,
  isAIMilestone,
  getMilestoneBaseInfo,
  convertAIPoolMilestoneToAIMilestone
} from './milestones';

export type { 
  GameTheme,
  SessionScenario,
  ScenarioGenerationRequest,
  ScenarioGenerationResponse,
  ThemeAdaptation,
  ConversationStartRequest,
  InteractiveEventSession,
  AITaskDefinition,
  TaskEvaluation,
  DynamicDifficultySettings,
  EventResult,
  RetryOption,
  EventChoice
} from './scenarios';