import { Router } from 'express';
import { Quest, APIResponse } from '@ai-agent-trpg/types';
import { getQuestService } from '../services/questService';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';

export const questRouter = Router();

// クエスト一覧取得（キャンペーン別）
questRouter.get('/', asyncHandler(async (req, res) => {
  const campaignId = req.query.campaignId as string;

  if (!campaignId) {
    throw new ValidationError('Campaign ID is required');
  }

  const quests = await getQuestService().getQuestsByCampaign(campaignId);

  const response: APIResponse<Quest[]> = {
    success: true,
    data: quests,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// 利用可能なクエスト取得
questRouter.get('/available', asyncHandler(async (req, res) => {
  const campaignId = req.query.campaignId as string;
  const completedQuestsParam = req.query.completedQuests as string;

  if (!campaignId) {
    throw new ValidationError('Campaign ID is required');
  }

  const completedQuestIds = completedQuestsParam 
    ? completedQuestsParam.split(',').filter(id => id.trim()) 
    : [];

  const quests = await getQuestService().getAvailableQuests(campaignId, completedQuestIds);

  const response: APIResponse<Quest[]> = {
    success: true,
    data: quests,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// クエスト詳細取得
questRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quest = await getQuestService().getQuestById(id);

  if (!quest) {
    throw new NotFoundError('Quest', id);
  }

  const response: APIResponse<Quest> = {
    success: true,
    data: quest,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// クエスト作成
questRouter.post('/', asyncHandler(async (req, res) => {
  const questData = req.body;

  if (!questData.title || !questData.campaignId) {
    throw new ValidationError('Title and campaign ID are required');
  }

  const quest = await getQuestService().createQuest(questData);

  const response: APIResponse<Quest> = {
    success: true,
    data: quest,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
}));

// クエスト更新
questRouter.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const quest = await getQuestService().updateQuest(id, updates);

  if (!quest) {
    throw new NotFoundError('Quest', id);
  }

  const response: APIResponse<Quest> = {
    success: true,
    data: quest,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// クエストステータス更新
questRouter.patch('/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    throw new ValidationError('Status is required');
  }

  const quest = await getQuestService().updateQuestStatus(id, status);

  if (!quest) {
    throw new NotFoundError('Quest', id);
  }

  const response: APIResponse<Quest> = {
    success: true,
    data: quest,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// クエスト目標更新
questRouter.patch('/:id/objectives/:objectiveId', asyncHandler(async (req, res) => {
  const { id, objectiveId } = req.params;
  const updates = req.body;

  const quest = await getQuestService().updateQuestObjective(id, objectiveId, updates);

  if (!quest) {
    throw new NotFoundError('Quest', id);
  }

  const response: APIResponse<Quest> = {
    success: true,
    data: quest,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// クエスト削除
questRouter.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const success = await getQuestService().deleteQuest(id);

  if (!success) {
    throw new NotFoundError('Quest', id);
  }

  const response: APIResponse<{ message: string }> = {
    success: true,
    data: { message: 'Quest deleted successfully' },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// 報酬受け取り
questRouter.post('/:id/claim-rewards', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { characterId } = req.body;

  if (!characterId) {
    throw new ValidationError('Character ID is required');
  }

  const rewards = await getQuestService().claimQuestRewards(id, characterId);

  const response: APIResponse<typeof rewards> = {
    success: true,
    data: rewards,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// AIクエスト提案生成
questRouter.post('/generate-suggestions', asyncHandler(async (req, res) => {
  const { campaignId, playerLevel, currentLocation, recentEvents, preferences } = req.body;

  if (!campaignId || !playerLevel) {
    throw new ValidationError('Campaign ID and player level are required');
  }

  const suggestions = await getQuestService().generateQuestSuggestions(campaignId, {
    playerLevel,
    currentLocation,
    recentEvents,
    preferences,
  });

  const response: APIResponse<Partial<Quest>[]> = {
    success: true,
    data: suggestions,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// セッション連携 - クエスト進行同期
questRouter.post('/sync-session/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { questUpdates } = req.body;

  if (!questUpdates || !Array.isArray(questUpdates)) {
    throw new ValidationError('Quest updates array is required');
  }

  const updatedQuests = await getQuestService().syncQuestProgressWithSession(sessionId, questUpdates);

  const response: APIResponse<Quest[]> = {
    success: true,
    data: updatedQuests,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));