import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Divider,
  IconButton,
  Collapse,
  Chip,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  HowToVote as VoteIcon
} from '@mui/icons-material';
import { ID } from '@ai-agent-trpg/types';
import { MovementProposalUI } from './MovementProposalUI';
import { MovementConsensus } from './MovementConsensus';
import { MixedVotingStatusPanel } from './MixedVotingStatusPanel';
import usePartyMovement from '../../hooks/usePartyMovement';

// ==========================================
// Props定義
// ==========================================

export interface PartyMovementDialogProps {
  open: boolean;
  onClose: () => void;
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
  onChatMessage?: (message: string, type: 'ic' | 'ooc') => void;
}

// ==========================================
// メインコンポーネント
// ==========================================

export const PartyMovementDialog: React.FC<PartyMovementDialogProps> = ({
  open,
  onClose,
  sessionId,
  currentLocationId,
  currentLocationName = '不明な場所',
  availableLocations,
  currentCharacterId,
  onLocationChange,
  onChatMessage
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [lastNotifiedResult, setLastNotifiedResult] = useState<string | null>(null);

  const {
    activeProposal,
    votingSummary,
    loading,
    error,
    createProposal,
    castVote,
    executeMovement,
    cancelProposal
  } = usePartyMovement({ 
    sessionId,
    autoRefresh: false,
    refreshInterval: 3000 // 使用されない
  });

  // 投票結果の自動通知
  useEffect(() => {
    if (!activeProposal || !votingSummary || !onChatMessage) return;

    const resultKey = `${activeProposal.id}_${votingSummary.consensusReached}`;
    
    if (votingSummary.consensusReached && lastNotifiedResult !== resultKey) {
      const targetLocation = availableLocations.find(loc => loc.id === activeProposal.targetLocationId);
      const locationName = targetLocation?.name || activeProposal.targetLocationId;
      
      onChatMessage(
        `✅ パーティ移動が承認されました！「${locationName}」への移動が可能になりました。`,
        'ooc'
      );
      setLastNotifiedResult(resultKey);
    }
  }, [activeProposal, votingSummary, lastNotifiedResult, onChatMessage, availableLocations]);

  // 移動実行ハンドラー
  const handleExecuteMovement = async () => {
    if (!activeProposal || !onLocationChange) return;

    try {
      await executeMovement(activeProposal.id);
      
      const targetLocation = availableLocations.find(loc => loc.id === activeProposal.targetLocationId);
      const locationName = targetLocation?.name || activeProposal.targetLocationId;
      
      // 移動完了通知
      if (onChatMessage) {
        onChatMessage(
          `🚶 パーティが「${locationName}」に移動しました！全員のターンが1ターン進行します。`,
          'ooc'
        );
      }
      
      // 場所変更コールバック
      onLocationChange(activeProposal.targetLocationId);
      
      // ダイアログを閉じる
      onClose();
      
    } catch (err) {
      console.error('Failed to execute movement:', err);
    }
  };

  // 提案キャンセルハンドラー
  const handleCancelProposal = async () => {
    if (!activeProposal) return;

    try {
      await cancelProposal(activeProposal.id, 'ユーザーによるキャンセル');
      
      if (onChatMessage) {
        onChatMessage('❌ パーティ移動提案がキャンセルされました。', 'ooc');
      }
      
    } catch (err) {
      console.error('Failed to cancel proposal:', err);
    }
  };

  // 投票ハンドラー
  const handleVote = async (proposalId: ID, choice: any, reason?: string) => {
    try {
      await castVote(proposalId, choice, reason);
    } catch (err) {
      console.error('Failed to cast vote:', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      data-testid="party-movement-dialog"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            🚶 パーティ移動
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 現在位置表示 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            現在位置
          </Typography>
          <Typography variant="h6" color="primary">
            {currentLocationName}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* メインコンテンツ */}
        {!activeProposal ? (
          /* 新規提案作成 */
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              新しい移動提案を作成
            </Typography>
            <MovementProposalUI
              sessionId={sessionId}
              currentLocationId={currentLocationId}
              currentLocationName={currentLocationName}
              availableLocations={availableLocations}
              currentCharacterId={currentCharacterId}
              onLocationChange={onLocationChange}
              disabled={loading}
            />
          </Box>
        ) : (
          /* 投票中の提案表示 */
          <Box>
            {/* 提案情報 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                移動提案中
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body1">
                    <strong>目的地:</strong> {availableLocations.find(loc => loc.id === activeProposal.targetLocationId)?.name || activeProposal.targetLocationId}
                  </Typography>
                  <Chip
                    label={activeProposal.urgency === 'high' ? '緊急' : activeProposal.urgency === 'medium' ? '通常' : '低優先'}
                    color={activeProposal.urgency === 'high' ? 'error' : activeProposal.urgency === 'medium' ? 'warning' : 'info'}
                    size="small"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  <strong>理由:</strong> {activeProposal.reason}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>移動方法:</strong> {activeProposal.movementMethod === 'walk' ? '徒歩' : 
                                                  activeProposal.movementMethod === 'run' ? '走行' :
                                                  activeProposal.movementMethod === 'ride' ? '騎乗' :
                                                  activeProposal.movementMethod === 'fly' ? '飛行' :
                                                  activeProposal.movementMethod === 'teleport' ? 'テレポート' :
                                                  activeProposal.movementMethod === 'vehicle' ? '乗り物' : activeProposal.movementMethod}
                </Typography>
              </Box>
            </Box>

            {/* 投票状況 */}
            {votingSummary && (
              <Box sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <VoteIcon color="primary" />
                  <Typography variant="subtitle2">
                    投票状況 ({votingSummary.currentApprovals}/{votingSummary.requiredApprovals} 必要)
                  </Typography>
                  {votingSummary.consensusReached && (
                    <Chip
                      icon={<CheckIcon />}
                      label="合意成立"
                      color="success"
                      size="small"
                    />
                  )}
                </Box>

                {/* 簡易投票状況表示 */}
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Chip
                    label={`賛成: ${votingSummary.votes.approve}`}
                    color="success"
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`反対: ${votingSummary.votes.reject}`}
                    color="error"
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`棄権: ${votingSummary.votes.abstain}`}
                    color="default"
                    size="small"
                    variant="outlined"
                  />
                </Stack>

                {/* 詳細投票情報の折りたたみ表示 */}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowDetails(!showDetails)}
                  endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ mb: 1 }}
                >
                  投票詳細を{showDetails ? '隠す' : '表示'}
                </Button>

                <Collapse in={showDetails}>
                  {/* 混合投票状況パネル */}
                  <Box sx={{ mb: 2 }}>
                    <MixedVotingStatusPanel
                      proposalId={activeProposal.id}
                      autoRefresh={false}
                      refreshInterval={5000}
                      showAiDetails={true}
                      onReminderSent={(count) => {
                        if (onChatMessage) {
                          onChatMessage(
                            `📢 ${count}名の人間PCに投票催促を送信しました`,
                            'ooc'
                          );
                        }
                      }}
                    />
                  </Box>
                  
                  {/* 従来の投票UI */}
                  <MovementConsensus
                    proposal={activeProposal}
                    votingSummary={votingSummary}
                    onVoteChange={handleVote}
                    showDetailed={true}
                    interactive={true}
                    currentUserId={currentCharacterId}
                    disabled={loading}
                  />
                </Collapse>
              </Box>
            )}

            {/* 合意成立時のアクション */}
            {votingSummary?.consensusReached && activeProposal.status === 'approved' && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  🎉 移動が承認されました！
                </Typography>
                <Typography variant="body2">
                  「移動実行」ボタンをクリックしてパーティを移動させてください。
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
          {/* キャンセル/閉じるボタン */}
          <Button onClick={onClose} disabled={loading}>
            {activeProposal ? 'キャンセル' : '閉じる'}
          </Button>

          {/* 提案キャンセルボタン */}
          {activeProposal && activeProposal.proposerId === currentCharacterId && (
            <Button
              color="warning"
              onClick={handleCancelProposal}
              disabled={loading}
              startIcon={<CancelIcon />}
            >
              提案取り消し
            </Button>
          )}

          {/* 移動実行ボタン */}
          {votingSummary?.consensusReached && activeProposal?.status === 'approved' && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleExecuteMovement}
              disabled={loading}
              sx={{ ml: 'auto' }}
              data-testid="execute-movement-button"
            >
              移動実行
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default PartyMovementDialog;