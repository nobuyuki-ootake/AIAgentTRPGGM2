import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import type { APIResponse } from '@ai-agent-trpg/types';

describe('notFoundHandler', () => {
  let notFoundHandler: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(async () => {
    // モジュールのリセット
    jest.resetModules();
    
    // notFoundHandlerをインポート
    const notFoundModule = await import('./notFoundHandler');
    notFoundHandler = notFoundModule.notFoundHandler;

    // モックの初期化
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基本的な404エラーハンドリング', () => {
    it('GETリクエストに対して適切な404レスポンスを返すこと', () => {
      // Given: GET リクエスト
      mockReq = {
        method: 'GET',
        path: '/api/nonexistent'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 404ステータスとエラーレスポンス
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET /api/nonexistent not found',
        timestamp: expect.any(String)
      });
    });

    it('POSTリクエストに対して適切な404レスポンスを返すこと', () => {
      // Given: POST リクエスト
      mockReq = {
        method: 'POST',
        path: '/api/invalid-endpoint'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 404ステータスとエラーレスポンス
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint POST /api/invalid-endpoint not found',
        timestamp: expect.any(String)
      });
    });

    it('PUTリクエストに対して適切な404レスポンスを返すこと', () => {
      // Given: PUT リクエスト
      mockReq = {
        method: 'PUT',
        path: '/api/campaigns/invalid-id'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 404ステータスとエラーレスポンス
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint PUT /api/campaigns/invalid-id not found',
        timestamp: expect.any(String)
      });
    });

    it('DELETEリクエストに対して適切な404レスポンスを返すこと', () => {
      // Given: DELETE リクエスト
      mockReq = {
        method: 'DELETE',
        path: '/api/sessions/unknown'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 404ステータスとエラーレスポンス
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint DELETE /api/sessions/unknown not found',
        timestamp: expect.any(String)
      });
    });
  });

  describe('レスポンス形式の検証', () => {
    it('APIResponseの型に準拠したレスポンスを返すこと', () => {
      // Given: 任意のリクエスト
      mockReq = {
        method: 'GET',
        path: '/test'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: APIResponse型に準拠
      const expectedResponse: APIResponse<null> = {
        success: false,
        error: 'Endpoint GET /test not found',
        timestamp: expect.any(String)
      };

      expect(mockRes.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('タイムスタンプが正しいISO形式であること', () => {
      // Given: リクエスト
      mockReq = {
        method: 'GET',
        path: '/api/test'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: タイムスタンプがISO形式
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      const timestamp = callArgs.timestamp;
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('successフィールドが常にfalseであること', () => {
      // Given: 複数の異なるリクエスト
      const requests = [
        { method: 'GET', path: '/api/test1' },
        { method: 'POST', path: '/api/test2' },
        { method: 'PATCH', path: '/api/test3' }
      ];

      requests.forEach(req => {
        // When: notFoundHandlerを実行
        notFoundHandler(req as Request, mockRes as Response, mockNext);

        // Then: successは常にfalse
        const callArgs = (mockRes.json as jest.Mock).mock.calls.pop()[0];
        expect(callArgs.success).toBe(false);
      });
    });
  });

  describe('特殊なパスケース', () => {
    it('ルートパスに対して適切なエラーメッセージを返すこと', () => {
      // Given: ルートパス
      mockReq = {
        method: 'GET',
        path: '/'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: ルートパスのエラーメッセージ
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET / not found',
        timestamp: expect.any(String)
      });
    });

    it('クエリパラメータを含むパスでも正しく処理すること', () => {
      // Given: クエリパラメータ付きパス
      mockReq = {
        method: 'GET',
        path: '/api/search'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: パスのみがエラーメッセージに含まれる
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET /api/search not found',
        timestamp: expect.any(String)
      });
    });

    it('ネストした深いパスでも正しく処理すること', () => {
      // Given: 深いネストパス
      mockReq = {
        method: 'PUT',
        path: '/api/v1/campaigns/camp-123/sessions/sess-456/actions/act-789'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 完全なパスがエラーメッセージに含まれる
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint PUT /api/v1/campaigns/camp-123/sessions/sess-456/actions/act-789 not found',
        timestamp: expect.any(String)
      });
    });

    it('特殊文字を含むパスでも正しく処理すること', () => {
      // Given: 特殊文字を含むパス
      mockReq = {
        method: 'GET',
        path: '/api/campaigns/test%20campaign/characters'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 特殊文字もそのまま表示
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET /api/campaigns/test%20campaign/characters not found',
        timestamp: expect.any(String)
      });
    });
  });

  describe('HTTPメソッドの処理', () => {
    it('標準的でないHTTPメソッドも正しく処理すること', () => {
      // Given: 標準的でないHTTPメソッド
      const uncommonMethods = ['PATCH', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT'];

      uncommonMethods.forEach(method => {
        mockReq = {
          method,
          path: '/api/test'
        };

        // When: notFoundHandlerを実行
        notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

        // Then: メソッドが正しくエラーメッセージに含まれる
        const callArgs = (mockRes.json as jest.Mock).mock.calls.pop()[0];
        expect(callArgs.error).toBe(`Endpoint ${method} /api/test not found`);
      });
    });

    it('大文字小文字が混在するメソッドも正しく処理すること', () => {
      // Given: 大文字小文字混在のメソッド
      mockReq = {
        method: 'GeT',
        path: '/api/test'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: そのままエラーメッセージに含まれる
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GeT /api/test not found',
        timestamp: expect.any(String)
      });
    });
  });

  describe('TRPGアプリケーション固有のエンドポイント', () => {
    it('TRPGキャンペーンエンドポイントの404エラーを適切に処理すること', () => {
      // Given: 存在しないキャンペーンエンドポイント
      mockReq = {
        method: 'GET',
        path: '/api/campaigns/invalid-campaign-id'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 適切なエラーメッセージ
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint GET /api/campaigns/invalid-campaign-id not found',
        timestamp: expect.any(String)
      });
    });

    it('TRPGセッションエンドポイントの404エラーを適切に処理すること', () => {
      // Given: 存在しないセッションエンドポイント
      mockReq = {
        method: 'POST',
        path: '/api/sessions/sess-999/actions/invalid-action'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 適切なエラーメッセージ
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint POST /api/sessions/sess-999/actions/invalid-action not found',
        timestamp: expect.any(String)
      });
    });

    it('AI関連エンドポイントの404エラーを適切に処理すること', () => {
      // Given: 存在しないAIエンドポイント
      mockReq = {
        method: 'PUT',
        path: '/api/ai-character-generation/invalid-generator'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 適切なエラーメッセージ
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint PUT /api/ai-character-generation/invalid-generator not found',
        timestamp: expect.any(String)
      });
    });

    it('キャラクター管理エンドポイントの404エラーを適切に処理すること', () => {
      // Given: 存在しないキャラクターエンドポイント
      mockReq = {
        method: 'DELETE',
        path: '/api/characters/char-999/equipment/unknown-item'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 適切なエラーメッセージ
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Endpoint DELETE /api/characters/char-999/equipment/unknown-item not found',
        timestamp: expect.any(String)
      });
    });
  });

  describe('nextパラメータの処理', () => {
    it('nextパラメータが呼ばれないこと', () => {
      // Given: 任意のリクエスト
      mockReq = {
        method: 'GET',
        path: '/api/test'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: nextは呼ばれない（エラーハンドラーが最終処理）
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('レスポンス送信後はチェインが終了すること', () => {
      // Given: リクエスト
      mockReq = {
        method: 'GET',
        path: '/api/test'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: レスポンスが送信され、nextは呼ばれない
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('一貫性テスト', () => {
    it('同じリクエストに対して常に同じ形式のレスポンスを返すこと', () => {
      // Given: 同じリクエスト
      mockReq = {
        method: 'GET',
        path: '/api/consistent-test'
      };

      // When: 複数回実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);
      const firstCall = (mockRes.json as jest.Mock).mock.calls[0][0];

      // 新しいmockResで再実行
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);
      const secondCall = (mockRes.json as jest.Mock).mock.calls[0][0];

      // Then: 同じ形式（タイムスタンプ以外）
      expect(firstCall.success).toBe(secondCall.success);
      expect(firstCall.error).toBe(secondCall.error);
      expect(typeof firstCall.timestamp).toBe(typeof secondCall.timestamp);
    });

    it('異なるリクエストでも常に同じレスポンス構造を維持すること', () => {
      // Given: 異なる複数のリクエスト
      const requests = [
        { method: 'GET', path: '/api/test1' },
        { method: 'POST', path: '/api/test2' },
        { method: 'PUT', path: '/api/campaigns/123' },
        { method: 'DELETE', path: '/api/sessions/456' }
      ];

      requests.forEach(req => {
        // When: notFoundHandlerを実行
        notFoundHandler(req as Request, mockRes as Response, mockNext);

        // Then: 常に同じ構造
        const callArgs = (mockRes.json as jest.Mock).mock.calls.pop()[0];
        expect(callArgs).toHaveProperty('success');
        expect(callArgs).toHaveProperty('error');
        expect(callArgs).toHaveProperty('timestamp');
        expect(Object.keys(callArgs)).toHaveLength(3);
      });
    });
  });

  describe('型安全性確認', () => {
    it('APIResponse<null>型に完全に準拠していること', () => {
      // Given: リクエスト
      mockReq = {
        method: 'GET',
        path: '/api/type-test'
      };

      // When: notFoundHandlerを実行
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 型に準拠したレスポンス
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      
      // APIResponse<null>の必須フィールドを確認
      expect(typeof callArgs.success).toBe('boolean');
      expect(typeof callArgs.error).toBe('string');
      expect(typeof callArgs.timestamp).toBe('string');
      
      // dataフィールドは存在しない（null型なので）
      expect(callArgs).not.toHaveProperty('data');
    });
  });
});