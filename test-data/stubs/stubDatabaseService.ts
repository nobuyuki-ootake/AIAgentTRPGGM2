/**
 * スタブ: データベースサービスの最小限実装
 * t-WADA命名規則: stubDatabaseService.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: 統合テスト、データベース依存を持つコンポーネントのテスト
 */

import { 
  TRPGCampaign, 
  TRPGCharacter, 
  NPCCharacter, 
  EnemyCharacter,
  TRPGSession,
  TRPGEvent,
  Quest,
  Location,
  APIResponse,
  PaginatedResponse
} from '@ai-agent-trpg/types';

// ===================================
// インメモリデータストレージ
// ===================================

class InMemoryStorage {
  private campaigns: Map<string, TRPGCampaign> = new Map();
  private characters: Map<string, TRPGCharacter | NPCCharacter | EnemyCharacter> = new Map();
  private sessions: Map<string, TRPGSession> = new Map();
  private events: Map<string, TRPGEvent> = new Map();
  private quests: Map<string, Quest> = new Map();
  private locations: Map<string, Location> = new Map();

  // 基本的なCRUD操作
  set<T>(store: Map<string, T>, id: string, item: T): void {
    store.set(id, item);
  }

  get<T>(store: Map<string, T>, id: string): T | undefined {
    return store.get(id);
  }

  delete<T>(store: Map<string, T>, id: string): boolean {
    return store.delete(id);
  }

  list<T>(store: Map<string, T>): T[] {
    return Array.from(store.values());
  }

  clear(): void {
    this.campaigns.clear();
    this.characters.clear();
    this.sessions.clear();
    this.events.clear();
    this.quests.clear();
    this.locations.clear();
  }

  // ストア別アクセサ
  getCampaigns() { return this.campaigns; }
  getCharacters() { return this.characters; }
  getSessions() { return this.sessions; }
  getEvents() { return this.events; }
  getQuests() { return this.quests; }
  getLocations() { return this.locations; }
}

// ===================================
// データベーススタブクラス
// ===================================

export class StubDatabaseService {
  private storage = new InMemoryStorage();
  private isOnline: boolean = true;
  private operationDelay: number = 50; // ms
  private failureRate: number = 0; // 0-1の失敗率

  constructor(options?: {
    isOnline?: boolean;
    operationDelay?: number;
    failureRate?: number;
  }) {
    if (options) {
      this.isOnline = options.isOnline ?? true;
      this.operationDelay = options.operationDelay ?? 50;
      this.failureRate = options.failureRate ?? 0;
    }
  }

  // ===================================
  // キャンペーン操作
  // ===================================

  async createCampaign(campaign: Omit<TRPGCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<APIResponse<TRPGCampaign>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Database operation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('Database offline');
    }

    const newCampaign: TRPGCampaign = {
      ...campaign,
      id: `stub-campaign-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.storage.set(this.storage.getCampaigns(), newCampaign.id, newCampaign);
    return this.createSuccessResponse(newCampaign);
  }

  async getCampaign(id: string): Promise<APIResponse<TRPGCampaign | null>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Database operation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('Database offline');
    }

    const campaign = this.storage.get(this.storage.getCampaigns(), id);
    return this.createSuccessResponse(campaign || null);
  }

  async updateCampaign(id: string, updates: Partial<TRPGCampaign>): Promise<APIResponse<TRPGCampaign>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Database operation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('Database offline');
    }

    const existing = this.storage.get(this.storage.getCampaigns(), id);
    if (!existing) {
      return this.createErrorResponse('Campaign not found');
    }

    const updated: TRPGCampaign = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    this.storage.set(this.storage.getCampaigns(), id, updated);
    return this.createSuccessResponse(updated);
  }

  async deleteCampaign(id: string): Promise<APIResponse<boolean>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Database operation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('Database offline');
    }

    const deleted = this.storage.delete(this.storage.getCampaigns(), id);
    return this.createSuccessResponse(deleted);
  }

  async listCampaigns(options?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<APIResponse<PaginatedResponse<TRPGCampaign>>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Database operation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('Database offline');
    }

    let campaigns = this.storage.list(this.storage.getCampaigns());

    // フィルタリング
    if (options?.status) {
      campaigns = campaigns.filter(c => c.status === options.status);
    }

    // ページネーション
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = campaigns.slice(startIndex, endIndex);

    const response: PaginatedResponse<TRPGCampaign> = {
      items: paginatedItems,
      totalCount: campaigns.length,
      pageSize: limit,
      currentPage: page,
      totalPages: Math.ceil(campaigns.length / limit),
      hasNextPage: endIndex < campaigns.length,
      hasPreviousPage: page > 1
    };

    return this.createSuccessResponse(response);
  }

  // ===================================
  // キャラクター操作
  // ===================================

  async createCharacter(character: Omit<TRPGCharacter | NPCCharacter | EnemyCharacter, 'id' | 'createdAt' | 'updatedAt'>): Promise<APIResponse<TRPGCharacter | NPCCharacter | EnemyCharacter>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Database operation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('Database offline');
    }

    const newCharacter = {
      ...character,
      id: `stub-character-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as TRPGCharacter | NPCCharacter | EnemyCharacter;

    this.storage.set(this.storage.getCharacters(), newCharacter.id, newCharacter);
    return this.createSuccessResponse(newCharacter);
  }

  async getCharacter(id: string): Promise<APIResponse<TRPGCharacter | NPCCharacter | EnemyCharacter | null>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Database operation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('Database offline');
    }

    const character = this.storage.get(this.storage.getCharacters(), id);
    return this.createSuccessResponse(character || null);
  }

  async listCharactersByCampaign(campaignId: string): Promise<APIResponse<(TRPGCharacter | NPCCharacter | EnemyCharacter)[]>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Database operation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('Database offline');
    }

    const characters = this.storage.list(this.storage.getCharacters())
      .filter(c => c.campaignId === campaignId);

    return this.createSuccessResponse(characters);
  }

  // ===================================
  // セッション操作
  // ===================================

  async createSession(session: Omit<TRPGSession, 'id'>): Promise<APIResponse<TRPGSession>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Database operation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('Database offline');
    }

    const newSession: TRPGSession = {
      ...session,
      id: `stub-session-${Date.now()}`
    };

    this.storage.set(this.storage.getSessions(), newSession.id, newSession);
    return this.createSuccessResponse(newSession);
  }

  async getSession(id: string): Promise<APIResponse<TRPGSession | null>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Database operation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('Database offline');
    }

    const session = this.storage.get(this.storage.getSessions(), id);
    return this.createSuccessResponse(session || null);
  }

  async listSessionsByCampaign(campaignId: string): Promise<APIResponse<TRPGSession[]>> {
    await this.simulateDelay();
    
    if (this.shouldFail()) {
      return this.createErrorResponse('Database operation failed');
    }

    if (!this.isOnline) {
      return this.createErrorResponse('Database offline');
    }

    const sessions = this.storage.list(this.storage.getSessions())
      .filter(s => s.campaignId === campaignId);

    return this.createSuccessResponse(sessions);
  }

  // ===================================
  // ヘルパーメソッド
  // ===================================

  private async simulateDelay(): Promise<void> {
    if (this.operationDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.operationDelay));
    }
  }

  private shouldFail(): boolean {
    return Math.random() < this.failureRate;
  }

  private createSuccessResponse<T>(data: T): APIResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  private createErrorResponse(error: string): APIResponse<never> {
    return {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };
  }

  // ===================================
  // 設定変更・テスト用メソッド
  // ===================================

  setOnline(isOnline: boolean): void {
    this.isOnline = isOnline;
  }

  setOperationDelay(delay: number): void {
    this.operationDelay = delay;
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  // データベース状態の確認
  getStatus(): {
    isOnline: boolean;
    operationDelay: number;
    failureRate: number;
    recordCounts: {
      campaigns: number;
      characters: number;
      sessions: number;
      events: number;
      quests: number;
      locations: number;
    };
  } {
    return {
      isOnline: this.isOnline,
      operationDelay: this.operationDelay,
      failureRate: this.failureRate,
      recordCounts: {
        campaigns: this.storage.getCampaigns().size,
        characters: this.storage.getCharacters().size,
        sessions: this.storage.getSessions().size,
        events: this.storage.getEvents().size,
        quests: this.storage.getQuests().size,
        locations: this.storage.getLocations().size
      }
    };
  }

  // テストデータの初期化
  clearAllData(): void {
    this.storage.clear();
  }

  // テストデータの一括挿入
  seedTestData(data: {
    campaigns?: TRPGCampaign[];
    characters?: (TRPGCharacter | NPCCharacter | EnemyCharacter)[];
    sessions?: TRPGSession[];
    events?: TRPGEvent[];
    quests?: Quest[];
    locations?: Location[];
  }): void {
    if (data.campaigns) {
      data.campaigns.forEach(campaign => 
        this.storage.set(this.storage.getCampaigns(), campaign.id, campaign)
      );
    }
    if (data.characters) {
      data.characters.forEach(character => 
        this.storage.set(this.storage.getCharacters(), character.id, character)
      );
    }
    if (data.sessions) {
      data.sessions.forEach(session => 
        this.storage.set(this.storage.getSessions(), session.id, session)
      );
    }
    if (data.events) {
      data.events.forEach(event => 
        this.storage.set(this.storage.getEvents(), event.id, event)
      );
    }
    if (data.quests) {
      data.quests.forEach(quest => 
        this.storage.set(this.storage.getQuests(), quest.id, quest)
      );
    }
    if (data.locations) {
      data.locations.forEach(location => 
        this.storage.set(this.storage.getLocations(), location.id, location)
      );
    }
  }
}

// ===================================
// シングルトンインスタンス
// ===================================

export const stubDatabaseService = new StubDatabaseService();

// ===================================
// ファクトリ関数
// ===================================

export function createStubDatabaseService(options?: {
  isOnline?: boolean;
  operationDelay?: number;
  failureRate?: number;
}): StubDatabaseService {
  return new StubDatabaseService(options);
}

// 事前定義されたスタブサービス
export const stubDatabaseServiceOffline = new StubDatabaseService({ isOnline: false });
export const stubDatabaseServiceSlow = new StubDatabaseService({ operationDelay: 1000 });
export const stubDatabaseServiceUnreliable = new StubDatabaseService({ failureRate: 0.2 });