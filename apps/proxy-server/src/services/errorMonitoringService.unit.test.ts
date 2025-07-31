import { jest } from '@jest/globals';
import type { TRPGCampaign, TRPGSession, TRPGCharacter } from '@ai-agent-trpg/types';

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

describe('ErrorMonitoringService', () => {
  let errorMonitoringService: any;
  let mockLogger: any;

  beforeEach(async () => {
    // モジュールのリセット
    jest.resetModules();
    jest.clearAllTimers();
    
    // loggerのモックを取得
    const loggerModule = await import('../utils/logger');
    mockLogger = loggerModule.logger;
    
    // ErrorMonitoringServiceをインポート
    const { errorMonitoringService: service } = await import('./errorMonitoringService');
    errorMonitoringService = service;
  });

  afterEach(() => {
    // タイマーのクリーンアップ
    jest.clearAllTimers();
    // エラーをクリア
    errorMonitoringService.clearErrors();
  });

  describe('エラーの記録と分類', () => {
    it('logErrorが正しくエラーを記録すること', () => {
      // Given: エラーオブジェクト
      const error = new Error('Test error message');
      const component = 'testService';
      const context = { userId: 'user-123', campaignId: 'camp-456' };

      // When: エラーを記録
      const errorEvent = errorMonitoringService.logError(error, component, context);

      // Then: エラーイベントが作成される
      expect(errorEvent.id).toMatch(/^err_\d+_/);
      expect(errorEvent.type).toBe('Error');
      expect(errorEvent.message).toBe('Test error message');
      expect(errorEvent.component).toBe('testService');
      expect(errorEvent.userId).toBe('user-123');
      expect(errorEvent.campaignId).toBe('camp-456');
      expect(errorEvent.resolved).toBe(false);

      // ログが出力される
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test error message',
        expect.objectContaining({
          component: 'testService',
          errorType: 'Error',
          userId: 'user-123',
          campaignId: 'camp-456'
        })
      );
    });

    it('重要度が正しく検出されること', () => {
      // Given: 異なる種類のエラー
      const criticalError = { message: 'Database connection failed', statusCode: 500 };
      const highError = { message: 'Authentication failed', statusCode: 401 };
      const mediumError = { message: 'Validation error in request', statusCode: 400 };
      const lowError = { message: 'Something happened' };

      // When: エラーを記録
      const critical = errorMonitoringService.logError(criticalError, 'database');
      const high = errorMonitoringService.logError(highError, 'auth');
      const medium = errorMonitoringService.logError(mediumError, 'validation');
      const low = errorMonitoringService.logError(lowError, 'general');

      // Then: 重要度が正しく分類される
      expect(critical.severity).toBe('critical');
      expect(high.severity).toBe('high');
      expect(medium.severity).toBe('high'); // statusCode 400 = high
      expect(low.severity).toBe('low');
    });

    it('ステータスコードベースの重要度分類が機能すること', () => {
      // Given: ステータスコード付きエラー
      const serverError = { message: 'Internal server error', statusCode: 500 };
      const clientError = { message: 'Bad request', statusCode: 400 };

      // When: エラーを記録
      const serverEvent = errorMonitoringService.logError(serverError, 'server');
      const clientEvent = errorMonitoringService.logError(clientError, 'client');

      // Then: ステータスコードに基づく重要度
      expect(serverEvent.severity).toBe('critical'); // 500 = critical
      expect(clientEvent.severity).toBe('high'); // 400 = high
    });

    it('メッセージパターンベースの重要度分類が機能すること', () => {
      // Given: 特定パターンのメッセージ
      const dbError = { message: 'Database timeout occurred' };
      const validationError = { message: 'Validation failed for field' };
      const timeoutError = { message: 'Request timeout limit exceeded' };

      // When: エラーを記録
      const dbEvent = errorMonitoringService.logError(dbError, 'db');
      const validEvent = errorMonitoringService.logError(validationError, 'validation');
      const timeoutEvent = errorMonitoringService.logError(timeoutError, 'request');

      // Then: メッセージパターンに基づく重要度
      expect(dbEvent.severity).toBe('critical'); // database関連
      expect(validEvent.severity).toBe('medium'); // validation関連
      expect(timeoutEvent.severity).toBe('high'); // timeout関連
    });
  });

  describe('エラーパターン検出', () => {
    it('AIサービス障害パターンが検出されること', () => {
      // Given: AIサービス関連のエラーを複数回発生
      const aiErrors = [
        { message: 'AI service connection failed' },
        { message: 'AI service request timeout' },
        { message: 'AI service returned invalid response' }
      ];

      // When: 閾値（3回）までエラーを記録
      aiErrors.forEach(error => {
        errorMonitoringService.logError(error, 'aiService');
      });

      // Then: パターン検出のアラートが発生
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error pattern detected',
        expect.objectContaining({
          component: 'error-monitoring',
          pattern: 'ai_service_failure',
          severity: 'high'
        })
      );
    });

    it('データベースエラーパターンが検出されること', () => {
      // Given: データベース関連のエラーを複数回発生
      for (let i = 0; i < 5; i++) {
        const dbError = { message: `Database connection error ${i}` };
        errorMonitoringService.logError(dbError, 'database');
      }

      // Then: 重要度criticalでアラートが発生
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error pattern detected',
        expect.objectContaining({
          pattern: 'database_error',
          severity: 'critical'
        })
      );
    });

    it('時間窓内でのパターン検出が機能すること', () => {
      // Given: 認証失敗エラー（閾値10回、時間窓15分）
      for (let i = 0; i < 5; i++) {
        errorMonitoringService.logError(
          { message: 'Authentication failed for user' },
          'auth'
        );
      }

      // When: 16分後にさらにエラー発生
      jest.advanceTimersByTime(16 * 60 * 1000);
      
      for (let i = 0; i < 10; i++) {
        errorMonitoringService.logError(
          { message: 'Authentication failed for user' },
          'auth'
        );
      }

      // Then: 新しい時間窓でパターン検出される
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error pattern detected',
        expect.objectContaining({
          pattern: 'authentication_failure',
          severity: 'medium'
        })
      );
    });

    it('メモリリーク検出が即座にアラートすること', () => {
      // Given: メモリ制限エラー（閾値1回）
      const memoryError = { message: 'Memory limit exceeded' };

      // When: メモリエラーを記録
      errorMonitoringService.logError(memoryError, 'system');

      // Then: 即座にアラートが発生
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error pattern detected',
        expect.objectContaining({
          pattern: 'memory_leak',
          severity: 'critical'
        })
      );
    });
  });

  describe('エラーメトリクス', () => {
    it('getErrorMetricsが正しい統計を返すこと', () => {
      // Given: 様々なエラーを記録
      const errors = [
        { error: new Error('Database error'), component: 'database' },
        { error: { message: 'Validation failed', statusCode: 400 }, component: 'validation' },
        { error: new TypeError('Type error'), component: 'parser' },
        { error: new Error('Another database error'), component: 'database' },
        { error: { message: 'Auth failed', statusCode: 401 }, component: 'auth' }
      ];

      errors.forEach(({ error, component }) => {
        errorMonitoringService.logError(error, component);
      });

      // When: メトリクスを取得
      const metrics = errorMonitoringService.getErrorMetrics();

      // Then: 正しい統計が返される
      expect(metrics.totalErrors).toBe(5);
      expect(metrics.errorsByType.Error).toBe(3);
      expect(metrics.errorsByType.TypeError).toBe(1);
      expect(metrics.errorsByComponent.database).toBe(2);
      expect(metrics.errorsByComponent.validation).toBe(1);
      expect(metrics.errorsByStatus[400]).toBe(1);
      expect(metrics.errorsByStatus[401]).toBe(1);
    });

    it('24時間以内のエラーのみがメトリクスに含まれること', () => {
      // Given: 古いエラーと新しいエラー
      const oldError = new Error('Old error');
      const recentError = new Error('Recent error');

      errorMonitoringService.logError(oldError, 'test');
      
      // 25時間前のタイムスタンプを設定
      const errorEvent = errorMonitoringService.errors[0];
      errorEvent.timestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      errorMonitoringService.logError(recentError, 'test');

      // When: メトリクスを取得
      const metrics = errorMonitoringService.getErrorMetrics();

      // Then: 最近のエラーのみカウント
      expect(metrics.totalErrors).toBe(1);
    });

    it('最新の20件のエラーが返されること', () => {
      // Given: 25件のエラー
      for (let i = 0; i < 25; i++) {
        errorMonitoringService.logError(new Error(`Error ${i}`), 'test');
      }

      // When: メトリクスを取得
      const metrics = errorMonitoringService.getErrorMetrics();

      // Then: 最新の20件のみ
      expect(metrics.recentErrors).toHaveLength(20);
      expect(metrics.recentErrors[19].message).toBe('Error 24');
    });
  });

  describe('コンポーネント別・重要度別のエラー取得', () => {
    it('getErrorsByComponentが特定コンポーネントのエラーを返すこと', () => {
      // Given: 異なるコンポーネントのエラー
      errorMonitoringService.logError(new Error('DB error 1'), 'database');
      errorMonitoringService.logError(new Error('Auth error'), 'auth');
      errorMonitoringService.logError(new Error('DB error 2'), 'database');

      // When: データベースコンポーネントのエラーを取得
      const dbErrors = errorMonitoringService.getErrorsByComponent('database');

      // Then: 該当するエラーのみ返される
      expect(dbErrors).toHaveLength(2);
      expect(dbErrors[0].component).toBe('database');
      expect(dbErrors[1].component).toBe('database');
    });

    it('getErrorsBySeverityが特定重要度のエラーを返すこと', () => {
      // Given: 異なる重要度のエラー
      errorMonitoringService.logError({ message: 'Database error', statusCode: 500 }, 'db');
      errorMonitoringService.logError({ message: 'Auth error', statusCode: 401 }, 'auth');
      errorMonitoringService.logError({ message: 'Info message' }, 'info');

      // When: 重要度criticalのエラーを取得
      const criticalErrors = errorMonitoringService.getErrorsBySeverity('critical');
      const highErrors = errorMonitoringService.getErrorsBySeverity('high');

      // Then: 該当する重要度のエラーのみ返される
      expect(criticalErrors).toHaveLength(1);
      expect(criticalErrors[0].severity).toBe('critical');
      expect(highErrors).toHaveLength(1);
      expect(highErrors[0].severity).toBe('high');
    });
  });

  describe('エラー解決機能', () => {
    it('resolveErrorが正しくエラーを解決済みにすること', () => {
      // Given: エラーを記録
      const errorEvent = errorMonitoringService.logError(new Error('Test error'), 'test');

      // When: エラーを解決
      const resolved = errorMonitoringService.resolveError(errorEvent.id);

      // Then: エラーが解決済みになる
      expect(resolved).toBe(true);
      expect(errorEvent.resolved).toBe(true);
      expect(errorEvent.resolvedAt).toBeDefined();
    });

    it('存在しないエラーIDの解決はfalseを返すこと', () => {
      // Given: 存在しないエラーID
      const nonExistentId = 'err_9999_invalid';

      // When: 解決を試みる
      const resolved = errorMonitoringService.resolveError(nonExistentId);

      // Then: falseが返される
      expect(resolved).toBe(false);
    });
  });

  describe('自動クリーンアップ機能', () => {
    it('24時間以上古いエラーが自動削除されること', () => {
      // Given: 古いエラーと新しいエラー
      const oldError = errorMonitoringService.logError(new Error('Old error'), 'test');
      const recentError = errorMonitoringService.logError(new Error('Recent error'), 'test');

      // 古いエラーのタイムスタンプを25時間前に設定
      oldError.timestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      // When: クリーンアップタスクを実行
      jest.advanceTimersByTime(60 * 60 * 1000);

      // Then: 古いエラーは削除される
      const allErrors = errorMonitoringService.errors;
      expect(allErrors).toHaveLength(1);
      expect(allErrors[0].id).toBe(recentError.id);
    });

    it('最大履歴数を超えた場合は古いものから削除されること', () => {
      // Given: maxErrorHistoryを小さく設定してテスト
      errorMonitoringService.maxErrorHistory = 10;

      // 15個のエラーを記録
      for (let i = 0; i < 15; i++) {
        errorMonitoringService.logError(new Error(`Error ${i}`), 'test');
      }

      // When: クリーンアップタスクを実行
      jest.advanceTimersByTime(60 * 60 * 1000);

      // Then: 最新の10件のみ残る
      const allErrors = errorMonitoringService.errors;
      expect(allErrors.length).toBeLessThanOrEqual(10);
    });
  });

  describe('TRPGセッション関連のエラー監視', () => {
    it('TRPGセッションエラーが適切に記録されること', () => {
      // Given: TRPGセッション関連のエラー
      const sessionError = new Error('Session state corruption detected');
      const context = {
        userId: 'gm-001',
        sessionId: 'sess-123',
        campaignId: 'camp-456'
      };

      // When: セッションエラーを記録
      const errorEvent = errorMonitoringService.logError(sessionError, 'sessionService', context);

      // Then: セッション情報が含まれる
      expect(errorEvent.sessionId).toBe('sess-123');
      expect(errorEvent.campaignId).toBe('camp-456');
      expect(errorEvent.userId).toBe('gm-001');
      expect(errorEvent.component).toBe('sessionService');
    });

    it('AIキャラクター生成エラーが適切に分類されること', () => {
      // Given: AI関連のエラー
      const aiError = { 
        message: 'AI service failed to generate character',
        statusCode: 503
      };

      // When: AIエラーを記録
      const errorEvent = errorMonitoringService.logError(aiError, 'aiCharacterService');

      // Then: 適切に分類される
      expect(errorEvent.severity).toBe('critical'); // 503 = critical
      expect(errorEvent.component).toBe('aiCharacterService');
      expect(errorEvent.statusCode).toBe(503);
    });

    it('キャンペーンデータ破損エラーが重要度criticalになること', () => {
      // Given: キャンペーンデータ関連のエラー
      const dataError = { message: 'Campaign database integrity check failed' };

      // When: エラーを記録
      const errorEvent = errorMonitoringService.logError(dataError, 'campaignService');

      // Then: データベース関連で重要度critical
      expect(errorEvent.severity).toBe('critical');
    });
  });

  describe('エラーパターンの管理', () => {
    it('getErrorPatternsが設定されたパターンを返すこと', () => {
      // When: エラーパターンを取得
      const patterns = errorMonitoringService.getErrorPatterns();

      // Then: 事前定義されたパターンが含まれる
      expect(patterns).toHaveLength(5);
      
      const aiPattern = patterns.find(p => p.type === 'ai_service_failure');
      expect(aiPattern).toBeDefined();
      expect(aiPattern!.threshold).toBe(3);
      expect(aiPattern!.timeWindow).toBe(10);
      expect(aiPattern!.severity).toBe('high');

      const dbPattern = patterns.find(p => p.type === 'database_error');
      expect(dbPattern).toBeDefined();
      expect(dbPattern!.severity).toBe('critical');
    });

    it('パターンカウントが正しく更新されること', () => {
      // Given: AIサービスエラーを発生
      errorMonitoringService.logError({ message: 'AI service connection failed' }, 'ai');

      // When: パターンを確認
      const patterns = errorMonitoringService.getErrorPatterns();
      const aiPattern = patterns.find(p => p.type === 'ai_service_failure');

      // Then: カウントが更新される
      expect(aiPattern!.count).toBe(1);
      expect(aiPattern!.lastDetected).toBeDefined();
    });
  });

  describe('clearErrors機能', () => {
    it('すべてのエラーとパターンカウントがクリアされること', () => {
      // Given: いくつかのエラーを記録
      errorMonitoringService.logError(new Error('Error 1'), 'test1');
      errorMonitoringService.logError({ message: 'AI service failed' }, 'ai');
      errorMonitoringService.logError(new Error('Error 3'), 'test2');

      // When: エラーをクリア
      errorMonitoringService.clearErrors();

      // Then: すべてクリアされる
      expect(errorMonitoringService.errors).toHaveLength(0);
      
      const patterns = errorMonitoringService.getErrorPatterns();
      patterns.forEach(pattern => {
        expect(pattern.count).toBe(0);
        expect(pattern.lastDetected).toBeUndefined();
      });
    });
  });

  describe('エラーID生成', () => {
    it('ユニークなエラーIDが生成されること', () => {
      // Given: 複数のエラー
      const errorIds = new Set();

      // When: 100個のエラーを記録
      for (let i = 0; i < 100; i++) {
        const errorEvent = errorMonitoringService.logError(new Error(`Error ${i}`), 'test');
        errorIds.add(errorEvent.id);
      }

      // Then: すべてユニーク
      expect(errorIds.size).toBe(100);
    });

    it('エラーIDが正しいフォーマットであること', () => {
      // Given: エラーを記録
      const errorEvent = errorMonitoringService.logError(new Error('Test'), 'test');

      // Then: IDフォーマットが正しい
      expect(errorEvent.id).toMatch(/^err_\d+_[a-z0-9]+$/);
    });
  });

  describe('複雑なエラーシナリオ', () => {
    it('カスケード失敗パターンが検出されること', () => {
      // Given: 連鎖的な失敗（データベース → AI → セッション）
      
      // 1. データベースエラー（5回でパターン検出）
      for (let i = 0; i < 5; i++) {
        errorMonitoringService.logError(
          { message: 'Database connection timeout' },
          'database'
        );
      }

      // 2. AIサービスエラー（3回でパターン検出）
      for (let i = 0; i < 3; i++) {
        errorMonitoringService.logError(
          { message: 'AI service request failed' },
          'aiService'
        );
      }

      // Then: 両方のパターンが検出される
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error pattern detected',
        expect.objectContaining({ pattern: 'database_error' })
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error pattern detected',
        expect.objectContaining({ pattern: 'ai_service_failure' })
      );
    });

    it('大量エラー発生時のパフォーマンスが維持されること', () => {
      // Given: 大量のエラー生成テスト
      const startTime = Date.now();

      // When: 1000個のエラーを記録
      for (let i = 0; i < 1000; i++) {
        errorMonitoringService.logError(
          new Error(`Performance test error ${i}`),
          'performance-test'
        );
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Then: 処理時間が妥当（1秒以内）
      expect(duration).toBeLessThan(1000);

      // メトリクス取得も高速
      const metricsStart = Date.now();
      const metrics = errorMonitoringService.getErrorMetrics();
      const metricsEnd = Date.now();

      expect(metricsEnd - metricsStart).toBeLessThan(100);
      expect(metrics.totalErrors).toBe(1000);
    });
  });
});