// ==========================================
// AI Agent監視ダッシュボード
// ==========================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Button,
  ButtonGroup,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
  Badge,
  Paper,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  SmartToy as SmartToyIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import {
  AIAgentMonitoringDashboard as DashboardData,
  AIAgentActionLog,
  GetMonitoringDashboardRequest
} from '@repo/types';
import { getMonitoringDashboard } from '../../api/aiAgentMonitoring';

interface AIAgentMonitoringDashboardProps {
  sessionId: string;
  open: boolean;
  onClose: () => void;
}

export const AIAgentMonitoringDashboard: React.FC<AIAgentMonitoringDashboardProps> = ({
  sessionId,
  open,
  onClose
}) => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ==========================================
  // データ取得
  // ==========================================

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const request: GetMonitoringDashboardRequest = {
        sessionId,
        timeRange
      };
      
      const response = await getMonitoringDashboard(request);
      
      if (response.success && response.dashboard) {
        setDashboard(response.dashboard);
      } else {
        setError(response.error || 'ダッシュボードの取得に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 初期読み込み
  useEffect(() => {
    if (open) {
      fetchDashboard();
    }
  }, [sessionId, timeRange, open]);

  // 自動更新
  useEffect(() => {
    if (!open || !autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboard();
    }, 30000); // 30秒間隔

    return () => clearInterval(interval);
  }, [open, autoRefresh, sessionId, timeRange]);

  // ==========================================
  // ヘルパー関数
  // ==========================================

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getAgentStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon color="success" />;
      case 'idle': return <SpeedIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      case 'offline': return <ErrorIcon color="disabled" />;
      default: return <SmartToyIcon />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'movement_vote': return 'primary';
      case 'combat_action': return 'error';
      case 'dialogue_response': return 'info';
      case 'skill_check': return 'warning';
      default: return 'default';
    }
  };

  if (!open) {
    return null;
  }

  // ==========================================
  // レンダリング
  // ==========================================

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, margin: '0 auto', p: 2 }}>
      
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          <SmartToyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          AI Agent監視ダッシュボード
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ButtonGroup size="small" variant="outlined">
            {(['1h', '6h', '24h', '7d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'contained' : 'outlined'}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </ButtonGroup>
          
          <Tooltip title={autoRefresh ? '自動更新ON' : '自動更新OFF'}>
            <IconButton
              color={autoRefresh ? 'primary' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <IconButton onClick={fetchDashboard} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ローディング */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ダッシュボードコンテンツ */}
      {dashboard && (
        <Grid container spacing={3}>
          
          {/* 概要統計 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  システム概要
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h3" color="primary">
                        {dashboard.overview.activeAgents}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        アクティブエージェント
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h3" color="info.main">
                        {dashboard.overview.totalActionsToday}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        今日のアクション数
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h3" color="success.main">
                        {Math.round(dashboard.overview.averageSuccessRate)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        平均成功率
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Chip
                        label={dashboard.overview.systemHealth}
                        color={getSystemHealthColor(dashboard.overview.systemHealth) as any}
                        variant="filled"
                        size="large"
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        システム状態
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* エージェント状態 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <SmartToyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  エージェント状態
                </Typography>
                
                <List dense>
                  {dashboard.agentStatuses.map((agent) => (
                    <ListItem key={agent.characterId}>
                      <ListItemIcon>
                        <Badge badgeContent={agent.todayActionCount} color="primary">
                          {getAgentStatusIcon(agent.status)}
                        </Badge>
                      </ListItemIcon>
                      <ListItemText
                        primary={agent.characterName}
                        secondary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip 
                              label={agent.status} 
                              size="small" 
                              color={agent.status === 'active' ? 'success' : 'default'}
                            />
                            <Typography variant="caption">
                              信頼度: {agent.currentConfidence}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              最終: {formatTimestamp(agent.lastAction)}
                            </Typography>
                          </Stack>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* 最新ログ */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  最新アクティビティ
                </Typography>
                
                <List dense>
                  {dashboard.recentLogs.map((log) => (
                    <ListItem key={log.id}>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={log.actionType}
                              size="small"
                              color={getActionTypeColor(log.actionType) as any}
                            />
                            <Typography variant="body2">
                              {log.characterName}
                            </Typography>
                          </Stack>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {formatTimestamp(log.timestamp)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {log.actionDescription}
                            </Typography>
                            {log.executionResult !== 'success' && (
                              <Chip
                                label={log.executionResult}
                                size="small"
                                color="error"
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* 詳細ログ展開エリア */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  詳細ログ表示
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Paper sx={{ p: 2 }}>
                  {dashboard.recentLogs.map((log) => (
                    <Box key={log.id} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                        <Chip label={log.actionType} color={getActionTypeColor(log.actionType) as any} />
                        <Typography variant="subtitle2">{log.characterName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(log.timestamp)}
                        </Typography>
                        <Chip 
                          label={`信頼度: ${log.confidenceScore}%`} 
                          size="small" 
                          color={log.confidenceScore >= 80 ? 'success' : 'warning'}
                        />
                      </Stack>
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>判断理由:</strong> {log.decisionReasoning}
                      </Typography>
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>実行結果:</strong> {log.resultDetails}
                      </Typography>
                      
                      {log.alternativesConsidered.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          検討された選択肢: {log.alternativesConsidered.join(', ')}
                        </Typography>
                      )}
                      
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        処理時間: {log.processingTimeMs}ms
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      )}

      {/* 最終更新時刻 */}
      {dashboard && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          最終更新: {formatTimestamp(dashboard.lastUpdated)}
        </Typography>
      )}
    </Box>
  );
};