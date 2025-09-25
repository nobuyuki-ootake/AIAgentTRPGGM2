import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  AccessTime,
  PlayArrow,
  Error,
  Info,
  Close,
  AutoStories,
  Flag,
  Groups,
} from '@mui/icons-material';
import { useRecoilValue } from 'recoil';
import { sessionInitializationProgressAtom, SessionInitializationProgress, SessionInitializationPhase } from '../../store/atoms';

interface SessionInitializationProgressModalProps {
  open: boolean;
  onClose: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

const phaseIcons = {
  scenario: <AutoStories sx={{ fontSize: 20 }} />,
  milestone: <Flag sx={{ fontSize: 20 }} />,
  entity: <Groups sx={{ fontSize: 20 }} />,
};

const phaseDescriptions = {
  scenario: '基本シナリオ設定、世界観構築、基本ルール設定',
  milestone: '進行マイルストーン作成、目標設定、達成条件定義',
  entity: 'NPC生成、アイテム生成、場所・環境生成',
};

export const SessionInitializationProgressModal: React.FC<SessionInitializationProgressModalProps> = ({
  open,
  onClose,
  onCancel,
  showCancelButton = true,
}) => {
  const progress = useRecoilValue(sessionInitializationProgressAtom);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '0秒';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  const getPhaseStatusColor = (phase: SessionInitializationPhase): 'success' | 'error' | 'warning' | 'info' => {
    const phaseDetail = progress.phases[phase];
    switch (phaseDetail.status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'in_progress':
        return 'info';
      default:
        return 'warning';
    }
  };

  const getPhaseStatusIcon = (phase: SessionInitializationPhase) => {
    const phaseDetail = progress.phases[phase];
    switch (phaseDetail.status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'in_progress':
        return <PlayArrow color="info" />;
      default:
        return <AccessTime color="disabled" />;
    }
  };

  const getActiveStep = (): number => {
    if (!progress.currentPhase) return 0;
    switch (progress.currentPhase) {
      case 'scenario':
        return 0;
      case 'milestone':
        return 1;
      case 'entity':
        return 2;
      default:
        return 0;
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleClose = () => {
    if (!progress.isInitializing) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={progress.isInitializing}
      data-testid="session-initialization-progress-modal"
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">セッション初期化進捗</Typography>
        {!progress.isInitializing && (
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent>
        {progress.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">{progress.error}</Typography>
          </Alert>
        )}

        {/* 全体進捗 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">全体進捗</Typography>
              <Chip 
                label={progress.isInitializing ? '初期化中' : progress.error ? 'エラー' : '完了'} 
                color={progress.isInitializing ? 'info' : progress.error ? 'error' : 'success'}
                size="small"
              />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress.overallProgress} 
              sx={{ mb: 1, height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary">
              {progress.overallProgress}% 完了
            </Typography>
          </CardContent>
        </Card>

        {/* 3層構造ステッパー */}
        <Stepper activeStep={getActiveStep()} orientation="vertical">
          {(['scenario', 'milestone', 'entity'] as const).map((phase, index) => {
            const phaseDetail = progress.phases[phase];
            
            return (
              <Step key={phase} expanded={true}>
                <StepLabel
                  StepIconComponent={() => getPhaseStatusIcon(phase)}
                  sx={{ 
                    '& .MuiStepLabel-label': {
                      fontSize: '1.1rem',
                      fontWeight: phaseDetail.status === 'in_progress' ? 'bold' : 'normal',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {phaseIcons[phase]}
                    <Typography variant="body1">{phaseDetail.phaseName}</Typography>
                    <Chip 
                      label={`${index * 33 + 1}-${(index + 1) * 33}%`}
                      size="small"
                      color={getPhaseStatusColor(phase)}
                      variant="outlined"
                    />
                  </Box>
                </StepLabel>
                <StepContent>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    {/* フェーズ説明 */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {phaseDescriptions[phase]}
                    </Typography>

                    {/* 現在のタスク */}
                    {phaseDetail.status === 'in_progress' && phaseDetail.currentTask && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight="bold" color="info.main">
                          現在の作業: {phaseDetail.currentTask}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={phaseDetail.progress} 
                          sx={{ mt: 1, height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    )}

                    {/* 完了したタスク */}
                    {phaseDetail.completedTasks.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                          完了したタスク:
                        </Typography>
                        <List dense>
                          {phaseDetail.completedTasks.map((task, taskIndex) => (
                            <ListItem key={taskIndex} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <CheckCircle color="success" sx={{ fontSize: 16 }} />
                              </ListItemIcon>
                              <ListItemText 
                                primary={task}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}

                    {/* エラー情報 */}
                    {phaseDetail.error && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="body2">{phaseDetail.error}</Typography>
                      </Alert>
                    )}

                    {/* 進捗情報 */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Info sx={{ fontSize: 16 }} />
                        <Typography variant="body2">
                          {phaseDetail.progress}% 完了
                        </Typography>
                      </Box>
                      
                      {phaseDetail.totalTasks > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2">
                            {phaseDetail.completedTasks.length}/{phaseDetail.totalTasks} タスク
                          </Typography>
                        </Box>
                      )}

                      {phaseDetail.estimatedTimeRemaining > 0 && phaseDetail.status === 'in_progress' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTime sx={{ fontSize: 16 }} />
                          <Typography variant="body2">
                            残り約{formatTime(phaseDetail.estimatedTimeRemaining)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>

        {/* アクションボタン */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
          {progress.isInitializing && showCancelButton && (
            <Button
              onClick={handleCancel}
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              data-testid="cancel-initialization-button"
            >
              キャンセル
            </Button>
          )}
          
          {!progress.isInitializing && (
            <Button
              onClick={handleClose}
              variant="contained"
              color="primary"
              data-testid="close-progress-modal-button"
            >
              閉じる
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};