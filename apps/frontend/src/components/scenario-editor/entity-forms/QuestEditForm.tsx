import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Button,
  IconButton,
  Divider,
  Grid,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Flag as FlagIcon,
  EmojiEvents as RewardIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { EntityEditFormProps } from './EventEditForm';

interface QuestEditFormProps extends EntityEditFormProps {
  entity: any; // Quest/PoolQuest type
}

export const QuestEditForm: React.FC<QuestEditFormProps> = ({
  entity,
  onEntityUpdate
}) => {
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);

  const handlePanelChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Objectives management
  const addObjective = () => {
    const newObjective = {
      description: '',
      type: 'general',
      target: '',
      quantity: 1,
      completed: false
    };
    const objectives = entity.objectives || [];
    onEntityUpdate({
      objectives: [...objectives, newObjective]
    });
  };

  const updateObjective = (index: number, updates: any) => {
    const objectives = [...(entity.objectives || [])];
    objectives[index] = { ...objectives[index], ...updates };
    onEntityUpdate({ objectives });
  };

  const removeObjective = (index: number) => {
    const objectives = [...(entity.objectives || [])];
    objectives.splice(index, 1);
    onEntityUpdate({ objectives });
  };

  // Prerequisites management
  const addPrerequisite = () => {
    const prerequisites = entity.prerequisites || [];
    onEntityUpdate({
      prerequisites: [...prerequisites, '']
    });
  };

  const updatePrerequisite = (index: number, value: string) => {
    const prerequisites = [...(entity.prerequisites || [])];
    prerequisites[index] = value;
    onEntityUpdate({ prerequisites });
  };

  const removePrerequisite = (index: number) => {
    const prerequisites = [...(entity.prerequisites || [])];
    prerequisites.splice(index, 1);
    onEntityUpdate({ prerequisites });
  };

  // Story progression management
  const addStoryProgression = () => {
    const storyProgression = entity.rewards?.storyProgression || [];
    onEntityUpdate({
      rewards: {
        ...(entity.rewards || {}),
        storyProgression: [...storyProgression, '']
      }
    });
  };

  const updateStoryProgression = (index: number, value: string) => {
    const storyProgression = [...(entity.rewards?.storyProgression || [])];
    storyProgression[index] = value;
    onEntityUpdate({
      rewards: {
        ...(entity.rewards || {}),
        storyProgression
      }
    });
  };

  const removeStoryProgression = (index: number) => {
    const storyProgression = [...(entity.rewards?.storyProgression || [])];
    storyProgression.splice(index, 1);
    onEntityUpdate({
      rewards: {
        ...(entity.rewards || {}),
        storyProgression
      }
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 基本情報 */}
      <Typography variant="h6" gutterBottom>基本情報</Typography>
      
      <TextField
        label="クエスト名"
        fullWidth
        value={entity.title || entity.name || ''}
        onChange={(e) => onEntityUpdate({ title: e.target.value, name: e.target.value })}
        variant="outlined"
      />
      
      <TextField
        label="説明"
        fullWidth
        multiline
        rows={3}
        value={entity.description || ''}
        onChange={(e) => onEntityUpdate({ description: e.target.value })}
        variant="outlined"
      />
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel>クエストタイプ</InputLabel>
          <Select
            value={entity.type || 'side'}
            label="クエストタイプ"
            onChange={(e) => onEntityUpdate({ type: e.target.value })}
          >
            <MenuItem value="main">メインクエスト</MenuItem>
            <MenuItem value="side">サイドクエスト</MenuItem>
            <MenuItem value="personal">個人クエスト</MenuItem>
            <MenuItem value="discovery">発見クエスト</MenuItem>
            <MenuItem value="faction">派閥クエスト</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl fullWidth>
          <InputLabel>ステータス</InputLabel>
          <Select
            value={entity.status || 'not_started'}
            label="ステータス"
            onChange={(e) => onEntityUpdate({ status: e.target.value })}
          >
            <MenuItem value="not_started">未開始</MenuItem>
            <MenuItem value="active">進行中</MenuItem>
            <MenuItem value="completed">完了</MenuItem>
            <MenuItem value="failed">失敗</MenuItem>
            <MenuItem value="cancelled">キャンセル</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel>難易度</InputLabel>
          <Select
            value={entity.difficulty || 'medium'}
            label="難易度"
            onChange={(e) => onEntityUpdate({ difficulty: e.target.value })}
          >
            <MenuItem value="trivial">簡単</MenuItem>
            <MenuItem value="easy">初級</MenuItem>
            <MenuItem value="medium">中級</MenuItem>
            <MenuItem value="hard">上級</MenuItem>
            <MenuItem value="extreme">最難関</MenuItem>
          </Select>
        </FormControl>
        
        <TextField
          label="予想時間（分）"
          type="number"
          fullWidth
          value={entity.estimatedTime || entity.estimatedDuration || 60}
          onChange={(e) => onEntityUpdate({ 
            estimatedTime: parseInt(e.target.value) || 60,
            estimatedDuration: parseInt(e.target.value) || 60
          })}
          variant="outlined"
        />
        
        <TextField
          label="推奨レベル"
          type="number"
          fullWidth
          value={entity.level || 1}
          onChange={(e) => onEntityUpdate({ level: parseInt(e.target.value) || 1 })}
          variant="outlined"
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 詳細設定 - アコーディオン */}
      <Typography variant="h6" gutterBottom>詳細設定</Typography>

      {/* 目的設定 */}
      <Accordion expanded={expandedPanel === 'objectives'} onChange={handlePanelChange('objectives')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <FlagIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography>クエスト目的</Typography>
          {entity.objectives?.length > 0 && (
            <Chip 
              label={`${entity.objectives.length}個`} 
              size="small" 
              color="primary" 
              sx={{ ml: 1 }}
            />
          )}
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(entity.objectives || []).map((objective: any, index: number) => (
              <Box key={index} sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>目的タイプ</InputLabel>
                    <Select
                      value={objective.type || 'general'}
                      label="目的タイプ"
                      onChange={(e) => updateObjective(index, { type: e.target.value })}
                    >
                      <MenuItem value="general">一般</MenuItem>
                      <MenuItem value="kill">討伐</MenuItem>
                      <MenuItem value="collect">収集</MenuItem>
                      <MenuItem value="deliver">配達</MenuItem>
                      <MenuItem value="explore">探索</MenuItem>
                      <MenuItem value="interact">交流</MenuItem>
                      <MenuItem value="protect">護衛</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label="目標"
                    value={objective.target || ''}
                    onChange={(e) => updateObjective(index, { target: e.target.value })}
                    sx={{ flexGrow: 1 }}
                    placeholder="具体的な目標（モンスター名、アイテム名等）"
                  />
                  
                  <TextField
                    label="数量"
                    type="number"
                    value={objective.quantity || 1}
                    onChange={(e) => updateObjective(index, { quantity: parseInt(e.target.value) || 1 })}
                    sx={{ width: 80 }}
                  />
                  
                  <IconButton
                    color="error"
                    onClick={() => removeObjective(index)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                
                <TextField
                  label="目的説明"
                  fullWidth
                  value={objective.description || ''}
                  onChange={(e) => updateObjective(index, { description: e.target.value })}
                  variant="outlined"
                  placeholder="この目的の詳細説明"
                />
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addObjective}
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            >
              目的を追加
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 報酬設定 */}
      <Accordion expanded={expandedPanel === 'rewards'} onChange={handlePanelChange('rewards')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <RewardIcon sx={{ mr: 1, color: 'warning.main' }} />
          <Typography>報酬設定</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="経験値"
                  type="number"
                  fullWidth
                  value={entity.rewards?.experience || 0}
                  onChange={(e) => onEntityUpdate({
                    rewards: {
                      ...(entity.rewards || {}),
                      experience: parseInt(e.target.value) || 0
                    }
                  })}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="通貨（ゴールド）"
                  type="number"
                  fullWidth
                  value={entity.rewards?.currency || 0}
                  onChange={(e) => onEntityUpdate({
                    rewards: {
                      ...(entity.rewards || {}),
                      currency: parseInt(e.target.value) || 0
                    }
                  })}
                  variant="outlined"
                />
              </Grid>
            </Grid>
            
            <TextField
              label="アイテム報酬（改行区切り）"
              fullWidth
              multiline
              rows={2}
              value={(entity.rewards?.items || []).join('\n')}
              onChange={(e) => onEntityUpdate({
                rewards: {
                  ...(entity.rewards || {}),
                  items: e.target.value.split('\n').filter(item => item.trim())
                }
              })}
              variant="outlined"
              placeholder="各アイテムIDを改行区切りで入力"
            />
            
            <TextField
              label="評判変化（JSON形式）"
              fullWidth
              value={JSON.stringify(entity.rewards?.reputation || {}, null, 2)}
              onChange={(e) => {
                try {
                  const reputation = JSON.parse(e.target.value);
                  onEntityUpdate({
                    rewards: {
                      ...(entity.rewards || {}),
                      reputation
                    }
                  });
                } catch (error) {
                  // JSON解析エラーは無視
                }
              }}
              variant="outlined"
              placeholder='{"商人ギルド": 10, "盗賊団": -5}'
              helperText="派閥名: 評判変化値のペア"
            />

            {/* ストーリー進行項目 */}
            <Typography variant="subtitle2" sx={{ mt: 2 }}>ストーリー進行</Typography>
            {(entity.rewards?.storyProgression || []).map((progression: string, index: number) => (
              <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label={`進行項目 ${index + 1}`}
                  fullWidth
                  value={progression}
                  onChange={(e) => updateStoryProgression(index, e.target.value)}
                  variant="outlined"
                  placeholder="ストーリーの進行・変化"
                />
                <IconButton
                  color="error"
                  onClick={() => removeStoryProgression(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addStoryProgression}
              variant="outlined"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              ストーリー進行を追加
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 関連設定 */}
      <Accordion expanded={expandedPanel === 'relations'} onChange={handlePanelChange('relations')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <LinkIcon sx={{ mr: 1, color: 'info.main' }} />
          <Typography>関連・前提条件</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="クエスト依頼者"
              fullWidth
              value={entity.giver || ''}
              onChange={(e) => onEntityUpdate({ giver: e.target.value })}
              variant="outlined"
              placeholder="NPC名またはID"
            />
            
            <TextField
              label="関連場所"
              fullWidth
              value={entity.location || ''}
              onChange={(e) => onEntityUpdate({ location: e.target.value })}
              variant="outlined"
              placeholder="場所名またはID"
            />
            
            <TextField
              label="制限時間（分）"
              type="number"
              fullWidth
              value={entity.timeLimit || 0}
              onChange={(e) => onEntityUpdate({ timeLimit: parseInt(e.target.value) || 0 })}
              variant="outlined"
              helperText="0 = 制限なし"
            />

            {/* 前提条件 */}
            <Typography variant="subtitle2" sx={{ mt: 2 }}>前提条件</Typography>
            {(entity.prerequisites || []).map((prerequisite: string, index: number) => (
              <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label={`前提条件 ${index + 1}`}
                  fullWidth
                  value={prerequisite}
                  onChange={(e) => updatePrerequisite(index, e.target.value)}
                  variant="outlined"
                  placeholder="クエストIDまたは条件"
                />
                <IconButton
                  color="error"
                  onClick={() => removePrerequisite(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addPrerequisite}
              variant="outlined"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              前提条件を追加
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};