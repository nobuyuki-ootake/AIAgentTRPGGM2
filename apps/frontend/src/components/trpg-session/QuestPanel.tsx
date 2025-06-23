import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as NotStartedIcon,
  Warning as FailedIcon,
  Cancel as CancelledIcon,
  Assignment as QuestIcon,
  Flag as ObjectiveIcon,
  EmojiEvents as RewardIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Person as GiverIcon,
} from '@mui/icons-material';
import { Quest, ID } from '@ai-agent-trpg/types';

interface QuestPanelProps {
  /**
   * 現在のキャンペーンID
   */
  campaignId: ID;
  
  /**
   * 現在のセッションID
   */
  sessionId: ID;
  
  /**
   * クエスト一覧
   */
  quests: Quest[];
  
  /**
   * クエスト更新のコールバック
   */
  onQuestUpdate: (questId: ID, updates: Partial<Quest>) => void;
  
  /**
   * 新しいクエスト作成のコールバック
   */
  onCreateQuest: (questData: Partial<Quest>) => void;
  
  /**
   * パネルの高さ
   */
  height?: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`quest-tabpanel-${index}`}
      aria-labelledby={`quest-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * クエスト管理パネルコンポーネント
 */
export const QuestPanel: React.FC<QuestPanelProps> = ({
  quests,
  onQuestUpdate,
  height = 400,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [showQuestDetail, setShowQuestDetail] = useState(false);

  // クエストをタイプ別に分類
  const activeQuests = quests.filter(q => q.status === 'active');
  const completedQuests = quests.filter(q => q.status === 'completed');
  const availableQuests = quests.filter(q => q.status === 'not_started');
  const failedQuests = quests.filter(q => q.status === 'failed');

  // クエストステータスのアイコンを取得
  const getStatusIcon = (status: Quest['status']) => {
    switch (status) {
    case 'active': return <StartIcon color="primary" />;
    case 'completed': return <CompleteIcon color="success" />;
    case 'not_started': return <NotStartedIcon color="disabled" />;
    case 'failed': return <FailedIcon color="error" />;
    case 'cancelled': return <CancelledIcon color="disabled" />;
    default: return <NotStartedIcon color="disabled" />;
    }
  };

  // クエストタイプの色を取得
  const getTypeColor = (type: Quest['type']) => {
    switch (type) {
    case 'main': return 'error';
    case 'side': return 'primary';
    case 'personal': return 'secondary';
    case 'faction': return 'warning';
    default: return 'default';
    }
  };

  // 目標の進捗を計算
  const calculateQuestProgress = (quest: Quest): number => {
    if (quest.objectives.length === 0) return 0;
    const completedObjectives = quest.objectives.filter(obj => obj.completed).length;
    return (completedObjectives / quest.objectives.length) * 100;
  };

  // クエスト詳細を表示
  const showQuestDetails = (quest: Quest) => {
    setSelectedQuest(quest);
    setShowQuestDetail(true);
  };

  // 目標の完了状態を切り替え
  const toggleObjective = (questId: ID, objectiveId: ID) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest) return;

    const updatedObjectives = quest.objectives.map(obj =>
      obj.id === objectiveId ? { ...obj, completed: !obj.completed } : obj,
    );

    onQuestUpdate(questId, { objectives: updatedObjectives });
  };

  // クエスト開始
  const startQuest = (questId: ID) => {
    onQuestUpdate(questId, { status: 'active' });
  };

  // クエスト完了
  const completeQuest = (questId: ID) => {
    onQuestUpdate(questId, { 
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  };

  // クエストカードコンポーネント
  const QuestCard: React.FC<{ quest: Quest }> = ({ quest }) => {
    const progress = calculateQuestProgress(quest);
    
    return (
      <Card sx={{ mb: 1, cursor: 'pointer' }} onClick={() => showQuestDetails(quest)}>
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {getStatusIcon(quest.status)}
            <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1 }}>
              {quest.title}
            </Typography>
            <Chip 
              label={quest.type} 
              size="small" 
              color={getTypeColor(quest.type) as any}
              variant="outlined"
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {quest.description}
          </Typography>
          
          {quest.status === 'active' && (
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption">進捗</Typography>
                <Typography variant="caption">{Math.round(progress)}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          )}
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              icon={<ObjectiveIcon />}
              label={`${quest.objectives.filter(o => o.completed).length}/${quest.objectives.length}`}
              size="small"
              variant="outlined"
            />
            {quest.level && (
              <Chip 
                label={`Lv.${quest.level}`}
                size="small"
                variant="outlined"
              />
            )}
            {quest.timeLimit && (
              <Chip 
                icon={<TimeIcon />}
                label="期限有"
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
        </CardContent>
        
        {quest.status === 'not_started' && (
          <CardActions>
            <Button 
              size="small" 
              startIcon={<StartIcon />}
              onClick={(e) => {
                e.stopPropagation();
                startQuest(quest.id);
              }}
            >
              開始
            </Button>
          </CardActions>
        )}
        
        {quest.status === 'active' && progress === 100 && (
          <CardActions>
            <Button 
              size="small" 
              startIcon={<CompleteIcon />}
              color="success"
              onClick={(e) => {
                e.stopPropagation();
                completeQuest(quest.id);
              }}
            >
              完了
            </Button>
          </CardActions>
        )}
      </Card>
    );
  };

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* タブヘッダー */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                進行中
                {activeQuests.length > 0 && (
                  <Chip label={activeQuests.length} size="small" color="primary" />
                )}
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                利用可能
                {availableQuests.length > 0 && (
                  <Chip label={availableQuests.length} size="small" />
                )}
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                完了済み
                {completedQuests.length > 0 && (
                  <Chip label={completedQuests.length} size="small" color="success" />
                )}
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                失敗
                {failedQuests.length > 0 && (
                  <Chip label={failedQuests.length} size="small" color="error" />
                )}
              </Box>
            } 
          />
        </Tabs>
      </Box>

      {/* タブコンテンツ */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TabPanel value={tabValue} index={0}>
          {activeQuests.length === 0 ? (
            <Alert severity="info">進行中のクエストはありません</Alert>
          ) : (
            activeQuests.map(quest => (
              <QuestCard key={quest.id} quest={quest} />
            ))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {availableQuests.length === 0 ? (
            <Alert severity="info">利用可能なクエストはありません</Alert>
          ) : (
            availableQuests.map(quest => (
              <QuestCard key={quest.id} quest={quest} />
            ))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {completedQuests.length === 0 ? (
            <Alert severity="info">完了したクエストはありません</Alert>
          ) : (
            completedQuests.map(quest => (
              <QuestCard key={quest.id} quest={quest} />
            ))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {failedQuests.length === 0 ? (
            <Alert severity="success">失敗したクエストはありません</Alert>
          ) : (
            failedQuests.map(quest => (
              <QuestCard key={quest.id} quest={quest} />
            ))
          )}
        </TabPanel>
      </Box>

      {/* クエスト詳細ダイアログ */}
      <Dialog 
        open={showQuestDetail} 
        onClose={() => setShowQuestDetail(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedQuest && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QuestIcon />
              {selectedQuest.title}
              <Box sx={{ flexGrow: 1 }} />
              <Chip 
                label={selectedQuest.type} 
                color={getTypeColor(selectedQuest.type) as any}
              />
            </DialogTitle>

            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedQuest.description}
              </Typography>

              {/* 基本情報 */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>基本情報</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Chip icon={<GiverIcon />} label={`依頼者: ${selectedQuest.giver}`} />
                  <Chip icon={<LocationIcon />} label={selectedQuest.location} />
                  {selectedQuest.level && <Chip label={`推奨レベル: ${selectedQuest.level}`} />}
                  {selectedQuest.timeLimit && (
                    <Chip 
                      icon={<TimeIcon />} 
                      label={`期限: ${new Date(selectedQuest.timeLimit).toLocaleDateString()}`}
                      color="warning"
                    />
                  )}
                </Box>
              </Box>

              {/* 目標一覧 */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>目標</Typography>
                <List dense>
                  {selectedQuest.objectives.map((objective) => (
                    <ListItem 
                      key={objective.id}
                      button
                      onClick={() => toggleObjective(selectedQuest.id, objective.id)}
                    >
                      <ListItemIcon>
                        {objective.completed ? (
                          <CompleteIcon color="success" />
                        ) : (
                          <NotStartedIcon color="disabled" />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={objective.description}
                        secondary={objective.optional ? '(オプション)' : undefined}
                        sx={{
                          textDecoration: objective.completed ? 'line-through' : 'none',
                          opacity: objective.completed ? 0.7 : 1,
                        }}
                      />
                      {objective.progress > 0 && objective.progress < 100 && (
                        <Box sx={{ width: '20%', ml: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={objective.progress} 
                          />
                        </Box>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* 報酬 */}
              <Box>
                <Typography variant="h6" gutterBottom>報酬</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedQuest.rewards.experience > 0 && (
                    <Chip 
                      icon={<RewardIcon />}
                      label={`${selectedQuest.rewards.experience} EXP`}
                      color="primary"
                    />
                  )}
                  {selectedQuest.rewards.currency > 0 && (
                    <Chip 
                      label={`${selectedQuest.rewards.currency} GP`}
                      color="warning"
                    />
                  )}
                  {selectedQuest.rewards.items.length > 0 && (
                    <Chip 
                      label={`アイテム x${selectedQuest.rewards.items.length}`}
                      color="info"
                    />
                  )}
                </Box>
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setShowQuestDetail(false)}>
                閉じる
              </Button>
              
              {selectedQuest.status === 'not_started' && (
                <Button 
                  variant="contained"
                  startIcon={<StartIcon />}
                  onClick={() => {
                    startQuest(selectedQuest.id);
                    setShowQuestDetail(false);
                  }}
                >
                  クエスト開始
                </Button>
              )}
              
              {selectedQuest.status === 'active' && 
               calculateQuestProgress(selectedQuest) === 100 && (
                <Button 
                  variant="contained"
                  color="success"
                  startIcon={<CompleteIcon />}
                  onClick={() => {
                    completeQuest(selectedQuest.id);
                    setShowQuestDetail(false);
                  }}
                >
                  クエスト完了
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};