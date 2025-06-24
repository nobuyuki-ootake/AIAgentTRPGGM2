import { 
  MilestoneGenerationRequest,
  MilestoneGenerationResponse,
  AIMilestone,
  EntityPool,
  ID
} from '@ai-agent-trpg/types';
import { apiClient } from './client';

export interface MilestoneProgressUpdate {
  progress: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

export const aiMilestoneGenerationAPI = {
  /**
   * セッション開始時のマイルストーン・プール生成
   */
  async generateMilestonesAndPools(request: MilestoneGenerationRequest): Promise<MilestoneGenerationResponse> {
    console.log('🎯 Generating AI milestones and pools', request);
    
    const response = await apiClient.post<MilestoneGenerationResponse>(
      '/ai-milestone-generation/generate',
      request,
      { timeout: 180000 } // 3分タイムアウト（AI生成処理用）
    );
    
    console.log('✅ AI milestones and pools generated successfully', {
      milestonesCount: response.milestones.length,
      entitiesCount: {
        enemies: response.entityPool.entities.enemies.length,
        events: response.entityPool.entities.events.length,
        npcs: response.entityPool.entities.npcs.length,
        items: response.entityPool.entities.items.length,
        quests: response.entityPool.entities.quests.length
      }
    });
    
    return response;
  },

  /**
   * キャンペーンのAIマイルストーン一覧取得
   */
  async getAIMilestonesByCampaign(campaignId: ID): Promise<AIMilestone[]> {
    console.log('📋 Fetching AI milestones for campaign', { campaignId });
    
    const response = await apiClient.get<AIMilestone[]>(
      `/ai-milestone-generation/campaign/${campaignId}/milestones`
    );
    
    console.log('✅ AI milestones fetched successfully', {
      campaignId,
      milestonesCount: response.length
    });
    
    return response;
  },

  /**
   * セッションのエンティティプール取得
   */
  async getEntityPoolBySession(sessionId: ID): Promise<EntityPool> {
    console.log('🎲 Fetching entity pool for session', { sessionId });
    
    const response = await apiClient.get<EntityPool>(
      `/ai-milestone-generation/session/${sessionId}/entity-pool`
    );
    
    console.log('✅ Entity pool fetched successfully', {
      sessionId,
      entityCounts: {
        enemies: response.entities.enemies.length,
        events: response.entities.events.length,
        npcs: response.entities.npcs.length,
        items: response.entities.items.length,
        quests: response.entities.quests.length
      }
    });
    
    return response;
  },

  /**
   * マイルストーン進捗更新
   */
  async updateMilestoneProgress(milestoneId: ID, update: MilestoneProgressUpdate): Promise<void> {
    console.log('📈 Updating milestone progress', { milestoneId, update });
    
    await apiClient.patch<any>(
      `/ai-milestone-generation/milestone/${milestoneId}/progress`,
      update
    );
    
    console.log('✅ Milestone progress updated successfully', {
      milestoneId,
      newProgress: update.progress,
      newStatus: update.status
    });
  },

  /**
   * マイルストーン削除
   */
  async deleteAIMilestone(milestoneId: ID): Promise<void> {
    console.log('🗑️ Deleting AI milestone', { milestoneId });
    
    await apiClient.delete<any>(
      `/ai-milestone-generation/milestone/${milestoneId}`
    );
    
    console.log('✅ AI milestone deleted successfully', { milestoneId });
  },

  /**
   * セッションのマイルストーン・プール再生成
   */
  async regenerateMilestonesAndPools(
    sessionId: ID, 
    request: Omit<MilestoneGenerationRequest, 'sessionId'>
  ): Promise<MilestoneGenerationResponse> {
    console.log('🔄 Regenerating AI milestones and pools', { sessionId, request });
    
    const response = await apiClient.post<MilestoneGenerationResponse>(
      `/ai-milestone-generation/regenerate/${sessionId}`,
      request,
      { timeout: 180000 } // 3分タイムアウト（AI生成処理用）
    );
    
    console.log('✅ AI milestones and pools regenerated successfully', {
      sessionId,
      milestonesCount: response.milestones.length,
      processingTime: response.generationMetadata.processingTime
    });
    
    return response;
  },

  /**
   * ヘルスチェック
   */
  async checkHealth(): Promise<boolean> {
    try {
      await apiClient.get<any>(
        '/ai-milestone-generation/health'
      );
      
      return true;
    } catch (error) {
      console.error('❌ AI milestone generation service health check failed', error);
      return false;
    }
  }
};

export default aiMilestoneGenerationAPI;