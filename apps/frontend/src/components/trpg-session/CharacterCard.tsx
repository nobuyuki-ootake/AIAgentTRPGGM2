import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  FavoriteRounded,
  ShieldRounded,
  BoltRounded,
  LocalHospitalRounded,
  EditRounded,
} from '@mui/icons-material';
import { Character, isTRPGCharacter, isNPCCharacter, isEnemyCharacter } from '@ai-agent-trpg/types';

interface CharacterCardProps {
  character: Character;
  isCompact?: boolean;
  onEdit?: () => void;
  onHeal?: () => void;
  onDamage?: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isCompact = false,
  onEdit,
  onHeal,
  onDamage,
  onSelect,
  isSelected = false,
}) => {
  const hpPercentage = (character.derivedStats.hitPoints / character.derivedStats.maxHitPoints) * 100;
  const mpPercentage = character.derivedStats.maxMagicPoints > 0
    ? (character.derivedStats.magicPoints / character.derivedStats.maxMagicPoints) * 100
    : 0;

  const getTypeColor = () => {
    if (isTRPGCharacter(character)) return 'primary';
    if (isNPCCharacter(character)) return 'success';
    if (isEnemyCharacter(character)) return 'error';
    return 'default';
  };

  const getTypeLabel = () => {
    if (isTRPGCharacter(character)) return 'PC';
    if (isNPCCharacter(character)) return 'NPC';
    if (isEnemyCharacter(character)) return 'Enemy';
    return 'Unknown';
  };

  const getHPBarColor = () => {
    if (hpPercentage > 50) return 'success';
    if (hpPercentage > 25) return 'warning';
    return 'error';
  };

  if (isCompact) {
    return (
      <Card
        sx={{
          cursor: onSelect ? 'pointer' : 'default',
          border: isSelected ? 2 : 0,
          borderColor: 'primary.main',
          transition: 'all 0.2s ease',
          '&:hover': onSelect ? {
            transform: 'translateY(-2px)',
            boxShadow: 4,
          } : {},
        }}
        onClick={onSelect}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: `${getTypeColor()}.main`,
                fontSize: '0.875rem',
              }}
            >
              {character.name.charAt(0)}
            </Avatar>
            <Box flexGrow={1}>
              <Typography variant="subtitle2" noWrap>
                {character.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lv.{character.level} {(character as any).characterClass || ''}
              </Typography>
            </Box>
            <Chip label={getTypeLabel()} size="small" color={getTypeColor()} />
          </Box>

          <Box>
            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
              <FavoriteRounded sx={{ fontSize: 16, color: 'error.main' }} />
              <Typography variant="caption">
                {character.derivedStats.hitPoints}/{character.derivedStats.maxHitPoints}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={hpPercentage}
              sx={{
                height: 6,
                borderRadius: 1,
                bgcolor: 'grey.300',
                '& .MuiLinearProgress-bar': {
                  bgcolor: `${getHPBarColor()}.main`,
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: onSelect ? 'pointer' : 'default',
        border: isSelected ? 2 : 0,
        borderColor: 'primary.main',
        transition: 'all 0.2s ease',
        '&:hover': onSelect ? {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        } : {},
      }}
      onClick={onSelect}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {character.name}
            </Typography>
            <Box display="flex" gap={1} mb={1}>
              <Chip label={getTypeLabel()} size="small" color={getTypeColor()} />
              <Chip label={`Lv.${character.level}`} size="small" variant="outlined" />
              <Chip label={character.race} size="small" variant="outlined" />
              <Chip label={(character as any).characterClass || ''} size="small" variant="outlined" />
            </Box>
          </Box>
          {onEdit && (
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <EditRounded />
            </IconButton>
          )}
        </Box>

        {/* HP バー */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <FavoriteRounded sx={{ fontSize: 18, color: 'error.main' }} />
              <Typography variant="body2">HP</Typography>
            </Box>
            <Typography variant="body2">
              {character.derivedStats.hitPoints} / {character.derivedStats.maxHitPoints}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={hpPercentage}
            sx={{
              height: 8,
              borderRadius: 1,
              bgcolor: 'grey.300',
              '& .MuiLinearProgress-bar': {
                bgcolor: `${getHPBarColor()}.main`,
              },
            }}
          />
        </Box>

        {/* MP バー（MPがある場合のみ表示） */}
        {character.derivedStats.maxMagicPoints > 0 && (
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <BoltRounded sx={{ fontSize: 18, color: 'info.main' }} />
                <Typography variant="body2">MP</Typography>
              </Box>
              <Typography variant="body2">
                {character.derivedStats.magicPoints} / {character.derivedStats.maxMagicPoints}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={mpPercentage}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'grey.300',
                '& .MuiLinearProgress-bar': {
                  bgcolor: 'info.main',
                },
              }}
            />
          </Box>
        )}

        {/* ステータス */}
        <Box display="flex" gap={2} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={0.5}>
            <ShieldRounded sx={{ fontSize: 18, color: 'warning.main' }} />
            <Typography variant="body2">AC: {character.derivedStats.armorClass}</Typography>
          </Box>
          <Typography variant="body2">速度: {character.derivedStats.speed}ft</Typography>
          <Typography variant="body2">イニシアチブ: +{character.derivedStats.initiative}</Typography>
        </Box>

        {/* 状態異常 */}
        {character.statusEffects.length > 0 && (
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              状態異常:
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
              {character.statusEffects.map((effect) => (
                <Chip
                  key={effect.id}
                  label={effect.name}
                  size="small"
                  color={effect.type === 'buff' ? 'success' : effect.type === 'debuff' ? 'error' : 'default'}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>

      {(onHeal || onDamage) && (
        <CardActions sx={{ justifyContent: 'center', borderTop: 1, borderColor: 'divider' }}>
          {onHeal && (
            <Tooltip title="回復">
              <IconButton
                size="small"
                color="success"
                onClick={(e) => { e.stopPropagation(); onHeal(); }}
              >
                <LocalHospitalRounded />
              </IconButton>
            </Tooltip>
          )}
          {onDamage && (
            <Tooltip title="ダメージ">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => { e.stopPropagation(); onDamage(); }}
              >
                <FavoriteRounded />
              </IconButton>
            </Tooltip>
          )}
        </CardActions>
      )}
    </Card>
  );
};