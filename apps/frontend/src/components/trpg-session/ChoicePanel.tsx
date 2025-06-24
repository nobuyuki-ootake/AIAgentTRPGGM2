import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  PsychologyRounded,
  InfoRounded,
  WarningRounded,
  CheckCircleRounded,
} from '@mui/icons-material';
import { EventChoice, Character } from '@ai-agent-trpg/types';

interface ChoicePanelProps {
  choices: EventChoice[];
  selectedChoice: EventChoice | null;
  character: Character;
  loading?: boolean;
  disabled?: boolean;
  showRequirements?: boolean;
  showConsequences?: boolean;
  onChoiceSelect: (choice: EventChoice) => void;
  onChoiceHover?: (choice: EventChoice | null) => void;
}

export const ChoicePanel: React.FC<ChoicePanelProps> = ({
  choices,
  selectedChoice,
  character,
  loading = false,
  disabled = false,
  showRequirements = true,
  showConsequences = false,
  onChoiceSelect,
  onChoiceHover,
}) => {
  // 選択肢の要件チェック
  const checkRequirements = (choice: EventChoice): { 
    met: boolean; 
    failed: string[]; 
    warnings: string[];
  } => {
    const failed: string[] = [];
    const warnings: string[] = [];

    if (!choice.requirements) {
      return { met: true, failed, warnings };
    }

    choice.requirements.forEach(req => {
      switch (req.type) {
        case 'character_level':
          if (character.level < req.value) {
            failed.push(`レベル ${req.value} 以上が必要 (現在: ${character.level})`);
          }
          break;
        
        case 'skill_check':
          // スキル値のチェック（仮実装）
          const skillValue = 10; // TODO: 実際のスキル値を取得
          if (skillValue < req.value) {
            warnings.push(`${req.description} (推奨値: ${req.value}, 現在: ${skillValue})`);
          }
          break;
        
        case 'item_possession':
          // アイテム所持チェック（仮実装）
          warnings.push(`必要アイテム: ${req.description}`);
          break;
        
        case 'story_flag':
          // ストーリーフラグチェック（仮実装）
          warnings.push(`条件: ${req.description}`);
          break;
        
        default:
          warnings.push(req.description);
      }
    });

    return { 
      met: failed.length === 0, 
      failed, 
      warnings 
    };
  };

  // 選択肢の結果予想を表示
  const getConsequencePreview = (choice: EventChoice): string[] => {
    if (!choice.consequences) return [];
    
    return choice.consequences.map(consequence => {
      switch (consequence.type) {
        case 'reward':
          return `報酬: ${consequence.description}`;
        case 'penalty':
          return `リスク: ${consequence.description}`;
        case 'story_progression':
          return `ストーリー: ${consequence.description}`;
        case 'relationship_change':
          return `関係性: ${consequence.description}`;
        default:
          return consequence.description;
      }
    });
  };

  // 選択肢の難易度ヒント（仮実装）
  const getDifficultyHint = (choice: EventChoice): {
    level: 'easy' | 'medium' | 'hard' | 'unknown';
    description: string;
  } => {
    // 実際のAI評価結果を使用する場合はここを変更
    const textLength = choice.description.length;
    if (textLength < 50) {
      return { level: 'easy', description: '比較的簡単' };
    } else if (textLength < 100) {
      return { level: 'medium', description: '中程度の難易度' };
    } else {
      return { level: 'hard', description: '高難易度' };
    }
  };

  if (choices.length === 0) {
    return (
      <Alert severity="info" icon={<InfoRounded />}>
        利用可能な選択肢がありません
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <PsychologyRounded color="primary" />
        <Typography variant="h6">
          行動を選択してください
        </Typography>
        <Tooltip title="選択肢をクリックして行動を決定します">
          <InfoRounded fontSize="small" color="action" />
        </Tooltip>
      </Box>

      <Stack spacing={2}>
        {choices.map((choice, index) => {
          const isSelected = selectedChoice?.id === choice.id;
          const requirements = checkRequirements(choice);
          const consequences = getConsequencePreview(choice);
          const difficulty = getDifficultyHint(choice);
          const isClickable = !loading && !disabled && requirements.met;

          return (
            <Paper
              key={choice.id}
              data-testid={`choice-option-${index}`}
              sx={{
                p: 2,
                cursor: isClickable ? 'pointer' : 'not-allowed',
                border: 2,
                borderColor: isSelected 
                  ? 'primary.main' 
                  : requirements.met 
                    ? 'divider' 
                    : 'error.main',
                bgcolor: isSelected 
                  ? 'primary.50' 
                  : !requirements.met 
                    ? 'error.50' 
                    : 'background.paper',
                opacity: (!requirements.met || disabled) ? 0.7 : 1,
                transition: 'all 0.2s ease-in-out',
                '&:hover': isClickable ? {
                  bgcolor: isSelected ? 'primary.100' : 'action.hover',
                  borderColor: 'primary.light',
                  transform: 'translateY(-1px)',
                  boxShadow: 2,
                } : {},
              }}
              onClick={() => isClickable && onChoiceSelect(choice)}
              onMouseEnter={() => onChoiceHover?.(choice)}
              onMouseLeave={() => onChoiceHover?.(null)}
            >
              {/* 選択肢のヘッダー */}
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold" color={isSelected ? 'primary.main' : 'text.primary'}>
                  {choice.text}
                </Typography>
                
                <Box display="flex" gap={0.5}>
                  {/* 難易度表示 */}
                  <Chip
                    label={difficulty.description}
                    size="small"
                    color={
                      difficulty.level === 'easy' ? 'success' :
                      difficulty.level === 'medium' ? 'warning' : 'error'
                    }
                    variant="outlined"
                  />
                  
                  {/* 要件ステータス */}
                  {requirements.met ? (
                    <Tooltip title="要件を満たしています">
                      <CheckCircleRounded color="success" fontSize="small" />
                    </Tooltip>
                  ) : (
                    <Tooltip title={`要件不足: ${requirements.failed.join(', ')}`}>
                      <WarningRounded color="error" fontSize="small" />
                    </Tooltip>
                  )}
                </Box>
              </Box>

              {/* 選択肢の説明 */}
              <Typography variant="body2" color="text.secondary" mb={1}>
                {choice.description}
              </Typography>

              {/* 要件表示 */}
              {showRequirements && (requirements.failed.length > 0 || requirements.warnings.length > 0) && (
                <Box mt={1}>
                  {requirements.failed.length > 0 && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      <Typography variant="caption">
                        <strong>要件不足:</strong>
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {requirements.failed.map((failure, idx) => (
                          <li key={idx}>
                            <Typography variant="caption">{failure}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                  
                  {requirements.warnings.length > 0 && (
                    <Alert severity="warning">
                      <Typography variant="caption">
                        <strong>注意:</strong>
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {requirements.warnings.map((warning, idx) => (
                          <li key={idx}>
                            <Typography variant="caption">{warning}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                </Box>
              )}

              {/* 結果予想表示 */}
              {showConsequences && consequences.length > 0 && (
                <Box mt={1}>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    予想される結果:
                  </Typography>
                  <Stack spacing={0.5}>
                    {consequences.map((consequence, idx) => (
                      <Typography key={idx} variant="caption" color="text.secondary">
                        • {consequence}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* 選択中インジケーター */}
              {isSelected && (
                <Box mt={1} display="flex" alignItems="center" gap={1}>
                  <CheckCircleRounded color="primary" fontSize="small" />
                  <Typography variant="caption" color="primary.main" fontWeight="bold">
                    選択中
                  </Typography>
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>

      {/* 選択肢の説明 */}
      <Box mt={2}>
        <Alert severity="info" icon={<InfoRounded />}>
          <Typography variant="caption">
            各選択肢はあなたのキャラクターの能力や状況に基づいて評価されます。
            創造的で独自のアプローチを取ることで、難易度を下げることができる場合があります。
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};