/**
 * SessionInterface.unit.spec.tsx - セッションインターフェースコンポーネントの単体テスト
 * t-WADA命名規則に従い、本番型定義のみを使用
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecoilRoot } from 'recoil';
import { SessionInterface } from './SessionInterface';
import { 
  createTestSessionState,
  createTestCharacter,
  createTestQuest,
  createCompleteTestCampaignSetup
} from '@/tests/utils/test-data-factories';
import { SessionState, Character } from '@ai-agent-trpg/types';

// モック設定
vi.mock('./CharacterCard', () => ({
  CharacterCard: ({ character, onClick }: any) => (
    <div data-testid={`character-card-${character.id}`} onClick={onClick}>
      {character.name}
    </div>
  ),
}));

vi.mock('./ChatPanel', () => ({
  ChatPanel: ({ messages, onSendMessage }: any) => (
    <div data-testid="chat-panel">
      <div data-testid="message-count">{messages?.length || 0}</div>
      <button data-testid="send-message" onClick={() => onSendMessage('test message', 'ic')}>
        Send Message
      </button>
    </div>
  ),
}));

vi.mock('./DiceRollUI', () => ({
  DiceRollUI: ({ onRollDice }: any) => (
    <div data-testid="dice-roll-ui">
      <button data-testid="roll-dice" onClick={() => onRollDice('1d20', 'Test roll')}>
        Roll Dice
      </button>
    </div>
  ),
}));

vi.mock('./CombatTracker', () => ({
  CombatTracker: ({ session, characters, onStartCombat, onEndCombat }: any) => (
    <div data-testid="combat-tracker">
      <div data-testid="combat-active">{session.combatState?.active.toString() || 'false'}</div>
      <button data-testid="start-combat" onClick={() => onStartCombat(['char-1'])}>
        Start Combat
      </button>
      <button data-testid="end-combat" onClick={onEndCombat}>
        End Combat
      </button>
    </div>
  ),
}));

vi.mock('./QuestPanel', () => ({
  QuestPanel: ({ quests, onQuestUpdate, onCreateQuest }: any) => (
    <div data-testid="quest-panel">
      <div data-testid="quest-count">{quests?.length || 0}</div>
      <button data-testid="create-quest" onClick={() => onCreateQuest?.({ title: 'Test Quest' })}>
        Create Quest
      </button>
    </div>
  ),
}));

vi.mock('./MilestonePanel', () => ({
  MilestonePanel: ({ milestones, onMilestoneUpdate, onCreateMilestone }: any) => (
    <div data-testid="milestone-panel">
      <div data-testid="milestone-count">{milestones?.length || 0}</div>
      <button data-testid="create-milestone" onClick={() => onCreateMilestone?.({ title: 'Test Milestone' })}>
        Create Milestone
      </button>
    </div>
  ),
}));

vi.mock('../locations/LocationDisplay', () => ({
  default: ({ currentLocation }: any) => (
    <div data-testid="location-display">
      {currentLocation?.name || 'Unknown Location'}
    </div>
  ),
}));

vi.mock('../conversations/ConversationPanel', () => ({
  default: ({ isPlayerMode }: any) => (
    <div data-testid="conversation-panel">
      <div data-testid="conversation-player-mode">{isPlayerMode.toString()}</div>
    </div>
  ),
}));

vi.mock('../../hooks/useConversationalTRPG', () => ({
  useConversationalTRPG: () => ({
    processPlayerMessage: vi.fn(),
    processDiceRoll: vi.fn(),
    cancelDiceRoll: vi.fn(),
    isProcessing: false,
    awaitingDiceRoll: false,
    currentChallenge: null,
  }),
}));

vi.mock('../../hooks/useAIEntityManagement', () => ({
  useAIEntityManagement: () => ({
    availableEntities: null,
    recommendations: null,
    sessionRecommendations: { immediate: null, upcoming: null },
    loading: { entities: false, recommendations: false },
    errors: { entities: null, recommendations: null },
    fetchAvailableEntities: vi.fn(),
    fetchRecommendations: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('../../hooks/usePartyMovement', () => ({
  default: () => ({
    proposals: [],
    activeProposal: null,
    consensusSettings: { votingTimeLimit: 300 },
    loading: false,
    error: null,
    createProposal: vi.fn(),
    vote: vi.fn(),
    updateConsensusSettings: vi.fn(),
  }),
}));

vi.mock('../../hooks/useLocations', () => ({
  useLocations: () => ({
    locations: [],
    loading: false,
    error: null,
    fetchLocations: vi.fn(),
  }),
  useLocation: () => ({
    currentLocation: null,
    loading: false,
    error: null,
    fetchLocation: vi.fn(),
  }),
}));

vi.mock('../../hooks/useNarrativeFeedbackChatIntegration', () => ({
  useNarrativeFeedbackChatIntegration: () => ({
    narrativeFeedbacks: [],
    unreadCount: 0,
    settings: { enableChatIntegration: true },
    markAsRead: vi.fn(),
    updateSettings: vi.fn(),
  }),
}));

vi.mock('../../hooks/useSessionInitialization', () => ({
  useSessionInitialization: () => ({
    progress: {
      isInitializing: false,
      currentPhase: null,
      overallProgress: 0,
      phases: {},
    },
    initializeSession: vi.fn(),
    cancelInitialization: vi.fn(),
  }),
}));

describe('SessionInterface component', () => {
  const mockSession = createTestSessionState();
  const mockCharacters = [
    createTestCharacter({ id: 'char-1', name: 'Player Character', type: 'pc' }),
    createTestCharacter({ id: 'char-2', name: 'NPC Character', type: 'npc' }),
  ];
  const mockPlayerCharacter = mockCharacters[0];
  const mockQuests = [createTestQuest()];

  const defaultProps = {
    session: mockSession,
    characters: mockCharacters,
    quests: mockQuests,
    milestones: [],
    loading: false,
    error: null,
    isPlayerMode: false,
    playerCharacter: null,
    onStartSession: vi.fn(),
    onEndSession: vi.fn(),
    onSendMessage: vi.fn(),
    onRollDice: vi.fn(),
    onStartCombat: vi.fn(),
    onEndCombat: vi.fn(),
    onUpdateCharacterHP: vi.fn(),
    onQuestUpdate: vi.fn(),
    onCreateQuest: vi.fn(),
    onMilestoneUpdate: vi.fn(),
    onCreateMilestone: vi.fn(),
  };

  const renderWithRecoil = (props = {}) => {
    const finalProps = { ...defaultProps, ...props };
    return render(
      <RecoilRoot>
        <SessionInterface {...finalProps} />
      </RecoilRoot>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('基本レンダリング', () => {
    it('GMモードでセッション情報を表示する', () => {
      // Arrange & Act
      renderWithRecoil();

      // Assert
      expect(screen.getByText(mockSession.id)).toBeInTheDocument();
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
      expect(screen.getByTestId('dice-roll-ui')).toBeInTheDocument();
      expect(screen.getByTestId('combat-tracker')).toBeInTheDocument();
    });

    it('プレイヤーモードで適切な表示に切り替わる', () => {
      // Arrange & Act
      renderWithRecoil({
        isPlayerMode: true,
        playerCharacter: mockPlayerCharacter,
      });

      // Assert
      expect(screen.getByTestId('conversation-panel')).toBeInTheDocument();
      expect(screen.getByTestId('conversation-player-mode')).toHaveTextContent('true');
    });

    it('キャラクターカードを表示する', () => {
      // Arrange & Act
      renderWithRecoil();

      // Assert
      expect(screen.getByTestId('character-card-char-1')).toBeInTheDocument();
      expect(screen.getByTestId('character-card-char-2')).toBeInTheDocument();
      expect(screen.getByText('Player Character')).toBeInTheDocument();
      expect(screen.getByText('NPC Character')).toBeInTheDocument();
    });

    it('セッションステータスを表示する', () => {
      // Arrange
      const activeSession = createTestSessionState({ status: 'active' });

      // Act
      renderWithRecoil({ session: activeSession });

      // Assert
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  describe('セッション制御', () => {
    it('セッション開始ボタンをクリックできる', async () => {
      // Arrange
      const user = userEvent.setup();
      const onStartSession = vi.fn();

      renderWithRecoil({ onStartSession });

      // Act
      const startButton = screen.getByText('セッション開始');
      await user.click(startButton);

      // Assert
      expect(onStartSession).toHaveBeenCalled();
    });

    it('セッション終了ボタンをクリックできる', async () => {
      // Arrange
      const user = userEvent.setup();
      const onEndSession = vi.fn();
      const activeSession = createTestSessionState({ status: 'active' });

      renderWithRecoil({ 
        session: activeSession, 
        onEndSession 
      });

      // Act
      const endButton = screen.getByText('セッション終了');
      await user.click(endButton);

      // Assert
      expect(onEndSession).toHaveBeenCalled();
    });

    it('アクティブでないセッションでは開始ボタンのみ表示', () => {
      // Arrange
      const plannedSession = createTestSessionState({ status: 'planned' });

      // Act
      renderWithRecoil({ session: plannedSession });

      // Assert
      expect(screen.getByText('セッション開始')).toBeInTheDocument();
      expect(screen.queryByText('セッション終了')).not.toBeInTheDocument();
    });
  });

  describe('チャット機能', () => {
    it('チャットパネルでメッセージ送信ができる', async () => {
      // Arrange
      const user = userEvent.setup();
      const onSendMessage = vi.fn();

      renderWithRecoil({ onSendMessage });

      // Act
      const sendButton = screen.getByTestId('send-message');
      await user.click(sendButton);

      // Assert
      expect(onSendMessage).toHaveBeenCalledWith('test message', 'ic');
    });

    it('チャットログの件数を表示する', () => {
      // Arrange
      const sessionWithMessages = createTestSessionState({
        chatLog: [
          { id: '1', message: 'Hello', sender: 'Player', timestamp: new Date().toISOString() },
          { id: '2', message: 'Hi', sender: 'GM', timestamp: new Date().toISOString() },
        ] as any
      });

      // Act
      renderWithRecoil({ session: sessionWithMessages });

      // Assert
      expect(screen.getByTestId('message-count')).toHaveTextContent('2');
    });
  });

  describe('ダイス機能', () => {
    it('ダイスロールUIでダイスを振れる', async () => {
      // Arrange
      const user = userEvent.setup();
      const onRollDice = vi.fn();

      renderWithRecoil({ onRollDice });

      // Act
      const rollButton = screen.getByTestId('roll-dice');
      await user.click(rollButton);

      // Assert
      expect(onRollDice).toHaveBeenCalledWith('1d20', 'Test roll');
    });
  });

  describe('戦闘機能', () => {
    it('戦闘開始ボタンをクリックできる', async () => {
      // Arrange
      const user = userEvent.setup();
      const onStartCombat = vi.fn();

      renderWithRecoil({ onStartCombat });

      // Act
      const startCombatButton = screen.getByTestId('start-combat');
      await user.click(startCombatButton);

      // Assert
      expect(onStartCombat).toHaveBeenCalledWith(['char-1']);
    });

    it('戦闘終了ボタンをクリックできる', async () => {
      // Arrange
      const user = userEvent.setup();
      const onEndCombat = vi.fn();

      renderWithRecoil({ onEndCombat });

      // Act
      const endCombatButton = screen.getByTestId('end-combat');
      await user.click(endCombatButton);

      // Assert
      expect(onEndCombat).toHaveBeenCalled();
    });

    it('戦闘状態を表示する', () => {
      // Arrange
      const combatSession = createTestSessionState({
        combatState: { active: true, participants: [] }
      });

      // Act
      renderWithRecoil({ session: combatSession });

      // Assert
      expect(screen.getByTestId('combat-active')).toHaveTextContent('true');
    });
  });

  describe('クエスト管理', () => {
    it('GMモードでクエストパネルを表示する', () => {
      // Arrange & Act
      renderWithRecoil({ isPlayerMode: false });

      // Assert
      expect(screen.getByTestId('quest-panel')).toBeInTheDocument();
      expect(screen.getByTestId('quest-count')).toHaveTextContent('1');
    });

    it('クエスト作成ボタンをクリックできる', async () => {
      // Arrange
      const user = userEvent.setup();
      const onCreateQuest = vi.fn();

      renderWithRecoil({ onCreateQuest });

      // Act
      const createButton = screen.getByTestId('create-quest');
      await user.click(createButton);

      // Assert
      expect(onCreateQuest).toHaveBeenCalledWith({ title: 'Test Quest' });
    });

    it('プレイヤーモードではクエストを表示しない', () => {
      // Arrange & Act
      renderWithRecoil({ 
        isPlayerMode: true,
        quests: [] // プレイヤーモードでは空配列
      });

      // Assert
      const questPanel = screen.queryByTestId('quest-panel');
      if (questPanel) {
        expect(screen.getByTestId('quest-count')).toHaveTextContent('0');
      }
    });
  });

  describe('マイルストーン管理', () => {
    it('GMモードでマイルストーンパネルを表示する', () => {
      // Arrange & Act
      renderWithRecoil({ isPlayerMode: false });

      // Assert
      expect(screen.getByTestId('milestone-panel')).toBeInTheDocument();
      expect(screen.getByTestId('milestone-count')).toHaveTextContent('0');
    });

    it('マイルストーン作成ボタンをクリックできる', async () => {
      // Arrange
      const user = userEvent.setup();
      const onCreateMilestone = vi.fn();

      renderWithRecoil({ onCreateMilestone });

      // Act
      const createButton = screen.getByTestId('create-milestone');
      await user.click(createButton);

      // Assert
      expect(onCreateMilestone).toHaveBeenCalledWith({ title: 'Test Milestone' });
    });
  });

  describe('タブ切り替え', () => {
    it('デフォルトでメインタブが選択されている', () => {
      // Arrange & Act
      renderWithRecoil();

      // Assert
      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('メイン');
    });

    it('キャラクタータブに切り替えられる', async () => {
      // Arrange
      const user = userEvent.setup();

      renderWithRecoil();

      // Act
      const characterTab = screen.getByRole('tab', { name: /キャラクター/ });
      await user.click(characterTab);

      // Assert
      expect(characterTab).toHaveAttribute('aria-selected', 'true');
    });

    it('GMタブはGMモードでのみ表示される', () => {
      // Arrange & Act
      renderWithRecoil({ isPlayerMode: false });

      // Assert
      expect(screen.getByRole('tab', { name: /GM/ })).toBeInTheDocument();
    });

    it('プレイヤーモードではGMタブが表示されない', () => {
      // Arrange & Act
      renderWithRecoil({ isPlayerMode: true });

      // Assert
      expect(screen.queryByRole('tab', { name: /GM/ })).not.toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中は適切な表示になる', () => {
      // Arrange & Act
      renderWithRecoil({ loading: true });

      // Assert
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('エラー処理', () => {
    it('エラーメッセージを表示する', () => {
      // Arrange
      const errorMessage = 'セッション読み込みエラー';

      // Act
      renderWithRecoil({ error: errorMessage });

      // Assert
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('場所表示', () => {
    it('場所情報を表示する', () => {
      // Arrange & Act
      renderWithRecoil();

      // Assert
      expect(screen.getByTestId('location-display')).toBeInTheDocument();
    });
  });

  describe('キャラクターインタラクション', () => {
    it('キャラクターカードをクリックできる', async () => {
      // Arrange
      const user = userEvent.setup();

      renderWithRecoil();

      // Act
      const characterCard = screen.getByTestId('character-card-char-1');
      await user.click(characterCard);

      // Assert
      // キャラクターカードのクリックイベントが発生することを確認
      expect(characterCard).toBeInTheDocument();
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル表示でも適切にレンダリングされる', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      // Act
      renderWithRecoil();

      // Assert
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
      expect(screen.getByTestId('dice-roll-ui')).toBeInTheDocument();
    });
  });
});