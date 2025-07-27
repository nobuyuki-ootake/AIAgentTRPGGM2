import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box, Alert, Button, Container, Typography } from '@mui/material';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { currentCampaignAtom, appModeAtom, playerCharacterAtom } from '@/store/atoms';
import { useSession } from '@/hooks/useSession';
import { SessionInterface } from '@/components/trpg-session/SessionInterface';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { questAPI, milestoneAPI, campaignAPI } from '@/api';
import { Quest, Milestone, ProgressTracker, LevelUpEvent, CampaignCompletion, ID } from '@ai-agent-trpg/types';

const TRPGSessionPage: React.FC = () => {
  const { id, campaignId: playerCampaignId, sessionId } = useParams<{ 
    id?: string; 
    campaignId?: string; 
    sessionId?: string; 
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const currentCampaign = useRecoilValue(currentCampaignAtom);
  const setCurrentCampaign = useSetRecoilState(currentCampaignAtom);
  const appMode = useRecoilValue(appModeAtom);
  const playerCharacter = useRecoilValue(playerCharacterAtom);
  const setPlayerCharacter = useSetRecoilState(playerCharacterAtom);

  // キャンペーン読み込み状態を管理
  const [campaignLoading, setCampaignLoading] = useState(false);

  // 🔍 COMPREHENSIVE DEBUGGING - State Tracking
  console.log('🔍 ===== TRPGSessionPage Render Start =====');
  console.log('🔍 URL Parameters:', { id, playerCampaignId, sessionId });
  console.log('🔍 Location:', {
    pathname: location.pathname,
    search: location.search,
    state: location.state
  });
  console.log('🔍 Recoil State:', {
    currentCampaign: currentCampaign ? { id: currentCampaign.id, name: currentCampaign.name } : null,
    appMode,
    playerCharacter: playerCharacter ? { id: playerCharacter.id, name: playerCharacter.name } : null,
    campaignLoading
  });

  // navigate時に渡されたstateから選択されたキャラクターを取得
  const navigationState = location.state as { selectedPlayerCharacter?: any } | null;
  const selectedPlayerCharacter = navigationState?.selectedPlayerCharacter;
  
  // 🔍 Navigation State Debugging
  console.log('🔍 Navigation Character Data:', {
    navigationState,
    selectedPlayerCharacter: selectedPlayerCharacter ? { 
      id: selectedPlayerCharacter.id, 
      name: selectedPlayerCharacter.name 
    } : null
  });
  
  // 実際に使用するプレイヤーキャラクター（Recoilの状態またはnavigationのstate）
  const effectivePlayerCharacter = playerCharacter || selectedPlayerCharacter;
  
  // 🔍 Effective Character Debugging
  console.log('🔍 Character Resolution:', {
    playerCharacter: playerCharacter ? { id: playerCharacter.id, name: playerCharacter.name } : null,
    selectedPlayerCharacter: selectedPlayerCharacter ? { id: selectedPlayerCharacter.id, name: selectedPlayerCharacter.name } : null,
    effectivePlayerCharacter: effectivePlayerCharacter ? { id: effectivePlayerCharacter.id, name: effectivePlayerCharacter.name } : null
  });

  // navigationのstateからキャラクターが渡された場合、Recoilにも設定
  useEffect(() => {
    if (selectedPlayerCharacter && !playerCharacter) {
      console.log('NavigationのstateからプレイヤーキャラクターをRecoilに設定:', selectedPlayerCharacter.name);
      setPlayerCharacter(selectedPlayerCharacter);
    }
  }, [selectedPlayerCharacter, playerCharacter, setPlayerCharacter]);

  // プレイヤーモードかどうかを判定
  // GMモード（developer）ではキャラクター選択に関係なくGMモード
  // ユーザーモード（user）では常にプレイヤーモード
  const isPlayerMode = appMode === 'user';
  
  // 実際に使用するキャンペーンIDを決定
  // 開発者モード: /campaign/:id/session/:sessionId → id
  // プレイヤーモード: /campaign/:campaignId/play/:sessionId → playerCampaignId
  const actualCampaignId = id || playerCampaignId;

  // 🔧 キャンペーン読み込み状態の動的管理
  useEffect(() => {
    if (actualCampaignId && (!currentCampaign || currentCampaign.id !== actualCampaignId)) {
      // キャンペーンが必要なのに読み込まれていない場合、即座に読み込み状態にする
      setCampaignLoading(true);
      console.log('🔧 Setting campaignLoading to true - campaign needs to be loaded');
    } else if (currentCampaign && currentCampaign.id === actualCampaignId) {
      // 正しいキャンペーンが読み込まれている場合、読み込み状態を解除
      setCampaignLoading(false);
      console.log('🔧 Setting campaignLoading to false - campaign already loaded correctly');
    }
  }, [actualCampaignId, currentCampaign]);

  // 🔍 キャンペーン状態のデバッグ
  console.log('🔍 Campaign State Analysis:', {
    actualCampaignId,
    currentCampaignId: currentCampaign?.id || null,
    campaignLoading,
    needsLoad: actualCampaignId && (!currentCampaign || currentCampaign.id !== actualCampaignId)
  });

  // キャンペーン情報を取得・設定
  useEffect(() => {
    const loadCampaign = async () => {
      if (!actualCampaignId) {
        console.log('🔄 No actualCampaignId, skipping campaign load');
        setCampaignLoading(false);
        return;
      }
      
      // 既に正しいキャンペーンが読み込まれている場合はスキップ
      if (currentCampaign && currentCampaign.id === actualCampaignId) {
        console.log('🔄 Campaign already loaded correctly:', currentCampaign.id);
        setCampaignLoading(false);
        return;
      }
      
      // 🔧 ここでは setCampaignLoading(true) を呼ばない（動的管理で既に設定済み）
      console.log('🔄 Loading campaign from server:', actualCampaignId);
      console.log('🔄 Current campaign in Recoil:', currentCampaign ? { id: currentCampaign.id, name: currentCampaign.name } : null);
      
      try {
        const campaign = await campaignAPI.getCampaignById(actualCampaignId);
        setCurrentCampaign(campaign);
        console.log('✅ Campaign loaded and set in Recoil:', campaign.id, campaign.name);
        console.log('🔍 Campaign details:', {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          description: campaign.description?.substring(0, 100) + '...'
        });
      } catch (error) {
        console.error('❌ Failed to load campaign:', error);
        console.error('❌ Campaign ID that failed:', actualCampaignId);
        setCampaignLoading(false); // エラー時のみここで false に設定
      }
      // successの場合は動的管理useEffectで false に設定される
    };

    loadCampaign();
  }, [actualCampaignId, currentCampaign, setCurrentCampaign]);
  
  // 🔍 Mode and Campaign ID Debugging
  console.log('🔍 Mode & Campaign Resolution:', {
    appMode,
    hasEffectivePlayerCharacter: !!effectivePlayerCharacter,
    isPlayerMode,
    routeParameterId: id,
    routeParameterCampaignId: playerCampaignId,
    actualCampaignId,
    sessionId
  });

  // セッション関連のロジックをカスタムフックに委譲
  const { session, characters, loading, error, actions } = useSession({
    sessionId,
    campaignId: actualCampaignId || '',
    pollingInterval: 3000,
    isPlayerMode,
    playerCharacter: effectivePlayerCharacter,
  });
  
  // 🔍 Session Hook Results Debugging
  console.log('🔍 useSession Results:', {
    session: session ? { id: session.id } : null,
    charactersCount: characters?.length || 0,
    loading,
    error,
    hasActions: !!actions
  });

  // クエスト管理
  const [quests, setQuests] = useState<Quest[]>([]);

  // マイルストーン管理
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progressTracker, setProgressTracker] = useState<ProgressTracker | undefined>();
  const [recentLevelUps, setRecentLevelUps] = useState<LevelUpEvent[]>([]);
  const [campaignCompletion, setCampaignCompletion] = useState<CampaignCompletion | undefined>();
  const [milestonesLoading, setMilestonesLoading] = useState(false);

  const loadQuests = async () => {
    if (!actualCampaignId) return;
    
    try {
      const questList = await questAPI.getQuestsByCampaign(actualCampaignId);
      setQuests(questList);
    } catch (err) {
      console.error('Failed to load quests:', err);
    }
  };

  const loadMilestones = async () => {
    if (!actualCampaignId) return;
    
    setMilestonesLoading(true);
    try {
      // マイルストーン一覧を取得
      const milestoneList = await milestoneAPI.getMilestonesByCampaign(actualCampaignId);
      setMilestones(milestoneList);

      // 進捗トラッカーを取得
      const tracker = await milestoneAPI.getProgressTracker(actualCampaignId);
      setProgressTracker(tracker);

      // レベルアップイベントを取得
      const levelUps = await milestoneAPI.getLevelUpEvents(actualCampaignId);
      setRecentLevelUps(levelUps);

      // キャンペーン完了状況を取得
      const completion = await milestoneAPI.getCampaignCompletion(actualCampaignId);
      setCampaignCompletion(completion || undefined);
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setMilestonesLoading(false);
    }
  };

  // データ一覧を読み込み（開発者モードのみ）
  useEffect(() => {
    if (actualCampaignId && !isPlayerMode) {
      loadQuests();
      loadMilestones();
    }
  }, [actualCampaignId, isPlayerMode]); // loadQuests and loadMilestones are stable functions

  // 🔍 Redirect Condition 1: Campaign ID Check
  console.log('🔍 Redirect Check 1 - Campaign ID:', {
    actualCampaignId,
    hasActualCampaignId: !!actualCampaignId,
    willRedirectToHome: !actualCampaignId
  });
  
  // キャンペーンIDがない場合はホームにリダイレクト
  if (!actualCampaignId) {
    console.log('🚨 REDIRECT TRIGGERED: No Campaign ID - redirecting to home');
    return <Navigate to="/" replace />;
  }

  // 🔍 Redirect Condition 2: Player Character Check
  console.log('🔍 Player Character Check:', {
    isPlayerMode,
    hasEffectivePlayerCharacter: !!effectivePlayerCharacter,
    loading,
    willShowCharacterError: appMode === 'user' && !effectivePlayerCharacter && !loading
  });
  
  // プレイヤーモード（ユーザーモード）でプレイヤーキャラクターが選択されていない場合のみエラー
  // GMモード（開発者モード）ではキャラクター選択は必須ではない
  if (appMode === 'user' && !effectivePlayerCharacter && !loading) {
    console.log('🚨 ERROR DISPLAY TRIGGERED: Player character not selected - showing error page');
    console.error('❌ プレイヤーキャラクターが選択されていません');
    console.error('❌ playerCharacter:', playerCharacter);
    console.error('❌ selectedPlayerCharacter:', selectedPlayerCharacter);
    console.error('❌ navigationState:', navigationState);
    console.error('❌ location:', location);
    
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            プレイヤーキャラクターが選択されていません
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            プレイヤーモードでセッションを開始するには、プレイヤーキャラクターを選択する必要があります。
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={() => navigate(`/campaign/${actualCampaignId}/player-select`)}
            >
              キャラクター選択画面に戻る
            </Button>
          </Box>
        </Alert>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>デバッグ情報:</strong><br />
            • Campaign ID: {actualCampaignId}<br />
            • App Mode: {appMode}<br />
            • Player Mode Required: {appMode === 'user' ? 'はい' : 'いいえ'}<br />
            • Recoil Player Character: {playerCharacter ? (playerCharacter as any).name || '名前不明' : 'なし'}<br />
            • Navigation Player Character: {selectedPlayerCharacter && typeof selectedPlayerCharacter === 'object' && 'name' in selectedPlayerCharacter ? selectedPlayerCharacter.name : 'なし'}<br />
            • Current URL: {location.pathname}
          </Typography>
        </Alert>
      </Container>
    );
  }

  // 🔍 Redirect Condition 3: Campaign Loading Check (MOST CRITICAL)
  const campaignNotLoaded = !currentCampaign;
  const campaignIdMismatch = currentCampaign && currentCampaign.id !== actualCampaignId;
  const notLoading = !loading;
  const notPlayerModeWithoutCharacter = !(isPlayerMode && !effectivePlayerCharacter);
  
  console.log('🔍 Campaign Loading Check (CRITICAL):', {
    currentCampaign: currentCampaign ? { id: currentCampaign.id } : null,
    actualCampaignId,
    campaignNotLoaded,
    campaignIdMismatch,
    notLoading,
    campaignLoading,
    notPlayerModeWithoutCharacter,
    
    // Individual condition checks
    condition1_campaignIssue: !currentCampaign || currentCampaign.id !== actualCampaignId,
    condition2_notLoading: !loading,
    condition2b_notCampaignLoading: !campaignLoading,
    condition3_notCharacterError: !(appMode === 'user' && !effectivePlayerCharacter),
    
    // Final result
    willRedirectToCampaignSetup: ((!currentCampaign || currentCampaign.id !== actualCampaignId) && 
                                  !loading && 
                                  !campaignLoading &&
                                  !(appMode === 'user' && !effectivePlayerCharacter))
  });
  
  // キャンペーンが読み込まれていない場合のリダイレクト
  // ただし、プレイヤーモードでキャラクター未選択エラーが既に表示されている場合は除外
  if ((!currentCampaign || currentCampaign.id !== actualCampaignId) && 
      !loading && 
      !campaignLoading &&
      !(appMode === 'user' && !effectivePlayerCharacter)) {
    console.log('🚨 REDIRECT TRIGGERED: Campaign not loaded or ID mismatch');
    console.error('❌ キャンペーンが読み込まれていません');
    console.error('❌ currentCampaign:', currentCampaign);
    console.error('❌ actualCampaignId:', actualCampaignId);
    console.error('❌ appMode:', appMode);
    console.error('❌ isPlayerMode:', isPlayerMode);
    
    const redirectPath = appMode === 'user'
      ? `/campaign/${actualCampaignId}/player-select`
      : `/campaign/${actualCampaignId}/setup`;
    console.log('🚨 REDIRECTING TO:', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  // クエスト更新ハンドラー
  const handleQuestUpdate = async (questId: ID, updates: Partial<Quest>) => {
    try {
      const updatedQuest = await questAPI.updateQuest(questId, updates);
      setQuests(prevQuests =>
        prevQuests.map(quest =>
          quest.id === questId ? updatedQuest : quest,
        ),
      );
    } catch (err) {
      console.error('Failed to update quest:', err);
    }
  };

  // 新しいクエスト作成ハンドラー
  const handleCreateQuest = async (questData: Partial<Quest>) => {
    if (!actualCampaignId) return;

    try {
      const newQuest = await questAPI.createQuest({
        ...questData,
        campaignId: actualCampaignId,
      });
      setQuests(prevQuests => [...prevQuests, newQuest]);
    } catch (err) {
      console.error('Failed to create quest:', err);
    }
  };

  // マイルストーン更新ハンドラー
  const handleMilestoneUpdate = async (milestoneId: ID, updates: Partial<Milestone>) => {
    try {
      const updatedMilestone = await milestoneAPI.updateMilestone(milestoneId, updates);
      setMilestones(prevMilestones =>
        prevMilestones.map(milestone =>
          milestone.id === milestoneId ? updatedMilestone : milestone,
        ),
      );
      
      // 進捗トラッカーも更新
      if (actualCampaignId) {
        const tracker = await milestoneAPI.getProgressTracker(actualCampaignId);
        setProgressTracker(tracker);
        
        // レベルアップイベントも更新（マイルストーン完了時）
        if (updates.status === 'completed') {
          const levelUps = await milestoneAPI.getLevelUpEvents(actualCampaignId);
          setRecentLevelUps(levelUps);
        }
      }
    } catch (err) {
      console.error('Failed to update milestone:', err);
    }
  };

  // 新しいマイルストーン作成ハンドラー
  const handleCreateMilestone = async (milestoneData: Partial<Milestone>) => {
    if (!actualCampaignId) return;

    try {
      const newMilestone = await milestoneAPI.createMilestone({
        title: milestoneData.title || '新しいマイルストーン',
        description: milestoneData.description || '',
        ...milestoneData,
        campaignId: actualCampaignId,
      });
      setMilestones(prevMilestones => [...prevMilestones, newMilestone]);
      
      // 進捗トラッカーも更新
      const tracker = await milestoneAPI.getProgressTracker(actualCampaignId);
      setProgressTracker(tracker);
    } catch (err) {
      console.error('Failed to create milestone:', err);
    }
  };

  // HP更新ハンドラー（文字通りHPを更新）
  const handleUpdateCharacterHP = async (characterId: string, newHP: number) => {
    try {
      // TODO: API経由でキャラクターのHPを更新
      console.log(`Updating character ${characterId} HP to ${newHP}`);
    } catch (err) {
      console.error('Failed to update character HP:', err);
    }
  };

  // エラー表示
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              再読み込み
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // ローディング表示
  if (loading || campaignLoading || !session) {
    console.log('🔍 Showing loading screen:', { 
      loading, 
      campaignLoading, 
      hasSession: !!session 
    });
    const message = campaignLoading ? "キャンペーンを読み込み中..." : "セッションを準備中...";
    return <LoadingScreen message={message} />;
  }

  // 🔍 Success - Rendering Session Interface
  console.log('✅ SUCCESS: All conditions passed, rendering SessionInterface');
  console.log('🔍 Final State for Rendering:', {
    session: { id: session.id },
    charactersCount: characters?.length || 0,
    isPlayerMode,
    effectivePlayerCharacter: effectivePlayerCharacter ? { 
      id: effectivePlayerCharacter.id, 
      name: effectivePlayerCharacter.name 
    } : null
  });

  return (
    <Box sx={{ height: '100vh', pt: 8, pb: 2, px: 2 }}>
      <SessionInterface
        session={session}
        characters={characters}
        quests={isPlayerMode ? [] : quests}
        milestones={isPlayerMode ? [] : milestones}
        progressTracker={isPlayerMode ? undefined : progressTracker}
        recentLevelUps={isPlayerMode ? [] : recentLevelUps}
        campaignCompletion={isPlayerMode ? undefined : campaignCompletion}
        loading={loading || (!isPlayerMode && milestonesLoading)}
        error={error}
        isPlayerMode={isPlayerMode}
        playerCharacter={effectivePlayerCharacter}
        onStartSession={actions.startSession}
        onEndSession={actions.endSession}
        onSendMessage={actions.sendMessage}
        onRollDice={actions.rollDice}
        onStartCombat={actions.startCombat}
        onEndCombat={actions.endCombat}
        onUpdateCharacterHP={handleUpdateCharacterHP}
        onQuestUpdate={isPlayerMode ? undefined : handleQuestUpdate}
        onCreateQuest={isPlayerMode ? undefined : handleCreateQuest}
        onMilestoneUpdate={isPlayerMode ? undefined : handleMilestoneUpdate}
        onCreateMilestone={isPlayerMode ? undefined : handleCreateMilestone}
      />
    </Box>
  );
};

export default TRPGSessionPage;