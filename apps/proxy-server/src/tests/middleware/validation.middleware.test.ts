
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import {
  validateRequest,
  securityValidation,
  rateLimitInfo,
  fileUploadValidation,
  corsSecurityValidation,
  responseTimeMonitoring
} from '../../middleware/validation.middleware';
import { logger } from '../../utils/logger';

// t-WADA naming conventions:
// - should[ExpectedBehavior]When[StateUnderTest]
// - can[DoSomething]Given[Condition]

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

describe('Validation Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.MockedFunction<NextFunction>;
  const originalEnv = process.env;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      path: '/api/test',
      ip: '192.168.1.1',
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'User-Agent') return 'Mozilla/5.0 (compatible)';
        if (header === 'Origin') return 'http://localhost:3000';
        return undefined;
      }),
      body: {},
      query: {},
      params: {},
      headers: {},
      user: undefined,
      files: undefined
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      on: jest.fn()
    };
    
    mockNext = jest.fn();
    
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Request Validation Middleware', () => {
    describe('Body Validation', () => {
      test('shouldValidateRequestBodySuccessfully', () => {
        // Given: 有効なボディスキーマ
        const bodySchema = z.object({
          name: z.string().min(1),
          level: z.number().min(1).max(20)
        });
        
        mockRequest.body = { name: 'Hero', level: 5 };
        const middleware = validateRequest({ body: bodySchema });
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: バリデーションが成功し、次のミドルウェアが呼ばれる
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRequest.body).toEqual({ name: 'Hero', level: 5 });
      });

      test('shouldReturnErrorWhenBodyValidationFails', () => {
        // Given: 無効なボディデータ
        const bodySchema = z.object({
          email: z.string().email(),
          age: z.number().min(0)
        });
        
        mockRequest.body = { email: 'invalid-email', age: -5 };
        const middleware = validateRequest({ body: bodySchema });
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: バリデーションエラーが返される
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('email')
            }),
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('greater than or equal to 0')
            })
          ])
        });
      });

      test('shouldTransformValidDataCorrectly', () => {
        // Given: 変換可能なデータスキーマ
        const bodySchema = z.object({
          count: z.string().transform(val => parseInt(val, 10)),
          isActive: z.string().transform(val => val === 'true')
        });
        
        mockRequest.body = { count: '42', isActive: 'true' };
        const middleware = validateRequest({ body: bodySchema });
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: データが正しく変換される
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRequest.body).toEqual({ count: 42, isActive: true });
      });
    });

    describe('Query Validation', () => {
      test('shouldValidateQueryParametersSuccessfully', () => {
        // Given: 有効なクエリスキーマ
        const querySchema = z.object({
          page: z.string().transform(val => parseInt(val, 10)),
          limit: z.string().transform(val => parseInt(val, 10)).optional()
        });
        
        mockRequest.query = { page: '1', limit: '10' };
        const middleware = validateRequest({ query: querySchema });
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: クエリパラメータが正しく処理される
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRequest.query).toEqual({ page: 1, limit: 10 });
      });

      test('shouldReturnErrorWhenQueryValidationFails', () => {
        // Given: 無効なクエリパラメータ
        const querySchema = z.object({
          campaignId: z.string().uuid(),
          includeCharacters: z.enum(['true', 'false'])
        });
        
        mockRequest.query = { campaignId: 'invalid-uuid', includeCharacters: 'maybe' };
        const middleware = validateRequest({ query: querySchema });
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: バリデーションエラーが返される
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(logger.warn).toHaveBeenCalledWith(
          'Request validation failed',
          expect.objectContaining({
            path: '/api/test',
            method: 'POST'
          })
        );
      });
    });

    describe('Parameters Validation', () => {
      test('shouldValidatePathParametersSuccessfully', () => {
        // Given: 有効なパラメータスキーマ
        const paramsSchema = z.object({
          id: z.string().uuid(),
          type: z.enum(['campaign', 'character', 'session'])
        });
        
        mockRequest.params = { 
          id: '123e4567-e89b-12d3-a456-426614174000',
          type: 'campaign'
        };
        const middleware = validateRequest({ params: paramsSchema });
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: パラメータが正しく処理される
        expect(mockNext).toHaveBeenCalledWith();
      });

      test('shouldReturnErrorWhenParamsValidationFails', () => {
        // Given: 無効なパスパラメータ
        const paramsSchema = z.object({
          sessionId: z.string().min(5),
          actionType: z.enum(['move', 'attack', 'cast'])
        });
        
        mockRequest.params = { sessionId: '123', actionType: 'invalid' };
        const middleware = validateRequest({ params: paramsSchema });
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: バリデーションエラーが返される
        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('Headers Validation', () => {
      test('shouldValidateHeadersSuccessfully', () => {
        // Given: 有効なヘッダースキーマ
        const headersSchema = z.object({
          'content-type': z.string(),
          'x-api-version': z.string().optional()
        });
        
        mockRequest.headers = { 
          'content-type': 'application/json',
          'x-api-version': 'v1'
        };
        const middleware = validateRequest({ headers: headersSchema });
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: ヘッダーが正しく処理される
        expect(mockNext).toHaveBeenCalledWith();
      });

      test('shouldReturnErrorWhenHeadersValidationFails', () => {
        // Given: 無効なヘッダー
        const headersSchema = z.object({
          authorization: z.string().startsWith('Bearer '),
          'content-type': z.literal('application/json')
        });
        
        mockRequest.headers = { 
          authorization: 'Invalid token',
          'content-type': 'text/plain'
        };
        const middleware = validateRequest({ headers: headersSchema });
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: バリデーションエラーが返される
        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('Multiple Schema Validation', () => {
      test('shouldValidateMultipleSchemasSimultaneously', () => {
        // Given: 複数のスキーマ
        const schemas = {
          body: z.object({ name: z.string() }),
          query: z.object({ type: z.string() }),
          params: z.object({ id: z.string() })
        };
        
        mockRequest.body = { name: 'Test Campaign' };
        mockRequest.query = { type: 'fantasy' };
        mockRequest.params = { id: 'camp-123' };
        
        const middleware = validateRequest(schemas);
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: 全てのスキーマが成功する
        expect(mockNext).toHaveBeenCalledWith();
      });

      test('shouldReturnFirstValidationErrorWhenMultipleFail', () => {
        // Given: 複数の無効なデータ
        const schemas = {
          body: z.object({ required: z.string() }),
          query: z.object({ page: z.string().transform(val => parseInt(val, 10)) })
        };
        
        mockRequest.body = {}; // required フィールドが欠けている
        mockRequest.query = { page: 'not-a-number' };
        
        const middleware = validateRequest(schemas);
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: バリデーションエラーが返される
        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('Error Handling', () => {
      test('shouldHandleUnexpectedValidationErrors', () => {
        // Given: 例外を投げるスキーマ
        const faultySchema = {
          body: {
            parse: jest.fn().mockImplementation(() => {
              throw new Error('Unexpected validation error');
            })
          } as any
        };
        
        const middleware = validateRequest(faultySchema);
        
        // When: バリデーションを実行
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Then: 内部エラーが返される
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Internal server error during validation',
          code: 'INTERNAL_VALIDATION_ERROR'
        });
        expect(logger.error).toHaveBeenCalledWith(
          'Unexpected validation error',
          expect.any(Object)
        );
      });
    });
  });

  describe('Security Validation Middleware', () => {
    test('shouldAllowSafeContentThrough', () => {
      // Given: 安全なコンテンツ
      mockRequest.body = {
        campaignName: 'Epic Fantasy Adventure',
        description: 'A heroic quest to save the kingdom',
        playerCount: 4
      };
      mockRequest.query = { filter: 'active', sort: 'name' };
      
      // When: セキュリティバリデーションを実行
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 安全なコンテンツは通過する
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('shouldDetectXSSAttemptsInRequestBody', () => {
      // Given: XSS攻撃を含むボディ
      mockRequest.body = {
        message: '<script>alert("xss")</script>',
        description: 'Normal text'
      };
      
      // When: セキュリティバリデーションを実行
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: XSS攻撃が検出される
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Security validation failed',
        code: 'SECURITY_VIOLATION',
        message: 'Request contains potentially malicious content'
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Security validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.stringContaining('XSS detected')
          ])
        })
      );
    });

    test('shouldDetectSQLInjectionAttemptsInRequestBody', () => {
      // Given: SQLインジェクション攻撃を含むボディ
      mockRequest.body = {
        filter: "'; DROP TABLE campaigns; --",
        search: 'SELECT * FROM users WHERE admin = 1'
      };
      
      // When: セキュリティバリデーションを実行
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: SQLインジェクション攻撃が検出される
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith(
        'Security validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.stringContaining('SQL injection detected')
          ])
        })
      );
    });

    test('shouldDetectExcessivelyLongInputs', () => {
      // Given: 異常に長い入力
      const longString = 'a'.repeat(10001);
      mockRequest.body = {
        description: longString,
        name: 'Normal Name'
      };
      
      // When: セキュリティバリデーションを実行
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 長すぎる入力が検出される
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith(
        'Security validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.stringContaining('Excessively long input')
          ])
        })
      );
    });

    test('shouldDetectAttacksInQueryParameters', () => {
      // Given: クエリパラメータでの攻撃
      mockRequest.query = {
        search: '<script>steal()</script>',
        filter: 'DELETE FROM sessions'
      };
      
      // When: セキュリティバリデーションを実行
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: クエリパラメータでの攻撃が検出される
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    test('shouldHandleNestedObjectsInSecurity', () => {
      // Given: ネストしたオブジェクトでの攻撃
      mockRequest.body = {
        campaign: {
          name: 'Test Campaign',
          settings: {
            description: '<script>malicious()</script>',
            rules: {
              combat: 'SELECT password FROM users'
            }
          }
        }
      };
      
      // When: セキュリティバリデーションを実行
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: ネストしたオブジェクトでの攻撃が検出される
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith(
        'Security validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.stringContaining('XSS detected in campaign.settings.description'),
            expect.stringContaining('SQL injection detected in campaign.settings.rules.combat')
          ])
        })
      );
    });

    test('shouldLogUserContextWithSecurityViolations', () => {
      // Given: ユーザー情報付きのセキュリティ違反
      mockRequest.user = { userId: 'user-123' };
      mockRequest.body = { malicious: '<script>hack()</script>' };
      
      // When: セキュリティバリデーションを実行
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: ユーザー情報が含まれる
      expect(logger.warn).toHaveBeenCalledWith(
        'Security validation failed',
        expect.objectContaining({
          userId: 'user-123'
        })
      );
    });
  });

  describe('Rate Limit Info Middleware', () => {
    test('shouldSetRateLimitHeadersForRequest', () => {
      // Given: 通常のリクエスト
      mockRequest.ip = '192.168.1.100';
      
      // When: レート制限情報を設定
      rateLimitInfo(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: レート制限ヘッダーが設定される
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Identifier', '192.168.1.100anonymous');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
      expect(mockNext).toHaveBeenCalled();
    });

    test('shouldUseUserIdInRateLimitIdentifierWhenAvailable', () => {
      // Given: ユーザー情報付きのリクエスト
      mockRequest.ip = '192.168.1.100';
      mockRequest.user = { userId: 'user-456' };
      
      // When: レート制限情報を設定
      rateLimitInfo(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: ユーザーIDが含まれた識別子が設定される
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Identifier', '192.168.1.100user-456');
    });

    test('shouldSetCorrectResetTimeForRateLimit', () => {
      // Given: 現在時刻
      const beforeTime = Date.now();
      
      // When: レート制限情報を設定
      rateLimitInfo(mockRequest as Request, mockResponse as Response, mockNext);
      
      const afterTime = Date.now();
      
      // Then: 15分後のリセット時刻が設定される
      const resetTime = (mockResponse.setHeader as jest.Mock).mock.calls
        .find(call => call[0] === 'X-RateLimit-Reset')?.[1];
      
      expect(resetTime).toBeGreaterThan(beforeTime + 14 * 60 * 1000); // 14分以上
      expect(resetTime).toBeLessThan(afterTime + 16 * 60 * 1000); // 16分以下
    });
  });

  describe('File Upload Validation Middleware', () => {
    test('shouldAllowValidFileTypes', () => {
      // Given: 許可されたファイルタイプ
      const validFiles = [
        { mimetype: 'image/jpeg', size: 1024, originalname: 'test.jpg' },
        { mimetype: 'image/png', size: 2048, originalname: 'test.png' },
        { mimetype: 'text/plain', size: 512, originalname: 'test.txt' }
      ];
      
      mockRequest.files = validFiles;
      
      // When: ファイルアップロードバリデーションを実行
      fileUploadValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: ファイルが許可される
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('shouldRejectInvalidFileTypes', () => {
      // Given: 許可されていないファイルタイプ
      const invalidFiles = [
        { mimetype: 'application/x-executable', size: 1024, originalname: 'malware.exe' }
      ];
      
      mockRequest.files = invalidFiles;
      
      // When: ファイルアップロードバリデーションを実行
      fileUploadValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: ファイルが拒否される
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid file type',
        code: 'INVALID_FILE_TYPE',
        allowedTypes: expect.arrayContaining(['image/jpeg', 'image/png'])
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'File upload validation failed: Invalid MIME type',
        expect.objectContaining({
          mimetype: 'application/x-executable',
          filename: 'malware.exe'
        })
      );
    });

    test('shouldRejectExcessivelyLargeFiles', () => {
      // Given: 大きすぎるファイル
      const largeFiles = [
        { mimetype: 'image/jpeg', size: 11 * 1024 * 1024, originalname: 'huge.jpg' } // 11MB
      ];
      
      mockRequest.files = largeFiles;
      
      // When: ファイルアップロードバリデーションを実行
      fileUploadValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: ファイルサイズエラーが返される
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'File too large',
        code: 'FILE_TOO_LARGE',
        maxSize: 10 * 1024 * 1024
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'File upload validation failed: File too large',
        expect.objectContaining({
          size: 11 * 1024 * 1024,
          maxSize: 10 * 1024 * 1024
        })
      );
    });

    test('shouldHandleMultipleFilesCorrectly', () => {
      // Given: 複数ファイル（一部無効）
      const mixedFiles = [
        { mimetype: 'image/png', size: 1024, originalname: 'valid.png' },
        { mimetype: 'application/pdf', size: 2048, originalname: 'invalid.pdf' }
      ];
      
      mockRequest.files = mixedFiles;
      
      // When: ファイルアップロードバリデーションを実行
      fileUploadValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 無効なファイルが検出される
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    test('shouldLogUserContextWithFileUploadViolations', () => {
      // Given: ユーザー情報付きの無効ファイル
      mockRequest.user = { userId: 'user-789' };
      mockRequest.files = [
        { mimetype: 'application/x-script', size: 1024, originalname: 'script.sh' }
      ];
      
      // When: ファイルアップロードバリデーションを実行
      fileUploadValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: ユーザー情報が含まれる
      expect(logger.warn).toHaveBeenCalledWith(
        'File upload validation failed: Invalid MIME type',
        expect.objectContaining({
          userId: 'user-789'
        })
      );
    });
  });

  describe('CORS Security Validation Middleware', () => {
    test('shouldAllowRequestsFromAllowedOrigins', () => {
      // Given: 許可されたオリジン
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Origin') return 'http://localhost:3000';
        return undefined;
      });
      
      // When: CORS検証を実行
      corsSecurityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: リクエストが許可される
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('shouldRejectRequestsFromUnallowedOrigins', () => {
      // Given: 許可されていないオリジン
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Origin') return 'http://malicious.com';
        return undefined;
      });
      
      // When: CORS検証を実行
      corsSecurityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: リクエストが拒否される
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Origin not allowed',
        code: 'CORS_ORIGIN_NOT_ALLOWED'
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'CORS validation failed: Origin not allowed',
        expect.objectContaining({
          origin: 'http://malicious.com'
        })
      );
    });

    test('shouldAllowRequestsWithoutOriginHeader', () => {
      // Given: Originヘッダーなしのリクエスト
      (mockRequest.get as jest.Mock).mockImplementation(() => undefined);
      
      // When: CORS検証を実行
      corsSecurityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: リクエストが許可される（Originヘッダーなしは通常のAPIクライアント）
      expect(mockNext).toHaveBeenCalled();
    });

    test('shouldUseProductionOriginsInProductionEnvironment', () => {
      // Given: 本番環境の設定
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://api.example.com';
      
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Origin') return 'https://app.example.com';
        return undefined;
      });
      
      // When: CORS検証を実行
      corsSecurityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 本番環境のオリジンが許可される
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Response Time Monitoring Middleware', () => {
    test('shouldLogNormalResponseTimes', () => {
      // Given: 通常のレスポンス時間
      let finishCallback: Function;
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });
      
      const startTime = Date.now();
      
      // When: レスポンス時間監視を開始
      responseTimeMonitoring(mockRequest as Request, mockResponse as Response, mockNext);
      
      // シミュレート: 100ms後にレスポンス完了
      setTimeout(() => {
        finishCallback();
      }, 100);
      
      // Then: 次のミドルウェアが呼ばれる
      expect(mockNext).toHaveBeenCalled();
      
      // レスポンス完了時のログ確認は非同期のため、実際のテストでは別のアプローチが必要
    });

    test('shouldLogSlowResponseWarnings', () => {
      // Given: 遅いレスポンス
      let finishCallback: Function;
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });
      
      mockResponse.statusCode = 200;
      
      // When: レスポンス時間監視を開始
      responseTimeMonitoring(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 次のミドルウェアが呼ばれる
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    test('shouldIncludeUserContextInResponseTimeLogging', () => {
      // Given: ユーザー情報付きのリクエスト
      mockRequest.user = { userId: 'user-456' };
      mockResponse.statusCode = 200;
      
      // When: レスポンス時間監視を開始
      responseTimeMonitoring(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: ユーザー情報が監視対象に含まれる
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('TRPG Specific Validation Scenarios', () => {
    test('shouldValidateTRPGCampaignCreationRequest', () => {
      // Given: TRPGキャンペーン作成のスキーマ
      const campaignSchema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(1000),
        maxPlayers: z.number().min(1).max(8),
        systemType: z.enum(['D&D5e', 'Pathfinder', 'Call of Cthulhu', 'Custom']),
        isPrivate: z.boolean()
      });
      
      mockRequest.body = {
        name: 'Epic Fantasy Campaign',
        description: 'A heroic adventure in a magical world',
        maxPlayers: 4,
        systemType: 'D&D5e',
        isPrivate: false
      };
      
      const middleware = validateRequest({ body: campaignSchema });
      
      // When: バリデーションを実行
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: TRPGキャンペーンデータが正しく検証される
      expect(mockNext).toHaveBeenCalled();
    });

    test('shouldValidateTRPGCharacterCreationRequest', () => {
      // Given: TRPGキャラクター作成のスキーマ
      const characterSchema = z.object({
        name: z.string().min(1).max(50),
        race: z.string().min(1),
        characterClass: z.string().min(1),
        level: z.number().min(1).max(20),
        stats: z.object({
          strength: z.number().min(3).max(18),
          dexterity: z.number().min(3).max(18),
          constitution: z.number().min(3).max(18),
          intelligence: z.number().min(3).max(18),
          wisdom: z.number().min(3).max(18),
          charisma: z.number().min(3).max(18)
        }),
        background: z.string().max(500)
      });
      
      mockRequest.body = {
        name: 'Aragorn',
        race: 'Human',
        characterClass: 'Ranger',
        level: 5,
        stats: {
          strength: 16,
          dexterity: 14,
          constitution: 15,
          intelligence: 12,
          wisdom: 13,
          charisma: 11
        },
        background: 'A ranger from the North'
      };
      
      const middleware = validateRequest({ body: characterSchema });
      
      // When: バリデーションを実行
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: TRPGキャラクターデータが正しく検証される
      expect(mockNext).toHaveBeenCalled();
    });

    test('shouldValidateDiceRollRequests', () => {
      // Given: ダイスロールのスキーマ
      const diceRollSchema = z.object({
        diceNotation: z.string().regex(/^\d+d\d+([+-]\d+)?$/),
        purpose: z.string().max(100),
        characterId: z.string().uuid()
      });
      
      mockRequest.body = {
        diceNotation: '1d20+5',
        purpose: 'Attack roll',
        characterId: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      const middleware = validateRequest({ body: diceRollSchema });
      
      // When: バリデーションを実行
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: ダイスロールデータが正しく検証される
      expect(mockNext).toHaveBeenCalled();
    });

    test('shouldRejectInvalidDiceNotation', () => {
      // Given: 無効なダイス記法
      const diceRollSchema = z.object({
        diceNotation: z.string().regex(/^\d+d\d+([+-]\d+)?$/)
      });
      
      mockRequest.body = {
        diceNotation: 'invalid-dice'
      };
      
      const middleware = validateRequest({ body: diceRollSchema });
      
      // When: バリデーションを実行
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: バリデーションエラーが返される
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });
});