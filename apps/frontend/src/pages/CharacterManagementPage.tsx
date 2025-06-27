import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Tabs,
  Tab,
  Alert,
  Stack,
} from '@mui/material';
import {
  PersonRounded,
  GroupRounded,
  SecurityRounded,
} from '@mui/icons-material';
import { useRecoilValue } from 'recoil';
import { currentCampaignAtom } from '@/store/atoms';
import { characterAPI } from '@/api';
import { Character /*, isTRPGCharacter, isNPCCharacter, isEnemyCharacter */ } from '@ai-agent-trpg/types';
import { CharacterCard } from '@/components/trpg-session/CharacterCard';
import { LoadingScreen } from '@/components/common/LoadingScreen';

const CharacterManagementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const currentCampaign = useRecoilValue(currentCampaignAtom);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const loadCharacters = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!id) {
        throw new Error('Campaign ID is required');
      }
      const campaignCharacters = await characterAPI.getCharactersByCampaign(id);
      setCharacters(campaignCharacters);
    } catch (err) {
      setError('キャラクターの読み込みに失敗しました');
      console.error('Failed to load characters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadCharacters();
    }
  }, [id]);

  // キャンペーンIDがない場合はホームにリダイレクト
  if (!id) {
    return <Navigate to="/" replace />;
  }

  // キャンペーンが読み込まれていない場合はキャンペーンページにリダイレクト
  if (!currentCampaign || currentCampaign.id !== id) {
    return <Navigate to={`/campaign/${id}/setup`} replace />;
  }

  // const pcCharacters = characters.filter(isTRPGCharacter);
  const pcCharacters = characters.filter(char => char.characterType === 'PC');
  // const npcCharacters = characters.filter(isNPCCharacter);
  const npcCharacters = characters.filter(char => char.characterType === 'NPC');
  // const enemyCharacters = characters.filter(isEnemyCharacter);
  const enemyCharacters = characters.filter(char => char.characterType === 'Enemy');

  const tabData = [
    { label: 'すべて', icon: <GroupRounded />, characters: characters },
    { label: 'PC', icon: <PersonRounded />, characters: pcCharacters },
    { label: 'NPC', icon: <GroupRounded />, characters: npcCharacters },
    { label: '敵', icon: <SecurityRounded />, characters: enemyCharacters },
  ];

  const currentCharacters = tabData[activeTab].characters;

  if (loading) {
    return <LoadingScreen message="キャラクターを読み込み中..." />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        キャラクター管理
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {currentCampaign.name}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, value) => setActiveTab(value)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabData.map((tab, index) => (
            <Tab 
              key={index}
              icon={tab.icon} 
              label={`${tab.label} (${tab.characters.length})`}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {currentCharacters.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            color: 'text.secondary',
          }}
        >
          <GroupRounded sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom>
            {activeTab === 0 ? 'キャラクターがいません' : `${tabData[activeTab].label}キャラクターがいません`}
          </Typography>
          <Typography variant="body2">
            キャンペーン設定ページで「モックキャラクター作成」ボタンを押してテストデータを作成できます
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {currentCharacters.map((character) => (
            <Grid item xs={12} sm={6} md={4} key={character.id}>
              <CharacterCard
                character={character}
                onEdit={() => {
                  console.log('Edit character:', character.id);
                  // TODO: キャラクター編集ダイアログを開く
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* 統計情報 */}
      {characters.length > 0 && (
        <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            統計情報
          </Typography>
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="h4" color="primary">{pcCharacters.length}</Typography>
              <Typography variant="caption">プレイヤーキャラクター</Typography>
            </Box>
            <Box>
              <Typography variant="h4" color="success.main">{npcCharacters.length}</Typography>
              <Typography variant="caption">NPC</Typography>
            </Box>
            <Box>
              <Typography variant="h4" color="error.main">{enemyCharacters.length}</Typography>
              <Typography variant="caption">敵キャラクター</Typography>
            </Box>
            <Box>
              <Typography variant="h4" color="text.primary">{characters.length}</Typography>
              <Typography variant="caption">合計</Typography>
            </Box>
          </Stack>
        </Box>
      )}
    </Container>
  );
};

export default CharacterManagementPage;