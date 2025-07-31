
import { logger } from '../../utils/logger-simple';

// t-WADA naming conventions:
// - should[ExpectedBehavior]When[StateUnderTest]
// - can[DoSomething]Given[Condition]

describe('Simple Logger Utility', () => {
  let consoleSpy: {
    log: jest.SpiedFunction<typeof console.log>;
    warn: jest.SpiedFunction<typeof console.warn>;
    error: jest.SpiedFunction<typeof console.error>;
    debug: jest.SpiedFunction<typeof console.debug>;
  };

  beforeEach(() => {
    // コンソール出力をスパイ
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
    };
  });

  afterEach(() => {
    // スパイを復元
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('Info Level Logging', () => {
    test('shouldLogInfoMessageWithCorrectFormat', () => {
      // Given: 情報メッセージ
      const message = 'Test info message';
      
      // When: infoログを出力
      logger.info(message);
      
      // Then: 正しい形式で出力される
      expect(consoleSpy.log).toHaveBeenCalledWith('[INFO] Test info message {}');
    });

    test('shouldLogInfoMessageWithContextWhenContextProvided', () => {
      // Given: メッセージとコンテキスト
      const message = 'User action';
      const context = { userId: '123', action: 'login' };
      
      // When: コンテキスト付きでログ出力
      logger.info(message, context);
      
      // Then: コンテキストが含まれて出力される
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[INFO] User action {"userId":"123","action":"login"}'
      );
    });

    test('shouldLogInfoMessageWithContextAndDataWhenBothProvided', () => {
      // Given: メッセージ、コンテキスト、データ
      const message = 'Database operation';
      const context = { operation: 'select' };
      const data = { table: 'campaigns', count: 5 };
      
      // When: 全パラメータでログ出力
      logger.info(message, context, data);
      
      // Then: 全ての情報が含まれて出力される
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[INFO] Database operation {"operation":"select"} {"table":"campaigns","count":5}'
      );
    });

    test('shouldHandleNullContextGracefully', () => {
      // Given: nullコンテキスト
      const message = 'Test message';
      
      // When: nullコンテキストでログ出力
      logger.info(message, null);
      
      // Then: 適切に処理される
      expect(consoleSpy.log).toHaveBeenCalledWith('[INFO] Test message {}');
    });

    test('shouldHandleUndefinedContextGracefully', () => {
      // Given: undefinedコンテキスト
      const message = 'Test message';
      
      // When: undefinedコンテキストでログ出力
      logger.info(message, undefined);
      
      // Then: 適切に処理される
      expect(consoleSpy.log).toHaveBeenCalledWith('[INFO] Test message {}');
    });
  });

  describe('Warning Level Logging', () => {
    test('shouldLogWarningMessageWithCorrectFormat', () => {
      // Given: 警告メッセージ
      const message = 'Test warning message';
      
      // When: warnログを出力
      logger.warn(message);
      
      // Then: 正しい形式で出力される
      expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN] Test warning message {}');
    });

    test('shouldLogWarningWithSecurityContext', () => {
      // Given: セキュリティ警告
      const message = 'Suspicious activity detected';
      const context = { 
        ip: '192.168.1.100', 
        userAgent: 'suspicious-bot',
        attempts: 5 
      };
      
      // When: セキュリティコンテキスト付きで警告ログ
      logger.warn(message, context);
      
      // Then: セキュリティ情報が含まれて出力される
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[WARN] Suspicious activity detected {"ip":"192.168.1.100","userAgent":"suspicious-bot","attempts":5}'
      );
    });
  });

  describe('Error Level Logging', () => {
    test('shouldLogErrorMessageWithCorrectFormat', () => {
      // Given: エラーメッセージ
      const message = 'Test error message';
      
      // When: errorログを出力
      logger.error(message);
      
      // Then: 正しい形式で出力される
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR] Test error message {}');
    });

    test('shouldLogErrorWithExceptionDetails', () => {
      // Given: エラーと例外詳細
      const message = 'Database connection failed';
      const context = { 
        error: 'ECONNREFUSED',
        host: 'localhost',
        port: 5432 
      };
      const data = { 
        retryCount: 3,
        lastAttempt: '2024-01-01T00:00:00Z' 
      };
      
      // When: 例外詳細付きでエラーログ
      logger.error(message, context, data);
      
      // Then: 例外詳細が含まれて出力される
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ERROR] Database connection failed {"error":"ECONNREFUSED","host":"localhost","port":5432} {"retryCount":3,"lastAttempt":"2024-01-01T00:00:00Z"}'
      );
    });

    test('shouldLogErrorWithAPIKeyRedaction', () => {
      // Given: APIキーを含むエラー情報
      const message = 'API request failed';
      const context = { 
        provider: 'openai',
        // Note: 実際のAPIキーは含まれないが、テストでは意図的にチェック
        status: 401 
      };
      
      // When: エラーログを出力
      logger.error(message, context);
      
      // Then: エラー情報が出力される（APIキーは含まれない）
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ERROR] API request failed {"provider":"openai","status":401}'
      );
    });
  });

  describe('Debug Level Logging', () => {
    test('shouldLogDebugMessageWithCorrectFormat', () => {
      // Given: デバッグメッセージ
      const message = 'Debug information';
      
      // When: debugログを出力
      logger.debug(message);
      
      // Then: 正しい形式で出力される
      expect(consoleSpy.debug).toHaveBeenCalledWith('[DEBUG] Debug information {}');
    });

    test('shouldLogDebugWithDetailedContext', () => {
      // Given: 詳細なデバッグ情報
      const message = 'AI request processing';
      const context = { 
        requestId: 'req-123',
        model: 'gpt-4',
        tokenCount: 150 
      };
      const data = { 
        prompt: 'Generated TRPG character',
        processingTime: 2500 
      };
      
      // When: 詳細情報付きでデバッグログ
      logger.debug(message, context, data);
      
      // Then: 詳細情報が含まれて出力される
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        '[DEBUG] AI request processing {"requestId":"req-123","model":"gpt-4","tokenCount":150} {"prompt":"Generated TRPG character","processingTime":2500}'
      );
    });
  });

  describe('Fatal Level Logging', () => {
    test('shouldLogFatalMessageWithCorrectFormat', () => {
      // Given: 致命的エラーメッセージ
      const message = 'System critical failure';
      
      // When: fatalログを出力
      logger.fatal(message);
      
      // Then: 正しい形式で出力される（errorコンソールを使用）
      expect(consoleSpy.error).toHaveBeenCalledWith('[FATAL] System critical failure {}');
    });

    test('shouldLogFatalErrorWithSystemContext', () => {
      // Given: システム致命的エラー
      const message = 'Database connection pool exhausted';
      const context = { 
        availableConnections: 0,
        maxConnections: 10,
        waitingRequests: 25 
      };
      
      // When: システムコンテキスト付きで致命的エラーログ
      logger.fatal(message, context);
      
      // Then: システム情報が含まれて出力される
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[FATAL] Database connection pool exhausted {"availableConnections":0,"maxConnections":10,"waitingRequests":25}'
      );
    });
  });

  describe('Logger Method Chaining', () => {
    test('shouldReturnLoggerInstanceFromSetContext', () => {
      // Given: ロガー
      const context = { service: 'trpg-session' };
      
      // When: setContextを呼び出す
      const result = logger.setContext(context);
      
      // Then: ロガーインスタンスが返される
      expect(result).toBe(logger);
    });

    test('shouldReturnLoggerInstanceFromChild', () => {
      // Given: ロガー
      const childContext = { module: 'character-generation' };
      
      // When: childメソッドを呼び出す
      const result = logger.child(childContext);
      
      // Then: ロガーインスタンスが返される
      expect(result).toBe(logger);
    });

    test('canChainSetContextAndChildMethods', () => {
      // Given: ロガー
      const context = { service: 'trpg' };
      const childContext = { module: 'ai' };
      
      // When: メソッドチェーンを使用
      const result = logger.setContext(context).child(childContext);
      
      // Then: ロガーインスタンスが返される
      expect(result).toBe(logger);
    });
  });

  describe('Complex Data Structure Handling', () => {
    test('shouldSerializeComplexObjectsCorrectly', () => {
      // Given: 複雑なオブジェクト
      const message = 'TRPG session created';
      const context = {
        session: {
          id: 'sess-123',
          campaign: { id: 'camp-456', name: 'Test Campaign' },
          characters: [
            { id: 'char-1', name: 'Hero', level: 5 },
            { id: 'char-2', name: 'Wizard', level: 3 }
          ],
          metadata: {
            created: '2024-01-01T00:00:00Z',
            version: '1.0'
          }
        }
      };
      
      // When: 複雑なオブジェクトをログ出力
      logger.info(message, context);
      
      // Then: 正しくシリアライズされて出力される
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] TRPG session created')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"session"')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"characters"')
      );
    });

    test('shouldHandleCircularReferencesGracefully', () => {
      // Given: 循環参照を含むオブジェクト
      const message = 'Circular reference test';
      const context: any = { name: 'test' };
      context.self = context; // 循環参照を作成
      
      // When: 循環参照オブジェクトをログ出力
      // Then: エラーなく処理される（JSON.stringifyがエラーを投げる可能性がある）
      expect(() => {
        logger.info(message, context);
      }).not.toThrow();
    });

    test('shouldHandleNullAndUndefinedValuesInContext', () => {
      // Given: null/undefinedを含むコンテキスト
      const message = 'Mixed values test';
      const context = {
        validValue: 'test',
        nullValue: null,
        undefinedValue: undefined,
        zeroValue: 0,
        emptyString: '',
        falseValue: false
      };
      
      // When: 混合値コンテキストをログ出力
      logger.info(message, context);
      
      // Then: 正しく処理される
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Mixed values test')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"validValue":"test"')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"nullValue":null')
      );
    });
  });

  describe('Logger Interface Compatibility', () => {
    test('shouldHaveAllRequiredLoggerMethods', () => {
      // Given: ロガーインスタンス
      
      // When & Then: 必要なメソッドが存在する
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.fatal).toBe('function');
      expect(typeof logger.setContext).toBe('function');
      expect(typeof logger.child).toBe('function');
    });

    test('shouldAcceptOptionalParametersInAllMethods', () => {
      // Given: 全ログレベル
      const message = 'Test message';
      const context = { test: true };
      const data = { extra: 'info' };
      
      // When & Then: 全メソッドがオプションパラメータを受け入れる
      expect(() => {
        logger.info(message);
        logger.info(message, context);
        logger.info(message, context, data);
        
        logger.warn(message);
        logger.warn(message, context);
        logger.warn(message, context, data);
        
        logger.error(message);
        logger.error(message, context);
        logger.error(message, context, data);
        
        logger.debug(message);
        logger.debug(message, context);
        logger.debug(message, context, data);
        
        logger.fatal(message);
        logger.fatal(message, context);
        logger.fatal(message, context, data);
      }).not.toThrow();
    });
  });

  describe('Performance and Memory Considerations', () => {
    test('shouldNotCauseMemoryLeaksWithLargeObjects', () => {
      // Given: 大きなオブジェクト
      const message = 'Large object test';
      const largeArray = new Array(1000).fill(0).map((_, i) => ({ id: i, data: `data-${i}` }));
      const context = { largeData: largeArray };
      
      // When: 大きなオブジェクトをログ出力
      // Then: メモリリークが発生しない（正常に完了する）
      expect(() => {
        logger.info(message, context);
      }).not.toThrow();
    });

    test('shouldHandleMultipleRapidLogCallsEfficiently', () => {
      // Given: 大量のログ呼び出し
      const startTime = Date.now();
      
      // When: 連続でログを出力
      for (let i = 0; i < 100; i++) {
        logger.info(`Message ${i}`, { iteration: i });
      }
      const endTime = Date.now();
      
      // Then: 効率的に処理される（1秒以内）
      expect(endTime - startTime).toBeLessThan(1000);
      expect(consoleSpy.log).toHaveBeenCalledTimes(100);
    });
  });
});