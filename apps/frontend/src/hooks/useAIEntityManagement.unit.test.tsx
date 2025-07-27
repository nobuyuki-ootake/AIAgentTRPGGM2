/**
 * useAIEntityManagement.unit.test.ts - AIエンティティ管理フックの単体テスト
 * t-WADA命名規則に従い、本番型定義のみを使用
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { RecoilRoot, RecoilState } from 'recoil';
import { ReactNode } from 'react';
import { useAIEntityManagement } from './useAIEntityManagement';
import { aiEntityManagementAPI } from '../api/aiEntityManagement';
import { currentCampaignAtom, currentSessionAtom } from '../store/atoms';
import { 
  createTestCampaign, 
  createTestSessionState,
  createTestAIGameContext
} from '@/tests/utils/test-data-factories';
import { AIGameContext } from '@ai-agent-trpg/types';

// モック設定
vi.mock('../api/aiEntityManagement', () => ({
  aiEntityManagementAPI: {
    getAvailableEntities: vi.fn(),
    getRecommendedEntities: vi.fn(),
    getSessionRecommendations: vi.fn(),
    evaluateEntity: vi.fn(),
    checkEntityAvailability: vi.fn(),
    queryEntities: vi.fn(),
    getEngineStatistics: vi.fn(),
  },
}));

vi.mock('./useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    onLocationEntitiesUpdated: vi.fn((callback) => {
      // クリーンアップ関数を返す
      return () => {};
    }),
  }),
}));

describe('useAIEntityManagement hook', () => {
  const mockCampaign = createTestCampaign();
  const mockSession = createTestSessionState();

  const createWrapper = (initialValues?: { 
    campaign?: any; 
    session?: any; 
  }) => {
    const { campaign = mockCampaign, session = mockSession } = initialValues || {};
    
    return ({ children }: { children: ReactNode }) => (
      <RecoilRoot 
        initializeState={({ set }) => {
          set(currentCampaignAtom, campaign);
          set(currentSessionAtom, session);
        }}
      >
        {children}
      </RecoilRoot>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('初期化処理', () => {
    it('キャンペーンとセッションが存在する場合、ゲームコンテキストが作成される', () => {
      // Arrange & Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.gameContext).toBeDefined();
      expect(result.current.gameContext?.campaignId).toBe(mockCampaign.id);
      expect(result.current.gameContext?.sessionId).toBe(mockSession.id);
    });

    it('キャンペーンまたはセッションが存在しない場合、ゲームコンテキストはnull', () => {
      // Arrange & Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper({ campaign: null, session: null }) }
      );

      // Assert
      expect(result.current.gameContext).toBeNull();
    });

    it('初期状態のローディングとエラーステートが正しく設定される', () => {
      // Arrange & Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.loading).toEqual({
        entities: false,
        recommendations: false,
        evaluation: false,
        availability: false,
        stats: false,
      });
      
      expect(result.current.errors).toEqual({
        entities: null,
        recommendations: null,
        evaluation: null,
        availability: null,
        stats: null,
      });
    });
  });

  describe('利用可能エンティティ取得', () => {
    it('利用可能エンティティを正常に取得できる', async () => {
      // Arrange
      const mockEntities = {
        entities: [
          { id: 'item-1', name: 'テストアイテム', type: 'item' },
          { id: 'npc-1', name: 'テストNPC', type: 'npc' }
        ],
        total: 2,
        hasMore: false
      };
      
      vi.mocked(aiEntityManagementAPI.getAvailableEntities).mockResolvedValue(mockEntities);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const entities = await result.current.fetchAvailableEntities();
        expect(entities).toEqual(mockEntities);
      });

      // Assert
      expect(result.current.availableEntities).toEqual(mockEntities);
      expect(result.current.errors.entities).toBeNull();
      expect(result.current.lastUpdated.entities).toBeInstanceOf(Date);
    });

    it('特定のエンティティタイプでフィルタリングできる', async () => {
      // Arrange
      const mockItems = {
        entities: [{ id: 'item-1', name: 'テストアイテム', type: 'item' }],
        total: 1,
        hasMore: false
      };
      
      vi.mocked(aiEntityManagementAPI.getAvailableEntities).mockResolvedValue(mockItems);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.fetchAvailableEntities('item');
      });

      // Assert
      expect(aiEntityManagementAPI.getAvailableEntities).toHaveBeenCalledWith(
        expect.any(Object),
        'item'
      );
    });

    it('エンティティ取得時のエラーを適切に処理する', async () => {
      // Arrange
      const error = new Error('API接続エラー');
      vi.mocked(aiEntityManagementAPI.getAvailableEntities).mockRejectedValue(error);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const entities = await result.current.fetchAvailableEntities();
        expect(entities).toBeNull();
      });

      // Assert
      expect(result.current.errors.entities).toBe('API接続エラー');
      expect(result.current.availableEntities).toBeNull();
    });
  });

  describe('エンティティ推奨取得', () => {
    it('エンティティ推奨を正常に取得できる', async () => {
      // Arrange
      const mockRecommendations = {
        recommendations: [
          { entityId: 'item-1', score: 0.9, reason: '現在の状況に適している' }
        ],
        algorithm: 'contextual-ml',
        confidence: 0.85
      };
      
      vi.mocked(aiEntityManagementAPI.getRecommendedEntities).mockResolvedValue(mockRecommendations);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const recommendations = await result.current.fetchRecommendations('item', 5);
        expect(recommendations).toEqual(mockRecommendations);
      });

      // Assert
      expect(result.current.recommendations).toEqual(mockRecommendations);
      expect(aiEntityManagementAPI.getRecommendedEntities).toHaveBeenCalledWith({
        entityType: 'item',
        gameContext: expect.any(Object),
        maxRecommendations: 5
      });
    });

    it('推奨取得時のエラーを適切に処理する', async () => {
      // Arrange
      const error = new Error('推奨エンジンエラー');
      vi.mocked(aiEntityManagementAPI.getRecommendedEntities).mockRejectedValue(error);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const recommendations = await result.current.fetchRecommendations('npc');
        expect(recommendations).toBeNull();
      });

      // Assert
      expect(result.current.errors.recommendations).toBe('推奨エンジンエラー');
    });
  });

  describe('セッション推奨取得', () => {
    it('セッション推奨を正常に取得できる', async () => {
      // Arrange
      const mockSessionRecommendations = {
        immediate: {
          recommendations: [
            { entityId: 'event-1', score: 0.8, reason: '現在のムードに適している' }
          ],
          algorithm: 'session-context',
          confidence: 0.9
        },
        upcoming: {
          recommendations: [
            { entityId: 'quest-1', score: 0.7, reason: '次のシーンで有効' }
          ],
          algorithm: 'prediction',
          confidence: 0.75
        }
      };
      
      vi.mocked(aiEntityManagementAPI.getSessionRecommendations).mockResolvedValue(mockSessionRecommendations);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const recommendations = await result.current.fetchSessionRecommendations();
        expect(recommendations).toEqual(mockSessionRecommendations);
      });

      // Assert
      expect(result.current.sessionRecommendations).toEqual(mockSessionRecommendations);
    });
  });

  describe('エンティティ評価', () => {
    it('エンティティ評価を正常に実行できる', async () => {
      // Arrange
      const mockEvaluation = {
        suitabilityScore: 0.85,
        reasoning: '現在のセッション状況に非常に適している',
        suggestedModifications: [],
        riskFactors: []
      };
      
      const evaluationRequest = {
        entityId: 'test-entity-1',
        entityType: 'item' as const,
        gameContext: createTestAIGameContext()
      };
      
      vi.mocked(aiEntityManagementAPI.evaluateEntity).mockResolvedValue(mockEvaluation);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const evaluation = await result.current.evaluateEntity(evaluationRequest);
        expect(evaluation).toEqual(mockEvaluation);
      });

      // Assert
      expect(aiEntityManagementAPI.evaluateEntity).toHaveBeenCalledWith(evaluationRequest);
    });

    it('評価時のエラーを適切に処理する', async () => {
      // Arrange
      const error = new Error('評価エンジンエラー');
      vi.mocked(aiEntityManagementAPI.evaluateEntity).mockRejectedValue(error);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const evaluation = await result.current.evaluateEntity({
          entityId: 'test-entity-1',
          entityType: 'item',
          gameContext: createTestAIGameContext()
        });
        expect(evaluation).toBeNull();
      });

      // Assert
      expect(result.current.errors.evaluation).toBe('評価エンジンエラー');
    });
  });

  describe('エンティティ可用性チェック', () => {
    it('エンティティ可用性を正常にチェックできる', async () => {
      // Arrange
      const mockAvailability = {
        isAvailable: true,
        requirements: {
          metRequirements: ['セッション開始済み'],
          unmetRequirements: []
        },
        alternatives: []
      };
      
      const availabilityRequest = {
        entityId: 'test-entity-1',
        gameContext: createTestAIGameContext()
      };
      
      vi.mocked(aiEntityManagementAPI.checkEntityAvailability).mockResolvedValue(mockAvailability);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const availability = await result.current.checkEntityAvailability(availabilityRequest);
        expect(availability).toEqual(mockAvailability);
      });

      // Assert
      expect(aiEntityManagementAPI.checkEntityAvailability).toHaveBeenCalledWith(availabilityRequest);
    });
  });

  describe('エンジン統計取得', () => {
    it('エンジン統計を正常に取得できる', async () => {
      // Arrange
      const mockStats = {
        totalEntities: 150,
        entitiesByType: {
          item: 50,
          npc: 30,
          quest: 20,
          event: 25,
          enemy: 25
        },
        recentActivity: {
          generatedToday: 5,
          evaluatedToday: 12,
          recommendedToday: 8
        },
        performanceMetrics: {
          averageResponseTime: 250,
          cacheHitRate: 0.75,
          errorRate: 0.02
        }
      };
      
      vi.mocked(aiEntityManagementAPI.getEngineStatistics).mockResolvedValue(mockStats);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const stats = await result.current.fetchEngineStats();
        expect(stats).toEqual(mockStats);
      });

      // Assert
      expect(result.current.engineStats).toEqual(mockStats);
      expect(result.current.lastUpdated.stats).toBeInstanceOf(Date);
    });
  });

  describe('カスタムクエリ', () => {
    it('カスタムクエリを正常に実行できる', async () => {
      // Arrange
      const mockQueryResult = {
        entities: [
          { id: 'custom-1', name: 'カスタムエンティティ', type: 'custom' }
        ],
        total: 1,
        hasMore: false
      };
      
      const queryRequest = {
        filters: { type: 'custom' },
        sorting: { field: 'name', order: 'asc' as const },
        pagination: { page: 1, limit: 10 }
      };
      
      vi.mocked(aiEntityManagementAPI.queryEntities).mockResolvedValue(mockQueryResult);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const queryResult = await result.current.queryEntities(queryRequest);
        expect(queryResult).toEqual(mockQueryResult);
      });

      // Assert
      expect(aiEntityManagementAPI.queryEntities).toHaveBeenCalledWith(queryRequest);
    });
  });

  describe('キャッシュ機能', () => {
    it('キャッシュが有効な場合、同じリクエストでキャッシュされたデータを返す', async () => {
      // Arrange
      const mockEntities = {
        entities: [{ id: 'cached-item', name: 'キャッシュされたアイテム', type: 'item' }],
        total: 1,
        hasMore: false
      };
      
      vi.mocked(aiEntityManagementAPI.getAvailableEntities).mockResolvedValue(mockEntities);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement({ enableCache: true }),
        { wrapper: createWrapper() }
      );

      // 最初の呼び出し
      await act(async () => {
        await result.current.fetchAvailableEntities();
      });

      // 2回目の呼び出し（キャッシュが使われるはず）
      await act(async () => {
        await result.current.fetchAvailableEntities();
      });

      // Assert
      expect(aiEntityManagementAPI.getAvailableEntities).toHaveBeenCalledTimes(1);
    });

    it('キャッシュをクリアできる', async () => {
      // Arrange
      const mockEntities = {
        entities: [{ id: 'item-1', name: 'テストアイテム', type: 'item' }],
        total: 1,
        hasMore: false
      };
      
      vi.mocked(aiEntityManagementAPI.getAvailableEntities).mockResolvedValue(mockEntities);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement({ enableCache: true }),
        { wrapper: createWrapper() }
      );

      // データを取得してキャッシュ
      await act(async () => {
        await result.current.fetchAvailableEntities();
      });

      // キャッシュをクリア
      act(() => {
        result.current.clearCache();
      });

      // 再取得（APIが再度呼ばれるはず）
      await act(async () => {
        await result.current.fetchAvailableEntities();
      });

      // Assert
      expect(aiEntityManagementAPI.getAvailableEntities).toHaveBeenCalledTimes(2);
    });
  });

  describe('状態確認', () => {
    it('ローディング状態を正しく判定する', async () => {
      // Arrange
      vi.mocked(aiEntityManagementAPI.getAvailableEntities).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.fetchAvailableEntities();
      });

      // Assert
      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('エラー状態を正しく判定する', async () => {
      // Arrange
      const error = new Error('テストエラー');
      vi.mocked(aiEntityManagementAPI.getAvailableEntities).mockRejectedValue(error);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.fetchAvailableEntities();
      });

      // Assert
      expect(result.current.hasErrors).toBe(true);
    });

    it('準備完了状態を正しく判定する', () => {
      // Arrange & Act
      const { result } = renderHook(
        () => useAIEntityManagement(),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.isReady).toBe(true); // ゲームコンテキストがありローディング中でない
    });
  });

  describe('リフレッシュ機能', () => {
    it('リフレッシュ時にキャッシュをクリアしてデータを再取得する', async () => {
      // Arrange
      const mockEntities = {
        entities: [{ id: 'item-1', name: 'テストアイテム', type: 'item' }],
        total: 1,
        hasMore: false
      };
      
      vi.mocked(aiEntityManagementAPI.getAvailableEntities).mockResolvedValue(mockEntities);

      // Act
      const { result } = renderHook(
        () => useAIEntityManagement({ enableCache: true }),
        { wrapper: createWrapper() }
      );

      // 初回取得
      await act(async () => {
        await result.current.fetchAvailableEntities();
      });

      // リフレッシュ
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(aiEntityManagementAPI.getAvailableEntities).toHaveBeenCalledTimes(2);
    });
  });
});