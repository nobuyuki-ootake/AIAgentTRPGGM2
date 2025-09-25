import { logger } from '../utils/logger';

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  slowQueries: QueryMetric[];
  endpointMetrics: Record<string, EndpointMetric>;
}

export interface EndpointMetric {
  count: number;
  averageTime: number;
  p95Time: number;
  errorCount: number;
  lastAccess: string;
}

export interface QueryMetric {
  query: string;
  duration: number;
  timestamp: string;
  component: string;
}

export interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  userId?: string;
  memoryUsage?: number;
}

class PerformanceMonitoringService {
  private requests: RequestMetric[] = [];
  private queries: QueryMetric[] = [];
  private maxHistory = 10000;
  private slowQueryThreshold = 100; // ms
  private activeConnections = 0;

  constructor() {
    this.startCleanupTask();
    this.startCPUMonitoring();
  }

  private startCleanupTask(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);
  }

  private startCPUMonitoring(): void {
    // Monitor CPU usage every 30 seconds
    setInterval(() => {
      this.measureCPUUsage();
    }, 30 * 1000);
  }

  private cleanupOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    this.requests = this.requests.filter(request => 
      new Date(request.timestamp) > oneHourAgo
    );
    
    this.queries = this.queries.filter(query => 
      new Date(query.timestamp) > oneHourAgo
    );

    // Keep only recent metrics if we exceed max history
    if (this.requests.length > this.maxHistory) {
      this.requests = this.requests.slice(-this.maxHistory);
    }
    
    if (this.queries.length > this.maxHistory) {
      this.queries = this.queries.slice(-this.maxHistory);
    }
  }

  private measureCPUUsage(): void {
    const startUsage = process.cpuUsage();
    
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const cpuPercent = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
      
      logger.debug('CPU usage measured', {
        component: 'performance-monitoring',
        cpuPercent
      });
    }, 1000);
  }

  recordRequest(metric: RequestMetric): void {
    this.requests.push(metric);
    
    // Log slow requests
    if (metric.duration > 1000) { // 1 second threshold
      logger.warn('Slow request detected', {
        component: 'performance-monitoring',
        method: metric.method,
        path: metric.path,
        duration: metric.duration,
        userId: metric.userId
      });
    }
  }

  recordQuery(metric: QueryMetric): void {
    this.queries.push(metric);
    
    // Log slow queries
    if (metric.duration > this.slowQueryThreshold) {
      logger.warn('Slow query detected', {
        component: 'performance-monitoring',
        query: metric.query.substring(0, 100), // Truncate for logging
        duration: metric.duration,
        component: metric.component
      });
    }
  }

  incrementActiveConnections(): void {
    this.activeConnections++;
  }

  decrementActiveConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  getMetrics(): PerformanceMetrics {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Filter recent requests
    const recentRequests = this.requests.filter(r => 
      new Date(r.timestamp).getTime() > oneHourAgo
    );
    
    // Calculate response times
    const responseTimes = recentRequests.map(r => r.duration);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    // Calculate P95 response time
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95ResponseTime = sortedTimes[p95Index] || 0;
    
    // Calculate error rate
    const errorRequests = recentRequests.filter(r => r.statusCode >= 400);
    const errorRate = recentRequests.length > 0 
      ? (errorRequests.length / recentRequests.length) * 100 
      : 0;
    
    // Group by endpoint
    const endpointMetrics: Record<string, EndpointMetric> = {};
    recentRequests.forEach(request => {
      const key = `${request.method} ${request.path}`;
      if (!endpointMetrics[key]) {
        endpointMetrics[key] = {
          count: 0,
          averageTime: 0,
          p95Time: 0,
          errorCount: 0,
          lastAccess: request.timestamp
        };
      }
      
      const metric = endpointMetrics[key];
      metric.count++;
      metric.averageTime = (metric.averageTime * (metric.count - 1) + request.duration) / metric.count;
      
      if (request.statusCode >= 400) {
        metric.errorCount++;
      }
      
      if (request.timestamp > metric.lastAccess) {
        metric.lastAccess = request.timestamp;
      }
    });
    
    // Calculate P95 for each endpoint
    Object.keys(endpointMetrics).forEach(key => {
      const endpointRequests = recentRequests.filter(r => 
        `${r.method} ${r.path}` === key
      );
      const endpointTimes = endpointRequests.map(r => r.duration).sort((a, b) => a - b);
      const p95Index = Math.floor(endpointTimes.length * 0.95);
      endpointMetrics[key].p95Time = endpointTimes[p95Index] || 0;
    });
    
    // Get slow queries
    const slowQueries = this.queries.filter(q => q.duration > this.slowQueryThreshold);
    
    return {
      requestCount: recentRequests.length,
      averageResponseTime,
      p95ResponseTime,
      errorRate,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage().user + process.cpuUsage().system,
      activeConnections: this.activeConnections,
      slowQueries,
      endpointMetrics
    };
  }

  getEndpointMetrics(endpoint: string): EndpointMetric | null {
    const metrics = this.getMetrics();
    return metrics.endpointMetrics[endpoint] || null;
  }

  getSlowQueries(limit: number = 10): QueryMetric[] {
    return this.queries
      .filter(q => q.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  getTopEndpoints(limit: number = 10): Array<{ endpoint: string; metric: EndpointMetric }> {
    const metrics = this.getMetrics();
    return Object.entries(metrics.endpointMetrics)
      .map(([endpoint, metric]) => ({ endpoint, metric }))
      .sort((a, b) => b.metric.count - a.metric.count)
      .slice(0, limit);
  }

  clearMetrics(): void {
    this.requests = [];
    this.queries = [];
    this.activeConnections = 0;
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();