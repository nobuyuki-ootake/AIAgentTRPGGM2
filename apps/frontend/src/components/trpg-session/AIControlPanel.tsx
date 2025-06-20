import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Rating,
  Tooltip,
  Alert,
  Collapse,
  Divider,
} from '@mui/material';
import {
  PlayArrowRounded,
  StopRounded,
  SettingsRounded,
  SmartToyRounded,
  FeedbackRounded,
  BugReportRounded,
  AutoModeRounded,
  TouchAppRounded,
  WarningRounded,
  ExpandMoreRounded,
  ExpandLessRounded,
} from '@mui/icons-material';
import { Character, AIAction, SessionState, ID } from '@ai-agent-trpg/types';
import { useAICharacterControl } from '@/hooks/useAICharacterControl';

interface AIControlPanelProps {
  sessionId: ID;
  characters: Character[];
  sessionState: SessionState;
  onActionExecuted?: (action: AIAction) => void;
}

export const AIControlPanel: React.FC<AIControlPanelProps> = ({
  sessionId,
  characters,
  sessionState,
  onActionExecuted,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(3);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [automationLevel, setAutomationLevel] = useState<'minimal' | 'moderate' | 'extensive'>('moderate');
  const [autoExecutionInterval, setAutoExecutionInterval] = useState(30);
  const [showRecentActions, setShowRecentActions] = useState(false);

  const {
    isActive,
    controller,
    recentActions,
    controlledCharacters,
    loading,
    aiCharacters,
    startAIControl,
    stopAIControl,
    triggerCharacterAction,
    triggerAllAICharacterActions,
    startAutoExecution,
    stopAutoExecution,
    sendActionFeedback,
    updateAutomationLevel,
    toggleCharacterAI,
    emergencyStop,
    hasAICharacters,
    isAutoExecuting,
  } = useAICharacterControl({
    sessionId,
    characters,
    sessionState,
  });

  const handleStartAIControl = async () => {
    const sessionController = await startAIControl({
      aiAutomationLevel: automationLevel,
      narrativeAssistance: true,
      pacingControl: false,
    });
    
    if (sessionController) {
      startAutoExecution(autoExecutionInterval * 1000);
    }
  };

  const handleStopAIControl = async () => {
    stopAutoExecution();
    await stopAIControl();
  };

  const handleTriggerAction = async (characterId: ID) => {
    const action = await triggerCharacterAction(characterId, {
      sessionState: {
        mode: sessionState.mode,
        round: sessionState.combat?.round,
        turn: sessionState.combat?.turn,
        lastActions: recentActions.slice(0, 5),
      },
    });
    
    if (action && onActionExecuted) {
      onActionExecuted(action);
    }
  };

  const handleTriggerAllActions = async () => {
    const results = await triggerAllAICharacterActions({
      sessionState: {
        mode: sessionState.mode,
        round: sessionState.combat?.round,
        turn: sessionState.combat?.turn,
        lastActions: recentActions.slice(0, 5),
      },
    });
    
    results.forEach(result => {
      if (result.action && onActionExecuted) {
        onActionExecuted(result.action);
      }
    });
  };

  const handleSendFeedback = async () => {
    if (selectedAction) {
      await sendActionFeedback(
        selectedAction.id,
        feedbackRating,
        feedbackComment || undefined
      );
      setFeedbackOpen(false);
      setSelectedAction(null);
      setFeedbackRating(3);
      setFeedbackComment('');
    }
  };

  const handleAutomationLevelChange = async (level: 'minimal' | 'moderate' | 'extensive') => {
    setAutomationLevel(level);
    if (isActive) {
      await updateAutomationLevel(level);
    }
  };

  const getAutomationLevelColor = (level: string) => {
    switch (level) {
      case 'minimal': return 'success';
      case 'moderate': return 'warning';
      case 'extensive': return 'error';
      default: return 'default';
    }
  };

  const getAutomationLevelLabel = (level: string) => {
    switch (level) {
      case 'minimal': return '最小限';
      case 'moderate': return '適度';
      case 'extensive': return '高度';
      default: return level;
    }
  };

  if (!hasAICharacters) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <SmartToyRounded color="disabled" />
            <Typography variant="h6" color="text.secondary">
              AI制御パネル
            </Typography>
          </Box>
          <Alert severity="info">
            このセッションにはAI制御可能なキャラクター（NPCまたは敵）がいません。
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          {/* ヘッダー */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <SmartToyRounded color={isActive ? 'primary' : 'disabled'} />
              <Typography variant="h6">
                AI制御パネル
              </Typography>
              <Chip
                label={isActive ? 'アクティブ' : '停止中'}
                color={isActive ? 'success' : 'default'}
                size="small"
              />
            </Box>
            
            <Box display="flex" gap={1}>
              <IconButton
                size="small"
                onClick={() => setSettingsOpen(true)}
                disabled={loading}
              >
                <SettingsRounded />
              </IconButton>
              
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={emergencyStop}
                disabled={!isActive || loading}
                startIcon={<WarningRounded />}
              >
                緊急停止
              </Button>
            </Box>
          </Box>

          {/* メイン制御 */}
          <Stack spacing={2}>
            {/* 基本制御 */}
            <Box display="flex" gap={2} alignItems="center">
              {!isActive ? (
                <Button
                  variant="contained"
                  startIcon={<PlayArrowRounded />}
                  onClick={handleStartAIControl}
                  disabled={loading}
                  data-testid="start-ai-control"
                >
                  AI制御開始
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<StopRounded />}
                  onClick={handleStopAIControl}
                  disabled={loading}
                  data-testid="stop-ai-control"
                >
                  AI制御停止
                </Button>
              )}

              {isActive && (
                <>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleTriggerAllActions}
                    disabled={loading}
                    data-testid="trigger-all-actions"
                  >
                    全員行動実行
                  </Button>
                  
                  <Chip
                    label={isAutoExecuting ? '自動実行中' : '手動モード'}
                    color={isAutoExecuting ? 'primary' : 'default'}
                    icon={isAutoExecuting ? <AutoModeRounded /> : <TouchAppRounded />}
                    size="small"
                  />
                </>
              )}
            </Box>

            {/* 制御対象キャラクター */}
            {isActive && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  制御対象キャラクター ({controlledCharacters.length}/{aiCharacters.length})
                </Typography>
                <List dense>
                  {aiCharacters.map(character => {
                    const isControlled = controlledCharacters.includes(character.id);
                    return (
                      <ListItem key={character.id} divider>
                        <ListItemText
                          primary={character.name}
                          secondary={`${character.characterType} - Lv.${character.level}`}
                        />
                        <ListItemSecondaryAction>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Switch
                              checked={isControlled}
                              onChange={(e) => toggleCharacterAI(character.id, e.target.checked)}
                              size="small"
                            />
                            {isControlled && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleTriggerAction(character.id)}
                                data-testid={`trigger-action-${character.id}`}
                              >
                                実行
                              </Button>
                            )}
                          </Stack>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            )}

            {/* 最近の行動 */}
            {recentActions.length > 0 && (
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="subtitle2">
                    最近の行動 ({recentActions.length})
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowRecentActions(!showRecentActions)}
                  >
                    {showRecentActions ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                  </IconButton>
                </Box>
                
                <Collapse in={showRecentActions}>
                  <List dense>
                    {recentActions.slice(0, 5).map(action => {
                      const character = characters.find(c => c.id === action.characterId);
                      return (
                        <ListItem key={action.id} divider>
                          <ListItemText
                            primary={`${character?.name}: ${action.details.description}`}
                            secondary={new Date(action.timestamp).toLocaleTimeString()}
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="フィードバックを送信">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedAction(action);
                                  setFeedbackOpen(true);
                                }}
                              >
                                <FeedbackRounded />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* 設定ダイアログ */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>AI制御設定</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>自動化レベル</InputLabel>
              <Select
                value={automationLevel}
                onChange={(e) => handleAutomationLevelChange(e.target.value as any)}
                label="自動化レベル"
              >
                <MenuItem value="minimal">最小限 - 基本的な反応のみ</MenuItem>
                <MenuItem value="moderate">適度 - バランスの取れた自動化</MenuItem>
                <MenuItem value="extensive">高度 - 積極的な自動制御</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="自動実行間隔（秒）"
              type="number"
              value={autoExecutionInterval}
              onChange={(e) => setAutoExecutionInterval(Number(e.target.value))}
              inputProps={{ min: 10, max: 300 }}
              helperText="10-300秒の範囲で設定可能"
            />

            <Alert severity="info">
              自動化レベルを上げるとAIキャラクターはより頻繁に行動しますが、
              GM（あなた）の制御が減ります。セッションの性質に応じて調整してください。
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={() => setSettingsOpen(false)}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* フィードバックダイアログ */}
      <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>行動フィードバック</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {selectedAction && (
              <Box>
                <Typography variant="subtitle2">行動内容</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedAction.details.description}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                評価（1-5）
              </Typography>
              <Rating
                value={feedbackRating}
                onChange={(_, value) => setFeedbackRating(value || 1)}
                max={5}
                size="large"
              />
            </Box>

            <TextField
              label="コメント（任意）"
              multiline
              rows={3}
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="この行動について詳細なフィードバックがあれば記入してください"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackOpen(false)}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={handleSendFeedback}>
            送信
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};