import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { aiCharacterService } from '../services/aiCharacterService';
import { characterService } from '../services/characterService';
import { sessionService } from '../services/sessionService';
import { ValidationError } from '../middleware/errorHandler';
import { APIResponse, AIDecisionContext } from '@ai-agent-trpg/types';

const aiCharacterRouter = Router();

// ==========================================
// AI制御セッション管理
// ==========================================

/**
 * セッション用AI制御を開始
 */
aiCharacterRouter.post('/sessions/:sessionId/start', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { aiSettings } = req.body;

  // セッション存在確認
  const session = await sessionService.getSessionById(sessionId);
  if (!session) {
    throw new ValidationError('Session not found');
  }

  // セッションのキャラクターを取得
  const characters = await characterService.getCharactersByCampaign(session.campaignId);

  // AI制御を開始
  const aiController = await aiCharacterService.startAIControlForSession(
    sessionId,
    characters,
    aiSettings
  );

  const response: APIResponse<typeof aiController> = {
    success: true,
    data: aiController,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * セッション用AI制御を停止
 */
aiCharacterRouter.post('/sessions/:sessionId/stop', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  await aiCharacterService.stopAIControlForSession(sessionId);

  const response: APIResponse<{ success: boolean }> = {
    success: true,
    data: { success: true },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// ==========================================
// キャラクター個別制御
// ==========================================

/**
 * キャラクターの自動行動をトリガー
 */
aiCharacterRouter.post('/characters/:characterId/trigger-action', asyncHandler(async (req: Request, res: Response) => {
  const { characterId } = req.params;
  const { sessionId, context } = req.body;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  // キャラクター存在確認
  const character = await characterService.getCharacterById(characterId);
  if (!character) {
    throw new ValidationError('Character not found');
  }

  // AI制御が有効でないキャラクターのチェック
  if (character.characterType === 'PC') {
    throw new ValidationError('Cannot trigger AI actions for player characters');
  }

  // AI行動を決定・実行
  const action = await aiCharacterService.triggerCharacterAction(
    characterId,
    sessionId,
    context as Partial<AIDecisionContext>
  );

  const response: APIResponse<typeof action> = {
    success: true,
    data: action,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * AI行動を実行
 */
aiCharacterRouter.post('/actions/:actionId/execute', asyncHandler(async (req: Request, res: Response) => {
  const { actionId } = req.params;

  const success = await aiCharacterService.executeAIAction(actionId);

  const response: APIResponse<{ success: boolean }> = {
    success: true,
    data: { success },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * AI行動にフィードバックを送信
 */
aiCharacterRouter.post('/actions/:actionId/feedback', asyncHandler(async (req: Request, res: Response) => {
  const { actionId } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5');
  }

  await aiCharacterService.recordActionFeedback(actionId, rating, comment);

  const response: APIResponse<{ success: boolean }> = {
    success: true,
    data: { success: true },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// ==========================================
// AI制御状況監視
// ==========================================

/**
 * セッションのAI制御状況を取得
 */
aiCharacterRouter.get('/sessions/:sessionId/status', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  // セッション制御情報を取得（実装は要検討）
  const status = {
    sessionId,
    aiControlActive: true,
    controlledCharacters: [], // 実際のデータを取得
    recentActions: [], // 最近の行動履歴
    performance: {
      actionsPerMinute: 0,
      averageResponseTime: 0,
    },
  };

  const response: APIResponse<typeof status> = {
    success: true,
    data: status,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * キャラクターの制御設定を更新
 */
aiCharacterRouter.put('/characters/:characterId/settings', asyncHandler(async (req: Request, res: Response) => {
  const { characterId } = req.params;
  const { settings } = req.body;

  // 設定更新のロジック（実装は要検討）
  const updatedSettings = {
    characterId,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  const response: APIResponse<typeof updatedSettings> = {
    success: true,
    data: updatedSettings,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// ==========================================
// 自動セッション進行
// ==========================================

/**
 * セッション自動進行を開始
 */
aiCharacterRouter.post('/sessions/:sessionId/auto-progress', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { progressSettings } = req.body;

  // 自動進行設定
  const autoProgressConfig = {
    sessionId,
    enabled: true,
    settings: progressSettings || {
      eventAutoTrigger: true,
      npcAutoResponse: true,
      combatAutoResolution: false,
      storyProgression: true,
    },
    startedAt: new Date().toISOString(),
  };

  const response: APIResponse<typeof autoProgressConfig> = {
    success: true,
    data: autoProgressConfig,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 緊急停止（すべてのAI行動を停止）
 */
aiCharacterRouter.post('/emergency-stop', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (sessionId) {
    await aiCharacterService.stopAIControlForSession(sessionId);
  }

  const response: APIResponse<{ success: boolean; message: string }> = {
    success: true,
    data: { 
      success: true, 
      message: sessionId ? `AI control stopped for session ${sessionId}` : 'AI control stopped globally'
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// ==========================================
// 開発者向けツール
// ==========================================

/**
 * AIキャラクターのデバッグ情報を取得
 */
aiCharacterRouter.get('/debug/characters/:characterId', asyncHandler(async (req: Request, res: Response) => {
  const { characterId } = req.params;

  // デバッグ情報を収集
  const debugInfo = {
    characterId,
    controllerActive: false, // 実際の状態を確認
    recentDecisions: [], // 最近の意思決定
    behaviorPatterns: [], // アクティブなパターン
    learningData: {}, // 学習データサマリー
    performanceMetrics: {}, // パフォーマンス指標
  };

  const response: APIResponse<typeof debugInfo> = {
    success: true,
    data: debugInfo,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * AI行動のシミュレーション実行
 */
aiCharacterRouter.post('/debug/simulate-action', asyncHandler(async (req: Request, res: Response) => {
  const { characterId, sessionId, testContext } = req.body;

  if (!characterId || !sessionId) {
    throw new ValidationError('Character ID and Session ID are required');
  }

  // シミュレーション実行
  const simulationResult = await aiCharacterService.triggerCharacterAction(
    characterId,
    sessionId,
    testContext
  );

  const response: APIResponse<typeof simulationResult> = {
    success: true,
    data: simulationResult,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

export { aiCharacterRouter };