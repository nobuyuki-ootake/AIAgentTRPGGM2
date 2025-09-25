/**
 * スタブ: AIサービスの最小限実装
 * t-WADA命名規則: stubAIService.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: 統合テスト、外部依存を持つコンポーネントのテスト、AIサービスの代替実装
 */

import { 
  TRPGCharacter, 
  NPCCharacter, 
  EnemyCharacter, 
  TRPGEvent,
  APIResponse 
} from '@ai-agent-trpg/types';

// ===================================
// AI生成レスポンスのスタブ
// ===================================

export interface AIGenerationRequest {
  prompt: string;
  context?: Record<string, any>;
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerationResponse {
  content: string;
  reasoning?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

// ===================================
// AIサービススタブクラス
// ===================================

export class StubAIService {
  private isOnline: boolean = true;
  private responseDelay: number = 100; // ms
  private failureRate: number = 0; // 0-1の失敗率

  constructor(options?: {
    isOnline?: boolean;
    responseDelay?: number;
    failureRate?: number;
  }) {
    if (options) {
      this.isOnline = options.isOnline ?? true;
      this.responseDelay = options.responseDelay ?? 100;
      this.failureRate = options.failureRate ?? 0;
    }
  }

  // ===================================
  // キャラクター生成
  // ===================================

  async generateCharacter(
    request: AIGenerationRequest & {
      characterType: 'PC' | 'NPC' | 'Enemy';
      level?: number;
      race?: string;
      characterClass?: string;
    }
  ): Promise<APIResponse<TRPGCharacter | NPCCharacter | EnemyCharacter>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('AI service unavailable');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('AI service offline');
    }

    const baseCharacter = {
      id: `stub-char-${Date.now()}`,
      name: `スタブキャラクター`,
      description: `AI生成スタブ: ${request.prompt}`,
      characterType: request.characterType,
      age: 25,
      race: request.race || 'human',
      characterClass: request.characterClass || 'fighter',
      appearance: 'スタブAIが生成した外見',
      baseStats: {
        strength: 12,
        dexterity: 12,
        constitution: 12,
        intelligence: 12,
        wisdom: 12,
        charisma: 12
      },
      derivedStats: {
        hitPoints: 15,
        maxHitPoints: 15,
        magicPoints: 0,
        maxMagicPoints: 0,
        armorClass: 12,
        initiative: 1,
        speed: 30
      },
      level: request.level || 1,
      experience: 0,
      skills: [],
      feats: [],
      equipment: [],
      statusEffects: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      campaignId: 'stub-campaign'
    };

    let character: TRPGCharacter | NPCCharacter | EnemyCharacter;

    switch (request.characterType) {
      case 'PC':
        character = {
          ...baseCharacter,
          characterType: 'PC' as const,
          background: 'unknown',
          personalityTraits: ['スタブ生成'],
          ideals: ['テスト'],
          bonds: ['スタブAI'],
          flaws: ['仮の設定']
        } as TRPGCharacter;
        break;

      case 'NPC':
        character = {
          ...baseCharacter,
          characterType: 'NPC' as const,
          role: 'neutral' as const,
          disposition: 'friendly' as const,
          dialoguePatterns: [{
            trigger: 'greeting',
            response: 'こんにちは（スタブ応答）',
            conditions: [],
            outcomes: []
          }],
          questIds: [],
          behaviorTags: ['stub'],
          npcData: {
            importance: 'minor',
            disposition: 'friendly',
            occupation: 'commoner',
            location: 'stub-location',
            aiPersonality: { traits: ['stub'] }
          }
        } as NPCCharacter;
        break;

      case 'Enemy':
        character = {
          ...baseCharacter,
          characterType: 'Enemy' as const,
          challengeRating: 1,
          specialAbilities: [],
          legendaryActions: [],
          combatTactics: ['基本攻撃'],
          combatRole: 'striker' as const,
          environment: ['any'],
          groupSize: { min: 1, max: 1 },
          treasureIds: [],
          enemyData: {
            category: 'humanoid',
            challengeRating: 1,
            encounterLevel: 1,
            combat: { tactics: 'basic' },
            encounter: { environment: ['any'] },
            loot: { coins: '1d4 gold' }
          }
        } as EnemyCharacter;
        break;

      default:
        return this.createErrorResponse('Invalid character type');
    }

    return this.createSuccessResponse(character);
  }

  // ===================================
  // ストーリー生成
  // ===================================

  async generateStory(request: AIGenerationRequest): Promise<APIResponse<string>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Story generation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('AI service offline');
    }

    const storyContent = `スタブAIが生成したストーリー:\n\n${request.prompt}\n\n[これはテスト用の固定レスポンスです]`;

    return this.createSuccessResponse(storyContent);
  }

  // ===================================
  // イベント生成
  // ===================================

  async generateEvent(
    request: AIGenerationRequest & {
      eventType?: 'story' | 'combat' | 'social' | 'exploration' | 'puzzle' | 'rest';
      difficulty?: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme';
    }
  ): Promise<APIResponse<TRPGEvent>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Event generation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('AI service offline');
    }

    const event: TRPGEvent = {
      id: `stub-event-${Date.now()}`,
      title: 'スタブイベント',
      description: `AI生成スタブイベント: ${request.prompt}`,
      type: request.eventType || 'story',
      scheduledDate: new Date().toISOString(),
      duration: 30,
      participants: [],
      difficulty: request.difficulty || 'medium',
      challengeRating: 2,
      outcomes: {
        success: false,
        experience: 0,
        rewards: [],
        consequences: [],
        storyImpact: []
      },
      aiGenerated: true,
      seedPrompt: request.prompt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return this.createSuccessResponse(event);
  }

  // ===================================
  // 対話生成
  // ===================================

  async generateDialogue(
    request: AIGenerationRequest & {
      characterId: string;
      characterName: string;
      context?: string;
    }
  ): Promise<APIResponse<string>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Dialogue generation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('AI service offline');
    }

    const dialogue = `${request.characterName}「スタブAIの応答: ${request.prompt}（これはテスト用の固定応答です）」`;

    return this.createSuccessResponse(dialogue);
  }

  // ===================================
  // チャット補完
  // ===================================

  async chatCompletion(
    request: AIGenerationRequest & {
      messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }>;
    }
  ): Promise<APIResponse<string>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Chat completion failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('AI service offline');
    }

    const lastMessage = request.messages[request.messages.length - 1];
    const response = `スタブAI応答: "${lastMessage.content}" に対する返答です。[テスト用固定レスポンス]`;

    return this.createSuccessResponse(response);
  }

  // ===================================
  // ヘルパーメソッド
  // ===================================

  private async simulateDelay(): Promise<void> {
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }
  }

  private shouldFail(): boolean {
    return Math.random() < this.failureRate;
  }

  private createSuccessResponse<T>(data: T): APIResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  private createErrorResponse(error: string): APIResponse<never> {
    return {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };
  }

  // ===================================
  // 設定変更メソッド
  // ===================================

  setOnline(isOnline: boolean): void {
    this.isOnline = isOnline;
  }

  setResponseDelay(delay: number): void {
    this.responseDelay = delay;
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  // サービス状態の確認
  getStatus(): {
    isOnline: boolean;
    responseDelay: number;
    failureRate: number;
  } {
    return {
      isOnline: this.isOnline,
      responseDelay: this.responseDelay,
      failureRate: this.failureRate
    };
  }
}

// ===================================
// シングルトンインスタンス
// ===================================

export const stubAIService = new StubAIService();

// ===================================
// ファクトリ関数
// ===================================

export function createStubAIService(options?: {
  isOnline?: boolean;
  responseDelay?: number;
  failureRate?: number;
}): StubAIService {
  return new StubAIService(options);
}

// 事前定義されたスタブサービス
export const stubAIServiceOffline = new StubAIService({ isOnline: false });
export const stubAIServiceSlow = new StubAIService({ responseDelay: 2000 });
export const stubAIServiceUnreliable = new StubAIService({ failureRate: 0.3 });