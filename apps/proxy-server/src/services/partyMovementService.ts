import {
  PartyMovementProposal,
  MovementVote,
  VotingSummary,
  PartyMovementState,
  CreateMovementProposalRequest,
  CreateMovementProposalResponse,
  CastMovementVoteRequest,
  CastMovementVoteResponse,
  ExecutePartyMovementRequest,
  ExecutePartyMovementResponse,
  ConsensusSettings,
  MovementProposalStatus,
  VoteChoice,
  ID
} from '@ai-agent-trpg/types';
import { database } from '../database/database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { aiAgentMonitoringService } from './aiAgentMonitoringService';
import { getTimeManagementService } from './timeManagementService';
import { locationService } from './locationService';

class PartyMovementService {
  // ==========================================
  // パーティ移動状態管理
  // ==========================================

  // proposalIdからsessionIdを取得
  async getSessionIdFromProposal(proposalId: ID): Promise<ID | null> {
    try {
      const row = database.prepare(`
        SELECT session_id FROM party_movement_proposals WHERE id = ?
      `).get(proposalId) as { session_id: ID } | undefined;
      
      return row?.session_id || null;
    } catch (error) {
      logger.error('Failed to get sessionId from proposal:', error);
      return null;
    }
  }

  async getPartyMovementState(sessionId: ID): Promise<PartyMovementState | null> {
    try {
      // パーティメンバー取得（セッション参加者）
      const membersRows = database.prepare(`
        SELECT c.id, c.name, c.character_type, c.current_location_id,
               CASE WHEN c.character_type = 'PC' THEN 1 ELSE 0 END as is_leader
        FROM characters c
        JOIN sessions s ON c.campaign_id = (
          SELECT campaign_id FROM sessions WHERE id = ?
        )
        WHERE c.character_type IN ('PC', 'NPC')
        ORDER BY c.character_type ASC, c.name ASC
      `).all(sessionId) as any[];

      const partyMembers = membersRows.map(row => ({
        characterId: row.id as ID,
        characterName: row.name,
        characterType: row.character_type as 'PC' | 'NPC',
        isLeader: row.is_leader === 1,
        isPresent: true // 現在は全員が参加しているとみなす
      }));

      if (partyMembers.length === 0) {
        return null;
      }

      // 現在位置を取得（最初のキャラクターの位置をパーティ位置とする）
      const currentLocationId = membersRows[0]?.current_location_id || '';

      // アクティブな提案を取得
      const activeProposal = await this.getActiveProposal(sessionId);

      // 最近の移動履歴を取得
      const recentMovements = await this.getRecentMovements(sessionId, 10);

      // 移動制限を確認
      const movementRestrictions = await this.getMovementRestrictions(sessionId);

      const state: PartyMovementState = {
        sessionId,
        currentLocationId,
        partyMembers,
        activeProposal: activeProposal || undefined,
        votingSummary: activeProposal ? await this.getVotingSummary(activeProposal.id) : undefined,
        recentMovements,
        movementRestrictions,
        lastUpdated: new Date().toISOString(),
        version: 1
      };

      return state;
    } catch (error) {
      logger.error('Failed to get party movement state:', error);
      throw error;
    }
  }

  // ==========================================
  // 移動提案システム
  // ==========================================

  async createMovementProposal(request: CreateMovementProposalRequest): Promise<CreateMovementProposalResponse> {
    try {
      // 既存のアクティブな提案がないかチェック
      const existingProposal = await this.getActiveProposal(request.sessionId);
      if (existingProposal) {
        return {
          success: false,
          error: '既にアクティブな移動提案が存在します'
        };
      }

      // 移動提案を作成
      const proposal: PartyMovementProposal = {
        id: uuidv4(),
        sessionId: request.sessionId,
        proposerId: request.proposerId,
        targetLocationId: request.targetLocationId,
        movementMethod: request.movementMethod,
        reason: request.reason,
        estimatedTime: await this.estimateMovementTime(
          request.sessionId,
          request.targetLocationId,
          request.movementMethod
        ),
        estimatedCost: {
          actionPoints: 1 // 基本的には1ターン消費
        },
        status: 'voting' as MovementProposalStatus,
        createdAt: new Date().toISOString(),
        votingDeadline: request.votingDeadline,
        urgency: request.urgency,
        difficulty: await this.assessMovementDifficulty(request.targetLocationId),
        tags: []
      };

      // データベースに保存
      await this.saveMovementProposal(proposal);

      // 提案者の自動賛成投票を作成
      const proposerVote: MovementVote = {
        id: uuidv4(),
        proposalId: proposal.id,
        voterId: request.proposerId,
        voterType: 'human', // 提案者は人間PCとして扱う
        choice: 'approve',
        reason: '提案者による自動賛成',
        timestamp: new Date().toISOString()
      };
      await this.saveMovementVote(proposerVote);

      logger.info(`Movement proposal created with auto-approval: ${proposal.id}`, { proposal, proposerVote });

      // AI Agent キャラクターの自動投票をスケジュール（非同期）
      this.scheduleAIAgentVoting(proposal.id, request.sessionId).catch(error => {
        logger.error(`Failed to schedule AI agent voting for proposal ${proposal.id}:`, error);
      });

      return {
        success: true,
        proposal
      };
    } catch (error) {
      logger.error('Failed to create movement proposal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '移動提案の作成に失敗しました'
      };
    }
  }

  async getActiveProposal(sessionId: ID): Promise<PartyMovementProposal | null> {
    const row = database.prepare(`
      SELECT * FROM party_movement_proposals 
      WHERE session_id = ? AND status IN ('pending', 'voting') 
      ORDER BY created_at DESC LIMIT 1
    `).get(sessionId) as any;

    return row ? this.rowToMovementProposal(row) : null;
  }

  // ==========================================
  // 投票システム
  // ==========================================

  async castVote(request: CastMovementVoteRequest): Promise<CastMovementVoteResponse> {
    try {
      const proposal = await this.getMovementProposalById(request.proposalId);
      if (!proposal) {
        return {
          success: false,
          consensusReached: false,
          error: '移動提案が見つかりません'
        };
      }

      if (proposal.status !== 'voting') {
        return {
          success: false,
          consensusReached: false,
          error: '投票期間が終了しています'
        };
      }

      // 既存の投票をチェック・更新
      const existingVote = await this.getVoteByVoter(request.proposalId, request.voterId);
      
      const vote: MovementVote = {
        id: existingVote?.id || uuidv4(),
        proposalId: request.proposalId,
        voterId: request.voterId,
        voterType: 'human', // TODO: キャラクター情報から判別
        choice: request.choice,
        reason: request.reason,
        timestamp: new Date().toISOString()
      };

      await this.saveMovementVote(vote);

      // 投票集計を更新
      const votingSummary = await this.calculateVotingSummary(request.proposalId);
      
      // 投票結果に基づくステータス更新
      if (votingSummary.consensusReached) {
        // 合意成立 → 承認
        await this.updateProposalStatus(request.proposalId, 'approved');
        logger.info(`Movement proposal ${request.proposalId} approved by consensus`);
      } else if (this.isProposalRejected(votingSummary)) {
        // 否決確定 → 拒否
        await this.updateProposalStatus(request.proposalId, 'rejected');
        logger.info(`Movement proposal ${request.proposalId} rejected by vote`);
      }
      // それ以外は投票継続中

      logger.info(`Vote cast: ${vote.id}`, { vote, votingSummary });

      return {
        success: true,
        votingSummary,
        consensusReached: votingSummary.consensusReached
      };
    } catch (error) {
      logger.error('Failed to cast vote:', error);
      return {
        success: false,
        consensusReached: false,
        error: error instanceof Error ? error.message : '投票に失敗しました'
      };
    }
  }

  async getVotingSummary(proposalId: ID): Promise<VotingSummary> {
    return this.calculateVotingSummary(proposalId);
  }

  // 否決判定ロジック
  private isProposalRejected(votingSummary: VotingSummary): boolean {
    const totalVoters = votingSummary.totalEligibleVoters;
    const votedCount = votingSummary.voterDetails.filter(v => v.hasVoted).length;
    const rejectVotes = votingSummary.votes.reject;
    const approveVotes = votingSummary.votes.approve;
    
    // 条件1: 全員投票完了かつ合意未達成
    const allVotesComplete = votedCount === totalVoters;
    const consensusNotReached = !votingSummary.consensusReached;
    
    // 条件2: 過半数が反対（早期否決確定）
    const majorityRejects = rejectVotes > Math.floor(totalVoters / 2);
    
    // 条件3: 残り票を全て賛成にしても合意に達しない
    const remainingVotes = totalVoters - votedCount;
    const maxPossibleApprovals = approveVotes + remainingVotes;
    const cannotReachConsensus = maxPossibleApprovals < votingSummary.requiredApprovals;
    
    return (allVotesComplete && consensusNotReached) || 
           majorityRejects || 
           cannotReachConsensus;
  }

  private async calculateVotingSummary(proposalId: ID): Promise<VotingSummary> {
    const proposal = await this.getMovementProposalById(proposalId);
    if (!proposal) {
      throw new Error('提案が見つかりません');
    }

    // セッションの参加者を取得
    const partyMembers = await this.getPartyMembers(proposal.sessionId);
    
    // 投票データを取得
    const votes = await this.getVotesForProposal(proposalId);

    const voteCounts = {
      approve: votes.filter(v => v.choice === 'approve').length,
      reject: votes.filter(v => v.choice === 'reject').length,
      abstain: votes.filter(v => v.choice === 'abstain').length
    };

    const voterDetails = partyMembers
      .filter(member => member.characterType === 'PC') // PCのみ投票権あり
      .map(member => {
        const vote = votes.find(v => v.voterId === member.characterId);
        const isProposer = member.characterId === proposal.proposerId;
        return {
          voterId: member.characterId,
          voterName: member.characterName,
          voterType: 'human' as const, // TODO: キャラクター情報からAI/人間を判別
          choice: vote?.choice || 'abstain' as VoteChoice,
          hasVoted: !!vote,
          isProposer,
          voteReason: vote?.reason,
          votedAt: vote?.timestamp
        };
      });

    const totalEligibleVoters = voterDetails.length;
    const requiredApprovals = Math.ceil(totalEligibleVoters / 2); // 過半数
    const consensusReached = voteCounts.approve >= requiredApprovals;

    // 投票統計情報を計算
    const humanVoters = voterDetails.filter(v => v.voterType === 'human');
    const aiVoters = voterDetails.filter(v => v.voterType === 'ai_agent' as any); // TODO: 実際のAI判別ロジック実装

    return {
      proposalId,
      totalEligibleVoters,
      votes: voteCounts,
      voterDetails,
      consensusReached,
      consensusType: voteCounts.approve === totalEligibleVoters ? 'unanimous' : 
                    consensusReached ? 'majority' : 'none',
      requiredApprovals,
      currentApprovals: voteCounts.approve,
      votingStatistics: {
        humanVoters: {
          total: humanVoters.length,
          voted: humanVoters.filter(v => v.hasVoted).length,
          pending: humanVoters.filter(v => !v.hasVoted).length,
          breakdown: {
            approve: humanVoters.filter(v => v.choice === 'approve').length,
            reject: humanVoters.filter(v => v.choice === 'reject').length,
            abstain: humanVoters.filter(v => v.choice === 'abstain').length
          }
        },
        aiVoters: {
          total: aiVoters.length,
          voted: aiVoters.filter(v => v.hasVoted).length,
          processing: aiVoters.filter(v => !v.hasVoted).length,
          breakdown: {
            approve: aiVoters.filter(v => v.choice === 'approve').length,
            reject: aiVoters.filter(v => v.choice === 'reject').length,
            abstain: aiVoters.filter(v => v.choice === 'abstain').length
          }
        }
      },
      remindersSent: 0, // TODO: 実装
      lastReminderAt: undefined
    };
  }

  // ==========================================
  // 移動実行システム
  // ==========================================

  async executePartyMovement(request: ExecutePartyMovementRequest): Promise<ExecutePartyMovementResponse> {
    try {
      const proposal = await this.getMovementProposalById(request.proposalId);
      if (!proposal) {
        return {
          success: false,
          error: '移動提案が見つかりません'
        };
      }

      if (proposal.status !== 'approved' && !request.forceExecute) {
        return {
          success: false,
          error: '承認されていない移動は実行できません'
        };
      }

      // 移動実行中に更新
      await this.updateProposalStatus(request.proposalId, 'executing');

      // パーティメンバー全員を移動
      const partyMembers = await this.getPartyMembers(request.sessionId);
      const moveResults = [];

      for (const member of partyMembers) {
        const moveResult = await this.moveCharacterToLocation(
          member.characterId,
          proposal.targetLocationId,
          proposal.movementMethod
        );
        moveResults.push(moveResult);
      }

      // 移動成功判定
      const allSuccessful = moveResults.every(result => result.success);
      
      if (allSuccessful) {
        // 移動成功：ステータス更新とターン進行
        await this.updateProposalStatus(request.proposalId, 'completed');
        
        const turnsToAdvance = proposal.estimatedCost?.actionPoints || 1;
        const turnResult = await this.advanceTurns(request.sessionId, turnsToAdvance);

        const response: ExecutePartyMovementResponse = {
          success: true,
          movementResult: {
            newLocationId: proposal.targetLocationId,
            actualDuration: proposal.estimatedTime,
            actualCost: {
              actionPoints: turnsToAdvance,
              ...(proposal.estimatedCost?.resources || {})
            },
            turnsAdvanced: turnsToAdvance,
            complications: []
          }
        };

        logger.info(`Party movement executed successfully: ${request.proposalId}`, {
          newLocation: proposal.targetLocationId,
          turnsAdvanced: turnsToAdvance,
          turnMessage: turnResult.message
        });
        
        return response;
      } else {
        // 移動失敗：エラー状態に設定（ターン進行なし）
        await this.updateProposalStatus(request.proposalId, 'failed');
        
        const failedMoves = moveResults.filter(r => !r.success);
        logger.error(`Party movement failed: ${request.proposalId}`, {
          failedCharacters: failedMoves.length,
          totalCharacters: moveResults.length
        });
        
        return {
          success: false,
          error: `移動に失敗しました（${failedMoves.length}/${moveResults.length}人の移動が失敗）。ターンは進行されません。`
        };
      }
    } catch (error) {
      logger.error('Failed to execute party movement:', error);
      await this.updateProposalStatus(request.proposalId, 'failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : '移動の実行に失敗しました'
      };
    }
  }

  // ==========================================
  // 設定管理
  // ==========================================

  async getConsensusSettings(sessionId: ID): Promise<ConsensusSettings> {
    const row = database.prepare(`
      SELECT settings FROM party_consensus_settings WHERE session_id = ?
    `).get(sessionId) as any;

    if (row) {
      return JSON.parse(row.settings);
    }

    // デフォルト設定
    const defaultSettings: ConsensusSettings = {
      sessionId,
      votingSystem: 'majority',
      requiredApprovalPercentage: 50,
      votingTimeLimit: 30,
      allowAbstention: true,
      leaderCanOverride: false,
      leaderVoteWeight: 1,
      autoApproveIfNoResponse: false,
      autoApproveTimeLimit: 60,
      turnBasedMovementCost: 1
    };

    await this.saveConsensusSettings(defaultSettings);
    return defaultSettings;
  }

  async updateConsensusSettings(sessionId: ID, updates: Partial<ConsensusSettings>): Promise<ConsensusSettings> {
    const currentSettings = await this.getConsensusSettings(sessionId);
    const newSettings = { ...currentSettings, ...updates };
    await this.saveConsensusSettings(newSettings);
    return newSettings;
  }

  // ==========================================
  // プライベートヘルパーメソッド
  // ==========================================

  private async estimateMovementTime(_sessionId: ID, _targetLocationId: ID, method: string): Promise<number> {
    // 実装簡略化：基本的な時間推定
    const baseTime = 30; // 30分
    const methodMultiplier = {
      walk: 1.0,
      run: 0.7,
      ride: 0.5,
      fly: 0.3,
      teleport: 0.1,
      vehicle: 0.4
    };
    return baseTime * (methodMultiplier[method as keyof typeof methodMultiplier] || 1.0);
  }

  private async assessMovementDifficulty(_targetLocationId: ID): Promise<'easy' | 'normal' | 'hard' | 'dangerous'> {
    // 実装簡略化：固定値
    return 'normal';
  }

  private async getRecentMovements(sessionId: ID, limit: number) {
    const rows = database.prepare(`
      SELECT * FROM location_movements 
      WHERE character_id IN (
        SELECT id FROM characters WHERE campaign_id = (
          SELECT campaign_id FROM sessions WHERE id = ?
        )
      )
      ORDER BY start_time DESC LIMIT ?
    `).all(sessionId, limit) as any[];

    return rows.map(row => ({
      fromLocationId: row.from_location_id,
      toLocationId: row.to_location_id,
      timestamp: row.start_time,
      method: row.movement_type,
      duration: row.actual_duration || row.estimated_duration,
      success: row.status === 'completed'
    }));
  }

  private async getMovementRestrictions(_sessionId: ID) {
    return {
      canPropose: true,
      canVote: true,
      turnsPaused: false
    };
  }

  private async getPartyMembers(sessionId: ID) {
    const rows = database.prepare(`
      SELECT c.id, c.name, c.character_type
      FROM characters c
      JOIN sessions s ON c.campaign_id = (
        SELECT campaign_id FROM sessions WHERE id = ?
      )
      WHERE c.character_type IN ('PC', 'NPC')
    `).all(sessionId) as any[];

    return rows.map(row => ({
      characterId: row.id as ID,
      characterName: row.name,
      characterType: row.character_type as 'PC' | 'NPC',
      isLeader: row.character_type === 'PC',
      isPresent: true
    }));
  }

  // データベース操作ヘルパー
  private async saveMovementProposal(proposal: PartyMovementProposal): Promise<void> {
    database.prepare(`
      INSERT OR REPLACE INTO party_movement_proposals (
        id, session_id, proposer_id, target_location_id, movement_method,
        reason, estimated_time, estimated_cost, status, created_at,
        voting_deadline, urgency, difficulty, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      proposal.id,
      proposal.sessionId,
      proposal.proposerId,
      proposal.targetLocationId,
      proposal.movementMethod,
      proposal.reason,
      proposal.estimatedTime,
      JSON.stringify(proposal.estimatedCost),
      proposal.status,
      proposal.createdAt,
      proposal.votingDeadline,
      proposal.urgency,
      proposal.difficulty,
      JSON.stringify(proposal.tags)
    );
  }

  private async saveMovementVote(vote: MovementVote): Promise<void> {
    database.prepare(`
      INSERT OR REPLACE INTO party_movement_votes (
        id, proposal_id, voter_id, choice, reason, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      vote.id,
      vote.proposalId,
      vote.voterId,
      vote.choice,
      vote.reason,
      vote.timestamp
    );
  }

  private async saveConsensusSettings(settings: ConsensusSettings): Promise<void> {
    database.prepare(`
      INSERT OR REPLACE INTO party_consensus_settings (
        session_id, settings, updated_at
      ) VALUES (?, ?, ?)
    `).run(
      settings.sessionId,
      JSON.stringify(settings),
      new Date().toISOString()
    );
  }

  private rowToMovementProposal(row: any): PartyMovementProposal {
    return {
      id: row.id,
      sessionId: row.session_id,
      proposerId: row.proposer_id,
      targetLocationId: row.target_location_id,
      movementMethod: row.movement_method,
      reason: row.reason,
      estimatedTime: row.estimated_time,
      estimatedCost: JSON.parse(row.estimated_cost || '{}'),
      status: row.status,
      createdAt: row.created_at,
      votingDeadline: row.voting_deadline,
      urgency: row.urgency,
      difficulty: row.difficulty,
      tags: JSON.parse(row.tags || '[]')
    };
  }

  // 実装済みヘルパーメソッド
  private async getMovementProposalById(proposalId: ID): Promise<PartyMovementProposal | null> {
    const row = database.prepare(`
      SELECT * FROM party_movement_proposals WHERE id = ?
    `).get(proposalId) as any;

    return row ? this.rowToMovementProposal(row) : null;
  }

  private async getVoteByVoter(proposalId: ID, voterId: ID): Promise<MovementVote | null> {
    const row = database.prepare(`
      SELECT * FROM party_movement_votes 
      WHERE proposal_id = ? AND voter_id = ?
    `).get(proposalId, voterId) as any;

    return row ? this.rowToMovementVote(row) : null;
  }

  private async getVotesForProposal(proposalId: ID): Promise<MovementVote[]> {
    const rows = database.prepare(`
      SELECT * FROM party_movement_votes 
      WHERE proposal_id = ?
      ORDER BY timestamp ASC
    `).all(proposalId) as any[];

    return rows.map(row => this.rowToMovementVote(row));
  }

  async updateProposalStatus(proposalId: ID, status: MovementProposalStatus): Promise<void> {
    database.prepare(`
      UPDATE party_movement_proposals 
      SET status = ? 
      WHERE id = ?
    `).run(status, proposalId);
  }

  private async moveCharacterToLocation(characterId: ID, locationId: ID, method: string): Promise<{success: boolean}> {
    try {
      const estimatedDuration = await this.estimateMovementTime('', locationId, method);
      
      await locationService.moveCharacter({
        characterId,
        toLocationId: locationId,
        method: method,
        estimatedDuration
      });
      
      return { success: true };
    } catch (error) {
      logger.error(`Failed to move character ${characterId} to ${locationId}:`, error);
      return { success: false };
    }
  }

  private async advanceTurns(sessionId: ID, turns: number): Promise<{ success: boolean; message: string }> {
    try {
      logger.info(`Advancing ${turns} turns for session ${sessionId}...`);
      
      // セッションからキャンペーンIDを取得
      const sessionRow = database.prepare(`
        SELECT campaign_id FROM sessions WHERE id = ?
      `).get(sessionId) as any;
      
      if (!sessionRow) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      const campaignId = sessionRow.campaign_id;
      const timeManagementService = getTimeManagementService();
      
      // ターン進行実行
      let lastResult;
      for (let i = 0; i < turns; i++) {
        lastResult = await timeManagementService.advanceTime(campaignId);
        logger.info(`Turn ${i + 1}/${turns} advanced:`, lastResult);
      }
      
      const message = lastResult?.message || `${turns}ターン進行しました`;
      logger.info(`Successfully advanced ${turns} turns for session ${sessionId}: ${message}`);
      
      return {
        success: true,
        message
      };
    } catch (error) {
      logger.error(`Failed to advance turns for session ${sessionId}:`, error);
      throw error;
    }
  }

  // ==========================================
  // AI Agent投票システム
  // ==========================================

  /**
   * AI Agent キャラクターの自動投票をスケジュール
   */
  private async scheduleAIAgentVoting(proposalId: ID, sessionId: ID): Promise<void> {
    try {
      logger.info(`Scheduling AI agent voting for proposal ${proposalId}...`);

      // セッションのパーティメンバーを取得
      const partyMembers = await this.getPartyMembers(sessionId);
      const aiAgentMembers = partyMembers.filter(member => this.isAIAgentCharacter(member.characterId));

      if (aiAgentMembers.length === 0) {
        logger.info(`No AI agent characters found for session ${sessionId}`);
        return;
      }

      logger.info(`Found ${aiAgentMembers.length} AI agent characters for voting`);

      // 3-8秒後にAI投票実行（人間らしい遅延）
      const delay = 3000 + Math.random() * 5000;
      setTimeout(async () => {
        await this.executeAIAgentVoting(proposalId, aiAgentMembers);
      }, delay);

    } catch (error) {
      logger.error(`Failed to schedule AI agent voting:`, error);
      throw error;
    }
  }

  /**
   * AI Agent キャラクターが管理されているかチェック
   */
  private isAIAgentCharacter(characterId: ID): boolean {
    try {
      const row = database.prepare(`
        SELECT player_id, character_type FROM characters WHERE id = ?
      `).get(characterId) as any;

      if (!row || row.character_type !== 'PC') {
        return false;
      }

      // AI Agent判定：playerIdがnullまたは'ai-agent'
      return row.player_id === null || row.player_id === 'ai-agent';
    } catch (error) {
      logger.error(`Failed to check if character ${characterId} is AI agent:`, error);
      return false;
    }
  }

  /**
   * AI Agent キャラクターの自動投票を実行
   */
  private async executeAIAgentVoting(proposalId: ID, aiMembers: any[]): Promise<void> {
    try {
      const proposal = await this.getMovementProposalById(proposalId);
      if (!proposal || proposal.status !== 'voting') {
        logger.info(`Proposal ${proposalId} is no longer in voting status, skipping AI voting`);
        return;
      }

      logger.info(`Executing AI agent voting for proposal ${proposalId}...`);

      for (const member of aiMembers) {
        try {
          // 既に投票済みかチェック
          const existingVote = await this.getVoteByVoter(proposalId, member.characterId);
          if (existingVote) {
            logger.info(`AI character ${member.characterId} already voted, skipping`);
            continue;
          }

          // AI判断による投票
          const voteDecision = await this.generateAIVoteDecision(proposal, member);
          
          const aiVote: MovementVote = {
            id: uuidv4(),
            proposalId,
            voterId: member.characterId,
            voterType: 'ai_agent',
            choice: voteDecision.choice,
            reason: voteDecision.reason,
            timestamp: new Date().toISOString()
          };

          await this.saveMovementVote(aiVote);
          
          logger.info(`AI character ${member.characterName} voted: ${voteDecision.choice}`, {
            characterId: member.characterId,
            choice: voteDecision.choice,
            reason: voteDecision.reason
          });

          // 投票間に少し遅延を追加（自然さのため）
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        } catch (error) {
          logger.error(`Failed to execute AI voting for character ${member.characterId}:`, error);
          
          // エラー時は棄権票を投じる
          try {
            const abstainVote: MovementVote = {
              id: uuidv4(),
              proposalId,
              voterId: member.characterId,
              voterType: 'ai_agent',
              choice: 'abstain',
              reason: `AIエージェント(${member.characterName})：投票処理エラーのため棄権します`,
              timestamp: new Date().toISOString()
            };
            
            await this.saveMovementVote(abstainVote);
            logger.info(`AI character ${member.characterName} abstained due to error`);
            
          } catch (saveError) {
            logger.error(`Failed to save abstain vote for character ${member.characterId}:`, saveError);
          }
        }
      }

      // 全投票完了後、投票結果を再チェック
      const finalSummary = await this.calculateVotingSummary(proposalId);
      if (finalSummary.consensusReached && !this.isProposalRejected(finalSummary)) {
        await this.updateProposalStatus(proposalId, 'approved');
        logger.info(`Proposal ${proposalId} approved after AI voting`);
      } else if (this.isProposalRejected(finalSummary)) {
        await this.updateProposalStatus(proposalId, 'rejected');
        logger.info(`Proposal ${proposalId} rejected after AI voting`);
      }

    } catch (error) {
      logger.error(`Failed to execute AI agent voting:`, error);
    }
  }

  /**
   * AI Agent の投票判断を生成
   */
  private async generateAIVoteDecision(proposal: PartyMovementProposal, aiCharacter: any): Promise<{ choice: VoteChoice; reason: string }> {
    const startTime = Date.now();
    
    try {
      // キャラクター情報を取得
      const characterRow = database.prepare(`
        SELECT name, description, background, base_stats FROM characters WHERE id = ?
      `).get(aiCharacter.characterId) as any;

      if (!characterRow) {
        // エラー：キャラクター情報が見つからない場合は棄権
        logger.warn(`AI character data not found for character ID: ${aiCharacter.characterId}`);
        return {
          choice: 'abstain',
          reason: 'AIエージェント：キャラクター情報の取得に失敗したため棄権します'
        };
      }

      // シンプルなルールベース判断（将来的にはAI APIを使用可能）
      const character = characterRow;
      const movementReason = proposal.reason;
      const urgency = proposal.urgency;

      // 判断ロジック
      let choice: VoteChoice = 'approve';
      let reason = '';

      // 緊急度による判断
      if (urgency === 'high') {
        choice = 'approve';
        reason = `${character.name}: 緊急事態のようですね。急いで移動しましょう。`;
      } else if (urgency === 'low') {
        // 低優先度の場合、50%の確率で慎重になる
        if (Math.random() > 0.5) {
          choice = 'abstain';
          reason = `${character.name}: そんなに急ぐ必要はないかもしれません。他の意見も聞きたいです。`;
        } else {
          choice = 'approve';
          reason = `${character.name}: 賛成します。のんびり移動しましょう。`;
        }
      } else {
        // 通常の優先度
        choice = 'approve';
        reason = `${character.name}: ${movementReason} 良い判断だと思います。`;
      }

      // まれに反対意見（5%の確率）
      if (Math.random() < 0.05) {
        choice = 'reject';
        reason = `${character.name}: 今は移動すべきではないと思います。もう少し検討しませんか？`;
      }

      logger.info(`AI character ${character.name} decision:`, { choice, reason, urgency });

      // AI Agent監視ログに記録
      const processingTime = Date.now() - startTime;
      const influencingFactors = {
        characterPersonality: character.description || '不明',
        situationalFactors: [`緊急度: ${urgency}`, `移動理由: ${movementReason}`],
        riskAssessment: urgency === 'high' ? '高リスク対応' : urgency === 'low' ? '低リスク状況' : '通常リスク',
        partyConsideration: '仲間との協調を重視'
      };

      // 信頼度スコア計算
      let confidenceScore = 75; // ベース信頼度
      if (urgency === 'high') confidenceScore += 15;
      else if (urgency === 'low') confidenceScore -= 10;
      
      // 非同期でログ記録（処理をブロックしない）
      aiAgentMonitoringService.logMovementVote(
        proposal.sessionId,
        aiCharacter.characterId,
        character.name,
        proposal.id,
        proposal.targetLocationId,
        movementReason,
        urgency,
        choice,
        reason,
        influencingFactors,
        confidenceScore,
        processingTime
      ).catch(logError => {
        logger.error('Failed to log AI movement vote:', logError);
      });

      return { choice, reason };

    } catch (error) {
      logger.error('Failed to generate AI vote decision:', error);
      
      // エラー時もログ記録
      const processingTime = Date.now() - startTime;
      const errorReason = `AIエージェント：投票処理でエラーが発生したため棄権します (${error instanceof Error ? error.message : '不明なエラー'})`;
      
      aiAgentMonitoringService.logAIAgentAction({
        sessionId: proposal.sessionId,
        characterId: aiCharacter.characterId,
        characterName: aiCharacter.characterName || '不明なキャラクター',
        actionType: 'movement_vote',
        actionContext: `移動提案への投票(エラー) - 目的地: ${proposal.targetLocationId}`,
        actionDescription: 'エラーにより棄権票',
        decisionReasoning: error instanceof Error ? error.message : '不明なエラー',
        alternativesConsidered: ['approve', 'reject'],
        confidenceScore: 0,
        executionResult: 'error',
        resultDetails: errorReason,
        logLevel: 'error',
        processingTimeMs: processingTime,
        tags: ['movement', 'voting', 'error']
      }).catch(logError => {
        logger.error('Failed to log AI voting error:', logError);
      });
      
      // エラー時は棄権として処理
      return {
        choice: 'abstain',
        reason: errorReason
      };
    }
  }

  private rowToMovementVote(row: any): MovementVote {
    return {
      id: row.id,
      proposalId: row.proposal_id,
      voterId: row.voter_id,
      voterType: row.voter_type || 'human', // デフォルトは人間PC
      choice: row.choice,
      reason: row.reason,
      timestamp: row.timestamp
    };
  }
}

export const partyMovementService = new PartyMovementService();
export default partyMovementService;