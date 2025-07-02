// ==========================================
// AIユーティリティサービス
// アシスタンス機能・分析・ユーティリティ機能群
// aiService.tsから分割 (800行以下の適切なサイズ)
// ==========================================

import { logger } from '../utils/logger';
import { systemPrompts } from '../utils/systemPrompts';
import { getDatabase } from '../database/database';
import { aiProviderService, AIServiceRequest } from './aiProviderService';

// ==========================================
// AIユーティリティサービスクラス
// ==========================================

export class AIUtilsService {

  // ==========================================
  // キャンペーン・GM支援機能
  // ==========================================

  /**
   * キャンペーン作成アシスタンス
   */
  async getCampaignCreationAssistance(params: {
    provider: string;
    apiKey?: string;
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
      category: 'campaign_creation',
      context: { campaignBasics: params.campaignBasics },
    });

    return {
      assistance: response.response,
      suggestions: this.extractCampaignSuggestions(response.response),
    };
  }

  /**
   * GMアシスタンス
   */
  async getGMAssistance(params: {
    provider: string;
    apiKey?: string;
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

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    await aiProviderService.logAIRequest({
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

  /**
   * ルールアシスタンス
   */
  async getRulesAssistance(params: {
    provider: string;
    apiKey?: string;
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

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1500,
    });

    await aiProviderService.logAIRequest({
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

  /**
   * 汎用チャット機能
   */
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
    
    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: params.message,
      systemPrompt,
      context: params.context,
      temperature: 0.7,
    });

    await aiProviderService.logAIRequest({
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

  // ==========================================
  // テーマ適応・分析機能
  // ==========================================

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

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.6,
      maxTokens: 3000,
    });

    await aiProviderService.logAIRequest({
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

  /**
   * プレイヤー選択解釈
   */
  async interpretPlayerChoice(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    playerInput: string;
    availableChoices: any[];
    context: any;
  }) {
    const systemPrompt = systemPrompts.getPlayerChoiceInterpretationPrompt();
    
    const contextMessage = `
プレイヤー入力: "${params.playerInput}"

利用可能な選択肢:
${JSON.stringify(params.availableChoices, null, 2)}

コンテキスト:
${JSON.stringify(params.context, null, 2)}

プレイヤーの入力を解析し、最も適切な選択肢にマッピングするか、カスタムアクションとして解釈してください。
創造的な解決策や予期しないアプローチも考慮してください。
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.4,
      maxTokens: 1000,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'player_choice_interpretation',
      context: { availableChoicesCount: params.availableChoices.length },
    });

    return {
      interpretationData: response.response,
      interpretedChoice: this.parsePlayerChoiceResponse(response.response),
    };
  }

  /**
   * プレイヤー解決策評価
   */
  async evaluatePlayerSolution(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    playerSolution: string;
    challengeContext: any;
    difficultySettings: any;
  }) {
    const systemPrompt = systemPrompts.getPlayerSolutionEvaluationPrompt();
    
    const contextMessage = `
プレイヤーの解決策:
${params.playerSolution}

チャレンジコンテキスト:
${JSON.stringify(params.challengeContext, null, 2)}

難易度設定:
${JSON.stringify(params.difficultySettings, null, 2)}

プレイヤーの解決策を評価し、以下を提供してください：
1. 解決策の創造性と実現可能性
2. 成功確率と必要なスキルチェック
3. 潜在的な結果と副作用
4. 代替アプローチの提案
5. GMへの実行指針

公平で建設的な評価を心がけてください。
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.5,
      maxTokens: 2000,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'player_solution_evaluation',
      context: { challengeType: params.challengeContext?.type },
    });

    return {
      evaluationData: response.response,
      solutionEvaluation: this.parseSolutionEvaluationResponse(response.response),
    };
  }

  /**
   * 動的難易度計算
   */
  async calculateDynamicDifficulty(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    playerPerformance: any;
    sessionProgress: any;
    targetBalance: any;
  }) {
    const systemPrompt = systemPrompts.getDynamicDifficultyPrompt();
    
    const contextMessage = `
プレイヤーパフォーマンス:
${JSON.stringify(params.playerPerformance, null, 2)}

セッション進行:
${JSON.stringify(params.sessionProgress, null, 2)}

目標バランス:
${JSON.stringify(params.targetBalance, null, 2)}

現在の状況に基づいて動的な難易度調整を提案してください：
1. 現在の難易度レベルの評価
2. 調整が必要な領域の特定
3. 具体的な調整値と実装方法
4. プレイヤー体験への影響予測
5. 段階的調整のロードマップ
`;

    const response = await aiProviderService.makeAIRequest({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      message: contextMessage,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2500,
    });

    await aiProviderService.logAIRequest({
      provider: params.provider,
      model: response.model,
      prompt: contextMessage,
      response: response.response,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      category: 'dynamic_difficulty_calculation',
      context: { currentDifficulty: params.sessionProgress?.currentDifficulty },
    });

    return {
      difficultyData: response.response,
      adjustmentRecommendations: this.parseDifficultyAdjustmentResponse(response.response),
    };
  }

  // ==========================================
  // 統計・使用状況分析
  // ==========================================

  /**
   * 使用統計取得
   */
  async getUsageStats() {
    try {
      const db = getDatabase();
      
      const stats = {
        totalRequests: 0,
        requestsByProvider: {},
        requestsByCategory: {},
        averageProcessingTime: 0,
        totalTokensUsed: 0,
        recentActivity: [],
      };

      // 総リクエスト数
      const totalResult = db.prepare('SELECT COUNT(*) as count FROM ai_requests').get() as any;
      stats.totalRequests = totalResult.count;

      // プロバイダー別統計
      const providerStats = db.prepare(`
        SELECT provider, COUNT(*) as count, AVG(processing_time) as avg_time, SUM(tokens_used) as total_tokens
        FROM ai_requests 
        GROUP BY provider
      `).all() as any[];

      providerStats.forEach(stat => {
        stats.requestsByProvider[stat.provider] = {
          count: stat.count,
          averageTime: stat.avg_time,
          totalTokens: stat.total_tokens,
        };
      });

      // カテゴリ別統計
      const categoryStats = db.prepare(`
        SELECT category, COUNT(*) as count 
        FROM ai_requests 
        GROUP BY category
      `).all() as any[];

      categoryStats.forEach(stat => {
        stats.requestsByCategory[stat.category] = stat.count;
      });

      // 平均処理時間
      const avgTimeResult = db.prepare('SELECT AVG(processing_time) as avg_time FROM ai_requests').get() as any;
      stats.averageProcessingTime = avgTimeResult.avg_time || 0;

      // 総トークン使用量
      const tokensResult = db.prepare('SELECT SUM(tokens_used) as total_tokens FROM ai_requests').get() as any;
      stats.totalTokensUsed = tokensResult.total_tokens || 0;

      // 最近のアクティビティ
      const recentActivity = db.prepare(`
        SELECT provider, category, timestamp, processing_time, tokens_used
        FROM ai_requests 
        ORDER BY timestamp DESC 
        LIMIT 10
      `).all() as any[];

      stats.recentActivity = recentActivity;

      return stats;

    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      return {
        totalRequests: 0,
        requestsByProvider: {},
        requestsByCategory: {},
        averageProcessingTime: 0,
        totalTokensUsed: 0,
        recentActivity: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==========================================
  // レスポンス解析メソッド
  // ==========================================

  private parseThemeAdaptationResponse(response: string): any {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse theme adaptation response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  private parsePlayerChoiceResponse(response: string): any {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse player choice response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  private parseSolutionEvaluationResponse(response: string): any {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse solution evaluation response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  private parseDifficultyAdjustmentResponse(response: string): any {
    try {
      const cleanedJson = this.cleanJsonString(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse difficulty adjustment response as JSON:', error);
      return { rawData: response, parseError: error };
    }
  }

  // ==========================================
  // 抽出ヘルパーメソッド
  // ==========================================

  private extractCampaignSuggestions(response: string): any {
    const suggestions = {
      worldBuilding: [],
      questIdeas: [],
      npcs: [],
      locations: [],
      conflicts: [],
    };

    const lines = response.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.includes('World') || trimmedLine.includes('世界')) {
        currentSection = 'worldBuilding';
      } else if (trimmedLine.includes('Quest') || trimmedLine.includes('クエスト')) {
        currentSection = 'questIdeas';
      } else if (trimmedLine.includes('NPC') || trimmedLine.includes('キャラクター')) {
        currentSection = 'npcs';
      } else if (trimmedLine.includes('Location') || trimmedLine.includes('場所')) {
        currentSection = 'locations';
      } else if (trimmedLine.includes('Conflict') || trimmedLine.includes('衝突')) {
        currentSection = 'conflicts';
      }

      if (currentSection && trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./)) {
        suggestions[currentSection].push(trimmedLine);
      }
    }

    return suggestions;
  }

  private extractGMSuggestions(response: string): string[] {
    const suggestionKeywords = ['提案', '推奨', '考慮', 'suggest', 'recommend', 'consider'];
    const lines = response.split('\n');
    const suggestions = [];

    for (const line of lines) {
      if (suggestionKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        suggestions.push(line.trim());
      }
    }

    return suggestions;
  }

  private extractRulesReferences(response: string): string[] {
    const rulePatterns = [
      /ルール\s*\d+/g,
      /Rule\s*\d+/g,
      /p\.\s*\d+/g,
      /ページ\s*\d+/g,
      /\d+ページ/g,
    ];

    const references = [];
    for (const pattern of rulePatterns) {
      const matches = response.match(pattern);
      if (matches) {
        references.push(...matches);
      }
    }

    return [...new Set(references)]; // 重複除去
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
}

// シングルトンインスタンス
export const aiUtilsService = new AIUtilsService();