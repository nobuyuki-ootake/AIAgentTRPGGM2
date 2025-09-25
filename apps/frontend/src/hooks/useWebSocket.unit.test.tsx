/**
 * useWebSocket.unit.test.ts - WebSocketフックの単体テスト
 * t-WADA命名規則に従い、本番型定義のみを使用
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';
import { createTestChatMessage, createTestGMNotification } from '@/tests/utils/test-data-factories';
import { GMNotificationEvent } from '@ai-agent-trpg/types';

// Socket.IOのモック設定
const mockSocket = {
  id: 'mock-socket-id',
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

const mockIo = vi.fn(() => mockSocket);

vi.mock('socket.io-client', () => ({
  io: mockIo,
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('useWebSocket hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    // モックリセット
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('初期化処理', () => {
    it('WebSocket接続を初期化する', () => {
      // Arrange
      const expectedUrl = 'http://localhost:4001';

      // Act
      renderHook(() => useWebSocket());

      // Assert
      expect(mockIo).toHaveBeenCalledWith(expectedUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    });

    it('環境変数でWebSocketURLを設定できる', () => {
      // Arrange
      const customUrl = 'wss://custom-server.com';
      vi.stubEnv('VITE_WS_BASE_URL', customUrl);

      // Act
      renderHook(() => useWebSocket());

      // Assert
      expect(mockIo).toHaveBeenCalledWith(customUrl, expect.any(Object));
    });

    it('初期状態では接続されていない', () => {
      // Arrange & Act
      const { result } = renderHook(() => useWebSocket());

      // Assert
      expect(result.current.isConnected).toBe(false);
      expect(result.current.socket).toBe(mockSocket);
    });
  });

  describe('接続状態管理', () => {
    it('接続時にisConnectedがtrueになる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      
      // connectイベントハンドラーを取得
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      // Act
      act(() => {
        if (connectHandler) {
          connectHandler();
        }
      });

      // Assert
      expect(result.current.isConnected).toBe(true);
    });

    it('切断時にisConnectedがfalseになる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      
      // disconnectイベントハンドラーを取得
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      // Act
      act(() => {
        if (disconnectHandler) {
          disconnectHandler('transport close');
        }
      });

      // Assert
      expect(result.current.isConnected).toBe(false);
    });

    it('接続エラー時にisConnectedがfalseになる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      
      // connect_errorイベントハンドラーを取得
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];

      // Act
      act(() => {
        if (errorHandler) {
          errorHandler(new Error('Connection failed'));
        }
      });

      // Assert
      expect(result.current.isConnected).toBe(false);
    });

    it('再接続時にisConnectedがtrueになる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      
      // reconnectイベントハンドラーを取得
      const reconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect'
      )?.[1];

      // Act
      act(() => {
        if (reconnectHandler) {
          reconnectHandler(3);
        }
      });

      // Assert
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('セッション管理', () => {
    it('セッションに参加できる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const sessionId = 'test-session-1';

      // 接続状態をシミュレート
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        if (connectHandler) {
          connectHandler();
        }
      });

      // Act
      act(() => {
        result.current.joinSession(sessionId);
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('join-session', sessionId);
    });

    it('セッションから離脱できる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const sessionId = 'test-session-1';

      // Act
      act(() => {
        result.current.leaveSession(sessionId);
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('leave-session', sessionId);
    });

    it('新しいセッションに参加時、既存セッションから自動離脱する', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const firstSessionId = 'test-session-1';
      const secondSessionId = 'test-session-2';

      // 接続状態をシミュレート
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        if (connectHandler) {
          connectHandler();
        }
      });

      // Act
      act(() => {
        result.current.joinSession(firstSessionId);
      });
      
      act(() => {
        result.current.joinSession(secondSessionId);
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('leave-session', firstSessionId);
      expect(mockSocket.emit).toHaveBeenCalledWith('join-session', secondSessionId);
    });

    it('未接続時はセッション参加を無視する', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const sessionId = 'test-session-1';

      // Act（接続していない状態で参加を試みる）
      act(() => {
        result.current.joinSession(sessionId);
      });

      // Assert
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('チャットメッセージ受信', () => {
    it('チャットメッセージを受信できる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const mockCallback = vi.fn();
      const testMessage = createTestChatMessage({
        content: 'テストメッセージ',
        sender: 'テストプレイヤー'
      });
      
      const chatData = {
        sessionId: 'test-session-1',
        message: testMessage,
        timestamp: '2024-01-15T19:31:00Z'
      };

      // Act
      act(() => {
        result.current.onChatMessage(mockCallback);
      });

      // チャットメッセージイベントをシミュレート
      const chatHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'chat-message'
      )?.[1];

      act(() => {
        if (chatHandler) {
          chatHandler(chatData);
        }
      });

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(chatData);
    });

    it('チャットメッセージリスナーのクリーンアップが機能する', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const mockCallback = vi.fn();

      // Act
      let cleanup: (() => void) | undefined;
      act(() => {
        cleanup = result.current.onChatMessage(mockCallback);
      });

      act(() => {
        if (cleanup) {
          cleanup();
        }
      });

      // Assert
      expect(mockSocket.off).toHaveBeenCalledWith('chat-message', expect.any(Function));
    });
  });

  describe('GM通知受信', () => {
    it('GM通知を受信できる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const mockCallback = vi.fn();
      const testNotification = createTestGMNotification({
        title: 'テスト通知',
        message: 'キャラクターが重要な行動を取りました'
      });
      
      const gmNotificationData: GMNotificationEvent = {
        type: 'gm_notification',
        timestamp: '2024-01-15T19:45:00Z',
        notification: testNotification
      };

      // Act
      act(() => {
        result.current.onGMNotification(mockCallback);
      });

      // GM通知イベントをシミュレート
      const gmHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'gm-notification'
      )?.[1];

      act(() => {
        if (gmHandler) {
          gmHandler(gmNotificationData);
        }
      });

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(gmNotificationData);
    });
  });

  describe('GMストーリー進行受信', () => {
    it('GMストーリー進行を受信できる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const mockCallback = vi.fn();
      
      const storyProgressionData = {
        type: 'gm_story_progression' as const,
        timestamp: '2024-01-15T19:50:00Z',
        data: {
          messageId: 'story-1',
          title: 'ストーリー進行',
          message: '新しい展開が発生しました',
          priority: 'medium',
          sender: 'AI-GM',
          sessionId: 'test-session-1',
          isAIGenerated: true
        }
      };

      // Act
      act(() => {
        result.current.onGMStoryProgression(mockCallback);
      });

      // GMストーリー進行イベントをシミュレート
      const storyHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'gm-story-progression'
      )?.[1];

      act(() => {
        if (storyHandler) {
          storyHandler(storyProgressionData);
        }
      });

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(storyProgressionData);
    });
  });

  describe('ナラティブフィードバック受信', () => {
    it('ナラティブフィードバックを受信できる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const mockCallback = vi.fn();
      
      const narrativeFeedbackData = {
        type: 'narrative_feedback' as const,
        timestamp: '2024-01-15T19:55:00Z',
        data: {
          milestoneName: 'テストマイルストーン',
          mainNarrative: {
            title: 'マイルストーン達成',
            content: '重要な節目に到達しました',
            tone: 'triumphant' as const
          },
          narrativeWeight: 'major' as const,
          tone: 'triumphant',
          isDetailedFeedback: true
        }
      };

      // Act
      act(() => {
        result.current.onNarrativeFeedback(mockCallback);
      });

      // ナラティブフィードバックイベントをシミュレート
      const narrativeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'narrative-feedback'
      )?.[1];

      act(() => {
        if (narrativeHandler) {
          narrativeHandler(narrativeFeedbackData);
        }
      });

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(narrativeFeedbackData);
    });
  });

  describe('パーティ移動更新受信', () => {
    it('パーティ移動更新を受信できる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const mockCallback = vi.fn();
      
      const movementData = {
        type: 'proposal-created' as const,
        sessionId: 'test-session-1',
        proposalId: 'movement-proposal-1',
        proposal: { targetLocation: 'test-location-2' },
        timestamp: '2024-01-15T20:00:00Z'
      };

      // Act
      let cleanup: (() => void) | undefined;
      act(() => {
        cleanup = result.current.onPartyMovementUpdated(mockCallback);
      });

      // パーティ移動更新イベントをシミュレート
      const movementHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'party-movement-updated'
      )?.[1];

      act(() => {
        if (movementHandler) {
          movementHandler(movementData);
        }
      });

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(movementData);
      
      // クリーンアップテスト
      act(() => {
        if (cleanup) {
          cleanup();
        }
      });
      expect(mockSocket.off).toHaveBeenCalledWith('party-movement-updated', expect.any(Function));
    });
  });

  describe('場所エンティティ更新受信', () => {
    it('場所エンティティ更新を受信できる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const mockCallback = vi.fn();
      
      const entitiesData = {
        type: 'entity-status-changed' as const,
        sessionId: 'test-session-1',
        locationId: 'test-location-1',
        entityId: 'test-entity-1',
        newStatus: 'discovered',
        timestamp: '2024-01-15T20:05:00Z'
      };

      // Act
      let cleanup: (() => void) | undefined;
      act(() => {
        cleanup = result.current.onLocationEntitiesUpdated(mockCallback);
      });

      // 場所エンティティ更新イベントをシミュレート
      const entitiesHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'location-entities-updated'
      )?.[1];

      act(() => {
        if (entitiesHandler) {
          entitiesHandler(entitiesData);
        }
      });

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(entitiesData);
      
      // クリーンアップテスト
      act(() => {
        if (cleanup) {
          cleanup();
        }
      });
      expect(mockSocket.off).toHaveBeenCalledWith('location-entities-updated', expect.any(Function));
    });
  });

  describe('仲間メッセージとプレイヤー行動', () => {
    it('仲間メッセージを受信できる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const mockCallback = vi.fn();
      
      const companionData = {
        type: 'companion_reaction' as const,
        message: createTestChatMessage({
          content: '仲間からの反応',
          sender: 'NPC仲間'
        }),
        timestamp: '2024-01-15T20:10:00Z'
      };

      // Act
      act(() => {
        result.current.onCompanionMessage(mockCallback);
      });

      // 仲間メッセージイベントをシミュレート
      const companionHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'companion-message'
      )?.[1];

      act(() => {
        if (companionHandler) {
          companionHandler(companionData);
        }
      });

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(companionData);
    });

    it('プレイヤー行動を受信できる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const mockCallback = vi.fn();
      
      const playerActionData = {
        type: 'action_performed' as const,
        sessionId: 'test-session-1',
        actionData: { action: 'investigate', target: 'mysterious_object' },
        timestamp: '2024-01-15T20:15:00Z'
      };

      // Act
      act(() => {
        result.current.onPlayerAction(mockCallback);
      });

      // プレイヤー行動イベントをシミュレート
      const actionHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'player-action'
      )?.[1];

      act(() => {
        if (actionHandler) {
          actionHandler(playerActionData);
        }
      });

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(playerActionData);
    });
  });

  describe('手動切断', () => {
    it('手動でWebSocket接続を切断できる', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());

      // Act
      act(() => {
        result.current.disconnect();
      });

      // Assert
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.socket).toBeNull();
    });

    it('セッション参加中の切断時は自動的にセッションから離脱する', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const sessionId = 'test-session-1';

      // 接続とセッション参加をシミュレート
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        if (connectHandler) {
          connectHandler();
        }
      });

      act(() => {
        result.current.joinSession(sessionId);
      });

      // Act
      act(() => {
        result.current.disconnect();
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('leave-session', sessionId);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('未接続時のリスナー登録', () => {
    it('未接続時はリスナー登録を無視し、適切なクリーンアップ関数を返す', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const mockCallback = vi.fn();

      // ソケットを無効にする
      result.current.socket = null;

      // Act & Assert
      act(() => {
        result.current.onCompanionMessage(mockCallback);
        result.current.onPlayerAction(mockCallback);
        result.current.onGMNotification(mockCallback);
        result.current.onGMStoryProgression(mockCallback);
        result.current.onNarrativeFeedback(mockCallback);
      });

      const chatCleanup = result.current.onChatMessage(mockCallback);
      const movementCleanup = result.current.onPartyMovementUpdated(mockCallback);
      const entitiesCleanup = result.current.onLocationEntitiesUpdated(mockCallback);

      // クリーンアップ関数が返されることを確認
      expect(typeof chatCleanup).toBe('function');
      expect(typeof movementCleanup).toBe('function');
      expect(typeof entitiesCleanup).toBe('function');

      // リスナーが登録されていないことを確認
      expect(mockSocket.on).not.toHaveBeenCalled();
    });
  });

  describe('コンポーネントアンマウント時のクリーンアップ', () => {
    it('コンポーネントアンマウント時にWebSocket接続が切断される', () => {
      // Arrange
      const { unmount } = renderHook(() => useWebSocket());

      // Act
      unmount();

      // Assert
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('再接続時のセッション復帰', () => {
    it('再接続時に現在のセッションに自動復帰する', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket());
      const sessionId = 'test-session-1';

      // 最初の接続とセッション参加
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        if (connectHandler) {
          connectHandler();
        }
      });

      act(() => {
        result.current.joinSession(sessionId);
      });

      // 再接続をシミュレート
      act(() => {
        const reconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        if (reconnectHandler) {
          reconnectHandler();
        }
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('join-session', sessionId);
    });
  });
});