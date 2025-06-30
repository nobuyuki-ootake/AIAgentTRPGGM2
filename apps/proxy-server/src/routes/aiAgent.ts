import { Router } from 'express';
import { APIResponse, TriggerChainRequest, TriggerChainResponse, EnemyTacticsLevel, GMTacticsResponse, UpdateTacticsRequest, CharacterAISettingsResponse, UpdateCharacterAIRequest, CharacterAISettings, AIDecisionLog } from '@ai-agent-trpg/types';
import { getAIService } from '../services/aiService';
import { asyncHandler, ValidationError, AIServiceError } from '../middleware/errorHandler';
import { generateGMResponseWithTactics } from '../mastra/agents/gameMaster';
import { AIEntityEngine } from '../services/ai-entity-engine';
import { getDatabase } from '../database/database';
import { logger } from '../utils/logger';

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

// イベント駆動AIチェーン - Phase 0の中核システム
aiAgentRouter.post('/trigger-chain', asyncHandler(async (req, res) => {
  const {
    sessionId,
    playerMessage,
    currentLocationId,
    participants,
    triggerType = 'player_action',
    context = {}
  }: TriggerChainRequest = req.body;

  if (!sessionId || !playerMessage) {
    throw new ValidationError('Session ID and player message are required');
  }

  logger.info(`🔗 Triggering AI chain for session: ${sessionId}`);
  logger.info(`🎭 Player message: "${playerMessage}"`);
  logger.info(`📍 Location: ${currentLocationId || 'unknown'}`);

  try {
    const db = getDatabase();
    
    // 1. 現在のGM戦術設定を取得
    let gmTactics = null;
    try {
      const tacticsQuery = db.prepare(`
        SELECT * FROM ai_tactics_settings 
        WHERE session_id = ? AND agent_type = 'gm' 
        ORDER BY updated_at DESC 
        LIMIT 1
      `);
      const tacticsRow = tacticsQuery.get(sessionId) as any;
      
      if (tacticsRow) {
        gmTactics = JSON.parse(tacticsRow.settings);
        logger.info(`⚙️ Applied GM tactics: ${gmTactics.tacticsLevel}/${gmTactics.primaryFocus}/teamwork:${gmTactics.teamwork}`);
      } else {
        // デフォルト戦術設定
        gmTactics = {
          tacticsLevel: 'strategic',
          primaryFocus: 'damage',
          teamwork: true
        };
        logger.info('🔧 Using default GM tactics');
      }
    } catch (error) {
      logger.warn('Failed to retrieve GM tactics, using defaults:', error);
      gmTactics = {
        tacticsLevel: 'strategic',
        primaryFocus: 'damage',
        teamwork: true
      };
    }

    // 2. パーティ位置に基づく利用可能エンティティ取得
    let availableEntities: any[] = [];
    let locationContext: any = {};
    
    if (currentLocationId) {
      try {
        const aiEntityEngine = new AIEntityEngine();
        
        // ゲームコンテキストを作成
        const gameContext = {
          sessionId,
          campaignId: 'default_campaign', // TODO: Get from session
          sessionMode: 'exploration' as const,
          currentState: {
            player: {
              id: participants?.[0] || 'player1',
              name: 'Player',
              level: 1,
              location: currentLocationId,
              stats: {},
              items: [],
              status: [],
              relationships: {}
            },
            time: {
              hour: 12,
              day: 1,
              season: 'spring'
            },
            weather: context.weather || 'clear',
            flags: {},
            story: {
              currentChapter: 'Chapter 1',
              progress: 0.1,
              keyEvents: []
            }
          }
        };
        
        // 場所ベースのエンティティクエリ
        const entityQuery = await aiEntityEngine.queryEntities(
          {
            location: currentLocationId,
            entityTypes: ['item', 'quest', 'event', 'npc', 'enemy']
          },
          gameContext,
          {
            maxResults: 20
          }
        );
        
        availableEntities = entityQuery.entities || [];
        locationContext = {
          locationId: currentLocationId,
          entityCount: availableEntities.length,
          entityTypes: Array.from(new Set(availableEntities.map((e: any) => e.type || 'unknown')))
        };
        
        logger.info(`🏰 Found ${availableEntities.length} entities at location ${currentLocationId}`);
        logger.info(`📦 Entity types: ${locationContext.entityTypes.join(', ')}`);
        
      } catch (error) {
        logger.warn('Failed to retrieve location entities:', error);
        availableEntities = [];
        locationContext = { error: 'Failed to load location entities' };
      }
    }

    // 3. AIゲームマスターによる応答生成
    const gmResponse = await generateGMResponseWithTactics({
      playerMessage,
      sessionId,
      locationId: currentLocationId,
      currentContext: {
        ...context,
        availableEntities: availableEntities.slice(0, 5), // GM Agentへは最大5つのエンティティを渡す
        partyMembers: participants || [],
        triggerType,
        locationContext
      },
      tactics: gmTactics
    });

    // 4. AIチェーン実行結果の構築
    const chainResult: TriggerChainResponse = {
      success: true,
      sessionId,
      chainId: `chain_${Date.now()}_${sessionId}`,
      
      // GM Agent応答
      gmResponse: {
        message: gmResponse.response,
        suggestions: gmResponse.suggestions || [],
        appliedTactics: gmResponse.systemInfo?.appliedTactics || gmTactics,
        confidence: gmResponse.systemInfo?.confidence || 0.8
      },
      
      // コンテキスト情報
      contextAnalysis: {
        currentLocation: currentLocationId || 'unknown',
        availableEntities: availableEntities.map((entity: any) => ({
          id: entity.id || 'unknown',
          type: entity.type || 'unknown',
          name: entity.name || `${entity.type || 'entity'}_${entity.id || 'unknown'}`,
          available: true,
          relevanceScore: entity.relevanceScore || 0.5
        })),
        partyStatus: {
          memberCount: participants?.length || 0,
          currentActivity: triggerType,
          lastAction: playerMessage
        },
        environmentalFactors: {
          timeOfDay: context.timeOfDay || 'unknown',
          weather: context.weather || 'clear',
          dangerLevel: context.dangerLevel || 30
        }
      },
      
      // 実行情報
      executionInfo: {
        triggeredAt: new Date().toISOString(),
        processingTime: Date.now() - (gmResponse.systemInfo?.processingTime || Date.now()),
        agentsInvolved: ['gameMaster'],
        entitiesProcessed: availableEntities.length,
        tacticsApplied: Object.keys(gmTactics).length
      },
      
      // 次のアクション提案
      nextActions: gmResponse.suggestions?.map(suggestion => ({
        type: 'exploration',
        description: suggestion,
        priority: 'medium',
        estimatedTime: 5,
        requirements: []
      })) || [],
      
      timestamp: new Date().toISOString()
    };

    // 5. 実行ログをデータベースに記録
    try {
      const logQuery = db.prepare(`
        INSERT INTO ai_tactics_settings (id, session_id, agent_type, settings, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const logId = `chain_log_${Date.now()}`;
      const logData = {
        chainId: chainResult.chainId,
        triggerType,
        playerMessage,
        gmResponse: gmResponse.response,
        entitiesCount: availableEntities.length,
        appliedTactics: gmTactics
      };
      
      logQuery.run(
        logId,
        sessionId,
        'chain_log',
        JSON.stringify(logData),
        new Date().toISOString(),
        new Date().toISOString()
      );
      
      logger.info(`📝 Logged AI chain execution: ${chainResult.chainId}`);
    } catch (error) {
      logger.warn('Failed to log AI chain execution:', error);
    }

    logger.info(`✅ AI chain completed successfully: ${chainResult.chainId}`);
    logger.info(`🎯 GM response: "${gmResponse.response.substring(0, 100)}..."`);
    logger.info(`📈 Entities processed: ${availableEntities.length}, Next actions: ${chainResult.nextActions.length}`);

    const response: APIResponse<TriggerChainResponse> = {
      success: true,
      data: chainResult,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error('❌ Failed to execute AI chain:', error);
    throw new AIServiceError(
      'Failed to execute AI agent chain',
      'gameMaster',
      { 
        originalError: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        triggerType
      }
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

// GM戦術制御API - 現在の戦術設定取得
aiAgentRouter.get('/gm-tactics', asyncHandler(async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('Session ID is required');
  }

  logger.info(`🎭 Getting GM tactics for session: ${sessionId}`);

  try {
    const db = getDatabase();
    
    // 現在のGM戦術設定を取得
    const tacticsQuery = db.prepare(`
      SELECT * FROM ai_tactics_settings 
      WHERE session_id = ? AND agent_type = 'gm' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    const tacticsRow = tacticsQuery.get(sessionId) as any;
    
    // デフォルト戦術設定
    let currentSettings: EnemyTacticsLevel = {
      tacticsLevel: 'strategic',
      primaryFocus: 'damage',
      teamwork: true
    };
    
    if (tacticsRow) {
      currentSettings = JSON.parse(tacticsRow.settings);
      logger.info(`📖 Retrieved GM tactics: ${currentSettings.tacticsLevel}/${currentSettings.primaryFocus}/teamwork:${currentSettings.teamwork}`);
    } else {
      logger.info('🔧 Using default GM tactics');
    }

    // 最近のAI決定ログを取得（chain_logエントリ）
    const decisionsQuery = db.prepare(`
      SELECT * FROM ai_tactics_settings 
      WHERE session_id = ? AND agent_type = 'chain_log' 
      ORDER BY updated_at DESC 
      LIMIT 10
    `);
    const decisionRows = decisionsQuery.all(sessionId) as any[];
    
    const recentDecisions: AIDecisionLog[] = decisionRows.map(row => {
      const logData = JSON.parse(row.settings);
      return {
        id: row.id,
        timestamp: row.updated_at,
        decisionType: 'enemy_action',
        context: logData,
        reasoning: logData.gmResponse || 'AI GM decision',
        appliedTactics: JSON.stringify(logData.appliedTactics || {})
      };
    });

    const response: APIResponse<GMTacticsResponse> = {
      success: true,
      data: {
        sessionId,
        currentSettings,
        recentDecisions
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error('❌ Failed to get GM tactics:', error);
    throw new AIServiceError(
      'Failed to get GM tactics',
      'gm',
      { originalError: error instanceof Error ? error.message : 'Unknown error', sessionId }
    );
  }
}));

// GM戦術制御API - 戦術設定更新
aiAgentRouter.put('/gm-tactics', asyncHandler(async (req, res) => {
  const { sessionId } = req.query;
  const { settings, applyImmediately = true }: UpdateTacticsRequest = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('Session ID is required');
  }

  if (!settings || typeof settings !== 'object') {
    throw new ValidationError('Settings object is required');
  }

  logger.info(`🎭 Updating GM tactics for session: ${sessionId}`);
  logger.info(`⚙️ New settings: ${JSON.stringify(settings)}`);

  try {
    const db = getDatabase();
    
    // 現在の設定を取得
    const currentQuery = db.prepare(`
      SELECT * FROM ai_tactics_settings 
      WHERE session_id = ? AND agent_type = 'gm' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    const currentRow = currentQuery.get(sessionId) as any;
    
    let currentSettings: EnemyTacticsLevel = {
      tacticsLevel: 'strategic',
      primaryFocus: 'damage',
      teamwork: true
    };
    
    if (currentRow) {
      currentSettings = JSON.parse(currentRow.settings);
    }

    // 設定をマージ
    const newSettings: EnemyTacticsLevel = {
      ...currentSettings,
      ...settings
    };

    // 新しい設定を保存
    const insertQuery = db.prepare(`
      INSERT INTO ai_tactics_settings (id, session_id, agent_type, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const settingsId = `gm_tactics_${Date.now()}_${sessionId}`;
    const now = new Date().toISOString();
    
    insertQuery.run(
      settingsId,
      sessionId,
      'gm',
      JSON.stringify(newSettings),
      now,
      now
    );

    logger.info(`✅ GM tactics updated successfully: ${newSettings.tacticsLevel}/${newSettings.primaryFocus}/teamwork:${newSettings.teamwork}`);

    if (applyImmediately) {
      logger.info('🔄 Settings will be applied immediately to next AI interactions');
    }

    const response: APIResponse<{ success: boolean }> = {
      success: true,
      data: { success: true },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error('❌ Failed to update GM tactics:', error);
    throw new AIServiceError(
      'Failed to update GM tactics',
      'gm',
      { originalError: error instanceof Error ? error.message : 'Unknown error', sessionId }
    );
  }
}));

// キャラクターAI設定API - 設定取得
aiAgentRouter.get('/character-ai', asyncHandler(async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('Session ID is required');
  }

  logger.info(`👥 Getting character AI settings for session: ${sessionId}`);

  try {
    const db = getDatabase();
    
    // セッションに関連するキャラクターを取得
    const charactersQuery = db.prepare(`
      SELECT c.*, s.participants
      FROM characters c
      JOIN sessions s ON c.campaign_id = s.campaign_id
      WHERE s.id = ? AND (c.character_type = 'NPC' OR c.character_type = 'Enemy')
    `);
    const charactersRows = charactersQuery.all(sessionId) as any[];
    
    // 各キャラクターのAI設定を取得
    const charactersWithAI = [];
    
    for (const character of charactersRows) {
      // キャラクターのAI設定を取得
      const aiSettingsQuery = db.prepare(`
        SELECT * FROM ai_tactics_settings 
        WHERE session_id = ? AND agent_type = 'character' 
        AND JSON_EXTRACT(settings, '$.characterId') = ?
        ORDER BY updated_at DESC 
        LIMIT 1
      `);
      const aiSettingsRow = aiSettingsQuery.get(sessionId, character.id) as any;
      
      // デフォルトAI設定
      let aiSettings: CharacterAISettings = {
        actionPriority: 'balanced',
        personality: 'calm',
        communicationStyle: 'polite'
      };
      
      if (aiSettingsRow) {
        const settingsData = JSON.parse(aiSettingsRow.settings);
        aiSettings = settingsData.aiSettings || aiSettings;
        logger.info(`📖 Retrieved AI settings for ${character.name}: ${aiSettings.actionPriority}/${aiSettings.personality}/${aiSettings.communicationStyle}`);
      } else {
        logger.info(`🔧 Using default AI settings for ${character.name}`);
      }

      // 最後のAIアクションを取得
      const lastActionQuery = db.prepare(`
        SELECT * FROM ai_actions 
        WHERE character_id = ? AND session_id = ?
        ORDER BY timestamp DESC 
        LIMIT 1
      `);
      const lastActionRow = lastActionQuery.get(character.id, sessionId) as any;
      
      let lastAction = undefined;
      if (lastActionRow) {
        const actionDetails = JSON.parse(lastActionRow.details);
        const aiDecision = JSON.parse(lastActionRow.ai_decision);
        lastAction = {
          dialogue: actionDetails.dialogue || '',
          behavior: actionDetails.description || '',
          reasoning: aiDecision.reasoning || '',
          appliedSettings: JSON.stringify(aiSettings),
          timestamp: lastActionRow.timestamp
        };
      }

      charactersWithAI.push({
        characterId: character.id,
        name: character.name,
        class: character.class || 'Unknown',
        controlType: 'agent' as const,
        actionPriority: aiSettings.actionPriority,
        personality: aiSettings.personality,
        communicationStyle: aiSettings.communicationStyle,
        lastAction
      });
    }

    const response: APIResponse<CharacterAISettingsResponse> = {
      success: true,
      data: {
        characters: charactersWithAI
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error('❌ Failed to get character AI settings:', error);
    throw new AIServiceError(
      'Failed to get character AI settings',
      'character',
      { originalError: error instanceof Error ? error.message : 'Unknown error', sessionId }
    );
  }
}));

// キャラクターAI設定API - 設定更新
aiAgentRouter.put('/character-ai/:characterId', asyncHandler(async (req, res) => {
  const { sessionId } = req.query;
  const { characterId } = req.params;
  const updateRequest: UpdateCharacterAIRequest = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('Session ID is required');
  }

  if (!characterId) {
    throw new ValidationError('Character ID is required');
  }

  if (!updateRequest || typeof updateRequest !== 'object') {
    throw new ValidationError('Settings object is required');
  }

  logger.info(`👤 Updating character AI settings for character: ${characterId} in session: ${sessionId}`);
  logger.info(`⚙️ New settings: ${JSON.stringify(updateRequest)}`);

  try {
    const db = getDatabase();
    
    // キャラクターの存在確認
    const characterQuery = db.prepare(`
      SELECT c.* FROM characters c
      JOIN sessions s ON c.campaign_id = s.campaign_id
      WHERE c.id = ? AND s.id = ? AND (c.character_type = 'NPC' OR c.character_type = 'Enemy')
    `);
    const character = characterQuery.get(characterId, sessionId) as any;
    
    if (!character) {
      throw new ValidationError('Character not found or not AI-controllable');
    }

    // 現在の設定を取得
    const currentQuery = db.prepare(`
      SELECT * FROM ai_tactics_settings 
      WHERE session_id = ? AND agent_type = 'character' 
      AND JSON_EXTRACT(settings, '$.characterId') = ?
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    const currentRow = currentQuery.get(sessionId, characterId) as any;
    
    let currentSettings: CharacterAISettings = {
      actionPriority: 'balanced',
      personality: 'calm',
      communicationStyle: 'polite'
    };
    
    if (currentRow) {
      const settingsData = JSON.parse(currentRow.settings);
      currentSettings = settingsData.aiSettings || currentSettings;
    }

    // 設定をマージ
    const newSettings: CharacterAISettings = {
      ...currentSettings,
      ...updateRequest
    };

    // 新しい設定を保存
    const insertQuery = db.prepare(`
      INSERT INTO ai_tactics_settings (id, session_id, agent_type, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const settingsId = `character_ai_${Date.now()}_${characterId}`;
    const now = new Date().toISOString();
    
    const settingsData = {
      characterId,
      characterName: character.name,
      aiSettings: newSettings
    };
    
    insertQuery.run(
      settingsId,
      sessionId,
      'character',
      JSON.stringify(settingsData),
      now,
      now
    );

    logger.info(`✅ Character AI settings updated successfully for ${character.name}: ${newSettings.actionPriority}/${newSettings.personality}/${newSettings.communicationStyle}`);

    const response: APIResponse<{ success: boolean }> = {
      success: true,
      data: { success: true },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error('❌ Failed to update character AI settings:', error);
    throw new AIServiceError(
      'Failed to update character AI settings',
      'character',
      { originalError: error instanceof Error ? error.message : 'Unknown error', sessionId, characterId }
    );
  }
}));

// AIリクエストログAPI - ログ取得
aiAgentRouter.get('/request-logs', asyncHandler(async (req, res) => {
  const { 
    page = '1', 
    limit = '20', 
    agentType, 
    sessionId, 
    startDate, 
    endDate, 
    search 
  } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Invalid pagination parameters');
  }

  logger.info(`📊 Getting AI request logs - page: ${pageNum}, limit: ${limitNum}`);

  try {
    const db = getDatabase();
    
    // フィルター条件を構築
    let whereConditions = [];
    let whereParams: any[] = [];

    // Agent種別フィルター
    if (agentType && agentType !== 'all') {
      if (agentType === 'gm') {
        whereConditions.push("category LIKE '%gm%' OR category LIKE '%master%'");
      } else if (agentType === 'character') {
        whereConditions.push("category LIKE '%character%' OR category LIKE '%npc%'");
      } else if (agentType === 'chain') {
        whereConditions.push("category LIKE '%chain%' OR category LIKE '%trigger%'");
      }
    }

    // セッションIDフィルター
    if (sessionId && typeof sessionId === 'string') {
      // ai_requestsテーブルにはsession_idがないので、contextから検索
      whereConditions.push("JSON_EXTRACT(context, '$.sessionId') = ?");
      whereParams.push(sessionId);
    }

    // 日付範囲フィルター
    if (startDate && typeof startDate === 'string') {
      whereConditions.push("created_at >= ?");
      whereParams.push(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      whereConditions.push("created_at <= ?");
      whereParams.push(endDate);
    }

    // 検索キーワードフィルター
    if (search && typeof search === 'string') {
      whereConditions.push("(prompt LIKE ? OR response LIKE ? OR category LIKE ?)");
      const searchPattern = `%${search}%`;
      whereParams.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 総数取得
    const countQuery = db.prepare(`
      SELECT COUNT(*) as total FROM ai_requests ${whereClause}
    `);
    const countResult = countQuery.get(...whereParams) as any;
    const totalCount = countResult.total;

    // ページネーション計算
    const offset = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(totalCount / limitNum);

    // ログデータ取得
    const logsQuery = db.prepare(`
      SELECT * FROM ai_requests 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    const logRows = logsQuery.all(...whereParams, limitNum, offset) as any[];

    // レスポンス形式に変換
    const logs = logRows.map(row => {
      const context = row.context ? JSON.parse(row.context) : {};
      const sessionIdFromContext = context.sessionId || 'unknown';
      
      // Agent種別を推定
      let agentType = 'gm';
      if (row.category.includes('character') || row.category.includes('npc')) {
        agentType = 'character';
      } else if (row.category.includes('chain') || row.category.includes('trigger')) {
        agentType = 'chain';
      }

      return {
        id: row.id,
        timestamp: row.created_at,
        sessionId: sessionIdFromContext,
        agentType,
        requestType: row.category,
        request: {
          endpoint: `/api/ai-agent/${row.category}`,
          method: 'POST',
          payload: { prompt: row.prompt.substring(0, 100) + '...' } // プロンプトを短縮
        },
        response: {
          success: !row.error,
          data: row.response ? { response: row.response.substring(0, 100) + '...' } : null,
          error: row.error
        },
        processingTime: row.processing_time || 0,
        appliedTactics: context.appliedTactics || null,
        entitiesProcessed: context.entitiesProcessed || 0,
        metadata: {
          characterId: context.characterId,
          characterName: context.characterName,
          locationId: context.locationId,
          triggerType: context.triggerType,
          confidence: context.confidence || 0.8
        }
      };
    });

    logger.info(`📊 Retrieved ${logs.length} AI request logs (total: ${totalCount})`);

    const response: APIResponse<{
      logs: any[];
      totalCount: number;
      pagination: {
        page: number;
        limit: number;
        totalPages: number;
      };
    }> = {
      success: true,
      data: {
        logs,
        totalCount,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages
        }
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    logger.error('❌ Failed to get AI request logs:', error);
    throw new AIServiceError(
      'Failed to get AI request logs',
      'system',
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}));

// AIリクエストログAPI - ログエクスポート
aiAgentRouter.get('/request-logs/export', asyncHandler(async (req, res) => {
  const { agentType, sessionId, startDate, endDate, search } = req.query;

  logger.info(`📤 Exporting AI request logs`);

  try {
    const db = getDatabase();
    
    // フィルター条件を構築（上記と同じロジック）
    let whereConditions = [];
    let whereParams: any[] = [];

    if (agentType && agentType !== 'all') {
      if (agentType === 'gm') {
        whereConditions.push("category LIKE '%gm%' OR category LIKE '%master%'");
      } else if (agentType === 'character') {
        whereConditions.push("category LIKE '%character%' OR category LIKE '%npc%'");
      } else if (agentType === 'chain') {
        whereConditions.push("category LIKE '%chain%' OR category LIKE '%trigger%'");
      }
    }

    if (sessionId && typeof sessionId === 'string') {
      whereConditions.push("JSON_EXTRACT(context, '$.sessionId') = ?");
      whereParams.push(sessionId);
    }

    if (startDate && typeof startDate === 'string') {
      whereConditions.push("created_at >= ?");
      whereParams.push(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      whereConditions.push("created_at <= ?");
      whereParams.push(endDate);
    }

    if (search && typeof search === 'string') {
      whereConditions.push("(prompt LIKE ? OR response LIKE ? OR category LIKE ?)");
      const searchPattern = `%${search}%`;
      whereParams.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const logsQuery = db.prepare(`
      SELECT * FROM ai_requests 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT 1000
    `);
    const logRows = logsQuery.all(...whereParams) as any[];

    // CSVヘッダー
    const csvHeaders = [
      'ID', 'Timestamp', 'Session ID', 'Agent Type', 'Request Type', 
      'Processing Time (ms)', 'Success', 'Error', 'Provider', 'Model'
    ].join(',');

    // CSVデータ
    const csvRows = logRows.map(row => {
      const context = row.context ? JSON.parse(row.context) : {};
      const sessionIdFromContext = context.sessionId || 'unknown';
      
      let agentType = 'gm';
      if (row.category.includes('character') || row.category.includes('npc')) {
        agentType = 'character';
      } else if (row.category.includes('chain') || row.category.includes('trigger')) {
        agentType = 'chain';
      }

      return [
        row.id,
        row.created_at,
        sessionIdFromContext,
        agentType,
        row.category,
        row.processing_time || 0,
        !row.error ? 'Yes' : 'No',
        row.error || '',
        row.provider,
        row.model
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ai-request-logs.csv"');
    res.send(csvContent);

    logger.info(`📤 Exported ${logRows.length} AI request logs as CSV`);
  } catch (error) {
    logger.error('❌ Failed to export AI request logs:', error);
    throw new AIServiceError(
      'Failed to export AI request logs',
      'system',
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}));