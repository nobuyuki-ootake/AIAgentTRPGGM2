import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { getDatabase } from '../database/database';
import { v4 as uuidv4 } from 'uuid';
import { 
  CharacterAISettings,
  CharacterAISettingsResponse, 
  UpdateCharacterAIRequest,
  ActionAnalysis
} from '@ai-agent-trpg/types';

const router = Router();

// リクエストスキーマ定義
const getCharacterAISettingsRequestSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required")
});

const updateCharacterAIRequestSchema = z.object({
  characterId: z.string().min(1, "Character ID is required"),
  actionPriority: z.enum(['attack_focus', 'healing_focus', 'support_focus', 'balanced']).optional(),
  personality: z.enum(['aggressive', 'cautious', 'calm']).optional(),
  communicationStyle: z.enum(['direct', 'polite', 'casual']).optional()
});

/**
 * キャラクターAI設定取得エンドポイント
 * GET /api/character-ai/settings/:sessionId
 */
router.get('/settings/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = getCharacterAISettingsRequestSchema.parse({ sessionId: req.params.sessionId });
    
    logger.info(`🎭 Getting character AI settings for session: ${sessionId}`);
    
    const db = getDatabase();
    
    // セッションのキャラクター一覧を取得（模擬実装）
    const mockCharacters = [
      {
        characterId: 'char_1',
        name: 'エリック',
        class: 'Warrior',
        controlType: 'agent' as const
      },
      {
        characterId: 'char_2', 
        name: 'ルナ',
        class: 'Mage',
        controlType: 'agent' as const
      },
      {
        characterId: 'char_3',
        name: 'シン',
        class: 'Rogue', 
        controlType: 'player' as const
      }
    ];
    
    const charactersWithSettings = [];
    
    for (const character of mockCharacters) {
      // キャラクターのAI設定を取得
      const settingsQuery = db.prepare(`
        SELECT * FROM ai_tactics_settings 
        WHERE session_id = ? AND agent_type = 'character' 
        ORDER BY updated_at DESC 
        LIMIT 1
      `);
      
      const settingsRow = settingsQuery.get(sessionId) as any;
      
      // デフォルト設定
      const defaultSettings: CharacterAISettings = {
        actionPriority: 'balanced',
        personality: 'calm',
        communicationStyle: 'polite'
      };
      
      let settings: CharacterAISettings;
      
      if (settingsRow) {
        try {
          const parsedSettings = JSON.parse(settingsRow.settings);
          settings = {
            actionPriority: parsedSettings.actionPriority || defaultSettings.actionPriority,
            personality: parsedSettings.personality || defaultSettings.personality,
            communicationStyle: parsedSettings.communicationStyle || defaultSettings.communicationStyle
          };
        } catch (error) {
          logger.warn(`Failed to parse settings for character ${character.characterId}, using defaults`);
          settings = defaultSettings;
        }
      } else {
        settings = defaultSettings;
      }
      
      // 最後の行動分析（模擬データ）
      const lastAction: ActionAnalysis = {
        dialogue: generateMockDialogue(character.name, settings, character.class),
        behavior: generateMockBehavior(character.class, settings.actionPriority),
        reasoning: `${settings.actionPriority}優先 + ${settings.personality}性格による判断`,
        appliedSettings: `${settings.actionPriority}/${settings.personality}/${settings.communicationStyle}`,
        timestamp: new Date().toISOString()
      };
      
      charactersWithSettings.push({
        characterId: character.characterId,
        name: character.name,
        class: character.class,
        controlType: character.controlType,
        actionPriority: settings.actionPriority,
        personality: settings.personality,
        communicationStyle: settings.communicationStyle,
        lastAction: character.controlType === 'agent' ? lastAction : undefined
      });
    }
    
    const response: CharacterAISettingsResponse = {
      characters: charactersWithSettings
    };
    
    logger.info(`✅ Retrieved AI settings for ${charactersWithSettings.length} characters`);
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in character AI settings request:', error.issues);
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
    
    logger.error('Failed to get character AI settings:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalError',
        message: 'Failed to retrieve character AI settings'
      }
    });
  }
});

/**
 * キャラクターAI設定更新エンドポイント
 * PUT /api/character-ai/settings/:characterId
 */
router.put('/settings/:characterId', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedRequest = updateCharacterAIRequestSchema.parse(req.body);
    const characterId = req.params.characterId;
    
    const { actionPriority, personality, communicationStyle } = validatedRequest;
    
    logger.info(`🎭 Updating character AI settings for character: ${characterId}`);
    logger.info(`⚙️ New settings: ${JSON.stringify({ actionPriority, personality, communicationStyle })}`);
    
    const db = getDatabase();
    
    // キャラクター情報取得（模擬実装）
    const mockCharacter = {
      characterId,
      name: characterId === 'char_1' ? 'エリック' : characterId === 'char_2' ? 'ルナ' : 'シン',
      class: characterId === 'char_1' ? 'Warrior' : characterId === 'char_2' ? 'Mage' : 'Rogue',
      sessionId: 'session_1' // 実際の実装では、リクエストまたはDBから取得
    };
    
    // 現在の設定を取得
    const currentQuery = db.prepare(`
      SELECT * FROM ai_tactics_settings 
      WHERE session_id = ? AND agent_type = 'character' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    const currentRow = currentQuery.get(mockCharacter.sessionId) as any;
    
    // デフォルト設定
    const defaultSettings: CharacterAISettings = {
      actionPriority: 'balanced',
      personality: 'calm',
      communicationStyle: 'polite'
    };
    
    let currentSettings: CharacterAISettings;
    
    if (currentRow) {
      try {
        currentSettings = JSON.parse(currentRow.settings);
      } catch (error) {
        logger.warn(`Failed to parse current settings, using defaults`);
        currentSettings = defaultSettings;
      }
    } else {
      currentSettings = defaultSettings;
    }
    
    // 設定を更新
    const updatedSettings: CharacterAISettings = {
      actionPriority: actionPriority || currentSettings.actionPriority,
      personality: personality || currentSettings.personality,
      communicationStyle: communicationStyle || currentSettings.communicationStyle
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
      
      logger.info(`✅ Updated existing character AI settings`);
    } else {
      // 新規設定を作成
      const insertQuery = db.prepare(`
        INSERT INTO ai_tactics_settings (id, session_id, agent_type, settings, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      insertQuery.run(
        uuidv4(),
        mockCharacter.sessionId,
        'character',
        JSON.stringify(updatedSettings),
        now,
        now
      );
      
      logger.info(`✅ Created new character AI settings`);
    }
    
    // 更新後の行動分析を生成
    const newActionAnalysis: ActionAnalysis = {
      dialogue: generateMockDialogue(mockCharacter.name, updatedSettings, mockCharacter.class),
      behavior: generateMockBehavior(mockCharacter.class, updatedSettings.actionPriority),
      reasoning: `設定更新により、${updatedSettings.actionPriority}優先 + ${updatedSettings.personality}性格に変更`,
      appliedSettings: `${updatedSettings.actionPriority}/${updatedSettings.personality}/${updatedSettings.communicationStyle}`,
      timestamp: now
    };
    
    logger.info(`🎉 Character AI settings updated successfully: ${updatedSettings.actionPriority}/${updatedSettings.personality}/${updatedSettings.communicationStyle}`);
    
    res.json({
      success: true,
      data: {
        characterId,
        name: mockCharacter.name,
        class: mockCharacter.class,
        updatedSettings,
        newActionAnalysis
      },
      message: 'Character AI settings updated successfully'
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in character AI settings update:', error.issues);
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
    
    logger.error('Failed to update character AI settings:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalError',
        message: 'Failed to update character AI settings'
      }
    });
  }
});

/**
 * キャラクターAI設定リセットエンドポイント
 * POST /api/character-ai/reset/:characterId
 */
router.post('/reset/:characterId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { characterId } = req.params;
    
    logger.info(`🔄 Resetting character AI settings for character: ${characterId}`);
    
    const db = getDatabase();
    
    // デフォルト設定
    const defaultSettings: CharacterAISettings = {
      actionPriority: 'balanced',
      personality: 'calm',
      communicationStyle: 'polite'
    };
    
    // キャラクター情報取得（模擬実装）
    const mockCharacter = {
      characterId,
      name: characterId === 'char_1' ? 'エリック' : characterId === 'char_2' ? 'ルナ' : 'シン',
      class: characterId === 'char_1' ? 'Warrior' : characterId === 'char_2' ? 'Mage' : 'Rogue',
      sessionId: 'session_1'
    };
    
    const now = new Date().toISOString();
    
    // 設定をリセット
    const currentQuery = db.prepare(`
      SELECT * FROM ai_tactics_settings 
      WHERE session_id = ? AND agent_type = 'character' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    const currentRow = currentQuery.get(mockCharacter.sessionId) as any;
    
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
        mockCharacter.sessionId,
        'character',
        JSON.stringify(defaultSettings),
        now,
        now
      );
    }
    
    logger.info(`✅ Character AI settings reset to defaults`);
    
    res.json({
      success: true,
      data: {
        characterId,
        name: mockCharacter.name,
        class: mockCharacter.class,
        resetSettings: defaultSettings
      },
      message: 'Character AI settings reset to defaults'
    });
    
  } catch (error) {
    logger.error('Failed to reset character AI settings:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalError',
        message: 'Failed to reset character AI settings'
      }
    });
  }
});

/**
 * 模擬発話生成
 */
function generateMockDialogue(
  characterName: string,
  settings: CharacterAISettings,
  characterClass: string
): string {
  const { actionPriority, personality, communicationStyle } = settings;
  
  // コミュニケーションスタイルに基づく発話テンプレート
  const dialogueTemplates = {
    direct: {
      aggressive: [`${characterName}: よし、行くぞ！`, `${characterName}: 敵を倒す！`],
      cautious: [`${characterName}: 慎重に行こう`, `${characterName}: 危険だ`],
      calm: [`${characterName}: 状況を確認する`, `${characterName}: 論理的に判断しよう`]
    },
    polite: {
      aggressive: [`${characterName}: 失礼いたします、参ります！`, `${characterName}: 恐れ入りますが、戦闘を開始します`],
      cautious: [`${characterName}: 申し訳ございませんが、慎重に進みませんか？`, `${characterName}: 恐縮ですが、危険かもしれません`],
      calm: [`${characterName}: 状況を整理いたします`, `${characterName}: 適切な判断をいたします`]
    },
    casual: {
      aggressive: [`${characterName}: よーし、やってやる！`, `${characterName}: 行くぜ！`],
      cautious: [`${characterName}: ちょっと危なくない？`, `${characterName}: 気をつけよう`],
      calm: [`${characterName}: まあ、こんなもんかな`, `${characterName}: 冷静に行こう`]
    }
  };
  
  const templates = dialogueTemplates[communicationStyle][personality];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * 模擬行動生成
 */
function generateMockBehavior(characterClass: string, actionPriority: string): string {
  const behaviors = {
    attack_focus: `${characterClass}の特性を活かした攻撃行動`,
    healing_focus: `仲間をサポートする回復・支援行動`,
    support_focus: `情報収集と戦術的優位を確保する補助行動`,
    balanced: `状況に応じた最適な行動選択`
  };
  
  return behaviors[actionPriority as keyof typeof behaviors] || behaviors.balanced;
}

export { router as characterAISettingsRouter };