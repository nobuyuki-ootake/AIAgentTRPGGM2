// ==========================================
// AI統合サービス（ファサードパターン）
// 分割されたAIサービスを統合して既存APIとの互換性を保持
// ==========================================

import { logger } from '../utils/logger';
import { aiProviderService } from './aiProviderService';
import { aiContentGenerationService } from './aiContentGenerationService';
import { aiUtilsService } from './aiUtilsService';

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
  // 追加のコンテンツ生成機能（今後の拡張用）
  // ==========================================

  async generateTaskFromChoice(_params: {
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

  async generateResultNarrative(_params: {
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

  async generateSubtleHints(_params: {
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

  async generateNaturalGuidance(_params: {
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

  async generateLocationMapping(_params: {
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
}

// シングルトンインスタンス（互換性のため）
const aiServiceInstance = new AIService();

// 従来のエクスポート関数（互換性のため）
export function getAIService(): AIService {
  return aiServiceInstance;
}

// デフォルトエクスポート
export default aiServiceInstance;