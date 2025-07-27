// ==========================================
// モックインフラストラクチャ使用例
// 各種テストシナリオでの使用方法を示すサンプル
// ==========================================

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { 
  quickMockSetup,
  aiOnlyMockSetup,
  databaseOnlyMockSetup,
  websocketOnlyMockSetup,
  fullIntegrationMockSetup,
  errorScenarioMockSetup,
  AIProviderMockFactory,
  IntegratedMockServer,
  type MockServerServices
} from '../mocks';

// ==========================================
// 基本的な使用例
// ==========================================

describe('Mock Infrastructure Usage Examples', () => {
  
  // ==========================================
  // 例1: 簡単なAIプロバイダーテスト
  // ==========================================
  
  describe('Example 1: Simple AI Provider Testing', () => {
    const getMockServer = aiOnlyMockSetup();

    test('should generate TRPG character using OpenAI mock', async () => {
      const mockOpenAI = AIProviderMockFactory.createOpenAIMock('test-key');
      
      const response = await mockOpenAI.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Generate a character for D&D campaign' }],
        temperature: 0.7,
        max_tokens: 500
      });

      expect(response.choices[0].message.content).toContain('エルフ');
      expect(response.usage?.total_tokens).toBeGreaterThan(0);
      expect(response.model).toBe('gpt-3.5-turbo');
    });

    test('should handle different AI providers', async () => {
      // OpenAI
      const openai = AIProviderMockFactory.createOpenAIMock('openai-key');
      const openaiResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Generate an event' }]
      });

      // Anthropic
      const anthropic = AIProviderMockFactory.createAnthropicMock('anthropic-key');
      const anthropicResponse = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: 'Create a campaign setting' }]
      });

      // Google
      const google = AIProviderMockFactory.createGoogleMock('google-key');
      const model = google.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
      const googleResponse = await model.generateContent('Generate milestones');

      // 各プロバイダーが適切に応答することを確認
      expect(openaiResponse.choices[0].message.content).toContain('遺跡');
      expect(anthropicResponse.content[0].text).toContain('キャンペーン');
      expect(googleResponse.response.text()).toContain('milestone');
    });
  });

  // ==========================================
  // 例2: データベーステスト
  // ==========================================

  describe('Example 2: Database Testing', () => {
    const getMockServer = databaseOnlyMockSetup();

    test('should create and retrieve TRPG campaign', async () => {
      const mockServer = getMockServer();
      const services = mockServer.getServices();
      
      // キャンペーンを作成
      const campaign = await services.database.createTestCampaign({
        name: 'ドラゴンクエスト',
        description: '伝説のドラゴンを討伐する冒険',
        gameSystem: 'D&D 5e'
      });

      // データベースから取得
      const db = services.db;
      const retrievedCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign.id);

      expect(retrievedCampaign).toBeDefined();
      expect(retrievedCampaign.name).toBe('ドラゴンクエスト');
      expect(retrievedCampaign.gameSystem).toBe('D&D 5e');
    });

    test('should maintain referential integrity', async () => {
      const mockServer = getMockServer();
      const services = mockServer.getServices();
      
      // キャンペーンを作成
      const campaign = await services.database.createTestCampaign();
      
      // そのキャンペーンにキャラクターを作成
      const character = await services.database.createTestCharacter(campaign.id, {
        name: 'エルフの弓使い',
        race: 'エルフ',
        characterClass: 'レンジャー'
      });

      expect(character.campaignId).toBe(campaign.id);
      
      // データベースでの関係を確認
      const db = services.db;
      const relatedCharacters = db.prepare('SELECT * FROM characters WHERE campaign_id = ?').all(campaign.id);
      
      expect(relatedCharacters).toHaveLength(1);
      expect(relatedCharacters[0].name).toBe('エルフの弓使い');
    });
  });

  // ==========================================
  // 例3: WebSocketテスト
  // ==========================================

  describe('Example 3: WebSocket Testing', () => {
    const getMockServer = websocketOnlyMockSetup();

    test('should handle session communication', async () => {
      const mockServer = getMockServer();
      const services = mockServer.getServices();
      const wsHelper = services.websocket;
      
      // 複数のクライアントを作成
      const gamemaster = wsHelper.createClient({ id: 'gm-001' });
      const player1 = wsHelper.createClient({ id: 'player-001' });
      const player2 = wsHelper.createClient({ id: 'player-002' });

      const sessionId = 'test-session-001';
      
      // セッション参加
      gamemaster.joinSession(sessionId, 'gm');
      player1.joinSession(sessionId, 'player1');
      player2.joinSession(sessionId, 'player2');

      // メッセージ受信のセットアップ
      const messages: any[] = [];
      [gamemaster, player1, player2].forEach(client => {
        client.on('session_message', (message) => {
          messages.push({ clientId: client.id, message });
        });
      });

      // プレイヤーアクションを送信
      player1.sendPlayerAction(sessionId, 'player1', {
        action: 'cast_spell',
        target: 'goblin',
        spell: 'fireball'
      });

      // GMレスポンスを送信
      gamemaster.sendGMResponse(sessionId, {
        outcome: 'success',
        damage: 24,
        description: 'ファイアボールがゴブリンを包み込みます！'
      });

      // メッセージ処理を待機
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messages.length).toBeGreaterThan(0);
      
      // プレイヤーアクションメッセージを確認
      const playerActionMessage = messages.find(m => 
        m.message.type === 'player_action' && m.message.data.action === 'cast_spell'
      );
      expect(playerActionMessage).toBeDefined();
      
      // GMレスポンスメッセージを確認
      const gmResponseMessage = messages.find(m => 
        m.message.type === 'gm_response' && m.message.data.damage === 24
      );
      expect(gmResponseMessage).toBeDefined();
    });

    test('should handle connection states', async () => {
      const mockServer = getMockServer();
      const services = mockServer.getServices();
      const wsHelper = services.websocket;
      
      const client = wsHelper.createClient({ autoConnect: false });
      
      expect(client.connected).toBe(false);
      expect(client.disconnected).toBe(true);
      
      // 接続
      client.connect();
      await wsHelper.waitForEvent(client, 'connect', 1000);
      
      expect(client.connected).toBe(true);
      expect(client.disconnected).toBe(false);
      
      // 切断
      client.disconnect();
      expect(client.connected).toBe(false);
      expect(client.disconnected).toBe(true);
    });
  });

  // ==========================================
  // 例4: 統合テスト
  // ==========================================

  describe('Example 4: Full Integration Testing', () => {
    const getMockServer = fullIntegrationMockSetup();

    test('should simulate complete TRPG session workflow', async () => {
      const mockServer = getMockServer();
      const services = mockServer.getServices();
      
      // 1. キャンペーンとキャラクターをセットアップ
      const campaign = await services.database.createTestCampaign({
        name: '魔王討伐の旅',
        gameSystem: 'D&D 5e'
      });

      const character1 = await services.database.createTestCharacter(campaign.id, {
        name: '戦士ガルム',
        characterClass: 'ファイター',
        playerId: 'player1'
      });

      const character2 = await services.database.createTestCharacter(campaign.id, {
        name: '魔法使いルナ',
        characterClass: 'ウィザード',
        playerId: 'player2'
      });

      // 2. セッションをセットアップ
      const session = await services.database.createTestSession(campaign.id, {
        title: '第1話：魔王城への道',
        status: 'active'
      });

      // 3. WebSocket接続をシミュレート
      const gmClient = services.websocket.createClient({ id: 'gm-client' });
      const player1Client = services.websocket.createClient({ id: 'player1-client' });
      const player2Client = services.websocket.createClient({ id: 'player2-client' });

      // セッション参加
      gmClient.joinSession(session.id, 'gm');
      player1Client.joinSession(session.id, character1.playerId!);
      player2Client.joinSession(session.id, character2.playerId!);

      // 4. AI を使用してイベント生成
      const aiProvider = services.aiProviders.createOpenAIMock('test-key');
      const eventGeneration = await aiProvider.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Generate an encounter event for fantasy TRPG' }]
      });

      // 5. プレイヤーアクションとGMレスポンスのシミュレート
      const sessionMessages: any[] = [];
      [gmClient, player1Client, player2Client].forEach(client => {
        client.on('session_message', (message) => {
          sessionMessages.push(message);
        });
      });

      // プレイヤー1のアクション
      player1Client.sendPlayerAction(session.id, character1.playerId!, {
        action: 'attack',
        target: 'orc',
        weapon: 'sword'
      });

      // プレイヤー2のアクション
      player2Client.sendPlayerAction(session.id, character2.playerId!, {
        action: 'cast_spell',
        target: 'orc',
        spell: 'magic_missile'
      });

      // GMのレスポンス
      gmClient.sendGMResponse(session.id, {
        outcome: 'combat_victory',
        experience: 300,
        loot: ['ゴールド50枚', '魔法のポーション'],
        narrative: '見事にオークを倒しました！'
      });

      await new Promise(resolve => setTimeout(resolve, 150));

      // 6. 結果検証
      expect(campaign.id).toBeDefined();
      expect(character1.campaignId).toBe(campaign.id);
      expect(character2.campaignId).toBe(campaign.id);
      expect(session.campaignId).toBe(campaign.id);
      
      expect(eventGeneration.choices[0].message.content).toContain('遺跡');
      expect(sessionMessages.length).toBeGreaterThan(0);
      
      const playerActions = sessionMessages.filter(msg => msg.type === 'player_action');
      const gmResponses = sessionMessages.filter(msg => msg.type === 'gm_response');
      
      expect(playerActions).toHaveLength(2);
      expect(gmResponses).toHaveLength(1);
      expect(gmResponses[0].data.experience).toBe(300);
    });
  });

  // ==========================================
  // 例5: エラーシナリオテスト
  // ==========================================

  describe('Example 5: Error Scenario Testing', () => {
    test('should handle AI provider failures gracefully', async () => {
      const mockOpenAI = AIProviderMockFactory.createOpenAIMock('test-key');
      
      // APIエラーをシミュレート
      mockOpenAI.setMockScenario({
        scenario: 'api_error',
        customError: new Error('API rate limit exceeded')
      });

      await expect(mockOpenAI.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }]
      })).rejects.toThrow('API rate limit exceeded');
    });

    test('should handle database constraint violations', async () => {
      const mockServer = new IntegratedMockServer({
        database: { enableMocks: true, enableForeignKeys: true }
      });
      
      const services = await mockServer.start();
      
      try {
        const db = services.db;
        const dataStore = db.getDataStore();
        
        // 存在しないキャンペーンIDでキャラクター作成を試行
        expect(() => {
          dataStore.insert('characters', {
            name: 'Invalid Character',
            campaign_id: 'non-existent-campaign-id',
            character_type: 'PC'
          });
        }).toThrow(/Foreign key constraint violation/);
      } finally {
        await mockServer.stop();
      }
    });

    test('should handle WebSocket connection failures', async () => {
      const mockServer = new IntegratedMockServer({
        websocket: { enableMocks: true, simulateErrors: true }
      });
      
      const services = await mockServer.start();
      
      try {
        const wsHelper = services.websocket;
        const client = wsHelper.createClient({ simulateErrors: true });
        
        let errorOccurred = false;
        client.on('error', (error) => {
          errorOccurred = true;
          expect(error).toBeInstanceOf(Error);
        });
        
        // 大量のイベントを発火してエラーを誘発
        for (let i = 0; i < 50; i++) {
          client.emit('test-event', `data-${i}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // エラーが発生する可能性がある（確率的）
      } finally {
        await mockServer.stop();
      }
    });
  });

  // ==========================================
  // 例6: パフォーマンステスト
  // ==========================================

  describe('Example 6: Performance Testing with Mocks', () => {
    const getMockServer = quickMockSetup({
      aiProviders: { simulateLatency: 50 },
      websocket: { simulateLatency: 10 },
      http: { simulateLatency: 30 }
    });

    test('should handle concurrent AI requests', async () => {
      const mockAI = AIProviderMockFactory.createOpenAIMock('test-key');
      
      const startTime = Date.now();
      
      // 並行してAIリクエストを実行
      const promises = Array.from({ length: 10 }, (_, i) => 
        mockAI.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: `Generate character ${i}` }]
        })
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(200); // 並行実行により高速
      
      results.forEach((result, index) => {
        expect(result.choices[0].message.content).toBeDefined();
      });
    });

    test('should handle high-frequency WebSocket events', async () => {
      const mockServer = getMockServer();
      const services = mockServer.getServices();
      const wsHelper = services.websocket;
      
      const client = wsHelper.createClient();
      const sessionId = 'performance-test-session';
      
      client.joinSession(sessionId, 'performance-player');
      
      const messages: any[] = [];
      client.on('session_message', (message) => {
        messages.push(message);
      });
      
      const startTime = Date.now();
      
      // 高頻度でメッセージを送信
      for (let i = 0; i < 100; i++) {
        client.sendPlayerAction(sessionId, 'performance-player', {
          action: 'move',
          step: i,
          timestamp: Date.now()
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      const endTime = Date.now();
      
      expect(messages.length).toBeGreaterThan(50); // 全てが処理される必要はない
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});