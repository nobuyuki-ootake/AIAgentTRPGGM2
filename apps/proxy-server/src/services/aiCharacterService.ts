import { 
  AIDecisionContext, 
  Character,
  NPCCharacter,
  EnemyCharacter,
  ID,
  isNPCCharacter,
  isEnemyCharacter
} from '@ai-agent-trpg/types';

// Temporary type definitions for missing types
type AIAction = any;
type AIBehaviorPattern = any;
type AICharacterController = any;
type AISessionController = any;

// Extended context type for internal use (contains more detailed information)
interface ExtendedAIDecisionContext extends AIDecisionContext {
  sessionId?: string;
  sessionState?: any;
  characterState?: any;
  environmentContext?: any;
  relationshipContext?: any;
  gameContext?: any;
}
import { database } from '../database/database';
import { v4 as uuidv4 } from 'uuid';
import { getAIService } from './aiService';

class AICharacterService {
  private sessionControllers: Map<ID, AISessionController> = new Map();
  private characterControllers: Map<ID, AICharacterController> = new Map();
  private behaviorPatterns: Map<ID, AIBehaviorPattern> = new Map();

  constructor() {
    this.initializeDefaultBehaviorPatterns();
  }

  // ==========================================
  // セッション制御管理
  // ==========================================

  /**
   * セッション用AIコントローラーを初期化
   */
  async initializeSessionController(
    sessionId: ID, 
    characters: Character[], 
    settings?: Partial<AISessionController['sessionSettings']>
  ): Promise<AISessionController> {
    const defaultSettings = {
      aiAutomationLevel: 'moderate' as const,
      gmInterventionMode: 'reactive' as const,
      pacingControl: false,
      narrativeAssistance: true,
    };

    const sessionController: AISessionController = {
      sessionId,
      sessionSettings: { ...defaultSettings, ...settings },
      characterControllers: {},
      progressionControl: {
        autoAdvanceEvents: false,
        suggestionSystem: true,
        conflictResolution: 'suggest',
        moodTracking: true,
      },
      performance: {
        actionsPerMinute: 0,
        averageResponseTime: 0,
        playerSatisfaction: 0,
        gmWorkloadReduction: 0,
      },
    };

    // NPCとEnemyキャラクターにコントローラーを設定
    for (const character of characters) {
      if (character.characterType === 'NPC' || character.characterType === 'Enemy') {
        const controller = await this.createCharacterController(character);
        sessionController.characterControllers[character.id] = controller;
        this.characterControllers.set(character.id, controller);
      }
    }

    this.sessionControllers.set(sessionId, sessionController);
    return sessionController;
  }

  /**
   * キャラクター個別のAIコントローラーを作成
   */
  async createCharacterController(character: Character): Promise<AICharacterController> {
    let autonomyLevel: 'manual' | 'assisted' | 'autonomous' = 'assisted';
    let activeBehaviorPatterns: ID[] = [];

    // キャラクタータイプに応じた設定
    if (isNPCCharacter(character) && character.npcData) {
      autonomyLevel = character.npcData.aiPersonality?.autonomyLevel || 'assisted';
      activeBehaviorPatterns = this.getRelevantBehaviorPatterns(character, 'NPC');
    } else if (isEnemyCharacter(character) && character.enemyData) {
      autonomyLevel = character.enemyData.combat?.aiCombatBehavior?.autonomyLevel || 'assisted';
      activeBehaviorPatterns = this.getRelevantBehaviorPatterns(character, 'Enemy');
    }

    const controller: AICharacterController = {
      characterId: character.id,
      settings: {
        enabled: autonomyLevel !== 'manual',
        autonomyLevel,
        interventionThreshold: 0.3,
        responseDelay: 2, // 2秒遅延
        randomness: 0.2,
      },
      activeBehaviorPatterns,
      learningData: {
        successfulActions: [],
        failedActions: [],
        playerFeedback: [],
        adaptiveWeights: {},
      },
      currentState: {
        pendingActions: [],
      },
    };

    return controller;
  }

  // ==========================================
  // AI行動決定エンジン
  // ==========================================

  /**
   * キャラクターの次の行動を決定
   */
  async decideCharacterAction(
    characterId: ID,
    decisionContext: ExtendedAIDecisionContext
  ): Promise<AIAction | null> {
    const controller = this.characterControllers.get(characterId);
    if (!controller || !controller.settings.enabled) {
      return null;
    }

    try {
      // 行動パターンを評価
      const relevantPatterns = await this.evaluateRelevantPatterns(
        characterId,
        decisionContext,
        controller.activeBehaviorPatterns
      );

      if (relevantPatterns.length === 0) {
        return null;
      }

      // 最適な行動を選択
      const selectedAction = await this.selectBestAction(
        characterId,
        decisionContext,
        relevantPatterns,
        controller
      );

      if (selectedAction) {
        // アクションを記録
        controller.currentState.pendingActions.push(selectedAction);
        controller.currentState.lastDecision = new Date().toISOString();
        
        return selectedAction;
      }

      return null;
    } catch (error) {
      console.error(`AI decision error for character ${characterId}:`, error);
      return null;
    }
  }

  /**
   * 関連する行動パターンを評価
   */
  private async evaluateRelevantPatterns(
    _characterId: ID,
    context: ExtendedAIDecisionContext,
    activePatternsIds: ID[]
  ): Promise<AIBehaviorPattern[]> {
    const relevantPatterns: AIBehaviorPattern[] = [];

    for (const patternId of activePatternsIds) {
      const pattern = this.behaviorPatterns.get(patternId);
      if (!pattern) continue;

      // 条件評価
      if (this.evaluatePatternConditions(pattern, context)) {
        relevantPatterns.push(pattern);
      }
    }

    // 優先度でソート
    return relevantPatterns.sort((a, b) => 
      b.behaviorRules.priority - a.behaviorRules.priority
    );
  }

  /**
   * パターンの適用条件を評価
   */
  private evaluatePatternConditions(
    pattern: AIBehaviorPattern,
    context: ExtendedAIDecisionContext
  ): boolean {
    const { conditions } = pattern;

    // セッションモード確認
    if (!conditions.sessionModes.includes(context.sessionState.mode)) {
      return false;
    }

    // HP閾値確認
    if (conditions.healthThresholds) {
      const hpPercent = (context.characterState.currentHP / context.characterState.maxHP) * 100;
      if (conditions.healthThresholds.min && hpPercent < conditions.healthThresholds.min) {
        return false;
      }
      if (conditions.healthThresholds.max && hpPercent > conditions.healthThresholds.max) {
        return false;
      }
    }

    // コンテキストトリガー確認（今後実装）

    return true;
  }

  /**
   * 最適な行動を選択
   */
  private async selectBestAction(
    characterId: ID,
    context: ExtendedAIDecisionContext,
    patterns: AIBehaviorPattern[],
    controller: AICharacterController
  ): Promise<AIAction | null> {
    // 各パターンから行動候補を収集
    const actionCandidates: Array<{
      pattern: AIBehaviorPattern;
      action: AIBehaviorPattern['behaviorRules']['actions'][0];
      weight: number;
    }> = [];

    for (const pattern of patterns) {
      for (const action of pattern.behaviorRules.actions) {
        let adjustedWeight = action.weight;
        
        // 学習データに基づく重み調整
        const adaptiveWeight = controller.learningData.adaptiveWeights[action.type];
        if (adaptiveWeight !== undefined) {
          adjustedWeight *= adaptiveWeight;
        }

        actionCandidates.push({
          pattern,
          action,
          weight: adjustedWeight,
        });
      }
    }

    if (actionCandidates.length === 0) {
      return null;
    }

    // 重み付き選択
    const totalWeight = actionCandidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let random = Math.random() * totalWeight;

    for (const candidate of actionCandidates) {
      random -= candidate.weight;
      if (random <= 0) {
        return await this.createAIAction(characterId, context, candidate);
      }
    }

    // フォールバック：最初の候補を選択
    return await this.createAIAction(characterId, context, actionCandidates[0]);
  }

  /**
   * AIActionオブジェクトを作成
   */
  private async createAIAction(
    characterId: ID,
    context: ExtendedAIDecisionContext,
    candidate: {
      pattern: AIBehaviorPattern;
      action: AIBehaviorPattern['behaviorRules']['actions'][0];
      weight: number;
    }
  ): Promise<AIAction> {
    const { pattern, action } = candidate;
    
    // AI生成による具体的な行動内容を生成
    const actionContent = await this.generateActionContent(
      characterId,
      context,
      action
    );

    const aiAction: AIAction = {
      id: uuidv4(),
      characterId,
      type: action.type,
      details: {
        description: actionContent.description,
        target: actionContent.target,
        parameters: actionContent.parameters,
      },
      context: {
        sessionId: context.sessionId,
        round: context.sessionState.round,
        turn: context.sessionState.turn,
        sessionMode: context.sessionState.mode,
        currentEvent: context.sessionState.activeEvent,
        triggerReason: `Pattern: ${pattern.name}`,
      },
      aiDecision: {
        confidence: actionContent.confidence,
        reasoning: actionContent.reasoning,
        alternativeOptions: actionContent.alternatives,
        personalityFactors: actionContent.personalityFactors,
      },
      timestamp: new Date().toISOString(),
    };

    return aiAction;
  }

  /**
   * AI生成による行動内容の詳細化
   */
  private async generateActionContent(
    characterId: ID,
    context: ExtendedAIDecisionContext,
    actionTemplate: AIBehaviorPattern['behaviorRules']['actions'][0]
  ): Promise<{
    description: string;
    target?: ID;
    parameters: Record<string, any>;
    confidence: number;
    reasoning: string;
    alternatives: string[];
    personalityFactors: string[];
  }> {
    try {
      // キャラクター情報を取得
      const character = await this.getCharacterById(characterId);
      if (!character) {
        throw new Error(`Character ${characterId} not found`);
      }

      // AI生成プロンプトを構築
      const prompt = this.buildActionGenerationPrompt(
        character,
        context,
        actionTemplate
      );

      // AI サービスを呼び出し
      const aiService = getAIService();
      const response = await aiService.generateNPCBehavior({
        provider: 'openai', // デフォルトプロバイダー
        apiKey: '', // 環境変数から取得される（aiService内部で処理）
        npcId: characterId,
        npcData: character,
        situation: prompt,
        campaignContext: {
          sessionId: context.sessionId,
          actionType: actionTemplate.type,
        },
      });
      
      const aiResponse = response.behavior;

      // レスポンスを解析
      return this.parseActionGenerationResponse(aiResponse, context);
    } catch (error) {
      console.error('Action generation error:', error);
      
      // フォールバック：テンプレートから基本的な行動を生成
      return this.generateFallbackAction(actionTemplate, context);
    }
  }

  /**
   * AI生成用プロンプトを構築
   */
  private buildActionGenerationPrompt(
    character: Character,
    context: ExtendedAIDecisionContext,
    actionTemplate: AIBehaviorPattern['behaviorRules']['actions'][0]
  ): string {
    let personalityInfo = '';
    
    if (isNPCCharacter(character)) {
      const npc = character as NPCCharacter;
      if (npc.npcData) {
        personalityInfo = `
性格特性: ${npc.npcData.aiPersonality?.traits?.join(', ') || '不明'}
目標: ${npc.npcData.aiPersonality?.goals?.join(', ') || '不明'}
動機: ${npc.npcData.aiPersonality?.motivations?.join(', ') || '不明'}
恐れ: ${npc.npcData.aiPersonality?.fears?.join(', ') || '不明'}
性向: ${npc.npcData.disposition || '不明'}
職業: ${npc.npcData.occupation || '不明'}
`;
      }
    } else if (isEnemyCharacter(character)) {
      const enemy = character as EnemyCharacter;
      if (enemy.enemyData) {
        personalityInfo = `
敵カテゴリ: ${enemy.enemyData.category || '不明'}
戦闘戦術: ${enemy.enemyData.combat?.tactics?.join(', ') || '不明'}
攻撃性: ${enemy.enemyData.combat?.aiCombatBehavior?.aggression || 5}/10
知能: ${enemy.enemyData.combat?.aiCombatBehavior?.intelligence || 5}/10
チームワーク: ${enemy.enemyData.combat?.aiCombatBehavior?.teamwork || 5}/10
`;
      }
    }

    return `
あなたはTRPGセッションでAI制御されているキャラクター「${character.name}」です。

【キャラクター情報】
名前: ${character.name}
説明: ${character.description}
レベル: ${character.level}
現在HP: ${context.characterState.currentHP}/${context.characterState.maxHP}
${personalityInfo}

【現在の状況】
セッションモード: ${context.sessionState.mode}
場所: ${context.environmentContext.location}
周囲のキャラクター: ${context.environmentContext.presentCharacters.length}名
現在のムード: ${context.characterState.mood || '通常'}

【指定されたアクションタイプ】
${actionTemplate.type}

【要求】
上記の状況とキャラクター設定に基づいて、以下のJSON形式で具体的な行動を生成してください：

{
  "description": "キャラクターが取る具体的な行動の詳細な説明",
  "target": "対象となるキャラクターID（該当する場合）",
  "parameters": {},
  "confidence": 0.8,
  "reasoning": "この行動を選んだ理由",
  "alternatives": ["別の選択肢1", "別の選択肢2"],
  "personalityFactors": ["影響した性格要因1", "影響した性格要因2"]
}

※キャラクターの性格と状況に忠実に、自然で魅力的な行動を生成してください。
`;
  }

  /**
   * AI生成レスポンスを解析
   */
  private parseActionGenerationResponse(
    response: string,
    context: ExtendedAIDecisionContext
  ): {
    description: string;
    target?: ID;
    parameters: Record<string, any>;
    confidence: number;
    reasoning: string;
    alternatives: string[];
    personalityFactors: string[];
  } {
    try {
      const parsed = JSON.parse(response);
      return {
        description: parsed.description || 'AI生成された行動',
        target: parsed.target,
        parameters: parsed.parameters || {},
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        reasoning: parsed.reasoning || 'AI判断による行動',
        alternatives: parsed.alternatives || [],
        personalityFactors: parsed.personalityFactors || [],
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.generateFallbackAction({ type: 'dialogue', weight: 1 }, context);
    }
  }

  /**
   * フォールバック行動生成
   */
  private generateFallbackAction(
    actionTemplate: { type: string; weight: number },
    _context: ExtendedAIDecisionContext
  ): {
    description: string;
    target?: ID;
    parameters: Record<string, any>;
    confidence: number;
    reasoning: string;
    alternatives: string[];
    personalityFactors: string[];
  } {
    const fallbackActions: Record<string, string> = {
      dialogue: '周囲の状況を観察し、適切なタイミングで発言する',
      movement: '戦術的に有利な位置に移動する',
      combat: '最も脅威度の高い敵を攻撃する',
      interaction: '周囲のオブジェクトや環境と相互作用する',
      skill_use: '状況に応じて適切なスキルを使用する',
      spell_cast: '戦略的に呪文を詠唱する',
    };

    return {
      description: fallbackActions[actionTemplate.type] || '状況に応じた行動を取る',
      parameters: {},
      confidence: 0.3,
      reasoning: 'フォールバック行動による基本的な判断',
      alternatives: ['待機', '様子見'],
      personalityFactors: ['基本的な行動パターン'],
    };
  }

  // ==========================================
  // 行動実行とフィードバック
  // ==========================================

  /**
   * AI行動を実行
   */
  async executeAIAction(actionId: ID): Promise<boolean> {
    try {
      // アクション詳細を取得
      const action = await this.getAIActionById(actionId);
      if (!action) {
        return false;
      }

      // 実行時刻を記録
      action.executedAt = new Date().toISOString();
      
      // データベースに保存
      await this.saveAIAction(action);

      // コントローラーの状態を更新
      const controller = this.characterControllers.get(action.characterId);
      if (controller) {
        controller.currentState.pendingActions = 
          controller.currentState.pendingActions.filter((a: any) => a.id !== actionId);
      }

      return true;
    } catch (error) {
      console.error(`Failed to execute AI action ${actionId}:`, error);
      return false;
    }
  }

  /**
   * 行動に対するフィードバックを記録
   */
  async recordActionFeedback(
    actionId: ID,
    rating: number,
    comment?: string
  ): Promise<void> {
    const action = await this.getAIActionById(actionId);
    if (!action) return;

    const controller = this.characterControllers.get(action.characterId);
    if (!controller) return;

    // フィードバックを記録
    controller.learningData.playerFeedback.push({
      actionId,
      rating,
      comment,
    });

    // 学習重みを調整
    const actionType = action.type;
    const currentWeight = controller.learningData.adaptiveWeights[actionType] || 1.0;
    const adjustment = (rating - 3) * 0.1; // 1-5評価を-0.2〜+0.2の調整に変換
    controller.learningData.adaptiveWeights[actionType] = 
      Math.max(0.1, Math.min(2.0, currentWeight + adjustment));

    // 成功/失敗リストに追加
    if (rating >= 4) {
      controller.learningData.successfulActions.push(action);
    } else if (rating <= 2) {
      controller.learningData.failedActions.push(action);
    }
  }

  // ==========================================
  // データアクセス層
  // ==========================================

  private async getCharacterById(characterId: ID): Promise<Character | null> {
    try {
      const row = database.prepare('SELECT * FROM characters WHERE id = ?').get(characterId) as any;
      if (!row) return null;

      // キャラクター型に変換（実装は既存のキャラクターサービスを参照）
      return this.rowToCharacter(row);
    } catch (error) {
      console.error(`Failed to get character ${characterId}:`, error);
      return null;
    }
  }

  private async saveAIAction(action: AIAction): Promise<void> {
    database.prepare(`
      INSERT OR REPLACE INTO ai_actions (
        id, character_id, type, subtype, details, context, ai_decision,
        timestamp, executed_at, duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      action.id,
      action.characterId,
      action.type,
      action.subtype,
      JSON.stringify(action.details),
      JSON.stringify(action.context),
      JSON.stringify(action.aiDecision),
      action.timestamp,
      action.executedAt,
      action.duration
    );
  }

  private async getAIActionById(actionId: ID): Promise<AIAction | null> {
    try {
      const row = database.prepare('SELECT * FROM ai_actions WHERE id = ?').get(actionId) as any;
      return row ? this.rowToAIAction(row) : null;
    } catch (error) {
      console.error(`Failed to get AI action ${actionId}:`, error);
      return null;
    }
  }

  // ==========================================
  // 初期化とデフォルト設定
  // ==========================================

  /**
   * デフォルトの行動パターンを初期化
   */
  private initializeDefaultBehaviorPatterns(): void {
    // 友好的NPC対話パターン
    this.behaviorPatterns.set('friendly_npc_dialogue', {
      id: 'friendly_npc_dialogue',
      name: '友好的NPC対話',
      description: '友好的なNPCの基本的な対話行動',
      conditions: {
        characterTypes: ['NPC'],
        sessionModes: ['exploration', 'social'],
        relationship: { withPCs: 'friendly' },
        contextTriggers: ['greeting', 'question', 'help_request'],
      },
      behaviorRules: {
        priority: 7,
        frequency: 'often',
        actions: [
          {
            type: 'dialogue',
            weight: 10,
            templates: [
              'こんにちは！何かお手伝いできることはありますか？',
              '今日はいい天気ですね。',
              'この辺りで何かお探しですか？',
            ],
          },
        ],
      },
    });

    // 戦闘中の敵行動パターン
    this.behaviorPatterns.set('combat_enemy_aggressive', {
      id: 'combat_enemy_aggressive',
      name: '攻撃的戦闘行動',
      description: '戦闘中の基本的な攻撃行動',
      conditions: {
        characterTypes: ['Enemy'],
        sessionModes: ['combat'],
        contextTriggers: ['combat_start', 'turn_start'],
      },
      behaviorRules: {
        priority: 9,
        frequency: 'always',
        actions: [
          {
            type: 'combat',
            weight: 15,
            templates: [
              '最も近い敵に向かって攻撃する',
              '最も脅威度の高い敵を狙う',
              '弱っている敵に集中攻撃する',
            ],
          },
          {
            type: 'dialogue',
            weight: 3,
            templates: [
              'この程度か！',
              '覚悟しろ！',
              'まだまだだな！',
            ],
          },
        ],
      },
    });

    // 追加のパターン...（必要に応じて拡張）
  }

  /**
   * キャラクタータイプに関連する行動パターンIDを取得
   */
  private getRelevantBehaviorPatterns(_character: Character, type: 'NPC' | 'Enemy'): ID[] {
    const relevantPatterns: ID[] = [];

    for (const [id, pattern] of this.behaviorPatterns) {
      if (pattern.conditions.characterTypes.includes(type)) {
        relevantPatterns.push(id);
      }
    }

    return relevantPatterns;
  }

  /**
   * データベース行をキャラクターオブジェクトに変換
   */
  private rowToCharacter(row: any): Character {
    // 基本的なキャラクター変換（完全な実装は後で追加）
    const baseStats = row.base_stats ? JSON.parse(row.base_stats) : {
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10
    };
    
    const derivedStats = row.derived_stats ? JSON.parse(row.derived_stats) : {
      hitPoints: 100, maxHitPoints: 100, magicPoints: 50, maxMagicPoints: 50,
      armorClass: 10, initiative: 0, speed: 30
    };

    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      age: row.age || 25,
      race: row.race || 'Human',
      characterClass: row.class || 'Fighter',
      level: row.level || 1,
      experience: row.experience || 0,
      characterType: row.character_type,
      campaignId: row.session_id || '', // Add missing campaignId
      baseStats,
      derivedStats,
      skills: row.skills ? JSON.parse(row.skills) : [],
      feats: row.feats ? JSON.parse(row.feats) : [],
      equipment: row.equipment ? JSON.parse(row.equipment) : {
        weapon: null, armor: null, shield: null, accessories: [], inventory: [],
        totalWeight: 0, carryingCapacity: 100
      },
      statusEffects: row.status_effects ? JSON.parse(row.status_effects) : [],
      appearance: row.appearance ? JSON.parse(row.appearance) : {
        height: '170cm', weight: '70kg', eyeColor: 'brown', hairColor: 'brown',
        skinColor: 'medium', distinguishingFeatures: ''
      },
      background: row.background ? JSON.parse(row.background) : {
        backstory: '', personality: '', ideals: '', bonds: '', flaws: '',
        languages: ['Common'], proficiencies: []
      },
      locationHistory: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // タイプ固有データ（NPCとEnemyの場合）
      ...(row.character_type === 'NPC' && {
        npcData: row.character_data ? JSON.parse(row.character_data) : {
          importance: 'minor',
          disposition: 'neutral',
          occupation: 'Villager',
          location: 'Village',
          aiPersonality: {
            traits: ['friendly'],
            goals: ['help_adventurers'],
            motivations: ['community'],
            fears: ['monsters'],
            autonomyLevel: 'assisted',
            decisionMaking: { aggressiveness: 0, curiosity: 5, loyalty: 5, rationality: 5, sociability: 7 },
            actionPriorities: { self_preservation: 8, goal_achievement: 5, relationship_maintenance: 7, information_gathering: 3, conflict_avoidance: 8 },
            responsePatterns: { greetings: ['こんにちは'], farewells: ['さようなら'], agreements: ['はい'], disagreements: ['いいえ'], questions: ['？'], combat_taunts: [], help_requests: ['助けて'], thank_you: ['ありがとう'] },
            relationships: {}
          },
          storyRole: { questInvolvement: [], plotHooks: [], secrets: [], information: [] },
          memory: { interactions: [], relationshipChanges: [] }
        }
      }),
      ...(row.character_type === 'Enemy' && {
        enemyData: row.character_data ? JSON.parse(row.character_data) : {
          category: 'minion',
          challengeRating: 1,
          encounterLevel: 1,
          combat: {
            tactics: ['basic_attack'],
            specialAbilities: [],
            weaknesses: [],
            resistances: [],
            immunities: [],
            aiCombatBehavior: {
              autonomyLevel: 'autonomous',
              aggression: 7,
              intelligence: 3,
              teamwork: 2,
              preservation: 5,
              preferredTargets: ['closest'],
              combatDialogue: { battle_start: ['戦え！'], taking_damage: ['ぐっ！'], dealing_damage: ['やったぞ！'], low_health: ['まずい...'], victory: ['勝った！'], defeat: ['やられた...'] },
              tacticalDecisions: { retreat_threshold: 25, ability_usage_strategy: 'balanced', positioning_preference: 'front', focus_fire: false }
            }
          },
          encounter: { environment: ['any'], companions: [], tactics: 'attack', escapeThreshold: 20, morale: 5 },
          loot: { experience: 100, currency: 10, items: [] }
        }
      }),
      ...(row.character_type === 'PC' && {
        playerId: undefined,
        growth: { levelUpHistory: [], nextLevelExp: 1000, unspentSkillPoints: 0, unspentFeatPoints: 0 },
        party: { role: 'dps', position: 'middle', leadership: false },
        playerNotes: '',
        gmNotes: ''
      })
    } as Character;
  }

  /**
   * データベース行をAIActionオブジェクトに変換
   */
  private rowToAIAction(row: any): AIAction {
    return {
      id: row.id,
      characterId: row.character_id,
      type: row.type,
      subtype: row.subtype,
      details: JSON.parse(row.details),
      context: JSON.parse(row.context),
      aiDecision: JSON.parse(row.ai_decision),
      timestamp: row.timestamp,
      executedAt: row.executed_at,
      duration: row.duration,
    };
  }

  // ==========================================
  // パブリックAPI
  // ==========================================

  /**
   * セッション開始時にAI制御を開始
   */
  async startAIControlForSession(
    sessionId: ID,
    characters: Character[],
    settings?: Partial<AISessionController['sessionSettings']>
  ): Promise<AISessionController> {
    return await this.initializeSessionController(sessionId, characters, settings);
  }

  /**
   * セッション終了時にAI制御を停止
   */
  async stopAIControlForSession(sessionId: ID): Promise<void> {
    const controller = this.sessionControllers.get(sessionId);
    if (!controller) return;

    // 各キャラクターコントローラーを停止
    for (const characterId of Object.keys(controller.characterControllers)) {
      this.characterControllers.delete(characterId);
    }

    this.sessionControllers.delete(sessionId);
  }

  /**
   * キャラクターに自動行動を実行させる
   */
  async triggerCharacterAction(
    characterId: ID,
    sessionId: ID,
    context: Partial<ExtendedAIDecisionContext>
  ): Promise<AIAction | null> {
    // Create extended context with all detailed information
    const extendedContext: ExtendedAIDecisionContext = {
      sessionId,
      characterId,
      currentLocation: context.environmentContext?.location || '不明',
      availableActions: context.sessionState?.availableActions || [],
      recentEvents: context.gameContext?.recentEvents || [],
      partyMembers: context.environmentContext?.presentCharacters || [],
      timeOfDay: context.sessionState?.timeOfDay || 'morning',
      urgency: context.gameContext?.urgency || 5,
      sessionState: {
        mode: 'exploration',
        lastActions: [],
        ...context.sessionState,
      },
      characterState: {
        currentHP: 100,
        maxHP: 100,
        statusEffects: [],
        ...context.characterState,
      },
      environmentContext: {
        presentCharacters: [],
        location: '不明',
        ...context.environmentContext,
      },
      relationshipContext: {
        pcRelationships: {},
        npcRelationships: {},
        recentInteractions: [],
        ...context.relationshipContext,
      },
      gameContext: {
        currentQuests: [],
        recentEvents: [],
        partyMood: 'neutral',
        storyTension: 5,
        plotDeveopments: [],
        ...context.gameContext,
      },
    };

    return await this.decideCharacterAction(characterId, extendedContext);
  }
}

export const aiCharacterService = new AICharacterService();