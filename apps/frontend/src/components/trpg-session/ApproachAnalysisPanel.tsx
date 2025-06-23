import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Psychology as AnalysisIcon,
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  Lightbulb as IdeaIcon,
  TrendingUp as ImprovementIcon,
  Assessment as EvaluationIcon,
  Speed as DifficultyIcon,
  Extension as CreativityIcon,
  Psychology as LogicIcon,
  CheckCircle as AppropriateneIcon,
  Build as FeasibilityIcon,
  History as HistoryIcon,
  Refresh as RetryIcon,
} from '@mui/icons-material';
import { 
  ApproachAnalysisRequest,
  ApproachAnalysis,
  ApproachResponse,
  GameContext,
} from '@/api/approachAnalysis';
import { Character, ID } from '@ai-agent-trpg/types';

interface ApproachAnalysisPanelProps {
  /**
   * 現在のセッションID
   */
  sessionId: ID;
  
  /**
   * キャラクター一覧
   */
  characters: Character[];
  
  /**
   * ゲーム状況
   */
  gameContext: GameContext;
  
  /**
   * AI設定
   */
  aiSettings: {
    provider: string;
    apiKey: string;
    model?: string;
  };
  
  /**
   * アプローチ分析のコールバック
   */
  onAnalyzeApproach: (request: ApproachAnalysisRequest) => Promise<ApproachResponse>;
  
  /**
   * アクション実行のコールバック（分析結果から）
   */
  onExecuteAction?: (analysis: ApproachAnalysis) => void;
  
  /**
   * パネルの高さ
   */
  height?: number;
}

/**
 * アプローチ・難易度分析パネル
 */
export const ApproachAnalysisPanel: React.FC<ApproachAnalysisPanelProps> = ({
  sessionId,
  characters,
  gameContext,
  aiSettings,
  onAnalyzeApproach,
  onExecuteAction,
  height = 600,
}) => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [playerInput, setPlayerInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<ApproachResponse | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<ApproachAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('input');
  const [targetDifficulty, setTargetDifficulty] = useState<number | undefined>();

  // 初期化
  useEffect(() => {
    if (characters.length > 0 && !selectedCharacter) {
      setSelectedCharacter(characters[0]);
    }
  }, [characters, selectedCharacter]);

  // アプローチ分析実行
  const handleAnalyzeApproach = async () => {
    if (!selectedCharacter || !playerInput.trim()) return;

    setLoading(true);
    try {
      const request: ApproachAnalysisRequest = {
        sessionId,
        characterId: selectedCharacter.id,
        playerInput: playerInput.trim(),
        context: gameContext,
        targetDifficulty,
        provider: aiSettings.provider,
        apiKey: aiSettings.apiKey,
        model: aiSettings.model,
      };

      const response = await onAnalyzeApproach(request);
      setCurrentAnalysis(response);
      setAnalysisHistory(prev => [response.analysis, ...prev.slice(0, 9)]);
      setExpandedSection('results');
    } catch (error) {
      console.error('Failed to analyze approach:', error);
    } finally {
      setLoading(false);
    }
  };

  // スコア評価の色を取得
  const getScoreColor = (score: number): 'success' | 'info' | 'warning' | 'error' => {
    if (score >= 75) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'error';
  };

  // 難易度の色を取得
  const getDifficultyColor = (difficulty: number): 'success' | 'info' | 'warning' | 'error' => {
    if (difficulty <= 12) return 'success';
    if (difficulty <= 16) return 'info';
    if (difficulty <= 20) return 'warning';
    return 'error';
  };

  // アプローチタイプの色を取得
  const getApproachTypeColor = (type: ApproachAnalysis['approachType']): string => {
    const colors = {
      combat: '#f44336',
      stealth: '#9c27b0',
      social: '#2196f3',
      investigation: '#ff9800',
      magic: '#9c27b0',
      creative: '#4caf50',
      direct: '#607d8b',
    };
    return colors[type] || '#757575';
  };

  // 入力セクション
  const InputSection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        アプローチ入力
      </Typography>
      
      <FormControl fullWidth sx={{ mb: 2 }}>
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
        rows={6}
        label="プレイヤーのアプローチ"
        value={playerInput}
        onChange={(e) => setPlayerInput(e.target.value)}
        placeholder="どのようなアプローチを取りますか？詳細に説明してください..."
        sx={{ mb: 2 }}
      />

      <FormControl sx={{ mb: 2, minWidth: 200 }}>
        <InputLabel>目標難易度（オプション）</InputLabel>
        <Select
          value={targetDifficulty || ''}
          label="目標難易度（オプション）"
          onChange={(e) => setTargetDifficulty(e.target.value as number || undefined)}
        >
          <MenuItem value="">自動調整</MenuItem>
          <MenuItem value={8}>非常に簡単 (8)</MenuItem>
          <MenuItem value={12}>簡単 (12)</MenuItem>
          <MenuItem value={15}>普通 (15)</MenuItem>
          <MenuItem value={18}>困難 (18)</MenuItem>
          <MenuItem value={22}>非常に困難 (22)</MenuItem>
          <MenuItem value={25}>極めて困難 (25)</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <AnalysisIcon />}
          onClick={handleAnalyzeApproach}
          disabled={!selectedCharacter || !playerInput.trim() || loading}
          fullWidth
        >
          {loading ? 'AI分析中...' : 'アプローチを分析'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<HistoryIcon />}
          onClick={() => setShowHistory(true)}
        >
          履歴
        </Button>
      </Box>

      {/* 状況表示 */}
      <Paper sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          現在の状況
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Chip 
              label={`モード: ${gameContext.sessionMode}`}
              size="small"
              color="primary"
            />
          </Grid>
          <Grid item xs={6}>
            <Chip 
              label={`場所: ${gameContext.currentLocation}`}
              size="small"
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography variant="caption">
                ストーリーテンション:
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={gameContext.campaignTension}
                sx={{ flexGrow: 1, height: 6 }}
              />
              <Typography variant="caption">
                {gameContext.campaignTension}%
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  // 分析結果セクション
  const AnalysisResultsSection = () => {
    if (!currentAnalysis) {
      return (
        <Alert severity="info">
          アプローチを入力して分析を実行してください。
        </Alert>
      );
    }

    const analysis = currentAnalysis.analysis;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          分析結果
        </Typography>

        {/* 基本評価 */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip 
                label={analysis.approachType}
                sx={{ 
                  bgcolor: getApproachTypeColor(analysis.approachType),
                  color: 'white',
                }}
              />
              <Chip 
                label={`${analysis.checkType}チェック`}
                variant="outlined"
              />
              <Chip 
                label={`難易度: ${analysis.adjustedDifficulty}`}
                color={getDifficultyColor(analysis.adjustedDifficulty)}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <CreativityIcon color={getScoreColor(analysis.creativity)} />
                    <Typography variant="h5" color={getScoreColor(analysis.creativity) + '.main'}>
                      {analysis.creativity}
                    </Typography>
                  </Box>
                  <Typography variant="caption">創造性</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <LogicIcon color={getScoreColor(analysis.logicality)} />
                    <Typography variant="h5" color={getScoreColor(analysis.logicality) + '.main'}>
                      {analysis.logicality}
                    </Typography>
                  </Box>
                  <Typography variant="caption">論理性</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <AppropriateneIcon color={getScoreColor(analysis.appropriateness)} />
                    <Typography variant="h5" color={getScoreColor(analysis.appropriateness) + '.main'}>
                      {analysis.appropriateness}
                    </Typography>
                  </Box>
                  <Typography variant="caption">適切性</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <FeasibilityIcon color={getScoreColor(analysis.feasibility)} />
                    <Typography variant="h5" color={getScoreColor(analysis.feasibility) + '.main'}>
                      {analysis.feasibility}
                    </Typography>
                  </Box>
                  <Typography variant="caption">実現可能性</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* AI評価 */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EvaluationIcon />
              <Typography variant="subtitle1">AI評価</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                評価理由
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {analysis.aiEvaluation.reasoning}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                励ましのメッセージ
              </Typography>
              <Alert severity="success" sx={{ mb: 2 }}>
                {analysis.aiEvaluation.encouragement}
              </Alert>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                改善提案
              </Typography>
              <List dense>
                {analysis.aiEvaluation.suggestions.map((suggestion, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <IdeaIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText primary={suggestion} />
                  </ListItem>
                ))}
              </List>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                リスク評価
              </Typography>
              <Alert severity="warning">
                {analysis.aiEvaluation.riskAssessment}
              </Alert>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* 難易度修正 */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DifficultyIcon />
              <Typography variant="subtitle1">
                難易度調整 ({analysis.baseDifficulty} → {analysis.adjustedDifficulty})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {analysis.difficultyModifiers.map((modifier) => (
                <ListItem key={modifier.id}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {modifier.name}
                        </Typography>
                        <Chip 
                          label={`${modifier.modifier > 0 ? '+' : ''}${modifier.modifier}`}
                          size="small"
                          color={modifier.modifier > 0 ? 'error' : 'success'}
                        />
                      </Box>
                    }
                    secondary={modifier.reasoning}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* 推奨アクション */}
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              推奨アクション
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {currentAnalysis.recommendedAction}
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>
              チェック詳細
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentAnalysis.checkInstructions.description}
            </Typography>
          </CardContent>
          <CardActions>
            {onExecuteAction && (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => onExecuteAction(analysis)}
              >
                このアプローチで実行
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<RetryIcon />}
              onClick={() => {
                setPlayerInput('');
                setExpandedSection('input');
              }}
            >
              別のアプローチを試す
            </Button>
          </CardActions>
        </Card>

        {/* 代替アプローチ */}
        {currentAnalysis.alternativeApproaches.length > 0 && (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                代替アプローチの提案
              </Typography>
              <List dense>
                {currentAnalysis.alternativeApproaches.map((alternative, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <ImprovementIcon color="info" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={alternative}
                      onClick={() => setPlayerInput(alternative)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnalysisIcon color="primary" />
          <Typography variant="h6">
            アプローチ分析・難易度判定
          </Typography>
          {currentAnalysis && (
            <Chip 
              label={`処理時間: ${currentAnalysis.analysis.processingTime}ms`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* メインコンテンツ */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <Accordion 
          expanded={expandedSection === 'input'}
          onChange={() => setExpandedSection(expandedSection === 'input' ? '' : 'input')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">アプローチ入力</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <InputSection />
          </AccordionDetails>
        </Accordion>

        <Accordion 
          expanded={expandedSection === 'results'}
          onChange={() => setExpandedSection(expandedSection === 'results' ? '' : 'results')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">分析結果</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <AnalysisResultsSection />
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* 履歴ダイアログ */}
      <Dialog 
        open={showHistory} 
        onClose={() => setShowHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>分析履歴</DialogTitle>
        <DialogContent>
          {analysisHistory.length === 0 ? (
            <Alert severity="info">まだ分析履歴がありません</Alert>
          ) : (
            <List>
              {analysisHistory.map((analysis) => (
                <ListItem 
                  key={analysis.id}
                  button
                  onClick={() => {
                    setCurrentAnalysis({
                      analysis,
                      recommendedAction: '',
                      alternativeApproaches: [],
                      checkInstructions: {
                        type: analysis.checkType,
                        difficulty: analysis.adjustedDifficulty,
                        skills: analysis.recommendedSkills,
                        description: '',
                      },
                    });
                    setShowHistory(false);
                    setExpandedSection('results');
                  }}
                  sx={{ border: 1, borderColor: 'divider', mb: 1, borderRadius: 1 }}
                >
                  <ListItemText
                    primary={analysis.playerInput.substring(0, 100) + '...'}
                    secondary={
                      <Box>
                        <Typography variant="caption">
                          {analysis.approachType} | 難易度: {analysis.adjustedDifficulty} | 
                          創造性: {analysis.creativity} | 
                          {new Date(analysis.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};