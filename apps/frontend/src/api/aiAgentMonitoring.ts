// ==========================================
// AI Agent監視・ログAPI クライアント
// ==========================================

import {
  GetAIAgentLogsRequest,
  GetAIAgentLogsResponse,
  GetAIAgentPerformanceRequest,
  GetAIAgentPerformanceResponse,
  GetMonitoringDashboardRequest,
  GetMonitoringDashboardResponse,
  AIAgentActionLog,
  AIAgentPerformanceMetrics,
  AIAgentMonitoringDashboard
} from '@ai-agent-trpg/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';

// ==========================================
// AI Agentログ取得
// ==========================================

export async function getAIAgentLogs(request: GetAIAgentLogsRequest): Promise<GetAIAgentLogsResponse> {
  try {
    const params = new URLSearchParams();
    
    if (request.characterId) params.append('characterId', request.characterId);
    if (request.actionType) params.append('actionType', request.actionType);
    if (request.logLevel) params.append('logLevel', request.logLevel);
    if (request.startTime) params.append('startTime', request.startTime);
    if (request.endTime) params.append('endTime', request.endTime);
    if (request.limit) params.append('limit', request.limit.toString());
    if (request.offset) params.append('offset', request.offset.toString());
    if (request.sortBy) params.append('sortBy', request.sortBy);
    if (request.sortOrder) params.append('sortOrder', request.sortOrder);

    const response = await fetch(
      `${API_BASE_URL}/api/ai-monitoring/logs/${request.sessionId}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get AI agent logs:', error);
    return {
      success: false,
      logs: [],
      totalCount: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : 'ログの取得に失敗しました'
    };
  }
}

// ==========================================
// AI Agent性能メトリクス取得
// ==========================================

export async function getAIAgentPerformance(request: GetAIAgentPerformanceRequest): Promise<GetAIAgentPerformanceResponse> {
  try {
    const params = new URLSearchParams();
    
    if (request.characterId) params.append('characterId', request.characterId);
    if (request.timeRange?.start) params.append('startTime', request.timeRange.start);
    if (request.timeRange?.end) params.append('endTime', request.timeRange.end);

    const response = await fetch(
      `${API_BASE_URL}/api/ai-monitoring/performance/${request.sessionId}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get AI agent performance:', error);
    return {
      success: false,
      metrics: [],
      summary: {
        totalAgents: 0,
        overallSuccessRate: 0,
        averageResponseTime: 0
      },
      error: error instanceof Error ? error.message : '性能データの取得に失敗しました'
    };
  }
}

// ==========================================
// 監視ダッシュボード取得
// ==========================================

export async function getMonitoringDashboard(request: GetMonitoringDashboardRequest): Promise<GetMonitoringDashboardResponse> {
  try {
    const params = new URLSearchParams();
    if (request.timeRange) params.append('timeRange', request.timeRange);

    const response = await fetch(
      `${API_BASE_URL}/api/ai-monitoring/dashboard/${request.sessionId}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get monitoring dashboard:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ダッシュボードの取得に失敗しました'
    };
  }
}

// ==========================================
// 特定キャラクターのログ取得
// ==========================================

export async function getCharacterAILogs(sessionId: string, characterId: string): Promise<{
  success: boolean;
  logs: AIAgentActionLog[];
  totalCount: number;
  hasMore: boolean;
  performance: AIAgentPerformanceMetrics | null;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/ai-monitoring/character/${sessionId}/${characterId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get character AI logs:', error);
    return {
      success: false,
      logs: [],
      totalCount: 0,
      hasMore: false,
      performance: null,
      error: error instanceof Error ? error.message : 'キャラクターログの取得に失敗しました'
    };
  }
}

// ==========================================
// 移動投票ログ専用取得
// ==========================================

export async function getMovementVoteLogs(sessionId: string, limit?: number, offset?: number): Promise<GetAIAgentLogsResponse> {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await fetch(
      `${API_BASE_URL}/api/ai-monitoring/movement-votes/${sessionId}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get movement vote logs:', error);
    return {
      success: false,
      logs: [],
      totalCount: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : '移動投票ログの取得に失敗しました'
    };
  }
}

// ==========================================
// リアルタイムサマリー取得
// ==========================================

export async function getAIAgentSummary(sessionId: string): Promise<{
  success: boolean;
  summary?: {
    recentActivityCount: number;
    recentLogs: AIAgentActionLog[];
    movementVoteStats: {
      totalVotes: number;
      approveCount: number;
      rejectCount: number;
      abstainCount: number;
      averageConfidence: number;
    };
    lastUpdated: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/ai-monitoring/summary/${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get AI agent summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'サマリーの取得に失敗しました'
    };
  }
}

// ==========================================
// ヘルスチェック
// ==========================================

export async function getAIAgentHealth(sessionId: string): Promise<{
  success: boolean;
  health?: {
    status: 'healthy' | 'warning' | 'critical' | 'error';
    recentErrors: number;
    lastErrorTime: string | null;
    systemUptime: number;
    timestamp: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/ai-monitoring/health/${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get AI agent health:', error);
    return {
      success: false,
      health: {
        status: 'error',
        recentErrors: -1,
        lastErrorTime: null,
        systemUptime: 0,
        timestamp: new Date().toISOString()
      },
      error: error instanceof Error ? error.message : 'ヘルスチェックに失敗しました'
    };
  }
}