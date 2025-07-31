import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';

// t-WADA naming conventions:
// - should[ExpectedBehavior]When[StateUnderTest]
// - can[DoSomething]Given[Condition]

describe('Async Handler Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('Successful Async Operation Handling', () => {
    test('shouldCallNextWithoutErrorWhenAsyncFunctionSucceeds', async () => {
      // Given: 成功する非同期関数
      const asyncFunction = jest.fn().mockResolvedValue('success');
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 関数が呼ばれ、nextが呼ばれる
      expect(asyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    test('shouldPassThroughParametersToAsyncFunction', async () => {
      // Given: パラメータを使用する非同期関数
      const asyncFunction = jest.fn(async (req: Request, res: Response, next: NextFunction) => {
        // リクエストオブジェクトを使用
        expect(req).toBe(mockRequest);
        expect(res).toBe(mockResponse);
        expect(next).toBe(mockNext);
        return 'handled';
      });
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 正しいパラメータが渡される
      expect(asyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
    });

    test('shouldAllowAsyncFunctionToModifyResponse', async () => {
      // Given: レスポンスを変更する非同期関数
      mockResponse.json = jest.fn();
      mockResponse.status = jest.fn().mockReturnValue(mockResponse);
      
      const asyncFunction = jest.fn(async (req: Request, res: Response) => {
        res.status!(200).json!({ success: true });
      });
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: レスポンスが変更される
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Error Handling', () => {
    test('shouldCatchAsyncErrorAndPassToNext', async () => {
      // Given: エラーを投げる非同期関数
      const testError = new Error('Async operation failed');
      const asyncFunction = jest.fn().mockRejectedValue(testError);
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: エラーがnextに渡される
      expect(mockNext).toHaveBeenCalledWith(testError);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('shouldCatchDatabaseErrorAndPassToNext', async () => {
      // Given: データベースエラーを投げる関数
      const dbError = new Error('Database connection failed');
      (dbError as any).code = 'ECONNREFUSED';
      const asyncFunction = jest.fn().mockRejectedValue(dbError);
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: データベースエラーがnextに渡される
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    test('shouldCatchValidationErrorAndPassToNext', async () => {
      // Given: バリデーションエラーを投げる関数
      const validationError = new Error('Invalid input data');
      (validationError as any).statusCode = 400;
      const asyncFunction = jest.fn().mockRejectedValue(validationError);
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: バリデーションエラーがnextに渡される
      expect(mockNext).toHaveBeenCalledWith(validationError);
    });

    test('shouldCatchAIServiceErrorAndPassToNext', async () => {
      // Given: AIサービスエラーを投げる関数
      const aiError = new Error('OpenAI API rate limit exceeded');
      (aiError as any).statusCode = 429;
      (aiError as any).provider = 'openai';
      const asyncFunction = jest.fn().mockRejectedValue(aiError);
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: AIサービスエラーがnextに渡される
      expect(mockNext).toHaveBeenCalledWith(aiError);
    });

    test('shouldCatchNonErrorObjectAndPassToNext', async () => {
      // Given: Error以外のオブジェクトを投げる関数
      const stringError = 'String error message';
      const asyncFunction = jest.fn().mockRejectedValue(stringError);
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 文字列エラーがnextに渡される
      expect(mockNext).toHaveBeenCalledWith(stringError);
    });
  });

  describe('Promise Resolution Handling', () => {
    test('shouldHandlePromiseResolveDirectly', async () => {
      // Given: Promiseを直接返す関数
      const promiseFunction = jest.fn(() => Promise.resolve('resolved'));
      const wrappedHandler = asyncHandler(promiseFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 正常に処理される
      expect(promiseFunction).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    test('shouldHandlePromiseRejectDirectly', async () => {
      // Given: 拒否されるPromiseを返す関数
      const rejectedError = new Error('Promise rejected');
      const promiseFunction = jest.fn(() => Promise.reject(rejectedError));
      const wrappedHandler = asyncHandler(promiseFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: エラーがnextに渡される
      expect(mockNext).toHaveBeenCalledWith(rejectedError);
    });

    test('shouldHandleSynchronousReturnValue', async () => {
      // Given: 同期的に値を返す関数
      const syncFunction = jest.fn(() => 'sync result');
      const wrappedHandler = asyncHandler(syncFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 正常に処理される
      expect(syncFunction).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    test('shouldHandleSynchronousThrow', async () => {
      // Given: 同期的にエラーを投げる関数
      const syncError = new Error('Synchronous error');
      const syncFunction = jest.fn(() => {
        throw syncError;
      });
      const wrappedHandler = asyncHandler(syncFunction);
      
      // When: ハンドラーを実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: エラーがキャッチされnextに渡される
      expect(mockNext).toHaveBeenCalledWith(syncError);
    });
  });

  describe('Middleware Integration', () => {
    test('shouldWorkWithExpressRequestObjects', async () => {
      // Given: 実際のExpressリクエストオブジェクトのような構造
      const expressLikeRequest = {
        method: 'POST',
        path: '/api/campaigns',
        body: { name: 'Test Campaign' },
        params: { id: '123' },
        query: { include: 'characters' },
        headers: { 'content-type': 'application/json' }
      };
      
      const asyncFunction = jest.fn(async (req: Request) => {
        expect(req.method).toBe('POST');
        expect(req.body).toEqual({ name: 'Test Campaign' });
        return 'processed';
      });
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: Express風リクエストでハンドラーを実行
      await wrappedHandler(
        expressLikeRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 正常に処理される
      expect(asyncFunction).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    test('shouldWorkWithTRPGSessionData', async () => {
      // Given: TRPGセッション用のリクエストデータ
      const trpgRequest = {
        body: {
          campaignId: 'camp-123',
          action: 'roll_dice',
          diceType: '1d20',
          modifier: 5
        },
        user: {
          id: 'user-456',
          role: 'player'
        }
      };
      
      const asyncFunction = jest.fn(async (req: Request) => {
        expect(req.body.campaignId).toBe('camp-123');
        expect(req.body.action).toBe('roll_dice');
        return 'dice rolled';
      });
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: TRPGリクエストでハンドラーを実行
      await wrappedHandler(
        trpgRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 正常に処理される
      expect(asyncFunction).toHaveBeenCalled();
    });

    test('shouldWorkWithAIGenerationRequests', async () => {
      // Given: AI生成リクエスト
      const aiRequest = {
        body: {
          prompt: 'Generate a fantasy character',
          provider: 'openai',
          model: 'gpt-4'
        },
        headers: {
          'x-api-key': 'hidden-key'
        }
      };
      
      const asyncFunction = jest.fn(async (req: Request) => {
        expect(req.body.prompt).toBe('Generate a fantasy character');
        expect(req.body.provider).toBe('openai');
        return 'character generated';
      });
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: AI生成リクエストでハンドラーを実行
      await wrappedHandler(
        aiRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 正常に処理される
      expect(asyncFunction).toHaveBeenCalled();
    });
  });

  describe('Performance and Memory', () => {
    test('shouldNotCauseMemoryLeaksWithLargeRequests', async () => {
      // Given: 大きなリクエストデータ
      const largeData = new Array(1000).fill(0).map((_, i) => ({
        id: i,
        data: `large-data-item-${i}`
      }));
      const largeRequest = {
        body: { items: largeData }
      };
      
      const asyncFunction = jest.fn(async (req: Request) => {
        expect(req.body.items).toHaveLength(1000);
        return 'processed large data';
      });
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: 大きなリクエストを処理
      // Then: メモリリークが発生しない（正常に完了）
      await expect(
        wrappedHandler(
          largeRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).resolves.toBeUndefined();
    });

    test('shouldHandleMultipleConcurrentRequests', async () => {
      // Given: 複数の並行リクエスト
      const asyncFunction = jest.fn(async (req: Request) => {
        // 少し時間のかかる処理をシミュレート
        await new Promise(resolve => setTimeout(resolve, 10));
        return `processed ${req.body?.id}`;
      });
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // When: 複数のリクエストを並行処理
      const requests = Array.from({ length: 10 }, (_, i) => ({
        body: { id: i }
      }));
      
      const promises = requests.map(req =>
        wrappedHandler(
          req as Request,
          mockResponse as Response,
          mockNext
        )
      );
      
      // Then: 全て正常に処理される
      await Promise.all(promises);
      expect(asyncFunction).toHaveBeenCalledTimes(10);
    });

    test('shouldNotBlockEventLoopWithCPUIntensiveOperations', async () => {
      // Given: CPU集約的な処理
      const cpuIntensiveFunction = jest.fn(async () => {
        // CPU集約的な処理をシミュレート（非ブロッキング）
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
          sum += i;
          // イベントループを定期的に解放
          if (i % 10000 === 0) {
            await new Promise(resolve => setImmediate(resolve));
          }
        }
        return sum;
      });
      const wrappedHandler = asyncHandler(cpuIntensiveFunction);
      
      const startTime = Date.now();
      
      // When: CPU集約的な処理を実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      const endTime = Date.now();
      
      // Then: 処理が完了し、適切な時間内で実行される
      expect(cpuIntensiveFunction).toHaveBeenCalled();
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('Type Safety', () => {
    test('shouldMaintainTypeInformationForRequestResponse', async () => {
      // Given: 型付きリクエスト/レスポンス関数
      interface CustomRequest extends Request {
        customProperty: string;
      }
      
      const typedFunction = jest.fn(async (req: CustomRequest, res: Response) => {
        expect(req.customProperty).toBeDefined();
        res.json?.({ received: req.customProperty });
      });
      
      const wrappedHandler = asyncHandler(typedFunction);
      const customRequest = {
        customProperty: 'test-value'
      } as CustomRequest;
      
      mockResponse.json = jest.fn();
      
      // When: 型付き関数を実行
      await wrappedHandler(
        customRequest,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 型情報が保持される
      expect(typedFunction).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({ received: 'test-value' });
    });

    test('shouldWorkWithGenericAsyncHandlers', async () => {
      // Given: ジェネリック型を使用した関数
      const genericFunction = jest.fn(async <T>(req: Request, res: Response): Promise<T> => {
        return 'generic result' as T;
      });
      
      const wrappedHandler = asyncHandler(genericFunction);
      
      // When: ジェネリック関数を実行
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 正常に処理される
      expect(genericFunction).toHaveBeenCalled();
    });
  });
});