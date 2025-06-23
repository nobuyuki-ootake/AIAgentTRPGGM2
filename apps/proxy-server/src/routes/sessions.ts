import { Router } from 'express';
import { SessionState, APIResponse, SessionDurationConfig } from '@ai-agent-trpg/types';
import { getSessionService } from '../services/sessionService';
import { getTimeManagementService } from '../services/timeManagementService';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';

export const sessionRouter = Router();

// セッション一覧取得（キャンペーン別）
sessionRouter.get('/', asyncHandler(async (req, res) => {
  const campaignId = req.query.campaignId as string;

  if (!campaignId) {
    throw new ValidationError('Campaign ID is required');
  }

  const sessions = await getSessionService().getSessionsByCampaign(campaignId);

  const response: APIResponse<SessionState[]> = {
    success: true,
    data: sessions,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// セッション詳細取得
sessionRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await getSessionService().getSessionById(id);

  if (!session) {
    throw new NotFoundError('Session', id);
  }

  const response: APIResponse<SessionState> = {
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// セッション作成
sessionRouter.post('/', asyncHandler(async (req, res) => {
  const sessionData = req.body;

  if (!sessionData.campaignId) {
    throw new ValidationError('Campaign ID is required');
  }

  const session = await getSessionService().createSession(sessionData);

  const response: APIResponse<SessionState> = {
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
}));

// セッション状態更新
sessionRouter.patch('/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, timeConfig } = req.body;

  if (!status) {
    throw new ValidationError('Status is required');
  }

  const session = await getSessionService().updateSessionStatus(id, status);

  if (!session) {
    throw new NotFoundError('Session', id);
  }

  // セッション開始時に時間管理システムを初期化
  if (status === 'active' && timeConfig) {
    try {
      await getTimeManagementService().initializeTurnState(
        session.id,
        session.campaignId,
        timeConfig as SessionDurationConfig
      );
      console.log('時間管理システムを初期化しました:', timeConfig);
    } catch (error) {
      console.error('時間管理システムの初期化に失敗しました:', error);
      // エラーが発生してもセッション開始は継続
    }
  }

  const response: APIResponse<SessionState> = {
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// チャットメッセージ追加
sessionRouter.post('/:id/chat', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const messageData = req.body;

  if (!messageData.speaker || !messageData.message) {
    throw new ValidationError('Speaker and message are required');
  }

  const session = await getSessionService().addChatMessage(id, messageData);

  if (!session) {
    throw new NotFoundError('Session', id);
  }

  const response: APIResponse<SessionState> = {
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// ダイスロール追加
sessionRouter.post('/:id/dice-roll', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const diceData = req.body;

  if (!diceData.roller || !diceData.dice) {
    throw new ValidationError('Roller and dice are required');
  }

  const session = await getSessionService().addDiceRoll(id, diceData);

  if (!session) {
    throw new NotFoundError('Session', id);
  }

  // Note: Companion reaction system temporarily disabled

  const response: APIResponse<SessionState> = {
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// 戦闘開始
sessionRouter.post('/:id/combat/start', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { participants } = req.body;

  if (!participants || !Array.isArray(participants)) {
    throw new ValidationError('Participants array is required');
  }

  const session = await getSessionService().startCombat(id, participants);

  if (!session) {
    throw new NotFoundError('Session', id);
  }

  const response: APIResponse<SessionState> = {
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// 戦闘終了
sessionRouter.post('/:id/combat/end', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await getSessionService().endCombat(id);

  if (!session) {
    throw new NotFoundError('Session', id);
  }

  const response: APIResponse<SessionState> = {
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// 時間管理関連エンドポイント

// アクション実行
sessionRouter.post('/:id/time-management/action', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { characterId, description, metadata = {} } = req.body;

  if (!characterId || !description) {
    throw new ValidationError('Character ID and description are required');
  }

  const session = await getSessionService().getSessionById(id);
  if (!session) {
    throw new NotFoundError('Session', id);
  }

  const result = await getTimeManagementService().executeAction(
    session.campaignId,
    characterId,
    description,
    metadata
  );

  const response: APIResponse<typeof result> = {
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// 時間進行
sessionRouter.post('/:id/time-management/advance', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await getSessionService().getSessionById(id);
  if (!session) {
    throw new NotFoundError('Session', id);
  }

  const result = await getTimeManagementService().advanceTime(session.campaignId);

  const response: APIResponse<typeof result> = {
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// 休息実行
sessionRouter.post('/:id/time-management/rest', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await getSessionService().getSessionById(id);
  if (!session) {
    throw new NotFoundError('Session', id);
  }

  const result = await getTimeManagementService().takeRest(session.campaignId);

  const response: APIResponse<typeof result> = {
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// ターン状態取得
sessionRouter.get('/:id/time-management/turn-state', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await getSessionService().getSessionById(id);
  if (!session) {
    throw new NotFoundError('Session', id);
  }

  const turnState = await getTimeManagementService().getTurnStateByCompaign(session.campaignId);

  const response: APIResponse<typeof turnState> = {
    success: true,
    data: turnState,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// 現在の日取得
sessionRouter.get('/:id/time-management/current-day', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await getSessionService().getSessionById(id);
  if (!session) {
    throw new NotFoundError('Session', id);
  }

  const currentDay = await getTimeManagementService().getCurrentGameDay(session.campaignId);

  const response: APIResponse<typeof currentDay> = {
    success: true,
    data: currentDay,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));