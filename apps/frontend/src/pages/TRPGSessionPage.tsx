import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Box, Alert, Button } from '@mui/material';
import { useRecoilValue } from 'recoil';
import { currentCampaignAtom } from '@/store/atoms';
import { useSession } from '@/hooks/useSession';
import { SessionInterface } from '@/components/trpg-session/SessionInterface';
import { LoadingScreen } from '@/components/common/LoadingScreen';

const TRPGSessionPage: React.FC = () => {
  const { id: campaignId, sessionId } = useParams<{ id: string; sessionId?: string }>();
  const currentCampaign = useRecoilValue(currentCampaignAtom);

  // キャンペーンIDがない場合はホームにリダイレクト
  if (!campaignId) {
    return <Navigate to="/" replace />;
  }

  // キャンペーンが読み込まれていない場合はキャンペーンページにリダイレクト
  if (!currentCampaign || currentCampaign.id !== campaignId) {
    return <Navigate to={`/campaign/${campaignId}/setup`} replace />;
  }

  // セッション関連のロジックをカスタムフックに委譲
  const { session, characters, loading, error, actions } = useSession({
    sessionId,
    campaignId,
    pollingInterval: 3000,
  });

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
  if (loading || !session) {
    return <LoadingScreen message="セッションを準備中..." />;
  }

  return (
    <Box sx={{ height: '100vh', pt: 8, pb: 2, px: 2 }}>
      <SessionInterface
        session={session}
        characters={characters}
        loading={loading}
        error={error}
        onStartSession={actions.startSession}
        onEndSession={actions.endSession}
        onSendMessage={actions.sendMessage}
        onRollDice={actions.rollDice}
        onStartCombat={actions.startCombat}
        onEndCombat={actions.endCombat}
        onUpdateCharacterHP={handleUpdateCharacterHP}
      />
    </Box>
  );
};

export default TRPGSessionPage;