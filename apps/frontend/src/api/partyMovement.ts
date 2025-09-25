import {
  PartyMovementSystem,
  CreateMovementProposalRequest,
  CreateMovementProposalResponse,
  CastMovementVoteRequest,
  CastMovementVoteResponse,
  ExecutePartyMovementRequest,
  ExecutePartyMovementResponse,
  GetPartyMovementStateResponse,
  UpdateConsensusSettingsRequest,
  UpdateConsensusSettingsResponse,
  ConsensusSettings,
  VotingSummary,
  ID
} from '@ai-agent-trpg/types';
import { apiClient } from './client';

// ==========================================
// パーティ移動API クライアント
// ==========================================

export const partyMovementAPI = {
  // パーティ移動状態取得
  async getPartyMovementState(sessionId: ID): Promise<PartyMovementSystem> {
    const response = await apiClient.get<GetPartyMovementStateResponse>(
      `/party-movement/state/${sessionId}`
    );
    
    if (!response.success || !response.movementSystem) {
      throw new Error(response.error || 'パーティ移動状態の取得に失敗しました');
    }
    
    return response.movementSystem;
  },

  // 移動提案作成
  async createMovementProposal(request: CreateMovementProposalRequest): Promise<CreateMovementProposalResponse> {
    const response = await apiClient.post<CreateMovementProposalResponse>(
      '/party-movement/proposals',
      request
    );
    
    return response;
  },

  // 投票
  async castVote(request: CastMovementVoteRequest): Promise<CastMovementVoteResponse> {
    const response = await apiClient.post<CastMovementVoteResponse>(
      '/party-movement/votes',
      request
    );
    
    return response;
  },

  // 移動実行
  async executePartyMovement(request: ExecutePartyMovementRequest): Promise<ExecutePartyMovementResponse> {
    const response = await apiClient.post<ExecutePartyMovementResponse>(
      '/party-movement/execute',
      request
    );
    
    return response;
  },

  // 投票集計取得
  async getVotingSummary(proposalId: ID): Promise<VotingSummary> {
    const response = await apiClient.get<{ success: boolean; votingSummary: VotingSummary; error?: string }>(
      `/party-movement/proposals/${proposalId}/voting-summary`
    );
    
    if (!response.success || !response.votingSummary) {
      throw new Error(response.error || '投票集計の取得に失敗しました');
    }
    
    return response.votingSummary;
  },

  // 合意設定取得
  async getConsensusSettings(sessionId: ID): Promise<ConsensusSettings> {
    const response = await apiClient.get<{ success: boolean; settings: ConsensusSettings; error?: string }>(
      `/party-movement/settings/${sessionId}`
    );
    
    if (!response.success || !response.settings) {
      throw new Error(response.error || '合意設定の取得に失敗しました');
    }
    
    return response.settings;
  },

  // 合意設定更新
  async updateConsensusSettings(sessionId: ID, updates: Partial<ConsensusSettings>): Promise<ConsensusSettings> {
    const request: UpdateConsensusSettingsRequest = {
      sessionId,
      settings: updates
    };
    
    const response = await apiClient.put<UpdateConsensusSettingsResponse>(
      `/party-movement/settings/${sessionId}`,
      request
    );
    
    if (!response.success || !response.settings) {
      throw new Error(response.error || '合意設定の更新に失敗しました');
    }
    
    return response.settings;
  },

  // 提案キャンセル
  async cancelProposal(proposalId: ID, reason?: string): Promise<void> {
    const response = await apiClient.delete<{ success: boolean; error?: string }>(
      `/party-movement/proposals/${proposalId}`,
      { reason }
    );
    
    if (!response.success) {
      throw new Error(response.error || '移動提案のキャンセルに失敗しました');
    }
  },

  // 移動履歴取得
  async getMovementHistory(sessionId: ID, options?: { limit?: number; page?: number }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.page) params.append('page', options.page.toString());
    
    const response = await apiClient.get<{
      success: boolean;
      history: Array<{
        fromLocationId: ID;
        toLocationId: ID;
        timestamp: string;
        method: string;
        duration: number;
        success: boolean;
      }>;
      pagination: {
        currentPage: number;
        totalItems: number;
        itemsPerPage: number;
        totalPages: number;
      };
      error?: string;
    }>(`/party-movement/history/${sessionId}?${params}`);
    
    if (!response.success) {
      throw new Error(response.error || '移動履歴の取得に失敗しました');
    }
    
    return {
      history: response.history,
      pagination: response.pagination
    };
  }
};

export default partyMovementAPI;