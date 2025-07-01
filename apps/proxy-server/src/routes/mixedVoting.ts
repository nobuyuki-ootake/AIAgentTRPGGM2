// ==========================================
// 混合投票システムAPI（人間PC + AI PC統合投票管理）
// ==========================================

import express from 'express';
import { mixedVotingService } from '../services/mixedVotingService';
import { logger } from '../utils/logger';
import {
  SendVotingReminderRequest,
  GetMixedVotingStatusRequest,
  UpdateMixedVotingFlowRequest
} from '@repo/types';

const router = express.Router();

// ==========================================
// 混合投票状況取得
// ==========================================

router.get('/status/:proposalId', async (req, res) => {
  try {
    const proposalId = req.params.proposalId;
    
    const request: GetMixedVotingStatusRequest = {
      proposalId
    };

    const response = await mixedVotingService.getMixedVotingStatus(request);
    res.json(response);

  } catch (error) {
    logger.error('Failed to get mixed voting status:', error);
    res.status(500).json({
      success: false,
      realTimeStats: {
        humanVotingProgress: 0,
        aiVotingProgress: 0,
        pendingHumanVoters: [],
        processingAiVoters: []
      },
      error: '混合投票状況の取得に失敗しました'
    });
  }
});

// ==========================================
// 投票催促送信
// ==========================================

router.post('/remind', async (req, res) => {
  try {
    const request: SendVotingReminderRequest = {
      proposalId: req.body.proposalId,
      targetVoterIds: req.body.targetVoterIds,
      reminderMessage: req.body.reminderMessage
    };

    // 必須フィールドの検証
    if (!request.proposalId) {
      return res.status(400).json({
        success: false,
        remindersSent: 0,
        targetVoters: [],
        error: '提案IDが必要です'
      });
    }

    const response = await mixedVotingService.sendVotingReminder(request);
    res.json(response);

  } catch (error) {
    logger.error('Failed to send voting reminders:', error);
    res.status(500).json({
      success: false,
      remindersSent: 0,
      targetVoters: [],
      error: '投票催促の送信に失敗しました'
    });
  }
});

// ==========================================
// 投票フロー設定更新
// ==========================================

router.put('/flow/:proposalId', async (req, res) => {
  try {
    const proposalId = req.params.proposalId;
    
    const request: UpdateMixedVotingFlowRequest = {
      proposalId,
      flowSettings: req.body.flowSettings
    };

    if (!proposalId) {
      return res.status(400).json({
        success: false,
        error: '提案IDが必要です'
      });
    }

    const response = await mixedVotingService.updateMixedVotingFlow(request);
    res.json(response);

  } catch (error) {
    logger.error('Failed to update mixed voting flow:', error);
    res.status(500).json({
      success: false,
      error: '投票フロー設定の更新に失敗しました'
    });
  }
});

// ==========================================
// 投票進捗サマリー取得
// ==========================================

router.get('/progress/:proposalId', async (req, res) => {
  try {
    const proposalId = req.params.proposalId;
    
    const statusResponse = await mixedVotingService.getMixedVotingStatus({ proposalId });
    
    if (!statusResponse.success || !statusResponse.votingSummary) {
      return res.status(404).json({
        success: false,
        error: '投票情報が見つかりません'
      });
    }

    const summary = statusResponse.votingSummary;
    const stats = statusResponse.realTimeStats;

    // 簡潔な進捗情報を構築
    const progressSummary = {
      proposalId,
      overallProgress: Math.round(
        ((summary.votingStatistics.humanVoters.voted + summary.votingStatistics.aiVoters.voted) / 
         summary.totalEligibleVoters) * 100
      ),
      consensusReached: summary.consensusReached,
      consensusType: summary.consensusType,
      
      humanProgress: {
        percentage: Math.round(stats.humanVotingProgress),
        voted: summary.votingStatistics.humanVoters.voted,
        total: summary.votingStatistics.humanVoters.total,
        pending: stats.pendingHumanVoters
      },
      
      aiProgress: {
        percentage: Math.round(stats.aiVotingProgress),
        voted: summary.votingStatistics.aiVoters.voted,
        total: summary.votingStatistics.aiVoters.total,
        processing: stats.processingAiVoters
      },
      
      votes: {
        approve: summary.votes.approve,
        reject: summary.votes.reject,
        abstain: summary.votes.abstain,
        required: summary.requiredApprovals
      },
      
      estimatedCompletion: stats.estimatedCompletion,
      remindersSent: summary.remindersSent,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      progress: progressSummary
    });

  } catch (error) {
    logger.error('Failed to get voting progress:', error);
    res.status(500).json({
      success: false,
      error: '投票進捗の取得に失敗しました'
    });
  }
});

// ==========================================
// 投票者詳細情報取得
// ==========================================

router.get('/voters/:proposalId', async (req, res) => {
  try {
    const proposalId = req.params.proposalId;
    const showAiDetails = req.query.showAiDetails === 'true';
    
    const statusResponse = await mixedVotingService.getMixedVotingStatus({ proposalId });
    
    if (!statusResponse.success || !statusResponse.votingSummary) {
      return res.status(404).json({
        success: false,
        voters: [],
        error: '投票情報が見つかりません'
      });
    }

    let voterDetails = statusResponse.votingSummary.voterDetails;

    // AI詳細情報を除外するオプション
    if (!showAiDetails) {
      voterDetails = voterDetails.map(voter => {
        if (voter.voterType === 'ai_agent') {
          return {
            ...voter,
            voteReason: voter.hasVoted ? 'AI判断による投票' : undefined,
            aiDecisionFactors: undefined
          };
        }
        return voter;
      });
    }

    // 投票者を分類
    const humanVoters = voterDetails.filter(v => v.voterType === 'human');
    const aiVoters = voterDetails.filter(v => v.voterType === 'ai_agent');

    res.json({
      success: true,
      voters: {
        all: voterDetails,
        human: humanVoters,
        ai: aiVoters
      },
      statistics: statusResponse.votingSummary.votingStatistics
    });

  } catch (error) {
    logger.error('Failed to get voter details:', error);
    res.status(500).json({
      success: false,
      voters: [],
      error: '投票者詳細の取得に失敗しました'
    });
  }
});

// ==========================================
// 自動催促機能トリガー
// ==========================================

router.post('/auto-remind/:proposalId', async (req, res) => {
  try {
    const proposalId = req.params.proposalId;
    const forceRemind = req.body.forceRemind === true;
    
    // 投票状況をチェック
    const statusResponse = await mixedVotingService.getMixedVotingStatus({ proposalId });
    
    if (!statusResponse.success || !statusResponse.votingSummary) {
      return res.status(404).json({
        success: false,
        remindersSent: 0,
        error: '投票情報が見つかりません'
      });
    }

    const summary = statusResponse.votingSummary;
    
    // 催促が必要かチェック
    const pendingHumanVoters = summary.voterDetails.filter(v => 
      v.voterType === 'human' && !v.hasVoted
    );

    if (pendingHumanVoters.length === 0 && !forceRemind) {
      return res.json({
        success: true,
        remindersSent: 0,
        message: '催促が必要な人間投票者はいません'
      });
    }

    // 最後の催促から十分時間が経過しているかチェック
    const lastReminderTime = summary.lastReminderAt ? new Date(summary.lastReminderAt).getTime() : 0;
    const now = Date.now();
    const minReminderInterval = 5 * 60 * 1000; // 5分

    if (now - lastReminderTime < minReminderInterval && !forceRemind) {
      return res.json({
        success: true,
        remindersSent: 0,
        message: '前回の催促から間もないため、催促をスキップしました'
      });
    }

    // 催促を送信
    const reminderResponse = await mixedVotingService.sendVotingReminder({
      proposalId,
      reminderMessage: '⏰ 投票締切が近づいています。早めの投票をお願いします。'
    });

    res.json(reminderResponse);

  } catch (error) {
    logger.error('Failed to trigger auto reminder:', error);
    res.status(500).json({
      success: false,
      remindersSent: 0,
      error: '自動催促の実行に失敗しました'
    });
  }
});

// ==========================================
// ヘルスチェック
// ==========================================

router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      service: 'mixed-voting',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: [
        'mixed_voting_status',
        'voting_reminders',
        'flow_management',
        'progress_tracking',
        'voter_details',
        'auto_reminders'
      ]
    });
  } catch (error) {
    logger.error('Mixed voting health check failed:', error);
    res.status(500).json({
      success: false,
      service: 'mixed-voting',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '不明なエラー'
    });
  }
});

export default router;