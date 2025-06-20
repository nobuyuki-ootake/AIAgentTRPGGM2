import React, { useState } from 'react';
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
} from '@mui/material';
import {
  PlayArrowRounded,
  PauseRounded,
  StopRounded,
  GroupRounded,
  CasinoRounded,
  SecurityRounded,
  ChatRounded,
  AssistantRounded,
  LocationOn as LocationIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { SessionState, Character } from '@ai-agent-trpg/types';
import { CharacterCard } from './CharacterCard';
import { ChatPanel } from './ChatPanel';
import { DiceRollUI } from './DiceRollUI';
import { CombatTracker } from './CombatTracker';
import { EventPanel } from './EventPanel';
import { AIControlPanel } from './AIControlPanel';
import LocationDisplay from '../locations/LocationDisplay';
import CharacterMovement from '../locations/CharacterMovement';
import ConversationPanel from '../conversations/ConversationPanel';
import { useLocations, useLocation } from '../../hooks/useLocations';

interface SessionInterfaceProps {
  session: SessionState;
  characters: Character[];
  loading: boolean;
  error: string | null;
  onStartSession: () => void;
  onEndSession: () => void;
  onSendMessage: (message: string, type: 'ic' | 'ooc', characterId?: string) => void;
  onRollDice: (dice: string, purpose: string, characterId?: string) => void;
  onStartCombat: (participantIds: string[]) => void;
  onEndCombat: () => void;
  onUpdateCharacterHP?: (characterId: string, newHP: number) => void;
}

export const SessionInterface: React.FC<SessionInterfaceProps> = ({
  session,
  characters,
  loading,
  error,
  onStartSession,
  onEndSession,
  onSendMessage,
  onRollDice,
  onStartCombat,
  onEndCombat,
  onUpdateCharacterHP,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [hpDialogOpen, setHpDialogOpen] = useState(false);
  const [hpDialogMode, setHpDialogMode] = useState<'heal' | 'damage'>('damage');
  const [hpAmount, setHpAmount] = useState('');
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [characterToMove, setCharacterToMove] = useState<Character | null>(null);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);

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
                onClick={onStartSession}
              >
                セッション開始
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
                    {pcCharacters.map(char => (
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
              onSendMessage={onSendMessage}
              onRollDice={onRollDice}
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
                <Tab icon={<CasinoRounded />} label="ダイス" />
                <Tab icon={<SecurityRounded />} label="戦闘" />
                <Tab icon={<LocationIcon />} label="場所" />
                <Tab icon={<AssistantRounded />} label="AI" />
              </Tabs>

              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {activeTab === 0 && (
                  <DiceRollUI
                    characters={characters}
                    onRoll={onRollDice}
                  />
                )}
                {activeTab === 1 && (
                  <CombatTracker
                    session={session}
                    characters={characters}
                    onStartCombat={onStartCombat}
                    onEndCombat={onEndCombat}
                  />
                )}
                {activeTab === 2 && (
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

                    {/* キャラクター移動ボタン */}
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
                {activeTab === 3 && (
                  <Box p={2} sx={{ height: '100%', overflow: 'auto' }}>
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
                              character.id
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
    </Box>
  );
};