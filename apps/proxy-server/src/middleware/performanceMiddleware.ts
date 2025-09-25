import { Request, Response, NextFunction } from 'express';
import { performanceMonitoringService } from '../services/performanceMonitoringService';

export interface PerformanceRequest extends Request {
  startTime?: number;
  memoryUsage?: number;
}

/**
 * パフォーマンス監視ミドルウェア
 */
export function performanceMiddleware(
  req: PerformanceRequest,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  req.startTime = startTime;
  req.memoryUsage = startMemory;
  
  // リクエスト開始時にアクティブ接続数を増加
  performanceMonitoringService.incrementActiveConnections();
  
  // レスポンス完了時の処理
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const memoryDiff = process.memoryUsage().heapUsed - startMemory;
    
    // メトリクスを記録
    performanceMonitoringService.recordRequest({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      userId: (req as any).user?.id,
      memoryUsage: memoryDiff
    });
    
    // アクティブ接続数を減少
    performanceMonitoringService.decrementActiveConnections();
  });
  
  // レスポンスにパフォーマンスヘッダーを追加
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.set('X-Response-Time', `${duration}ms`);
  });
  
  next();
}

/**
 * データベースクエリ監視用のラッパー
 */
export function wrapDatabaseQuery<T>(
  queryFunction: () => Promise<T>,
  query: string,
  component: string
): Promise<T> {
  const startTime = Date.now();
  
  return queryFunction()
    .then(result => {
      const duration = Date.now() - startTime;
      
      performanceMonitoringService.recordQuery({
        query,
        duration,
        timestamp: new Date().toISOString(),
        component
      });
      
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      
      performanceMonitoringService.recordQuery({
        query,
        duration,
        timestamp: new Date().toISOString(),
        component
      });
      
      throw error;
    });
}

/**
 * 関数の実行時間を監視するデコレーター
 */
export function monitorPerformance(component: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        performanceMonitoringService.recordQuery({
          query: `${component}.${propertyName}`,
          duration,
          timestamp: new Date().toISOString(),
          component
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        performanceMonitoringService.recordQuery({
          query: `${component}.${propertyName}`,
          duration,
          timestamp: new Date().toISOString(),
          component
        });
        
        throw error;
      }
    };
  };
}

/**
 * メモリ使用量監視
 */
export function monitorMemoryUsage(threshold: number = 100 * 1024 * 1024): void {
  setInterval(() => {
    const usage = process.memoryUsage();
    
    if (usage.heapUsed > threshold) {
      console.warn('High memory usage detected', {
        heapUsed: usage.heapUsed,
        threshold,
        component: 'memory-monitor'
      });
    }
  }, 30000); // Check every 30 seconds
}