/**
 * useSession.unit.test.tsx - useSessionフックの単体テスト
 * t-WADA命名規則に従い、本番型定義のみを使用
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ReactNode } from 'react';
import { useSession } from './useSession';
import { sessionAPI, characterAPI } from '@/api';
import { aiGameMasterAPI } from '@/api/aiGameMaster';
import { 
  createTestSession, 
  createTestSessionState, 
  createTestCharacter,
  createTestChatMessage,
  createTestDiceRoll
} from '@/tests/utils/test-data-factories';
import { SessionState, Character } from '@ai-agent-trpg/types';

// モック設定
vi.mock('@/api', () => ({
  sessionAPI: {
    getSessionById: vi.fn(),
    createSession: vi.fn(),
    createMockSession: vi.fn(),
    updateSessionStatus: vi.fn(),
    sendChatMessage: vi.fn(),
    rollDice: vi.fn(),
    startCombat: vi.fn(),
    endCombat: vi.fn(),
    pollSession: vi.fn(),
  },
  characterAPI: {
    getCharactersByCampaign: vi.fn(),
  },
}));

vi.mock('@/api/aiGameMaster', () => ({
  aiGameMasterAPI: {
    generateGameOverview: vi.fn(),
    generatePlayerActionResponse: vi.fn(),
  },
}));

vi.mock('@/components/common/NotificationProvider', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

vi.mock('./useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    joinSession: vi.fn(),
    leaveSession: vi.fn(),
    onCompanionMessage: vi.fn(),
    onPlayerAction: vi.fn(),
    onChatMessage: vi.fn(),
  }),
}));

describe('useSession hook', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RecoilRoot>{children}</RecoilRoot>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('初期化処理', () => {
    it('既存セッションを正常に読み込むことができる', async () => {
      // Arrange
      const mockSession = createTestSessionState();
      const mockCharacters = [
        createTestCharacter({ id: 'char-1', name: 'テストキャラ1' }),
        createTestCharacter({ id: 'char-2', name: 'テストキャラ2' }),
      ];
      
      vi.mocked(sessionAPI.getSessionById).mockResolvedValue(mockSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue(mockCharacters);

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1' 
        }),
        { wrapper }
      );

      // Assert
      expect(result.current.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.characters).toEqual(mockCharacters);
        expect(result.current.error).toBeNull();
      });
      
      expect(sessionAPI.getSessionById).toHaveBeenCalledWith('test-session-1');
      expect(characterAPI.getCharactersByCampaign).toHaveBeenCalledWith('test-campaign-1');
    });

    it('新規セッションを正常に作成できる', async () => {
      // Arrange
      const mockNewSession = createTestSessionState({ id: 'new-session-1' });
      const mockCharacters = [createTestCharacter()];
      
      vi.mocked(sessionAPI.createMockSession).mockReturnValue(mockNewSession);
      vi.mocked(sessionAPI.createSession).mockResolvedValue(mockNewSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue(mockCharacters);

      // Act
      const { result } = renderHook(
        () => useSession({ campaignId: 'test-campaign-1' }),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.session).toEqual(mockNewSession);
        expect(sessionAPI.createMockSession).toHaveBeenCalledWith('test-campaign-1');
        expect(sessionAPI.createSession).toHaveBeenCalledWith(mockNewSession);
      });
    });

    it('初期化エラーを適切にハンドリングする', async () => {
      // Arrange
      const error = new Error('セッション読み込みエラー');
      vi.mocked(sessionAPI.getSessionById).mockRejectedValue(error);

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1' 
        }),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.session).toBeNull();
        expect(result.current.error).toBe('セッション読み込みエラー');
      });
    });
  });

  describe('セッション管理アクション', () => {
    it('セッションを正常に開始できる', async () => {
      // Arrange
      const mockSession = createTestSessionState({ status: 'planned' });
      const updatedSession = { ...mockSession, status: 'active' as const };
      const mockCharacters = [createTestCharacter()];
      
      vi.mocked(sessionAPI.getSessionById).mockResolvedValue(mockSession);
      vi.mocked(sessionAPI.updateSessionStatus).mockResolvedValue(updatedSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue(mockCharacters);

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1' 
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.actions.startSession();
      });

      // Assert
      expect(sessionAPI.updateSessionStatus).toHaveBeenCalledWith(
        'test-session-1',
        'active',
        undefined
      );
      expect(result.current.session?.status).toBe('active');
    });

    it('セッションを正常に終了できる', async () => {
      // Arrange
      const mockSession = createTestSessionState({ status: 'active' });
      const updatedSession = { ...mockSession, status: 'completed' as const };
      
      vi.mocked(sessionAPI.getSessionById).mockResolvedValue(mockSession);
      vi.mocked(sessionAPI.updateSessionStatus).mockResolvedValue(updatedSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue([]);

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1' 
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.actions.endSession();
      });

      // Assert
      expect(sessionAPI.updateSessionStatus).toHaveBeenCalledWith(
        'test-session-1',
        'completed'
      );
      expect(result.current.session?.status).toBe('completed');
    });
  });

  describe('チャット機能', () => {
    it('チャットメッセージを送信できる', async () => {
      // Arrange
      const mockSession = createTestSessionState();
      const mockCharacter = createTestCharacter({ id: 'char-1', name: 'テストキャラ' });
      const updatedSession = {
        ...mockSession,
        chatLog: [...mockSession.chatLog, createTestChatMessage()]
      };
      
      vi.mocked(sessionAPI.getSessionById).mockResolvedValue(mockSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue([mockCharacter]);
      vi.mocked(sessionAPI.sendChatMessage).mockResolvedValue(updatedSession);

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1' 
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.actions.sendMessage('テストメッセージ', 'ic', 'char-1');
      });

      // Assert
      expect(sessionAPI.sendChatMessage).toHaveBeenCalledWith(
        'test-session-1',
        expect.objectContaining({
          speaker: 'テストキャラ',
          characterId: 'char-1',
          message: 'テストメッセージ',
          type: 'ic',
        })
      );
    });

    it('プレイヤーモードでIC発言時にAI応答を生成する', async () => {
      // Arrange
      const mockSession = createTestSessionState();
      const mockPlayerCharacter = createTestCharacter({ id: 'player-1', name: 'プレイヤーキャラ' });
      const updatedSession = { ...mockSession };
      
      vi.mocked(sessionAPI.getSessionById).mockResolvedValue(mockSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue([mockPlayerCharacter]);
      vi.mocked(sessionAPI.sendChatMessage).mockResolvedValue(updatedSession);
      vi.mocked(aiGameMasterAPI.generatePlayerActionResponse).mockResolvedValue({} as any);

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1',
          isPlayerMode: true,
          playerCharacter: mockPlayerCharacter
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.actions.sendMessage('探索を開始する', 'ic', 'player-1');
      });

      // Assert
      await waitFor(() => {
        expect(aiGameMasterAPI.generatePlayerActionResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: 'test-session-1',
            playerCharacterId: 'player-1',
            playerAction: '探索を開始する',
          })
        );
      });
    });
  });

  describe('ダイスロール機能', () => {
    it('ダイスロールを実行できる', async () => {
      // Arrange
      const mockSession = createTestSessionState();
      const mockCharacter = createTestCharacter({ id: 'char-1', name: 'テストキャラ' });
      const diceRoll = createTestDiceRoll({ characterId: 'char-1' });
      const updatedSession = {
        ...mockSession,
        diceLog: [...mockSession.diceLog, diceRoll]
      };
      
      vi.mocked(sessionAPI.getSessionById).mockResolvedValue(mockSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue([mockCharacter]);
      vi.mocked(sessionAPI.rollDice).mockResolvedValue(updatedSession);

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1' 
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.actions.rollDice('1d20', '調査判定', 'char-1');
      });

      // Assert
      expect(sessionAPI.rollDice).toHaveBeenCalledWith(
        'test-session-1',
        expect.objectContaining({
          roller: 'テストキャラ',
          characterId: 'char-1',
          dice: '1d20',
          purpose: '調査判定',
        })
      );
    });
  });

  describe('戦闘管理', () => {
    it('戦闘を開始できる', async () => {
      // Arrange
      const mockSession = createTestSessionState();
      const mockCharacters = [
        createTestCharacter({ 
          id: 'char-1', 
          derivedStats: { initiative: 2 } as any 
        }),
        createTestCharacter({ 
          id: 'char-2', 
          derivedStats: { initiative: 3 } as any 
        }),
      ];
      const updatedSession = { 
        ...mockSession, 
        combatState: { active: true, participants: [] } 
      };
      
      vi.mocked(sessionAPI.getSessionById).mockResolvedValue(mockSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue(mockCharacters);
      vi.mocked(sessionAPI.startCombat).mockResolvedValue(updatedSession);

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1' 
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.actions.startCombat(['char-1', 'char-2']);
      });

      // Assert
      expect(sessionAPI.startCombat).toHaveBeenCalledWith(
        'test-session-1',
        expect.arrayContaining([
          expect.objectContaining({ characterId: 'char-1' }),
          expect.objectContaining({ characterId: 'char-2' }),
        ])
      );
    });

    it('戦闘を終了できる', async () => {
      // Arrange
      const mockSession = createTestSessionState({ 
        combatState: { active: true, participants: [] } 
      });
      const updatedSession = { ...mockSession, combatState: null };
      
      vi.mocked(sessionAPI.getSessionById).mockResolvedValue(mockSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue([]);
      vi.mocked(sessionAPI.endCombat).mockResolvedValue(updatedSession);

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1' 
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.actions.endCombat();
      });

      // Assert
      expect(sessionAPI.endCombat).toHaveBeenCalledWith('test-session-1');
    });
  });

  describe('WebSocket連携', () => {
    it('WebSocket接続時にセッションに参加する', async () => {
      // Arrange
      const mockSession = createTestSessionState();
      const mockWebSocket = {
        isConnected: true,
        joinSession: vi.fn(),
        leaveSession: vi.fn(),
        onCompanionMessage: vi.fn(),
        onPlayerAction: vi.fn(),
        onChatMessage: vi.fn(),
      };
      
      vi.mocked(sessionAPI.getSessionById).mockResolvedValue(mockSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue([]);
      
      // WebSocketモックを更新
      vi.doMock('./useWebSocket', () => ({
        useWebSocket: () => mockWebSocket,
      }));

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1' 
        }),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.wsConnected).toBe(true);
        expect(mockWebSocket.joinSession).toHaveBeenCalledWith('test-session-1');
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('セッション開始時のエラーを適切に処理する', async () => {
      // Arrange
      const mockSession = createTestSessionState();
      const error = new Error('ネットワークエラー');
      
      vi.mocked(sessionAPI.getSessionById).mockResolvedValue(mockSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue([]);
      vi.mocked(sessionAPI.updateSessionStatus).mockRejectedValue(error);

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1' 
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.actions.startSession();
      });

      // Assert
      // エラーが適切に処理され、アプリケーションがクラッシュしないことを確認
      expect(result.current.session?.status).not.toBe('active');
    });

    it('チャットメッセージ送信時のエラーを適切に処理する', async () => {
      // Arrange
      const mockSession = createTestSessionState();
      const error = new Error('送信エラー');
      
      vi.mocked(sessionAPI.getSessionById).mockResolvedValue(mockSession);
      vi.mocked(characterAPI.getCharactersByCampaign).mockResolvedValue([]);
      vi.mocked(sessionAPI.sendChatMessage).mockRejectedValue(error);

      // Act
      const { result } = renderHook(
        () => useSession({ 
          sessionId: 'test-session-1', 
          campaignId: 'test-campaign-1' 
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.actions.sendMessage('テストメッセージ');
      });

      // Assert
      // エラーが適切に処理され、セッション状態が変更されないことを確認
      expect(result.current.session).toEqual(mockSession);
    });
  });
});