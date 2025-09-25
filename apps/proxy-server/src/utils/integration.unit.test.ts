import { jest } from '@jest/globals';
import type { TRPGCampaign, TRPGCharacter, TRPGSession } from '@ai-agent-trpg/types';

// モックの設定
jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    setContext: jest.fn().mockReturnThis(),
    child: jest.fn().mockReturnThis()
  }
}));

// タイマーのモック
jest.useFakeTimers();

describe('Backend Utilities Integration', () => {
  let mockLogger: any;

  beforeEach(async () => {
    // モジュールのリセット
    jest.resetModules();
    jest.clearAllTimers();
    
    // loggerのモックを取得
    const loggerModule = await import('./logger');
    mockLogger = loggerModule.logger;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('統合シナリオ: TRPGセッション管理', () => {
    it('キャンペーン作成からセッション実行までの全体的なワークフローが動作すること', async () => {
      // Given: 各種サービスをインポート
      const { cacheService } = await import('../services/cacheService');
      const { performanceMonitoringService } = await import('../services/performanceMonitoringService');
      const { errorMonitoringService } = await import('../services/errorMonitoringService');

      // キャンペーンデータ
      const campaign: Partial<TRPGCampaign> = {
        id: 'integration-camp-001',
        name: 'Integration Test Campaign',
        description: 'Testing integration between utilities',
        status: 'active',
        currentLevel: 5
      };

      // セッションデータ
      const session: Partial<TRPGSession> = {
        id: 'integration-sess-001',
        campaignId: campaign.id,
        status: 'active',
        participants: ['player-1', 'player-2', 'gm-1']
      };

      // When: 統合ワークフローを実行

      // 1. キャンペーンをキャッシュ
      const campaignKey = cacheService.generateKey('campaign', { id: campaign.id });
      cacheService.set(campaignKey, campaign, 600000); // 10分

      // 2. パフォーマンス監視開始
      performanceMonitoringService.incrementActiveConnections();
      const requestStartTime = Date.now();

      // 3. セッション処理をシミュレート
      await new Promise(resolve => setTimeout(resolve, 50));

      // 4. リクエスト完了記録
      performanceMonitoringService.recordRequest({
        method: 'POST',
        path: '/api/sessions',
        statusCode: 201,
        duration: Date.now() - requestStartTime,
        timestamp: new Date().toISOString(),
        userId: 'gm-1'
      });

      // 5. セッションもキャッシュ
      const sessionKey = cacheService.generateKey('session', { id: session.id });
      cacheService.set(sessionKey, session);

      // 6. 成功ログを記録
      mockLogger.info('Session created successfully', {
        campaignId: campaign.id,
        sessionId: session.id,
        participants: session.participants?.length
      });

      // Then: 全体的な動作確認

      // キャッシュからデータが取得できる
      const cachedCampaign = cacheService.get<Partial<TRPGCampaign>>(campaignKey);
      expect(cachedCampaign).toEqual(campaign);

      const cachedSession = cacheService.get<Partial<TRPGSession>>(sessionKey);
      expect(cachedSession).toEqual(session);

      // パフォーマンスメトリクスが記録されている
      const metrics = performanceMonitoringService.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.activeConnections).toBe(1);

      // ログが適切に出力されている
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Session created successfully',
        expect.objectContaining({
          campaignId: campaign.id,
          sessionId: session.id
        })
      );

      performanceMonitoringService.decrementActiveConnections();
    });

    it('エラー発生時の統合エラーハンドリングが適切に動作すること', async () => {
      // Given: エラーシナリオ
      const { errorMonitoringService } = await import('../services/errorMonitoringService');
      const { performanceMonitoringService } = await import('../services/performanceMonitoringService');

      const errorContext = {
        userId: 'test-user',
        campaignId: 'error-camp-001',
        sessionId: 'error-sess-001'
      };

      // When: エラーが発生

      // 1. データベースエラーをシミュレート
      const dbError = new Error('Database connection timeout');
      const errorEvent = errorMonitoringService.logError(dbError, 'database', errorContext);

      // 2. 遅いリクエストを記録
      performanceMonitoringService.recordRequest({
        method: 'POST',
        path: '/api/campaigns',
        statusCode: 500,
        duration: 2000, // 2秒（遅い）
        timestamp: new Date().toISOString(),
        userId: errorContext.userId
      });

      // 3. AIサービスエラーも発生
      const aiError = new Error('AI service failed to generate character');
      errorMonitoringService.logError(aiError, 'aiService', errorContext);

      // Then: エラーハンドリングの確認

      // エラーが適切に記録されている
      expect(errorEvent.component).toBe('database');
      expect(errorEvent.userId).toBe(errorContext.userId);
      expect(errorEvent.campaignId).toBe(errorContext.campaignId);
      expect(errorEvent.severity).toBe('critical'); // データベースエラーは重要度高

      // パフォーマンス警告が発生
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow request detected',
        expect.objectContaining({
          method: 'POST',
          path: '/api/campaigns',
          duration: 2000
        })
      );

      // エラーメトリクスが更新されている
      const errorMetrics = errorMonitoringService.getErrorMetrics();
      expect(errorMetrics.totalErrors).toBe(2);
      expect(errorMetrics.errorsByComponent.database).toBe(1);
      expect(errorMetrics.errorsByComponent.aiService).toBe(1);

      // パフォーマンスメトリクスにエラー率が反映されている
      const perfMetrics = performanceMonitoringService.getMetrics();
      expect(perfMetrics.errorRate).toBe(100); // 1つのリクエストがエラー
    });
  });

  describe('設定とログの統合テスト', () => {
    it('環境設定とログ出力が適切に連携すること', async () => {
      // Given: 設定をモック
      process.env.LOG_LEVEL = 'debug';
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'test-secret-for-integration';

      // When: 設定を読み込み
      const { config } = await import('../config/config');
      const { logger } = await import('./logger-simple');

      // 設定に基づくログ出力
      if (config.logLevel === 'debug') {
        logger.debug('Debug mode enabled', {
          environment: config.nodeEnv,
          logLevel: config.logLevel
        });
      }

      logger.info('Configuration loaded', {
        port: config.port,
        environment: config.nodeEnv
      });

      // Then: 適切なログが出力される
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Debug mode enabled'),
        expect.objectContaining({
          environment: 'test'
        })
      );

      // クリーンアップ
      delete process.env.LOG_LEVEL;
      delete process.env.NODE_ENV;
      delete process.env.JWT_SECRET;
    });
  });

  describe('キャッシュとパフォーマンス監視の統合', () => {
    it('キャッシュヒット率とパフォーマンスメトリクスが連携すること', async () => {
      // Given: サービス
      const { cacheService } = await import('../services/cacheService');
      const { performanceMonitoringService } = await import('../services/performanceMonitoringService');

      const testData = {
        campaigns: Array.from({ length: 10 }, (_, i) => ({
          id: `camp-${i}`,
          name: `Campaign ${i}`,
          status: 'active' as const
        }))
      };

      // When: キャッシュ使用パターンをシミュレート

      // 1. 初回リクエスト（キャッシュミス）
      testData.campaigns.forEach(campaign => {
        const key = cacheService.generateKey('campaign', { id: campaign.id });
        
        // キャッシュミス（データがない）
        const cached = cacheService.get(key);
        expect(cached).toBeNull();

        // データベースから取得したと仮定してキャッシュに保存
        cacheService.set(key, campaign);

        // 遅いリクエスト（データベースアクセス）
        performanceMonitoringService.recordRequest({
          method: 'GET',
          path: `/api/campaigns/${campaign.id}`,
          statusCode: 200,
          duration: 150, // 150ms（データベースアクセス）
          timestamp: new Date().toISOString()
        });
      });

      // 2. 2回目のリクエスト（キャッシュヒット）
      testData.campaigns.forEach(campaign => {
        const key = cacheService.generateKey('campaign', { id: campaign.id });
        
        // キャッシュヒット
        const cached = cacheService.get(key);
        expect(cached).toEqual(campaign);

        // 高速リクエスト（キャッシュから取得）
        performanceMonitoringService.recordRequest({
          method: 'GET',
          path: `/api/campaigns/${campaign.id}`,
          statusCode: 200,
          duration: 15, // 15ms（キャッシュアクセス）
          timestamp: new Date().toISOString()
        });
      });

      // Then: パフォーマンス改善が確認できる
      const cacheStats = cacheService.getStats();
      expect(cacheStats.totalHits).toBe(10); // 10回のキャッシュヒット
      expect(cacheStats.hitRate).toBeGreaterThan(0); // ヒット率が存在

      const perfMetrics = performanceMonitoringService.getMetrics();
      expect(perfMetrics.requestCount).toBe(20); // 20回のリクエスト
      expect(perfMetrics.averageResponseTime).toBeLessThan(150); // 平均応答時間が改善

      // キャッシュ使用により全体的なパフォーマンスが向上している
      const endpointMetric = performanceMonitoringService.getEndpointMetrics('GET /api/campaigns/camp-0');
      expect(endpointMetric).not.toBeNull();
      expect(endpointMetric!.count).toBe(2);
    });
  });

  describe('エラー監視とパフォーマンス監視の連携', () => {
    it('エラーパターンとパフォーマンス劣化が連携して検出されること', async () => {
      // Given: サービス
      const { errorMonitoringService } = await import('../services/errorMonitoringService');
      const { performanceMonitoringService } = await import('../services/performanceMonitoringService');

      // When: システム劣化シナリオ

      // 1. 段階的にパフォーマンスが劣化
      const degradationScenario = [
        { duration: 100, statusCode: 200 },
        { duration: 250, statusCode: 200 },
        { duration: 500, statusCode: 500 },
        { duration: 1000, statusCode: 500 },
        { duration: 2000, statusCode: 503 }
      ];

      degradationScenario.forEach((scenario, index) => {
        // パフォーマンス記録
        performanceMonitoringService.recordRequest({
          method: 'POST',
          path: '/api/ai-character-generation',
          statusCode: scenario.statusCode,
          duration: scenario.duration,
          timestamp: new Date().toISOString(),
          userId: `user-${index}`
        });

        // エラーが発生した場合はエラー監視にも記録
        if (scenario.statusCode >= 500) {
          const error = new Error(`AI service degradation: ${scenario.statusCode}`);
          error.name = scenario.statusCode === 503 ? 'ServiceUnavailableError' : 'InternalServerError';
          
          errorMonitoringService.logError(error, 'aiService', {
            userId: `user-${index}`,
            duration: scenario.duration
          });
        }
      });

      // Then: 統合的な問題検出

      // パフォーマンス劣化が検出される
      const perfMetrics = performanceMonitoringService.getMetrics();
      expect(perfMetrics.errorRate).toBe(60); // 3/5のリクエストがエラー
      expect(perfMetrics.averageResponseTime).toBeGreaterThan(500); // 平均応答時間が悪化

      // エラーパターンが検出される
      const errorMetrics = errorMonitoringService.getErrorMetrics();
      expect(errorMetrics.totalErrors).toBe(3); // 3つのエラー
      expect(errorMetrics.errorsByComponent.aiService).toBe(3);

      // 遅いリクエストの警告
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow request detected',
        expect.objectContaining({
          path: '/api/ai-character-generation',
          duration: 2000
        })
      );
    });
  });

  describe('メモリ効率とクリーンアップの統合', () => {
    it('定期的なクリーンアップが全サービスで適切に実行されること', async () => {
      // Given: サービス
      const { cacheService } = await import('../services/cacheService');
      const { performanceMonitoringService } = await import('../services/performanceMonitoringService');
      const { errorMonitoringService } = await import('../services/errorMonitoringService');

      // 大量のデータを生成
      for (let i = 0; i < 100; i++) {
        // キャッシュエントリ（短いTTL）
        cacheService.set(`temp-data-${i}`, { value: i }, 1000); // 1秒で期限切れ

        // パフォーマンスメトリクス
        performanceMonitoringService.recordRequest({
          method: 'GET',
          path: `/api/test/${i}`,
          statusCode: 200,
          duration: 50,
          timestamp: new Date().toISOString()
        });

        // エラー（古いタイムスタンプ）
        const error = new Error(`Test error ${i}`);
        const errorEvent = errorMonitoringService.logError(error, 'test');
        // 古いタイムスタンプに変更
        errorEvent.timestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      }

      // When: クリーンアップタスクを実行（1時間経過をシミュレート）
      jest.advanceTimersByTime(60 * 60 * 1000);

      // Then: 適切にクリーンアップされる

      // キャッシュの期限切れデータがクリーンアップされる
      const cacheStats = cacheService.getStats();
      expect(cacheStats.totalKeys).toBeLessThan(100); // 期限切れエントリが削除

      // 古いエラーデータがクリーンアップされる
      const errorMetrics = errorMonitoringService.getErrorMetrics();
      expect(errorMetrics.totalErrors).toBeLessThan(100); // 古いエラーが削除

      // クリーンアップログが出力される
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up'),
        expect.objectContaining({
          component: 'cache-service'
        })
      );
    });
  });

  describe('型安全性とエラーハンドリングの統合', () => {
    it('TRPGデータ型を使用した処理で型安全性が保たれること', async () => {
      // Given: サービス
      const { cacheService } = await import('../services/cacheService');

      // TRPGキャラクターデータ
      const character: TRPGCharacter = {
        id: 'integration-char-001',
        campaignId: 'integration-camp-001',
        name: 'Integration Test Hero',
        characterType: 'pc',
        description: 'A character for integration testing',
        age: 25,
        race: 'Human',
        class: 'Fighter',
        level: 10,
        experience: 8500,
        baseStats: {
          strength: 16,
          dexterity: 14,
          constitution: 15,
          intelligence: 12,
          wisdom: 13,
          charisma: 11
        },
        derivedStats: {
          hitPoints: 85,
          armorClass: 18,
          speed: 30,
          proficiencyBonus: 4
        },
        skills: ['Athletics', 'Intimidation'],
        feats: ['Great Weapon Master'],
        equipment: ['Greatsword', 'Plate Armor'],
        statusEffects: [],
        appearance: 'Tall and muscular warrior',
        background: 'Soldier',
        characterData: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // When: 型安全な処理を実行
      const key = cacheService.generateKey('character', { id: character.id });
      cacheService.set(key, character);

      const cachedCharacter = cacheService.get<TRPGCharacter>(key);

      // Then: 型安全性が保たれる
      expect(cachedCharacter).toBeDefined();
      expect(cachedCharacter!.id).toBe(character.id);
      expect(cachedCharacter!.characterType).toBe('pc');
      expect(cachedCharacter!.level).toBe(10);
      expect(cachedCharacter!.baseStats.strength).toBe(16);
      
      // TypeScriptの型チェックも通ることを確認
      if (cachedCharacter) {
        expect(typeof cachedCharacter.level).toBe('number');
        expect(Array.isArray(cachedCharacter.skills)).toBe(true);
        expect(typeof cachedCharacter.baseStats).toBe('object');
      }
    });
  });
});