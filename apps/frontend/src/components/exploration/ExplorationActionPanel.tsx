// ==========================================
// 探索アクションパネル
// ==========================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Badge,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Psychology as PsychologyIcon,
  Security as SecurityIcon,
  DirectionsRun as DirectionsRunIcon,
  TouchApp as TouchAppIcon,
  Chat as ChatIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayArrowIcon,
  HourglassEmpty as HourglassEmptyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  EntityExplorationAction,
  ExplorationActionExecution,
  ExplorationActionType,
  ExplorationState,
  StartExplorationActionRequest,
  ProvideUserInputRequest,
  ID
} from '@repo/types';
import {
  getLocationEntities,
  startExplorationAction,
  provideUserInput,
  getActiveExplorations,
  generateTestEntity
} from '../../api/explorationActions';

interface ExplorationActionPanelProps {
  sessionId: ID;
  currentLocationId: ID;
  currentCharacterId: ID;
  currentCharacterName: string;
  onChatMessage?: (message: {
    characterName: string;
    content: string;
    messageType: string;
  }) => void;
  disabled?: boolean;
}

export const ExplorationActionPanel: React.FC<ExplorationActionPanelProps> = ({
  sessionId,
  currentLocationId,
  currentCharacterId,
  currentCharacterName,
  onChatMessage,
  disabled = false
}) => {
  const [entities, setEntities] = useState<EntityExplorationAction[]>([]);
  const [activeExplorations, setActiveExplorations] = useState<ExplorationActionExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  
  // ユーザー入力ダイアログ
  const [inputDialog, setInputDialog] = useState<{
    open: boolean;
    execution?: ExplorationActionExecution;
    userInput: string;
  }>({
    open: false,
    userInput: ''
  });

  // テストエンティティ生成ダイアログ
  const [generateDialog, setGenerateDialog] = useState<{
    open: boolean;
    entityName: string;
    entityType: 'object' | 'npc' | 'location_feature' | 'hazard' | 'treasure';
  }>({
    open: false,
    entityName: '',
    entityType: 'object'
  });

  // ==========================================
  // データ取得
  // ==========================================

  const fetchEntities = useCallback(async () => {
    if (!sessionId || !currentLocationId) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await getLocationEntities({
        sessionId,
        locationId: currentLocationId,
        includeDiscovered: true,
        includeHidden: false
      });

      if (response.success) {
        setEntities(response.entities);
      } else {
        setError(response.error || 'エンティティの取得に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [sessionId, currentLocationId]);

  const fetchActiveExplorations = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await getActiveExplorations(sessionId);
      if (response.success) {
        setActiveExplorations(response.activeExplorations);
        
        // ユーザー入力待ちのアクションがあるかチェック
        const waitingForInput = response.activeExplorations.find(
          exploration => exploration.state === 'waiting_input' && 
          exploration.characterId === currentCharacterId
        );

        if (waitingForInput && !inputDialog.open) {
          setInputDialog({
            open: true,
            execution: waitingForInput,
            userInput: ''
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch active explorations:', err);
    }
  }, [sessionId, currentCharacterId, inputDialog.open]);

  // 初期読み込み
  useEffect(() => {
    fetchEntities();
    fetchActiveExplorations();
  }, [fetchEntities, fetchActiveExplorations]);

  // 定期更新
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActiveExplorations();
    }, 5000); // 5秒間隔

    return () => clearInterval(interval);
  }, [fetchActiveExplorations]);

  // ==========================================
  // アクション実行
  // ==========================================

  const handleStartAction = async (
    entity: EntityExplorationAction,
    actionType: ExplorationActionType
  ) => {
    if (disabled) return;

    setError(null);

    try {
      const request: StartExplorationActionRequest = {
        sessionId,
        characterId: currentCharacterId,
        targetEntityId: entity.entityId,
        actionType
      };

      const response = await startExplorationAction(request);

      if (response.success && response.aiInitialMessage) {
        // AI初期メッセージをチャットに表示
        if (onChatMessage) {
          onChatMessage({
            characterName: response.aiInitialMessage.characterName,
            content: response.aiInitialMessage.content,
            messageType: 'ai_initial'
          });
        }

        // アクティブな探索を更新
        await fetchActiveExplorations();
      } else {
        setError(response.error || '探索アクションの開始に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  const handleProvideInput = async () => {
    if (!inputDialog.execution || !inputDialog.userInput.trim()) return;

    try {
      const request: ProvideUserInputRequest = {
        executionId: inputDialog.execution.id,
        characterId: currentCharacterId,
        userApproach: inputDialog.userInput.trim()
      };

      const response = await provideUserInput(request);

      if (response.success) {
        // ダイアログを閉じる
        setInputDialog({
          open: false,
          userInput: ''
        });

        // ユーザー入力をチャットに表示
        if (onChatMessage) {
          onChatMessage({
            characterName: currentCharacterName,
            content: inputDialog.userInput.trim(),
            messageType: 'user_input'
          });
        }

        // アクティブな探索を更新
        await fetchActiveExplorations();
      } else {
        setError(response.error || 'ユーザー入力の処理に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  // ==========================================
  // テストエンティティ生成
  // ==========================================

  const handleGenerateTestEntity = async () => {
    if (!generateDialog.entityName.trim()) return;

    try {
      const response = await generateTestEntity(
        sessionId,
        currentLocationId,
        generateDialog.entityName.trim(),
        generateDialog.entityType
      );

      if (response.success) {
        setGenerateDialog({
          open: false,
          entityName: '',
          entityType: 'object'
        });

        // エンティティ一覧を更新
        await fetchEntities();
      } else {
        setError(response.error || 'エンティティの生成に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  // ==========================================
  // ヘルパー関数
  // ==========================================

  const getActionIcon = (actionType: ExplorationActionType) => {
    switch (actionType) {
      case 'investigate': return <SearchIcon />;
      case 'interact': return <TouchAppIcon />;
      case 'attack': return <SecurityIcon />;
      case 'avoid': return <DirectionsRunIcon />;
      case 'search': return <SearchIcon />;
      case 'observe': return <VisibilityIcon />;
      case 'use_skill': return <PsychologyIcon />;
      case 'negotiate': return <ChatIcon />;
      case 'stealth': return <SecurityIcon />;
      default: return <PlayArrowIcon />;
    }
  };

  const getStateIcon = (state: ExplorationState) => {
    switch (state) {
      case 'idle': return <HourglassEmptyIcon color="disabled" />;
      case 'selecting': return <PlayArrowIcon color="primary" />;
      case 'processing': return <CircularProgress size={16} />;
      case 'waiting_input': return <HourglassEmptyIcon color="warning" />;
      case 'rolling': return <CircularProgress size={16} />;
      case 'completed': return <CheckCircleIcon color="success" />;
      default: return <ErrorIcon color="error" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'safe': return 'success';
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'dangerous': return 'error';
      default: return 'default';
    }
  };

  // ==========================================
  // レンダリング
  // ==========================================

  return (
    <Card data-testid="exploration-action-panel">
      <CardContent>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            <SearchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            探索アクション
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              size="small"
              onClick={fetchEntities}
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
            
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setGenerateDialog({ ...generateDialog, open: true })}
              variant="outlined"
              data-testid="generate-entity-button"
            >
              テストエンティティ
            </Button>
          </Box>
        </Box>

        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ローディング */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {/* アクティブな探索表示 */}
        {activeExplorations.length > 0 && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              アクティブな探索 ({activeExplorations.length})
            </Typography>
            
            <Stack spacing={1}>
              {activeExplorations.map((exploration) => (
                <Box key={exploration.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStateIcon(exploration.state)}
                  <Typography variant="body2">
                    {exploration.targetEntityName} - {exploration.actionType}
                  </Typography>
                  <Chip
                    label={exploration.state}
                    size="small"
                    color={exploration.state === 'completed' ? 'success' : 'primary'}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {/* エンティティ一覧 */}
        <List dense>
          {entities.map((entity) => (
            <React.Fragment key={entity.id}>
              <ListItem
                secondaryAction={
                  <Badge
                    badgeContent={entity.timesInteracted}
                    color="primary"
                    invisible={entity.timesInteracted === 0}
                  >
                    <IconButton
                      edge="end"
                      onClick={() => setExpandedEntity(
                        expandedEntity === entity.id ? null : entity.id
                      )}
                    >
                      {expandedEntity === entity.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Badge>
                }
              >
                <ListItemIcon>
                  {entity.entityType === 'object' && <SearchIcon />}
                  {entity.entityType === 'npc' && <ChatIcon />}
                  {entity.entityType === 'location_feature' && <VisibilityIcon />}
                  {entity.entityType === 'hazard' && <SecurityIcon />}
                  {entity.entityType === 'treasure' && <SearchIcon color="primary" />}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2">
                        {entity.entityName}
                      </Typography>
                      {entity.isInteracted && (
                        <Chip label="相互作用済み" size="small" color="info" />
                      )}
                      {!entity.isDiscovered && (
                        <Chip label="未発見" size="small" color="warning" />
                      )}
                    </Stack>
                  }
                  secondary={`${entity.entityType} - ${entity.availableActions.length}つのアクション`}
                />
              </ListItem>

              {/* アクション詳細 */}
              <Collapse in={expandedEntity === entity.id}>
                <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    利用可能なアクション:
                  </Typography>
                  
                  <Stack spacing={1}>
                    {entity.availableActions.map((action, index) => (
                      <Paper key={index} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography variant="subtitle2">
                              {getActionIcon(action.actionType)}
                              <Box component="span" sx={{ ml: 1 }}>
                                {action.actionName}
                              </Box>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {action.description}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip
                              label={action.difficulty}
                              size="small"
                              color={action.difficulty === 'easy' ? 'success' : 
                                     action.difficulty === 'hard' ? 'warning' : 'default'}
                            />
                            <Chip
                              label={action.riskLevel}
                              size="small"
                              color={getRiskColor(action.riskLevel) as any}
                            />
                          </Box>
                        </Box>
                        
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={getActionIcon(action.actionType)}
                          onClick={() => handleStartAction(entity, action.actionType)}
                          disabled={disabled || loading}
                          data-testid={`action-${action.actionType}-${entity.id}`}
                        >
                          {action.actionName}
                        </Button>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              </Collapse>
              
              <Divider />
            </React.Fragment>
          ))}
        </List>

        {/* エンティティが見つからない場合 */}
        {!loading && entities.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              この場所で発見されたエンティティはありません
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setGenerateDialog({ ...generateDialog, open: true })}
              sx={{ mt: 1 }}
            >
              テストエンティティを生成
            </Button>
          </Box>
        )}
      </CardContent>

      {/* ユーザー入力ダイアログ */}
      <Dialog
        open={inputDialog.open}
        onClose={() => setInputDialog({ ...inputDialog, open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {inputDialog.execution && (
            <>
              {inputDialog.execution.targetEntityName}への対応方針
            </>
          )}
        </DialogTitle>
        
        <DialogContent>
          {inputDialog.execution && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                アクション: {inputDialog.execution.actionType}
              </Typography>
              <Typography variant="body2" gutterBottom>
                {inputDialog.execution.aiInitialDescription}
              </Typography>
            </Box>
          )}
          
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            label="どのようにアプローチしますか？"
            value={inputDialog.userInput}
            onChange={(e) => setInputDialog({ ...inputDialog, userInput: e.target.value })}
            placeholder="具体的な方法や注意点を入力してください..."
            data-testid="user-input-field"
          />
        </DialogContent>
        
        <DialogActions>
          <Button
            onClick={() => setInputDialog({ ...inputDialog, open: false })}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleProvideInput}
            variant="contained"
            disabled={!inputDialog.userInput.trim()}
            data-testid="submit-user-input"
          >
            実行
          </Button>
        </DialogActions>
      </Dialog>

      {/* テストエンティティ生成ダイアログ */}
      <Dialog
        open={generateDialog.open}
        onClose={() => setGenerateDialog({ ...generateDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>テストエンティティ生成</DialogTitle>
        
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="エンティティ名"
              value={generateDialog.entityName}
              onChange={(e) => setGenerateDialog({ ...generateDialog, entityName: e.target.value })}
              placeholder="古い木箱、怪しい商人、など..."
            />
            
            <FormControl fullWidth>
              <InputLabel>エンティティタイプ</InputLabel>
              <Select
                value={generateDialog.entityType}
                onChange={(e) => setGenerateDialog({ 
                  ...generateDialog, 
                  entityType: e.target.value as any 
                })}
                label="エンティティタイプ"
              >
                <MenuItem value="object">物体</MenuItem>
                <MenuItem value="npc">NPC</MenuItem>
                <MenuItem value="location_feature">地形的特徴</MenuItem>
                <MenuItem value="hazard">危険要素</MenuItem>
                <MenuItem value="treasure">宝物</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button
            onClick={() => setGenerateDialog({ ...generateDialog, open: false })}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleGenerateTestEntity}
            variant="contained"
            disabled={!generateDialog.entityName.trim()}
          >
            生成
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};