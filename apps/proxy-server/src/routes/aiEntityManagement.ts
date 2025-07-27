import { Router } from 'express';
import { logger } from '../utils/logger';
import { getAIService } from '../services/aiService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface EntityQueryRequest {
  campaignId: string;
  sessionId?: string;
  entityTypes?: string[];
  locationId?: string;
  filters?: Record<string, any>;
}

interface EntityQueryResult {
  success: boolean;
  entities: any[];
  totalCount: number;
  filters: Record<string, any>;
}

/**
 * エンティティクエリ実行
 * POST /api/ai-entity/query
 */
router.post('/query', async (req, res) => {
  try {
    const request: EntityQueryRequest = req.body;
    logger.info('Entity query request:', request);

    // 現在はモックレスポンスを返す
    // 実際の実装では、データベースからエンティティを取得する
    const mockResult: EntityQueryResult = {
      success: true,
      entities: [],
      totalCount: 0,
      filters: request.filters || {}
    };

    res.json(mockResult);
  } catch (error) {
    logger.error('Failed to query entities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query entities',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * エンティティ生成
 * POST /api/ai-entity/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { campaignId, sessionId, entityType, count = 5, theme = 'クラシックファンタジー' } = req.body;
    logger.info('Entity generation request:', { campaignId, sessionId, entityType, count, theme });

    // AIサービスを使用してエンティティを生成
    const entities = await generateEntitiesWithAI(theme, entityType, count);

    const result = {
      success: true,
      entities,
      generatedCount: entities.length
    };

    res.json(result);
  } catch (error) {
    logger.error('Failed to generate entities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate entities',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * AIを使用してエンティティを生成する
 */
async function generateEntitiesWithAI(theme: string, entityType: string, count: number): Promise<any[]> {
  const aiService = getAIService();
  const entities: any[] = [];

  // 環境変数からAPIキーを取得（Googleをデフォルトに使用）
  const apiKey = process.env.GOOGLE_API_KEY || '';
  if (!apiKey) {
    throw new Error('API key for Google is not configured');
  }

  const prompt = buildEntityGenerationPrompt(theme, entityType, count);

  try {
    if (entityType === 'all') {
      // 全エンティティタイプを一括生成
      const response = await aiService.generateEntityPool({
        provider: 'google',
        apiKey,
        campaignContext: { theme },
        themeAdaptation: { genre: theme },
        sessionDuration: { type: 'short' },
        poolSizes: {
          enemies: Math.ceil(count / 4),
          npcs: Math.ceil(count / 4),
          items: Math.ceil(count / 4),
          events: Math.ceil(count / 4)
        }
      });
      
      // レスポンスからエンティティを抽出
      if (response.generatedEntityPool) {
        const allEntities = [
          ...(response.generatedEntityPool.enemies || []),
          ...(response.generatedEntityPool.npcs || []),
          ...(response.generatedEntityPool.items || []),
          ...(response.generatedEntityPool.events || [])
        ];
        entities.push(...allEntities.map(entity => ({
          id: entity.id || uuidv4(),
          name: entity.name || 'Unknown Entity',
          type: entity.type || entityType,
          description: entity.description || 'No description',
          stats: entity.stats || {},
          properties: entity.properties || {},
          createdAt: new Date().toISOString()
        })));
      }
    } else {
      // 特定タイプのエンティティを生成
      const response = await aiService.chat({
        provider: 'google',
        apiKey,
        message: prompt,
        persona: 'TRPG_ENTITY_GENERATOR',
      });

      // AIレスポンスからエンティティを解析
      const parsedEntities = parseEntityResponse(response.message, entityType);
      entities.push(...parsedEntities);
    }

  } catch (error) {
    logger.error('AI entity generation failed:', error);
    // フォールバック：基本エンティティを生成
    entities.push(...generateFallbackEntities(theme, entityType, count));
  }

  return entities;
}

/**
 * エンティティ生成用のプロンプトを構築
 */
function buildEntityGenerationPrompt(theme: string, entityType: string, count: number): string {
  const basePrompt = `
${theme}テーマのTRPGセッション用に、${entityType}を${count}個生成してください。

## 出力形式（JSON）
以下のJSON形式で回答してください：

\`\`\`json
{
  "entities": [
    {
      "id": "ユニークID",
      "name": "エンティティ名",
      "type": "${entityType}",
      "description": "詳細説明",
      "stats": {},
      "properties": {}
    }
  ]
}
\`\`\`

## ${entityType}生成要件
`;

  switch (entityType) {
    case 'enemy':
      return basePrompt + `
- 挑戦的だが倒せる強さの敵
- ${theme}テーマに適した外見と能力
- HP、攻撃力、防御力などの基本ステータス
- 特殊能力や弱点があれば記載
- レベル1-3程度の初心者向け`;

    case 'npc':
      return basePrompt + `
- プレイヤーと交流可能なキャラクター
- ${theme}テーマに適した職業や立場
- 性格、目標、秘密などの背景設定
- 情報提供やクエスト依頼が可能
- 友好的または中立的な存在`;

    case 'item':
      return basePrompt + `
- プレイヤーが使用可能なアイテム
- ${theme}テーマに適した武器、防具、道具、消耗品
- 効果、価値、入手難易度を記載
- レア度：コモン、アンコモン、レア程度
- 初心者レベルに適した性能`;

    case 'event':
      return basePrompt + `
- セッション中に発生可能なイベント
- ${theme}テーマに適したシチュエーション
- プレイヤーの選択や行動によって結果が変わる
- 報酬や結果を含む
- 探索、社交、謎解き要素を含む`;

    default:
      return basePrompt + `
- ${theme}テーマに適したゲーム要素
- プレイヤーの冒険を豊かにする内容
- バランスの取れた難易度と報酬`;
  }
}

/**
 * AIレスポンスからエンティティを解析
 */
function parseEntityResponse(response: string, entityType: string): any[] {
  try {
    // JSONブロックを抽出
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error('JSON format not found in AI response');
    }

    const jsonData = JSON.parse(jsonMatch[1]);
    if (!jsonData.entities || !Array.isArray(jsonData.entities)) {
      throw new Error('Invalid entities format in AI response');
    }

    return jsonData.entities.map((entity: any) => ({
      id: entity.id || uuidv4(),
      name: entity.name || 'Unknown Entity',
      type: entityType,
      description: entity.description || 'No description',
      stats: entity.stats || {},
      properties: entity.properties || {},
      createdAt: new Date().toISOString()
    }));

  } catch (error) {
    logger.error('Failed to parse entity response:', error);
    throw error;
  }
}

/**
 * フォールバック用の基本エンティティを生成
 */
function generateFallbackEntities(theme: string, entityType: string, count: number): any[] {
  const entities: any[] = [];

  for (let i = 0; i < count; i++) {
    const entity = {
      id: uuidv4(),
      name: `${entityType}_${i + 1}`,
      type: entityType,
      description: `${theme}テーマの${entityType}です。`,
      stats: {},
      properties: {},
      createdAt: new Date().toISOString()
    };

    switch (entityType) {
      case 'enemy':
        entity.stats = { hp: 20, attack: 5, defense: 2 };
        entity.name = `敵${i + 1}`;
        break;
      case 'npc':
        entity.name = `NPC${i + 1}`;
        entity.properties = { disposition: 'neutral' };
        break;
      case 'item':
        entity.name = `アイテム${i + 1}`;
        entity.properties = { rarity: 'common' };
        break;
      case 'event':
        entity.name = `イベント${i + 1}`;
        entity.properties = { trigger: 'exploration' };
        break;
    }

    entities.push(entity);
  }

  return entities;
}

export { router as aiEntityManagementRouter };