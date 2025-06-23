import { apiClient } from './client';
import { 
  TurnState, 
  TurnSettings, 
  GameDay,
  ID, 
} from '@ai-agent-trpg/types';

interface InitializeTurnStateRequest {
  sessionId: ID;
  campaignId: ID;
  settings?: Partial<TurnSettings>;
}

interface ExecuteActionRequest {
  characterId: ID;
  description: string;
  metadata?: Record<string, any>;
}

interface CreateGameDayRequest {
  sessionId?: ID;
  dayNumber?: number;
}

interface ActionResult {
  success: boolean;
  actionsRemaining: number;
  message: string;
}

interface TimeAdvanceResult {
  newDayPeriod: number; // 新しい用語に更新
  newDay?: number;
  message: string;
}

interface RestResult {
  success: boolean;
  message: string;
}

interface CampaignEndCheck {
  isEnded: boolean;
  reason?: string;
}

interface CampaignTimeStatus {
  turnState: TurnState | null;
  currentDay: GameDay | null;
  endCheck: CampaignEndCheck;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const timeManagementAPI = {
  
  // セッションベースの新しいAPI（SessionInterfaceで使用）
  
  /**
   * セッションのターン状態を取得（新API）
   */
  async getSessionTurnState(sessionId: ID): Promise<TurnState | null> {
    return await apiClient.get<TurnState | null>(
      `/sessions/${sessionId}/time-management/turn-state`,
    );
  },

  /**
   * セッションの現在の日を取得（新API）
   */
  async getSessionCurrentDay(sessionId: ID): Promise<GameDay | null> {
    return await apiClient.get<GameDay | null>(
      `/sessions/${sessionId}/time-management/current-day`,
    );
  },

  /**
   * セッションでアクションを実行（新API）
   */
  async executeSessionAction(sessionId: ID, request: ExecuteActionRequest): Promise<ActionResult> {
    return await apiClient.post<ActionResult>(
      `/sessions/${sessionId}/time-management/action`,
      request,
    );
  },

  /**
   * セッションで時間を進行（新API）
   */
  async advanceSessionTime(sessionId: ID): Promise<TimeAdvanceResult> {
    return await apiClient.post<TimeAdvanceResult>(
      `/sessions/${sessionId}/time-management/advance`,
      {},
    );
  },

  /**
   * セッションで休息を取る（新API）
   */
  async takeSessionRest(sessionId: ID): Promise<RestResult> {
    return await apiClient.post<RestResult>(
      `/sessions/${sessionId}/time-management/rest`,
      {},
    );
  },

  // 以下は既存のキャンペーンベースAPI（後方互換性のために残す）
  /**
   * セッションのターン状態を初期化
   */
  async initializeTurnState(request: InitializeTurnStateRequest): Promise<TurnState> {
    const response = await apiClient.post<ApiResponse<TurnState>>(
      '/time-management/initialize',
      request,
    );
    return response.data;
  },

  /**
   * セッションのターン状態を取得
   */
  async getTurnState(sessionId: ID): Promise<TurnState> {
    const response = await apiClient.get<ApiResponse<TurnState>>(
      `/time-management/session/${sessionId}`,
    );
    return response.data;
  },

  /**
   * セッションのターン状態を更新
   */
  async updateTurnState(sessionId: ID, updates: Partial<TurnState>): Promise<TurnState> {
    const response = await apiClient.put<ApiResponse<TurnState>>(
      `/time-management/session/${sessionId}`,
      updates,
    );
    return response.data;
  },

  /**
   * キャンペーンの現在の日を取得
   */
  async getCurrentDay(campaignId: ID): Promise<GameDay | null> {
    const response = await apiClient.get<ApiResponse<GameDay | null>>(
      `/time-management/campaign/${campaignId}/current-day`,
    );
    return response.data;
  },

  /**
   * 特定の日の情報を取得
   */
  async getGameDay(campaignId: ID, dayNumber: number): Promise<GameDay> {
    const response = await apiClient.get<ApiResponse<GameDay>>(
      `/time-management/campaign/${campaignId}/day/${dayNumber}`,
    );
    return response.data;
  },

  /**
   * アクションを実行
   */
  async executeAction(campaignId: ID, request: ExecuteActionRequest): Promise<ActionResult> {
    const response = await apiClient.post<ApiResponse<ActionResult>>(
      `/time-management/campaign/${campaignId}/action`,
      request,
    );
    return response.data;
  },

  /**
   * 時間を進行
   */
  async advanceTime(campaignId: ID): Promise<TimeAdvanceResult> {
    const response = await apiClient.post<ApiResponse<TimeAdvanceResult>>(
      `/time-management/campaign/${campaignId}/advance-time`,
      {},
    );
    return response.data;
  },

  /**
   * 休息を取る
   */
  async takeRest(campaignId: ID): Promise<RestResult> {
    const response = await apiClient.post<ApiResponse<RestResult>>(
      `/time-management/campaign/${campaignId}/rest`,
      {},
    );
    return response.data;
  },

  /**
   * キャンペーンの時間管理状況を取得
   */
  async getCampaignTimeStatus(campaignId: ID): Promise<CampaignTimeStatus> {
    const response = await apiClient.get<ApiResponse<CampaignTimeStatus>>(
      `/time-management/campaign/${campaignId}/status`,
    );
    return response.data;
  },

  /**
   * 新しい日を作成
   */
  async createGameDay(campaignId: ID, request: CreateGameDayRequest = {}): Promise<GameDay> {
    const response = await apiClient.post<ApiResponse<GameDay>>(
      `/time-management/campaign/${campaignId}/create-day`,
      request,
    );
    return response.data;
  },

  /**
   * ターンを次のキャラクターに進める（便利メソッド）
   */
  async nextTurn(sessionId: ID): Promise<TurnState> {
    const currentState = await this.getTurnState(sessionId);
    const currentIndex = currentState.turnOrder.findIndex(id => id === currentState.activeCharacterId);
    const nextIndex = (currentIndex + 1) % currentState.turnOrder.length;
    const nextCharacterId = currentState.turnOrder[nextIndex];

    return this.updateTurnState(sessionId, {
      activeCharacterId: nextCharacterId,
      phaseStartTime: new Date().toISOString(),
    });
  },

  /**
   * フェーズを変更（便利メソッド）
   */
  async changePhase(sessionId: ID, phase: TurnState['currentPhase']): Promise<TurnState> {
    return this.updateTurnState(sessionId, {
      currentPhase: phase,
      phaseStartTime: new Date().toISOString(),
    });
  },

  /**
   * ターン順序を設定（便利メソッド）
   */
  async setTurnOrder(sessionId: ID, turnOrder: ID[]): Promise<TurnState> {
    return this.updateTurnState(sessionId, {
      turnOrder,
      activeCharacterId: turnOrder[0],
    });
  },

  /**
   * 日を完了させる（便利メソッド）
   */
  async completeDay(campaignId: ID): Promise<TimeAdvanceResult> {
    // 時間を進めて日を完了
    let result = await this.advanceTime(campaignId);
    
    // 時間スロットが残っている場合は日が完了するまで進める
    while (result.newDay === undefined) {
      result = await this.advanceTime(campaignId);
    }
    
    return result;
  },

  /**
   * 特定のキャラクターのアクションを実行（便利メソッド）
   */
  async executeCharacterAction(
    campaignId: ID,
    characterId: ID,
    actionType: 'explore' | 'investigate' | 'social' | 'rest' | 'custom',
    description: string,
    metadata: Record<string, any> = {},
  ): Promise<ActionResult> {
    return this.executeAction(campaignId, {
      characterId,
      description,
      metadata: {
        actionType,
        ...metadata,
      },
    });
  },
};

// Export types for convenience
export type {
  InitializeTurnStateRequest,
  ExecuteActionRequest,
  CreateGameDayRequest,
  ActionResult,
  TimeAdvanceResult,
  RestResult,
  CampaignEndCheck,
  CampaignTimeStatus,
};