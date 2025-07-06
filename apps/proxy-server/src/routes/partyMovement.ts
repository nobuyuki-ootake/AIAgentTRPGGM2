import { Router } from 'express';
import {
  CreateMovementProposalRequest,
  CastMovementVoteRequest,
  ExecutePartyMovementRequest,
  UpdateConsensusSettingsRequest,
  PartyMovementSystem,
  GetPartyMovementStateResponse,
  CreateMovementProposalResponse,
  CastMovementVoteResponse,
  ExecutePartyMovementResponse,
  UpdateConsensusSettingsResponse
} from '@ai-agent-trpg/types';
import { partyMovementService } from '../services/partyMovementService';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export const partyMovementRouter = Router();

// ==========================================
// パーティ移動状態取得
// ==========================================

partyMovementRouter.get('/state/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  try {
    const movementState = await partyMovementService.getPartyMovementState(sessionId);
    
    if (!movementState) {
      const response: GetPartyMovementStateResponse = {
        success: false,
        error: 'セッションが見つかりません'
      };
      return res.status(404).json(response);
    }

    const consensusSettings = await partyMovementService.getConsensusSettings(sessionId);
    const movementSystem: PartyMovementSystem = {
      state: movementState,
      settings: consensusSettings,
      activeProposal: movementState.activeProposal,
      votingSummary: movementState.votingSummary
    };

    const response: GetPartyMovementStateResponse = {
      success: true,
      movementSystem
    };

    return res.json(response);
  } catch (error) {
    logger.error('Failed to get party movement state:', error);
    const response: GetPartyMovementStateResponse = {
      success: false,
      error: 'パーティ移動状態の取得に失敗しました'
    };
    return res.status(500).json(response);
  }
}));

// ==========================================
// 移動提案作成
// ==========================================

partyMovementRouter.post('/proposals', asyncHandler(async (req, res) => {
  const proposalRequest = req.body as CreateMovementProposalRequest;

  if (!proposalRequest.sessionId || !proposalRequest.proposerId || !proposalRequest.targetLocationId) {
    throw new ValidationError('Session ID, proposer ID, and target location ID are required');
  }

  if (!proposalRequest.movementMethod || !proposalRequest.reason) {
    throw new ValidationError('Movement method and reason are required');
  }

  try {
    const response = await partyMovementService.createMovementProposal(proposalRequest);
    
    if (response.success) {
      logger.info(`Movement proposal created successfully: ${response.proposal?.id}`);
      res.status(201).json(response);
    } else {
      res.status(400).json(response);
    }
  } catch (error) {
    logger.error('Failed to create movement proposal:', error);
    const response: CreateMovementProposalResponse = {
      success: false,
      error: '移動提案の作成に失敗しました'
    };
    res.status(500).json(response);
  }
}));

// ==========================================
// 投票
// ==========================================

partyMovementRouter.post('/votes', asyncHandler(async (req, res) => {
  const voteRequest = req.body as CastMovementVoteRequest;

  if (!voteRequest.proposalId || !voteRequest.voterId || !voteRequest.choice) {
    throw new ValidationError('Proposal ID, voter ID, and choice are required');
  }

  if (!['approve', 'reject', 'abstain'].includes(voteRequest.choice)) {
    throw new ValidationError('Invalid vote choice. Must be approve, reject, or abstain');
  }

  try {
    const response = await partyMovementService.castVote(voteRequest);
    
    if (response.success) {
      logger.info(`Vote cast successfully for proposal ${voteRequest.proposalId} by ${voteRequest.voterId}`);
      res.json(response);
    } else {
      res.status(400).json(response);
    }
  } catch (error) {
    logger.error('Failed to cast vote:', error);
    const response: CastMovementVoteResponse = {
      success: false,
      consensusReached: false,
      error: '投票に失敗しました'
    };
    res.status(500).json(response);
  }
}));

// ==========================================
// 移動実行
// ==========================================

partyMovementRouter.post('/execute', asyncHandler(async (req, res) => {
  const executeRequest = req.body as ExecutePartyMovementRequest;

  if (!executeRequest.proposalId || !executeRequest.sessionId) {
    throw new ValidationError('Proposal ID and session ID are required');
  }

  try {
    const response = await partyMovementService.executePartyMovement(executeRequest);
    
    if (response.success) {
      logger.info(`Party movement executed successfully: ${executeRequest.proposalId}`);
      res.json(response);
    } else {
      res.status(400).json(response);
    }
  } catch (error) {
    logger.error('Failed to execute party movement:', error);
    const response: ExecutePartyMovementResponse = {
      success: false,
      error: 'パーティ移動の実行に失敗しました'
    };
    res.status(500).json(response);
  }
}));

// ==========================================
// 投票集計取得
// ==========================================

partyMovementRouter.get('/proposals/:proposalId/voting-summary', asyncHandler(async (req, res) => {
  const { proposalId } = req.params;

  if (!proposalId) {
    throw new ValidationError('Proposal ID is required');
  }

  try {
    const votingSummary = await partyMovementService.getVotingSummary(proposalId);
    res.json({
      success: true,
      votingSummary
    });
  } catch (error) {
    logger.error('Failed to get voting summary:', error);
    res.status(500).json({
      success: false,
      error: '投票集計の取得に失敗しました'
    });
  }
}));

// ==========================================
// 合意設定管理
// ==========================================

partyMovementRouter.get('/settings/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  try {
    const settings = await partyMovementService.getConsensusSettings(sessionId);
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    logger.error('Failed to get consensus settings:', error);
    res.status(500).json({
      success: false,
      error: '合意設定の取得に失敗しました'
    });
  }
}));

partyMovementRouter.put('/settings/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const updateRequest = req.body as UpdateConsensusSettingsRequest;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  try {
    const updatedSettings = await partyMovementService.updateConsensusSettings(
      sessionId,
      updateRequest.settings
    );

    const response: UpdateConsensusSettingsResponse = {
      success: true,
      settings: updatedSettings
    };

    logger.info(`Consensus settings updated for session ${sessionId}`);
    res.json(response);
  } catch (error) {
    logger.error('Failed to update consensus settings:', error);
    const response: UpdateConsensusSettingsResponse = {
      success: false,
      error: '合意設定の更新に失敗しました'
    };
    res.status(500).json(response);
  }
}));

// ==========================================
// 提案キャンセル
// ==========================================

partyMovementRouter.delete('/proposals/:proposalId', asyncHandler(async (req, res) => {
  const { proposalId } = req.params;
  const { reason } = req.body;

  if (!proposalId) {
    throw new ValidationError('Proposal ID is required');
  }

  try {
    // 提案をキャンセル（rejected状態にする）
    await partyMovementService.updateProposalStatus(proposalId, 'rejected');
    
    logger.info(`Movement proposal cancelled: ${proposalId}`, { reason });
    res.json({
      success: true,
      message: '移動提案がキャンセルされました'
    });
  } catch (error) {
    logger.error('Failed to cancel movement proposal:', error);
    res.status(500).json({
      success: false,
      error: '移動提案のキャンセルに失敗しました'
    });
  }
}));

// ==========================================
// 移動履歴取得
// ==========================================

partyMovementRouter.get('/history/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { limit = '10', page = '1' } = req.query;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  try {
    const movementState = await partyMovementService.getPartyMovementState(sessionId);
    
    if (!movementState) {
      return res.status(404).json({
        success: false,
        error: 'セッションが見つかりません'
      });
    }

    const limitNum = parseInt(limit as string) || 10;
    const pageNum = parseInt(page as string) || 1;
    const offset = (pageNum - 1) * limitNum;
    
    const history = movementState.recentMovements.slice(offset, offset + limitNum);

    return res.json({
      success: true,
      history,
      pagination: {
        currentPage: pageNum,
        totalItems: movementState.recentMovements.length,
        itemsPerPage: limitNum,
        totalPages: Math.ceil(movementState.recentMovements.length / limitNum)
      }
    });
  } catch (error) {
    logger.error('Failed to get movement history:', error);
    return res.status(500).json({
      success: false,
      error: '移動履歴の取得に失敗しました'
    });
  }
}));

// ==========================================
// ヘルスチェック
// ==========================================

partyMovementRouter.get('/health', asyncHandler(async (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'party-movement'
  });
}));

export default partyMovementRouter;