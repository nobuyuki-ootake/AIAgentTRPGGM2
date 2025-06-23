import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  TextField,
  Chip,
  Stack,
  Radio,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  AccessTimeRounded,
  FlagRounded,
  CalendarTodayRounded,
  PlayArrowRounded,
  SettingsRounded,
} from '@mui/icons-material';
import { 
  SessionDurationType, 
  SessionDurationConfig, 
  SESSION_DURATION_PRESETS,
  DAY_PERIODS_3_ACTIONS,
  DAY_PERIODS_4_ACTIONS
} from '@ai-agent-trpg/types';

interface SessionDurationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: SessionDurationConfig) => void;
}

export const SessionDurationDialog: React.FC<SessionDurationDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const [selectedType, setSelectedType] = useState<SessionDurationType>('medium');
  const [customConfig, setCustomConfig] = useState<SessionDurationConfig>({
    type: 'custom',
    totalDays: 5,
    actionsPerDay: 3,
    dayPeriods: DAY_PERIODS_3_ACTIONS,
    estimatedPlayTime: 60,
    milestoneCount: 2,
    description: 'カスタム設定',
  });

  const handleTypeChange = (type: SessionDurationType) => {
    setSelectedType(type);
  };

  const handleCustomConfigChange = (field: keyof SessionDurationConfig, value: any) => {
    setCustomConfig(prev => {
      const updated = { ...prev, [field]: value };
      
      // アクション数が変更された場合、日単位分割システムも更新
      if (field === 'actionsPerDay') {
        updated.dayPeriods = value === 3 ? DAY_PERIODS_3_ACTIONS : DAY_PERIODS_4_ACTIONS;
      }
      
      return updated;
    });
  };

  const handleConfirm = () => {
    const config = selectedType === 'custom' ? customConfig : SESSION_DURATION_PRESETS[selectedType];
    onConfirm(config);
  };

  const getCurrentConfig = (): SessionDurationConfig => {
    return selectedType === 'custom' ? customConfig : SESSION_DURATION_PRESETS[selectedType];
  };

  const renderPresetCard = (type: SessionDurationType, config: SessionDurationConfig) => {
    const isSelected = selectedType === type;
    
    return (
      <Card
        key={type}
        sx={{
          cursor: 'pointer',
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          bgcolor: isSelected ? 'primary.light' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: 2,
          },
        }}
        onClick={() => handleTypeChange(type)}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Radio
              checked={isSelected}
              size="small"
              sx={{ p: 0 }}
            />
            <Typography variant="h6" fontWeight="bold">
              {type === 'short' && '短時間'}
              {type === 'medium' && '中時間'}
              {type === 'long' && '長時間'}
              {type === 'custom' && 'カスタム'}
            </Typography>
          </Box>
          
          <Stack spacing={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <CalendarTodayRounded fontSize="small" color="action" />
              <Typography variant="body2">
                {config.totalDays}日間
              </Typography>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <AccessTimeRounded fontSize="small" color="action" />
              <Typography variant="body2">
                約{config.estimatedPlayTime}分
              </Typography>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <FlagRounded fontSize="small" color="action" />
              <Typography variant="body2">
                マイルストーン{config.milestoneCount}個
              </Typography>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <PlayArrowRounded fontSize="small" color="action" />
              <Typography variant="body2">
                1日{config.actionsPerDay}回行動（{config.dayPeriods.map(period => period.name).join('・')}）
              </Typography>
            </Box>
          </Stack>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {config.description}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  const currentConfig = getCurrentConfig();

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsRounded color="primary" />
          <Typography variant="h5" fontWeight="bold">
            セッション時間設定
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          プレイスタイルに合わせてセッションの長さを選択してください
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box mb={4}>
          <Grid container spacing={2}>
            {(['short', 'medium', 'long'] as SessionDurationType[]).map((type) => (
              <Grid item xs={12} md={4} key={type}>
                {renderPresetCard(type, SESSION_DURATION_PRESETS[type])}
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* カスタム設定 */}
        <Box>
          <Typography variant="h6" gutterBottom>
            カスタム設定
          </Typography>
          
          <Card
            sx={{
              cursor: 'pointer',
              border: selectedType === 'custom' ? 2 : 1,
              borderColor: selectedType === 'custom' ? 'primary.main' : 'divider',
              bgcolor: selectedType === 'custom' ? 'primary.light' : 'background.paper',
            }}
            onClick={() => handleTypeChange('custom')}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Radio
                  checked={selectedType === 'custom'}
                  size="small"
                  sx={{ p: 0 }}
                />
                <Typography variant="h6" fontWeight="bold">
                  カスタム設定
                </Typography>
              </Box>
              
              {selectedType === 'custom' && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="総日数"
                      type="number"
                      size="small"
                      value={customConfig.totalDays}
                      onChange={(e) => handleCustomConfigChange('totalDays', parseInt(e.target.value))}
                      inputProps={{ min: 1, max: 30 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>1日の行動回数</InputLabel>
                      <Select
                        value={customConfig.actionsPerDay}
                        label="1日の行動回数"
                        onChange={(e) => handleCustomConfigChange('actionsPerDay', e.target.value)}
                      >
                        <MenuItem value={3}>3回（朝・昼・夜）</MenuItem>
                        <MenuItem value={4}>4回（朝・昼・夕方・夜）</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="推定プレイ時間（分）"
                      type="number"
                      size="small"
                      value={customConfig.estimatedPlayTime}
                      onChange={(e) => handleCustomConfigChange('estimatedPlayTime', parseInt(e.target.value))}
                      inputProps={{ min: 10, max: 300 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="マイルストーン数"
                      type="number"
                      size="small"
                      value={customConfig.milestoneCount}
                      onChange={(e) => handleCustomConfigChange('milestoneCount', parseInt(e.target.value))}
                      inputProps={{ min: 1, max: 10 }}
                    />
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* 選択された設定の概要 */}
        <Box>
          <Typography variant="h6" gutterBottom>
            選択された設定
          </Typography>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip
                  icon={<CalendarTodayRounded />}
                  label={`${currentConfig.totalDays}日間`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  icon={<AccessTimeRounded />}
                  label={`約${currentConfig.estimatedPlayTime}分`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  icon={<FlagRounded />}
                  label={`マイルストーン${currentConfig.milestoneCount}個`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  icon={<PlayArrowRounded />}
                  label={`1日${currentConfig.actionsPerDay}回行動`}
                  color="primary"
                  variant="outlined"
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                日単位分割: {currentConfig.dayPeriods.map(period => period.name).join(' → ')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                総行動回数: {currentConfig.totalDays * currentConfig.actionsPerDay}回
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          startIcon={<PlayArrowRounded />}
        >
          この設定でセッション開始
        </Button>
      </DialogActions>
    </Dialog>
  );
};