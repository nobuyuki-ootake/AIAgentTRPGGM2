// ==========================================
// 混合投票状況表示パネル
// ==========================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Alert,
  Button,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Collapse,
  Divider,
  Grid,
  CircularProgress,
  Badge,
  Paper
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as SmartToyIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  NotificationImportant as NotificationIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Remove as AbstractIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import {
  VotingSummary,
  VoteChoice,
  ID
} from '@ai-agent-trpg/types';
import {
  getMixedVotingStatus,
  getVotingProgress,
  getVoterDetails,
  sendVotingReminder,
  triggerAutoReminder
} from '../../api/mixedVoting';
import { useWebSocket } from '../../hooks/useWebSocket';

interface MixedVotingStatusPanelProps {
  proposalId: ID;
  onReminderSent?: (count: number) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showAiDetails?: boolean;
  disabled?: boolean;
}

export const MixedVotingStatusPanel: React.FC<MixedVotingStatusPanelProps> = ({
  proposalId,
  onReminderSent,
  autoRefresh = false,
  refreshInterval = 10000,
  showAiDetails = false,
  disabled = false
}) => {
  const [votingStatus, setVotingStatus] = useState<VotingSummary | null>(null);
  const [voterDetails, setVoterDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showAiInfo, setShowAiInfo] = useState(showAiDetails);
  const [sendingReminder, setSendingReminder] = useState(false);
  
  // WebSocket接続
  const { isConnected, onPartyMovementUpdated } = useWebSocket();

  // ==========================================
  // データ取得
  // ==========================================

  const fetchVotingStatus = useCallback(async () => {
    if (!proposalId) return;

    setLoading(true);
    setError(null);

    try {
      const [statusResponse, votersResponse] = await Promise.all([
        getMixedVotingStatus({ proposalId }),
        getVoterDetails(proposalId, showAiInfo)
      ]);

      if (statusResponse.success && statusResponse.votingSummary) {
        setVotingStatus(statusResponse.votingSummary);
      } else {
        setError(statusResponse.error || '投票状況の取得に失敗しました');
      }

      if (votersResponse.success) {
        setVoterDetails(votersResponse.voters);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [proposalId, showAiInfo]);

  // 初期読み込み
  useEffect(() => {
    fetchVotingStatus();
  }, [fetchVotingStatus]);

  // WebSocketリアルタイム更新
  useEffect(() => {
    if (!isConnected) return;

    const handlePartyMovementUpdate = (data: any) => {
      console.log('Voting status WebSocket update received:', data.type);
      
      // 投票関連の更新を受信したらデータを更新
      if (data.type === 'vote-cast' && data.proposalId === proposalId) {
        fetchVotingStatus();
      }
    };

    const cleanup = onPartyMovementUpdated(handlePartyMovementUpdate);
    
    return cleanup;
  }, [isConnected, onPartyMovementUpdated, fetchVotingStatus, proposalId]);


  // ==========================================
  // アクション処理
  // ==========================================

  const handleSendReminder = async () => {
    if (disabled || !votingStatus) return;

    setSendingReminder(true);
    setError(null);

    try {
      const response = await sendVotingReminder({
        proposalId,
        reminderMessage: '⏰ パーティ移動の投票をお願いします。皆さんの合意をお待ちしています。'
      });

      if (response.success) {
        if (onReminderSent) {
          onReminderSent(response.remindersSent);
        }
        // 状況を再取得
        await fetchVotingStatus();
      } else {
        setError(response.error || '催促の送信に失敗しました');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '催促の送信中にエラーが発生しました');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleAutoReminder = async () => {
    if (disabled) return;

    try {
      const response = await triggerAutoReminder(proposalId);
      if (response.success && response.remindersSent > 0) {
        await fetchVotingStatus();
      }
    } catch (err) {
      console.error('Auto reminder failed:', err);
    }
  };

  // ==========================================
  // ヘルパー関数
  // ==========================================

  const getVoteIcon = (choice: VoteChoice) => {
    switch (choice) {
      case 'approve': return <ThumbUpIcon color="success" />;
      case 'reject': return <ThumbDownIcon color="error" />;
      case 'abstain': return <AbstractIcon color="disabled" />;
      default: return <ScheduleIcon color="warning" />;
    }
  };

  const getVoterTypeIcon = (voterType: string) => {
    return voterType === 'human' ? 
      <PersonIcon color="primary" /> : 
      <SmartToyIcon color="secondary" />;
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  if (!votingStatus) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            {loading ? <CircularProgress /> : <Typography>投票情報を読み込み中...</Typography>}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // ==========================================
  // レンダリング
  // ==========================================

  return (
    <Card>
      <CardContent>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            🗳️ 混合投票状況
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title={showAiInfo ? 'AI詳細を非表示' : 'AI詳細を表示'}>
              <IconButton
                size="small"
                onClick={() => setShowAiInfo(!showAiInfo)}
              >
                {showAiInfo ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </Tooltip>
            
            <IconButton
              size="small"
              onClick={fetchVotingStatus}
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
            
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 全体進捗 */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              全体進捗 ({votingStatus.currentApprovals}/{votingStatus.requiredApprovals} 合意)
            </Typography>
            
            {votingStatus.consensusReached && (
              <Chip
                label={`✅ ${votingStatus.consensusType}`}
                color="success"
                size="small"
              />
            )}
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={(votingStatus.currentApprovals / votingStatus.requiredApprovals) * 100}
            color={votingStatus.consensusReached ? 'success' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* 人間PC vs AI PC統計 */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                人間PC
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                <PersonIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {votingStatus.votingStatistics.humanVoters.voted}/{votingStatus.votingStatistics.humanVoters.total}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={votingStatus.votingStatistics.humanVoters.total > 0 ? 
                  (votingStatus.votingStatistics.humanVoters.voted / votingStatus.votingStatistics.humanVoters.total) * 100 : 100}
                color={calculateProgressColor(
                  votingStatus.votingStatistics.humanVoters.total > 0 ? 
                    (votingStatus.votingStatistics.humanVoters.voted / votingStatus.votingStatistics.humanVoters.total) * 100 : 100
                )}
                sx={{ mt: 1 }}
              />
            </Paper>
          </Grid>
          
          <Grid item xs={6}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                AI PC
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                <SmartToyIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {votingStatus.votingStatistics.aiVoters.voted}/{votingStatus.votingStatistics.aiVoters.total}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={votingStatus.votingStatistics.aiVoters.total > 0 ? 
                  (votingStatus.votingStatistics.aiVoters.voted / votingStatus.votingStatistics.aiVoters.total) * 100 : 100}
                color={calculateProgressColor(
                  votingStatus.votingStatistics.aiVoters.total > 0 ? 
                    (votingStatus.votingStatistics.aiVoters.voted / votingStatus.votingStatistics.aiVoters.total) * 100 : 100
                )}
                sx={{ mt: 1 }}
              />
            </Paper>
          </Grid>
        </Grid>

        {/* 催促ボタン */}
        {votingStatus.votingStatistics.humanVoters.pending > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<NotificationIcon />}
              onClick={handleSendReminder}
              disabled={disabled || sendingReminder}
              fullWidth
              size="small"
            >
              {sendingReminder ? '催促送信中...' : `人間PC ${votingStatus.votingStatistics.humanVoters.pending}名に催促`}
            </Button>
            
            {votingStatus.remindersSent > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                これまでの催促回数: {votingStatus.remindersSent}回
                {votingStatus.lastReminderAt && ` (最終: ${formatTimestamp(votingStatus.lastReminderAt)})`}
              </Typography>
            )}
          </Box>
        )}

        {/* 詳細投票者リスト */}
        <Collapse in={expanded}>
          <Divider sx={{ mb: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            投票者詳細
          </Typography>
          
          <List dense>
            {votingStatus.voterDetails.map((voter) => (
              <ListItem key={voter.voterId}>
                <ListItemIcon>
                  <Badge
                    badgeContent={voter.isProposer ? '提案' : ''}
                    color="primary"
                    invisible={!voter.isProposer}
                    anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                  >
                    {getVoterTypeIcon(voter.voterType)}
                  </Badge>
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">
                        {voter.voterName}
                      </Typography>
                      <Chip
                        label={voter.voterType === 'human' ? '人間' : 'AI'}
                        size="small"
                        color={voter.voterType === 'human' ? 'primary' : 'secondary'}
                      />
                      {voter.hasVoted && (
                        <Chip
                          label={voter.choice}
                          size="small"
                          color={voter.choice === 'approve' ? 'success' : 
                                 voter.choice === 'reject' ? 'error' : 'default'}
                        />
                      )}
                    </Stack>
                  }
                  secondary={
                    <Box>
                      {voter.hasVoted ? (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            投票済み: {formatTimestamp(voter.votedAt)}
                          </Typography>
                          {voter.voteReason && (
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              理由: {voter.voteReason}
                            </Typography>
                          )}
                          {showAiInfo && voter.aiDecisionFactors && (
                            <Typography variant="caption" color="info.main" sx={{ display: 'block' }}>
                              信頼度: {voter.aiDecisionFactors.confidenceScore}% 
                              (処理時間: {voter.aiDecisionFactors.processingTimeMs}ms)
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="warning.main">
                          {voter.voterType === 'human' ? '投票待ち' : 'AI処理中'}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  {voter.hasVoted ? (
                    getVoteIcon(voter.choice)
                  ) : (
                    <ScheduleIcon color="warning" />
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Collapse>

        {/* 最終更新時刻 */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          最終更新: {formatTimestamp(new Date().toISOString())}
        </Typography>
      </CardContent>
    </Card>
  );
};