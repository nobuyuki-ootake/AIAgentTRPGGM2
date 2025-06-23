import { Quest, ID, APIResponse } from '@ai-agent-trpg/types';
import { apiClient } from './client';

/**
 * クエスト管理APIクライアント
 */
class QuestAPI {
  /**
   * キャンペーンのクエスト一覧を取得
   */
  async getQuestsByCampaign(campaignId: ID): Promise<Quest[]> {
    const response = await apiClient.get<APIResponse<Quest[]>>('/api/quests', {
      params: { campaignId },
    });
    if (!response.data) {
      throw new Error('No data received from API');
    }
    return response.data;
  }

  /**
   * クエスト詳細を取得
   */
  async getQuestById(questId: ID): Promise<Quest> {
    const response = await apiClient.get<APIResponse<Quest>>(`/api/quests/${questId}`);
    if (!response.data) {
      throw new Error('No data received from API');
    }
    return response.data;
  }

  /**
   * 新しいクエストを作成
   */
  async createQuest(questData: Partial<Quest>): Promise<Quest> {
    const response = await apiClient.post<APIResponse<Quest>>('/api/quests', questData);
    if (!response.data) {
      throw new Error('No data received from API');
    }
    return response.data;
  }

  /**
   * クエストを更新
   */
  async updateQuest(questId: ID, updates: Partial<Quest>): Promise<Quest> {
    const response = await apiClient.patch<APIResponse<Quest>>(`/api/quests/${questId}`, updates);
    if (!response.data) {
      throw new Error('No data received from API');
    }
    return response.data;
  }

  /**
   * クエストを削除
   */
  async deleteQuest(questId: ID): Promise<void> {
    await apiClient.delete(`/api/quests/${questId}`);
  }

  /**
   * クエストの目標を更新
   */
  async updateQuestObjective(
    questId: ID, 
    objectiveId: ID, 
    updates: { completed?: boolean; progress?: number },
  ): Promise<Quest> {
    const response = await apiClient.patch<APIResponse<Quest>>(
      `/api/quests/${questId}/objectives/${objectiveId}`,
      updates,
    );
    if (!response.data) {
      throw new Error('No data received from API');
    }
    return response.data;
  }

  /**
   * クエストのステータスを変更
   */
  async updateQuestStatus(
    questId: ID, 
    status: Quest['status'],
  ): Promise<Quest> {
    const response = await apiClient.patch<APIResponse<Quest>>(
      `/api/quests/${questId}/status`,
      { status },
    );
    if (!response.data) {
      throw new Error('No data received from API');
    }
    return response.data;
  }

  /**
   * クエストを開始
   */
  async startQuest(questId: ID): Promise<Quest> {
    return this.updateQuestStatus(questId, 'active');
  }

  /**
   * クエストを完了
   */
  async completeQuest(questId: ID): Promise<Quest> {
    const quest = await this.updateQuestStatus(questId, 'completed');
    
    // 完了時に報酬処理などの追加ロジックがある場合はここで実行
    // 例: 経験値付与、アイテム獲得など
    
    return quest;
  }

  /**
   * クエストを失敗
   */
  async failQuest(questId: ID): Promise<Quest> {
    return this.updateQuestStatus(questId, 'failed');
  }

  /**
   * 前提条件を満たしているクエストを取得
   */
  async getAvailableQuests(campaignId: ID, completedQuestIds: ID[]): Promise<Quest[]> {
    const response = await apiClient.get<APIResponse<Quest[]>>('/api/quests/available', {
      params: { 
        campaignId,
        completedQuests: completedQuestIds.join(','),
      },
    });
    if (!response.data) {
      throw new Error('No data received from API');
    }
    return response.data;
  }

  /**
   * 報酬を受け取る
   */
  async claimQuestRewards(questId: ID, characterId: ID): Promise<{
    experience: number;
    currency: number;
    items: string[];
    reputation: Record<string, number>;
  }> {
    const response = await apiClient.post<APIResponse<any>>(
      `/api/quests/${questId}/claim-rewards`,
      { characterId },
    );
    if (!response.data) {
      throw new Error('No data received from API');
    }
    return response.data;
  }

  /**
   * AIによるクエスト提案
   */
  async generateQuestSuggestions(campaignId: ID, context: {
    playerLevel: number;
    currentLocation?: string;
    recentEvents?: string[];
    preferences?: string[];
  }): Promise<Partial<Quest>[]> {
    const response = await apiClient.post<APIResponse<Partial<Quest>[]>>(
      '/api/quests/generate-suggestions',
      { campaignId, ...context },
    );
    if (!response.data) {
      throw new Error('No data received from API');
    }
    return response.data;
  }

  /**
   * クエスト進行をセッションと同期
   */
  async syncQuestProgress(sessionId: ID, questUpdates: Array<{
    questId: ID;
    objectiveId?: ID;
    progress?: number;
    completed?: boolean;
  }>): Promise<Quest[]> {
    const response = await apiClient.post<APIResponse<Quest[]>>(
      `/api/sessions/${sessionId}/quest-sync`,
      { questUpdates },
    );
    if (!response.data) {
      throw new Error('No data received from API');
    }
    return response.data;
  }
}

export const questAPI = new QuestAPI();