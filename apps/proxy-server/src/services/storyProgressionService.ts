// ==========================================
// Story Progression Service - AI自律シナリオ進行実行
// Phase 4-2.3.3: AI判断結果に基づく自動GMアクション実行
// ==========================================

import { logger } from '../utils/logger';
import { database } from '../database/database';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import {
  evaluateStoryProgression,
  analyzeSessionContext,
  evaluateContextualFactors,
  type StoryProgressionContext,
  type StoryProgressionDecision
} from '../mastra/agents/storyProgressionAgent';
import {
  UnifiedMilestone,
  getMilestoneBaseInfo,
  ID
} from '@repo/types';

export class StoryProgressionService {
  private static instance: StoryProgressionService;
  private app: express.Application | null = null;

  private constructor() {
    this.initializeDatabase();
  }

  /**
   * データベース初期化
   */
  private initializeDatabase(): void {
    try {
      // Story progression関連テーブル作成
      database.exec(`
        CREATE TABLE IF NOT EXISTS story_progression_decisions (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          milestone_id TEXT NOT NULL,
          decision_data TEXT NOT NULL,
          recorded_at TEXT NOT NULL
        )
      `);

      database.exec(`
        CREATE TABLE IF NOT EXISTS entity_unlocks (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          trigger_milestone_id TEXT NOT NULL,
          trigger_type TEXT NOT NULL,
          unlocked_at TEXT NOT NULL
        )
      `);

      database.exec(`
        CREATE TABLE IF NOT EXISTS npc_spawns (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          npc_id TEXT NOT NULL,
          trigger_milestone_id TEXT NOT NULL,
          trigger_type TEXT NOT NULL,
          spawned_at TEXT NOT NULL
        )
      `);

      database.exec(`
        CREATE TABLE IF NOT EXISTS environment_changes (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          change_description TEXT NOT NULL,
          trigger_milestone_id TEXT NOT NULL,
          trigger_type TEXT NOT NULL,
          executed_at TEXT NOT NULL
        )
      `);

      // chat_messagesテーブルの拡張（必要に応じて）
      database.exec(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          sender TEXT NOT NULL,
          sender_type TEXT DEFAULT 'user',
          content TEXT NOT NULL,
          title TEXT,
          type TEXT DEFAULT 'message',
          priority TEXT DEFAULT 'medium',
          related_milestone_id TEXT,
          timestamp TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);

      // インデックス作成
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_story_decisions_session 
        ON story_progression_decisions(session_id)
      `);
      
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_entity_unlocks_session 
        ON entity_unlocks(session_id)
      `);
      
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session 
        ON chat_messages(session_id, timestamp)
      `);

      logger.info('Story progression database initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize story progression database:', error);
      throw error;
    }
  }

  public static getInstance(): StoryProgressionService {
    if (!StoryProgressionService.instance) {
      StoryProgressionService.instance = new StoryProgressionService();
    }
    return StoryProgressionService.instance;
  }

  /**
   * Express アプリケーションインスタンスを設定（Socket.IO アクセス用）
   */
  setApp(app: express.Application): void {
    this.app = app;
  }

  /**
   * マイルストーン完了時の AI自律シナリオ進行判断・実行
   * milestoneProgressService.handleMilestoneCompletion から呼び出される
   */
  async processStoryProgression(
    milestone: UnifiedMilestone,
    sessionId: string,
    characterId: string,
    narrativeText: string
  ): Promise<void> {
    try {
      const baseInfo = getMilestoneBaseInfo(milestone);
      
      logger.info(`🎭 Starting story progression evaluation for milestone: ${baseInfo.name}`);

      // 1. セッション状況の分析
      const sessionData = await this.getSessionData(sessionId);
      const recentActions = await this.getRecentActions(sessionId, 5);
      
      const sessionState = analyzeSessionContext(sessionData, recentActions);
      const contextualFactors = evaluateContextualFactors(sessionState, recentActions);

      // 2. Story Progression Agent による判断
      const context: StoryProgressionContext = {
        sessionId,
        milestoneId: baseInfo.id,
        milestoneName: baseInfo.name,
        narrativeText,
        completedBy: characterId,
        sessionState,
        contextualFactors
      };

      const decision = await evaluateStoryProgression(context);

      // 3. 判断結果に基づく実行
      if (decision.shouldProgress) {
        await this.executeStoryProgression(decision, sessionId, baseInfo.id);
      } else {
        logger.info(`🎪 Story progression decided to wait: ${decision.reasoning}`);
      }

      // 4. 判断ログを記録（分析・改善用）
      await this.recordProgressionDecision(sessionId, baseInfo.id, decision);

    } catch (error) {
      logger.error('Failed to process story progression:', error);
      // エラーが発生してもメインのゲームフローを止めない
    }
  }

  /**
   * AI判断結果に基づくシナリオ進行の実行
   */
  private async executeStoryProgression(
    decision: StoryProgressionDecision,
    sessionId: string,
    milestoneId: string
  ): Promise<void> {
    try {
      logger.info(`🚀 Executing story progression (${decision.progressionType}): ${decision.reasoning}`);

      // 進行タイプ別の実行
      switch (decision.progressionType) {
        case 'immediate':
          await this.executeImmediateProgression(decision, sessionId, milestoneId);
          break;
          
        case 'delayed':
          await this.scheduleDelayedProgression(decision, sessionId, milestoneId);
          break;
          
        default:
          logger.warn(`Unknown progression type: ${decision.progressionType}`);
      }

    } catch (error) {
      logger.error('Failed to execute story progression:', error);
    }
  }

  /**
   * 即座のシナリオ進行実行
   */
  private async executeImmediateProgression(
    decision: StoryProgressionDecision,
    sessionId: string,
    milestoneId: string
  ): Promise<void> {
    try {
      const actions = decision.suggestedActions;

      // 1. GMナラティブアナウンス投稿
      if (actions.narrativeAnnouncement) {
        await this.postGMNarrativeAnnouncement(sessionId, {
          title: '物語の進展',
          message: actions.narrativeAnnouncement,
          type: 'story_progression',
          priority: 'medium',
          relatedMilestoneId: milestoneId
        });
      }

      // 2. 新エンティティの解放
      if (actions.unlockEntities && actions.unlockEntities.length > 0) {
        await this.unlockEntities(sessionId, actions.unlockEntities, milestoneId);
      }

      // 3. NPCの登場
      if (actions.spawnNPCs && actions.spawnNPCs.length > 0) {
        await this.spawnNPCs(sessionId, actions.spawnNPCs, milestoneId);
      }

      // 4. 環境変化の実行
      if (actions.environmentChanges && actions.environmentChanges.length > 0) {
        await this.executeEnvironmentChanges(sessionId, actions.environmentChanges, milestoneId);
      }

      logger.info(`✅ Immediate story progression executed successfully for session ${sessionId}`);

    } catch (error) {
      logger.error('Failed to execute immediate progression:', error);
    }
  }

  /**
   * 遅延シナリオ進行のスケジューリング
   */
  private async scheduleDelayedProgression(
    decision: StoryProgressionDecision,
    sessionId: string,
    milestoneId: string
  ): Promise<void> {
    try {
      const delayMinutes = decision.timing.delayMinutes || 5;
      
      logger.info(`⏰ Scheduling delayed story progression for ${delayMinutes} minutes`);

      // 簡易的な遅延実行（実際のプロジェクトでは Job Queue等を使用を推奨）
      setTimeout(async () => {
        logger.info(`🕐 Executing scheduled story progression for session ${sessionId}`);
        await this.executeImmediateProgression(decision, sessionId, milestoneId);
      }, delayMinutes * 60 * 1000);

    } catch (error) {
      logger.error('Failed to schedule delayed progression:', error);
    }
  }

  /**
   * GMナラティブアナウンス投稿
   */
  private async postGMNarrativeAnnouncement(
    sessionId: string,
    announcement: {
      title: string;
      message: string;
      type: string;
      priority: string;
      relatedMilestoneId?: string;
    }
  ): Promise<void> {
    try {
      const messageId = uuidv4();
      const timestamp = new Date().toISOString();

      // チャットメッセージとしてデータベースに保存
      const chatMessage = {
        id: messageId,
        sessionId,
        sender: 'GM',
        senderType: 'ai_agent',
        content: announcement.message,
        title: announcement.title,
        type: 'gm_story_progression',
        priority: announcement.priority,
        relatedMilestoneId: announcement.relatedMilestoneId,
        timestamp,
        createdAt: timestamp,
      };

      const stmt = database.prepare(`
        INSERT INTO chat_messages (
          id, session_id, sender, sender_type, content, title, type, 
          priority, related_milestone_id, timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        chatMessage.id,
        chatMessage.sessionId,
        chatMessage.sender,
        chatMessage.senderType,
        chatMessage.content,
        chatMessage.title,
        chatMessage.type,
        chatMessage.priority,
        chatMessage.relatedMilestoneId,
        chatMessage.timestamp,
        chatMessage.createdAt
      );

      // WebSocket経由でリアルタイム送信
      if (this.app) {
        const io = this.app.get('socketio') as SocketIOServer;
        if (io) {
          io.to(`session-${sessionId}`).emit('gm-story-progression', {
            type: 'gm_story_progression',
            timestamp,
            data: {
              messageId,
              title: announcement.title,
              message: announcement.message,
              priority: announcement.priority,
              sender: 'GM',
              sessionId,
              isAIGenerated: true,
            },
          });

          logger.info(`📡 GM story progression announcement sent via WebSocket to session ${sessionId}`);
        }
      }

    } catch (error) {
      logger.error('Failed to post GM narrative announcement:', error);
    }
  }

  /**
   * 新エンティティの解放
   */
  private async unlockEntities(
    sessionId: string,
    entityIds: string[],
    triggerMilestoneId: string
  ): Promise<void> {
    try {
      for (const entityId of entityIds) {
        // エンティティ解放ログを記録
        const stmt = database.prepare(`
          INSERT INTO entity_unlocks (
            id, session_id, entity_id, trigger_milestone_id, trigger_type, unlocked_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          uuidv4(),
          sessionId,
          entityId,
          triggerMilestoneId,
          'ai_story_progression',
          new Date().toISOString()
        );

        logger.info(`🔓 Entity unlocked by AI: ${entityId} (session: ${sessionId})`);
      }
    } catch (error) {
      logger.error('Failed to unlock entities:', error);
    }
  }

  /**
   * NPCの登場
   */
  private async spawnNPCs(
    sessionId: string,
    npcIds: string[],
    triggerMilestoneId: string
  ): Promise<void> {
    try {
      for (const npcId of npcIds) {
        // NPC出現ログを記録
        const stmt = database.prepare(`
          INSERT INTO npc_spawns (
            id, session_id, npc_id, trigger_milestone_id, trigger_type, spawned_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          uuidv4(),
          sessionId,
          npcId,
          triggerMilestoneId,
          'ai_story_progression',
          new Date().toISOString()
        );

        logger.info(`👤 NPC spawned by AI: ${npcId} (session: ${sessionId})`);
      }
    } catch (error) {
      logger.error('Failed to spawn NPCs:', error);
    }
  }

  /**
   * 環境変化の実行
   */
  private async executeEnvironmentChanges(
    sessionId: string,
    changes: string[],
    triggerMilestoneId: string
  ): Promise<void> {
    try {
      for (const change of changes) {
        // 環境変化ログを記録
        const stmt = database.prepare(`
          INSERT INTO environment_changes (
            id, session_id, change_description, trigger_milestone_id, trigger_type, executed_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          uuidv4(),
          sessionId,
          change,
          triggerMilestoneId,
          'ai_story_progression',
          new Date().toISOString()
        );

        logger.info(`🌍 Environment change by AI: ${change} (session: ${sessionId})`);
      }
    } catch (error) {
      logger.error('Failed to execute environment changes:', error);
    }
  }

  /**
   * 判断ログの記録（分析・改善用）
   */
  private async recordProgressionDecision(
    sessionId: string,
    milestoneId: string,
    decision: StoryProgressionDecision
  ): Promise<void> {
    try {
      const stmt = database.prepare(`
        INSERT INTO story_progression_decisions (
          id, session_id, milestone_id, decision_data, recorded_at
        ) VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        uuidv4(),
        sessionId,
        milestoneId,
        JSON.stringify(decision),
        new Date().toISOString()
      );

    } catch (error) {
      logger.error('Failed to record progression decision:', error);
    }
  }

  /**
   * セッションデータの取得
   */
  private async getSessionData(sessionId: string): Promise<any> {
    try {
      const stmt = database.prepare('SELECT * FROM sessions WHERE id = ?');
      return stmt.get(sessionId) || {};
    } catch (error) {
      logger.error('Failed to get session data:', error);
      return {};
    }
  }

  /**
   * 最近のプレイヤー行動の取得
   */
  private async getRecentActions(sessionId: string, limit: number): Promise<any[]> {
    try {
      const stmt = database.prepare(`
        SELECT * FROM exploration_action_executions 
        WHERE session_id = ? 
        ORDER BY resolved_at DESC 
        LIMIT ?
      `);
      return stmt.all(sessionId, limit) || [];
    } catch (error) {
      logger.error('Failed to get recent actions:', error);
      return [];
    }
  }
}

// Singleton instance export
export const storyProgressionService = StoryProgressionService.getInstance();