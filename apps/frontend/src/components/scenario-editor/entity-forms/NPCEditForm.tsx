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
  Slider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Psychology as PsychologyIcon,
  Chat as ChatIcon,
  AutoAwesome as AIIcon,
  MenuBook as StoryIcon,
} from '@mui/icons-material';
import { EntityEditFormProps } from './EventEditForm';

interface NPCEditFormProps extends EntityEditFormProps {
  entity: any; // NPCCharacter/PoolNPC type
}

export const NPCEditForm: React.FC<NPCEditFormProps> = ({
  entity,
  onEntityUpdate
}) => {
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);

  const handlePanelChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Personality traits management
  const addTrait = () => {
    const traits = entity.personality?.traits || entity.aiPersonality?.traits || [];
    onEntityUpdate({
      personality: {
        ...(entity.personality || {}),
        traits: [...traits, '']
      },
      aiPersonality: {
        ...(entity.aiPersonality || {}),
        traits: [...traits, '']
      }
    });
  };

  const updateTrait = (index: number, value: string) => {
    const traits = [...(entity.personality?.traits || entity.aiPersonality?.traits || [])];
    traits[index] = value;
    onEntityUpdate({
      personality: {
        ...(entity.personality || {}),
        traits
      },
      aiPersonality: {
        ...(entity.aiPersonality || {}),
        traits
      }
    });
  };

  const removeTrait = (index: number) => {
    const traits = [...(entity.personality?.traits || entity.aiPersonality?.traits || [])];
    traits.splice(index, 1);
    onEntityUpdate({
      personality: {
        ...(entity.personality || {}),
        traits
      },
      aiPersonality: {
        ...(entity.aiPersonality || {}),
        traits
      }
    });
  };

  // Dialogue patterns management
  const addDialoguePattern = () => {
    const patterns = entity.dialoguePatterns || [];
    const newPattern = {
      trigger: 'greeting',
      responses: [''],
      conditions: []
    };
    onEntityUpdate({
      dialoguePatterns: [...patterns, newPattern]
    });
  };

  const updateDialoguePattern = (index: number, updates: any) => {
    const patterns = [...(entity.dialoguePatterns || [])];
    patterns[index] = { ...patterns[index], ...updates };
    onEntityUpdate({ dialoguePatterns: patterns });
  };

  const removeDialoguePattern = (index: number) => {
    const patterns = [...(entity.dialoguePatterns || [])];
    patterns.splice(index, 1);
    onEntityUpdate({ dialoguePatterns: patterns });
  };

  // Quest involvement management
  const addQuestInvolvement = () => {
    const involvement = entity.storyRole?.questInvolvement || [];
    onEntityUpdate({
      storyRole: {
        ...(entity.storyRole || {}),
        questInvolvement: [...involvement, '']
      }
    });
  };

  const updateQuestInvolvement = (index: number, value: string) => {
    const involvement = [...(entity.storyRole?.questInvolvement || [])];
    involvement[index] = value;
    onEntityUpdate({
      storyRole: {
        ...(entity.storyRole || {}),
        questInvolvement: involvement
      }
    });
  };

  const removeQuestInvolvement = (index: number) => {
    const involvement = [...(entity.storyRole?.questInvolvement || [])];
    involvement.splice(index, 1);
    onEntityUpdate({
      storyRole: {
        ...(entity.storyRole || {}),
        questInvolvement: involvement
      }
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 基本情報 */}
      <Typography variant="h6" gutterBottom>基本情報</Typography>
      
      <TextField
        label="NPC名"
        fullWidth
        value={entity.name || ''}
        onChange={(e) => onEntityUpdate({ name: e.target.value })}
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
          <InputLabel>重要度</InputLabel>
          <Select
            value={entity.importance || 'minor'}
            label="重要度"
            onChange={(e) => onEntityUpdate({ importance: e.target.value })}
          >
            <MenuItem value="major">主要キャラクター</MenuItem>
            <MenuItem value="minor">準主要キャラクター</MenuItem>
            <MenuItem value="background">背景キャラクター</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl fullWidth>
          <InputLabel>基本的態度</InputLabel>
          <Select
            value={entity.disposition || 'neutral'}
            label="基本的態度"
            onChange={(e) => onEntityUpdate({ disposition: e.target.value })}
          >
            <MenuItem value="friendly">友好的</MenuItem>
            <MenuItem value="neutral">中立</MenuItem>
            <MenuItem value="hostile">敵対的</MenuItem>
            <MenuItem value="unknown">不明</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="職業"
          fullWidth
          value={entity.occupation || ''}
          onChange={(e) => onEntityUpdate({ occupation: e.target.value })}
          variant="outlined"
          placeholder="商人、兵士、学者など"
        />
        
        <TextField
          label="所在地"
          fullWidth
          value={entity.location || ''}
          onChange={(e) => onEntityUpdate({ location: e.target.value })}
          variant="outlined"
          placeholder="場所名またはID"
        />
      </Box>
      
      <TextField
        label="関係レベル"
        type="number"
        fullWidth
        value={entity.relationshipLevel || 0}
        onChange={(e) => onEntityUpdate({ relationshipLevel: parseInt(e.target.value) || 0 })}
        variant="outlined"
        helperText="-100（敵対）から 100（親密）まで"
        inputProps={{ min: -100, max: 100 }}
      />

      <Divider sx={{ my: 2 }} />

      {/* 詳細設定 - アコーディオン */}
      <Typography variant="h6" gutterBottom>詳細設定</Typography>

      {/* パーソナリティ設定 */}
      <Accordion expanded={expandedPanel === 'personality'} onChange={handlePanelChange('personality')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <PsychologyIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography>パーソナリティ</Typography>
          {(entity.personality?.traits || entity.aiPersonality?.traits)?.length > 0 && (
            <Chip 
              label={`${(entity.personality?.traits || entity.aiPersonality?.traits).length}個の特徴`} 
              size="small" 
              color="primary" 
              sx={{ ml: 1 }}
            />
          )}
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* 性格特徴 */}
            <Typography variant="subtitle2">性格特徴</Typography>
            {(entity.personality?.traits || entity.aiPersonality?.traits || []).map((trait: string, index: number) => (
              <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label={`特徴 ${index + 1}`}
                  fullWidth
                  value={trait}
                  onChange={(e) => updateTrait(index, e.target.value)}
                  variant="outlined"
                  placeholder="勇敢、慎重、おしゃべりなど"
                />
                <IconButton
                  color="error"
                  onClick={() => removeTrait(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addTrait}
              variant="outlined"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              特徴を追加
            </Button>

            <Divider sx={{ my: 1 }} />

            {/* 目標・動機・恐れ */}
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="目標（改行区切り）"
                  fullWidth
                  multiline
                  rows={3}
                  value={(entity.personality?.goals || entity.aiPersonality?.goals || []).join('\n')}
                  onChange={(e) => {
                    const goals = e.target.value.split('\n').filter(g => g.trim());
                    onEntityUpdate({
                      personality: { ...(entity.personality || {}), goals },
                      aiPersonality: { ...(entity.aiPersonality || {}), goals }
                    });
                  }}
                  variant="outlined"
                  placeholder="短期・長期の目標"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="動機（改行区切り）"
                  fullWidth
                  multiline
                  rows={3}
                  value={(entity.personality?.motivations || entity.aiPersonality?.motivations || []).join('\n')}
                  onChange={(e) => {
                    const motivations = e.target.value.split('\n').filter(m => m.trim());
                    onEntityUpdate({
                      personality: { ...(entity.personality || {}), motivations },
                      aiPersonality: { ...(entity.aiPersonality || {}), motivations }
                    });
                  }}
                  variant="outlined"
                  placeholder="行動の動機"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="恐れ（改行区切り）"
                  fullWidth
                  multiline
                  rows={3}
                  value={(entity.personality?.fears || entity.aiPersonality?.fears || []).join('\n')}
                  onChange={(e) => {
                    const fears = e.target.value.split('\n').filter(f => f.trim());
                    onEntityUpdate({
                      personality: { ...(entity.personality || {}), fears },
                      aiPersonality: { ...(entity.aiPersonality || {}), fears }
                    });
                  }}
                  variant="outlined"
                  placeholder="恐れや不安"
                />
              </Grid>
            </Grid>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* コミュニケーション設定 */}
      <Accordion expanded={expandedPanel === 'communication'} onChange={handlePanelChange('communication')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <ChatIcon sx={{ mr: 1, color: 'success.main' }} />
          <Typography>コミュニケーション設定</Typography>
          {entity.dialoguePatterns?.length > 0 && (
            <Chip 
              label={`${entity.dialoguePatterns.length}パターン`} 
              size="small" 
              color="success" 
              sx={{ ml: 1 }}
            />
          )}
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(entity.dialoguePatterns || []).map((pattern: any, index: number) => (
              <Box key={index} sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>トリガー</InputLabel>
                    <Select
                      value={pattern.trigger || 'greeting'}
                      label="トリガー"
                      onChange={(e) => updateDialoguePattern(index, { trigger: e.target.value })}
                    >
                      <MenuItem value="greeting">挨拶</MenuItem>
                      <MenuItem value="farewell">別れ</MenuItem>
                      <MenuItem value="quest_offer">クエスト提供</MenuItem>
                      <MenuItem value="quest_complete">クエスト完了</MenuItem>
                      <MenuItem value="trade">取引</MenuItem>
                      <MenuItem value="combat">戦闘</MenuItem>
                      <MenuItem value="idle">待機中</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <IconButton
                    color="error"
                    onClick={() => removeDialoguePattern(index)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                
                <TextField
                  label="応答パターン（改行区切り）"
                  fullWidth
                  multiline
                  rows={3}
                  value={(pattern.responses || []).join('\n')}
                  onChange={(e) => updateDialoguePattern(index, {
                    responses: e.target.value.split('\n').filter(r => r.trim())
                  })}
                  variant="outlined"
                  placeholder="複数の応答例を改行区切りで入力"
                />
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addDialoguePattern}
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            >
              会話パターンを追加
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* AI行動設定 */}
      <Accordion expanded={expandedPanel === 'ai-behavior'} onChange={handlePanelChange('ai-behavior')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <AIIcon sx={{ mr: 1, color: 'warning.main' }} />
          <Typography>AI行動設定</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>自律レベル</InputLabel>
              <Select
                value={entity.autonomyLevel || 'assisted'}
                label="自律レベル"
                onChange={(e) => onEntityUpdate({ autonomyLevel: e.target.value })}
              >
                <MenuItem value="manual">手動制御</MenuItem>
                <MenuItem value="assisted">補助付き</MenuItem>
                <MenuItem value="autonomous">完全自律</MenuItem>
              </Select>
            </FormControl>

            {/* 行動パラメータ（-10〜10のスライダー） */}
            <Typography variant="subtitle2" sx={{ mt: 2 }}>行動パラメータ</Typography>
            
            {[
              { key: 'aggressiveness', label: '攻撃性', desc: '争いを好む傾向' },
              { key: 'curiosity', label: '好奇心', desc: '新しいことを探求する傾向' },
              { key: 'loyalty', label: '忠誠心', desc: '仲間への忠実さ' },
              { key: 'caution', label: '慎重さ', desc: 'リスクを避ける傾向' },
              { key: 'sociability', label: '社交性', desc: '他者との交流を好む傾向' }
            ].map(({ key, label, desc }) => (
              <Box key={key} sx={{ px: 2 }}>
                <Typography variant="body2" gutterBottom>
                  {label}: {entity.decisionMaking?.[key] || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  {desc}
                </Typography>
                <Slider
                  value={entity.decisionMaking?.[key] || 0}
                  onChange={(_, value) => onEntityUpdate({
                    decisionMaking: {
                      ...(entity.decisionMaking || {}),
                      [key]: value
                    }
                  })}
                  min={-10}
                  max={10}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* ストーリー統合 */}
      <Accordion expanded={expandedPanel === 'story'} onChange={handlePanelChange('story')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <StoryIcon sx={{ mr: 1, color: 'info.main' }} />
          <Typography>ストーリー統合</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* クエスト関与 */}
            <Typography variant="subtitle2">関連クエスト</Typography>
            {(entity.storyRole?.questInvolvement || []).map((questId: string, index: number) => (
              <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label={`クエスト ${index + 1}`}
                  fullWidth
                  value={questId}
                  onChange={(e) => updateQuestInvolvement(index, e.target.value)}
                  variant="outlined"
                  placeholder="クエストIDまたは名前"
                />
                <IconButton
                  color="error"
                  onClick={() => removeQuestInvolvement(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addQuestInvolvement}
              variant="outlined"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              関連クエストを追加
            </Button>

            <Divider sx={{ my: 1 }} />

            {/* プロットフック・秘密・情報 */}
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="プロットフック（改行区切り）"
                  fullWidth
                  multiline
                  rows={3}
                  value={(entity.storyRole?.plotHooks || []).join('\n')}
                  onChange={(e) => onEntityUpdate({
                    storyRole: {
                      ...(entity.storyRole || {}),
                      plotHooks: e.target.value.split('\n').filter(h => h.trim())
                    }
                  })}
                  variant="outlined"
                  placeholder="ストーリー展開のきっかけ"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="秘密（改行区切り）"
                  fullWidth
                  multiline
                  rows={3}
                  value={(entity.storyRole?.secrets || []).join('\n')}
                  onChange={(e) => onEntityUpdate({
                    storyRole: {
                      ...(entity.storyRole || {}),
                      secrets: e.target.value.split('\n').filter(s => s.trim())
                    }
                  })}
                  variant="outlined"
                  placeholder="隠された秘密"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="提供情報（改行区切り）"
                  fullWidth
                  multiline
                  rows={3}
                  value={(entity.storyRole?.information || []).join('\n')}
                  onChange={(e) => onEntityUpdate({
                    storyRole: {
                      ...(entity.storyRole || {}),
                      information: e.target.value.split('\n').filter(i => i.trim())
                    }
                  })}
                  variant="outlined"
                  placeholder="提供可能な情報"
                />
              </Grid>
            </Grid>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};