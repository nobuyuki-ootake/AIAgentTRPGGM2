// ==========================================
// AI プロバイダーモッククラス群
// 本番APIと同じシグネチャでモック応答を提供
// ==========================================

import { AIServiceRequest, AIServiceResponse } from '../../services/aiProviderService';
import { logger } from '../../utils/logger';

// ==========================================
// 共通インターフェース
// ==========================================

export interface MockAIResponse {
  response: string;
  tokensUsed?: number;
  processingTime: number;
  provider: string;
  model: string;
}

export interface MockScenarioOptions {
  scenario: 'success' | 'api_error' | 'timeout' | 'rate_limit' | 'invalid_key' | 'model_not_found';
  delay?: number;
  customResponse?: string;
  customError?: Error;
}

// ==========================================
// OpenAI モッククラス
// ==========================================

export class MockOpenAI {
  private scenario: MockScenarioOptions['scenario'] = 'success';
  private delay: number = 100;
  private customResponse?: string;
  private customError?: Error;

  constructor(private apiKey: string) {}

  setMockScenario(options: MockScenarioOptions): void {
    this.scenario = options.scenario;
    this.delay = options.delay || 100;
    this.customResponse = options.customResponse;
    this.customError = options.customError;
  }

  private generateMockResponse(params: AIServiceRequest): string {
    if (this.customResponse) return this.customResponse;

    const prompt = params.message || '';
    
    // TRPGコンテンツに関連するリアルなモック応答
    if (prompt.includes('character')) {
      return JSON.stringify({
        name: "エルフの弓使い アリア",
        race: "エルフ",
        class: "レンジャー", 
        level: 3,
        background: "森の守護者として育ったエルフの若者。弓の腕前は村一番で、自然との調和を重んじる。",
        stats: { str: 12, dex: 16, con: 14, int: 13, wis: 15, cha: 11 },
        equipment: ["エルヴンボウ", "革鎧", "クローク", "矢筒(矢20本)"]
      });
    }
    
    if (prompt.includes('event') || prompt.includes('イベント')) {
      return JSON.stringify({
        title: "古い遺跡の発見",
        description: "森の奥で苔に覆われた石造りの遺跡を発見した。入口には古代文字が刻まれている。",
        choices: [
          { id: 1, text: "慎重に遺跡を調査する", difficulty: "normal" },
          { id: 2, text: "仲間を呼んでから探索する", difficulty: "easy" },
          { id: 3, text: "即座に遺跡に入る", difficulty: "hard" }
        ],
        rewards: ["古代の巻物", "経験値200", "ゴールド50"]
      });
    }

    if (prompt.includes('NPC') || prompt.includes('behavior')) {
      return "「旅の者よ、この森には古い魔法がかかっている。気をつけるのじゃ。」老いたドルイドは杖を振り上げながら警告した。";
    }

    // デフォルト応答
    return "Connection successful. AI assistant is ready to help with your TRPG campaign.";
  }

  // Chat completions interface
  get chat() {
    return {
      completions: {
        create: async (params: any): Promise<any> => {
          await this.simulateDelay();
          
          switch (this.scenario) {
            case 'api_error':
              throw this.customError || new Error('OpenAI API Error: Request failed');
            case 'timeout':
              throw new Error('Request timeout');
            case 'rate_limit':
              throw new Error('Rate limit exceeded');
            case 'invalid_key':
              throw new Error('Invalid API key');
            case 'model_not_found':
              throw new Error('Model not found');
            case 'success':
            default:
              return {
                choices: [{
                  message: {
                    content: this.generateMockResponse({ 
                      provider: 'openai',
                      message: params.messages?.[params.messages.length - 1]?.content || ''
                    })
                  }
                }],
                usage: {
                  total_tokens: 150,
                  prompt_tokens: 100,
                  completion_tokens: 50
                },
                model: params.model || 'gpt-3.5-turbo'
              };
          }
        }
      }
    };
  }

  private async simulateDelay(): Promise<void> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
  }
}

// ==========================================
// Anthropic モッククラス
// ==========================================

export class MockAnthropic {
  private scenario: MockScenarioOptions['scenario'] = 'success';
  private delay: number = 120;
  private customResponse?: string;
  private customError?: Error;

  constructor(private apiKey: string) {}

  setMockScenario(options: MockScenarioOptions): void {
    this.scenario = options.scenario;
    this.delay = options.delay || 120;
    this.customResponse = options.customResponse;
    this.customError = options.customError;
  }

  private generateMockResponse(params: AIServiceRequest): string {
    if (this.customResponse) return this.customResponse;

    const prompt = params.message || '';
    
    // Anthropic Claude的なより詳細で分析的な応答
    if (prompt.includes('campaign') || prompt.includes('キャンペーン')) {
      return `
【キャンペーン設定案】

**世界観**: 魔法と技術が共存する時代。古代の魔法文明の遺跡が各地に点在している。

**主要テーマ**: 
- 失われた古代技術の探求
- 魔法と科学の融合
- 異種族間の協力と対立

**推奨シナリオ構成**:
1. 導入: 遺跡発見の噂
2. 発展: 探索と謎解き
3. クライマックス: 古代の守護者との対峙
4. 結末: 発見の意味と今後への展開

このテーマなら3-5セッション程度で完結でき、プレイヤーの選択が物語に大きく影響する構造になります。
      `.trim();
    }

    if (prompt.includes('rules') || prompt.includes('ルール')) {
      return `
そのシチュエーションでは以下のルール適用をお勧めします：

**技能判定**: 【知識：古代史】 難易度15
**成功**: 文字の意味を部分的に理解
**失敗**: 文字の危険性に気づかず

**追加考慮事項**:
- パーティに言語学者がいる場合は+2ボーナス
- 魔法的な解読手段がある場合は自動成功
- 判定失敗でも部分的な情報は与える（完全な失敗は避ける）
      `.trim();
    }

    return "Connection successful. Claude is ready to assist with detailed TRPG campaign management.";
  }

  // Messages interface
  get messages() {
    return {
      create: async (params: any): Promise<any> => {
        await this.simulateDelay();
        
        switch (this.scenario) {
          case 'api_error':
            throw this.customError || new Error('Anthropic API Error: Request failed');
          case 'timeout':
            throw new Error('Request timeout');
          case 'rate_limit':
            throw new Error('Rate limit exceeded');
          case 'invalid_key':
            throw new Error('Invalid API key');
          case 'model_not_found':
            throw new Error('Model not found');
          case 'success':
          default:
            return {
              content: [{
                type: 'text',
                text: this.generateMockResponse({
                  provider: 'anthropic',
                  message: params.messages?.[0]?.content || ''
                })
              }],
              usage: {
                input_tokens: 120,
                output_tokens: 80
              },
              model: params.model || 'claude-3-haiku-20240307'
            };
        }
      }
    };
  }

  private async simulateDelay(): Promise<void> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
  }
}

// ==========================================
// Google Gemini モッククラス
// ==========================================

export class MockGoogleGenerativeAI {
  private scenario: MockScenarioOptions['scenario'] = 'success';
  private delay: number = 90;
  private customResponse?: string;
  private customError?: Error;

  constructor(private apiKey: string) {}

  setMockScenario(options: MockScenarioOptions): void {
    this.scenario = options.scenario;
    this.delay = options.delay || 90;
    this.customResponse = options.customResponse;
    this.customError = options.customError;
  }

  getGenerativeModel(config: { model: string }) {
    return new MockGeminiModel(config.model, this);
  }

  getMockScenario() {
    return {
      scenario: this.scenario,
      delay: this.delay,
      customResponse: this.customResponse,
      customError: this.customError
    };
  }
}

class MockGeminiModel {
  constructor(
    private model: string, 
    private parent: MockGoogleGenerativeAI
  ) {}

  private generateMockResponse(prompt: string): string {
    const mockScenario = this.parent.getMockScenario();
    if (mockScenario.customResponse) return mockScenario.customResponse;
    
    // Google Gemini的な構造化された応答
    if (prompt.includes('milestone') || prompt.includes('マイルストーン')) {
      return JSON.stringify({
        milestones: [
          {
            id: "milestone_001",
            title: "遺跡の入口発見", 
            description: "森の奥で古代遺跡の入口を発見する",
            requiredActions: ["探索", "古代文字解読"],
            rewards: ["経験値100", "手がかりアイテム"],
            estimatedTime: "30分"
          },
          {
            id: "milestone_002", 
            title: "第一の謎解き",
            description: "遺跡内部の仕掛けを解く",
            requiredActions: ["謎解き", "協力作業"],
            rewards: ["経験値150", "魔法のアイテム"],
            estimatedTime: "45分"
          }
        ],
        totalEstimatedTime: "2時間",
        difficulty: "medium",
        theme: "探索と謎解き"
      });
    }

    if (prompt.includes('entity') || prompt.includes('エンティティ')) {
      return JSON.stringify({
        entities: {
          npcs: [
            { name: "賢者マーリン", role: "情報提供者", location: "村の図書館" },
            { name: "商人ギルド代表", role: "装備調達", location: "商業区" }
          ],
          enemies: [
            { name: "遺跡の番人", type: "ゴーレム", level: 4, location: "遺跡深部" },
            { name: "影の刺客", type: "アサシン", level: 3, location: "遺跡入口" }
          ],
          items: [
            { name: "古代の地図", rarity: "uncommon", effect: "遺跡内迷わない" },
            { name: "解読の指輪", rarity: "rare", effect: "古代文字自動翻訳" }
          ]
        }
      });
    }

    return "Connection successful. Gemini is ready to generate TRPG content.";
  }

  async generateContent(prompt: string): Promise<any> {
    const mockScenario = this.parent.getMockScenario();
    
    // 遅延シミュレーション
    if (mockScenario.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, mockScenario.delay));
    }
    
    switch (mockScenario.scenario) {
      case 'api_error':
        throw mockScenario.customError || new Error('Google API Error: Request failed');
      case 'timeout':
        throw new Error('Request timeout');
      case 'rate_limit':
        throw new Error('Rate limit exceeded');
      case 'invalid_key':
        throw new Error('Invalid API key');
      case 'model_not_found':
        throw new Error('Model not found');
      case 'success':
      default:
        return {
          response: {
            text: () => this.generateMockResponse(prompt)
          }
        };
    }
  }
}

// ==========================================
// モックファクトリー
// ==========================================

export class AIProviderMockFactory {
  private static instances: Map<string, any> = new Map();

  static createOpenAIMock(apiKey: string = 'mock-openai-key'): MockOpenAI {
    const key = `openai-${apiKey}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, new MockOpenAI(apiKey));
    }
    return this.instances.get(key);
  }

  static createAnthropicMock(apiKey: string = 'mock-anthropic-key'): MockAnthropic {
    const key = `anthropic-${apiKey}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, new MockAnthropic(apiKey));
    }
    return this.instances.get(key);
  }

  static createGoogleMock(apiKey: string = 'mock-google-key'): MockGoogleGenerativeAI {
    const key = `google-${apiKey}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, new MockGoogleGenerativeAI(apiKey));
    }
    return this.instances.get(key);
  }

  static setGlobalMockScenario(scenario: MockScenarioOptions): void {
    this.instances.forEach((instance) => {
      if (instance.setMockScenario) {
        instance.setMockScenario(scenario);
      }
    });
  }

  static clearInstances(): void {
    this.instances.clear();
    logger.debug('AI provider mock instances cleared');
  }
}

// ==========================================
// Jest用モック設定
// ==========================================

export function setupAIProviderMocks(): void {
  // OpenAI モック
  jest.mock('openai', () => {
    return {
      __esModule: true,
      default: jest.fn().mockImplementation((config) => {
        return AIProviderMockFactory.createOpenAIMock(config.apiKey);
      })
    };
  });

  // Anthropic モック
  jest.mock('@anthropic-ai/sdk', () => {
    return {
      __esModule: true,
      default: jest.fn().mockImplementation((config) => {
        return AIProviderMockFactory.createAnthropicMock(config.apiKey);
      })
    };
  });

  // Google Generative AI モック
  jest.mock('@google/generative-ai', () => {
    return {
      GoogleGenerativeAI: jest.fn().mockImplementation((apiKey) => {
        return AIProviderMockFactory.createGoogleMock(apiKey);
      })
    };
  });

  logger.debug('AI provider mocks configured for Jest');
}

// ==========================================
// エクスポート
// ==========================================

export {
  MockOpenAI,
  MockAnthropic, 
  MockGoogleGenerativeAI,
  AIProviderMockFactory
};