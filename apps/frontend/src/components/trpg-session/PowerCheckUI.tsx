import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Paper,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  RestartAlt as RestartIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { BaseStats, DerivedStats } from '@ai-agent-trpg/types';

interface PowerCheckUIProps {
  /**
   * パワーチェックのタイトル
   */
  title: string;
  
  /**
   * チェックの説明
   */
  description: string;
  
  /**
   * キャラクターの基本ステータス
   */
  characterStats: BaseStats;
  
  /**
   * キャラクターの派生ステータス
   */
  derivedStats: DerivedStats;
  
  /**
   * 難易度（1-30）
   */
  difficulty: number;
  
  /**
   * 結果を受け取るコールバック
   */
  onResult: (result: PowerCheckResult) => void;
  
  /**
   * キャンセル時のコールバック
   */
  onCancel?: () => void;
  
  /**
   * 開いているかどうか
   */
  open: boolean;
}

interface PowerCheckResult {
  success: boolean;
  totalScore: number;
  powerBonus: number;
  timingBonus: number;
  difficultyPenalty: number;
  finalScore: number;
  margin: number; // 成功/失敗の幅
}

interface PowerCheckState {
  isActive: boolean;
  progress: number;
  powerLevel: number;
  targetZone: { start: number; end: number };
  timeRemaining: number;
  phase: 'ready' | 'charging' | 'timing' | 'result';
  result: PowerCheckResult | null;
}

/**
 * パワーチェック・ミニゲームコンポーネント
 * 強行突破系のチェックに使用するタイミングゲーム
 */
export const PowerCheckUI: React.FC<PowerCheckUIProps> = ({
  title,
  description,
  characterStats,
  derivedStats,
  difficulty,
  onResult,
  onCancel,
  open,
}) => {
  const [state, setState] = useState<PowerCheckState>({
    isActive: false,
    progress: 0,
    powerLevel: 0,
    targetZone: { start: 40, end: 70 },
    timeRemaining: 5000, // 5秒
    phase: 'ready',
    result: null,
  });

  const [showHelp, setShowHelp] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // キャラクターの筋力ボーナスを計算
  const strengthBonus = Math.floor((characterStats.strength - 10) / 2);
  const powerBonus = strengthBonus + (derivedStats.speed || 0);

  // 目標ゾーンを難易度に応じて調整
  useEffect(() => {
    const zoneSize = Math.max(20, 50 - difficulty); // 難易度が高いほどゾーンが狭い
    const centerPoint = 50 + (Math.random() - 0.5) * 20; // ランダムな中心点
    
    setState(prev => ({
      ...prev,
      targetZone: {
        start: Math.max(0, centerPoint - zoneSize / 2),
        end: Math.min(100, centerPoint + zoneSize / 2),
      },
    }));
  }, [difficulty, open]);

  // ゲーム開始
  const startPowerCheck = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      progress: 0,
      powerLevel: 0,
      phase: 'charging',
      result: null,
    }));

    startTimeRef.current = Date.now();

    // パワーチャージフェーズ（2秒）
    const chargeInterval = setInterval(() => {
      setState(prev => {
        const elapsed = Date.now() - startTimeRef.current;
        const chargeProgress = Math.min(elapsed / 2000, 1); // 2秒でチャージ完了
        
        if (chargeProgress >= 1) {
          clearInterval(chargeInterval);
          // タイミングフェーズに移行
          startTimingPhase();
          return {
            ...prev,
            progress: 100,
            phase: 'timing',
            timeRemaining: 3000, // 3秒でタイミング判定
          };
        }
        
        return {
          ...prev,
          progress: chargeProgress * 100,
          powerLevel: Math.sin(elapsed / 200) * 50 + 50, // 振動するパワーレベル
        };
      });
    }, 16); // 60fps

    intervalRef.current = chargeInterval;
  }, []);

  // タイミングフェーズ開始
  const startTimingPhase = useCallback(() => {
    const timingStart = Date.now();
    
    const timingInterval = setInterval(() => {
      setState(prev => {
        const elapsed = Date.now() - timingStart;
        const timeLeft = Math.max(0, 3000 - elapsed);
        
        if (timeLeft <= 0) {
          // タイムアップ - 自動実行
          clearInterval(timingInterval);
          executePowerCheck(prev.powerLevel);
          return prev;
        }
        
        return {
          ...prev,
          timeRemaining: timeLeft,
          powerLevel: Math.sin(elapsed / 150) * 40 + 50, // より激しい振動
        };
      });
    }, 16);

    intervalRef.current = timingInterval;
  }, []);

  // パワーチェック実行
  const executePowerCheck = useCallback((currentPowerLevel: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // スコア計算
    const baseScore = Math.floor(Math.random() * 20) + 1; // 1d20
    const powerBonusValue = powerBonus;
    
    // タイミングボーナス計算
    const { start, end } = state.targetZone;
    const isInZone = currentPowerLevel >= start && currentPowerLevel <= end;
    const zoneCenter = (start + end) / 2;
    const distanceFromCenter = Math.abs(currentPowerLevel - zoneCenter);
    const maxDistance = (end - start) / 2;
    
    let timingBonusValue = 0;
    if (isInZone) {
      // ゾーン内の場合、中心に近いほど高ボーナス
      timingBonusValue = Math.floor((1 - distanceFromCenter / maxDistance) * 5) + 1; // 1-5
    } else {
      // ゾーン外の場合、距離に応じてペナルティ
      const outsideDistance = Math.min(
        Math.abs(currentPowerLevel - start),
        Math.abs(currentPowerLevel - end)
      );
      timingBonusValue = -Math.floor(outsideDistance / 10); // 距離10ごとに-1
    }

    const difficultyPenaltyValue = -Math.floor(difficulty / 5); // 難易度5ごとに-1
    const totalScore = baseScore + powerBonusValue + timingBonusValue + difficultyPenaltyValue;
    const finalScore = Math.max(1, totalScore);
    const success = finalScore >= difficulty;
    const margin = finalScore - difficulty;

    const result: PowerCheckResult = {
      success,
      totalScore: baseScore,
      powerBonus: powerBonusValue,
      timingBonus: timingBonusValue,
      difficultyPenalty: difficultyPenaltyValue,
      finalScore,
      margin,
    };

    setState(prev => ({
      ...prev,
      isActive: false,
      phase: 'result',
      result,
      powerLevel: currentPowerLevel,
    }));

    // 結果を親コンポーネントに通知
    onResult(result);
  }, [powerBonus, state.targetZone, difficulty, onResult]);

  // スペースキーでタイミング判定
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' && state.phase === 'timing' && state.isActive) {
        event.preventDefault();
        executePowerCheck(state.powerLevel);
      }
    };

    if (open && state.phase === 'timing') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [open, state.phase, state.isActive, state.powerLevel, executePowerCheck]);

  // リセット
  const resetPowerCheck = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isActive: false,
      progress: 0,
      powerLevel: 0,
      phase: 'ready',
      result: null,
      timeRemaining: 5000,
    }));
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getTimingZoneColor = () => {
    const { start, end } = state.targetZone;
    const isInZone = state.powerLevel >= start && state.powerLevel <= end;
    
    if (state.phase === 'result') {
      return isInZone ? 'success.main' : 'error.main';
    }
    return isInZone ? 'warning.main' : 'grey.500';
  };

  const formatResult = (result: PowerCheckResult) => {
    const parts = [
      `基本値: ${result.totalScore}`,
      `パワー: ${result.powerBonus >= 0 ? '+' : ''}${result.powerBonus}`,
      `タイミング: ${result.timingBonus >= 0 ? '+' : ''}${result.timingBonus}`,
    ];
    
    if (result.difficultyPenalty !== 0) {
      parts.push(`難易度: ${result.difficultyPenalty}`);
    }
    
    return parts.join(' ');
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onCancel}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '500px' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {title}
          <Tooltip title="ヘルプ">
            <IconButton size="small" onClick={() => setShowHelp(true)}>
              <HelpIcon />
            </IconButton>
          </Tooltip>
          <Box sx={{ flexGrow: 1 }} />
          <Chip 
            label={`難易度: ${difficulty}`} 
            color={difficulty >= 20 ? 'error' : difficulty >= 15 ? 'warning' : 'success'}
            size="small"
          />
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            {description}
          </Typography>

          {/* キャラクター情報 */}
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              キャラクター能力
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`筋力: ${characterStats.strength} (${strengthBonus >= 0 ? '+' : ''}${strengthBonus})`} size="small" />
              <Chip label={`パワーボーナス: ${powerBonus >= 0 ? '+' : ''}${powerBonus}`} size="small" color="primary" />
            </Box>
          </Paper>

          {/* パワーメーター */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              パワーレベル: {Math.round(state.powerLevel)}%
            </Typography>
            
            <Box sx={{ position: 'relative', mb: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={state.powerLevel} 
                sx={{ 
                  height: 20,
                  borderRadius: 1,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getTimingZoneColor(),
                    transition: state.phase === 'result' ? 'background-color 0.3s' : 'none',
                  }
                }}
              />
              
              {/* 目標ゾーン表示 */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: `${state.targetZone.start}%`,
                  width: `${state.targetZone.end - state.targetZone.start}%`,
                  height: '100%',
                  bgcolor: 'success.main',
                  opacity: 0.3,
                  borderRadius: 1,
                  border: '2px solid',
                  borderColor: 'success.main',
                }}
              />
              
              {/* 目標ゾーンラベル */}
              <Typography 
                variant="caption" 
                sx={{ 
                  position: 'absolute',
                  top: '50%',
                  left: `${(state.targetZone.start + state.targetZone.end) / 2}%`,
                  transform: 'translate(-50%, -50%)',
                  color: 'success.dark',
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                }}
              >
                TARGET
              </Typography>
            </Box>
          </Box>

          {/* フェーズ表示 */}
          <Box sx={{ mb: 3 }}>
            {state.phase === 'ready' && (
              <Alert severity="info">
                準備完了！「開始」ボタンを押してパワーチェックを開始してください。
              </Alert>
            )}
            
            {state.phase === 'charging' && (
              <Alert severity="warning">
                パワーをチャージ中... ({Math.round(state.progress)}%)
              </Alert>
            )}
            
            {state.phase === 'timing' && (
              <Alert severity="error">
                <Typography variant="body2">
                  <strong>スペースキーを押してタイミングを決定！</strong>
                </Typography>
                <Typography variant="caption">
                  残り時間: {Math.ceil(state.timeRemaining / 1000)}秒
                </Typography>
              </Alert>
            )}
            
            {state.phase === 'result' && state.result && (
              <Alert severity={state.result.success ? 'success' : 'error'}>
                <Typography variant="body2">
                  <strong>{state.result.success ? '成功！' : '失敗...'}</strong>
                </Typography>
                <Typography variant="caption" component="div">
                  {formatResult(state.result)} = <strong>{state.result.finalScore}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {state.result.success 
                    ? `${state.result.margin}ポイント上回りました`
                    : `${Math.abs(state.result.margin)}ポイント足りませんでした`
                  }
                </Typography>
              </Alert>
            )}
          </Box>

          {/* プログレスバー（チャージフェーズ用） */}
          {state.phase === 'charging' && (
            <LinearProgress 
              variant="determinate" 
              value={state.progress} 
              sx={{ mb: 2, height: 8, borderRadius: 1 }}
            />
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onCancel} disabled={state.isActive}>
            キャンセル
          </Button>
          
          {state.phase === 'ready' && (
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={startPowerCheck}
              data-testid="power-check-start"
            >
              開始
            </Button>
          )}
          
          {state.phase === 'timing' && (
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={() => executePowerCheck(state.powerLevel)}
              data-testid="power-check-execute"
            >
              実行 (Space)
            </Button>
          )}
          
          {state.phase === 'result' && (
            <Button
              variant="outlined"
              startIcon={<RestartIcon />}
              onClick={resetPowerCheck}
              data-testid="power-check-reset"
            >
              再挑戦
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ヘルプダイアログ */}
      <Dialog open={showHelp} onClose={() => setShowHelp(false)} maxWidth="sm" fullWidth>
        <DialogTitle>パワーチェックの使い方</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            <strong>パワーチェック</strong>は、強行突破や力技での解決を試みる際に使用するミニゲームです。
          </Typography>
          
          <Typography variant="subtitle2" gutterBottom>遊び方：</Typography>
          <Box component="ol" sx={{ pl: 2, mb: 2 }}>
            <li>「開始」ボタンを押すとパワーチャージが始まります</li>
            <li>2秒後、タイミングフェーズに移行します</li>
            <li>緑色の目標ゾーンに合わせて<strong>スペースキー</strong>を押します</li>
            <li>タイミングが良いほど高いボーナスが得られます</li>
          </Box>
          
          <Typography variant="subtitle2" gutterBottom>スコア計算：</Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>基本値: 1d20のダイスロール</li>
            <li>パワーボーナス: 筋力修正値 + 速度ボーナス</li>
            <li>タイミングボーナス: 目標ゾーンの精度 (+1～+5)</li>
            <li>難易度ペナルティ: 高難易度の場合の減点</li>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelp(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};