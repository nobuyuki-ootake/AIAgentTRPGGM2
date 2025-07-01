import React, { useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrowRounded,
  PauseRounded,
  StopRounded,
  GroupRounded,
  CasinoRounded,
  SecurityRounded,
  AssistantRounded,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Assignment as QuestIcon,
  Flag as MilestoneIcon,
  AccessTime as TimeIcon,
  RefreshRounded,
  Search as SearchIcon,
} from '@mui/icons-material';
import { SessionState, Character, Quest, Milestone, ProgressTracker, LevelUpEvent, CampaignCompletion, ID, SessionDurationConfig, PartyLocation } from '@ai-agent-trpg/types';
import { CharacterCard } from './CharacterCard';
import { ChatPanel } from './ChatPanel';
import { DiceRollUI } from './DiceRollUI';
import { CombatTracker } from './CombatTracker';
import { EventPanel } from './EventPanel';
import { AIControlPanel } from './AIControlPanel';
import { AIGameMasterPanel } from './AIGameMasterPanel';
import { QuestPanel } from './QuestPanel';
import { MilestonePanel } from './MilestonePanel';
import LocationDisplay from '../locations/LocationDisplay';
import CharacterMovement from '../locations/CharacterMovement';
import ConversationPanel from '../conversations/ConversationPanel';
import { ExplorationActionPanel } from '../exploration/ExplorationActionPanel';
import { LocationEntityDisplay } from '../locations/LocationEntityDisplay';
import { PartyMovementDialog } from '../party-movement/PartyMovementDialog';
import { useLocations, useLocation } from '../../hooks/useLocations';
import { SessionDurationDialog } from './SessionDurationDialog';
import { TimeManagementPanel } from './TimeManagementPanel';
import { timeManagementAPI } from '../../api/timeManagement';
import { aiGameMasterAPI, SessionInitializationResult } from '../../api/aiGameMaster';
import { aiAgentAPI } from '../../api/aiAgent';
import { useConversationalTRPG } from '../../hooks/useConversationalTRPG';
import { useAIEntityManagement } from '../../hooks/useAIEntityManagement';
import usePartyMovement from '../../hooks/usePartyMovement';

interface SessionInterfaceProps {
  session: SessionState;
  characters: Character[];
  quests?: Quest[];
  milestones?: Milestone[];
  progressTracker?: ProgressTracker;
  recentLevelUps?: LevelUpEvent[];
  campaignCompletion?: CampaignCompletion;
  loading: boolean;
  error: string | null;
  isPlayerMode?: boolean;
  playerCharacter?: Character | null;
  onStartSession: (config?: SessionDurationConfig) => void;
  onEndSession: () => void;
  onSendMessage: (message: string, type: 'ic' | 'ooc', characterId?: string) => void;
  onRollDice: (dice: string, purpose: string, characterId?: string) => void;
  onStartCombat: (participantIds: string[]) => void;
  onEndCombat: () => void;
  onUpdateCharacterHP?: (characterId: string, newHP: number) => void;
  onQuestUpdate?: (questId: ID, updates: Partial<Quest>) => void;
  onCreateQuest?: (questData: Partial<Quest>) => void;
  onMilestoneUpdate?: (milestoneId: ID, updates: Partial<Milestone>) => void;
  onCreateMilestone?: (milestoneData: Partial<Milestone>) => void;
}

export const SessionInterface: React.FC<SessionInterfaceProps> = ({
  session,
  characters,
  quests = [],
  milestones = [],
  progressTracker,
  recentLevelUps = [],
  campaignCompletion,
  loading,
  error,
  isPlayerMode = false,
  playerCharacter,
  onStartSession,
  onEndSession,
  onSendMessage,
  onRollDice,
  onStartCombat,
  onEndCombat,
  onUpdateCharacterHP,
  onQuestUpdate,
  onCreateQuest,
  onMilestoneUpdate,
  onCreateMilestone,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [hpDialogOpen, setHpDialogOpen] = useState(false);
  const [hpDialogMode, setHpDialogMode] = useState<'heal' | 'damage'>('damage');
  const [hpAmount, setHpAmount] = useState('');
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [characterToMove, setCharacterToMove] = useState<Character | null>(null);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [durationDialogOpen, setDurationDialogOpen] = useState(false);
  const [partyMovementDialogOpen, setPartyMovementDialogOpen] = useState(false);
  
  // セッション初期化状態
  const [isInitializing, setIsInitializing] = useState(false);
  const [, setInitializationResult] = useState<SessionInitializationResult | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [lastDurationConfig, setLastDurationConfig] = useState<SessionDurationConfig | null>(null);
  
  // 時間管理状態
  const [turnState, setTurnState] = useState<any>(null);
  const [currentDay, setCurrentDay] = useState<any>(null);
  const [, setTimeManagementLoading] = useState(false);

  // パーティ位置管理状態
  const [partyLocation, setPartyLocation] = useState<PartyLocation>({
    sessionId: session.id,
    currentLocationId: session.partyLocation?.currentLocationId || 'starting_location',
    memberIds: characters.map(c => c.id),
    lastMoveTime: new Date().toISOString(),
    movementHistory: []
  });
  const [isAIControlActive, setIsAIControlActive] = useState(false);

  // パーティ移動システム
  const partyMovement = usePartyMovement({
    sessionId: session.id,
    autoRefresh: session.status === 'active',
    refreshInterval: 10000 // 10秒間隔で自動更新
  });

  // 会話ベースのTRPGフック
  const {
    processPlayerMessage,
    processDiceRoll: _processDiceRoll,
    isProcessing: _isProcessingMessage,
    awaitingDiceRoll,
    currentChallenge,
  } = useConversationalTRPG(
    session.id,
    session.campaignId,
    playerCharacter || null,
    session,
    characters,
    onSendMessage,
    onRollDice
  );

  // AIエンティティ管理フック
  const aiEntityManagement = useAIEntityManagement({
    autoRefresh: session.status === 'active',
    refreshInterval: 45000, // 45秒間隔で自動更新
    enableCache: true,
    debug: false // 開発環境でのデバッグログ
  });


  // Default progress tracker when not provided
  const defaultProgressTracker: ProgressTracker = progressTracker || ({
    id: 'default',
    campaignId: session.campaignId,
    overallProgress: {
      totalMilestones: milestones.length,
      completedMilestones: milestones.filter(m => m.status === 'completed').length,
      estimatedCompletion: milestones.length > 0 ? Math.round((milestones.filter(m => m.status === 'completed').length / milestones.length) * 100) : 0,
      experienceGained: 0,
      totalExperience: 0,
    },
    categoryProgress: {
      combat: { completed: 0, total: 0, progress: 0 },
      exploration: { completed: 0, total: 0, progress: 0 },
      social: { completed: 0, total: 0, progress: 0 },
      story: { completed: 0, total: 0, progress: 0 },
      character: { completed: 0, total: 0, progress: 0 },
      custom: { completed: 0, total: 0, progress: 0 },
    },
    recentAchievements: [],
    statistics: {
      averageCompletionTime: 0,
      preferredCategory: 'story',
      completionRate: 0,
      totalPlayTime: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    upcomingMilestones: [],
  } as ProgressTracker);

  // Default campaign completion
  const defaultCampaignCompletion: CampaignCompletion = campaignCompletion || ({
    id: 'default',
    campaignId: session.campaignId,
    completionType: 'success',
    completionDate: new Date().toISOString(),
    finalStatistics: {
      totalPlayTime: 0,
      sessionsPlayed: 0,
      milestonesCompleted: 0,
      questsCompleted: 0,
      charactersLost: 0,
      finalCharacterLevels: {},
    },
    achievements: [],
    isCompleted: false,
    completionPercentage: 0,
    winConditions: [],
    failConditions: [],
    availableEndings: [],
  } as CampaignCompletion);

  // Location management hooks
  const { locations } = useLocations({ limit: 50 });
  const { location: currentLocation, charactersInLocation } = useLocation(currentLocationId);

  // Initialize current location from first character that has a location
  React.useEffect(() => {
    if (!currentLocationId && characters.length > 0) {
      const characterWithLocation = characters.find(c => c.currentLocationId);
      if (characterWithLocation?.currentLocationId) {
        setCurrentLocationId(characterWithLocation.currentLocationId);
      }
    }
  }, [characters, currentLocationId]);

  const getSessionStatusColor = () => {
    switch (session.status) {
    case 'preparing': return 'default';
    case 'active': return 'success';
    case 'paused': return 'warning';
    case 'completed': return 'primary';
    case 'cancelled': return 'error';
    default: return 'default';
    }
  };

  const getSessionStatusLabel = () => {
    switch (session.status) {
    case 'preparing': return '準備中';
    case 'active': return 'セッション中';
    case 'paused': return '一時停止';
    case 'completed': return '完了';
    case 'cancelled': return 'キャンセル';
    default: return session.status;
    }
  };

  const handleHPChange = (character: Character, mode: 'heal' | 'damage') => {
    setSelectedCharacter(character);
    setHpDialogMode(mode);
    setHpAmount('');
    setHpDialogOpen(true);
  };

  const handleConfirmHPChange = () => {
    if (!selectedCharacter || !hpAmount || !onUpdateCharacterHP) return;

    const amount = parseInt(hpAmount);
    if (isNaN(amount) || amount <= 0) return;

    const currentHP = selectedCharacter.derivedStats.hitPoints;
    const newHP = hpDialogMode === 'heal'
      ? Math.min(currentHP + amount, selectedCharacter.derivedStats.maxHitPoints)
      : Math.max(currentHP - amount, 0);

    onUpdateCharacterHP(selectedCharacter.id, newHP);
    setHpDialogOpen(false);
  };

  const handleCharacterMove = (character: Character) => {
    setCharacterToMove(character);
    setMovementDialogOpen(true);
  };

  const handleMovementComplete = () => {
    setMovementDialogOpen(false);
    setCharacterToMove(null);
    // Refresh character data to get updated locations
    // This would typically trigger a re-fetch of session data
  };

  const handleLocationAction = (actionType: string) => {
    // Handle location-specific actions
    onSendMessage(`場所で「${actionType}」を実行しました`, 'ic');
  };

  // パーティ移動完了時のハンドラー
  const handlePartyLocationChange = (newLocationId: string) => {
    // パーティ位置を更新
    setPartyLocation(prev => ({
      ...prev,
      currentLocationId: newLocationId,
      lastMoveTime: new Date().toISOString()
    }));
    
    // 現在の場所表示も更新
    setCurrentLocationId(newLocationId);
    
    // チャットに移動完了メッセージを送信
    onSendMessage(`🚶 パーティが ${newLocationId} に移動しました！`, 'ooc');
  };

  // Phase 0: シームレスAI GM制御システム
  const handleStartSessionClick = () => {
    setDurationDialogOpen(true);
  };

  const handleDurationConfirm = async (config: SessionDurationConfig) => {
    setDurationDialogOpen(false);
    setIsInitializing(true);
    setInitializationError(null);
    setLastDurationConfig(config);
    
    try {
      // 1. セッションを開始
      onStartSession(config);
      
      // 2. パーティ位置を初期化
      const initialLocation = partyLocation.currentLocationId;
      console.log(`📍 パーティ初期位置: ${initialLocation}`);
      
      // 3. AI自動生成を実行（従来システム）
      console.log('🎯 セッション自動初期化開始...');
      const result = await aiGameMasterAPI.initializeSessionWithDefaults(
        session.id,
        session.campaignId,
        config,
        characters,
        'クラシックファンタジー' // デフォルトテーマ
      );
      
      setInitializationResult(result);
      console.log('✅ セッション自動初期化完了:', result);
      
      // 4. AI GM制御を自動開始
      setIsAIControlActive(true);
      console.log('🤖 AI GM制御システム開始...');
      
      // 5. 初回AIチェーンを実行
      const initialMessage = `セッションが開始されました。冒険を始めましょう！`;
      const chainResponse = await aiAgentAPI.triggerChain({
        sessionId: session.id,
        playerMessage: initialMessage,
        currentLocationId: initialLocation,
        participants: characters.map(c => c.id),
        triggerType: 'session_start',
        context: {
          sessionConfig: config,
          partySize: characters.length,
          timeOfDay: 'morning',
          weather: 'clear',
          dangerLevel: 20
        }
      });
      
      console.log('🎭 AI GM初回応答:', chainResponse);
      
      // 6. 成功メッセージを表示
      onSendMessage(
        `🎮 セッションの初期化が完了しました！${result.milestones.length}個のマイルストーンと豊富なエンティティプールが生成されました。`,
        'ooc'
      );
      
      // 7. AI GMからの初回メッセージを表示
      onSendMessage(chainResponse.gmResponse.message, 'ic');
      
      // 8. 利用可能なエンティティ情報を表示
      if (chainResponse.contextAnalysis.availableEntities.length > 0) {
        const entitySummary = chainResponse.contextAnalysis.availableEntities
          .slice(0, 3)
          .map(e => e.name)
          .join('、');
        onSendMessage(
          `🏰 現在の場所で利用可能: ${entitySummary}など`,
          'ooc'
        );
      }
      
      setInitializationError(null);
      console.log('✅ シームレスAI GM制御システム開始完了');
      
    } catch (error) {
      console.error('❌ セッション初期化エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setInitializationError(errorMessage);
      
      // エラーを明確に表示
      onSendMessage(
        `❌ セッション初期化に失敗しました: ${errorMessage}`,
        'ooc'
      );
      
      // AI制御も無効化
      setIsAIControlActive(false);
    } finally {
      setIsInitializing(false);
    }
  };

  // セッションクリアハンドラー
  const handleClearSession = () => {
    try {
      console.log('🗑️ セッションクリア開始...');
      
      // セッションを終了して初期状態に戻す
      onEndSession();
      
      // 初期化状態をリセット
      setInitializationResult(null);
      setInitializationError(null);
      setLastDurationConfig(null);
      
      // 時間管理データをリセット
      setTurnState(null);
      setCurrentDay(null);
      
      // 成功メッセージを表示
      onSendMessage(
        '🗑️ セッションがクリアされました。セッションを再開始できます。',
        'ooc'
      );
      
      console.log('✅ セッションクリア完了');
    } catch (error) {
      console.error('❌ セッションクリアエラー:', error);
      onSendMessage(
        '❌ セッションクリアに失敗しました。',
        'ooc'
      );
    }
  };

  // メッセージ送信をインターセプト
  const handleSendMessage = useCallback(async (message: string, type: 'ic' | 'ooc', characterId?: string) => {
    // まず通常のメッセージ送信
    onSendMessage(message, type, characterId);
    
    // プレイヤーモードかつICメッセージの場合、会話処理を実行
    if (isPlayerMode && type === 'ic' && characterId === playerCharacter?.id) {
      await processPlayerMessage(message);
    }
  }, [onSendMessage, isPlayerMode, playerCharacter, processPlayerMessage]);

  // ダイスロールをインターセプト
  const handleRollDice = useCallback((dice: string, purpose: string, characterId?: string) => {
    // 通常のダイスロール処理
    onRollDice(dice, purpose, characterId);
    
    // チャレンジ待機中の場合、メッセージを追加
    if (awaitingDiceRoll && characterId === playerCharacter?.id) {
      // ダイスロール結果はセッションのチャットログから取得されるはず
      // 現在は手動で結果を入力する必要がある
    }
  }, [onRollDice, awaitingDiceRoll, playerCharacter]);

  // セッション初期化のリトライ
  const handleRetryInitialization = async () => {
    if (!lastDurationConfig) {
      console.error('リトライに必要な設定情報がありません');
      return;
    }

    setIsInitializing(true);
    setInitializationError(null);
    
    try {
      console.log('🔄 セッション初期化リトライ開始...');
      const result = await aiGameMasterAPI.initializeSessionWithDefaults(
        session.id,
        session.campaignId,
        lastDurationConfig,
        characters,
        'クラシックファンタジー'
      );
      
      setInitializationResult(result);
      setInitializationError(null);
      console.log('✅ セッション初期化リトライ成功:', result);
      
      onSendMessage(
        `🎮 セッション初期化が成功しました！${result.milestones.length}個のマイルストーンと豊富なエンティティプールが生成されました。`,
        'ooc'
      );
      
    } catch (error) {
      console.error('❌ セッション初期化リトライ失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setInitializationError(errorMessage);
      
      onSendMessage(
        `❌ セッション初期化リトライに失敗しました: ${errorMessage}`,
        'ooc'
      );
    } finally {
      setIsInitializing(false);
    }
  };
  
  // 時間管理データの読み込み
  const loadTimeManagementData = async () => {
    if (session.status !== 'active') return;
    
    setTimeManagementLoading(true);
    try {
      console.log('🔄 時間管理データを読み込み中...', { sessionId: session.id });
      const [turnStateData, currentDayData] = await Promise.all([
        timeManagementAPI.getSessionTurnState(session.id),
        timeManagementAPI.getSessionCurrentDay(session.id),
      ]);
      
      console.log('✅ 時間管理データ読み込み完了:', { turnStateData, currentDayData });
      setTurnState(turnStateData);
      setCurrentDay(currentDayData);
    } catch (error) {
      console.error('❌ 時間管理データの読み込みに失敗しました:', error);
      // エラーを通知システムに表示
      console.warn(`時間管理データの読み込みに失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTimeManagementLoading(false);
    }
  };

  // セッションがアクティブになったら時間管理データを読み込み
  React.useEffect(() => {
    loadTimeManagementData();
  }, [session.status, session.id]);

  // 時間管理ハンドラー
  const handleTimeManagementAction = async (characterId: string, description: string, metadata?: Record<string, any>) => {
    try {
      const result = await timeManagementAPI.executeSessionAction(session.id, {
        characterId,
        description,
        metadata,
      });
      
      // 成功時にデータを再読み込み
      if (result.success) {
        await loadTimeManagementData();
      }
      
      console.log('アクション実行結果:', result);
    } catch (error) {
      console.error('アクション実行に失敗しました:', error);
    }
  };

  const handleAdvanceTime = async () => {
    try {
      const result = await timeManagementAPI.advanceSessionTime(session.id);
      
      // データを再読み込み
      await loadTimeManagementData();
      
      console.log('時間進行結果:', result);
    } catch (error) {
      console.error('時間進行に失敗しました:', error);
    }
  };

  const handleTakeRest = async () => {
    try {
      const result = await timeManagementAPI.takeSessionRest(session.id);
      
      // 成功時にデータを再読み込み
      if (result.success) {
        await loadTimeManagementData();
      }
      
      console.log('休息結果:', result);
    } catch (error) {
      console.error('休息に失敗しました:', error);
    }
  };

  const handleUpdateTurnState = async (updates: any) => {
    try {
      // TODO: ターン状態更新の実装（既存APIにはセッションベースのupdateがないため、必要に応じて追加）
      console.log('ターン状態更新:', updates);
    } catch (error) {
      console.error('ターン状態更新に失敗しました:', error);
    }
  };

  // チャットベースイベントハンドラー - AI生成版（コンテキスト対応）
  const handleStartChatBasedEvent = async (eventType: string) => {
    try {
      // AIにイベント開始シーンを生成させる
      const eventContext = {
        eventType,
        campaign: session.campaignId,
        characters: characters.map(c => ({ name: c.name, class: c.characterClass || 'Unknown', level: c.level })),
        currentSetting: session.campaignId || 'ファンタジー世界',
        playerCharacter: playerCharacter?.name || '冒険者',
        activeQuests: quests.filter(q => q.status === 'active'),
        completedMilestones: milestones.filter(m => m.status === 'completed'),
        sessionMode: session.mode,
        chatHistory: session.chatLog.slice(-5) // 最近の5件のチャット履歴
      };

      // イベントタイプに応じた詳細なプロンプト生成
      const eventPrompts: Record<string, string> = {
        'contextual_encounter': `現在の状況（${session.mode}モード）に最適な遭遇を作成してください。キャラクターのレベルと能力、現在のクエスト状況を考慮し、挑戦的だが公平な遭遇を提供してください。`,
        'investigation_opportunity': `キャラクターが新しい手がかりや秘密を発見できる調査の機会を作成してください。現在のクエストやストーリーライン、キャラクターの得意分野を活かせる内容にしてください。`,
        'character_development': `キャラクターの成長や背景、人間関係に焦点を当てたイベントを作成してください。現在のパーティの構成と過去の経験を考慮し、感情的な深みのあるシーンを演出してください。`,
        'story_progression': `メインストーリーまたはサブクエストを大きく進展させるイベントを作成してください。現在の進行状況と未解決の謎、キャラクターの目標を考慮してください。`,
        'mystery_investigation': `謎の調査に関連したイベントを開始してください。手がかりの発見や推理の機会を提供し、プレイヤーの観察力と洞察力を試してください。`,
        'social_encounter': `NPCとの対話や社交的な状況を作成してください。交渉、説得、情報収集の機会を提供し、キャラクターの社交スキルを活かせる場面にしてください。`,
        'exploration': `新しい場所や環境の探索イベントを開始してください。発見の喜びと未知への好奇心を刺激し、環境との相互作用を促してください。`
      };

      const specificPrompt = eventPrompts[eventType] || eventPrompts['contextual_encounter'];

      // AI GMにイベント開始の描写を依頼
      const prompt = `あなたは経験豊富なTRPGゲームマスターです。以下の状況で${eventType}イベントを開始してください：

イベントタイプ: ${eventType}
キャンペーン設定: ${eventContext.currentSetting}
参加キャラクター: ${eventContext.characters.map(c => `${c.name}(${c.class} Lv.${c.level})`).join(', ')}
プレイヤーキャラクター: ${eventContext.playerCharacter}
セッションモード: ${eventContext.sessionMode}
アクティブクエスト数: ${eventContext.activeQuests.length}
完了マイルストーン数: ${eventContext.completedMilestones.length}

${specificPrompt}

250文字程度で臨場感のある導入シーンを描写し、最後に「皆さんはどうしますか？」で締めてください。キャラクターの特徴と現在の状況を活かした、没入感のあるシーンを心がけてください。`;

      // AI Game Master サービスを使用してイベント開始シーンを生成
      const response = await fetch('/api/ai-game-master/event-introduction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          campaignId: session.campaignId,
          eventType,
          context: {
            characters: eventContext.characters,
            setting: eventContext.currentSetting,
            playerCharacter: eventContext.playerCharacter,
            currentScenario: session.campaignId || '冒険',
            sessionMode: eventContext.sessionMode,
            questContext: eventContext.activeQuests.map(q => ({ title: q.title, description: q.description })),
            milestoneContext: eventContext.completedMilestones.map(m => ({ title: m.title }))
          },
          provider: 'google', // デフォルトプロバイダー
          customPrompt: prompt
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiGeneratedMessage = data.content || data.text || data.response;
        
        // AI生成メッセージをチャットに投稿
        onSendMessage(aiGeneratedMessage, 'ooc');
        
        console.log(`✅ コンテキスト対応 ${eventType} イベントが生成されました`);
      } else {
        throw new Error('AI生成に失敗しました');
      }
      
    } catch (error) {
      console.error('AI イベント生成エラー:', error);
      
      // フォールバック: 基本的なイベント開始メッセージ
      const fallbackMessages: Record<string, string> = {
        'contextual_encounter': '何かが近づいてくる気配がします。警戒が必要かもしれません。',
        'investigation_opportunity': '周囲を注意深く観察すると、何か重要な手がかりがありそうです。',
        'character_development': 'ふとした瞬間に、過去の記憶や感情が蘇ってきます。',
        'story_progression': '状況が大きく動き出しました。重要な転換点が訪れたようです。'
      };
      
      const fallbackMessage = fallbackMessages[eventType] || `${eventType}イベントが開始されました。GMがシーンを準備中です...`;
      onSendMessage(fallbackMessage, 'ooc');
    }
  };

  const pcCharacters = characters.filter(c => c.characterType === 'PC');
  const npcCharacters = characters.filter(c => c.characterType === 'NPC');
  const enemyCharacters = characters.filter(c => c.characterType === 'Enemy');

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography>セッションを読み込み中...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" gutterBottom>
              セッション #{session.sessionNumber}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={getSessionStatusLabel()}
                color={getSessionStatusColor()}
                size="small"
              />
              <Chip
                label={`モード: ${session.mode === 'combat' ? '戦闘' : session.mode === 'exploration' ? '探索' : '社交'}`}
                size="small"
                variant="outlined"
              />
              {/* パーティ位置表示 */}
              <Chip
                icon={<LocationIcon />}
                label={`パーティ位置: ${partyLocation.currentLocationId}`}
                size="small"
                variant="outlined"
                color="primary"
              />
              {/* AI GM制御状態表示 */}
              {isAIControlActive && (
                <Chip
                  icon={<AssistantRounded />}
                  label="AI GM制御中"
                  size="small"
                  color="secondary"
                />
              )}
              <Typography variant="caption" color="text.secondary">
                GM: {session.gamemaster}
              </Typography>
            </Stack>
          </Box>
          
          <Stack direction="row" spacing={1}>
            {session.status === 'preparing' && (
              <Button
                variant="contained"
                startIcon={<PlayArrowRounded />}
                onClick={handleStartSessionClick}
                disabled={isInitializing}
              >
                {isInitializing ? 'ゲーム開始中...' : 'ゲーム開始 (AI GM制御)'}
              </Button>
            )}
            {session.status === 'active' && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<RefreshRounded />}
                onClick={handleClearSession}
                sx={{ mr: 1 }}
              >
                セッションをクリア
              </Button>
            )}
            {session.status === 'active' && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<PauseRounded />}
                  onClick={() => {/* 一時停止実装 */}}
                >
                  一時停止
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<StopRounded />}
                  onClick={onEndSession}
                >
                  セッション終了
                </Button>
              </>
            )}
          </Stack>
        </Box>

        {/* セッション初期化状態表示 */}
        {session.status === 'active' && (isInitializing || initializationError) && (
          <Box sx={{ mt: 2 }}>
            {isInitializing && (
              <Alert severity="info" sx={{ mb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={16} />
                  セッションを初期化中です...マイルストーンとエンティティプールを生成しています。
                </Box>
              </Alert>
            )}
            
            {initializationError && !isInitializing && (
              <Alert 
                severity="error" 
                sx={{ mb: 1 }}
                action={
                  <Stack direction="row" spacing={1}>
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={handleRetryInitialization}
                      startIcon={<RefreshRounded />}
                    >
                      リトライ
                    </Button>
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={() => setInitializationError(null)}
                    >
                      閉じる
                    </Button>
                  </Stack>
                }
              >
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    セッション初期化エラー
                  </Typography>
                  <Typography variant="body2">
                    {initializationError}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    「リトライ」ボタンでもう一度試すか、手動でセッションを進行してください。
                  </Typography>
                </Box>
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* メインコンテンツ */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* 左側：キャラクター一覧 */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <Paper sx={{ height: '100%', overflow: 'auto', p: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <GroupRounded color="primary" />
                <Typography variant="h6">キャラクター</Typography>
              </Box>

              {/* PC */}
              {pcCharacters.length > 0 && (
                <Box mb={3}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    プレイヤーキャラクター
                  </Typography>
                  <Stack spacing={1}>
                    {pcCharacters.map(char => {
                      const isPlayerCharacter = playerCharacter && char.id === playerCharacter.id;
                      return (
                        <Box
                          key={char.id}
                          sx={{
                            position: 'relative',
                            ...(isPlayerCharacter && {
                              border: '2px solid',
                              borderColor: 'primary.main',
                              borderRadius: 1,
                              p: 0.5,
                              bgcolor: (theme) => theme.palette.mode === 'dark' 
                                ? 'primary.dark' 
                                : 'primary.light',
                              '& .MuiPaper-root': {
                                bgcolor: 'transparent',
                              }
                            })
                          }}
                        >
                          {isPlayerCharacter && (
                            <Typography
                              variant="caption"
                              sx={{
                                position: 'absolute',
                                top: -8,
                                left: 8,
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                zIndex: 1,
                              }}
                            >
                              あなた
                            </Typography>
                          )}
                          <CharacterCard
                            character={char}
                            isCompact
                            onHeal={() => handleHPChange(char, 'heal')}
                            onDamage={() => handleHPChange(char, 'damage')}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              {/* NPC */}
              {npcCharacters.length > 0 && (
                <Box mb={3}>
                  <Typography variant="subtitle2" color="success.main" gutterBottom>
                    NPC
                  </Typography>
                  <Stack spacing={1}>
                    {npcCharacters.map(char => (
                      <CharacterCard
                        key={char.id}
                        character={char}
                        isCompact
                        onHeal={() => handleHPChange(char, 'heal')}
                        onDamage={() => handleHPChange(char, 'damage')}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Enemy */}
              {enemyCharacters.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    敵
                  </Typography>
                  <Stack spacing={1}>
                    {enemyCharacters.map(char => (
                      <CharacterCard
                        key={char.id}
                        character={char}
                        isCompact
                        onHeal={() => handleHPChange(char, 'heal')}
                        onDamage={() => handleHPChange(char, 'damage')}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* 中央：チャット */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <ChatPanel
              session={session}
              characters={characters}
              isPlayerMode={isPlayerMode}
              onSendMessage={handleSendMessage}
              onRollDice={handleRollDice}
              currentChallenge={currentChallenge}
            />
          </Grid>

          {/* 右側：ツールパネル */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Tabs
                value={activeTab}
                onChange={(_, value) => setActiveTab(value)}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
                variant="scrollable"
                scrollButtons="auto"
              >
                {/* プレイヤーモード時はダイスタブを非表示 */}
                {!isPlayerMode && <Tab icon={<CasinoRounded />} label="ダイス" />}
                <Tab icon={<SecurityRounded />} label="戦闘" />
                <Tab icon={<TimeIcon />} label="時間管理" />
                <Tab icon={<LocationIcon />} label="場所" />
                <Tab icon={<SearchIcon />} label="探索" />
                <Tab icon={<QuestIcon />} label="クエスト" />
                <Tab icon={<MilestoneIcon />} label="マイルストーン" />
                {!isPlayerMode && <Tab icon={<AssistantRounded />} label="AI" />}
              </Tabs>

              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {/* プレイヤーモード時はダイスタブを非表示にするため、タブインデックスを調整 */}
                {!isPlayerMode && activeTab === 0 && (
                  <DiceRollUI
                    characters={characters}
                    onRoll={onRollDice}
                  />
                )}
                {((isPlayerMode && activeTab === 0) || (!isPlayerMode && activeTab === 1)) && (
                  <CombatTracker
                    session={session}
                    characters={characters}
                    onStartCombat={onStartCombat}
                    onEndCombat={onEndCombat}
                  />
                )}
                {((isPlayerMode && activeTab === 1) || (!isPlayerMode && activeTab === 2)) && (
                  <TimeManagementPanel
                    campaignId={session.campaignId}
                    sessionId={session.id}
                    turnState={turnState}
                    currentDay={currentDay}
                    characters={characters}
                    onExecuteAction={handleTimeManagementAction}
                    onAdvanceTime={handleAdvanceTime}
                    onTakeRest={handleTakeRest}
                    onUpdateTurnState={handleUpdateTurnState}
                    onRetryDataLoad={loadTimeManagementData}
                  />
                )}
                {((isPlayerMode && activeTab === 2) || (!isPlayerMode && activeTab === 3)) && (
                  <Box p={2} sx={{ height: '100%', overflow: 'auto' }}>
                    <Typography variant="h6" gutterBottom>
                      場所管理
                    </Typography>
                    
                    {/* 現在の場所表示 */}
                    {currentLocation ? (
                      <LocationDisplay
                        location={currentLocation}
                        characters={charactersInLocation}
                        onCharacterClick={handleCharacterMove}
                        onLocationAction={handleLocationAction}
                        compact={true}
                      />
                    ) : (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        現在の場所が設定されていません
                      </Alert>
                    )}

                    {/* パーティ移動システム */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        🚶 パーティ移動
                      </Typography>
                      
                      {/* シンプルな移動ボタン */}
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setPartyMovementDialogOpen(true)}
                        disabled={session.status !== 'active'}
                        data-testid="party-movement-button"
                        sx={{ mb: 1 }}
                      >
                        パーティ移動を提案
                      </Button>
                      
                      {/* 進行中の提案がある場合の簡易表示 */}
                      {partyMovement.activeProposal && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            移動提案中: {locations.find(loc => loc.id === partyMovement.activeProposal?.targetLocationId)?.name || '不明な場所'}
                          </Typography>
                          {partyMovement.votingSummary && (
                            <Typography variant="caption" color="text.secondary">
                              投票状況: {partyMovement.votingSummary.currentApprovals}/{partyMovement.votingSummary.requiredApprovals}
                              {partyMovement.votingSummary.consensusReached && ' ✅ 合意成立'}
                            </Typography>
                          )}
                        </Alert>
                      )}
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* 場所選択 */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        場所を切り替え
                      </Typography>
                      <Select
                        value={currentLocationId || ''}
                        onChange={(e) => setCurrentLocationId(e.target.value || null)}
                        fullWidth
                        size="small"
                        data-testid="location-selector"
                      >
                        {locations.map((location) => (
                          <MenuItem key={location.id} value={location.id}>
                            {location.name} ({location.type})
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>

                    {/* 個別キャラクター移動ボタン */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        キャラクター移動
                      </Typography>
                      <Stack spacing={1}>
                        {characters.map((character) => (
                          <Button
                            key={character.id}
                            variant="outlined"
                            size="small"
                            onClick={() => handleCharacterMove(character)}
                            startIcon={<PersonIcon />}
                            data-testid={`move-character-${character.id}`}
                          >
                            {character.name}を移動
                          </Button>
                        ))}
                      </Stack>
                    </Box>

                    {/* 場所エンティティ表示 */}
                    {currentLocationId && (
                      <Box sx={{ mb: 3 }}>
                        <LocationEntityDisplay
                          sessionId={session.id}
                          locationId={currentLocationId}
                          locationName={currentLocation?.name || '現在の場所'}
                          onEntitySelect={(entity) => {
                            console.log('🎯 Selected entity:', entity);
                            // TODO: エンティティ選択時の処理（詳細表示や探索アクションとの連携）
                          }}
                          onEntityAction={(entityId, actionType) => {
                            console.log('⚡ Entity action:', entityId, actionType);
                            // TODO: エンティティアクション実行（探索システムとの統合）
                          }}
                          onLocationChanged={(oldLocationId, newLocationId) => {
                            console.log('📍 Location changed in entity display:', {
                              from: oldLocationId,
                              to: newLocationId,
                              locationName: currentLocation?.name
                            });
                            
                            // チャットにメッセージを投稿
                            onSendMessage(
                              `📍 場所が変更されました: ${currentLocation?.name || newLocationId}`,
                              'ooc'
                            );
                          }}
                          autoRefresh={session.status === 'active'}
                          refreshInterval={20000}
                          compact={false}
                          disabled={session.status !== 'active'}
                          showLocationChangeIndicator={true}
                        />
                      </Box>
                    )}

                    {/* キャラクター間会話 */}
                    {currentLocationId && charactersInLocation.length > 1 && (
                      <Box sx={{ mt: 3 }}>
                        <ConversationPanel
                          locationId={currentLocationId}
                          characters={charactersInLocation}
                          currentUserId={pcCharacters[0]?.id} // 最初のPCをユーザーとして設定
                        />
                      </Box>
                    )}
                  </Box>
                )}
                
                {/* 探索タブ */}
                {((isPlayerMode && activeTab === 3) || (!isPlayerMode && activeTab === 4)) && (
                  <Box p={2} sx={{ height: '100%', overflow: 'auto' }}>
                    <Typography variant="h6" gutterBottom>
                      探索アクション
                    </Typography>
                    
                    <ExplorationActionPanel
                      sessionId={session.id}
                      currentLocationId={partyLocation.currentLocationId}
                      currentCharacterId={pcCharacters[0]?.id || ''} // 最初のPCを使用
                      currentCharacterName={pcCharacters[0]?.name || ''}
                      onChatMessage={(message) => {
                        // チャットメッセージをChatPanelに転送
                        // TODO: ChatPanelとの統合実装
                        console.log('Exploration chat message:', message);
                      }}
                      disabled={session.status !== 'active'}
                    />
                  </Box>
                )}
                
                {((isPlayerMode && activeTab === 4) || (!isPlayerMode && activeTab === 5)) && (
                  <QuestPanel
                    campaignId={session.campaignId}
                    sessionId={session.id}
                    quests={quests}
                    onQuestUpdate={onQuestUpdate || (() => {})}
                    onCreateQuest={onCreateQuest || (() => {})}
                  />
                )}
                {((isPlayerMode && activeTab === 5) || (!isPlayerMode && activeTab === 6)) && (
                  <MilestonePanel
                    campaignId={session.campaignId}
                    milestones={milestones}
                    progressTracker={defaultProgressTracker}
                    campaignCompletion={defaultCampaignCompletion}
                    recentLevelUps={recentLevelUps}
                    onMilestoneUpdate={onMilestoneUpdate || (() => {})}
                    onCreateMilestone={onCreateMilestone || (() => {})}
                  />
                )}
                {!isPlayerMode && activeTab === 7 && (
                  <Box sx={{ height: '100%', overflow: 'auto' }}>
                    {/* AIゲームマスター強化システム */}
                    <AIGameMasterPanel
                      sessionId={session.id}
                      campaignId={session.campaignId}
                      session={session}
                      characters={characters}
                      quests={quests}
                      milestones={milestones}
                      onEventGenerate={handleStartChatBasedEvent}
                      aiEntityManagement={aiEntityManagement}
                    />
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* 従来のAI制御・イベント管理 */}
                    <Box p={2}>
                      <Typography variant="h6" gutterBottom>
                        AI制御・イベント管理
                      </Typography>
                      
                      {/* AI制御パネル */}
                      <Box mb={3}>
                        <AIControlPanel
                          sessionId={session.id}
                          characters={characters}
                          sessionState={session}
                          onActionExecuted={(action) => {
                            // AI行動実行時のセッション連携
                            console.log('AI action executed:', action);
                            // チャットログに追加
                            const character = characters.find(c => c.id === action.characterId);
                            if (character) {
                              onSendMessage(
                                action.details.description,
                                'ic',
                                character.id,
                              );
                            }
                          }}
                        />
                      </Box>
                      
                      {/* イベント管理 */}
                      <EventPanel
                        sessionId={session.id}
                        campaignId={session.campaignId}
                        sessionMode={session.mode}
                        onEventStart={(event) => {
                          // イベント開始時のセッション連携
                          console.log('Event started:', event);
                        }}
                        onEventComplete={(event) => {
                          // イベント完了時のセッション連携
                          console.log('Event completed:', event);
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* HP変更ダイアログ */}
      <Dialog open={hpDialogOpen} onClose={() => setHpDialogOpen(false)}>
        <DialogTitle>
          {selectedCharacter?.name} の HP を{hpDialogMode === 'heal' ? '回復' : 'ダメージ'}
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              autoFocus
              fullWidth
              type="number"
              label={hpDialogMode === 'heal' ? '回復量' : 'ダメージ量'}
              value={hpAmount}
              onChange={(e) => setHpAmount(e.target.value)}
              InputProps={{ inputProps: { min: 1 } }}
            />
            {selectedCharacter && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                現在のHP: {selectedCharacter.derivedStats.hitPoints} / {selectedCharacter.derivedStats.maxHitPoints}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHpDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color={hpDialogMode === 'heal' ? 'success' : 'error'}
            onClick={handleConfirmHPChange}
            disabled={!hpAmount || parseInt(hpAmount) <= 0}
          >
            {hpDialogMode === 'heal' ? '回復' : 'ダメージ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* キャラクター移動ダイアログ */}
      {characterToMove && currentLocation && (
        <CharacterMovement
          open={movementDialogOpen}
          onClose={() => setMovementDialogOpen(false)}
          character={characterToMove}
          currentLocation={currentLocation}
          availableLocations={locations}
          onMovementComplete={handleMovementComplete}
        />
      )}

      {/* パーティ移動ダイアログ */}
      <PartyMovementDialog
        open={partyMovementDialogOpen}
        onClose={() => setPartyMovementDialogOpen(false)}
        sessionId={session.id}
        currentLocationId={partyLocation.currentLocationId}
        currentLocationName={currentLocation?.name || partyLocation.currentLocationId}
        availableLocations={locations.map(loc => ({
          id: loc.id,
          name: loc.name,
          distance: 1, // 簡略化：全ての場所を距離1とする
          dangerLevel: loc.type === 'dungeon' ? 'dangerous' : 
                     loc.type === 'wilderness' ? 'moderate' : 'safe'
        }))}
        currentCharacterId={playerCharacter?.id || pcCharacters[0]?.id}
        onLocationChange={handlePartyLocationChange}
        onChatMessage={handleSendMessage}
      />

      {/* セッション時間設定ダイアログ */}
      <SessionDurationDialog
        open={durationDialogOpen}
        onClose={() => setDurationDialogOpen(false)}
        onConfirm={handleDurationConfirm}
      />

    </Box>
  );
};