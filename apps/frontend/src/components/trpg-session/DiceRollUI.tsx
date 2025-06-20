import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CasinoRounded,
  AddRounded,
  RemoveRounded,
  HistoryRounded,
} from '@mui/icons-material';
import { Character } from '@ai-agent-trpg/types';
import { sessionAPI } from '@/api';

interface DiceRollUIProps {
  characters: Character[];
  onRoll: (dice: string, purpose: string, characterId?: string) => void;
  recentRolls?: Array<{
    dice: string;
    result: number;
    purpose: string;
    timestamp: string;
  }>;
}

interface DiceConfig {
  count: number;
  sides: number;
  modifier: number;
}

export const DiceRollUI: React.FC<DiceRollUIProps> = ({
  characters,
  onRoll,
  recentRolls = [],
}) => {
  const [diceConfig, setDiceConfig] = useState<DiceConfig>({
    count: 1,
    sides: 20,
    modifier: 0,
  });
  const [purpose, setPurpose] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [customExpression, setCustomExpression] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const diceSides = [4, 6, 8, 10, 12, 20, 100];
  const commonPurposes = [
    '攻撃ロール',
    'ダメージロール',
    'セーヴィングスロー',
    'スキルチェック',
    'イニシアチブ',
    'アビリティチェック',
  ];

  const getDiceExpression = (): string => {
    if (useCustom) return customExpression;
    
    const { count, sides, modifier } = diceConfig;
    let expression = `${count}d${sides}`;
    if (modifier > 0) expression += `+${modifier}`;
    else if (modifier < 0) expression += modifier;
    return expression;
  };

  const handleRoll = () => {
    const dice = getDiceExpression();
    if (!dice) return;

    const finalPurpose = purpose || 'General roll';
    onRoll(dice, finalPurpose, selectedCharacterId || undefined);
    
    // リセット
    setPurpose('');
  };

  const adjustCount = (delta: number) => {
    setDiceConfig(prev => ({
      ...prev,
      count: Math.max(1, Math.min(20, prev.count + delta)),
    }));
  };

  const adjustModifier = (delta: number) => {
    setDiceConfig(prev => ({
      ...prev,
      modifier: Math.max(-20, Math.min(20, prev.modifier + delta)),
    }));
  };

  const previewRoll = () => {
    const expression = getDiceExpression();
    const result = sessionAPI.simulateDiceRoll(expression);
    return result;
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <CasinoRounded color="primary" />
        <Typography variant="h6">ダイスロール</Typography>
      </Box>

      <Stack spacing={2}>
        {/* キャラクター選択 */}
        <FormControl fullWidth size="small">
          <InputLabel>キャラクター</InputLabel>
          <Select
            value={selectedCharacterId}
            onChange={(e) => setSelectedCharacterId(e.target.value)}
            label="キャラクター"
          >
            <MenuItem value="">
              <em>なし</em>
            </MenuItem>
            {characters.map((char) => (
              <MenuItem key={char.id} value={char.id}>
                {char.name} (Lv.{char.level} {char.class})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ダイス設定 */}
        {!useCustom ? (
          <>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                ダイスタイプ
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {diceSides.map((sides) => (
                  <Chip
                    key={sides}
                    label={`d${sides}`}
                    clickable
                    color={diceConfig.sides === sides ? 'primary' : 'default'}
                    onClick={() => setDiceConfig(prev => ({ ...prev, sides }))}
                  />
                ))}
              </Stack>
            </Box>

            <Box display="flex" gap={2}>
              {/* ダイス数 */}
              <Box flex={1}>
                <Typography variant="subtitle2" gutterBottom>
                  ダイス数
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <IconButton size="small" onClick={() => adjustCount(-1)}>
                    <RemoveRounded />
                  </IconButton>
                  <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'center' }}>
                    {diceConfig.count}
                  </Typography>
                  <IconButton size="small" onClick={() => adjustCount(1)}>
                    <AddRounded />
                  </IconButton>
                </Box>
              </Box>

              {/* 修正値 */}
              <Box flex={1}>
                <Typography variant="subtitle2" gutterBottom>
                  修正値
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <IconButton size="small" onClick={() => adjustModifier(-1)}>
                    <RemoveRounded />
                  </IconButton>
                  <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'center' }}>
                    {diceConfig.modifier >= 0 ? '+' : ''}{diceConfig.modifier}
                  </Typography>
                  <IconButton size="small" onClick={() => adjustModifier(1)}>
                    <AddRounded />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </>
        ) : (
          <TextField
            fullWidth
            size="small"
            label="カスタムダイス式"
            value={customExpression}
            onChange={(e) => setCustomExpression(e.target.value)}
            placeholder="例: 2d6+3, 1d20-2"
            helperText="複雑なダイス式を直接入力できます"
          />
        )}

        <Box display="flex" justifyContent="center">
          <Button
            size="small"
            onClick={() => setUseCustom(!useCustom)}
          >
            {useCustom ? 'シンプルモード' : 'カスタムモード'}
          </Button>
        </Box>

        {/* 目的 */}
        <Box>
          <TextField
            fullWidth
            size="small"
            label="ロールの目的"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="例: 知覚チェック、攻撃ロール"
          />
          <Box mt={1}>
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {commonPurposes.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  size="small"
                  clickable
                  onClick={() => setPurpose(p)}
                />
              ))}
            </Stack>
          </Box>
        </Box>

        {/* 現在の式表示 */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.default',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" color="primary">
            {getDiceExpression()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {purpose || 'General roll'}
          </Typography>
        </Box>

        {/* ロールボタン */}
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<CasinoRounded />}
          onClick={handleRoll}
          disabled={!getDiceExpression()}
        >
          ロール！
        </Button>

        {/* 最近のロール */}
        {recentRolls.length > 0 && (
          <>
            <Divider />
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <HistoryRounded fontSize="small" />
                <Typography variant="subtitle2">最近のロール</Typography>
              </Box>
              <Stack spacing={0.5}>
                {recentRolls.slice(0, 5).map((roll, index) => (
                  <Box
                    key={index}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      p: 1,
                      bgcolor: 'background.default',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="caption">
                      {roll.dice} → {roll.result}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {roll.purpose}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </>
        )}
      </Stack>
    </Paper>
  );
};