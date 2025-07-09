// ==========================================
// 場所別エンティティ管理フック
// ==========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LocationEntity,
  LocationEntityDisplayState,
  ID
} from '@ai-agent-trpg/types';
import {
  getLocationEntitiesDisplay,
  updateEntityStatus,
  refreshLocationEntities
} from '../api/locationEntities';
import { useWebSocket } from './useWebSocket';

interface UseLocationEntitiesOptions {
  sessionId: ID;
  locationId: ID;
  autoRefresh?: boolean;
  refreshInterval?: number;
  sortBy?: 'name' | 'discovery_time' | 'danger_level' | 'interaction_count';
  sortOrder?: 'asc' | 'desc';
  includeHidden?: boolean;
  
  // リアルタイム更新設定
  enableLocationChangeDetection?: boolean;
  onLocationChanged?: (oldLocationId: ID | null, newLocationId: ID) => void;
  forceRefreshOnLocationChange?: boolean;
}

interface UseLocationEntitiesReturn {
  displayState: LocationEntityDisplayState | null;
  entities: LocationEntity[];
  loading: boolean;
  error: string | null;
  
  // アクション
  refreshEntities: () => Promise<void>;
  updateEntityStatus: (entityId: ID, newStatus: LocationEntity['status'], reason?: string) => Promise<boolean>;
  forceRegenerateEntities: () => Promise<void>;
  
  // 設定更新
  updateDisplaySettings: (settings: Partial<LocationEntityDisplayState['displaySettings']>) => void;
  
  // 場所変更関連
  isLocationChanging: boolean;
  lastLocationId: ID | null;
  
  // 統計情報
  stats: {
    totalEntities: number;
    discoveredEntities: number;
    interactableEntities: number;
    dangerousEntities: number;
  };
}

export const useLocationEntities = (options: UseLocationEntitiesOptions): UseLocationEntitiesReturn => {
  const {
    sessionId,
    locationId,
    autoRefresh = false,
    refreshInterval = 15000,
    sortBy = 'name',
    sortOrder = 'asc',
    includeHidden = false,
    enableLocationChangeDetection = true,
    onLocationChanged,
    forceRefreshOnLocationChange = true
  } = options;

  const [displayState, setDisplayState] = useState<LocationEntityDisplayState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocationChanging, setIsLocationChanging] = useState(false);
  
  // 前回の場所IDを記録
  const previousLocationIdRef = useRef<ID | null>(null);
  const isFirstLoadRef = useRef(true);
  
  // WebSocket接続
  const { isConnected, joinSession, onLocationEntitiesUpdated } = useWebSocket();

  // ==========================================
  // データ取得
  // ==========================================

  const fetchEntities = useCallback(async () => {
    if (!sessionId || !locationId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getLocationEntitiesDisplay({
        sessionId,
        locationId,
        includeHidden,
        sortBy,
        sortOrder
      });

      if (response.success) {
        const newDisplayState: LocationEntityDisplayState = {
          sessionId,
          currentLocationId: locationId,
          currentLocationEntities: response.locationEntities,
          displaySettings: {
            showUndiscovered: true,
            showCompleted: true,
            sortBy,
            sortOrder,
            groupByType: false
          },
          locationStats: response.locationStats,
          lastRefresh: response.lastUpdated,
          autoRefreshEnabled: autoRefresh
        };

        setDisplayState(newDisplayState);
      } else {
        setError(response.error || '場所エンティティの取得に失敗しました');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [sessionId, locationId, includeHidden, sortBy, sortOrder, autoRefresh]);

  // ==========================================
  // 場所変更検知
  // ==========================================

  useEffect(() => {
    if (!enableLocationChangeDetection || !locationId) return;

    const previousLocationId = previousLocationIdRef.current;
    const isLocationChanged = !isFirstLoadRef.current && previousLocationId !== locationId;

    if (isLocationChanged) {
      console.log('🏃 Location changed detected:', { 
        from: previousLocationId, 
        to: locationId 
      });

      // 場所変更状態を設定
      setIsLocationChanging(true);

      // コールバック実行
      if (onLocationChanged) {
        onLocationChanged(previousLocationId, locationId);
      }

      // 強制更新が有効な場合、即座にエンティティを更新
      if (forceRefreshOnLocationChange) {
        console.log('🔄 Force refreshing entities due to location change');
        fetchEntities().finally(() => {
          setIsLocationChanging(false);
        });
      } else {
        setIsLocationChanging(false);
      }
    }

    // 場所IDを更新
    previousLocationIdRef.current = locationId;
    isFirstLoadRef.current = false;

  }, [locationId, enableLocationChangeDetection, onLocationChanged, forceRefreshOnLocationChange, fetchEntities]);

  // 初期読み込みとWebSocketセッション参加
  useEffect(() => {
    if (isFirstLoadRef.current) {
      fetchEntities();
      
      // WebSocketセッション参加
      if (isConnected) {
        joinSession(sessionId);
      }
    }
  }, [fetchEntities, isConnected, sessionId, joinSession]);

  // WebSocketイベント処理 - リアルタイム更新
  useEffect(() => {
    if (!isConnected) return;

    const handleLocationEntitiesUpdate = (data: any) => {
      console.log('Location entities WebSocket update received:', data.type);
      
      // 現在の場所に関連する更新の場合のみ処理
      if (data.sessionId === sessionId && data.locationId === locationId) {
        fetchEntities();
      }
    };

    const cleanup = onLocationEntitiesUpdated(handleLocationEntitiesUpdate);
    
    return cleanup;
  }, [isConnected, onLocationEntitiesUpdated, fetchEntities, sessionId, locationId]);


  // ==========================================
  // アクション
  // ==========================================

  const refreshEntities = useCallback(async () => {
    await fetchEntities();
  }, [fetchEntities]);

  const updateEntityStatusAction = useCallback(async (
    entityId: ID,
    newStatus: LocationEntity['status'],
    reason?: string
  ): Promise<boolean> => {
    try {
      const response = await updateEntityStatus({
        sessionId,
        entityId,
        newStatus,
        reason
      });

      if (response.success) {
        // ローカル状態を更新
        if (displayState && response.updatedEntity) {
          const updatedEntities = displayState.currentLocationEntities.map(entity =>
            entity.entityId === entityId ? response.updatedEntity! : entity
          );

          setDisplayState({
            ...displayState,
            currentLocationEntities: updatedEntities,
            lastRefresh: new Date().toISOString()
          });
        }

        return true;
      } else {
        setError(response.error || 'エンティティ状態の更新に失敗しました');
        return false;
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'エンティティ状態の更新中にエラーが発生しました');
      return false;
    }
  }, [sessionId, displayState]);

  const forceRegenerateEntities = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await refreshLocationEntities({
        sessionId,
        locationId,
        forceRegeneration: true
      });

      if (response.success) {
        // 再取得
        await fetchEntities();
      } else {
        setError(response.error || 'エンティティの再生成に失敗しました');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'エンティティの再生成中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [sessionId, locationId, fetchEntities]);

  // ==========================================
  // 設定更新
  // ==========================================

  const updateDisplaySettings = useCallback((
    newSettings: Partial<LocationEntityDisplayState['displaySettings']>
  ) => {
    if (!displayState) return;

    setDisplayState({
      ...displayState,
      displaySettings: {
        ...displayState.displaySettings,
        ...newSettings
      }
    });
  }, [displayState]);

  // ==========================================
  // 計算されたプロパティ
  // ==========================================

  const entities = displayState?.currentLocationEntities || [];
  
  const stats = displayState?.locationStats || {
    totalEntities: 0,
    discoveredEntities: 0,
    interactableEntities: 0,
    dangerousEntities: 0
  };

  // ==========================================
  // 戻り値
  // ==========================================

  return {
    displayState,
    entities,
    loading,
    error,
    
    // アクション
    refreshEntities,
    updateEntityStatus: updateEntityStatusAction,
    forceRegenerateEntities,
    
    // 設定更新
    updateDisplaySettings,
    
    // 場所変更関連
    isLocationChanging,
    lastLocationId: previousLocationIdRef.current,
    
    // 統計情報
    stats
  };
};

export default useLocationEntities;