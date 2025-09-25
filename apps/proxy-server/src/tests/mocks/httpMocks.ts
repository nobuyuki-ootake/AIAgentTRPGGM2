// ==========================================
// HTTP リクエストモック (MSW ベース)
// API エンドポイントとリクエスト/レスポンスのモック
// ==========================================

import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { logger } from '../../utils/logger';

// ==========================================
// 型定義
// ==========================================

export interface MockAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface MockAPIRequestBody {
  provider?: string;
  apiKey?: string;
  model?: string;
  message?: string;
  context?: any;
  [key: string]: any;
}

export interface HTTPMockOptions {
  baseURL?: string;
  enableLogging?: boolean;
  simulateLatency?: number;
  simulateErrors?: boolean;
  errorRate?: number;
}

// ==========================================
// AI プロバイダー API モック
// ==========================================

const createAIProviderMocks = (options: HTTPMockOptions = {}) => {
  const baseURL = options.baseURL || 'http://localhost:3001';
  const simulateLatency = options.simulateLatency || 100;
  const simulateErrors = options.simulateErrors || false;
  const errorRate = options.errorRate || 0.05;

  return [
    // OpenAI API モック
    rest.post('https://api.openai.com/v1/chat/completions', async (req, res, ctx) => {
      if (simulateErrors && Math.random() < errorRate) {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Simulated OpenAI API error' }),
          ctx.delay(simulateLatency)
        );
      }

      const requestBody = await req.json();
      const message = requestBody.messages?.[requestBody.messages.length - 1]?.content || '';

      let responseContent = 'Default OpenAI response';
      
      if (message.includes('character')) {
        responseContent = JSON.stringify({
          name: "エルフの弓使い アリア",
          race: "エルフ",
          class: "レンジャー",
          level: 3,
          background: "森の守護者として育ったエルフの若者。",
          stats: { str: 12, dex: 16, con: 14, int: 13, wis: 15, cha: 11 }
        });
      } else if (message.includes('event')) {
        responseContent = JSON.stringify({
          title: "古い遺跡の発見",
          description: "森の奥で苔に覆われた石造りの遺跡を発見した。",
          choices: [
            { id: 1, text: "慎重に遺跡を調査する", difficulty: "normal" },
            { id: 2, text: "仲間を呼んでから探索する", difficulty: "easy" }
          ]
        });
      }

      return res(
        ctx.status(200),
        ctx.json({
          choices: [{
            message: {
              content: responseContent
            }
          }],
          usage: {
            total_tokens: 150,
            prompt_tokens: 100,
            completion_tokens: 50
          },
          model: requestBody.model || 'gpt-3.5-turbo'
        }),
        ctx.delay(simulateLatency)
      );
    }),

    // Anthropic API モック
    rest.post('https://api.anthropic.com/v1/messages', async (req, res, ctx) => {
      if (simulateErrors && Math.random() < errorRate) {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Simulated Anthropic API error' }),
          ctx.delay(simulateLatency)
        );
      }

      const requestBody = await req.json();
      const message = requestBody.messages?.[0]?.content || '';

      let responseContent = 'Default Claude response';
      
      if (message.includes('campaign')) {
        responseContent = `
【キャンペーン設定案】

**世界観**: 魔法と技術が共存する時代。

**主要テーマ**: 
- 失われた古代技術の探求
- 魔法と科学の融合

**推奨シナリオ構成**:
1. 導入: 遺跡発見の噂
2. 発展: 探索と謎解き
3. クライマックス: 古代の守護者との対峙
        `.trim();
      }

      return res(
        ctx.status(200),
        ctx.json({
          content: [{
            type: 'text',
            text: responseContent
          }],
          usage: {
            input_tokens: 120,
            output_tokens: 80
          },
          model: requestBody.model || 'claude-3-haiku-20240307'
        }),
        ctx.delay(simulateLatency)
      );
    }),

    // Google Gemini API モック
    rest.post('https://generativelanguage.googleapis.com/v1beta/models/:model:generateContent', async (req, res, ctx) => {
      if (simulateErrors && Math.random() < errorRate) {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Simulated Google API error' }),
          ctx.delay(simulateLatency)
        );
      }

      const requestBody = await req.json();
      const prompt = requestBody.contents?.[0]?.parts?.[0]?.text || '';

      let responseContent = 'Default Gemini response';
      
      if (prompt.includes('milestone')) {
        responseContent = JSON.stringify({
          milestones: [
            {
              id: "milestone_001",
              title: "遺跡の入口発見",
              description: "森の奥で古代遺跡の入口を発見する",
              estimatedTime: "30分"
            }
          ],
          totalEstimatedTime: "2時間",
          difficulty: "medium"
        });
      }

      return res(
        ctx.status(200),
        ctx.json({
          candidates: [{
            content: {
              parts: [{
                text: responseContent
              }]
            }
          }]
        }),
        ctx.delay(simulateLatency)
      );
    })
  ];
};

// ==========================================
// プロキシサーバー API モック
// ==========================================

const createProxyServerMocks = (options: HTTPMockOptions = {}) => {
  const baseURL = options.baseURL || 'http://localhost:3001';
  const simulateLatency = options.simulateLatency || 50;

  return [
    // AI Agent テスト接続
    rest.post(`${baseURL}/api/ai-agent/test-key`, async (req, res, ctx) => {
      const requestBody = await req.json();
      const { provider, apiKey } = requestBody;

      if (!apiKey || apiKey === 'invalid-key') {
        return res(
          ctx.status(401),
          ctx.json({
            success: false,
            error: 'Invalid API key'
          }),
          ctx.delay(simulateLatency)
        );
      }

      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          message: `${provider} connection successful`,
          data: {
            provider,
            model: 'test-model',
            latency: simulateLatency
          }
        }),
        ctx.delay(simulateLatency)
      );
    }),

    // キャラクター生成
    rest.post(`${baseURL}/api/ai-agent/generate-character`, async (req, res, ctx) => {
      const requestBody = await req.json();
      
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: {
            characterData: {
              name: "生成されたキャラクター",
              race: "エルフ",
              class: "ウィザード",
              level: 1,
              background: "学者",
              stats: { str: 8, dex: 14, con: 12, int: 16, wis: 13, cha: 11 }
            },
            generatedCharacter: {
              personality: "知識欲旺盛で慎重",
              appearance: "細身で知的な雰囲気",
              backstory: "古代魔法の研究に情熱を注ぐ若い学者"
            }
          }
        }),
        ctx.delay(simulateLatency)
      );
    }),

    // イベント生成
    rest.post(`${baseURL}/api/ai-agent/generate-event`, async (req, res, ctx) => {
      const requestBody = await req.json();
      
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: {
            eventData: {
              title: "謎の商人との出会い",
              description: "街角で奇妙な商品を売る謎の商人に出会った。",
              eventType: "encounter",
              difficulty: "easy"
            },
            generatedEvent: {
              choices: [
                { id: 1, text: "商品を調べる", outcome: "information" },
                { id: 2, text: "商人と話す", outcome: "dialogue" },
                { id: 3, text: "立ち去る", outcome: "skip" }
              ],
              rewards: ["情報", "アイテム", "経験値"]
            }
          }
        }),
        ctx.delay(simulateLatency)
      );
    }),

    // GM支援
    rest.post(`${baseURL}/api/ai-agent/gm-assistance`, async (req, res, ctx) => {
      const requestBody = await req.json();
      
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: {
            assistanceData: {
              suggestion: "プレイヤーが困っているようです。ヒントを与えることをお勧めします。",
              options: [
                "NPC からのヒント",
                "環境からの手がかり",
                "直接的なガイダンス"
              ]
            },
            generatedAssistance: {
              type: "suggestion",
              content: "「古い本を調べてみれば何かわかるかもしれません」"
            }
          }
        }),
        ctx.delay(simulateLatency)
      );
    }),

    // キャンペーン関連 API
    rest.get(`${baseURL}/api/campaigns`, (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: [
            {
              id: '1',
              name: 'テストキャンペーン1',
              description: 'ファンタジー世界での冒険',
              gameSystem: 'D&D 5e',
              status: 'active'
            }
          ]
        }),
        ctx.delay(simulateLatency)
      );
    }),

    rest.post(`${baseURL}/api/campaigns`, async (req, res, ctx) => {
      const requestBody = await req.json();
      
      return res(
        ctx.status(201),
        ctx.json({
          success: true,
          data: {
            id: Math.random().toString(36).substr(2, 9),
            ...requestBody,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }),
        ctx.delay(simulateLatency)
      );
    }),

    // セッション関連 API
    rest.get(`${baseURL}/api/sessions/:campaignId`, (req, res, ctx) => {
      const { campaignId } = req.params;
      
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: [
            {
              id: '1',
              campaignId,
              sessionNumber: 1,
              title: 'テストセッション',
              status: 'scheduled'
            }
          ]
        }),
        ctx.delay(simulateLatency)
      );
    }),

    // エラーハンドリングテスト用
    rest.get(`${baseURL}/api/test/error`, (req, res, ctx) => {
      return res(
        ctx.status(500),
        ctx.json({
          success: false,
          error: 'Simulated server error'
        }),
        ctx.delay(simulateLatency)
      );
    }),

    rest.get(`${baseURL}/api/test/timeout`, (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({ success: true }),
        ctx.delay(5000) // 5秒の遅延
      );
    })
  ];
};

// ==========================================
// MSW サーバーセットアップ
// ==========================================

export class HTTPMockServer {
  private server: any;
  private options: HTTPMockOptions;

  constructor(options: HTTPMockOptions = {}) {
    this.options = {
      enableLogging: false,
      simulateLatency: 100,
      simulateErrors: false,
      errorRate: 0.05,
      ...options
    };

    const handlers = [
      ...createAIProviderMocks(this.options),
      ...createProxyServerMocks(this.options)
    ];

    // MSW が利用可能な場合のみセットアップ
    try {
      this.server = setupServer(...handlers);
    } catch (error) {
      logger.warn('MSW not available, using basic HTTP mocking fallback');
      this.server = null;
    }
  }

  start(): void {
    if (this.server) {
      this.server.listen({
        onUnhandledRequest: this.options.enableLogging ? 'warn' : 'bypass'
      });
      
      if (this.options.enableLogging) {
        logger.debug('HTTP mock server started with MSW');
      }
    }
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      
      if (this.options.enableLogging) {
        logger.debug('HTTP mock server stopped');
      }
    }
  }

  reset(): void {
    if (this.server) {
      this.server.resetHandlers();
    }
  }

  // カスタムハンドラーの追加
  use(...handlers: any[]): void {
    if (this.server) {
      this.server.use(...handlers);
    }
  }
}

// ==========================================
// Jest テストヘルパー
// ==========================================

export class HTTPTestHelper {
  private mockServer: HTTPMockServer;

  constructor(options: HTTPMockOptions = {}) {
    this.mockServer = new HTTPMockServer(options);
  }

  async setupHTTPMocks(): Promise<void> {
    this.mockServer.start();
  }

  async teardownHTTPMocks(): Promise<void> {
    this.mockServer.stop();
  }

  resetMocks(): void {
    this.mockServer.reset();
  }

  // AI プロバイダーエラーをシミュレート
  simulateAIProviderError(provider: 'openai' | 'anthropic' | 'google'): void {
    const errorHandlers = [];
    
    if (provider === 'openai') {
      errorHandlers.push(
        rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Simulated OpenAI error' })
          );
        })
      );
    }

    this.mockServer.use(...errorHandlers);
  }

  // プロキシサーバーエラーをシミュレート
  simulateServerError(endpoint: string): void {
    this.mockServer.use(
      rest.all(`http://localhost:3001${endpoint}`, (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({
            success: false,
            error: 'Simulated server error'
          })
        );
      })
    );
  }

  // ネットワーク遅延をシミュレート
  simulateNetworkDelay(endpoint: string, delay: number): void {
    this.mockServer.use(
      rest.all(`http://localhost:3001${endpoint}`, (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({ success: true }),
          ctx.delay(delay)
        );
      })
    );
  }
}

// ==========================================
// Fetch API モック (MSW 未使用時のフォールバック)
// ==========================================

export class SimpleFetchMock {
  private originalFetch: typeof global.fetch;
  private mockResponses: Map<string, any> = new Map();

  constructor() {
    this.originalFetch = global.fetch;
  }

  setup(): void {
    global.fetch = jest.fn().mockImplementation(async (url: string, options?: any) => {
      const method = options?.method || 'GET';
      const key = `${method} ${url}`;
      
      const mockResponse = this.mockResponses.get(key) || this.mockResponses.get(url);
      
      if (mockResponse) {
        return Promise.resolve({
          ok: mockResponse.status < 400,
          status: mockResponse.status || 200,
          json: async () => mockResponse.data,
          text: async () => JSON.stringify(mockResponse.data)
        });
      }

      // デフォルト応答
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: null }),
        text: async () => '{"success": true, "data": null}'
      });
    });
  }

  teardown(): void {
    global.fetch = this.originalFetch;
    this.mockResponses.clear();
  }

  mockEndpoint(url: string, response: any, method: string = 'GET'): void {
    const key = `${method} ${url}`;
    this.mockResponses.set(key, response);
  }
}

// ==========================================
// エクスポート
// ==========================================

export {
  HTTPMockServer,
  HTTPTestHelper,
  SimpleFetchMock
};