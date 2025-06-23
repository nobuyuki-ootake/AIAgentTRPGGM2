import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Stack,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  PlayArrowRounded,
  StopRounded,
  SkipNextRounded,
  SecurityRounded,
  ShieldRounded,
  PersonRounded,
  GroupRounded,
  FlagRounded,
} from '@mui/icons-material';
import { Character, SessionState } from '@ai-agent-trpg/types';

interface CombatTrackerProps {
  session: SessionState;
  characters: Character[];
  onStartCombat: (participantIds: string[]) => void;
  onEndCombat: () => void;
  onNextTurn?: () => void;
}

export const CombatTracker: React.FC<CombatTrackerProps> = ({
  session,
  characters,
  onStartCombat,
  onEndCombat,
  onNextTurn,
}) => {
  const [startCombatOpen, setStartCombatOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const isInCombat = session.mode === 'combat' && session.combat?.active;

  const handleStartCombat = () => {
    setSelectedParticipants([]);
    setStartCombatOpen(true);
  };

  const handleConfirmStartCombat = () => {
    if (selectedParticipants.length > 0) {
      onStartCombat(selectedParticipants);
      setStartCombatOpen(false);
    }
  };

  const toggleParticipant = (characterId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId],
    );
  };

  const getCurrentTurnCharacter = () => {
    if (!session.combat || !session.combat.turnOrder.length) return null;
    const currentTurn = session.combat.turnOrder[session.combat.currentTurn];
    return characters.find(c => c.id === currentTurn.characterId);
  };

  const getCharacterTypeIcon = (character: Character) => {
    switch (character.characterType) {
    case 'PC': return <PersonRounded />;
    case 'NPC': return <GroupRounded />;
    case 'Enemy': return <SecurityRounded />;
    default: return <PersonRounded />;
    }
  };

  const getCharacterTypeColor = (character: Character) => {
    switch (character.characterType) {
    case 'PC': return 'primary';
    case 'NPC': return 'success';
    case 'Enemy': return 'error';
    default: return 'default';
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <SecurityRounded color="error" />
          <Typography variant="h6">戦闘管理</Typography>
        </Box>
        
        {!isInCombat ? (
          <Button
            variant="contained"
            size="small"
            startIcon={<PlayArrowRounded />}
            onClick={handleStartCombat}
          >
            戦闘開始
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<StopRounded />}
            onClick={onEndCombat}
          >
            戦闘終了
          </Button>
        )}
      </Box>

      {isInCombat && session.combat ? (
        <Stack spacing={2}>
          {/* 戦闘情報 */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              ラウンド
            </Typography>
            <Typography variant="h4" color="primary">
              {session.combat.round}
            </Typography>
          </Box>

          {/* 現在のターン */}
          {getCurrentTurnCharacter() && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                現在のターン
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar sx={{ bgcolor: 'primary.dark' }}>
                    {getCharacterTypeIcon(getCurrentTurnCharacter()!)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {getCurrentTurnCharacter()!.name}
                    </Typography>
                    <Typography variant="caption">
                      {(getCurrentTurnCharacter() as any)?.characterClass || ''} Lv.{getCurrentTurnCharacter()!.level}
                    </Typography>
                  </Box>
                </Box>
                {onNextTurn && (
                  <IconButton
                    color="inherit"
                    onClick={onNextTurn}
                    sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
                  >
                    <SkipNextRounded />
                  </IconButton>
                )}
              </Box>
            </Box>
          )}

          {/* ターン順 */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              ターン順
            </Typography>
            <List dense>
              {session.combat.turnOrder.map((turn, index) => {
                const character = characters.find(c => c.id === turn.characterId);
                if (!character) return null;

                const isCurrent = index === session.combat!.currentTurn;
                const hasActed = turn.hasActed;

                return (
                  <ListItem
                    key={turn.characterId}
                    sx={{
                      bgcolor: isCurrent ? 'action.selected' : 'transparent',
                      borderRadius: 1,
                      mb: 0.5,
                      opacity: hasActed && !isCurrent ? 0.6 : 1,
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={index + 1}
                        color="primary"
                        anchorOrigin={{
                          vertical: 'top',
                          horizontal: 'left',
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: `${getCharacterTypeColor(character)}.main`,
                          }}
                        >
                          {getCharacterTypeIcon(character)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={character.name}
                      secondary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="caption">
                            イニシアチブ: {turn.initiative}
                          </Typography>
                          {hasActed && (
                            <Chip
                              label="行動済"
                              size="small"
                              color="default"
                              sx={{ height: 20 }}
                            />
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Tooltip title="HP">
                          <Chip
                            label={`${character.derivedStats.hitPoints}/${character.derivedStats.maxHitPoints}`}
                            size="small"
                            color={
                              character.derivedStats.hitPoints / character.derivedStats.maxHitPoints > 0.5
                                ? 'success'
                                : character.derivedStats.hitPoints / character.derivedStats.maxHitPoints > 0.25
                                  ? 'warning'
                                  : 'error'
                            }
                          />
                        </Tooltip>
                        <Tooltip title="AC">
                          <Chip
                            icon={<ShieldRounded />}
                            label={character.derivedStats.armorClass}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        </Stack>
      ) : (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <FlagRounded sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
          <Typography variant="body2">
            戦闘が開始されていません
          </Typography>
          <Typography variant="caption">
            戦闘を開始するには「戦闘開始」ボタンをクリックしてください
          </Typography>
        </Box>
      )}

      {/* 戦闘開始ダイアログ */}
      <Dialog
        open={startCombatOpen}
        onClose={() => setStartCombatOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>戦闘参加者を選択</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            戦闘に参加するキャラクターを選択してください。
            選択後、各キャラクターのイニシアチブがロールされます。
          </Typography>
          <List>
            {characters.map((character) => (
              <ListItem key={character.id} dense>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedParticipants.includes(character.id)}
                      onChange={() => toggleParticipant(character.id)}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: `${getCharacterTypeColor(character)}.main`,
                        }}
                      >
                        {getCharacterTypeIcon(character)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          {character.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(character as any).characterClass || ''} Lv.{character.level} | 
                          イニシアチブ修正: +{character.derivedStats.initiative}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartCombatOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmStartCombat}
            disabled={selectedParticipants.length === 0}
            startIcon={<PlayArrowRounded />}
          >
            戦闘開始
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};