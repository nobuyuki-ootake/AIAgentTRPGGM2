import { 
  ID,
  SessionContext
} from '@ai-agent-trpg/types';
import { apiClient } from './client';

export interface MaskedProgressInfo {
  overallProgress: number; // 0-100 (曖昧な値)
  storyPhase: 'beginning' | 'development' | 'climax' | 'resolution';
  ambiguousHints: string[];
  recentAchievements: string[];
  upcomingChallenges: string[];
  mood: 'exciting' | 'mysterious' | 'challenging' | 'peaceful';
}

export interface SubtleHint {
  id: ID;
  type: 'direction' | 'warning' | 'opportunity' | 'lore';
  content: string;
  priority: 'low' | 'medium' | 'high';
  context?: string;
}

export interface NaturalGuidanceRequest {
  sessionContext: SessionContext;
  playerAction?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export const playerExperienceAPI = {
  /**
   * プレイヤー用のマスクされた進捗情報を取得
   */
  async getMaskedProgress(sessionId: ID): Promise<MaskedProgressInfo> {
    console.log('🎭 Fetching masked progress for player', { sessionId });
    
    const response = await apiClient.get<MaskedProgressInfo>(
      `/player-experience/session/${sessionId}/masked-progress`
    );
    
    console.log('✅ Masked progress fetched successfully', {
      sessionId,
      storyPhase: response.storyPhase,
      hintsCount: response.ambiguousHints.length
    });
    
    return response;
  },

  /**
   * サブトルヒントを取得
   */
  async getSubtleHints(sessionId: ID, contextType?: string): Promise<SubtleHint[]> {
    console.log('💡 Fetching subtle hints', { sessionId, contextType });
    
    const params = new URLSearchParams();
    if (contextType) {
      params.append('context', contextType);
    }
    
    const url = `/player-experience/session/${sessionId}/subtle-hints${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await apiClient.get<SubtleHint[]>(url);
    
    console.log('✅ Subtle hints fetched successfully', {
      sessionId,
      hintsCount: response.length,
      highPriorityCount: response.filter(h => h.priority === 'high').length
    });
    
    return response;
  },

  /**
   * 自然な誘導メッセージを生成
   */
  async generateNaturalGuidance(request: NaturalGuidanceRequest): Promise<{
    guidance: string;
    suggestedActions: string[];
    tone: 'encouraging' | 'cautionary' | 'neutral' | 'mysterious';
  }> {
    console.log('🧭 Generating natural guidance', { 
      sessionId: request.sessionContext.sessionId,
      hasPlayerAction: !!request.playerAction
    });
    
    const response = await apiClient.post<{
      guidance: string;
      suggestedActions: string[];
      tone: 'encouraging' | 'cautionary' | 'neutral' | 'mysterious';
    }>(
      '/player-experience/generate-guidance',
      request
    );
    
    console.log('✅ Natural guidance generated', {
      tone: response.tone,
      actionsCount: response.suggestedActions.length
    });
    
    return response;
  },

  /**
   * 曖昧な報酬メッセージを生成
   */
  async generateAmbiguousRewardMessage(rewardData: {
    type: 'experience' | 'item' | 'story' | 'relationship';
    amount?: number;
    description?: string;
  }): Promise<{
    message: string;
    playerVisibleDescription: string;
  }> {
    console.log('🎁 Generating ambiguous reward message', { rewardType: rewardData.type });
    
    const response = await apiClient.post<{
      message: string;
      playerVisibleDescription: string;
    }>(
      '/player-experience/generate-reward-message',
      rewardData
    );
    
    console.log('✅ Ambiguous reward message generated', {
      rewardType: rewardData.type
    });
    
    return response;
  },

  /**
   * プレイヤー可視コンテンツをフィルタリング
   */
  async filterPlayerVisibleContent(content: {
    milestones?: any[];
    entities?: any[];
    gameState?: any;
  }): Promise<{
    filteredContent: any;
    hiddenElementsCount: number;
  }> {
    console.log('🔍 Filtering content for player visibility');
    
    const response = await apiClient.post<{
      filteredContent: any;
      hiddenElementsCount: number;
    }>(
      '/player-experience/filter-content',
      content
    );
    
    console.log('✅ Content filtered for player', {
      hiddenElements: response.hiddenElementsCount
    });
    
    return response;
  },

  /**
   * ヘルスチェック
   */
  async checkHealth(): Promise<boolean> {
    try {
      await apiClient.get<any>(
        '/player-experience/health'
      );
      
      return true;
    } catch (error) {
      console.error('❌ Player experience service health check failed', error);
      return false;
    }
  }
};

export default playerExperienceAPI;