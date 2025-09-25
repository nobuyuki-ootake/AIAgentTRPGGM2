// ==========================================
// 統合モックサーバーセットアップ
// 全ての外部依存関係を統一管理
// ==========================================

import { logger } from '../../utils/logger';
import { AIProviderMockFactory, setupAIProviderMocks } from './aiProviderMocks';
import { MockSocketIOServer, setupWebSocketMocks, WebSocketTestHelper } from './websocketMocks';
import { MockDatabase, setupDatabaseMocks, DatabaseTestHelper } from './databaseMocks';
import { HTTPMockServer, HTTPTestHelper, SimpleFetchMock } from './httpMocks';

// ==========================================
// 型定義
// ==========================================

export interface MockServerConfig {
  // AI プロバイダー設定
  aiProviders?: {
    enableMocks?: boolean;
    defaultScenario?: 'success' | 'api_error' | 'timeout' | 'rate_limit';
    simulateLatency?: number;
  };
  
  // WebSocket 設定
  websocket?: {
    enableMocks?: boolean;
    port?: number;
    simulateLatency?: number;
    simulateErrors?: boolean;
  };
  
  // データベース設定
  database?: {
    enableMocks?: boolean;
    inMemory?: boolean;
    seedTestData?: boolean;
    enableForeignKeys?: boolean;
  };
  
  // HTTP 設定
  http?: {
    enableMocks?: boolean;
    baseURL?: string;
    simulateLatency?: number;
    simulateErrors?: boolean;
    useMSW?: boolean;
  };
  
  // 全般設定
  general?: {
    enableLogging?: boolean;
    resetBetweenTests?: boolean;
  };
}

export interface MockServerServices {
  aiProviders: typeof AIProviderMockFactory;
  websocket: WebSocketTestHelper;
  database: DatabaseTestHelper;
  http: HTTPTestHelper;
  server: MockSocketIOServer;
  db: MockDatabase;
}

// ==========================================
// 統合モックサーバークラス
// ==========================================

export class IntegratedMockServer {
  private config: Required<MockServerConfig>;
  private services: Partial<MockServerServices> = {};
  private isRunning: boolean = false;
  private cleanupCallbacks: (() => void)[] = [];

  constructor(config: MockServerConfig = {}) {
    this.config = {
      aiProviders: {
        enableMocks: true,
        defaultScenario: 'success',
        simulateLatency: 100,
        ...config.aiProviders
      },
      websocket: {
        enableMocks: true,
        port: 3002,
        simulateLatency: 50,
        simulateErrors: false,
        ...config.websocket
      },
      database: {
        enableMocks: true,
        inMemory: true,
        seedTestData: true,
        enableForeignKeys: true,
        ...config.database
      },
      http: {
        enableMocks: true,
        baseURL: 'http://localhost:3001',
        simulateLatency: 100,
        simulateErrors: false,
        useMSW: true,
        ...config.http
      },
      general: {
        enableLogging: false,
        resetBetweenTests: true,
        ...config.general
      }
    };
  }

  // ==========================================
  // 初期化とセットアップ
  // ==========================================

  async start(): Promise<MockServerServices> {
    if (this.isRunning) {
      logger.warn('Mock server is already running');
      return this.services as MockServerServices;
    }

    try {
      if (this.config.general.enableLogging) {
        logger.info('Starting integrated mock server...');
      }

      // Jest モックのセットアップ
      await this.setupJestMocks();

      // AI プロバイダーモックのセットアップ
      if (this.config.aiProviders.enableMocks) {
        await this.setupAIProviderMocks();
      }

      // データベースモックのセットアップ
      if (this.config.database.enableMocks) {
        await this.setupDatabaseMocks();
      }

      // WebSocket モックのセットアップ
      if (this.config.websocket.enableMocks) {
        await this.setupWebSocketMocks();
      }

      // HTTP モックのセットアップ
      if (this.config.http.enableMocks) {
        await this.setupHTTPMocks();
      }

      this.isRunning = true;

      if (this.config.general.enableLogging) {
        logger.info('Integrated mock server started successfully');
      }

      return this.services as MockServerServices;

    } catch (error) {
      logger.error('Failed to start integrated mock server:', error);
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.config.general.enableLogging) {
        logger.info('Stopping integrated mock server...');
      }

      // クリーンアップコールバックを実行
      for (const cleanup of this.cleanupCallbacks) {
        try {
          cleanup();
        } catch (error) {
          logger.error('Error during cleanup:', error);
        }
      }

      // サービスのクリーンアップ
      if (this.services.websocket) {
        this.services.websocket.cleanup();
      }

      if (this.services.database) {
        this.services.database.cleanup();
      }

      if (this.services.http) {
        await this.services.http.teardownHTTPMocks();
      }

      this.services = {};
      this.cleanupCallbacks = [];
      this.isRunning = false;

      if (this.config.general.enableLogging) {
        logger.info('Integrated mock server stopped');
      }

    } catch (error) {
      logger.error('Error stopping integrated mock server:', error);
      throw error;
    }
  }

  // ==========================================
  // 個別サービスのセットアップ
  // ==========================================

  private async setupJestMocks(): Promise<void> {
    // Jest モック設定
    if (this.config.aiProviders.enableMocks) {
      setupAIProviderMocks();
    }

    if (this.config.websocket.enableMocks) {
      setupWebSocketMocks();
    }

    if (this.config.database.enableMocks) {
      setupDatabaseMocks();
    }
  }

  private async setupAIProviderMocks(): Promise<void> {
    this.services.aiProviders = AIProviderMockFactory;

    // デフォルトシナリオを設定
    AIProviderMockFactory.setGlobalMockScenario({
      scenario: this.config.aiProviders.defaultScenario,
      delay: this.config.aiProviders.simulateLatency
    });

    this.cleanupCallbacks.push(() => {
      AIProviderMockFactory.clearInstances();
    });

    if (this.config.general.enableLogging) {
      logger.debug('AI provider mocks initialized');
    }
  }

  private async setupDatabaseMocks(): Promise<void> {
    const dbHelper = new DatabaseTestHelper({
      inMemory: this.config.database.inMemory,
      enableForeignKeys: this.config.database.enableForeignKeys
    });

    this.services.database = dbHelper;
    this.services.db = await dbHelper.setupTestDatabase();

    if (this.config.database.seedTestData) {
      this.services.db.seedTestData();
    }

    this.cleanupCallbacks.push(() => {
      if (this.services.db) {
        this.services.db.close();
      }
    });

    if (this.config.general.enableLogging) {
      logger.debug('Database mocks initialized');
    }
  }

  private async setupWebSocketMocks(): Promise<void> {
    const wsHelper = new WebSocketTestHelper({
      simulateLatency: this.config.websocket.simulateLatency,
      simulateConnectionFailures: this.config.websocket.simulateErrors
    });

    this.services.websocket = wsHelper;
    this.services.server = wsHelper.getServer();

    this.cleanupCallbacks.push(() => {
      if (this.services.websocket) {
        this.services.websocket.cleanup();
      }
    });

    if (this.config.general.enableLogging) {
      logger.debug('WebSocket mocks initialized');
    }
  }

  private async setupHTTPMocks(): Promise<void> {
    const httpHelper = new HTTPTestHelper({
      baseURL: this.config.http.baseURL,
      simulateLatency: this.config.http.simulateLatency,
      simulateErrors: this.config.http.simulateErrors,
      enableLogging: this.config.general.enableLogging
    });

    this.services.http = httpHelper;
    await httpHelper.setupHTTPMocks();

    this.cleanupCallbacks.push(async () => {
      if (this.services.http) {
        await this.services.http.teardownHTTPMocks();
      }
    });

    if (this.config.general.enableLogging) {
      logger.debug('HTTP mocks initialized');
    }
  }

  // ==========================================
  // テストサポートメソッド
  // ==========================================

  async reset(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // AI プロバイダーのリセット
    if (this.services.aiProviders) {
      AIProviderMockFactory.setGlobalMockScenario({
        scenario: this.config.aiProviders.defaultScenario,
        delay: this.config.aiProviders.simulateLatency
      });
    }

    // データベースのリセット
    if (this.services.db) {
      this.services.db.clearAllData();
      if (this.config.database.seedTestData) {
        this.services.db.seedTestData();
      }
    }

    // WebSocket のリセット
    if (this.services.websocket) {
      this.services.websocket.cleanup();
      this.services.websocket = new WebSocketTestHelper({
        simulateLatency: this.config.websocket.simulateLatency,
        simulateConnectionFailures: this.config.websocket.simulateErrors
      });
    }

    // HTTP モックのリセット
    if (this.services.http) {
      this.services.http.resetMocks();
    }

    if (this.config.general.enableLogging) {
      logger.debug('Mock server reset completed');
    }
  }

  // 個別サービスへのアクセス
  getServices(): MockServerServices {
    if (!this.isRunning) {
      throw new Error('Mock server is not running. Call start() first.');
    }
    return this.services as MockServerServices;
  }

  getDatabase(): MockDatabase {
    const services = this.getServices();
    return services.db;
  }

  getWebSocketHelper(): WebSocketTestHelper {
    const services = this.getServices();
    return services.websocket;
  }

  getHTTPHelper(): HTTPTestHelper {
    const services = this.getServices();
    return services.http;
  }

  // 設定の更新
  updateConfig(newConfig: Partial<MockServerConfig>): void {
    if (this.isRunning) {
      logger.warn('Cannot update config while server is running');
      return;
    }

    this.config = {
      ...this.config,
      ...newConfig,
      aiProviders: { ...this.config.aiProviders, ...newConfig.aiProviders },
      websocket: { ...this.config.websocket, ...newConfig.websocket },
      database: { ...this.config.database, ...newConfig.database },
      http: { ...this.config.http, ...newConfig.http },
      general: { ...this.config.general, ...newConfig.general }
    };
  }

  // 状態確認
  isServerRunning(): boolean {
    return this.isRunning;
  }

  getConfig(): Required<MockServerConfig> {
    return this.config;
  }
}

// ==========================================
// テストセットアップヘルパー
// ==========================================

export class MockTestSetup {
  private static instance: IntegratedMockServer | null = null;

  static async setupForTesting(config?: MockServerConfig): Promise<MockServerServices> {
    if (MockTestSetup.instance) {
      await MockTestSetup.instance.stop();
    }

    MockTestSetup.instance = new IntegratedMockServer(config);
    return await MockTestSetup.instance.start();
  }

  static async teardownAfterTesting(): Promise<void> {
    if (MockTestSetup.instance) {
      await MockTestSetup.instance.stop();
      MockTestSetup.instance = null;
    }
  }

  static async resetBetweenTests(): Promise<void> {
    if (MockTestSetup.instance) {
      await MockTestSetup.instance.reset();
    }
  }

  static getInstance(): IntegratedMockServer | null {
    return MockTestSetup.instance;
  }
}

// ==========================================
// Jest セットアップヘルパー
// ==========================================

export function setupMockEnvironment(config?: MockServerConfig) {
  let mockServer: IntegratedMockServer;

  beforeAll(async () => {
    mockServer = new IntegratedMockServer(config);
    await mockServer.start();
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  beforeEach(async () => {
    if (mockServer && config?.general?.resetBetweenTests !== false) {
      await mockServer.reset();
    }
  });

  return () => mockServer;
}

// ==========================================
// エクスポート
// ==========================================

export {
  IntegratedMockServer,
  MockTestSetup
};