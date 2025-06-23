import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Schedule as TimeIcon,
  PlayArrow as PlayIcon,
  SkipNext as NextIcon,
  AccessTime as ClockIcon,
  Today as DayIcon,
  NightsStay as RestIcon,
  DirectionsRun as ActionIcon,
  Settings as SettingsIcon,
  CheckCircle as CompleteIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { 
  TurnState, 
  GameDay, 
  DayPeriod,
  Character,
  ID, 
} from '@ai-agent-trpg/types';

interface TimeManagementPanelProps {
  /**
   * 現在のキャンペーンID
   */
  campaignId: ID;
  
  /**
   * セッションID
   */
  sessionId?: ID;
  
  /**
   * ターン状態
   */
  turnState?: TurnState;
  
  /**
   * 現在の日
   */
  currentDay?: GameDay;
  
  /**
   * キャラクター一覧
   */
  characters: Character[];
  
  /**
   * キャンペーン終了判定
   */
  isEnded?: boolean;
  
  /**
   * 終了理由
   */
  endReason?: string;
  
  /**
   * アクション実行のコールバック
   */
  onExecuteAction: (characterId: ID, description: string, metadata?: Record<string, any>) => Promise<void>;
  
  /**
   * 時間進行のコールバック
   */
  onAdvanceTime: () => Promise<void>;
  
  /**
   * 休息のコールバック
   */
  onTakeRest: () => Promise<void>;
  
  /**
   * ターン状態更新のコールバック
   */
  onUpdateTurnState: (updates: Partial<TurnState>) => Promise<void>;
  
  /**
   * データ再取得のコールバック
   */
  onRetryDataLoad?: () => Promise<void>;
  
  /**
   * パネルの高さ
   */
  height?: number;
}

/**
 * ターン・時間管理パネル
 */
export const TimeManagementPanel: React.FC<TimeManagementPanelProps> = ({
  // campaignId, // 未使用
  // sessionId, // 未使用  
  turnState,
  currentDay,
  characters,
  isEnded = false,
  endReason,
  onExecuteAction,
  onAdvanceTime,
  onTakeRest,
  // onUpdateTurnState, // 未使用
  onRetryDataLoad,
  height = 600,
}) => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [actionDescription, setActionDescription] = useState('');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 日単位分割の表示名を取得
  const getDayPeriodName = (periodIndex: number): string => {
    if (!turnState?.settings.dayPeriods) return '不明';
    const period = turnState.settings.dayPeriods.find(p => p.order === periodIndex);
    return period?.name || `時間帯 ${periodIndex + 1}`;
  };

  // 現在の日単位分割情報を取得
  const getCurrentDayPeriod = (): DayPeriod | null => {
    if (!turnState?.settings.dayPeriods || !currentDay) return null;
    return turnState.settings.dayPeriods.find(p => p.order === currentDay.currentDayPeriod) || null;
  };

  // アクティブキャラクターを取得
  const getActiveCharacter = (): Character | null => {
    if (!turnState?.activeCharacterId) return null;
    return characters.find(c => c.id === turnState.activeCharacterId) || null;
  };

  // ターン進行の進捗率を計算
  const getTurnProgress = (): number => {
    if (!turnState || !currentDay) return 0;
    const totalPeriods = turnState.settings.dayPeriods.length;
    return Math.round((currentDay.currentDayPeriod / totalPeriods) * 100);
  };

  // 日数進行の進捗率を計算
  const getDayProgress = (): number => {
    if (!turnState) return 0;
    return Math.round((turnState.currentDay / turnState.maxDays) * 100);
  };

  // アクション実行
  const handleExecuteAction = async () => {
    if (!selectedCharacter || !actionDescription.trim()) return;

    setLoading(true);
    try {
      await onExecuteAction(selectedCharacter.id, actionDescription.trim());
      setActionDescription('');
      setActionDialogOpen(false);
      setSelectedCharacter(null);
    } catch (error) {
      console.error('Failed to execute action:', error);
    } finally {
      setLoading(false);
    }
  };

  // ターン順序表示
  const TurnOrderDisplay = () => {
    if (!turnState || turnState.turnOrder.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          ターン順序が設定されていません
        </Alert>
      );
    }

    return (
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          ターン順序
        </Typography>
        <List dense>
          {turnState.turnOrder.map((characterId, index) => {
            const character = characters.find(c => c.id === characterId);
            const isActive = characterId === turnState.activeCharacterId;
            
            return (
              <ListItem 
                key={characterId}
                sx={{ 
                  border: isActive ? 2 : 1,
                  borderColor: isActive ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: isActive ? 'primary.light' : 'background.paper',
                }}
              >
                <ListItemIcon>
                  <Typography variant="body2" fontWeight="bold">
                    {index + 1}
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary={character?.name || `キャラクター ${characterId}`}
                  secondary={isActive ? '現在のターン' : undefined}
                />
                {isActive && <PlayIcon color="primary" />}
              </ListItem>
            );
          })}
        </List>
      </Paper>
    );
  };

  // 日単位分割表示
  const DayPeriodDisplay = () => {
    if (!turnState?.settings.dayPeriods || !currentDay) return null;

    return (
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          時間進行
        </Typography>
        <Stepper activeStep={currentDay.currentDayPeriod} orientation="vertical">
          {turnState.settings.dayPeriods.map((period) => (
            <Step key={period.id}>
              <StepLabel 
                icon={period.isRestPeriod ? <RestIcon /> : <ClockIcon />}
                optional={
                  <Typography variant="caption">
                    {period.description}
                  </Typography>
                }
              >
                {period.name}
              </StepLabel>
              <StepContent>
                <Typography variant="body2">
                  行動可能回数: {period.actionsAllowed}
                  {period.isRestPeriod && ' (休息時間)'}
                </Typography>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    );
  };

  // 日別イベント表示
  const DayEventsDisplay = () => {
    if (!currentDay || currentDay.events.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          まだ今日のイベントはありません
        </Alert>
      );
    }

    return (
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          今日の出来事
        </Typography>
        <List dense>
          {currentDay.events.slice(-5).map((event) => (
            <ListItem key={event.id}>
              <ListItemIcon>
                {event.type === 'action' && <ActionIcon color="primary" />}
                {event.type === 'rest' && <RestIcon color="success" />}
                {event.type === 'event' && <InfoIcon color="info" />}
                {event.type === 'milestone' && <CompleteIcon color="warning" />}
              </ListItemIcon>
              <ListItemText
                primary={event.description}
                secondary={
                  <Box>
                    <Typography variant="caption">
                      {getDayPeriodName(event.dayPeriod)} - {new Date(event.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  };

  const currentDayPeriod = getCurrentDayPeriod();
  const activeCharacter = getActiveCharacter();

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TimeIcon color="primary" />
          <Typography variant="h6">
            時間・ターン管理
          </Typography>
          <Tooltip title="設定">
            <IconButton size="small" onClick={() => setSettingsDialogOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 状況表示 */}
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              {turnState ? (
                <>
                  <Typography variant="h4" color="primary">
                    {turnState.currentDay}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    日目 / {turnState.maxDays}日
                  </Typography>
                </>
              ) : (
                <>
                  <WarningIcon color="error" sx={{ fontSize: 40 }} />
                  <Typography variant="caption" color="error" display="block">
                    データ読み込みエラー
                  </Typography>
                  {onRetryDataLoad && (
                    <Button 
                      size="small" 
                      startIcon={<RefreshIcon />}
                      onClick={onRetryDataLoad}
                      sx={{ mt: 1 }}
                    >
                      再取得
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              {currentDay ? (
                <>
                  <Typography variant="h4" color="info.main">
                    {currentDay.actionsRemaining}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    残り行動回数
                  </Typography>
                </>
              ) : (
                <>
                  <WarningIcon color="error" sx={{ fontSize: 40 }} />
                  <Typography variant="caption" color="error" display="block">
                    データ読み込みエラー
                  </Typography>
                  {onRetryDataLoad && (
                    <Button 
                      size="small" 
                      startIcon={<RefreshIcon />}
                      onClick={onRetryDataLoad}
                      sx={{ mt: 1 }}
                    >
                      再取得
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* 進捗バー */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            今日の進行: {getTurnProgress()}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={getTurnProgress()}
            sx={{ height: 6, borderRadius: 1, mb: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            キャンペーン進行: {getDayProgress()}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={getDayProgress()}
            sx={{ height: 4, borderRadius: 1 }}
          />
        </Box>
      </Box>

      {/* キャンペーン終了警告 */}
      {isEnded && (
        <Alert severity="warning" sx={{ m: 2 }}>
          <Typography variant="subtitle2">キャンペーン終了</Typography>
          {endReason && <Typography variant="body2">{endReason}</Typography>}
        </Alert>
      )}

      {/* メインコンテンツ */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {/* 現在の状況 */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              現在の状況
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {turnState ? (
                <Chip 
                  icon={<DayIcon />}
                  label={`${turnState.currentDay}日目`}
                  color="primary"
                />
              ) : (
                <Chip 
                  icon={<WarningIcon />}
                  label="データ読み込みエラー"
                  color="error"
                />
              )}
              <Chip 
                icon={<ClockIcon />}
                label={currentDayPeriod?.name || '不明'}
                color={currentDayPeriod?.isRestPeriod ? 'success' : 'default'}
              />
              {turnState?.currentPhase && (
                <Chip 
                  label={turnState.currentPhase}
                  variant="outlined"
                />
              )}
            </Box>
            
            {activeCharacter && (
              <Alert severity="info" sx={{ mb: 2 }}>
                現在のターン: {activeCharacter.name}
              </Alert>
            )}

            {currentDayPeriod?.description && (
              <Typography variant="body2" color="text.secondary">
                {currentDayPeriod.description}
              </Typography>
            )}
          </CardContent>
          <CardActions>
            <Button
              startIcon={<ActionIcon />}
              onClick={() => setActionDialogOpen(true)}
              disabled={!currentDay || currentDay.actionsRemaining <= 0 || isEnded}
            >
              アクション実行
            </Button>
            <Button
              startIcon={<NextIcon />}
              onClick={onAdvanceTime}
              disabled={isEnded}
            >
              時間進行
            </Button>
            {currentDayPeriod?.isRestPeriod && (
              <Button
                startIcon={<RestIcon />}
                onClick={onTakeRest}
                color="success"
                disabled={isEnded}
              >
                休息
              </Button>
            )}
          </CardActions>
        </Card>

        {/* ターン順序 */}
        <TurnOrderDisplay />

        {/* 日単位分割 */}
        <DayPeriodDisplay />

        {/* 今日の出来事 */}
        <DayEventsDisplay />
      </Box>

      {/* アクション実行ダイアログ */}
      <Dialog 
        open={actionDialogOpen} 
        onClose={() => setActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>アクション実行</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>キャラクター</InputLabel>
            <Select
              value={selectedCharacter?.id || ''}
              label="キャラクター"
              onChange={(e) => {
                const character = characters.find(c => c.id === e.target.value);
                setSelectedCharacter(character || null);
              }}
            >
              {characters.map((character) => (
                <MenuItem key={character.id} value={character.id}>
                  {character.name} ({character.characterType})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="アクションの説明"
            value={actionDescription}
            onChange={(e) => setActionDescription(e.target.value)}
            placeholder="実行するアクションの詳細を入力してください..."
          />

          {currentDay && (
            <Alert severity="info" sx={{ mt: 2 }}>
              残り行動回数: {currentDay.actionsRemaining}回
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={handleExecuteAction}
            variant="contained"
            disabled={!selectedCharacter || !actionDescription.trim() || loading}
          >
            実行
          </Button>
        </DialogActions>
      </Dialog>

      {/* 設定ダイアログ */}
      <Dialog 
        open={settingsDialogOpen} 
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>時間管理設定</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            時間管理の設定はセッション開始時に決定されます。
            変更が必要な場合はゲームマスターにご相談ください。
          </Typography>
          
          {turnState?.settings && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                現在の設定
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="1日の最大行動回数"
                    secondary={`${turnState.settings.maxActionsPerDay}回`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="キャンペーン最大日数"
                    secondary={`${turnState.settings.maxDays}日`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="自動日進行"
                    secondary={turnState.settings.autoProgressDay ? '有効' : '無効'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="休息必須"
                    secondary={turnState.settings.restRequired ? '有効' : '無効'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="同時ターン"
                    secondary={turnState.settings.simultaneousTurns ? '有効' : '無効'}
                  />
                </ListItem>
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};