// ==========================================
// 探索アクション・エンティティ発見API クライアント
// ==========================================

import {
  EntityExplorationAction,
  ExplorationActionExecution,
  ExplorationFlowState,
  StartExplorationActionRequest,
  StartExplorationActionResponse,
  ProvideUserInputRequest,
  ProvideUserInputResponse,
  ExecuteSkillCheckRequest,
  ExecuteSkillCheckResponse,
  GetLocationEntitiesRequest,
  GetLocationEntitiesResponse,
  GetExplorationFlowStateRequest,
  GetExplorationFlowStateResponse,
  ExplorationActionType,
  SkillCheckType
} from '@repo/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';

// ==========================================
// 場所のエンティティ取得
// ==========================================

export async function getLocationEntities(request: GetLocationEntitiesRequest): Promise<GetLocationEntitiesResponse> {
  try {
    const params = new URLSearchParams();
    if (request.includeDiscovered) params.append('includeDiscovered', 'true');
    if (request.includeHidden) params.append('includeHidden', 'true');

    const response = await fetch(
      `${API_BASE_URL}/api/exploration/entities/${request.sessionId}/${request.locationId}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get location entities:', error);
    return {
      success: false,
      entities: [],
      totalCount: 0,
      error: error instanceof Error ? error.message : 'エンティティの取得に失敗しました'
    };
  }
}

// ==========================================
// 探索アクション開始
// ==========================================

export async function startExplorationAction(request: StartExplorationActionRequest): Promise<StartExplorationActionResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exploration/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to start exploration action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '探索アクションの開始に失敗しました'
    };
  }
}

// ==========================================
// ユーザー入力提供
// ==========================================

export async function provideUserInput(request: ProvideUserInputRequest): Promise<ProvideUserInputResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exploration/user-input`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to provide user input:', error);
    return {
      success: false,
      judgmentTriggered: false,
      error: error instanceof Error ? error.message : 'ユーザー入力の処理に失敗しました'
    };
  }
}

// ==========================================
// スキルチェック実行
// ==========================================

export async function executeSkillCheck(request: ExecuteSkillCheckRequest): Promise<ExecuteSkillCheckResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exploration/skill-check`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to execute skill check:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'スキルチェックの実行に失敗しました'
    };
  }
}

// ==========================================
// 探索フロー状態取得
// ==========================================

export async function getExplorationFlowState(request: GetExplorationFlowStateRequest): Promise<GetExplorationFlowStateResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exploration/flow-state/${request.sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get exploration flow state:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '探索フロー状態の取得に失敗しました'
    };
  }
}

// ==========================================
// 新しいエンティティ生成（開発・テスト用）
// ==========================================

export async function generateTestEntity(
  sessionId: string,
  locationId: string,
  entityName: string,
  entityType: 'object' | 'npc' | 'location_feature' | 'hazard' | 'treasure'
): Promise<{
  success: boolean;
  entity?: EntityExplorationAction;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exploration/generate-entity`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          locationId,
          entityName,
          entityType
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to generate test entity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'エンティティの生成に失敗しました'
    };
  }
}

// ==========================================
// アクティブな探索アクション取得
// ==========================================

export async function getActiveExplorations(sessionId: string): Promise<{
  success: boolean;
  activeExplorations: ExplorationActionExecution[];
  pendingInputs: any[];
  totalCount: number;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exploration/active/${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get active explorations:', error);
    return {
      success: false,
      activeExplorations: [],
      pendingInputs: [],
      totalCount: 0,
      error: error instanceof Error ? error.message : 'アクティブな探索の取得に失敗しました'
    };
  }
}

// ==========================================
// 探索履歴取得
// ==========================================

export async function getExplorationHistory(
  sessionId: string,
  characterId?: string,
  limit?: number
): Promise<{
  success: boolean;
  history: ExplorationActionExecution[];
  totalCount: number;
  hasMore: boolean;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (characterId) params.append('characterId', characterId);
    if (limit) params.append('limit', limit.toString());

    const response = await fetch(
      `${API_BASE_URL}/api/exploration/history/${sessionId}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get exploration history:', error);
    return {
      success: false,
      history: [],
      totalCount: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : '探索履歴の取得に失敗しました'
    };
  }
}

// ==========================================
// エンティティ詳細取得
// ==========================================

export async function getEntityDetails(entityId: string, sessionId: string): Promise<{
  success: boolean;
  entity?: EntityExplorationAction;
  interactions: any[];
  availableActions: any[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exploration/entity/${entityId}?sessionId=${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to get entity details:', error);
    return {
      success: false,
      interactions: [],
      availableActions: [],
      error: error instanceof Error ? error.message : 'エンティティ詳細の取得に失敗しました'
    };
  }
}

// ==========================================
// ヘルスチェック
// ==========================================

export async function checkExplorationHealth(): Promise<{
  success: boolean;
  service: string;
  status: string;
  timestamp: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exploration/health`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Failed to check exploration health:', error);
    return {
      success: false,
      service: 'exploration-actions',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'ヘルスチェックに失敗しました'
    };
  }
}