import { 
  InteractiveEventSession,
  AITaskDefinition,
  TaskEvaluation,
  DynamicDifficultySettings,
  EventResult,
  RetryOption,
  EventChoice,
  Character,
  SessionContext,
  DiceRollResult,
  ID
} from '@ai-agent-trpg/types';
import { apiClient } from './client';

export interface StartEventSessionRequest {
  sessionId: ID;
  eventId: ID;
  playerId: ID;
  characterId: ID;
  choices: EventChoice[];
}

export interface ProcessChoiceRequest {
  choiceId: ID;
  choice: EventChoice;
  character: Character;
  sessionContext: SessionContext;
}

export interface EvaluateSolutionRequest {
  taskId: ID;
  playerSolution: string;
  character: Character;
  sessionContext: SessionContext;
}

export interface ExecuteDiceRollRequest {
  difficultySettings: DynamicDifficultySettings;
  diceResult: DiceRollResult;
  character: Character;
  sessionContext: SessionContext;
}

export interface GenerateChoicesRequest {
  provider?: string;
  eventContext: any;
  character: Character;
  sessionContext: SessionContext;
  choiceCount?: number;
}

export interface InterpretChoiceRequest {
  provider?: string;
  choice: EventChoice;
  character: Character;
  sessionContext: SessionContext;
}

export interface EvaluatePlayerSolutionRequest {
  provider?: string;
  playerSolution: string;
  character: Character;
  sessionContext: SessionContext;
  taskDefinition?: AITaskDefinition;
}

export interface GenerateNarrativeRequest {
  provider?: string;
  eventSession: InteractiveEventSession;
  character: Character;
  sessionContext: SessionContext;
  diceResult?: DiceRollResult;
  success?: boolean;
}

export interface CalculateDifficultyRequest {
  provider?: string;
  taskEvaluation: TaskEvaluation;
  character: Character;
  sessionContext: SessionContext;
}

export interface ApplyPenaltiesRequest {
  characterId: ID;
  penalties: any[];
}

/**
 * インタラクティブイベントAPI
 */
class InteractiveEventsAPI {
  /**
   * インタラクティブイベントセッションを開始
   */
  async startEventSession(request: StartEventSessionRequest): Promise<InteractiveEventSession> {
    return await apiClient.post<InteractiveEventSession>('/interactive-events/start', request);
  }

  /**
   * プレイヤーの選択を処理
   */
  async processPlayerChoice(
    eventSessionId: ID, 
    request: ProcessChoiceRequest
  ): Promise<AITaskDefinition> {
    return await apiClient.post<AITaskDefinition>(
      `/interactive-events/${eventSessionId}/process-choice`, 
      request
    );
  }

  /**
   * プレイヤーの解決方法を評価
   */
  async evaluatePlayerSolution(
    eventSessionId: ID, 
    request: EvaluateSolutionRequest
  ): Promise<DynamicDifficultySettings> {
    return await apiClient.post<DynamicDifficultySettings>(
      `/interactive-events/${eventSessionId}/evaluate-solution`, 
      request
    );
  }

  /**
   * ダイス判定を実行し結果を処理
   */
  async executeDiceRoll(
    eventSessionId: ID, 
    request: ExecuteDiceRollRequest
  ): Promise<EventResult> {
    return await apiClient.post<EventResult>(
      `/interactive-events/${eventSessionId}/execute-dice-roll`, 
      request
    );
  }

  /**
   * イベントセッション情報を取得
   */
  async getEventSession(eventSessionId: ID): Promise<InteractiveEventSession> {
    return await apiClient.get<InteractiveEventSession>(`/interactive-events/${eventSessionId}`);
  }

  /**
   * リトライオプションを取得
   */
  async getRetryOptions(eventSessionId: ID, characterId: ID): Promise<RetryOption[]> {
    return await apiClient.get<RetryOption[]>(
      `/interactive-events/${eventSessionId}/retry-options?characterId=${characterId}`
    );
  }

  /**
   * イベント選択肢を動的生成
   */
  async generateEventChoices(request: GenerateChoicesRequest): Promise<EventChoice[]> {
    return await apiClient.post<EventChoice[]>('/interactive-events/generate-choices', request);
  }

  /**
   * 選択肢を解釈してタスクを生成
   */
  async interpretPlayerChoice(request: InterpretChoiceRequest): Promise<AITaskDefinition> {
    return await apiClient.post<AITaskDefinition>('/interactive-events/interpret-choice', request);
  }

  /**
   * プレイヤーソリューションを評価
   */
  async evaluatePlayerSolutionDirect(request: EvaluatePlayerSolutionRequest): Promise<TaskEvaluation> {
    return await apiClient.post<TaskEvaluation>('/interactive-events/evaluate-solution', request);
  }

  /**
   * 結果ナラティブを生成
   */
  async generateResultNarrative(request: GenerateNarrativeRequest): Promise<string> {
    return await apiClient.post<string>('/interactive-events/generate-narrative', request);
  }

  /**
   * 動的難易度を計算
   */
  async calculateDynamicDifficulty(request: CalculateDifficultyRequest): Promise<DynamicDifficultySettings> {
    return await apiClient.post<DynamicDifficultySettings>('/interactive-events/calculate-difficulty', request);
  }

  /**
   * ペナルティ効果を適用
   */
  async applyPenalties(eventSessionId: ID, request: ApplyPenaltiesRequest): Promise<any> {
    return await apiClient.post<any>(
      `/interactive-events/${eventSessionId}/apply-penalties`, 
      request
    );
  }

  /**
   * イベントセッションの履歴を取得
   */
  async getEventSessionHistory(eventSessionId: ID): Promise<any> {
    return await apiClient.get<any>(`/interactive-events/${eventSessionId}/history`);
  }

  // ==========================================
  // 便利メソッド（フロー管理用）
  // ==========================================

  /**
   * 完全なインタラクティブイベントフローを実行
   */
  async executeCompleteEventFlow(
    sessionId: ID,
    eventId: ID,
    playerId: ID,
    characterId: ID,
    initialChoices: EventChoice[],
    _character: Character,
    _sessionContext: SessionContext
  ): Promise<{
    eventSession: InteractiveEventSession;
    choices: EventChoice[];
  }> {
    // 1. イベントセッション開始
    const eventSession = await this.startEventSession({
      sessionId,
      eventId,
      playerId,
      characterId,
      choices: initialChoices
    });

    return {
      eventSession,
      choices: initialChoices
    };
  }

  /**
   * 選択からダイス判定まで実行
   */
  async executeChoiceToRoll(
    eventSessionId: ID,
    choiceId: ID,
    choice: EventChoice,
    playerSolution: string,
    character: Character,
    sessionContext: SessionContext
  ): Promise<{
    taskDefinition: AITaskDefinition;
    difficultySettings: DynamicDifficultySettings;
  }> {
    // 1. 選択を処理してタスク生成
    const taskDefinition = await this.processPlayerChoice(eventSessionId, {
      choiceId,
      choice,
      character,
      sessionContext
    });

    // 2. プレイヤーの解決方法を評価
    const difficultySettings = await this.evaluatePlayerSolution(eventSessionId, {
      taskId: taskDefinition.id,
      playerSolution,
      character,
      sessionContext
    });

    return {
      taskDefinition,
      difficultySettings
    };
  }

  /**
   * ダイス判定から結果まで実行
   */
  async executeRollToResult(
    eventSessionId: ID,
    difficultySettings: DynamicDifficultySettings,
    diceResult: DiceRollResult,
    character: Character,
    sessionContext: SessionContext
  ): Promise<EventResult> {
    // ダイス判定を実行し結果を処理
    const eventResult = await this.executeDiceRoll(eventSessionId, {
      difficultySettings,
      diceResult,
      character,
      sessionContext
    });

    return eventResult;
  }

  /**
   * エラー処理付きの安全な実行
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    fallbackValue: T,
    errorMessage: string = 'Operation failed'
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      return fallbackValue;
    }
  }

  /**
   * 模擬データ生成（開発・テスト用）
   */
  createMockEventChoice(
    id: string,
    text: string,
    description: string,
    _category: 'action' | 'dialogue' | 'investigation' | 'combat' | 'social' = 'action'
  ): EventChoice {
    return {
      id,
      text,
      description,
      requirements: [],
      consequences: []
    } as EventChoice;
  }

  /**
   * 模擬ダイス結果生成（開発・テスト用）
   */
  createMockDiceResult(
    total: number = 15,
    naturalRoll: number = 12,
    modifier: number = 3
  ): DiceRollResult {
    return {
      diceType: 'd20',
      rawRoll: naturalRoll,
      modifiers: modifier,
      totalResult: total,
      targetNumber: 15,
      success: total >= 15,
      criticalSuccess: naturalRoll === 20,
      criticalFailure: naturalRoll === 1
    };
  }

  /**
   * 模擬セッションコンテキスト生成（開発・テスト用）
   */
  createMockSessionContext(
    campaignId: ID,
    sessionId: ID
  ): SessionContext {
    return {
      campaignId,
      sessionId,
      activeCharacters: [],
      recentEvents: [],
      storyFlags: {},
      timeOfDay: 'afternoon'
    };
  }
}

// シングルトンインスタンス
export const interactiveEventsAPI = new InteractiveEventsAPI();