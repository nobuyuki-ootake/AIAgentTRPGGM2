import { jest } from '@jest/globals';
import type { TRPGCampaign } from '@ai-agent-trpg/types';

describe('config', () => {
  // 環境変数のモック用の元の値を保存
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // テスト前に環境変数を保存
    originalEnv = { ...process.env };
    // Jest環境でモジュールキャッシュをクリア
    jest.resetModules();
  });

  afterEach(() => {
    // テスト後に環境変数を復元
    process.env = originalEnv;
  });

  describe('validateEnv関数は必須環境変数を適切に検証すること', () => {
    it('環境変数が設定されている場合はその値を返すこと', async () => {
      // Given: 環境変数が設定されている
      process.env.TEST_VAR = 'test-value';

      // When: configモジュールをインポート
      const { validateEnv } = await import('./config');

      // Then: 設定された値が返される
      expect(validateEnv('TEST_VAR')).toBe('test-value');
    });

    it('環境変数が未設定でデフォルト値がある場合はデフォルト値を返すこと', async () => {
      // Given: 環境変数が未設定
      delete process.env.TEST_VAR;

      // When: configモジュールをインポート
      const { validateEnv } = await import('./config');

      // Then: デフォルト値が返される
      expect(validateEnv('TEST_VAR', 'default-value')).toBe('default-value');
    });

    it('環境変数が未設定でデフォルト値もない場合はエラーをスローすること', async () => {
      // Given: 環境変数が未設定
      delete process.env.REQUIRED_VAR;

      // When: configモジュールをインポート
      const { validateEnv } = await import('./config');

      // Then: エラーがスローされる
      expect(() => validateEnv('REQUIRED_VAR')).toThrow('Environment variable REQUIRED_VAR is required but not set');
    });
  });

  describe('validateOptionalEnv関数はオプション環境変数を適切に処理すること', () => {
    it('環境変数が設定されている場合はその値を返すこと', async () => {
      // Given: 環境変数が設定されている
      process.env.OPTIONAL_VAR = 'optional-value';

      // When: configモジュールをインポート
      const { validateOptionalEnv } = await import('./config');

      // Then: 設定された値が返される
      expect(validateOptionalEnv('OPTIONAL_VAR')).toBe('optional-value');
    });

    it('環境変数が未設定の場合はnullを返すこと', async () => {
      // Given: 環境変数が未設定
      delete process.env.OPTIONAL_VAR;

      // When: configモジュールをインポート
      const { validateOptionalEnv } = await import('./config');

      // Then: nullが返される
      expect(validateOptionalEnv('OPTIONAL_VAR')).toBeNull();
    });
  });

  describe('セキュリティ設定は環境に応じて適切に検証されること', () => {
    it('開発環境ではデフォルトのJWT_SECRETが許可されること', async () => {
      // Given: 開発環境でデフォルトのJWT_SECRET
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'dev-secret-key-change-in-production';

      // When/Then: エラーなくconfigがロードされる
      await expect(import('./config')).resolves.not.toThrow();
    });

    it('本番環境ではデフォルトのJWT_SECRETが拒否されること', async () => {
      // Given: 本番環境でデフォルトのJWT_SECRET
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'dev-secret-key-change-in-production';

      // When/Then: エラーがスローされる
      await expect(import('./config')).rejects.toThrow('JWT_SECRET must be changed in production environment');
    });

    it('本番環境では32文字未満のJWT_SECRETが拒否されること', async () => {
      // Given: 本番環境で短いJWT_SECRET
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short-secret';

      // When/Then: エラーがスローされる
      await expect(import('./config')).rejects.toThrow('JWT_SECRET must be at least 32 characters in production');
    });

    it('本番環境では32文字以上のJWT_SECRETが受け入れられること', async () => {
      // Given: 本番環境で十分な長さのJWT_SECRET
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.OPENAI_API_KEY = 'test-api-key';

      // When/Then: エラーなくconfigがロードされる
      await expect(import('./config')).resolves.not.toThrow();
    });
  });

  describe('AI設定は複数プロバイダーをサポートすること', () => {
    it('すべてのAPIキーが未設定でもnullとして処理されること', async () => {
      // Given: すべてのAPIキーが未設定
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: すべてのAPIキーがnull
      expect(config.ai.openai.apiKey).toBeNull();
      expect(config.ai.anthropic.apiKey).toBeNull();
      expect(config.ai.google.apiKey).toBeNull();
    });

    it('特定のプロバイダーのAPIキーのみが設定されても正常に動作すること', async () => {
      // Given: OpenAIのみAPIキーが設定
      process.env.OPENAI_API_KEY = 'openai-test-key';
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: OpenAIのみ設定される
      expect(config.ai.openai.apiKey).toBe('openai-test-key');
      expect(config.ai.anthropic.apiKey).toBeNull();
      expect(config.ai.google.apiKey).toBeNull();
    });

    it('デフォルトのモデル名が正しく設定されること', async () => {
      // Given: 最小限の環境変数
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: デフォルトモデルが設定される
      expect(config.ai.openai.model).toBe('gpt-4-turbo-preview');
      expect(config.ai.anthropic.model).toBe('claude-3-opus-20240229');
      expect(config.ai.google.model).toBe('gemini-pro');
    });

    it('カスタムモデル名が環境変数から読み込まれること', async () => {
      // Given: カスタムモデル名が設定
      process.env.OPENAI_MODEL = 'gpt-4-vision';
      process.env.ANTHROPIC_MODEL = 'claude-3-sonnet';
      process.env.GOOGLE_MODEL = 'gemini-pro-vision';
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: カスタムモデルが設定される
      expect(config.ai.openai.model).toBe('gpt-4-vision');
      expect(config.ai.anthropic.model).toBe('claude-3-sonnet');
      expect(config.ai.google.model).toBe('gemini-pro-vision');
    });
  });

  describe('validateConfig関数は設定の妥当性を検証すること', () => {
    it('少なくとも1つのAIプロバイダーAPIキーが必要であること', async () => {
      // Given: すべてのAPIキーが未設定
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポートして検証
      const { validateConfig } = await import('./config');

      // Then: エラーがスローされる
      expect(() => validateConfig()).toThrow('At least one AI provider API key must be configured');
    });

    it('バックエンドとフロントエンドのポートが同じ場合はエラーになること', async () => {
      // Given: 同じポート番号
      process.env.PORT = '3000';
      process.env.FRONTEND_PORT = '3000';
      process.env.JWT_SECRET = 'test-secret-key';
      process.env.OPENAI_API_KEY = 'test-key';

      // When: configモジュールをインポートして検証
      const { validateConfig } = await import('./config');

      // Then: エラーがスローされる
      expect(() => validateConfig()).toThrow('Backend and frontend ports must be different');
    });

    it('すべての検証が通過した場合はエラーをスローしないこと', async () => {
      // Given: 正しい設定
      process.env.PORT = '4001';
      process.env.FRONTEND_PORT = '3000';
      process.env.JWT_SECRET = 'test-secret-key';
      process.env.OPENAI_API_KEY = 'test-key';

      // When: configモジュールをインポートして検証
      const { validateConfig } = await import('./config');

      // Then: エラーがスローされない
      expect(() => validateConfig()).not.toThrow();
    });
  });

  describe('数値型の環境変数は正しく解析されること', () => {
    it('ポート番号が文字列から数値に変換されること', async () => {
      // Given: 文字列のポート番号
      process.env.PORT = '4001';
      process.env.FRONTEND_PORT = '3000';
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: 数値として解析される
      expect(config.port).toBe(4001);
      expect(config.frontendPort).toBe(3000);
      expect(typeof config.port).toBe('number');
      expect(typeof config.frontendPort).toBe('number');
    });

    it('レート制限設定が正しく数値に変換されること', async () => {
      // Given: レート制限の環境変数
      process.env.RATE_LIMIT_WINDOW = '30';
      process.env.RATE_LIMIT_MAX = '200';
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: 数値として解析される
      expect(config.security.rateLimitWindow).toBe(30);
      expect(config.security.rateLimitMax).toBe(200);
    });

    it('AIタイムアウトと並行リクエスト数が正しく変換されること', async () => {
      // Given: AI関連の数値設定
      process.env.AI_REQUEST_TIMEOUT = '120000';
      process.env.MAX_CONCURRENT_AI_REQUESTS = '10';
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: 数値として解析される
      expect(config.ai.timeout).toBe(120000);
      expect(config.ai.maxConcurrentRequests).toBe(10);
    });
  });

  describe('ブール型の環境変数は正しく解析されること', () => {
    it('メトリクス有効化フラグがtrueとして解析されること', async () => {
      // Given: メトリクス有効
      process.env.METRICS_ENABLED = 'true';
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: trueとして解析される
      expect(config.metricsEnabled).toBe(true);
    });

    it('メトリクス有効化フラグがfalseとして解析されること', async () => {
      // Given: メトリクス無効
      process.env.METRICS_ENABLED = 'false';
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: falseとして解析される
      expect(config.metricsEnabled).toBe(false);
    });

    it('メトリクス有効化フラグが未設定の場合はデフォルトでtrueになること', async () => {
      // Given: メトリクス設定なし
      delete process.env.METRICS_ENABLED;
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: デフォルトでtrue
      expect(config.metricsEnabled).toBe(true);
    });
  });

  describe('データベース設定が正しく処理されること', () => {
    it('データベースパスが環境変数から読み込まれること', async () => {
      // Given: カスタムデータベースパス
      process.env.DATABASE_PATH = '/custom/path/to/database.db';
      process.env.DATABASE_POOL_SIZE = '20';
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: カスタム設定が適用される
      expect(config.database.path).toBe('/custom/path/to/database.db');
      expect(config.database.poolSize).toBe(20);
    });

    it('デフォルトのデータベース設定が適用されること', async () => {
      // Given: データベース設定なし
      delete process.env.DATABASE_PATH;
      delete process.env.DATABASE_POOL_SIZE;
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: デフォルト設定が適用される
      expect(config.database.path).toBe('./data/trpg.db');
      expect(config.database.poolSize).toBe(10);
    });
  });

  describe('ログレベル設定が正しく処理されること', () => {
    it('カスタムログレベルが設定されること', async () => {
      // Given: カスタムログレベル
      process.env.LOG_LEVEL = 'debug';
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: カスタムログレベルが適用される
      expect(config.logLevel).toBe('debug');
    });

    it('デフォルトログレベルがinfoであること', async () => {
      // Given: ログレベル未設定
      delete process.env.LOG_LEVEL;
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: デフォルトでinfo
      expect(config.logLevel).toBe('info');
    });
  });

  describe('initializeConfig関数は初期化時の動作を適切に処理すること', () => {
    it('設定が無効な場合はプロセスを終了すること', async () => {
      // Given: 無効な設定とプロセス終了のモック
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
        throw new Error(`Process.exit called with code: ${code}`);
      });
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
      
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポートして初期化
      const { initializeConfig } = await import('./config');

      // Then: プロセスが終了する
      expect(() => initializeConfig()).toThrow('Process.exit called with code: 1');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('❌ Configuration error:'),
        expect.any(Error)
      );

      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });

    it('設定が有効な場合は正常に初期化されること', async () => {
      // Given: 有効な設定とコンソールのモック
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      process.env.JWT_SECRET = 'test-secret-key';
      process.env.OPENAI_API_KEY = 'test-api-key';
      process.env.PORT = '4001';
      process.env.FRONTEND_PORT = '3000';

      // When: configモジュールをインポートして初期化
      const { initializeConfig } = await import('./config');
      
      // Then: エラーなく初期化される
      expect(() => initializeConfig()).not.toThrow();
      expect(mockConsoleLog).toHaveBeenCalledWith('🔧 Configuration loaded:');
      
      mockConsoleLog.mockRestore();
    });
  });

  describe('logConfig関数は設定情報を適切にログ出力すること', () => {
    it('すべての設定情報がログに出力されること', async () => {
      // Given: 設定とコンソールのモック
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'test-secret-key';
      process.env.OPENAI_API_KEY = 'openai-key';
      process.env.ANTHROPIC_API_KEY = 'anthropic-key';
      process.env.PORT = '4001';
      process.env.FRONTEND_PORT = '3000';
      process.env.DATABASE_PATH = '/test/db.sqlite';
      process.env.LOG_LEVEL = 'debug';
      process.env.METRICS_ENABLED = 'true';

      // When: configモジュールをインポートしてログ出力
      const { logConfig } = await import('./config');
      logConfig();

      // Then: 各設定項目がログに出力される
      expect(mockConsoleLog).toHaveBeenCalledWith('🔧 Configuration loaded:');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Environment: test');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Port: 4001');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Frontend Port: 3000');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Database Path: /test/db.sqlite');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('AI Providers:'));
      expect(mockConsoleLog).toHaveBeenCalledWith('  Log Level: debug');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Metrics Enabled: true');
      
      mockConsoleLog.mockRestore();
    });

    it('APIキーが設定されているプロバイダーのみが表示されること', async () => {
      // Given: OpenAIのみAPIキー設定
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      process.env.JWT_SECRET = 'test-secret-key';
      process.env.OPENAI_API_KEY = 'openai-key';
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      // When: configモジュールをインポートしてログ出力
      const { logConfig, config } = await import('./config');
      logConfig();

      // Then: OpenAIのみ表示される
      const aiProvidersCall = mockConsoleLog.mock.calls.find(call => 
        call[0]?.includes('AI Providers:')
      );
      expect(aiProvidersCall).toBeDefined();
      expect(aiProvidersCall![0]).toContain('openai');
      expect(aiProvidersCall![0]).not.toContain('anthropic');
      expect(aiProvidersCall![0]).not.toContain('google');
      
      mockConsoleLog.mockRestore();
    });
  });

  describe('CORS設定が正しく処理されること', () => {
    it('カスタムCORS_ORIGINが設定されること', async () => {
      // Given: カスタムCORS設定
      process.env.CORS_ORIGIN = 'https://example.com';
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: カスタムCORS設定が適用される
      expect(config.security.corsOrigin).toBe('https://example.com');
    });

    it('デフォルトCORS_ORIGINがlocalhostであること', async () => {
      // Given: CORS設定なし
      delete process.env.CORS_ORIGIN;
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: デフォルトでlocalhost
      expect(config.security.corsOrigin).toBe('http://localhost:3000');
    });
  });

  describe('エラーケースのハンドリングが適切であること', () => {
    it('数値変換エラーの場合はNaNが返されること', async () => {
      // Given: 無効な数値文字列
      process.env.PORT = 'invalid-port';
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: NaNが返される
      expect(config.port).toBeNaN();
    });

    it('空文字列の数値変換はNaNになること', async () => {
      // Given: 空文字列の数値設定
      process.env.RATE_LIMIT_WINDOW = '';
      process.env.JWT_SECRET = 'test-secret-key';

      // When: configモジュールをインポート
      const { config } = await import('./config');

      // Then: NaNが返される
      expect(config.security.rateLimitWindow).toBeNaN();
    });
  });
});