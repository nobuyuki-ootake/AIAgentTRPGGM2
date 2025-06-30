import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { getDatabase } from '../database/database';
import { v4 as uuidv4 } from 'uuid';
import { 
  EnemyTacticsLevel, 
  GMTacticsResponse, 
  UpdateTacticsRequest,
  AIDecisionLog
} from '@ai-agent-trpg/types';

const router = Router();

// リクエストスキーマ定義
const getTacticsRequestSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required")
});

const updateTacticsRequestSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  settings: z.object({
    tacticsLevel: z.enum(['basic', 'strategic', 'cunning']).optional(),
    primaryFocus: z.enum(['damage', 'control', 'survival']).optional(),
    teamwork: z.boolean().optional()
  }),
  applyImmediately: z.boolean().default(true)
});

/**
 * GM戦術設定取得エンドポイント
 * GET /api/gm-tactics/settings/:sessionId
 */
router.get('/settings/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = getTacticsRequestSchema.parse({ sessionId: req.params.sessionId });
    
    logger.info(`🎯 Getting GM tactics settings for session: ${sessionId}`);
    
    const db = getDatabase();
    
    // 現在の戦術設定を取得
    const settingsQuery = db.prepare(`
      SELECT * FROM ai_tactics_settings 
      WHERE session_id = ? AND agent_type = 'gm' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    const settingsRow = settingsQuery.get(sessionId) as any;
    
    // デフォルト設定
    const defaultSettings: EnemyTacticsLevel = {
      tacticsLevel: 'strategic',
      primaryFocus: 'damage',
      teamwork: true
    };
    
    let currentSettings: EnemyTacticsLevel;
    
    if (settingsRow) {
      currentSettings = JSON.parse(settingsRow.settings);
      logger.info(`✅ Found existing GM tactics settings: ${currentSettings.tacticsLevel}/${currentSettings.primaryFocus}`);
    } else {
      currentSettings = defaultSettings;
      logger.info(`📝 Using default GM tactics settings`);
    }
    
    // 最近の決定ログを取得（モック実装）
    const recentDecisions: AIDecisionLog[] = [
      {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        decisionType: 'enemy_action',
        context: { situation: 'combat_encounter', playerCount: 3 },
        reasoning: `${currentSettings.tacticsLevel}戦術により、${currentSettings.primaryFocus}重視の行動を選択`,
        appliedTactics: `${currentSettings.tacticsLevel}/${currentSettings.primaryFocus}/${currentSettings.teamwork ? '連携' : '単独'}`
      }
    ];
    
    const response: GMTacticsResponse = {
      sessionId,
      currentSettings,
      recentDecisions
    };
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in GM tactics settings request:', error.issues);
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid request parameters',
          details: error.issues
        }
      });
      return;
    }
    
    logger.error('Failed to get GM tactics settings:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalError',
        message: 'Failed to retrieve GM tactics settings'
      }
    });
  }
});

/**
 * GM戦術設定更新エンドポイント
 * PUT /api/gm-tactics/settings/:sessionId
 */
router.put('/settings/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedRequest = updateTacticsRequestSchema.parse({
      sessionId: req.params.sessionId,
      ...req.body
    });
    
    const { sessionId, settings, applyImmediately } = validatedRequest;
    
    logger.info(`🎯 Updating GM tactics settings for session: ${sessionId}`);
    logger.info(`⚙️ New settings: ${JSON.stringify(settings)}`);
    
    const db = getDatabase();
    
    // 現在の設定を取得
    const currentQuery = db.prepare(`
      SELECT * FROM ai_tactics_settings 
      WHERE session_id = ? AND agent_type = 'gm' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    const currentRow = currentQuery.get(sessionId) as any;
    
    // デフォルト設定
    const defaultSettings: EnemyTacticsLevel = {
      tacticsLevel: 'strategic',
      primaryFocus: 'damage',
      teamwork: true
    };
    
    let currentSettings: EnemyTacticsLevel;
    
    if (currentRow) {
      currentSettings = JSON.parse(currentRow.settings);
    } else {
      currentSettings = defaultSettings;
    }
    
    // 設定を更新
    const updatedSettings: EnemyTacticsLevel = {
      tacticsLevel: settings.tacticsLevel || currentSettings.tacticsLevel,
      primaryFocus: settings.primaryFocus || currentSettings.primaryFocus,
      teamwork: settings.teamwork !== undefined ? settings.teamwork : currentSettings.teamwork
    };
    
    const now = new Date().toISOString();
    
    if (currentRow) {
      // 既存設定を更新
      const updateQuery = db.prepare(`
        UPDATE ai_tactics_settings 
        SET settings = ?, updated_at = ? 
        WHERE id = ?
      `);
      
      updateQuery.run(
        JSON.stringify(updatedSettings),
        now,
        currentRow.id
      );
      
      logger.info(`✅ Updated existing GM tactics settings`);
    } else {
      // 新規設定を作成
      const insertQuery = db.prepare(`
        INSERT INTO ai_tactics_settings (id, session_id, agent_type, settings, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      insertQuery.run(
        uuidv4(),
        sessionId,
        'gm',
        JSON.stringify(updatedSettings),
        now,
        now
      );
      
      logger.info(`✅ Created new GM tactics settings`);
    }
    
    // 決定ログを生成
    const decisionLog: AIDecisionLog = {
      id: uuidv4(),
      timestamp: now,
      decisionType: 'enemy_action',
      context: { 
        settingsUpdate: true, 
        applyImmediately,
        previousSettings: currentSettings,
        newSettings: updatedSettings
      },
      reasoning: `戦術設定が更新されました: ${updatedSettings.tacticsLevel}/${updatedSettings.primaryFocus}/${updatedSettings.teamwork ? '連携' : '単独'}`,
      appliedTactics: `${updatedSettings.tacticsLevel}/${updatedSettings.primaryFocus}/${updatedSettings.teamwork ? '連携' : '単独'}`
    };
    
    const response: GMTacticsResponse = {
      sessionId,
      currentSettings: updatedSettings,
      recentDecisions: [decisionLog]
    };
    
    logger.info(`🎉 GM tactics settings updated successfully: ${updatedSettings.tacticsLevel}/${updatedSettings.primaryFocus}/teamwork:${updatedSettings.teamwork}`);
    
    res.json({
      success: true,
      data: response,
      message: applyImmediately ? 'Settings updated and applied immediately' : 'Settings updated for next action'
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in GM tactics settings update:', error.issues);
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid request format',
          details: error.issues
        }
      });
      return;
    }
    
    logger.error('Failed to update GM tactics settings:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalError',
        message: 'Failed to update GM tactics settings'
      }
    });
  }
});

/**
 * GM決定ログ取得エンドポイント
 * GET /api/gm-tactics/decision-log/:sessionId
 */
router.get('/decision-log/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = getTacticsRequestSchema.parse({ sessionId: req.params.sessionId });
    
    logger.info(`📋 Getting GM decision log for session: ${sessionId}`);
    
    // モック決定ログ（実際の実装では、決定ログテーブルから取得）
    const decisionLogs: AIDecisionLog[] = [
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5分前
        decisionType: 'enemy_targeting',
        context: { 
          enemies: ['ゴブリン', 'オーク'], 
          players: ['戦士', '魔法使い', '盗賊'],
          situation: '戦闘開始'
        },
        reasoning: 'Strategic戦術により、回復役の魔法使いを優先ターゲットに選択',
        appliedTactics: 'strategic/damage/連携'
      },
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 180000).toISOString(), // 3分前
        decisionType: 'enemy_coordination',
        context: { 
          enemyCount: 2, 
          teamwork: true,
          situation: '戦術的配置'
        },
        reasoning: 'チーム連携有効により、ゴブリンが気を引く間にオークが後方攻撃を実行',
        appliedTactics: 'strategic/damage/連携'
      },
      {
        id: uuidv4(),
        timestamp: new Date().toISOString(), // 現在
        decisionType: 'enemy_action',
        context: { 
          currentTurn: 'ゴブリン',
          playerActions: ['魔法詠唱中'],
          situation: '戦闘継続'
        },
        reasoning: 'Control重視設定により、魔法詠唱を妨害する行動を選択',
        appliedTactics: 'strategic/control/連携'
      }
    ];
    
    res.json({
      success: true,
      data: {
        sessionId,
        logs: decisionLogs,
        totalCount: decisionLogs.length
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in GM decision log request:', error.issues);
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid request parameters',
          details: error.issues
        }
      });
      return;
    }
    
    logger.error('Failed to get GM decision log:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalError',
        message: 'Failed to retrieve GM decision log'
      }
    });
  }
});

/**
 * GM戦術設定リセットエンドポイント
 * POST /api/gm-tactics/reset/:sessionId
 */
router.post('/reset/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = getTacticsRequestSchema.parse({ sessionId: req.params.sessionId });
    
    logger.info(`🔄 Resetting GM tactics settings for session: ${sessionId}`);
    
    const db = getDatabase();
    
    // デフォルト設定
    const defaultSettings: EnemyTacticsLevel = {
      tacticsLevel: 'strategic',
      primaryFocus: 'damage',
      teamwork: true
    };
    
    const now = new Date().toISOString();
    
    // 設定をリセット（既存があれば更新、なければ作成）
    const currentQuery = db.prepare(`
      SELECT * FROM ai_tactics_settings 
      WHERE session_id = ? AND agent_type = 'gm' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    const currentRow = currentQuery.get(sessionId) as any;
    
    if (currentRow) {
      const updateQuery = db.prepare(`
        UPDATE ai_tactics_settings 
        SET settings = ?, updated_at = ? 
        WHERE id = ?
      `);
      
      updateQuery.run(
        JSON.stringify(defaultSettings),
        now,
        currentRow.id
      );
    } else {
      const insertQuery = db.prepare(`
        INSERT INTO ai_tactics_settings (id, session_id, agent_type, settings, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      insertQuery.run(
        uuidv4(),
        sessionId,
        'gm',
        JSON.stringify(defaultSettings),
        now,
        now
      );
    }
    
    logger.info(`✅ GM tactics settings reset to defaults`);
    
    const response: GMTacticsResponse = {
      sessionId,
      currentSettings: defaultSettings,
      recentDecisions: []
    };
    
    res.json({
      success: true,
      data: response,
      message: 'GM tactics settings reset to defaults'
    });
    
  } catch (error) {
    logger.error('Failed to reset GM tactics settings:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalError',
        message: 'Failed to reset GM tactics settings'
      }
    });
  }
});

export { router as gmTacticsControlRouter };