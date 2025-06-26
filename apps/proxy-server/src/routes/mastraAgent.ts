import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { checkMastraHealth } from '../mastra';
import { generateGMResponse, checkGMAgentHealth } from '../mastra/agents/gameMaster';
import { makeCompanionDecision, checkCompanionAgentHealth } from '../mastra/agents/companionAgent';
import { executeStoryProgress, checkStoryProgressAgentHealth } from '../mastra/agents/storyProgressAgent';
import { executeEnvironmentManagement, checkEnvironmentAgentHealth } from '../mastra/agents/environmentAgent';
import { AIServiceError } from '../middleware/errorHandler';

const router = Router();

// リクエストスキーマ定義
const gmChatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  sessionId: z.string().min(1, "Session ID is required"),
  locationId: z.string().optional(),
  context: z.record(z.any()).optional(),
  fallbackToLegacy: z.boolean().default(true)
});

const healthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  components: z.object({
    mastra: z.object({
      status: z.string(),
      details: z.string()
    }),
    gameMaster: z.object({
      status: z.string(), 
      details: z.string()
    }),
    companion: z.object({
      status: z.string(),
      details: z.string()
    }),
    storyProgress: z.object({
      status: z.string(),
      details: z.string()
    }),
    environment: z.object({
      status: z.string(),
      details: z.string()
    })
  }),
  version: z.string()
});

// エージェントチェーン実行用スキーマ
const agentChainRequestSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  playerAction: z.object({
    action: z.enum(["exploration", "combat", "movement", "base", "communication"]).describe("プレイヤー行動"),
    location: z.string().describe("実行場所"),
    details: z.string().optional().describe("行動詳細")
  }),
  companionCharacter: z.object({
    id: z.string(),
    name: z.string(),
    class: z.enum(["warrior", "mage", "rogue"]),
    personality: z.object({
      cooperation: z.number(),
      caution: z.number(),
      exploration: z.number(),
      leadership: z.number()
    }),
    abilities: z.object({
      combat: z.number(),
      magic: z.number(),
      stealth: z.number(),
      investigation: z.number()
    }),
    currentStatus: z.object({
      health: z.number(),
      magic: z.number(),
      morale: z.number()
    })
  }),
  sessionContext: z.object({
    timeOfDay: z.string(),
    weather: z.string(),
    dangerLevel: z.number(),
    partyMorale: z.number(),
    currentMilestones: z.array(z.object({
      milestoneId: z.string(),
      targetEntities: z.array(z.string()),
      completedEntities: z.array(z.string()),
      priority: z.enum(["low", "medium", "high"])
    })),
    recentCompletions: z.array(z.object({
      entityId: z.string(),
      entityType: z.string(),
      completedAt: z.string(),
      playerSatisfaction: z.number()
    })),
    campaignTheme: z.string(),
    playerPreferences: z.object({
      preferredDifficulty: z.number(),
      favoriteActivities: z.array(z.string()),
      riskTolerance: z.number()
    })
  })
});

/**
 * エージェントチェーン実行エンドポイント
 * プレイヤー行動後のコンパニオン→ストーリー進行→環境管理の連鎖処理
 */
router.post('/agent-chain', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    // リクエスト検証
    const validatedRequest = agentChainRequestSchema.parse(req.body);
    const { sessionId, playerAction, companionCharacter, sessionContext } = validatedRequest;
    
    logger.info(`🔗 Agent chain execution started for session: ${sessionId}`);
    logger.info(`👤 Player action: ${playerAction.action} at ${playerAction.location}`);
    
    // Phase 1: コンパニオンエージェント実行
    logger.info(`🤝 Phase 1: Executing Companion Agent`);
    const companionDecision = await makeCompanionDecision({
      playerAction: playerAction.action,
      playerLocation: playerAction.location,
      sessionContext: {
        timeOfDay: sessionContext.timeOfDay,
        weather: sessionContext.weather,
        dangerLevel: sessionContext.dangerLevel,
        partyMorale: sessionContext.partyMorale
      },
      companionCharacter
    });
    
    logger.info(`🤝 Companion decided: ${companionDecision.action} (${companionDecision.actionType})`);
    
    // Phase 2: ストーリー進行エージェント実行
    logger.info(`📈 Phase 2: Executing Story Progress Agent`);
    const storyProgress = await executeStoryProgress({
      sessionId,
      recentCompletions: sessionContext.recentCompletions,
      currentMilestones: sessionContext.currentMilestones,
      campaignTheme: sessionContext.campaignTheme,
      playerPreferences: sessionContext.playerPreferences
    });
    
    logger.info(`📈 Story progress: ${storyProgress.newEntities.length} new entities generated`);
    
    // Phase 3: 環境管理エージェント実行
    logger.info(`🌍 Phase 3: Executing Environment Agent`);
    const environmentUpdate = await executeEnvironmentManagement({
      currentEnvironment: {
        weather: { condition: sessionContext.weather, intensity: 50, duration: 60 },
        timeOfDay: sessionContext.timeOfDay,
        atmosphere: { tension: sessionContext.dangerLevel, mystery: 50, comfort: 100 - sessionContext.dangerLevel }
      },
      npcs: [
        // 暫定的なNPCデータ（実際の実装では既存NPCデータを使用）
        {
          npcId: "npc_1",
          currentAttitude: "neutral" as const,
          currentMood: "normal" as const,
          relationshipLevel: 50
        }
      ],
      recentEvents: [
        {
          eventType: `player_${playerAction.action}`,
          impact: sessionContext.dangerLevel > 50 ? 15 : 5,
          involvedNPCs: []
        }
      ],
      recentPlayerActions: [
        {
          action: playerAction.action,
          location: playerAction.location,
          visibility: 60,
          impact: 40
        }
      ],
      existingRumors: [
        // 暫定的な噂データ（実際の実装では既存噂データを使用）
        {
          rumorId: "rumor_1",
          content: "村で不思議な出来事が起きているという話",
          credibility: 60,
          spreadLevel: 40,
          source: "村人",
          ageInDays: 2
        }
      ],
      seasonalContext: {
        season: "spring" as const,
        climate: "temperate" as const
      }
    });
    
    logger.info(`🌍 Environment updated: weather changes and ${environmentUpdate.npcChanges.attitudeChanges.length} NPC changes`);
    
    const processingTime = Date.now() - startTime;
    
    // 統合結果の返却
    const chainResult = {
      success: true,
      sessionId,
      executionTime: processingTime,
      results: {
        companionAction: {
          decision: companionDecision.action,
          actionType: companionDecision.actionType,
          reasoning: companionDecision.reasoning,
          expectedEffect: companionDecision.expectedEffect,
          message: companionDecision.companionMessage
        },
        storyProgression: {
          progressAnalysis: storyProgress.progressAnalysis,
          newEntities: storyProgress.newEntities,
          choiceAdjustments: storyProgress.choiceAdjustments,
          recommendations: storyProgress.recommendations
        },
        environmentChanges: {
          weatherUpdate: environmentUpdate.weatherUpdate,
          npcChanges: environmentUpdate.npcChanges,
          rumorUpdates: environmentUpdate.rumorUpdates,
          narrative: environmentUpdate.environmentalNarrative
        }
      },
      nextTurnReady: true,
      meta: {
        agentChainVersion: '1.0.0-alpha',
        executedAgents: ['companion', 'storyProgress', 'environment'],
        timestamp: new Date().toISOString()
      }
    };
    
    logger.info(`✅ Agent chain execution completed successfully (${processingTime}ms)`);
    
    res.json(chainResult);
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in agent chain request:', error.issues);
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid agent chain request format',
          details: error.issues,
          processingTime
        }
      });
      return;
    }
    
    logger.error('Agent chain execution failed:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'AgentChainError',
        message: error instanceof Error ? error.message : 'Agent chain execution failed',
        processingTime
      }
    });
  }
});

/**
 * Game Master Agent チャットエンドポイント
 * 既存システムとのハイブリッド運用対応
 */
router.post('/gm-chat', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    // リクエスト検証
    const validatedRequest = gmChatRequestSchema.parse(req.body);
    const { message, sessionId, locationId, context, fallbackToLegacy } = validatedRequest;
    
    logger.info(`🎭 Mastra GM Chat request: "${message}" (session: ${sessionId})`);
    
    try {
      // Mastra Game Master Agentで処理
      const gmResponse = await generateGMResponse({
        playerMessage: message,
        sessionId,
        locationId,
        currentContext: context
      });
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`✅ Mastra GM response generated (${processingTime}ms)`);
      
      res.json({
        success: true,
        data: {
          response: gmResponse.response,
          suggestions: gmResponse.suggestions || [],
          systemInfo: {
            ...gmResponse.systemInfo,
            source: 'mastra-gm-agent',
            processingTime
          }
        },
        meta: {
          provider: 'mastra',
          model: 'gemini-1.5-pro',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (mastraError) {
      logger.warn(`⚠️ Mastra GM Agent failed: ${mastraError instanceof Error ? mastraError.message : 'Unknown error'}`);
      
      // フォールバック判定
      if (!fallbackToLegacy) {
        throw new AIServiceError('Mastra GM Agent unavailable and fallback disabled', 'mastra');
      }
      
      logger.info('🔄 Falling back to legacy AI service...');
      
      // 既存aiServiceへのフォールバック（実装が必要）
      res.json({
        success: true,
        data: {
          response: "申し訳ございません。AI GMシステムが一時的に利用できません。しばらくしてから再度お試しください。",
          suggestions: ["システム復旧をお待ちください"],
          systemInfo: {
            source: 'fallback-message',
            processingTime: Date.now() - startTime,
            fallbackReason: mastraError instanceof Error ? mastraError.message : 'Unknown error'
          }
        },
        meta: {
          provider: 'fallback',
          model: 'none',
          timestamp: new Date().toISOString(),
          warning: 'Fallback response - limited functionality'
        }
      });
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in GM chat request:', error.issues);
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid request format',
          details: error.issues,
          processingTime
        }
      });
      return;
    }
    
    logger.error('Unexpected error in GM chat:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalError',
        message: 'Internal server error occurred',
        processingTime
      }
    });
  }
});

/**
 * Mastraシステム健康状態チェック
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🏥 Checking Mastra system health...');
    
    // Mastra基盤の健康状態チェック
    const mastraHealth = await checkMastraHealth();
    
    // 全エージェントの健康状態チェック
    const gmHealth = await checkGMAgentHealth();
    const companionHealth = await checkCompanionAgentHealth();
    const storyProgressHealth = await checkStoryProgressAgentHealth();
    const environmentHealth = await checkEnvironmentAgentHealth();
    
    const allHealths = [mastraHealth, gmHealth, companionHealth, storyProgressHealth, environmentHealth];
    const healthyCount = allHealths.filter(h => h.status === 'healthy').length;
    const unhealthyCount = allHealths.filter(h => h.status === 'unhealthy').length;
    
    const overallStatus = unhealthyCount > 0 ? 'unhealthy' : 
                         healthyCount === allHealths.length ? 'healthy' : 'degraded';
    
    const healthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      components: {
        mastra: {
          status: mastraHealth.status,
          details: mastraHealth.message
        },
        gameMaster: {
          status: gmHealth.status,
          details: gmHealth.details
        },
        companion: {
          status: companionHealth.status,
          details: companionHealth.details
        },
        storyProgress: {
          status: storyProgressHealth.status,
          details: storyProgressHealth.details
        },
        environment: {
          status: environmentHealth.status,
          details: environmentHealth.details
        }
      },
      version: '1.0.0-alpha'
    };
    
    // レスポンス検証
    const validatedResponse = healthCheckResponseSchema.parse(healthResponse);
    
    // ステータスコード設定
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    logger.info(`✅ Health check complete: ${overallStatus}`);
    res.status(statusCode).json({
      success: true,
      data: validatedResponse
    });
    
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'HealthCheckError',
        message: 'Failed to check system health',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Mastraシステム情報
 */
router.get('/info', async (_req: Request, res: Response): Promise<void> => {
  try {
    const info = {
      name: 'Mastra TRPG AI Agent System',
      version: '1.0.0-alpha',
      description: 'AI Agent-based TRPG Game Master system using Mastra framework',
      capabilities: [
        'AI Game Master dialogue',
        'Natural story guidance', 
        'Exploration system integration',
        'Progressive discovery mechanics',
        'Immersive narrative experience'
      ],
      agents: [
        {
          name: 'Game Master Agent',
          model: 'gemini-1.5-pro',
          purpose: 'Core TRPG game master functionality',
          status: 'active'
        },
        {
          name: 'Companion Agent',
          model: 'gemini-1.5-pro',
          purpose: 'Multiplayer cooperation and companion management',
          status: 'active'
        },
        {
          name: 'Story Progress Agent',
          model: 'gemini-1.5-pro',
          purpose: 'Dynamic content generation and choice management',
          status: 'active'
        },
        {
          name: 'Environment Agent',
          model: 'gemini-1.5-pro',
          purpose: 'Weather, NPC attitudes, and rumor management',
          status: 'active'
        }
      ],
      integration: {
        legacyCompatible: true,
        fallbackEnabled: true,
        hybridMode: true
      },
      documentation: '/docs/機能要件定義/AI_agent機能.md'
    };
    
    logger.info('📋 Mastra system info requested');
    res.json({
      success: true,
      data: info
    });
    
  } catch (error) {
    logger.error('Failed to get system info:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'SystemInfoError',
        message: 'Failed to retrieve system information'
      }
    });
  }
});

/**
 * 利用可能なGeminiモデル一覧取得
 */
router.get('/debug/gemini-models', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        success: false,
        error: {
          type: 'ForbiddenError',
          message: 'Debug endpoints not available in production'
        }
      });
      return;
    }
    
    // 一般的に利用可能なGeminiモデル一覧
    const availableModels = [
      {
        name: 'gemini-1.5-pro',
        description: '高性能な汎用モデル（現在使用中）',
        maxTokens: 2048000,
        contextWindow: 2048000,
        recommended: true
      },
      {
        name: 'gemini-1.5-flash',
        description: '高速レスポンスモデル',
        maxTokens: 1048576,
        contextWindow: 1048576,
        recommended: false
      },
      {
        name: 'gemini-2.0-flash-exp',
        description: 'Gemini 2.0 実験版（高速）',
        maxTokens: 8192,
        contextWindow: 1048576,
        recommended: false,
        experimental: true
      },
      {
        name: 'gemini-2.0-flash-lite',
        description: 'Gemini 2.0 軽量版',
        maxTokens: 8192,
        contextWindow: 1048576,
        recommended: false,
        note: 'テスト対象モデル'
      }
    ];
    
    logger.info('📋 Available Gemini models requested');
    
    res.json({
      success: true,
      data: {
        models: availableModels,
        currentModel: 'gemini-1.5-pro',
        aiSdkVersion: '^1.2.19',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get model list:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'ModelListError',
        message: 'Failed to retrieve model information'
      }
    });
  }
});

/**
 * Geminiモデルテストエンドポイント
 */
router.post('/debug/test-gemini-model', async (req: Request, res: Response): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        success: false,
        error: {
          type: 'ForbiddenError',
          message: 'Debug endpoints not available in production'
        }
      });
      return;
    }
    
    const { model = 'gemini-2.0-flash-lite', message = 'システムテスト: 正常動作確認のため、簡潔に「システム正常」と応答してください。' } = req.body;
    
    logger.info(`🧪 Testing Gemini model: ${model} with message: "${message}"`);
    
    // 動的にモデルを指定してテスト
    const { google } = await import('@ai-sdk/google');
    const testModel = google(model, {
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    });
    
    const { generateText } = await import('ai');
    
    const startTime = Date.now();
    const result = await generateText({
      model: testModel,
      prompt: message,
      maxTokens: 100
    });
    const processingTime = Date.now() - startTime;
    
    logger.info(`✅ ${model} test successful (${processingTime}ms)`);
    
    res.json({
      success: true,
      data: {
        model,
        input: message,
        output: result.text,
        usage: result.usage,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error(`❌ Gemini model test failed:`, error);
    res.status(500).json({
      success: false,
      error: {
        type: 'ModelTestError',
        message: error instanceof Error ? error.message : 'Unknown error',
        modelTested: req.body.model || 'gemini-2.0-flash-lite'
      }
    });
  }
});

/**
 * デバッグ・開発支援エンドポイント
 */
router.post('/debug/test-agent', async (req: Request, res: Response): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        success: false,
        error: {
          type: 'ForbiddenError',
          message: 'Debug endpoints not available in production'
        }
      });
      return;
    }
    
    const testMessage = req.body.message || "テスト: システム正常性確認";
    
    logger.info(`🧪 Testing Mastra GM Agent with message: "${testMessage}"`);
    
    const testResponse = await generateGMResponse({
      playerMessage: testMessage,
      sessionId: 'debug-session',
      locationId: 'debug-location'
    });
    
    res.json({
      success: true,
      data: {
        test: true,
        input: testMessage,
        output: testResponse,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Debug test failed:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'DebugTestError',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

export { router as mastraAgentRouter };