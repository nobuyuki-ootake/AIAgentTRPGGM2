/**
 * パフォーマンス測定・最適化ユーティリティの包括的テスト
 * Performance Measurement and Optimization Utilities Comprehensive Tests
 * 
 * テスト対象:
 * - 実行時間測定
 * - メモリ使用量監視
 * - ベンチマーク実行
 * - パフォーマンス分析
 * - 最適化ヘルパー（メモ化、スロットリング、デバウンス）
 * - リソース監視
 */

import {
  measureExecutionTime,
  measureAsyncExecutionTime,
  getMemoryInfo,
  formatMemorySize,
  runBenchmark,
  compareBenchmark,
  PerformanceProfiler,
  memoize,
  throttle,
  debounce,
  ResourceMonitor,
  createPerformanceAlert,
  generatePerformanceReport,
  type PerformanceMetrics,
  type BenchmarkResult,
  type MemoryInfo
} from '../utils/performance';

// ==========================================
// テストヘルパー関数
// ==========================================

function createMockOperation(duration: number = 10) {
  return () => {
    const start = Date.now();
    while (Date.now() - start < duration) {
      // Busy wait
    }
    return 'result';
  };
}

async function createAsyncMockOperation(duration: number = 10) {
  return new Promise<string>(resolve => {
    setTimeout(() => resolve('async result'), duration);
  });
}

function createMemoryIntensiveOperation() {
  return () => {
    // 大きな配列を作成してメモリを消費
    const largeArray = new Array(100000).fill('memory test');
    return largeArray.length;
  };
}

// ==========================================
// テストスイート
// ==========================================

describe('パフォーマンス測定・最適化ユーティリティの包括的テスト', () => {

  describe('実行時間測定', () => {
    test('同期関数の実行時間測定', () => {
      const operation = createMockOperation(50);
      const { result, metrics } = measureExecutionTime(operation, 'Test Operation');
      
      expect(result).toBe('result');
      expect(metrics.operationName).toBe('Test Operation');
      expect(metrics.executionTime).toBeGreaterThan(40);
      expect(metrics.executionTime).toBeLessThan(100);
      expect(metrics.timestamp).toBeGreaterThan(0);
      expect(typeof metrics.timestamp).toBe('number');
    });

    test('非同期関数の実行時間測定', async () => {
      const operation = () => createAsyncMockOperation(30);
      const { result, metrics } = await measureAsyncExecutionTime(operation, 'Async Test');
      
      expect(result).toBe('async result');
      expect(metrics.operationName).toBe('Async Test');
      expect(metrics.executionTime).toBeGreaterThan(25);
      expect(metrics.executionTime).toBeLessThan(60);
    });

    test('エラーが発生した場合の処理', () => {
      const errorOperation = () => {
        throw new Error('Test error');
      };
      
      expect(() => measureExecutionTime(errorOperation, 'Error Test')).toThrow('Test error');
    });

    test('非同期エラーの処理', async () => {
      const asyncErrorOperation = async () => {
        throw new Error('Async test error');
      };
      
      await expect(
        measureAsyncExecutionTime(asyncErrorOperation, 'Async Error Test')
      ).rejects.toThrow('Async test error');
    });

    test('匿名操作のデフォルト名', () => {
      const { metrics } = measureExecutionTime(() => 'test');
      expect(metrics.operationName).toBe('Anonymous Operation');
    });

    test('メタデータの含有', () => {
      const { metrics } = measureExecutionTime(createMockOperation(10), 'Metadata Test');
      
      expect(metrics.metadata).toBeDefined();
      expect(metrics.metadata?.startMemory).toBeDefined();
      expect(metrics.metadata?.endMemory).toBeDefined();
    });

    test('極端に短い実行時間の測定', () => {
      const { metrics } = measureExecutionTime(() => 1 + 1, 'Fast Operation');
      
      expect(metrics.executionTime).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.executionTime).toBe('number');
    });

    test('極端に長い実行時間の測定', () => {
      const longOperation = createMockOperation(200);
      const { metrics } = measureExecutionTime(longOperation, 'Long Operation');
      
      expect(metrics.executionTime).toBeGreaterThan(150);
      expect(metrics.executionTime).toBeLessThan(300);
    });
  });

  describe('メモリ使用量監視', () => {
    test('メモリ情報の取得', () => {
      const memInfo = getMemoryInfo();
      
      if (memInfo) {
        expect(typeof memInfo.used).toBe('number');
        expect(typeof memInfo.total).toBe('number');
        expect(memInfo.used).toBeGreaterThan(0);
        expect(memInfo.total).toBeGreaterThanOrEqual(memInfo.used);
      } else {
        // メモリ情報が取得できない環境では undefined を返す
        expect(memInfo).toBeUndefined();
      }
    });

    test('メモリサイズのフォーマット', () => {
      expect(formatMemorySize(0)).toBe('0.00 B');
      expect(formatMemorySize(512)).toBe('512.00 B');
      expect(formatMemorySize(1024)).toBe('1.00 KB');
      expect(formatMemorySize(1024 * 1024)).toBe('1.00 MB');
      expect(formatMemorySize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(formatMemorySize(1536)).toBe('1.50 KB'); // 1.5KB
    });

    test('大きなメモリ値のフォーマット', () => {
      const gigabyte = 1024 * 1024 * 1024;
      expect(formatMemorySize(2.5 * gigabyte)).toBe('2.50 GB');
      expect(formatMemorySize(1000 * gigabyte)).toBe('1000.00 GB');
    });

    test('小数点以下の精度', () => {
      expect(formatMemorySize(1536)).toBe('1.50 KB');
      expect(formatMemorySize(1700)).toBe('1.66 KB');
    });

    test('メモリ使用量を伴う操作の測定', () => {
      const memoryIntensiveOp = createMemoryIntensiveOperation();
      const { metrics } = measureExecutionTime(memoryIntensiveOp, 'Memory Test');
      
      expect(metrics.metadata?.memoryDelta).toBeDefined();
      if (metrics.metadata?.memoryDelta) {
        expect(typeof metrics.metadata.memoryDelta.used).toBe('number');
        expect(typeof metrics.metadata.memoryDelta.total).toBe('number');
      }
    });
  });

  describe('ベンチマーク実行', () => {
    test('基本的なベンチマーク実行', async () => {
      const operation = () => Math.random() * 100;
      const result = await runBenchmark(operation, {
        iterations: 50,
        operationName: 'Random Number Generation'
      });
      
      expect(result.operationName).toBe('Random Number Generation');
      expect(result.iterations).toBe(50);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.minTime).toBeLessThanOrEqual(result.averageTime);
      expect(result.maxTime).toBeGreaterThanOrEqual(result.averageTime);
      expect(result.standardDeviation).toBeGreaterThanOrEqual(0);
      expect(result.operationsPerSecond).toBeGreaterThan(0);
      expect(result.totalTime).toBeGreaterThan(0);
    });

    test('非同期操作のベンチマーク', async () => {
      const asyncOperation = () => createAsyncMockOperation(5);
      const result = await runBenchmark(asyncOperation, {
        iterations: 10,
        operationName: 'Async Operation'
      });
      
      expect(result.operationName).toBe('Async Operation');
      expect(result.iterations).toBe(10);
      expect(result.averageTime).toBeGreaterThan(4);
    });

    test('ウォームアップイテレーションの効果', async () => {
      let callCount = 0;
      const countingOperation = () => {
        callCount++;
        return callCount;
      };
      
      await runBenchmark(countingOperation, {
        iterations: 5,
        warmupIterations: 3
      });
      
      expect(callCount).toBe(8); // 3 warmup + 5 actual
    });

    test('最大実行時間の制限', async () => {
      const slowOperation = () => createAsyncMockOperation(100);
      const startTime = Date.now();
      
      const result = await runBenchmark(slowOperation, {
        iterations: 100,
        maxDuration: 300 // 300ms制限
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // 多少のマージンを考慮
      expect(result.iterations).toBeLessThan(100); // 制限により少ない回数
    });

    test('メモリ情報を含むベンチマーク', async () => {
      const operation = createMemoryIntensiveOperation();
      const result = await runBenchmark(operation, {
        iterations: 5,
        includeMemoryInfo: true
      });
      
      if (result.memoryInfo) {
        expect(typeof result.memoryInfo.used).toBe('number');
        expect(typeof result.memoryInfo.total).toBe('number');
      }
    });

    test('エラーが発生する操作のベンチマーク', async () => {
      const errorOperation = () => {
        if (Math.random() > 0.5) {
          throw new Error('Random error');
        }
        return 'success';
      };
      
      // エラーが発生してもベンチマークは完了する
      const result = await runBenchmark(errorOperation, {
        iterations: 20
      });
      
      expect(result.iterations).toBe(20);
      expect(result.averageTime).toBeGreaterThan(0);
    });

    test('ベンチマーク統計の妥当性', async () => {
      const variableOperation = () => {
        const delay = Math.random() * 10;
        const start = Date.now();
        while (Date.now() - start < delay) {}
        return delay;
      };
      
      const result = await runBenchmark(variableOperation, {
        iterations: 50
      });
      
      expect(result.minTime).toBeLessThanOrEqual(result.averageTime);
      expect(result.maxTime).toBeGreaterThanOrEqual(result.averageTime);
      expect(result.standardDeviation).toBeGreaterThan(0); // 変動があるはず
      expect(result.totalTime).toBeCloseTo(result.averageTime * result.iterations, -1);
    });
  });

  describe('比較ベンチマーク', () => {
    test('複数操作の比較ベンチマーク', async () => {
      const operations = [
        {
          name: 'Fast Operation',
          operation: () => 1 + 1
        },
        {
          name: 'Medium Operation',
          operation: createMockOperation(5)
        },
        {
          name: 'Slow Operation',
          operation: createMockOperation(15)
        }
      ];
      
      const results = await compareBenchmark(operations, {
        iterations: 20
      });
      
      expect(results).toHaveLength(3);
      
      // 相対性能が正しく計算されているか
      const fastResult = results.find(r => r.operationName === 'Fast Operation');
      const slowResult = results.find(r => r.operationName === 'Slow Operation');
      
      expect(fastResult?.relativePerformance).toBeGreaterThan(slowResult?.relativePerformance || 0);
      
      // 最高性能の操作は relativePerformance が 1.0
      const bestPerformance = Math.max(...results.map(r => r.relativePerformance));
      expect(bestPerformance).toBeCloseTo(1.0, 2);
    });

    test('同等性能の操作の比較', async () => {
      const operations = [
        { name: 'Op1', operation: () => Math.sqrt(16) },
        { name: 'Op2', operation: () => 4 * 1 },
        { name: 'Op3', operation: () => 2 + 2 }
      ];
      
      const results = await compareBenchmark(operations, {
        iterations: 30
      });
      
      // すべての操作が似たような性能を持つはず
      results.forEach(result => {
        expect(result.relativePerformance).toBeGreaterThan(0.5);
      });
    });
  });

  describe('パフォーマンスプロファイラー', () => {
    test('基本的なプロファイリング', async () => {
      const profiler = new PerformanceProfiler('Test Profile');
      
      await profiler.recordOperation('Operation 1', createMockOperation(20));
      await profiler.recordOperation('Operation 2', createMockOperation(10));
      await profiler.recordOperation('Operation 3', createMockOperation(30));
      
      const profile = profiler.generateProfile();
      
      expect(profile.profileName).toBe('Test Profile');
      expect(profile.operations).toHaveLength(3);
      expect(profile.totalExecutionTime).toBeGreaterThan(0);
      expect(profile.criticalPath).toHaveLength(3); // 最大5件だが3件のみ
      expect(profile.bottlenecks).toHaveLength(3);
    });

    test('クリティカルパスの特定', async () => {
      const profiler = new PerformanceProfiler();
      
      await profiler.recordOperation('Fast', createMockOperation(5));
      await profiler.recordOperation('Slow', createMockOperation(50));
      await profiler.recordOperation('Medium', createMockOperation(20));
      
      const profile = profiler.generateProfile();
      
      // 最も遅い操作が先頭にくる
      expect(profile.criticalPath[0]).toBe('Slow');
      expect(profile.criticalPath[1]).toBe('Medium');
      expect(profile.criticalPath[2]).toBe('Fast');
    });

    test('ボトルネック分析', async () => {
      const profiler = new PerformanceProfiler();
      
      await profiler.recordOperation('Major Bottleneck', createMockOperation(80));
      await profiler.recordOperation('Minor Operation', createMockOperation(10));
      
      const profile = profiler.generateProfile();
      
      const majorBottleneck = profile.bottlenecks.find(b => b.operation === 'Major Bottleneck');
      expect(majorBottleneck?.percentage).toBeGreaterThan(80);
      expect(majorBottleneck?.suggestion).toContain('Consider breaking down');
    });

    test('最適化提案の生成', async () => {
      const profiler = new PerformanceProfiler();
      
      // 異なる実行時間で異なる提案をテスト
      await profiler.recordOperation('Very Slow', createMockOperation(1200)); // > 1000ms
      await profiler.recordOperation('Moderate', createMockOperation(150));   // > 100ms
      await profiler.recordOperation('Fast', createMockOperation(5));         // < 100ms
      
      const profile = profiler.generateProfile();
      
      const verySlowBottleneck = profile.bottlenecks.find(b => b.operation === 'Very Slow');
      const moderateBottleneck = profile.bottlenecks.find(b => b.operation === 'Moderate');
      const fastBottleneck = profile.bottlenecks.find(b => b.operation === 'Fast');
      
      expect(verySlowBottleneck?.suggestion).toContain('breaking down');
      expect(moderateBottleneck?.suggestion).toContain('optimizing algorithm');
      expect(fastBottleneck?.suggestion).toContain('acceptable');
    });

    test('プロファイラーのリセット', async () => {
      const profiler = new PerformanceProfiler();
      
      await profiler.recordOperation('Before Reset', createMockOperation(10));
      profiler.reset();
      await profiler.recordOperation('After Reset', createMockOperation(10));
      
      const profile = profiler.generateProfile();
      
      expect(profile.operations).toHaveLength(1);
      expect(profile.operations[0].operationName).toBe('After Reset');
    });

    test('非同期操作のプロファイリング', async () => {
      const profiler = new PerformanceProfiler();
      
      await profiler.recordOperation('Async Op 1', () => createAsyncMockOperation(20));
      await profiler.recordOperation('Async Op 2', () => createAsyncMockOperation(30));
      
      const profile = profiler.generateProfile();
      
      expect(profile.operations).toHaveLength(2);
      expect(profile.operations.every(op => op.executionTime > 15)).toBe(true);
    });
  });

  describe('最適化ヘルパー', () => {
    describe('メモ化', () => {
      test('基本的なメモ化機能', () => {
        let callCount = 0;
        const expensiveFunction = (x: number) => {
          callCount++;
          return x * x;
        };
        
        const memoizedFunction = memoize(expensiveFunction);
        
        expect(memoizedFunction(5)).toBe(25);
        expect(memoizedFunction(5)).toBe(25); // キャッシュから取得
        expect(callCount).toBe(1); // 1回だけ呼ばれる
        
        expect(memoizedFunction(3)).toBe(9);
        expect(callCount).toBe(2); // 新しい引数で1回追加
      });

      test('カスタムキージェネレーター', () => {
        let callCount = 0;
        const complexFunction = (obj: { x: number; y: number }) => {
          callCount++;
          return obj.x + obj.y;
        };
        
        const memoizedFunction = memoize(complexFunction, {
          keyGenerator: (obj) => `${obj.x}-${obj.y}`
        });
        
        expect(memoizedFunction({ x: 1, y: 2 })).toBe(3);
        expect(memoizedFunction({ x: 1, y: 2 })).toBe(3); // キャッシュから
        expect(callCount).toBe(1);
      });

      test('TTL（生存時間）の動作', () => {
        jest.useFakeTimers();
        
        let callCount = 0;
        const timedFunction = (x: number) => {
          callCount++;
          return x * 2;
        };
        
        const memoizedFunction = memoize(timedFunction, {
          ttl: 1000 // 1秒
        });
        
        expect(memoizedFunction(5)).toBe(10);
        expect(callCount).toBe(1);
        
        // 500ms経過（TTL内）
        jest.advanceTimersByTime(500);
        expect(memoizedFunction(5)).toBe(10); // キャッシュから
        expect(callCount).toBe(1);
        
        // 1200ms経過（TTL超過）
        jest.advanceTimersByTime(700);
        expect(memoizedFunction(5)).toBe(10); // 再計算
        expect(callCount).toBe(2);
        
        jest.useRealTimers();
      });

      test('最大キャッシュサイズの制限', () => {
        let callCount = 0;
        const testFunction = (x: number) => {
          callCount++;
          return x;
        };
        
        const memoizedFunction = memoize(testFunction, {
          maxSize: 2
        });
        
        memoizedFunction(1);
        memoizedFunction(2);
        memoizedFunction(3); // これでキャッシュサイズが制限を超える
        
        expect(callCount).toBe(3);
        
        // 最初のキャッシュエントリが削除されているはず
        memoizedFunction(1); // 再計算される
        expect(callCount).toBe(4);
        
        // 最近のエントリはキャッシュされている
        memoizedFunction(3);
        expect(callCount).toBe(4); // 増加しない
      });
    });

    describe('スロットリング', () => {
      test('基本的なスロットリング機能', () => {
        jest.useFakeTimers();
        
        let callCount = 0;
        const testFunction = () => {
          callCount++;
          return callCount;
        };
        
        const throttledFunction = throttle(testFunction, 100);
        
        // 即座に実行される
        throttledFunction();
        expect(callCount).toBe(1);
        
        // 遅延時間内での呼び出しは実行されない
        throttledFunction();
        throttledFunction();
        expect(callCount).toBe(1);
        
        // 遅延時間経過後は実行される
        jest.advanceTimersByTime(150);
        expect(callCount).toBe(2); // タイマーによる実行
        
        jest.useRealTimers();
      });

      test('複数回の遅延実行', () => {
        jest.useFakeTimers();
        
        let callCount = 0;
        const testFunction = () => {
          callCount++;
        };
        
        const throttledFunction = throttle(testFunction, 100);
        
        throttledFunction(); // 即座に実行
        expect(callCount).toBe(1);
        
        // 短期間に複数回呼び出し
        for (let i = 0; i < 5; i++) {
          throttledFunction();
        }
        expect(callCount).toBe(1); // まだ1回のみ
        
        // 時間経過後に1回だけ追加実行
        jest.advanceTimersByTime(150);
        expect(callCount).toBe(2);
        
        jest.useRealTimers();
      });
    });

    describe('デバウンス', () => {
      test('基本的なデバウンス機能', () => {
        jest.useFakeTimers();
        
        let callCount = 0;
        const testFunction = () => {
          callCount++;
        };
        
        const debouncedFunction = debounce(testFunction, 100);
        
        // 連続して呼び出し
        debouncedFunction();
        debouncedFunction();
        debouncedFunction();
        
        // まだ実行されない
        expect(callCount).toBe(0);
        
        // 遅延時間経過後に1回だけ実行
        jest.advanceTimersByTime(150);
        expect(callCount).toBe(1);
        
        jest.useRealTimers();
      });

      test('タイマーリセットの動作', () => {
        jest.useFakeTimers();
        
        let callCount = 0;
        const testFunction = () => {
          callCount++;
        };
        
        const debouncedFunction = debounce(testFunction, 100);
        
        debouncedFunction();
        
        // 50ms後に再度呼び出し（タイマーリセット）
        jest.advanceTimersByTime(50);
        debouncedFunction();
        
        // 最初の100ms経過時点では実行されない
        jest.advanceTimersByTime(50);
        expect(callCount).toBe(0);
        
        // 2回目の呼び出しから100ms経過で実行
        jest.advanceTimersByTime(50);
        expect(callCount).toBe(1);
        
        jest.useRealTimers();
      });
    });
  });

  describe('リソース監視', () => {
    test('基本的なリソース監視', () => {
      jest.useFakeTimers();
      
      const monitor = new ResourceMonitor(100); // 100msサンプリング
      
      monitor.start();
      expect(monitor.getSummary().sampleCount).toBe(0);
      
      // 250ms経過（2〜3サンプル）
      jest.advanceTimersByTime(250);
      
      const summary = monitor.getSummary();
      expect(summary.sampleCount).toBeGreaterThan(0);
      expect(summary.duration).toBeGreaterThan(0);
      
      monitor.stop();
      jest.useRealTimers();
    });

    test('監視の開始・停止', () => {
      const monitor = new ResourceMonitor(50);
      
      // 重複開始の防止
      monitor.start();
      monitor.start(); // 2回目は無視される
      
      // 停止
      monitor.stop();
      
      // 重複停止の防止
      monitor.stop(); // 2回目は無視される
      
      // 再開
      monitor.start();
      monitor.stop();
    });

    test('サンプル数の制限', () => {
      jest.useFakeTimers();
      
      const monitor = new ResourceMonitor(10); // 短いサンプリング間隔
      
      monitor.start();
      
      // 大量のサンプルを生成
      jest.advanceTimersByTime(1500); // 150サンプル相当
      
      const summary = monitor.getSummary();
      expect(summary.sampleCount).toBeLessThanOrEqual(100); // 最大100件
      
      monitor.stop();
      jest.useRealTimers();
    });

    test('リセット機能', () => {
      jest.useFakeTimers();
      
      const monitor = new ResourceMonitor(50);
      
      monitor.start();
      jest.advanceTimersByTime(200);
      
      expect(monitor.getSummary().sampleCount).toBeGreaterThan(0);
      
      monitor.reset();
      expect(monitor.getSummary().sampleCount).toBe(0);
      
      monitor.stop();
      jest.useRealTimers();
    });

    test('メモリサマリーの計算', () => {
      jest.useFakeTimers();
      
      // モックメモリ情報を設定
      const originalGetMemoryInfo = jest.fn();
      
      const monitor = new ResourceMonitor(50);
      monitor.start();
      
      jest.advanceTimersByTime(200);
      
      const summary = monitor.getSummary();
      
      // メモリ情報が利用可能な場合の構造チェック
      expect(summary.memoryUsage).toBeDefined();
      expect(summary.memoryUsage.current).toBeDefined();
      expect(summary.memoryUsage.peak).toBeDefined();
      expect(summary.memoryUsage.average).toBeDefined();
      
      monitor.stop();
      jest.useRealTimers();
    });
  });

  describe('ユーティリティ関数', () => {
    test('パフォーマンスアラートの作成', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const alert = createPerformanceAlert({
        warning: 100,
        critical: 500
      });
      
      // 警告レベル
      const warningMetrics: PerformanceMetrics = {
        operationName: 'Slow Operation',
        executionTime: 200,
        timestamp: Date.now()
      };
      alert(warningMetrics);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Performance warning in Slow Operation: 200.00ms')
      );
      
      // クリティカルレベル
      const criticalMetrics: PerformanceMetrics = {
        operationName: 'Very Slow Operation',
        executionTime: 800,
        timestamp: Date.now()
      };
      alert(criticalMetrics);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Critical performance issue in Very Slow Operation: 800.00ms')
      );
      
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    test('パフォーマンスレポートの生成', () => {
      const metrics: PerformanceMetrics[] = [
        {
          operationName: 'Fast Op',
          executionTime: 10,
          timestamp: Date.now(),
          memoryUsage: { used: 1000, total: 2000 }
        },
        {
          operationName: 'Slow Op',
          executionTime: 100,
          timestamp: Date.now(),
          memoryUsage: { used: 5000, total: 8000 }
        },
        {
          operationName: 'Medium Op',
          executionTime: 50,
          timestamp: Date.now()
        }
      ];
      
      const report = generatePerformanceReport(metrics, {
        includeDetails: true,
        sortBy: 'time'
      });
      
      expect(report).toContain('Performance Report');
      expect(report).toContain('Total Operations: 3');
      expect(report).toContain('Total Time: 160.00ms');
      expect(report).toContain('Average Time: 53.33ms');
      expect(report).toContain('Detailed Breakdown:');
      expect(report).toContain('Slow Op'); // 最も遅い操作が先頭
    });

    test('空のメトリクスでのレポート生成', () => {
      const report = generatePerformanceReport([]);
      expect(report).toBe('No performance metrics available.');
    });

    test('名前でソートしたレポート', () => {
      const metrics: PerformanceMetrics[] = [
        { operationName: 'Zebra', executionTime: 10, timestamp: Date.now() },
        { operationName: 'Alpha', executionTime: 20, timestamp: Date.now() },
        { operationName: 'Beta', executionTime: 15, timestamp: Date.now() }
      ];
      
      const report = generatePerformanceReport(metrics, {
        includeDetails: true,
        sortBy: 'name'
      });
      
      const lines = report.split('\n');
      const alphaIndex = lines.findIndex(line => line.includes('Alpha'));
      const betaIndex = lines.findIndex(line => line.includes('Beta'));
      const zebraIndex = lines.findIndex(line => line.includes('Zebra'));
      
      expect(alphaIndex).toBeLessThan(betaIndex);
      expect(betaIndex).toBeLessThan(zebraIndex);
    });

    test('メモリでソートしたレポート', () => {
      const metrics: PerformanceMetrics[] = [
        {
          operationName: 'Low Memory',
          executionTime: 10,
          timestamp: Date.now(),
          memoryUsage: { used: 1000, total: 2000 }
        },
        {
          operationName: 'High Memory',
          executionTime: 10,
          timestamp: Date.now(),
          memoryUsage: { used: 5000, total: 8000 }
        }
      ];
      
      const report = generatePerformanceReport(metrics, {
        includeDetails: true,
        sortBy: 'memory'
      });
      
      const lines = report.split('\n');
      const highMemoryIndex = lines.findIndex(line => line.includes('High Memory'));
      const lowMemoryIndex = lines.findIndex(line => line.includes('Low Memory'));
      
      expect(highMemoryIndex).toBeLessThan(lowMemoryIndex);
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('ゼロ時間の操作', () => {
      const instantOperation = () => null;
      const { metrics } = measureExecutionTime(instantOperation);
      
      expect(metrics.executionTime).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.executionTime).toBe('number');
    });

    test('メモリ情報が利用できない環境', () => {
      // getMemoryInfo が undefined を返すケースをテスト
      const memInfo = getMemoryInfo();
      
      // 環境によってはundefinedまたは有効な値
      if (memInfo === undefined) {
        expect(memInfo).toBeUndefined();
      } else {
        expect(typeof memInfo.used).toBe('number');
        expect(typeof memInfo.total).toBe('number');
      }
    });

    test('ベンチマークでのエラー処理', async () => {
      const alwaysErrorOperation = () => {
        throw new Error('Always fails');
      };
      
      const result = await runBenchmark(alwaysaysErrorOperation, {
        iterations: 3
      });
      
      expect(result.iterations).toBe(3);
      expect(result.averageTime).toBeGreaterThan(0);
    });

    test('空のベンチマーク結果', async () => {
      // 実行時間制限を極端に短くして完了イテレーションをゼロにする
      await expect(
        runBenchmark(() => createAsyncMockOperation(1000), {
          iterations: 10,
          maxDuration: 1 // 1ms制限
        })
      ).rejects.toThrow('No successful iterations completed');
    });

    test('異常な入力値の処理', () => {
      expect(formatMemorySize(-100)).toBe('-100.00 B');
      expect(formatMemorySize(0)).toBe('0.00 B');
      expect(formatMemorySize(Infinity)).toBe('Infinity B');
    });

    test('プロファイラーでの空操作', () => {
      const profiler = new PerformanceProfiler('Empty Profile');
      const profile = profiler.generateProfile();
      
      expect(profile.operations).toHaveLength(0);
      expect(profile.criticalPath).toHaveLength(0);
      expect(profile.bottlenecks).toHaveLength(0);
      expect(profile.totalExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量データでのベンチマーク', async () => {
      const heavyOperation = () => {
        const arr = new Array(10000);
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.random();
        }
        return arr.reduce((sum, val) => sum + val, 0);
      };
      
      const startTime = Date.now();
      const result = await runBenchmark(heavyOperation, {
        iterations: 10
      });
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10000); // 10秒以内
      expect(result.averageTime).toBeGreaterThan(0);
    });

    test('メモ化のパフォーマンス向上', () => {
      let callCount = 0;
      const expensiveOperation = (n: number): number => {
        callCount++;
        if (n <= 1) return 1;
        return n * expensiveOperation(n - 1);
      };
      
      const memoizedOperation = memoize(expensiveOperation);
      
      // 最初の計算
      const start1 = Date.now();
      memoizedOperation(10);
      const duration1 = Date.now() - start1;
      const callCount1 = callCount;
      
      // キャッシュされた計算
      callCount = 0;
      const start2 = Date.now();
      memoizedOperation(10);
      const duration2 = Date.now() - start2;
      const callCount2 = callCount;
      
      expect(callCount2).toBe(0); // キャッシュから取得
      expect(duration2).toBeLessThanOrEqual(duration1); // 高速化
    });

    test('リソース監視のオーバーヘッド', () => {
      jest.useFakeTimers();
      
      const monitor = new ResourceMonitor(10);
      const startTime = Date.now();
      
      monitor.start();
      jest.advanceTimersByTime(1000);
      monitor.stop();
      
      const overhead = Date.now() - startTime;
      expect(overhead).toBeLessThan(100); // 実際の処理時間は短いはず
      
      jest.useRealTimers();
    });
  });
});