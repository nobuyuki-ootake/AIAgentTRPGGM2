import { Router } from 'express';
import { errorMonitoringService } from '../services/errorMonitoringService';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * エラーメトリクスの取得
 */
router.get('/errors/metrics', async (req, res) => {
  try {
    const metrics = errorMonitoringService.getErrorMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get error metrics', { component: 'monitoring-api' }, error);
    res.status(500).json({ error: 'Failed to get error metrics' });
  }
});

/**
 * コンポーネント別エラー取得
 */
router.get('/errors/component/:component', async (req, res) => {
  try {
    const { component } = req.params;
    const errors = errorMonitoringService.getErrorsByComponent(component);
    res.json(errors);
  } catch (error) {
    logger.error('Failed to get errors by component', { 
      component: 'monitoring-api',
      targetComponent: req.params.component
    }, error);
    res.status(500).json({ error: 'Failed to get errors by component' });
  }
});

/**
 * 重要度別エラー取得
 */
router.get('/errors/severity/:severity', async (req, res) => {
  try {
    const { severity } = req.params;
    
    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity level' });
    }
    
    const errors = errorMonitoringService.getErrorsBySeverity(
      severity as 'low' | 'medium' | 'high' | 'critical'
    );
    res.json(errors);
  } catch (error) {
    logger.error('Failed to get errors by severity', { 
      component: 'monitoring-api',
      severity: req.params.severity
    }, error);
    res.status(500).json({ error: 'Failed to get errors by severity' });
  }
});

/**
 * エラーパターン取得
 */
router.get('/errors/patterns', async (req, res) => {
  try {
    const patterns = errorMonitoringService.getErrorPatterns();
    res.json(patterns);
  } catch (error) {
    logger.error('Failed to get error patterns', { component: 'monitoring-api' }, error);
    res.status(500).json({ error: 'Failed to get error patterns' });
  }
});

/**
 * エラーの解決マーク
 */
router.post('/errors/:errorId/resolve', async (req, res) => {
  try {
    const { errorId } = req.params;
    const resolved = errorMonitoringService.resolveError(errorId);
    
    if (resolved) {
      logger.info('Error resolved', { 
        component: 'monitoring-api',
        errorId
      });
      res.json({ status: 'resolved', errorId });
    } else {
      res.status(404).json({ error: 'Error not found' });
    }
  } catch (error) {
    logger.error('Failed to resolve error', { 
      component: 'monitoring-api',
      errorId: req.params.errorId
    }, error);
    res.status(500).json({ error: 'Failed to resolve error' });
  }
});

/**
 * システムヘルスチェック
 */
router.get('/health', async (req, res) => {
  try {
    const metrics = errorMonitoringService.getErrorMetrics();
    const criticalErrors = errorMonitoringService.getErrorsBySeverity('critical');
    const highErrors = errorMonitoringService.getErrorsBySeverity('high');
    
    let status = 'healthy';
    let alerts = [];
    
    // Critical errors in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCritical = criticalErrors.filter(e => 
      new Date(e.timestamp) > fiveMinutesAgo
    );
    
    if (recentCritical.length > 0) {
      status = 'critical';
      alerts.push({
        type: 'critical_errors',
        count: recentCritical.length,
        message: `${recentCritical.length} critical errors in last 5 minutes`
      });
    }
    
    // High error rate check
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentErrors = metrics.recentErrors.filter(e => 
      new Date(e.timestamp) > tenMinutesAgo
    );
    
    if (recentErrors.length > 20) {
      status = status === 'critical' ? 'critical' : 'degraded';
      alerts.push({
        type: 'high_error_rate',
        count: recentErrors.length,
        message: `High error rate: ${recentErrors.length} errors in last 10 minutes`
      });
    }
    
    res.json({
      status,
      timestamp: new Date().toISOString(),
      alerts,
      metrics: {
        totalErrors: metrics.totalErrors,
        criticalErrors: criticalErrors.length,
        highErrors: highErrors.length
      }
    });
  } catch (error) {
    logger.error('Health check failed', { component: 'monitoring-api' }, error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

/**
 * エラーのクリア（開発環境のみ）
 */
router.delete('/errors', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    errorMonitoringService.clearErrors();
    logger.info('All errors cleared', { component: 'monitoring-api' });
    res.json({ status: 'cleared' });
  } catch (error) {
    logger.error('Failed to clear errors', { component: 'monitoring-api' }, error);
    res.status(500).json({ error: 'Failed to clear errors' });
  }
});

// パフォーマンス監視エンドポイント

/**
 * パフォーマンスメトリクスの取得
 */
router.get('/performance/metrics', async (req, res) => {
  try {
    const metrics = performanceMonitoringService.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get performance metrics', { component: 'monitoring-api' }, error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

/**
 * エンドポイント別パフォーマンス
 */
router.get('/performance/endpoints', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const endpoints = performanceMonitoringService.getTopEndpoints(limit);
    res.json(endpoints);
  } catch (error) {
    logger.error('Failed to get endpoint performance', { component: 'monitoring-api' }, error);
    res.status(500).json({ error: 'Failed to get endpoint performance' });
  }
});

/**
 * 特定エンドポイントのパフォーマンス
 */
router.get('/performance/endpoints/:endpoint', async (req, res) => {
  try {
    const endpoint = decodeURIComponent(req.params.endpoint);
    const metric = performanceMonitoringService.getEndpointMetrics(endpoint);
    
    if (metric) {
      res.json(metric);
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    logger.error('Failed to get endpoint metric', { 
      component: 'monitoring-api',
      endpoint: req.params.endpoint
    }, error);
    res.status(500).json({ error: 'Failed to get endpoint metric' });
  }
});

/**
 * スロークエリの取得
 */
router.get('/performance/slow-queries', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const slowQueries = performanceMonitoringService.getSlowQueries(limit);
    res.json(slowQueries);
  } catch (error) {
    logger.error('Failed to get slow queries', { component: 'monitoring-api' }, error);
    res.status(500).json({ error: 'Failed to get slow queries' });
  }
});

/**
 * パフォーマンスメトリクスのクリア（開発環境のみ）
 */
router.delete('/performance', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    performanceMonitoringService.clearMetrics();
    logger.info('Performance metrics cleared', { component: 'monitoring-api' });
    res.json({ status: 'cleared' });
  } catch (error) {
    logger.error('Failed to clear performance metrics', { component: 'monitoring-api' }, error);
    res.status(500).json({ error: 'Failed to clear performance metrics' });
  }
});

// キャッシュ監視エンドポイント

/**
 * キャッシュ統計の取得
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get cache stats', { component: 'monitoring-api' }, error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

/**
 * キャッシュのクリア（開発環境のみ）
 */
router.delete('/cache', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    cacheService.clear();
    logger.info('Cache cleared', { component: 'monitoring-api' });
    res.json({ status: 'cleared' });
  } catch (error) {
    logger.error('Failed to clear cache', { component: 'monitoring-api' }, error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * キャンペーンキャッシュの無効化
 */
router.delete('/cache/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    cacheService.invalidateCampaignCache(campaignId);
    
    logger.info('Campaign cache invalidated', { 
      component: 'monitoring-api',
      campaignId 
    });
    
    res.json({ status: 'invalidated', campaignId });
  } catch (error) {
    logger.error('Failed to invalidate campaign cache', { 
      component: 'monitoring-api',
      campaignId: req.params.campaignId
    }, error);
    res.status(500).json({ error: 'Failed to invalidate campaign cache' });
  }
});

/**
 * セッションキャッシュの無効化
 */
router.delete('/cache/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    cacheService.invalidateSessionCache(sessionId);
    
    logger.info('Session cache invalidated', { 
      component: 'monitoring-api',
      sessionId 
    });
    
    res.json({ status: 'invalidated', sessionId });
  } catch (error) {
    logger.error('Failed to invalidate session cache', { 
      component: 'monitoring-api',
      sessionId: req.params.sessionId
    }, error);
    res.status(500).json({ error: 'Failed to invalidate session cache' });
  }
});

export default router;