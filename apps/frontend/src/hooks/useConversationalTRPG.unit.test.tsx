/**
 * useConversationalTRPG.unit.test.ts - 会話型TRPGフックの単体テスト
 * t-WADA命名規則に従い、本番型定義のみを使用
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ReactNode } from 'react';
import { useConversationalTRPG } from './useConversationalTRPG';
import { aiGameMasterAPI } from '../api/aiGameMaster';
import { aiProviderAtom, aiModelAtom } from '../store/atoms';
import { 
  createTestCharacter,
  createTestSessionState,
  createTestChatMessage
} from '@/tests/utils/test-data-factories';
import { Character, SessionState } from '@ai-agent-trpg/types';

// モック設定
vi.mock('../api/aiGameMaster', () => ({
  aiGameMasterAPI: {
    generatePlayerActionResponse: vi.fn(),
  },
}));

vi.mock('./useNotification', () => ({
  useNotification: () => ({
    showError: vi.fn(),
    showInfo: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

describe('useConversationalTRPG hook', () => {
  const mockPlayerCharacter = createTestCharacter({
    id: 'player-1',
    name: 'テストプレイヤー',
    type: 'pc'
  });

  const mockSessionState = createTestSessionState({
    id: 'test-session-1',
    chatLog: []
  });

  const mockCharacters = [mockPlayerCharacter];
  const mockOnSendMessage = vi.fn();
  const mockOnRollDice = vi.fn();

  const createWrapper = (initialValues?: { 
    provider?: string; 
    model?: string; 
  }) => {
    const { provider = 'openai', model = 'gpt-3.5-turbo' } = initialValues || {};
    
    return ({ children }: { children: ReactNode }) => (
      <RecoilRoot 
        initializeState={({ set }) => {
          set(aiProviderAtom, provider);
          set(aiModelAtom, model);
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
    it('初期状態が正しく設定される', () => {
      // Arrange & Act
      const { result } = renderHook(
        () => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          mockSessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.awaitingDiceRoll).toBe(false);
      expect(result.current.currentChallenge).toBeUndefined();
    });
  });

  describe('プレイヤーメッセージ処理', () => {
    it('アクションキーワードを含むメッセージでチャレンジが作成される', async () => {
      // Arrange
      const { result } = renderHook(
        () => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          mockSessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { wrapper: createWrapper() }
      );

      // Act
      await act(async () => {
        await result.current.processPlayerMessage('扉を調査する');
      });

      // Assert
      expect(result.current.awaitingDiceRoll).toBe(true);
      expect(result.current.currentChallenge).toBeDefined();
      expect(result.current.currentChallenge?.description).toBe('「扉を調査する」を試みます');
      expect(result.current.currentChallenge?.difficulty).toBe(15);
      
      expect(mockOnSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('【チャレンジ】「扉を調査する」を試みます'),
        'ic',
        'gm'
      );
    });

    it('チェック不要なメッセージでAI応答が生成される', async () => {
      // Arrange
      const mockAIResponse = {
        success: true,
        response: 'テストAI応答',
        metadata: {}
      };
      
      vi.mocked(aiGameMasterAPI.generatePlayerActionResponse).mockResolvedValue(mockAIResponse);

      const { result } = renderHook(
        () => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          mockSessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { wrapper: createWrapper() }
      );

      // Act
      await act(async () => {
        await result.current.processPlayerMessage('こんにちは、どんな冒険が待っているのですか？');
      });

      // Assert
      expect(aiGameMasterAPI.generatePlayerActionResponse).toHaveBeenCalledWith({
        sessionId: 'test-session-1',
        playerCharacterId: 'player-1',
        playerAction: 'こんにちは、どんな冒険が待っているのですか？',
        sessionContext: expect.any(Object),
        provider: 'openai',
        model: 'gpt-3.5-turbo',
      });
    });

    it('処理中は重複処理を防ぐ', async () => {
      // Arrange
      vi.mocked(aiGameMasterAPI.generatePlayerActionResponse).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, response: 'test', metadata: {} }), 100))
      );

      const { result } = renderHook(
        () => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          mockSessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { wrapper: createWrapper() }
      );

      // Act
      act(() => {
        result.current.processPlayerMessage('最初のメッセージ');
        result.current.processPlayerMessage('二番目のメッセージ');
      });

      // Assert
      await waitFor(() => {
        expect(aiGameMasterAPI.generatePlayerActionResponse).toHaveBeenCalledTimes(1);
      });
    });

    it('プレイヤーキャラクターが存在しない場合は処理しない', async () => {
      // Arrange
      const { result } = renderHook(
        () => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          null, // プレイヤーキャラクターなし
          mockSessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { wrapper: createWrapper() }
      );

      // Act
      await act(async () => {
        await result.current.processPlayerMessage('何かを調査する');
      });

      // Assert
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.awaitingDiceRoll).toBe(false);
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('AI応答生成時のエラーを適切に処理する', async () => {
      // Arrange
      const error = new Error('AI API接続エラー');
      vi.mocked(aiGameMasterAPI.generatePlayerActionResponse).mockRejectedValue(error);

      const { result } = renderHook(
        () => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          mockSessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { wrapper: createWrapper() }
      );

      // Act
      await act(async () => {
        await result.current.processPlayerMessage('普通の会話メッセージ');
      });

      // Assert
      expect(result.current.isProcessing).toBe(false);
      // エラーが適切に処理され、アプリケーションがクラッシュしないことを確認
    });
  });

  describe('ダイスロール処理', () => {
    it('成功したダイスロール結果を処理する', async () => {
      // Arrange
      const { result } = renderHook(
        () => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          mockSessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { wrapper: createWrapper() }
      );

      // チャレンジを設定
      await act(async () => {
        await result.current.processPlayerMessage('隠し扉を調査する');
      });

      // Act
      await act(async () => {
        await result.current.processDiceRoll(18, '1d20');
      });

      // Assert
      expect(mockOnSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('【結果】成功！'),
        'ic',
        'gm'
      );
      expect(mockOnSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('ロール: 18 vs 難易度 15'),
        'ic',
        'gm'
      );
      expect(result.current.awaitingDiceRoll).toBe(false);
      expect(result.current.isProcessing).toBe(false);
    });

    it('失敗したダイスロール結果を処理する', async () => {
      // Arrange
      const { result } = renderHook(
        () => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          mockSessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { wrapper: createWrapper() }
      );

      // チャレンジを設定
      await act(async () => {
        await result.current.processPlayerMessage('錠前を調べる');
      });

      // Act
      await act(async () => {
        await result.current.processDiceRoll(10, '1d20');
      });

      // Assert
      expect(mockOnSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('【結果】失敗...'),
        'ic',
        'gm'
      );
      expect(mockOnSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('ロール: 10 vs 難易度 15'),
        'ic',
        'gm'
      );
      expect(result.current.awaitingDiceRoll).toBe(false);
    });

    it('ダイスロール待ち状態でない場合は処理しない', async () => {
      // Arrange
      const { result } = renderHook(
        () => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          mockSessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { wrapper: createWrapper() }
      );

      // Act（ダイスロール待ち状態ではない）
      await act(async () => {
        await result.current.processDiceRoll(15, '1d20');
      });

      // Assert
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('ダイスロールをキャンセルできる', async () => {
      // Arrange
      const { result } = renderHook(
        () => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          mockSessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { wrapper: createWrapper() }
      );

      // チャレンジを設定
      await act(async () => {
        await result.current.processPlayerMessage('宝箱を調査する');
      });

      expect(result.current.awaitingDiceRoll).toBe(true);

      // Act
      act(() => {
        result.current.cancelDiceRoll();
      });

      // Assert
      expect(result.current.awaitingDiceRoll).toBe(false);
      expect(result.current.currentChallenge).toBeUndefined();
    });
  });

  describe('チャットログ監視', () => {
    it('チャットログのダイスロールメッセージを自動検出する', async () => {
      // Arrange
      const diceMessage = createTestChatMessage({
        id: 'dice-msg-1',
        type: 'dice',
        characterId: 'player-1',
        message: '1d20+3のロール結果: 17 (14+3)',
        timestamp: new Date().toISOString()
      });

      const sessionWithDiceRoll = createTestSessionState({
        ...mockSessionState,
        chatLog: [diceMessage]
      });

      const { result, rerender } = renderHook(
        ({ sessionState }) => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          sessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { 
          wrapper: createWrapper(),
          initialProps: { sessionState: mockSessionState }
        }
      );

      // チャレンジを設定
      await act(async () => {
        await result.current.processPlayerMessage('古い扉を攻撃する');
      });

      // Act - セッション状態を更新してダイスロールメッセージを追加
      rerender({ sessionState: sessionWithDiceRoll });

      // Assert
      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith(
          expect.stringContaining('【結果】成功！'),
          'ic',
          'gm'
        );
      });
    });

    it('既に処理済みのダイスロールメッセージは再処理しない', async () => {
      // Arrange
      const diceMessage = createTestChatMessage({
        id: 'dice-msg-1',
        type: 'dice',
        characterId: 'player-1',
        message: '1d20のロール結果: 16',
        timestamp: new Date().toISOString()
      });

      const sessionWithDiceRoll = createTestSessionState({
        ...mockSessionState,
        chatLog: [diceMessage]
      });

      const { result, rerender } = renderHook(
        ({ sessionState }) => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          sessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { 
          wrapper: createWrapper(),
          initialProps: { sessionState: mockSessionState }
        }
      );

      // チャレンジを設定
      await act(async () => {
        await result.current.processPlayerMessage('魔法の謎を調べる');
      });

      // 最初の処理
      rerender({ sessionState: sessionWithDiceRoll });

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledTimes(2); // チャレンジ + 結果
      });

      // Act - 同じセッション状態で再レンダリング
      rerender({ sessionState: sessionWithDiceRoll });

      // Assert
      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledTimes(2); // 追加で呼ばれていない
      });
    });

    it('他のプレイヤーのダイスロールは処理しない', async () => {
      // Arrange
      const otherPlayerDiceMessage = createTestChatMessage({
        id: 'dice-msg-1',
        type: 'dice',
        characterId: 'other-player',
        message: '1d20のロール結果: 20',
        timestamp: new Date().toISOString()
      });

      const sessionWithOtherDiceRoll = createTestSessionState({
        ...mockSessionState,
        chatLog: [otherPlayerDiceMessage]
      });

      const { result, rerender } = renderHook(
        ({ sessionState }) => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          sessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { 
          wrapper: createWrapper(),
          initialProps: { sessionState: mockSessionState }
        }
      );

      // チャレンジを設定
      await act(async () => {
        await result.current.processPlayerMessage('秘密の通路を探す');
      });

      // Act - 他のプレイヤーのダイスロールメッセージを追加
      rerender({ sessionState: sessionWithOtherDiceRoll });

      // Assert
      await waitFor(() => {
        expect(result.current.awaitingDiceRoll).toBe(true); // まだダイスロール待ち
      });
    });
  });

  describe('各種アクションキーワード', () => {
    const actionKeywords = ['攻撃', '調査', '調べる', '探す', '説得', '交渉', '隠れる', '忍び寄る', 'ジャンプ', '登る'];

    actionKeywords.forEach(keyword => {
      it(`「${keyword}」キーワードでチャレンジが作成される`, async () => {
        // Arrange
        const { result } = renderHook(
          () => useConversationalTRPG(
            'test-session-1',
            'test-campaign-1',
            mockPlayerCharacter,
            mockSessionState,
            mockCharacters,
            mockOnSendMessage,
            mockOnRollDice
          ),
          { wrapper: createWrapper() }
        );

        // Act
        await act(async () => {
          await result.current.processPlayerMessage(`敵を${keyword}します`);
        });

        // Assert
        expect(result.current.awaitingDiceRoll).toBe(true);
        expect(result.current.currentChallenge).toBeDefined();
        expect(mockOnSendMessage).toHaveBeenCalledWith(
          expect.stringContaining('【チャレンジ】'),
          'ic',
          'gm'
        );
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('ダイスロール処理時のエラーを適切に処理する', async () => {
      // Arrange
      const { result } = renderHook(
        () => useConversationalTRPG(
          'test-session-1',
          'test-campaign-1',
          mockPlayerCharacter,
          mockSessionState,
          mockCharacters,
          mockOnSendMessage,
          mockOnRollDice
        ),
        { wrapper: createWrapper() }
      );

      // チャレンジを設定
      await act(async () => {
        await result.current.processPlayerMessage('難しい錠前を調べる');
      });

      // モックに例外を投げさせる
      mockOnSendMessage.mockImplementationOnce(() => {
        throw new Error('メッセージ送信エラー');
      });

      // Act
      await act(async () => {
        await result.current.processDiceRoll(15, '1d20');
      });

      // Assert
      expect(result.current.isProcessing).toBe(false);
      // エラーが適切に処理され、状態が正常に戻ることを確認
    });
  });
});