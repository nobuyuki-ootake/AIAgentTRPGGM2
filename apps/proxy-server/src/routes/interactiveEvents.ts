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
import { getInteractiveEventService } from '../services/interactiveEventService';
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
    consequences: z.object({
      success: z.boolean(),
      score: z.number(),
      description: z.string(),
      consequences: z.array(z.string()),
      nextSteps: z.array(z.string())
    })
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
    consequences: z.object({
      success: z.boolean(),
      score: z.number(),
      description: z.string(),
      consequences: z.array(z.string()),
      nextSteps: z.array(z.string())
    })
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

  const eventSession = await getInteractiveEventService().startEventSession(
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

  const taskDefinition = await getInteractiveEventService().processPlayerChoice(
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

  const difficultySettings = await getInteractiveEventService().evaluatePlayerSolution(
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

  const eventResult = await getInteractiveEventService().executeDiceRoll(
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

  const retryOptions = await getInteractiveEventService().generateRetryOptions(
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
    currentSituation: JSON.stringify(sessionContext),
    playerConstraints: character,
    difficultySettings: { choiceCount }
  });

  const response: APIResponse<EventChoice[]> = {
    success: true,
    data: Array.isArray(choices?.generatedChoices) 
      ? choices.generatedChoices 
      : [
        {
          id: 'default-1',
          text: 'Proceed cautiously',
          requirements: [],
          consequences: {
            success: true,
            score: 50,
            description: 'You proceed carefully',
            consequences: [],
            nextSteps: []
          }
        }
      ],
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
    playerInput: choice?.text || '',
    availableChoices: [choice],
    context: { character, sessionContext }
  });

  const response: APIResponse<AITaskDefinition> = {
    success: true,
    data: {
      id: `task-${Date.now()}`,
      name: taskDefinition?.interpretedChoice?.name || 'Generated Task',
      description: taskDefinition?.interpretedChoice?.description || 'AI interpreted task',
      difficulty: 5,
      requiredSkills: [],
      timeLimit: 30
    },
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
    challengeContext: { character, sessionContext },
    difficultySettings: taskDefinition
  });

  const response: APIResponse<TaskEvaluation> = {
    success: true,
    data: {
      taskId: taskDefinition?.id || `task-${Date.now()}`,
      playerId: character?.id || 'unknown',
      success: evaluation?.solutionEvaluation?.success || false,
      score: evaluation?.solutionEvaluation?.score || 0,
      feedback: evaluation?.solutionEvaluation?.feedback || '',
      improvements: evaluation?.solutionEvaluation?.improvements || []
    },
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
    taskResult: { diceResult, success },
    playerActions: [character?.name || 'Unknown'],
    eventOutcome: { eventSession, sessionContext }
  });

  const response: APIResponse<string> = {
    success: true,
    data: typeof narrative?.generatedNarrative === 'string' 
      ? narrative.generatedNarrative 
      : narrative?.narrativeData || 'Generated narrative',
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
    playerPerformance: taskEvaluation,
    sessionProgress: sessionContext,
    targetBalance: character
  });

  const response: APIResponse<DynamicDifficultySettings> = {
    success: true,
    data: {
      baseLevel: difficultySettings?.adjustmentRecommendations?.baseLevel || 5,
      adaptationRate: difficultySettings?.adjustmentRecommendations?.adaptationRate || 0.1,
      minLevel: difficultySettings?.adjustmentRecommendations?.minLevel || 1,
      maxLevel: difficultySettings?.adjustmentRecommendations?.maxLevel || 10,
      playerSkillMetrics: difficultySettings?.adjustmentRecommendations?.playerSkillMetrics || {}
    },
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