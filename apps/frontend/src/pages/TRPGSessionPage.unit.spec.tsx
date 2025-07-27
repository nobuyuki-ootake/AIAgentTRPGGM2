/**
 * TRPGSessionPage.unit.spec.tsx - TRPGセッションページの単体テスト
 * t-WADA命名規則に従い、本番型定義のみを使用
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import TRPGSessionPage from './TRPGSessionPage';
import { useSession } from '@/hooks/useSession';
import { questAPI, milestoneAPI, campaignAPI } from '@/api';
import { currentCampaignAtom, appModeAtom, playerCharacterAtom } from '@/store/atoms';
import { 
  createTestCampaign,
  createTestSessionState,
  createTestCharacter,
  createTestQuest,
  createTestGMNotification
} from '@/tests/utils/test-data-factories';
import { TRPGCampaign, Character } from '@ai-agent-trpg/types';

// モック設定
vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/api', () => ({
  questAPI: {
    getQuestsByCampaign: vi.fn(),
    updateQuest: vi.fn(),
    createQuest: vi.fn(),
  },
  milestoneAPI: {
    getMilestonesByCampaign: vi.fn(),
    getProgressTracker: vi.fn(),
    getLevelUpEvents: vi.fn(),
    getCampaignCompletion: vi.fn(),
    updateMilestone: vi.fn(),
    createMilestone: vi.fn(),
  },
  campaignAPI: {
    getCampaignById: vi.fn(),
  },
}));

vi.mock('@/components/trpg-session/SessionInterface', () => ({
  SessionInterface: ({ session, characters, isPlayerMode, playerCharacter, onStartSession }: any) => (
    <div data-testid="session-interface">
      <div data-testid="session-id">{session?.id}</div>
      <div data-testid="characters-count">{characters?.length || 0}</div>
      <div data-testid="player-mode">{isPlayerMode.toString()}</div>
      <div data-testid="player-character">{playerCharacter?.name || 'none'}</div>
      <button data-testid="start-session" onClick={onStartSession}>セッション開始</button>
    </div>
  ),
}));

vi.mock('@/components/common/LoadingScreen', () => ({
  LoadingScreen: ({ message }: { message: string }) => (
    <div data-testid="loading-screen">{message}</div>
  ),
}));

describe('TRPGSessionPage component', () => {
  const mockCampaign = createTestCampaign();
  const mockSession = createTestSessionState();
  const mockPlayerCharacter = createTestCharacter({ type: 'pc', name: 'プレイヤーキャラ' });
  const mockCharacters = [mockPlayerCharacter];

  const mockUseSessionReturn = {
    session: mockSession,
    characters: mockCharacters,
    loading: false,
    error: null,
    actions: {
      startSession: vi.fn(),
      endSession: vi.fn(),
      sendMessage: vi.fn(),
      rollDice: vi.fn(),
      startCombat: vi.fn(),
      endCombat: vi.fn(),
    },
  };

  const createTestWrapper = (
    route = '/campaign/test-campaign-1/session/test-session-1',
    recoilInitialValues: {
      campaign?: TRPGCampaign | null;
      appMode?: 'standard' | 'developer' | 'user';
      playerCharacter?: Character | null;
    } = {}
  ) => {
    const {
      campaign = mockCampaign,
      appMode = 'developer',
      playerCharacter = null,
    } = recoilInitialValues;

    return ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={[route]}>
        <RecoilRoot
          initializeState={({ set }) => {
            set(currentCampaignAtom, campaign);
            set(appModeAtom, appMode);
            set(playerCharacterAtom, playerCharacter);
          }}
        >
          {children}
        </RecoilRoot>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue(mockUseSessionReturn);
    vi.mocked(campaignAPI.getCampaignById).mockResolvedValue(mockCampaign);
    vi.mocked(questAPI.getQuestsByCampaign).mockResolvedValue([]);
    vi.mocked(milestoneAPI.getMilestonesByCampaign).mockResolvedValue([]);
    vi.mocked(milestoneAPI.getProgressTracker).mockResolvedValue(null);
    vi.mocked(milestoneAPI.getLevelUpEvents).mockResolvedValue([]);
    vi.mocked(milestoneAPI.getCampaignCompletion).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('正常なレンダリング', () => {
    it('GMモードで正常にセッション画面を表示する', async () => {
      // Arrange & Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: mockCampaign,
          appMode: 'developer',
        }),
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('session-interface')).toBeInTheDocument();
        expect(screen.getByTestId('session-id')).toHaveTextContent(mockSession.id);
        expect(screen.getByTestId('characters-count')).toHaveTextContent('1');
        expect(screen.getByTestId('player-mode')).toHaveTextContent('false');
      });
    });

    it('プレイヤーモードでキャラクター選択済みの場合、正常にセッション画面を表示する', async () => {
      // Arrange & Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/play/test-session-1', {
          campaign: mockCampaign,
          appMode: 'user',
          playerCharacter: mockPlayerCharacter,
        }),
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('session-interface')).toBeInTheDocument();
        expect(screen.getByTestId('player-mode')).toHaveTextContent('true');
        expect(screen.getByTestId('player-character')).toHaveTextContent('プレイヤーキャラ');
      });
    });

    it('navigation stateからプレイヤーキャラクターを受け取れる', async () => {
      // Arrange
      const navigationCharacter = createTestCharacter({ name: 'ナビゲーションキャラ' });
      
      // Act
      render(<TRPGSessionPage />, {
        wrapper: ({ children }) => (
          <MemoryRouter 
            initialEntries={[{
              pathname: '/campaign/test-campaign-1/play/test-session-1',
              state: { selectedPlayerCharacter: navigationCharacter }
            }]}
          >
            <RecoilRoot
              initializeState={({ set }) => {
                set(currentCampaignAtom, mockCampaign);
                set(appModeAtom, 'user');
                set(playerCharacterAtom, null);
              }}
            >
              {children}
            </RecoilRoot>
          </MemoryRouter>
        ),
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('session-interface')).toBeInTheDocument();
        expect(screen.getByTestId('player-character')).toHaveTextContent('ナビゲーションキャラ');
      });
    });
  });

  describe('ローディング状態', () => {
    it('セッション読み込み中はローディング画面を表示する', () => {
      // Arrange
      vi.mocked(useSession).mockReturnValue({
        ...mockUseSessionReturn,
        loading: true,
      });

      // Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: mockCampaign,
        }),
      });

      // Assert
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
      expect(screen.getByTestId('loading-screen')).toHaveTextContent('セッションを準備中...');
    });

    it('キャンペーン読み込み中はローディング画面を表示する', () => {
      // Arrange - キャンペーンなしの状態
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: null, // キャンペーンが読み込まれていない
        }),
      });

      // Assert
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
      expect(screen.getByTestId('loading-screen')).toHaveTextContent('キャンペーンを読み込み中...');
    });

    it('セッションがnullの場合はローディング画面を表示する', () => {
      // Arrange
      vi.mocked(useSession).mockReturnValue({
        ...mockUseSessionReturn,
        session: null,
      });

      // Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: mockCampaign,
        }),
      });

      // Assert
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    });
  });

  describe('エラー処理', () => {
    it('useSessionからエラーが返された場合、エラー画面を表示する', () => {
      // Arrange
      const errorMessage = 'セッション読み込みエラー';
      vi.mocked(useSession).mockReturnValue({
        ...mockUseSessionReturn,
        error: errorMessage,
      });

      // Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: mockCampaign,
        }),
      });

      // Assert
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('再読み込み')).toBeInTheDocument();
    });

    it('プレイヤーモードでキャラクター未選択の場合、エラー画面を表示する', async () => {
      // Arrange & Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/play/test-session-1', {
          campaign: mockCampaign,
          appMode: 'user',
          playerCharacter: null, // キャラクター未選択
        }),
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('プレイヤーキャラクターが選択されていません')).toBeInTheDocument();
        expect(screen.getByText('キャラクター選択画面に戻る')).toBeInTheDocument();
      });
    });
  });

  describe('リダイレクト処理', () => {
    it('キャンペーンIDがない場合はNavigateコンポーネントが呼ばれる', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/session/test-session-1'), // キャンペーンIDなし
      });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('REDIRECT TRIGGERED: No Campaign ID')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('データ読み込み', () => {
    it('GMモードでキャンペーンデータを読み込む', async () => {
      // Arrange
      const mockQuests = [createTestQuest()];
      vi.mocked(questAPI.getQuestsByCampaign).mockResolvedValue(mockQuests);

      // Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: mockCampaign,
          appMode: 'developer',
        }),
      });

      // Assert
      await waitFor(() => {
        expect(questAPI.getQuestsByCampaign).toHaveBeenCalledWith('test-campaign-1');
        expect(milestoneAPI.getMilestonesByCampaign).toHaveBeenCalledWith('test-campaign-1');
      });
    });

    it('プレイヤーモードではクエストとマイルストーンを読み込まない', async () => {
      // Arrange & Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/play/test-session-1', {
          campaign: mockCampaign,
          appMode: 'user',
          playerCharacter: mockPlayerCharacter,
        }),
      });

      // Assert
      await waitFor(() => {
        expect(questAPI.getQuestsByCampaign).not.toHaveBeenCalled();
        expect(milestoneAPI.getMilestonesByCampaign).not.toHaveBeenCalled();
      });
    });

    it('キャンペーンが存在しない場合、APIから読み込む', async () => {
      // Arrange & Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: null, // キャンペーンなし
        }),
      });

      // Assert
      await waitFor(() => {
        expect(campaignAPI.getCampaignById).toHaveBeenCalledWith('test-campaign-1');
      });
    });
  });

  describe('useSessionフックとの連携', () => {
    it('useSessionフックに正しいパラメータを渡す', () => {
      // Arrange & Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: mockCampaign,
          appMode: 'user',
          playerCharacter: mockPlayerCharacter,
        }),
      });

      // Assert
      expect(useSession).toHaveBeenCalledWith({
        sessionId: 'test-session-1',
        campaignId: 'test-campaign-1',
        pollingInterval: 3000,
        isPlayerMode: true,
        playerCharacter: mockPlayerCharacter,
      });
    });

    it('GMモードの場合、isPlayerModeはfalseになる', () => {
      // Arrange & Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: mockCampaign,
          appMode: 'developer',
        }),
      });

      // Assert
      expect(useSession).toHaveBeenCalledWith({
        sessionId: 'test-session-1',
        campaignId: 'test-campaign-1',
        pollingInterval: 3000,
        isPlayerMode: false,
        playerCharacter: null,
      });
    });
  });

  describe('SessionInterfaceとの連携', () => {
    it('SessionInterfaceに正しいpropsを渡す', async () => {
      // Arrange & Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: mockCampaign,
          appMode: 'developer',
        }),
      });

      // Assert
      await waitFor(() => {
        const sessionInterface = screen.getByTestId('session-interface');
        expect(sessionInterface).toBeInTheDocument();
        
        // データの確認
        expect(screen.getByTestId('session-id')).toHaveTextContent(mockSession.id);
        expect(screen.getByTestId('characters-count')).toHaveTextContent('1');
        expect(screen.getByTestId('player-mode')).toHaveTextContent('false');
      });
    });

    it('プレイヤーモードではクエストとマイルストーンを渡さない', async () => {
      // Arrange & Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/play/test-session-1', {
          campaign: mockCampaign,
          appMode: 'user',
          playerCharacter: mockPlayerCharacter,
        }),
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('player-mode')).toHaveTextContent('true');
        // プレイヤーモードでは、クエストとマイルストーンは空配列
      });
    });
  });

  describe('ユーザーインタラクション', () => {
    it('セッション開始ボタンをクリックできる', async () => {
      // Arrange
      const user = userEvent.setup();
      
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: mockCampaign,
          appMode: 'developer',
        }),
      });

      await waitFor(() => {
        expect(screen.getByTestId('session-interface')).toBeInTheDocument();
      });

      // Act
      const startButton = screen.getByTestId('start-session');
      await user.click(startButton);

      // Assert
      expect(mockUseSessionReturn.actions.startSession).toHaveBeenCalled();
    });

    it('エラー画面の再読み込みボタンをクリックできる', async () => {
      // Arrange
      const user = userEvent.setup();
      const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
      
      vi.mocked(useSession).mockReturnValue({
        ...mockUseSessionReturn,
        error: 'テストエラー',
      });

      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/test-campaign-1/session/test-session-1', {
          campaign: mockCampaign,
        }),
      });

      // Act
      const reloadButton = screen.getByText('再読み込み');
      await user.click(reloadButton);

      // Assert
      expect(reloadSpy).toHaveBeenCalled();
      
      reloadSpy.mockRestore();
    });
  });

  describe('パラメータ解析', () => {
    it('GMモードのURLパラメータを正しく解析する', () => {
      // Arrange & Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/campaign-123/session/session-456', {
          campaign: { ...mockCampaign, id: 'campaign-123' },
          appMode: 'developer',
        }),
      });

      // Assert
      expect(useSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-456',
          campaignId: 'campaign-123',
        })
      );
    });

    it('プレイヤーモードのURLパラメータを正しく解析する', () => {
      // Arrange & Act
      render(<TRPGSessionPage />, {
        wrapper: createTestWrapper('/campaign/campaign-abc/play/session-def', {
          campaign: { ...mockCampaign, id: 'campaign-abc' },
          appMode: 'user',
          playerCharacter: mockPlayerCharacter,
        }),
      });

      // Assert
      expect(useSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-def',
          campaignId: 'campaign-abc',
        })
      );
    });
  });
});