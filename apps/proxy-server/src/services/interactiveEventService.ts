import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { 
  InteractiveEventSession,
  AITaskDefinition,
  TaskEvaluation,
  DynamicDifficultySettings,
  EventResult,
  RetryOption,
  EventChoice,
  Character,
  ID
} from '@ai-agent-trpg/types';
import { getAIService } from './aiService';

// ローカル型定義（存在しない型を補完）
interface EventMetadata {
  [key: string]: any;
}

interface PenaltyEffect {
  id: string;
  type: string;
  amount: number;
  description: string;
  reversible: boolean;
  severity: string;
  appliedAt: string;
  source: string;
}

interface DiceRollResult {
  diceType: string;
  rawRoll: number;
  modifiers: number;
  totalResult: number;
  targetNumber: number;
  success: boolean;
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
}

interface SessionContext {
  [key: string]: any;
}

// AI リクエスト・レスポンス型
interface EventAIRequest {
  type: 'choice_interpretation' | 'task_generation' | 'difficulty_calculation' | 'result_narration';
  eventSession: InteractiveEventSession;
  choice?: EventChoice;
  character: Character;
  sessionContext: SessionContext;
  playerInput?: string;
}

interface EventAIResponse {
  success: boolean;
  response: AITaskDefinition | TaskEvaluation | DynamicDifficultySettings | string;
  processingTime: number;
  tokensUsed: number;
  error?: string;
}

// イベントステップ型
type EventStep = 'choice_selection' | 'ai_interpretation' | 'task_presentation' | 'solution_input' | 'difficulty_calculation' | 'dice_roll' | 'result_processing' | 'retry_selection';

// インタラクティブイベント状態型
type InteractiveEventState = 'waiting_for_choice' | 'processing_choice' | 'waiting_for_solution' | 'calculating_difficulty' | 'dice_rolling' | 'processing_result' | 'waiting_for_retry' | 'completed' | 'failed';

export class InteractiveEventService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.initializeTables();
  }

  private initializeTables() {
    // インタラクティブイベントセッションテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS interactive_event_sessions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        character_id TEXT NOT NULL,
        state TEXT NOT NULL,
        current_step TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // イベントステップ履歴テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS event_step_history (
        id TEXT PRIMARY KEY,
        event_session_id TEXT NOT NULL,
        step TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        data TEXT NOT NULL,
        ai_response TEXT,
        player_input TEXT,
        dice_result TEXT,
        penalties TEXT,
        duration INTEGER NOT NULL,
        FOREIGN KEY (event_session_id) REFERENCES interactive_event_sessions (id)
      )
    `);

    // AIタスク定義テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_task_definitions (
        id TEXT PRIMARY KEY,
        event_session_id TEXT NOT NULL,
        choice_id TEXT NOT NULL,
        interpretation TEXT NOT NULL,
        objective TEXT NOT NULL,
        approach TEXT NOT NULL,
        constraints TEXT NOT NULL,
        success_criteria TEXT NOT NULL,
        estimated_difficulty TEXT NOT NULL,
        player_solution TEXT,
        ai_evaluation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_session_id) REFERENCES interactive_event_sessions (id)
      )
    `);

    // ペナルティ効果テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS penalty_effects (
        id TEXT PRIMARY KEY,
        event_session_id TEXT NOT NULL,
        character_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT NOT NULL,
        duration INTEGER,
        reversible BOOLEAN NOT NULL,
        severity TEXT NOT NULL,
        applied_at DATETIME NOT NULL,
        source TEXT NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (event_session_id) REFERENCES interactive_event_sessions (id)
      )
    `);
  }

  /**
   * 新しいインタラクティブイベントセッションを開始
   */
  async startEventSession(
    sessionId: ID,
    eventId: ID,
    playerId: ID,
    characterId: ID,
    choices: EventChoice[]
  ): Promise<InteractiveEventSession> {
    const eventSessionId = uuidv4();
    const now = new Date().toISOString();

    const metadata: EventMetadata = {
      startTime: now,
      totalAttempts: 0,
      currentAttempt: 1,
      maxAttempts: 3,
      accumulatedPenalties: [],
      experienceEarned: 0,
      storyProgression: [],
      difficultyAdjustments: []
    };

    const eventSession: InteractiveEventSession = {
      id: eventSessionId,
      sessionId,
      eventType: eventId,
      status: 'waiting_for_choice',
      playerChoices: choices,
      aiResponses: [],
      currentStep: 'choice_selection'
    };

    // データベースに保存
    const stmt = this.db.prepare(`
      INSERT INTO interactive_event_sessions 
      (id, session_id, event_id, player_id, character_id, state, current_step, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      eventSessionId,
      sessionId,
      eventId,
      playerId,
      characterId,
      eventSession.status,
      eventSession.currentStep,
      JSON.stringify(metadata),
      now,
      now
    );

    // 選択肢提示のステップを記録
    await this.recordEventStep(eventSessionId, 'choice_selection', {
      choices,
      eventId
    });

    return eventSession;
  }

  /**
   * プレイヤーの選択を処理し、AIタスク生成を実行
   */
  async processPlayerChoice(
    eventSessionId: ID,
    choiceId: ID,
    choice: EventChoice,
    character: Character,
    sessionContext: SessionContext
  ): Promise<AITaskDefinition> {
    const startTime = Date.now();

    // セッション状態を更新
    await this.updateEventSessionState(eventSessionId, 'processing_choice', 'ai_interpretation');

    // AI解釈リクエストを作成
    const eventSession = await this.getEventSession(eventSessionId);
    if (!eventSession) {
      throw new Error('Event session not found');
    }

    const aiRequest: EventAIRequest = {
      type: 'choice_interpretation',
      eventSession,
      choice,
      character,
      sessionContext
    };

    try {
      // AIによる選択解釈とタスク生成
      const aiResponse = await this.callAIForEventProcessing(aiRequest);
      const taskDefinition = aiResponse.response as AITaskDefinition;

      // タスク定義をデータベースに保存
      await this.saveTaskDefinition(eventSessionId, taskDefinition);

      // ステップを記録
      await this.recordEventStep(eventSessionId, 'ai_interpretation', {
        choiceId,
        choice,
        taskDefinition
      }, taskDefinition.description, undefined, undefined, undefined, Date.now() - startTime);

      // 状態を更新
      await this.updateEventSessionState(eventSessionId, 'waiting_for_solution', 'task_presentation');

      return taskDefinition;
    } catch (error) {
      // エラー処理
      await this.updateEventSessionState(eventSessionId, 'failed', 'choice_selection');
      throw error;
    }
  }

  /**
   * プレイヤーの解決方法を評価し難易度を計算
   */
  async evaluatePlayerSolution(
    eventSessionId: ID,
    taskId: ID,
    playerSolution: string,
    character: Character,
    sessionContext: SessionContext
  ): Promise<DynamicDifficultySettings> {
    const startTime = Date.now();

    // セッション状態を更新
    await this.updateEventSessionState(eventSessionId, 'calculating_difficulty', 'difficulty_calculation');

    const eventSession = await this.getEventSession(eventSessionId);
    const taskDefinition = await this.getTaskDefinition(taskId);

    if (!eventSession || !taskDefinition) {
      throw new Error('Event session or task definition not found');
    }

    // プレイヤー解決方法を保存（別途管理）
    // const _playerData = { 
    //   taskId,
    //   playerSolution,
    //   submittedAt: new Date().toISOString()
    // };

    const aiRequest: EventAIRequest = {
      type: 'difficulty_calculation',
      eventSession,
      character,
      sessionContext,
      playerInput: playerSolution
    };

    try {
      // AIによる評価と難易度計算
      const aiResponse = await this.callAIForEventProcessing(aiRequest);
      const evaluation = aiResponse.response as TaskEvaluation;

      // タスク定義を更新（aiEvaluationプロパティは存在しないため、別途管理）
      await this.updateTaskDefinition(taskId, {
        ...taskDefinition,
        playerSolution
      });

      // 難易度設定を生成
      const difficultySettings = await this.generateDifficultySettings(evaluation, character);

      // ステップを記録
      await this.recordEventStep(eventSessionId, 'difficulty_calculation', {
        playerSolution,
        evaluation,
        difficultySettings
      }, evaluation.feedback, playerSolution, undefined, undefined, Date.now() - startTime);

      // 状態を更新
      await this.updateEventSessionState(eventSessionId, 'dice_rolling', 'dice_roll');

      return difficultySettings;
    } catch (error) {
      await this.updateEventSessionState(eventSessionId, 'failed', 'solution_input');
      throw error;
    }
  }

  /**
   * ダイス判定を実行し結果を処理
   */
  async executeDiceRoll(
    eventSessionId: ID,
    difficultySettings: DynamicDifficultySettings,
    diceResult: DiceRollResult,
    character: Character,
    sessionContext: SessionContext
  ): Promise<EventResult> {
    const startTime = Date.now();

    // セッション状態を更新
    await this.updateEventSessionState(eventSessionId, 'processing_result', 'result_processing');

    const eventSession = await this.getEventSession(eventSessionId);
    if (!eventSession) {
      throw new Error('Event session not found');
    }

    try {
      // 判定結果を計算
      const success = diceResult.success;
      // const _criticalType = this.determineCriticalType(diceResult, difficultySettings);

      // 結果のナラティブを生成
      const aiRequest: EventAIRequest = {
        type: 'result_narration',
        eventSession,
        character,
        sessionContext
      };

      const aiResponse = await this.callAIForEventProcessing(aiRequest);
      const narrative = aiResponse.response as string;

      // 結果オブジェクトを作成
      const eventResult: EventResult = {
        success,
        score: diceResult.totalResult,
        description: narrative,
        consequences: success ? ['成功'] : ['失敗'],
        nextSteps: success ? ['次のアクションを選択'] : ['再試行またはその他の手段を検討']
      };

      // ペナルティを適用（失敗時）
      const penalties = !success ? await this.generatePenalties(eventSession, diceResult, difficultySettings) : [];
      if (!success && penalties.length > 0) {
        await this.applyPenalties(eventSessionId, character.id, penalties);
      }

      // ステップを記録
      await this.recordEventStep(eventSessionId, 'result_processing', {
        eventResult,
        difficultySettings
      }, narrative, undefined, diceResult, penalties, Date.now() - startTime);

      // セッション完了または再試行状態に更新
      const sessionMetadata = { currentAttempt: 1, maxAttempts: 3 }; // デフォルト値
      const currentAttempt = sessionMetadata.currentAttempt;
      const maxAttempts = sessionMetadata.maxAttempts;
      
      if (success || currentAttempt >= maxAttempts) {
        await this.updateEventSessionState(eventSessionId, 'completed', 'choice_selection');
      } else {
        await this.updateEventSessionState(eventSessionId, 'waiting_for_retry', 'retry_selection');
      }

      return eventResult;
    } catch (error) {
      await this.updateEventSessionState(eventSessionId, 'failed', 'dice_roll');
      throw error;
    }
  }

  /**
   * リトライオプションを生成
   */
  async generateRetryOptions(
    eventSessionId: ID,
    character: Character
  ): Promise<RetryOption[]> {
    const eventSession = await this.getEventSession(eventSessionId);
    if (!eventSession) {
      throw new Error('Event session not found');
    }

    // const sessionMetadata = { currentAttempt: 1, maxAttempts: 3 }; // デフォルト値
    // const remainingAttempts = sessionMetadata.maxAttempts - sessionMetadata.currentAttempt;
    
    const retryOptions: RetryOption[] = [
      {
        id: uuidv4(),
        description: '同じ方法で再挑戦する',
        cost: '標準コスト',
        difficultyModifier: 0
      }
    ];

    // キャラクターのスキルに基づく追加オプション
    const persuasionSkill = character.skills?.find(skill => skill.name === 'persuasion' || skill.name === '説得');
    const persuasionLevel = persuasionSkill ? (persuasionSkill as any).level || 0 : 0;
    if (persuasionLevel > 15) {
      retryOptions.push({
        id: uuidv4(),
        description: '異なるアプローチで説得を試みる',
        cost: '高コスト',
        difficultyModifier: -2
      });
    }

    const investigationSkill = character.skills?.find(skill => skill.name === 'investigation' || skill.name === '調査');
    const investigationLevel = investigationSkill ? (investigationSkill as any).level || 0 : 0;
    if (investigationLevel > 12) {
      retryOptions.push({
        id: uuidv4(),
        description: '状況をより詳しく調査してから再試行',
        cost: '時間コスト',
        difficultyModifier: -1
      });
    }

    return retryOptions;
  }

  /**
   * AIサービスを呼び出してイベント処理を実行
   */
  private async callAIForEventProcessing(request: EventAIRequest): Promise<EventAIResponse> {
    const startTime = Date.now();

    try {
      let response: AITaskDefinition | TaskEvaluation | DynamicDifficultySettings | string;

      switch (request.type) {
        case 'choice_interpretation':
          const interpretResult = await getAIService().interpretPlayerChoice({
            provider: 'openai', // TODO: プロバイダー選択ロジック
            playerInput: request.choice?.text || '',
            availableChoices: [request.choice!],
            context: { character: request.character, sessionContext: request.sessionContext }
          });
          response = interpretResult?.interpretedChoice || { interpretationData: 'Generated interpretation', interpretedChoice: {} };
          break;

        case 'task_generation':
          const taskResult = await getAIService().generateTaskFromChoice({
            provider: 'openai',
            selectedChoice: request.choice!,
            eventContext: request.sessionContext,
            playerContext: request.character
          });
          response = (taskResult?.generatedTask || 'Generated task') as AITaskDefinition;
          break;

        case 'difficulty_calculation':
          const evalResult = await getAIService().evaluatePlayerSolution({
            provider: 'openai',
            playerSolution: request.playerInput!,
            challengeContext: { character: request.character, sessionContext: request.sessionContext },
            difficultySettings: {}
          });
          response = evalResult?.solutionEvaluation || { evaluationData: 'Generated evaluation', solutionEvaluation: {} };
          break;

        case 'result_narration':
          const narrativeResult = await getAIService().generateResultNarrative({
            provider: 'openai',
            taskResult: { success: true },
            playerActions: [request.character.name || 'Player'],
            eventOutcome: { eventSession: request.eventSession, sessionContext: request.sessionContext }
          });
          response = (narrativeResult?.generatedNarrative || 'Generated narrative') as string;
          break;

        default:
          throw new Error(`Unknown AI request type: ${request.type}`);
      }

      return {
        success: true,
        response,
        processingTime: Date.now() - startTime,
        tokensUsed: 0, // TODO: トークン数の実装
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        response: '',
        processingTime: Date.now() - startTime,
        tokensUsed: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ヘルパーメソッド
  private async recordEventStep(
    eventSessionId: ID,
    step: EventStep,
    data: any,
    aiResponse?: string,
    playerInput?: string,
    diceResult?: DiceRollResult,
    penalties?: PenaltyEffect[],
    duration: number = 0
  ): Promise<void> {
    const stepId = uuidv4();
    const timestamp = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO event_step_history 
      (id, event_session_id, step, timestamp, data, ai_response, player_input, dice_result, penalties, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      stepId,
      eventSessionId,
      step,
      timestamp,
      JSON.stringify(data),
      aiResponse || null,
      playerInput || null,
      diceResult ? JSON.stringify(diceResult) : null,
      penalties ? JSON.stringify(penalties) : null,
      duration
    );
  }

  private async updateEventSessionState(
    eventSessionId: ID,
    state: InteractiveEventState,
    currentStep: EventStep
  ): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE interactive_event_sessions 
      SET state = ?, current_step = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(state, currentStep, eventSessionId);
  }

  private async getEventSession(eventSessionId: ID): Promise<InteractiveEventSession | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM interactive_event_sessions WHERE id = ?
    `);

    const row = stmt.get(eventSessionId) as any;
    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      eventType: row.event_id,
      status: row.state,
      playerChoices: [],
      aiResponses: [],
      currentStep: row.current_step
    };
  }

  private async saveTaskDefinition(eventSessionId: ID, task: AITaskDefinition): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO ai_task_definitions 
      (id, event_session_id, choice_id, interpretation, objective, approach, constraints, success_criteria, estimated_difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      eventSessionId,
      'choice-' + task.id.slice(0, 8),
      task.description,
      task.description,
      JSON.stringify(task.requiredSkills),
      JSON.stringify(task.requiredSkills),
      JSON.stringify([`difficulty-${task.difficulty}`]),
      task.difficulty.toString()
    );
  }

  private async getTaskDefinition(taskId: ID): Promise<AITaskDefinition | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM ai_task_definitions WHERE id = ?
    `);

    const row = stmt.get(taskId) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: `Task-${row.id.slice(0, 8)}`,
      description: row.interpretation || 'AI generated task',
      difficulty: parseInt(row.estimated_difficulty) || 5,
      requiredSkills: JSON.parse(row.constraints || '[]'),
      timeLimit: 30
    };
  }

  private async updateTaskDefinition(taskId: ID, task: Partial<AITaskDefinition> & { playerSolution?: string }): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE ai_task_definitions 
      SET player_solution = ?
      WHERE id = ?
    `);

    stmt.run(
      task.playerSolution || null,
      taskId
    );
  }

  private async generateDifficultySettings(
    evaluation: TaskEvaluation,
    _character: Character
  ): Promise<DynamicDifficultySettings> {
    // 評価スコアに基づく難易度設定
    const difficultyLevel = Math.max(1, Math.min(10, Math.round(evaluation.score / 10)));
    
    return {
      baseLevel: difficultyLevel,
      adaptationRate: 0.1,
      minLevel: 1,
      maxLevel: 10,
      playerSkillMetrics: {}
    };
  }

  // 未使用関数：将来的に実装予定
  // private determineCriticalType(
  //   diceResult: DiceRollResult,
  //   _settings: DynamicDifficultySettings
  // ): 'success' | 'failure' | undefined {
  //   if (diceResult.criticalSuccess) {
  //     return 'success';
  //   }
  //   if (diceResult.criticalFailure) {
  //     return 'failure';
  //   }
  //   return undefined;
  // }

  // 未使用関数：将来的に実装予定
  // private async _generateRewards(
  //   _eventSession: InteractiveEventSession,
  //   _character: Character
  // ): Promise<any[]> {
  //   // TODO: 報酬生成ロジックの実装
  //   return [];
  // }

  private async generatePenalties(
    _eventSession: InteractiveEventSession,
    diceResult: DiceRollResult,
    _settings: DynamicDifficultySettings
  ): Promise<PenaltyEffect[]> {
    const penalties: PenaltyEffect[] = [];

    // 基本的なペナルティ
    if (diceResult.criticalFailure) {
      penalties.push({
        id: uuidv4(),
        type: 'hp_loss',
        amount: 2,
        description: 'クリティカル失敗による軽微な負傷',
        reversible: true,
        severity: 'minor',
        appliedAt: new Date().toISOString(),
        source: 'dice_failure'
      });
    } else {
      penalties.push({
        id: uuidv4(),
        type: 'time_loss',
        amount: 1,
        description: '時間の浪費',
        reversible: false,
        severity: 'minor',
        appliedAt: new Date().toISOString(),
        source: 'dice_failure'
      });
    }

    return penalties;
  }

  private async applyPenalties(
    eventSessionId: ID,
    characterId: ID,
    penalties: PenaltyEffect[]
  ): Promise<void> {
    for (const penalty of penalties) {
      const stmt = this.db.prepare(`
        INSERT INTO penalty_effects 
        (id, event_session_id, character_id, type, amount, description, duration, reversible, severity, applied_at, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        penalty.id,
        eventSessionId,
        characterId,
        penalty.type,
        penalty.amount,
        penalty.description,
        null, // duration
        penalty.reversible,
        penalty.severity,
        penalty.appliedAt,
        penalty.source
      );
    }
  }

  // 未使用関数：将来的に実装予定
  // private _calculateExperience(settings: DynamicDifficultySettings): number {
  //   // 難易度に基づく経験値計算
  //   const baseExp = settings.baseLevel * 10;
  //   return Math.max(10, baseExp);
  // }
}

// サービスのインスタンスをエクスポート
// 遅延初期化でデータベース接続を取得
import { getDatabase } from '../database/database';

let _interactiveEventService: InteractiveEventService | null = null;

export function getInteractiveEventService(): InteractiveEventService {
  if (!_interactiveEventService) {
    _interactiveEventService = new InteractiveEventService(getDatabase());
  }
  return _interactiveEventService;
}