import { Router, Request, Response } from 'express';
import { getAIGameMasterService, SessionContext } from '../services/aiGameMasterService';
import { asyncHandler, ValidationError, AIServiceError } from '../middleware/errorHandler';
import { ID, SessionDurationConfig, Character } from '@ai-agent-trpg/types';

const router = Router();

/**
 * @route POST /api/ai-game-master/event-introduction
 * @desc イベント開始時の導入シーンを生成
 */
router.post('/event-introduction', asyncHandler(async (req: Request, res: Response) => {
  const {
    sessionId,
    campaignId,
    eventType,
    context,
    provider = 'google',
    model,
    customPrompt
  } = req.body;

  if (!sessionId || !campaignId || !eventType || !context || !provider) {
    throw new ValidationError('Session ID, campaign ID, event type, context, and provider are required');
  }

  try {
    const eventIntroduction = await getAIGameMasterService().generateEventIntroduction(
      sessionId,
      campaignId,
      eventType,
      context,
      { provider, model },
      customPrompt
    );

    res.json({
      success: true,
      data: { content: eventIntroduction },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating event introduction:', error);
    
    if (error instanceof Error && error.message.includes('AI')) {
      throw new AIServiceError(
        'Failed to generate event introduction using AI',
        provider,
        { originalError: error.message }
      );
    }
    
    throw new Error('Failed to generate event introduction');
  }
}));

/**
 * @route POST /api/ai-game-master/game-overview
 * @desc セッション開始時のゲーム概要を生成
 */
router.post('/game-overview', asyncHandler(async (req: Request, res: Response) => {
  const {
    sessionId,
    campaignId,
    context,
    provider = 'google',
    model
  } = req.body;

  if (!sessionId || !campaignId || !context || !provider) {
    throw new ValidationError('Session ID, campaign ID, context, and provider are required');
  }

  try {
    const overview = await getAIGameMasterService().generateGameOverview(
      sessionId,
      campaignId,
      context as SessionContext,
      { provider, model }
    );

    res.json({
      success: true,
      data: overview,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating game overview:', error);
    
    if (error instanceof Error && error.message.includes('AI')) {
      throw new AIServiceError(
        'Failed to generate game overview using AI',
        provider,
        { originalError: error.message }
      );
    }
    
    throw new Error('Failed to generate game overview');
  }
}));

/**
 * @route POST /api/ai-game-master/task-explanation
 * @desc タスク内容の詳細説明を生成
 */
router.post('/task-explanation', asyncHandler(async (req: Request, res: Response) => {
  const {
    sessionId,
    taskContext,
    sessionContext,
    provider,
    apiKey,
    model
  } = req.body;

  if (!sessionId || !taskContext || !sessionContext || !provider || !apiKey) {
    throw new ValidationError('Session ID, task context, session context, provider, and API key are required');
  }

  if (!taskContext.taskTitle) {
    throw new ValidationError('Task title is required in task context');
  }

  try {
    const explanation = await getAIGameMasterService().generateTaskExplanation(
      sessionId,
      taskContext,
      sessionContext as SessionContext,
      { provider, apiKey, model }
    );

    res.json({
      success: true,
      data: explanation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating task explanation:', error);
    
    if (error instanceof Error && error.message.includes('AI')) {
      throw new AIServiceError(
        'Failed to generate task explanation using AI',
        provider,
        { originalError: error.message }
      );
    }
    
    throw new Error('Failed to generate task explanation');
  }
}));

/**
 * @route POST /api/ai-game-master/result-judgment
 * @desc 行動結果の判定とフィードバックを生成
 */
router.post('/result-judgment', asyncHandler(async (req: Request, res: Response) => {
  const {
    sessionId,
    characterId,
    actionDescription,
    checkResult,
    sessionContext,
    provider,
    apiKey,
    model
  } = req.body;

  if (!sessionId || !characterId || !actionDescription || !checkResult || !sessionContext || !provider || !apiKey) {
    throw new ValidationError('All required fields must be provided');
  }

  try {
    const judgment = await getAIGameMasterService().generateResultJudgment(
      sessionId,
      characterId,
      actionDescription,
      checkResult,
      sessionContext as SessionContext,
      { provider, apiKey, model }
    );

    res.json({
      success: true,
      data: judgment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating result judgment:', error);
    
    if (error instanceof Error && error.message.includes('AI')) {
      throw new AIServiceError(
        'Failed to generate result judgment using AI',
        provider,
        { originalError: error.message }
      );
    }
    
    throw new Error('Failed to generate result judgment');
  }
}));

/**
 * @route POST /api/ai-game-master/scenario-adjustment
 * @desc 動的シナリオ調整を生成
 */
router.post('/scenario-adjustment', asyncHandler(async (req: Request, res: Response) => {
  const {
    sessionId,
    trigger,
    triggerContext,
    sessionContext,
    provider,
    apiKey,
    model
  } = req.body;

  if (!sessionId || !trigger || !triggerContext || !sessionContext || !provider || !apiKey) {
    throw new ValidationError('All required fields must be provided');
  }

  const validTriggers = ['player_success', 'player_failure', 'unexpected_action', 'pacing_issue', 'story_balance'];
  if (!validTriggers.includes(trigger)) {
    throw new ValidationError(`Invalid trigger. Must be one of: ${validTriggers.join(', ')}`);
  }

  try {
    const adjustment = await getAIGameMasterService().generateScenarioAdjustment(
      sessionId,
      trigger,
      triggerContext,
      sessionContext as SessionContext,
      { provider, apiKey, model }
    );

    res.json({
      success: true,
      data: adjustment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating scenario adjustment:', error);
    
    if (error instanceof Error && error.message.includes('AI')) {
      throw new AIServiceError(
        'Failed to generate scenario adjustment using AI',
        provider,
        { originalError: error.message }
      );
    }
    
    throw new Error('Failed to generate scenario adjustment');
  }
}));

/**
 * @route GET /api/ai-game-master/game-overview/:sessionId
 * @desc セッションの最新ゲーム概要を取得
 */
router.get('/game-overview/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  try {
    const overview = await getAIGameMasterService().getGameOverview(sessionId);

    if (!overview) {
      return res.status(404).json({
        success: false,
        error: 'Game overview not found',
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: overview,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching game overview:', error);
    throw new Error('Failed to fetch game overview');
  }
}));

/**
 * @route GET /api/ai-game-master/task-explanation/:sessionId
 * @desc セッションの最新タスク説明を取得
 */
router.get('/task-explanation/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { taskId } = req.query;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  try {
    const explanation = await getAIGameMasterService().getTaskExplanation(
      sessionId,
      taskId as ID
    );

    res.json({
      success: true,
      data: explanation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching task explanation:', error);
    throw new Error('Failed to fetch task explanation');
  }
}));

/**
 * @route GET /api/ai-game-master/result-judgments/:sessionId
 * @desc セッションの最近の結果判定を取得
 */
router.get('/result-judgments/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { limit } = req.query;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  try {
    const judgments = await getAIGameMasterService().getRecentResultJudgments(
      sessionId,
      limit ? parseInt(limit as string) : 5
    );

    res.json({
      success: true,
      data: judgments,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching result judgments:', error);
    throw new Error('Failed to fetch result judgments');
  }
}));

/**
 * @route GET /api/ai-game-master/scenario-adjustments/:sessionId
 * @desc セッションの最近のシナリオ調整を取得
 */
router.get('/scenario-adjustments/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { limit } = req.query;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  try {
    const adjustments = await getAIGameMasterService().getRecentScenarioAdjustments(
      sessionId,
      limit ? parseInt(limit as string) : 3
    );

    res.json({
      success: true,
      data: adjustments,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching scenario adjustments:', error);
    throw new Error('Failed to fetch scenario adjustments');
  }
}));

/**
 * @route POST /api/ai-game-master/batch-generate
 * @desc 複数のAI生成を一度に実行
 */
router.post('/batch-generate', asyncHandler(async (req: Request, res: Response) => {
  const {
    sessionId,
    campaignId,
    requests,
    sessionContext,
    provider,
    apiKey,
    model
  } = req.body;

  if (!sessionId || !campaignId || !requests || !Array.isArray(requests) || !sessionContext || !provider || !apiKey) {
    throw new ValidationError('All required fields must be provided');
  }

  if (requests.length > 3) {
    throw new ValidationError('Maximum 3 requests can be processed at once');
  }

  try {
    const results = [];

    for (const request of requests) {
      try {
        let result;
        
        switch (request.type) {
          case 'game-overview':
            result = await getAIGameMasterService().generateGameOverview(
              sessionId,
              campaignId,
              sessionContext,
              { provider, model }
            );
            break;
            
          case 'task-explanation':
            result = await getAIGameMasterService().generateTaskExplanation(
              sessionId,
              request.taskContext,
              sessionContext,
              { provider, apiKey, model }
            );
            break;
            
          case 'scenario-adjustment':
            result = await getAIGameMasterService().generateScenarioAdjustment(
              sessionId,
              request.trigger,
              request.triggerContext,
              sessionContext,
              { provider, apiKey, model }
            );
            break;
            
          default:
            throw new Error(`Unsupported request type: ${request.type}`);
        }
        
        results.push({
          type: request.type,
          success: true,
          data: result,
        });
      } catch (error) {
        results.push({
          type: request.type,
          success: false,
          error: error instanceof Error ? error.message : 'Generation failed',
        });
      }
    }

    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in batch generation:', error);
    throw new Error('Failed to perform batch generation');
  }
}));

/**
 * @route POST /api/ai-game-master/player-action-response
 * @desc プレイヤーアクションに対するAI応答を生成してチャットに投稿
 */
router.post('/player-action-response', asyncHandler(async (req: Request, res: Response) => {
  const {
    sessionId,
    playerCharacterId,
    playerAction,
    sessionContext,
    provider = 'google',
    model
  } = req.body;

  if (!sessionId || !playerCharacterId || !playerAction || !sessionContext || !provider) {
    throw new ValidationError('Session ID, player character ID, player action, session context, and provider are required');
  }

  try {
    await getAIGameMasterService().generatePlayerActionResponse(
      sessionId,
      playerCharacterId,
      playerAction,
      sessionContext as SessionContext,
      { provider, model }
    );

    res.json({
      success: true,
      message: 'AI response generated and posted to chat',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating player action response:', error);
    
    if (error instanceof Error && error.message.includes('AI')) {
      throw new AIServiceError(
        'Failed to generate player action response using AI',
        provider,
        { originalError: error.message }
      );
    }
    
    throw new Error('Failed to generate player action response');
  }
}));

/**
 * @route GET /api/ai-game-master/session-summary/:sessionId
 * @desc セッションの包括的なサマリーを取得
 */
router.get('/session-summary/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  try {
    const [
      overview,
      taskExplanation,
      recentJudgments,
      recentAdjustments
    ] = await Promise.all([
      getAIGameMasterService().getGameOverview(sessionId),
      getAIGameMasterService().getTaskExplanation(sessionId),
      getAIGameMasterService().getRecentResultJudgments(sessionId, 3),
      getAIGameMasterService().getRecentScenarioAdjustments(sessionId, 2)
    ]);

    const summary = {
      overview,
      currentTask: taskExplanation,
      recentResults: recentJudgments,
      recentAdjustments,
      sessionStats: {
        totalJudgments: recentJudgments.length,
        totalAdjustments: recentAdjustments.length,
        hasOverview: !!overview,
        hasCurrentTask: !!taskExplanation,
      }
    };

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching session summary:', error);
    throw new Error('Failed to fetch session summary');
  }
}));

/**
 * @route POST /api/ai-game-master/initialize-session
 * @desc セッション開始時のマイルストーン・エンティティプール自動生成（進捗通知対応）
 */
router.post('/initialize-session', asyncHandler(async (req: Request, res: Response) => {
  const {
    sessionId,
    campaignId,
    durationConfig,
    characters,
    campaignTheme = 'クラシックファンタジー',
    provider = 'google',
    model
  } = req.body;

  if (!sessionId || !campaignId || !durationConfig || !characters) {
    throw new ValidationError('Session ID, campaign ID, duration config, and characters are required');
  }

  // バリデーション
  if (!Array.isArray(characters) || characters.length === 0) {
    throw new ValidationError('At least one character is required');
  }

  // デバッグ: 受信したdurationConfigの内容を確認
  console.log('🔍 Received durationConfig:', JSON.stringify(durationConfig, null, 2));
  console.log('🔍 durationConfig validation:', {
    hasTotalDays: !!durationConfig.totalDays,
    hasActionsPerDay: !!durationConfig.actionsPerDay,
    hasMilestoneCount: !!durationConfig.milestoneCount,
    totalDays: durationConfig.totalDays,
    actionsPerDay: durationConfig.actionsPerDay,
    milestoneCount: durationConfig.milestoneCount
  });

  if (!durationConfig.totalDays || !durationConfig.actionsPerDay || !durationConfig.milestoneCount) {
    throw new ValidationError('Duration config must include totalDays, actionsPerDay, and milestoneCount');
  }

  try {
    console.log(`🎯 セッション初期化開始 - Session: ${sessionId}, Theme: ${campaignTheme}`);

    // 進捗通知コールバック関数
    const onProgressUpdate = (phase: 'scenario' | 'milestone' | 'entity', progress: number, currentTask: string) => {
      // WebSocketでフロントエンドに進捗を通知
      if (req.app.get('io')) {
        req.app.get('io').emit('session-initialization-progress', {
          sessionId,
          currentPhase: phase,
          overallProgress: Math.round((
            (phase === 'scenario' ? progress / 3 : 0) +
            (phase === 'milestone' ? (33 + progress) / 3 : phase === 'entity' ? 33 : 0) +
            (phase === 'entity' ? 66 + progress / 3 : 0)
          )),
          phases: {
            [phase]: {
              phase,
              progress,
              status: progress === 100 ? 'completed' : 'in_progress',
              currentTask,
              estimatedTimeRemaining: Math.max(0, (100 - progress) * 3),
            }
          }
        });
      }
    };

    const result = await getAIGameMasterService().initializeSessionWithAI(
      sessionId,
      campaignId,
      durationConfig as SessionDurationConfig,
      characters as Character[],
      campaignTheme,
      { provider, model },
      onProgressUpdate
    );

    // 完了通知
    if (req.app.get('io')) {
      req.app.get('io').emit('session-initialization-complete', {
        sessionId,
        result: {
          milestones: result.milestones,
          entityPool: result.entityPool,
          gameOverview: result.gameOverview,
          message: result.message
        }
      });
    }

    res.json({
      success: result.success,
      data: {
        milestones: result.milestones,
        entityPool: result.entityPool,
        gameOverview: result.gameOverview,
        message: result.message
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ セッション初期化完了 - ${result.milestones.length}マイルストーン生成`);

  } catch (error) {
    console.error('❌ セッション初期化エラー:', error);
    
    // エラー通知
    if (req.app.get('io')) {
      req.app.get('io').emit('session-initialization-error', {
        sessionId,
        error: error instanceof Error ? error.message : 'セッション初期化中にエラーが発生しました'
      });
    }
    
    if (error instanceof Error && error.message.includes('AI')) {
      throw new AIServiceError(
        'Failed to initialize session using AI',
        provider,
        { originalError: error.message }
      );
    }
    
    throw new Error('Failed to initialize session');
  }
}));

export { router as aiGameMasterRouter };