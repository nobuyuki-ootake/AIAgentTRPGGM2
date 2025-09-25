
import { config, validateConfig, logConfig, initializeConfig } from '../../config/config';

// t-WADA naming conventions:
// - should[ExpectedBehavior]When[StateUnderTest]
// - can[DoSomething]Given[Condition]

describe('Configuration Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 各テスト前に環境変数をリセット
    jest.resetModules();
    process.env = { ...originalEnv };
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    test('shouldReturnDefaultValueWhenEnvVariableIsNotSet', () => {
      // Given: 環境変数が設定されていない
      delete process.env.PORT;
      delete process.env.FRONTEND_PORT;
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: デフォルト値が使用される
      expect(testConfig.port).toBe(4001);
      expect(testConfig.frontendPort).toBe(3000);
    });

    test('shouldUseEnvironmentValueWhenSet', () => {
      // Given: 環境変数が設定されている
      process.env.PORT = '8080';
      process.env.FRONTEND_PORT = '3001';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: 環境変数の値が使用される
      expect(testConfig.port).toBe(8080);
      expect(testConfig.frontendPort).toBe(3001);
    });

    test('shouldThrowErrorWhenRequiredEnvVariableIsMissing', () => {
      // Given: 必須の環境変数が設定されていない
      delete process.env.JWT_SECRET;
      
      // When & Then: 設定読み込み時にエラーが発生する
      expect(() => {
        jest.resetModules();
        require('../../config/config');
      }).toThrow('Environment variable JWT_SECRET is required but not set');
    });

    test('shouldReturnNullWhenOptionalEnvVariableIsNotSet', () => {
      // Given: オプションの環境変数が設定されていない
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: null値が返される
      expect(testConfig.ai.openai.apiKey).toBeNull();
      expect(testConfig.ai.anthropic.apiKey).toBeNull();
      expect(testConfig.ai.google.apiKey).toBeNull();
    });
  });

  describe('Security Configuration', () => {
    test('shouldThrowErrorWhenJWTSecretIsTooShortInProduction', () => {
      // Given: 本番環境で短いJWTシークレット
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short';
      
      // When & Then: エラーが発生する
      expect(() => {
        jest.resetModules();
        require('../../config/config');
      }).toThrow('JWT_SECRET must be at least 32 characters in production');
    });

    test('shouldThrowErrorWhenProductionUsesDefaultJWTSecret', () => {
      // Given: 本番環境でデフォルトのJWTシークレット
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'dev-secret-key-change-in-production';
      
      // When & Then: エラーが発生する
      expect(() => {
        jest.resetModules();
        require('../../config/config');
      }).toThrow('JWT_SECRET must be changed in production environment');
    });

    test('shouldAllowShortJWTSecretInDevelopment', () => {
      // Given: 開発環境で短いJWTシークレット
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'short';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: エラーが発生しない
      expect(testConfig.security.jwtSecret).toBe('short');
    });

    test('shouldConfigureRateLimitingFromEnvironment', () => {
      // Given: レート制限の環境変数を設定
      process.env.RATE_LIMIT_WINDOW = '30';
      process.env.RATE_LIMIT_MAX = '200';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: 設定値が反映される
      expect(testConfig.security.rateLimitWindow).toBe(30);
      expect(testConfig.security.rateLimitMax).toBe(200);
    });

    test('shouldConfigureCORSOriginFromEnvironment', () => {
      // Given: CORS設定を環境変数で指定
      process.env.CORS_ORIGIN = 'https://example.com';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: CORS設定が反映される
      expect(testConfig.security.corsOrigin).toBe('https://example.com');
    });
  });

  describe('AI Configuration', () => {
    test('shouldConfigureAllAIProvidersWhenAPIKeysProvided', () => {
      // Given: 全AI providerのAPIキーを設定
      process.env.OPENAI_API_KEY = 'sk-test-openai-key';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-anthropic-key';
      process.env.GOOGLE_API_KEY = 'test-google-key';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: 全てのAPIキーが設定される
      expect(testConfig.ai.openai.apiKey).toBe('sk-test-openai-key');
      expect(testConfig.ai.anthropic.apiKey).toBe('sk-ant-test-anthropic-key');
      expect(testConfig.ai.google.apiKey).toBe('test-google-key');
    });

    test('shouldConfigureAIModelsFromEnvironment', () => {
      // Given: AIモデルを環境変数で指定
      process.env.OPENAI_MODEL = 'gpt-4';
      process.env.ANTHROPIC_MODEL = 'claude-3-sonnet-20240229';
      process.env.GOOGLE_MODEL = 'gemini-pro-vision';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: モデル設定が反映される
      expect(testConfig.ai.openai.model).toBe('gpt-4');
      expect(testConfig.ai.anthropic.model).toBe('claude-3-sonnet-20240229');
      expect(testConfig.ai.google.model).toBe('gemini-pro-vision');
    });

    test('shouldConfigureAITimeoutAndConcurrencyLimits', () => {
      // Given: AI設定のタイムアウトと同時実行数を設定
      process.env.AI_REQUEST_TIMEOUT = '120000';
      process.env.MAX_CONCURRENT_AI_REQUESTS = '10';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: 設定値が反映される
      expect(testConfig.ai.timeout).toBe(120000);
      expect(testConfig.ai.maxConcurrentRequests).toBe(10);
    });
  });

  describe('Database Configuration', () => {
    test('shouldConfigureDatabasePathFromEnvironment', () => {
      // Given: データベースパスを環境変数で指定
      process.env.DATABASE_PATH = '/custom/path/trpg.db';
      process.env.DATABASE_POOL_SIZE = '20';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: データベース設定が反映される
      expect(testConfig.database.path).toBe('/custom/path/trpg.db');
      expect(testConfig.database.poolSize).toBe(20);
    });

    test('shouldUseDefaultDatabaseConfigurationWhenNotSet', () => {
      // Given: データベース環境変数が設定されていない
      delete process.env.DATABASE_PATH;
      delete process.env.DATABASE_POOL_SIZE;
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: デフォルト値が使用される
      expect(testConfig.database.path).toBe('./data/trpg.db');
      expect(testConfig.database.poolSize).toBe(10);
    });
  });

  describe('Configuration Validation', () => {
    test('shouldThrowErrorWhenNoAIProviderAPIKeyIsConfigured', () => {
      // Given: AIプロバイダーのAPIキーが全て未設定
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      
      // When & Then: 検証でエラーが発生する
      expect(() => {
        jest.resetModules();
        const { validateConfig } = require('../../config/config');
        validateConfig();
      }).toThrow('At least one AI provider API key must be configured');
    });

    test('shouldThrowErrorWhenBackendAndFrontendPortsAreSame', () => {
      // Given: バックエンドとフロントエンドのポートが同じ
      process.env.PORT = '3000';
      process.env.FRONTEND_PORT = '3000';
      
      // When & Then: 検証でエラーが発生する
      expect(() => {
        jest.resetModules();
        const { validateConfig } = require('../../config/config');
        validateConfig();
      }).toThrow('Backend and frontend ports must be different');
    });

    test('shouldPassValidationWhenConfigurationIsValid', () => {
      // Given: 有効な設定
      process.env.JWT_SECRET = 'valid-jwt-secret-with-sufficient-length';
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.PORT = '4001';
      process.env.FRONTEND_PORT = '3000';
      
      // When & Then: 検証が成功する
      expect(() => {
        jest.resetModules();
        const { validateConfig } = require('../../config/config');
        validateConfig();
      }).not.toThrow();
    });

    test('shouldAccumulateMultipleValidationErrors', () => {
      // Given: 複数の設定エラー
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short';
      process.env.PORT = '3000';
      process.env.FRONTEND_PORT = '3000';
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      
      // When & Then: 複数のエラーが含まれる
      expect(() => {
        jest.resetModules();
        const { validateConfig } = require('../../config/config');
        validateConfig();
      }).toThrow(/Configuration validation failed/);
    });
  });

  describe('Configuration Logging', () => {
    test('shouldLogConfigurationDetailsInCorrectFormat', () => {
      // Given: 設定が存在する
      process.env.JWT_SECRET = 'test-jwt-secret';
      process.env.OPENAI_API_KEY = 'sk-test-key';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // When: 設定をログ出力する
      jest.resetModules();
      const { logConfig } = require('../../config/config');
      logConfig();
      
      // Then: 適切な形式でログ出力される
      expect(consoleSpy).toHaveBeenCalledWith('🔧 Configuration loaded:');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Environment:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Port:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Database Path:'));
      
      consoleSpy.mockRestore();
    });

    test('shouldNotLogSensitiveInformationInConfiguration', () => {
      // Given: センシティブな情報を含む設定
      process.env.JWT_SECRET = 'secret-jwt-key';
      process.env.OPENAI_API_KEY = 'sk-secret-api-key';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // When: 設定をログ出力する
      jest.resetModules();
      const { logConfig } = require('../../config/config');
      logConfig();
      
      // Then: センシティブな情報は含まれない
      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).not.toContain('secret-jwt-key');
      expect(logCalls).not.toContain('sk-secret-api-key');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Initialization', () => {
    test('shouldExitProcessWhenInitializationFails', () => {
      // Given: 無効な設定
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short';
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit() was called');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // When & Then: 初期化が失敗し、プロセスが終了する
      expect(() => {
        jest.resetModules();
        const { initializeConfig } = require('../../config/config');
        initializeConfig();
      }).toThrow('process.exit() was called');
      
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Configuration error:',
        expect.any(Error)
      );
      
      exitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('shouldCompleteInitializationWhenConfigurationIsValid', () => {
      // Given: 有効な設定
      process.env.JWT_SECRET = 'valid-jwt-secret-with-sufficient-length';
      process.env.OPENAI_API_KEY = 'sk-test-key';
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // When: 初期化を実行
      jest.resetModules();
      const { initializeConfig } = require('../../config/config');
      initializeConfig();
      
      // Then: プロセス終了が呼ばれず、設定ログが出力される
      expect(exitSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('🔧 Configuration loaded:');
      
      exitSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('Environment Specific Behavior', () => {
    test('shouldEnableMetricsWhenConfigured', () => {
      // Given: メトリクス機能を有効に設定
      process.env.METRICS_ENABLED = 'true';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: メトリクスが有効になる
      expect(testConfig.metricsEnabled).toBe(true);
    });

    test('shouldDisableMetricsWhenConfigured', () => {
      // Given: メトリクス機能を無効に設定
      process.env.METRICS_ENABLED = 'false';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: メトリクスが無効になる
      expect(testConfig.metricsEnabled).toBe(false);
    });

    test('shouldConfigureLogLevelFromEnvironment', () => {
      // Given: ログレベルを環境変数で指定
      process.env.LOG_LEVEL = 'debug';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: ログレベルが反映される
      expect(testConfig.logLevel).toBe('debug');
    });

    test('shouldDetectNodeEnvironmentCorrectly', () => {
      // Given: 本番環境を設定
      process.env.NODE_ENV = 'production';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: 環境が正しく検出される
      expect(testConfig.nodeEnv).toBe('production');
    });
  });

  describe('Type Safety and Structure', () => {
    test('shouldHaveCorrectConfigurationStructure', () => {
      // Given: 基本的な設定
      process.env.JWT_SECRET = 'test-jwt-secret';
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: 正しい構造を持つ
      expect(testConfig).toHaveProperty('nodeEnv');
      expect(testConfig).toHaveProperty('port');
      expect(testConfig).toHaveProperty('frontendPort');
      expect(testConfig).toHaveProperty('security');
      expect(testConfig).toHaveProperty('database');
      expect(testConfig).toHaveProperty('ai');
      expect(testConfig).toHaveProperty('logLevel');
      expect(testConfig).toHaveProperty('metricsEnabled');
      
      // セキュリティ設定の構造チェック
      expect(testConfig.security).toHaveProperty('jwtSecret');
      expect(testConfig.security).toHaveProperty('corsOrigin');
      expect(testConfig.security).toHaveProperty('rateLimitWindow');
      expect(testConfig.security).toHaveProperty('rateLimitMax');
      
      // AI設定の構造チェック
      expect(testConfig.ai).toHaveProperty('openai');
      expect(testConfig.ai).toHaveProperty('anthropic');
      expect(testConfig.ai).toHaveProperty('google');
      expect(testConfig.ai).toHaveProperty('timeout');
      expect(testConfig.ai).toHaveProperty('maxConcurrentRequests');
    });

    test('shouldHaveNumericValuesAsNumbers', () => {
      // Given: 数値の環境変数
      process.env.PORT = '8080';
      process.env.RATE_LIMIT_MAX = '150';
      process.env.AI_REQUEST_TIMEOUT = '90000';
      
      // When: 設定を読み込む
      const { config: testConfig } = require('../../config/config');
      
      // Then: 数値として解析される
      expect(typeof testConfig.port).toBe('number');
      expect(typeof testConfig.security.rateLimitMax).toBe('number');
      expect(typeof testConfig.ai.timeout).toBe('number');
      expect(testConfig.port).toBe(8080);
      expect(testConfig.security.rateLimitMax).toBe(150);
      expect(testConfig.ai.timeout).toBe(90000);
    });
  });
});