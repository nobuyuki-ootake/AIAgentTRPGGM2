
import { Request, Response, NextFunction } from 'express';
import { notFoundHandler } from '../../middleware/notFoundHandler';
import { APIResponse } from '@ai-agent-trpg/types';

// t-WADA naming conventions:
// - should[ExpectedBehavior]When[StateUnderTest]
// - can[DoSomething]Given[Condition]

describe('Not Found Handler Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/nonexistent'
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Not Found Handling', () => {
    test('shouldReturn404StatusForNonexistentEndpoint', () => {
      // Given: 存在しないエンドポイントへのリクエスト
      mockRequest.method = 'GET';
      mockRequest.path = '/api/nonexistent';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 404ステータスが返される
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    test('shouldReturnStandardAPIResponseFormat', () => {
      // Given: 存在しないエンドポイントへのリクエスト
      mockRequest.method = 'POST';
      mockRequest.path = '/api/invalid/endpoint';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 標準的なAPIレスポンス形式が返される
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint POST /api/invalid/endpoint not found',
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      });
    });

    test('shouldIncludeTimestampInResponse', () => {
      // Given: 存在しないエンドポイント
      const beforeTime = new Date().toISOString();
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      const afterTime = new Date().toISOString();
      
      // Then: タイムスタンプが含まれ、現在時刻に近い
      const response = (mockResponse.json as jest.Mock).mock.calls[0][0] as APIResponse<null>;
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(response.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(response.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('shouldNotCallNextMiddleware', () => {
      // Given: NotFoundハンドラー
      
      // When: ハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 次のミドルウェアは呼ばれない
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Different HTTP Methods', () => {
    test('shouldHandleGETRequestNotFound', () => {
      // Given: 存在しないGETエンドポイント
      mockRequest.method = 'GET';
      mockRequest.path = '/api/campaigns/999999';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: GETメソッドが含まれたエラーメッセージ
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET /api/campaigns/999999 not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandlePOSTRequestNotFound', () => {
      // Given: 存在しないPOSTエンドポイント
      mockRequest.method = 'POST';
      mockRequest.path = '/api/invalid/create';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: POSTメソッドが含まれたエラーメッセージ
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint POST /api/invalid/create not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandlePUTRequestNotFound', () => {
      // Given: 存在しないPUTエンドポイント
      mockRequest.method = 'PUT';
      mockRequest.path = '/api/characters/123/update';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: PUTメソッドが含まれたエラーメッセージ
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint PUT /api/characters/123/update not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandleDELETERequestNotFound', () => {
      // Given: 存在しないDELETEエンドポイント
      mockRequest.method = 'DELETE';
      mockRequest.path = '/api/sessions/456/delete';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: DELETEメソッドが含まれたエラーメッセージ
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint DELETE /api/sessions/456/delete not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandlePATCHRequestNotFound', () => {
      // Given: 存在しないPATCHエンドポイント
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/quests/789/partial-update';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: PATCHメソッドが含まれたエラーメッセージ
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint PATCH /api/quests/789/partial-update not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandleOPTIONSRequestNotFound', () => {
      // Given: 存在しないOPTIONSエンドポイント
      mockRequest.method = 'OPTIONS';
      mockRequest.path = '/api/nonexistent/options';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: OPTIONSメソッドが含まれたエラーメッセージ
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint OPTIONS /api/nonexistent/options not found',
        timestamp: expect.any(String)
      });
    });
  });

  describe('API Route Patterns', () => {
    test('shouldHandleTRPGCampaignRoutesNotFound', () => {
      // Given: 存在しないキャンペーンルート
      mockRequest.method = 'GET';
      mockRequest.path = '/api/campaigns/123/nonexistent-action';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: キャンペーンルートエラーが返される
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET /api/campaigns/123/nonexistent-action not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandleTRPGCharacterRoutesNotFound', () => {
      // Given: 存在しないキャラクタールート
      mockRequest.method = 'POST';
      mockRequest.path = '/api/characters/456/invalid-update';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: キャラクタールートエラーが返される
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint POST /api/characters/456/invalid-update not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandleTRPGSessionRoutesNotFound', () => {
      // Given: 存在しないセッションルート
      mockRequest.method = 'PUT';
      mockRequest.path = '/api/sessions/789/nonexistent-action';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: セッションルートエラーが返される
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint PUT /api/sessions/789/nonexistent-action not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandleAIAgentRoutesNotFound', () => {
      // Given: 存在しないAI agentルート
      mockRequest.method = 'POST';
      mockRequest.path = '/api/ai-agent/invalid-function';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: AI agentルートエラーが返される
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint POST /api/ai-agent/invalid-function not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandleAIGameMasterRoutesNotFound', () => {
      // Given: 存在しないAI game masterルート
      mockRequest.method = 'GET';
      mockRequest.path = '/api/ai-game-master/nonexistent-endpoint';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: AI game masterルートエラーが返される
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET /api/ai-game-master/nonexistent-endpoint not found',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Edge Cases and Special Paths', () => {
    test('shouldHandleRootAPIPathNotFound', () => {
      // Given: APIルートパス
      mockRequest.method = 'GET';
      mockRequest.path = '/api';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: ルートAPIパスエラーが返される
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET /api not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandleEmptyPathNotFound', () => {
      // Given: 空のパス
      mockRequest.method = 'GET';
      mockRequest.path = '';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 空パスエラーが返される
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET  not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandlePathWithQueryParameters', () => {
      // Given: クエリパラメータ付きのパス
      mockRequest.method = 'GET';
      mockRequest.path = '/api/search';
      // Note: クエリパラメータはpathには含まれない（通常はreq.queryで別管理）
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: クエリパラメータなしのパスでエラーが返される
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET /api/search not found',
        timestamp: expect.any(String)
      });
    });

    test('shouldHandleVeryLongPathNotFound', () => {
      // Given: 非常に長いパス
      const longPath = '/api/' + 'very-long-path-segment/'.repeat(20) + 'endpoint';
      mockRequest.method = 'GET';
      mockRequest.path = longPath;
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 長いパスエラーが返される
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: `Endpoint GET ${longPath} not found`,
        timestamp: expect.any(String)
      });
    });

    test('shouldHandlePathWithSpecialCharacters', () => {
      // Given: 特殊文字を含むパス
      mockRequest.method = 'GET';
      mockRequest.path = '/api/campaigns/héllo-wørld/ñoñ-ëxístëñt';
      
      // When: NotFoundハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: 特殊文字が含まれたパスエラーが返される
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET /api/campaigns/héllo-wørld/ñoñ-ëxístëñt not found',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Response Type Safety', () => {
    test('shouldReturnAPIResponseWithCorrectTypeStructure', () => {
      // Given: NotFoundハンドラー
      
      // When: ハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: APIResponse<null>型の構造が返される
      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('timestamp');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.error).toBe('string');
      expect(typeof response.timestamp).toBe('string');
    });

    test('shouldNotIncludeDataPropertyInNotFoundResponse', () => {
      // Given: NotFoundハンドラー
      
      // When: ハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Then: dataプロパティは含まれない
      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(response).not.toHaveProperty('data');
    });

    test('shouldHaveConsistentResponseStructure', () => {
      // Given: 複数の異なるリクエスト
      const requests = [
        { method: 'GET', path: '/api/test1' },
        { method: 'POST', path: '/api/test2' },
        { method: 'PUT', path: '/api/test3' }
      ];
      
      const responses: any[] = [];
      
      requests.forEach(req => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        
        notFoundHandler(
          { ...req } as Request,
          mockRes as Response,
          mockNext
        );
        
        responses.push((mockRes.json as jest.Mock).mock.calls[0][0]);
      });
      
      // Then: 全てのレスポンスが同じ構造を持つ
      responses.forEach(response => {
        expect(response).toHaveProperty('success', false);
        expect(response).toHaveProperty('error');
        expect(response).toHaveProperty('timestamp');
        expect(Object.keys(response)).toEqual(['success', 'error', 'timestamp']);
      });
    });
  });

  describe('Performance and Memory', () => {
    test('shouldHandleMultipleNotFoundRequestsEfficiently', () => {
      // Given: 複数の404リクエスト
      const startTime = Date.now();
      
      // When: 100回の404リクエストを処理
      for (let i = 0; i < 100; i++) {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        
        notFoundHandler(
          { method: 'GET', path: `/api/test${i}` } as Request,
          mockRes as Response,
          mockNext
        );
      }
      
      const endTime = Date.now();
      
      // Then: 効率的に処理される（500ms以内）
      expect(endTime - startTime).toBeLessThan(500);
    });

    test('shouldNotCauseMemoryLeaksWithRepeatedCalls', () => {
      // Given: 繰り返し呼び出し
      const initialMemory = process.memoryUsage();
      
      // When: 大量の404リクエストを処理
      for (let i = 0; i < 1000; i++) {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        
        notFoundHandler(
          { method: 'GET', path: `/memory-test/${i}` } as Request,
          mockRes as Response,
          mockNext
        );
      }
      
      // ガベージコレクションを促す
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Then: メモリ使用量が大幅に増加しない（10MB以内の増加）
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('shouldReturnResponseImmediately', () => {
      // Given: NotFoundハンドラー
      const startTime = process.hrtime.bigint();
      
      // When: ハンドラーを実行
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      // Then: 即座にレスポンスが返される（10ms以内）
      expect(durationMs).toBeLessThan(10);
      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    test('shouldWorkAsExpressFinalMiddleware', () => {
      // Given: Expressアプリケーションの最終ミドルウェアとして
      const middlewareChain = [
        jest.fn((req, res, next) => next()), // 他のミドルウェア
        jest.fn((req, res, next) => next()), // 他のミドルウェア
        notFoundHandler // 最終的にNotFoundハンドラー
      ];
      
      // When: ミドルウェアチェーンを実行
      let currentMiddleware = 0;
      const executeNext = () => {
        if (currentMiddleware < middlewareChain.length - 1) {
          currentMiddleware++;
          middlewareChain[currentMiddleware](mockRequest, mockResponse, executeNext);
        } else {
          middlewareChain[currentMiddleware](mockRequest, mockResponse, mockNext);
        }
      };
      
      middlewareChain[0](mockRequest, mockResponse, executeNext);
      
      // Then: 最終的に404が返される
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('shouldHandleDifferentRequestObjects', () => {
      // Given: 異なるリクエストオブジェクトの形式
      const requestVariations = [
        { method: 'GET', path: '/api/test', url: '/api/test?param=value' },
        { method: 'POST', path: '/api/create', body: { data: 'test' } },
        { method: 'PUT', path: '/api/update', headers: { 'content-type': 'application/json' } },
        { method: 'DELETE', path: '/api/delete', params: { id: '123' } }
      ];
      
      // When: 各種リクエストを処理
      requestVariations.forEach(req => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        
        notFoundHandler(req as Request, mockRes as Response, mockNext);
        
        // Then: 全て適切に404を返す
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.stringContaining(`${req.method} ${req.path} not found`)
          })
        );
      });
    });
  });
});