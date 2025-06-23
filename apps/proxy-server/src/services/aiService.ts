import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { AIProvider, AIRequest } from '@ai-agent-trpg/types';
import { logger } from '../utils/logger';
import { AIServiceError, ValidationError } from '../middleware/errorHandler';
import { getDatabase } from '../database/database';
import { systemPrompts } from '../utils/systemPrompts';

interface AIServiceRequest {
  provider: string;
  apiKey?: string; // オプショナルに変更（環境変数から取得）
  model?: string;
  message?: string;
  systemPrompt?: string;
  context?: Record<string, any>;
  temperature?: number;
  maxTokens?: number;
}

interface AIServiceResponse {
  response: string;
  tokensUsed?: number;
  processingTime: number;
  provider: string;
  model: string;
}

class AIService {
  private readonly defaultModels = {
    openai: 'gpt-3.5-turbo',
    anthropic: 'claude-3-haiku-20240307',
    google: 'gemini-1.5-pro',
  };

  private readonly defaultTemperature = 0.7;
  private readonly defaultMaxTokens = 2000;

  /**
   * 環境変数からAPIキーを取得
   */
  private getApiKeyFromEnv(provider: string): string | null {
    switch (provider.toLowerCase()) {
      case 'openai':
        return process.env.OPENAI_API_KEY || null;
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY || null;
      case 'google':
        return process.env.GOOGLE_API_KEY || null;
      default:
        return null;
    }
  }

  /**
   * APIキーを取得（環境変数を優先、フォールバックでリクエストから）
   */
  private getApiKey(provider: string, requestApiKey?: string): string {
    const envApiKey = this.getApiKeyFromEnv(provider);
    
    if (envApiKey) {
      logger.debug(`Using API key from environment for provider: ${provider}`);
      return envApiKey;
    }
    
    if (requestApiKey) {
      logger.debug(`Using API key from request for provider: ${provider}`);
      return requestApiKey;
    }
    
    throw new ValidationError(`No API key found for provider: ${provider}. Please set ${provider.toUpperCase()}_API_KEY environment variable.`);
  }

  async testProviderConnection(
    provider: string, 
    apiKey: string, 
    model?: string
  ): Promise<boolean> {
    const testModel = model || this.defaultModels[provider as keyof typeof this.defaultModels];
    
    try {
      const startTime = Date.now();
      
      const response = await this.makeAIRequest({
        provider,
        apiKey,
        model: testModel,
        message: 'Test connection. Please respond with "Connection successful."',
        maxTokens: 50,
        temperature: 0,
      });

      const processingTime = Date.now() - startTime;
      
      logger.info(`AI Provider test successful: ${provider} (${processingTime}ms)`);
      return response.response.toLowerCase().includes('connection successful');
      
    } catch (error) {
      logger.error(`AI Provider test failed: ${provider}`, error);
      return false;
    }
  }

  async getCampaignCreationAssistance(params: {
    provider: string;
    apiKey: string;
    model?: string;
    campaignBasics: any;
    worldSettings?: any;
    playerInfo?: any;
  }) {
    const systemPrompt = systemPrompts.getCampaignCreationPrompt();
    
    const contextMessage = `
Campaign Basics: ${JSON.stringify(params.campaignBasics, null, 2)}
World Settings: ${JSON.stringify(params.worldSettings || {}, null, 2)}
Player Information: ${JSON.stringify(params.playerInfo || {}, null, 2)}

Please provide comprehensive campaign creation assistance including:
1. World building suggestions
2. Main quest ideas
3. Key NPC suggestions
4. Initial location recommendations
5. Potential conflicts and themes
6. Balance analysis and recommendations
`;

    const response = await this.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 3000,
    });

    await this.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'campaign_creation',
      context: { campaignBasics: params.campaignBasics },
    });

    return {
      assistance: response.response,
      suggestions: this.extractCampaignSuggestions(response.response),
    };
  }

  async generateCharacter(params: {
    provider: string;
    apiKey: string;
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

    const response = await this.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.9,
      maxTokens: 4000,
    });

    await this.logAIRequest({
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

  async generateEvent(params: {
    provider: string;
    apiKey: string;
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

    const response = await this.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 3000,
    });

    await this.logAIRequest({
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

  async getGMAssistance(params: {
    provider: string;
    apiKey: string;
    model?: string;
    assistanceType: string;
    sessionState: any;
    playerAction?: string;
    context?: any;
  }) {
    const systemPrompt = systemPrompts.getGMAssistantPrompt();
    
    const contextMessage = `
Assistance Type: ${params.assistanceType}
Player Action: ${params.playerAction || 'None'}
Session State: ${JSON.stringify(params.sessionState, null, 2)}
Additional Context: ${JSON.stringify(params.context || {}, null, 2)}

Please provide GM assistance for the current situation. Consider:
1. Current session state and mood
2. Player actions and intentions
3. Story progression and pacing
4. Rules clarification if needed
5. Difficulty balancing
6. Engagement enhancement suggestions
`;

    const response = await this.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    await this.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'gm_assistance',
      context: { assistanceType: params.assistanceType },
    });

    return {
      assistance: response.response,
      suggestions: this.extractGMSuggestions(response.response),
    };
  }

  async generateNPCBehavior(params: {
    provider: string;
    apiKey: string;
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

    const response = await this.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.9,
      maxTokens: 1500,
    });

    await this.logAIRequest({
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

  async getRulesAssistance(params: {
    provider: string;
    apiKey: string;
    model?: string;
    gameSystem: string;
    situation: string;
    question: string;
    context?: any;
  }) {
    const systemPrompt = systemPrompts.getRulesAssistantPrompt(params.gameSystem);
    
    const contextMessage = `
Game System: ${params.gameSystem}
Situation: ${params.situation}
Question: ${params.question}
Context: ${JSON.stringify(params.context || {}, null, 2)}

Please provide clear rules assistance including:
1. Relevant rule references
2. How to apply rules to this situation
3. Alternative interpretations if applicable
4. Suggested difficulty classes or modifiers
5. Fair and balanced ruling recommendations
`;

    const response = await this.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1500,
    });

    await this.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'rule_clarification',
      context: { gameSystem: params.gameSystem },
    });

    return {
      assistance: response.response,
      rules: this.extractRulesReferences(response.response),
    };
  }

  async chat(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    message: string;
    persona?: string;
    context?: any;
    conversationHistory?: Array<{ role: string; content: string }>;
  }) {
    const systemPrompt = params.persona 
      ? systemPrompts.getPersonaPrompt(params.persona)
      : systemPrompts.getGeneralAssistantPrompt();
    
    const response = await this.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey, // undefinedでも大丈夫（makeAIRequestで環境変数から取得）
      model: params.model,
      message: params.message,
      systemPrompt,
      context: params.context,
      temperature: 0.7,
    });

    await this.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: params.message,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'general_chat',
      context: { persona: params.persona },
    });

    return {
      message: response.response,
      persona: params.persona,
    };
  }

  private async makeAIRequest(params: AIServiceRequest): Promise<AIServiceResponse> {
    const startTime = Date.now();
    const model = params.model || this.defaultModels[params.provider as keyof typeof this.defaultModels];
    
    // 環境変数からAPIキーを取得
    const apiKey = this.getApiKey(params.provider, params.apiKey);
    const requestWithApiKey = { ...params, apiKey };
    
    try {
      let response: string;
      let tokensUsed: number | undefined;

      switch (params.provider.toLowerCase()) {
        case 'openai':
          ({ response, tokensUsed } = await this.callOpenAI(requestWithApiKey, model));
          break;
        case 'anthropic':
          ({ response, tokensUsed } = await this.callAnthropic(requestWithApiKey, model));
          break;
        case 'google':
          ({ response, tokensUsed } = await this.callGoogle(requestWithApiKey, model));
          break;
        case 'custom':
          ({ response, tokensUsed } = await this.callCustomEndpoint(requestWithApiKey, model));
          break;
        default:
          throw new ValidationError(`Unsupported AI provider: ${params.provider}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        response,
        tokensUsed,
        processingTime,
        provider: params.provider,
        model,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`AI request failed: ${params.provider}`, error);
      
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Unknown AI service error',
        params.provider,
        { model, processingTime }
      );
    }
  }

  private async callOpenAI(params: AIServiceRequest, model: string) {
    if (!params.apiKey) {
      throw new ValidationError('OpenAI API key is required');
    }
    
    const openai = new OpenAI({ apiKey: params.apiKey });
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessage[] = [];
    
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    
    if (params.message) {
      messages.push({ role: 'user', content: params.message });
    }

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: params.temperature || this.defaultTemperature,
      max_tokens: params.maxTokens || this.defaultMaxTokens,
    });

    return {
      response: completion.choices[0]?.message?.content || '',
      tokensUsed: completion.usage?.total_tokens,
    };
  }

  private async callAnthropic(params: AIServiceRequest, model: string) {
    if (!params.apiKey) {
      throw new ValidationError('Anthropic API key is required');
    }
    
    const anthropic = new Anthropic({ apiKey: params.apiKey });
    
    const completion = await anthropic.messages.create({
      model,
      max_tokens: params.maxTokens || this.defaultMaxTokens,
      system: params.systemPrompt,
      messages: params.message ? [{ role: 'user', content: params.message }] : [],
      temperature: params.temperature || this.defaultTemperature,
    });

    return {
      response: completion.content[0]?.type === 'text' ? completion.content[0].text : '',
      tokensUsed: completion.usage?.input_tokens + completion.usage?.output_tokens,
    };
  }

  private async callGoogle(params: AIServiceRequest, model: string) {
    if (!params.apiKey) {
      throw new ValidationError('Google API key is required');
    }
    
    const genAI = new GoogleGenerativeAI(params.apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    const prompt = params.systemPrompt 
      ? `${params.systemPrompt}\n\nUser: ${params.message}`
      : params.message || '';

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;

    return {
      response: response.text(),
      tokensUsed: undefined, // Google doesn't provide token usage in the same way
    };
  }

  private async callCustomEndpoint(params: AIServiceRequest, model: string) {
    if (!params.apiKey) {
      throw new ValidationError('API key is required for custom endpoint');
    }
    
    // カスタムエンドポイント（OpenAI互換API）のサポート
    const endpoint = params.context?.endpoint || 'http://localhost:8000/v1';
    
    const requestData = {
      model,
      messages: [
        ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
        ...(params.message ? [{ role: 'user', content: params.message }] : []),
      ],
      temperature: params.temperature || this.defaultTemperature,
      max_tokens: params.maxTokens || this.defaultMaxTokens,
    };

    const response = await axios.post(`${endpoint}/chat/completions`, requestData, {
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      response: response.data.choices[0]?.message?.content || '',
      tokensUsed: response.data.usage?.total_tokens,
    };
  }

  private async logAIRequest(request: {
    provider: string;
    model: string;
    prompt: string;
    response: string;
    tokensUsed?: number;
    processingTime: number;
    category: string;
    context?: any;
    campaignId?: string;
  }) {
    const db = getDatabase();
    
    const aiRequest: Omit<AIRequest, 'id'> = {
      provider: request.provider,
      model: request.model,
      prompt: request.prompt,
      context: request.context || {},
      timestamp: new Date().toISOString(),
      response: request.response,
      tokensUsed: request.tokensUsed,
      processingTime: request.processingTime,
      category: request.category as any,
    };

    try {
      db.prepare(`
        INSERT INTO ai_requests (
          id, campaign_id, provider, model, prompt, context, response,
          tokens_used, processing_time, category, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        request.campaignId || null,
        aiRequest.provider,
        aiRequest.model,
        aiRequest.prompt,
        JSON.stringify(aiRequest.context),
        aiRequest.response,
        aiRequest.tokensUsed || null,
        aiRequest.processingTime,
        aiRequest.category,
        aiRequest.timestamp
      );
    } catch (error) {
      logger.error('Failed to log AI request:', error);
    }
  }

  getAvailableProviders(): AIProvider[] {
    return [
      {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        model: 'gpt-3.5-turbo',
        maxTokens: 4000,
        temperature: 0.7,
        available: true,
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        type: 'anthropic',
        model: 'claude-3-haiku-20240307',
        maxTokens: 4000,
        temperature: 0.7,
        available: true,
      },
      {
        id: 'google',
        name: 'Google Gemini',
        type: 'google',
        model: 'gemini-1.5-pro',
        maxTokens: 4000,
        temperature: 0.7,
        available: true,
      },
      {
        id: 'custom',
        name: 'Custom Endpoint',
        type: 'custom',
        endpoint: 'http://localhost:8000/v1',
        model: 'custom-model',
        maxTokens: 4000,
        temperature: 0.7,
        available: true,
      },
    ];
  }

  async getUsageStats() {
    const db = getDatabase();
    
    const stats = db.prepare(`
      SELECT 
        provider,
        category,
        COUNT(*) as request_count,
        AVG(processing_time) as avg_processing_time,
        SUM(tokens_used) as total_tokens,
        DATE(created_at) as date
      FROM ai_requests
      WHERE created_at >= date('now', '-30 days')
      GROUP BY provider, category, DATE(created_at)
      ORDER BY date DESC, provider, category
    `).all();

    return stats;
  }

  // ヘルパーメソッド：レスポンス解析
  private extractCampaignSuggestions(response: string) {
    // AIレスポンスから構造化された提案を抽出
    // 実装は必要に応じてより詳細に
    return { suggestions: response };
  }

  private parseCharacterResponse(response: string, characterType: string) {
    // AIレスポンスからキャラクターデータを解析
    try {
      return JSON.parse(response);
    } catch {
      return { rawData: response, characterType };
    }
  }

  private parseEventResponse(response: string) {
    // AIレスポンスからイベントデータを解析
    return { eventData: response };
  }

  private extractGMSuggestions(response: string) {
    return { suggestions: response };
  }

  private extractNPCDialogue(response: string) {
    // NPCの台詞を抽出
    const dialogueMatch = response.match(/"([^"]+)"/g);
    return dialogueMatch || [];
  }

  private extractNPCActions(response: string) {
    // NPCの行動を抽出
    return { actions: response };
  }

  private extractRulesReferences(response: string) {
    return { rules: response };
  }

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
    const systemPrompt = systemPrompts.getMilestoneGenerationPrompt();
    
    const contextMessage = `
Campaign Context: ${JSON.stringify(params.campaignContext, null, 2)}
Session Duration: ${JSON.stringify(params.sessionDuration, null, 2)}
Theme Adaptation: ${JSON.stringify(params.themeAdaptation, null, 2)}
Entity Pool: ${JSON.stringify(params.entityPool, null, 2)}
Requested Milestone Count: ${params.milestoneCount || 3}

Please generate approximately ${params.milestoneCount || 3} milestones for this TRPG session with:
1. Variety in milestone types (enemy_defeat, event_clear, npc_communication, item_acquisition, quest_completion)
2. Appropriate difficulty for the session duration
3. Clear objectives and success criteria
4. Meaningful rewards that enhance player experience
5. Integration with the provided entity pool and campaign context
6. Adaptation to the specified theme requirements

For each milestone, provide:
- Unique ID and descriptive title
- Clear description of what must be accomplished
- Milestone type (one of the 5 types above)
- Target entity from the pool (with entity ID)
- Specific conditions for completion
- Progress tracking mechanism (0-100%)
- Appropriate rewards (experience points, items, story progression)
- Integration points with campaign elements

Return the response as a structured JSON array compatible with the AIMilestone interface.
`;

    const response = await this.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 4000,
    });

    await this.logAIRequest({
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

    const response = await this.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.9,
      maxTokens: 6000,
    });

    await this.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'entity_pool_generation',
      context: { 
        poolSizes,
        themeId: params.themeAdaptation?.themeId,
        sessionDuration: params.sessionDuration?.type 
      },
    });

    return {
      entityPoolData: response.response,
      generatedEntityPool: this.parseEntityPoolResponse(response.response),
    };
  }

  /**
   * テーマ適応実行
   */
  async performThemeAdaptation(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    themeId: string;
    campaignContext: any;
    sessionDuration: any;
    playerPreferences?: any;
  }) {
    const systemPrompt = systemPrompts.getThemeAdaptationPrompt();
    
    const contextMessage = `
Theme ID: ${params.themeId}
Campaign Context: ${JSON.stringify(params.campaignContext, null, 2)}
Session Duration: ${JSON.stringify(params.sessionDuration, null, 2)}
Player Preferences: ${JSON.stringify(params.playerPreferences || {}, null, 2)}

Please analyze the specified theme and create comprehensive adaptation guidelines for content generation:

**Theme Analysis:**
- Identify core theme characteristics and implications
- Determine compatibility with traditional TRPG elements
- Assess player expectations and gameplay preferences
- Consider long-term sustainability of theme restrictions

**Content Adaptation Strategy:**
- Specify which entity types are allowed/restricted
- Define alternative challenge types for restricted content
- Create specialization guidelines for each entity type
- Establish content modifiers for tone and atmosphere

**Specific Adaptations:**
- Enemy encounters: How to handle combat/conflict in this theme
- Social interactions: Enhanced importance and mechanisms
- Exploration elements: Environmental challenges and discoveries
- Character development: Focus areas for growth and progression
- Story conflicts: Types of tensions appropriate to the theme

**Implementation Guidelines:**
- Clear rules for content generation AI
- Examples of theme-appropriate content
- Fallback strategies for edge cases
- Quality assurance criteria for theme consistency

Return the response as a structured JSON object compatible with the ThemeAdaptation interface, including:
- allowedEntityTypes array
- restrictedEntityTypes array  
- specializations array with examples and generation hints
- contentModifiers array with type, value, and description
`;

    const response = await this.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.6,
      maxTokens: 3000,
    });

    await this.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'theme_adaptation',
      context: { 
        themeId: params.themeId,
        sessionDuration: params.sessionDuration?.type 
      },
    });

    return {
      themeAdaptationData: response.response,
      generatedThemeAdaptation: this.parseThemeAdaptationResponse(response.response),
    };
  }

  // マイルストーン関連のヘルパーメソッド
  private parseMilestonesResponse(response: string) {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      logger.warn('Failed to parse milestones response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  private parseEntityPoolResponse(response: string) {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse entity pool response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  private parseThemeAdaptationResponse(response: string) {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse theme adaptation response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  /**
   * JSON文字列のクリーニング（既存のキャラクター生成サービスから参考）
   */
  private cleanJsonString(jsonString: string): string {
    // AIレスポンスからJSON部分を抽出してクリーニング
    let cleaned = jsonString.trim();
    
    // Markdown コードブロックを除去
    cleaned = cleaned.replace(/```json\s*\n?/g, '');
    cleaned = cleaned.replace(/```\s*\n?/g, '');
    
    // 先頭と末尾の説明文を除去（JSONブロックの前後）
    const jsonStart = cleaned.indexOf('{');
    const jsonArrayStart = cleaned.indexOf('[');
    const actualStart = jsonStart !== -1 && (jsonArrayStart === -1 || jsonStart < jsonArrayStart) ? jsonStart : jsonArrayStart;
    
    if (actualStart !== -1) {
      const jsonEnd = cleaned.lastIndexOf('}');
      const jsonArrayEnd = cleaned.lastIndexOf(']');
      const actualEnd = jsonEnd !== -1 && (jsonArrayEnd === -1 || jsonEnd > jsonArrayEnd) ? jsonEnd : jsonArrayEnd;
      
      if (actualEnd !== -1) {
        cleaned = cleaned.substring(actualStart, actualEnd + 1);
      }
    }
    
    return cleaned;
  }

  // ==========================================
  // インタラクティブイベントシステム用メソッド
  // ==========================================

  /**
   * プレイヤーの選択を解釈し、AIタスクを生成する
   */
  async interpretPlayerChoice(params: {
    provider: string;
    choice: any;
    character: any;
    sessionContext: any;
    apiKey?: string;
    model?: string;
  }) {
    const systemPrompt = systemPrompts.getChoiceInterpretationPrompt();
    
    const contextMessage = `
PLAYER CHOICE:
${JSON.stringify(params.choice, null, 2)}

CHARACTER INFORMATION:
${JSON.stringify(params.character, null, 2)}

SESSION CONTEXT:
${JSON.stringify(params.sessionContext, null, 2)}

Please analyze this player choice and generate a structured task following the specified JSON format.
`;

    try {
      const response = await this.makeAIRequest({
        provider: params.provider,
        apiKey: params.apiKey,
        model: params.model,
        message: contextMessage,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 1500,
      });

      const cleanedResponse = this.cleanJsonResponse(response.response);
      return JSON.parse(cleanedResponse);
    } catch (error) {
      logger.error('Failed to interpret player choice:', error);
      throw new AIServiceError('Player choice interpretation failed', 'choice-interpretation');
    }
  }

  /**
   * タスクを選択から生成する（代替メソッド）
   */
  async generateTaskFromChoice(params: {
    provider: string;
    choice: any;
    character: any;
    sessionContext: any;
    apiKey?: string;
    model?: string;
  }) {
    // interpretPlayerChoiceと同じ実装（互換性のため）
    return this.interpretPlayerChoice(params);
  }

  /**
   * プレイヤーの解決方法を評価し、難易度を計算する
   */
  async evaluatePlayerSolution(params: {
    provider: string;
    playerSolution: string;
    character: any;
    sessionContext: any;
    taskDefinition?: any;
    apiKey?: string;
    model?: string;
  }) {
    const systemPrompt = systemPrompts.getTaskEvaluationPrompt();
    
    const contextMessage = `
PLAYER SOLUTION:
"${params.playerSolution}"

CHARACTER INFORMATION:
${JSON.stringify(params.character, null, 2)}

SESSION CONTEXT:
${JSON.stringify(params.sessionContext, null, 2)}

${params.taskDefinition ? `ORIGINAL TASK:
${JSON.stringify(params.taskDefinition, null, 2)}` : ''}

Please evaluate this player solution and calculate the appropriate difficulty following the specified JSON format.
`;

    try {
      const response = await this.makeAIRequest({
        provider: params.provider,
        apiKey: params.apiKey,
        model: params.model,
        message: contextMessage,
        systemPrompt,
        temperature: 0.5,
        maxTokens: 1200,
      });

      const cleanedResponse = this.cleanJsonResponse(response.response);
      return JSON.parse(cleanedResponse);
    } catch (error) {
      logger.error('Failed to evaluate player solution:', error);
      throw new AIServiceError('Player solution evaluation failed', 'solution-evaluation');
    }
  }

  /**
   * ダイス判定結果からナラティブを生成する
   */
  async generateResultNarrative(params: {
    provider: string;
    eventSession: any;
    character: any;
    sessionContext: any;
    diceResult?: any;
    success?: boolean;
    apiKey?: string;
    model?: string;
  }) {
    const systemPrompt = systemPrompts.getResultNarrationPrompt();
    
    const contextMessage = `
EVENT SESSION:
${JSON.stringify(params.eventSession, null, 2)}

CHARACTER INFORMATION:
${JSON.stringify(params.character, null, 2)}

SESSION CONTEXT:
${JSON.stringify(params.sessionContext, null, 2)}

${params.diceResult ? `DICE RESULT:
${JSON.stringify(params.diceResult, null, 2)}` : ''}

${params.success !== undefined ? `RESULT: ${params.success ? 'SUCCESS' : 'FAILURE'}` : ''}

Please generate an engaging narrative description of this action resolution.
`;

    try {
      const response = await this.makeAIRequest({
        provider: params.provider,
        apiKey: params.apiKey,
        model: params.model,
        message: contextMessage,
        systemPrompt,
        temperature: 0.8,
        maxTokens: 800,
      });

      return response.response.trim();
    } catch (error) {
      logger.error('Failed to generate result narrative:', error);
      throw new AIServiceError('Result narrative generation failed', 'narrative-generation');
    }
  }

  /**
   * 動的難易度設定を計算する
   */
  async calculateDynamicDifficulty(params: {
    provider: string;
    taskEvaluation: any;
    character: any;
    sessionContext: any;
    apiKey?: string;
    model?: string;
  }) {
    const systemPrompt = systemPrompts.getDifficultyCalculationPrompt();
    
    const contextMessage = `
TASK EVALUATION:
${JSON.stringify(params.taskEvaluation, null, 2)}

CHARACTER INFORMATION:
${JSON.stringify(params.character, null, 2)}

SESSION CONTEXT:
${JSON.stringify(params.sessionContext, null, 2)}

Please calculate the dynamic difficulty settings following the specified JSON format.
`;

    try {
      const response = await this.makeAIRequest({
        provider: params.provider,
        apiKey: params.apiKey,
        model: params.model,
        message: contextMessage,
        systemPrompt,
        temperature: 0.3,
        maxTokens: 1000,
      });

      const cleanedResponse = this.cleanJsonResponse(response.response);
      return JSON.parse(cleanedResponse);
    } catch (error) {
      logger.error('Failed to calculate dynamic difficulty:', error);
      throw new AIServiceError('Dynamic difficulty calculation failed', 'difficulty-calculation');
    }
  }

  /**
   * イベント選択肢を動的に生成する
   */
  async generateEventChoices(params: {
    provider: string;
    eventContext: any;
    character: any;
    sessionContext: any;
    choiceCount?: number;
    apiKey?: string;
    model?: string;
  }) {
    const systemPrompt = `You are an expert TRPG Game Master specializing in creating engaging, dynamic choice options for interactive events.

Your role is to generate meaningful, diverse choices that:
1. Reflect different approaches (combat, social, stealth, magic, etc.)
2. Respect character capabilities and background
3. Create interesting consequences and opportunities
4. Maintain narrative consistency
5. Offer varying risk/reward profiles

Generate ${params.choiceCount || 3} distinct choices in JSON format:
[
  {
    "id": "choice-id",
    "text": "Choice description (1-2 sentences)",
    "description": "Detailed explanation of what this choice entails",
    "category": "action|dialogue|investigation|combat|social",
    "requirements": [],
    "consequences": []
  }
]`;
    
    const contextMessage = `
EVENT CONTEXT:
${JSON.stringify(params.eventContext, null, 2)}

CHARACTER INFORMATION:
${JSON.stringify(params.character, null, 2)}

SESSION CONTEXT:
${JSON.stringify(params.sessionContext, null, 2)}

Please generate ${params.choiceCount || 3} diverse and engaging choices for this situation.
`;

    try {
      const response = await this.makeAIRequest({
        provider: params.provider,
        apiKey: params.apiKey,
        model: params.model,
        message: contextMessage,
        systemPrompt,
        temperature: 0.8,
        maxTokens: 1500,
      });

      const cleanedResponse = this.cleanJsonResponse(response.response);
      return JSON.parse(cleanedResponse);
    } catch (error) {
      logger.error('Failed to generate event choices:', error);
      throw new AIServiceError('Event choice generation failed', 'choice-generation');
    }
  }

  /**
   * AI応答のJSONをクリーンアップする
   * マークダウンのコードブロックやその他の不要な文字を除去する
   */
  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks if present
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Remove any text before the first { or [
    const jsonStartIndex = Math.min(
      cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'),
      cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('[')
    );
    
    if (jsonStartIndex !== Infinity) {
      cleaned = cleaned.substring(jsonStartIndex);
    }
    
    // Remove any text after the last } or ]
    const lastBraceIndex = cleaned.lastIndexOf('}');
    const lastBracketIndex = cleaned.lastIndexOf(']');
    const jsonEndIndex = Math.max(lastBraceIndex, lastBracketIndex);
    
    if (jsonEndIndex !== -1) {
      cleaned = cleaned.substring(0, jsonEndIndex + 1);
    }
    
    return cleaned;
  }
}

// Lazy initialization to avoid early instantiation
let _aiService: AIService | null = null;
export function getAIService(): AIService {
  if (!_aiService) {
    _aiService = new AIService();
  }
  return _aiService;
}