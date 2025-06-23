import { 
  AIAction, 
  AISessionController, 
  AIDecisionContext,
  ID, 
} from '@ai-agent-trpg/types';
import { apiClient } from './client';

export interface AISessionSettings {
  aiAutomationLevel?: 'minimal' | 'moderate' | 'extensive';
  gmInterventionMode?: 'reactive' | 'proactive' | 'hands_off';
  pacingControl?: boolean;
  narrativeAssistance?: boolean;
}

export interface AICharacterSettings {
  enabled?: boolean;
  autonomyLevel?: 'manual' | 'assisted' | 'autonomous';
  interventionThreshold?: number;
  responseDelay?: number;
  randomness?: number;
}

export interface AIProgressSettings {
  eventAutoTrigger?: boolean;
  npcAutoResponse?: boolean;
  combatAutoResolution?: boolean;
  storyProgression?: boolean;
}

export const aiCharacterAPI = {
  // ==========================================
  // セッション制御
  // ==========================================

  /**
   * セッション用AI制御を開始
   */
  async startSessionAIControl(
    sessionId: ID, 
    aiSettings?: AISessionSettings,
  ): Promise<AISessionController> {
    return await apiClient.post<AISessionController>(
      `/ai-characters/sessions/${sessionId}/start`,
      { aiSettings },
    );
  },

  /**
   * セッション用AI制御を停止
   */
  async stopSessionAIControl(sessionId: ID): Promise<{ success: boolean }> {
    return await apiClient.post<{ success: boolean }>(
      `/ai-characters/sessions/${sessionId}/stop`,
    );
  },

  /**
   * セッションのAI制御状況を取得
   */
  async getSessionAIStatus(sessionId: ID): Promise<{
    sessionId: ID;
    aiControlActive: boolean;
    controlledCharacters: ID[];
    recentActions: AIAction[];
    performance: {
      actionsPerMinute: number;
      averageResponseTime: number;
    };
  }> {
    return await apiClient.get<any>(`/ai-characters/sessions/${sessionId}/status`);
  },

  // ==========================================
  // キャラクター制御
  // ==========================================

  /**
   * キャラクターの自動行動をトリガー
   */
  async triggerCharacterAction(
    characterId: ID,
    sessionId: ID,
    context?: Partial<AIDecisionContext>,
  ): Promise<AIAction | null> {
    return await apiClient.post<AIAction | null>(
      `/ai-characters/characters/${characterId}/trigger-action`,
      { sessionId, context },
    );
  },

  /**
   * AI行動を実行
   */
  async executeAIAction(actionId: ID): Promise<{ success: boolean }> {
    return await apiClient.post<{ success: boolean }>(
      `/ai-characters/actions/${actionId}/execute`,
    );
  },

  /**
   * AI行動にフィードバックを送信
   */
  async sendActionFeedback(
    actionId: ID,
    rating: number,
    comment?: string,
  ): Promise<{ success: boolean }> {
    return await apiClient.post<{ success: boolean }>(
      `/ai-characters/actions/${actionId}/feedback`,
      { rating, comment },
    );
  },

  /**
   * キャラクターの制御設定を更新
   */
  async updateCharacterSettings(
    characterId: ID,
    settings: AICharacterSettings,
  ): Promise<AICharacterSettings & { characterId: ID; updatedAt: string }> {
    return await apiClient.put<any>(
      `/ai-characters/characters/${characterId}/settings`,
      { settings },
    );
  },

  // ==========================================
  // 自動進行制御
  // ==========================================

  /**
   * セッション自動進行を開始
   */
  async startAutoProgress(
    sessionId: ID,
    progressSettings?: AIProgressSettings,
  ): Promise<{
    sessionId: ID;
    enabled: boolean;
    settings: AIProgressSettings;
    startedAt: string;
  }> {
    return await apiClient.post<any>(
      `/ai-characters/sessions/${sessionId}/auto-progress`,
      { progressSettings },
    );
  },

  /**
   * 緊急停止（すべてのAI行動を停止）
   */
  async emergencyStop(sessionId?: ID): Promise<{ success: boolean; message: string }> {
    return await apiClient.post<{ success: boolean; message: string }>(
      '/ai-characters/emergency-stop',
      { sessionId },
    );
  },

  // ==========================================
  // デバッグ・開発者向け
  // ==========================================

  /**
   * AIキャラクターのデバッグ情報を取得
   */
  async getCharacterDebugInfo(characterId: ID): Promise<{
    characterId: ID;
    controllerActive: boolean;
    recentDecisions: AIAction[];
    behaviorPatterns: string[];
    learningData: Record<string, any>;
    performanceMetrics: Record<string, any>;
  }> {
    return await apiClient.get<any>(`/ai-characters/debug/characters/${characterId}`);
  },

  /**
   * AI行動のシミュレーション実行
   */
  async simulateAction(
    characterId: ID,
    sessionId: ID,
    testContext: Partial<AIDecisionContext>,
  ): Promise<AIAction | null> {
    return await apiClient.post<AIAction | null>(
      '/ai-characters/debug/simulate-action',
      { characterId, sessionId, testContext },
    );
  },

  // ==========================================
  // ユーティリティ
  // ==========================================

  /**
   * 複数キャラクターの同時制御
   */
  async triggerMultipleCharacterActions(
    requests: Array<{
      characterId: ID;
      sessionId: ID;
      context?: Partial<AIDecisionContext>;
    }>,
  ): Promise<Array<{ characterId: ID; action: AIAction | null; error?: string }>> {
    const results = await Promise.allSettled(
      requests.map(async (req) => ({
        characterId: req.characterId,
        action: await this.triggerCharacterAction(req.characterId, req.sessionId, req.context),
      })),
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          characterId: requests[index].characterId,
          action: null,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
  },

  /**
   * セッション中の全AI制御キャラクターを一括制御
   */
  async controlAllAICharacters(
    sessionId: ID,
    context: Partial<AIDecisionContext>,
  ): Promise<Array<{ characterId: ID; action: AIAction | null; error?: string }>> {
    try {
      // セッション状況を取得
      const status = await this.getSessionAIStatus(sessionId);
      
      // AI制御されているキャラクターに対して行動を実行
      const requests = status.controlledCharacters.map(characterId => ({
        characterId,
        sessionId,
        context,
      }));

      return await this.triggerMultipleCharacterActions(requests);
    } catch (error) {
      console.error('Failed to control all AI characters:', error);
      return [];
    }
  },

  /**
   * AIキャラクター制御の有効/無効を切り替え
   */
  async toggleCharacterAI(
    characterId: ID,
    enabled: boolean,
  ): Promise<{ success: boolean }> {
    try {
      await this.updateCharacterSettings(characterId, { enabled });
      return { success: true };
    } catch (error) {
      console.error(`Failed to toggle AI for character ${characterId}:`, error);
      return { success: false };
    }
  },

  /**
   * セッション全体のAI自動化レベルを調整
   */
  async setSessionAutomationLevel(
    sessionId: ID,
    level: 'minimal' | 'moderate' | 'extensive',
  ): Promise<{ success: boolean }> {
    try {
      await this.stopSessionAIControl(sessionId);
      await this.startSessionAIControl(sessionId, { aiAutomationLevel: level });
      return { success: true };
    } catch (error) {
      console.error(`Failed to set automation level for session ${sessionId}:`, error);
      return { success: false };
    }
  },
};