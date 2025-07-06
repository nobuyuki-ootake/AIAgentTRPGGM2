// ==========================================
// Narrative Feedback Service - 詳細物語フィードバック管理・実行
// Phase 4-4.1: マイルストーン完了時の詳細な物語変化フィードバックシステム
// ==========================================

import { logger } from '../utils/logger';
import { database } from '../database/database';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import {
  generateNarrativeFeedback,
  buildNarrativeFeedbackContext,
  type NarrativeFeedbackContext,
  type NarrativeFeedback
} from '../mastra/agents/narrativeFeedbackAgent';
import {
  UnifiedMilestone,
  getMilestoneBaseInfo
} from '@ai-agent-trpg/types';

export class NarrativeFeedbackService {
  private static instance: NarrativeFeedbackService;
  private app: express.Application | null = null;
  private initialized = false;

  private constructor() {
    // Lazy initialization - database will be initialized on first use
  }

  public static getInstance(): NarrativeFeedbackService {
    if (!NarrativeFeedbackService.instance) {
      NarrativeFeedbackService.instance = new NarrativeFeedbackService();
    }
    return NarrativeFeedbackService.instance;
  }

  /**
   * Express アプリケーションインスタンスを設定（Socket.IO アクセス用）
   */
  setApp(app: express.Application): void {
    this.app = app;
  }

  /**
   * データベース初期化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initializeDatabase();
      this.initialized = true;
    }
  }

  private initializeDatabase(): void {
    try {
      // Narrative feedback関連テーブル作成
      database.exec(`
        CREATE TABLE IF NOT EXISTS narrative_feedbacks (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          milestone_id TEXT NOT NULL,
          character_id TEXT NOT NULL,
          feedback_data TEXT NOT NULL,
          narrative_weight TEXT NOT NULL,
          generated_at TEXT NOT NULL,
          posted_at TEXT
        )
      `);

      database.exec(`
        CREATE TABLE IF NOT EXISTS narrative_chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          feedback_id TEXT NOT NULL,
          message_type TEXT NOT NULL,
          content TEXT NOT NULL,
          tone TEXT NOT NULL,
          posted_at TEXT NOT NULL,
          FOREIGN KEY (feedback_id) REFERENCES narrative_feedbacks(id)
        )
      `);

      // インデックス作成
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_narrative_feedbacks_session 
        ON narrative_feedbacks(session_id, generated_at)
      `);
      
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_narrative_chat_session 
        ON narrative_chat_messages(session_id, posted_at)
      `);

      logger.info('Narrative feedback database initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize narrative feedback database:', error);
      throw error;
    }
  }

  /**
   * マイルストーン完了時の詳細ナラティブフィードバック生成・投稿
   * milestoneProgressService.handleMilestoneCompletion から呼び出される
   */
  async processNarrativeFeedback(
    milestone: UnifiedMilestone,
    sessionId: string,
    characterId: string,
    narrativeText: string
  ): Promise<void> {
    this.ensureInitialized();
    try {
      const baseInfo = getMilestoneBaseInfo(milestone);
      
      logger.info(`📖 Starting narrative feedback generation for milestone: ${baseInfo.name}`);

      // 1. コンテキスト情報を収集
      const context = await this.buildComprehensiveContext(
        milestone,
        sessionId,
        characterId,
        narrativeText
      );

      // 2. Narrative Feedback Agent による詳細フィードバック生成
      const feedback = await generateNarrativeFeedback(context);

      // 3. データベースに記録
      const feedbackId = await this.recordNarrativeFeedback(
        sessionId,
        baseInfo.id,
        characterId,
        feedback
      );

      // 4. チャットにフィードバック投稿
      await this.postNarrativeFeedbackToChat(sessionId, feedbackId, feedback);

      // 5. WebSocket経由でリアルタイム配信
      await this.broadcastNarrativeFeedback(sessionId, feedback, baseInfo.name);

      logger.info(`✨ Narrative feedback processing completed for milestone: ${baseInfo.name}`);

    } catch (error) {
      logger.error('Failed to process narrative feedback:', error);
      // エラーが発生してもメインのゲームフローを止めない
    }
  }

  /**
   * 包括的なコンテキスト情報の構築
   */
  private async buildComprehensiveContext(
    milestone: UnifiedMilestone,
    sessionId: string,
    characterId: string,
    narrativeText: string
  ): Promise<NarrativeFeedbackContext> {
    try {
      // 各種データの並行取得
      const [
        sessionData,
        characterData,
        recentActions,
        worldState,
        campaignProgress,
        playerHistory
      ] = await Promise.all([
        this.getSessionData(sessionId),
        this.getCharacterData(characterId),
        this.getRecentPlayerActions(sessionId, characterId, 3),
        this.getCurrentWorldState(sessionId),
        this.getCampaignProgress(sessionId),
        this.getPlayerActionHistory(sessionId, characterId)
      ]);

      // 最新の行動情報
      const latestAction = recentActions[0] || {};

      // コンテキスト構築
      return buildNarrativeFeedbackContext(
        {
          id: getMilestoneBaseInfo(milestone).id,
          name: getMilestoneBaseInfo(milestone).name,
          description: getMilestoneBaseInfo(milestone).description || '',
          narrativeText,
          completionType: 'automatic'
        },
        {
          characterId,
          characterName: characterData?.name || '冒険者',
          actionDescription: latestAction.action_description || 'マイルストーンを達成',
          actionResult: latestAction.success ? 'success' : latestAction.success === false ? 'failure' : 'mixed',
          approach: latestAction.user_approach || '慎重に行動',
          skillsUsed: this.parseSkillsUsed(latestAction),
          diceResults: latestAction.dice_roll ? JSON.parse(latestAction.dice_roll) : undefined
        },
        {
          currentLocation: worldState.currentLocation || sessionData?.current_location || '未知の場所',
          timeOfDay: this.determineTimeOfDay(),
          weatherCondition: worldState.weather,
          ambientMood: worldState.mood || 'neutral',
          nearbyCharacters: worldState.nearbyCharacters || [],
          visibleEntities: worldState.visibleEntities || []
        },
        {
          sessionProgress: campaignProgress.progressRatio,
          totalMilestones: campaignProgress.totalMilestones,
          completedMilestones: campaignProgress.completedMilestones,
          majorThemes: campaignProgress.themes || ['冒険', '成長'],
          characterRelationships: campaignProgress.relationships || [],
          recentEvents: campaignProgress.recentEvents || []
        },
        {
          preferredActions: playerHistory.preferredActions || ['探索', '調査'],
          characterTraits: playerHistory.traits || ['勇敢', '慎重'],
          pastDecisions: playerHistory.decisions || [],
          characterGrowth: playerHistory.growth || []
        }
      );

    } catch (error) {
      logger.error('Failed to build comprehensive context:', error);
      
      // フォールバックコンテキスト
      const baseInfo = getMilestoneBaseInfo(milestone);
      return buildNarrativeFeedbackContext(
        {
          id: baseInfo.id,
          name: baseInfo.name,
          description: baseInfo.description || '',
          narrativeText,
          completionType: 'automatic'
        },
        {
          characterId,
          characterName: '冒険者',
          actionDescription: 'マイルストーンを達成',
          actionResult: 'success',
          approach: '慎重に行動',
          skillsUsed: []
        },
        {
          currentLocation: '未知の場所',
          timeOfDay: 'afternoon',
          ambientMood: 'neutral',
          nearbyCharacters: [],
          visibleEntities: []
        },
        {
          sessionProgress: 0.5,
          totalMilestones: 10,
          completedMilestones: 5,
          majorThemes: ['冒険', '成長'],
          characterRelationships: [],
          recentEvents: []
        },
        {
          preferredActions: ['探索'],
          characterTraits: ['勇敢'],
          pastDecisions: [],
          characterGrowth: []
        }
      );
    }
  }

  /**
   * ナラティブフィードバックをデータベースに記録
   */
  private async recordNarrativeFeedback(
    sessionId: string,
    milestoneId: string,
    characterId: string,
    feedback: NarrativeFeedback
  ): Promise<string> {
    try {
      const feedbackId = uuidv4();
      const timestamp = new Date().toISOString();

      const stmt = database.prepare(`
        INSERT INTO narrative_feedbacks (
          id, session_id, milestone_id, character_id, 
          feedback_data, narrative_weight, generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        feedbackId,
        sessionId,
        milestoneId,
        characterId,
        JSON.stringify(feedback),
        feedback.metadata.narrativeWeight,
        timestamp
      );

      return feedbackId;

    } catch (error) {
      logger.error('Failed to record narrative feedback:', error);
      return uuidv4(); // フォールバック ID
    }
  }

  /**
   * ナラティブフィードバックをチャットに投稿
   */
  private async postNarrativeFeedbackToChat(
    sessionId: string,
    feedbackId: string,
    feedback: NarrativeFeedback
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();

      // メインナラティブの投稿
      await this.postChatMessage(sessionId, feedbackId, {
        id: uuidv4(),
        type: 'main_narrative',
        content: `**${feedback.mainNarrative.title}**\n\n${feedback.mainNarrative.content}`,
        tone: feedback.mainNarrative.tone,
        timestamp
      });

      // 環境変化の投稿（重要度が high の場合のみ）
      if (feedback.metadata.narrativeWeight === 'major' || feedback.metadata.narrativeWeight === 'pivotal') {
        await this.postChatMessage(sessionId, feedbackId, {
          id: uuidv4(),
          type: 'world_changes',
          content: `**環境の変化**\n${feedback.worldChanges.environmentalShift}\n\n${feedback.worldChanges.atmosphericDescription}`,
          tone: 'mysterious',
          timestamp
        });
      }

      // キャラクター成長（常に投稿）
      if (feedback.characterFeedback.growthMoments.length > 0) {
        await this.postChatMessage(sessionId, feedbackId, {
          id: uuidv4(),
          type: 'character_growth',
          content: `**個人的な気づき**\n${feedback.characterFeedback.personalReflection}`,
          tone: 'contemplative',
          timestamp
        });
      }

      // 将来への示唆（pivotal の場合のみ）
      if (feedback.metadata.narrativeWeight === 'pivotal' && feedback.foreshadowing.newPossibilities.length > 0) {
        await this.postChatMessage(sessionId, feedbackId, {
          id: uuidv4(),
          type: 'foreshadowing',
          content: `**新たな可能性**\n${feedback.foreshadowing.newPossibilities.join('\n')}`,
          tone: 'mysterious',
          timestamp
        });
      }

    } catch (error) {
      logger.error('Failed to post narrative feedback to chat:', error);
    }
  }

  /**
   * 個別チャットメッセージの投稿
   */
  private async postChatMessage(
    sessionId: string,
    feedbackId: string,
    message: {
      id: string;
      type: string;
      content: string;
      tone: string;
      timestamp: string;
    }
  ): Promise<void> {
    try {
      // チャットメッセージテーブルに記録
      const chatStmt = database.prepare(`
        INSERT INTO chat_messages (
          id, session_id, sender, sender_type, content, type, timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      chatStmt.run(
        message.id,
        sessionId,
        'AI Narrator',
        'narrative_ai',
        message.content,
        message.type,
        message.timestamp,
        message.timestamp
      );

      // ナラティブチャットメッセージテーブルに記録
      const narrativeStmt = database.prepare(`
        INSERT INTO narrative_chat_messages (
          id, session_id, feedback_id, message_type, content, tone, posted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      narrativeStmt.run(
        message.id,
        sessionId,
        feedbackId,
        message.type,
        message.content,
        message.tone,
        message.timestamp
      );

    } catch (error) {
      logger.error('Failed to post individual chat message:', error);
    }
  }

  /**
   * WebSocket経由でナラティブフィードバックをブロードキャスト
   */
  private async broadcastNarrativeFeedback(
    sessionId: string,
    feedback: NarrativeFeedback,
    milestoneName: string
  ): Promise<void> {
    try {
      if (this.app) {
        const io = this.app.get('socketio') as SocketIOServer;
        if (io) {
          io.to(`session-${sessionId}`).emit('narrative-feedback', {
            type: 'narrative_feedback',
            timestamp: new Date().toISOString(),
            data: {
              milestoneName,
              mainNarrative: feedback.mainNarrative,
              narrativeWeight: feedback.metadata.narrativeWeight,
              tone: feedback.mainNarrative.tone,
              isDetailedFeedback: true
            },
          });

          logger.info(`📡 Narrative feedback broadcast to session ${sessionId}: ${feedback.mainNarrative.title}`);
        }
      }
    } catch (error) {
      logger.error('Failed to broadcast narrative feedback:', error);
    }
  }

  // ヘルパーメソッド群

  private async getSessionData(sessionId: string): Promise<any> {
    try {
      const stmt = database.prepare('SELECT * FROM sessions WHERE id = ?');
      return stmt.get(sessionId) || {};
    } catch (error) {
      return {};
    }
  }

  private async getCharacterData(characterId: string): Promise<any> {
    try {
      const stmt = database.prepare('SELECT * FROM characters WHERE id = ?');
      return stmt.get(characterId) || {};
    } catch (error) {
      return {};
    }
  }

  private async getRecentPlayerActions(sessionId: string, characterId: string, limit: number): Promise<any[]> {
    try {
      const stmt = database.prepare(`
        SELECT * FROM exploration_action_executions 
        WHERE session_id = ? AND character_id = ?
        ORDER BY resolved_at DESC 
        LIMIT ?
      `);
      return stmt.all(sessionId, characterId, limit) || [];
    } catch (error) {
      return [];
    }
  }

  private async getCurrentWorldState(_sessionId: string): Promise<any> {
    // 現在の世界状態を取得（簡易版）
    return {
      currentLocation: '現在地',
      mood: 'expectant',
      nearbyCharacters: [],
      visibleEntities: []
    };
  }

  private async getCampaignProgress(sessionId: string): Promise<any> {
    try {
      const milestonesStmt = database.prepare(`
        SELECT COUNT(*) as total FROM session_milestones WHERE session_id = ?
      `);
      const completedStmt = database.prepare(`
        SELECT COUNT(*) as completed FROM milestone_completions WHERE session_id = ?
      `);
      
      const totalResult = milestonesStmt.get(sessionId) as any;
      const completedResult = completedStmt.get(sessionId) as any;
      const total = totalResult?.total || 0;
      const completed = completedResult?.completed || 0;
      
      return {
        totalMilestones: total,
        completedMilestones: completed,
        progressRatio: total > 0 ? completed / total : 0,
        themes: ['冒険', '成長', '友情'],
        relationships: [],
        recentEvents: []
      };
    } catch (error) {
      return {
        totalMilestones: 10,
        completedMilestones: 5,
        progressRatio: 0.5,
        themes: ['冒険'],
        relationships: [],
        recentEvents: []
      };
    }
  }

  private async getPlayerActionHistory(_sessionId: string, _characterId: string): Promise<any> {
    // プレイヤーの行動履歴分析（簡易版）
    return {
      preferredActions: ['探索', '調査', '対話'],
      traits: ['慎重', '好奇心旺盛'],
      decisions: [],
      growth: ['観察力の向上']
    };
  }

  private parseSkillsUsed(actionData: any): string[] {
    try {
      if (actionData.skills_used) {
        return JSON.parse(actionData.skills_used);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  private determineTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }
}

// Singleton instance export
export const narrativeFeedbackService = NarrativeFeedbackService.getInstance();