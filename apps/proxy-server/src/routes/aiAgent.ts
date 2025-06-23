import { Router } from 'express';
import { APIResponse } from '@ai-agent-trpg/types';
import { getAIService } from '../services/aiService';
import { asyncHandler, ValidationError, AIServiceError } from '../middleware/errorHandler';

export const aiAgentRouter = Router();

// AIプロバイダーのテストエンドポイント
aiAgentRouter.post('/test-key', asyncHandler(async (req, res) => {
  const { provider, apiKey, model } = req.body;

  if (!provider || !apiKey) {
    throw new ValidationError('Provider and API key are required');
  }

  try {
    const isValid = await getAIService().testProviderConnection(provider, apiKey, model);
    
    const response: APIResponse<{ valid: boolean; provider: string }> = {
      success: true,
      data: {
        valid: isValid,
        provider,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw new AIServiceError(
      'Failed to test API key',
      provider,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}));

// キャンペーン作成支援
aiAgentRouter.post('/campaign/create-assistance', asyncHandler(async (req, res) => {
  const { 
    provider, 
    apiKey, 
    model,
    campaignBasics, 
    worldSettings, 
    playerInfo 
  } = req.body;

  if (!provider || !apiKey || !campaignBasics) {
    throw new ValidationError('Provider, API key, and campaign basics are required');
  }

  try {
    const assistance = await getAIService().getCampaignCreationAssistance({
      provider,
      apiKey,
      model,
      campaignBasics,
      worldSettings,
      playerInfo,
    });

    const response: APIResponse<typeof assistance> = {
      success: true,
      data: assistance,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw new AIServiceError(
      'Failed to get campaign creation assistance',
      provider,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}));

// キャラクター生成支援
aiAgentRouter.post('/character/generate', asyncHandler(async (req, res) => {
  const {
    provider,
    apiKey,
    model,
    characterType,
    characterBasics,
    campaignContext,
  } = req.body;

  if (!provider || !apiKey || !characterType) {
    throw new ValidationError('Provider, API key, and character type are required');
  }

  try {
    const character = await getAIService().generateCharacter({
      provider,
      apiKey,
      model,
      characterType,
      characterBasics,
      campaignContext,
    });

    const response: APIResponse<typeof character> = {
      success: true,
      data: character,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw new AIServiceError(
      'Failed to generate character',
      provider,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}));

// イベント生成支援
aiAgentRouter.post('/event/generate', asyncHandler(async (req, res) => {
  const {
    provider,
    apiKey,
    model,
    eventType,
    campaignContext,
    sessionContext,
    difficulty,
  } = req.body;

  if (!provider || !apiKey || !eventType) {
    throw new ValidationError('Provider, API key, and event type are required');
  }

  try {
    const event = await getAIService().generateEvent({
      provider,
      apiKey,
      model,
      eventType,
      campaignContext,
      sessionContext,
      difficulty,
    });

    const response: APIResponse<typeof event> = {
      success: true,
      data: event,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw new AIServiceError(
      'Failed to generate event',
      provider,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}));

// セッション中のGM支援
aiAgentRouter.post('/session/gm-assistance', asyncHandler(async (req, res) => {
  const {
    provider,
    apiKey,
    model,
    assistanceType,
    sessionState,
    playerAction,
    context,
  } = req.body;

  if (!provider || !apiKey || !assistanceType || !sessionState) {
    throw new ValidationError('Provider, API key, assistance type, and session state are required');
  }

  try {
    const assistance = await getAIService().getGMAssistance({
      provider,
      apiKey,
      model,
      assistanceType,
      sessionState,
      playerAction,
      context,
    });

    const response: APIResponse<typeof assistance> = {
      success: true,
      data: assistance,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw new AIServiceError(
      'Failed to get GM assistance',
      provider,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}));

// NPC行動・対話生成
aiAgentRouter.post('/npc/behavior', asyncHandler(async (req, res) => {
  const {
    provider,
    apiKey,
    model,
    npcId,
    npcData,
    situation,
    playerActions,
    campaignContext,
  } = req.body;

  if (!provider || !apiKey || !npcId || !npcData) {
    throw new ValidationError('Provider, API key, NPC ID, and NPC data are required');
  }

  try {
    const behavior = await getAIService().generateNPCBehavior({
      provider,
      apiKey,
      model,
      npcId,
      npcData,
      situation,
      playerActions,
      campaignContext,
    });

    const response: APIResponse<typeof behavior> = {
      success: true,
      data: behavior,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw new AIServiceError(
      'Failed to generate NPC behavior',
      provider,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}));

// ルール参照・裁定支援
aiAgentRouter.post('/rules/assistance', asyncHandler(async (req, res) => {
  const {
    provider,
    apiKey,
    model,
    gameSystem,
    situation,
    question,
    context,
  } = req.body;

  if (!provider || !apiKey || !gameSystem || !question) {
    throw new ValidationError('Provider, API key, game system, and question are required');
  }

  try {
    const assistance = await getAIService().getRulesAssistance({
      provider,
      apiKey,
      model,
      gameSystem,
      situation,
      question,
      context,
    });

    const response: APIResponse<typeof assistance> = {
      success: true,
      data: assistance,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw new AIServiceError(
      'Failed to get rules assistance',
      provider,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}));

// 汎用チャット（AIペルソナ対応）
aiAgentRouter.post('/chat', asyncHandler(async (req, res) => {
  const {
    provider,
    apiKey,
    model,
    message,
    persona,
    context,
    conversationHistory,
  } = req.body;

  if (!provider || !apiKey || !message) {
    throw new ValidationError('Provider, API key, and message are required');
  }

  try {
    const chatResponse = await getAIService().chat({
      provider,
      apiKey,
      model,
      message,
      persona,
      context,
      conversationHistory,
    });

    const response: APIResponse<typeof chatResponse> = {
      success: true,
      data: chatResponse,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw new AIServiceError(
      'Failed to process chat request',
      provider,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}));

// 利用可能なAIプロバイダー一覧
aiAgentRouter.get('/providers', (_req, res) => {
  const providers = getAIService().getAvailableProviders();
  
  const response: APIResponse<typeof providers> = {
    success: true,
    data: providers,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

// AI使用統計（開発・デバッグ用）
aiAgentRouter.get('/stats', asyncHandler(async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    throw new ValidationError('Stats endpoint not available in production');
  }

  const stats = await getAIService().getUsageStats();
  
  const response: APIResponse<typeof stats> = {
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));