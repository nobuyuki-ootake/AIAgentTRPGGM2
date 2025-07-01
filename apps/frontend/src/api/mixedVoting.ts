// ==========================================
// 混合投票システムAPI クライアント
// ==========================================

import {
  SendVotingReminderRequest,
  SendVotingReminderResponse,
  GetMixedVotingStatusRequest,
  GetMixedVotingStatusResponse,
  UpdateMixedVotingFlowRequest,
  UpdateMixedVotingFlowResponse,
  VotingSummary
} from '@repo/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

// ==========================================
// 混合投票状況取得
// ==========================================

export async function getMixedVotingStatus(request: GetMixedVotingStatusRequest): Promise<GetMixedVotingStatusResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/mixed-voting/status/${request.proposalId}`,
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
    console.error('Failed to get mixed voting status:', error);
    return {
      success: false,
      realTimeStats: {
        humanVotingProgress: 0,
        aiVotingProgress: 0,
        pendingHumanVoters: [],
        processingAiVoters: []
      },
      error: error instanceof Error ? error.message : '混合投票状況の取得に失敗しました'
    };
  }
}

// ==========================================
// 投票催促送信
// ==========================================

export async function sendVotingReminder(request: SendVotingReminderRequest): Promise<SendVotingReminderResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/mixed-voting/remind`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to send voting reminder:', error);
    return {
      success: false,
      remindersSent: 0,
      targetVoters: [],
      error: error instanceof Error ? error.message : '投票催促の送信に失敗しました'
    };
  }
}

// ==========================================
// 投票進捗サマリー取得
// ==========================================

export async function getVotingProgress(proposalId: string): Promise<{
  success: boolean;
  progress?: {
    proposalId: string;
    overallProgress: number;
    consensusReached: boolean;
    consensusType: string;
    
    humanProgress: {
      percentage: number;
      voted: number;
      total: number;
      pending: string[];
    };
    
    aiProgress: {
      percentage: number;
      voted: number;
      total: number;
      processing: string[];
    };
    
    votes: {
      approve: number;
      reject: number;
      abstain: number;
      required: number;
    };
    
    estimatedCompletion?: string;
    remindersSent: number;
    lastUpdated: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/mixed-voting/progress/${proposalId}`,
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
    console.error('Failed to get voting progress:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '投票進捗の取得に失敗しました'
    };
  }
}

// ==========================================
// 投票者詳細情報取得
// ==========================================

export async function getVoterDetails(proposalId: string, showAiDetails: boolean = false): Promise<{
  success: boolean;
  voters?: {
    all: any[];
    human: any[];
    ai: any[];
  };
  statistics?: any;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (showAiDetails) params.append('showAiDetails', 'true');

    const response = await fetch(
      `${API_BASE_URL}/api/mixed-voting/voters/${proposalId}?${params.toString()}`,
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
    console.error('Failed to get voter details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '投票者詳細の取得に失敗しました'
    };
  }
}

// ==========================================
// 自動催促機能トリガー
// ==========================================

export async function triggerAutoReminder(proposalId: string, forceRemind: boolean = false): Promise<{
  success: boolean;
  remindersSent: number;
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/mixed-voting/auto-remind/${proposalId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceRemind }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to trigger auto reminder:', error);
    return {
      success: false,
      remindersSent: 0,
      error: error instanceof Error ? error.message : '自動催促の実行に失敗しました'
    };
  }
}

// ==========================================
// 投票フロー設定更新
// ==========================================

export async function updateMixedVotingFlow(request: UpdateMixedVotingFlowRequest): Promise<UpdateMixedVotingFlowResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/mixed-voting/flow/${request.proposalId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flowSettings: request.flowSettings }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to update mixed voting flow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '投票フロー設定の更新に失敗しました'
    };
  }
}

// ==========================================
// ヘルスチェック
// ==========================================

export async function checkMixedVotingHealth(): Promise<{
  success: boolean;
  service: string;
  status: string;
  timestamp: string;
  features?: string[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/mixed-voting/health`,
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
    console.error('Failed to check mixed voting health:', error);
    return {
      success: false,
      service: 'mixed-voting',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'ヘルスチェックに失敗しました'
    };
  }
}