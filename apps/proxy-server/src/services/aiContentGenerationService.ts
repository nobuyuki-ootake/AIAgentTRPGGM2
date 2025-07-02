// ==========================================
// AIコンテンツ生成サービス
// TRPG用コンテンツ生成に特化した機能群
// aiService.tsから分割 (800行以下の適切なサイズ)
// ==========================================

import { logger } from '../utils/logger';
import { systemPrompts } from '../utils/systemPrompts';
import { aiProviderService, AIServiceRequest } from './aiProviderService';

// ==========================================
// AIコンテンツ生成サービスクラス
// ==========================================

export class AIContentGenerationService {

  // ==========================================
  // キャラクター・NPC生成
  // ==========================================

  /**
   * キャラクター生成
   */
  async generateCharacter(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    characterType: 'PC' | 'NPC' | 'Enemy';
    characterBasics?: any;
    campaignContext?: any;
  }) {
    const systemPrompt = systemPrompts.getCharacterGenerationPrompt(params.characterType);
    
    const contextMessage = `
Character Type: ${params.characterType}
Character Basics: ${JSON.stringify(params.characterBasics || {}, null, 2)}
Campaign Context: ${JSON.stringify(params.campaignContext || {}, null, 2)}

Please generate a complete ${params.characterType} character with:
1. Basic information (name, age, race, class, level)
2. Ability scores and derived stats
3. Skills and feats
4. Equipment and inventory
5. Appearance and personality
6. Background and motivation
7. ${params.characterType === 'NPC' ? 'Story role and relationships' : ''}
8. ${params.characterType === 'Enemy' ? 'Combat tactics and loot' : ''}

Provide the response in a structured JSON format compatible with the character schema.
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.9,
      maxTokens: 4000,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'character_generation',
      context: { characterType: params.characterType },
    });

    return {
      characterData: response.response,
      generatedCharacter: this.parseCharacterResponse(response.response, params.characterType),
    };
  }

  /**
   * NPC行動生成
   */
  async generateNPCBehavior(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    npcId: string;
    npcData: any;
    situation: string;
    playerActions?: string[];
    campaignContext?: any;
  }) {
    const systemPrompt = systemPrompts.getNPCBehaviorPrompt();
    
    const contextMessage = `
NPC Data: ${JSON.stringify(params.npcData, null, 2)}
Current Situation: ${params.situation}
Player Actions: ${JSON.stringify(params.playerActions || [], null, 2)}
Campaign Context: ${JSON.stringify(params.campaignContext || {}, null, 2)}

Generate NPC behavior and dialogue that:
1. Stays true to the NPC's personality and motivations
2. Responds appropriately to the current situation
3. Considers relationships with player characters
4. Advances plot or provides meaningful interaction
5. Feels natural and engaging
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.9,
      maxTokens: 1500,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'npc_behavior',
      context: { npcId: params.npcId },
    });

    return {
      behavior: response.response,
      dialogue: this.extractNPCDialogue(response.response),
      actions: this.extractNPCActions(response.response),
    };
  }

  // ==========================================
  // イベント・シナリオ生成
  // ==========================================

  /**
   * イベント生成
   */
  async generateEvent(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    eventType: string;
    campaignContext?: any;
    sessionContext?: any;
    difficulty?: string;
  }) {
    const systemPrompt = systemPrompts.getEventGenerationPrompt();
    
    const contextMessage = `
Event Type: ${params.eventType}
Difficulty: ${params.difficulty || 'medium'}
Campaign Context: ${JSON.stringify(params.campaignContext || {}, null, 2)}
Session Context: ${JSON.stringify(params.sessionContext || {}, null, 2)}

Please generate a detailed TRPG event with:
1. Event title and description
2. Setup and introduction
3. Objectives and challenges
4. Potential outcomes
5. Required preparation
6. Estimated duration
7. Difficulty assessment
8. Rewards and consequences

Make sure the event fits the campaign context and player level.
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 3000,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'event_generation',
      context: { eventType: params.eventType, difficulty: params.difficulty },
    });

    return {
      eventData: response.response,
      generatedEvent: this.parseEventResponse(response.response),
    };
  }

  /**
   * イベント選択肢生成
   */
  async generateEventChoices(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    eventContext: any;
    currentSituation: string;
    playerConstraints?: any;
    difficultySettings?: any;
  }) {
    const systemPrompt = systemPrompts.getEventChoicesPrompt();
    
    const contextMessage = `
イベントコンテキスト:
${JSON.stringify(params.eventContext, null, 2)}

現在の状況:
${params.currentSituation}

プレイヤー制約:
${JSON.stringify(params.playerConstraints || {}, null, 2)}

難易度設定:
${JSON.stringify(params.difficultySettings || {}, null, 2)}

現在の状況に基づいて、プレイヤーに提示する選択肢を日本語で生成してください。
各選択肢には以下を含めてください：
1. 選択肢の内容（明確で理解しやすい）
2. 予想される結果とリスク
3. 必要なスキルや条件
4. 成功確率の目安
5. 代替アプローチの可能性

選択肢は3-5個程度で、多様なアプローチを可能にしてください。
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 2500,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'event_choices_generation',
      context: { eventId: params.eventContext?.id },
    });

    return {
      choicesData: response.response,
      generatedChoices: this.parseEventChoicesResponse(response.response),
    };
  }

  // ==========================================
  // マイルストーン・進捗生成
  // ==========================================

  /**
   * マイルストーン生成
   */
  async generateMilestones(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    campaignContext: any;
    sessionDuration: any;
    themeAdaptation: any;
    entityPool: any;
    milestoneCount?: number;
  }) {
    const systemPrompt = `あなたは熟練したTRPGゲームマスターとして、魅力的で達成感のあるマイルストーンを生成する専門家です。

以下の要件に従って、日本語でマイルストーンを生成してください：

**マイルストーンの特徴:**
1. プレイヤーに明確な目標を提供する
2. キャンペーンテーマと一貫性がある
3. 適切な難易度とバランス
4. 達成時に意味のある報酬を提供
5. ストーリー進行に貢献する

**生成するマイルストーン数:** ${params.milestoneCount || 3}個

各マイルストーンには以下を含めてください：
- id: ユニークなID
- title: 魅力的で分かりやすい日本語タイトル
- description: 詳細な説明（日本語）
- type: マイルストーンタイプ (enemy_defeat, event_clear, npc_communication, item_acquisition, quest_completion)
- targetId: 対象エンティティのID
- targetDetails: 対象の詳細情報
- requiredConditions: 達成に必要な条件
- reward: 報酬情報（経験値、アイテム、ストーリー進行）

JSON形式で回答してください。`;
    
    const contextMessage = `
キャンペーンコンテキスト:
${JSON.stringify(params.campaignContext, null, 2)}

セッション期間設定:
${JSON.stringify(params.sessionDuration, null, 2)}

テーマ適応:
${JSON.stringify(params.themeAdaptation, null, 2)}

利用可能なエンティティプール:
${JSON.stringify(params.entityPool, null, 2)}

上記の情報を基に、${params.milestoneCount || 3}個の魅力的なマイルストーンを日本語で生成してください。
キャンペーンテーマ「${params.campaignContext.themeId}」に適したマイルストーンを作成し、エンティティプールの要素を活用してください。
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 4000,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'milestone_generation',
      context: { 
        milestoneCount: params.milestoneCount,
        themeId: params.themeAdaptation?.themeId,
        sessionDuration: params.sessionDuration?.type 
      },
    });

    return {
      milestonesData: response.response,
      generatedMilestones: this.parseMilestonesResponse(response.response),
    };
  }

  /**
   * マイルストーンアウトライン生成
   */
  async generateMilestoneOutlines(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    campaignOverview: any;
    sessionStructure: any;
    themeConstraints: any;
  }) {
    const systemPrompt = systemPrompts.getMilestoneOutlinesPrompt();
    
    const contextMessage = `
キャンペーン概要:
${JSON.stringify(params.campaignOverview, null, 2)}

セッション構造:
${JSON.stringify(params.sessionStructure, null, 2)}

テーマ制約:
${JSON.stringify(params.themeConstraints, null, 2)}

上記の情報に基づいて、セッション全体を通じたマイルストーンの大まかなアウトラインを生成してください。
セッションの流れと段階的な目標設定を明確にし、プレイヤーの進捗感を高める構成にしてください。
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 3000,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'milestone_outlines_generation',
      context: { themeId: params.themeConstraints?.themeId },
    });

    return {
      outlinesData: response.response,
      generatedOutlines: this.parseMilestoneOutlinesResponse(response.response),
    };
  }

  // ==========================================
  // エンティティプール生成
  // ==========================================

  /**
   * エンティティプール生成
   */
  async generateEntityPool(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    campaignContext: any;
    themeAdaptation: any;
    sessionDuration: any;
    poolSizes?: {
      enemies?: number;
      events?: number;
      npcs?: number;
      items?: number;
      quests?: number;
    };
  }) {
    const systemPrompt = systemPrompts.getEntityPoolGenerationPrompt();
    
    const defaultPoolSizes = {
      enemies: 3,
      events: 4,
      npcs: 3,
      items: 4,
      quests: 2,
    };
    const poolSizes = { ...defaultPoolSizes, ...params.poolSizes };
    
    const contextMessage = `
Campaign Context: ${JSON.stringify(params.campaignContext, null, 2)}
Theme Adaptation: ${JSON.stringify(params.themeAdaptation, null, 2)}
Session Duration: ${JSON.stringify(params.sessionDuration, null, 2)}
Requested Pool Sizes: ${JSON.stringify(poolSizes, null, 2)}

Please generate a comprehensive entity pool for this TRPG session containing:

**Enemies** (${poolSizes.enemies} entities):
- Tactically interesting with unique abilities
- Balanced challenge rating for the party
- Variety in combat roles and approaches
- Thematically appropriate personalities and motivations
- Include: id, name, description, level, abilities, behavior, rewards

**Events** (${poolSizes.events} entities):
- Interactive scenarios with meaningful choices
- Multiple resolution paths (combat, social, creative)
- Escalating consequences and retry mechanisms
- Include: id, name, description, choices, outcomes, requirements

**NPCs** (${poolSizes.npcs} entities):
- Distinctive personalities with clear motivations
- Relationship potential with player characters
- Conversation opportunities and dialogue trees
- Include: id, name, description, personality, dialogue patterns, communication conditions

**Items** (${poolSizes.items} entities):
- Both mechanical and narrative value
- Integration with other pool entities
- Appropriate power level and rarity
- Include: id, name, description, type, effects, acquisition methods

**Quests** (${poolSizes.quests} entities):
- Multi-layered objectives with clear progression
- Branching paths and player agency
- Integration with other entities for coherent storytelling
- Include: id, title, description, objectives, rewards, difficulty

Ensure all entities:
- Respect theme adaptation constraints (e.g., no enemies for peaceful themes)
- Maintain thematic coherence across all entity types
- Provide interconnection opportunities for emergent storytelling
- Support different play styles and character concepts

Return the response as a structured JSON object compatible with the EntityPoolCollection interface.
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.9,
      maxTokens: 6000,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'entity_pool_generation',
      context: { 
        themeId: params.themeAdaptation?.themeId,
        sessionDuration: params.sessionDuration?.type,
        poolSizes
      },
    });

    return {
      entityPoolData: response.response,
      generatedEntityPool: this.parseEntityPoolResponse(response.response),
    };
  }

  /**
   * コアエンティティ生成（必須系）
   */
  async generateCoreEntities(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    coreEntityRequirements: any[];
    campaignContext: any;
    themeAdaptation: any;
  }) {
    const systemPrompt = systemPrompts.getCoreEntitiesPrompt();
    
    const contextMessage = `
コアエンティティ要件:
${JSON.stringify(params.coreEntityRequirements, null, 2)}

キャンペーンコンテキスト:
${JSON.stringify(params.campaignContext, null, 2)}

テーマ適応:
${JSON.stringify(params.themeAdaptation, null, 2)}

上記の要件に基づいて、マイルストーン達成に必須のコアエンティティを生成してください。
各マイルストーンに対して3つのエンティティ（event, npc, item）を用意し、進捗貢献度を適切に配分してください。
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 4000,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'core_entities_generation',
      context: { 
        requirementsCount: params.coreEntityRequirements?.length,
        themeId: params.themeAdaptation?.themeId 
      },
    });

    return {
      coreEntitiesData: response.response,
      generatedCoreEntities: this.parseCoreEntitiesResponse(response.response),
    };
  }

  /**
   * ボーナスエンティティ生成（追加報酬系）
   */
  async generateBonusEntities(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    coreEntities: any;
    campaignContext: any;
    themeAdaptation: any;
  }) {
    const systemPrompt = systemPrompts.getBonusEntitiesPrompt();
    
    const contextMessage = `
コアエンティティ:
${JSON.stringify(params.coreEntities, null, 2)}

キャンペーンコンテキスト:
${JSON.stringify(params.campaignContext, null, 2)}

テーマ適応:
${JSON.stringify(params.themeAdaptation, null, 2)}

コアエンティティに基づいて、以下の3つのカテゴリの追加報酬エンティティを生成してください：
1. 実用的報酬エンティティ（実戦に役立つアイテム・装備）
2. トロフィー系エンティティ（収集要素・世界観深化）
3. ミステリー系エンティティ（隠し要素・好奇心満足）
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.9,
      maxTokens: 3500,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'bonus_entities_generation',
      context: { themeId: params.themeAdaptation?.themeId },
    });

    return {
      bonusEntitiesData: response.response,
      generatedBonusEntities: this.parseBonusEntitiesResponse(response.response),
    };
  }

  // ==========================================
  // レスポンス解析メソッド
  // ==========================================

  private parseCharacterResponse(response: string, characterType: string): any {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return { ...parsed, characterType };
    } catch (error) {
      logger.warn('Failed to parse character response as JSON:', error);
      return { rawData: response, parseError: error, characterType };
    }
  }

  private parseEventResponse(response: string): any {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse event response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  private parseMilestonesResponse(response: string): any[] {
    try {
      const cleanedResponse = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleanedResponse);
      
      // 配列として返す
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed.milestones && Array.isArray(parsed.milestones)) {
        return parsed.milestones;
      } else {
        return [parsed]; // 単一オブジェクトの場合は配列にラップ
      }
    } catch (error) {
      logger.error('Failed to parse milestones response:', error);
      return [];
    }
  }

  private parseEntityPoolResponse(response: string): any {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse entity pool response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  private parseCoreEntitiesResponse(response: string): any {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse core entities response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  private parseBonusEntitiesResponse(response: string): any {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse bonus entities response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  private parseEventChoicesResponse(response: string): any {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse event choices response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  private parseMilestoneOutlinesResponse(response: string): any {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse milestone outlines response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  // ==========================================
  // 抽出ヘルパーメソッド
  // ==========================================

  private extractNPCDialogue(response: string): string[] {
    const dialogueRegex = /"([^"]+)"|「([^」]+)」/g;
    const matches = [];
    let match;
    
    while ((match = dialogueRegex.exec(response)) !== null) {
      matches.push(match[1] || match[2]);
    }
    
    return matches;
  }

  private extractNPCActions(response: string): string[] {
    const actionKeywords = ['行動', 'アクション', '動作', '反応'];
    const lines = response.split('\n');
    const actions = [];
    
    for (const line of lines) {
      if (actionKeywords.some(keyword => line.includes(keyword))) {
        actions.push(line.trim());
      }
    }
    
    return actions;
  }

  // ==========================================
  // ユーティリティメソッド
  // ==========================================

  /**
   * JSON文字列のクリーニング
   */
  private cleanJsonString(jsonString: string): string {
    // マークダウンのコードブロックを除去
    let cleaned = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // 前後の空白を除去
    cleaned = cleaned.trim();
    
    // 不正な制御文字を除去
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
    
    return cleaned;
  }

  /**
   * JSONレスポンスの高度なクリーニング
   */
  private cleanJsonResponse(response: string): string {
    let cleaned = response;
    
    // マークダウンコードブロックの除去
    cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1');
    
    // 前後の説明文を除去（JSONオブジェクトの前後の不要なテキスト）
    const jsonStartIndex = cleaned.search(/[{\[]/);
    const jsonEndIndex = cleaned.lastIndexOf('}') !== -1 ? cleaned.lastIndexOf('}') + 1 : cleaned.lastIndexOf(']') + 1;
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
      cleaned = cleaned.substring(jsonStartIndex, jsonEndIndex);
    }
    
    // 不正な制御文字を除去
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
    
    // 不正なカンマを修正
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    return cleaned.trim();
  }
}

// シングルトンインスタンス
export const aiContentGenerationService = new AIContentGenerationService();