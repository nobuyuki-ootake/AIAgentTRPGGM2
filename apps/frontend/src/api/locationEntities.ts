// ==========================================
// 場所別エンティティAPI クライアント
// ==========================================

import {
  GetLocationEntitiesDisplayRequest,
  GetLocationEntitiesDisplayResponse,
  UpdateEntityStatusRequest,
  UpdateEntityStatusResponse,
  RefreshLocationEntitiesRequest,
  RefreshLocationEntitiesResponse
} from '@ai-agent-trpg/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

// ==========================================
// 場所エンティティ取得
// ==========================================

export async function getLocationEntitiesDisplay(request: GetLocationEntitiesDisplayRequest): Promise<GetLocationEntitiesDisplayResponse> {
  try {
    const params = new URLSearchParams();
    if (request.includeHidden) params.append('includeHidden', 'true');
    if (request.sortBy) params.append('sortBy', request.sortBy);
    if (request.sortOrder) params.append('sortOrder', request.sortOrder);

    const response = await fetch(
      `${API_BASE_URL}/api/location-entities/display/${request.sessionId}/${request.locationId}?${params.toString()}`,
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
    console.error('Failed to get location entities display:', error);
    return {
      success: false,
      locationEntities: [],
      locationStats: {
        totalEntities: 0,
        discoveredEntities: 0,
        interactableEntities: 0,
        dangerousEntities: 0
      },
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : '場所エンティティの取得に失敗しました'
    };
  }
}

// ==========================================
// エンティティ状態更新
// ==========================================

export async function updateEntityStatus(request: UpdateEntityStatusRequest): Promise<UpdateEntityStatusResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/location-entities/status`,
      {
        method: 'PUT',
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
    console.error('Failed to update entity status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'エンティティ状態の更新に失敗しました'
    };
  }
}

// ==========================================
// 場所エンティティ更新
// ==========================================

export async function refreshLocationEntities(request: RefreshLocationEntitiesRequest): Promise<RefreshLocationEntitiesResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/location-entities/refresh`,
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
    console.error('Failed to refresh location entities:', error);
    return {
      success: false,
      refreshedEntities: [],
      newEntitiesGenerated: 0,
      error: error instanceof Error ? error.message : '場所エンティティの更新に失敗しました'
    };
  }
}

// ==========================================
// ヘルスチェック
// ==========================================

export async function checkLocationEntitiesHealth(): Promise<{
  success: boolean;
  service: string;
  status: string;
  timestamp: string;
  features?: string[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/location-entities/health`,
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
    console.error('Failed to check location entities health:', error);
    return {
      success: false,
      service: 'location-entities',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'ヘルスチェックに失敗しました'
    };
  }
}