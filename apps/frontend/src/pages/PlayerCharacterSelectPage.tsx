import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Avatar,
  useTheme,
  Alert,
  LinearProgress,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  SportsEsportsRounded,
  PersonRounded,
  CheckCircleRounded,
  PlayArrowRounded,
  PersonAddRounded,
  ImportExportRounded,
  ErrorRounded,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  currentCampaignAtom,
  charactersAtom,
  playerCharacterAtom,
  characterLoadingAtom,
  appModeAtom,
} from '@/store/atoms';
import { characterAPI, sessionAPI, campaignAPI } from '@/api';
import { Character, TRPGCharacter } from '@ai-agent-trpg/types';
import { CustomCharacterGenerationForm } from '@/components/characters/CustomCharacterGenerationForm';
import { CharacterImportExport } from '@/components/characters/CharacterImportExport';
import { aiCharacterGenerationAPI } from '@/api/aiCharacterGeneration';

const PlayerCharacterSelectPage: React.FC = () => {
  console.log('🔧 PlayerCharacterSelectPage レンダリング開始');
  const theme = useTheme();
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  console.log('🔧 campaignId:', campaignId);

  const currentCampaign = useRecoilValue(currentCampaignAtom);
  const [characters, setCharacters] = useRecoilState(charactersAtom);
  const [, setPlayerCharacter] = useRecoilState(playerCharacterAtom);
  const characterLoading = useRecoilValue(characterLoadingAtom);
  const setCharacterLoading = useSetRecoilState(characterLoadingAtom);
  const appMode = useRecoilValue(appModeAtom);

  // 🔍 DEBUG: Recoil状態をコンソール出力
  useEffect(() => {
    console.log('🔍 PlayerCharacterSelect Recoil State:', {
      currentCampaign: currentCampaign ? { id: currentCampaign.id, name: currentCampaign.name } : null,
      charactersCount: characters.length,
      characterLoading,
      appMode,
      campaignId
    });
  }, [currentCampaign, characters.length, characterLoading, appMode, campaignId]);

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [customGenDialogOpen, setCustomGenDialogOpen] = useState(false);
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isGeneratingCharacters, setIsGeneratingCharacters] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, message: '' });

  // ユーザーモードでない場合はリダイレクト
  useEffect(() => {
    if (appMode !== 'user') {
      navigate('/');
      return;
    }
  }, [appMode, navigate]);

  // キャラクター一覧の読み込み
  useEffect(() => {
    const loadCharacters = async () => {
      if (!campaignId || !currentCampaign) return;

      setCharacterLoading(true);
      try {
        console.log(`Loading characters for campaign: ${campaignId}`);
        const characterResponse = await characterAPI.getCharactersByCampaign(campaignId);
        console.log(`Loaded ${characterResponse.length} characters:`, characterResponse);
        
        // プレイヤーキャラクター（PC）のみフィルタリング
        const playableChars = characterResponse.filter(character => 
          character.characterType === 'PC'
        );
        
        if (playableChars.length === 0) {
          console.log('🎭 No playable characters found, auto-generating characters for player mode...');
          await autoGenerateCharacters();
        } else {
          setCharacters(characterResponse);
        }
      } catch (error) {
        console.error('Failed to load characters:', error);
        handleCharacterGenerationError('キャラクター読み込み中にエラーが発生しました');
      } finally {
        setCharacterLoading(false);
      }
    };

    loadCharacters();
  }, [campaignId, currentCampaign]);

  // AI自動キャラクター生成処理（プレイヤーモード用）
  const autoGenerateCharacters = async () => {
    if (!campaignId || !currentCampaign) return;

    try {
      setIsGeneratingCharacters(true);
      console.log('🎭 Starting automatic character generation for player mode...');
      
      // キャンペーンのテーマを取得（デフォルトはクラシックファンタジー）
      const theme = currentCampaign.theme || 'クラシックファンタジー';
      
      // AIにキャラクターを自動生成してもらう
      const generatedCharacters = await aiCharacterGenerationAPI.generateCharactersBatch(
        campaignId,
        theme as any,
        'google',
        (current, total, currentCharacter) => {
          console.log(`🎭 Character generation progress: ${current}/${total} - ${currentCharacter}`);
          setGenerationProgress({ current, total, message: currentCharacter });
        }
      );

      console.log(`🎭 Generated ${generatedCharacters.length} characters:`, generatedCharacters);

      if (generatedCharacters.length === 0) {
        throw new Error('AI character generation returned no characters');
      }

      // 生成されたキャラクターをデータベースに保存
      const savedCharacters: Character[] = [];
      for (const character of generatedCharacters) {
        try {
          const savedCharacter = await characterAPI.createCharacter(character);
          savedCharacters.push(savedCharacter);
        } catch (error) {
          console.error('Failed to save generated character:', character.name, error);
        }
      }

      if (savedCharacters.length === 0) {
        throw new Error('Failed to save any generated characters');
      }

      // プレイヤーキャラクター（PC）のみ取得
      const pcCharacters = savedCharacters.filter(char => char.characterType === 'PC');
      
      if (pcCharacters.length === 0) {
        throw new Error('No playable characters (PC) were generated');
      }

      // Recoil stateを更新
      setCharacters(savedCharacters);
      console.log(`🎭 Successfully generated and saved ${pcCharacters.length} playable characters`);

    } catch (error) {
      console.error('🎭 Character auto-generation failed:', error);
      handleCharacterGenerationError(
        `キャラクター自動生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsGeneratingCharacters(false);
    }
  };

  // キャラクター生成エラー処理（キャンペーン削除とホーム遷移）
  const handleCharacterGenerationError = async (message: string) => {
    setErrorMessage(message);
    setErrorDialogOpen(true);
  };

  // エラーダイアログでOKを押した時の処理
  const handleErrorDialogClose = async () => {
    setErrorDialogOpen(false);
    
    // ⚠️ キャンペーン削除処理を削除 - キャラクターの保持を確保
    console.log('ℹ️ Error dialog closed - preserving campaign and characters');
    
    // ホームページに戻る
    navigate('/');
  };

  // プレイ可能なキャラクター（PCのみ）
  const playableCharacters = characters.filter(character => 
    character.characterType === 'PC',
  ) as TRPGCharacter[];

  const handleCharacterSelect = (character: Character) => {
    console.log('=== キャラクター選択処理 ===');
    console.log('選択されたキャラクター:', character.name, character.id);
    setSelectedCharacterId(character.id);
    console.log('selectedCharacterIdを設定:', character.id);
  };

  const handleStartGame = async () => {
    console.log('🎮 === ゲーム開始処理開始 ===');
    console.log('🎮 selectedCharacterId:', selectedCharacterId);
    console.log('🎮 campaignId:', campaignId);
    
    const selectedChar = characters.find(c => c.id === selectedCharacterId);
    console.log('🎮 selectedChar:', selectedChar);
    
    if (selectedChar && campaignId) {
      console.log('🎮 条件満たしてセッション作成開始');
      setPlayerCharacter(selectedChar);
      
      try {
        // キャンペーンの既存セッションを取得
        console.log('🎮 キャンペーンのセッション一覧を取得');
        const sessionsResponse = await sessionAPI.getSessionsByCampaign(campaignId);
        console.log('🎮 既存セッション一覧:', sessionsResponse);
        
        let session;
        if (sessionsResponse.length > 0) {
          // 既存の最初のセッションを使用
          session = sessionsResponse[0];
          console.log('🎮 既存セッションを使用:', session.id);
        } else {
          // セッションが存在しない場合のみ新規作成
          console.log('🎮 セッションが存在しないため新規作成');
          const mockSession = sessionAPI.createMockSession(campaignId);
          session = await sessionAPI.createSession(mockSession);
          console.log('🎮 新規作成されたセッション:', session);
        }
        
        // セッション画面へ遷移（プレイヤーモード用ルート）
        const targetUrl = `/campaign/${campaignId}/play/${session.id}`;
        console.log('🎮 遷移先URL:', targetUrl);
        console.log('🎮 選択キャラクターと共に遷移:', selectedChar.name);
        console.log('🎮 navigate stateに渡すデータ:', { selectedPlayerCharacter: selectedChar });
        navigate(targetUrl, { 
          state: { 
            selectedPlayerCharacter: selectedChar 
          } 
        });
        console.log('🎮 navigate実行完了');
      } catch (error) {
        console.error('🎮 Failed to get/create session:', error);
      }
    } else {
      console.log('🎮 条件未満足 - selectedChar:', !!selectedChar, 'campaignId:', !!campaignId);
    }
  };

  const handleCustomCharacterGenerated = async (character: Character) => {
    try {
      const createdCharacter = await characterAPI.createCharacter(character);
      setCharacters(prev => [...prev, createdCharacter]);
      setCustomGenDialogOpen(false);
    } catch (error) {
      console.error('Failed to save generated character:', error);
    }
  };

  const handleCharacterImported = async (character: Character) => {
    try {
      const createdCharacter = await characterAPI.createCharacter(character);
      setCharacters(prev => [...prev, createdCharacter]);
      setImportExportDialogOpen(false);
    } catch (error) {
      console.error('Failed to save imported character:', error);
    }
  };

  const getCharacterStatusColor = (character: TRPGCharacter) => {
    if (character.derivedStats?.hitPoints === 0) return 'error';
    if ((character.derivedStats?.hitPoints || 0) < (character.derivedStats?.maxHitPoints || 0) * 0.3) return 'warning';
    return 'success';
  };

  const getCharacterDescription = (character: TRPGCharacter) => {
    const level = character.level || 1;
    const classInfo = character.characterClass || '冒険者';
    return `レベル${level} ${classInfo}`;
  };

  if (characterLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            キャラクター選択
          </Typography>
          <Typography variant="h6" color="text.secondary">
            プレイするキャラクターを選択してください
          </Typography>
        </Box>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          キャラクター選択
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          プレイするキャラクターを選択してください
        </Typography>
        
        {currentCampaign && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>{currentCampaign.name}</strong> でのセッションを開始します。
              操作するキャラクターを1つ選択して、AIゲームマスターとの冒険を始めましょう！
            </Typography>
          </Alert>
        )}
      </Box>

      {/* キャラクター選択 */}
      <Box sx={{ mb: 4 }}>
        {playableCharacters.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 4 }}>
            <CardContent>
              <PersonRounded sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                プレイ可能なキャラクターがありません
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                キャンペーンにプレイヤーキャラクター（PC）が作成されていません。
                開発者モードでキャラクターを作成してください。
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate(`/campaign/${campaignId}/characters`)}
              >
                キャラクター管理へ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {playableCharacters.map((character) => (
              <Grid item xs={12} sm={6} md={4} key={character.id}>
                <Fade in timeout={300}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      border: selectedCharacterId === character.id ? 2 : 1,
                      borderColor: selectedCharacterId === character.id ? 'primary.main' : 'divider',
                      transform: selectedCharacterId === character.id ? 'scale(1.02)' : 'scale(1)',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: theme.shadows[8],
                      },
                    }}
                    onClick={() => handleCharacterSelect(character)}
                  >
                    <CardContent sx={{ flexGrow: 1, position: 'relative' }}>
                      {/* 選択インジケーター */}
                      {selectedCharacterId === character.id && (
                        <CheckCircleRounded
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            color: 'primary.main',
                            fontSize: 28,
                          }}
                        />
                      )}

                      {/* キャラクター基本情報 */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          sx={{
                            width: 56,
                            height: 56,
                            mr: 2,
                            bgcolor: 'primary.main',
                          }}
                        >
                          {character.name.charAt(0)}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" noWrap>
                            {character.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getCharacterDescription(character)}
                          </Typography>
                        </Box>
                      </Box>

                      {/* キャラクター説明 */}
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
                          minHeight: '4.5em',
                        }}
                      >
                        {character.description || 'キャラクターの説明がありません'}
                      </Typography>

                      {/* ステータス情報 */}
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <Chip
                            label={`HP: ${character.derivedStats?.hitPoints || 0}/${character.derivedStats?.maxHitPoints || 0}`}
                            size="small"
                            color={getCharacterStatusColor(character)}
                            variant="outlined"
                          />
                          <Chip
                            label={`MP: ${character.derivedStats?.magicPoints || 0}/${character.derivedStats?.maxMagicPoints || 0}`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={character.characterType}
                            size="small"
                            color="primary"
                          />
                          {character.alignment && (
                            <Chip
                              label={character.alignment}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>

                      {/* 最終更新日 */}
                      <Typography variant="caption" color="text.secondary">
                        最終更新: {new Date(character.updatedAt).toLocaleDateString('ja-JP')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* キャラクター管理ボタン */}
      <Box sx={{ textAlign: 'center', mt: 3, mb: 2 }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<PersonAddRounded />}
              onClick={() => setCustomGenDialogOpen(true)}
              sx={{ minWidth: 180 }}
            >
              カスタムキャラクター作成
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<ImportExportRounded />}
              onClick={() => setImportExportDialogOpen(true)}
              sx={{ minWidth: 180 }}
            >
              インポート/エクスポート
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* ゲーム開始ボタン */}
      {playableCharacters.length > 0 && (() => {
        console.log('🔧 ゲーム開始ボタンレンダリング - selectedCharacterId:', selectedCharacterId);
        return (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              type="button"
              variant="contained"
              size="large"
              startIcon={<PlayArrowRounded />}
              disabled={!selectedCharacterId}
              onMouseDown={() => console.log('🔧 マウスダウン!')}
              onMouseUp={() => console.log('🔧 マウスアップ!')}
              onFocus={() => console.log('🔧 フォーカス!')}
              onKeyDown={(e) => console.log('🔧 キーダウン:', e.key)}
              onClick={(e) => {
                console.log('🔧 === ボタンクリックイベント発生! ===');
                console.log('🔧 イベント詳細:', e.type, e.currentTarget);
                console.log('🔧 selectedCharacterId at click time:', selectedCharacterId);
                e.preventDefault();
                e.stopPropagation();
                handleStartGame();
              }}
              sx={{
                minWidth: 200,
                py: 1.5,
                fontSize: '1.1rem',
                boxShadow: selectedCharacterId ? theme.shadows[8] : undefined,
              }}
            >
              {selectedCharacterId ? 'ゲーム開始！' : 'キャラクターを選択してください'}
            </Button>
          </Box>
        );
      })()}

      {/* プレイヤーモード説明 */}
      <Box sx={{ mt: 6 }}>
        <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SportsEsportsRounded sx={{ mr: 1 }} />
              <Typography variant="h6">
                プレイヤーモードについて
              </Typography>
            </Box>
            <Typography variant="body2">
              • AIが完全に自律的なゲームマスターとして進行します<br />
              • 選択したキャラクターの視点でゲームを楽しめます<br />
              • チャットでの発言や行動選択でストーリーが進行します<br />
              • 仲間キャラクターが自動的に反応し、サポートしてくれます
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* カスタムキャラクター生成ダイアログ */}
      {campaignId && (
        <CustomCharacterGenerationForm
          open={customGenDialogOpen}
          onClose={() => setCustomGenDialogOpen(false)}
          campaignId={campaignId}
          onCharacterGenerated={handleCustomCharacterGenerated}
        />
      )}

      {/* インポート・エクスポートダイアログ */}
      {campaignId && (
        <CharacterImportExport
          open={importExportDialogOpen}
          onClose={() => setImportExportDialogOpen(false)}
          characters={characters}
          onImportCharacter={handleCharacterImported}
          campaignId={campaignId}
        />
      )}

      {/* エラーダイアログ */}
      <Dialog
        open={errorDialogOpen}
        onClose={() => {}} // 自動では閉じない
        aria-labelledby="error-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="error-dialog-title" sx={{ color: 'error.main', display: 'flex', alignItems: 'center' }}>
          <ErrorRounded sx={{ mr: 1 }} />
          キャラクター生成エラー
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {errorMessage}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            このキャンペーンは削除され、ホーム画面に戻ります。
            別のテーマで再度キャンペーンを作成してください。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleErrorDialogClose} variant="contained" color="primary">
            了解
          </Button>
        </DialogActions>
      </Dialog>

      {/* キャラクター生成進捗モーダル */}
      <Dialog
        open={isGeneratingCharacters}
        onClose={() => {}} // 自動では閉じない
        aria-labelledby="character-generation-progress-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="character-generation-progress-title">
          AIキャラクター生成中
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            プレイヤーモード用のキャラクターが存在しないため、AIが自動的にキャラクターを生成しています。
          </Alert>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {generationProgress.message || 'キャラクター生成準備中...'}
            </Typography>
          </Box>
          
          <LinearProgress 
            variant={generationProgress.total > 0 ? "determinate" : "indeterminate"}
            value={generationProgress.total > 0 ? (generationProgress.current / generationProgress.total) * 100 : 0}
            sx={{ height: 8, borderRadius: 4 }}
          />
          
          {generationProgress.total > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              {generationProgress.current} / {generationProgress.total} 完了
            </Typography>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            しばらくお待ちください...
          </Typography>
        </DialogContent>
      </Dialog>

    </Container>
  );
};

export default PlayerCharacterSelectPage;