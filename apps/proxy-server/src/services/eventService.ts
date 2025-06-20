import { TRPGEvent, ID, PaginatedResponse } from '@ai-agent-trpg/types';
import { database } from '../database/database';
import { v4 as uuidv4 } from 'uuid';

export interface EventQueryParams {
  page?: number;
  limit?: number;
  campaignId?: string;
  type?: string;
  status?: string;
  search?: string;
}

export interface CreateEventData {
  title: string;
  description: string;
  type: 'story' | 'combat' | 'social' | 'exploration' | 'puzzle' | 'rest';
  campaignId: ID;
  scheduledDate: string;
  duration: number;
  locationId?: string;
  participants: ID[];
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme';
  challengeRating: number;
  questId?: ID;
}

class EventService {
  async getEvents(params: EventQueryParams): Promise<PaginatedResponse<TRPGEvent>> {
    const { 
      page = 1, 
      limit = 10, 
      campaignId,
      type,
      status,
      search 
    } = params;

    let query = 'SELECT * FROM events WHERE 1=1';
    const queryParams: any[] = [];

    if (campaignId) {
      query += ' AND campaign_id = ?';
      queryParams.push(campaignId);
    }

    if (type) {
      query += ' AND type = ?';
      queryParams.push(type);
    }

    if (status) {
      query += ' AND completed_at IS ' + (status === 'completed' ? 'NOT' : '') + ' NULL';
    }

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Count total records
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = database.prepare(countQuery).get(...queryParams) as { count: number };
    const totalCount = countResult.count;

    // Get paginated results
    query += ' ORDER BY scheduled_date ASC LIMIT ? OFFSET ?';
    queryParams.push(limit, (page - 1) * limit);

    const rows = database.prepare(query).all(...queryParams) as any[];
    const events: TRPGEvent[] = rows.map(this.rowToEvent);

    return {
      items: events,
      totalCount,
      pageSize: limit,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page * limit < totalCount,
      hasPreviousPage: page > 1,
    };
  }

  async getEventById(id: ID): Promise<TRPGEvent | null> {
    const row = database.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
    return row ? this.rowToEvent(row) : null;
  }

  async getEventsByCampaign(campaignId: ID): Promise<TRPGEvent[]> {
    const rows = database.prepare(
      'SELECT * FROM events WHERE campaign_id = ? ORDER BY scheduled_date ASC'
    ).all(campaignId) as any[];
    return rows.map(this.rowToEvent);
  }

  async createEvent(eventData: CreateEventData): Promise<TRPGEvent> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const event: TRPGEvent = {
      id,
      title: eventData.title,
      description: eventData.description,
      type: eventData.type,
      scheduledDate: eventData.scheduledDate,
      duration: eventData.duration,
      locationId: eventData.locationId,
      participants: eventData.participants,
      difficulty: eventData.difficulty,
      challengeRating: eventData.challengeRating,
      questId: eventData.questId,
      outcomes: {
        success: false,
        experience: 0,
        rewards: [],
        consequences: [],
        storyImpact: [],
      },
      aiGenerated: false,
      createdAt: now,
      updatedAt: now,
    };

    database.prepare(`
      INSERT INTO events (
        id, title, description, type, campaign_id, scheduled_date, duration,
        location, participants, difficulty, challenge_rating, quest_id,
        outcomes, ai_generated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id,
      event.title,
      event.description,
      event.type,
      eventData.campaignId,
      event.scheduledDate,
      event.duration,
      event.locationId,
      JSON.stringify(event.participants),
      event.difficulty,
      event.challengeRating,
      event.questId,
      JSON.stringify(event.outcomes),
      event.aiGenerated ? 1 : 0,
      event.createdAt,
      event.updatedAt
    );

    // Update campaign events list
    const campaign = database.prepare('SELECT events FROM campaigns WHERE id = ?').get(eventData.campaignId) as any;
    if (campaign) {
      const events = campaign.events ? JSON.parse(campaign.events) : [];
      events.push(event.id);
      database.prepare('UPDATE campaigns SET events = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(events), now, eventData.campaignId);
    }

    return event;
  }

  async updateEvent(id: ID, updateData: Partial<TRPGEvent>): Promise<TRPGEvent | null> {
    const existingEvent = await this.getEventById(id);
    if (!existingEvent) {
      return null;
    }

    const updatedEvent: TRPGEvent = {
      ...existingEvent,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    database.prepare(`
      UPDATE events SET
        title = ?, description = ?, type = ?, scheduled_date = ?, duration = ?,
        location = ?, participants = ?, difficulty = ?, challenge_rating = ?,
        quest_id = ?, outcomes = ?, actual_start_time = ?, actual_end_time = ?,
        completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updatedEvent.title,
      updatedEvent.description,
      updatedEvent.type,
      updatedEvent.scheduledDate,
      updatedEvent.duration,
      updatedEvent.locationId,
      JSON.stringify(updatedEvent.participants),
      updatedEvent.difficulty,
      updatedEvent.challengeRating,
      updatedEvent.questId,
      JSON.stringify(updatedEvent.outcomes),
      updatedEvent.actualStartTime,
      updatedEvent.actualEndTime,
      updatedEvent.completedAt,
      updatedEvent.updatedAt,
      id
    );

    return updatedEvent;
  }

  async deleteEvent(id: ID): Promise<boolean> {
    const result = database.prepare('DELETE FROM events WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async completeEvent(id: ID, outcomes: TRPGEvent['outcomes']): Promise<TRPGEvent | null> {
    const existingEvent = await this.getEventById(id);
    if (!existingEvent) {
      return null;
    }

    const now = new Date().toISOString();
    const completedEvent: TRPGEvent = {
      ...existingEvent,
      outcomes,
      actualEndTime: now,
      completedAt: now,
      updatedAt: now,
    };

    await this.updateEvent(id, completedEvent);
    return completedEvent;
  }

  async startEvent(id: ID): Promise<TRPGEvent | null> {
    const existingEvent = await this.getEventById(id);
    if (!existingEvent) {
      return null;
    }

    const now = new Date().toISOString();
    const startedEvent: TRPGEvent = {
      ...existingEvent,
      actualStartTime: now,
      updatedAt: now,
    };

    await this.updateEvent(id, startedEvent);
    return startedEvent;
  }

  private rowToEvent(row: any): TRPGEvent {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      scheduledDate: row.scheduled_date,
      duration: row.duration,
      actualStartTime: row.actual_start_time,
      actualEndTime: row.actual_end_time,
      questId: row.quest_id,
      locationId: row.location_id,
      participants: row.participants ? JSON.parse(row.participants) : [],
      difficulty: row.difficulty,
      challengeRating: row.challenge_rating,
      outcomes: row.outcomes ? JSON.parse(row.outcomes) : {
        success: false,
        experience: 0,
        rewards: [],
        consequences: [],
        storyImpact: [],
      },
      aiGenerated: row.ai_generated === 1,
      seedPrompt: row.seed_prompt,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  }
}

export const eventService = new EventService();