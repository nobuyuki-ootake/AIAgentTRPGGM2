import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { 
  InteractiveEventSession,
  EventMetadata,
  AITaskDefinition,
  TaskEvaluation,
  DynamicDifficultySettings,
  EventResult,
  PenaltyEffect,
  RetryOption,
  EventAIRequest,
  EventAIResponse,
  InteractiveEventState,
  EventStep,
  Character,
  SessionContext,
  EventChoice,
  DiceRollResult,
  ID
} from '@ai-agent-trpg/types';
import { getAIService } from './aiService';

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
      eventId,
      playerId,
      characterId,
      state: 'waiting_for_choice',
      currentStep: 'choice_selection',
      timeline: [],
      metadata,
      createdAt: now,
      updatedAt: now
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
      eventSession.state,
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
      }, taskDefinition.interpretation, undefined, undefined, undefined, Date.now() - startTime);

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

    // タスク定義にプレイヤーの解決方法を追加
    taskDefinition.playerSolution = playerSolution;

    const aiRequest: EventAIRequest = {
      type: 'difficulty_calculation',
      eventSession,
      playerInput: playerSolution,
      character,
      sessionContext
    };

    try {
      // AIによる評価と難易度計算
      const aiResponse = await this.callAIForEventProcessing(aiRequest);
      const evaluation = aiResponse.response as TaskEvaluation;

      // タスク定義を更新
      taskDefinition.aiEvaluation = evaluation;
      await this.updateTaskDefinition(taskId, taskDefinition);

      // 難易度設定を生成
      const difficultySettings = await this.generateDifficultySettings(evaluation, character);

      // ステップを記録
      await this.recordEventStep(eventSessionId, 'difficulty_calculation', {
        playerSolution,
        evaluation,
        difficultySettings
      }, evaluation.reasoning, playerSolution, undefined, undefined, Date.now() - startTime);

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
      const success = diceResult.totalResult >= difficultySettings.baseTargetNumber;
      const criticalType = this.determineCriticalType(diceResult, difficultySettings);

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
        finalScore: diceResult.totalResult,
        targetNumber: difficultySettings.baseTargetNumber,
        diceResult,
        criticalType,
        narrative,
        rewards: success ? await this.generateRewards(eventSession, character) : undefined,
        penalties: !success ? await this.generatePenalties(eventSession, diceResult, difficultySettings) : undefined,
        storyConsequences: [],
        relationshipChanges: {},
        experienceGained: success ? this.calculateExperience(difficultySettings) : 0
      };

      // ペナルティを適用（失敗時）
      if (!success && eventResult.penalties) {
        await this.applyPenalties(eventSessionId, character.id, eventResult.penalties);
      }

      // ステップを記録
      await this.recordEventStep(eventSessionId, 'result_processing', {
        eventResult,
        difficultySettings
      }, narrative, undefined, diceResult, eventResult.penalties, Date.now() - startTime);

      // セッション完了または再試行状態に更新
      if (success || eventSession.metadata.currentAttempt >= eventSession.metadata.maxAttempts) {
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

    const remainingAttempts = eventSession.metadata.maxAttempts - eventSession.metadata.currentAttempt;
    
    const retryOptions: RetryOption[] = [
      {
        id: uuidv4(),
        description: '同じ方法で再挑戦する',
        penaltyReduction: 0,
        costModifier: 1.0,
        availableAttempts: remainingAttempts,
        requirements: []
      }
    ];

    // キャラクターのスキルに基づく追加オプション
    const persuasionSkill = character.skills?.find(skill => skill.name === 'persuasion' || skill.name === '説得');
    if (persuasionSkill && persuasionSkill.level > 15) {
      retryOptions.push({
        id: uuidv4(),
        description: '異なるアプローチで説得を試みる',
        penaltyReduction: 25,
        costModifier: 0.8,
        availableAttempts: remainingAttempts,
        requirements: ['説得スキル15以上']
      });
    }

    const investigationSkill = character.skills?.find(skill => skill.name === 'investigation' || skill.name === '調査');
    if (investigationSkill && investigationSkill.level > 12) {
      retryOptions.push({
        id: uuidv4(),
        description: '状況をより詳しく調査してから再試行',
        penaltyReduction: 15,
        costModifier: 1.2,
        availableAttempts: remainingAttempts,
        requirements: ['調査スキル12以上']
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
          response = await getAIService().interpretPlayerChoice({
            provider: 'openai', // TODO: プロバイダー選択ロジック
            choice: request.choice!,
            character: request.character,
            sessionContext: request.sessionContext
          });
          break;

        case 'task_generation':
          response = await getAIService().generateTaskFromChoice({
            provider: 'openai',
            choice: request.choice!,
            character: request.character,
            sessionContext: request.sessionContext
          });
          break;

        case 'difficulty_calculation':
          response = await getAIService().evaluatePlayerSolution({
            provider: 'openai',
            playerSolution: request.playerInput!,
            character: request.character,
            sessionContext: request.sessionContext
          });
          break;

        case 'result_narration':
          response = await getAIService().generateResultNarrative({
            provider: 'openai',
            eventSession: request.eventSession,
            character: request.character,
            sessionContext: request.sessionContext
          });
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
      eventId: row.event_id,
      playerId: row.player_id,
      characterId: row.character_id,
      state: row.state,
      currentStep: row.current_step,
      timeline: [], // TODO: タイムライン取得の実装
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at
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
      task.choiceId,
      task.interpretation,
      task.objective,
      JSON.stringify(task.approach),
      JSON.stringify(task.constraints),
      JSON.stringify(task.successCriteria),
      task.estimatedDifficulty
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
      choiceId: row.choice_id,
      interpretation: row.interpretation,
      objective: row.objective,
      approach: JSON.parse(row.approach),
      constraints: JSON.parse(row.constraints),
      successCriteria: JSON.parse(row.success_criteria),
      estimatedDifficulty: row.estimated_difficulty,
      playerSolution: row.player_solution,
      aiEvaluation: row.ai_evaluation ? JSON.parse(row.ai_evaluation) : undefined
    };
  }

  private async updateTaskDefinition(taskId: ID, task: AITaskDefinition): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE ai_task_definitions 
      SET player_solution = ?, ai_evaluation = ?
      WHERE id = ?
    `);

    stmt.run(
      task.playerSolution || null,
      task.aiEvaluation ? JSON.stringify(task.aiEvaluation) : null,
      taskId
    );
  }

  private async generateDifficultySettings(
    evaluation: TaskEvaluation,
    _character: Character
  ): Promise<DynamicDifficultySettings> {
    // 難易度レベルに基づく基本目標値
    const baseDifficulty = {
      'trivial': 5,
      'easy': 10,
      'medium': 15,
      'hard': 20,
      'extreme': 25
    };

    const baseTargetNumber = baseDifficulty[evaluation.finalDifficulty];

    return {
      baseTargetNumber,
      modifiers: evaluation.modifiers,
      rollType: 'd20',
      criticalSuccess: 20,
      criticalFailure: 1,
      retryPenalty: 2,
      maxRetries: 3
    };
  }

  private determineCriticalType(
    diceResult: DiceRollResult,
    settings: DynamicDifficultySettings
  ): 'success' | 'failure' | undefined {
    if (diceResult.rawRoll === settings.criticalSuccess) {
      return 'success';
    }
    if (diceResult.rawRoll === settings.criticalFailure) {
      return 'failure';
    }
    return undefined;
  }

  private async generateRewards(
    _eventSession: InteractiveEventSession,
    _character: Character
  ): Promise<any[]> {
    // TODO: 報酬生成ロジックの実装
    return [];
  }

  private async generatePenalties(
    _eventSession: InteractiveEventSession,
    diceResult: DiceRollResult,
    settings: DynamicDifficultySettings
  ): Promise<PenaltyEffect[]> {
    const penalties: PenaltyEffect[] = [];

    // 基本的なペナルティ
    if (diceResult.rawRoll === settings.criticalFailure) {
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
        penalty.duration || null,
        penalty.reversible,
        penalty.severity,
        penalty.appliedAt,
        penalty.source
      );
    }
  }

  private calculateExperience(settings: DynamicDifficultySettings): number {
    // 難易度に基づく経験値計算
    const baseExp = {
      5: 10,   // trivial
      10: 25,  // easy
      15: 50,  // medium
      20: 100, // hard
      25: 200  // extreme
    };

    return (baseExp as any)[settings.baseTargetNumber] || 25;
  }
}

// サービスのインスタンスをエクスポート
export const interactiveEventService = new InteractiveEventService(
  // TODO: データベース接続の設定
  new Database(':memory:')
);