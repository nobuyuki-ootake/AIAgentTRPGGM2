// ==========================================
// 混合投票システムサービス（人間PC + AI PC統合投票管理）
// ==========================================

import { v4 as uuidv4 } from 'uuid';
import { database } from '../database/database';
import { logger } from '../utils/logger';
import {
  VotingSummary,
  MovementVote,
  MixedVotingFlowState,
  VotingNotification,
  SendVotingReminderRequest,
  SendVotingReminderResponse,
  GetMixedVotingStatusRequest,
  GetMixedVotingStatusResponse,
  UpdateMixedVotingFlowRequest,
  UpdateMixedVotingFlowResponse,
  VoteChoice
} from '@ai-agent-trpg/types';

export class MixedVotingService {
  private initialized = false;

  constructor() {
    // Lazy initialization - database will be initialized on first use
  }

  // ==========================================
  // データベース初期化
  // ==========================================

  private ensureInitialized() {
    if (!this.initialized) {
      this.initializeDatabase();
      this.initialized = true;
    }
  }

  private initializeDatabase() {
    try {
      // 混合投票フロー状態テーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS mixed_voting_flow_states (
          proposal_id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          current_phase TEXT NOT NULL,
          human_voting_started_at TEXT,
          ai_voting_started_at TEXT,
          voting_time_limit INTEGER NOT NULL,
          voting_order TEXT NOT NULL,
          reminder_settings TEXT NOT NULL,
          auto_progress_settings TEXT NOT NULL,
          last_updated TEXT NOT NULL
        )
      `);

      // 投票通知テーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS voting_notifications (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          proposal_id TEXT NOT NULL,
          target_voter_id TEXT,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          urgency TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at TEXT,
          acknowledged BOOLEAN NOT NULL
        )
      `);

      // 混合投票統計テーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS mixed_voting_statistics (
          proposal_id TEXT PRIMARY KEY,
          human_voters_total INTEGER NOT NULL,
          human_voters_voted INTEGER NOT NULL,
          ai_voters_total INTEGER NOT NULL,
          ai_voters_voted INTEGER NOT NULL,
          last_reminder_sent_at TEXT,
          reminders_sent_count INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // インデックス作成
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_voting_notifications_proposal_target 
        ON voting_notifications(proposal_id, target_voter_id)
      `);

      logger.info('Mixed voting database initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize mixed voting database:', error);
      throw error;
    }
  }

  // ==========================================
  // 混合投票状況取得
  // ==========================================

  async getMixedVotingStatus(request: GetMixedVotingStatusRequest): Promise<GetMixedVotingStatusResponse> {
    this.ensureInitialized();
    try {
      // 基本的な投票サマリーを取得
      const votingSummary = await this.calculateEnhancedVotingSummary(request.proposalId);
      
      if (!votingSummary) {
        return {
          success: false,
          realTimeStats: {
            humanVotingProgress: 0,
            aiVotingProgress: 0,
            pendingHumanVoters: [],
            processingAiVoters: []
          },
          error: '投票情報が見つかりません'
        };
      }

      // リアルタイム統計を計算
      const realTimeStats = {
        humanVotingProgress: votingSummary.votingStatistics.humanVoters.total > 0 ? 
          (votingSummary.votingStatistics.humanVoters.voted / votingSummary.votingStatistics.humanVoters.total) * 100 : 100,
        aiVotingProgress: votingSummary.votingStatistics.aiVoters.total > 0 ? 
          (votingSummary.votingStatistics.aiVoters.voted / votingSummary.votingStatistics.aiVoters.total) * 100 : 100,
        estimatedCompletion: this.calculateEstimatedCompletion(votingSummary),
        pendingHumanVoters: votingSummary.voterDetails
          .filter(voter => voter.voterType === 'human' && !voter.hasVoted)
          .map(voter => voter.voterName),
        processingAiVoters: votingSummary.voterDetails
          .filter(voter => voter.voterType === 'ai_agent' && !voter.hasVoted)
          .map(voter => voter.voterName)
      };

      return {
        success: true,
        votingSummary,
        realTimeStats
      };

    } catch (error) {
      logger.error('Failed to get mixed voting status:', error);
      return {
        success: false,
        realTimeStats: {
          humanVotingProgress: 0,
          aiVotingProgress: 0,
          pendingHumanVoters: [],
          processingAiVoters: []
        },
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  // ==========================================
  // 投票催促システム
  // ==========================================

  async sendVotingReminder(request: SendVotingReminderRequest): Promise<SendVotingReminderResponse> {
    try {
      // 投票サマリーを取得
      const votingSummary = await this.calculateEnhancedVotingSummary(request.proposalId);
      
      if (!votingSummary) {
        return {
          success: false,
          remindersSent: 0,
          targetVoters: [],
          error: '投票情報が見つかりません'
        };
      }

      // 対象投票者を決定
      let targetVoters = votingSummary.voterDetails;

      if (request.targetVoterIds) {
        targetVoters = targetVoters.filter(voter => 
          request.targetVoterIds!.includes(voter.voterId)
        );
      } else {
        // 未投票の人間PCのみを対象
        targetVoters = targetVoters.filter(voter => 
          voter.voterType === 'human' && !voter.hasVoted
        );
      }

      const reminderResults = [];
      let remindersSent = 0;

      for (const voter of targetVoters) {
        try {
          // 催促通知を作成
          const notification: VotingNotification = {
            id: uuidv4(),
            type: 'reminder',
            proposalId: request.proposalId,
            targetVoterId: voter.voterId,
            title: '🗳️ パーティ移動投票のお願い',
            message: request.reminderMessage || 
              `${voter.voterName}さん、パーティ移動の投票をお願いします。現在の進捗: ${votingSummary.currentApprovals}/${votingSummary.requiredApprovals}`,
            urgency: this.calculateReminderUrgency(votingSummary),
            createdAt: new Date().toISOString(),
            expiresAt: votingSummary.votingDeadline,
            acknowledged: false
          };

          await this.saveVotingNotification(notification);
          
          reminderResults.push({
            voterId: voter.voterId,
            voterName: voter.voterName,
            voterType: voter.voterType as 'human' | 'ai_agent',
            reminderSent: true
          });

          remindersSent++;

          // TODO: 実際の通知システム（WebSocket、Push通知など）との統合
          logger.info(`Voting reminder sent to ${voter.voterName} for proposal ${request.proposalId}`);

        } catch (error) {
          logger.error(`Failed to send reminder to ${voter.voterName}:`, error);
          
          reminderResults.push({
            voterId: voter.voterId,
            voterName: voter.voterName,
            voterType: voter.voterType as 'human' | 'ai_agent',
            reminderSent: false
          });
        }
      }

      // 催促統計を更新
      await this.updateReminderStatistics(request.proposalId, remindersSent);

      return {
        success: true,
        remindersSent,
        targetVoters: reminderResults
      };

    } catch (error) {
      logger.error('Failed to send voting reminders:', error);
      return {
        success: false,
        remindersSent: 0,
        targetVoters: [],
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  // ==========================================
  // 投票フロー管理
  // ==========================================

  async initializeMixedVotingFlow(proposalId: string, sessionId: string): Promise<MixedVotingFlowState> {
    const defaultFlowState: MixedVotingFlowState = {
      proposalId,
      sessionId,
      currentPhase: 'proposal_created',
      votingTimeLimit: 15, // 15分
      votingOrder: 'parallel', // 人間とAIが並行投票
      reminderSettings: {
        enableReminders: true,
        reminderIntervals: [5, 10], // 5分後、10分後に催促
        maxReminders: 2
      },
      autoProgressSettings: {
        enableAutoProgress: true,
        humanVotingTimeout: 15, // 人間投票15分タイムアウト
        aiVotingTimeout: 5, // AI投票5分タイムアウト
        autoCompleteOnMajority: true
      },
      lastUpdated: new Date().toISOString()
    };

    await this.saveMixedVotingFlowState(defaultFlowState);
    return defaultFlowState;
  }

  async updateMixedVotingFlow(request: UpdateMixedVotingFlowRequest): Promise<UpdateMixedVotingFlowResponse> {
    try {
      const currentFlow = await this.getMixedVotingFlowState(request.proposalId);
      
      if (!currentFlow) {
        return {
          success: false,
          error: '投票フロー状態が見つかりません'
        };
      }

      const updatedFlow: MixedVotingFlowState = {
        ...currentFlow,
        ...request.flowSettings,
        lastUpdated: new Date().toISOString()
      };

      await this.saveMixedVotingFlowState(updatedFlow);

      return {
        success: true,
        flowState: updatedFlow
      };

    } catch (error) {
      logger.error('Failed to update mixed voting flow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  // ==========================================
  // 拡張投票サマリー計算
  // ==========================================

  private async calculateEnhancedVotingSummary(proposalId: string): Promise<VotingSummary | null> {
    try {
      // 基本的な投票・提案データを取得
      const proposalRow = database.prepare(`
        SELECT * FROM party_movement_proposals WHERE id = ?
      `).get(proposalId) as any;

      if (!proposalRow) {
        return null;
      }

      const votesRows = database.prepare(`
        SELECT * FROM party_movement_votes WHERE proposal_id = ?
      `).all(proposalId) as any[];

      const votes = votesRows.map(row => this.rowToMovementVote(row));

      // パーティメンバー情報を取得
      const partyMembersRows = database.prepare(`
        SELECT id, name, character_type, player_id 
        FROM characters 
        WHERE session_id = ? AND character_type = 'PC'
      `).all(proposalRow.session_id) as any[];

      // 人間PCとAI PCを分類
      const humanVoters = partyMembersRows.filter(member => 
        member.player_id && member.player_id !== 'ai-agent'
      );
      const aiVoters = partyMembersRows.filter(member => 
        !member.player_id || member.player_id === 'ai-agent'
      );

      // 投票詳細を構築
      const voterDetails = partyMembersRows.map(member => {
        const vote = votes.find(v => v.voterId === member.id);
        const isProposer = member.id === proposalRow.proposer_id;
        const voterType: "npc" | "human" | "ai_agent" = (!member.player_id || member.player_id === 'ai-agent') ? 'ai_agent' : 'human';

        return {
          voterId: member.id,
          voterName: member.name,
          choice: vote?.choice || 'abstain' as VoteChoice,
          hasVoted: !!vote,
          isProposer,
          voterType,
          voteReason: vote?.reason,
          votedAt: vote?.timestamp,
          aiDecisionFactors: vote?.aiDecisionFactors
        };
      });

      // 投票統計を計算
      const humanVotingStats = {
        total: humanVoters.length,
        voted: voterDetails.filter(v => v.voterType === 'human' && v.hasVoted).length,
        pending: voterDetails.filter(v => v.voterType === 'human' && !v.hasVoted).length,
        breakdown: {
          approve: voterDetails.filter(v => v.voterType === 'human' && v.choice === 'approve').length,
          reject: voterDetails.filter(v => v.voterType === 'human' && v.choice === 'reject').length,
          abstain: voterDetails.filter(v => v.voterType === 'human' && v.choice === 'abstain').length
        }
      };

      const aiVotingStats = {
        total: aiVoters.length,
        voted: voterDetails.filter(v => v.voterType === 'ai_agent' && v.hasVoted).length,
        processing: voterDetails.filter(v => v.voterType === 'ai_agent' && !v.hasVoted).length,
        breakdown: {
          approve: voterDetails.filter(v => v.voterType === 'ai_agent' && v.choice === 'approve').length,
          reject: voterDetails.filter(v => v.voterType === 'ai_agent' && v.choice === 'reject').length,
          abstain: voterDetails.filter(v => v.voterType === 'ai_agent' && v.choice === 'abstain').length
        }
      };

      const totalVotes = {
        approve: votes.filter(v => v.choice === 'approve').length,
        reject: votes.filter(v => v.choice === 'reject').length,
        abstain: votes.filter(v => v.choice === 'abstain').length
      };

      const totalEligibleVoters = voterDetails.length;
      const requiredApprovals = Math.ceil(totalEligibleVoters / 2);
      const consensusReached = totalVotes.approve >= requiredApprovals;

      const votingSummary: VotingSummary = {
        proposalId,
        totalEligibleVoters,
        votes: totalVotes,
        voterDetails,
        votingStatistics: {
          humanVoters: humanVotingStats,
          aiVoters: aiVotingStats
        },
        consensusReached,
        consensusType: totalVotes.approve === totalEligibleVoters ? 'unanimous' : 
                      consensusReached ? 'majority' : 'none',
        requiredApprovals,
        currentApprovals: totalVotes.approve,
        votingDeadline: proposalRow.voting_deadline,
        remindersSent: await this.getReminderCount(proposalId),
        lastReminderAt: await this.getLastReminderTime(proposalId)
      };

      return votingSummary;

    } catch (error) {
      logger.error('Failed to calculate enhanced voting summary:', error);
      return null;
    }
  }

  // ==========================================
  // ユーティリティメソッド
  // ==========================================

  private calculateEstimatedCompletion(votingSummary: VotingSummary): string | undefined {
    if (votingSummary.consensusReached) {
      return new Date().toISOString(); // 既に完了
    }

    const pendingHumans = votingSummary.votingStatistics.humanVoters.pending;
    const processingAi = votingSummary.votingStatistics.aiVoters.processing;

    if (pendingHumans === 0 && processingAi === 0) {
      return new Date().toISOString(); // 全員投票済み
    }

    // 簡単な推定（AI投票は2-5分、人間投票は5-15分と仮定）
    const estimatedMinutes = Math.max(processingAi * 3, pendingHumans * 8);
    const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60 * 1000);
    
    return estimatedCompletion.toISOString();
  }

  private calculateReminderUrgency(votingSummary: VotingSummary): 'low' | 'medium' | 'high' {
    const progressPercentage = (votingSummary.currentApprovals / votingSummary.requiredApprovals) * 100;
    const timeRemaining = votingSummary.votingDeadline ? 
      new Date(votingSummary.votingDeadline).getTime() - Date.now() : Infinity;

    if (timeRemaining < 5 * 60 * 1000) { // 5分未満
      return 'high';
    } else if (progressPercentage < 50 || timeRemaining < 10 * 60 * 1000) { // 10分未満または進捗50%未満
      return 'medium';
    } else {
      return 'low';
    }
  }

  // データベース操作メソッド
  private async saveMixedVotingFlowState(flowState: MixedVotingFlowState): Promise<void> {
    const stmt = database.prepare(`
      INSERT OR REPLACE INTO mixed_voting_flow_states (
        proposal_id, session_id, current_phase, human_voting_started_at,
        ai_voting_started_at, voting_time_limit, voting_order,
        reminder_settings, auto_progress_settings, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      flowState.proposalId,
      flowState.sessionId,
      flowState.currentPhase,
      flowState.humanVotingStartedAt || null,
      flowState.aiVotingStartedAt || null,
      flowState.votingTimeLimit,
      flowState.votingOrder,
      JSON.stringify(flowState.reminderSettings),
      JSON.stringify(flowState.autoProgressSettings),
      flowState.lastUpdated
    );
  }

  private async getMixedVotingFlowState(proposalId: string): Promise<MixedVotingFlowState | null> {
    const row = database.prepare(`
      SELECT * FROM mixed_voting_flow_states WHERE proposal_id = ?
    `).get(proposalId) as any;

    if (!row) return null;

    return {
      proposalId: row.proposal_id,
      sessionId: row.session_id,
      currentPhase: row.current_phase,
      humanVotingStartedAt: row.human_voting_started_at,
      aiVotingStartedAt: row.ai_voting_started_at,
      votingTimeLimit: row.voting_time_limit,
      votingOrder: row.voting_order,
      reminderSettings: JSON.parse(row.reminder_settings),
      autoProgressSettings: JSON.parse(row.auto_progress_settings),
      lastUpdated: row.last_updated
    };
  }

  private async saveVotingNotification(notification: VotingNotification): Promise<void> {
    const stmt = database.prepare(`
      INSERT INTO voting_notifications (
        id, type, proposal_id, target_voter_id, title, message,
        urgency, created_at, expires_at, acknowledged
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      notification.id,
      notification.type,
      notification.proposalId,
      notification.targetVoterId || null,
      notification.title,
      notification.message,
      notification.urgency,
      notification.createdAt,
      notification.expiresAt || null,
      notification.acknowledged
    );
  }

  private async updateReminderStatistics(proposalId: string, remindersSent: number): Promise<void> {
    const timestamp = new Date().toISOString();
    
    const stmt = database.prepare(`
      INSERT OR REPLACE INTO mixed_voting_statistics (
        proposal_id, human_voters_total, human_voters_voted, ai_voters_total,
        ai_voters_voted, last_reminder_sent_at, reminders_sent_count, created_at, updated_at
      ) VALUES (?, 
        COALESCE((SELECT human_voters_total FROM mixed_voting_statistics WHERE proposal_id = ?), 0),
        COALESCE((SELECT human_voters_voted FROM mixed_voting_statistics WHERE proposal_id = ?), 0),
        COALESCE((SELECT ai_voters_total FROM mixed_voting_statistics WHERE proposal_id = ?), 0),
        COALESCE((SELECT ai_voters_voted FROM mixed_voting_statistics WHERE proposal_id = ?), 0),
        ?, 
        COALESCE((SELECT reminders_sent_count FROM mixed_voting_statistics WHERE proposal_id = ?), 0) + ?,
        COALESCE((SELECT created_at FROM mixed_voting_statistics WHERE proposal_id = ?), ?),
        ?
      )
    `);

    stmt.run(proposalId, proposalId, proposalId, proposalId, proposalId, timestamp, proposalId, remindersSent, proposalId, timestamp, timestamp);
  }

  private async getReminderCount(proposalId: string): Promise<number> {
    const row = database.prepare(`
      SELECT reminders_sent_count FROM mixed_voting_statistics WHERE proposal_id = ?
    `).get(proposalId) as any;

    return row?.reminders_sent_count || 0;
  }

  private async getLastReminderTime(proposalId: string): Promise<string | undefined> {
    const row = database.prepare(`
      SELECT last_reminder_sent_at FROM mixed_voting_statistics WHERE proposal_id = ?
    `).get(proposalId) as any;

    return row?.last_reminder_sent_at || undefined;
  }

  private rowToMovementVote(row: any): MovementVote {
    return {
      id: row.id,
      proposalId: row.proposal_id,
      voterId: row.voter_id,
      choice: row.choice,
      reason: row.reason,
      timestamp: row.timestamp,
      voterType: row.voter_type || 'human', // デフォルトは人間
      aiDecisionFactors: row.ai_decision_factors ? JSON.parse(row.ai_decision_factors) : undefined
    };
  }
}

// シングルトンインスタンス
export const mixedVotingService = new MixedVotingService();