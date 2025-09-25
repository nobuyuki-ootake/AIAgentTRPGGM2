import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  HowToVote as VoteIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Comment as CommentIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import {
  PartyMovementProposal,
  VotingSummary,
  VoteChoice,
  ID
} from '@ai-agent-trpg/types';

// ==========================================
// Props定義
// ==========================================

export interface MovementConsensusProps {
  proposal: PartyMovementProposal;
  votingSummary: VotingSummary;
  onVoteChange?: (proposalId: ID, choice: VoteChoice, reason?: string) => void;
  showDetailed?: boolean;
  interactive?: boolean;
  currentUserId?: ID;
  disabled?: boolean;
}

// ==========================================
// 統計情報コンポーネント
// ==========================================

const ConsensusStatistics: React.FC<{ votingSummary: VotingSummary }> = ({ votingSummary }) => {
  const totalVotes = votingSummary.votes.approve + votingSummary.votes.reject + votingSummary.votes.abstain;
  const votedCount = votingSummary.voterDetails.filter(v => v.hasVoted).length;
  const remainingVotes = votingSummary.totalEligibleVoters - votedCount;
  
  const approvalRate = totalVotes > 0 ? (votingSummary.votes.approve / totalVotes) * 100 : 0;
  const rejectionRate = totalVotes > 0 ? (votingSummary.votes.reject / totalVotes) * 100 : 0;
  const abstentionRate = totalVotes > 0 ? (votingSummary.votes.abstain / totalVotes) * 100 : 0;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <TrendingUpIcon color="primary" />
            投票進捗
          </Typography>
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              進捗: {votedCount}/{votingSummary.totalEligibleVoters} ({((votedCount / votingSummary.totalEligibleVoters) * 100).toFixed(0)}%)
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(votedCount / votingSummary.totalEligibleVoters) * 100}
              sx={{ mt: 1 }}
            />
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip
              label={`残り ${remainingVotes} 人`}
              color={remainingVotes === 0 ? 'success' : 'warning'}
              size="small"
            />
            <Chip
              label={votingSummary.consensusReached ? '合意成立' : '合意未成立'}
              color={votingSummary.consensusReached ? 'success' : 'default'}
              size="small"
            />
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <VoteIcon color="primary" />
            投票分布
          </Typography>
          <Stack spacing={1}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box display="flex" alignItems="center" gap={1} flex={1}>
                <Box width={12} height={12} bgcolor="success.main" />
                <Typography variant="body2">賛成</Typography>
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {votingSummary.votes.approve} 票 ({approvalRate.toFixed(0)}%)
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Box display="flex" alignItems="center" gap={1} flex={1}>
                <Box width={12} height={12} bgcolor="error.main" />
                <Typography variant="body2">反対</Typography>
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {votingSummary.votes.reject} 票 ({rejectionRate.toFixed(0)}%)
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Box display="flex" alignItems="center" gap={1} flex={1}>
                <Box width={12} height={12} bgcolor="grey.400" />
                <Typography variant="body2">棄権</Typography>
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {votingSummary.votes.abstain} 票 ({abstentionRate.toFixed(0)}%)
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
};

// ==========================================
// 投票者詳細コンポーネント
// ==========================================

const VoterDetails: React.FC<{
  voterDetails: VotingSummary['voterDetails'];
  onShowComment?: (voterId: ID, voterName: string) => void;
}> = ({ voterDetails, onShowComment }) => {
  const getVoteIcon = (choice: VoteChoice, hasVoted: boolean) => {
    if (!hasVoted) return <ScheduleIcon color="disabled" />;
    
    switch (choice) {
      case 'approve':
        return <CheckIcon color="success" />;
      case 'reject':
        return <CloseIcon color="error" />;
      case 'abstain':
        return <VoteIcon color="disabled" />;
      default:
        return <ScheduleIcon color="disabled" />;
    }
  };

  const getVoteColor = (choice: VoteChoice, hasVoted: boolean) => {
    if (!hasVoted) return 'default';
    
    switch (choice) {
      case 'approve':
        return 'success';
      case 'reject':
        return 'error';
      case 'abstain':
        return 'default';
      default:
        return 'default';
    }
  };

  const getVoteText = (choice: VoteChoice, hasVoted: boolean) => {
    if (!hasVoted) return '未投票';
    
    switch (choice) {
      case 'approve':
        return '賛成';
      case 'reject':
        return '反対';
      case 'abstain':
        return '棄権';
      default:
        return '未投票';
    }
  };

  return (
    <List>
      {voterDetails.map((voter, index) => (
        <React.Fragment key={voter.voterId}>
          <ListItem>
            <ListItemIcon>
              <Avatar sx={{ width: 40, height: 40 }}>
                {voter.voterName.charAt(0)}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1">{voter.voterName}</Typography>
                  {voter.isProposer && (
                    <Chip
                      label="提案者"
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              }
              secondary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={voter.isProposer ? '自動賛成' : getVoteText(voter.choice, voter.hasVoted)}
                    color={getVoteColor(voter.choice, voter.hasVoted) as any}
                    size="small"
                  />
                  {voter.hasVoted && (
                    <Typography variant="caption" color="text.secondary">
                      {voter.isProposer ? '提案による自動投票' : '投票済み'}
                    </Typography>
                  )}
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <Box display="flex" gap={1}>
                {getVoteIcon(voter.choice, voter.hasVoted)}
                {onShowComment && (
                  <Tooltip title="コメントを表示">
                    <IconButton
                      size="small"
                      onClick={() => onShowComment(voter.voterId, voter.voterName)}
                    >
                      <CommentIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </ListItemSecondaryAction>
          </ListItem>
          {index < voterDetails.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </List>
  );
};

// ==========================================
// メインコンポーネント
// ==========================================

export const MovementConsensus: React.FC<MovementConsensusProps> = ({
  proposal,
  votingSummary,
  onVoteChange,
  showDetailed = true,
  interactive = false,
  currentUserId,
  disabled = false
}) => {
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<{ id: ID; name: string } | null>(null);
  const [voteComment, setVoteComment] = useState('');
  const [selectedVote, setSelectedVote] = useState<VoteChoice | null>(null);

  // 現在のユーザーの投票状態を取得
  const currentUserVote = votingSummary.voterDetails.find(v => v.voterId === currentUserId);
  
  // 現在のユーザーが提案者かどうか
  const isCurrentUserProposer = currentUserId === proposal.proposerId;
  
  // 合意成立までの必要票数
  const remainingApprovals = Math.max(0, votingSummary.requiredApprovals - votingSummary.currentApprovals);

  // 投票ハンドラー
  const handleVote = (choice: VoteChoice) => {
    if (!interactive || !onVoteChange || !currentUserId) return;
    
    setSelectedVote(choice);
    setShowCommentDialog(true);
  };

  // コメント付き投票の確定
  const handleConfirmVote = () => {
    if (!selectedVote || !onVoteChange || !currentUserId) return;
    
    onVoteChange(proposal.id, selectedVote, voteComment);
    setShowCommentDialog(false);
    setVoteComment('');
    setSelectedVote(null);
  };

  // コメント表示ハンドラー
  const handleShowComment = (voterId: ID, voterName: string) => {
    setSelectedVoter({ id: voterId, name: voterName });
    // TODO: 実際のコメントデータを取得
  };

  return (
    <Box data-testid="movement-consensus">
      <Card>
        <CardContent>
          {/* ヘッダー */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" display="flex" alignItems="center" gap={1}>
              <GroupIcon color="primary" />
              合意状況
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label={votingSummary.consensusType}
                color={votingSummary.consensusReached ? 'success' : 'default'}
                size="small"
              />
              {remainingApprovals > 0 && (
                <Chip
                  label={`あと ${remainingApprovals} 票で合意`}
                  color="warning"
                  size="small"
                />
              )}
            </Stack>
          </Box>

          {/* 合意状況の警告/情報 */}
          {votingSummary.consensusReached ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              合意が成立しました！移動を実行できます。
            </Alert>
          ) : (
            <Alert 
              severity={remainingApprovals <= 1 ? "warning" : "info"} 
              sx={{ mb: 2 }}
              icon={remainingApprovals <= 1 ? <WarningIcon /> : undefined}
            >
              {remainingApprovals <= 1 
                ? `あと ${remainingApprovals} 票で合意成立です。`
                : `合意には ${remainingApprovals} 票の賛成が必要です。`
              }
            </Alert>
          )}

          {/* 統計情報 */}
          {showDetailed && (
            <Box mb={3}>
              <ConsensusStatistics votingSummary={votingSummary} />
            </Box>
          )}

          {/* 投票アクション (インタラクティブモード) */}
          {interactive && currentUserId && !currentUserVote?.hasVoted && !isCurrentUserProposer && (
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                あなたの投票
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleVote('approve')}
                  disabled={disabled}
                  data-testid="vote-approve-interactive"
                >
                  賛成
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleVote('reject')}
                  disabled={disabled}
                  data-testid="vote-reject-interactive"
                >
                  反対
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleVote('abstain')}
                  disabled={disabled}
                  data-testid="vote-abstain-interactive"
                >
                  棄権
                </Button>
              </Stack>
            </Box>
          )}

          {/* 提案者向けメッセージ */}
          {interactive && currentUserId && isCurrentUserProposer && (
            <Box mb={3}>
              <Alert severity="success">
                あなたの提案です。自動的に「賛成」として投票されています。
              </Alert>
            </Box>
          )}

          {/* 現在のユーザーの投票状態表示 */}
          {interactive && currentUserId && currentUserVote?.hasVoted && !isCurrentUserProposer && (
            <Box mb={3}>
              <Alert severity="info">
                あなたは「{currentUserVote.choice === 'approve' ? '賛成' : 
                       currentUserVote.choice === 'reject' ? '反対' : '棄権'}」に投票済みです。
              </Alert>
            </Box>
          )}

          {/* 投票者詳細 */}
          <Accordion defaultExpanded={showDetailed}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                投票者詳細 ({votingSummary.voterDetails.filter(v => v.hasVoted).length}/{votingSummary.totalEligibleVoters})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <VoterDetails
                voterDetails={votingSummary.voterDetails}
                onShowComment={handleShowComment}
              />
            </AccordionDetails>
          </Accordion>

          {/* 合意進捗バー */}
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              合意進捗: {votingSummary.currentApprovals}/{votingSummary.requiredApprovals}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(votingSummary.currentApprovals / votingSummary.requiredApprovals) * 100}
              color={votingSummary.consensusReached ? 'success' : 'primary'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* 投票コメントダイアログ */}
      <Dialog
        open={showCommentDialog}
        onClose={() => setShowCommentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          投票理由 ({selectedVote === 'approve' ? '賛成' : 
                    selectedVote === 'reject' ? '反対' : '棄権'})
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="投票理由（任意）"
            value={voteComment}
            onChange={(e) => setVoteComment(e.target.value)}
            placeholder="なぜこの選択をしたのか理由を記入できます"
            sx={{ mt: 1 }}
            data-testid="vote-comment-input"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCommentDialog(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleConfirmVote}
            variant="contained"
            data-testid="confirm-vote-button"
          >
            投票確定
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MovementConsensus;