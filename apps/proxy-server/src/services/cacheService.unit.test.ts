import { jest } from '@jest/globals';
import type { TRPGCampaign, TRPGCharacter } from '@ai-agent-trpg/types';

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

describe('CacheService', () => {
  let cacheService: any;
  let mockLogger: any;

  beforeEach(async () => {
    // モジュールのリセット
    jest.resetModules();
    jest.clearAllTimers();
    
    // loggerのモックを取得
    const loggerModule = await import('../utils/logger');
    mockLogger = loggerModule.logger;
    
    // CacheServiceをインポート
    const { cacheService: service } = await import('./cacheService');
    cacheService = service;
  });

  afterEach(() => {
    // タイマーのクリーンアップ
    jest.clearAllTimers();
  });

  describe('基本的なキャッシュ操作', () => {
    it('setとgetが正しく動作すること', () => {
      // Given: テストデータ
      const key = 'test-key';
      const data = { value: 'test-value' };

      // When: データをセット
      cacheService.set(key, data);

      // Then: データが取得できる
      const retrieved = cacheService.get(key);
      expect(retrieved).toEqual(data);
    });

    it('存在しないキーの場合はnullを返すこと', () => {
      // Given: 存在しないキー

      // When: データを取得
      const result = cacheService.get('non-existent-key');

      // Then: nullが返される
      expect(result).toBeNull();
    });

    it('同じキーで上書きできること', () => {
      // Given: 既存のデータ
      const key = 'overwrite-test';
      cacheService.set(key, { old: 'data' });

      // When: 新しいデータで上書き
      const newData = { new: 'data' };
      cacheService.set(key, newData);

      // Then: 新しいデータが取得される
      expect(cacheService.get(key)).toEqual(newData);
    });

    it('deleteでキャッシュエントリを削除できること', () => {
      // Given: キャッシュされたデータ
      const key = 'delete-test';
      cacheService.set(key, { data: 'to-delete' });

      // When: データを削除
      const deleted = cacheService.delete(key);

      // Then: 削除成功し、データが取得できない
      expect(deleted).toBe(true);
      expect(cacheService.get(key)).toBeNull();
    });

    it('存在しないキーの削除はfalseを返すこと', () => {
      // Given: 存在しないキー

      // When: 削除を試みる
      const deleted = cacheService.delete('non-existent');

      // Then: falseが返される
      expect(deleted).toBe(false);
    });
  });

  describe('TTL（Time To Live）機能', () => {
    it('カスタムTTLが適用されること', () => {
      // Given: 短いTTLでデータをセット
      const key = 'ttl-test';
      const data = { value: 'expires-soon' };
      const ttl = 1000; // 1秒

      // When: カスタムTTLでセット
      cacheService.set(key, data, ttl);

      // Then: 期限内はデータが取得できる
      expect(cacheService.get(key)).toEqual(data);

      // When: TTL経過後
      jest.advanceTimersByTime(1001);

      // Then: データが取得できない
      expect(cacheService.get(key)).toBeNull();
    });

    it('デフォルトTTLが適用されること', () => {
      // Given: TTLを指定せずにデータをセット
      const key = 'default-ttl-test';
      const data = { value: 'default-ttl' };

      // When: デフォルトTTLでセット
      cacheService.set(key, data);

      // Then: デフォルトTTL（5分）内はデータが取得できる
      jest.advanceTimersByTime(299999);
      expect(cacheService.get(key)).toEqual(data);

      // When: デフォルトTTL経過後
      jest.advanceTimersByTime(2);

      // Then: データが取得できない
      expect(cacheService.get(key)).toBeNull();
    });

    it('TTLが0の場合は永続的にキャッシュされること', () => {
      // Given: TTL 0でデータをセット
      const key = 'no-expire-test';
      const data = { value: 'never-expires' };

      // When: TTL 0でセット
      cacheService.set(key, data, 0);

      // Then: 長時間経過してもデータが取得できる
      jest.advanceTimersByTime(3600000); // 1時間
      expect(cacheService.get(key)).toEqual(data);
    });
  });

  describe('キャッシュクリーンアップ機能', () => {
    it('期限切れエントリが定期的にクリーンアップされること', () => {
      // Given: 短いTTLのエントリを複数作成
      for (let i = 0; i < 5; i++) {
        cacheService.set(`expired-${i}`, { value: i }, 1000);
      }
      // 長いTTLのエントリも作成
      cacheService.set('valid-entry', { value: 'valid' }, 120000);

      // When: TTL経過後、クリーンアップタスクが実行される
      jest.advanceTimersByTime(61000); // 1分1秒

      // Then: 期限切れエントリは削除される
      for (let i = 0; i < 5; i++) {
        expect(cacheService.get(`expired-${i}`)).toBeNull();
      }
      // 有効なエントリは残る
      expect(cacheService.get('valid-entry')).toEqual({ value: 'valid' });

      // ログが出力される
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up'),
        expect.objectContaining({ component: 'cache-service' })
      );
    });

    it('clearAllですべてのエントリがクリアされること', () => {
      // Given: 複数のエントリ
      for (let i = 0; i < 10; i++) {
        cacheService.set(`key-${i}`, { value: i });
      }

      // When: すべてクリア
      cacheService.clearAll();

      // Then: すべてのエントリが削除される
      for (let i = 0; i < 10; i++) {
        expect(cacheService.get(`key-${i}`)).toBeNull();
      }
    });
  });

  describe('LRU（Least Recently Used）エビクション', () => {
    it('最大サイズを超えた場合にLRUエビクションが発生すること', () => {
      // Given: maxSizeを小さく設定（テスト用に10に設定）
      cacheService.setMaxSize(10);

      // When: maxSizeを超えるエントリを追加
      for (let i = 0; i < 15; i++) {
        cacheService.set(`lru-test-${i}`, { value: i });
      }

      // Then: キャッシュサイズがmaxSize以下になる
      const stats = cacheService.getStats();
      expect(stats.totalKeys).toBeLessThanOrEqual(10);

      // ログが出力される
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Evicted'),
        expect.objectContaining({ component: 'cache-service' })
      );
    });

    it('ヒット数の少ないエントリが優先的にエビクションされること', () => {
      // Given: maxSizeを10に設定
      cacheService.setMaxSize(10);

      // 最初の5つのエントリを頻繁にアクセス
      for (let i = 0; i < 5; i++) {
        cacheService.set(`popular-${i}`, { value: i });
        // 複数回アクセスしてヒット数を増やす
        for (let j = 0; j < 5; j++) {
          cacheService.get(`popular-${i}`);
        }
      }

      // 次の10個のエントリはアクセスしない
      for (let i = 0; i < 10; i++) {
        cacheService.set(`unpopular-${i}`, { value: i });
      }

      // Then: 人気のあるエントリは残り、人気のないエントリが削除される
      for (let i = 0; i < 5; i++) {
        expect(cacheService.get(`popular-${i}`)).not.toBeNull();
      }
    });
  });

  describe('キャッシュ統計機能', () => {
    it('ヒット率が正しく計算されること', () => {
      // Given: いくつかのエントリ
      cacheService.set('hit-1', { value: 1 });
      cacheService.set('hit-2', { value: 2 });

      // When: ヒットとミスを発生させる
      cacheService.get('hit-1'); // ヒット
      cacheService.get('hit-2'); // ヒット
      cacheService.get('miss-1'); // ミス
      cacheService.get('miss-2'); // ミス

      // Then: 統計が正しい
      const stats = cacheService.getStats();
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('トップキーが正しく追跡されること', () => {
      // Given: 異なるアクセス頻度のエントリ
      cacheService.set('frequent', { value: 'accessed-often' });
      cacheService.set('rare', { value: 'accessed-rarely' });

      // When: 異なる頻度でアクセス
      for (let i = 0; i < 10; i++) {
        cacheService.get('frequent');
      }
      cacheService.get('rare');

      // Then: トップキーに頻繁にアクセスされたキーが含まれる
      const stats = cacheService.getStats();
      const topKey = stats.topKeys.find(k => k.key === 'frequent');
      expect(topKey).toBeDefined();
      expect(topKey!.hits).toBe(10);
    });

    it('メモリ使用量が推定されること', () => {
      // Given: 大きなデータ
      const largeData = {
        array: Array(1000).fill('test-data'),
        nested: { deep: { structure: { with: 'values' } } }
      };
      cacheService.set('large-data', largeData);

      // When: 統計を取得
      const stats = cacheService.getStats();

      // Then: メモリ使用量が0より大きい
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('キー生成機能', () => {
    it('generateKeyが一貫したキーを生成すること', () => {
      // Given: 同じパラメータ
      const prefix = 'api';
      const params1 = { userId: '123', action: 'read' };
      const params2 = { action: 'read', userId: '123' }; // 順序が異なる

      // When: キーを生成
      const key1 = cacheService.generateKey(prefix, params1);
      const key2 = cacheService.generateKey(prefix, params2);

      // Then: 同じキーが生成される（順序に依存しない）
      expect(key1).toBe(key2);
    });

    it('異なるパラメータで異なるキーが生成されること', () => {
      // Given: 異なるパラメータ
      const prefix = 'api';
      const params1 = { userId: '123' };
      const params2 = { userId: '456' };

      // When: キーを生成
      const key1 = cacheService.generateKey(prefix, params1);
      const key2 = cacheService.generateKey(prefix, params2);

      // Then: 異なるキーが生成される
      expect(key1).not.toBe(key2);
    });

    it('複雑なオブジェクトもキーに変換できること', () => {
      // Given: 複雑なパラメータ
      const prefix = 'complex';
      const params = {
        filters: { status: 'active', level: [1, 2, 3] },
        sort: { field: 'name', order: 'asc' },
        pagination: { page: 1, limit: 20 }
      };

      // When: キーを生成
      const key = cacheService.generateKey(prefix, params);

      // Then: キーが生成される
      expect(key).toContain('complex:');
      expect(key).toContain('filters=');
      expect(key).toContain('sort=');
      expect(key).toContain('pagination=');
    });
  });

  describe('プレフィックスベースの操作', () => {
    it('getByPrefixで特定プレフィックスのエントリを取得できること', () => {
      // Given: 同じプレフィックスの複数エントリ
      cacheService.set('user:123:profile', { name: 'Alice' });
      cacheService.set('user:123:settings', { theme: 'dark' });
      cacheService.set('user:456:profile', { name: 'Bob' });
      cacheService.set('post:789', { title: 'Test' });

      // When: プレフィックスで取得
      const userEntries = cacheService.getByPrefix('user:123');

      // Then: マッチするエントリのみ取得される
      expect(userEntries).toHaveLength(2);
      expect(userEntries).toContainEqual(
        expect.objectContaining({ key: 'user:123:profile' })
      );
      expect(userEntries).toContainEqual(
        expect.objectContaining({ key: 'user:123:settings' })
      );
    });

    it('deleteByPrefixで特定プレフィックスのエントリを削除できること', () => {
      // Given: 同じプレフィックスの複数エントリ
      cacheService.set('session:abc:data', { data: 1 });
      cacheService.set('session:abc:user', { user: 'test' });
      cacheService.set('session:xyz:data', { data: 2 });

      // When: プレフィックスで削除
      const deleted = cacheService.deleteByPrefix('session:abc');

      // Then: マッチするエントリのみ削除される
      expect(deleted).toBe(2);
      expect(cacheService.get('session:abc:data')).toBeNull();
      expect(cacheService.get('session:abc:user')).toBeNull();
      expect(cacheService.get('session:xyz:data')).not.toBeNull();
    });
  });

  describe('TRPGデータのキャッシュ', () => {
    it('キャンペーンデータを効率的にキャッシュできること', () => {
      // Given: TRPGキャンペーンデータ
      const campaign: Partial<TRPGCampaign> = {
        id: 'camp-001',
        name: 'Epic Quest',
        status: 'active',
        currentLevel: 10,
        characters: ['char-1', 'char-2', 'char-3']
      };

      // When: キャンペーンをキャッシュ
      const key = cacheService.generateKey('campaign', { id: campaign.id });
      cacheService.set(key, campaign);

      // Then: キャンペーンが取得できる
      const cached = cacheService.get<Partial<TRPGCampaign>>(key);
      expect(cached).toEqual(campaign);
    });

    it('キャラクターリストを効率的にキャッシュできること', () => {
      // Given: 複数のキャラクター
      const characters: Partial<TRPGCharacter>[] = [
        { id: 'char-1', name: 'Aragorn', level: 15, characterType: 'pc' },
        { id: 'char-2', name: 'Gandalf', level: 20, characterType: 'npc' },
        { id: 'char-3', name: 'Legolas', level: 12, characterType: 'pc' }
      ];

      // When: キャラクターリストをキャッシュ
      const key = cacheService.generateKey('characters', { 
        campaignId: 'camp-001',
        type: 'all' 
      });
      cacheService.set(key, characters, 600000); // 10分のTTL

      // Then: リストが取得できる
      const cached = cacheService.get<Partial<TRPGCharacter>[]>(key);
      expect(cached).toEqual(characters);
      expect(cached).toHaveLength(3);
    });
  });

  describe('エラーハンドリング', () => {
    it('巨大なデータでもエラーなくキャッシュできること', () => {
      // Given: 非常に大きなデータ
      const hugeData = {
        array: Array(10000).fill({ 
          id: 'test',
          data: 'x'.repeat(1000)
        })
      };

      // When/Then: エラーなくキャッシュできる
      expect(() => {
        cacheService.set('huge-data', hugeData);
      }).not.toThrow();

      // データも正しく取得できる
      const cached = cacheService.get('huge-data');
      expect(cached).toBeDefined();
    });

    it('循環参照を含むオブジェクトも安全に処理できること', () => {
      // Given: 循環参照を含むオブジェクト
      const circular: any = { name: 'test' };
      circular.self = circular;

      // When: キャッシュを試みる
      const result = cacheService.safeSet('circular-key', circular);

      // Then: エラーが適切に処理される
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cache'),
        expect.any(Object)
      );
    });
  });

  describe('パフォーマンス最適化', () => {
    it('大量のエントリでも高速に動作すること', () => {
      // Given: パフォーマンステスト用の設定
      cacheService.setMaxSize(5000);

      // When: 大量のエントリを追加
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        cacheService.set(`perf-test-${i}`, { 
          index: i,
          data: `test-data-${i}`
        });
      }
      const insertTime = Date.now() - startTime;

      // Then: 挿入が高速（1秒以内）
      expect(insertTime).toBeLessThan(1000);

      // When: ランダムアクセス
      const accessStart = Date.now();
      for (let i = 0; i < 100; i++) {
        const randomIndex = Math.floor(Math.random() * 1000);
        cacheService.get(`perf-test-${randomIndex}`);
      }
      const accessTime = Date.now() - accessStart;

      // Then: アクセスも高速（100ms以内）
      expect(accessTime).toBeLessThan(100);
    });
  });

  describe('stopメソッド', () => {
    it('stopでクリーンアップタスクが停止されること', () => {
      // Given: 実行中のキャッシュサービス
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // When: stopを呼ぶ
      cacheService.stop();

      // Then: インターバルがクリアされる
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });
  });
});