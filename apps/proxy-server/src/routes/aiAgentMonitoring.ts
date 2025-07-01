// ==========================================
// AI Agent監視・ログAPI
// ==========================================

import express from 'express';
import { aiAgentMonitoringService } from '../services/aiAgentMonitoringService';
import { logger } from '../utils/logger';
import {
  GetAIAgentLogsRequest,
  GetAIAgentPerformanceRequest,
  GetMonitoringDashboardRequest,
  UpdateMonitoringSettingsRequest
} from '@repo/types';

const router = express.Router();

// ==========================================
// AI Agentログ取得
// ==========================================

router.get('/logs/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    const request: GetAIAgentLogsRequest = {
      sessionId,
      characterId: req.query.characterId as string,
      actionType: req.query.actionType as any,
      logLevel: req.query.logLevel as any,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any
    };

    const response = await aiAgentMonitoringService.getAIAgentLogs(request);
    res.json(response);

  } catch (error) {
    logger.error('Failed to get AI agent logs:', error);
    res.status(500).json({
      success: false,
      logs: [],
      totalCount: 0,
      hasMore: false,
      error: 'AI Agentログの取得に失敗しました'
    });
  }
});

// ==========================================
// AI Agent性能メトリクス取得
// ==========================================

router.get('/performance/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    const request: GetAIAgentPerformanceRequest = {
      sessionId,
      characterId: req.query.characterId as string,
      timeRange: req.query.startTime && req.query.endTime ? {
        start: req.query.startTime as string,
        end: req.query.endTime as string
      } : undefined
    };

    const response = await aiAgentMonitoringService.getAIAgentPerformance(request);
    res.json(response);

  } catch (error) {
    logger.error('Failed to get AI agent performance:', error);
    res.status(500).json({
      success: false,
      metrics: [],
      summary: {
        totalAgents: 0,
        overallSuccessRate: 0,
        averageResponseTime: 0
      },
      error: 'AI Agent性能データの取得に失敗しました'
    });
  }
});

// ==========================================
// 監視ダッシュボード取得
// ==========================================

router.get('/dashboard/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    const request: GetMonitoringDashboardRequest = {
      sessionId,
      timeRange: req.query.timeRange as any || '24h'
    };

    const response = await aiAgentMonitoringService.getMonitoringDashboard(request);
    res.json(response);

  } catch (error) {
    logger.error('Failed to get monitoring dashboard:', error);
    res.status(500).json({
      success: false,
      error: '監視ダッシュボードの取得に失敗しました'
    });
  }
});

// ==========================================
// 特定キャラクターの詳細ログ取得
// ==========================================

router.get('/character/:sessionId/:characterId', async (req, res) => {
  try {
    const { sessionId, characterId } = req.params;
    
    const request: GetAIAgentLogsRequest = {
      sessionId,
      characterId,
      limit: 100,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    };

    const response = await aiAgentMonitoringService.getAIAgentLogs(request);
    
    if (response.success) {
      // キャラクター特化の情報も追加
      const performanceRequest: GetAIAgentPerformanceRequest = {
        sessionId,
        characterId
      };
      
      const performanceResponse = await aiAgentMonitoringService.getAIAgentPerformance(performanceRequest);
      
      res.json({
        success: true,
        logs: response.logs,
        totalCount: response.totalCount,
        hasMore: response.hasMore,
        performance: performanceResponse.success ? performanceResponse.metrics[0] : null
      });
    } else {
      res.json(response);
    }

  } catch (error) {
    logger.error('Failed to get character AI logs:', error);
    res.status(500).json({
      success: false,
      logs: [],
      totalCount: 0,
      hasMore: false,
      error: 'キャラクターAIログの取得に失敗しました'
    });
  }
});

// ==========================================
// 移動投票ログ専用取得
// ==========================================

router.get('/movement-votes/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    const request: GetAIAgentLogsRequest = {
      sessionId,
      actionType: 'movement_vote',
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    };

    const response = await aiAgentMonitoringService.getAIAgentLogs(request);
    res.json(response);

  } catch (error) {
    logger.error('Failed to get movement vote logs:', error);
    res.status(500).json({
      success: false,
      logs: [],
      totalCount: 0,
      hasMore: false,
      error: '移動投票ログの取得に失敗しました'
    });
  }
});

// ==========================================
// リアルタイム統計サマリー
// ==========================================

router.get('/summary/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    // 直近1時間のアクティビティ
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const recentLogsRequest: GetAIAgentLogsRequest = {
      sessionId,
      startTime: oneHourAgo,
      limit: 10,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    };

    const recentResponse = await aiAgentMonitoringService.getAIAgentLogs(recentLogsRequest);
    
    // 移動投票専用統計
    const movementVotesRequest: GetAIAgentLogsRequest = {
      sessionId,
      actionType: 'movement_vote',
      startTime: oneHourAgo,
      limit: 100
    };

    const movementResponse = await aiAgentMonitoringService.getAIAgentLogs(movementVotesRequest);
    
    // 統計計算
    const movementVotes = movementResponse.logs;
    const voteStats = {
      totalVotes: movementVotes.length,
      approveCount: movementVotes.filter(log => log.tags.includes('approve')).length,
      rejectCount: movementVotes.filter(log => log.tags.includes('reject')).length,
      abstainCount: movementVotes.filter(log => log.tags.includes('abstain')).length,
      averageConfidence: movementVotes.length > 0 ? 
        movementVotes.reduce((sum, log) => sum + log.confidenceScore, 0) / movementVotes.length : 0
    };

    res.json({
      success: true,
      summary: {
        recentActivityCount: recentResponse.logs.length,
        recentLogs: recentResponse.logs.slice(0, 5),
        movementVoteStats: voteStats,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get AI agent summary:', error);
    res.status(500).json({
      success: false,
      error: 'AI Agentサマリーの取得に失敗しました'
    });
  }
});

// ==========================================
// ヘルスチェック
// ==========================================

router.get('/health/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    // 直近5分間のエラーログをチェック
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const errorLogsRequest: GetAIAgentLogsRequest = {
      sessionId,
      logLevel: 'error',
      startTime: fiveMinutesAgo,
      limit: 10
    };

    const errorResponse = await aiAgentMonitoringService.getAIAgentLogs(errorLogsRequest);
    
    const health = {
      status: errorResponse.logs.length === 0 ? 'healthy' : 
              errorResponse.logs.length < 3 ? 'warning' : 'critical',
      recentErrors: errorResponse.logs.length,
      lastErrorTime: errorResponse.logs.length > 0 ? errorResponse.logs[0].timestamp : null,
      systemUptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      health
    });

  } catch (error) {
    logger.error('Failed to get AI agent health:', error);
    res.status(500).json({
      success: false,
      health: {
        status: 'error',
        recentErrors: -1,
        lastErrorTime: null,
        systemUptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      error: 'ヘルスチェックに失敗しました'
    });
  }
});

export default router;