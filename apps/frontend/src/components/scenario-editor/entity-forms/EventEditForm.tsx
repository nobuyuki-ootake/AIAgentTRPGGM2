import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

export interface EntityEditFormProps {
  entity: any;
  onEntityUpdate: (updates: Partial<any>) => void;
}

interface EventEditFormProps extends EntityEditFormProps {
  entity: any; // TRPGEvent type
}

export const EventEditForm: React.FC<EventEditFormProps> = ({
  entity,
  onEntityUpdate
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 基本情報 */}
      <TextField
        label="名前"
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
      
      {/* イベントタイプ */}
      <FormControl fullWidth>
        <InputLabel>イベントタイプ</InputLabel>
        <Select
          value={entity.type || 'story'}
          label="イベントタイプ"
          onChange={(e) => onEntityUpdate({ type: e.target.value })}
        >
          <MenuItem value="story">ストーリー</MenuItem>
          <MenuItem value="combat">戦闘</MenuItem>
          <MenuItem value="social">社交</MenuItem>
          <MenuItem value="exploration">探索</MenuItem>
          <MenuItem value="puzzle">パズル</MenuItem>
          <MenuItem value="rest">休息</MenuItem>
        </Select>
      </FormControl>
      
      {/* 難易度 */}
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
      
      {/* 所要時間 */}
      <TextField
        label="所要時間（分）"
        type="number"
        fullWidth
        value={entity.duration || 30}
        onChange={(e) => onEntityUpdate({ duration: parseInt(e.target.value) || 30 })}
        variant="outlined"
      />
      
      {/* 経験値 */}
      <TextField
        label="経験値"
        type="number"
        fullWidth
        value={entity.outcomes?.experience || 100}
        onChange={(e) => onEntityUpdate({
          outcomes: {...(entity.outcomes || {}), experience: parseInt(e.target.value) || 100}
        })}
        variant="outlined"
      />
      
      {/* 報酬 */}
      <TextField
        label="報酬（改行区切り）"
        fullWidth
        multiline
        rows={2}
        value={(entity.outcomes?.rewards || []).join('\n')}
        onChange={(e) => onEntityUpdate({
          outcomes: {
            ...(entity.outcomes || {}),
            rewards: e.target.value.split('\n').filter(r => r.trim())
          }
        })}
        variant="outlined"
        placeholder="各報酬を改行区切りで入力"
      />
      
      {/* 結果 */}
      <TextField
        label="結果・影響（改行区切り）"
        fullWidth
        multiline
        rows={2}
        value={(entity.outcomes?.consequences || []).join('\n')}
        onChange={(e) => onEntityUpdate({
          outcomes: {
            ...(entity.outcomes || {}),
            consequences: e.target.value.split('\n').filter(c => c.trim())
          }
        })}
        variant="outlined"
        placeholder="各結果を改行区切りで入力"
      />
    </Box>
  );
};