import { v4 as uuidv4 } from 'uuid';
import { Quest, ID } from '@ai-agent-trpg/types';
import { getDatabase, withTransaction } from '../database/database';
import { DatabaseError, ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { getAIService } from './aiService';

class QuestService {
  async getQuestsByCampaign(campaignId: ID): Promise<Quest[]> {
    const db = getDatabase();
    
    try {
      const rows = db.prepare(`
        SELECT * FROM quests 
        WHERE campaign_id = ? 
        ORDER BY created_at DESC
      `).all(campaignId) as any[];
      
      return rows.map(this.mapRowToQuest);
      
    } catch (error) {
      logger.error(`Failed to get quests for campaign ${campaignId}:`, error);
      throw new DatabaseError('Failed to retrieve quests', { error, campaignId });
    }
  }

  async getQuestById(id: ID): Promise<Quest | null> {
    const db = getDatabase();
    
    try {
      const row = db.prepare('SELECT * FROM quests WHERE id = ?').get(id) as any;
      
      if (!row) {
        return null;
      }
      
      return this.mapRowToQuest(row);
      
    } catch (error) {
      logger.error(`Failed to get quest ${id}:`, error);
      throw new DatabaseError('Failed to retrieve quest', { error, questId: id });
    }
  }

  async createQuest(questData: Partial<Quest>): Promise<Quest> {
    try {
      return withTransaction((db) => {
        const questId = uuidv4();
        const now = new Date().toISOString();

        const quest: Quest = {
          id: questId,
          campaignId: questData.campaignId || '',
          title: questData.title || '',
          description: questData.description || '',
          type: questData.type || 'side',
          status: questData.status || 'not_started',
          objectives: questData.objectives || [],
          prerequisites: questData.prerequisites || [],
          followups: questData.followups || [],
          rewards: {
            experience: 0,
            currency: 0,
            items: [],
            reputation: {},
            storyProgression: [],
            ...questData.rewards,
          },
          timeLimit: questData.timeLimit,
          estimatedDuration: questData.estimatedDuration || 60,
          giver: questData.giver || '',
          location: questData.location || '',
          level: questData.level || 1,
          createdAt: now,
          updatedAt: now,
          completedAt: questData.completedAt,
        };

        // データベースに挿入
        db.prepare(`
          INSERT INTO quests (
            id, campaign_id, title, description, type, status,
            objectives, prerequisites, followups, rewards,
            time_limit, estimated_duration, giver, location, level,
            created_at, updated_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          quest.id,
          quest.campaignId,
          quest.title,
          quest.description,
          quest.type,
          quest.status,
          JSON.stringify(quest.objectives),
          JSON.stringify(quest.prerequisites),
          JSON.stringify(quest.followups),
          JSON.stringify(quest.rewards),
          quest.timeLimit || null,
          quest.estimatedDuration,
          quest.giver,
          quest.location,
          quest.level,
          quest.createdAt,
          quest.updatedAt,
          quest.completedAt || null
        );

        logger.info(`Created quest ${quest.id} for campaign ${questData.campaignId}`);
        return quest;
      });
      
    } catch (error) {
      logger.error(`Failed to create quest:`, error);
      throw new DatabaseError('Failed to create quest', { error, questData });
    }
  }

  async updateQuest(id: ID, updates: Partial<Quest>): Promise<Quest | null> {
    try {
      return withTransaction((db) => {
        const questRow = db.prepare('SELECT * FROM quests WHERE id = ?').get(id) as any;
        if (!questRow) {
          return null;
        }
        const quest = this.mapRowToQuest(questRow);
        if (!quest) {
          return null;
        }

        const updatedQuest = { ...quest, ...updates, updatedAt: new Date().toISOString() };

        db.prepare(`
          UPDATE quests SET
            title = ?, description = ?, type = ?, status = ?,
            objectives = ?, prerequisites = ?, followups = ?, rewards = ?,
            time_limit = ?, estimated_duration = ?, giver = ?, location = ?, level = ?,
            updated_at = ?, completed_at = ?
          WHERE id = ?
        `).run(
          updatedQuest.title,
          updatedQuest.description,
          updatedQuest.type,
          updatedQuest.status,
          JSON.stringify(updatedQuest.objectives),
          JSON.stringify(updatedQuest.prerequisites),
          JSON.stringify(updatedQuest.followups),
          JSON.stringify(updatedQuest.rewards),
          updatedQuest.timeLimit || null,
          updatedQuest.estimatedDuration,
          updatedQuest.giver,
          updatedQuest.location,
          updatedQuest.level,
          updatedQuest.updatedAt,
          updatedQuest.completedAt || null,
          id
        );

        logger.info(`Updated quest ${id}`);
        return updatedQuest;
      });
      
    } catch (error) {
      logger.error(`Failed to update quest ${id}:`, error);
      throw new DatabaseError('Failed to update quest', { error, questId: id });
    }
  }

  async updateQuestStatus(id: ID, status: Quest['status']): Promise<Quest | null> {
    const updates: Partial<Quest> = { status };
    
    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
    }

    return this.updateQuest(id, updates);
  }

  async updateQuestObjective(
    questId: ID, 
    objectiveId: ID, 
    updates: { completed?: boolean; progress?: number }
  ): Promise<Quest | null> {
    const quest = await this.getQuestById(questId);
    if (!quest) {
      return null;
    }

    const updatedObjectives = quest.objectives.map(objective =>
      objective.id === objectiveId 
        ? { ...objective, ...updates } 
        : objective
    );

    return this.updateQuest(questId, { objectives: updatedObjectives });
  }

  async deleteQuest(id: ID): Promise<boolean> {
    const db = getDatabase();
    
    try {
      const result = db.prepare('DELETE FROM quests WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        return false;
      }

      logger.info(`Deleted quest ${id}`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to delete quest ${id}:`, error);
      throw new DatabaseError('Failed to delete quest', { error, questId: id });
    }
  }

  async getAvailableQuests(campaignId: ID, completedQuestIds: ID[]): Promise<Quest[]> {
    const allQuests = await this.getQuestsByCampaign(campaignId);
    
    return allQuests.filter(quest => {
      // 未開始または失敗したクエストのみ
      if (quest.status !== 'not_started' && quest.status !== 'failed') {
        return false;
      }

      // 前提条件をチェック
      if (quest.prerequisites && quest.prerequisites.length > 0) {
        const prereqsMet = quest.prerequisites.every(prereqId => 
          completedQuestIds.includes(prereqId)
        );
        if (!prereqsMet) {
          return false;
        }
      }

      return true;
    });
  }

  async claimQuestRewards(questId: ID, _characterId: ID): Promise<{
    experience: number;
    currency: number;
    items: string[];
    reputation: Record<string, number>;
  }> {
    const quest = await this.getQuestById(questId);
    
    if (!quest) {
      throw new ValidationError('Quest not found');
    }

    if (quest.status !== 'completed') {
      throw new ValidationError('Quest is not completed');
    }

    // 実際の報酬処理はキャラクターサービスと連携して実装
    // ここでは報酬情報のみ返す
    return {
      experience: quest.rewards?.experience || 0,
      currency: quest.rewards?.currency || 0,
      items: quest.rewards?.items || [],
      reputation: quest.rewards?.reputation || {},
    };
  }

  async generateQuestSuggestions(campaignId: ID, context: {
    playerLevel: number;
    currentLocation?: string;
    recentEvents?: string[];
    preferences?: string[];
  }): Promise<Partial<Quest>[]> {
    try {
      // AIサービスを使用してクエスト提案を生成
      const aiResponse = await getAIService().generateEvent({
        provider: 'google',
        apiKey: process.env.GOOGLE_API_KEY || '',
        eventType: 'quest_generation',
        campaignContext: { campaignId },
        sessionContext: context
      });

      // AIレスポンスをパースしてクエスト提案に変換
      const suggestions = this.parseQuestSuggestions(aiResponse.eventData);
      
      return suggestions.map(suggestion => ({
        ...suggestion,
        type: suggestion.type || 'side',
        level: context.playerLevel,
        location: context.currentLocation || suggestion.location,
        estimatedDuration: suggestion.estimatedDuration || 60,
      }));
      
    } catch (error) {
      logger.error('Failed to generate quest suggestions:', error);
      // フォールバック：事前定義されたクエストテンプレート
      return this.getFallbackQuestSuggestions(context);
    }
  }

  async syncQuestProgressWithSession(_sessionId: ID, questUpdates: Array<{
    questId: ID;
    objectiveId?: ID;
    progress?: number;
    completed?: boolean;
  }>): Promise<Quest[]> {
    const updatedQuests: Quest[] = [];

    for (const update of questUpdates) {
      if (update.objectiveId) {
        // 目標の更新
        const quest = await this.updateQuestObjective(
          update.questId,
          update.objectiveId,
          {
            completed: update.completed,
            progress: update.progress,
          }
        );
        if (quest) updatedQuests.push(quest);
      } else {
        // クエスト全体の更新
        const quest = await this.updateQuest(update.questId, {
          // セッション関連の更新ロジック
        });
        if (quest) updatedQuests.push(quest);
      }
    }

    return updatedQuests;
  }

  private mapRowToQuest(row: any): Quest {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      objectives: JSON.parse(row.objectives || '[]'),
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      followups: JSON.parse(row.followups || '[]'),
      rewards: JSON.parse(row.rewards || '{}'),
      timeLimit: row.time_limit,
      estimatedDuration: row.estimated_duration,
      giver: row.giver,
      location: row.location,
      level: row.level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  }


  private parseQuestSuggestions(aiContent: string): Partial<Quest>[] {
    try {
      // AIレスポンスからJSONを抽出してパース
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No valid JSON found in AI response');
    } catch (error) {
      logger.warn('Failed to parse AI quest suggestions:', error);
      return [];
    }
  }

  private getFallbackQuestSuggestions(context: {
    playerLevel: number;
    currentLocation?: string;
  }): Partial<Quest>[] {
    return [
      {
        title: "失われた商人の調査",
        description: "最近行方不明になった商人の手がかりを探してください。",
        type: "side",
        objectives: [
          { id: uuidv4(), description: "商人の最後の目撃情報を集める", completed: false, optional: false, progress: 0, requirements: [] },
          { id: uuidv4(), description: "商人の荷車の痕跡を追う", completed: false, optional: false, progress: 0, requirements: [] },
        ],
        rewards: {
          experience: context.playerLevel * 50,
          currency: 100,
          items: [],
          reputation: {},
          storyProgression: [],
        },
        giver: "宿屋の主人",
        location: context.currentLocation || "町の中心部",
      },
      {
        title: "古い遺跡の探索",
        description: "近くの森で発見された古い遺跡を調査してください。",
        type: "main",
        objectives: [
          { id: uuidv4(), description: "遺跡の入り口を見つける", completed: false, optional: false, progress: 0, requirements: [] },
          { id: uuidv4(), description: "遺跡内部を探索する", completed: false, optional: false, progress: 0, requirements: [] },
          { id: uuidv4(), description: "古代の宝物を発見する", completed: false, optional: true, progress: 0, requirements: [] },
        ],
        rewards: {
          experience: context.playerLevel * 100,
          currency: 200,
          items: ["古代のアミュレット"],
          reputation: {},
          storyProgression: ["古代文明の手がかり"],
        },
        giver: "学者",
        location: "森の遺跡",
      },
    ];
  }
}

// Lazy initialization to avoid early instantiation
let _questService: QuestService | null = null;
export function getQuestService(): QuestService {
  if (!_questService) {
    _questService = new QuestService();
  }
  return _questService;
}