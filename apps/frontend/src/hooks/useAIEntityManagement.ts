/**
 * AI Entity Management Hook
 * AIエンティティ管理システムのReactフック
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { 
  aiEntityManagementAPI,
  EntityEvaluationRequest,
  EntityQueryRequest,
  EntityQueryResult,
  EntityRecommendationResult,
  EntityAvailabilityRequest,
  EngineStatistics
} from '../api/aiEntityManagement';
import { 
  AIGameContext
} from '@ai-agent-trpg/types';
import { currentCampaignAtom, currentSessionAtom } from '../store/atoms';

interface UseAIEntityManagementOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableCache?: boolean;
  debug?: boolean;
}

interface EntityManagementState {
  // データ状態
  availableEntities: EntityQueryResult | null;
  recommendations: EntityRecommendationResult | null;
  sessionRecommendations: {
    immediate: EntityRecommendationResult | null;
    upcoming: EntityRecommendationResult | null;
  };
  engineStats: EngineStatistics | null;
  
  // ローディング状態
  loading: {
    entities: boolean;
    recommendations: boolean;
    evaluation: boolean;
    availability: boolean;
    stats: boolean;
  };
  
  // エラー状態
  errors: {
    entities: string | null;
    recommendations: string | null;
    evaluation: string | null;
    availability: string | null;
    stats: string | null;
  };
  
  // 最終更新時刻
  lastUpdated: {
    entities: Date | null;
    recommendations: Date | null;
    stats: Date | null;
  };
}

export const useAIEntityManagement = (options: UseAIEntityManagementOptions = {}) => {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30秒
    enableCache = true,
    debug = false
  } = options;

  // Recoil state
  const currentCampaign = useRecoilValue(currentCampaignAtom);
  const sessionState = useRecoilValue(currentSessionAtom);

  // Local state
  const [state, setState] = useState<EntityManagementState>({
    availableEntities: null,
    recommendations: null,
    sessionRecommendations: {
      immediate: null,
      upcoming: null
    },
    engineStats: null,
    loading: {
      entities: false,
      recommendations: false,
      evaluation: false,
      availability: false,
      stats: false
    },
    errors: {
      entities: null,
      recommendations: null,
      evaluation: null,
      availability: null,
      stats: null
    },
    lastUpdated: {
      entities: null,
      recommendations: null,
      stats: null
    }
  });

  // キャッシュ管理
  const [cache, setCache] = useState<Map<string, { data: any; timestamp: Date; ttl: number }>>(
    new Map()
  );

  // ゲームコンテキスト作成
  const gameContext = useMemo((): AIGameContext | null => {
    if (!currentCampaign || !sessionState) return null;

    return {
      timestamp: new Date().toISOString(),
      sessionId: sessionState.id,
      campaignId: currentCampaign.id,
      currentState: {
        characters: {},
        location: {
          id: '',
          name: '未設定',
          description: '',
          type: 'other'
        } as any,
        time: {
          day: 1,
          hour: new Date().getHours(),
          minute: new Date().getMinutes(),
          season: 'spring',
          timeOfDay: 'morning'
        },
        mood: 'safe'
      },
      recentHistory: {
        actions: [],
        events: [],
        conversations: []
      },
      playerAnalysis: {
        preferredActivities: [],
        avoidedActivities: [],
        skillLevel: 'intermediate',
        engagementLevel: 0.5,
        satisfactionLevel: 0.5,
        playStyle: 'explorer'
      },
      aiInferences: {
        nextRecommendedActions: [],
        storyProgression: {
          currentArc: '',
          progressPercentage: 0,
          estimatedRemainingTime: 0
        },
        dynamicDifficulty: {
          currentLevel: 0.5,
          suggestedAdjustment: 0,
          reasoning: ''
        }
      },
      // 簡易実装用フィールド
      currentLocation: '', 
      activeCharacters: sessionState.participants,
      sessionMode: sessionState.mode,
      timeOfDay: new Date().getHours(),
      weatherCondition: 'clear',
      npcsPresent: [],
      availableItems: [],
      completedQuests: [],
      activeEvents: sessionState.currentEvent ? [sessionState.currentEvent] : [],
      difficulty: 'medium',
      tension: 50,
      playerActions: sessionState.chatLog
        .filter(log => log.type === 'ic' && log.characterId)
        .map(log => ({
          characterId: log.characterId!,
          actionType: 'dialogue' as const,
          timestamp: log.timestamp,
          description: log.message
        })),
      storyMoments: [],
      metadata: {
        sessionDuration: sessionState.startTime 
          ? Date.now() - new Date(sessionState.startTime).getTime()
          : 0,
        lastActivity: sessionState.updatedAt || new Date().toISOString()
      }
    };
  }, [currentCampaign, sessionState]);

  // キャッシュヘルパー
  const getCachedData = useCallback((key: string) => {
    if (!enableCache) return null;
    
    const cached = cache.get(key);
    if (!cached) return null;
    
    const now = new Date();
    if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
      cache.delete(key);
      return null;
    }
    
    return cached.data;
  }, [cache, enableCache]);

  const setCachedData = useCallback((key: string, data: any, ttl: number = 300000) => { // 5分デフォルト
    if (!enableCache) return;
    
    setCache(prev => new Map(prev.set(key, {
      data,
      timestamp: new Date(),
      ttl
    })));
  }, [enableCache]);

  // エラーハンドリング
  const handleError = useCallback((category: keyof EntityManagementState['errors'], error: any) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    setState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [category]: errorMessage
      }
    }));

    if (debug) {
      console.error(`AI Entity Management Error (${category}):`, error);
    }
  }, [debug]);

  // ローディング状態管理
  const setLoading = useCallback((category: keyof EntityManagementState['loading'], isLoading: boolean) => {
    setState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        [category]: isLoading
      }
    }));
  }, []);

  // 利用可能エンティティ取得
  const fetchAvailableEntities = useCallback(async (
    entityType?: 'item' | 'quest' | 'event' | 'npc' | 'enemy',
    useCache = true
  ) => {
    if (!gameContext) return null;

    const cacheKey = `entities-${entityType || 'all'}-${JSON.stringify(gameContext)}`;
    
    if (useCache) {
      const cached = getCachedData(cacheKey);
      if (cached) return cached;
    }

    try {
      setLoading('entities', true);
      setState(prev => ({ ...prev, errors: { ...prev.errors, entities: null } }));

      const result = await aiEntityManagementAPI.getAvailableEntities(gameContext, entityType);
      
      setState(prev => ({
        ...prev,
        availableEntities: result,
        lastUpdated: { ...prev.lastUpdated, entities: new Date() }
      }));

      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      handleError('entities', error);
      return null;
    } finally {
      setLoading('entities', false);
    }
  }, [gameContext, getCachedData, setCachedData, handleError, setLoading]);

  // エンティティ推奨取得
  const fetchRecommendations = useCallback(async (
    entityType: 'item' | 'quest' | 'event' | 'npc' | 'enemy',
    maxRecommendations = 5,
    useCache = true
  ) => {
    if (!gameContext) return null;

    const cacheKey = `recommendations-${entityType}-${maxRecommendations}-${JSON.stringify(gameContext)}`;
    
    if (useCache) {
      const cached = getCachedData(cacheKey);
      if (cached) return cached;
    }

    try {
      setLoading('recommendations', true);
      setState(prev => ({ ...prev, errors: { ...prev.errors, recommendations: null } }));

      const result = await aiEntityManagementAPI.getRecommendedEntities({
        entityType,
        gameContext,
        maxRecommendations
      });
      
      setState(prev => ({
        ...prev,
        recommendations: result,
        lastUpdated: { ...prev.lastUpdated, recommendations: new Date() }
      }));

      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      handleError('recommendations', error);
      return null;
    } finally {
      setLoading('recommendations', false);
    }
  }, [gameContext, getCachedData, setCachedData, handleError, setLoading]);

  // セッション推奨取得
  const fetchSessionRecommendations = useCallback(async (useCache = true) => {
    if (!gameContext) return null;

    const cacheKey = `session-recommendations-${JSON.stringify(gameContext)}`;
    
    if (useCache) {
      const cached = getCachedData(cacheKey);
      if (cached) return cached;
    }

    try {
      setLoading('recommendations', true);
      setState(prev => ({ ...prev, errors: { ...prev.errors, recommendations: null } }));

      const result = await aiEntityManagementAPI.getSessionRecommendations(gameContext);
      
      setState(prev => ({
        ...prev,
        sessionRecommendations: result,
        lastUpdated: { ...prev.lastUpdated, recommendations: new Date() }
      }));

      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      handleError('recommendations', error);
      return null;
    } finally {
      setLoading('recommendations', false);
    }
  }, [gameContext, getCachedData, setCachedData, handleError, setLoading]);

  // エンティティ評価
  const evaluateEntity = useCallback(async (request: EntityEvaluationRequest) => {
    try {
      setLoading('evaluation', true);
      setState(prev => ({ ...prev, errors: { ...prev.errors, evaluation: null } }));

      const result = await aiEntityManagementAPI.evaluateEntity(request);
      return result;
    } catch (error) {
      handleError('evaluation', error);
      return null;
    } finally {
      setLoading('evaluation', false);
    }
  }, [handleError, setLoading]);

  // エンティティ可用性チェック
  const checkEntityAvailability = useCallback(async (request: EntityAvailabilityRequest) => {
    try {
      setLoading('availability', true);
      setState(prev => ({ ...prev, errors: { ...prev.errors, availability: null } }));

      const result = await aiEntityManagementAPI.checkEntityAvailability(request);
      return result;
    } catch (error) {
      handleError('availability', error);
      return null;
    } finally {
      setLoading('availability', false);
    }
  }, [handleError, setLoading]);

  // エンジン統計取得
  const fetchEngineStats = useCallback(async (useCache = true) => {
    const cacheKey = 'engine-stats';
    
    if (useCache) {
      const cached = getCachedData(cacheKey);
      if (cached) return cached;
    }

    try {
      setLoading('stats', true);
      setState(prev => ({ ...prev, errors: { ...prev.errors, stats: null } }));

      const result = await aiEntityManagementAPI.getEngineStatistics();
      
      setState(prev => ({
        ...prev,
        engineStats: result,
        lastUpdated: { ...prev.lastUpdated, stats: new Date() }
      }));

      setCachedData(cacheKey, result, 60000); // 1分キャッシュ
      return result;
    } catch (error) {
      handleError('stats', error);
      return null;
    } finally {
      setLoading('stats', false);
    }
  }, [getCachedData, setCachedData, handleError, setLoading]);

  // カスタムクエリ
  const queryEntities = useCallback(async (request: EntityQueryRequest) => {
    try {
      setLoading('entities', true);
      setState(prev => ({ ...prev, errors: { ...prev.errors, entities: null } }));

      const result = await aiEntityManagementAPI.queryEntities(request);
      return result;
    } catch (error) {
      handleError('entities', error);
      return null;
    } finally {
      setLoading('entities', false);
    }
  }, [handleError, setLoading]);

  // キャッシュクリア
  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  // リフレッシュ
  const refresh = useCallback(async () => {
    clearCache();
    await Promise.all([
      fetchAvailableEntities(undefined, false),
      fetchSessionRecommendations(false),
      fetchEngineStats(false)
    ]);
  }, [clearCache, fetchAvailableEntities, fetchSessionRecommendations, fetchEngineStats]);

  // 自動リフレッシュ
  useEffect(() => {
    if (!autoRefresh || !gameContext) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, gameContext, refresh]);

  // 初期データ読み込み
  useEffect(() => {
    if (gameContext) {
      fetchAvailableEntities();
      fetchSessionRecommendations();
      fetchEngineStats();
    }
  }, [gameContext, fetchAvailableEntities, fetchSessionRecommendations, fetchEngineStats]);

  return {
    // データ
    ...state,
    gameContext,
    
    // メソッド
    fetchAvailableEntities,
    fetchRecommendations,
    fetchSessionRecommendations,
    evaluateEntity,
    checkEntityAvailability,
    queryEntities,
    fetchEngineStats,
    
    // ユーティリティ
    refresh,
    clearCache,
    
    // 状態チェック
    isLoading: Object.values(state.loading).some(Boolean),
    hasErrors: Object.values(state.errors).some(Boolean),
    isReady: !!gameContext && !Object.values(state.loading).some(Boolean)
  };
};