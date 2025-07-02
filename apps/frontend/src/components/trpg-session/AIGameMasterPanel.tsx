import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as AIIcon,
  Psychology as AnalysisIcon,
  Timeline as ProgressIcon,
  Assessment as JudgmentIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Description as TaskIcon,
  Event as EventIcon,
  Flag as MilestoneIcon,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as IncompleteIcon,
  Announcement as AnnouncementIcon,
  Forward as ProgressIcon,
} from '@mui/icons-material';
import { ID, SessionState, Character, Quest, Milestone, GMNotification } from '@ai-agent-trpg/types';
import { useRecoilValue, useRecoilState } from 'recoil';
import { gmNotificationsAtom, gmNotificationUnreadCountAtom } from '../../store/atoms';
import { aiGameMasterAPI, SessionContext, GameOverview, TaskExplanation, ResultJudgment, ScenarioAdjustment } from '../../api/aiGameMaster';
import { milestoneManagementAPI } from '../../api/milestoneManagement';
import { useAIEntityManagement } from '../../hooks/useAIEntityManagement';

interface AIGameMasterPanelProps {
  sessionId: ID;
  campaignId: ID;
  session: SessionState;
  characters: Character[];
  quests: Quest[];
  milestones: Milestone[];
  onEventGenerate?: (eventType: string) => void;
  aiEntityManagement?: ReturnType<typeof useAIEntityManagement>;
}

export const AIGameMasterPanel: React.FC<AIGameMasterPanelProps> = ({
  sessionId,
  campaignId,
  session,
  characters,
  quests,
  milestones,
  onEventGenerate,
  aiEntityManagement,
}) => {
  // State for AI data
  const [gameOverview, setGameOverview] = useState<GameOverview | null>(null);
  const [currentTask, setCurrentTask] = useState<TaskExplanation | null>(null);
  const [recentJudgments, setRecentJudgments] = useState<ResultJudgment[]>([]);
  const [recentAdjustments, setRecentAdjustments] = useState<ScenarioAdjustment[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  // const [judgmentLoading, setJudgmentLoading] = useState(false); // 未使用
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('google'); // Geminiをデフォルトに
  
  // GM Notifications
  const gmNotifications = useRecoilValue(gmNotificationsAtom);
  const [unreadCount, setUnreadCount] = useRecoilState(gmNotificationUnreadCountAtom);

  // Milestone management state
  const [milestoneProgress, setMilestoneProgress] = useState<Record<ID, {
    currentProgress: number;
    maxProgress: number;
    progressPercentage: number;
    completedEntities: string[];
    remainingEntities: string[];
    lastUpdated: string;
  }>>({});
  const [milestoneLoading, setMilestoneLoading] = useState<Record<ID, boolean>>({});
  const [gmAnnouncementText, setGmAnnouncementText] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');

  // Task creation state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedQuestId, setSelectedQuestId] = useState<ID | ''>('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<ID | ''>('');

  // Initialize AI settings from localStorage (provider only)
  useEffect(() => {
    const savedProvider = localStorage.getItem('ai-provider') || 'google';
    setSelectedProvider(savedProvider);
  }, []);

  // Save AI provider to localStorage
  useEffect(() => {
    localStorage.setItem('ai-provider', selectedProvider);
  }, [selectedProvider]);

  const createSessionContext = (): SessionContext => {
    const activeQuests = quests.filter(q => q.status === 'active');
    const completedMilestones = milestones.filter(m => m.status === 'completed');
    
    return {
      currentSession: session,
      characters,
      activeQuests,
      completedMilestones,
      recentEvents: [], // これは実装に応じて履歴から取得
      campaignTension: 50, // セッション状態から計算
      playerEngagement: 70, // セッション統計から計算
      storyProgression: (completedMilestones.length / milestones.length) * 100,
      difficulty: 'medium',
      mood: 'neutral',
    };
  };

  const loadSessionSummary = async () => {
    try {
      setLoading(true);
      const summary = await aiGameMasterAPI.getSessionSummary(sessionId);
      
      setGameOverview(summary.overview);
      setCurrentTask(summary.currentTask);
      setRecentJudgments(summary.recentResults);
      setRecentAdjustments(summary.recentAdjustments);
      setError(null);
    } catch (err) {
      console.error('Failed to load session summary:', err);
      // エラーは表示しない（初回の場合は正常）
    } finally {
      setLoading(false);
    }
  };

  // Load existing AI data on mount
  useEffect(() => {
    loadSessionSummary();
  }, [sessionId]);

  const generateGameOverview = async () => {
    try {
      setOverviewLoading(true);
      setError(null);
      
      const context = createSessionContext();
      const overview = await aiGameMasterAPI.generateGameOverview({
        sessionId,
        campaignId,
        context,
        provider: selectedProvider,
      });
      
      setGameOverview(overview);
    } catch (err) {
      console.error('Failed to generate game overview:', err);
      setError('ゲーム概要の生成に失敗しました。サーバーの環境変数でAPIキーが設定されているか確認してください。');
    } finally {
      setOverviewLoading(false);
    }
  };

  const generateTaskExplanation = async () => {
    if (!taskTitle) {
      setError('タスクタイトルが必要です');
      return;
    }

    try {
      setTaskLoading(true);
      setError(null);
      
      const context = createSessionContext();
      const taskContext = {
        questId: selectedQuestId || undefined,
        milestoneId: selectedMilestoneId || undefined,
        taskTitle,
        basicDescription: taskDescription,
      };
      
      const explanation = await aiGameMasterAPI.generateTaskExplanation({
        sessionId,
        taskContext,
        sessionContext: context,
        provider: selectedProvider,
        // APIキーは環境変数から自動取得
      });
      
      setCurrentTask(explanation);
      
      // Reset form
      setTaskTitle('');
      setTaskDescription('');
      setSelectedQuestId('');
      setSelectedMilestoneId('');
    } catch (err) {
      console.error('Failed to generate task explanation:', err);
      setError('タスク説明の生成に失敗しました');
    } finally {
      setTaskLoading(false);
    }
  };

  const generateScenarioAdjustment = async (trigger: ScenarioAdjustment['trigger'], triggerContext: string) => {
    try {
      setAdjustmentLoading(true);
      setError(null);
      
      const context = createSessionContext();
      const adjustment = await aiGameMasterAPI.generateScenarioAdjustment({
        sessionId,
        trigger,
        triggerContext,
        sessionContext: context,
        provider: selectedProvider,
        // APIキーは環境変数から自動取得
      });
      
      setRecentAdjustments(prev => [adjustment, ...prev.slice(0, 2)]);
    } catch (err) {
      console.error('Failed to generate scenario adjustment:', err);
      setError('シナリオ調整の生成に失敗しました');
    } finally {
      setAdjustmentLoading(false);
    }
  };

  const getOutcomeColor = (outcome: ResultJudgment['outcome']) => {
    const { color } = aiGameMasterAPI.getOutcomeDescription(outcome);
    return color;
  };

  // マイルストーン進捗を取得
  const loadMilestoneProgress = async (milestoneId: ID) => {
    try {
      setMilestoneLoading(prev => ({ ...prev, [milestoneId]: true }));
      const progress = await milestoneManagementAPI.getMilestoneProgress(sessionId, milestoneId);
      setMilestoneProgress(prev => ({ ...prev, [milestoneId]: progress }));
    } catch (err) {
      console.error('Failed to load milestone progress:', err);
    } finally {
      setMilestoneLoading(prev => ({ ...prev, [milestoneId]: false }));
    }
  };

  // マイルストーン手動完了
  const completeMilestoneManually = async (milestoneId: ID, narrativeMessage?: string) => {
    try {
      setMilestoneLoading(prev => ({ ...prev, [milestoneId]: true }));
      const result = await milestoneManagementAPI.completeMilestoneManually(sessionId, milestoneId, {
        narrativeMessage,
        gmNote: `手動完了 - GM操作による`,
      });
      
      if (result.success) {
        // 進捗状況を更新
        await loadMilestoneProgress(milestoneId);
        setError(null);
        // 成功メッセージ
        console.log('Milestone completed:', result.narrativeMessage);
      }
    } catch (err) {
      console.error('Failed to complete milestone manually:', err);
      setError('マイルストーン完了に失敗しました');
    } finally {
      setMilestoneLoading(prev => ({ ...prev, [milestoneId]: false }));
    }
  };

  // GMアナウンス投稿
  const postGMNarrativeAnnouncement = async () => {
    if (!announcementTitle.trim() || !gmAnnouncementText.trim()) {
      setError('タイトルとメッセージを入力してください');
      return;
    }

    try {
      const result = await milestoneManagementAPI.postGMNarrativeAnnouncement(sessionId, {
        title: announcementTitle,
        message: gmAnnouncementText,
        type: 'custom',
        priority: 'medium',
      });

      if (result.success) {
        setAnnouncementTitle('');
        setGmAnnouncementText('');
        setError(null);
        console.log('GM announcement posted:', result.messageId);
      }
    } catch (err) {
      console.error('Failed to post GM announcement:', err);
      setError('GMアナウンスの投稿に失敗しました');
    }
  };

  // シナリオ進行トリガー
  const triggerScenarioProgression = async (progressionType: 'milestone_based' | 'manual', customMessage?: string) => {
    try {
      setAdjustmentLoading(true);
      const result = await milestoneManagementAPI.triggerScenarioProgression(sessionId, {
        progressionType,
        customMessage,
      });

      if (result.success) {
        console.log('Scenario progression triggered:', result.narrativeAnnouncement);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to trigger scenario progression:', err);
      setError('シナリオ進行の実行に失敗しました');
    } finally {
      setAdjustmentLoading(false);
    }
  };

  // マイルストーン進捗の初期ロード
  useEffect(() => {
    milestones.forEach(milestone => {
      if (milestone.status !== 'completed') {
        loadMilestoneProgress(milestone.id);
      }
    });
  }, [sessionId, milestones]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          AIデータを読み込み中...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={2} sx={{ height: '100%', overflow: 'auto' }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <AIIcon color="primary" />
        <Typography variant="h6">
          AIゲームマスター
        </Typography>
        <Tooltip title="データを更新">
          <IconButton size="small" onClick={loadSessionSummary}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* AI設定 */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <SettingsIcon fontSize="small" />
            <Typography>AI設定</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <FormControl size="small">
              <InputLabel>AIプロバイダー</InputLabel>
              <Select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                label="AIプロバイダー"
              >
                <MenuItem value="openai">OpenAI</MenuItem>
                <MenuItem value="anthropic">Anthropic</MenuItem>
                <MenuItem value="google">Google</MenuItem>
              </Select>
            </FormControl>
            <Alert severity="info" sx={{ mt: 1 }}>
              APIキーはサーバーの環境変数から取得されます。<br/>
              <code>{selectedProvider.toUpperCase()}_API_KEY</code>が設定されていることを確認してください。
            </Alert>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* ゲーム概要 */}
      <Accordion defaultExpanded sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <AnalysisIcon fontSize="small" />
            <Typography>セッション概要</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Button
              variant="contained"
              startIcon={overviewLoading ? <CircularProgress size={16} /> : <StartIcon />}
              onClick={generateGameOverview}
              disabled={overviewLoading}
              fullWidth
            >
              ゲーム概要を生成
            </Button>
            
            {gameOverview && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    現在の状況
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {gameOverview.currentSituation}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    プレイヤーへの説明
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {gameOverview.playerBriefing}
                  </Typography>

                  {gameOverview.suggestedActions.length > 0 && (
                    <>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        推奨行動
                      </Typography>
                      <Stack spacing={0.5}>
                        {gameOverview.suggestedActions.map((action, index) => (
                          <Typography key={index} variant="body2" component="li">
                            {action}
                          </Typography>
                        ))}
                      </Stack>
                    </>
                  )}

                  <Box mt={2}>
                    <Typography variant="caption" color="text.secondary">
                      生成日時: {new Date(gameOverview.generatedAt).toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* タスク説明生成 */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <TaskIcon fontSize="small" />
            <Typography>タスク詳細生成</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <TextField
              size="small"
              label="タスクタイトル"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="例：古代遺跡の調査"
            />
            
            <TextField
              size="small"
              multiline
              rows={2}
              label="基本説明"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="タスクの基本的な内容を入力"
            />

            <Stack direction="row" spacing={1}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>関連クエスト</InputLabel>
                <Select
                  value={selectedQuestId}
                  onChange={(e) => setSelectedQuestId(e.target.value as ID)}
                  label="関連クエスト"
                >
                  <MenuItem value="">なし</MenuItem>
                  {quests.map((quest) => (
                    <MenuItem key={quest.id} value={quest.id}>
                      {quest.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>関連マイルストーン</InputLabel>
                <Select
                  value={selectedMilestoneId}
                  onChange={(e) => setSelectedMilestoneId(e.target.value as ID)}
                  label="関連マイルストーン"
                >
                  <MenuItem value="">なし</MenuItem>
                  {milestones.map((milestone) => (
                    <MenuItem key={milestone.id} value={milestone.id}>
                      {milestone.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Button
              variant="contained"
              startIcon={taskLoading ? <CircularProgress size={16} /> : <TaskIcon />}
              onClick={generateTaskExplanation}
              disabled={taskLoading || !taskTitle}
              fullWidth
            >
              タスク説明を生成
            </Button>

            {currentTask && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {currentTask.taskTitle}
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    {currentTask.taskDescription}
                  </Typography>

                  <Box display="flex" gap={1} mb={2}>
                    <Chip
                      label={aiGameMasterAPI.getDifficultyDescription(currentTask.difficulty).name}
                      color={aiGameMasterAPI.getDifficultyDescription(currentTask.difficulty).color as any}
                      size="small"
                    />
                    <Chip
                      label={`推定時間: ${currentTask.estimatedDuration}分`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  {currentTask.approachSuggestions.length > 0 && (
                    <>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        アプローチ案
                      </Typography>
                      <Stack spacing={0.5} mb={2}>
                        {currentTask.approachSuggestions.map((suggestion, index) => (
                          <Typography key={index} variant="body2" component="li">
                            {suggestion}
                          </Typography>
                        ))}
                      </Stack>
                    </>
                  )}

                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    雰囲気
                  </Typography>
                  <Typography variant="body2">
                    {currentTask.atmosphericDetails}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* シナリオ調整 */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <ProgressIcon fontSize="small" />
            <Typography>シナリオ調整</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              状況に応じてシナリオを動的に調整します
            </Typography>
            
            <Button
              size="small"
              onClick={() => generateScenarioAdjustment('player_success', 'プレイヤーが予想以上の成功を収めた')}
              disabled={adjustmentLoading}
            >
              プレイヤー大成功時の調整
            </Button>
            
            <Button
              size="small"
              onClick={() => generateScenarioAdjustment('player_failure', 'プレイヤーが連続して失敗している')}
              disabled={adjustmentLoading}
            >
              プレイヤー失敗時の調整
            </Button>
            
            <Button
              size="small"
              onClick={() => generateScenarioAdjustment('pacing_issue', 'セッションの進行が遅くなっている')}
              disabled={adjustmentLoading}
            >
              ペース調整
            </Button>

            {recentAdjustments.map((adjustment, index) => (
              <Card key={index} variant="outlined" sx={{ mt: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2">
                      {aiGameMasterAPI.getTriggerDescription(adjustment.trigger)}
                    </Typography>
                    <Chip
                      label={adjustment.adjustmentType}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="body2" paragraph>
                    {adjustment.analysis}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    実装ガイド
                  </Typography>
                  <Typography variant="body2">
                    {adjustment.implementationGuide}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* インテリジェントイベント生成 */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <EventIcon fontSize="small" />
            <Typography>コンテキストイベント</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Alert severity="info">
              現在の状況に応じて適切なイベントを自動生成します。<br/>
              チャットでGMがシーンを描写し、プレイヤーは自由に行動できます。
            </Alert>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              現在の状況分析
            </Typography>
            <Box sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" display="block">
                • セッション状況: {session.status === 'active' ? 'アクティブ' : session.status}
              </Typography>
              <Typography variant="caption" display="block">
                • 現在のモード: {session.mode === 'exploration' ? '探索' : session.mode === 'combat' ? '戦闘' : session.mode}
              </Typography>
              <Typography variant="caption" display="block">
                • 参加キャラクター: {characters.filter(c => c.characterType === 'PC').length}名
              </Typography>
              <Typography variant="caption" display="block">
                • アクティブクエスト: {quests.filter(q => q.status === 'active').length}件
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              適応的イベント生成
            </Typography>
            <Stack spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => onEventGenerate && onEventGenerate('contextual_encounter')}
                disabled={!onEventGenerate}
                sx={{ justifyContent: 'flex-start' }}
              >
                状況に応じた遭遇イベント
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => onEventGenerate && onEventGenerate('investigation_opportunity')}
                disabled={!onEventGenerate}
                sx={{ justifyContent: 'flex-start' }}
              >
                調査・発見の機会
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => onEventGenerate && onEventGenerate('character_development')}
                disabled={!onEventGenerate}
                sx={{ justifyContent: 'flex-start' }}
              >
                キャラクター成長イベント
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => onEventGenerate && onEventGenerate('story_progression')}
                disabled={!onEventGenerate}
                sx={{ justifyContent: 'flex-start' }}
              >
                ストーリー進行イベント
              </Button>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              💡 これらのイベントは現在のキャンペーン状況、キャラクターの行動履歴、
              クエスト進行状況を分析して最適化されたシーンが生成されます。
            </Typography>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* マイルストーン管理 */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <MilestoneIcon fontSize="small" />
            <Typography>マイルストーン管理（GM用）</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Alert severity="info">
              GM用の手動制御機能です。マイルストーンの進捗確認・手動完了・物語アナウンス投稿が可能です。
            </Alert>

            {/* マイルストーン一覧 */}
            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                📋 マイルストーン進捗状況
              </Typography>
              <Stack spacing={1}>
                {milestones.map((milestone) => {
                  const progress = milestoneProgress[milestone.id];
                  const isLoading = milestoneLoading[milestone.id] || false;
                  const isCompleted = milestone.status === 'completed';

                  return (
                    <Card key={milestone.id} variant="outlined">
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Box flex={1}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              {isCompleted ? (
                                <CompleteIcon color="success" fontSize="small" />
                              ) : (
                                <IncompleteIcon color="disabled" fontSize="small" />
                              )}
                              <Typography variant="subtitle2" fontWeight="bold">
                                {milestone.title}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {milestone.description}
                            </Typography>

                            {/* 進捗バー（完了していない場合のみ） */}
                            {!isCompleted && progress && (
                              <Box sx={{ mb: 1 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                  <Typography variant="caption" color="text.secondary">
                                    進捗: {progress.currentProgress} / {progress.maxProgress}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {Math.round(progress.progressPercentage)}%
                                  </Typography>
                                </Box>
                                <Box sx={{ bgcolor: 'grey.200', borderRadius: 1, height: 6 }}>
                                  <Box
                                    sx={{
                                      bgcolor: progress.progressPercentage >= 100 ? 'success.main' : 'primary.main',
                                      borderRadius: 1,
                                      height: '100%',
                                      width: `${Math.min(progress.progressPercentage, 100)}%`,
                                      transition: 'width 0.3s ease',
                                    }}
                                  />
                                </Box>
                              </Box>
                            )}

                            {/* エンティティ詳細 */}
                            {progress && (
                              <Box sx={{ mt: 1 }}>
                                {progress.completedEntities.length > 0 && (
                                  <Typography variant="caption" color="success.main" display="block">
                                    ✓ 完了: {progress.completedEntities.join(', ')}
                                  </Typography>
                                )}
                                {progress.remainingEntities.length > 0 && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    ⏳ 残り: {progress.remainingEntities.join(', ')}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>

                          {/* アクションボタン */}
                          <Box sx={{ ml: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Chip 
                              label={isCompleted ? '完了' : '進行中'} 
                              size="small" 
                              color={isCompleted ? 'success' : 'default'}
                            />
                            {!isCompleted && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => completeMilestoneManually(milestone.id)}
                                disabled={isLoading}
                                startIcon={isLoading ? <CircularProgress size={12} /> : <CompleteIcon />}
                                sx={{ fontSize: '0.7rem', px: 1, py: 0.25 }}
                              >
                                手動完了
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => loadMilestoneProgress(milestone.id)}
                              disabled={isLoading}
                              startIcon={<RefreshIcon />}
                              sx={{ fontSize: '0.7rem', px: 1, py: 0.25 }}
                            >
                              更新
                            </Button>
                          </Box>
                        </Box>

                        {progress && (
                          <Typography variant="caption" color="text.secondary">
                            最終更新: {new Date(progress.lastUpdated).toLocaleTimeString()}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {milestones.length === 0 && (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                    マイルストーンが設定されていません
                  </Typography>
                )}
              </Stack>
            </Box>

            {/* GMアナウンス投稿 */}
            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                📢 GM物語アナウンス
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  label="アナウンスタイトル"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="例：新たな発見"
                  fullWidth
                />
                <TextField
                  size="small"
                  label="アナウンス内容"
                  value={gmAnnouncementText}
                  onChange={(e) => setGmAnnouncementText(e.target.value)}
                  placeholder="例：古代の扉が静かに開かれ、未知の通路が姿を現しました..."
                  multiline
                  rows={3}
                  fullWidth
                />
                <Button
                  variant="contained"
                  startIcon={<AnnouncementIcon />}
                  onClick={postGMNarrativeAnnouncement}
                  disabled={!announcementTitle.trim() || !gmAnnouncementText.trim()}
                  fullWidth
                >
                  GMアナウンスを投稿
                </Button>
              </Stack>
            </Box>

            {/* シナリオ進行トリガー */}
            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                🎬 シナリオ進行制御
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  GM用のシナリオ進行制御機能です。新エンティティの解放や物語の進行を手動で実行できます。
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => triggerScenarioProgression('milestone_based')}
                    disabled={adjustmentLoading}
                    startIcon={<ProgressIcon />}
                  >
                    マイルストーン基準進行
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => triggerScenarioProgression('manual', '手動による物語進行')}
                    disabled={adjustmentLoading}
                    startIcon={<StartIcon />}
                  >
                    手動進行実行
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  💡 これらの機能は新NPCの登場、新エリアの解放、新クエストの追加などを自動的に実行します。
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* エンティティ推奨システム */}
      {aiEntityManagement && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <AIIcon fontSize="small" />
              <Typography>AI エンティティ推奨</Typography>
              {aiEntityManagement.isLoading && (
                <CircularProgress size={16} sx={{ ml: 1 }} />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {/* エンティティ推奨状態表示 */}
              {aiEntityManagement.gameContext ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  AIエンティティシステムが有効です - リアルタイム推奨が利用可能
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  ゲームコンテキストの準備中...
                </Alert>
              )}

              {/* セッション推奨エンティティ */}
              {aiEntityManagement.sessionRecommendations.immediate && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    💡 即座に使用可能なエンティティ
                  </Typography>
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    {aiEntityManagement.sessionRecommendations.immediate.recommendations.slice(0, 3).map((rec, index) => (
                      <Card key={index} variant="outlined" sx={{ p: 1.5 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Box flex={1}>
                            <Typography variant="body2" fontWeight="bold">
                              {rec.entityType.toUpperCase()}: {rec.entityId}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              {rec.reasoning}
                            </Typography>
                          </Box>
                          <Box sx={{ ml: 1, textAlign: 'center' }}>
                            <Chip 
                              label={`${Math.round(rec.relevanceScore * 100)}%`}
                              size="small"
                              color={rec.relevanceScore > 0.8 ? 'success' : rec.relevanceScore > 0.6 ? 'warning' : 'default'}
                            />
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              {rec.suggestedTiming === 'immediate' ? '今すぐ' : 
                               rec.suggestedTiming === 'short_term' ? '近日中' : '将来'}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* インパクト指標 */}
                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                          <Chip label={`ストーリー: ${Math.round(rec.expectedImpact.story * 100)}%`} size="small" variant="outlined" />
                          <Chip label={`キャラクター: ${Math.round(rec.expectedImpact.character * 100)}%`} size="small" variant="outlined" />
                          <Chip label={`ゲームプレイ: ${Math.round(rec.expectedImpact.gameplay * 100)}%`} size="small" variant="outlined" />
                        </Box>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* 利用可能エンティティ概要 */}
              {aiEntityManagement.availableEntities && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    📋 現在利用可能なエンティティ
                  </Typography>
                  <Box sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" display="block">
                      • 総エンティティ数: {aiEntityManagement.availableEntities.entities.length}
                    </Typography>
                    <Typography variant="caption" display="block">
                      • 利用可能: {aiEntityManagement.availableEntities.entities.filter(e => e.availability).length}
                    </Typography>
                    <Typography variant="caption" display="block">
                      • 最高関連度: {Math.round((Math.max(...aiEntityManagement.availableEntities.entities.map(e => e.relevanceScore)) || 0) * 100)}%
                    </Typography>
                    <Typography variant="caption" display="block">
                      • 最終更新: {aiEntityManagement.lastUpdated.entities?.toLocaleTimeString() || '未取得'}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* エンジン統計 */}
              {aiEntityManagement.engineStats && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ⚙️ AIエンティティエンジン統計
                  </Typography>
                  <Box sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" display="block">
                      • エンティティ総数: {aiEntityManagement.engineStats.totalEntities}
                    </Typography>
                    <Typography variant="caption" display="block">
                      • 関係性数: {aiEntityManagement.engineStats.totalRelationships}
                    </Typography>
                    <Typography variant="caption" display="block">
                      • キャッシュヒット率: {Math.round(aiEntityManagement.engineStats.cacheHitRate * 100)}%
                    </Typography>
                    <Typography variant="caption" display="block">
                      • 処理時間: {aiEntityManagement.engineStats.lastProcessingTime}ms
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* 手動操作 */}
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  🔧 手動操作
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => aiEntityManagement.refresh()}
                    disabled={aiEntityManagement.isLoading}
                    startIcon={<RefreshIcon />}
                  >
                    更新
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => aiEntityManagement.clearCache()}
                    disabled={aiEntityManagement.isLoading}
                  >
                    キャッシュクリア
                  </Button>
                </Stack>
              </Box>

              {/* エラー表示 */}
              {aiEntityManagement.hasErrors && (
                <Alert severity="error">
                  AIエンティティ管理でエラーが発生しています。
                  <br />
                  エンティティ: {aiEntityManagement.errors.entities}
                  <br />
                  推奨: {aiEntityManagement.errors.recommendations}
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                💡 このシステムは現在のセッション状況を分析し、最適なエンティティ（アイテム、クエスト、イベント、NPC、敵）を
                自動推奨します。推奨内容はリアルタイムで更新され、ストーリー進行を支援します。
              </Typography>
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* GM通知 */}
      {gmNotifications.length > 0 && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <AIIcon fontSize="small" />
              <Typography>GM通知</Typography>
              {unreadCount > 0 && (
                <Chip 
                  label={unreadCount} 
                  size="small" 
                  color="error" 
                  sx={{ minWidth: '24px', height: '20px' }}
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              {gmNotifications.slice(0, 5).map((notification) => (
                <Card 
                  key={notification.id} 
                  variant="outlined"
                  sx={{ 
                    borderLeft: notification.priority === 'high' ? '4px solid #f44336' : 
                               notification.priority === 'medium' ? '4px solid #ff9800' : '4px solid #2196f3'
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {notification.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {notification.message}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Chip 
                        label={notification.priority} 
                        size="small" 
                        color={notification.priority === 'high' ? 'error' : 
                               notification.priority === 'medium' ? 'warning' : 'info'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {notification.type}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {gmNotifications.length > 5 && (
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  他 {gmNotifications.length - 5} 件の通知
                </Typography>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* 最近の結果判定 */}
      {recentJudgments.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <JudgmentIcon fontSize="small" />
              <Typography>最近の結果判定</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {recentJudgments.map((judgment, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2">
                        {characters.find(c => c.id === judgment.characterId)?.name || '不明'}
                      </Typography>
                      <Chip
                        label={aiGameMasterAPI.getOutcomeDescription(judgment.outcome).level}
                        color={getOutcomeColor(judgment.outcome) as any}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      行動: {judgment.actionDescription}
                    </Typography>
                    
                    <Typography variant="body2" paragraph>
                      {judgment.dramaticDescription}
                    </Typography>
                    
                    <Typography variant="body2">
                      {judgment.immediateResults}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};