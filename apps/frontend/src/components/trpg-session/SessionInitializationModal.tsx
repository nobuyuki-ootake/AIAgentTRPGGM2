import React from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Paper,
  Stack,
  Chip,
  Divider,
  IconButton,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  AutoAwesome as AutoAwesomeIcon,
  Groups as GroupsIcon,
  Flag as FlagIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

export interface InitializationStage {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  details?: string;
  error?: string;
}

interface SessionInitializationModalProps {
  open: boolean;
  onClose?: () => void;
  onRetry?: () => void;
  stages: InitializationStage[];
  currentStage: number;
  overallProgress: number;
  canClose: boolean;
  title?: string;
  subtitle?: string;
}

const STAGE_ICONS = {
  entities: <GroupsIcon />,
  milestones: <FlagIcon />,
  overview: <AssignmentIcon />,
  default: <AutoAwesomeIcon />,
};

const STATUS_COLORS = {
  pending: 'default' as const,
  in_progress: 'primary' as const,
  completed: 'success' as const,
  error: 'error' as const,
};

const getStageIcon = (stageId: string) => {
  return STAGE_ICONS[stageId as keyof typeof STAGE_ICONS] || STAGE_ICONS.default;
};

const getStatusColor = (status: InitializationStage['status']) => {
  return STATUS_COLORS[status];
};

const getStatusLabel = (status: InitializationStage['status']) => {
  switch (status) {
    case 'pending': return '待機中';
    case 'in_progress': return '実行中';
    case 'completed': return '完了';
    case 'error': return 'エラー';
    default: return status;
  }
};

export const SessionInitializationModal: React.FC<SessionInitializationModalProps> = ({
  open,
  onClose,
  onRetry,
  stages,
  currentStage,
  overallProgress,
  canClose,
  title = '🎮 セッション初期化',
  subtitle = 'TRPGの世界を準備しています...',
}) => {
  const hasError = stages.some(stage => stage.status === 'error');
  const isComplete = stages.every(stage => stage.status === 'completed');
  const currentStageData = stages[currentStage];

  return (
    <Dialog
      open={open}
      onClose={canClose ? onClose : undefined}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={!canClose}
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '500px',
          background: (theme) => theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : 'linear-gradient(135deg, #f8f9ff 0%, #e8f1ff 100%)',
        }
      }}
    >
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ position: 'relative', height: '100%' }}>
          {/* ヘッダー */}
          <Box sx={{ 
            p: 3, 
            pb: 2,
            background: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(30, 30, 60, 0.8)' 
              : 'rgba(255, 255, 255, 0.9)',
            borderBottom: 1,
            borderColor: 'divider',
            position: 'relative',
          }}>
            {canClose && (
              <IconButton
                onClick={onClose}
                sx={{ position: 'absolute', top: 8, right: 8 }}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            )}
            
            <Stack spacing={1} alignItems="center">
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{ 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  color: isComplete ? 'success.main' : hasError ? 'error.main' : 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {isComplete ? (
                  <>
                    <CheckCircleIcon fontSize="large" />
                    🎉 初期化完了！
                  </>
                ) : hasError ? (
                  <>
                    <WarningIcon fontSize="large" />
                    ⚠️ 初期化エラー
                  </>
                ) : (
                  <>
                    <ScheduleIcon fontSize="large" />
                    {title}
                  </>
                )}
              </Typography>
              
              <Typography 
                variant="subtitle1" 
                color="text.secondary"
                textAlign="center"
              >
                {isComplete 
                  ? '冒険の準備が整いました！素晴らしい物語が始まります。' 
                  : hasError 
                    ? '初期化中にエラーが発生しました。再試行してください。'
                    : subtitle
                }
              </Typography>
            </Stack>
          </Box>

          {/* 全体進捗バー */}
          <Box sx={{ px: 3, pt: 2 }}>
            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                全体進捗
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(overallProgress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: isComplete 
                    ? 'linear-gradient(90deg, #4caf50 0%, #81c784 100%)'
                    : hasError 
                      ? 'linear-gradient(90deg, #f44336 0%, #ef5350 100%)'
                      : 'linear-gradient(90deg, #2196f3 0%, #64b5f6 100%)',
                },
              }}
            />
          </Box>

          {/* ステージ一覧 */}
          <Box sx={{ px: 3, py: 2, maxHeight: '400px', overflow: 'auto' }}>
            <Stack spacing={2}>
              {stages.map((stage, index) => (
                <Paper
                  key={stage.id}
                  elevation={index === currentStage ? 3 : 1}
                  sx={{
                    p: 2,
                    border: index === currentStage ? 2 : 1,
                    borderColor: index === currentStage 
                      ? stage.status === 'error' ? 'error.main' : 'primary.main'
                      : 'divider',
                    bgcolor: stage.status === 'completed' 
                      ? 'success.light' 
                      : stage.status === 'error' 
                        ? 'error.light' 
                        : index === currentStage 
                          ? 'primary.light' 
                          : 'background.paper',
                    opacity: stage.status === 'pending' ? 0.7 : 1,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: stage.status === 'completed' 
                        ? 'success.main' 
                        : stage.status === 'error' 
                          ? 'error.main' 
                          : stage.status === 'in_progress' 
                            ? 'primary.main' 
                            : 'grey.400',
                      color: 'white',
                      fontSize: '1.2rem',
                    }}>
                      {stage.status === 'completed' ? (
                        <CheckCircleIcon />
                      ) : stage.status === 'error' ? (
                        <WarningIcon />
                      ) : (
                        getStageIcon(stage.id)
                      )}
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" component="h3">
                          {stage.title}
                        </Typography>
                        <Chip
                          label={getStatusLabel(stage.status)}
                          size="small"
                          color={getStatusColor(stage.status)}
                          variant={stage.status === 'in_progress' ? 'filled' : 'outlined'}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {stage.description}
                      </Typography>
                      
                      {stage.details && (
                        <Typography variant="body2" color="primary.main" sx={{ mb: 1 }}>
                          {stage.details}
                        </Typography>
                      )}
                      
                      {stage.error && (
                        <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
                          ❌ {stage.error}
                        </Typography>
                      )}
                      
                      {stage.status === 'in_progress' && stage.progress !== undefined && (
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={stage.progress}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'rgba(255, 255, 255, 0.3)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                              },
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {Math.round(stage.progress)}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Box>

          {/* フッター */}
          <Box sx={{ p: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Divider sx={{ mb: 2 }} />
            
            {/* 現在のステージ詳細 */}
            {currentStageData && !isComplete && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  現在の処理: {currentStageData.title}
                </Typography>
                {currentStageData.details && (
                  <Typography variant="body2" color="primary.main">
                    {currentStageData.details}
                  </Typography>
                )}
              </Box>
            )}
            
            {/* アクションボタン */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              {hasError && onRetry && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={onRetry}
                >
                  再試行
                </Button>
              )}
              
              {(isComplete || hasError) && canClose && (
                <Button
                  variant={isComplete ? "contained" : "outlined"}
                  color={isComplete ? "success" : "inherit"}
                  onClick={onClose}
                >
                  {isComplete ? '冒険を始める' : '閉じる'}
                </Button>
              )}
            </Stack>
          </Box>
          
          {/* 背景装飾 */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(33, 150, 243, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(50%, -50%)',
              zIndex: -1,
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};