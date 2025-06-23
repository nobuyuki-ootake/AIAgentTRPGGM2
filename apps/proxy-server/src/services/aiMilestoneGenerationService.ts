import { Database } from 'better-sqlite3';
import { 
  AIMilestone, 
  EntityPool, 
  EntityPoolCollection,
  MilestoneGenerationRequest,
  MilestoneGenerationResponse,
  ThemeAdaptation,
  SessionDurationConfig,
  ID,
  PoolEnemy,
  InteractiveEvent,
  PoolNPC,
  PoolItem,
  PoolQuest,
  MilestoneType
} from '@ai-agent-trpg/types';
import { getDatabase } from '../database/database';
import { logger } from '../utils/logger';
import { AIServiceError } from '../middleware/errorHandler';
import { getAIService } from './aiService';


export class AIMilestoneGenerationService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
    this.initTables();
  }

  private initTables(): void {
    // AI マイルストーンテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_milestones (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_details TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        progress INTEGER NOT NULL DEFAULT 0,
        required_conditions TEXT NOT NULL DEFAULT '[]',
        reward TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )
    `);

    // エンティティプールテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entity_pools (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        theme_id TEXT NOT NULL,
        entities TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        last_updated TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )
    `);

    // テーマ適応テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS theme_adaptations (
        id TEXT PRIMARY KEY,
        theme_id TEXT NOT NULL,
        allowed_entity_types TEXT NOT NULL,
        restricted_entity_types TEXT NOT NULL,
        specializations TEXT NOT NULL,
        content_modifiers TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // マイルストーン生成履歴テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS milestone_generation_history (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        generation_metadata TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * セッション開始時のマイルストーン・プール生成
   */
  async generateMilestonesAndPools(request: MilestoneGenerationRequest): Promise<MilestoneGenerationResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('🎯 AI マイルストーン生成開始', { 
        campaignId: request.campaignId,
        sessionId: request.sessionId,
        milestoneCount: request.milestoneCount 
      });

      // 1. テーマ適応の決定
      const themeAdaptation = await this.generateThemeAdaptation(request.themeId, request.sessionDuration);

      // 2. エンティティプールの生成
      const entityPool = await this.generateEntityPool(request, themeAdaptation);

      // 3. マイルストーンの生成
      const milestones = await this.generateMilestones(request, entityPool, themeAdaptation);

      // 4. データベースに保存
      await this.saveMilestonesAndPools(milestones, entityPool, themeAdaptation);

      const processingTime = Date.now() - startTime;
      
      const response: MilestoneGenerationResponse = {
        milestones,
        entityPool,
        themeAdaptation,
        generationMetadata: {
          model: 'gpt-3.5-turbo', // TODO: 実際の使用モデルを動的に設定
          prompt: 'AI milestone generation prompt', // TODO: 実際のプロンプトを記録
          tokensUsed: 0, // TODO: トークン使用量を記録
          processingTime,
          generatedAt: new Date().toISOString()
        }
      };

      // 生成履歴を保存
      await this.saveGenerationHistory(request, response);

      logger.info('✅ AI マイルストーン生成完了', { 
        milestonesCount: milestones.length,
        processingTime 
      });

      return response;

    } catch (error) {
      logger.error('❌ AI マイルストーン生成エラー', { error });
      throw new AIServiceError('Failed to generate milestones and pools', 'milestone-generation');
    }
  }

  /**
   * テーマ適応の生成
   */
  private async generateThemeAdaptation(themeId: ID, sessionConfig: SessionDurationConfig): Promise<ThemeAdaptation> {
    const aiService = getAIService();
    const provider = process.env.DEFAULT_AI_PROVIDER || 'openai';
    
    try {
      const campaignContext = { themeId, sessionDuration: sessionConfig };
      
      const result = await aiService.performThemeAdaptation({
        provider,
        themeId,
        campaignContext,
        sessionDuration: sessionConfig,
      });

      // AI生成結果を解析
      const generatedAdaptation = result.generatedThemeAdaptation;
      
      if (generatedAdaptation && typeof generatedAdaptation === 'object' && !generatedAdaptation.rawData) {
        logger.info('✅ AI テーマ適応生成成功', { themeId, provider });
        return generatedAdaptation as ThemeAdaptation;
      }

      // AI生成に失敗した場合はフォールバック
      logger.warn('⚠️ AI テーマ適応生成失敗、フォールバック実行', { themeId });
      return this.createFallbackThemeAdaptation(themeId);

    } catch (error) {
      logger.error('❌ AI テーマ適応生成エラー', { error, themeId });
      return this.createFallbackThemeAdaptation(themeId);
    }
  }

  /**
   * フォールバックテーマ適応生成
   */
  private createFallbackThemeAdaptation(themeId: ID): ThemeAdaptation {
    const ispeacefulTheme = themeId.includes('peaceful') || themeId.includes('daily');
    
    return {
      themeId,
      allowedEntityTypes: ispeacefulTheme 
        ? ['event', 'npc', 'item', 'quest'] 
        : ['enemy', 'event', 'npc', 'item', 'quest'],
      restrictedEntityTypes: ispeacefulTheme ? ['enemy'] : [],
      specializations: [
        {
          entityType: 'event',
          categories: ispeacefulTheme ? ['daily_life', 'social', 'crafting'] : ['combat', 'exploration', 'mystery'],
          examples: ispeacefulTheme ? ['料理コンテスト', '地域祭り', '友人との会話'] : ['洞窟探索', '敵との遭遇', '謎解き'],
          generationHints: ispeacefulTheme ? ['平和的', '協力的', '創造的'] : ['挑戦的', '戦略的', '冒険的']
        }
      ],
      contentModifiers: [
        {
          type: 'tone',
          value: ispeacefulTheme ? 'peaceful' : 'adventurous',
          description: ispeacefulTheme ? '平和で穏やかな雰囲気' : '冒険的で挑戦的な雰囲気'
        }
      ]
    };
  }

  /**
   * エンティティプールの生成
   */
  private async generateEntityPool(
    request: MilestoneGenerationRequest, 
    themeAdaptation: ThemeAdaptation
  ): Promise<EntityPool> {
    const aiService = getAIService();
    const provider = process.env.DEFAULT_AI_PROVIDER || 'openai';
    const poolId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      const campaignContext = { 
        campaignId: request.campaignId,
        sessionId: request.sessionId,
        themeId: request.themeId,
        existingContent: request.existingContent 
      };

      // AIを使ってエンティティプールを生成
      const result = await aiService.generateEntityPool({
        provider,
        campaignContext,
        themeAdaptation,
        sessionDuration: request.sessionDuration,
      });

      // AI生成結果を解析
      const generatedPool = result.generatedEntityPool;
      
      if (generatedPool && typeof generatedPool === 'object' && !generatedPool.rawData) {
        logger.info('✅ AI エンティティプール生成成功', { 
          campaignId: request.campaignId,
          sessionId: request.sessionId,
          provider 
        });
        
        // 生成されたエンティティプールをラップ
        return {
          id: poolId,
          campaignId: request.campaignId,
          sessionId: request.sessionId,
          themeId: request.themeId,
          entities: generatedPool as EntityPoolCollection,
          generatedAt: now,
          lastUpdated: now
        };
      }

      // AI生成に失敗した場合はフォールバック
      logger.warn('⚠️ AI エンティティプール生成失敗、フォールバック実行', { 
        campaignId: request.campaignId 
      });
      return await this.createFallbackEntityPool(request, themeAdaptation);

    } catch (error) {
      logger.error('❌ AI エンティティプール生成エラー', { error, campaignId: request.campaignId });
      return await this.createFallbackEntityPool(request, themeAdaptation);
    }
  }

  /**
   * フォールバックエンティティプール生成
   */
  private async createFallbackEntityPool(
    request: MilestoneGenerationRequest, 
    themeAdaptation: ThemeAdaptation
  ): Promise<EntityPool> {
    const poolId = crypto.randomUUID();
    const now = new Date().toISOString();

    // テーマに基づいてエンティティを生成（フォールバック）
    const enemies = themeAdaptation.allowedEntityTypes.includes('enemy') 
      ? await this.generateEnemies(request, themeAdaptation) 
      : [];
    const events = await this.generateEvents(request, themeAdaptation);
    const npcs = await this.generateNPCs(request, themeAdaptation);
    const items = await this.generateItems(request, themeAdaptation);
    const quests = await this.generateQuests(request, themeAdaptation);

    const entities: EntityPoolCollection = {
      enemies,
      events,
      npcs,
      items,
      quests
    };

    return {
      id: poolId,
      campaignId: request.campaignId,
      sessionId: request.sessionId,
      themeId: request.themeId,
      entities,
      generatedAt: now,
      lastUpdated: now
    };
  }

  /**
   * マイルストーンの生成
   */
  private async generateMilestones(
    request: MilestoneGenerationRequest,
    entityPool: EntityPool,
    themeAdaptation: ThemeAdaptation
  ): Promise<AIMilestone[]> {
    const aiService = getAIService();
    const provider = process.env.DEFAULT_AI_PROVIDER || 'openai';

    try {
      const campaignContext = { 
        campaignId: request.campaignId,
        sessionId: request.sessionId,
        themeId: request.themeId,
        existingContent: request.existingContent 
      };

      // AIを使ってマイルストーンを生成
      const result = await aiService.generateMilestones({
        provider,
        campaignContext,
        sessionDuration: request.sessionDuration,
        themeAdaptation,
        entityPool: entityPool.entities,
        milestoneCount: request.milestoneCount,
      });

      // AI生成結果を解析
      const generatedMilestones = result.generatedMilestones;
      
      if (generatedMilestones && Array.isArray(generatedMilestones)) {
        logger.info('✅ AI マイルストーン生成成功', { 
          campaignId: request.campaignId,
          sessionId: request.sessionId,
          milestonesCount: generatedMilestones.length,
          provider 
        });
        
        // AIで生成されたマイルストーンを正しい型に変換
        return generatedMilestones.map((milestone: any) => this.validateAndFormatMilestone(milestone, request));
      }

      // AI生成に失敗した場合はフォールバック
      logger.warn('⚠️ AI マイルストーン生成失敗、フォールバック実行', { 
        campaignId: request.campaignId 
      });
      return this.createFallbackMilestones(request, entityPool, themeAdaptation);

    } catch (error) {
      logger.error('❌ AI マイルストーン生成エラー', { error, campaignId: request.campaignId });
      return this.createFallbackMilestones(request, entityPool, themeAdaptation);
    }
  }

  /**
   * AIで生成されたマイルストーンを検証・フォーマット
   */
  private validateAndFormatMilestone(aiMilestone: any, request: MilestoneGenerationRequest): AIMilestone {
    const now = new Date().toISOString();
    
    return {
      id: aiMilestone.id || crypto.randomUUID(),
      campaignId: request.campaignId,
      sessionId: request.sessionId,
      title: aiMilestone.title || 'AI生成マイルストーン',
      description: aiMilestone.description || 'AIによって生成されたマイルストーン',
      type: aiMilestone.type || 'event_clear',
      targetId: aiMilestone.targetId || crypto.randomUUID(),
      targetDetails: aiMilestone.targetDetails || {
        entityType: 'event',
        entityId: aiMilestone.targetId || crypto.randomUUID(),
        specificConditions: {}
      },
      status: 'pending',
      progress: 0,
      requiredConditions: aiMilestone.requiredConditions || [],
      reward: aiMilestone.reward || {
        experiencePoints: 100,
        items: [],
        characterBenefits: {},
        storyProgression: `マイルストーン「${aiMilestone.title}」完了`
      },
      createdAt: now
    };
  }

  /**
   * フォールバックマイルストーン生成
   */
  private createFallbackMilestones(
    request: MilestoneGenerationRequest,
    entityPool: EntityPool,
    themeAdaptation: ThemeAdaptation
  ): AIMilestone[] {
    const milestones: AIMilestone[] = [];
    const now = new Date().toISOString();

    // 基本3個程度のマイルストーンを生成（フォールバック）
    const milestoneCount = Math.min(request.milestoneCount, 5); // 最大5個に制限

    for (let i = 0; i < milestoneCount; i++) {
      const milestoneType = this.selectMilestoneType(themeAdaptation);
      const targetEntity = this.selectTargetEntity(milestoneType, entityPool);
      
      if (!targetEntity) continue; // 対象エンティティがない場合はスキップ

      const milestone: AIMilestone = {
        id: crypto.randomUUID(),
        campaignId: request.campaignId,
        sessionId: request.sessionId,
        title: this.generateMilestoneTitle(milestoneType, targetEntity),
        description: this.generateMilestoneDescription(milestoneType, targetEntity),
        type: milestoneType,
        targetId: targetEntity.id,
        targetDetails: {
          entityType: this.getEntityTypeFromMilestoneType(milestoneType),
          entityId: targetEntity.id,
          specificConditions: this.generateSpecificConditions(milestoneType, targetEntity)
        },
        status: 'pending',
        progress: 0,
        requiredConditions: [],
        reward: {
          experiencePoints: this.calculateExperienceReward(milestoneType),
          items: [],
          characterBenefits: {},
          storyProgression: `マイルストーン「${this.generateMilestoneTitle(milestoneType, targetEntity)}」完了`
        },
        createdAt: now
      };

      // マイルストーンターゲットフラグを設定
      this.markEntityAsMilestoneTarget(targetEntity, entityPool);

      milestones.push(milestone);
    }

    return milestones;
  }

  /**
   * マイルストーンタイプの選択（テーマ適応）
   */
  private selectMilestoneType(themeAdaptation: ThemeAdaptation): MilestoneType {
    const availableTypes: MilestoneType[] = [];

    if (themeAdaptation.allowedEntityTypes.includes('enemy')) {
      availableTypes.push('enemy_defeat');
    }
    if (themeAdaptation.allowedEntityTypes.includes('event')) {
      availableTypes.push('event_clear');
    }
    if (themeAdaptation.allowedEntityTypes.includes('npc')) {
      availableTypes.push('npc_communication');
    }
    if (themeAdaptation.allowedEntityTypes.includes('item')) {
      availableTypes.push('item_acquisition');
    }
    if (themeAdaptation.allowedEntityTypes.includes('quest')) {
      availableTypes.push('quest_completion');
    }

    // ランダムに選択
    return availableTypes[Math.floor(Math.random() * availableTypes.length)];
  }

  /**
   * 対象エンティティの選択
   */
  private selectTargetEntity(milestoneType: MilestoneType, entityPool: EntityPool): any | null {
    const entities = entityPool.entities;

    switch (milestoneType) {
      case 'enemy_defeat':
        return entities.enemies.length > 0 ? entities.enemies[Math.floor(Math.random() * entities.enemies.length)] : null;
      case 'event_clear':
        return entities.events.length > 0 ? entities.events[Math.floor(Math.random() * entities.events.length)] : null;
      case 'npc_communication':
        return entities.npcs.length > 0 ? entities.npcs[Math.floor(Math.random() * entities.npcs.length)] : null;
      case 'item_acquisition':
        return entities.items.length > 0 ? entities.items[Math.floor(Math.random() * entities.items.length)] : null;
      case 'quest_completion':
        return entities.quests.length > 0 ? entities.quests[Math.floor(Math.random() * entities.quests.length)] : null;
      default:
        return null;
    }
  }

  /**
   * エネミー生成（仮実装）
   */
  private async generateEnemies(_request: MilestoneGenerationRequest, _themeAdaptation: ThemeAdaptation): Promise<PoolEnemy[]> {
    // TODO: AIを使って実際のエネミーを生成
    return [
      {
        id: crypto.randomUUID(),
        name: 'ゴブリン',
        description: '小柄で狡猾な緑色の怪物',
        level: 1,
        abilities: {
          hitPoints: 20,
          attackPower: 5,
          defense: 2,
          specialAbilities: ['素早い移動'],
          weaknesses: ['光魔法'],
          resistances: ['毒']
        },
        locationIds: [],
        isMilestoneTarget: false,
        rewards: [
          {
            type: 'experience',
            value: 50,
            description: 'ゴブリン討伐の経験値'
          }
        ],
        behavior: {
          aggression: 6,
          intelligence: 4,
          preferredTactics: ['群れでの攻撃', '罠の使用'],
          combatDialogue: ['グルルルル！', 'キィィィ！']
        }
      }
    ];
  }

  /**
   * イベント生成（仮実装）
   */
  private async generateEvents(_request: MilestoneGenerationRequest, _themeAdaptation: ThemeAdaptation): Promise<InteractiveEvent[]> {
    // TODO: AIを使って実際のイベントを生成
    return [
      {
        id: crypto.randomUUID(),
        name: '古い洞窟の探索',
        description: '村の外れにある古い洞窟から不思議な光が漏れている',
        locationIds: [],
        choices: [
          {
            id: crypto.randomUUID(),
            text: '洞窟に入る',
            description: '勇気を出して洞窟の中を調べる',
            requirements: [],
            consequences: []
          },
          {
            id: crypto.randomUUID(),
            text: '村人に相談する',
            description: '一旦村に戻って情報を集める',
            requirements: [],
            consequences: []
          }
        ],
        isMilestoneTarget: false,
        requiredConditions: [],
        outcomes: []
      }
    ];
  }

  /**
   * NPC生成（仮実装）
   */
  private async generateNPCs(_request: MilestoneGenerationRequest, _themeAdaptation: ThemeAdaptation): Promise<PoolNPC[]> {
    // TODO: AIを使って実際のNPCを生成
    return [
      {
        id: crypto.randomUUID(),
        name: '賢者エルウィン',
        description: '古い知識に詳しい村の長老',
        personality: {
          traits: ['知識豊富', '慎重', '親切'],
          goals: ['村の平和', '知識の継承'],
          fears: ['古代の封印が解かれること'],
          motivations: ['若い世代の成長']
        },
        locationIds: [],
        dialoguePatterns: [
          {
            trigger: 'greeting',
            responses: ['こんにちは、若者よ', 'お疲れのようじゃの'],
            mood: 'friendly'
          }
        ],
        communicationConditions: [
          {
            type: 'greeting',
            requiredRelationship: 0,
            availableResponses: ['古い伝説について教えて', '村の歴史を聞く']
          }
        ],
        isMilestoneTarget: false,
        relationshipLevel: 0
      }
    ];
  }

  /**
   * アイテム生成（仮実装）
   */
  private async generateItems(_request: MilestoneGenerationRequest, _themeAdaptation: ThemeAdaptation): Promise<PoolItem[]> {
    // TODO: AIを使って実際のアイテムを生成
    return [
      {
        id: crypto.randomUUID(),
        name: '古代の巻物',
        description: '古代文字で書かれた謎めいた巻物',
        type: 'key_item',
        rarity: 'rare',
        effects: [
          {
            type: 'special',
            magnitude: 0,
            description: '古代の知識を解読できる'
          }
        ],
        acquisitionMethods: [
          {
            type: 'exploration',
            sourceId: crypto.randomUUID(),
            probability: 0.3,
            conditions: ['洞窟の探索']
          }
        ],
        isMilestoneTarget: false,
        value: 1000
      }
    ];
  }

  /**
   * クエスト生成（仮実装）
   */
  private async generateQuests(_request: MilestoneGenerationRequest, _themeAdaptation: ThemeAdaptation): Promise<PoolQuest[]> {
    // TODO: AIを使って実際のクエストを生成
    return [
      {
        id: crypto.randomUUID(),
        title: '失われた村の秘宝',
        description: '村に代々伝わる秘宝が盗まれてしまった。犯人を見つけて秘宝を取り戻せ。',
        type: 'main',
        objectives: [
          {
            id: crypto.randomUUID(),
            description: '手がかりを探す',
            completed: false,
            optional: false,
            progress: 0,
            requirements: []
          }
        ],
        rewards: {
          experience: 200,
          currency: 500,
          items: [],
          storyProgression: ['村の信頼を得る'],
          relationshipChanges: {}
        },
        difficulty: 'medium',
        estimatedTime: 120,
        prerequisites: [],
        isMilestoneTarget: false
      }
    ];
  }

  /**
   * マイルストーンタイトル生成
   */
  private generateMilestoneTitle(type: MilestoneType, entity: any): string {
    switch (type) {
      case 'enemy_defeat':
        return `${entity.name}の討伐`;
      case 'event_clear':
        return `${entity.name}のクリア`;
      case 'npc_communication':
        return `${entity.name}との対話`;
      case 'item_acquisition':
        return `${entity.name}の取得`;
      case 'quest_completion':
        return `${entity.title}の完了`;
      default:
        return 'マイルストーン';
    }
  }

  /**
   * マイルストーン説明生成
   */
  private generateMilestoneDescription(type: MilestoneType, entity: any): string {
    switch (type) {
      case 'enemy_defeat':
        return `${entity.name}を倒してください。${entity.description}`;
      case 'event_clear':
        return `${entity.name}を完了してください。${entity.description}`;
      case 'npc_communication':
        return `${entity.name}と重要な会話を行ってください。${entity.description}`;
      case 'item_acquisition':
        return `${entity.name}を入手してください。${entity.description}`;
      case 'quest_completion':
        return `クエスト「${entity.title}」を完了してください。${entity.description}`;
      default:
        return 'マイルストーンを達成してください。';
    }
  }

  /**
   * エンティティタイプ取得
   */
  private getEntityTypeFromMilestoneType(type: MilestoneType): 'enemy' | 'event' | 'npc' | 'item' | 'quest' {
    switch (type) {
      case 'enemy_defeat': return 'enemy';
      case 'event_clear': return 'event';
      case 'npc_communication': return 'npc';
      case 'item_acquisition': return 'item';
      case 'quest_completion': return 'quest';
      default: return 'event'; // fallback
    }
  }

  /**
   * 特定条件生成
   */
  private generateSpecificConditions(type: MilestoneType, _entity: any): Record<string, any> {
    switch (type) {
      case 'npc_communication':
        return { requiredTopics: ['重要な情報', '村の歴史'] };
      case 'item_acquisition':
        return { requiredQuantity: 1 };
      default:
        return {};
    }
  }

  /**
   * 経験値報酬計算
   */
  private calculateExperienceReward(type: MilestoneType): number {
    const baseRewards: Record<MilestoneType, number> = {
      enemy_defeat: 100,
      event_clear: 75,
      npc_communication: 50,
      item_acquisition: 60,
      quest_completion: 150
    };
    
    return baseRewards[type] || 50;
  }

  /**
   * エンティティをマイルストーンターゲットとしてマーク
   */
  private markEntityAsMilestoneTarget(entity: any, _entityPool: EntityPool): void {
    if (entity && typeof entity === 'object' && 'isMilestoneTarget' in entity) {
      entity.isMilestoneTarget = true;
    }
  }

  /**
   * データベース保存
   */
  private async saveMilestonesAndPools(
    milestones: AIMilestone[], 
    entityPool: EntityPool, 
    themeAdaptation: ThemeAdaptation
  ): Promise<void> {
    // マイルストーンを保存
    const milestoneStmt = this.db.prepare(`
      INSERT INTO ai_milestones (
        id, campaign_id, session_id, title, description, type, target_id,
        target_details, status, progress, required_conditions, reward, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const milestone of milestones) {
      milestoneStmt.run([
        milestone.id,
        milestone.campaignId,
        milestone.sessionId,
        milestone.title,
        milestone.description,
        milestone.type,
        milestone.targetId,
        JSON.stringify(milestone.targetDetails),
        milestone.status,
        milestone.progress,
        JSON.stringify(milestone.requiredConditions),
        JSON.stringify(milestone.reward),
        milestone.createdAt
      ]);
    }

    // エンティティプールを保存
    const poolStmt = this.db.prepare(`
      INSERT INTO entity_pools (
        id, campaign_id, session_id, theme_id, entities, generated_at, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    poolStmt.run([
      entityPool.id,
      entityPool.campaignId,
      entityPool.sessionId,
      entityPool.themeId,
      JSON.stringify(entityPool.entities),
      entityPool.generatedAt,
      entityPool.lastUpdated
    ]);

    // テーマ適応を保存
    const themeStmt = this.db.prepare(`
      INSERT OR REPLACE INTO theme_adaptations (
        id, theme_id, allowed_entity_types, restricted_entity_types,
        specializations, content_modifiers, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    themeStmt.run([
      crypto.randomUUID(),
      themeAdaptation.themeId,
      JSON.stringify(themeAdaptation.allowedEntityTypes),
      JSON.stringify(themeAdaptation.restrictedEntityTypes),
      JSON.stringify(themeAdaptation.specializations),
      JSON.stringify(themeAdaptation.contentModifiers),
      new Date().toISOString()
    ]);
  }

  /**
   * 生成履歴の保存
   */
  private async saveGenerationHistory(
    request: MilestoneGenerationRequest,
    response: MilestoneGenerationResponse
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO milestone_generation_history (
        id, campaign_id, session_id, generation_metadata, generated_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run([
      crypto.randomUUID(),
      request.campaignId,
      request.sessionId,
      JSON.stringify(response.generationMetadata),
      response.generationMetadata.generatedAt
    ]);
  }

  /**
   * キャンペーンのマイルストーン取得
   */
  async getAIMilestonesByCampaign(campaignId: ID): Promise<AIMilestone[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM ai_milestones 
      WHERE campaign_id = ? 
      ORDER BY created_at ASC
    `);
    
    const rows = stmt.all(campaignId) as any[];
    
    return rows.map((row): AIMilestone => ({
      id: row.id,
      campaignId: row.campaign_id,
      sessionId: row.session_id,
      title: row.title,
      description: row.description,
      type: row.type,
      targetId: row.target_id,
      targetDetails: JSON.parse(row.target_details),
      status: row.status,
      progress: row.progress,
      requiredConditions: JSON.parse(row.required_conditions),
      reward: JSON.parse(row.reward),
      createdAt: row.created_at,
      completedAt: row.completed_at
    }));
  }

  /**
   * セッションのエンティティプール取得
   */
  async getEntityPoolBySession(sessionId: ID): Promise<EntityPool | null> {
    const stmt = this.db.prepare('SELECT * FROM entity_pools WHERE session_id = ?');
    const row = stmt.get(sessionId) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      campaignId: row.campaign_id,
      sessionId: row.session_id,
      themeId: row.theme_id,
      entities: JSON.parse(row.entities),
      generatedAt: row.generated_at,
      lastUpdated: row.last_updated
    };
  }

  /**
   * マイルストーン進捗更新
   */
  async updateMilestoneProgress(milestoneId: ID, progress: number, status?: 'pending' | 'in_progress' | 'completed'): Promise<void> {
    const updates: string[] = ['progress = ?'];
    const values: any[] = [progress];

    if (status) {
      updates.push('status = ?');
      values.push(status);
      
      if (status === 'completed') {
        updates.push('completed_at = ?');
        values.push(new Date().toISOString());
      }
    }

    values.push(milestoneId);

    const stmt = this.db.prepare(`
      UPDATE ai_milestones SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(values);
  }
}

// Lazy initialization
let _aiMilestoneGenerationService: AIMilestoneGenerationService | null = null;
export function getAIMilestoneGenerationService(): AIMilestoneGenerationService {
  if (!_aiMilestoneGenerationService) {
    _aiMilestoneGenerationService = new AIMilestoneGenerationService();
  }
  return _aiMilestoneGenerationService;
}