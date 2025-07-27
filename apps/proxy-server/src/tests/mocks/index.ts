// ==========================================
// モックインフラストラクチャ統合エクスポート
// 全てのモック機能への統一アクセスポイント
// ==========================================

// ==========================================
// AI プロバイダーモック
// ==========================================
export {
  MockOpenAI,
  MockAnthropic,
  MockGoogleGenerativeAI,
  AIProviderMockFactory,
  setupAIProviderMocks,
  type MockScenarioOptions
} from './aiProviderMocks';

// ==========================================
// WebSocket モック
// ==========================================
export {
  MockSocket,
  MockSocketIOServer,
  WebSocketTestHelper,
  setupWebSocketMocks,
  type MockSocketOptions,
  type MockServerOptions,
  type SessionMessage,
  type GMNotification
} from './websocketMocks';

// ==========================================
// データベースモック
// ==========================================
export {
  MockDatabase,
  MockDataStore,
  DatabaseTestHelper,
  setupDatabaseMocks,
  type MockDatabaseOptions,
  type MockQueryResult,
  type MockStatement
} from './databaseMocks';

// ==========================================
// HTTP モック
// ==========================================
export {
  HTTPMockServer,
  HTTPTestHelper,
  SimpleFetchMock,
  type MockAPIResponse,
  type MockAPIRequestBody,
  type HTTPMockOptions
} from './httpMocks';

// ==========================================
// 統合モックサーバー
// ==========================================
export {
  IntegratedMockServer,
  MockTestSetup,
  setupMockEnvironment,
  type MockServerConfig,
  type MockServerServices
} from './mockServer';

// ==========================================
// ユーティリティとヘルパー
// ==========================================

/**
 * 簡単なテストセットアップ用ヘルパー
 * Jest テストで素早くモック環境をセットアップ
 */
export const quickMockSetup = (config?: Partial<MockServerConfig>) => {
  return setupMockEnvironment({
    general: { enableLogging: false, resetBetweenTests: true },
    aiProviders: { enableMocks: true, simulateLatency: 10 },
    database: { enableMocks: true, seedTestData: true },
    websocket: { enableMocks: true, simulateLatency: 10 },
    http: { enableMocks: true, simulateLatency: 10 },
    ...config
  });
};

/**
 * AI テスト専用の軽量セットアップ
 * AI プロバイダーのみをモック
 */
export const aiOnlyMockSetup = () => {
  return setupMockEnvironment({
    general: { enableLogging: false },
    aiProviders: { enableMocks: true, simulateLatency: 10 },
    database: { enableMocks: false },
    websocket: { enableMocks: false },
    http: { enableMocks: false }
  });
};

/**
 * データベーステスト専用セットアップ
 * データベースのみをモック
 */
export const databaseOnlyMockSetup = () => {
  return setupMockEnvironment({
    general: { enableLogging: false },
    aiProviders: { enableMocks: false },
    database: { enableMocks: true, seedTestData: true },
    websocket: { enableMocks: false },
    http: { enableMocks: false }
  });
};

/**
 * WebSocket テスト専用セットアップ
 * WebSocket のみをモック
 */
export const websocketOnlyMockSetup = () => {
  return setupMockEnvironment({
    general: { enableLogging: false },
    aiProviders: { enableMocks: false },
    database: { enableMocks: false },
    websocket: { enableMocks: true, simulateLatency: 10 },
    http: { enableMocks: false }
  });
};

/**
 * 統合テスト用フルセットアップ
 * 全てのサービスをモック（パフォーマンス重視）
 */
export const fullIntegrationMockSetup = () => {
  return setupMockEnvironment({
    general: { enableLogging: false, resetBetweenTests: true },
    aiProviders: { 
      enableMocks: true, 
      simulateLatency: 5,
      defaultScenario: 'success'
    },
    database: { 
      enableMocks: true, 
      seedTestData: true,
      inMemory: true,
      enableForeignKeys: true
    },
    websocket: { 
      enableMocks: true, 
      simulateLatency: 5,
      simulateErrors: false
    },
    http: { 
      enableMocks: true, 
      simulateLatency: 5,
      simulateErrors: false,
      useMSW: true
    }
  });
};

/**
 * エラーシナリオテスト用セットアップ
 * エラー発生をシミュレート
 */
export const errorScenarioMockSetup = () => {
  return setupMockEnvironment({
    general: { enableLogging: true, resetBetweenTests: true },
    aiProviders: { 
      enableMocks: true, 
      simulateLatency: 100,
      defaultScenario: 'api_error'
    },
    database: { 
      enableMocks: true, 
      seedTestData: false,
      enableForeignKeys: true
    },
    websocket: { 
      enableMocks: true, 
      simulateLatency: 100,
      simulateErrors: true
    },
    http: { 
      enableMocks: true, 
      simulateLatency: 100,
      simulateErrors: true,
      useMSW: true
    }
  });
};

// ==========================================
// 型定義の再エクスポート
// ==========================================

export type {
  MockServerConfig,
  MockServerServices,
  MockScenarioOptions,
  MockSocketOptions,
  MockServerOptions,
  SessionMessage,
  GMNotification,
  MockDatabaseOptions,
  MockQueryResult,
  MockStatement,
  MockAPIResponse,
  MockAPIRequestBody,
  HTTPMockOptions
} from './mockServer';

// ==========================================
// デフォルトエクスポート（統合サーバー）
// ==========================================

export { IntegratedMockServer as default } from './mockServer';