import { v4 as uuidv4 } from 'uuid';
import { TRPGCampaign, PaginatedResponse } from '@ai-agent-trpg/types';
import { getDatabase, withTransaction } from '../database/database';
import { DatabaseError, ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

interface CampaignFilters {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

class CampaignService {
  async getCampaigns(filters: CampaignFilters): Promise<PaginatedResponse<TRPGCampaign>> {
    const db = getDatabase();
    
    try {
      let whereClause = '1 = 1';
      const params: any[] = [];
      
      if (filters.status) {
        whereClause += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters.search) {
        whereClause += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }
      
      // 総数を取得
      const countQuery = `SELECT COUNT(*) as total FROM campaigns WHERE ${whereClause}`;
      const countResult = db.prepare(countQuery).get(params) as { total: number };
      const totalCount = countResult.total;
      
      // ページネーション計算
      const offset = (filters.page - 1) * filters.limit;
      const totalPages = Math.ceil(totalCount / filters.limit);
      
      // データを取得
      const dataQuery = `
        SELECT * FROM campaigns 
        WHERE ${whereClause}
        ORDER BY updated_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const rows = db.prepare(dataQuery).all([...params, filters.limit, offset]) as any[];
      
      const campaigns = rows.map(this.mapRowToCampaign);
      
      return {
        items: campaigns,
        totalCount,
        pageSize: filters.limit,
        currentPage: filters.page,
        totalPages,
        hasNextPage: filters.page < totalPages,
        hasPreviousPage: filters.page > 1,
      };
      
    } catch (error) {
      logger.error('Failed to get campaigns:', error);
      throw new DatabaseError('Failed to retrieve campaigns', { error });
    }
  }

  async getCampaignById(id: string): Promise<TRPGCampaign | null> {
    const db = getDatabase();
    
    try {
      const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as any;
      
      if (!row) {
        return null;
      }
      
      return this.mapRowToCampaign(row);
      
    } catch (error) {
      logger.error(`Failed to get campaign ${id}:`, error);
      throw new DatabaseError('Failed to retrieve campaign', { error, campaignId: id });
    }
  }

  async createCampaign(campaignData: Partial<TRPGCampaign>): Promise<TRPGCampaign> {
    const now = new Date().toISOString();
    const campaign: TRPGCampaign = {
      id: uuidv4(),
      name: campaignData.name!,
      description: campaignData.description || '',
      settings: campaignData.settings!,
      status: campaignData.status || 'planning',
      currentLevel: campaignData.currentLevel || 1,
      startDate: campaignData.startDate,
      endDate: campaignData.endDate,
      expectedDuration: campaignData.expectedDuration || 10,
      goals: campaignData.goals || {
        mainQuest: '',
        subQuests: [],
        characterGoals: {},
        storyArcs: [],
      },
      characters: [],
      quests: [],
      events: [],
      sessions: [],
      locations: [],
      factions: [],
      notes: {
        gm: '',
        world: '',
        npcs: '',
        plot: '',
        sessions: {},
      },
      aiContent: {
        generatedNPCs: [],
        generatedEvents: [],
        generatedQuests: [],
        seedPrompts: [],
      },
      createdAt: now,
      updatedAt: now,
      totalPlayTime: 0,
    };

    return withTransaction((db) => {
      try {
        db.prepare(`
          INSERT INTO campaigns (
            id, name, description, settings, status, current_level,
            start_date, end_date, expected_duration, goals, characters,
            quests, events, sessions, locations, factions, notes,
            ai_content, created_at, updated_at, total_play_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          campaign.id,
          campaign.name,
          campaign.description,
          JSON.stringify(campaign.settings),
          campaign.status,
          campaign.currentLevel,
          campaign.startDate || null,
          campaign.endDate || null,
          campaign.expectedDuration,
          JSON.stringify(campaign.goals),
          JSON.stringify(campaign.characters),
          JSON.stringify(campaign.quests),
          JSON.stringify(campaign.events),
          JSON.stringify(campaign.sessions),
          JSON.stringify(campaign.locations),
          JSON.stringify(campaign.factions),
          JSON.stringify(campaign.notes),
          JSON.stringify(campaign.aiContent),
          campaign.createdAt,
          campaign.updatedAt,
          campaign.totalPlayTime
        );

        logger.info(`Campaign created: ${campaign.id} - ${campaign.name}`);
        return campaign;
        
      } catch (error) {
        logger.error('Failed to create campaign:', error);
        throw new DatabaseError('Failed to create campaign', { error });
      }
    });
  }

  async updateCampaign(id: string, updateData: Partial<TRPGCampaign>): Promise<TRPGCampaign | null> {
    const db = getDatabase();
    
    try {
      const existingCampaign = await this.getCampaignById(id);
      if (!existingCampaign) {
        return null;
      }

      const updatedCampaign: TRPGCampaign = {
        ...existingCampaign,
        ...updateData,
        id: existingCampaign.id, // IDは変更不可
        createdAt: existingCampaign.createdAt, // 作成日時は変更不可
        updatedAt: new Date().toISOString(),
      };

      db.prepare(`
        UPDATE campaigns SET
          name = ?, description = ?, settings = ?, status = ?, current_level = ?,
          start_date = ?, end_date = ?, expected_duration = ?, goals = ?,
          characters = ?, quests = ?, events = ?, sessions = ?, locations = ?,
          factions = ?, notes = ?, ai_content = ?, updated_at = ?,
          last_played_at = ?, total_play_time = ?
        WHERE id = ?
      `).run(
        updatedCampaign.name,
        updatedCampaign.description,
        JSON.stringify(updatedCampaign.settings),
        updatedCampaign.status,
        updatedCampaign.currentLevel,
        updatedCampaign.startDate || null,
        updatedCampaign.endDate || null,
        updatedCampaign.expectedDuration,
        JSON.stringify(updatedCampaign.goals),
        JSON.stringify(updatedCampaign.characters),
        JSON.stringify(updatedCampaign.quests),
        JSON.stringify(updatedCampaign.events),
        JSON.stringify(updatedCampaign.sessions),
        JSON.stringify(updatedCampaign.locations),
        JSON.stringify(updatedCampaign.factions),
        JSON.stringify(updatedCampaign.notes),
        JSON.stringify(updatedCampaign.aiContent),
        updatedCampaign.updatedAt,
        updatedCampaign.lastPlayedAt || null,
        updatedCampaign.totalPlayTime,
        id
      );

      logger.info(`Campaign updated: ${id}`);
      return updatedCampaign;
      
    } catch (error) {
      logger.error(`Failed to update campaign ${id}:`, error);
      throw new DatabaseError('Failed to update campaign', { error, campaignId: id });
    }
  }

  async updateCampaignStatus(id: string, status: string): Promise<TRPGCampaign | null> {
    const validStatuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`);
    }

    return this.updateCampaign(id, { status: status as any });
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const db = getDatabase();
    
    try {
      const result = db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        return false;
      }
      
      logger.info(`Campaign deleted: ${id}`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to delete campaign ${id}:`, error);
      throw new DatabaseError('Failed to delete campaign', { error, campaignId: id });
    }
  }

  async addCharacterToCampaign(campaignId: string, characterId: string): Promise<TRPGCampaign | null> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      return null;
    }

    if (!campaign.characters.includes(characterId)) {
      campaign.characters.push(characterId);
      return this.updateCampaign(campaignId, { characters: campaign.characters });
    }

    return campaign;
  }

  async removeCharacterFromCampaign(campaignId: string, characterId: string): Promise<TRPGCampaign | null> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      return null;
    }

    const index = campaign.characters.indexOf(characterId);
    if (index > -1) {
      campaign.characters.splice(index, 1);
      return this.updateCampaign(campaignId, { characters: campaign.characters });
    }

    return campaign;
  }

  private mapRowToCampaign(row: any): TRPGCampaign {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      settings: JSON.parse(row.settings),
      status: row.status,
      currentLevel: row.current_level,
      startDate: row.start_date,
      endDate: row.end_date,
      expectedDuration: row.expected_duration,
      goals: JSON.parse(row.goals),
      characters: JSON.parse(row.characters),
      quests: JSON.parse(row.quests),
      events: JSON.parse(row.events),
      sessions: JSON.parse(row.sessions),
      locations: JSON.parse(row.locations),
      factions: JSON.parse(row.factions),
      notes: JSON.parse(row.notes),
      aiContent: JSON.parse(row.ai_content),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastPlayedAt: row.last_played_at,
      totalPlayTime: row.total_play_time,
    };
  }
}

export const campaignService = new CampaignService();