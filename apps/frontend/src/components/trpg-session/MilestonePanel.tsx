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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as NotStartedIcon,
  Schedule as InProgressIcon,
  Error as FailedIcon,
  EmojiEvents as RewardIcon,
  Flag as MilestoneIcon,
  Timeline as TimelineIcon,
  School as LevelUpIcon,
  Analytics as StatsIcon,
  Star as ImportanceIcon,
} from '@mui/icons-material';
import { 
  Milestone, 
  ProgressTracker, 
  LevelUpEvent, 
  CampaignCompletion,
  ID, 
} from '@ai-agent-trpg/types';

interface MilestonePanelProps {
  /**
   * 現在のキャンペーンID
   */
  campaignId: ID;
  
  /**
   * マイルストーン一覧
   */
  milestones: Milestone[];
  
  /**
   * 進捗トラッカー
   */
  progressTracker: ProgressTracker;
  
  /**
   * キャンペーン完了状況
   */
  campaignCompletion: CampaignCompletion;
  
  /**
   * 最近のレベルアップイベント
   */
  recentLevelUps: LevelUpEvent[];
  
  /**
   * マイルストーン更新のコールバック
   */
  onMilestoneUpdate: (milestoneId: ID, updates: Partial<Milestone>) => void;
  
  /**
   * 新しいマイルストーン作成のコールバック
   */
  onCreateMilestone: (milestoneData: Partial<Milestone>) => void;
  
  /**
   * パネルの高さ
   */
  height?: number;
}

/**
 * マイルストーン・進捗管理パネル
 */
export const MilestonePanel: React.FC<MilestonePanelProps> = ({
  // campaignId, // 未使用
  milestones,
  progressTracker,
  // campaignCompletion, // 未使用
  recentLevelUps,
  onMilestoneUpdate,
  // onCreateMilestone, // 未使用
  height = 600,
}) => {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [showMilestoneDetail, setShowMilestoneDetail] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('overview');

  // マイルストーンをカテゴリ別に分類
  const categorizedMilestones = milestones.reduce((acc, milestone) => {
    if (!acc[milestone.category]) {
      acc[milestone.category] = [];
    }
    acc[milestone.category].push(milestone);
    return acc;
  }, {} as Record<string, Milestone[]>);

  // ステータスアイコンを取得
  const getStatusIcon = (status: Milestone['status']) => {
    switch (status) {
    case 'completed': return <CompleteIcon color="success" />;
    case 'in_progress': return <InProgressIcon color="primary" />;
    case 'not_started': return <NotStartedIcon color="disabled" />;
    case 'failed': return <FailedIcon color="error" />;
    case 'skipped': return <NotStartedIcon color="warning" />;
    default: return <NotStartedIcon color="disabled" />;
    }
  };

  // 重要度の色を取得
  const getImportanceColor = (importance: Milestone['importance']) => {
    switch (importance) {
    case 'critical': return 'error';
    case 'major': return 'warning';
    case 'minor': return 'info';
    default: return 'default';
    }
  };

  // カテゴリの表示名を取得
  const getCategoryDisplayName = (category: Milestone['category']) => {
    const names = {
      story: 'ストーリー',
      character: 'キャラクター',
      exploration: '探索',
      combat: '戦闘',
      social: '社交',
      custom: 'カスタム',
    };
    return names[category] || category;
  };

  // マイルストーン詳細を表示
  const showMilestoneDetails = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setShowMilestoneDetail(true);
  };

  // マイルストーン完了
  const completeMilestone = (milestoneId: ID) => {
    onMilestoneUpdate(milestoneId, { 
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
    });
  };

  // 進捗更新
  // const updateProgress = (milestoneId: ID, progress: number) => {
  //   const status = progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';
  //   onMilestoneUpdate(milestoneId, { 
  //     progress, 
  //     status,
  //     ...(progress >= 100 ? { completedAt: new Date().toISOString() } : {})
  //   });
  // }; // 未使用

  // 概要セクション
  const OverviewSection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        キャンペーン進捗概要
      </Typography>
      
      {/* 全体進捗 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">全体完了率</Typography>
          <Typography variant="subtitle2">
            {progressTracker.overallProgress.estimatedCompletion}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progressTracker.overallProgress.estimatedCompletion}
          sx={{ height: 8, borderRadius: 1, mb: 2 }}
        />
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {progressTracker.overallProgress.completedMilestones}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                完了マイルストーン
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {progressTracker.overallProgress.experienceGained}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                獲得経験値
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* カテゴリ別進捗 */}
      <Typography variant="subtitle1" gutterBottom>
        カテゴリ別進捗
      </Typography>
      <Grid container spacing={1}>
        {Object.entries(progressTracker.categoryProgress).map(([category, progress]) => (
          <Grid item xs={6} key={category}>
            <Card variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {getCategoryDisplayName(category as Milestone['category'])}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={progress.progress}
                  sx={{ flexGrow: 1, height: 4 }}
                />
                <Typography variant="caption">
                  {progress.completed}/{progress.total}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // マイルストーン一覧セクション
  const MilestonesSection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        マイルストーン一覧
      </Typography>
      
      {Object.entries(categorizedMilestones).map(([category, categoryMilestones]) => (
        <Accordion key={category} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography variant="subtitle1">
                {getCategoryDisplayName(category as Milestone['category'])}
              </Typography>
              <Chip 
                label={categoryMilestones.length} 
                size="small" 
                color="primary" 
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {categoryMilestones.map((milestone) => (
                <ListItem 
                  key={milestone.id}
                  button
                  onClick={() => showMilestoneDetails(milestone)}
                  sx={{ border: 1, borderColor: 'divider', mb: 1, borderRadius: 1 }}
                >
                  <ListItemIcon>
                    {getStatusIcon(milestone.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {milestone.title}
                        <Chip 
                          icon={<ImportanceIcon />}
                          label={milestone.importance}
                          size="small"
                          color={getImportanceColor(milestone.importance) as any}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {milestone.description}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={milestone.progress}
                          sx={{ height: 4, borderRadius: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          進捗: {milestone.progress}%
                        </Typography>
                      </Box>
                    }
                  />
                  {milestone.status === 'in_progress' && milestone.progress >= 100 && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CompleteIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        completeMilestone(milestone.id);
                      }}
                    >
                      完了
                    </Button>
                  )}
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  // 最近の達成セクション
  const RecentAchievementsSection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        最近の達成
      </Typography>
      
      {progressTracker.recentAchievements.length === 0 ? (
        <Alert severity="info">最近の達成はありません</Alert>
      ) : (
        <List>
          {progressTracker.recentAchievements.map((achievement) => (
            <ListItem key={achievement.milestoneId} sx={{ border: 1, borderColor: 'divider', mb: 1, borderRadius: 1 }}>
              <ListItemIcon>
                <RewardIcon color="warning" />
              </ListItemIcon>
              <ListItemText
                primary={'マイルストーン完了'}
                secondary={
                  <Box>
                    <Typography variant="body2">
                      経験値: {achievement.experience}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(achievement.completedAt).toLocaleString()}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* レベルアップイベント */}
      {recentLevelUps.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            最近のレベルアップ
          </Typography>
          <List>
            {recentLevelUps.slice(0, 3).map((levelUp) => (
              <ListItem key={levelUp.id} sx={{ border: 1, borderColor: 'divider', mb: 1, borderRadius: 1 }}>
                <ListItemIcon>
                  <LevelUpIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary={`レベル ${levelUp.previousLevel} → ${levelUp.newLevel}`}
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        経験値: +{levelUp.experienceGained} (合計: {levelUp.totalExperience})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(levelUp.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MilestoneIcon color="primary" />
          <Typography variant="h6">
            マイルストーン・進捗管理
          </Typography>
          <Chip 
            label={`${progressTracker.overallProgress.completedMilestones}/${progressTracker.overallProgress.totalMilestones}`}
            color="primary"
            size="small"
          />
        </Box>
      </Box>

      {/* タブ選択 */}
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={expandedSection === 'overview' ? 'contained' : 'outlined'}
            startIcon={<StatsIcon />}
            onClick={() => setExpandedSection('overview')}
          >
            概要
          </Button>
          <Button
            size="small"
            variant={expandedSection === 'milestones' ? 'contained' : 'outlined'}
            startIcon={<TimelineIcon />}
            onClick={() => setExpandedSection('milestones')}
          >
            マイルストーン
          </Button>
          <Button
            size="small"
            variant={expandedSection === 'achievements' ? 'contained' : 'outlined'}
            startIcon={<RewardIcon />}
            onClick={() => setExpandedSection('achievements')}
          >
            達成
          </Button>
        </Box>
      </Box>

      {/* コンテンツ */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {expandedSection === 'overview' && <OverviewSection />}
        {expandedSection === 'milestones' && <MilestonesSection />}
        {expandedSection === 'achievements' && <RecentAchievementsSection />}
      </Box>

      {/* マイルストーン詳細ダイアログ */}
      <Dialog 
        open={showMilestoneDetail} 
        onClose={() => setShowMilestoneDetail(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedMilestone && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MilestoneIcon />
              {selectedMilestone.title}
              <Box sx={{ flexGrow: 1 }} />
              <Chip 
                label={selectedMilestone.importance} 
                color={getImportanceColor(selectedMilestone.importance) as any}
              />
            </DialogTitle>

            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedMilestone.description}
              </Typography>

              {/* 進捗表示 */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">進捗</Typography>
                  <Typography variant="subtitle2">{selectedMilestone.progress}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={selectedMilestone.progress}
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>

              {/* 要件一覧 */}
              <Typography variant="h6" gutterBottom>要件</Typography>
              <List dense>
                {selectedMilestone.requirements.map((requirement) => (
                  <ListItem key={requirement.id}>
                    <ListItemIcon>
                      {requirement.completed ? (
                        <CompleteIcon color="success" />
                      ) : (
                        <NotStartedIcon color="disabled" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={requirement.description}
                      secondary={requirement.optional ? '(オプション)' : undefined}
                      sx={{
                        textDecoration: requirement.completed ? 'line-through' : 'none',
                        opacity: requirement.completed ? 0.7 : 1,
                      }}
                    />
                  </ListItem>
                ))}
              </List>

              {/* 報酬 */}
              <Typography variant="h6" gutterBottom>報酬</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {selectedMilestone.rewards.experience > 0 && (
                  <Chip 
                    icon={<RewardIcon />}
                    label={`${selectedMilestone.rewards.experience} EXP`}
                    color="primary"
                  />
                )}
                {selectedMilestone.rewards.currency > 0 && (
                  <Chip 
                    label={`${selectedMilestone.rewards.currency} GP`}
                    color="warning"
                  />
                )}
                {selectedMilestone.rewards.items.length > 0 && (
                  <Chip 
                    label={`アイテム x${selectedMilestone.rewards.items.length}`}
                    color="info"
                  />
                )}
                {selectedMilestone.rewards.abilities.length > 0 && (
                  <Chip 
                    label={`新能力 x${selectedMilestone.rewards.abilities.length}`}
                    color="success"
                  />
                )}
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setShowMilestoneDetail(false)}>
                閉じる
              </Button>
              
              {selectedMilestone.status === 'in_progress' && 
               selectedMilestone.progress >= 100 && (
                <Button 
                  variant="contained"
                  color="success"
                  startIcon={<CompleteIcon />}
                  onClick={() => {
                    completeMilestone(selectedMilestone.id);
                    setShowMilestoneDetail(false);
                  }}
                >
                  マイルストーン完了
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};