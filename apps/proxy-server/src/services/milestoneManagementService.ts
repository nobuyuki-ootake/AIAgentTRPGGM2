import { database } from '../database/database';
import { MilestoneCompletionService } from './milestoneCompletionService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';

export interface MilestoneProgressInfo {
  milestoneId: string;
  currentProgress: number;
  maxProgress: number;
  progressPercentage: number;
  completedEntities: string[];
  remainingEntities: string[];
  lastUpdated: string;
}

export interface ManualCompletionResult {
  success: boolean;
  milestoneId: string;
  newStatus: 'completed';
  triggeredEvents: string[];
  narrativeMessage: string;
}

export interface ScenarioProgressionResult {
  success: boolean;
  unlockedEntities: string[];
  newNPCs: string[];
  newEvents: string[];
  narrativeAnnouncement: string;
}

export interface GMAnnouncementResult {
  success: boolean;
  messageId: string;
  timestamp: string;
}

export class MilestoneManagementService {
  private static instance: MilestoneManagementService;
  private milestoneCompletionService: MilestoneCompletionService;
  private app: express.Application | null = null;

  private constructor() {
    this.milestoneCompletionService = new MilestoneCompletionService();
  }

  /**
   * Express アプリケーションインスタンスを設定（Socket.IO アクセス用）
   */
  setApp(app: express.Application): void {
    this.app = app;
  }

  /**
   * データベースヘルパーメソッド
   */
  private async findMilestoneById(milestoneId: string): Promise<any> {
    const stmt = database.prepare('SELECT * FROM milestones WHERE id = ?');
    return stmt.get(milestoneId);
  }

  private async queryDatabase(table: string, conditions: Record<string, any>): Promise<any[]> {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(conditions);
    const stmt = database.prepare(`SELECT * FROM ${table} WHERE ${whereClause}`);
    return stmt.all(...values);
  }

  private async updateMilestone(milestoneId: string, data: Record<string, any>): Promise<void> {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), milestoneId];
    const stmt = database.prepare(`UPDATE milestones SET ${setClause} WHERE id = ?`);
    stmt.run(...values);
  }

  private async createChatMessage(message: Record<string, any>): Promise<void> {
    const fields = Object.keys(message).join(', ');
    const placeholders = Object.keys(message).map(() => '?').join(', ');
    const values = Object.values(message);
    const stmt = database.prepare(`INSERT INTO chat_messages (${fields}) VALUES (${placeholders})`);
    stmt.run(...values);
  }

  public static getInstance(): MilestoneManagementService {
    if (!MilestoneManagementService.instance) {
      MilestoneManagementService.instance = new MilestoneManagementService();
    }
    return MilestoneManagementService.instance;
  }

  /**
   * マイルストーンの詳細進捗情報を取得
   */
  public async getMilestoneProgress(sessionId: string, milestoneId: string): Promise<MilestoneProgressInfo> {
    try {
      logger.info(`Getting milestone progress for session ${sessionId}, milestone ${milestoneId}`);

      // マイルストーン基本情報取得
      const milestone = await this.findMilestoneById(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      // エンティティ関係情報取得
      const entityRelationships = milestone.entityRelationships;
      if (!entityRelationships) {
        // 基本的な情報を返す
        return {
          milestoneId,
          currentProgress: milestone.status === 'completed' ? 1 : 0,
          maxProgress: 1,
          progressPercentage: milestone.status === 'completed' ? 100 : 0,
          completedEntities: milestone.status === 'completed' ? ['milestone'] : [],
          remainingEntities: milestone.status === 'completed' ? [] : ['milestone'],
          lastUpdated: new Date().toISOString(),
        };
      }

      // エンティティ関係に基づく詳細進捗計算
      const rules = entityRelationships.rules || [];
      let completedEntities: string[] = [];
      let remainingEntities: string[] = [];
      let totalProgress = 0;
      let maxProgress = 0;

      for (const rule of rules) {
        maxProgress += rule.entities.length;
        
        for (const entityId of rule.entities) {
          // エンティティの完了状況チェック
          const isCompleted = await this.checkEntityCompletion(sessionId, entityId, rule.entityType);
          
          if (isCompleted) {
            completedEntities.push(`${rule.entityType}:${entityId}`);
            totalProgress++;
          } else {
            remainingEntities.push(`${rule.entityType}:${entityId}`);
          }
        }
      }

      const progressPercentage = maxProgress > 0 ? (totalProgress / maxProgress) * 100 : 0;

      return {
        milestoneId,
        currentProgress: totalProgress,
        maxProgress,
        progressPercentage,
        completedEntities,
        remainingEntities,
        lastUpdated: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Error getting milestone progress:', error);
      throw error;
    }
  }

  /**
   * エンティティの完了状況をチェック
   */
  private async checkEntityCompletion(sessionId: string, entityId: string, entityType: string): Promise<boolean> {
    try {
      switch (entityType.toLowerCase()) {
        case 'quest':
          const quests = await this.queryDatabase('quests', { id: entityId });
          return quests.length > 0 && quests[0].status === 'completed';
          
        case 'item':
          // アイテム取得状況をチェック（実装依存）
          const inventory = await this.queryDatabase('player_inventory', { sessionId, itemId: entityId });
          return inventory.length > 0;
          
        case 'location':
          // 場所の訪問状況をチェック
          const visitedLocations = await this.queryDatabase('visited_locations', { sessionId, locationId: entityId });
          return visitedLocations.length > 0;
          
        case 'character':
          // キャラクターとの接触状況をチェック
          const characterInteractions = await this.queryDatabase('character_interactions', { sessionId, characterId: entityId });
          return characterInteractions.length > 0;
          
        default:
          logger.warn(`Unknown entity type: ${entityType}`);
          return false;
      }
    } catch (error) {
      logger.error(`Error checking entity completion: ${entityType}:${entityId}`, error);
      return false;
    }
  }

  /**
   * マイルストーンを手動で完了させる
   */
  public async completeMilestoneManually(
    sessionId: string,
    milestoneId: string,
    options: {
      skipValidation?: boolean;
      narrativeMessage?: string;
      gmNote?: string;
    }
  ): Promise<ManualCompletionResult> {
    try {
      logger.info(`Manually completing milestone ${milestoneId} for session ${sessionId}`);

      // マイルストーン取得
      const milestone = await this.findMilestoneById(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      if (milestone.status === 'completed') {
        return {
          success: true,
          milestoneId,
          newStatus: 'completed',
          triggeredEvents: [],
          narrativeMessage: options.narrativeMessage || 'This milestone was already completed.',
        };
      }

      // バリデーションスキップでない場合、進捗をチェック
      if (!options.skipValidation) {
        const progress = await this.getMilestoneProgress(sessionId, milestoneId);
        if (progress.progressPercentage < 100) {
          logger.warn(`Manual completion requested for incomplete milestone ${milestoneId} (${progress.progressPercentage}%)`);
        }
      }

      // マイルストーンを完了状態に更新
      await this.updateMilestone(milestoneId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        manualCompletion: true,
        gmNote: options.gmNote,
      });

      // ナラティブメッセージ生成
      const narrativeMessage = options.narrativeMessage || 
        milestone.entityRelationships?.narrativeProgression?.completionNarrative ||
        `マイルストーン「${milestone.title}」が達成されました。`;

      // GM通知の送信
      await this.milestoneCompletionService.queueMilestoneCompletionNotification({
        sessionId,
        milestoneId,
        milestone,
        completionType: 'manual',
        narrativeMessage,
      });

      // トリガーされたイベントの取得（簡易版）
      const triggeredEvents = ['milestone_completion_notification'];

      logger.info(`Milestone ${milestoneId} manually completed successfully`);

      return {
        success: true,
        milestoneId,
        newStatus: 'completed',
        triggeredEvents,
        narrativeMessage,
      };

    } catch (error) {
      logger.error('Error manually completing milestone:', error);
      throw error;
    }
  }

  /**
   * GMナラティブアナウンスをチャットに投稿
   */
  public async postGMNarrativeAnnouncement(
    sessionId: string,
    announcement: {
      title: string;
      message: string;
      type: 'milestone_completion' | 'scenario_progression' | 'custom';
      priority: 'low' | 'medium' | 'high';
      relatedMilestoneId?: string;
    }
  ): Promise<GMAnnouncementResult> {
    try {
      logger.info(`Posting GM narrative announcement for session ${sessionId}: ${announcement.title}`);

      const messageId = uuidv4();
      const timestamp = new Date().toISOString();

      // チャットメッセージとしてデータベースに保存
      const chatMessage = {
        id: messageId,
        sessionId,
        sender: 'GM',
        senderType: 'system',
        content: announcement.message,
        title: announcement.title,
        type: 'gm_narrative',
        priority: announcement.priority,
        relatedMilestoneId: announcement.relatedMilestoneId,
        timestamp,
        createdAt: timestamp,
      };

      await this.createChatMessage(chatMessage);

      // WebSocket経由でリアルタイム送信
      if (this.app) {
        const io = this.app.get('socketio') as SocketIOServer;
        if (io) {
          io.to(`session-${sessionId}`).emit('gm-narrative-announcement', {
            type: 'gm_narrative_announcement',
            timestamp,
            data: {
              messageId,
              title: announcement.title,
              message: announcement.message,
              priority: announcement.priority,
              sender: 'GM',
              sessionId,
            },
          });

          logger.info(`GM narrative announcement sent via WebSocket to session ${sessionId}`);
        }
      }

      return {
        success: true,
        messageId,
        timestamp,
      };

    } catch (error) {
      logger.error('Error posting GM narrative announcement:', error);
      throw error;
    }
  }

  /**
   * シナリオ進行をトリガー
   */
  public async triggerScenarioProgression(
    sessionId: string,
    options: {
      progressionType: 'milestone_based' | 'manual' | 'time_based';
      milestoneId?: string;
      customMessage?: string;
      unlockEntities?: string[];
    }
  ): Promise<ScenarioProgressionResult> {
    try {
      logger.info(`Triggering scenario progression for session ${sessionId}, type: ${options.progressionType}`);

      let unlockedEntities: string[] = [];
      let newNPCs: string[] = [];
      let newEvents: string[] = [];
      let narrativeAnnouncement = '';

      switch (options.progressionType) {
        case 'milestone_based':
          if (options.milestoneId) {
            const result = await this.processMilestoneBasedProgression(sessionId, options.milestoneId);
            unlockedEntities = result.unlockedEntities;
            newNPCs = result.newNPCs;
            newEvents = result.newEvents;
            narrativeAnnouncement = result.narrativeAnnouncement;
          } else {
            // 全体的なマイルストーン基準進行
            const result = await this.processGeneralMilestoneProgression(sessionId);
            unlockedEntities = result.unlockedEntities;
            newNPCs = result.newNPCs;
            newEvents = result.newEvents;
            narrativeAnnouncement = result.narrativeAnnouncement;
          }
          break;

        case 'manual':
          // 手動進行
          const manualResult = await this.processManualProgression(sessionId, options.customMessage);
          unlockedEntities = manualResult.unlockedEntities;
          newNPCs = manualResult.newNPCs;
          newEvents = manualResult.newEvents;
          narrativeAnnouncement = manualResult.narrativeAnnouncement;
          break;

        case 'time_based':
          // 時間ベース進行（将来実装）
          narrativeAnnouncement = '時間に基づくシナリオ進行は現在開発中です。';
          break;
      }

      // 進行結果をアナウンス
      if (narrativeAnnouncement) {
        await this.postGMNarrativeAnnouncement(sessionId, {
          title: 'シナリオ進行',
          message: narrativeAnnouncement,
          type: 'scenario_progression',
          priority: 'medium',
        });
      }

      logger.info(`Scenario progression completed for session ${sessionId}`);

      return {
        success: true,
        unlockedEntities,
        newNPCs,
        newEvents,
        narrativeAnnouncement,
      };

    } catch (error) {
      logger.error('Error triggering scenario progression:', error);
      throw error;
    }
  }

  /**
   * マイルストーン基準の進行処理
   */
  private async processGeneralMilestoneProgression(sessionId: string): Promise<{
    unlockedEntities: string[];
    newNPCs: string[];
    newEvents: string[];
    narrativeAnnouncement: string;
  }> {
    // 完了マイルストーンに基づく新エンティティ解放
    const completedMilestones = await this.queryDatabase('milestones', { 
      sessionId, 
      status: 'completed' 
    });

    const unlockedEntities = [`unlocked_${completedMilestones.length}_areas`];
    const newNPCs = completedMilestones.length > 2 ? [`guide_npc_${sessionId}`] : [];
    const newEvents = [`progression_event_${Date.now()}`];

    const narrativeAnnouncement = `あなたの功績により、新たな道筋が開かれました。${unlockedEntities.length}つの新エリアが利用可能になり、${newNPCs.length > 0 ? '新たな案内人が現れました。' : '探索を続けてください。'}`;

    return {
      unlockedEntities,
      newNPCs,
      newEvents,
      narrativeAnnouncement,
    };
  }

  /**
   * 特定マイルストーン基準の進行処理
   */
  private async processMilestoneBasedProgression(_sessionId: string, milestoneId: string): Promise<{
    unlockedEntities: string[];
    newNPCs: string[];
    newEvents: string[];
    narrativeAnnouncement: string;
  }> {
    const milestone = await this.findMilestoneById(milestoneId);
    const unlockPrefix = milestone?.title || 'progress';
    
    const unlockedEntities = [`${unlockPrefix}_unlock_1`, `${unlockPrefix}_unlock_2`];
    const newNPCs = [`${unlockPrefix}_npc`];
    const newEvents = [`${unlockPrefix}_event`];

    const narrativeAnnouncement = `「${milestone?.title}」の達成により、新たな局面を迎えました。隠されていた真実の一部が明らかになります。`;

    return {
      unlockedEntities,
      newNPCs,
      newEvents,
      narrativeAnnouncement,
    };
  }

  /**
   * 手動進行処理
   */
  private async processManualProgression(_sessionId: string, customMessage?: string): Promise<{
    unlockedEntities: string[];
    newNPCs: string[];
    newEvents: string[];
    narrativeAnnouncement: string;
  }> {
    const timestamp = Date.now();
    const unlockedEntities = [`manual_unlock_${timestamp}`];
    const newNPCs = [`manual_npc_${timestamp}`];
    const newEvents = [`manual_event_${timestamp}`];

    const narrativeAnnouncement = customMessage || 
      '物語は新たな展開を迎えます。予期しない出来事が待ち受けているかもしれません。';

    return {
      unlockedEntities,
      newNPCs,
      newEvents,
      narrativeAnnouncement,
    };
  }
}