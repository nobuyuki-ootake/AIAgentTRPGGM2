import { apiClient } from './client';
import { AIProvider } from '@ai-agent-trpg/types';

export interface TestKeyRequest {
  provider: string;
  apiKey: string;
  model?: string;
}

export interface TestKeyResponse {
  valid: boolean;
  provider: string;
}

export interface CampaignAssistanceRequest {
  provider: string;
  apiKey: string;
  model?: string;
  campaignBasics: {
    name: string;
    gameSystem: string;
    theme: string;
    description?: string;
  };
  worldSettings?: {
    technologyLevel: string;
    magicLevel: string;
    scale: string;
    tone: string;
  };
  playerInfo?: {
    expectedCount: number;
    experienceLevel: string;
    playStyle: string;
  };
}

export interface CampaignAssistanceResponse {
  assistance: string;
  suggestions: {
    suggestions: string;
  };
}

export interface CharacterGenerationRequest {
  provider: string;
  apiKey: string;
  model?: string;
  characterType: 'PC' | 'NPC' | 'Enemy';
  characterBasics?: {
    name?: string;
    race?: string;
    class?: string;
    level?: number;
  };
  campaignContext?: any;
}

export interface CharacterGenerationResponse {
  characterData: string;
  generatedCharacter: any;
}

export interface EventGenerationRequest {
  provider: string;
  apiKey: string;
  model?: string;
  eventType: string;
  campaignContext?: any;
  sessionContext?: any;
  difficulty?: string;
}

export interface EventGenerationResponse {
  eventData: string;
  generatedEvent: any;
}

export interface GMAssistanceRequest {
  provider: string;
  apiKey: string;
  model?: string;
  assistanceType: string;
  sessionState: any;
  playerAction?: string;
  context?: any;
}

export interface GMAssistanceResponse {
  assistance: string;
  suggestions: {
    suggestions: string;
  };
}

export interface NPCBehaviorRequest {
  provider: string;
  apiKey: string;
  model?: string;
  npcId: string;
  npcData: any;
  situation: string;
  playerActions?: string[];
  campaignContext?: any;
}

export interface NPCBehaviorResponse {
  behavior: string;
  dialogue: string[];
  actions: {
    actions: string;
  };
}

export interface RulesAssistanceRequest {
  provider: string;
  apiKey: string;
  model?: string;
  gameSystem: string;
  situation: string;
  question: string;
  context?: any;
}

export interface RulesAssistanceResponse {
  assistance: string;
  rules: {
    rules: string;
  };
}

export interface ChatRequest {
  provider: string;
  apiKey: string;
  model?: string;
  message: string;
  persona?: string;
  context?: any;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  message: string;
  persona?: string;
}

class AIAgentAPI {
  // AIプロバイダーのテスト
  async testKey(request: TestKeyRequest): Promise<TestKeyResponse> {
    return apiClient.post<TestKeyResponse>('/ai-agent/test-key', request);
  }

  // キャンペーン作成支援
  async getCampaignAssistance(request: CampaignAssistanceRequest): Promise<CampaignAssistanceResponse> {
    return apiClient.post<CampaignAssistanceResponse>('/ai-agent/campaign/create-assistance', request);
  }

  // キャラクター生成
  async generateCharacter(request: CharacterGenerationRequest): Promise<CharacterGenerationResponse> {
    return apiClient.post<CharacterGenerationResponse>('/ai-agent/character/generate', request);
  }

  // イベント生成
  async generateEvent(request: EventGenerationRequest): Promise<EventGenerationResponse> {
    return apiClient.post<EventGenerationResponse>('/ai-agent/event/generate', request);
  }

  // セッション中のGM支援
  async getGMAssistance(request: GMAssistanceRequest): Promise<GMAssistanceResponse> {
    return apiClient.post<GMAssistanceResponse>('/ai-agent/session/gm-assistance', request);
  }

  // NPC行動・対話生成
  async generateNPCBehavior(request: NPCBehaviorRequest): Promise<NPCBehaviorResponse> {
    return apiClient.post<NPCBehaviorResponse>('/ai-agent/npc/behavior', request);
  }

  // ルール参照・裁定支援
  async getRulesAssistance(request: RulesAssistanceRequest): Promise<RulesAssistanceResponse> {
    return apiClient.post<RulesAssistanceResponse>('/ai-agent/rules/assistance', request);
  }

  // 汎用チャット
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>('/ai-agent/chat', request);
  }

  // 利用可能なAIプロバイダー一覧
  async getProviders(): Promise<AIProvider[]> {
    return apiClient.get<AIProvider[]>('/ai-agent/providers');
  }

  // AI使用統計（開発・デバッグ用）
  async getStats(): Promise<any> {
    return apiClient.get<any>('/ai-agent/stats');
  }
}

export const aiAgentAPI = new AIAgentAPI();