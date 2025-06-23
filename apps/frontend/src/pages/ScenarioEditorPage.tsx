import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Alert,
  Paper,
  Grid,
  Tab,
  Tabs,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Timeline as TimelineIcon,
  Groups as GroupsIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useRecoilValue, useRecoilState } from 'recoil';
import { currentCampaignAtom, appModeAtom } from '@/store/atoms';
import { ScenarioMilestoneEditor } from '@/components/scenario-editor/ScenarioMilestoneEditor';
import { EntityPoolManager } from '@/components/scenario-editor/EntityPoolManager';
import { campaignAPI } from '@/api';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AIMilestone, EntityPool, SessionDurationConfig } from '@ai-agent-trpg/types';

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
      id={`scenario-tabpanel-${index}`}
      aria-labelledby={`scenario-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `scenario-tab-${index}`,
    'aria-controls': `scenario-tabpanel-${index}`,
  };
}

const ScenarioEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const appMode = useRecoilValue(appModeAtom);
  const [currentCampaign, setCurrentCampaign] = useRecoilState(currentCampaignAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // シナリオエディタ用のステート
  const [milestones, setMilestones] = useState<AIMilestone[]>([]);
  const [entityPool, setEntityPool] = useState<EntityPool | undefined>();

  // キャンペーンIDがない場合はホームにリダイレクト
  if (!id) {
    return <Navigate to="/" replace />;
  }

  // 開発者モードでない場合はアクセス拒否
  if (appMode !== 'developer') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            アクセス権限がありません
          </Typography>
          <Typography>
            シナリオエディタは開発者モードでのみ利用可能です。
            設定画面から開発者モードを有効にしてください。
          </Typography>
        </Alert>
      </Container>
    );
  }

  const loadCampaign = async () => {
    if (currentCampaign?.id === id) return;

    setLoading(true);
    setError(null);

    try {
      const campaign = await campaignAPI.getCampaignById(id);
      setCurrentCampaign(campaign);
    } catch (err) {
      setError('キャンペーンの読み込みに失敗しました');
      console.error('Failed to load campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadCampaign();
    }
  }, [id]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleMilestonesUpdate = (newMilestones: AIMilestone[]) => {
    setMilestones(newMilestones);
  };

  const handleEntityPoolUpdate = (newEntityPool: EntityPool) => {
    setEntityPool(newEntityPool);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!currentCampaign) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">キャンペーンが見つかりません</Alert>
      </Container>
    );
  }

  // デフォルトのセッション期間設定
  const defaultSessionDuration: SessionDurationConfig = {
    type: 'medium',
    totalDays: 7,
    actionsPerDay: 3,
    dayPeriods: [],
    estimatedPlayTime: 240, // 4 hours in minutes
    milestoneCount: 3,
    description: '中期セッション（7日間）',
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <EditIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            シナリオエディタ
          </Typography>
          <Chip label="GM専用" color="warning" variant="outlined" />
          <Chip label="開発者モード" color="info" variant="outlined" />
        </Box>
        
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {currentCampaign.name}
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon />
            <Typography variant="body2">
              <strong>重要:</strong> このツールはゲームマスター専用です。
              生成されたマイルストーンやエンティティはプレイヤーには一切表示されません。
            </Typography>
          </Box>
        </Alert>
      </Box>

      {/* キャンペーン情報カード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                キャンペーン情報
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                名前: {currentCampaign.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                ステータス: {currentCampaign.status}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                作成日: {new Date(currentCampaign.createdAt).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                生成済みコンテンツ
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">マイルストーン:</Typography>
                  <Chip label={milestones.length} size="small" color={milestones.length > 0 ? 'success' : 'default'} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">エンティティプール:</Typography>
                  <Chip label={entityPool ? '生成済み' : '未生成'} size="small" color={entityPool ? 'success' : 'default'} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                シナリオ設定
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                セッション期間: {defaultSessionDuration.type === 'short' ? '短期 (1-3日)' : 
                                defaultSessionDuration.type === 'medium' ? '中期 (4-7日)' : '長期 (8-14日)'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                予想時間: {Math.floor(defaultSessionDuration.estimatedPlayTime / 60)}時間
              </Typography>
              <Typography variant="body2" color="text.secondary">
                総日数: {defaultSessionDuration.totalDays}日
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* タブナビゲーション */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="scenario editor tabs"
          variant="fullWidth"
        >
          <Tab
            icon={<EditIcon />}
            label="マイルストーン エディタ"
            {...a11yProps(0)}
          />
          <Tab
            icon={<TimelineIcon />}
            label="シナリオ タイムライン"
            {...a11yProps(1)}
            disabled
          />
          <Tab
            icon={<GroupsIcon />}
            label="エンティティ詳細"
            {...a11yProps(2)}
          />
        </Tabs>
      </Paper>

      {/* タブコンテンツ */}
      <TabPanel value={activeTab} index={0}>
        <ScenarioMilestoneEditor
          campaignId={currentCampaign.id}
          sessionId="scenario-edit-session" // シナリオ編集専用セッションID
          themeId={currentCampaign.settings?.theme || 'default-theme'}
          sessionDuration={defaultSessionDuration}
          milestones={milestones}
          entityPool={entityPool}
          height={800}
          onMilestonesUpdate={handleMilestonesUpdate}
          onEntityPoolUpdate={handleEntityPoolUpdate}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Alert severity="info">
          <Typography variant="h6" gutterBottom>
            シナリオ タイムライン（開発予定）
          </Typography>
          <Typography>
            マイルストーンのタイムライン表示機能は今後のバージョンで実装予定です。
          </Typography>
        </Alert>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <EntityPoolManager
          entityPool={entityPool}
          onEntityPoolUpdate={handleEntityPoolUpdate}
          height={800}
        />
      </TabPanel>
    </Container>
  );
};

export default ScenarioEditorPage;