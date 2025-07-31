/**
 * パフォーマンス測定・最適化ユーティリティ
 * Performance Measurement and Optimization Utilities
 * 
 * 提供機能:
 * - 実行時間測定
 * - メモリ使用量監視
 * - ベンチマーク実行
 * - パフォーマンス分析
 * - 最適化ヘルパー
 */

// ==========================================
// パフォーマンス測定インターフェース
// ==========================================

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage?: MemoryInfo;
  timestamp: number;
  operationName: string;
  metadata?: Record<string, any>;
}

export interface MemoryInfo {
  used: number;
  total: number;
  heapUsed?: number;
  heapTotal?: number;
  external?: number;
}

export interface BenchmarkResult {
  operationName: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  operationsPerSecond: number;
  memoryInfo?: MemoryInfo;
}

export interface PerformanceProfile {
  profileName: string;
  operations: PerformanceMetrics[];
  totalExecutionTime: number;
  criticalPath: string[];
  bottlenecks: Array<{
    operation: string;
    percentage: number;
    suggestion: string;
  }>;
}

// ==========================================
// 時間測定ユーティリティ
// ==========================================

/**
 * 高精度タイマー
 */
class HighResolutionTimer {
  private startTime: number = 0;
  private endTime: number = 0;
  private isRunning: boolean = false;

  start(): void {
    if (this.isRunning) {
      throw new Error('Timer is already running');
    }
    
    this.startTime = this.getCurrentTime();
    this.isRunning = true;
  }

  stop(): number {
    if (!this.isRunning) {
      throw new Error('Timer is not running');
    }
    
    this.endTime = this.getCurrentTime();
    this.isRunning = false;
    
    return this.endTime - this.startTime;
  }

  reset(): void {
    this.startTime = 0;
    this.endTime = 0;
    this.isRunning = false;
  }

  getElapsed(): number {
    if (this.isRunning) {
      return this.getCurrentTime() - this.startTime;
    }
    return this.endTime - this.startTime;
  }

  private getCurrentTime(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    } else if (typeof process !== 'undefined' && process.hrtime) {
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1000 + nanoseconds / 1000000;
    } else {
      return Date.now();
    }
  }
}

/**
 * 関数の実行時間を測定
 */
export function measureExecutionTime<T>(
  operation: () => T,
  operationName: string = 'Anonymous Operation'
): { result: T; metrics: PerformanceMetrics } {
  const timer = new HighResolutionTimer();
  const startMemory = getMemoryInfo();
  
  timer.start();
  let result: T;
  let error: Error | null = null;
  
  try {
    result = operation();
  } catch (e) {
    error = e as Error;
    throw e;
  } finally {
    const executionTime = timer.stop();
    const endMemory = getMemoryInfo();
    
    const metrics: PerformanceMetrics = {
      executionTime,
      memoryUsage: endMemory,
      timestamp: Date.now(),
      operationName,
      metadata: {
        startMemory,
        endMemory,
        memoryDelta: endMemory ? {
          used: endMemory.used - (startMemory?.used || 0),
          total: endMemory.total - (startMemory?.total || 0)
        } : undefined,
        error: error?.message
      }
    };
    
    if (!error) {
      return { result: result!, metrics };
    }
  }
  
  // この行には到達しないが、TypeScriptの満足のため
  throw new Error('Unexpected execution path');
}

/**
 * 非同期関数の実行時間を測定
 */
export async function measureAsyncExecutionTime<T>(
  operation: () => Promise<T>,
  operationName: string = 'Anonymous Async Operation'
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const timer = new HighResolutionTimer();
  const startMemory = getMemoryInfo();
  
  timer.start();
  let result: T;
  let error: Error | null = null;
  
  try {
    result = await operation();
  } catch (e) {
    error = e as Error;
    throw e;
  } finally {
    const executionTime = timer.stop();
    const endMemory = getMemoryInfo();
    
    const metrics: PerformanceMetrics = {
      executionTime,
      memoryUsage: endMemory,
      timestamp: Date.now(),
      operationName,
      metadata: {
        startMemory,
        endMemory,
        memoryDelta: endMemory ? {
          used: endMemory.used - (startMemory?.used || 0),
          total: endMemory.total - (startMemory?.total || 0)
        } : undefined,
        error: error?.message
      }
    };
    
    if (!error) {
      return { result: result!, metrics };
    }
  }
  
  throw new Error('Unexpected execution path');
}

// ==========================================
// メモリ使用量監視
// ==========================================

/**
 * 現在のメモリ使用量を取得
 */
export function getMemoryInfo(): MemoryInfo | undefined {
  try {
    // Node.js環境
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      return {
        used: memUsage.rss,
        total: memUsage.rss + memUsage.external,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      };
    }
    
    // ブラウザ環境（Chrome等）
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memInfo = (performance as any).memory;
      return {
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        heapUsed: memInfo.usedJSHeapSize,
        heapTotal: memInfo.totalJSHeapSize
      };
    }
    
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * メモリ使用量を人間が読みやすい形式でフォーマット
 */
export function formatMemorySize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// ==========================================
// ベンチマーク実行
// ==========================================

/**
 * ベンチマークテストを実行
 */
export async function runBenchmark<T>(
  operation: () => T | Promise<T>,
  options: {
    iterations?: number;
    warmupIterations?: number;
    maxDuration?: number; // ミリ秒
    operationName?: string;
    includeMemoryInfo?: boolean;
  } = {}
): Promise<BenchmarkResult> {
  const {
    iterations = 100,
    warmupIterations = 10,
    maxDuration = 30000, // 30秒
    operationName = 'Benchmark Operation',
    includeMemoryInfo = false
  } = options;
  
  // ウォームアップ実行
  for (let i = 0; i < warmupIterations; i++) {
    try {
      await operation();
    } catch {
      // ウォームアップ中のエラーは無視
    }
  }
  
  // ガベージコレクションの実行（可能な場合）
  if (typeof global !== 'undefined' && global.gc) {
    global.gc();
  }
  
  const executionTimes: number[] = [];
  const startTime = Date.now();
  let iterationCount = 0;
  
  for (let i = 0; i < iterations; i++) {
    // 最大実行時間のチェック
    if (Date.now() - startTime > maxDuration) {
      break;
    }
    
    const timer = new HighResolutionTimer();
    timer.start();
    
    try {
      await operation();
    } catch (error) {
      // エラーも測定対象とする
    }
    
    const executionTime = timer.stop();
    executionTimes.push(executionTime);
    iterationCount++;
  }
  
  if (executionTimes.length === 0) {
    throw new Error('No successful iterations completed');
  }
  
  // 統計計算
  const totalTime = executionTimes.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / executionTimes.length;
  const minTime = Math.min(...executionTimes);
  const maxTime = Math.max(...executionTimes);
  
  const variance = executionTimes.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / executionTimes.length;
  const standardDeviation = Math.sqrt(variance);
  
  const operationsPerSecond = 1000 / averageTime;
  
  const result: BenchmarkResult = {
    operationName,
    iterations: iterationCount,
    totalTime,
    averageTime,
    minTime,
    maxTime,
    standardDeviation,
    operationsPerSecond
  };
  
  if (includeMemoryInfo) {
    result.memoryInfo = getMemoryInfo();
  }
  
  return result;
}

/**
 * 複数の操作を比較ベンチマーク
 */
export async function compareBenchmark<T>(
  operations: Array<{
    name: string;
    operation: () => T | Promise<T>;
  }>,
  options: {
    iterations?: number;
    warmupIterations?: number;
    operationName?: string;
  } = {}
): Promise<Array<BenchmarkResult & { relativePerformance: number }>> {
  const results: BenchmarkResult[] = [];
  
  for (const { name, operation } of operations) {
    const result = await runBenchmark(operation, {
      ...options,
      operationName: name
    });
    results.push(result);
  }
  
  // 最高パフォーマンスを基準として相対性能を計算
  const bestOperationsPerSecond = Math.max(...results.map(r => r.operationsPerSecond));
  
  return results.map(result => ({
    ...result,
    relativePerformance: result.operationsPerSecond / bestOperationsPerSecond
  }));
}

// ==========================================
// パフォーマンス分析
// ==========================================

/**
 * パフォーマンスプロファイラー
 */
export class PerformanceProfiler {
  private operations: PerformanceMetrics[] = [];
  private profileName: string;
  private startTime: number;

  constructor(profileName: string = 'Performance Profile') {
    this.profileName = profileName;
    this.startTime = Date.now();
  }

  /**
   * 操作を記録して実行
   */
  async recordOperation<T>(
    operationName: string,
    operation: () => T | Promise<T>
  ): Promise<T> {
    const { result, metrics } = await measureAsyncExecutionTime(
      async () => await operation(),
      operationName
    );
    
    this.operations.push(metrics);
    return result;
  }

  /**
   * プロファイル結果を生成
   */
  generateProfile(): PerformanceProfile {
    const totalExecutionTime = Date.now() - this.startTime;
    
    // 実行時間でソート
    const sortedOperations = [...this.operations].sort((a, b) => b.executionTime - a.executionTime);
    
    // クリティカルパス（実行時間の長い操作順）
    const criticalPath = sortedOperations.slice(0, 5).map(op => op.operationName);
    
    // ボトルネック分析
    const totalOperationTime = this.operations.reduce((sum, op) => sum + op.executionTime, 0);
    const bottlenecks = sortedOperations
      .slice(0, 3)
      .map(op => ({
        operation: op.operationName,
        percentage: (op.executionTime / totalOperationTime) * 100,
        suggestion: this.generateOptimizationSuggestion(op)
      }));

    return {
      profileName: this.profileName,
      operations: this.operations,
      totalExecutionTime,
      criticalPath,
      bottlenecks
    };
  }

  private generateOptimizationSuggestion(metrics: PerformanceMetrics): string {
    if (metrics.executionTime > 1000) {
      return 'Consider breaking down this operation into smaller chunks or implementing caching';
    } else if (metrics.executionTime > 100) {
      return 'Consider optimizing algorithm or reducing computational complexity';
    } else if (metrics.metadata?.memoryDelta?.used > 1000000) { // 1MB
      return 'High memory usage detected. Consider memory optimization or garbage collection';
    } else {
      return 'Performance is acceptable. Monitor for regression';
    }
  }

  /**
   * プロファイルをリセット
   */
  reset(): void {
    this.operations = [];
    this.startTime = Date.now();
  }
}

// ==========================================
// 最適化ヘルパー
// ==========================================

/**
 * メモ化デコレータ
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    maxSize?: number;
    ttl?: number; // TTL in milliseconds
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const { maxSize = 100, ttl, keyGenerator } = options;
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  const defaultKeyGenerator = (...args: Parameters<T>): string => {
    return JSON.stringify(args);
  };

  const getKey = keyGenerator || defaultKeyGenerator;

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey(...args);
    const now = Date.now();
    
    // TTLチェック
    const cached = cache.get(key);
    if (cached) {
      if (!ttl || now - cached.timestamp < ttl) {
        return cached.value;
      } else {
        cache.delete(key);
      }
    }
    
    // キャッシュサイズ制限
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    // 実行と結果のキャッシュ
    const result = fn(...args);
    cache.set(key, { value: result, timestamp: now });
    
    return result;
  }) as T;
}

/**
 * 関数のスロットリング
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  
  return ((...args: Parameters<T>): ReturnType<T> | undefined => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, delay - (now - lastCall));
    }
    
    return undefined;
  }) as T;
}

/**
 * 関数のデバウンス
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return ((...args: Parameters<T>): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  }) as T;
}

// ==========================================
// リソース監視
// ==========================================

/**
 * リソース使用量監視
 */
export class ResourceMonitor {
  private monitoring: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private samples: Array<{
    timestamp: number;
    memory: MemoryInfo | undefined;
    cpu?: number;
  }> = [];

  constructor(private sampleInterval: number = 1000) {}

  start(): void {
    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    this.intervalId = setInterval(() => {
      this.samples.push({
        timestamp: Date.now(),
        memory: getMemoryInfo(),
        cpu: this.getCPUUsage()
      });
      
      // 古いサンプルを削除（最新100件を保持）
      if (this.samples.length > 100) {
        this.samples.shift();
      }
    }, this.sampleInterval);
  }

  stop(): void {
    if (!this.monitoring) {
      return;
    }

    this.monitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getSummary(): {
    memoryUsage: {
      current: MemoryInfo | undefined;
      peak: MemoryInfo | undefined;
      average: MemoryInfo | undefined;
    };
    sampleCount: number;
    duration: number;
  } {
    if (this.samples.length === 0) {
      return {
        memoryUsage: {
          current: undefined,
          peak: undefined,
          average: undefined
        },
        sampleCount: 0,
        duration: 0
      };
    }

    const current = this.samples[this.samples.length - 1]?.memory;
    
    const validMemorySamples = this.samples
      .map(s => s.memory)
      .filter((m): m is MemoryInfo => m !== undefined);

    let peak: MemoryInfo | undefined;
    let average: MemoryInfo | undefined;

    if (validMemorySamples.length > 0) {
      peak = validMemorySamples.reduce((max, curr) => 
        curr.used > max.used ? curr : max
      );

      const avgUsed = validMemorySamples.reduce((sum, m) => sum + m.used, 0) / validMemorySamples.length;
      const avgTotal = validMemorySamples.reduce((sum, m) => sum + m.total, 0) / validMemorySamples.length;
      
      average = {
        used: avgUsed,
        total: avgTotal
      };
    }

    const duration = this.samples.length > 0 
      ? this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp
      : 0;

    return {
      memoryUsage: {
        current,
        peak,
        average
      },
      sampleCount: this.samples.length,
      duration
    };
  }

  private getCPUUsage(): number | undefined {
    // Node.js環境でのCPU使用率取得
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      return (usage.user + usage.system) / 1000; // マイクロ秒からミリ秒に変換
    }
    return undefined;
  }

  reset(): void {
    this.samples = [];
  }
}

// ==========================================
// ユーティリティ関数
// ==========================================

/**
 * 実行時間に基づいてアラートを出す
 */
export function createPerformanceAlert(
  thresholds: {
    warning: number;
    critical: number;
  }
) {
  return function performanceAlert(metrics: PerformanceMetrics): void {
    if (metrics.executionTime > thresholds.critical) {
      console.error(`🚨 Critical performance issue in ${metrics.operationName}: ${metrics.executionTime.toFixed(2)}ms`);
    } else if (metrics.executionTime > thresholds.warning) {
      console.warn(`⚠️ Performance warning in ${metrics.operationName}: ${metrics.executionTime.toFixed(2)}ms`);
    }
  };
}

/**
 * パフォーマンスレポートの生成
 */
export function generatePerformanceReport(
  metrics: PerformanceMetrics[],
  options: {
    includeDetails?: boolean;
    sortBy?: 'time' | 'name' | 'memory';
  } = {}
): string {
  const { includeDetails = false, sortBy = 'time' } = options;
  
  if (metrics.length === 0) {
    return 'No performance metrics available.';
  }

  let sortedMetrics = [...metrics];
  switch (sortBy) {
    case 'time':
      sortedMetrics.sort((a, b) => b.executionTime - a.executionTime);
      break;
    case 'name':
      sortedMetrics.sort((a, b) => a.operationName.localeCompare(b.operationName));
      break;
    case 'memory':
      sortedMetrics.sort((a, b) => (b.memoryUsage?.used || 0) - (a.memoryUsage?.used || 0));
      break;
  }

  const totalTime = metrics.reduce((sum, m) => sum + m.executionTime, 0);
  const avgTime = totalTime / metrics.length;

  let report = `Performance Report\n`;
  report += `==================\n`;
  report += `Total Operations: ${metrics.length}\n`;
  report += `Total Time: ${totalTime.toFixed(2)}ms\n`;
  report += `Average Time: ${avgTime.toFixed(2)}ms\n\n`;

  if (includeDetails) {
    report += `Detailed Breakdown:\n`;
    report += `-------------------\n`;
    
    sortedMetrics.forEach((metric, index) => {
      report += `${index + 1}. ${metric.operationName}\n`;
      report += `   Time: ${metric.executionTime.toFixed(2)}ms (${((metric.executionTime / totalTime) * 100).toFixed(1)}%)\n`;
      
      if (metric.memoryUsage) {
        report += `   Memory: ${formatMemorySize(metric.memoryUsage.used)}\n`;
      }
      
      report += `\n`;
    });
  }

  return report;
}