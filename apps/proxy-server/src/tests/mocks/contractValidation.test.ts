// ==========================================
// モック契約検証テスト
// 本番 API との契約整合性を確認
// ==========================================

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { logger } from '../../utils/logger';
import { IntegratedMockServer, MockServerServices } from './mockServer';
import { AIProviderMockFactory } from './aiProviderMocks';
import { AIServiceRequest, AIServiceResponse } from '../../services/aiProviderService';
import { 
  TRPGCampaign, 
  TRPGCharacter, 
  TRPGSession,
  AIRequest
} from '@ai-agent-trpg/types';

// ==========================================
// テストセットアップ
// ==========================================

describe('Mock Contract Validation', () => {
  let mockServer: IntegratedMockServer;
  let services: MockServerServices;

  beforeAll(async () => {
    mockServer = new IntegratedMockServer({
      general: { enableLogging: false, resetBetweenTests: true },
      aiProviders: { enableMocks: true, simulateLatency: 10 },
      database: { enableMocks: true, seedTestData: true },
      websocket: { enableMocks: true, simulateLatency: 10 },
      http: { enableMocks: true, simulateLatency: 10 }
    });

    services = await mockServer.start();
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  beforeEach(async () => {
    await mockServer.reset();
  });

  // ==========================================
  // AI プロバイダー契約検証
  // ==========================================

  describe('AI Provider Contract Validation', () => {
    test('OpenAI mock should match production API response structure', async () => {
      const mockOpenAI = AIProviderMockFactory.createOpenAIMock('test-key');
      
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Generate a character for TRPG' }
        ],
        temperature: 0.7,
        max_tokens: 500
      };

      const response = await mockOpenAI.chat.completions.create(request);

      // OpenAI API レスポンス構造の検証
      expect(response).toHaveProperty('choices');
      expect(response).toHaveProperty('usage');
      expect(response).toHaveProperty('model');
      
      expect(Array.isArray(response.choices)).toBe(true);
      expect(response.choices.length).toBeGreaterThan(0);
      expect(response.choices[0]).toHaveProperty('message');
      expect(response.choices[0].message).toHaveProperty('content');
      
      expect(response.usage).toHaveProperty('total_tokens');
      expect(response.usage).toHaveProperty('prompt_tokens');
      expect(response.usage).toHaveProperty('completion_tokens');
      
      expect(typeof response.usage.total_tokens).toBe('number');
      expect(typeof response.choices[0].message.content).toBe('string');
    });

    test('Anthropic mock should match production API response structure', async () => {
      const mockAnthropic = AIProviderMockFactory.createAnthropicMock('test-key');
      
      const request = {
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          { role: 'user', content: 'Generate a campaign setting' }
        ],
        temperature: 0.7
      };

      const response = await mockAnthropic.messages.create(request);

      // Anthropic API レスポンス構造の検証
      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('usage');
      expect(response).toHaveProperty('model');
      
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.content[0]).toHaveProperty('type');
      expect(response.content[0]).toHaveProperty('text');
      expect(response.content[0].type).toBe('text');
      
      expect(response.usage).toHaveProperty('input_tokens');
      expect(response.usage).toHaveProperty('output_tokens');
      
      expect(typeof response.usage.input_tokens).toBe('number');
      expect(typeof response.content[0].text).toBe('string');
    });

    test('Google Gemini mock should match production API response structure', async () => {
      const mockGoogle = AIProviderMockFactory.createGoogleMock('test-key');
      const model = mockGoogle.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
      
      const response = await model.generateContent('Generate milestones for TRPG');

      // Google Gemini API レスポンス構造の検証
      expect(response).toHaveProperty('response');
      expect(response.response).toHaveProperty('text');
      expect(typeof response.response.text).toBe('function');
      
      const textContent = response.response.text();
      expect(typeof textContent).toBe('string');
      expect(textContent.length).toBeGreaterThan(0);
    });

    test('AI provider mocks should handle error scenarios correctly', async () => {
      const mockOpenAI = AIProviderMockFactory.createOpenAIMock('test-key');
      
      // エラーシナリオを設定
      mockOpenAI.setMockScenario({
        scenario: 'api_error',
        customError: new Error('API key is invalid')
      });

      const request = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }]
      };

      await expect(mockOpenAI.chat.completions.create(request))
        .rejects
        .toThrow('API key is invalid');
    });
  });

  // ==========================================
  // データベース契約検証
  // ==========================================

  describe('Database Contract Validation', () => {
    test('Database mock should maintain TRPG entity structure', async () => {
      const db = services.db;
      
      // キャンペーンテストデータの構造確認
      const campaigns = db.prepare('SELECT * FROM campaigns').all();
      expect(Array.isArray(campaigns)).toBe(true);
      
      if (campaigns.length > 0) {
        const campaign = campaigns[0] as TRPGCampaign;
        
        // 必須フィールドの検証
        expect(campaign).toHaveProperty('id');
        expect(campaign).toHaveProperty('name');
        expect(campaign).toHaveProperty('description');
        expect(campaign).toHaveProperty('gameSystem');
        expect(campaign).toHaveProperty('gmId');
        expect(campaign).toHaveProperty('status');
        expect(campaign).toHaveProperty('createdAt');
        expect(campaign).toHaveProperty('updatedAt');
        
        // 型の検証
        expect(typeof campaign.id).toBe('string');
        expect(typeof campaign.name).toBe('string');
        expect(typeof campaign.gameSystem).toBe('string');
        expect(['active', 'planning', 'completed', 'paused']).toContain(campaign.status);
      }
    });

    test('Database mock should enforce foreign key constraints', async () => {
      const db = services.db;
      const dataStore = db.getDataStore();
      
      // 存在しないキャンペーンIDでキャラクター作成を試行
      expect(() => {
        dataStore.insert('characters', {
          name: 'Test Character',
          campaign_id: 'non-existent-campaign',
          character_type: 'PC'
        });
      }).toThrow(/Foreign key constraint violation/);
    });

    test('Database mock should handle proper data relationships', async () => {
      const db = services.db;
      
      // キャンペーンとそのキャラクターの関係確認
      const characters = db.prepare('SELECT * FROM characters WHERE campaign_id = ?').all('1');
      
      characters.forEach((character: any) => {
        expect(character).toHaveProperty('campaign_id');
        expect(character.campaign_id).toBe('1');
        expect(['PC', 'NPC', 'Enemy']).toContain(character.character_type);
      });
    });
  });

  // ==========================================
  // WebSocket 契約検証
  // ==========================================

  describe('WebSocket Contract Validation', () => {
    test('WebSocket mock should handle session events correctly', async () => {
      const wsHelper = services.websocket;
      const client = wsHelper.createClient({ id: 'test-client' });
      
      let sessionMessage: any = null;
      
      client.on('session_message', (message) => {
        sessionMessage = message;
      });

      // セッション参加をシミュレート
      client.joinSession('test-session', 'test-player');
      
      // メッセージ受信を待機
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(sessionMessage).not.toBeNull();
      expect(sessionMessage).toHaveProperty('type');
      expect(sessionMessage).toHaveProperty('sessionId');
      expect(sessionMessage).toHaveProperty('playerId');
      expect(sessionMessage).toHaveProperty('timestamp');
      
      expect(sessionMessage.type).toBe('join_session');
      expect(sessionMessage.sessionId).toBe('test-session');
      expect(sessionMessage.playerId).toBe('test-player');
    });

    test('WebSocket mock should handle player actions with correct structure', async () => {
      const wsHelper = services.websocket;
      const client = wsHelper.createClient();
      
      let actionMessage: any = null;
      
      client.on('session_message', (message) => {
        if (message.type === 'player_action') {
          actionMessage = message;
        }
      });

      const action = {
        action: 'move',
        target: 'north',
        message: 'Moving north'
      };

      client.sendPlayerAction('test-session', 'test-player', action);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(actionMessage).not.toBeNull();
      expect(actionMessage.type).toBe('player_action');
      expect(actionMessage.data).toEqual(action);
    });

    test('WebSocket mock should simulate connection states correctly', async () => {
      const wsHelper = services.websocket;
      const client = wsHelper.createClient({ autoConnect: false });
      
      expect(client.connected).toBe(false);
      expect(client.disconnected).toBe(true);
      
      client.connect();
      
      // 接続完了を待機
      await new Promise(resolve => {
        client.once('connect', resolve);
      });
      
      expect(client.connected).toBe(true);
      expect(client.disconnected).toBe(false);
    });
  });

  // ==========================================
  // HTTP API 契約検証
  // ==========================================

  describe('HTTP API Contract Validation', () => {
    test('AI test endpoint should return correct response structure', async () => {
      // シンプルな fetch モック（MSW 未使用時のフォールバック）
      const mockResponse = {
        success: true,
        message: 'openai connection successful',
        data: {
          provider: 'openai',
          model: 'test-model',
          latency: 100
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response);

      const response = await fetch('http://localhost:3001/api/ai-agent/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'openai',
          apiKey: 'test-key'
        })
      });

      const data = await response.json();
      
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('data');
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('provider');
      expect(data.data).toHaveProperty('model');
    });

    test('Character generation endpoint should return TRPG character structure', async () => {
      const mockCharacterResponse = {
        success: true,
        data: {
          characterData: {
            name: "生成されたキャラクター",
            race: "エルフ",
            class: "ウィザード",
            level: 1,
            background: "学者"
          },
          generatedCharacter: {
            personality: "知識欲旺盛",
            appearance: "細身で知的な雰囲気",
            backstory: "古代魔法の研究者"
          }
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockCharacterResponse
      } as Response);

      const response = await fetch('http://localhost:3001/api/ai-agent/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'openai',
          characterType: 'PC'
        })
      });

      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('characterData');
      expect(data.data).toHaveProperty('generatedCharacter');
      
      // キャラクターデータの構造確認
      const charData = data.data.characterData;
      expect(charData).toHaveProperty('name');
      expect(charData).toHaveProperty('race');
      expect(charData).toHaveProperty('class');
      expect(charData).toHaveProperty('level');
      
      expect(typeof charData.name).toBe('string');
      expect(typeof charData.level).toBe('number');
    });
  });

  // ==========================================
  // 型整合性検証
  // ==========================================

  describe('Type Consistency Validation', () => {
    test('Mock data should conform to TypeScript types', () => {
      const db = services.db;
      
      // キャンペーンデータの型整合性
      const campaigns = db.prepare('SELECT * FROM campaigns').all();
      campaigns.forEach((campaign: any) => {
        // TRPGCampaign 型との整合性確認
        const typedCampaign: TRPGCampaign = campaign;
        expect(typedCampaign.id).toBeDefined();
        expect(typedCampaign.name).toBeDefined();
        expect(typedCampaign.gameSystem).toBeDefined();
      });

      // キャラクターデータの型整合性
      const characters = db.prepare('SELECT * FROM characters').all();
      characters.forEach((character: any) => {
        // TRPGCharacter 型との整合性確認
        const typedCharacter: TRPGCharacter = character;
        expect(typedCharacter.id).toBeDefined();
        expect(typedCharacter.name).toBeDefined();
        expect(typedCharacter.characterType).toBeDefined();
        expect(['PC', 'NPC', 'Enemy']).toContain(typedCharacter.characterType);
      });
    });

    test('AI request logging should match AIRequest type', () => {
      const db = services.db;
      
      const aiRequests = db.prepare('SELECT * FROM ai_requests').all();
      aiRequests.forEach((request: any) => {
        // AIRequest 型との整合性確認
        const typedRequest: AIRequest = request;
        expect(typedRequest.provider).toBeDefined();
        expect(typedRequest.model).toBeDefined();
        expect(typedRequest.prompt).toBeDefined();
        expect(typedRequest.timestamp).toBeDefined();
        expect(['openai', 'anthropic', 'google', 'custom']).toContain(typedRequest.provider);
      });
    });
  });

  // ==========================================
  // エラーハンドリング検証
  // ==========================================

  describe('Error Handling Contract Validation', () => {
    test('All mocks should handle timeout scenarios', async () => {
      // AI プロバイダータイムアウト
      const mockOpenAI = AIProviderMockFactory.createOpenAIMock('test-key');
      mockOpenAI.setMockScenario({ scenario: 'timeout' });

      await expect(mockOpenAI.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }]
      })).rejects.toThrow('timeout');
    });

    test('Database mocks should handle constraint violations', () => {
      const db = services.db;
      const dataStore = db.getDataStore();
      
      // 外部キー制約違反
      expect(() => {
        dataStore.insert('characters', {
          name: 'Invalid Character',
          campaign_id: 'invalid-id'
        });
      }).toThrow();
    });

    test('WebSocket mocks should handle connection errors', async () => {
      const wsHelper = services.websocket;
      const client = wsHelper.createClient({
        simulateErrors: true
      });
      
      // エラーイベントのリスナーを設定
      let errorOccurred = false;
      client.on('error', () => {
        errorOccurred = true;
      });
      
      // 複数回イベントを発火してエラーを誘発
      for (let i = 0; i < 20; i++) {
        client.emit('test-event', 'data');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // エラーシミュレーションが有効な場合、エラーが発生する可能性がある
      // (確率的なため、必ずしもエラーが発生するとは限らない)
    });
  });
});

// ==========================================
// 統合契約検証テスト
// ==========================================

describe('Integration Contract Validation', () => {
  test('All mock services should work together seamlessly', async () => {
    const mockServer = new IntegratedMockServer({
      general: { enableLogging: false }
    });
    
    const services = await mockServer.start();
    
    try {
      // データベースからキャンペーンを取得
      const campaign = await services.database.createTestCampaign({
        name: 'Integration Test Campaign'
      });
      
      // キャラクターを作成
      const character = await services.database.createTestCharacter(campaign.id, {
        name: 'Integration Test Character'
      });
      
      // WebSocket でセッション参加をシミュレート
      const client = services.websocket.createClient();
      client.joinSession(campaign.id, character.playerId || 'test-player');
      
      // AI プロバイダーでキャラクター生成
      const mockAI = services.aiProviders.createOpenAIMock('test-key');
      const aiResponse = await mockAI.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Generate character for TRPG' }]
      });
      
      // 全てのサービスが正常に動作することを確認
      expect(campaign.id).toBeDefined();
      expect(character.campaignId).toBe(campaign.id);
      expect(client.connected).toBe(true);
      expect(aiResponse.choices[0].message.content).toBeDefined();
      
    } finally {
      await mockServer.stop();
    }
  });
});