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
  apiKey: string;
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
    google: 'gemini-pro',
  };

  private readonly defaultTemperature = 0.7;
  private readonly defaultMaxTokens = 2000;

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
    apiKey: string;
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
      apiKey: params.apiKey,
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
    
    try {
      let response: string;
      let tokensUsed: number | undefined;

      switch (params.provider.toLowerCase()) {
        case 'openai':
          ({ response, tokensUsed } = await this.callOpenAI(params, model));
          break;
        case 'anthropic':
          ({ response, tokensUsed } = await this.callAnthropic(params, model));
          break;
        case 'google':
          ({ response, tokensUsed } = await this.callGoogle(params, model));
          break;
        case 'custom':
          ({ response, tokensUsed } = await this.callCustomEndpoint(params, model));
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
    const genAI = new GoogleGenerativeAI(params.apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    const prompt = params.systemPrompt 
      ? `${params.systemPrompt}\n\nUser: ${params.message}`
      : params.message || '';

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;

    return {
      response: response.text(),
      tokensUsed: undefined, // Google doesn't provide token usage in the same way
    };
  }

  private async callCustomEndpoint(params: AIServiceRequest, model: string) {
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
        model: 'gemini-pro',
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
}

export const aiService = new AIService();