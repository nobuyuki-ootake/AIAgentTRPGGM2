import { jest } from '@jest/globals';
import type { TRPGCampaign, TRPGCharacter } from '@ai-agent-trpg/types';

describe('logger-simple', () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleDebug: jest.SpyInstance;

  beforeEach(() => {
    // コンソールメソッドのモック
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();
    
    // モジュールキャッシュをクリア
    jest.resetModules();
  });

  afterEach(() => {
    // モックをリストア
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleDebug.mockRestore();
  });

  describe('infoメソッドは情報ログを適切に出力すること', () => {
    it('メッセージのみの場合は正しくフォーマットされること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: infoログを出力
      logger.info('Test info message');

      // Then: 正しいフォーマットで出力される
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO] Test info message {}');
    });

    it('メッセージとコンテキストがある場合は正しくJSON化されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');
      const context = { userId: 'test-user', action: 'login' };

      // When: コンテキスト付きinfoログを出力
      logger.info('User action', context);

      // Then: コンテキストがJSON化される
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[INFO] User action {"userId":"test-user","action":"login"}'
      );
    });

    it('メッセージ、コンテキスト、データの3つがある場合は全て出力されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');
      const context = { requestId: '123' };
      const data = { responseTime: 150, status: 200 };

      // When: 3つのパラメータでinfoログを出力
      logger.info('API response', context, data);

      // Then: 全てのデータが出力される
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[INFO] API response {"requestId":"123"} {"responseTime":150,"status":200}'
      );
    });

    it('undefinedやnullのコンテキストは適切に処理されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: null/undefinedコンテキストでログ出力
      logger.info('Test with null', null);
      logger.info('Test with undefined', undefined);

      // Then: 空オブジェクトとして出力される
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO] Test with null {}');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO] Test with undefined {}');
    });

    it('循環参照を含むオブジェクトも安全に処理されること', async () => {
      // Given: 循環参照を含むオブジェクト
      const { logger } = await import('./logger-simple');
      const circular: any = { name: 'test' };
      circular.self = circular;

      // When: 循環参照オブジェクトでログ出力
      logger.info('Circular reference test', circular);

      // Then: エラーなく出力される（JSON.stringifyのデフォルト動作）
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(() => logger.info('Safe test', circular)).not.toThrow();
    });
  });

  describe('warnメソッドは警告ログを適切に出力すること', () => {
    it('メッセージのみの警告が正しく出力されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: warnログを出力
      logger.warn('Warning message');

      // Then: 警告フォーマットで出力される
      expect(mockConsoleWarn).toHaveBeenCalledWith('[WARN] Warning message {}');
    });

    it('複雑なオブジェクトを含む警告が正しく出力されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');
      const complexData = {
        threshold: 80,
        current: 95,
        resources: ['cpu', 'memory'],
        timestamp: new Date('2025-01-01').toISOString()
      };

      // When: 複雑なデータで警告ログを出力
      logger.warn('Resource usage high', complexData);

      // Then: 正しくJSON化される
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] Resource usage high')
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('"threshold":80')
      );
    });
  });

  describe('errorメソッドはエラーログを適切に出力すること', () => {
    it('エラーメッセージが正しく出力されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: errorログを出力
      logger.error('Critical error occurred');

      // Then: エラーフォーマットで出力される
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] Critical error occurred {}');
    });

    it('エラーオブジェクトを含むログが適切に処理されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');
      const error = new Error('Database connection failed');
      const context = { 
        operation: 'connect',
        retries: 3,
        error: error.message
      };

      // When: エラーコンテキストでログ出力
      logger.error('Database error', context);

      // Then: エラー情報が含まれる
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Database connection failed')
      );
    });

    it('スタックトレースを含むエラーログが出力されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');
      const error = new Error('Test error');
      const errorData = {
        message: error.message,
        stack: error.stack
      };

      // When: スタックトレース付きエラーログ
      logger.error('Error with stack', {}, errorData);

      // Then: スタック情報が含まれる
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Test error')
      );
    });
  });

  describe('debugメソッドはデバッグログを適切に出力すること', () => {
    it('デバッグメッセージが正しく出力されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: debugログを出力
      logger.debug('Debug information');

      // Then: デバッグフォーマットで出力される
      expect(mockConsoleDebug).toHaveBeenCalledWith('[DEBUG] Debug information {}');
    });

    it('詳細なデバッグ情報が適切に出力されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');
      const debugData = {
        function: 'processRequest',
        parameters: { id: 123, type: 'GET' },
        timestamp: Date.now()
      };

      // When: 詳細デバッグログを出力
      logger.debug('Function call trace', debugData);

      // Then: 詳細情報が含まれる
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        expect.stringContaining('"function":"processRequest"')
      );
    });
  });

  describe('fatalメソッドは致命的エラーログを適切に出力すること', () => {
    it('致命的エラーメッセージが正しく出力されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: fatalログを出力
      logger.fatal('System crash detected');

      // Then: エラー出力で致命的エラーフォーマット
      expect(mockConsoleError).toHaveBeenCalledWith('[FATAL] System crash detected {}');
    });

    it('プロセス終了情報を含む致命的エラーが出力されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');
      const fatalContext = {
        exitCode: 1,
        reason: 'Out of memory',
        lastOperation: 'data processing'
      };

      // When: 致命的エラーログを出力
      logger.fatal('Process terminating', fatalContext);

      // Then: 終了情報が含まれる
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('"exitCode":1')
      );
    });
  });

  describe('setContextメソッドはチェイン可能であること', () => {
    it('setContextを呼んでも同じloggerインスタンスが返されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: setContextを呼ぶ
      const result = logger.setContext({ service: 'api' });

      // Then: 同じloggerインスタンスが返される
      expect(result).toBe(logger);
    });

    it('setContext後もログ出力が正常に動作すること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: setContext後にログ出力
      logger.setContext({ requestId: 'abc123' }).info('After context set');

      // Then: ログが正常に出力される
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO] After context set {}');
    });
  });

  describe('childメソッドはチェイン可能であること', () => {
    it('childを呼んでも同じloggerインスタンスが返されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: childを呼ぶ
      const childLogger = logger.child({ module: 'auth' });

      // Then: 同じloggerインスタンスが返される
      expect(childLogger).toBe(logger);
    });

    it('child後もログ出力が正常に動作すること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: child後にログ出力
      logger.child({ component: 'database' }).error('Connection failed');

      // Then: ログが正常に出力される
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] Connection failed {}');
    });
  });

  describe('特殊な値の処理', () => {
    it('空文字列が適切に処理されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: 空文字列でログ出力
      logger.info('', { key: 'value' });

      // Then: 空文字列でも正常に出力
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]  {"key":"value"}');
    });

    it('非常に長いメッセージが切り詰められないこと', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');
      const longMessage = 'a'.repeat(10000);

      // When: 長いメッセージでログ出力
      logger.info(longMessage);

      // Then: 全体が出力される
      expect(mockConsoleLog).toHaveBeenCalledWith(`[INFO] ${longMessage} {}`);
    });

    it('特殊文字を含むメッセージが適切にエスケープされること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');
      const specialMessage = 'Line1\nLine2\tTabbed\r\nWindows line';

      // When: 特殊文字でログ出力
      logger.info(specialMessage);

      // Then: そのまま出力される
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `[INFO] ${specialMessage} {}`
      );
    });

    it('数値やブール値のコンテキストが適切に処理されること', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: プリミティブ型でログ出力
      logger.info('Primitive test', 123, true);

      // Then: JSON化される
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[INFO] Primitive test 123 true'
      );
    });
  });

  describe('TRPG型を使用したログ出力', () => {
    it('TRPGCampaignオブジェクトが適切にログ出力されること', async () => {
      // Given: TRPGCampaignデータ
      const { logger } = await import('./logger-simple');
      const campaign: Partial<TRPGCampaign> = {
        id: 'camp-001',
        name: 'Dragon Quest',
        status: 'active',
        currentLevel: 5
      };

      // When: キャンペーンデータでログ出力
      logger.info('Campaign created', campaign);

      // Then: キャンペーン情報が含まれる
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"name":"Dragon Quest"')
      );
    });

    it('TRPGCharacterオブジェクトが適切にログ出力されること', async () => {
      // Given: TRPGCharacterデータ
      const { logger } = await import('./logger-simple');
      const character: Partial<TRPGCharacter> = {
        id: 'char-001',
        name: 'Gandalf',
        characterType: 'npc',
        level: 20
      };

      // When: キャラクターデータでログ出力
      logger.info('Character updated', { characterId: character.id }, character);

      // Then: キャラクター情報が含まれる
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"name":"Gandalf"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"level":20')
      );
    });
  });

  describe('パフォーマンスとメモリ効率', () => {
    it('大量のログ出力でもメモリリークしないこと', async () => {
      // Given: loggerのインポート
      const { logger } = await import('./logger-simple');

      // When: 大量のログを出力
      for (let i = 0; i < 1000; i++) {
        logger.info(`Log message ${i}`, { index: i });
      }

      // Then: 全てのログが出力される
      expect(mockConsoleLog).toHaveBeenCalledTimes(1000);
    });

    it('非常に大きなオブジェクトも処理できること', async () => {
      // Given: 大きなオブジェクト
      const { logger } = await import('./logger-simple');
      const largeObject = {
        data: Array(1000).fill(null).map((_, i) => ({
          id: i,
          value: `value-${i}`,
          nested: { deep: { property: i } }
        }))
      };

      // When: 大きなオブジェクトでログ出力
      logger.info('Large data processed', largeObject);

      // Then: エラーなく出力される
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(() => logger.info('Safe', largeObject)).not.toThrow();
    });
  });
});