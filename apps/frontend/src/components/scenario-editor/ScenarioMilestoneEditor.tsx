import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as NotStartedIcon,
  Schedule as InProgressIcon,
  EmojiEvents as RewardIcon,
  Flag as MilestoneIcon,
  Analytics as StatsIcon,
  AutoAwesome as AIIcon,
  Edit as EditIcon,
  Visibility as PreviewIcon,
  Refresh as RegenerateIcon,
  Groups as NPCIcon,
  SportsEsports as EnemyIcon,
  EventNote as EventIcon,
  Inventory as ItemIcon,
  Assignment as QuestIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useRecoilValue } from 'recoil';
import { 
  AIMilestone, 
  EntityPool,
  EntityPoolCollection,
  MilestoneType,
  ID,
  SessionDurationConfig,
  MilestoneGenerationRequest,
} from '@ai-agent-trpg/types';
import { appModeAtom } from '../../store/atoms';
import { aiMilestoneGenerationAPI } from '../../api';

interface ScenarioMilestoneEditorProps {
  /**
   * 現在のキャンペーンID
   */
  campaignId: ID;
  
  /**
   * 現在のセッションID
   */
  sessionId: ID;
  
  /**
   * テーマID
   */
  themeId: ID;
  
  /**
   * セッション期間設定
   */
  sessionDuration: SessionDurationConfig;
  
  /**
   * 既存のマイルストーン一覧
   */
  milestones?: AIMilestone[];
  
  /**
   * 既存のエンティティプール
   */
  entityPool?: EntityPool;
  
  /**
   * パネルの高さ
   */
  height?: number;
  
  /**
   * マイルストーン更新のコールバック
   */
  onMilestonesUpdate?: (milestones: AIMilestone[]) => void;
  
  /**
   * エンティティプール更新のコールバック
   */
  onEntityPoolUpdate?: (entityPool: EntityPool) => void;
  
  /**
   * エンティティ詳細画面への遷移コールバック
   */
  onNavigateToEntity?: (entityType: string, category: 'core' | 'bonus') => void;
}

/**
 * シナリオ作成モード専用マイルストーン管理エディタ
 * プレイヤーには見えない、GM専用の機能
 */
export const ScenarioMilestoneEditor: React.FC<ScenarioMilestoneEditorProps> = ({
  campaignId,
  sessionId,
  themeId,
  sessionDuration,
  milestones = [],
  entityPool,
  height = 600,
  onMilestonesUpdate,
  onEntityPoolUpdate,
  onNavigateToEntity,
}) => {
  const appMode = useRecoilValue(appModeAtom);
  const [expandedSection, setExpandedSection] = useState<string>('generation');
  const [selectedMilestone, setSelectedMilestone] = useState<AIMilestone | null>(null);
  const [showMilestoneDetail, setShowMilestoneDetail] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [milestoneCount, setMilestoneCount] = useState(3);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState<AIMilestone | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 開発者モードでない場合は何も表示しない（プレイヤーには見せない）
  if (appMode !== 'developer') {
    return null;
  }

  // マイルストーンタイプのアイコンを取得
  const getMilestoneTypeIcon = (type: MilestoneType) => {
    switch (type) {
      case 'enemy_defeat': return <EnemyIcon color="error" />;
      case 'event_clear': return <EventIcon color="primary" />;
      case 'npc_communication': return <NPCIcon color="success" />;
      case 'item_acquisition': return <ItemIcon color="warning" />;
      case 'quest_completion': return <QuestIcon color="info" />;
      default: return <MilestoneIcon color="disabled" />;
    }
  };

  // マイルストーンタイプの表示名を取得
  const getMilestoneTypeLabel = (type: MilestoneType) => {
    const labels = {
      enemy_defeat: '敵討伐',
      event_clear: 'イベントクリア',
      npc_communication: 'NPC対話',
      item_acquisition: 'アイテム取得',
      quest_completion: 'クエスト完了',
    };
    return labels[type] || type;
  };

  // ステータスアイコンを取得
  const getStatusIcon = (status: AIMilestone['status']) => {
    switch (status) {
      case 'completed': return <CompleteIcon color="success" />;
      case 'in_progress': return <InProgressIcon color="primary" />;
      case 'pending': return <NotStartedIcon color="disabled" />;
      default: return <NotStartedIcon color="disabled" />;
    }
  };

  // AIマイルストーン生成
  const generateMilestones = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep('準備中...');
    setGenerationProgress(10);
    
    try {
      const request: MilestoneGenerationRequest = {
        campaignId,
        sessionId,
        themeId,
        sessionDuration,
        milestoneCount,
        existingContent: {
          characters: [], // TODO: Get characters from campaign
          locations: [], // TODO: Get locations from campaign
          quests: [], // TODO: Get quests from campaign
        },
      };

      // 進捗表示の更新
      setGenerationStep('テーマ適応を生成中...');
      setGenerationProgress(25);
      
      // 少し待ってから次のステップ
      await new Promise(resolve => setTimeout(resolve, 500));
      setGenerationStep('エンティティプールを生成中...');
      setGenerationProgress(50);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setGenerationStep('マイルストーンを生成中...');
      setGenerationProgress(75);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setGenerationStep('データベースに保存中...');
      setGenerationProgress(90);

      const response = await aiMilestoneGenerationAPI.generateMilestonesAndPools(request);
      
      setGenerationStep('完了！');
      setGenerationProgress(100);
      
      if (onMilestonesUpdate && response.milestones) {
        onMilestonesUpdate(response.milestones);
      }
      
      if (onEntityPoolUpdate && response.entityPool) {
        onEntityPoolUpdate(response.entityPool);
      }
      
    } catch (error) {
      console.error('マイルストーン生成エラー:', error);
      setGenerationError(error instanceof Error ? error.message : 'マイルストーン生成に失敗しました');
    } finally {
      // 完了後に少し待ってからリセット
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationStep('');
        setGenerationProgress(0);
      }, 1000);
    }
  };

  // マイルストーン詳細を表示
  const showMilestoneDetails = (milestone: AIMilestone) => {
    setSelectedMilestone(milestone);
    setShowMilestoneDetail(true);
  };

  // マイルストーン削除確認ダイアログを開く
  const openDeleteConfirm = (milestone: AIMilestone) => {
    setMilestoneToDelete(milestone);
    setDeleteConfirmOpen(true);
  };

  // マイルストーン削除を実行
  const handleDeleteMilestone = async () => {
    if (!milestoneToDelete) return;

    setIsDeleting(true);
    try {
      await aiMilestoneGenerationAPI.deleteAIMilestone(milestoneToDelete.id);
      
      // 成功したら一覧から削除されたマイルストーンを除外
      const updatedMilestones = milestones.filter(m => m.id !== milestoneToDelete.id);
      if (onMilestonesUpdate) {
        onMilestonesUpdate(updatedMilestones);
      }
      
      // ダイアログを閉じる
      setDeleteConfirmOpen(false);
      setMilestoneToDelete(null);
    } catch (error) {
      console.error('マイルストーン削除エラー:', error);
      // エラーハンドリング（必要に応じてスナックバー等で通知）
    } finally {
      setIsDeleting(false);
    }
  };

  // 削除確認ダイアログを閉じる
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setMilestoneToDelete(null);
  };

  // AI生成セクション
  const GenerationSection = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon color="primary" />
        AI マイルストーン生成
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        この機能はシナリオ作成専用です。プレイヤーには表示されません。
      </Alert>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="マイルストーン数"
            value={milestoneCount}
            onChange={(e) => setMilestoneCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 3)))}
            inputProps={{ min: 1, max: 5 }}
            helperText="1〜5個まで指定可能"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>セッション期間</InputLabel>
            <Select
              value={sessionDuration.type || 'medium'}
              label="セッション期間"
              disabled
            >
              <MenuItem value="short">短期（1-3日）</MenuItem>
              <MenuItem value="medium">中期（4-7日）</MenuItem>
              <MenuItem value="long">長期（8-14日）</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          startIcon={isGenerating ? <CircularProgress size={16} /> : <AIIcon />}
          onClick={generateMilestones}
          disabled={isGenerating}
          color="primary"
        >
          {isGenerating ? '生成中...' : 'マイルストーン & エンティティプール生成'}
        </Button>
        
        {milestones.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<RegenerateIcon />}
            onClick={generateMilestones}
            disabled={isGenerating}
          >
            再生成
          </Button>
        )}
      </Box>

      {/* 詳細進捗表示 */}
      {isGenerating && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="primary">
              {generationStep}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={generationProgress}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {generationProgress}% 完了
          </Typography>
        </Box>
      )}

      {generationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {generationError}
        </Alert>
      )}
    </Box>
  );

  // マイルストーン一覧セクション
  const MilestonesSection = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MilestoneIcon color="primary" />
        マイルストーン一覧 ({milestones.length})
      </Typography>
      
      {milestones.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            まだマイルストーンが生成されていません。
          </Typography>
          <Typography variant="caption" color="text.secondary">
            上記の「AI マイルストーン生成」を使用してマイルストーンを作成してください。
          </Typography>
        </Paper>
      ) : (
        <List>
          {milestones.map((milestone) => (
            <ListItem
              key={milestone.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                bgcolor: 'background.paper',
              }}
            >
              <ListItemIcon>
                {getMilestoneTypeIcon(milestone.type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">{milestone.title}</Typography>
                    <Chip 
                      size="small" 
                      label={getMilestoneTypeLabel(milestone.type)}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      icon={getStatusIcon(milestone.status)}
                      label={milestone.status === 'pending' ? '待機中' : milestone.status === 'in_progress' ? '進行中' : '完了'}
                      color={milestone.status === 'completed' ? 'success' : milestone.status === 'in_progress' ? 'primary' : 'default'}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {milestone.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Typography variant="caption">進捗:</Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={milestone.progress}
                        sx={{ flexGrow: 1, mr: 1 }}
                      />
                      <Typography variant="caption">{milestone.progress}%</Typography>
                    </Box>
                  </Box>
                }
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Tooltip title="詳細表示">
                  <IconButton 
                    size="small" 
                    onClick={() => showMilestoneDetails(milestone)}
                  >
                    <PreviewIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="削除">
                  <IconButton 
                    size="small" 
                    onClick={() => openDeleteConfirm(milestone)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  // エンティティプール概要セクション
  const EntityPoolSection = () => {
    const getEntityCounts = () => {
      if (!entityPool) return null;
      
      const entityCollection = entityPool.entities as EntityPoolCollection;
      if (entityCollection.coreEntities && entityCollection.bonusEntities) {
        // 新構造
        return {
          enemies: entityCollection.coreEntities.enemies?.length || 0,
          events: entityCollection.coreEntities.events?.length || 0,
          npcs: entityCollection.coreEntities.npcs?.length || 0,
          items: entityCollection.coreEntities.items?.length || 0,
          quests: entityCollection.coreEntities.quests?.length || 0,
          practicalRewards: entityCollection.bonusEntities.practicalRewards?.length || 0,
          trophyItems: entityCollection.bonusEntities.trophyItems?.length || 0,
          mysteryItems: entityCollection.bonusEntities.mysteryItems?.length || 0,
        };
      } else {
        // 旧構造との互換性
        const legacyEntities = entityPool.entities as any;
        return {
          enemies: legacyEntities.enemies?.length || 0,
          events: legacyEntities.events?.length || 0,
          npcs: legacyEntities.npcs?.length || 0,
          items: legacyEntities.items?.length || 0,
          quests: legacyEntities.quests?.length || 0,
          practicalRewards: 0,
          trophyItems: 0,
          mysteryItems: 0,
        };
      }
    };
    
    const counts = getEntityCounts();
    const entityCollection = entityPool?.entities as EntityPoolCollection;
    const hasNewStructure = !!(entityCollection?.coreEntities && entityCollection?.bonusEntities);

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StatsIcon color="primary" />
          エンティティプール概要
        </Typography>
        
        {!entityPool ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              エンティティプールがまだ生成されていません。
            </Typography>
          </Paper>
        ) : (
          <Box>
            {/* コアエンティティ */}
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              {hasNewStructure && <Chip label="コア" size="small" color="primary" />}
              基本エンティティ
            </Typography>
            <Grid container spacing={2} sx={{ mb: hasNewStructure ? 3 : 0 }}>
              <Grid item xs={6} sm={2.4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => {
                    if (onNavigateToEntity) {
                      onNavigateToEntity('enemies', 'core');
                    }
                  }}
                >
                  <EnemyIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">{counts?.enemies || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">敵</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => {
                    if (onNavigateToEntity) {
                      onNavigateToEntity('events', 'core');
                    }
                  }}
                >
                  <EventIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">{counts?.events || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">イベント</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => {
                    if (onNavigateToEntity) {
                      onNavigateToEntity('npcs', 'core');
                    }
                  }}
                >
                  <NPCIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">{counts?.npcs || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">NPC</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => {
                    if (onNavigateToEntity) {
                      onNavigateToEntity('items', 'core');
                    }
                  }}
                >
                  <ItemIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">{counts?.items || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">アイテム</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => {
                    if (onNavigateToEntity) {
                      onNavigateToEntity('quests', 'core');
                    }
                  }}
                >
                  <QuestIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">{counts?.quests || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">クエスト</Typography>
                </Card>
              </Grid>
            </Grid>
            
            {/* ボーナスエンティティ（新構造のみ） */}
            {hasNewStructure && (
              <>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="ボーナス" size="small" color="secondary" />
                  報酬エンティティ
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => {
                        if (onNavigateToEntity) {
                          onNavigateToEntity('practicalRewards', 'bonus');
                        }
                      }}
                    >
                      <ItemIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6">{counts?.practicalRewards || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">実用報酬</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => {
                        if (onNavigateToEntity) {
                          onNavigateToEntity('trophyItems', 'bonus');
                        }
                      }}
                    >
                      <ItemIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6">{counts?.trophyItems || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">トロフィー</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => {
                        if (onNavigateToEntity) {
                          onNavigateToEntity('mysteryItems', 'bonus');
                        }
                      }}
                    >
                      <ItemIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6">{counts?.mysteryItems || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">謎アイテム</Typography>
                    </Card>
                  </Grid>
                </Grid>
              </>
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ height, overflow: 'auto' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon color="primary" />
          シナリオ マイルストーン エディタ
          <Chip label="GM専用" color="warning" size="small" />
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          このツールはシナリオ作成専用です。プレイヤーには一切表示されません。
        </Typography>

        {/* AI生成セクション */}
        <Accordion 
          expanded={expandedSection === 'generation'} 
          onChange={() => setExpandedSection(expandedSection === 'generation' ? '' : 'generation')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AIIcon color="primary" />
              <Typography variant="h6">AI マイルストーン生成</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <GenerationSection />
          </AccordionDetails>
        </Accordion>

        {/* マイルストーン一覧セクション */}
        <Accordion 
          expanded={expandedSection === 'milestones'} 
          onChange={() => setExpandedSection(expandedSection === 'milestones' ? '' : 'milestones')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MilestoneIcon color="primary" />
              <Typography variant="h6">マイルストーン一覧</Typography>
              {milestones.length > 0 && (
                <Chip label={milestones.length} size="small" color="primary" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <MilestonesSection />
          </AccordionDetails>
        </Accordion>

        {/* エンティティプール概要セクション */}
        <Accordion 
          expanded={expandedSection === 'entitypool'} 
          onChange={() => setExpandedSection(expandedSection === 'entitypool' ? '' : 'entitypool')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatsIcon color="primary" />
              <Typography variant="h6">エンティティプール</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <EntityPoolSection />
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* マイルストーン詳細ダイアログ */}
      <Dialog 
        open={showMilestoneDetail} 
        onClose={() => setShowMilestoneDetail(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedMilestone && getMilestoneTypeIcon(selectedMilestone.type)}
          マイルストーン詳細
        </DialogTitle>
        <DialogContent>
          {selectedMilestone && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedMilestone.title}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Chip 
                    label={getMilestoneTypeLabel(selectedMilestone.type)}
                    color="primary"
                    sx={{ mr: 1 }}
                  />
                  <Chip 
                    icon={getStatusIcon(selectedMilestone.status)}
                    label={selectedMilestone.status}
                    color={selectedMilestone.status === 'completed' ? 'success' : selectedMilestone.status === 'in_progress' ? 'primary' : 'default'}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">進捗:</Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={selectedMilestone.progress}
                      sx={{ flexGrow: 1 }}
                    />
                    <Typography variant="body2">{selectedMilestone.progress}%</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="body1" paragraph>
                {selectedMilestone.description}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                報酬情報
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <RewardIcon color="warning" />
                <Typography>経験値: {selectedMilestone.reward.experiencePoints} EXP</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {selectedMilestone.reward.storyProgression}
              </Typography>

              {selectedMilestone.targetDetails && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    ターゲット詳細
                  </Typography>
                  <Typography variant="body2">
                    エンティティタイプ: {selectedMilestone.targetDetails[0]?.entityType || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    エンティティID: {selectedMilestone.targetDetails[0]?.entityId || 'N/A'}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMilestoneDetail(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" />
          マイルストーン削除確認
        </DialogTitle>
        <DialogContent>
          {milestoneToDelete && (
            <Box>
              <Typography variant="body1" gutterBottom>
                以下のマイルストーンを削除しますか？
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mt: 2 }}>
                <Typography variant="h6" color="error">
                  {milestoneToDelete.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {milestoneToDelete.description}
                </Typography>
              </Box>
              <Alert severity="warning" sx={{ mt: 2 }}>
                この操作は取り消せません。削除されたマイルストーンは復元できません。
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDelete}
            disabled={isDeleting}
          >
            キャンセル
          </Button>
          <Button 
            onClick={handleDeleteMilestone}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {isDeleting ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScenarioMilestoneEditor;