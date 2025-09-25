# Mock Infrastructure Documentation

## 概要

このディレクトリには、AI Agent TRPG システムの包括的なモックインフラストラクチャが含まれています。全ての外部依存関係（AI プロバイダー、WebSocket、データベース、HTTP リクエスト）をモックし、信頼性の高いテスト環境を提供します。

## 📁 ファイル構成

```
mocks/
├── README.md                     # このファイル
├── index.ts                      # 統合エクスポート
├── mockServer.ts                 # 統合モックサーバー
├── aiProviderMocks.ts           # AI プロバイダーモック
├── websocketMocks.ts            # WebSocket/Socket.io モック
├── databaseMocks.ts             # データベースモック
├── httpMocks.ts                 # HTTP リクエストモック（MSW）
└── contractValidation.test.ts   # 契約検証テスト
```

## 🚀 クイックスタート

### 基本的な使用方法

```typescript
import { quickMockSetup } from '../mocks';

describe('My Test Suite', () => {
  const getMockServer = quickMockSetup();

  test('should work with mocked services', async () => {
    const mockServer = getMockServer();
    const services = mockServer.getServices();
    
    // AI プロバイダーを使用
    const ai = services.aiProviders.createOpenAIMock('test-key');
    const response = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Generate a character' }]
    });
    
    // データベースを使用
    const campaign = await services.database.createTestCampaign();
    
    // WebSocket を使用
    const client = services.websocket.createClient();
    client.joinSession(campaign.id, 'player1');
    
    expect(response.choices[0].message.content).toBeDefined();
    expect(campaign.id).toBeDefined();
    expect(client.connected).toBe(true);
  });
});
```

## 🎯 モック種別と機能

### 1. AI プロバイダーモック (`aiProviderMocks.ts`)

#### 対応プロバイダー
- **OpenAI**: GPT-3.5, GPT-4 モデル
- **Anthropic**: Claude モデル  
- **Google**: Gemini モデル

#### 特徴
- 本番 API と同じレスポンス構造
- TRPG コンテンツに特化したリアルな応答
- エラーシナリオのシミュレーション
- レスポンス時間の調整可能

#### 使用例

```typescript
import { AIProviderMockFactory } from '../mocks';

// OpenAI モック
const openai = AIProviderMockFactory.createOpenAIMock('test-key');
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Generate a TRPG character' }]
});

// エラーシナリオ
openai.setMockScenario({
  scenario: 'api_error',
  customError: new Error('Rate limit exceeded')
});
```

#### リアルな応答例
- **キャラクター生成**: エルフ、ドワーフ、ヒューマンの詳細なキャラクター
- **イベント生成**: 古代遺跡、モンスター遭遇、宝箱発見
- **キャンペーン支援**: 世界観設定、シナリオ構成、ルール解説

### 2. WebSocket モック (`websocketMocks.ts`)

#### 機能
- Socket.IO サーバー/クライアント の完全モック
- リアルタイム通信のシミュレーション
- セッション管理とルーム機能
- 接続状態の管理

#### 使用例

```typescript
import { WebSocketTestHelper } from '../mocks';

const wsHelper = new WebSocketTestHelper();
const client = wsHelper.createClient();

// セッション参加
client.joinSession('session-001', 'player1');

// プレイヤーアクション送信
client.sendPlayerAction('session-001', 'player1', {
  action: 'move',
  target: 'north',
  message: 'I move north to investigate the sound'
});

// GM レスポンス送信
const server = wsHelper.getServer();
server.broadcastToSession('session-001', 'gm_response', {
  message: 'You hear footsteps echoing in the distance...',
  newLocation: 'Dark Corridor'
});
```

#### セッションメッセージ構造
```typescript
interface SessionMessage {
  type: 'join_session' | 'leave_session' | 'session_update' | 'player_action' | 'gm_response';
  sessionId: string;
  playerId?: string;
  data?: any;
  timestamp?: string;
}
```

### 3. データベースモック (`databaseMocks.ts`)

#### 機能
- better-sqlite3 の完全モック
- インメモリ データストレージ
- 外部キー制約と参照整合性
- TRPG エンティティのサポート

#### 使用例

```typescript
import { DatabaseTestHelper } from '../mocks';

const dbHelper = new DatabaseTestHelper();
const db = await dbHelper.setupTestDatabase();

// キャンペーン作成
const campaign = await dbHelper.createTestCampaign({
  name: 'ドラゴンクエスト',
  gameSystem: 'D&D 5e'
});

// キャラクター作成（外部キー制約あり）
const character = await dbHelper.createTestCharacter(campaign.id, {
  name: 'エルフの弓使い',
  race: 'エルフ',
  characterClass: 'レンジャー'
});

// データ取得
const retrievedCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign.id);
```

#### サポートテーブル
- `campaigns` - TRPG キャンペーン
- `characters` - PC/NPC/Enemy キャラクター
- `sessions` - セッション記録
- `events` - セッション内イベント
- `quests` - クエスト管理
- `locations` - 場所・地域
- `ai_requests` - AI リクエストログ

### 4. HTTP モック (`httpMocks.ts`)

#### 機能
- MSW (Mock Service Worker) ベース
- プロキシサーバー API のモック
- 外部 AI API のモック
- エラーシナリオとタイムアウト

#### 使用例

```typescript
import { HTTPTestHelper } from '../mocks';

const httpHelper = new HTTPTestHelper();
await httpHelper.setupHTTPMocks();

// API テスト
const response = await fetch('http://localhost:3001/api/ai-agent/test-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'openai',
    apiKey: 'test-key'
  })
});

const data = await response.json();
expect(data.success).toBe(true);

// エラーシミュレーション
httpHelper.simulateServerError('/api/ai-agent/generate-character');
```

#### モックエンドポイント
- `/api/ai-agent/test-key` - AI 接続テスト
- `/api/ai-agent/generate-character` - キャラクター生成
- `/api/ai-agent/generate-event` - イベント生成
- `/api/ai-agent/gm-assistance` - GM 支援
- `/api/campaigns` - キャンペーン管理
- `/api/sessions/:campaignId` - セッション管理

## 🔧 統合モックサーバー

### IntegratedMockServer

全てのモックサービスを統一管理するメインクラスです。

```typescript
import { IntegratedMockServer } from '../mocks';

const mockServer = new IntegratedMockServer({
  // AI プロバイダー設定
  aiProviders: {
    enableMocks: true,
    defaultScenario: 'success',
    simulateLatency: 100
  },
  
  // データベース設定
  database: {
    enableMocks: true,
    seedTestData: true,
    enableForeignKeys: true
  },
  
  // WebSocket 設定
  websocket: {
    enableMocks: true,
    simulateLatency: 50,
    simulateErrors: false
  },
  
  // HTTP 設定
  http: {
    enableMocks: true,
    simulateLatency: 100,
    useMSW: true
  },
  
  // 全般設定
  general: {
    enableLogging: false,
    resetBetweenTests: true
  }
});

const services = await mockServer.start();
// テスト実行
await mockServer.stop();
```

## 📋 プリセット設定

### 用途別プリセット

```typescript
import { 
  quickMockSetup,           // 基本的なテスト用
  aiOnlyMockSetup,          // AI テスト専用
  databaseOnlyMockSetup,    // データベーステスト専用
  websocketOnlyMockSetup,   // WebSocket テスト専用
  fullIntegrationMockSetup, // 統合テスト用
  errorScenarioMockSetup    // エラーテスト用
} from '../mocks';

// 用途に応じてプリセットを選択
describe('AI Tests', () => {
  const getMockServer = aiOnlyMockSetup();
  // テストコード
});

describe('Integration Tests', () => {
  const getMockServer = fullIntegrationMockSetup();
  // テストコード
});
```

## 🧪 テストシナリオ例

### 1. 基本的な AI テスト

```typescript
test('should generate character with OpenAI', async () => {
  const mockAI = AIProviderMockFactory.createOpenAIMock('test-key');
  
  const response = await mockAI.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Generate D&D character' }]
  });
  
  expect(response.choices[0].message.content).toContain('エルフ');
  expect(response.usage?.total_tokens).toBeGreaterThan(0);
});
```

### 2. データベース関係テスト

```typescript
test('should maintain foreign key relationships', async () => {
  const services = mockServer.getServices();
  
  const campaign = await services.database.createTestCampaign();
  const character = await services.database.createTestCharacter(campaign.id);
  
  expect(character.campaignId).toBe(campaign.id);
  
  // 外部キー制約違反をテスト
  expect(() => {
    services.db.getDataStore().insert('characters', {
      campaign_id: 'invalid-id'
    });
  }).toThrow(/Foreign key constraint violation/);
});
```

### 3. リアルタイム通信テスト

```typescript
test('should handle session communication', async () => {
  const services = mockServer.getServices();
  const wsHelper = services.websocket;
  
  const gm = wsHelper.createClient({ id: 'gm' });
  const player = wsHelper.createClient({ id: 'player' });
  
  const messages: any[] = [];
  [gm, player].forEach(client => {
    client.on('session_message', (msg) => messages.push(msg));
  });
  
  gm.joinSession('test-session', 'gm');
  player.joinSession('test-session', 'player');
  
  player.sendPlayerAction('test-session', 'player', {
    action: 'attack',
    target: 'goblin'
  });
  
  gm.sendGMResponse('test-session', {
    outcome: 'hit',
    damage: 8
  });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  expect(messages.length).toBeGreaterThan(0);
  const actionMsg = messages.find(m => m.type === 'player_action');
  const responseMsg = messages.find(m => m.type === 'gm_response');
  
  expect(actionMsg).toBeDefined();
  expect(responseMsg).toBeDefined();
});
```

### 4. エラーハンドリングテスト

```typescript
test('should handle AI API errors gracefully', async () => {
  const mockAI = AIProviderMockFactory.createOpenAIMock('test-key');
  
  mockAI.setMockScenario({
    scenario: 'rate_limit',
    customError: new Error('Rate limit exceeded')
  });
  
  await expect(mockAI.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'test' }]
  })).rejects.toThrow('Rate limit exceeded');
});
```

## 🔍 契約検証

### API 契約の整合性確認

`contractValidation.test.ts` では、全てのモックが本番 API との契約を正確に満たしていることを検証します：

- **AI プロバイダー**: レスポンス構造の一致
- **データベース**: エンティティ型との整合性
- **WebSocket**: メッセージ形式の一致
- **HTTP API**: エンドポイント仕様の遵守

## 📊 パフォーマンス考慮事項

### レスポンス時間の調整

```typescript
// 高速テスト用（10ms）
const fastMockServer = new IntegratedMockServer({
  aiProviders: { simulateLatency: 10 },
  websocket: { simulateLatency: 5 },
  http: { simulateLatency: 5 }
});

// リアルな遅延テスト用（100-200ms）
const realisticMockServer = new IntegratedMockServer({
  aiProviders: { simulateLatency: 150 },
  websocket: { simulateLatency: 50 },
  http: { simulateLatency: 100 }
});
```

### 並行処理テスト

```typescript
test('should handle concurrent requests', async () => {
  const mockAI = AIProviderMockFactory.createOpenAIMock('test-key');
  
  const promises = Array.from({ length: 10 }, (_, i) => 
    mockAI.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: `Request ${i}` }]
    })
  );
  
  const results = await Promise.all(promises);
  expect(results).toHaveLength(10);
});
```

## 🛠️ カスタマイズ

### カスタムモックレスポンス

```typescript
const mockAI = AIProviderMockFactory.createOpenAIMock('test-key');

mockAI.setMockScenario({
  scenario: 'success',
  customResponse: JSON.stringify({
    name: "カスタムキャラクター",
    class: "忍者",
    special_ability: "影分身"
  })
});
```

### カスタム HTTP エンドポイント

```typescript
import { rest } from 'msw';

const httpHelper = new HTTPTestHelper();
httpHelper.use(
  rest.post('/api/custom-endpoint', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ custom: 'response' })
    );
  })
);
```

## 🚨 注意事項

### 1. テスト分離
- 各テスト間でモックをリセット
- beforeEach での状態クリア
- 適切なクリーンアップ

### 2. メモリ管理
- 大量データの生成に注意
- 長時間実行テストでのリークチェック
- WebSocket 接続の適切な切断

### 3. エラーハンドリング
- 全てのエラーシナリオをテスト
- タイムアウト処理の確認
- リトライロジックの検証

## 📖 関連ドキュメント

- [TRPG_SESSION_TEST_GUIDE.md](../TRPG_SESSION_TEST_GUIDE.md) - セッション機能テストガイド
- [プロジェクト概要](../../../../docs/プロジェクト概要/) - 全体アーキテクチャ
- [TypeScript Types](../../../../packages/types/) - 共通型定義

## 🤝 コントリビューション

新しいモック機能を追加する場合：

1. 本番 API との契約整合性を確保
2. 適切なエラーハンドリングを実装
3. 契約検証テストを追加
4. 使用例とドキュメントを更新

## 📝 ライセンス

このモックインフラストラクチャは、TRPG AI Agent プロジェクトの一部として MIT ライセンスの下で提供されています。