
import { Request, Response, NextFunction } from 'express';
import {
  performanceMiddleware,
  PerformanceRequest,
  wrapDatabaseQuery,
  monitorPerformance,
  monitorMemoryUsage
} from '../../middleware/performanceMiddleware';
import { performanceMonitoringService } from '../../services/performanceMonitoringService';

// t-WADA naming conventions:
// - should[ExpectedBehavior]When[StateUnderTest]
// - can[DoSomething]Given[Condition]

// Mock dependencies
jest.mock('../../services/performanceMonitoringService', () => ({
  performanceMonitoringService: {
    incrementActiveConnections: jest.fn(),
    decrementActiveConnections: jest.fn(),
    recordRequest: jest.fn(),
    recordQuery: jest.fn()
  }
}));

describe('Performance Middleware', () => {
  let mockRequest: Partial<PerformanceRequest>;
  let mockResponse: any;
  let mockNext: jest.MockedFunction<NextFunction>;
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/test',
      ip: '192.168.1.1',
      user: undefined
    };
    
    mockResponse = {
      statusCode: 200,
      set: jest.fn(),
      on: jest.fn()
    };
    
    mockNext = jest.fn();
    
    // Mock Date.now for consistent timing
    originalDateNow = Date.now;
    let currentTime = 1000000000000; // Fixed timestamp
    Date.now = jest.fn(() => currentTime++);
    
    // Mock process.memoryUsage
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 100 * 1024 * 1024,
      heapTotal: 80 * 1024 * 1024,
      heapUsed: 50 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024
    });
  });

  afterEach(() => {
    Date.now = originalDateNow;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Performance Middleware Function', () => {
    test('shouldRecordStartTimeAndMemoryUsageOnRequest', () => {
      // Given: パフォーマンスミドルウェア
      const expectedStartTime = Date.now();
      const expectedMemory = process.memoryUsage().heapUsed;
      
      // When: ミドルウェアを実行
      performanceMiddleware(
        mockRequest as PerformanceRequest,
        mockResponse as Response,
        mockNext
      );
      
      // Then: 開始時間とメモリ使用量が記録される
      expect(mockRequest.startTime).toBe(expectedStartTime);
      expect(mockRequest.memoryUsage).toBe(expectedMemory);
      expect(mockNext).toHaveBeenCalled();
    });

    test('shouldIncrementActiveConnectionsOnRequestStart', () => {
      // Given: パフォーマンスミドルウェア
      
      // When: ミドルウェアを実行
      performanceMiddleware(
        mockRequest as PerformanceRequest,
        mockResponse as Response,
        mockNext
      );
      
      // Then: アクティブ接続数が増加する
      expect(performanceMonitoringService.incrementActiveConnections).toHaveBeenCalled();
    });

    test('shouldRecordRequestMetricsOnResponseFinish', () => {
      // Given: レスポンス完了時のコールバック
      let finishCallback: Function;
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });
      
      mockRequest.user = { id: 'user-123' };
      mockResponse.statusCode = 200;
      
      // When: ミドルウェアを実行し、レスポンスを完了
      performanceMiddleware(
        mockRequest as PerformanceRequest,
        mockResponse as Response,
        mockNext
      );
      
      // シミュレート: レスポンス完了
      finishCallback!();
      
      // Then: リクエストメトリクスが記録される
      expect(performanceMonitoringService.recordRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          duration: expect.any(Number),
          timestamp: expect.any(String),
          userId: 'user-123',
          memoryUsage: expect.any(Number)
        })
      );
    });

    test('shouldDecrementActiveConnectionsOnResponseFinish', () => {
      // Given: レスポンス完了時のコールバック
      let finishCallback: Function;
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });
      
      // When: ミドルウェアを実行し、レスポンスを完了
      performanceMiddleware(
        mockRequest as PerformanceRequest,
        mockResponse as Response,
        mockNext
      );
      
      finishCallback!();
      
      // Then: アクティブ接続数が減少する
      expect(performanceMonitoringService.decrementActiveConnections).toHaveBeenCalled();
    });

    test('shouldSetResponseTimeHeaderOnResponseFinish', () => {
      // Given: レスポンス時間ヘッダー設定用のコールバック
      let finishCallbacks: Function[] = [];
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          finishCallbacks.push(callback);
        }
      });
      
      // When: ミドルウェアを実行し、レスポンスを完了
      performanceMiddleware(
        mockRequest as PerformanceRequest,
        mockResponse as Response,
        mockNext
      );
      
      // 全てのfinishコールバックを実行
      finishCallbacks.forEach(callback => callback());
      
      // Then: レスポンス時間ヘッダーが設定される
      expect(mockResponse.set).toHaveBeenCalledWith('X-Response-Time', expect.stringMatching(/^\d+ms$/));
    });

    test('shouldCalculateMemoryDifferenceCorrectly', () => {
      // Given: メモリ使用量の変化をシミュレート
      let currentMemory = 50 * 1024 * 1024; // 50MB
      jest.spyOn(process, 'memoryUsage').mockImplementation(() => ({
        rss: 100 * 1024 * 1024,
        heapTotal: 80 * 1024 * 1024,
        heapUsed: currentMemory,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }));
      
      let finishCallback: Function;
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });
      
      // When: ミドルウェアを実行
      performanceMiddleware(
        mockRequest as PerformanceRequest,
        mockResponse as Response,
        mockNext
      );
      
      // メモリ使用量を増加させる
      currentMemory = 60 * 1024 * 1024; // 60MB
      finishCallback!();
      
      // Then: メモリ差分が正しく計算される
      expect(performanceMonitoringService.recordRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          memoryUsage: 10 * 1024 * 1024 // 10MB増加
        })
      );
    });

    test('shouldHandleUserlessRequestsGracefully', () => {
      // Given: ユーザー情報のないリクエスト
      delete mockRequest.user;
      
      let finishCallback: Function;
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });
      
      // When: ミドルウェアを実行
      performanceMiddleware(
        mockRequest as PerformanceRequest,
        mockResponse as Response,
        mockNext
      );
      
      finishCallback!();
      
      // Then: ユーザーIDなしで記録される
      expect(performanceMonitoringService.recordRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined
        })
      );
    });
  });

  describe('Database Query Wrapper', () => {
    test('shouldWrapSuccessfulQueryAndRecordMetrics', async () => {
      // Given: 成功するデータベースクエリ
      const queryResult = { id: 1, name: 'Test Campaign' };
      const queryFunction = jest.fn().mockResolvedValue(queryResult);
      const query = 'SELECT * FROM campaigns WHERE id = ?';
      const component = 'campaigns';
      
      // When: クエリラッパーを実行
      const result = await wrapDatabaseQuery(queryFunction, query, component);
      
      // Then: クエリが実行され、メトリクスが記録される
      expect(queryFunction).toHaveBeenCalled();
      expect(result).toBe(queryResult);
      expect(performanceMonitoringService.recordQuery).toHaveBeenCalledWith({
        query,
        duration: expect.any(Number),
        timestamp: expect.any(String),
        component
      });
    });

    test('shouldWrapFailedQueryAndRecordMetrics', async () => {
      // Given: 失敗するデータベースクエリ
      const queryError = new Error('Database connection failed');
      const queryFunction = jest.fn().mockRejectedValue(queryError);
      const query = 'SELECT * FROM characters';
      const component = 'characters';
      
      // When & Then: クエリラッパーを実行し、エラーが伝播される
      await expect(wrapDatabaseQuery(queryFunction, query, component))
        .rejects.toThrow('Database connection failed');
      
      // Then: エラー時でもメトリクスが記録される
      expect(performanceMonitoringService.recordQuery).toHaveBeenCalledWith({
        query,
        duration: expect.any(Number),
        timestamp: expect.any(String),
        component
      });
    });

    test('shouldMeasureQueryDurationAccurately', async () => {
      // Given: 時間のかかるクエリをシミュレート
      const queryFunction = jest.fn().mockImplementation(async () => {
        // Date.nowがモックされているので、実際の遅延は発生しない
        return { result: 'success' };
      });
      
      // When: クエリラッパーを実行
      await wrapDatabaseQuery(queryFunction, 'SELECT NOW()', 'test');
      
      // Then: 持続時間が測定される
      expect(performanceMonitoringService.recordQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number)
        })
      );
    });

    test('shouldRecordComplexQueryMetrics', async () => {
      // Given: 複雑なクエリ
      const complexQuery = `
        SELECT c.*, ch.name as character_name, s.status 
        FROM campaigns c 
        LEFT JOIN characters ch ON c.id = ch.campaign_id 
        LEFT JOIN sessions s ON c.id = s.campaign_id 
        WHERE c.user_id = ? AND c.active = true
      `;
      const queryFunction = jest.fn().mockResolvedValue([]);
      
      // When: 複雑なクエリを実行
      await wrapDatabaseQuery(queryFunction, complexQuery, 'campaign-management');
      
      // Then: クエリの詳細が記録される
      expect(performanceMonitoringService.recordQuery).toHaveBeenCalledWith({
        query: complexQuery,
        duration: expect.any(Number),
        timestamp: expect.any(String),
        component: 'campaign-management'
      });
    });
  });

  describe('Performance Monitor Decorator', () => {
    test('shouldMonitorSuccessfulMethodExecution', async () => {
      // Given: パフォーマンス監視デコレーターを使用したクラス
      class TestService {
        @monitorPerformance('test-service')
        async getData(id: string): Promise<string> {
          return `data-${id}`;
        }
      }
      
      const service = new TestService();
      
      // When: メソッドを実行
      const result = await service.getData('123');
      
      // Then: メソッドが成功し、パフォーマンスが記録される
      expect(result).toBe('data-123');
      expect(performanceMonitoringService.recordQuery).toHaveBeenCalledWith({
        query: 'test-service.getData',
        duration: expect.any(Number),
        timestamp: expect.any(String),
        component: 'test-service'
      });
    });

    test('shouldMonitorFailedMethodExecution', async () => {
      // Given: エラーを投げるメソッド
      class TestService {
        @monitorPerformance('test-service')
        async failingMethod(): Promise<void> {
          throw new Error('Method failed');
        }
      }
      
      const service = new TestService();
      
      // When & Then: メソッドを実行し、エラーが伝播される
      await expect(service.failingMethod()).rejects.toThrow('Method failed');
      
      // Then: エラー時でもパフォーマンスが記録される
      expect(performanceMonitoringService.recordQuery).toHaveBeenCalledWith({
        query: 'test-service.failingMethod',
        duration: expect.any(Number),
        timestamp: expect.any(String),
        component: 'test-service'
      });
    });

    test('shouldMonitorMethodWithParameters', async () => {
      // Given: パラメータを持つメソッド
      class CampaignService {
        @monitorPerformance('campaign-service')
        async createCampaign(name: string, userId: string): Promise<{ id: string, name: string }> {
          return { id: 'camp-123', name };
        }
      }
      
      const service = new CampaignService();
      
      // When: パラメータ付きメソッドを実行
      const result = await service.createCampaign('Epic Adventure', 'user-456');
      
      // Then: 正しい結果とパフォーマンス記録
      expect(result).toEqual({ id: 'camp-123', name: 'Epic Adventure' });
      expect(performanceMonitoringService.recordQuery).toHaveBeenCalledWith({
        query: 'campaign-service.createCampaign',
        duration: expect.any(Number),
        timestamp: expect.any(String),
        component: 'campaign-service'
      });
    });

    test('shouldPreserveMethodContextAndThis', async () => {
      // Given: コンテキストを使用するメソッド
      class StatefulService {
        private state = 'initial';
        
        @monitorPerformance('stateful-service')
        async updateState(newState: string): Promise<string> {
          this.state = newState;
          return this.state;
        }
        
        getState(): string {
          return this.state;
        }
      }
      
      const service = new StatefulService();
      
      // When: 状態を更新するメソッドを実行
      const result = await service.updateState('updated');
      
      // Then: thisコンテキストが保持される
      expect(result).toBe('updated');
      expect(service.getState()).toBe('updated');
    });
  });

  describe('Memory Usage Monitoring', () => {
    test('shouldSetupMemoryMonitoringWithDefaultThreshold', () => {
      // Given: デフォルトの閾値
      const originalSetInterval = global.setInterval;
      const mockSetInterval = jest.fn();
      global.setInterval = mockSetInterval;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // When: メモリ監視を開始
      monitorMemoryUsage();
      
      // Then: インターバルが設定される
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
      
      // Cleanup
      global.setInterval = originalSetInterval;
      consoleSpy.mockRestore();
    });

    test('shouldSetupMemoryMonitoringWithCustomThreshold', () => {
      // Given: カスタム閾値
      const customThreshold = 200 * 1024 * 1024; // 200MB
      const originalSetInterval = global.setInterval;
      const mockSetInterval = jest.fn();
      global.setInterval = mockSetInterval;
      
      // When: カスタム閾値でメモリ監視を開始
      monitorMemoryUsage(customThreshold);
      
      // Then: インターバルが設定される
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
      
      // Cleanup
      global.setInterval = originalSetInterval;
    });

    test('shouldWarnWhenMemoryUsageExceedsThreshold', () => {
      // Given: 高いメモリ使用量
      const highMemoryUsage = 150 * 1024 * 1024; // 150MB
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 200 * 1024 * 1024,
        heapTotal: 180 * 1024 * 1024,
        heapUsed: highMemoryUsage,
        external: 20 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const threshold = 100 * 1024 * 1024; // 100MB
      
      // When: メモリ監視チェックを実行
      const originalSetInterval = global.setInterval;
      let monitoringCallback: Function;
      global.setInterval = jest.fn((callback) => {
        monitoringCallback = callback;
        return {} as any;
      });
      
      monitorMemoryUsage(threshold);
      monitoringCallback!();
      
      // Then: 警告が出力される
      expect(consoleSpy).toHaveBeenCalledWith(
        'High memory usage detected',
        {
          heapUsed: highMemoryUsage,
          threshold,
          component: 'memory-monitor'
        }
      );
      
      // Cleanup
      global.setInterval = originalSetInterval;
      consoleSpy.mockRestore();
    });

    test('shouldNotWarnWhenMemoryUsageIsBelowThreshold', () => {
      // Given: 低いメモリ使用量
      const lowMemoryUsage = 50 * 1024 * 1024; // 50MB
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 80 * 1024 * 1024,
        heapUsed: lowMemoryUsage,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const threshold = 100 * 1024 * 1024; // 100MB
      
      // When: メモリ監視チェックを実行
      const originalSetInterval = global.setInterval;
      let monitoringCallback: Function;
      global.setInterval = jest.fn((callback) => {
        monitoringCallback = callback;
        return {} as any;
      });
      
      monitorMemoryUsage(threshold);
      monitoringCallback!();
      
      // Then: 警告は出力されない
      expect(consoleSpy).not.toHaveBeenCalled();
      
      // Cleanup
      global.setInterval = originalSetInterval;
      consoleSpy.mockRestore();
    });
  });

  describe('TRPG Specific Performance Scenarios', () => {
    test('shouldMonitorTRPGSessionRequests', () => {
      // Given: TRPGセッションリクエスト
      mockRequest.path = '/api/sessions/123/dice-roll';
      mockRequest.method = 'POST';
      mockRequest.user = { id: 'player-456' };
      
      let finishCallback: Function;
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });
      
      // When: パフォーマンス監視を実行
      performanceMiddleware(
        mockRequest as PerformanceRequest,
        mockResponse as Response,
        mockNext
      );
      
      finishCallback!();
      
      // Then: TRPGセッション用のメトリクスが記録される
      expect(performanceMonitoringService.recordRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/api/sessions/123/dice-roll',
          userId: 'player-456'
        })
      );
    });

    test('shouldMonitorAICharacterGenerationPerformance', async () => {
      // Given: AIキャラクター生成クエリ
      const aiGenerationQuery = `
        INSERT INTO characters (name, race, class, stats, background) 
        VALUES (?, ?, ?, ?, ?)
      `;
      const queryFunction = jest.fn().mockResolvedValue({ insertId: 123 });
      
      // When: AI生成クエリを実行
      await wrapDatabaseQuery(queryFunction, aiGenerationQuery, 'ai-character-generation');
      
      // Then: AI生成専用のメトリクスが記録される
      expect(performanceMonitoringService.recordQuery).toHaveBeenCalledWith({
        query: aiGenerationQuery,
        duration: expect.any(Number),
        timestamp: expect.any(String),
        component: 'ai-character-generation'
      });
    });

    test('shouldMonitorCampaignManagementOperations', () => {
      // Given: キャンペーン管理リクエスト
      mockRequest.path = '/api/campaigns/456/events';
      mockRequest.method = 'GET';
      mockRequest.user = { id: 'gm-789' };
      mockResponse.statusCode = 200;
      
      let finishCallback: Function;
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });
      
      // When: キャンペーン管理パフォーマンス監視
      performanceMiddleware(
        mockRequest as PerformanceRequest,
        mockResponse as Response,
        mockNext
      );
      
      finishCallback!();
      
      // Then: キャンペーン管理メトリクスが記録される
      expect(performanceMonitoringService.recordRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/campaigns/456/events',
          userId: 'gm-789',
          statusCode: 200
        })
      );
    });

    test('shouldTrackMemoryUsageForLargeGameSessions', () => {
      // Given: 大きなゲームセッションのメモリ使用量変化
      let memoryUsage = 50 * 1024 * 1024; // 開始: 50MB
      jest.spyOn(process, 'memoryUsage').mockImplementation(() => ({
        rss: 200 * 1024 * 1024,
        heapTotal: 180 * 1024 * 1024,
        heapUsed: memoryUsage,
        external: 20 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024
      }));
      
      mockRequest.path = '/api/sessions/large-session/complex-calculation';
      
      let finishCallback: Function;
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });
      
      // When: 大きなセッションの処理
      performanceMiddleware(
        mockRequest as PerformanceRequest,
        mockResponse as Response,
        mockNext
      );
      
      // セッション処理でメモリ使用量が大幅増加
      memoryUsage = 100 * 1024 * 1024; // 終了: 100MB
      finishCallback!();
      
      // Then: 大きなメモリ使用量変化が記録される
      expect(performanceMonitoringService.recordRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          memoryUsage: 50 * 1024 * 1024, // 50MB増加
          path: '/api/sessions/large-session/complex-calculation'
        })
      );
    });
  });

  describe('Integration and Error Handling', () => {
    test('shouldHandlePerformanceServiceErrors', () => {
      // Given: パフォーマンスサービスでエラーが発生
      (performanceMonitoringService.incrementActiveConnections as jest.Mock)
        .mockImplementation(() => {
          throw new Error('Performance service error');
        });
      
      // When & Then: エラーが発生してもミドルウェアは継続
      expect(() => {
        performanceMiddleware(
          mockRequest as PerformanceRequest,
          mockResponse as Response,
          mockNext
        );
      }).not.toThrow();
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('shouldHandleMemoryUsageErrors', () => {
      // Given: メモリ使用量取得でエラーが発生
      jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
        throw new Error('Memory usage error');
      });
      
      // When & Then: エラーが発生してもミドルウェアは継続
      expect(() => {
        performanceMiddleware(
          mockRequest as PerformanceRequest,
          mockResponse as Response,
          mockNext
        );
      }).not.toThrow();
    });

    test('shouldMaintainPerformanceUnderLoad', async () => {
      // Given: 複数の同時リクエスト
      const requests = Array.from({ length: 10 }, (_, i) => ({
        ...mockRequest,
        path: `/api/test/${i}`
      }));
      
      // When: 複数のリクエストを並行処理
      const promises = requests.map((req, i) => {
        const res = { ...mockResponse, statusCode: 200, on: jest.fn() };
        return new Promise(resolve => {
          performanceMiddleware(
            req as PerformanceRequest,
            res as Response,
            () => resolve(i)
          );
        });
      });
      
      const results = await Promise.all(promises);
      
      // Then: 全てのリクエストが正常に処理される
      expect(results).toHaveLength(10);
      expect(performanceMonitoringService.incrementActiveConnections).toHaveBeenCalledTimes(10);
    });
  });
});