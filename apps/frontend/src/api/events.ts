import { TRPGEvent, PaginatedResponse } from '@ai-agent-trpg/types';
import { apiClient } from './client';

export interface CreateEventRequest {
  title: string;
  description: string;
  type: 'story' | 'combat' | 'social' | 'exploration' | 'puzzle' | 'rest';
  campaignId: string;
  scheduledDate: string;
  duration: number;
  location: string;
  participants: string[];
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme';
  challengeRating: number;
  questId?: string;
}

export interface EventQueryParams {
  page?: number;
  limit?: number;
  campaignId?: string;
  type?: string;
  status?: string;
  search?: string;
}

export const eventAPI = {
  async getEvents(params?: EventQueryParams): Promise<PaginatedResponse<TRPGEvent>> {
    return await apiClient.get<PaginatedResponse<TRPGEvent>>('/events', {
      params
    });
  },

  async getEventsByCampaign(campaignId: string): Promise<TRPGEvent[]> {
    return await apiClient.get<TRPGEvent[]>(`/events/campaign/${campaignId}`);
  },

  async getEventById(id: string): Promise<TRPGEvent> {
    return await apiClient.get<TRPGEvent>(`/events/${id}`);
  },

  async createEvent(eventData: CreateEventRequest): Promise<TRPGEvent> {
    return await apiClient.post<TRPGEvent>('/events', eventData);
  },

  async updateEvent(id: string, eventData: Partial<TRPGEvent>): Promise<TRPGEvent> {
    return await apiClient.put<TRPGEvent>(`/events/${id}`, eventData);
  },

  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(`/events/${id}`);
  },

  async startEvent(id: string): Promise<TRPGEvent> {
    return await apiClient.post<TRPGEvent>(`/events/${id}/start`);
  },

  async completeEvent(id: string, outcomes: TRPGEvent['outcomes']): Promise<TRPGEvent> {
    return await apiClient.post<TRPGEvent>(`/events/${id}/complete`, { outcomes });
  },

  // Mock event creation for testing
  createMockEvent(campaignId: string): CreateEventRequest {
    const eventTypes = ['story', 'combat', 'social', 'exploration', 'puzzle', 'rest'] as const;
    const difficulties = ['trivial', 'easy', 'medium', 'hard', 'extreme'] as const;
    const locations = ['酒場', '森の奥', '古い遺跡', '山頂の洞窟', '王都の市場', '神殿'];
    
    const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    
    // Schedule event for some time in the next few days
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 7));
    
    return {
      title: this.getEventTitle(randomType),
      description: this.getEventDescription(randomType, randomLocation),
      type: randomType,
      campaignId,
      scheduledDate: scheduledDate.toISOString(),
      duration: this.getEventDuration(randomType),
      location: randomLocation,
      participants: [], // Will be filled with available characters
      difficulty: randomDifficulty,
      challengeRating: this.getChallengeRating(randomDifficulty),
    };
  },

  getEventTitle(type: string): string {
    const titles: Record<string, string[]> = {
      story: ['重要な出会い', '秘密の発見', '予期せぬ真実', '運命の分岐点'],
      combat: ['ゴブリンの襲撃', '盗賊団との戦い', '古代の守護者', 'ドラゴンとの対決'],
      social: ['貴族との交渉', '酒場での情報収集', '住民との関係構築', '外交会議'],
      exploration: ['未知の洞窟探索', '古い遺跡調査', '危険な森の踏破', '隠された宝物庫'],
      puzzle: ['古代の謎解き', '魔法の仕掛け', '暗号の解読', '機械装置の操作'],
      rest: ['安全な宿での休息', '野営地での回復', '温泉での癒し', '聖地での瞑想'],
    };
    
    const typeTitle = titles[type] || ['未知のイベント'];
    return typeTitle[Math.floor(Math.random() * typeTitle.length)];
  },

  getEventDescription(type: string, location: string): string {
    const descriptions: Record<string, string> = {
      story: `${location}で重要な物語の展開が待っています。キャラクターたちの選択が今後の展開に大きく影響するでしょう。`,
      combat: `${location}で敵との戦闘が発生します。戦術と連携が勝利の鍵となります。`,
      social: `${location}で重要な人物との交流があります。外交スキルと判断力が試されます。`,
      exploration: `${location}の探索が始まります。隠された秘密や危険が待ち受けているかもしれません。`,
      puzzle: `${location}で古代の謎や仕掛けに遭遇します。知恵と観察力で解決策を見つけましょう。`,
      rest: `${location}で安全に休息を取ることができます。体力と魔力の回復、そして次の冒険への準備を整えましょう。`,
    };
    
    return descriptions[type] || `${location}で何かが起こります...`;
  },

  getEventDuration(type: string): number {
    const durations: Record<string, number> = {
      story: 60,      // 1時間
      combat: 90,     // 1時間30分
      social: 45,     // 45分
      exploration: 120, // 2時間
      puzzle: 75,     // 1時間15分
      rest: 30,       // 30分
    };
    
    return durations[type] || 60;
  },

  getChallengeRating(difficulty: string): number {
    const ratings: Record<string, number> = {
      trivial: 0.5,
      easy: 1,
      medium: 3,
      hard: 5,
      extreme: 8,
    };
    
    return ratings[difficulty] || 1;
  }
};