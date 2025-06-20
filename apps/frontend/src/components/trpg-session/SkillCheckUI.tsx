import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Grid,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  RestartAlt as RestartIcon,
  Help as HelpIcon,
  Speed as SpeedIcon,
  Visibility as PerceptionIcon,
  Psychology as IntelligenceIcon,
  Favorite as WisdomIcon,
  Group as CharismaIcon,
  Security as ConstitutionIcon,
} from '@mui/icons-material';
import { BaseStats, DerivedStats, Skill } from '@ai-agent-trpg/types';

interface SkillCheckUIProps {
  /**
   * スキルチェックのタイトル
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
   * 利用可能なスキル
   */
  availableSkills: Skill[];
  
  /**
   * 推奨されるスキル（複数可）
   */
  suggestedSkills: string[];
  
  /**
   * 難易度（1-30）
   */
  difficulty: number;
  
  /**
   * チェックの種類
   */
  checkType: 'stealth' | 'perception' | 'investigation' | 'persuasion' | 'intimidation' | 'deception' | 'athletics' | 'acrobatics' | 'sleight_of_hand' | 'custom';
  
  /**
   * 結果を受け取るコールバック
   */
  onResult: (result: SkillCheckResult) => void;
  
  /**
   * キャンセル時のコールバック
   */
  onCancel?: () => void;
  
  /**
   * 開いているかどうか
   */
  open: boolean;
}

interface SkillCheckResult {
  success: boolean;
  skillUsed: Skill;
  baseRoll: number;
  skillBonus: number;
  abilityBonus: number;
  challengeBonus: number;
  difficultyPenalty: number;
  finalScore: number;
  margin: number;
  criticalSuccess: boolean;
  criticalFailure: boolean;
}

interface SkillChallengeState {
  phase: 'selection' | 'challenge' | 'result';
  selectedSkill: Skill | null;
  challengeProgress: number;
  challengeTargets: number[];
  currentTarget: number;
  hits: number;
  misses: number;
  timeRemaining: number;
  result: SkillCheckResult | null;
}

/**
 * スキルチェック・ミニゲームコンポーネント
 * 技能系チェックに使用するインタラクティブチャレンジ
 */
export const SkillCheckUI: React.FC<SkillCheckUIProps> = ({
  title,
  description,
  characterStats,
  derivedStats,
  availableSkills,
  suggestedSkills,
  difficulty,
  checkType,
  onResult,
  onCancel,
  open,
}) => {
  const [state, setState] = useState<SkillChallengeState>({
    phase: 'selection',
    selectedSkill: null,
    challengeProgress: 0,
    challengeTargets: [],
    currentTarget: 0,
    hits: 0,
    misses: 0,
    timeRemaining: 10000, // 10秒
    result: null,
  });

  const [showHelp, setShowHelp] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // スキルアイコンマッピング
  const getSkillIcon = (skillName: string) => {
    const lowerName = skillName.toLowerCase();
    if (lowerName.includes('perception') || lowerName.includes('察知')) return <PerceptionIcon />;
    if (lowerName.includes('stealth') || lowerName.includes('隠密')) return <SpeedIcon />;
    if (lowerName.includes('investigation') || lowerName.includes('調査')) return <IntelligenceIcon />;
    if (lowerName.includes('persuasion') || lowerName.includes('説得')) return <CharismaIcon />;
    if (lowerName.includes('athletics') || lowerName.includes('運動')) return <ConstitutionIcon />;
    return <IntelligenceIcon />;
  };

  // 能力値ボーナス計算
  const getAbilityBonus = (skill: Skill): number => {
    switch (skill.attribute) {
      case 'strength': return Math.floor((characterStats.strength - 10) / 2);
      case 'dexterity': return Math.floor((characterStats.dexterity - 10) / 2);
      case 'constitution': return Math.floor((characterStats.constitution - 10) / 2);
      case 'intelligence': return Math.floor((characterStats.intelligence - 10) / 2);
      case 'wisdom': return Math.floor((characterStats.wisdom - 10) / 2);
      case 'charisma': return Math.floor((characterStats.charisma - 10) / 2);
      default: return 0;
    }
  };

  // スキル選択
  const selectSkill = useCallback((skill: Skill) => {
    setState(prev => ({
      ...prev,
      selectedSkill: skill,
    }));
  }, []);

  // チャレンジ開始
  const startChallenge = useCallback(() => {
    if (!state.selectedSkill) return;

    // 難易度に応じてターゲット数を決定
    const targetCount = Math.max(3, Math.floor(difficulty / 3)); // 難易度に比例
    const targets = Array.from({ length: targetCount }, (_, i) => i);

    setState(prev => ({
      ...prev,
      phase: 'challenge',
      challengeTargets: targets,
      currentTarget: 0,
      hits: 0,
      misses: 0,
      challengeProgress: 0,
      timeRemaining: Math.max(5000, 15000 - difficulty * 200), // 難易度が高いほど短時間
    }));

    startTimeRef.current = Date.now();

    // タイマー開始
    const timer = setInterval(() => {
      setState(prev => {
        const elapsed = Date.now() - startTimeRef.current;
        const timeLeft = Math.max(0, prev.timeRemaining - elapsed);
        
        if (timeLeft <= 0) {
          clearInterval(timer);
          // 時間切れ - 現在の結果で終了
          finishChallenge(prev.hits, prev.misses, prev.challengeTargets.length);
          return prev;
        }
        
        return {
          ...prev,
          challengeProgress: elapsed,
        };
      });
    }, 100);

    intervalRef.current = timer;
  }, [state.selectedSkill, difficulty]);

  // ターゲットヒット
  const hitTarget = useCallback(() => {
    setState(prev => {
      const newHits = prev.hits + 1;
      const newCurrentTarget = prev.currentTarget + 1;
      
      if (newCurrentTarget >= prev.challengeTargets.length) {
        // 全ターゲット完了
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        finishChallenge(newHits, prev.misses, prev.challengeTargets.length);
        return prev;
      }
      
      return {
        ...prev,
        hits: newHits,
        currentTarget: newCurrentTarget,
      };
    });
  }, []);

  // ターゲットミス
  const missTarget = useCallback(() => {
    setState(prev => {
      const newMisses = prev.misses + 1;
      const newCurrentTarget = prev.currentTarget + 1;
      
      if (newCurrentTarget >= prev.challengeTargets.length) {
        // 全ターゲット完了
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        finishChallenge(prev.hits, newMisses, prev.challengeTargets.length);
        return prev;
      }
      
      return {
        ...prev,
        misses: newMisses,
        currentTarget: newCurrentTarget,
      };
    });
  }, []);

  // チャレンジ終了
  const finishChallenge = useCallback((hits: number, misses: number, totalTargets: number) => {
    if (!state.selectedSkill) return;

    const skill = state.selectedSkill;
    
    // スコア計算
    const baseRoll = Math.floor(Math.random() * 20) + 1; // 1d20
    const skillBonus = skill.level || 0;
    const abilityBonus = getAbilityBonus(skill);
    
    // チャレンジボーナス計算（ヒット率に基づく）
    const hitRate = hits / totalTargets;
    let challengeBonus = 0;
    if (hitRate >= 0.9) challengeBonus = 5;       // 90%以上
    else if (hitRate >= 0.75) challengeBonus = 3; // 75%以上
    else if (hitRate >= 0.5) challengeBonus = 1;  // 50%以上
    else if (hitRate < 0.25) challengeBonus = -2; // 25%未満はペナルティ

    const difficultyPenalty = -Math.floor(difficulty / 5); // 難易度5ごとに-1
    const finalScore = Math.max(1, baseRoll + skillBonus + abilityBonus + challengeBonus + difficultyPenalty);
    
    const success = finalScore >= difficulty;
    const margin = finalScore - difficulty;
    const criticalSuccess = baseRoll === 20 && success;
    const criticalFailure = baseRoll === 1 && !success;

    const result: SkillCheckResult = {
      success,
      skillUsed: skill,
      baseRoll,
      skillBonus,
      abilityBonus,
      challengeBonus,
      difficultyPenalty,
      finalScore,
      margin,
      criticalSuccess,
      criticalFailure,
    };

    setState(prev => ({
      ...prev,
      phase: 'result',
      result,
    }));

    // 結果を親コンポーネントに通知
    onResult(result);
  }, [state.selectedSkill, difficulty, getAbilityBonus, onResult]);

  // キーボードイベント（チャレンジ中）
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (state.phase === 'challenge') {
        if (event.code === 'Space') {
          event.preventDefault();
          hitTarget();
        } else if (event.key === 'Enter') {
          event.preventDefault();
          missTarget();
        }
      }
    };

    if (open && state.phase === 'challenge') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [open, state.phase, hitTarget, missTarget]);

  // リセット
  const resetChallenge = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setState({
      phase: 'selection',
      selectedSkill: null,
      challengeProgress: 0,
      challengeTargets: [],
      currentTarget: 0,
      hits: 0,
      misses: 0,
      timeRemaining: 10000,
      result: null,
    });
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatResult = (result: SkillCheckResult) => {
    const parts = [
      `基本値: ${result.baseRoll}`,
      `スキル: +${result.skillBonus}`,
      `能力値: ${result.abilityBonus >= 0 ? '+' : ''}${result.abilityBonus}`,
      `チャレンジ: ${result.challengeBonus >= 0 ? '+' : ''}${result.challengeBonus}`,
    ];
    
    if (result.difficultyPenalty !== 0) {
      parts.push(`難易度: ${result.difficultyPenalty}`);
    }
    
    return parts.join(' ');
  };

  const getProgressColor = () => {
    const elapsed = Date.now() - startTimeRef.current;
    const timeLeft = Math.max(0, state.timeRemaining - elapsed);
    const ratio = timeLeft / state.timeRemaining;
    
    if (ratio > 0.5) return 'success';
    if (ratio > 0.25) return 'warning';
    return 'error';
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onCancel}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '600px' }
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

          {/* フェーズ1: スキル選択 */}
          {state.phase === 'selection' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                使用するスキルを選択してください
              </Typography>
              
              <Grid container spacing={2}>
                {availableSkills.map((skill) => {
                  const isSuggested = suggestedSkills.includes(skill.name);
                  const abilityBonus = getAbilityBonus(skill);
                  const totalBonus = (skill.level || 0) + abilityBonus;
                  
                  return (
                    <Grid item xs={12} sm={6} key={skill.id}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          border: state.selectedSkill?.id === skill.id ? 2 : 1,
                          borderColor: state.selectedSkill?.id === skill.id ? 'primary.main' : 'divider',
                          bgcolor: isSuggested ? 'action.hover' : 'background.paper',
                        }}
                        onClick={() => selectSkill(skill)}
                      >
                        <CardContent sx={{ pb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {getSkillIcon(skill.name)}
                            <Typography variant="subtitle1">
                              {skill.name}
                            </Typography>
                            {isSuggested && (
                              <Chip label="推奨" size="small" color="primary" />
                            )}
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {skill.description}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip 
                              label={`レベル: ${skill.level || 0}`} 
                              size="small" 
                              variant="outlined"
                            />
                            <Chip 
                              label={`能力値: ${skill.attribute} (${abilityBonus >= 0 ? '+' : ''}${abilityBonus})`} 
                              size="small" 
                              variant="outlined"
                            />
                            <Chip 
                              label={`合計: ${totalBonus >= 0 ? '+' : ''}${totalBonus}`} 
                              size="small" 
                              color="primary"
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {/* フェーズ2: チャレンジ実行 */}
          {state.phase === 'challenge' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                スキルチャレンジ実行中
              </Typography>
              
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  {state.selectedSkill?.name} チャレンジ
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Chip label={`ヒット: ${state.hits}`} color="success" />
                  <Chip label={`ミス: ${state.misses}`} color="error" />
                  <Chip label={`進行: ${state.currentTarget + 1}/${state.challengeTargets.length}`} />
                </Box>
                
                <LinearProgress 
                  variant="determinate"
                  value={(state.currentTarget / state.challengeTargets.length) * 100}
                  sx={{ mb: 2, height: 8 }}
                />
                
                <Typography variant="body1" align="center" sx={{ mb: 2 }}>
                  {state.currentTarget < state.challengeTargets.length 
                    ? `ターゲット ${state.currentTarget + 1} を狙ってください`
                    : 'チャレンジ完了!'
                  }
                </Typography>
              </Paper>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>スペースキー</strong>: ヒット | <strong>Enterキー</strong>: ミス
                </Typography>
                <Typography variant="caption">
                  残り時間: {Math.ceil((state.timeRemaining - (Date.now() - startTimeRef.current)) / 1000)}秒
                </Typography>
              </Alert>

              {/* 視覚的フィードバック */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <CircularProgress 
                  variant="determinate"
                  value={(state.currentTarget / state.challengeTargets.length) * 100}
                  size={100}
                  thickness={6}
                  color={getProgressColor()}
                />
              </Box>
            </Box>
          )}

          {/* フェーズ3: 結果表示 */}
          {state.phase === 'result' && state.result && (
            <Box>
              <Alert 
                severity={
                  state.result.criticalSuccess ? 'success' : 
                  state.result.criticalFailure ? 'error' :
                  state.result.success ? 'success' : 'warning'
                }
                sx={{ mb: 2 }}
              >
                <Typography variant="body1">
                  <strong>
                    {state.result.criticalSuccess ? 'クリティカル成功！' :
                     state.result.criticalFailure ? 'クリティカル失敗...' :
                     state.result.success ? '成功！' : '失敗...'}
                  </strong>
                </Typography>
                <Typography variant="body2">
                  {formatResult(state.result)} = <strong>{state.result.finalScore}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {state.result.success 
                    ? `${state.result.margin}ポイント上回りました`
                    : `${Math.abs(state.result.margin)}ポイント足りませんでした`
                  }
                </Typography>
              </Alert>

              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  チャレンジ結果
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`ヒット: ${state.hits}`} color="success" size="small" />
                  <Chip label={`ミス: ${state.misses}`} color="error" size="small" />
                  <Chip 
                    label={`命中率: ${Math.round((state.hits / state.challengeTargets.length) * 100)}%`} 
                    color="primary" 
                    size="small" 
                  />
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onCancel} disabled={state.phase === 'challenge'}>
            キャンセル
          </Button>
          
          {state.phase === 'selection' && (
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={startChallenge}
              disabled={!state.selectedSkill}
              data-testid="skill-check-start"
            >
              チャレンジ開始
            </Button>
          )}
          
          {state.phase === 'challenge' && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                onClick={hitTarget}
                data-testid="skill-check-hit"
              >
                ヒット (Space)
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={missTarget}
                data-testid="skill-check-miss"
              >
                ミス (Enter)
              </Button>
            </Box>
          )}
          
          {state.phase === 'result' && (
            <Button
              variant="outlined"
              startIcon={<RestartIcon />}
              onClick={resetChallenge}
              data-testid="skill-check-reset"
            >
              再挑戦
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ヘルプダイアログ */}
      <Dialog open={showHelp} onClose={() => setShowHelp(false)} maxWidth="sm" fullWidth>
        <DialogTitle>スキルチェックの使い方</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            <strong>スキルチェック</strong>は、特定の技能を使った行動を試みる際に使用するミニゲームです。
          </Typography>
          
          <Typography variant="subtitle2" gutterBottom>遊び方：</Typography>
          <Box component="ol" sx={{ pl: 2, mb: 2 }}>
            <li>使用するスキルを選択します（推奨スキルがある場合は表示されます）</li>
            <li>チャレンジが開始されたら、指示に従ってキーを押します</li>
            <li><strong>スペースキー</strong>でヒット、<strong>Enterキー</strong>でミスを記録</li>
            <li>時間内により多くのヒットを狙いましょう</li>
          </Box>
          
          <Typography variant="subtitle2" gutterBottom>スコア計算：</Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>基本値: 1d20のダイスロール</li>
            <li>スキルボーナス: スキルレベル</li>
            <li>能力値ボーナス: 関連能力値の修正値</li>
            <li>チャレンジボーナス: ヒット率に応じたボーナス</li>
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