import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  Grid,
  Chip,
  Alert,
  Stack,
  Snackbar,
} from '@mui/material';
import {
  SettingsRounded,
  PeopleRounded,
  TimelineRounded,
  PlayArrowRounded,
} from '@mui/icons-material';
import { useRecoilState } from 'recoil';
import { currentCampaignAtom } from '@/store/atoms';
import { campaignAPI, characterAPI } from '@/api';
import { TRPGCampaign } from '@ai-agent-trpg/types';
import { LoadingScreen } from '@/components/common/LoadingScreen';

const CampaignSetupPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentCampaign, setCurrentCampaign] = useRecoilState(currentCampaignAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // キャンペーンIDがない場合はホームにリダイレクト
  if (!id) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    if (currentCampaign?.id === id) return;

    setLoading(true);
    setError(null);

    try {
      const campaign = await campaignAPI.getCampaignById(id);
      setCurrentCampaign(campaign);
    } catch (err) {
      setError('キャンペーンの読み込みに失敗しました');
      console.error('Failed to load campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const createMockCharacters = async () => {
    if (!currentCampaign) return;

    try {
      setLoading(true);
      
      // モックPCを2体作成
      const pc1 = characterAPI.createMockPC(currentCampaign.id, 'アリス');
      const pc2 = characterAPI.createMockPC(currentCampaign.id, 'ボブ');
      
      // モックNPCを1体作成
      const npc1 = characterAPI.createMockNPC(currentCampaign.id);
      
      // モックEnemyを1体作成
      const enemy1 = characterAPI.createMockEnemy(currentCampaign.id);

      await Promise.all([
        characterAPI.createCharacter(pc1),
        characterAPI.createCharacter(pc2),
        characterAPI.createCharacter(npc1),
        characterAPI.createCharacter(enemy1),
      ]);

      showSnackbar('モックキャラクターを作成しました！', 'success');
    } catch (err) {
      console.error('Failed to create mock characters:', err);
      showSnackbar('キャラクター作成に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !currentCampaign) {
    return <LoadingScreen message="キャンペーンを読み込み中..." />;
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={loadCampaign}>
            再試行
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!currentCampaign) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          キャンペーンが見つかりません
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {currentCampaign.name}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip 
              label={currentCampaign.status} 
              color={currentCampaign.status === 'active' ? 'success' : 'default'} 
            />
            <Chip label={`レベル ${currentCampaign.currentLevel}`} variant="outlined" />
            <Chip label={currentCampaign.settings.gameSystem} variant="outlined" />
          </Stack>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* キャンペーン情報 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <SettingsRounded color="primary" />
                <Typography variant="h6">キャンペーン設定</Typography>
              </Box>
              
              <Typography variant="body1" paragraph>
                {currentCampaign.description}
              </Typography>

              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  世界設定
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  テーマ: {currentCampaign.settings.theme}<br />
                  技術レベル: {currentCampaign.settings.world.technologyLevel}<br />
                  魔法レベル: {currentCampaign.settings.world.magicLevel}<br />
                  スケール: {currentCampaign.settings.world.scale}
                </Typography>
              </Box>

              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  プレイヤー設定
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  想定人数: {currentCampaign.settings.players.expectedCount}人<br />
                  経験レベル: {currentCampaign.settings.players.experienceLevel}<br />
                  プレイスタイル: {currentCampaign.settings.players.playStyle}<br />
                  セッション時間: {currentCampaign.settings.players.sessionLength}分
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  メインクエスト
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentCampaign.goals.mainQuest}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* アクションパネル */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            {/* キャラクター管理 */}
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <PeopleRounded color="primary" />
                  <Typography variant="h6">キャラクター</Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  キャラクターを管理します
                </Typography>
                
                <Stack spacing={1}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate(`/campaign/${id}/characters`)}
                  >
                    キャラクター管理
                  </Button>
                  
                  <Button
                    variant="text"
                    size="small"
                    onClick={createMockCharacters}
                    disabled={loading}
                  >
                    モックキャラクター作成
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* タイムライン */}
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <TimelineRounded color="primary" />
                  <Typography variant="h6">タイムライン</Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  イベントとクエストを管理します
                </Typography>
                
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(`/campaign/${id}/timeline`)}
                >
                  タイムライン
                </Button>
              </CardContent>
            </Card>

            {/* セッション開始 */}
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <PlayArrowRounded color="primary" />
                  <Typography variant="h6">セッション</Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  TRPGセッションを開始します
                </Typography>
                
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate(`/campaign/${id}/session`)}
                >
                  セッション開始
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CampaignSetupPage;