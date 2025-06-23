import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import {
  PsychologyRounded,
  ChatRounded,
  SendRounded,
  ExpandMoreRounded,
  LightbulbRounded,
  TargetRounded,
  AutoAwesomeRounded,
  HelpOutlineRounded,
} from '@mui/icons-material';
import {
  AITaskDefinition,
  Character,
  EventChoice,
  SessionContext,
} from '@ai-agent-trpg/types';

interface TaskDialoguePanelProps {
  taskDefinition: AITaskDefinition;
  character: Character;
  selectedChoice: EventChoice;
  sessionContext: SessionContext;
  playerSolution: string;
  loading?: boolean;
  disabled?: boolean;
  onSolutionChange: (solution: string) => void;
  onSolutionSubmit: () => void;
  onRequestHint?: () => void;
  showAdvancedOptions?: boolean;
}

interface SolutionAnalysis {
  creativity: number;
  feasibility: number;
  riskLevel: number;
  estimatedDifficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme';
  suggestions: string[];
}

export const TaskDialoguePanel: React.FC<TaskDialoguePanelProps> = ({
  taskDefinition,
  character,
  selectedChoice,
  _sessionContext,
  playerSolution,
  loading = false,
  disabled = false,
  onSolutionChange,
  onSolutionSubmit,
  onRequestHint,
  showAdvancedOptions = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [localSolution, setLocalSolution] = useState(playerSolution);
  const [charCount, setCharCount] = useState(playerSolution.length);
  const [analysis, setAnalysis] = useState<SolutionAnalysis | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // プレビュー解析（実際のAI分析のモック）
  const analyzeApproach = (solution: string): SolutionAnalysis => {
    const wordCount = solution.split(/\s+/).filter(word => word.length > 0).length;
    const uniqueWords = new Set(solution.toLowerCase().split(/\s+/)).size;
    const creativityKeywords = ['創意', '工夫', '独自', '新しい', '違う', 'ユニーク', '特別'];
    const riskKeywords = ['危険', 'リスク', '無謀', '強引', '急い'];
    const cautionKeywords = ['慎重', '安全', '確実', '準備'];
    
    const creativity = Math.min(100, 
      (uniqueWords / Math.max(wordCount, 1)) * 100 + 
      creativityKeywords.reduce((acc, word) => acc + (solution.includes(word) ? 20 : 0), 0)
    );
    
    const riskLevel = Math.min(100,
      riskKeywords.reduce((acc, word) => acc + (solution.includes(word) ? 25 : 0), 0) -
      cautionKeywords.reduce((acc, word) => acc + (solution.includes(word) ? 15 : 0), 0) + 20
    );
    
    const feasibility = Math.max(0, 100 - riskLevel + (wordCount > 10 ? 20 : 0));
    
    let estimatedDifficulty: SolutionAnalysis['estimatedDifficulty'] = 'medium';
    const difficultyScore = Math.max(0, 100 - creativity - feasibility + riskLevel);
    
    if (difficultyScore < 20) estimatedDifficulty = 'trivial';
    else if (difficultyScore < 40) estimatedDifficulty = 'easy';
    else if (difficultyScore < 60) estimatedDifficulty = 'medium';
    else if (difficultyScore < 80) estimatedDifficulty = 'hard';
    else estimatedDifficulty = 'extreme';

    const suggestions: string[] = [];
    if (creativity < 30) suggestions.push('より創造的なアプローチを考えてみましょう');
    if (feasibility < 50) suggestions.push('実現可能性を高める方法を検討してください');
    if (riskLevel > 70) suggestions.push('リスクを軽減する手段を考慮してください');
    if (wordCount < 5) suggestions.push('詳細な計画を追加してください');

    return {
      creativity: Math.round(creativity),
      feasibility: Math.round(feasibility),
      riskLevel: Math.round(riskLevel),
      estimatedDifficulty,
      suggestions,
    };
  };

  // ソリューション変更ハンドラ
  const handleSolutionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSolution = event.target.value;
    setLocalSolution(newSolution);
    setCharCount(newSolution.length);
    onSolutionChange(newSolution);

    // リアルタイム分析
    if (newSolution.trim().length > 10) {
      setAnalysis(analyzeApproach(newSolution));
    } else {
      setAnalysis(null);
    }
  };

  // 提案例を挿入
  const insertSuggestion = (suggestion: string) => {
    const currentText = localSolution;
    const newText = currentText ? `${currentText}\n\n${suggestion}` : suggestion;
    setLocalSolution(newText);
    onSolutionChange(newText);
    textAreaRef.current?.focus();
  };

  // 難易度の色取得
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'trivial': return 'success';
      case 'easy': return 'info';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      case 'extreme': return 'error';
      default: return 'default';
    }
  };

  // キャラクター関連の提案を生成
  const getCharacterBasedSuggestions = (): string[] => {
    const suggestions: string[] = [];
    
    // キャラクターのクラスに基づく提案
    if (character.class.includes('戦士') || character.class.includes('ファイター')) {
      suggestions.push('戦闘技術や体力を活かした直接的なアプローチ');
    }
    if (character.class.includes('魔法使い') || character.class.includes('ウィザード')) {
      suggestions.push('魔法の知識や呪文を使用した解決法');
    }
    if (character.class.includes('盗賊') || character.class.includes('ローグ')) {
      suggestions.push('隠密行動や器用さを利用した巧妙な手段');
    }
    if (character.class.includes('僧侶') || character.class.includes('クレリック')) {
      suggestions.push('信仰の力や癒しの能力を活用した方法');
    }

    // スキルに基づく提案（仮実装）
    suggestions.push('交渉や説得を通じた平和的解決');
    suggestions.push('周囲の環境や道具を巧みに利用');
    suggestions.push('他のキャラクターとの連携を活かした作戦');

    return suggestions;
  };

  const characterSuggestions = getCharacterBasedSuggestions();

  useEffect(() => {
    setLocalSolution(playerSolution);
    setCharCount(playerSolution.length);
  }, [playerSolution]);

  return (
    <Box>
      {/* AIタスク解釈結果 */}
      <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <PsychologyRounded color="primary" />
            <Typography variant="h6">
              AIタスク解釈
            </Typography>
            <Tooltip title="AIが選択肢を分析し、具体的なタスクに変換しました">
              <HelpOutlineRounded fontSize="small" color="action" />
            </Tooltip>
          </Box>

          <Typography variant="body1" paragraph>
            <strong>選択した行動:</strong> {selectedChoice.text}
          </Typography>

          <Typography variant="body1" paragraph>
            {taskDefinition.interpretation}
          </Typography>

          <Box display="flex" alignItems="center" gap={2} mt={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <TargetRounded fontSize="small" color="primary" />
              <Typography variant="subtitle2">目標:</Typography>
            </Box>
            <Typography variant="body2">{taskDefinition.objective}</Typography>
          </Box>

          <Box mt={1}>
            <Chip
              label={`推定難易度: ${taskDefinition.estimatedDifficulty}`}
              color={getDifficultyColor(taskDefinition.estimatedDifficulty)}
              size="small"
            />
          </Box>

          {/* 詳細情報の表示切り替え */}
          <Accordion sx={{ mt: 2, bgcolor: 'transparent' }}>
            <AccordionSummary
              expandIcon={<ExpandMoreRounded />}
              onClick={() => setShowDetails(!showDetails)}
            >
              <Typography variant="subtitle2">詳細情報</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {taskDefinition.approach.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>推奨アプローチ:</Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {taskDefinition.approach.map((approach, index) => (
                        <li key={index}>
                          <Typography variant="body2">{approach}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}

                {taskDefinition.constraints.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>制約条件:</Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {taskDefinition.constraints.map((constraint, index) => (
                        <li key={index}>
                          <Typography variant="body2" color="warning.main">{constraint}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}

                {taskDefinition.successCriteria.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>成功条件:</Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {taskDefinition.successCriteria.map((criteria, index) => (
                        <li key={index}>
                          <Typography variant="body2" color="success.main">{criteria}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* 解決方法入力エリア */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <ChatRounded color="primary" />
          <Typography variant="h6">
            解決方法を入力してください
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          創造的で詳細なアプローチほど成功の可能性が高まります。
          キャラクターの能力や状況を考慮した解決策を考えましょう。
        </Alert>

        {/* メインテキストエリア */}
        <TextField
          inputRef={textAreaRef}
          multiline
          rows={6}
          fullWidth
          variant="outlined"
          placeholder="どのようにこのタスクを解決しますか？詳細な計画や手順、使用する能力やアイテムなども含めて記述してください。"
          value={localSolution}
          onChange={handleSolutionChange}
          disabled={disabled || loading}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              fontSize: '14px',
              lineHeight: 1.5,
            }
          }}
        />

        {/* 文字数カウンター */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="caption" color="text.secondary">
            文字数: {charCount} / 推奨: 50文字以上
          </Typography>
          {onRequestHint && (
            <Button
              size="small"
              startIcon={<LightbulbRounded />}
              onClick={onRequestHint}
              disabled={loading}
            >
              ヒントを表示
            </Button>
          )}
        </Box>

        {/* リアルタイム分析結果 */}
        {analysis && (
          <Card sx={{ mb: 2, bgcolor: 'background.default' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <AutoAwesomeRounded color="primary" fontSize="small" />
                <Typography variant="subtitle2">アプローチ分析</Typography>
              </Box>

              <Stack spacing={1}>
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption">創造性</Typography>
                    <Typography variant="caption">{analysis.creativity}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analysis.creativity}
                    color={analysis.creativity > 70 ? 'success' : analysis.creativity > 40 ? 'warning' : 'error'}
                  />
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption">実現可能性</Typography>
                    <Typography variant="caption">{analysis.feasibility}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analysis.feasibility}
                    color={analysis.feasibility > 70 ? 'success' : analysis.feasibility > 40 ? 'warning' : 'error'}
                  />
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption">リスクレベル</Typography>
                    <Typography variant="caption">{analysis.riskLevel}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analysis.riskLevel}
                    color={analysis.riskLevel < 30 ? 'success' : analysis.riskLevel < 60 ? 'warning' : 'error'}
                  />
                </Box>

                <Box mt={1}>
                  <Chip
                    label={`予想難易度: ${analysis.estimatedDifficulty}`}
                    color={getDifficultyColor(analysis.estimatedDifficulty)}
                    size="small"
                  />
                </Box>

                {analysis.suggestions.length > 0 && (
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      改善提案:
                    </Typography>
                    <Stack spacing={0.5}>
                      {analysis.suggestions.map((suggestion, index) => (
                        <Typography key={index} variant="caption" color="warning.main">
                          • {suggestion}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* キャラクター能力に基づく提案 */}
        {showAdvancedOptions && (
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreRounded />}>
              <Box display="flex" alignItems="center" gap={1}>
                <LightbulbRounded fontSize="small" />
                <Typography variant="subtitle2">
                  {character.name}の能力を活かした提案
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {characterSuggestions.map((suggestion, index) => (
                  <Paper
                    key={index}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                    onClick={() => insertSuggestion(suggestion)}
                  >
                    <Typography variant="body2">{suggestion}</Typography>
                  </Paper>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

        {/* 送信ボタン */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button
            variant="contained"
            size="large"
            onClick={onSolutionSubmit}
            disabled={!localSolution.trim() || loading || disabled}
            startIcon={loading ? undefined : <SendRounded />}
            sx={{ minWidth: 140 }}
          >
            {loading ? '評価中...' : '解決方法を評価'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};