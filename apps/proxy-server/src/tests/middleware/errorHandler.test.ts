import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  ValidationError,
  AIServiceError,
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError,
  AppError
} from '../../middleware/errorHandler';
import { errorMonitoringService } from '../../services/errorMonitoringService';

// t-WADA naming conventions:
// - should[ExpectedBehavior]When[StateUnderTest]
// - can[DoSomething]Given[Condition]

// Mock the error monitoring service
jest.mock('../../services/errorMonitoringService', () => ({
  errorMonitoringService: {
    logError: jest.fn()
  }
}));

describe('Error Handler Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.MockedFunction<NextFunction>;
  const originalEnv = process.env;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/test',
      ip: '192.168.1.1',
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'User-Agent') return 'test-agent';
        if (header === 'Origin') return 'http://localhost:3000';
        if (header === 'Referer') return 'http://localhost:3000/test';
        return undefined;
      })
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Custom Error Classes', () => {
    describe('ValidationError', () => {
      test('shouldCreateValidationErrorWithCorrectProperties', () => {
        // Given: バリデーションエラーの詳細
        const message = 'Invalid input data';
        const details = { field: 'email', reason: 'invalid format' };
        
        // When: ValidationErrorを作成
        const error = new ValidationError(message, details);
        
        // Then: 正しいプロパティが設定される
        expect(error.message).toBe(message);
        expect(error.name).toBe('ValidationError');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.userMessage).toBe(message);
        expect(error.details).toEqual(details);
      });

      test('shouldCreateValidationErrorWithoutDetails', () => {
        // Given: 詳細なしのバリデーションエラー
        const message = 'Required field missing';
        
        // When: ValidationErrorを作成
        const error = new ValidationError(message);
        
        // Then: 詳細なしで正しく作成される
        expect(error.message).toBe(message);
        expect(error.details).toBeUndefined();
      });
    });

    describe('AIServiceError', () => {
      test('shouldCreateAIServiceErrorWithProviderInformation', () => {
        // Given: AIサービスエラーの詳細
        const message = 'Rate limit exceeded';
        const provider = 'openai';
        const details = { limit: 20, resetTime: '60s' };
        
        // When: AIServiceErrorを作成
        const error = new AIServiceError(message, provider, details);
        
        // Then: 正しいプロパティが設定される
        expect(error.message).toBe(message);
        expect(error.name).toBe('AIServiceError');
        expect(error.statusCode).toBe(502);
        expect(error.code).toBe('AI_SERVICE_ERROR');
        expect(error.provider).toBe(provider);
        expect(error.details).toEqual(details);
        expect(error.userMessage).toBe('AI service error: Rate limit exceeded. Please check your API key and try again.');
      });

      test('shouldCreateAIServiceErrorForDifferentProviders', () => {
        // Given: 異なるプロバイダーのエラー
        const anthropicError = new AIServiceError('Invalid API key', 'anthropic');
        const googleError = new AIServiceError('Model not found', 'google');
        
        // When & Then: プロバイダー情報が正しく設定される
        expect(anthropicError.provider).toBe('anthropic');
        expect(googleError.provider).toBe('google');
      });
    });

    describe('DatabaseError', () => {
      test('shouldCreateDatabaseErrorWithGenericUserMessage', () => {
        // Given: データベースエラー
        const message = 'UNIQUE constraint failed';
        const details = { table: 'campaigns', column: 'name' };
        
        // When: DatabaseErrorを作成
        const error = new DatabaseError(message, details);
        
        // Then: ユーザー向けメッセージが設定される
        expect(error.message).toBe(message);
        expect(error.name).toBe('DatabaseError');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('DATABASE_ERROR');
        expect(error.userMessage).toBe('Database error occurred. Please try again later.');
        expect(error.details).toEqual(details);
      });
    });

    describe('NotFoundError', () => {
      test('shouldCreateNotFoundErrorWithResourceAndId', () => {
        // Given: リソース名とID
        const resource = 'Campaign';
        const id = 'camp-123';
        
        // When: NotFoundErrorを作成
        const error = new NotFoundError(resource, id);
        
        // Then: 適切なメッセージが生成される
        expect(error.message).toBe('Campaign with ID camp-123 not found');
        expect(error.userMessage).toBe('Campaign with ID camp-123 not found');
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
      });

      test('shouldCreateNotFoundErrorWithResourceOnly', () => {
        // Given: リソース名のみ
        const resource = 'Character';
        
        // When: NotFoundErrorを作成
        const error = new NotFoundError(resource);
        
        // Then: ID なしのメッセージが生成される
        expect(error.message).toBe('Character not found');
        expect(error.userMessage).toBe('Character not found');
      });
    });

    describe('UnauthorizedError', () => {
      test('shouldCreateUnauthorizedErrorWithDefaultMessage', () => {
        // Given: デフォルトの認証エラー
        
        // When: UnauthorizedErrorを作成
        const error = new UnauthorizedError();
        
        // Then: デフォルトメッセージが設定される
        expect(error.message).toBe('Unauthorized access');
        expect(error.userMessage).toBe('Unauthorized access');
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('UNAUTHORIZED');
      });

      test('shouldCreateUnauthorizedErrorWithCustomMessage', () => {
        // Given: カスタムメッセージ
        const customMessage = 'Invalid JWT token';
        
        // When: UnauthorizedErrorを作成
        const error = new UnauthorizedError(customMessage);
        
        // Then: カスタムメッセージが設定される
        expect(error.message).toBe(customMessage);
        expect(error.userMessage).toBe(customMessage);
      });
    });

    describe('RateLimitError', () => {
      test('shouldCreateRateLimitErrorWithRetryAfter', () => {
        // Given: リトライ時間
        const retryAfter = 60;
        
        // When: RateLimitErrorを作成
        const error = new RateLimitError(retryAfter);
        
        // Then: リトライ情報が含まれる
        expect(error.message).toBe('Rate limit exceeded');
        expect(error.statusCode).toBe(429);
        expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(error.retryAfter).toBe(retryAfter);
        expect(error.userMessage).toBe('Rate limit exceeded. Please try again in 60 seconds.');
      });
    });
  });

  describe('Error Handler Function', () => {
    test('shouldHandleValidationErrorCorrectly', () => {
      // Given: バリデーションエラー
      const error = new ValidationError('Invalid email format', { field: 'email' });
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 適切なレスポンスが返される
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid email format',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandleAIServiceErrorCorrectly', () => {
      // Given: AIサービスエラー
      const error = new AIServiceError('API quota exceeded', 'openai');
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 適切なレスポンスが返される
      expect(mockResponse.status).toHaveBeenCalledWith(502);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'AI service error: API quota exceeded. Please check your API key and try again.',
        timestamp: expect.any(String)
      });
    });

    test('shouldSetRetryAfterHeaderForRateLimitError', () => {
      // Given: レート制限エラー
      const retryAfter = 120;
      const error = new RateLimitError(retryAfter);
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: Retry-Afterヘッダーが設定される
      expect(mockResponse.set).toHaveBeenCalledWith('Retry-After', '120');
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    test('shouldUseDefaultStatusCodeForUnknownError', () => {
      // Given: ステータスコードのないエラー
      const error = new Error('Unknown error') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: デフォルトの500ステータスが使用される
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    test('shouldSanitizeAPIKeysFromErrorMessages', () => {
      // Given: APIキーを含むエラーメッセージ
      const error = new Error('Authentication failed with key sk-1234567890abcdef') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: APIキーがサニタイズされる
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed with key [REDACTED]',
        timestamp: expect.any(String)
      });
    });

    test('shouldSanitizeBearerTokensFromErrorMessages', () => {
      // Given: Bearerトークンを含むエラーメッセージ
      const error = new Error('Request failed: Bearer abc123xyz') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: Bearerトークンがサニタイズされる
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request failed: [REDACTED]',
        timestamp: expect.any(String)
      });
    });

    test('shouldIncludeDebugInfoInDevelopmentEnvironment', () => {
      // Given: 開発環境
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error') as AppError;
      error.stack = 'Error stack trace';
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: デバッグ情報が含まれる
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
        timestamp: expect.any(String),
        debug: {
          originalMessage: 'Test error',
          stack: 'Error stack trace',
          details: undefined
        }
      });
    });

    test('shouldNotIncludeDebugInfoInProductionEnvironment', () => {
      // Given: 本番環境
      process.env.NODE_ENV = 'production';
      const error = new Error('Production error') as AppError;
      error.stack = 'Error stack trace';
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: デバッグ情報が含まれない
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Production error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Component Determination', () => {
    test('shouldDetermineAIAgentComponentCorrectly', () => {
      // Given: AI agentパスのリクエスト
      mockRequest.path = '/api/ai-agent/generate';
      const error = new Error('AI agent error') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 正しいコンポーネントがログされる
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'ai-agent',
        expect.objectContaining({
          path: '/api/ai-agent/generate'
        })
      );
    });

    test('shouldDetermineAIGameMasterComponentCorrectly', () => {
      // Given: AI game masterパスのリクエスト
      mockRequest.path = '/api/ai-game-master/session';
      const error = new Error('GM error') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 正しいコンポーネントがログされる
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'ai-game-master',
        expect.any(Object)
      );
    });

    test('shouldDetermineCampaignsComponentCorrectly', () => {
      // Given: campaignsパスのリクエスト
      mockRequest.path = '/api/campaigns/123';
      const error = new Error('Campaign error') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 正しいコンポーネントがログされる
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'campaigns',
        expect.any(Object)
      );
    });

    test('shouldDetermineUnknownComponentForUnmatchedPaths', () => {
      // Given: 未知のパスのリクエスト
      mockRequest.path = '/api/unknown/endpoint';
      const error = new Error('Unknown error') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: unknownコンポーネントがログされる
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'unknown',
        expect.any(Object)
      );
    });
  });

  describe('Context Logging', () => {
    test('shouldLogCompleteRequestContextWithError', () => {
      // Given: 詳細なリクエストコンテキスト
      const mockRequestWithUser = {
        ...mockRequest,
        user: { userId: 'user-123', sessionId: 'session-456' },
        sessionId: 'session-456',
        campaignId: 'campaign-789'
      };
      const error = new Error('Context test error') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(
        error,
        mockRequestWithUser as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 完全なコンテキストがログされる
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'unknown',
        {
          method: 'GET',
          path: '/api/test',
          userAgent: 'test-agent',
          ip: '192.168.1.1',
          userId: 'user-123',
          sessionId: 'session-456',
          campaignId: 'campaign-789',
          statusCode: 500
        }
      );
    });

    test('shouldHandleMissingUserContextGracefully', () => {
      // Given: ユーザー情報のないリクエスト
      const error = new Error('No user context') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: ユーザー情報なしでログされる
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'unknown',
        expect.objectContaining({
          userId: undefined,
          sessionId: undefined,
          campaignId: undefined
        })
      );
    });
  });

  describe('API Key Sanitization', () => {
    test('shouldSanitizeOpenAIAPIKeys', () => {
      // Given: OpenAI APIキーを含むエラー
      const error = new Error('Error with sk-1234567890abcdef1234567890abcdef1234567890abcdef') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: APIキーがサニタイズされる
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error with [REDACTED]',
        timestamp: expect.any(String)
      });
    });

    test('shouldSanitizeAnthropicAPIKeys', () => {
      // Given: Anthropic APIキーを含むエラー
      const error = new Error('Error with sk-ant-api03-1234567890abcdef') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: APIキーがサニタイズされる
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error with [REDACTED]',
        timestamp: expect.any(String)
      });
    });

    test('shouldSanitizeMultipleAPIKeysInSingleMessage', () => {
      // Given: 複数のAPIキーを含むエラー
      const error = new Error('Failed: sk-123abc token=xyz789 secret=abc123') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 全てのAPIキーがサニタイズされる
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed: [REDACTED] [REDACTED] [REDACTED]',
        timestamp: expect.any(String)
      });
    });

    test('shouldNotModifyMessageWithoutAPIKeys', () => {
      // Given: APIキーを含まないエラー
      const error = new Error('Normal error message without sensitive data') as AppError;
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: メッセージが変更されない
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Normal error message without sensitive data',
        timestamp: expect.any(String)
      });
    });
  });

  describe('TRPG Specific Error Scenarios', () => {
    test('shouldHandleTRPGSessionErrors', () => {
      // Given: TRPGセッションエラー
      mockRequest.path = '/api/sessions/123/dice-roll';
      const error = new ValidationError('Invalid dice notation', { dice: '1d100' });
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: セッションコンポーネントとしてログされる
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'sessions',
        expect.any(Object)
      );
    });

    test('shouldHandleCharacterGenerationErrors', () => {
      // Given: キャラクター生成エラー
      mockRequest.path = '/api/ai-character/generate';
      const error = new AIServiceError('Character generation failed', 'openai');
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: AIキャラクターコンポーネントとしてログされる
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'ai-character',
        expect.any(Object)
      );
    });

    test('shouldHandleLocationManagementErrors', () => {
      // Given: 場所管理エラー
      mockRequest.path = '/api/locations/456/update';
      const error = new DatabaseError('Location update failed');
      
      // When: エラーハンドラーを実行
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 場所コンポーネントとしてログされる
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'locations',
        expect.any(Object)
      );
    });
  });
});