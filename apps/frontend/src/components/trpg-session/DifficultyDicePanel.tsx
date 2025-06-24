import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Stack,
  Chip,
  Card,
  CardContent,
  Tooltip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
} from '@mui/material';
import {
  CasinoRounded,
  TuneRounded,
  AutoAwesomeRounded,
  ExpandMoreRounded,
  InfoRounded,
  TrendingUpRounded,
  TrendingDownRounded,
  CalculateRounded,
} from '@mui/icons-material';
import {
  DynamicDifficultySettings,
  Character,
  TaskEvaluation,
} from '@ai-agent-trpg/types';

interface DifficultyDicePanelProps {
  difficultySettings: DynamicDifficultySettings | null;
  character: Character;
  taskEvaluation?: TaskEvaluation;
  playerSolution: string;
  loading?: boolean;
  disabled?: boolean;
  allowManualAdjustment?: boolean;
  onDifficultyAdjust?: (adjustment: Partial<DynamicDifficultySettings>) => void;
  onExecuteRoll: () => void;
  onSimulatePreviousRolls?: () => void;
}

interface DiceAnimation {
  isRolling: boolean;
  currentValue: number;
  targetValue: number;
  rollCount: number;
}

interface DifficultyAnalysis {
  overallDifficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme';
  successChance: number;
  criticalChance: number;
  failureChance: number;
  modifierTotal: number;
}

export const DifficultyDicePanel: React.FC<DifficultyDicePanelProps> = ({
  difficultySettings,
  character,
  taskEvaluation,
  playerSolution: _playerSolution,
  loading = false,
  disabled = false,
  allowManualAdjustment = false,
  onDifficultyAdjust,
  onExecuteRoll,
  onSimulatePreviousRolls,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [diceAnimation, setDiceAnimation] = useState<DiceAnimation>({
    isRolling: false,
    currentValue: 10,
    targetValue: 10,
    rollCount: 0,
  });
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [manualTargetNumber, setManualTargetNumber] = useState(15);

  // 難易度分析の計算
  const analyzeDifficulty = (): DifficultyAnalysis => {
    if (!difficultySettings) {
      return {
        overallDifficulty: 'medium',
        successChance: 50,
        criticalChance: 5,
        failureChance: 50,
        modifierTotal: 0,
      };
    }

    const modifierTotal = difficultySettings.modifiers.reduce((sum, mod) => sum + mod.value, 0);
    const effectiveTarget = difficultySettings.baseTargetNumber + modifierTotal;
    
    // キャラクターのボーナス計算（仮実装）
    const characterBonus = Math.floor((character.level - 1) / 4) + 2; // 簡略化したボーナス計算
    
    // 成功確率計算（d20システムを想定）
    const successThreshold = Math.max(1, effectiveTarget - characterBonus);
    const successChance = Math.max(0, Math.min(100, (21 - successThreshold) * 5));
    const criticalChance = 5; // d20で20が出る確率
    const failureChance = 100 - successChance;

    let overallDifficulty: DifficultyAnalysis['overallDifficulty'] = 'medium';
    if (successChance >= 80) overallDifficulty = 'trivial';
    else if (successChance >= 65) overallDifficulty = 'easy';
    else if (successChance >= 35) overallDifficulty = 'medium';
    else if (successChance >= 15) overallDifficulty = 'hard';
    else overallDifficulty = 'extreme';

    return {
      overallDifficulty,
      successChance,
      criticalChance,
      failureChance,
      modifierTotal,
    };
  };

  const analysis = analyzeDifficulty();

  // ダイスアニメーション
  const startDiceAnimation = () => {
    setDiceAnimation(prev => ({ ...prev, isRolling: true, rollCount: 0 }));
    
    const animationInterval = setInterval(() => {
      setDiceAnimation(prev => {
        const newValue = Math.floor(Math.random() * 20) + 1;
        const newCount = prev.rollCount + 1;
        
        if (newCount >= 10) { // 10回転がったら停止
          clearInterval(animationInterval);
          return {
            ...prev,
            isRolling: false,
            currentValue: newValue,
            targetValue: newValue,
            rollCount: newCount,
          };
        }
        
        return {
          ...prev,
          currentValue: newValue,
          rollCount: newCount,
        };
      });
    }, 100);
  };

  // 難易度の色を取得
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'trivial': return 'success';
      case 'easy': return 'info';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      case 'extreme': return 'error';
      default: return 'default';
    }
  };


  // 手動調整を適用
  const applyManualAdjustment = () => {
    if (onDifficultyAdjust && difficultySettings) {
      onDifficultyAdjust({
        baseTargetNumber: manualTargetNumber,
      });
    }
    setAdjustmentDialogOpen(false);
  };

  // 初期値設定
  useEffect(() => {
    if (difficultySettings) {
      setManualTargetNumber(difficultySettings.baseTargetNumber);
    }
  }, [difficultySettings]);

  if (!difficultySettings) {
    return (
      <Alert severity="info">
        難易度設定が計算されていません。プレイヤーの解決方法を評価してください。
      </Alert>
    );
  }

  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <CasinoRounded color="primary" />
        <Typography variant="h6">
          難易度調整・ダイス判定
        </Typography>
        <Tooltip title="AI分析に基づいて動的に調整された難易度です">
          <InfoRounded fontSize="small" color="action" />
        </Tooltip>
      </Box>

      {/* 難易度概要 */}
      <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              現在の難易度設定
            </Typography>
            {allowManualAdjustment && (
              <Button
                size="small"
                startIcon={<TuneRounded />}
                onClick={() => setAdjustmentDialogOpen(true)}
                disabled={loading || disabled}
              >
                手動調整
              </Button>
            )}
          </Box>

          <Stack spacing={2}>
            {/* 基本情報 */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">
                目標値: {difficultySettings.baseTargetNumber}
              </Typography>
              <Chip
                label={analysis.overallDifficulty}
                color={getDifficultyColor(analysis.overallDifficulty)}
                variant="filled"
              />
            </Box>

            {/* 成功確率表示 */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">成功確率</Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {Math.round(analysis.successChance)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={analysis.successChance}
                color={analysis.successChance > 60 ? 'success' : analysis.successChance > 30 ? 'warning' : 'error'}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            {/* ダイス情報 */}
            <Box display="flex" gap={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  ダイスタイプ
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {difficultySettings.rollType}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  クリティカル成功
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {difficultySettings.criticalSuccess}+
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  クリティカル失敗
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="error.main">
                  {difficultySettings.criticalFailure}-
                </Typography>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* 修正値詳細 */}
      {difficultySettings.modifiers.length > 0 && (
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreRounded />}
            onClick={() => setShowDetails(!showDetails)}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <CalculateRounded fontSize="small" />
              <Typography variant="subtitle2">
                修正値詳細 (合計: {analysis.modifierTotal >= 0 ? '+' : ''}{analysis.modifierTotal})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              {difficultySettings.modifiers.map((modifier, index) => (
                <Box
                  key={modifier.id || index}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    p: 1,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    borderLeft: 4,
                    borderLeftColor: modifier.value >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    {modifier.value >= 0 ? (
                      <TrendingDownRounded color="success" fontSize="small" />
                    ) : (
                      <TrendingUpRounded color="error" fontSize="small" />
                    )}
                    <Typography variant="body2">
                      {modifier.description}
                    </Typography>
                    {modifier.temporary && (
                      <Chip label="一時的" size="small" variant="outlined" />
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={modifier.value >= 0 ? 'success.main' : 'error.main'}
                  >
                    {modifier.value >= 0 ? '+' : ''}{modifier.value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* タスク評価情報 */}
      {taskEvaluation && (
        <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <AutoAwesomeRounded color="primary" fontSize="small" />
              <Typography variant="subtitle2">
                AI評価結果
              </Typography>
            </Box>
            <Stack spacing={1}>
              <Box display="flex" gap={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    実現可能性
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {taskEvaluation.feasibility}%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    創造性
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {taskEvaluation.creativity}%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    リスクレベル
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {taskEvaluation.riskLevel}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {taskEvaluation.reasoning}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ダイス表示エリア */}
      <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
        <Box mb={2}>
          <Typography variant="h4" color="primary" fontWeight="bold">
            {difficultySettings.rollType}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            目標値: {difficultySettings.baseTargetNumber} 以上
          </Typography>
        </Box>

        {/* ダイス表示 */}
        <Box
          sx={{
            width: 120,
            height: 120,
            mx: 'auto',
            mb: 3,
            border: 4,
            borderColor: 'primary.main',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            animation: diceAnimation.isRolling ? 'shake 0.1s infinite' : 'none',
            '@keyframes shake': {
              '0%': { transform: 'translate(1px, 1px) rotate(0deg)' },
              '10%': { transform: 'translate(-1px, -2px) rotate(-1deg)' },
              '20%': { transform: 'translate(-3px, 0px) rotate(1deg)' },
              '30%': { transform: 'translate(3px, 2px) rotate(0deg)' },
              '40%': { transform: 'translate(1px, -1px) rotate(1deg)' },
              '50%': { transform: 'translate(-1px, 2px) rotate(-1deg)' },
              '60%': { transform: 'translate(-3px, 1px) rotate(0deg)' },
              '70%': { transform: 'translate(3px, 1px) rotate(-1deg)' },
              '80%': { transform: 'translate(-1px, -1px) rotate(1deg)' },
              '90%': { transform: 'translate(1px, 2px) rotate(0deg)' },
              '100%': { transform: 'translate(1px, -2px) rotate(-1deg)' },
            },
          }}
        >
          <Typography variant="h2" fontWeight="bold" color="primary">
            {diceAnimation.currentValue}
          </Typography>
        </Box>

        {/* 実行ボタン */}
        <Button
          variant="contained"
          size="large"
          onClick={() => {
            startDiceAnimation();
            onExecuteRoll();
          }}
          disabled={loading || disabled || diceAnimation.isRolling}
          startIcon={<CasinoRounded />}
          sx={{ minWidth: 180, height: 48 }}
        >
          {diceAnimation.isRolling ? 'ダイス回転中...' : 'ダイスを振る！'}
        </Button>

        {/* 追加オプション */}
        <Box mt={2} display="flex" justifyContent="center" gap={1}>
          {onSimulatePreviousRolls && (
            <Button
              size="small"
              variant="outlined"
              onClick={onSimulatePreviousRolls}
              disabled={loading || disabled}
            >
              過去の結果を見る
            </Button>
          )}
        </Box>
      </Paper>

      {/* 統計情報 */}
      <Alert severity="info" icon={<InfoRounded />}>
        <Typography variant="body2">
          この判定で{Math.round(analysis.successChance)}%の確率で成功します。
          クリティカル成功の場合、追加ボーナスが得られる可能性があります。
          失敗した場合は、リトライオプションが利用できます。
        </Typography>
      </Alert>

      {/* 手動調整ダイアログ */}
      <Dialog
        open={adjustmentDialogOpen}
        onClose={() => setAdjustmentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          手動難易度調整
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              目標値: {manualTargetNumber}
            </Typography>
            <Slider
              value={manualTargetNumber}
              onChange={(_, value) => setManualTargetNumber(value as number)}
              min={5}
              max={25}
              step={1}
              marks={[
                { value: 5, label: '5 (非常に簡単)' },
                { value: 10, label: '10 (簡単)' },
                { value: 15, label: '15 (普通)' },
                { value: 20, label: '20 (困難)' },
                { value: 25, label: '25 (非常に困難)' },
              ]}
              valueLabelDisplay="auto"
            />
            <Alert severity="warning" sx={{ mt: 2 }}>
              手動調整は慎重に行ってください。AI分析結果を無視すると、
              ゲームバランスが崩れる可能性があります。
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustmentDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={applyManualAdjustment}
          >
            適用
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};