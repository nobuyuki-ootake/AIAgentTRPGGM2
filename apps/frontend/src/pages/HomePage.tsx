import React, { useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  useTheme,
} from '@mui/material';
import {
  AddRounded,
  CampaignRounded,
  AutoAwesomeRounded,
} from '@mui/icons-material';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { campaignListAtom, developerModeAtom } from '@/store/atoms';
import { campaignAPI } from '@/api';

const HomePage: React.FC = () => {
  const theme = useTheme();
  const campaigns = useRecoilValue(campaignListAtom);
  const setCampaigns = useSetRecoilState(campaignListAtom);
  const developerMode = useRecoilValue(developerModeAtom);

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const campaignResponse = await campaignAPI.getCampaigns();
        setCampaigns(campaignResponse.items);
      } catch (error) {
        console.error('Failed to load campaigns:', error);
      }
    };

    loadCampaigns();
  }, [setCampaigns]);

  const handleCreateCampaign = async () => {
    try {
      // モックキャンペーンを作成
      const mockData = campaignAPI.createMockCampaign();
      const campaign = await campaignAPI.createCampaign(mockData);
      
      // Recoil状態を更新
      setCampaigns(prev => [...prev, campaign]);
      
      console.log('Mock campaign created:', campaign);
      // 作成したキャンペーンに移動
      window.location.href = `/campaign/${campaign.id}/setup`;
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  const handleOpenCampaign = (campaignId: string) => {
    window.location.href = `/campaign/${campaignId}/setup`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          AI TRPG Game Master
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          AIを活用したTRPGキャンペーン管理とゲームマスター支援ツール
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddRounded />}
          size="large"
          onClick={handleCreateCampaign}
          sx={{ mb: 2 }}
        >
          新しいキャンペーンを作成
        </Button>
      </Box>

      {/* キャンペーン一覧 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          キャンペーン一覧
        </Typography>

        {campaigns.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 4 }}>
            <CardContent>
              <CampaignRounded sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                キャンペーンがまだありません
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                新しいキャンペーンを作成して、AIと一緒に素晴らしいTRPGの世界を構築しましょう
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={handleCreateCampaign}
              >
                最初のキャンペーンを作成
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {campaigns.map((campaign) => (
              <Grid item xs={12} sm={6} md={4} key={campaign.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease, shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[8],
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom noWrap>
                      {campaign.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {campaign.description || 'キャンペーンの説明がありません'}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={campaign.status}
                        size="small"
                        color={
                          campaign.status === 'active' ? 'success' :
                          campaign.status === 'planning' ? 'primary' :
                          campaign.status === 'completed' ? 'default' : 'warning'
                        }
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={`レベル ${campaign.currentLevel}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      最終更新: {new Date(campaign.updatedAt).toLocaleDateString('ja-JP')}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => handleOpenCampaign(campaign.id)}
                    >
                      開く
                    </Button>
                    <Button size="small" color="primary">
                      編集
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* 機能紹介セクション */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          主な機能
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <AutoAwesomeRounded sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  AI統合支援
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  OpenAI、Anthropic、Googleの複数AIプロバイダーを活用した包括的なゲームマスター支援
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <CampaignRounded sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  キャンペーン管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  キャンペーンの作成から運営まで、すべてを一元管理。AIによる世界設定とストーリー生成支援
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h2" sx={{ fontSize: 40, color: 'primary.main', mb: 2 }}>
                  🎲
                </Typography>
                <Typography variant="h6" gutterBottom>
                  リアルタイムセッション
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ダイスロール、チャット、戦闘管理など、セッション実行に必要な機能をすべて統合
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* 開発者モード情報 */}
      {developerMode && (
        <Box sx={{ mt: 4 }}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔧 開発者モード
              </Typography>
              <Typography variant="body2">
                開発者モードが有効です。追加のデバッグ情報とテスト機能が表示されます。
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}
    </Container>
  );
};

export default HomePage;