// ==========================================
// AI統合サービス（ファサードパターン）
// 分割されたAIサービスを統合して既存APIとの互換性を保持
// ==========================================

import { logger } from '../utils/logger';
import { aiProviderService, AIServiceRequest, AIServiceResponse } from './aiProviderService';
import { aiContentGenerationService } from './aiContentGenerationService';
import { aiUtilsService } from './aiUtilsService';

// ==========================================
// 型定義（互換性のため）
// ==========================================

interface AIServiceRequest {
  provider: string;
  apiKey?: string;
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

// ==========================================
// AI統合サービスクラス（ファサード）
// ==========================================

class AIService {

  // ==========================================
  // プロバイダー管理機能（aiProviderServiceに委譲）
  // ==========================================

  async testProviderConnection(
    provider: string, 
    apiKey: string, 
    model?: string
  ): Promise<boolean> {
    return await aiProviderService.testProviderConnection(provider, apiKey, model);
  }

  // ==========================================
  // キャンペーン・GM支援機能（aiUtilsServiceに委譲）
  // ==========================================

  async getCampaignCreationAssistance(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    campaignBasics: any;
    worldSettings?: any;
    playerInfo?: any;
  }) {
    return await aiUtilsService.getCampaignCreationAssistance(params);
  }

  async getGMAssistance(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    assistanceType: string;
    sessionState: any;
    playerAction?: string;
    context?: any;
  }) {
    return await aiUtilsService.getGMAssistance(params);
  }

  async getRulesAssistance(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    gameSystem: string;
    situation: string;
    question: string;
    context?: any;
  }) {
    return await aiUtilsService.getRulesAssistance(params);
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
    return await aiUtilsService.chat(params);
  }

  async getUsageStats() {
    return await aiUtilsService.getUsageStats();
  }

  async performThemeAdaptation(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    themeId: string;
    campaignContext: any;
    sessionDuration: any;
    playerPreferences?: any;
  }) {
    return await aiUtilsService.performThemeAdaptation(params);
  }

  async interpretPlayerChoice(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    playerInput: string;
    availableChoices: any[];
    context: any;
  }) {
    return await aiUtilsService.interpretPlayerChoice(params);
  }

  async evaluatePlayerSolution(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    playerSolution: string;
    challengeContext: any;
    difficultySettings: any;
  }) {
    return await aiUtilsService.evaluatePlayerSolution(params);
  }

  async calculateDynamicDifficulty(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    playerPerformance: any;
    sessionProgress: any;
    targetBalance: any;
  }) {
    return await aiUtilsService.calculateDynamicDifficulty(params);
  }

  // ==========================================
  // コンテンツ生成機能（aiContentGenerationServiceに委譲）
  // ==========================================

  async generateCharacter(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    characterType: 'PC' | 'NPC' | 'Enemy';
    characterBasics?: any;
    campaignContext?: any;
  }) {
    return await aiContentGenerationService.generateCharacter(params);
  }

  async generateEvent(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    eventType: string;
    campaignContext?: any;
    sessionContext?: any;
    difficulty?: string;
  }) {
    return await aiContentGenerationService.generateEvent(params);
  }

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
    return await aiContentGenerationService.generateNPCBehavior(params);
  }

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
    return await aiContentGenerationService.generateMilestones(params);
  }

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
    return await aiContentGenerationService.generateEntityPool(params);
  }

  async generateCoreEntities(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    coreEntityRequirements: any[];
    campaignContext: any;
    themeAdaptation: any;
  }) {
    return await aiContentGenerationService.generateCoreEntities(params);
  }

  async generateBonusEntities(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    coreEntities: any;
    campaignContext: any;
    themeAdaptation: any;
  }) {
    return await aiContentGenerationService.generateBonusEntities(params);
  }

  async generateEventChoices(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    eventContext: any;
    currentSituation: string;
    playerConstraints?: any;
    difficultySettings?: any;
  }) {
    return await aiContentGenerationService.generateEventChoices(params);
  }

  async generateMilestoneOutlines(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    campaignOverview: any;
    sessionStructure: any;
    themeConstraints: any;
  }) {
    return await aiContentGenerationService.generateMilestoneOutlines(params);
  }

  // ==========================================
  // 基本AI機能（aiProviderServiceに委譲）
  // ==========================================

  private async makeAIRequest(params: AIServiceRequest): Promise<AIServiceResponse> {
    return await aiProviderService.makeAIRequest(params);
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
  }): Promise<void> {
    return await aiProviderService.logAIRequest(request);
  }

  // ==========================================
  // 追加のコンテンツ生成機能（今後の拡張用）
  // ==========================================

  async generateTaskFromChoice(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    selectedChoice: any;
    eventContext: any;
    playerContext: any;
  }) {
    // 将来的にaiContentGenerationServiceに実装予定
    logger.warn('generateTaskFromChoice: Not yet implemented in separated services');
    return { taskData: 'Not implemented', generatedTask: {} };
  }

  async generateResultNarrative(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    taskResult: any;
    playerActions: string[];
    eventOutcome: any;
  }) {
    // 将来的にaiContentGenerationServiceに実装予定
    logger.warn('generateResultNarrative: Not yet implemented in separated services');
    return { narrativeData: 'Not implemented', generatedNarrative: {} };
  }

  async generateSubtleHints(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    playerStruggles: any;
    availableResources: any[];
    hintingStyle: string;
  }) {
    // 将来的にaiContentGenerationServiceに実装予定
    logger.warn('generateSubtleHints: Not yet implemented in separated services');
    return { hintsData: 'Not implemented', generatedHints: [] };
  }

  async generateNaturalGuidance(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    playerConfusion: any;
    gameContext: any;
    guidanceIntensity: string;
  }) {
    // 将来的にaiContentGenerationServiceに実装予定
    logger.warn('generateNaturalGuidance: Not yet implemented in separated services');
    return { guidanceData: 'Not implemented', generatedGuidance: {} };
  }

  async generateLocationMapping(params: {
    provider: string;
    apiKey?: string;
    model?: string;
    entityMappingRequirements: any;
    availableLocations: any[];
    distributionStrategy: any;
  }) {
    // 将来的にaiContentGenerationServiceに実装予定
    logger.warn('generateLocationMapping: Not yet implemented in separated services');
    return { mappingData: 'Not implemented', generatedMapping: {} };
  }

  // ==========================================
  // レガシー互換性メソッド
  // ==========================================

  /**
   * 旧形式のパースメソッド（互換性のため）
   */
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

  private extractCampaignSuggestions(response: string): any {
    // aiUtilsServiceの実装を使用
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

  /**
   * JSON文字列のクリーニング（互換性のため）
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

// シングルトンインスタンス（互換性のため）
const aiServiceInstance = new AIService();

// 従来のエクスポート関数（互換性のため）
export function getAIService(): AIService {
  return aiServiceInstance;
}

// デフォルトエクスポート
export default aiServiceInstance;