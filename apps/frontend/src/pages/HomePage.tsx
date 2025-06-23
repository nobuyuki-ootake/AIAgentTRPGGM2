import React, { useEffect, useState, useCallback } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CardActionArea,
  Alert,
  Snackbar,
  IconButton,
  LinearProgress,
  Backdrop,
  Paper,
} from '@mui/material';
import {
  AddRounded,
  CampaignRounded,
  AutoAwesomeRounded,
  PlayArrowRounded,
  CloseRounded,
} from '@mui/icons-material';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { campaignListAtom, developerModeAtom, appModeAtom, userModeAtom, currentCampaignAtom } from '@/store/atoms';
import { useNavigate } from 'react-router-dom';
import { campaignAPI, characterAPI, aiCharacterGenerationAPI } from '@/api';
import { GameTheme } from '@ai-agent-trpg/types';

const HomePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const campaigns = useRecoilValue(campaignListAtom);
  const setCampaigns = useSetRecoilState(campaignListAtom);
  const currentCampaign = useRecoilValue(currentCampaignAtom);
  const setCurrentCampaign = useSetRecoilState(currentCampaignAtom);
  const developerMode = useRecoilValue(developerModeAtom);
  const appMode = useRecoilValue(appModeAtom);
  const userMode = useRecoilValue(userModeAtom);

  // 🔍 DEBUG: Recoil状態をコンソール出力
  useEffect(() => {
    console.log('🔍 HomePage Recoil State:', {
      currentCampaign: currentCampaign ? { id: currentCampaign.id, name: currentCampaign.name } : null,
      campaignsCount: campaigns.length,
      appMode,
      developerMode,
      userMode
    });
  }, [currentCampaign, campaigns.length, appMode, developerMode, userMode]);

  // テーマ選択関連の状態
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<GameTheme | null>(null);
  const [customThemeInput, setCustomThemeInput] = useState('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    campaignId: string;
    campaignName: string;
  }>({ open: false, campaignId: '', campaignName: '' });
  const [errorMessage, setErrorMessage] = useState<string>('');

  // AI キャラクター生成進捗状態
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // 事前定義されたゲームテーマ
  const predefinedThemes: GameTheme[] = [
    {
      id: 'classic_fantasy',
      name: 'クラシックファンタジー',
      description: '剣と魔法の王道冒険。勇者となって魔王を倒す旅に出ましょう。',
      genre: 'fantasy',
      setting: '中世ファンタジー世界',
      mood: 'heroic',
      difficulty: 'normal',
      style: 'balanced',
      keyElements: ['魔法', 'ダンジョン', 'ドラゴン', '古代遺跡'],
    },
    {
      id: 'horror_mystery',
      name: 'ホラーミステリー',
      description: '謎に包まれた洋館で起きる怪事件を解決する探索型ホラー。',
      genre: 'horror',
      setting: '呪われた洋館',
      mood: 'mysterious',
      difficulty: 'challenging',
      style: 'puzzle_solving',
      keyElements: ['謎解き', '調査', '恐怖', '超常現象'],
    },
    {
      id: 'sci_fi_adventure',
      name: 'SF宇宙冒険',
      description: '宇宙船で銀河を旅し、未知の惑星を探索するスペースオペラ。',
      genre: 'sci_fi',
      setting: '宇宙船と未知の惑星',
      mood: 'action',
      difficulty: 'normal',
      style: 'exploration',
      keyElements: ['宇宙船', 'エイリアン', 'テクノロジー', '未知の惑星'],
    },
    {
      id: 'modern_supernatural',
      name: '現代異能',
      description: '現代社会に潜む超能力者や怪異と戦うアクション。',
      genre: 'modern',
      setting: '現代日本の都市',
      mood: 'action',
      difficulty: 'normal',
      style: 'combat_heavy',
      keyElements: ['超能力', '秘密組織', '都市伝説', '現代兵器'],
    },
    {
      id: 'cozy_slice_of_life',
      name: 'ほのぼの日常',
      description: 'ファンタジー世界の小さな町で繰り広げられる心温まる物語。',
      genre: 'fantasy',
      setting: '平和な田舎町',
      mood: 'comedic',
      difficulty: 'casual',
      style: 'roleplay_focused',
      keyElements: ['日常生活', '料理', '友情', '小さな事件'],
    },
    {
      id: 'custom',
      name: 'カスタムテーマ',
      description: '自分だけのオリジナルテーマで冒険を始めましょう。',
      genre: 'custom',
      setting: '',
      mood: 'dramatic',
      difficulty: 'normal',
      style: 'balanced',
    },
  ];

  // キャンペーン一覧を読み込む共通関数
  const loadCampaigns = useCallback(async () => {
    try {
      const campaignResponse = await campaignAPI.getCampaigns();
      setCampaigns(campaignResponse.items);
      console.log(`Loaded ${campaignResponse.items.length} campaigns from API`);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      setErrorMessage('キャンペーン一覧の読み込みに失敗しました。');
    }
  }, [setCampaigns, setErrorMessage]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

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
      setErrorMessage('キャンペーンの作成に失敗しました。再度お試しください。');
    }
  };

  // プレイヤーモード用の新しい冒険開始
  const handleStartNewAdventure = () => {
    setThemeDialogOpen(true);
  };

  const handleThemeSelect = (theme: GameTheme) => {
    setSelectedTheme(theme);
  };

  const handleCreateCampaignWithTheme = async () => {
    if (!selectedTheme) return;

    setIsCreatingCampaign(true);
    let createdCampaign: any = null;
    
    try {
      let finalTheme = selectedTheme;
      
      // カスタムテーマの場合、プレイヤー入力を追加
      if (selectedTheme.id === 'custom' && customThemeInput) {
        finalTheme = {
          ...selectedTheme,
          playerPrompt: customThemeInput,
          setting: customThemeInput,
          aiInstructions: `プレイヤーが希望するテーマ: ${customThemeInput}`,
        };
      }

      // テーマベースのキャンペーンを作成
      const mockData = campaignAPI.createMockCampaign();
      const campaignData = {
        ...mockData,
        name: `${finalTheme.name}の冒険`,
        description: finalTheme.description,
        settings: {
          ...mockData.settings,
          gameSystem: mockData.settings?.gameSystem || 'D&D 5e',
          theme: finalTheme.name,
          setting: finalTheme.setting || finalTheme.name,
          world: {
            ...(mockData.settings?.world || {}),
            name: finalTheme.setting,
            description: finalTheme.description,
            technologyLevel: mockData.settings?.world?.technologyLevel || 'medieval',
            magicLevel: mockData.settings?.world?.magicLevel || 'medium',
            scale: mockData.settings?.world?.scale || 'regional',
            tone: (finalTheme.mood === 'heroic' ? 'serious' : 
              finalTheme.mood === 'comedic' ? 'comedic' : 
                finalTheme.mood === 'dark' ? 'dark' : 'mixed') as 'light' | 'serious' | 'dark' | 'comedic' | 'mixed',
          },
          players: mockData.settings?.players || {
            expectedCount: 4,
            experienceLevel: 'intermediate',
            playStyle: 'balanced',
            sessionLength: 240,
            frequency: 'weekly',
          },
          rules: mockData.settings?.rules || {
            allowMulticlassing: true,
            allowOptionalRules: true,
            deathSaves: true,
            criticalHitRules: 'standard',
            restVariant: 'standard',
            experienceType: 'milestone',
          },
          ai: mockData.settings?.ai || {
            assistanceLevel: 'moderate',
            autoGenerateNPCs: true,
            autoGenerateEvents: true,
            dynamicDifficulty: true,
            preferredProviders: ['google'],
          },
        },
      };
      
      createdCampaign = await campaignAPI.createCampaign(campaignData);
      console.log('✅ Campaign created:', createdCampaign.id, createdCampaign.name);
      
      // Recoil状態を更新
      setCampaigns(prev => [...prev, createdCampaign]);
      setCurrentCampaign(createdCampaign);  // 🔧 重要: currentCampaignにも設定
      console.log('🔧 Set currentCampaign in Recoil:', createdCampaign.id);
      
      // テーマ選択ダイアログを先に閉じる
      setThemeDialogOpen(false);
      
      // AIキャラクター生成を実行
      console.log('Starting AI character generation...');
      setGenerationProgress({ current: 0, total: 4, message: 'キャラクター生成を開始中...' });
      
      await generateCharactersForTheme(createdCampaign.id, finalTheme);
      
      // 進捗表示を完了後2秒で非表示
      setTimeout(() => {
        setGenerationProgress(null);
      }, 2000);
      
      // キャラクター選択画面へ移動（React Routerを使用してRecoil状態を保持）
      console.log('Navigating to character selection...');
      navigate(`/campaign/${createdCampaign.id}/player-select`);
    } catch (error) {
      console.error('Failed to create themed campaign:', error);
      
      // キャラクター生成に失敗した場合、作成されたキャンペーンを削除
      if (createdCampaign) {
        console.log('Cleaning up created campaign due to character generation failure...');
        try {
          await campaignAPI.deleteCampaign(createdCampaign.id);
          setCampaigns(prev => prev.filter(c => c.id !== createdCampaign.id));
          console.log('Successfully cleaned up incomplete campaign');
        } catch (cleanupError) {
          console.error('Failed to cleanup campaign:', cleanupError);
        }
      }
      
      // 進捗表示をクリア
      setGenerationProgress(null);
      
      // ユーザーに分かりやすいエラーメッセージを表示
      let errorMsg = 'キャンペーンの作成に失敗しました。';
      if (error.message && error.message.includes('AI')) {
        errorMsg = 'AIキャラクター生成に失敗しました。AI設定を確認して再度お試しください。';
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  // テーマに合ったキャラクターをAI生成（進捗表示付きバッチ処理）
  const generateCharactersForTheme = async (campaignId: string, theme: GameTheme) => {
    try {
      console.log(`Generating AI characters for theme: ${theme.name}`);
      
      // 進捗コールバック関数
      const onProgress = (current: number, total: number, currentCharacter: string) => {
        console.log(`Progress: ${current}/${total} - ${currentCharacter}`);
        // 進捗状態をステートで管理（TODO: ステート追加）
        setGenerationProgress({
          current,
          total,
          message: currentCharacter,
        });
      };
      
      // バッチ処理でAI キャラクターを生成
      const aiGeneratedCharacters = await aiCharacterGenerationAPI.generateCharactersBatch(
        campaignId,
        theme,
        'google', // Google Gemini を使用
        onProgress
      );
      
      console.log(`Generated ${aiGeneratedCharacters.length} AI characters`);
      
      // 生成されたキャラクターをデータベースに保存
      setGenerationProgress({
        current: aiGeneratedCharacters.length,
        total: aiGeneratedCharacters.length + 1,
        message: 'キャラクター保存中...',
      });

      for (const character of aiGeneratedCharacters) {
        // キャラクターにcampaignIdを確実に設定
        const characterWithCampaignId = {
          ...character,
          campaignId,
        };
        await characterAPI.createCharacter(characterWithCampaignId);
      }
      
      setGenerationProgress({
        current: aiGeneratedCharacters.length + 1,
        total: aiGeneratedCharacters.length + 1,
        message: 'キャラクター生成完了',
      });
      
      console.log('All AI generated characters saved successfully');
    } catch (error) {
      console.error('Failed to generate AI characters:', error);
      
      // AI生成に失敗した場合はエラーを表示してユーザーにリトライを促す
      throw error;
    }
  };


  const handleOpenCampaign = async (campaignId: string) => {
    try {
      // 🔧 キャンペーン情報をサーバーから取得してRecoilに設定
      console.log('🔄 Loading campaign for opening:', campaignId);
      const campaign = await campaignAPI.getCampaignById(campaignId);
      setCurrentCampaign(campaign);
      console.log('🔧 Set currentCampaign in Recoil for existing campaign:', campaign.id, campaign.name);
      
      if (!developerMode) {
        // プレイヤーモード: プレイヤーキャラクター選択画面へ
        navigate(`/campaign/${campaignId}/player-select`);
      } else {
        // シナリオ編集モード: キャンペーン設定画面へ
        navigate(`/campaign/${campaignId}/setup`);
      }
    } catch (error) {
      console.error('❌ Failed to load campaign:', error);
      // フォールバック: 直接遷移（デバッグ目的）
      if (!developerMode) {
        navigate(`/campaign/${campaignId}/player-select`);
      } else {
        navigate(`/campaign/${campaignId}/setup`);
      }
    }
  };

  const handleDeleteCampaign = (campaignId: string, campaignName: string) => {
    setDeleteConfirmDialog({
      open: true,
      campaignId,
      campaignName,
    });
  };

  const handleConfirmDelete = async () => {
    const { campaignId } = deleteConfirmDialog;
    setDeleteConfirmDialog({ open: false, campaignId: '', campaignName: '' });
    setDeletingCampaignId(campaignId);
    
    try {
      await campaignAPI.deleteCampaign(campaignId);
      
      // 削除後にキャンペーン一覧を再取得して状態を確実に更新
      await loadCampaigns();
      
      console.log(`Campaign ${campaignId} deleted successfully, campaign list refreshed`);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      setErrorMessage('キャンペーンの削除に失敗しました。再度お試しください。');
    } finally {
      setDeletingCampaignId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmDialog({ open: false, campaignId: '', campaignName: '' });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          AI TRPG Game Master
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          {!developerMode
            ? 'AIゲームマスターと一緒に冒険を楽しもう！'
            : 'AIを活用したTRPGキャンペーン管理とゲームマスター支援ツール'
          }
        </Typography>
        
        {developerMode ? (
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            size="large"
            onClick={handleCreateCampaign}
            sx={{ mb: 2 }}
          >
            新しいキャンペーンを作成
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<PlayArrowRounded />}
            size="large"
            onClick={handleStartNewAdventure}
            sx={{ 
              mb: 2,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
            }}
          >
            新しい冒険を始める
          </Button>
        )}
      </Box>

      {/* キャンペーン一覧 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          {!developerMode ? '利用可能な冒険' : 'キャンペーン一覧'}
        </Typography>

        {campaigns.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 4 }}>
            <CardContent>
              <CampaignRounded sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {!developerMode ? '利用可能な冒険がありません' : 'キャンペーンがまだありません'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {!developerMode 
                  ? 'プレイできる冒険がまだ準備されていません。シナリオ編集モードでキャンペーンを作成してください。'
                  : '新しいキャンペーンを作成して、AIと一緒に素晴らしいTRPGの世界を構築しましょう'
                }
              </Typography>
              {developerMode ? (
                <Button
                  variant="contained"
                  startIcon={<AddRounded />}
                  onClick={handleCreateCampaign}
                >
                  最初のキャンペーンを作成
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<PlayArrowRounded />}
                  onClick={handleStartNewAdventure}
                  sx={{ 
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                  }}
                >
                  初めての冒険を始める
                </Button>
              )}
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
                      {!developerMode ? '冒険開始' : '開く'}
                    </Button>
                    {developerMode && (
                      <>
                        <Button size="small" color="primary">
                          編集
                        </Button>
                        <Button 
                          size="small" 
                          color="error"
                          disabled={deletingCampaignId === campaign.id}
                          onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                        >
                          {deletingCampaignId === campaign.id ? '削除中...' : '削除'}
                        </Button>
                      </>
                    )}
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

      {/* テーマ選択ダイアログ */}
      <Dialog
        open={themeDialogOpen}
        onClose={() => setThemeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeRounded color="primary" />
            <Typography variant="h5">
              今回の冒険テーマを選択
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            どんな冒険を楽しみたいですか？AIゲームマスターがテーマに合わせた世界とキャラクターを準備します。
          </Typography>
          
          <Grid container spacing={2}>
            {predefinedThemes.map((theme) => (
              <Grid item xs={12} sm={6} key={theme.id}>
                <Card 
                  variant={selectedTheme?.id === theme.id ? 'elevation' : 'outlined'}
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedTheme?.id === theme.id ? 2 : 1,
                    borderColor: selectedTheme?.id === theme.id ? 'primary.main' : 'divider',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardActionArea onClick={() => handleThemeSelect(theme)}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {theme.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {theme.description}
                      </Typography>
                      {theme.keyElements && theme.keyElements.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {theme.keyElements.map((element, index) => (
                            <Chip
                              key={index}
                              label={element}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* カスタムテーマ入力 */}
          {selectedTheme?.id === 'custom' && (
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="カスタムテーマの詳細"
                placeholder="どんな世界観、設定、雰囲気で遊びたいか自由に書いてください"
                value={customThemeInput}
                onChange={(e) => setCustomThemeInput(e.target.value)}
                variant="outlined"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setThemeDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateCampaignWithTheme}
            disabled={!selectedTheme || (selectedTheme.id === 'custom' && !customThemeInput) || isCreatingCampaign}
            startIcon={isCreatingCampaign ? undefined : <PlayArrowRounded />}
          >
            {isCreatingCampaign ? '冒険を準備中...' : 'この世界で冒険開始'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* キャンペーン削除確認ダイアログ */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" color="error">
            キャンペーンを削除
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            「<strong>{deleteConfirmDialog.campaignName}</strong>」を削除しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary">
            この操作は取り消せません。関連するキャラクター、クエスト、セッションデータもすべて削除されます。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deletingCampaignId === deleteConfirmDialog.campaignId}
          >
            {deletingCampaignId === deleteConfirmDialog.campaignId ? '削除中...' : '削除する'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* エラーメッセージ表示 */}
      <Snackbar
        open={!!errorMessage}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          onClose={() => setErrorMessage('')}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={() => setErrorMessage('')}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          }
        >
          {errorMessage}
        </Alert>
      </Snackbar>

      {/* AI キャラクター生成進捗表示 */}
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.modal + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
        open={generationProgress !== null}
      >
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 2,
            minWidth: 400,
            maxWidth: 500,
            textAlign: 'center',
          }}
        >
          <Box sx={{ mb: 3 }}>
            <AutoAwesomeRounded sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
              AIキャラクター生成中
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {generationProgress?.message || 'キャラクターを生成しています...'}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={generationProgress ? (generationProgress.current / generationProgress.total) * 100 : 0}
              sx={{
                height: 8,
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                },
              }}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {generationProgress 
              ? `${generationProgress.current} / ${generationProgress.total} 完了`
              : '準備中...'
            }
          </Typography>
          
          <Typography variant="caption" color="warning.main" sx={{ fontWeight: 'bold' }}>
            ⚠️ この処理をキャンセルすると、キャンペーンが削除されます
          </Typography>
        </Paper>
      </Backdrop>
    </Container>
  );
};

export default HomePage;