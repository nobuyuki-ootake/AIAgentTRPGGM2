import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Slider,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Avatar,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  HowToVote as VoteIcon,
  DirectionsRun as MoveIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import {
  PartyMovementProposal,
  VotingSummary,
  VoteChoice,
  MovementMethod,
  ConsensusSettings,
  ID
} from '@ai-agent-trpg/types';
import usePartyMovement from '../../hooks/usePartyMovement';

// ==========================================
// Props定義
// ==========================================

export interface MovementProposalUIProps {
  sessionId: ID;
  currentLocationId?: ID;
  currentLocationName?: string;
  availableLocations: Array<{
    id: ID;
    name: string;
    distance?: number;
    dangerLevel?: 'safe' | 'moderate' | 'dangerous';
  }>;
  currentCharacterId?: ID;
  onLocationChange?: (locationId: ID) => void;
  disabled?: boolean;
}

// ==========================================
// メインコンポーネント
// ==========================================

export const MovementProposalUI: React.FC<MovementProposalUIProps> = ({
  sessionId,
  currentLocationId,
  currentLocationName = '不明な場所',
  availableLocations,
  currentCharacterId,
  onLocationChange,
  disabled = false
}) => {
  const {
    movementSystem,
    loading,
    error,
    activeProposal,
    votingSummary,
    createProposal,
    castVote,
    executeMovement,
    cancelProposal,
    consensusSettings,
    updateConsensusSettings
  } = usePartyMovement({ 
    sessionId,
    autoRefresh: false
  });

  // ローカル状態
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [newProposal, setNewProposal] = useState({
    targetLocationId: '',
    movementMethod: 'walk' as MovementMethod,
    reason: '',
    urgency: 'medium' as 'low' | 'medium' | 'high',
    votingDeadline: undefined as string | undefined
  });

  // 提案作成ハンドラー
  const handleCreateProposal = async () => {
    if (!newProposal.targetLocationId || !newProposal.reason || !currentCharacterId) {
      return;
    }

    try {
      await createProposal({
        proposerId: currentCharacterId,
        targetLocationId: newProposal.targetLocationId,
        movementMethod: newProposal.movementMethod,
        reason: newProposal.reason,
        urgency: newProposal.urgency,
        votingDeadline: newProposal.votingDeadline
      });

      setShowCreateDialog(false);
      setNewProposal({
        targetLocationId: '',
        movementMethod: 'walk',
        reason: '',
        urgency: 'medium',
        votingDeadline: undefined
      });
    } catch (err) {
      console.error('Failed to create proposal:', err);
    }
  };

  // 投票ハンドラー
  const handleVote = async (choice: VoteChoice, reason?: string) => {
    if (!activeProposal) return;

    try {
      await castVote(activeProposal.id, choice, reason);
    } catch (err) {
      console.error('Failed to cast vote:', err);
    }
  };

  // 移動実行ハンドラー
  const handleExecuteMovement = async () => {
    if (!activeProposal) return;

    try {
      await executeMovement(activeProposal.id);
      if (onLocationChange) {
        onLocationChange(activeProposal.targetLocationId);
      }
    } catch (err) {
      console.error('Failed to execute movement:', err);
    }
  };

  // 提案キャンセルハンドラー
  const handleCancelProposal = async () => {
    if (!activeProposal) return;

    try {
      await cancelProposal(activeProposal.id, 'ユーザーによるキャンセル');
    } catch (err) {
      console.error('Failed to cancel proposal:', err);
    }
  };

  // 場所名を取得
  const getLocationName = (locationId: ID) => {
    const location = availableLocations.find(loc => loc.id === locationId);
    return location?.name || locationId;
  };

  // 移動方法の表示名
  const movementMethodNames = {
    walk: '徒歩',
    run: '走行',
    ride: '騎乗',
    fly: '飛行',
    teleport: 'テレポート',
    vehicle: '乗り物'
  };

  // 緊急度の色
  const urgencyColors = {
    low: 'info',
    medium: 'warning',
    high: 'error'
  } as const;

  return (
    <Box data-testid="movement-proposal-ui">
      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ローディング */}
      {loading && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* 現在位置 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <LocationIcon color="primary" />
            <Typography variant="h6">
              現在位置: {currentLocationName}
            </Typography>
            {movementSystem?.state.partyMembers && (
              <Chip
                label={`${movementSystem.state.partyMembers.length}人のパーティ`}
                icon={<GroupIcon />}
                color="primary"
                size="small"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* アクティブな提案 */}
      {activeProposal && votingSummary ? (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <MoveIcon color="primary" />
                移動提案中
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={newProposal.urgency === 'high' ? '緊急' : newProposal.urgency === 'medium' ? '通常' : '低優先'}
                  color={urgencyColors[activeProposal.urgency]}
                  size="small"
                />
                <Chip
                  label={activeProposal.status === 'voting' ? '投票中' : activeProposal.status}
                  color="info"
                  size="small"
                />
              </Stack>
            </Box>

            {/* 提案内容 */}
            <Grid container spacing={2} mb={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  目的地
                </Typography>
                <Typography variant="body1">
                  {getLocationName(activeProposal.targetLocationId)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  移動方法
                </Typography>
                <Typography variant="body1">
                  {movementMethodNames[activeProposal.movementMethod]}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  理由
                </Typography>
                <Typography variant="body1">
                  {activeProposal.reason}
                </Typography>
              </Grid>
            </Grid>

            {/* 投票状況 */}
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                投票状況 ({votingSummary.currentApprovals}/{votingSummary.requiredApprovals} 必要)
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(votingSummary.currentApprovals / votingSummary.requiredApprovals) * 100}
                sx={{ mb: 1 }}
              />
              <Stack direction="row" spacing={1}>
                <Chip
                  label={`賛成: ${votingSummary.votes.approve}`}
                  color="success"
                  size="small"
                />
                <Chip
                  label={`反対: ${votingSummary.votes.reject}`}
                  color="error"
                  size="small"
                />
                <Chip
                  label={`棄権: ${votingSummary.votes.abstain}`}
                  color="default"
                  size="small"
                />
              </Stack>
            </Box>

            {/* 投票者詳細 */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">投票者詳細</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {votingSummary.voterDetails.map(voter => (
                    <ListItem key={voter.voterId}>
                      <ListItemIcon>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {voter.voterName.charAt(0)}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={voter.voterName}
                        secondary={voter.hasVoted ? 
                          `${voter.choice === 'approve' ? '賛成' : voter.choice === 'reject' ? '反対' : '棄権'}` :
                          '未投票'
                        }
                      />
                      <ListItemSecondaryAction>
                        {voter.hasVoted ? (
                          <CheckIcon color={voter.choice === 'approve' ? 'success' : voter.choice === 'reject' ? 'error' : 'disabled'} />
                        ) : (
                          <ScheduleIcon color="disabled" />
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>

            {/* アクションボタン */}
            <Stack direction="row" spacing={1} mt={2}>
              {activeProposal.status === 'voting' && activeProposal.proposerId !== currentCharacterId && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleVote('approve')}
                    disabled={disabled}
                    data-testid="vote-approve-button"
                  >
                    賛成
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleVote('reject')}
                    disabled={disabled}
                    data-testid="vote-reject-button"
                  >
                    反対
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleVote('abstain')}
                    disabled={disabled}
                    data-testid="vote-abstain-button"
                  >
                    棄権
                  </Button>
                </>
              )}
              {activeProposal.status === 'voting' && activeProposal.proposerId === currentCharacterId && (
                <Alert severity="info" sx={{ flex: 1 }}>
                  あなたの提案です。他のメンバーの投票をお待ちください。
                </Alert>
              )}
              {votingSummary.consensusReached && activeProposal.status === 'approved' && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleExecuteMovement}
                  disabled={disabled}
                  startIcon={<MoveIcon />}
                  data-testid="execute-movement-button"
                >
                  移動実行
                </Button>
              )}
              <Button
                variant="outlined"
                color="warning"
                onClick={handleCancelProposal}
                disabled={disabled}
                data-testid="cancel-proposal-button"
              >
                提案キャンセル
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        /* 新規提案ボタン */
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" mb={2}>
              パーティ移動の提案を行えます
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCreateDialog(true)}
              disabled={disabled || !currentCharacterId}
              data-testid="create-proposal-button"
            >
              移動提案を作成
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 設定ボタン */}
      <Box display="flex" justifyContent="flex-end" gap={1}>
        <Tooltip title="合意設定">
          <IconButton
            onClick={() => setShowSettingsDialog(true)}
            data-testid="settings-button"
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 提案作成ダイアログ */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新しい移動提案</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>目的地</InputLabel>
              <Select
                value={newProposal.targetLocationId}
                onChange={(e) => setNewProposal(prev => ({
                  ...prev,
                  targetLocationId: e.target.value
                }))}
                label="目的地"
                data-testid="target-location-select"
              >
                {availableLocations.map(location => (
                  <MenuItem key={location.id} value={location.id}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <span>{location.name}</span>
                      {location.dangerLevel && (
                        <Chip
                          label={location.dangerLevel === 'safe' ? '安全' : location.dangerLevel === 'moderate' ? '注意' : '危険'}
                          color={location.dangerLevel === 'safe' ? 'success' : location.dangerLevel === 'moderate' ? 'warning' : 'error'}
                          size="small"
                        />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>移動方法</InputLabel>
              <Select
                value={newProposal.movementMethod}
                onChange={(e) => setNewProposal(prev => ({
                  ...prev,
                  movementMethod: e.target.value as MovementMethod
                }))}
                label="移動方法"
                data-testid="movement-method-select"
              >
                {Object.entries(movementMethodNames).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="移動理由"
              multiline
              rows={3}
              value={newProposal.reason}
              onChange={(e) => setNewProposal(prev => ({
                ...prev,
                reason: e.target.value
              }))}
              placeholder="なぜこの場所に移動する必要があるのか説明してください"
              data-testid="movement-reason-input"
            />

            <Box>
              <Typography gutterBottom>緊急度</Typography>
              <Slider
                value={newProposal.urgency === 'low' ? 1 : newProposal.urgency === 'medium' ? 2 : 3}
                min={1}
                max={3}
                step={1}
                marks={[
                  { value: 1, label: '低' },
                  { value: 2, label: '中' },
                  { value: 3, label: '高' }
                ]}
                onChange={(_, value) => {
                  const urgency = value === 1 ? 'low' : value === 2 ? 'medium' : 'high';
                  setNewProposal(prev => ({ ...prev, urgency }));
                }}
                data-testid="urgency-slider"
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleCreateProposal}
            variant="contained"
            disabled={!newProposal.targetLocationId || !newProposal.reason}
            data-testid="submit-proposal-button"
          >
            提案作成
          </Button>
        </DialogActions>
      </Dialog>

      {/* 設定ダイアログ */}
      <Dialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>合意設定</DialogTitle>
        <DialogContent>
          {consensusSettings && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>投票システム</InputLabel>
                <Select
                  value={consensusSettings.votingSystem}
                  onChange={(e) => updateConsensusSettings({
                    votingSystem: e.target.value as any
                  })}
                  label="投票システム"
                >
                  <MenuItem value="unanimous">全員一致</MenuItem>
                  <MenuItem value="majority">過半数</MenuItem>
                  <MenuItem value="leader_decision">リーダー決定</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Typography gutterBottom>
                  必要承認率: {consensusSettings.requiredApprovalPercentage}%
                </Typography>
                <Slider
                  value={consensusSettings.requiredApprovalPercentage}
                  min={50}
                  max={100}
                  step={10}
                  onChange={(_, value) => updateConsensusSettings({
                    requiredApprovalPercentage: value as number
                  })}
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={consensusSettings.allowAbstention}
                    onChange={(e) => updateConsensusSettings({
                      allowAbstention: e.target.checked
                    })}
                  />
                }
                label="棄権を許可"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={consensusSettings.leaderCanOverride}
                    onChange={(e) => updateConsensusSettings({
                      leaderCanOverride: e.target.checked
                    })}
                  />
                }
                label="リーダーの拒否権"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettingsDialog(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MovementProposalUI;