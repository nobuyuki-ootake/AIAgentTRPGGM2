import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Stack,
  Chip,
  IconButton,
} from '@mui/material';
import {
  TouchAppRounded,
  CasinoRounded,
  PsychologyRounded,
  AssignmentRounded,
  AutoAwesomeRounded,
  CloseRounded,
  RefreshRounded,
  CheckCircleRounded,
  ErrorRounded,
} from '@mui/icons-material';
import {
  InteractiveEventSession,
  EventChoice,
  AITaskDefinition,
  DynamicDifficultySettings,
  EventResult,
  RetryOption,
  Character,
  SessionContext,
  ID,
} from '@ai-agent-trpg/types';
import { interactiveEventsAPI } from '../../api/interactiveEvents';

interface InteractiveEventManagerProps {
  // セッション情報
  sessionId: ID;
  campaignId: ID;
  character: Character;
  sessionContext: SessionContext;
  
  // イベント管理
  eventChoices?: EventChoice[];
  isOpen: boolean;
  onClose: () => void;
  
  // コールバック
  onEventComplete?: (result: EventResult) => void;
  onEventFailed?: (error: string) => void;
  onCharacterUpdate?: (characterId: ID, updates: any) => void;
}

interface EventFlowState {
  eventSession: InteractiveEventSession | null;
  currentChoices: EventChoice[];
  selectedChoice: EventChoice | null;
  taskDefinition: AITaskDefinition | null;
  playerSolution: string;
  difficultySettings: DynamicDifficultySettings | null;
  eventResult: EventResult | null;
  retryOptions: RetryOption[];
  error: string | null;
  loading: boolean;
}

export const InteractiveEventManager: React.FC<InteractiveEventManagerProps> = ({
  sessionId,
  _campaignId,
  character,
  sessionContext,
  eventChoices = [],
  isOpen,
  onClose,
  onEventComplete,
  onEventFailed,
  _onCharacterUpdate,
}) => {
  const [state, setState] = useState<EventFlowState>({
    eventSession: null,
    currentChoices: eventChoices,
    selectedChoice: null,
    taskDefinition: null,
    playerSolution: '',
    difficultySettings: null,
    eventResult: null,
    retryOptions: [],
    error: null,
    loading: false,
  });

  // ステップ管理
  const steps = [
    '選択肢選択',
    'AIタスク解釈',
    '解決方法入力',
    '難易度計算',
    'ダイス判定',
    '結果処理'
  ];

  const getCurrentStepIndex = (): number => {
    if (!state.eventSession) return 0;
    
    switch (state.eventSession.state) {
      case 'waiting_for_choice': return 0;
      case 'processing_choice': return 1;
      case 'waiting_for_solution': return 2;
      case 'calculating_difficulty': return 3;
      case 'dice_rolling': return 4;
      case 'processing_result': return 5;
      case 'completed':
      case 'failed': return 5;
      default: return 0;
    }
  };

  // イベントセッション開始
  const startEventSession = async (eventId: ID = 'default') => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const eventSession = await interactiveEventsAPI.startEventSession({
        sessionId,
        eventId,
        playerId: character.id,
        characterId: character.id,
        choices: state.currentChoices,
      });

      setState(prev => ({
        ...prev,
        eventSession,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'イベントセッションの開始に失敗しました';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      onEventFailed?.(errorMessage);
    }
  };

  // 選択肢を処理
  const processChoice = async (choice: EventChoice) => {
    if (!state.eventSession) return;
    
    setState(prev => ({ 
      ...prev, 
      selectedChoice: choice, 
      loading: true, 
      error: null 
    }));

    try {
      const taskDefinition = await interactiveEventsAPI.processPlayerChoice(
        state.eventSession.id,
        {
          choiceId: choice.id,
          choice,
          character,
          sessionContext,
        }
      );

      setState(prev => ({
        ...prev,
        taskDefinition,
        loading: false,
      }));

      // セッション状態を更新
      const updatedSession = await interactiveEventsAPI.getEventSession(state.eventSession.id);
      setState(prev => ({ ...prev, eventSession: updatedSession }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '選択肢の処理に失敗しました';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  };

  // プレイヤーの解決方法を評価
  const evaluateSolution = async () => {
    if (!state.eventSession || !state.taskDefinition || !state.playerSolution.trim()) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const difficultySettings = await interactiveEventsAPI.evaluatePlayerSolution(
        state.eventSession.id,
        {
          taskId: state.taskDefinition.id,
          playerSolution: state.playerSolution,
          character,
          sessionContext,
        }
      );

      setState(prev => ({
        ...prev,
        difficultySettings,
        loading: false,
      }));

      // セッション状態を更新
      const updatedSession = await interactiveEventsAPI.getEventSession(state.eventSession.id);
      setState(prev => ({ ...prev, eventSession: updatedSession }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '解決方法の評価に失敗しました';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  };

  // ダイス判定を実行
  const executeDiceRoll = async () => {
    if (!state.eventSession || !state.difficultySettings) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // シンプルなダイス結果をシミュレート（実際のダイスUIとの統合が必要）
      const mockDiceResult = interactiveEventsAPI.createMockDiceResult();
      
      const eventResult = await interactiveEventsAPI.executeDiceRoll(
        state.eventSession.id,
        {
          difficultySettings: state.difficultySettings,
          diceResult: mockDiceResult,
          character,
          sessionContext,
        }
      );

      setState(prev => ({
        ...prev,
        eventResult,
        loading: false,
      }));

      // 成功時の処理
      if (eventResult.success) {
        onEventComplete?.(eventResult);
      } else {
        // 失敗時はリトライオプションを取得
        const retryOptions = await interactiveEventsAPI.getRetryOptions(
          state.eventSession.id, 
          character.id
        );
        setState(prev => ({ ...prev, retryOptions }));
      }

      // セッション状態を更新
      const updatedSession = await interactiveEventsAPI.getEventSession(state.eventSession.id);
      setState(prev => ({ ...prev, eventSession: updatedSession }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ダイス判定の実行に失敗しました';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  };

  // イベントをリセット
  const resetEvent = () => {
    setState({
      eventSession: null,
      currentChoices: eventChoices,
      selectedChoice: null,
      taskDefinition: null,
      playerSolution: '',
      difficultySettings: null,
      eventResult: null,
      retryOptions: [],
      error: null,
      loading: false,
    });
  };

  // ダイアログが開かれた時にイベントセッションを開始
  useEffect(() => {
    if (isOpen && !state.eventSession && eventChoices.length > 0) {
      startEventSession();
    }
  }, [isOpen]);

  // エラー処理
  const handleClose = () => {
    resetEvent();
    onClose();
  };

  // ステータス表示
  const getStatusDisplay = () => {
    if (state.loading) {
      return (
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CircularProgress size={20} />
          <Typography variant="body2">処理中...</Typography>
        </Box>
      );
    }

    if (state.error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      );
    }

    if (state.eventResult) {
      return (
        <Alert 
          severity={state.eventResult.success ? "success" : "warning"} 
          sx={{ mb: 2 }}
          icon={state.eventResult.success ? <CheckCircleRounded /> : <ErrorRounded />}
        >
          <Typography variant="subtitle2">
            {state.eventResult.success ? '成功！' : '失敗...'}
          </Typography>
          <Typography variant="body2">
            {state.eventResult.narrative}
          </Typography>
        </Alert>
      );
    }

    return null;
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <TouchAppRounded color="primary" />
            <Typography variant="h6">
              インタラクティブイベント
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseRounded />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* ステップ表示 */}
        <Box mb={3}>
          <Stepper activeStep={getCurrentStepIndex()} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* ステータス表示 */}
        {getStatusDisplay()}

        {/* メインコンテンツ */}
        <Box>
          {/* 選択肢選択段階 */}
          {(!state.eventSession || state.eventSession.state === 'waiting_for_choice') && (
            <Box>
              <Typography variant="h6" gutterBottom>
                行動を選択してください
              </Typography>
              <Stack spacing={1}>
                {state.currentChoices.map((choice) => (
                  <Paper
                    key={choice.id}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: state.selectedChoice?.id === choice.id ? 2 : 1,
                      borderColor: state.selectedChoice?.id === choice.id ? 'primary.main' : 'divider',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => !state.loading && processChoice(choice)}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      {choice.text}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {choice.description}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}

          {/* AIタスク説明段階 */}
          {state.taskDefinition && state.eventSession?.state === 'waiting_for_solution' && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PsychologyRounded color="primary" />
                <Typography variant="h6">
                  AIタスク解釈結果
                </Typography>
              </Box>
              
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
                <Typography variant="subtitle1" gutterBottom>
                  {state.taskDefinition.interpretation}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>目標:</strong> {state.taskDefinition.objective}
                </Typography>
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    推定難易度: 
                    <Chip 
                      label={state.taskDefinition.estimatedDifficulty} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Box>
              </Paper>

              <Typography variant="h6" gutterBottom>
                解決方法を入力してください
              </Typography>
              <Paper sx={{ p: 2 }}>
                <textarea
                  value={state.playerSolution}
                  onChange={(e) => setState(prev => ({ ...prev, playerSolution: e.target.value }))}
                  placeholder="どのようにこのタスクを解決しますか？創意工夫を凝らした解決方法ほど難易度が下がります。"
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    border: 'none',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                  }}
                />
                <Box mt={2} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={evaluateSolution}
                    disabled={!state.playerSolution.trim() || state.loading}
                    startIcon={<AssignmentRounded />}
                  >
                    解決方法を評価
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}

          {/* ダイス判定段階 */}
          {state.difficultySettings && state.eventSession?.state === 'dice_rolling' && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CasinoRounded color="primary" />
                <Typography variant="h6">
                  ダイス判定
                </Typography>
              </Box>

              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  難易度調整完了
                </Typography>
                <Typography variant="body1">
                  目標値: {state.difficultySettings.baseTargetNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {state.difficultySettings.rollType} + 修正値
                </Typography>
              </Paper>

              <Box display="flex" justifyContent="center">
                <Button
                  variant="contained"
                  size="large"
                  onClick={executeDiceRoll}
                  disabled={state.loading}
                  startIcon={<CasinoRounded />}
                >
                  ダイスを振る！
                </Button>
              </Box>
            </Box>
          )}

          {/* 結果表示段階 */}
          {state.eventResult && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <AutoAwesomeRounded color="primary" />
                <Typography variant="h6">
                  結果
                </Typography>
              </Box>

              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="body1" gutterBottom>
                  {state.eventResult.narrative}
                </Typography>
                
                {state.eventResult.rewards && state.eventResult.rewards.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      報酬:
                    </Typography>
                    <Stack spacing={0.5}>
                      {state.eventResult.rewards.map((reward, index) => (
                        <Typography key={index} variant="body2" color="success.main">
                          • {reward.description}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}

                {state.eventResult.penalties && state.eventResult.penalties.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      ペナルティ:
                    </Typography>
                    <Stack spacing={0.5}>
                      {state.eventResult.penalties.map((penalty, index) => (
                        <Typography key={index} variant="body2" color="error.main">
                          • {penalty.description}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Paper>

              {/* リトライオプション */}
              {!state.eventResult.success && state.retryOptions.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    リトライオプション
                  </Typography>
                  <Stack spacing={1}>
                    {state.retryOptions.map((option) => (
                      <Paper
                        key={option.id}
                        sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <Typography variant="subtitle2" gutterBottom>
                          {option.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ペナルティ軽減: {option.penaltyReduction}%
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          閉じる
        </Button>
        
        {state.eventResult && !state.eventResult.success && state.retryOptions.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<RefreshRounded />}
            onClick={resetEvent}
          >
            リトライ
          </Button>
        )}
        
        {state.eventResult?.success && (
          <Button
            variant="contained"
            startIcon={<CheckCircleRounded />}
            onClick={handleClose}
          >
            完了
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};