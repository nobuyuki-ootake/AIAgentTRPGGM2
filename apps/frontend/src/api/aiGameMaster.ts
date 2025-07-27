import { apiClient } from './client';
import { ID, SessionState, Character, Quest, Milestone, SessionDurationConfig } from '@ai-agent-trpg/types';

interface SessionContext {
  currentSession: SessionState;
  characters: Character[];
  activeQuests: Quest[];
  completedMilestones: Milestone[];
  recentEvents: string[];
  campaignTension: number;
  playerEngagement: number;
  storyProgression: number;
  difficulty: string;
  mood: string;
}

interface GameOverviewRequest {
  sessionId: ID;
  campaignId: ID;
  context: SessionContext;
  provider?: string;
  model?: string;
}

interface GameOverview {
  id: ID;
  sessionId: ID;
  campaignId: ID;
  sessionSummary: string;
  currentObjectives: string[];
  keyNPCs: Array<{
    id: ID;
    name: string;
    role: string;
    status: string;
  }>;
  currentSituation: string;
  atmosphere: string;
  tensions: string[];
  opportunities: string[];
  playerBriefing: string;
  suggestedActions: string[];
  warningsAndHints: string[];
  generatedAt: string;
  aiProvider: string;
  context: SessionContext;
}

interface TaskExplanationRequest {
  sessionId: ID;
  taskContext: {
    questId?: ID;
    milestoneId?: ID;
    taskTitle: string;
    basicDescription: string;
  };
  sessionContext: SessionContext;
  provider?: string;
  model?: string;
}

interface TaskObjective {
  id: ID;
  description: string;
  type: 'primary' | 'secondary' | 'optional' | 'bonus';
  completed: boolean;
  requirements: string[];
  rewards: {
    experience: number;
    items: string[];
    story: string[];
  };
}

interface TaskExplanation {
  id: ID;
  sessionId: ID;
  questId?: ID;
  milestoneId?: ID;
  taskTitle: string;
  taskDescription: string;
  objectives: TaskObjective[];
  backgroundContext: string;
  relevantHistory: string[];
  stakeholders: string[];
  approachSuggestions: string[];
  potentialChallenges: string[];
  successCriteria: string[];
  failureConsequences: string[];
  atmosphericDetails: string;
  sensoryDescriptions: string;
  moodSetting: string;
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme';
  estimatedDuration: number;
  generatedAt: string;
  aiProvider: string;
}

interface ResultJudgmentRequest {
  sessionId: ID;
  characterId: ID;
  actionDescription: string;
  checkResult: {
    outcome: 'critical_success' | 'success' | 'partial_success' | 'failure' | 'critical_failure';
    successLevel: number;
    difficulty: number;
    modifiers: string[];
  };
  sessionContext: SessionContext;
  provider?: string;
  model?: string;
}

interface ResultJudgment {
  id: ID;
  sessionId: ID;
  characterId: ID;
  actionDescription: string;
  outcome: 'critical_success' | 'success' | 'partial_success' | 'failure' | 'critical_failure';
  successLevel: number;
  immediateResults: string;
  longtermConsequences: string[];
  characterImpact: string;
  storyProgression: string;
  dramaticDescription: string;
  atmosphericChanges: string;
  npcReactions: Array<{
    npcId: ID;
    npcName: string;
    reaction: string;
  }>;
  newOpportunities: string[];
  emergingChallenges: string[];
  suggestedFollowups: string[];
  difficulty: number;
  modifiers: string[];
  timestamp: string;
  aiProvider: string;
}

interface ScenarioAdjustmentRequest {
  sessionId: ID;
  trigger: 'player_success' | 'player_failure' | 'unexpected_action' | 'pacing_issue' | 'story_balance';
  triggerContext: string;
  sessionContext: SessionContext;
  provider?: string;
  model?: string;
}

interface ScenarioAdjustment {
  id: ID;
  sessionId: ID;
  trigger: 'player_success' | 'player_failure' | 'unexpected_action' | 'pacing_issue' | 'story_balance';
  analysis: string;
  adjustmentType: 'difficulty' | 'story' | 'npcs' | 'environment' | 'objectives';
  adjustments: Array<{
    element: string;
    change: string;
    reasoning: string;
  }>;
  newElements: Array<{
    type: 'npc' | 'location' | 'item' | 'event' | 'challenge';
    name: string;
    description: string;
    purpose: string;
  }>;
  implementationGuide: string;
  timingRecommendations: string[];
  playerCommunication: string;
  confidence: number;
  timestamp: string;
  aiProvider: string;
}

interface BatchGenerationRequest {
  sessionId: ID;
  campaignId: ID;
  requests: Array<{
    type: 'game-overview' | 'task-explanation' | 'scenario-adjustment';
    taskContext?: any;
    trigger?: string;
    triggerContext?: string;
  }>;
  sessionContext: SessionContext;
  provider?: string;
  model?: string;
}

interface BatchGenerationResult {
  type: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface SessionSummary {
  overview: GameOverview | null;
  currentTask: TaskExplanation | null;
  recentResults: ResultJudgment[];
  recentAdjustments: ScenarioAdjustment[];
  sessionStats: {
    totalJudgments: number;
    totalAdjustments: number;
    hasOverview: boolean;
    hasCurrentTask: boolean;
  };
}

interface PlayerActionResponseRequest {
  sessionId: ID;
  playerCharacterId: ID;
  playerAction: string;
  sessionContext: SessionContext;
  provider: string;
  model?: string;
}

// セッション初期化関連の型定義（バックエンドと一致させる）
interface EntityPoolCollection {
  coreEntities: CoreEntityCollection;
  bonusEntities?: any;
  // 後方互換性のための直接エンティティアクセス（オプション）
  enemies?: EntityPoolEnemy[];
  events?: EntityPoolEvent[];
  npcs?: EntityPoolNPC[];
  items?: EntityPoolItem[];
  quests?: EntityPoolQuest[];
}

interface CoreEntityCollection {
  enemies: EntityPoolEnemy[];
  events: EntityPoolEvent[];
  npcs: EntityPoolNPC[];
  items: EntityPoolItem[];
  quests: EntityPoolQuest[];
}

interface EntityPool {
  id: ID;
  campaignId: ID;
  sessionId: ID;
  themeId?: ID;
  entities: EntityPoolCollection;
  generatedAt: string;
  lastUpdated: string;
}

interface EntityPoolEnemy {
  id: ID;
  name: string;
  description: string;
  level: number;
  hitPoints: number;
  abilities: string[];
  location?: string;
  theme: string;
}

interface EntityPoolEvent {
  id: ID;
  title: string;
  description: string;
  eventType: 'investigation' | 'social' | 'exploration' | 'puzzle' | 'discovery';
  difficulty: 'easy' | 'medium' | 'hard';
  location?: string;
  theme: string;
  choices: string[];
}

interface EntityPoolNPC {
  id: ID;
  name: string;
  description: string;
  personality: string;
  role: string;
  location?: string;
  communicationConditions: string[];
  theme: string;
}

interface EntityPoolItem {
  id: ID;
  name: string;
  description: string;
  itemType: 'key' | 'tool' | 'weapon' | 'consumable';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  obtainMethods: string[];
  theme: string;
}

interface EntityPoolQuest {
  id: ID;
  title: string;
  description: string;
  questType: 'main' | 'side' | 'personal';
  difficulty: 'easy' | 'medium' | 'hard';
  requirements: string[];
  rewards: string[];
  theme: string;
}

interface SessionInitializationRequest {
  sessionId: ID;
  campaignId: ID;
  durationConfig: SessionDurationConfig;
  characters: Character[];
  campaignTheme?: string;
  provider?: string;
  model?: string;
}

interface SessionInitializationProgressUpdate {
  phase: 'scenario' | 'milestone' | 'entity';
  progress: number;
  status: 'in_progress' | 'completed' | 'error';
  currentTask: string;
  completedTasks: string[];
  totalTasks: number;
  estimatedTimeRemaining: number;
  error?: string;
}

interface SessionInitializationCallbacks {
  onProgress?: (update: SessionInitializationProgressUpdate) => void;
  onPhaseChange?: (phase: 'scenario' | 'milestone' | 'entity', progress: number) => void;
  onComplete?: (result: SessionInitializationResult) => void;
  onError?: (error: string) => void;
}

interface SessionInitializationResult {
  milestones: Milestone[];
  entityPool: EntityPool;
  gameOverview: GameOverview;
  message: string;
}


export const aiGameMasterAPI = {
  /**
   * セッション開始時のゲーム概要を生成
   */
  async generateGameOverview(request: GameOverviewRequest): Promise<GameOverview> {
    return await apiClient.post<GameOverview>(
      '/ai-game-master/game-overview',
      request,
    );
  },

  /**
   * タスク内容の詳細説明を生成
   */
  async generateTaskExplanation(request: TaskExplanationRequest): Promise<TaskExplanation> {
    return await apiClient.post<TaskExplanation>(
      '/ai-game-master/task-explanation',
      request,
    );
  },

  /**
   * 行動結果の判定とフィードバックを生成
   */
  async generateResultJudgment(request: ResultJudgmentRequest): Promise<ResultJudgment> {
    return await apiClient.post<ResultJudgment>(
      '/ai-game-master/result-judgment',
      request,
    );
  },

  /**
   * 動的シナリオ調整を生成
   */
  async generateScenarioAdjustment(request: ScenarioAdjustmentRequest): Promise<ScenarioAdjustment> {
    return await apiClient.post<ScenarioAdjustment>(
      '/ai-game-master/scenario-adjustment',
      request,
    );
  },

  /**
   * セッションの最新ゲーム概要を取得
   */
  async getGameOverview(sessionId: ID): Promise<GameOverview | null> {
    try {
      return await apiClient.get<GameOverview>(
        `/ai-game-master/game-overview/${sessionId}`,
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  /**
   * セッションの最新タスク説明を取得
   */
  async getTaskExplanation(sessionId: ID, taskId?: ID): Promise<TaskExplanation | null> {
    return await apiClient.get<TaskExplanation | null>(
      `/ai-game-master/task-explanation/${sessionId}${taskId ? `?taskId=${taskId}` : ''}`,
    );
  },

  /**
   * セッションの最近の結果判定を取得
   */
  async getResultJudgments(sessionId: ID, limit: number = 5): Promise<ResultJudgment[]> {
    return await apiClient.get<ResultJudgment[]>(
      `/ai-game-master/result-judgments/${sessionId}?limit=${limit}`,
    );
  },

  /**
   * セッションの最近のシナリオ調整を取得
   */
  async getScenarioAdjustments(sessionId: ID, limit: number = 3): Promise<ScenarioAdjustment[]> {
    return await apiClient.get<ScenarioAdjustment[]>(
      `/ai-game-master/scenario-adjustments/${sessionId}?limit=${limit}`,
    );
  },

  /**
   * 複数のAI生成を一度に実行
   */
  async batchGenerate(request: BatchGenerationRequest): Promise<BatchGenerationResult[]> {
    return await apiClient.post<BatchGenerationResult[]>(
      '/ai-game-master/batch-generate',
      request,
    );
  },

  /**
   * セッションの包括的なサマリーを取得
   */
  async getSessionSummary(sessionId: ID): Promise<SessionSummary> {
    return await apiClient.get<SessionSummary>(
      `/ai-game-master/session-summary/${sessionId}`,
    );
  },

  /**
   * プレイヤーアクションに対するAI応答を生成してチャットに投稿
   */
  async generatePlayerActionResponse(request: PlayerActionResponseRequest): Promise<{ success: boolean; message: string }> {
    return await apiClient.post<{ success: boolean; message: string }>(
      '/ai-game-master/player-action-response',
      request,
    );
  },

  /**
   * ゲーム概要の状況説明を生成（便利メソッド）
   */
  async generateQuickSituation(
    sessionId: ID,
    campaignId: ID,
    basicContext: Partial<SessionContext>,
    aiSettings: { provider?: string; model?: string },
  ): Promise<string> {
    const defaultContext: SessionContext = {
      currentSession: { id: sessionId, status: 'active', mode: 'exploration' } as SessionState,
      characters: [],
      activeQuests: [],
      completedMilestones: [],
      recentEvents: [],
      campaignTension: 50,
      playerEngagement: 70,
      storyProgression: 30,
      difficulty: 'medium',
      mood: 'neutral',
      ...basicContext,
    };

    const overview = await this.generateGameOverview({
      sessionId,
      campaignId,
      context: defaultContext,
      ...aiSettings,
    });

    return overview.currentSituation;
  },

  /**
   * 結果判定のレベル説明を取得（便利メソッド）
   */
  getOutcomeDescription(outcome: ResultJudgment['outcome']): { level: string; description: string; color: string } {
    const descriptions = {
      critical_success: {
        level: '大成功',
        description: '期待を大きく上回る素晴らしい結果',
        color: 'success',
      },
      success: {
        level: '成功',
        description: '目標を達成しました',
        color: 'success',
      },
      partial_success: {
        level: '部分的成功',
        description: '一部の目標を達成しました',
        color: 'info',
      },
      failure: {
        level: '失敗',
        description: '目標を達成できませんでした',
        color: 'warning',
      },
      critical_failure: {
        level: '大失敗',
        description: '予想以上に悪い結果になりました',
        color: 'error',
      },
    };
    return descriptions[outcome];
  },

  /**
   * 難易度レベルの説明を取得（便利メソッド）
   */
  getDifficultyDescription(difficulty: TaskExplanation['difficulty']): { name: string; description: string; color: string } {
    const descriptions = {
      trivial: {
        name: '非常に簡単',
        description: '誰でも簡単に成功できる',
        color: 'success',
      },
      easy: {
        name: '簡単',
        description: '基本的な技能で成功可能',
        color: 'success',
      },
      medium: {
        name: '普通',
        description: '適切な技能と計画が必要',
        color: 'info',
      },
      hard: {
        name: '困難',
        description: '高い技能と良い戦略が必要',
        color: 'warning',
      },
      extreme: {
        name: '極めて困難',
        description: '完璧な実行と運が必要',
        color: 'error',
      },
    };
    return descriptions[difficulty];
  },

  /**
   * 調整トリガーの説明を取得（便利メソッド）
   */
  getTriggerDescription(trigger: ScenarioAdjustment['trigger']): string {
    const descriptions = {
      player_success: 'プレイヤーの予想以上の成功',
      player_failure: 'プレイヤーの連続的な失敗',
      unexpected_action: 'プレイヤーの予想外の行動',
      pacing_issue: 'セッションペースの問題',
      story_balance: 'ストーリーバランスの調整',
    };
    return descriptions[trigger];
  },

  /**
   * セッション状況の健全性チェック（便利メソッド）
   */
  checkSessionHealth(context: SessionContext): {
    overall: 'healthy' | 'attention' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // プレイヤー関与度チェック
    if (context.playerEngagement < 40) {
      issues.push('プレイヤー関与度が低下');
      recommendations.push('より魅力的な展開やプレイヤー選択肢を提供');
    }

    // キャンペーンテンションチェック
    if (context.campaignTension < 20) {
      issues.push('ストーリーテンションが不足');
      recommendations.push('新たな困難や緊急事態を導入');
    } else if (context.campaignTension > 80) {
      issues.push('ストーリーテンションが過度に高い');
      recommendations.push('休息や軽快な場面を提供');
    }

    // ストーリー進行チェック
    if (context.storyProgression < 10) {
      issues.push('ストーリー進行が停滞');
      recommendations.push('明確な目標と進行イベントを提供');
    }

    // 総合判定
    let overall: 'healthy' | 'attention' | 'critical';
    if (issues.length === 0) {
      overall = 'healthy';
    } else if (issues.length <= 2) {
      overall = 'attention';
    } else {
      overall = 'critical';
    }

    return { overall, issues, recommendations };
  },

  /**
   * セッション開始時のマイルストーン・エンティティプール自動生成
   */
  async initializeSession(request: SessionInitializationRequest): Promise<SessionInitializationResult> {
    const response = await apiClient.post<{
      success: boolean;
      data: SessionInitializationResult;
      timestamp: string;
    }>('/ai-game-master/initialize-session', request);

    console.log('🔍 Initialize session raw response:', response);
    console.log('🔍 Response structure check:', {
      hasResponse: !!response,
      hasData: !!response?.data,
      hasSuccess: !!response?.success,
      responseKeys: response ? Object.keys(response) : [],
      dataKeys: response?.data ? Object.keys(response.data) : []
    });

    // レスポンス構造をチェックして正しいデータを返す
    if (response && response.data && response.success) {
      console.log('✅ Using response.data structure');
      return response.data;
    } else if (response && response.data) {
      console.log('✅ Using response.data as SessionInitializationResult');
      return response.data as SessionInitializationResult;
    } else if (response) {
      console.log('✅ Using response as SessionInitializationResult');
      return response as unknown as SessionInitializationResult;
    } else {
      console.error('❌ Invalid response structure:', response);
      throw new Error('Invalid response structure from initialize-session API');
    }
  },

  /**
   * セッション初期化（進捗コールバック付き）
   */
  async initializeSessionWithProgress(
    request: SessionInitializationRequest,
    callbacks?: SessionInitializationCallbacks
  ): Promise<SessionInitializationResult> {
    // WebSocketを使用した場合の進捗更新は useSessionInitialization フックで処理
    // ここでは通常のAPI呼び出しとして実装
    try {
      callbacks?.onProgress?.({
        phase: 'scenario',
        progress: 0,
        status: 'in_progress',
        currentTask: 'セッション初期化を開始しています...',
        completedTasks: [],
        totalTasks: 16,
        estimatedTimeRemaining: 500,
      });

      const result = await this.initializeSession(request);
      
      callbacks?.onComplete?.(result);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'セッション初期化中にエラーが発生しました';
      callbacks?.onError?.(errorMessage);
      throw error;
    }
  },

  /**
   * セッション初期化（便利メソッド）
   */
  async initializeSessionWithDefaults(
    sessionId: ID,
    campaignId: ID,
    durationConfig: SessionDurationConfig,
    characters: Character[],
    campaignTheme: string = 'クラシックファンタジー'
  ): Promise<SessionInitializationResult> {
    return this.initializeSession({
      sessionId,
      campaignId,
      durationConfig,
      characters,
      campaignTheme,
      provider: 'google',
    });
  },
};

// Export types for convenience
export type {
  SessionContext,
  GameOverviewRequest,
  GameOverview,
  TaskExplanationRequest,
  TaskExplanation,
  TaskObjective,
  ResultJudgmentRequest,
  ResultJudgment,
  ScenarioAdjustmentRequest,
  ScenarioAdjustment,
  BatchGenerationRequest,
  BatchGenerationResult,
  SessionSummary,
  PlayerActionResponseRequest,
  EntityPool,
  EntityPoolEnemy,
  EntityPoolEvent,
  EntityPoolNPC,
  EntityPoolItem,
  EntityPoolQuest,
  SessionInitializationRequest,
  SessionInitializationResult,
  SessionInitializationProgressUpdate,
  SessionInitializationCallbacks,
};