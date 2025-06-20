import { Router } from 'express';
import { SessionState, APIResponse } from '@ai-agent-trpg/types';
import { sessionService } from '../services/sessionService';
import { socketService } from '../services/socketService';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';

export const sessionRouter = Router();

// セッション一覧取得（キャンペーン別）
sessionRouter.get('/', asyncHandler(async (req, res) => {
  const campaignId = req.query.campaignId as string;

  if (!campaignId) {
    throw new ValidationError('Campaign ID is required');
  }

  const sessions = await sessionService.getSessionsByCampaign(campaignId);

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

  const session = await sessionService.getSessionById(id);

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

  const session = await sessionService.createSession(sessionData);

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
  const { status } = req.body;

  if (!status) {
    throw new ValidationError('Status is required');
  }

  const session = await sessionService.updateSessionStatus(id, status);

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

// チャットメッセージ追加
sessionRouter.post('/:id/chat', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const messageData = req.body;

  if (!messageData.speaker || !messageData.message) {
    throw new ValidationError('Speaker and message are required');
  }

  const session = await sessionService.addChatMessage(id, messageData);

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

  const session = await sessionService.addDiceRoll(id, diceData);

  if (!session) {
    throw new NotFoundError('Session', id);
  }

  // WebSocket companion reaction analysis
  try {
    const companions = await sessionService.getSessionCompanions(id);
    const rollResult = session.diceRolls[session.diceRolls.length - 1];
    
    await socketService.analyzeAndReact(
      id,
      {
        type: 'dice_roll',
        result: rollResult.success ? 'success' : 'failure',
        content: `${diceData.dice} rolled: ${rollResult.total}`,
      },
      {
        recentEvents: session.chatMessages.slice(-5).map(m => m.content),
        sessionMode: session.combatState?.isActive ? 'combat' : 'exploration',
        dangerLevel: 'medium'
      },
      companions
    );
  } catch (error) {
    console.warn('Companion reaction failed:', error);
  }

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

  const session = await sessionService.startCombat(id, participants);

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

  const session = await sessionService.endCombat(id);

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