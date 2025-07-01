import { useState, useEffect, useCallback } from 'react';
import {
  PartyMovementSystem,
  PartyMovementProposal,
  VotingSummary,
  CreateMovementProposalRequest,
  CastMovementVoteRequest,
  ExecutePartyMovementRequest,
  ConsensusSettings,
  VoteChoice,
  ID
} from '@ai-agent-trpg/types';
import { partyMovementAPI } from '../api/partyMovement';

// ==========================================
// パーティ移動フック
// ==========================================

export interface UsePartyMovementOptions {
  sessionId: ID;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UsePartyMovementResult {
  // 状態
  movementSystem: PartyMovementSystem | null;
  loading: boolean;
  error: string | null;
  
  // 提案関連
  activeProposal: PartyMovementProposal | null;
  votingSummary: VotingSummary | null;
  
  // アクション
  createProposal: (proposal: Omit<CreateMovementProposalRequest, 'sessionId'>) => Promise<void>;
  castVote: (proposalId: ID, choice: VoteChoice, reason?: string) => Promise<void>;
  executeMovement: (proposalId: ID, forceExecute?: boolean) => Promise<void>;
  cancelProposal: (proposalId: ID, reason?: string) => Promise<void>;
  refreshMovementState: () => Promise<void>;
  
  // 設定
  consensusSettings: ConsensusSettings | null;
  updateConsensusSettings: (updates: Partial<ConsensusSettings>) => Promise<void>;
}

export const usePartyMovement = ({
  sessionId,
  autoRefresh = true,
  refreshInterval = 5000
}: UsePartyMovementOptions): UsePartyMovementResult => {
  const [movementSystem, setMovementSystem] = useState<PartyMovementSystem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // パーティ移動状態を読み込み
  const refreshMovementState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const system = await partyMovementAPI.getPartyMovementState(sessionId);
      setMovementSystem(system);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'パーティ移動状態の取得に失敗しました';
      setError(errorMessage);
      console.error('Failed to load party movement state:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // 移動提案作成
  const createProposal = useCallback(async (proposalData: Omit<CreateMovementProposalRequest, 'sessionId'>) => {
    try {
      setLoading(true);
      setError(null);
      
      const request: CreateMovementProposalRequest = {
        ...proposalData,
        sessionId
      };
      
      const response = await partyMovementAPI.createMovementProposal(request);
      
      if (!response.success) {
        throw new Error(response.error || '移動提案の作成に失敗しました');
      }
      
      // 状態を更新
      await refreshMovementState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '移動提案の作成に失敗しました';
      setError(errorMessage);
      console.error('Failed to create movement proposal:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, refreshMovementState]);

  // 投票
  const castVote = useCallback(async (proposalId: ID, choice: VoteChoice, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const request: CastMovementVoteRequest = {
        proposalId,
        voterId: 'current-character-id', // TODO: 現在のキャラクターIDを取得
        choice,
        reason
      };
      
      const response = await partyMovementAPI.castVote(request);
      
      if (!response.success) {
        throw new Error(response.error || '投票に失敗しました');
      }
      
      // 状態を更新
      await refreshMovementState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '投票に失敗しました';
      setError(errorMessage);
      console.error('Failed to cast vote:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshMovementState]);

  // 移動実行
  const executeMovement = useCallback(async (proposalId: ID, forceExecute = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const request: ExecutePartyMovementRequest = {
        proposalId,
        sessionId,
        forceExecute
      };
      
      const response = await partyMovementAPI.executePartyMovement(request);
      
      if (!response.success) {
        throw new Error(response.error || 'パーティ移動の実行に失敗しました');
      }
      
      // 状態を更新
      await refreshMovementState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'パーティ移動の実行に失敗しました';
      setError(errorMessage);
      console.error('Failed to execute party movement:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, refreshMovementState]);

  // 提案キャンセル
  const cancelProposal = useCallback(async (proposalId: ID, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await partyMovementAPI.cancelProposal(proposalId, reason);
      
      // 状態を更新
      await refreshMovementState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '移動提案のキャンセルに失敗しました';
      setError(errorMessage);
      console.error('Failed to cancel proposal:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshMovementState]);

  // 合意設定更新
  const updateConsensusSettings = useCallback(async (updates: Partial<ConsensusSettings>) => {
    try {
      setLoading(true);
      setError(null);
      
      const newSettings = await partyMovementAPI.updateConsensusSettings(sessionId, updates);
      
      // ローカル状態を更新
      if (movementSystem) {
        setMovementSystem({
          ...movementSystem,
          settings: newSettings
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '合意設定の更新に失敗しました';
      setError(errorMessage);
      console.error('Failed to update consensus settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, movementSystem]);

  // 初期読み込み
  useEffect(() => {
    refreshMovementState();
  }, [refreshMovementState]);

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshMovementState();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshMovementState]);

  // 計算されたプロパティ
  const activeProposal = movementSystem?.activeProposal || null;
  const votingSummary = movementSystem?.votingSummary || null;
  const consensusSettings = movementSystem?.settings || null;

  return {
    // 状態
    movementSystem,
    loading,
    error,
    
    // 提案関連
    activeProposal,
    votingSummary,
    
    // アクション
    createProposal,
    castVote,
    executeMovement,
    cancelProposal,
    refreshMovementState,
    
    // 設定
    consensusSettings,
    updateConsensusSettings
  };
};

export default usePartyMovement;