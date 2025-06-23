import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  Card,
  CardContent,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  AutoAwesomeRounded,
  CheckCircleRounded,
  ErrorRounded,
  WarningRounded,
  RefreshRounded,
  EmojiEventsRounded,
  ReportProblemRounded,
  ExpandMoreRounded,
  InfoRounded,
  LocalHospitalRounded,
  PsychologyRounded,
  AttachMoneyRounded,
  InventoryRounded,
  StarRounded,
  TrendingDownRounded,
  HelpOutlineRounded,
} from '@mui/icons-material';
import {
  EventResult,
  PenaltyEffect,
  RetryOption,
  Character,
  ID,
} from '@ai-agent-trpg/types';

interface ResultPenaltyPanelProps {
  eventResult: EventResult;
  character: Character;
  retryOptions?: RetryOption[];
  loading?: boolean;
  disabled?: boolean;
  allowRetry?: boolean;
  onRetrySelect?: (retryOption: RetryOption) => void;
  onAcceptResult?: () => void;
  onViewDetails?: () => void;
  onCharacterUpdate?: (characterId: ID, updates: any) => void;
}

interface PenaltyPreview {
  immediate: PenaltyEffect[];
  temporary: PenaltyEffect[];
  permanent: PenaltyEffect[];
}

export const ResultPenaltyPanel: React.FC<ResultPenaltyPanelProps> = ({
  eventResult,
  character,
  retryOptions = [],
  loading = false,
  disabled = false,
  allowRetry = true,
  onRetrySelect,
  onAcceptResult,
  onViewDetails,
  onCharacterUpdate,
}) => {
  const [retryDialogOpen, setRetryDialogOpen] = useState(false);
  const [selectedRetryOption, setSelectedRetryOption] = useState<RetryOption | null>(null);
  const [penaltiesApplied, setPenaltiesApplied] = useState(false);

  // ペナルティを分類
  const categorizePenalties = (): PenaltyPreview => {
    const immediate: PenaltyEffect[] = [];
    const temporary: PenaltyEffect[] = [];
    const permanent: PenaltyEffect[] = [];

    eventResult.penalties?.forEach(penalty => {
      if (penalty.duration === undefined) {
        permanent.push(penalty);
      } else if (penalty.duration === 0) {
        immediate.push(penalty);
      } else {
        temporary.push(penalty);
      }
    });

    return { immediate, temporary, permanent };
  };

  const penaltyPreview = categorizePenalties();

  // 結果の色を取得
  const getResultColor = () => {
    if (eventResult.success) {
      return eventResult.criticalType === 'success' ? 'success' : 'primary';
    } else {
      return eventResult.criticalType === 'failure' ? 'error' : 'warning';
    }
  };

  // 結果のアイコンを取得
  const getResultIcon = () => {
    if (eventResult.success) {
      return eventResult.criticalType === 'success' ? <EmojiEventsRounded /> : <CheckCircleRounded />;
    } else {
      return eventResult.criticalType === 'failure' ? <ErrorRounded /> : <WarningRounded />;
    }
  };

  // 結果メッセージを取得
  const getResultMessage = () => {
    if (eventResult.success) {
      return eventResult.criticalType === 'success' ? 'クリティカル成功！' : '成功！';
    } else {
      return eventResult.criticalType === 'failure' ? 'クリティカル失敗...' : '失敗...';
    }
  };

  // 報酬アイコンを取得
  const getRewardIcon = (rewardType: string) => {
    switch (rewardType) {
      case 'experience': return <StarRounded />;
      case 'currency': return <AttachMoneyRounded />;
      case 'item': return <InventoryRounded />;
      case 'skill_point': return <PsychologyRounded />;
      case 'reputation': return <EmojiEventsRounded />;
      default: return <AutoAwesomeRounded />;
    }
  };

  // ペナルティアイコンを取得
  const getPenaltyIcon = (penaltyType: string) => {
    switch (penaltyType) {
      case 'hp_loss': return <LocalHospitalRounded />;
      case 'mp_loss': return <PsychologyRounded />;
      case 'status_effect': return <ReportProblemRounded />;
      case 'item_loss': return <InventoryRounded />;
      default: return <TrendingDownRounded />;
    }
  };

  // ペナルティ適用
  const applyPenalties = async () => {
    if (!eventResult.penalties || penaltiesApplied) return;

    // キャラクターの更新（仮実装）
    const characterUpdates: any = {};
    
    eventResult.penalties.forEach(penalty => {
      switch (penalty.type) {
        case 'hp_loss':
          characterUpdates.hitPoints = Math.max(0, character.derivedStats.hitPoints - penalty.amount);
          break;
        case 'mp_loss':
          // MP実装時に追加
          break;
        case 'status_effect':
          // ステータス効果実装時に追加
          break;
        default:
          // その他のペナルティ
          break;
      }
    });

    if (Object.keys(characterUpdates).length > 0) {
      onCharacterUpdate?.(character.id, characterUpdates);
    }

    setPenaltiesApplied(true);
  };

  // リトライ選択
  const handleRetrySelect = (retryOption: RetryOption) => {
    setSelectedRetryOption(retryOption);
    setRetryDialogOpen(true);
  };

  // リトライ確認
  const confirmRetry = () => {
    if (selectedRetryOption && onRetrySelect) {
      onRetrySelect(selectedRetryOption);
      setRetryDialogOpen(false);
      setSelectedRetryOption(null);
    }
  };

  return (
    <Box>
      {/* メイン結果表示 */}
      <Card 
        sx={{ 
          mb: 3, 
          bgcolor: eventResult.success ? 'success.50' : 'error.50',
          border: 2,
          borderColor: getResultColor() + '.main',
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            {getResultIcon()}
            <Typography variant="h5" color={getResultColor() + '.main'} fontWeight="bold">
              {getResultMessage()}
            </Typography>
            {eventResult.criticalType && (
              <Chip
                label={eventResult.criticalType === 'success' ? 'クリティカル！' : 'ファンブル...'}
                color={eventResult.criticalType === 'success' ? 'success' : 'error'}
                variant="filled"
              />
            )}
          </Box>

          {/* ダイス結果詳細 */}
          <Box display="flex" gap={3} mb={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                ダイス結果
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {eventResult.finalScore}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                目標値
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {eventResult.targetNumber}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                差分
              </Typography>
              <Typography 
                variant="h6" 
                fontWeight="bold"
                color={eventResult.success ? 'success.main' : 'error.main'}
              >
                {eventResult.success ? '+' : ''}{eventResult.finalScore - eventResult.targetNumber}
              </Typography>
            </Box>
          </Box>

          {/* ナラティブ */}
          <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="body1">
              {eventResult.narrative}
            </Typography>
          </Paper>
        </CardContent>
      </Card>

      {/* 報酬とペナルティ */}
      <Stack spacing={2} mb={3}>
        {/* 報酬 */}
        {eventResult.rewards && eventResult.rewards.length > 0 && (
          <Card sx={{ bgcolor: 'success.50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <EmojiEventsRounded color="success" />
                <Typography variant="h6" color="success.main">
                  獲得報酬
                </Typography>
              </Box>
              <List dense>
                {eventResult.rewards.map((reward, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon>
                      {getRewardIcon(reward.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={reward.description}
                      secondary={`${reward.type}: ${reward.amount}`}
                    />
                    {reward.rarity && (
                      <Chip
                        label={reward.rarity}
                        size="small"
                        color={reward.rarity === 'legendary' ? 'warning' : 'default'}
                      />
                    )}
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* ペナルティ */}
        {eventResult.penalties && eventResult.penalties.length > 0 && (
          <Card sx={{ bgcolor: 'error.50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <ReportProblemRounded color="error" />
                  <Typography variant="h6" color="error.main">
                    ペナルティ
                  </Typography>
                </Box>
                {!penaltiesApplied && (
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={applyPenalties}
                    disabled={loading || disabled}
                  >
                    適用
                  </Button>
                )}
              </Box>

              {/* 即座のペナルティ */}
              {penaltyPreview.immediate.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="error.main" gutterBottom>
                    即座の効果
                  </Typography>
                  <List dense>
                    {penaltyPreview.immediate.map((penalty, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon>
                          {getPenaltyIcon(penalty.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={penalty.description}
                          secondary={`${penalty.amount} ${penalty.type}`}
                        />
                        <Chip
                          label={penalty.severity}
                          size="small"
                          color={penalty.severity === 'major' ? 'error' : penalty.severity === 'moderate' ? 'warning' : 'default'}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* 一時的なペナルティ */}
              {penaltyPreview.temporary.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom>
                    一時的な効果
                  </Typography>
                  <List dense>
                    {penaltyPreview.temporary.map((penalty, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon>
                          {getPenaltyIcon(penalty.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={penalty.description}
                          secondary={`${penalty.duration}ターン継続`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* 永続的なペナルティ */}
              {penaltyPreview.permanent.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="error.dark" gutterBottom>
                    永続的な効果
                  </Typography>
                  <List dense>
                    {penaltyPreview.permanent.map((penalty, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon>
                          {getPenaltyIcon(penalty.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={penalty.description}
                          secondary={penalty.reversible ? '回復可能' : '永続的'}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* ストーリー進行とその他の効果 */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreRounded />}>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesomeRounded fontSize="small" />
            <Typography variant="subtitle2">
              詳細結果・ストーリー効果
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {/* ストーリー進行 */}
            {eventResult.storyConsequences.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  ストーリーへの影響:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {eventResult.storyConsequences.map((consequence, index) => (
                    <li key={index}>
                      <Typography variant="body2">{consequence}</Typography>
                    </li>
                  ))}
                </ul>
              </Box>
            )}

            {/* 関係性変化 */}
            {Object.keys(eventResult.relationshipChanges).length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  関係性の変化:
                </Typography>
                <Stack spacing={0.5}>
                  {Object.entries(eventResult.relationshipChanges).map(([npcId, change]) => (
                    <Box key={npcId} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">NPC #{npcId}</Typography>
                      <Chip
                        label={`${change >= 0 ? '+' : ''}${change}`}
                        size="small"
                        color={change > 0 ? 'success' : change < 0 ? 'error' : 'default'}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* 経験値 */}
            {eventResult.experienceGained > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  獲得経験値:
                </Typography>
                <Typography variant="body1" color="primary.main" fontWeight="bold">
                  +{eventResult.experienceGained} XP
                </Typography>
              </Box>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* リトライオプション */}
      {!eventResult.success && allowRetry && retryOptions.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'warning.50' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <RefreshRounded color="warning" />
              <Typography variant="h6" color="warning.main">
                リトライオプション
              </Typography>
              <Tooltip title="失敗した場合に利用できる再挑戦の方法です">
                <HelpOutlineRounded fontSize="small" color="action" />
              </Tooltip>
            </Box>

            <Stack spacing={1}>
              {retryOptions.map((option) => (
                <Paper
                  key={option.id}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover', borderColor: 'warning.main' }
                  }}
                  onClick={() => handleRetrySelect(option)}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box flex={1}>
                      <Typography variant="subtitle2" gutterBottom>
                        {option.description}
                      </Typography>
                      <Box display="flex" gap={2}>
                        <Typography variant="caption" color="text.secondary">
                          ペナルティ軽減: {option.penaltyReduction}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          コスト倍率: ×{option.costModifier}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          利用可能回数: {option.availableAttempts}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      disabled={loading || disabled}
                    >
                      選択
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* アクションボタン */}
      <Box display="flex" justifyContent="flex-end" gap={2}>
        {onViewDetails && (
          <Button
            variant="outlined"
            onClick={onViewDetails}
            disabled={loading || disabled}
            startIcon={<InfoRounded />}
          >
            詳細を見る
          </Button>
        )}
        
        <Button
          variant="contained"
          onClick={onAcceptResult}
          disabled={loading || disabled}
          startIcon={eventResult.success ? <CheckCircleRounded /> : <WarningRounded />}
          color={eventResult.success ? 'success' : 'primary'}
        >
          結果を受け入れる
        </Button>
      </Box>

      {/* リトライ確認ダイアログ */}
      <Dialog
        open={retryDialogOpen}
        onClose={() => setRetryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          リトライの確認
        </DialogTitle>
        <DialogContent>
          {selectedRetryOption && (
            <Box>
              <Typography variant="body1" gutterBottom>
                以下の方法でリトライしますか？
              </Typography>
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom>
                  {selectedRetryOption.description}
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    ペナルティ軽減: {selectedRetryOption.penaltyReduction}%
                  </Typography>
                  <Typography variant="body2">
                    コスト倍率: ×{selectedRetryOption.costModifier}
                  </Typography>
                  <Typography variant="body2">
                    残り利用回数: {selectedRetryOption.availableAttempts}
                  </Typography>
                </Stack>
              </Paper>
              <Alert severity="warning" sx={{ mt: 2 }}>
                リトライを選択すると、現在の結果は取り消され、
                新しい条件でもう一度判定を行います。
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetryDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={confirmRetry}
            color="warning"
          >
            リトライ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};