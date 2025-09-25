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
      logger.error('Failed to get campaigns:', { error });
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
      logger.error(`Failed to get campaign ${id}:`, { error, campaignId: id });
      throw new DatabaseError('Failed to retrieve campaign', { error, campaignId: id });
    }
  }

  async createCampaign(campaignData: Partial<TRPGCampaign>): Promise<TRPGCampaign> {
    const now = new Date().toISOString();
    const campaign: TRPGCampaign = {
      id: uuidv4(),
      name: campaignData.name!,
      description: campaignData.description || '',
      status: campaignData.status || 'planning',
      
      // 設定情報（必須フィールド）
      system: campaignData.system || 'D&D 5e',
      theme: campaignData.theme || 'ファンタジー',
      setting: campaignData.setting || '未設定',
      settings: campaignData.settings || {},
      level: campaignData.level || 1,
      currentLevel: campaignData.currentLevel || 1,
      
      // 参加者（必須フィールド）
      gameMasterId: campaignData.gameMasterId || 'default-gm',
      playerIds: campaignData.playerIds || [],
      characterIds: campaignData.characterIds || [],
      
      // 世界設定（必須フィールド）
      worldSettings: campaignData.worldSettings || {
        techLevel: 'medieval',
        magicLevel: 'medium',
        scale: 'regional',
        themes: [],
        restrictions: []
      },
      
      // 進行管理
      sessions: campaignData.sessions || [],
      currentSessionId: campaignData.currentSessionId,
      mainQuestId: campaignData.mainQuestId,
      
      // エンティティ管理（データベース互換用）
      characters: [],
      quests: [],
      events: [],
      locations: [],
      factions: [],
      
      // タイムライン
      startDate: campaignData.startDate || now,
      estimatedEndDate: campaignData.estimatedEndDate,
      endDate: campaignData.endDate,
      lastPlayedDate: campaignData.lastPlayedDate,
      expectedDuration: campaignData.expectedDuration || 10,
      
      // 目標設定
      goals: campaignData.goals || {
        mainQuest: '',
        subQuests: [],
        characterGoals: {},
        storyArcs: [],
      },
      
      // メタデータ
      createdAt: now,
      updatedAt: now,
      lastPlayedAt: campaignData.lastPlayedAt,
      totalPlayTime: campaignData.totalPlayTime || 0,
      notes: campaignData.notes || {},
      aiContent: campaignData.aiContent || {},
      tags: campaignData.tags || [],
      imageUrl: campaignData.imageUrl
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

        logger.info(`Campaign created: ${campaign.id} - ${campaign.name}`, { campaignId: campaign.id, campaignName: campaign.name });
        return campaign;
        
      } catch (error) {
        logger.error('Failed to create campaign:', { error });
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

      logger.info(`Campaign updated: ${id}`, { campaignId: id });
      return updatedCampaign;
      
    } catch (error) {
      logger.error(`Failed to update campaign ${id}:`, { error, campaignId: id });
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
      
      logger.info(`Campaign deleted: ${id}`, { campaignId: id });
      return true;
      
    } catch (error) {
      logger.error(`Failed to delete campaign ${id}:`, { error, campaignId: id });
      throw new DatabaseError('Failed to delete campaign', { error, campaignId: id });
    }
  }

  async addCharacterToCampaign(campaignId: string, characterId: string): Promise<TRPGCampaign | null> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      return null;
    }

    if (!campaign.characters?.includes(characterId)) {
      campaign.characters = campaign.characters || [];
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

    const index = campaign.characters?.indexOf(characterId) ?? -1;
    if (index > -1) {
      campaign.characters = campaign.characters || [];
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
      status: row.status,
      
      // 設定情報（必須フィールド）
      system: row.system || 'D&D 5e',
      theme: row.theme || 'ファンタジー',
      setting: row.setting || '未設定',
      settings: JSON.parse(row.settings || '{}'),
      level: row.level || row.current_level || 1,
      currentLevel: row.current_level || 1,
      
      // 参加者（必須フィールド）
      gameMasterId: row.game_master_id || 'default-gm',
      playerIds: JSON.parse(row.player_ids || '[]'),
      characterIds: JSON.parse(row.character_ids || '[]'),
      
      // 世界設定（必須フィールド）
      worldSettings: JSON.parse(row.world_settings || '{"techLevel":"medieval","magicLevel":"medium","scale":"regional","themes":[],"restrictions":[]}'),
      
      // 進行管理
      sessions: JSON.parse(row.sessions || '[]'),
      currentSessionId: row.current_session_id,
      mainQuestId: row.main_quest_id,
      
      // エンティティ管理
      characters: JSON.parse(row.characters || '[]'),
      quests: JSON.parse(row.quests || '[]'),
      events: JSON.parse(row.events || '[]'),
      locations: JSON.parse(row.locations || '[]'),
      factions: JSON.parse(row.factions || '[]'),
      
      // タイムライン
      startDate: row.start_date,
      estimatedEndDate: row.estimated_end_date,
      endDate: row.end_date,
      lastPlayedDate: row.last_played_date,
      expectedDuration: row.expected_duration || 10,
      
      // 目標設定
      goals: JSON.parse(row.goals || '{"mainQuest":"","subQuests":[],"characterGoals":{},"storyArcs":[]}'),
      
      // メタデータ
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastPlayedAt: row.last_played_at,
      totalPlayTime: row.total_play_time || 0,
      notes: JSON.parse(row.notes || '{}'),
      aiContent: JSON.parse(row.ai_content || '{}'),
      tags: JSON.parse(row.tags || '[]'),
      imageUrl: row.image_url,
    };
  }
}

// Lazy initialization to avoid early instantiation
let _campaignService: CampaignService | null = null;
export function getCampaignService(): CampaignService {
  if (!_campaignService) {
    _campaignService = new CampaignService();
  }
  return _campaignService;
}