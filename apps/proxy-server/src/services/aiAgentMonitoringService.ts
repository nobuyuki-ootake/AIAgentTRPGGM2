// ==========================================
// AI Agent監視・ログサービス
// ==========================================

import { v4 as uuidv4 } from 'uuid';
import { database } from '../database/database';
import { logger } from '../utils/logger';
import {
  AIAgentActionLog,
  AIMovementVoteLog,
  AIAgentPerformanceMetrics,
  AIAgentMonitoringDashboard,
  AIAgentActionType,
  VoteChoice,
  GetAIAgentLogsRequest,
  GetAIAgentLogsResponse,
  GetAIAgentPerformanceRequest,
  GetAIAgentPerformanceResponse,
  GetMonitoringDashboardRequest,
  GetMonitoringDashboardResponse
} from '@ai-agent-trpg/types';

export class AIAgentMonitoringService {
  private initialized = false;

  constructor() {
    // コンストラクタでは初期化しない（データベースがまだ利用できない可能性があるため）
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeDatabase();
      this.initialized = true;
    }
  }

  // ==========================================
  // データベース初期化
  // ==========================================

  private async initializeDatabase() {
    try {
      // AI Agentアクションログテーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS ai_agent_logs (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          character_id TEXT NOT NULL,
          character_name TEXT NOT NULL,
          action_type TEXT NOT NULL,
          action_context TEXT NOT NULL,
          action_description TEXT NOT NULL,
          decision_reasoning TEXT NOT NULL,
          alternatives_considered TEXT NOT NULL,
          confidence_score REAL NOT NULL,
          execution_result TEXT NOT NULL,
          result_details TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          log_level TEXT NOT NULL,
          processing_time_ms REAL NOT NULL,
          tags TEXT NOT NULL,
          extra_data TEXT
        )
      `);

      // AI Agent性能メトリクステーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS ai_agent_performance (
          id TEXT PRIMARY KEY,
          character_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          total_actions INTEGER NOT NULL,
          successful_actions INTEGER NOT NULL,
          failed_actions INTEGER NOT NULL,
          average_processing_time REAL NOT NULL,
          average_confidence_score REAL NOT NULL,
          action_type_breakdown TEXT NOT NULL,
          decision_quality TEXT NOT NULL,
          analysis_start_time TEXT NOT NULL,
          analysis_end_time TEXT NOT NULL,
          last_updated TEXT NOT NULL
        )
      `);

      // AI Agent監視設定テーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS ai_agent_monitoring_settings (
          session_id TEXT PRIMARY KEY,
          enable_detailed_logging BOOLEAN NOT NULL,
          minimum_log_level TEXT NOT NULL,
          max_log_retention_days INTEGER NOT NULL,
          enable_performance_tracking BOOLEAN NOT NULL,
          performance_analysis_interval INTEGER NOT NULL,
          alert_thresholds TEXT NOT NULL,
          show_in_game_master_panel BOOLEAN NOT NULL,
          show_in_developer_mode BOOLEAN NOT NULL,
          real_time_notifications BOOLEAN NOT NULL,
          anonymize_player_data BOOLEAN NOT NULL,
          restricted_view_for_players BOOLEAN NOT NULL
        )
      `);

      // AI Agentアラートテーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS ai_agent_alerts (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          character_id TEXT NOT NULL,
          character_name TEXT NOT NULL,
          alert_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          suggested_actions TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          acknowledged BOOLEAN NOT NULL,
          acknowledged_by TEXT,
          acknowledged_at TEXT
        )
      `);

      // インデックス作成
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_ai_logs_session_character_time 
        ON ai_agent_logs(session_id, character_id, timestamp DESC)
      `);

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_ai_logs_action_type_time 
        ON ai_agent_logs(action_type, timestamp DESC)
      `);

      logger.info('AI Agent monitoring database initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize AI Agent monitoring database:', error);
      throw error;
    }
  }

  // ==========================================
  // ログ記録機能
  // ==========================================

  /**
   * AI Agentアクションログを記録
   */
  async logAIAgentAction(log: Omit<AIAgentActionLog, 'id' | 'timestamp'>): Promise<string> {
    await this.ensureInitialized();
    try {
      const logId = uuidv4();
      const timestamp = new Date().toISOString();

      const stmt = database.prepare(`
        INSERT INTO ai_agent_logs (
          id, session_id, character_id, character_name, action_type,
          action_context, action_description, decision_reasoning,
          alternatives_considered, confidence_score, execution_result,
          result_details, timestamp, log_level, processing_time_ms, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        logId,
        log.sessionId,
        log.characterId,
        log.characterName,
        log.actionType,
        log.actionContext,
        log.actionDescription,
        log.decisionReasoning,
        JSON.stringify(log.alternativesConsidered),
        log.confidenceScore,
        log.executionResult,
        log.resultDetails,
        timestamp,
        log.logLevel,
        log.processingTimeMs,
        JSON.stringify(log.tags)
      );

      logger.info(`AI Agent action logged: ${log.actionType} by ${log.characterName}`, {
        logId,
        characterId: log.characterId,
        confidence: log.confidenceScore
      });

      return logId;

    } catch (error) {
      logger.error('Failed to log AI Agent action:', error);
      throw error;
    }
  }

  /**
   * 移動投票専用ログ記録
   */
  async logMovementVote(
    sessionId: string,
    characterId: string,
    characterName: string,
    proposalId: string,
    targetLocationId: string,
    movementReason: string,
    urgency: 'low' | 'medium' | 'high',
    voteChoice: VoteChoice,
    voteReason: string,
    influencingFactors: {
      characterPersonality: string;
      situationalFactors: string[];
      riskAssessment: string;
      partyConsideration: string;
    },
    confidenceScore: number,
    processingTimeMs: number
  ): Promise<string> {

    const movementVoteLog: Omit<AIMovementVoteLog, 'id' | 'timestamp'> = {
      sessionId,
      characterId,
      characterName,
      actionType: 'movement_vote',
      actionContext: `移動提案への投票 - 目的地: ${targetLocationId}, 緊急度: ${urgency}`,
      actionDescription: `${voteChoice}票を投じた (理由: ${voteReason})`,
      decisionReasoning: voteReason,
      alternativesConsidered: [
        voteChoice === 'approve' ? 'reject' : 'approve',
        'abstain'
      ],
      confidenceScore,
      executionResult: 'success',
      resultDetails: `投票完了: ${voteChoice}`,
      logLevel: 'info',
      processingTimeMs,
      tags: ['movement', 'voting', urgency],
      
      // 移動投票特有のデータ
      proposalId,
      targetLocationId,
      movementReason,
      urgency,
      voteChoice,
      voteReason,
      influencingFactors
    };

    return await this.logAIAgentAction(movementVoteLog);
  }

  // ==========================================
  // ログ取得機能
  // ==========================================

  /**
   * AI Agentログを取得
   */
  async getAIAgentLogs(request: GetAIAgentLogsRequest): Promise<GetAIAgentLogsResponse> {
    await this.ensureInitialized();
    try {
      let query = `
        SELECT * FROM ai_agent_logs 
        WHERE session_id = ?
      `;
      const params: any[] = [request.sessionId];

      // フィルタ条件を追加
      if (request.characterId) {
        query += ` AND character_id = ?`;
        params.push(request.characterId);
      }

      if (request.actionType) {
        query += ` AND action_type = ?`;
        params.push(request.actionType);
      }

      if (request.logLevel) {
        query += ` AND log_level = ?`;
        params.push(request.logLevel);
      }

      if (request.startTime) {
        query += ` AND timestamp >= ?`;
        params.push(request.startTime);
      }

      if (request.endTime) {
        query += ` AND timestamp <= ?`;
        params.push(request.endTime);
      }

      // ソート
      const sortBy = request.sortBy || 'timestamp';
      const sortOrder = request.sortOrder || 'desc';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // ページネーション
      const limit = request.limit || 50;
      const offset = request.offset || 0;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      // 総件数を取得
      let countQuery = `
        SELECT COUNT(*) as total FROM ai_agent_logs 
        WHERE session_id = ?
      `;
      const countParams = [request.sessionId];

      if (request.characterId) {
        countQuery += ` AND character_id = ?`;
        countParams.push(request.characterId);
      }

      if (request.actionType) {
        countQuery += ` AND action_type = ?`;
        countParams.push(request.actionType);
      }

      if (request.logLevel) {
        countQuery += ` AND log_level = ?`;
        countParams.push(request.logLevel);
      }

      const totalResult = database.prepare(countQuery).get(...countParams) as { total: number };
      const totalCount = totalResult.total;

      // ログデータを取得
      const rows = database.prepare(query).all(...params) as any[];
      const logs: AIAgentActionLog[] = rows.map(row => this.rowToAIAgentLog(row));

      return {
        success: true,
        logs,
        totalCount,
        hasMore: offset + limit < totalCount
      };

    } catch (error) {
      logger.error('Failed to get AI Agent logs:', error);
      return {
        success: false,
        logs: [],
        totalCount: 0,
        hasMore: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * AI Agent性能メトリクスを取得
   */
  async getAIAgentPerformance(request: GetAIAgentPerformanceRequest): Promise<GetAIAgentPerformanceResponse> {
    await this.ensureInitialized();
    try {
      // TODO: 性能分析ロジックを実装
      // 現在は基本的な統計のみ提供

      let query = `
        SELECT 
          character_id,
          COUNT(*) as total_actions,
          SUM(CASE WHEN execution_result = 'success' THEN 1 ELSE 0 END) as successful_actions,
          SUM(CASE WHEN execution_result = 'failure' OR execution_result = 'error' THEN 1 ELSE 0 END) as failed_actions,
          AVG(processing_time_ms) as avg_processing_time,
          AVG(confidence_score) as avg_confidence_score,
          character_name
        FROM ai_agent_logs 
        WHERE session_id = ?
      `;
      const params: any[] = [request.sessionId];

      if (request.characterId) {
        query += ` AND character_id = ?`;
        params.push(request.characterId);
      }

      if (request.timeRange) {
        query += ` AND timestamp >= ? AND timestamp <= ?`;
        params.push(request.timeRange.start, request.timeRange.end);
      }

      query += ` GROUP BY character_id, character_name`;

      const rows = database.prepare(query).all(...params) as any[];

      const metrics: AIAgentPerformanceMetrics[] = rows.map(row => ({
        characterId: row.character_id,
        sessionId: request.sessionId,
        totalActions: row.total_actions,
        successfulActions: row.successful_actions,
        failedActions: row.failed_actions,
        averageProcessingTime: row.avg_processing_time,
        averageConfidenceScore: row.avg_confidence_score,
        actionTypeBreakdown: this.createActionTypeBreakdown(),
        decisionQuality: {
          consistencyScore: 85,
          adaptabilityScore: 78,
          rationalityScore: 82,
          collaborationScore: 90
        },
        analysisStartTime: request.timeRange?.start || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        analysisEndTime: request.timeRange?.end || new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }));

      const summary = {
        totalAgents: metrics.length,
        overallSuccessRate: metrics.length > 0 ? 
          metrics.reduce((sum, m) => sum + (m.successfulActions / m.totalActions), 0) / metrics.length * 100 : 0,
        averageResponseTime: metrics.length > 0 ?
          metrics.reduce((sum, m) => sum + m.averageProcessingTime, 0) / metrics.length : 0
      };

      return {
        success: true,
        metrics,
        summary
      };

    } catch (error) {
      logger.error('Failed to get AI Agent performance:', error);
      return {
        success: false,
        metrics: [],
        summary: {
          totalAgents: 0,
          overallSuccessRate: 0,
          averageResponseTime: 0
        },
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  // ==========================================
  // 監視ダッシュボード
  // ==========================================

  /**
   * 監視ダッシュボードデータを取得
   */
  async getMonitoringDashboard(request: GetMonitoringDashboardRequest): Promise<GetMonitoringDashboardResponse> {
    await this.ensureInitialized();
    try {
      const timeRange = request.timeRange || '24h';
      const hoursBack = this.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      // 最新ログ（直近5件）
      const recentLogsQuery = `
        SELECT * FROM ai_agent_logs 
        WHERE session_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC 
        LIMIT 5
      `;
      const recentLogRows = database.prepare(recentLogsQuery).all(request.sessionId, startTime) as any[];
      const recentLogs = recentLogRows.map(row => this.rowToAIAgentLog(row));

      // 概要統計
      const overviewQuery = `
        SELECT 
          COUNT(DISTINCT character_id) as active_agents,
          COUNT(*) as total_actions_today,
          AVG(CASE WHEN execution_result = 'success' THEN 100.0 ELSE 0.0 END) as avg_success_rate
        FROM ai_agent_logs 
        WHERE session_id = ? AND timestamp >= ?
      `;
      const overviewResult = database.prepare(overviewQuery).get(request.sessionId, startTime) as any;

      // エージェント別状態
      const agentStatusQuery = `
        SELECT 
          character_id,
          character_name,
          MAX(timestamp) as last_action,
          AVG(confidence_score) as current_confidence,
          COUNT(*) as today_action_count
        FROM ai_agent_logs 
        WHERE session_id = ? AND timestamp >= ?
        GROUP BY character_id, character_name
        ORDER BY last_action DESC
      `;
      const agentStatusRows = database.prepare(agentStatusQuery).all(request.sessionId, startTime) as any[];

      const dashboard: AIAgentMonitoringDashboard = {
        sessionId: request.sessionId,
        overview: {
          activeAgents: overviewResult.active_agents || 0,
          totalActionsToday: overviewResult.total_actions_today || 0,
          averageSuccessRate: overviewResult.avg_success_rate || 0,
          systemHealth: this.calculateSystemHealth(overviewResult.avg_success_rate || 0)
        },
        recentLogs,
        activeAlerts: [], // TODO: アラート機能実装
        performanceTrends: {
          timeLabels: [], // TODO: トレンドデータ実装
          successRates: [],
          responseTimes: [],
          actionCounts: []
        },
        agentStatuses: agentStatusRows.map(row => ({
          characterId: row.character_id,
          characterName: row.character_name,
          status: this.determineAgentStatus(row.last_action),
          lastAction: row.last_action,
          currentConfidence: Math.round(row.current_confidence || 0),
          todayActionCount: row.today_action_count
        })),
        lastUpdated: new Date().toISOString()
      };

      return {
        success: true,
        dashboard
      };

    } catch (error) {
      logger.error('Failed to get monitoring dashboard:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  // ==========================================
  // ユーティリティメソッド
  // ==========================================

  private rowToAIAgentLog(row: any): AIAgentActionLog {
    return {
      id: row.id,
      sessionId: row.session_id,
      characterId: row.character_id,
      characterName: row.character_name,
      actionType: row.action_type,
      actionContext: row.action_context,
      actionDescription: row.action_description,
      decisionReasoning: row.decision_reasoning,
      alternativesConsidered: JSON.parse(row.alternatives_considered || '[]'),
      confidenceScore: row.confidence_score,
      executionResult: row.execution_result,
      resultDetails: row.result_details,
      timestamp: row.timestamp,
      logLevel: row.log_level,
      processingTimeMs: row.processing_time_ms,
      tags: JSON.parse(row.tags || '[]')
    };
  }

  private parseTimeRange(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 1;
      case '6h': return 6;
      case '24h': return 24;
      case '7d': return 24 * 7;
      default: return 24;
    }
  }

  private calculateSystemHealth(successRate: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (successRate >= 95) return 'excellent';
    if (successRate >= 85) return 'good';
    if (successRate >= 70) return 'warning';
    return 'critical';
  }

  private determineAgentStatus(lastAction: string): 'active' | 'idle' | 'error' | 'offline' {
    const lastActionTime = new Date(lastAction).getTime();
    const now = Date.now();
    const minutesSinceLastAction = (now - lastActionTime) / (1000 * 60);

    if (minutesSinceLastAction < 5) return 'active';
    if (minutesSinceLastAction < 30) return 'idle';
    return 'offline';
  }

  private createActionTypeBreakdown(): Record<AIAgentActionType, { count: number; successRate: number; averageConfidence: number; }> {
    const actionTypes: AIAgentActionType[] = [
      'movement_vote',
      'combat_action', 
      'dialogue_response',
      'skill_check',
      'exploration_action',
      'decision_making'
    ];

    const breakdown: Record<AIAgentActionType, { count: number; successRate: number; averageConfidence: number; }> = {} as any;

    actionTypes.forEach(actionType => {
      breakdown[actionType] = {
        count: 0,
        successRate: 0,
        averageConfidence: 0
      };
    });

    return breakdown;
  }
}

// シングルトンインスタンス
export const aiAgentMonitoringService = new AIAgentMonitoringService();