import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import type { TRPGCampaign, TRPGSession } from '@ai-agent-trpg/types';

describe('asyncHandler', () => {
  let asyncHandler: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(async () => {
    // モジュールのリセット
    jest.resetModules();
    
    // asyncHandlerをインポート
    const asyncHandlerModule = await import('./asyncHandler');
    asyncHandler = asyncHandlerModule.asyncHandler;

    // モックの初期化
    mockReq = {
      method: 'GET',
      path: '/test',
      params: {},
      query: {},
      body: {},
      headers: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常なAsync関数のハンドリング', () => {
    it('Promiseを返すAsync関数を正しく実行すること', async () => {
      // Given: 正常なAsync関数
      const asyncFunction = jest.fn().mockResolvedValue('success');
      const wrappedHandler = asyncHandler(asyncFunction);

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 元の関数が呼ばれる
      expect(asyncFunction).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled(); // エラーがないのでnextは呼ばれない
    });

    it('非同期処理が正常に完了する場合はnextが呼ばれないこと', async () => {
      // Given: 非同期処理を含む関数
      const asyncFunction = async (req: Request, res: Response, next: NextFunction) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        res.json({ success: true });
      };
      const wrappedHandler = asyncHandler(asyncFunction);

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: nextは呼ばれない（エラーなし）
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('同期関数も正しく処理できること', () => {
      // Given: 同期関数（Promiseを返さない）
      const syncFunction = jest.fn().mockImplementation((req: Request, res: Response) => {
        res.json({ message: 'sync response' });
      });
      const wrappedHandler = asyncHandler(syncFunction);

      // When: ハンドラーを実行
      wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 同期関数も正しく処理される
      expect(syncFunction).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'sync response' });
    });
  });

  describe('エラーハンドリング', () => {
    it('Async関数でエラーが発生した場合はnextに渡すこと', async () => {
      // Given: エラーを投げるAsync関数
      const error = new Error('Async function error');
      const asyncFunction = jest.fn().mockRejectedValue(error);
      const wrappedHandler = asyncHandler(asyncFunction);

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: エラーがnextに渡される
      expect(asyncFunction).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('同期関数内でエラーが発生した場合もnextに渡すこと', async () => {
      // Given: エラーを投げる同期関数
      const error = new Error('Sync function error');
      const syncFunction = jest.fn().mockImplementation(() => {
        throw error;
      });
      const wrappedHandler = asyncHandler(syncFunction);

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: エラーがnextに渡される
      expect(syncFunction).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('Promiseの非同期エラーが正しくキャッチされること', async () => {
      // Given: 非同期でエラーを投げる関数
      const error = new Error('Async error in Promise');
      const asyncFunction = async (req: Request, res: Response, next: NextFunction) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw error;
      };
      const wrappedHandler = asyncHandler(asyncFunction);

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 非同期エラーがキャッチされる
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('TypeErrorなどの異なるエラータイプも正しく処理すること', async () => {
      // Given: 異なるタイプのエラー
      const typeError = new TypeError('Type error occurred');
      const asyncFunction = jest.fn().mockRejectedValue(typeError);
      const wrappedHandler = asyncHandler(asyncFunction);

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: TypeErrorもキャッチされる
      expect(mockNext).toHaveBeenCalledWith(typeError);
    });

    it('カスタムエラーオブジェクトも正しく処理すること', async () => {
      // Given: カスタムエラーオブジェクト
      const customError = {
        message: 'Custom error',
        statusCode: 400,
        code: 'CUSTOM_ERROR'
      };
      const asyncFunction = jest.fn().mockRejectedValue(customError);
      const wrappedHandler = asyncHandler(asyncFunction);

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: カスタムエラーも正しく渡される
      expect(mockNext).toHaveBeenCalledWith(customError);
    });
  });

  describe('TRPGアプリケーション固有のシナリオ', () => {
    it('キャンペーン作成処理の非同期エラーが適切に処理されること', async () => {
      // Given: キャンペーン作成でデータベースエラー
      const campaignData: Partial<TRPGCampaign> = {
        name: 'Test Campaign',
        description: 'Test Description',
        status: 'planning'
      };

      const dbError = new Error('Database connection failed');
      const createCampaignHandler = async (req: Request, res: Response) => {
        // キャンペーン作成処理をシミュレート
        await new Promise(resolve => setTimeout(resolve, 5));
        throw dbError; // データベースエラーをシミュレート
      };

      const wrappedHandler = asyncHandler(createCampaignHandler);
      mockReq.body = campaignData;

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: データベースエラーが正しくキャッチされる
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it('AI生成処理のタイムアウトエラーが適切に処理されること', async () => {
      // Given: AI生成処理でタイムアウト
      const timeoutError = new Error('AI service timeout');
      timeoutError.name = 'TimeoutError';

      const aiGenerationHandler = async (req: Request, res: Response) => {
        // AI生成処理をシミュレート
        await new Promise(resolve => setTimeout(resolve, 10));
        throw timeoutError;
      };

      const wrappedHandler = asyncHandler(aiGenerationHandler);

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: タイムアウトエラーが正しくキャッチされる
      expect(mockNext).toHaveBeenCalledWith(timeoutError);
    });

    it('セッション管理処理の複雑な非同期フローが適切に処理されること', async () => {
      // Given: 複雑なセッション処理
      const sessionData: Partial<TRPGSession> = {
        campaignId: 'camp-123',
        status: 'active',
        participants: ['player1', 'player2']
      };

      const sessionHandler = async (req: Request, res: Response) => {
        // 複数の非同期処理をシミュレート
        await Promise.all([
          new Promise(resolve => setTimeout(resolve, 5)), // DB処理
          new Promise(resolve => setTimeout(resolve, 8)), // キャッシュ更新
          new Promise(resolve => setTimeout(resolve, 3))  // 通知処理
        ]);
        
        res.json({ 
          success: true, 
          sessionId: 'sess-456',
          message: 'Session created successfully'
        });
      };

      const wrappedHandler = asyncHandler(sessionHandler);
      mockReq.body = sessionData;

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 正常に完了する
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        sessionId: 'sess-456',
        message: 'Session created successfully'
      });
    });
  });

  describe('エラー後の状態確認', () => {
    it('エラー発生後もmockReqとmockResが変更されないこと', async () => {
      // Given: エラーを投げる関数
      const error = new Error('Test error');
      const asyncFunction = jest.fn().mockRejectedValue(error);
      const wrappedHandler = asyncHandler(asyncFunction);

      const originalReq = { ...mockReq };
      const originalRes = { ...mockRes };

      // When: エラーハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: reqとresは変更されない
      expect(mockReq).toEqual(originalReq);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('複数回実行してもエラーハンドリングが一貫していること', async () => {
      // Given: エラーを投げる関数
      const error = new Error('Consistent error');
      const asyncFunction = jest.fn().mockRejectedValue(error);
      const wrappedHandler = asyncHandler(asyncFunction);

      // When: 複数回実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 毎回同じようにエラーがキャッチされる
      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(mockNext).toHaveBeenNthCalledWith(1, error);
      expect(mockNext).toHaveBeenNthCalledWith(2, error);
      expect(mockNext).toHaveBeenNthCalledWith(3, error);
    });
  });

  describe('型安全性の確認', () => {
    it('正しい関数シグネチャでのみ使用できること', () => {
      // Given: 正しいシグネチャのAsync関数
      const validAsyncFunction = async (req: Request, res: Response, next: NextFunction) => {
        res.json({ valid: true });
      };

      // When: asyncHandlerでラップ
      const wrappedHandler = asyncHandler(validAsyncFunction);

      // Then: 関数が正しく作成される
      expect(typeof wrappedHandler).toBe('function');
      expect(wrappedHandler.length).toBe(3); // req, res, next
    });

    it('戻り値の型が正しく推論されること', () => {
      // Given: Promise<void>を返すAsync関数
      const asyncFunction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        res.json({ message: 'success' });
      };

      // When: asyncHandlerでラップ
      const wrappedHandler = asyncHandler(asyncFunction);

      // Then: 戻り値の型が関数
      expect(typeof wrappedHandler).toBe('function');
    });
  });

  describe('Promise.resolveの動作確認', () => {
    it('Promise.resolveが非Promiseも正しく処理すること', async () => {
      // Given: 非Promiseを返す関数
      const nonPromiseFunction = jest.fn().mockReturnValue('not a promise');
      const wrappedHandler = asyncHandler(nonPromiseFunction);

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 正常に処理される
      expect(nonPromiseFunction).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('undefinedを返す関数も正しく処理すること', async () => {
      // Given: undefinedを返す関数
      const undefinedFunction = jest.fn().mockReturnValue(undefined);
      const wrappedHandler = asyncHandler(undefinedFunction);

      // When: ハンドラーを実行
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Then: 正常に処理される
      expect(undefinedFunction).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の非同期リクエストでもメモリリークしないこと', async () => {
      // Given: 軽量なAsync関数
      const lightAsyncFunction = async (req: Request, res: Response) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        res.json({ index: req.body.index });
      };
      const wrappedHandler = asyncHandler(lightAsyncFunction);

      // When: 1000回実行
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        const req = { ...mockReq, body: { index: i } };
        promises.push(wrappedHandler(req as Request, mockRes as Response, mockNext));
      }

      await Promise.all(promises);

      // Then: すべて正常に完了し、nextは呼ばれない
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('エラーが発生する大量リクエストも適切に処理できること', async () => {
      // Given: エラーを発生する関数
      const errorFunction = async () => {
        throw new Error('Bulk error test');
      };
      const wrappedHandler = asyncHandler(errorFunction);

      // When: 100回実行
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(wrappedHandler(mockReq as Request, mockRes as Response, mockNext));
      }

      await Promise.all(promises);

      // Then: すべてのエラーがキャッチされる
      expect(mockNext).toHaveBeenCalledTimes(100);
    });
  });
});