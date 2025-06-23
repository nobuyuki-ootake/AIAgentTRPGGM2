import { TRPGCampaign, PaginatedResponse } from '@ai-agent-trpg/types';
import { apiClient } from './client';

interface CampaignFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

class CampaignAPI {
  // キャンペーン一覧取得
  async getCampaigns(filters?: CampaignFilters): Promise<PaginatedResponse<TRPGCampaign>> {
    const params = new URLSearchParams();
    
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    
    return apiClient.get<PaginatedResponse<TRPGCampaign>>(
      `/campaigns${params.toString() ? `?${params.toString()}` : ''}`,
    );
  }

  // キャンペーン詳細取得
  async getCampaignById(id: string): Promise<TRPGCampaign> {
    return apiClient.get<TRPGCampaign>(`/campaigns/${id}`);
  }

  // キャンペーン作成
  async createCampaign(campaignData: Partial<TRPGCampaign>): Promise<TRPGCampaign> {
    return apiClient.post<TRPGCampaign>('/campaigns', campaignData);
  }

  // キャンペーン更新
  async updateCampaign(id: string, updateData: Partial<TRPGCampaign>): Promise<TRPGCampaign> {
    return apiClient.put<TRPGCampaign>(`/campaigns/${id}`, updateData);
  }

  // キャンペーン削除
  async deleteCampaign(id: string): Promise<void> {
    await apiClient.delete(`/campaigns/${id}`);
  }

  // キャンペーンステータス更新
  async updateCampaignStatus(id: string, status: string): Promise<TRPGCampaign> {
    return apiClient.patch<TRPGCampaign>(`/campaigns/${id}/status`, { status });
  }

  // モックキャンペーン作成（開発用）
  createMockCampaign(): Partial<TRPGCampaign> {
    return {
      name: 'テストキャンペーン',
      description: 'セッション機能テスト用のキャンペーンです',
      settings: {
        gameSystem: 'D&D 5e',
        theme: 'ファンタジー',
        setting: '中世風異世界',
        world: {
          name: 'テストワールド',
          description: '勇者と魔王が存在する典型的なファンタジー世界',
          technologyLevel: 'medieval',
          magicLevel: 'high',
          scale: 'regional',
          tone: 'serious',
        },
        players: {
          expectedCount: 4,
          experienceLevel: 'beginner',
          playStyle: 'balanced',
          sessionLength: 240,
          frequency: 'weekly',
        },
        rules: {
          allowMulticlassing: true,
          allowOptionalRules: true,
          deathSaves: true,
          criticalHitRules: 'Standard',
          restVariant: 'standard',
          experienceType: 'milestone',
        },
        ai: {
          assistanceLevel: 'moderate',
          autoGenerateNPCs: true,
          autoGenerateEvents: true,
          dynamicDifficulty: true,
          preferredProviders: ['openai'],
        },
      },
      status: 'active',
      goals: {
        mainQuest: '魔王を倒して世界を救う',
        subQuests: ['仲間を集める', '伝説の武器を見つける', '各地の問題を解決する'],
        characterGoals: {},
        storyArcs: [
          {
            name: '序章：冒険の始まり',
            description: '冒険者として旅立ち、最初の仲間と出会う',
            status: 'active',
            estimatedSessions: 3,
          },
        ],
      },
    };
  }
}

export const campaignAPI = new CampaignAPI();