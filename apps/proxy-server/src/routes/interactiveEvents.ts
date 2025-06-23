import { Router } from 'express';
import { z } from 'zod';
import { 
  InteractiveEventSession,
  AITaskDefinition,
  TaskEvaluation,
  DynamicDifficultySettings,
  EventResult,
  RetryOption,
  EventChoice,
  APIResponse
} from '@ai-agent-trpg/types';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { interactiveEventService } from '../services/interactiveEventService';
import { getAIService } from '../services/aiService';
import { logger } from '../utils/logger';

const router = Router();
const aiService = getAIService();

// バリデーションスキーマ
const startEventSessionSchema = z.object({
  sessionId: z.string(),
  eventId: z.string(),
  playerId: z.string(),
  characterId: z.string(),
  choices: z.array(z.object({
    id: z.string(),
    text: z.string(),
    description: z.string(),
    requirements: z.array(z.any()).default([]),
    consequences: z.array(z.any()).default([])
  }))
});

const processChoiceSchema = z.object({
  choiceId: z.string(),
  choice: z.object({
    id: z.string(),
    text: z.string(),
    description: z.string(),
    category: z.string().optional(),
    requirements: z.array(z.any()).default([]),
    consequences: z.array(z.any()).default([])
  }),
  character: z.any(),
  sessionContext: z.any()
});

const evaluateSolutionSchema = z.object({
  taskId: z.string(),
  playerSolution: z.string(),
  character: z.any(),
  sessionContext: z.any()
});

const executeDiceRollSchema = z.object({
  difficultySettings: z.any(),
  diceResult: z.object({
    diceType: z.string(),
    rawRoll: z.number(),
    modifiers: z.number(),
    totalResult: z.number(),
    targetNumber: z.number(),
    success: z.boolean(),
    criticalSuccess: z.boolean().optional(),
    criticalFailure: z.boolean().optional()
  }),
  character: z.any(),
  sessionContext: z.any()
});

/**
 * インタラクティブイベントセッションを開始
 * POST /api/interactive-events/start
 */
router.post('/start', asyncHandler(async (req, res) => {
  const validatedData = startEventSessionSchema.parse(req.body);
  
  logger.info('Starting interactive event session', {
    sessionId: validatedData.sessionId,
    eventId: validatedData.eventId,
    playerId: validatedData.playerId
  });

  const eventSession = await interactiveEventService.startEventSession(
    validatedData.sessionId,
    validatedData.eventId,
    validatedData.playerId,
    validatedData.characterId,
    validatedData.choices
  );

  const response: APIResponse<InteractiveEventSession> = {
    success: true,
    data: eventSession,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * プレイヤーの選択を処理
 * POST /api/interactive-events/:eventSessionId/process-choice
 */
router.post('/:eventSessionId/process-choice', asyncHandler(async (req, res) => {
  const { eventSessionId } = req.params;
  const validatedData = processChoiceSchema.parse(req.body);
  
  logger.info('Processing player choice', {
    eventSessionId,
    choiceId: validatedData.choiceId
  });

  const taskDefinition = await interactiveEventService.processPlayerChoice(
    eventSessionId,
    validatedData.choiceId,
    validatedData.choice,
    validatedData.character,
    validatedData.sessionContext
  );

  const response: APIResponse<AITaskDefinition> = {
    success: true,
    data: taskDefinition,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * プレイヤーの解決方法を評価
 * POST /api/interactive-events/:eventSessionId/evaluate-solution
 */
router.post('/:eventSessionId/evaluate-solution', asyncHandler(async (req, res) => {
  const { eventSessionId } = req.params;
  const validatedData = evaluateSolutionSchema.parse(req.body);
  
  logger.info('Evaluating player solution', {
    eventSessionId,
    taskId: validatedData.taskId
  });

  const difficultySettings = await interactiveEventService.evaluatePlayerSolution(
    eventSessionId,
    validatedData.taskId,
    validatedData.playerSolution,
    validatedData.character,
    validatedData.sessionContext
  );

  const response: APIResponse<DynamicDifficultySettings> = {
    success: true,
    data: difficultySettings,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * ダイス判定を実行し結果を処理
 * POST /api/interactive-events/:eventSessionId/execute-dice-roll
 */
router.post('/:eventSessionId/execute-dice-roll', asyncHandler(async (req, res) => {
  const { eventSessionId } = req.params;
  const validatedData = executeDiceRollSchema.parse(req.body);
  
  logger.info('Executing dice roll', {
    eventSessionId,
    diceTotal: validatedData.diceResult.totalResult,
    targetNumber: validatedData.diceResult.targetNumber
  });

  const eventResult = await interactiveEventService.executeDiceRoll(
    eventSessionId,
    validatedData.difficultySettings,
    validatedData.diceResult,
    validatedData.character,
    validatedData.sessionContext
  );

  const response: APIResponse<EventResult> = {
    success: true,
    data: eventResult,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * イベントセッション情報を取得
 * GET /api/interactive-events/:eventSessionId
 */
router.get('/:eventSessionId', asyncHandler(async (req, res) => {
  const { eventSessionId } = req.params;
  
  // TODO: getEventSession メソッドを public にする必要がある
  // 現在は private のため、ここでは仮の実装
  const eventSession = {
    id: eventSessionId,
    message: 'Event session data retrieval not fully implemented yet'
  };

  const response: APIResponse<any> = {
    success: true,
    data: eventSession,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * リトライオプションを取得
 * GET /api/interactive-events/:eventSessionId/retry-options
 */
router.get('/:eventSessionId/retry-options', asyncHandler(async (req, res) => {
  const { eventSessionId } = req.params;
  const { characterId } = req.query;
  
  if (!characterId || typeof characterId !== 'string') {
    throw new ValidationError('Character ID is required');
  }

  logger.info('Generating retry options', {
    eventSessionId,
    characterId
  });

  // TODO: キャラクター情報を取得する実装が必要
  const mockCharacter = {
    id: characterId,
    skills: {
      persuasion: 16,
      investigation: 14
    }
  };

  const retryOptions = await interactiveEventService.generateRetryOptions(
    eventSessionId,
    mockCharacter as any
  );

  const response: APIResponse<RetryOption[]> = {
    success: true,
    data: retryOptions,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * イベント選択肢を動的生成
 * POST /api/interactive-events/generate-choices
 */
router.post('/generate-choices', asyncHandler(async (req, res) => {
  const {
    provider = 'openai',
    eventContext,
    character,
    sessionContext,
    choiceCount = 3
  } = req.body;

  logger.info('Generating event choices', {
    provider,
    choiceCount
  });

  const choices = await aiService.generateEventChoices({
    provider,
    eventContext,
    character,
    sessionContext,
    choiceCount
  });

  const response: APIResponse<EventChoice[]> = {
    success: true,
    data: choices,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 選択肢を解釈してタスクを生成
 * POST /api/interactive-events/interpret-choice
 */
router.post('/interpret-choice', asyncHandler(async (req, res) => {
  const {
    provider = 'openai',
    choice,
    character,
    sessionContext
  } = req.body;

  logger.info('Interpreting player choice', {
    provider,
    choiceId: choice?.id
  });

  const taskDefinition = await aiService.interpretPlayerChoice({
    provider,
    choice,
    character,
    sessionContext
  });

  const response: APIResponse<AITaskDefinition> = {
    success: true,
    data: taskDefinition,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * プレイヤーソリューションを評価
 * POST /api/interactive-events/evaluate-solution
 */
router.post('/evaluate-solution', asyncHandler(async (req, res) => {
  const {
    provider = 'openai',
    playerSolution,
    character,
    sessionContext,
    taskDefinition
  } = req.body;

  logger.info('Evaluating player solution', {
    provider,
    solutionLength: playerSolution?.length
  });

  const evaluation = await aiService.evaluatePlayerSolution({
    provider,
    playerSolution,
    character,
    sessionContext,
    taskDefinition
  });

  const response: APIResponse<TaskEvaluation> = {
    success: true,
    data: evaluation,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 結果ナラティブを生成
 * POST /api/interactive-events/generate-narrative
 */
router.post('/generate-narrative', asyncHandler(async (req, res) => {
  const {
    provider = 'openai',
    eventSession,
    character,
    sessionContext,
    diceResult,
    success
  } = req.body;

  logger.info('Generating result narrative', {
    provider,
    success
  });

  const narrative = await aiService.generateResultNarrative({
    provider,
    eventSession,
    character,
    sessionContext,
    diceResult,
    success
  });

  const response: APIResponse<string> = {
    success: true,
    data: narrative,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 動的難易度を計算
 * POST /api/interactive-events/calculate-difficulty
 */
router.post('/calculate-difficulty', asyncHandler(async (req, res) => {
  const {
    provider = 'openai',
    taskEvaluation,
    character,
    sessionContext
  } = req.body;

  logger.info('Calculating dynamic difficulty', {
    provider
  });

  const difficultySettings = await aiService.calculateDynamicDifficulty({
    provider,
    taskEvaluation,
    character,
    sessionContext
  });

  const response: APIResponse<DynamicDifficultySettings> = {
    success: true,
    data: difficultySettings,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * ペナルティ効果を適用
 * POST /api/interactive-events/:eventSessionId/apply-penalties
 */
router.post('/:eventSessionId/apply-penalties', asyncHandler(async (req, res) => {
  const { eventSessionId } = req.params;
  const { characterId, penalties } = req.body;

  logger.info('Applying penalties', {
    eventSessionId,
    characterId,
    penaltyCount: penalties?.length
  });

  // TODO: ペナルティ適用の実装
  // 現在は仮の実装
  const data = {
    eventSessionId,
    characterId,
    appliedPenalties: penalties
  };

  const response: APIResponse<any> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * イベントセッションの履歴を取得
 * GET /api/interactive-events/:eventSessionId/history
 */
router.get('/:eventSessionId/history', asyncHandler(async (req, res) => {
  const { eventSessionId } = req.params;

  logger.info('Retrieving event session history', {
    eventSessionId
  });

  // TODO: イベント履歴取得の実装
  const data = {
    eventSessionId,
    timeline: [],
    message: 'Event history retrieval not fully implemented yet'
  };

  const response: APIResponse<any> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

export { router as interactiveEventsRouter };