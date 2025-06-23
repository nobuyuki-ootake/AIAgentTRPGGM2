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
} from '@mui/icons-material';
import { ID, SessionState, Character, Quest, Milestone } from '@ai-agent-trpg/types';
import { aiGameMasterAPI, SessionContext, GameOverview, TaskExplanation, ResultJudgment, ScenarioAdjustment } from '../../api/aiGameMaster';

interface AIGameMasterPanelProps {
  sessionId: ID;
  campaignId: ID;
  session: SessionState;
  characters: Character[];
  quests: Quest[];
  milestones: Milestone[];
  onEventGenerate?: (eventType: string) => void;
}

export const AIGameMasterPanel: React.FC<AIGameMasterPanelProps> = ({
  sessionId,
  campaignId,
  session,
  characters,
  quests,
  milestones,
  onEventGenerate,
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