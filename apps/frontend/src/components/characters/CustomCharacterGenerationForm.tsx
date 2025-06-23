import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  AutoAwesomeRounded,
  PersonAddRounded,
} from '@mui/icons-material';
import { Character, CharacterType } from '@ai-agent-trpg/types';
import { generateSingleCharacter } from '../../api/aiCharacterGeneration';

interface CustomCharacterData {
  name: string;
  characterClass: string;
  race: string;
  personality: string;
  background?: string;
  appearance?: string;
  goals?: string;
  traits?: string[];
}

interface CustomCharacterGenerationFormProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  onCharacterGenerated: (character: Character) => void;
}

export const CustomCharacterGenerationForm: React.FC<CustomCharacterGenerationFormProps> = ({
  open,
  onClose,
  campaignId,
  onCharacterGenerated,
}) => {
  const [formData, setFormData] = useState<CustomCharacterData>({
    name: '',
    characterClass: '',
    race: '',
    personality: '',
    background: '',
    appearance: '',
    goals: '',
    traits: [],
  });
  const [characterType, setCharacterType] = useState<CharacterType>('PC');
  const [newTrait, setNewTrait] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 削除: 未使用の定数配列

  const handleInputChange = (field: keyof CustomCharacterData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleAddTrait = () => {
    if (newTrait.trim() && !formData.traits?.includes(newTrait.trim())) {
      setFormData(prev => ({
        ...prev,
        traits: [...(prev.traits || []), newTrait.trim()],
      }));
      setNewTrait('');
    }
  };

  const handleRemoveTrait = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      traits: (prev.traits || []).filter(t => t !== trait),
    }));
  };

  const handleGenerate = async () => {
    // 基本項目の検証
    if (!formData.name.trim() || !formData.characterClass.trim() || !formData.race.trim() || !formData.personality.trim()) {
      setError('名前、職業、種族、性格は必須項目です');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // カスタム説明を構築
      const description = `
名前: ${formData.name}
職業: ${formData.characterClass}
種族: ${formData.race}
性格: ${formData.personality}
${formData.background ? `背景: ${formData.background}` : ''}
${formData.appearance ? `外見: ${formData.appearance}` : ''}
${formData.goals ? `目標: ${formData.goals}` : ''}
${formData.traits && formData.traits.length > 0 ? `特徴: ${formData.traits.join(', ')}` : ''}
      `.trim();

      // AI APIを呼び出し
      const generatedCharacter = await generateSingleCharacter(
        campaignId,
        characterType,
        description,
        'google'
      );

      // 生成されたキャラクターのプロパティを更新
      const updatedCharacter = {
        ...generatedCharacter,
        name: formData.name, // プレイヤーが入力した名前を使用
        characterClass: formData.characterClass, // プレイヤーが入力した職業を使用
        // その他のフィールドはAIが生成した値を使用
      };

      onCharacterGenerated(updatedCharacter);
      handleClose();
    } catch (error) {
      console.error('Character generation failed:', error);
      setError(error instanceof Error ? error.message : 'キャラクター生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      characterClass: '',
      race: '',
      personality: '',
      background: '',
      appearance: '',
      goals: '',
      traits: [],
    });
    setCharacterType('PC');
    setNewTrait('');
    setError(null);
    setIsGenerating(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddRounded color="primary" />
          <Typography variant="h6">
            カスタムキャラクター生成
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          キャラクターの基本情報を入力してください。AIがその情報に基づいて詳細なステータスと設定を生成します。
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* キャラクタータイプ */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>キャラクタータイプ</InputLabel>
              <Select
                value={characterType}
                onChange={(e) => setCharacterType(e.target.value as CharacterType)}
                label="キャラクタータイプ"
              >
                <MenuItem value="PC">プレイヤーキャラクター (PC)</MenuItem>
                <MenuItem value="NPC">ノンプレイヤーキャラクター (NPC)</MenuItem>
                <MenuItem value="Enemy">敵キャラクター</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* 基本情報 */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="名前 *"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="例: アリア・ストームウィンド"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="職業 *"
              value={formData.characterClass}
              onChange={(e) => handleInputChange('characterClass', e.target.value)}
              placeholder="例: 戦士"
              helperText="例: 戦士、魔法使い、盗賊など"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="種族 *"
              value={formData.race}
              onChange={(e) => handleInputChange('race', e.target.value)}
              placeholder="例: エルフ"
              helperText="例: 人間、エルフ、ドワーフなど"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="性格 *"
              value={formData.personality}
              onChange={(e) => handleInputChange('personality', e.target.value)}
              placeholder="例: 勇敢で正義感が強い"
            />
          </Grid>

          {/* 詳細情報 */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="背景・経歴"
              value={formData.background}
              onChange={(e) => handleInputChange('background', e.target.value)}
              placeholder="例: 騎士団の元隊長。家族を失った復讐を誓っている。"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="外見"
              value={formData.appearance}
              onChange={(e) => handleInputChange('appearance', e.target.value)}
              placeholder="例: 金髪で青い瞳、傷だらけの鎧を身に着けている。"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="目標・動機"
              value={formData.goals}
              onChange={(e) => handleInputChange('goals', e.target.value)}
              placeholder="例: 世界を脅かす古代の悪を倒すこと"
            />
          </Grid>

          {/* 特徴タグ */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              特徴・特技
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                label="特徴を追加"
                value={newTrait}
                onChange={(e) => setNewTrait(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTrait()}
                placeholder="例: 剣術の達人"
              />
              <Button variant="outlined" size="small" onClick={handleAddTrait}>
                追加
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {formData.traits?.map((trait, index) => (
                <Chip
                  key={index}
                  label={trait}
                  onDelete={() => handleRemoveTrait(trait)}
                  size="small"
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isGenerating}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={isGenerating || !formData.name.trim() || !formData.characterClass.trim() || !formData.race.trim() || !formData.personality.trim()}
          startIcon={isGenerating ? <CircularProgress size={20} /> : <AutoAwesomeRounded />}
        >
          {isGenerating ? 'AI生成中...' : 'AIで生成'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};