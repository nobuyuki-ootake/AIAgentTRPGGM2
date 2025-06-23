import { apiClient } from './client';
import { 
  Milestone, 
  ProgressTracker, 
  LevelUpEvent, 
  CampaignCompletion, 
  ID, 
} from '@ai-agent-trpg/types';

interface CreateMilestoneRequest {
  campaignId: ID;
  title: string;
  description: string;
  category?: Milestone['category'];
  importance?: Milestone['importance'];
  requirements?: Milestone['requirements'];
  rewards?: Milestone['rewards'];
  estimatedTime?: number;
  dependencies?: ID[];
  tags?: string[];
}

interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
  category?: Milestone['category'];
  status?: Milestone['status'];
  importance?: Milestone['importance'];
  progress?: number;
  requirements?: Milestone['requirements'];
  rewards?: Milestone['rewards'];
  estimatedTime?: number;
  dependencies?: ID[];
  tags?: string[];
  completedAt?: string;
}

interface CompleteCampaignRequest {
  completionType: 'success' | 'failure' | 'abandoned';
  completionNotes?: string;
}


export const milestoneAPI = {
  /**
   * キャンペーンのマイルストーン一覧を取得
   */
  async getMilestonesByCampaign(campaignId: ID): Promise<Milestone[]> {
    const response = await apiClient.get<Milestone[]>(
      `/milestones/campaign/${campaignId}`,
    );
    return response;
  },

  /**
   * 特定のマイルストーンを取得
   */
  async getMilestoneById(milestoneId: ID): Promise<Milestone> {
    const response = await apiClient.get<Milestone>(
      `/milestones/${milestoneId}`,
    );
    return response;
  },

  /**
   * 新しいマイルストーンを作成
   */
  async createMilestone(request: CreateMilestoneRequest): Promise<Milestone> {
    const response = await apiClient.post<Milestone>(
      '/milestones',
      request,
    );
    return response;
  },

  /**
   * マイルストーンを更新
   */
  async updateMilestone(milestoneId: ID, updates: UpdateMilestoneRequest): Promise<Milestone> {
    const response = await apiClient.put<Milestone>(
      `/milestones/${milestoneId}`,
      updates,
    );
    return response;
  },

  /**
   * マイルストーンを削除
   */
  async deleteMilestone(milestoneId: ID): Promise<void> {
    await apiClient.delete<void>(`/milestones/${milestoneId}`);
  },

  /**
   * キャンペーンの進捗トラッカーを取得
   */
  async getProgressTracker(campaignId: ID): Promise<ProgressTracker> {
    const response = await apiClient.get<ProgressTracker>(
      `/milestones/progress/${campaignId}`,
    );
    return response;
  },

  /**
   * キャンペーンのレベルアップイベントを取得
   */
  async getLevelUpEvents(campaignId: ID): Promise<LevelUpEvent[]> {
    const response = await apiClient.get<LevelUpEvent[]>(
      `/milestones/levelups/${campaignId}`,
    );
    return response;
  },

  /**
   * キャンペーンの完了状況を取得
   */
  async getCampaignCompletion(campaignId: ID): Promise<CampaignCompletion | null> {
    const response = await apiClient.get<CampaignCompletion | null>(
      `/milestones/completion/${campaignId}`,
    );
    return response;
  },

  /**
   * キャンペーンを完了させる
   */
  async completeCampaign(campaignId: ID, request: CompleteCampaignRequest): Promise<CampaignCompletion> {
    const response = await apiClient.post<CampaignCompletion>(
      `/milestones/complete-campaign/${campaignId}`,
      request,
    );
    return response;
  },

  /**
   * マイルストーンの進捗を更新（便利メソッド）
   */
  async updateProgress(milestoneId: ID, progress: number): Promise<Milestone> {
    return this.updateMilestone(milestoneId, { progress });
  },

  /**
   * マイルストーンを完了させる（便利メソッド）
   */
  async completeMilestone(milestoneId: ID): Promise<Milestone> {
    return this.updateMilestone(milestoneId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
    });
  },

  /**
   * マイルストーンを開始する（便利メソッド）
   */
  async startMilestone(milestoneId: ID): Promise<Milestone> {
    return this.updateMilestone(milestoneId, {
      status: 'in_progress',
    });
  },

  /**
   * マイルストーンを失敗させる（便利メソッド）
   */
  async failMilestone(milestoneId: ID): Promise<Milestone> {
    return this.updateMilestone(milestoneId, {
      status: 'failed',
    });
  },

  /**
   * マイルストーンをスキップする（便利メソッド）
   */
  async skipMilestone(milestoneId: ID): Promise<Milestone> {
    return this.updateMilestone(milestoneId, {
      status: 'skipped',
    });
  },
};

// Export types for convenience
export type {
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  CompleteCampaignRequest,
};