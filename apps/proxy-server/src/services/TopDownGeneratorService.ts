import { 
  AIMilestone, 
  MilestoneGenerationRequest,
  ThemeAdaptation,
  ID
} from '@ai-agent-trpg/types';
import { logger } from '../utils/logger';
import { getAIService } from './aiService';

/**
 * トップダウン生成ロジック専用サービス
 * マイルストーン・エンティティ生成の9段階プロセスを担当
 */
export class TopDownGeneratorService {

  /**
   * テーマ適応の生成
   */
  async generateThemeAdaptation(themeId: ID): Promise<ThemeAdaptation> {
    logger.info('🎨 テーマ適応生成開始', { themeId });

    // シンプルなテーマ適応をフォールバックとして使用
    const isPeacefulTheme = themeId.includes('peaceful') || themeId.includes('daily');
    
    return {
      themeId,
      allowedEntityTypes: isPeacefulTheme 
        ? ['event', 'npc', 'item', 'quest'] 
        : ['enemy', 'event', 'npc', 'item', 'quest'],
      restrictedEntityTypes: isPeacefulTheme ? ['enemy'] : [],
      specializations: [
        {
          entityType: 'event',
          categories: isPeacefulTheme ? ['daily_life', 'social', 'crafting'] : ['combat', 'exploration', 'mystery'],
          examples: ['conversation', 'discovery', 'challenge'],
          generationHints: isPeacefulTheme ? ['Focus on peaceful interactions'] : ['Include action and mystery']
        },
        {
          entityType: 'npc',
          categories: isPeacefulTheme ? ['villager', 'merchant', 'craftsman'] : ['ally', 'rival', 'informant'],
          examples: ['helpful character', 'quest giver', 'information source'],
          generationHints: isPeacefulTheme ? ['Create friendly, approachable characters'] : ['Mix helpful and challenging personalities']
        }
      ],
      contentModifiers: [
        {
          type: 'tone',
          value: isPeacefulTheme ? 'peaceful' : 'adventurous',
          description: isPeacefulTheme ? '平和で穏やかな雰囲気' : '冒険的で挑戦的な雰囲気'
        }
      ]
    };
  }

  /**
   * Phase 1: マイルストーン概要生成
   * テーマとセッション設定に基づいて基本的なマイルストーン構造を生成
   */
  async generateMilestoneOutlines(
    request: MilestoneGenerationRequest,
    themeAdaptation: ThemeAdaptation
  ): Promise<any[]> {
    logger.info('📋 マイルストーン概要生成開始', { milestoneCount: request.milestoneCount });

    const aiService = getAIService();
    
    const allowedTypes = ['特定エネミー討伐', '特定イベントクリア', '特定NPCとの特定コミュニケーション', 'キーアイテム取得', 'クエストクリア'];
    const restrictedTypes = themeAdaptation.restrictedEntityTypes || [];
    const availableTypes = allowedTypes.filter(type => !restrictedTypes.includes(type as any));

    const prompt = `
以下の条件でTRPGマイルストーンの概要を生成してください：

**基本設定:**
- セッション時間: ${request.sessionDuration?.estimatedPlayTime || 60}分
- マイルストーン数: ${request.milestoneCount || 3}個
- テーマ: ${request.themeId}
- 利用可能なマイルストーンタイプ: ${availableTypes.join(', ')}

**マイルストーン概要要件:**
1. 各マイルストーンは3つのエンティティで構成される
2. プレイヤーには進捗を直接表示しない（手探り感重視）
3. 物語的な一貫性を保つ
4. 難易度は段階的に上昇

**出力形式:**
[
  {
    "id": "milestone-1",
    "title": "謎の事件の発端",
    "description": "村で起こった不可解な事件の真相に迫る最初の手がかりを見つける",
    "type": "特定イベントクリア",
    "estimatedDuration": 20,
    "difficulty": "easy"
  }
]

JSON配列のみを返してください。`;

    try {
      const response = await aiService.chat({
        provider: 'google-gemini',
        message: prompt
      });
      const parsed = JSON.parse(response.message);
      
      logger.info('✅ マイルストーン概要生成完了', { 
        generatedCount: parsed.length
      });
      
      return parsed;
    } catch (error) {
      logger.warn('🔄 AI生成失敗、フォールバック使用', { error });
      
      // フォールバック実装
      return Array.from({ length: request.milestoneCount || 3 }, (_, i) => ({
        id: `milestone-${i + 1}`,
        title: `マイルストーン ${i + 1}`,
        description: `テーマ「${request.themeId}」に関連した目標 ${i + 1}`,
        type: availableTypes[i % availableTypes.length],
        estimatedDuration: Math.floor((request.sessionDuration?.estimatedPlayTime || 60) / (request.milestoneCount || 3)),
        difficulty: ['easy', 'medium', 'hard'][i] || 'medium'
      }));
    }
  }

  /**
   * Phase 1.5: マイルストーン関係性定義
   * 各マイルストーン間の依存関係と進行順序を決定
   */
  async defineMilestoneRelations(milestoneOutlines: any[]): Promise<any[]> {
    logger.info('🔗 マイルストーン関係性定義開始');

    const relations = milestoneOutlines.map((milestone, index) => ({
      ...milestone,
      prerequisiteIds: index > 0 ? [milestoneOutlines[index - 1].id] : [],
      unlockConditions: index > 0 ? ['previous_milestone_completion'] : ['session_start'],
      storyConnection: index > 0 ? `${milestoneOutlines[index - 1].title}の結果を受けて` : '物語の開始点として'
    }));

    logger.info('✅ マイルストーン関係性定義完了', { count: relations.length });
    return relations;
  }

  /**
   * Phase 2.1: コアエンティティ要件決定
   * 各マイルストーンに必要なコアエンティティの要件を定義
   */
  async defineCoreEntityRequirements(
    milestoneRelations: any[],
    themeAdaptation: ThemeAdaptation
  ): Promise<any[]> {
    logger.info('🎯 コアエンティティ要件決定開始');

    const requirements = milestoneRelations.map(milestone => ({
      milestoneId: milestone.id,
      requiredEntityTypes: ['event', 'npc', 'item'], // 3エンティティ基本構成
      entityDistribution: {
        event: { count: 1, contribution: 40, role: 'main_action' },
        npc: { count: 1, contribution: 30, role: 'information_source' },
        item: { count: 1, contribution: 30, role: 'evidence_tool' }
      },
      constraints: {
        allowedTypes: themeAdaptation.allowedEntityTypes,
        restrictedTypes: themeAdaptation.restrictedEntityTypes,
        themeCompliance: true
      }
    }));

    logger.info('✅ コアエンティティ要件決定完了', { milestonesProcessed: requirements.length });
    return requirements;
  }

  /**
   * Phase 2.2: コアエンティティ生成
   * マイルストーン達成に必須のエンティティを生成
   */
  async generateCoreEntities(
    coreEntityRequirements: any[],
    request: MilestoneGenerationRequest,
    themeAdaptation: ThemeAdaptation
  ): Promise<any> {
    logger.info('🎲 コアエンティティ生成開始');

    const aiService = getAIService();
    
    const prompt = `
以下の要件でTRPGコアエンティティを生成してください：

**生成要件:**
${JSON.stringify(coreEntityRequirements, null, 2)}

**テーマ適応:**
${JSON.stringify(themeAdaptation, null, 2)}

**出力形式:**
{
  "enemies": [],
  "events": [
    {
      "id": "event-1",
      "name": "血痕の調査",
      "description": "事件現場で発見された血痕を詳しく調べる",
      "milestoneId": "milestone-1",
      "progressContribution": 40,
      "rewards": {
        "experience": 50,
        "information": ["犯人は左利きの可能性"],
        "items": []
      }
    }
  ],
  "npcs": [
    {
      "id": "npc-1", 
      "name": "目撃者のおばあさん",
      "description": "事件の夜に怪しい人影を見たという高齢の女性",
      "milestoneId": "milestone-1",
      "progressContribution": 30,
      "rewards": {
        "experience": 40,
        "information": ["事件当夜の怪しい人影"],
        "relationships": [{"npcId": "witness-001", "change": 20}]
      }
    }
  ],
  "items": [
    {
      "id": "item-1",
      "name": "古い日記",
      "description": "事件に関連する手がかりが書かれた日記",
      "milestoneId": "milestone-1", 
      "progressContribution": 30,
      "rewards": {
        "experience": 30,
        "information": ["重要な日付の記録"],
        "items": [{"name": "証拠の日記", "effect": "情報+1"}]
      }
    }
  ],
  "quests": []
}

JSON形式のみを返してください。`;

    try {
      const response = await aiService.chat({
        provider: 'google-gemini',
        message: prompt
      });
      const parsed = JSON.parse(response.message);
      
      logger.info('✅ コアエンティティ生成完了', {
        enemies: parsed.enemies?.length || 0,
        events: parsed.events?.length || 0,
        npcs: parsed.npcs?.length || 0,
        items: parsed.items?.length || 0,
        quests: parsed.quests?.length || 0
      });
      
      return parsed;
    } catch (error) {
      logger.warn('🔄 AI生成失敗、フォールバック使用', { error });
      
      // フォールバック実装
      return {
        enemies: [],
        events: coreEntityRequirements.map(req => ({
          id: `event-${req.milestoneId}`,
          name: `${req.milestoneId} イベント`,
          description: `マイルストーン ${req.milestoneId} 関連のイベント`,
          milestoneId: req.milestoneId,
          progressContribution: 40,
          rewards: { experience: 50, information: [], items: [] }
        })),
        npcs: coreEntityRequirements.map(req => ({
          id: `npc-${req.milestoneId}`,
          name: `${req.milestoneId} NPC`,
          description: `マイルストーン ${req.milestoneId} 関連のNPC`,
          milestoneId: req.milestoneId,
          progressContribution: 30,
          rewards: { experience: 40, information: [], relationships: [] }
        })),
        items: coreEntityRequirements.map(req => ({
          id: `item-${req.milestoneId}`,
          name: `${req.milestoneId} アイテム`,
          description: `マイルストーン ${req.milestoneId} 関連のアイテム`,
          milestoneId: req.milestoneId,
          progressContribution: 30,
          rewards: { experience: 30, information: [], items: [] }
        })),
        quests: []
      };
    }
  }

  /**
   * Phase 2.3: 追加エンティティ生成
   * 報酬・体験向上系のボーナスエンティティを生成
   */
  async generateBonusEntities(
    request: MilestoneGenerationRequest,
    coreEntities: any
  ): Promise<any> {
    logger.info('🎁 追加エンティティ生成開始');

    const aiService = getAIService();
    
    const prompt = `
以下のコアエンティティに対応する追加報酬エンティティを生成してください：

**コアエンティティ:**
${JSON.stringify(coreEntities, null, 2)}

**追加エンティティ要件:**
1. 実用的報酬エンティティ（実戦に役立つアイテム・装備）
2. トロフィー系エンティティ（収集要素・世界観深化）
3. ミステリー系エンティティ（隠し要素・好奇心満足）

**出力形式:**
{
  "practicalRewards": [
    {
      "id": "practical-1",
      "name": "薬草の発見",
      "description": "治療に使える貴重な薬草を発見",
      "rewards": {
        "items": [
          {"name": "上級治療薬", "effect": "HP+50", "quantity": 3},
          {"name": "魔力回復薬", "effect": "MP+30", "quantity": 2}
        ],
        "experience": 20
      }
    }
  ],
  "trophyItems": [
    {
      "id": "trophy-1",
      "name": "古い人形の発見",
      "description": "村の歴史を感じさせる精巧な人形",
      "rewards": {
        "items": [
          {
            "name": "村娘の人形",
            "effect": "なし",
            "description": "特に効果はないが、村の歴史を感じさせる",
            "category": "trophy"
          }
        ],
        "information": ["村の古い伝統について"],
        "experience": 10
      }
    }
  ],
  "mysteryItems": [
    {
      "id": "mystery-1", 
      "name": "謎めいた老人との遭遇",
      "description": "意味深な言葉を残して去っていく老人",
      "rewards": {
        "items": [
          {
            "name": "謎の石ころ",
            "effect": "なし",
            "description": "『いつか役に立つ』と老人が言っていた普通の石",
            "category": "mystery_item"
          }
        ],
        "information": ["意味深な言葉"],
        "experience": 5
      }
    }
  ]
}

JSON形式のみを返してください。`;

    try {
      const response = await aiService.chat({
        provider: 'google-gemini',
        message: prompt
      });
      const parsed = JSON.parse(response.message);
      
      logger.info('✅ 追加エンティティ生成完了', {
        practicalRewards: parsed.practicalRewards?.length || 0,
        trophyItems: parsed.trophyItems?.length || 0,
        mysteryItems: parsed.mysteryItems?.length || 0
      });
      
      return parsed;
    } catch (error) {
      logger.warn('🔄 AI生成失敗、フォールバック使用', { error });
      
      // フォールバック実装
      return {
        practicalRewards: [
          {
            id: 'practical-fallback',
            name: '便利なアイテム',
            description: 'セッションで役立つアイテム',
            rewards: { items: [{ name: '回復薬', effect: 'HP+30', quantity: 1 }], experience: 15 }
          }
        ],
        trophyItems: [
          {
            id: 'trophy-fallback',
            name: '記念品',
            description: '思い出に残る品物',
            rewards: { items: [{ name: '記念の品', effect: 'なし', category: 'trophy' }], experience: 5 }
          }
        ],
        mysteryItems: [
          {
            id: 'mystery-fallback',
            name: '謎のアイテム',
            description: '正体不明の品物',
            rewards: { items: [{ name: '謎の物体', effect: '不明', category: 'mystery_item' }], experience: 3 }
          }
        ]
      };
    }
  }

  /**
   * Phase 2.4: 場所生成・配置最適化
   * エンティティを場所に適切に配置
   */
  async generateLocationMappings(
    coreEntities: any,
    bonusEntities: any
  ): Promise<any[]> {
    logger.info('📍 場所エンティティマッピング生成開始');

    // シンプルな配置ロジック（実際の実装では場所データベースと連携）
    const mappings = [
      {
        locationId: 'village-center',
        locationName: '村の中央広場',
        coreEntities: [coreEntities.npcs?.[0]?.id].filter(Boolean),
        bonusEntities: [bonusEntities.practicalRewards?.[0]?.id].filter(Boolean),
        timeConditions: ['day_time']
      },
      {
        locationId: 'investigation-site', 
        locationName: '調査現場',
        coreEntities: [coreEntities.events?.[0]?.id].filter(Boolean),
        bonusEntities: [bonusEntities.trophyItems?.[0]?.id].filter(Boolean),
        timeConditions: ['any']
      },
      {
        locationId: 'hidden-location',
        locationName: '隠れた場所',
        coreEntities: [coreEntities.items?.[0]?.id].filter(Boolean),
        bonusEntities: [bonusEntities.mysteryItems?.[0]?.id].filter(Boolean),
        timeConditions: ['night_only'],
        prerequisiteEntities: []
      }
    ];

    logger.info('✅ 場所エンティティマッピング生成完了', { 
      mappingsCount: mappings.length 
    });

    return mappings;
  }

  /**
   * Phase 3.1: マイルストーン詳細化
   * 概要マイルストーンにエンティティ情報を統合して詳細化
   */
  async detailizeMilestones(
    milestoneOutlines: any[],
    coreEntities: any
  ): Promise<AIMilestone[]> {
    logger.info('🔧 マイルストーン詳細化開始');

    const detailedMilestones: AIMilestone[] = milestoneOutlines.map((outline, index) => {
      // 該当するエンティティを特定
      const relatedEvent = coreEntities.events?.find((e: any) => e.milestoneId === outline.id);
      const relatedNPC = coreEntities.npcs?.find((n: any) => n.milestoneId === outline.id);
      const relatedItem = coreEntities.items?.find((i: any) => i.milestoneId === outline.id);

      const targetEntityIds: string[] = [
        relatedEvent?.id,
        relatedNPC?.id,
        relatedItem?.id
      ].filter(Boolean);

      const progressContributions = [
        relatedEvent?.progressContribution || 0,
        relatedNPC?.progressContribution || 0,
        relatedItem?.progressContribution || 0
      ].filter(c => c > 0);

      return {
        id: outline.id,
        campaignId: '', // 後で設定
        sessionId: '', // 後で設定
        title: outline.title,
        description: outline.description,
        type: outline.type,
        targetEntityIds,
        progressContributions,
        targetDetails: [{
          entityId: targetEntityIds[0] || '',
          entityType: 'event',
          specificConditions: outline.title,
          progressContribution: progressContributions[0] || 0
        }],
        status: 'pending' as const,
        progress: 0,
        hiddenFromPlayer: true,
        requiredConditions: outline.prerequisiteIds || [],
        reward: {
          experiencePoints: Math.floor(progressContributions.reduce((sum, c) => sum + c, 0) * 2),
          items: [],
          characterBenefits: {
            skillImprovements: [],
            abilityGains: [],
            relationshipChanges: []
          },
          storyProgression: outline.title
        },
        createdAt: new Date().toISOString(),
        completedAt: undefined
      };
    });

    logger.info('✅ マイルストーン詳細化完了', { 
      milestonesCount: detailedMilestones.length 
    });

    return detailedMilestones;
  }
}

// Lazy initialization
let _topDownGeneratorService: TopDownGeneratorService | null = null;
export function getTopDownGeneratorService(): TopDownGeneratorService {
  if (!_topDownGeneratorService) {
    _topDownGeneratorService = new TopDownGeneratorService();
  }
  return _topDownGeneratorService;
}