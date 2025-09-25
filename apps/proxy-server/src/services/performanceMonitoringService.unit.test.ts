import { jest } from '@jest/globals';
import type { TRPGCampaign, TRPGSession } from '@ai-agent-trpg/types';

// モックの設定
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// タイマーのモック
jest.useFakeTimers();

describe('PerformanceMonitoringService', () => {
  let performanceMonitoringService: any;
  let mockLogger: any;
  let originalCpuUsage: typeof process.cpuUsage;
  let originalMemoryUsage: typeof process.memoryUsage;

  beforeEach(async () => {
    // モジュールのリセット
    jest.resetModules();
    jest.clearAllTimers();
    
    // process関数のモック
    originalCpuUsage = process.cpuUsage;
    originalMemoryUsage = process.memoryUsage;
    
    process.cpuUsage = jest.fn().mockReturnValue({
      user: 100000,
      system: 50000
    });
    
    process.memoryUsage = jest.fn().mockReturnValue({
      rss: 100 * 1024 * 1024,
      heapTotal: 80 * 1024 * 1024,
      heapUsed: 60 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024
    });
    
    // loggerのモックを取得
    const loggerModule = await import('../utils/logger');
    mockLogger = loggerModule.logger;
    
    // PerformanceMonitoringServiceをインポート
    const { performanceMonitoringService: service } = await import('./performanceMonitoringService');
    performanceMonitoringService = service;
  });

  afterEach(() => {
    // タイマーのクリーンアップ
    jest.clearAllTimers();
    // process関数の復元
    process.cpuUsage = originalCpuUsage;
    process.memoryUsage = originalMemoryUsage;
  });

  describe('リクエストメトリクスの記録', () => {
    it('recordRequestが正しくメトリクスを記録すること', () => {
      // Given: リクエストメトリクス
      const metric = {
        method: 'GET',
        path: '/api/campaigns',
        statusCode: 200,
        duration: 150,
        timestamp: new Date().toISOString(),
        userId: 'user-123'
      };

      // When: リクエストを記録
      performanceMonitoringService.recordRequest(metric);

      // Then: メトリクスが記録される
      const metrics = performanceMonitoringService.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.averageResponseTime).toBe(150);
    });

    it('遅いリクエストが警告として記録されること', () => {
      // Given: 遅いリクエスト（1秒以上）
      const slowMetric = {
        method: 'POST',
        path: '/api/ai-generate',
        statusCode: 200,
        duration: 1500,
        timestamp: new Date().toISOString(),
        userId: 'user-456'
      };

      // When: 遅いリクエストを記録
      performanceMonitoringService.recordRequest(slowMetric);

      // Then: 警告ログが出力される
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow request detected',
        expect.objectContaining({
          component: 'performance-monitoring',
          method: 'POST',
          path: '/api/ai-generate',
          duration: 1500
        })
      );
    });

    it('複数のリクエストから正しい統計が計算されること', () => {
      // Given: 複数のリクエスト
      const requests = [
        { method: 'GET', path: '/api/test', statusCode: 200, duration: 100, timestamp: new Date().toISOString() },
        { method: 'GET', path: '/api/test', statusCode: 200, duration: 200, timestamp: new Date().toISOString() },
        { method: 'GET', path: '/api/test', statusCode: 200, duration: 300, timestamp: new Date().toISOString() },
        { method: 'GET', path: '/api/test', statusCode: 404, duration: 50, timestamp: new Date().toISOString() },
        { method: 'GET', path: '/api/test', statusCode: 500, duration: 400, timestamp: new Date().toISOString() }
      ];

      // When: すべてのリクエストを記録
      requests.forEach(r => performanceMonitoringService.recordRequest(r));

      // Then: 統計が正しく計算される
      const metrics = performanceMonitoringService.getMetrics();
      expect(metrics.requestCount).toBe(5);
      expect(metrics.averageResponseTime).toBe(210); // (100+200+300+50+400)/5
      expect(metrics.errorRate).toBe(40); // 2/5 * 100
    });
  });

  describe('P95レスポンスタイムの計算', () => {
    it('P95が正しく計算されること', () => {
      // Given: 20個のリクエスト（P95 = 19番目の値）
      const durations = [
        50, 100, 150, 200, 250, 300, 350, 400, 450, 500,
        550, 600, 650, 700, 750, 800, 850, 900, 950, 1000
      ];

      // When: リクエストを記録
      durations.forEach((duration, i) => {
        performanceMonitoringService.recordRequest({
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          duration,
          timestamp: new Date().toISOString()
        });
      });

      // Then: P95が正しく計算される（19番目 = 950）
      const metrics = performanceMonitoringService.getMetrics();
      expect(metrics.p95ResponseTime).toBe(950);
    });

    it('データが少ない場合でもP95が計算されること', () => {
      // Given: 3つのリクエストのみ
      const requests = [
        { method: 'GET', path: '/api/test', statusCode: 200, duration: 100, timestamp: new Date().toISOString() },
        { method: 'GET', path: '/api/test', statusCode: 200, duration: 200, timestamp: new Date().toISOString() },
        { method: 'GET', path: '/api/test', statusCode: 200, duration: 300, timestamp: new Date().toISOString() }
      ];

      // When: リクエストを記録
      requests.forEach(r => performanceMonitoringService.recordRequest(r));

      // Then: P95が計算される（インデックス2 = 300）
      const metrics = performanceMonitoringService.getMetrics();
      expect(metrics.p95ResponseTime).toBe(300);
    });
  });

  describe('クエリメトリクスの記録', () => {
    it('recordQueryが正しくメトリクスを記録すること', () => {
      // Given: クエリメトリクス
      const queryMetric = {
        query: 'SELECT * FROM campaigns WHERE id = ?',
        duration: 50,
        timestamp: new Date().toISOString(),
        component: 'campaignService'
      };

      // When: クエリを記録
      performanceMonitoringService.recordQuery(queryMetric);

      // Then: メトリクスが記録される
      const slowQueries = performanceMonitoringService.getSlowQueries();
      expect(slowQueries).toHaveLength(0); // デフォルトの閾値（100ms）以下
    });

    it('遅いクエリが警告として記録されること', () => {
      // Given: 遅いクエリ（100ms以上）
      const slowQuery = {
        query: 'SELECT * FROM characters JOIN campaigns ON ...',
        duration: 250,
        timestamp: new Date().toISOString(),
        component: 'characterService'
      };

      // When: 遅いクエリを記録
      performanceMonitoringService.recordQuery(slowQuery);

      // Then: 警告ログが出力される
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow query detected',
        expect.objectContaining({
          component: 'performance-monitoring',
          duration: 250
        })
      );

      // 遅いクエリリストに含まれる
      const slowQueries = performanceMonitoringService.getSlowQueries();
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].duration).toBe(250);
    });

    it('getSlowQueriesが制限数まで返すこと', () => {
      // Given: 多数の遅いクエリ
      for (let i = 0; i < 20; i++) {
        performanceMonitoringService.recordQuery({
          query: `SELECT * FROM table_${i}`,
          duration: 100 + i * 10,
          timestamp: new Date().toISOString(),
          component: 'testService'
        });
      }

      // When: 制限付きで取得
      const slowQueries = performanceMonitoringService.getSlowQueries(5);

      // Then: 最も遅い5つが返される
      expect(slowQueries).toHaveLength(5);
      expect(slowQueries[0].duration).toBe(290); // 最も遅い
      expect(slowQueries[4].duration).toBe(250); // 5番目に遅い
    });
  });

  describe('アクティブコネクション管理', () => {
    it('incrementActiveConnectionsでカウントが増加すること', () => {
      // Given: 初期状態

      // When: コネクションを増加
      performanceMonitoringService.incrementActiveConnections();
      performanceMonitoringService.incrementActiveConnections();
      performanceMonitoringService.incrementActiveConnections();

      // Then: カウントが増加
      const metrics = performanceMonitoringService.getMetrics();
      expect(metrics.activeConnections).toBe(3);
    });

    it('decrementActiveConnectionsでカウントが減少すること', () => {
      // Given: アクティブコネクションがある状態
      performanceMonitoringService.incrementActiveConnections();
      performanceMonitoringService.incrementActiveConnections();

      // When: コネクションを減少
      performanceMonitoringService.decrementActiveConnections();

      // Then: カウントが減少
      const metrics = performanceMonitoringService.getMetrics();
      expect(metrics.activeConnections).toBe(1);
    });

    it('アクティブコネクションが負にならないこと', () => {
      // Given: コネクションがない状態

      // When: 減少を試みる
      performanceMonitoringService.decrementActiveConnections();
      performanceMonitoringService.decrementActiveConnections();

      // Then: 0のまま
      const metrics = performanceMonitoringService.getMetrics();
      expect(metrics.activeConnections).toBe(0);
    });
  });

  describe('エンドポイント別メトリクス', () => {
    it('エンドポイント別の統計が正しく集計されること', () => {
      // Given: 異なるエンドポイントへのリクエスト
      const requests = [
        { method: 'GET', path: '/api/campaigns', statusCode: 200, duration: 100, timestamp: new Date().toISOString() },
        { method: 'GET', path: '/api/campaigns', statusCode: 200, duration: 200, timestamp: new Date().toISOString() },
        { method: 'POST', path: '/api/campaigns', statusCode: 201, duration: 300, timestamp: new Date().toISOString() },
        { method: 'GET', path: '/api/characters', statusCode: 200, duration: 150, timestamp: new Date().toISOString() },
        { method: 'GET', path: '/api/campaigns', statusCode: 404, duration: 50, timestamp: new Date().toISOString() }
      ];

      // When: リクエストを記録
      requests.forEach(r => performanceMonitoringService.recordRequest(r));

      // Then: エンドポイント別統計が正しい
      const metrics = performanceMonitoringService.getMetrics();
      const getCampaigns = metrics.endpointMetrics['GET /api/campaigns'];
      expect(getCampaigns.count).toBe(3);
      expect(getCampaigns.averageTime).toBeCloseTo(116.67, 1); // (100+200+50)/3
      expect(getCampaigns.errorCount).toBe(1);

      const postCampaigns = metrics.endpointMetrics['POST /api/campaigns'];
      expect(postCampaigns.count).toBe(1);
      expect(postCampaigns.averageTime).toBe(300);
      expect(postCampaigns.errorCount).toBe(0);
    });

    it('getEndpointMetricsで特定エンドポイントのメトリクスを取得できること', () => {
      // Given: エンドポイントへのリクエスト
      performanceMonitoringService.recordRequest({
        method: 'GET',
        path: '/api/sessions',
        statusCode: 200,
        duration: 250,
        timestamp: new Date().toISOString()
      });

      // When: 特定エンドポイントのメトリクスを取得
      const metric = performanceMonitoringService.getEndpointMetrics('GET /api/sessions');

      // Then: メトリクスが取得できる
      expect(metric).not.toBeNull();
      expect(metric!.count).toBe(1);
      expect(metric!.averageTime).toBe(250);
    });

    it('存在しないエンドポイントの場合はnullを返すこと', () => {
      // Given: 記録されていないエンドポイント

      // When: メトリクスを取得
      const metric = performanceMonitoringService.getEndpointMetrics('GET /api/unknown');

      // Then: nullが返される
      expect(metric).toBeNull();
    });
  });

  describe('トップエンドポイントの取得', () => {
    it('getTopEndpointsがアクセス数順でエンドポイントを返すこと', () => {
      // Given: 異なるアクセス数のエンドポイント
      const endpoints = [
        { method: 'GET', path: '/api/popular', count: 10 },
        { method: 'GET', path: '/api/moderate', count: 5 },
        { method: 'GET', path: '/api/rare', count: 1 }
      ];

      endpoints.forEach(endpoint => {
        for (let i = 0; i < endpoint.count; i++) {
          performanceMonitoringService.recordRequest({
            method: endpoint.method,
            path: endpoint.path,
            statusCode: 200,
            duration: 100,
            timestamp: new Date().toISOString()
          });
        }
      });

      // When: トップエンドポイントを取得
      const topEndpoints = performanceMonitoringService.getTopEndpoints(2);

      // Then: アクセス数順で返される
      expect(topEndpoints).toHaveLength(2);
      expect(topEndpoints[0].endpoint).toBe('GET /api/popular');
      expect(topEndpoints[0].metric.count).toBe(10);
      expect(topEndpoints[1].endpoint).toBe('GET /api/moderate');
      expect(topEndpoints[1].metric.count).toBe(5);
    });
  });

  describe('自動クリーンアップ機能', () => {
    it('古いメトリクスが自動的にクリーンアップされること', () => {
      // Given: 古いリクエスト（2時間前）
      const oldTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const recentTimestamp = new Date().toISOString();

      performanceMonitoringService.recordRequest({
        method: 'GET',
        path: '/api/old',
        statusCode: 200,
        duration: 100,
        timestamp: oldTimestamp
      });

      performanceMonitoringService.recordRequest({
        method: 'GET',
        path: '/api/recent',
        statusCode: 200,
        duration: 200,
        timestamp: recentTimestamp
      });

      // When: クリーンアップタスクを実行（1時間後）
      jest.advanceTimersByTime(60 * 60 * 1000);

      // Then: 古いメトリクスは削除される
      const metrics = performanceMonitoringService.getMetrics();
      expect(metrics.requestCount).toBe(1); // 最近のもののみ
      expect(metrics.averageResponseTime).toBe(200);
    });

    it('最大履歴数を超えた場合は古いものから削除されること', () => {
      // Given: maxHistoryを小さく設定してテスト
      performanceMonitoringService.maxHistory = 10;

      // When: maxHistoryを超えるリクエストを記録
      for (let i = 0; i < 15; i++) {
        performanceMonitoringService.recordRequest({
          method: 'GET',
          path: `/api/test-${i}`,
          statusCode: 200,
          duration: 100 + i,
          timestamp: new Date(Date.now() + i * 1000).toISOString() // 時間をずらす
        });
      }

      // クリーンアップタスクを実行
      jest.advanceTimersByTime(60 * 60 * 1000);

      // Then: 最新の10件のみ残る
      const metrics = performanceMonitoringService.getMetrics();
      expect(metrics.requestCount).toBeLessThanOrEqual(10);
    });
  });

  describe('CPU使用率監視', () => {
    it('CPU使用率が定期的に測定されること', () => {
      // Given: cpuUsageのモック
      const mockCpuUsage = jest.fn()
        .mockReturnValueOnce({ user: 100000, system: 50000 })
        .mockReturnValueOnce({ user: 200000, system: 100000 });

      process.cpuUsage = mockCpuUsage;

      // When: CPU監視タスクを実行（30秒後）
      jest.advanceTimersByTime(30 * 1000);

      // さらに1秒待つ（測定のため）
      jest.advanceTimersByTime(1000);

      // Then: CPU使用率が測定される
      expect(mockCpuUsage).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'CPU usage measured',
        expect.objectContaining({
          component: 'performance-monitoring'
        })
      );
    });
  });

  describe('メモリ使用量の取得', () => {
    it('現在のメモリ使用量が取得できること', () => {
      // Given: memoryUsageのモック済み

      // When: メトリクスを取得
      const metrics = performanceMonitoringService.getMetrics();

      // Then: メモリ使用量が含まれる
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage.rss).toBe(100 * 1024 * 1024);
      expect(metrics.memoryUsage.heapTotal).toBe(80 * 1024 * 1024);
      expect(metrics.memoryUsage.heapUsed).toBe(60 * 1024 * 1024);
    });
  });

  describe('clearMetrics機能', () => {
    it('すべてのメトリクスがクリアされること', () => {
      // Given: いくつかのメトリクスを記録
      performanceMonitoringService.recordRequest({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 100,
        timestamp: new Date().toISOString()
      });

      performanceMonitoringService.recordQuery({
        query: 'SELECT * FROM test',
        duration: 150,
        timestamp: new Date().toISOString(),
        component: 'test'
      });

      performanceMonitoringService.incrementActiveConnections();

      // When: メトリクスをクリア
      performanceMonitoringService.clearMetrics();

      // Then: すべてクリアされる
      const metrics = performanceMonitoringService.getMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.slowQueries).toHaveLength(0);
    });
  });

  describe('TRPGセッションのパフォーマンス監視', () => {
    it('TRPGセッション関連のエンドポイントが適切に監視されること', () => {
      // Given: TRPGセッション関連のリクエスト
      const sessionRequests = [
        { method: 'POST', path: '/api/sessions', statusCode: 201, duration: 200 },
        { method: 'GET', path: '/api/sessions/sess-123', statusCode: 200, duration: 100 },
        { method: 'POST', path: '/api/sessions/sess-123/actions', statusCode: 200, duration: 300 },
        { method: 'POST', path: '/api/ai-game-master/action', statusCode: 200, duration: 1200 }
      ];

      // When: リクエストを記録
      sessionRequests.forEach(req => {
        performanceMonitoringService.recordRequest({
          ...req,
          timestamp: new Date().toISOString(),
          userId: 'gm-001'
        });
      });

      // Then: セッション関連のメトリクスが取得できる
      const metrics = performanceMonitoringService.getMetrics();
      const aiGmMetric = metrics.endpointMetrics['POST /api/ai-game-master/action'];
      expect(aiGmMetric).toBeDefined();
      expect(aiGmMetric.averageTime).toBe(1200);

      // 遅いAIリクエストが警告される
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow request detected',
        expect.objectContaining({
          path: '/api/ai-game-master/action',
          duration: 1200
        })
      );
    });

    it('データベースクエリのパフォーマンスが監視されること', () => {
      // Given: キャンペーン関連の複雑なクエリ
      const queries = [
        {
          query: 'SELECT c.*, COUNT(ch.id) as character_count FROM campaigns c LEFT JOIN characters ch ON c.id = ch.campaign_id GROUP BY c.id',
          duration: 250,
          component: 'campaignService'
        },
        {
          query: 'INSERT INTO sessions (id, campaign_id, status) VALUES (?, ?, ?)',
          duration: 50,
          component: 'sessionService'
        }
      ];

      // When: クエリを記録
      queries.forEach(q => {
        performanceMonitoringService.recordQuery({
          ...q,
          timestamp: new Date().toISOString()
        });
      });

      // Then: 遅いクエリが検出される
      const slowQueries = performanceMonitoringService.getSlowQueries();
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].component).toBe('campaignService');
      expect(slowQueries[0].duration).toBe(250);
    });
  });

  describe('エラー率の監視', () => {
    it('エンドポイント別のエラー率が計算されること', () => {
      // Given: 成功と失敗のリクエスト
      const requests = [
        { method: 'POST', path: '/api/ai-generate', statusCode: 200 },
        { method: 'POST', path: '/api/ai-generate', statusCode: 200 },
        { method: 'POST', path: '/api/ai-generate', statusCode: 500 },
        { method: 'POST', path: '/api/ai-generate', statusCode: 429 }
      ];

      // When: リクエストを記録
      requests.forEach(req => {
        performanceMonitoringService.recordRequest({
          ...req,
          duration: 100,
          timestamp: new Date().toISOString()
        });
      });

      // Then: エラー率が正しく計算される
      const metric = performanceMonitoringService.getEndpointMetrics('POST /api/ai-generate');
      expect(metric!.errorCount).toBe(2);
      expect(metric!.count).toBe(4);
      // エラー率は50%（2/4）
    });
  });
});