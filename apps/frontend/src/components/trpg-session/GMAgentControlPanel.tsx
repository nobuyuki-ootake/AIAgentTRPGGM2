import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Psychology as PsychologyIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  SmartToy as SmartToyIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import {
  TacticsLevel,
  FocusType,
  EnemyTacticsLevel,
  GMTacticsResponse,
  UpdateTacticsRequest,
  AIDecisionLog,
  ID,
} from '@ai-agent-trpg/types';
import { apiClient } from '../../api/client';
import { AIAgentMonitoringDashboard } from '../ai-monitoring/AIAgentMonitoringDashboard';

interface GMAgentControlPanelProps {
  sessionId: ID;
  onTacticsChange?: (tactics: EnemyTacticsLevel) => void;
  disabled?: boolean;
}

interface GMTacticsAPI {
  getCurrentTactics: (sessionId: ID) => Promise<GMTacticsResponse>;
  updateTactics: (sessionId: ID, request: UpdateTacticsRequest) => Promise<{ success: boolean }>;
}

const gmTacticsAPI: GMTacticsAPI = {
  getCurrentTactics: async (sessionId: ID): Promise<GMTacticsResponse> => {
    const response = await apiClient.get<GMTacticsResponse>(`/ai-agent/gm-tactics?sessionId=${sessionId}`);
    return response;
  },
  updateTactics: async (sessionId: ID, request: UpdateTacticsRequest): Promise<{ success: boolean }> => {
    const response = await apiClient.put<{ success: boolean }>(`/ai-agent/gm-tactics?sessionId=${sessionId}`, request);
    return response;
  }
};

export const GMAgentControlPanel: React.FC<GMAgentControlPanelProps> = ({
  sessionId,
  onTacticsChange,
  disabled = false,
}) => {
  const [currentTactics, setCurrentTactics] = useState<EnemyTacticsLevel>({
    tacticsLevel: 'strategic',
    primaryFocus: 'damage',
    teamwork: true,
  });
  const [recentDecisions, setRecentDecisions] = useState<AIDecisionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [showDecisions, setShowDecisions] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load current tactics settings
  const loadCurrentTactics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await gmTacticsAPI.getCurrentTactics(sessionId);
      setCurrentTactics(response.currentSettings);
      setRecentDecisions(response.recentDecisions);
    } catch (err) {
      setError('戦術設定の読み込みに失敗しました');
      console.error('Failed to load GM tactics:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Apply tactics changes
  const applyTacticsChanges = useCallback(async (newTactics: EnemyTacticsLevel, immediate = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const request: UpdateTacticsRequest = {
        settings: newTactics,
        applyImmediately: immediate,
      };
      
      const result = await gmTacticsAPI.updateTactics(sessionId, request);
      
      if (result.success) {
        setCurrentTactics(newTactics);
        setHasUnsavedChanges(false);
        onTacticsChange?.(newTactics);
        
        // Reload recent decisions after update
        await loadCurrentTactics();
      } else {
        throw new Error('戦術設定の更新に失敗しました');
      }
    } catch (err) {
      setError('戦術設定の更新に失敗しました');
      console.error('Failed to update GM tactics:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, onTacticsChange, loadCurrentTactics]);

  // Handle tactics level change
  const handleTacticsLevelChange = (level: TacticsLevel) => {
    const newTactics = { ...currentTactics, tacticsLevel: level };
    setCurrentTactics(newTactics);
    setHasUnsavedChanges(true);
  };

  // Handle focus type change
  const handleFocusTypeChange = (focus: FocusType) => {
    const newTactics = { ...currentTactics, primaryFocus: focus };
    setCurrentTactics(newTactics);
    setHasUnsavedChanges(true);
  };

  // Handle teamwork toggle
  const handleTeamworkToggle = (teamwork: boolean) => {
    const newTactics = { ...currentTactics, teamwork };
    setCurrentTactics(newTactics);
    setHasUnsavedChanges(true);
  };

  // Save changes
  const handleSaveChanges = () => {
    applyTacticsChanges(currentTactics, true);
  };

  // Reset to current saved settings
  const handleResetChanges = () => {
    loadCurrentTactics();
    setHasUnsavedChanges(false);
  };

  // Load initial data
  useEffect(() => {
    loadCurrentTactics();
  }, [loadCurrentTactics]);

  // Tactics level display names
  const tacticsLevelNames: Record<TacticsLevel, string> = {
    basic: 'Basic - 基本的な戦術',
    strategic: 'Strategic - 戦略的判断',
    cunning: 'Cunning - 狡猾な戦術',
  };

  // Focus type display names
  const focusTypeNames: Record<FocusType, string> = {
    damage: 'Damage - ダメージ重視',
    control: 'Control - 制御・妨害重視',
    survival: 'Survival - 生存重視',
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Card data-testid="gm-agent-control-panel">
      <CardContent>
        {/* ヘッダー */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <SmartToyIcon color="primary" />
            <Typography variant="h6">
              AI Agent制御センター
            </Typography>
            {hasUnsavedChanges && tabValue === 0 && (
              <Chip
                label="未保存"
                color="warning"
                size="small"
                icon={<WarningIcon />}
              />
            )}
          </Box>
          
          <Box display="flex" gap={1}>
            {hasUnsavedChanges && tabValue === 0 && (
              <>
                <Button
                  size="small"
                  onClick={handleResetChanges}
                  disabled={loading || disabled}
                >
                  リセット
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveChanges}
                  disabled={loading || disabled}
                  data-testid="save-tactics-button"
                >
                  保存
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* タブナビゲーション */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              icon={<PsychologyIcon />} 
              label="戦術制御" 
              data-testid="tactics-control-tab"
            />
            <Tab 
              icon={<AssessmentIcon />} 
              label="監視ダッシュボード" 
              data-testid="monitoring-dashboard-tab"
            />
          </Tabs>
        </Box>

        {/* タブコンテンツ */}
        {tabValue === 0 && (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loading && (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            )}

            <Stack spacing={3}>
          {/* 戦術レベル設定 */}
          <FormControl fullWidth disabled={disabled || loading}>
            <InputLabel>戦術レベル</InputLabel>
            <Select
              value={currentTactics.tacticsLevel}
              onChange={(e) => handleTacticsLevelChange(e.target.value as TacticsLevel)}
              label="戦術レベル"
              data-testid="tactics-level-select"
            >
              {Object.entries(tacticsLevelNames).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {value === 'basic' && <SpeedIcon fontSize="small" />}
                    {value === 'strategic' && <SettingsIcon fontSize="small" />}
                    {value === 'cunning' && <SecurityIcon fontSize="small" />}
                    {label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 行動方針設定 */}
          <FormControl fullWidth disabled={disabled || loading}>
            <InputLabel>主要行動方針</InputLabel>
            <Select
              value={currentTactics.primaryFocus}
              onChange={(e) => handleFocusTypeChange(e.target.value as FocusType)}
              label="主要行動方針"
              data-testid="focus-type-select"
            >
              {Object.entries(focusTypeNames).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* チーム連携設定 */}
          <FormControlLabel
            control={
              <Switch
                checked={currentTactics.teamwork}
                onChange={(e) => handleTeamworkToggle(e.target.checked)}
                disabled={disabled || loading}
                data-testid="teamwork-toggle"
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <GroupIcon fontSize="small" />
                チーム連携
              </Box>
            }
          />

          {/* 現在の設定サマリー */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              現在の設定
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={tacticsLevelNames[currentTactics.tacticsLevel]}
                color="primary"
                size="small"
              />
              <Chip
                label={focusTypeNames[currentTactics.primaryFocus]}
                color="secondary"
                size="small"
              />
              <Chip
                label={currentTactics.teamwork ? 'チーム連携ON' : 'チーム連携OFF'}
                color={currentTactics.teamwork ? 'success' : 'default'}
                size="small"
              />
            </Stack>
          </Box>

          {/* 最近の AI 決定ログ */}
          {recentDecisions.length > 0 && (
            <>
              <Divider />
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="subtitle2">
                    最近のAI決定 ({recentDecisions.length})
                  </Typography>
                  <Tooltip title="AI GMの最近の戦術判断を表示">
                    <IconButton
                      size="small"
                      onClick={() => setShowDecisions(!showDecisions)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    size="small"
                    onClick={() => setShowDecisions(!showDecisions)}
                  >
                    {showDecisions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                
                <Collapse in={showDecisions}>
                  <List dense>
                    {recentDecisions.slice(0, 5).map(decision => (
                      <ListItem key={decision.id} divider>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={decision.decisionType.replace('_', ' ').toUpperCase()}
                          secondary={
                            <Box>
                              <Typography variant="body2" component="span">
                                {decision.reasoning}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(decision.timestamp).toLocaleString()} - 
                                適用戦術: {decision.appliedTactics}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </Box>
            </>
          )}
            </Stack>
          </>
        )}

        {/* AI Agent監視ダッシュボードタブ */}
        {tabValue === 1 && (
          <AIAgentMonitoringDashboard
            sessionId={sessionId}
            open={true}
            onClose={() => {}} // タブ内なのでクローズ処理は不要
          />
        )}
      </CardContent>
    </Card>
  );
};