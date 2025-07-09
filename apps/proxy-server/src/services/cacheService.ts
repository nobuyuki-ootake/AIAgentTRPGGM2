import { logger } from '../utils/logger';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  totalKeys: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  topKeys: Array<{ key: string; hits: number; size: number }>;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private hitCount = 0;
  private missCount = 0;
  private defaultTTL = 300000; // 5 minutes
  private maxSize = 1000;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.startCleanupTask();
  }

  private startCleanupTask(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug(`Cleaned up ${expiredCount} expired cache entries`, {
        component: 'cache-service'
      });
    }
  }

  private evictLRU(): void {
    if (this.cache.size <= this.maxSize) return;

    // Find the least recently used (lowest hits) entries
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].hits - b[1].hits);

    const toEvict = entries.slice(0, Math.floor(this.maxSize * 0.1)); // Evict 10%
    
    toEvict.forEach(([key]) => {
      this.cache.delete(key);
    });

    logger.debug(`Evicted ${toEvict.length} cache entries (LRU)`, {
      component: 'cache-service'
    });
  }

  private generateKey(prefix: string, params: Record<string, any>): string {
    const paramStr = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    
    return `${prefix}:${paramStr}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    entry.hits++;
    this.hitCount++;
    return entry.data;
  }

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.evictLRU();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0
    };

    this.cache.set(key, entry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // AI関連のキャッシュヘルパー
  async getCachedAIResponse<T>(
    provider: string,
    prompt: string,
    params: Record<string, any>,
    generator: () => Promise<T>
  ): Promise<T> {
    const cacheKey = this.generateKey(`ai:${provider}`, { prompt, ...params });
    
    const cached = this.get<T>(cacheKey);
    if (cached) {
      logger.debug('AI response cache hit', {
        component: 'cache-service',
        provider,
        cacheKey
      });
      return cached;
    }

    try {
      const result = await generator();
      this.set(cacheKey, result, 600000); // 10 minutes for AI responses
      
      logger.debug('AI response cached', {
        component: 'cache-service',
        provider,
        cacheKey
      });
      
      return result;
    } catch (error) {
      logger.error('AI response generation failed', {
        component: 'cache-service',
        provider,
        cacheKey
      }, error);
      throw error;
    }
  }

  // データベースクエリのキャッシュヘルパー
  async getCachedQuery<T>(
    query: string,
    params: any[],
    generator: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cacheKey = this.generateKey('db', { query, params });
    
    const cached = this.get<T>(cacheKey);
    if (cached) {
      logger.debug('Database query cache hit', {
        component: 'cache-service',
        query: query.substring(0, 100),
        cacheKey
      });
      return cached;
    }

    try {
      const result = await generator();
      this.set(cacheKey, result, ttl);
      
      logger.debug('Database query cached', {
        component: 'cache-service',
        query: query.substring(0, 100),
        cacheKey
      });
      
      return result;
    } catch (error) {
      logger.error('Database query failed', {
        component: 'cache-service',
        query: query.substring(0, 100),
        cacheKey
      }, error);
      throw error;
    }
  }

  // キャンペーン関連のキャッシュ無効化
  invalidateCampaignCache(campaignId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(campaignId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    logger.debug(`Invalidated ${keysToDelete.length} campaign cache entries`, {
      component: 'cache-service',
      campaignId
    });
  }

  // セッション関連のキャッシュ無効化
  invalidateSessionCache(sessionId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(sessionId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    logger.debug(`Invalidated ${keysToDelete.length} session cache entries`, {
      component: 'cache-service',
      sessionId
    });
  }

  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    // Calculate memory usage (approximate)
    const memoryUsage = JSON.stringify(Array.from(this.cache.entries())).length;
    
    // Get top keys by hits
    const topKeys = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        hits: entry.hits,
        size: JSON.stringify(entry.data).length
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    return {
      totalKeys: this.cache.size,
      totalHits: this.hitCount,
      totalMisses: this.missCount,
      hitRate,
      memoryUsage,
      topKeys
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

export const cacheService = new CacheService();