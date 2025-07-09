// ==========================================
// 場所別エンティティ表示コンポーネント
// ==========================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  LinearProgress,
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Grid,
  Paper,
  Divider,
  CircularProgress,
  Badge,
  Collapse
} from '@mui/material';
import {
  Inventory as TreasureIcon,
  Person as NPCIcon,
  Place as LocationIcon,
  Warning as HazardIcon,
  QuestionMark as MysteryIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as UndiscoveredIcon,
  Loop as InvestigatingIcon,
  Block as UnavailableIcon,
  AccessTime as TimeIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import {
  LocationEntity,
  LocationEntityDisplayState,
  ID
} from '@ai-agent-trpg/types';
import { useLocationEntities } from '../../hooks/useLocationEntities';

// ==========================================
// Props定義
// ==========================================

export interface LocationEntityDisplayProps {
  sessionId: ID;
  locationId: ID;
  locationName?: string;
  onEntitySelect?: (entity: LocationEntity) => void;
  onEntityAction?: (entityId: ID, actionType: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  compact?: boolean;
  disabled?: boolean;
  
  // 場所変更検知設定
  onLocationChanged?: (oldLocationId: ID | null, newLocationId: ID) => void;
  showLocationChangeIndicator?: boolean;
}

// ==========================================
// ヘルパー関数
// ==========================================

const getEntityIcon = (entity: LocationEntity) => {
  switch (entity.displayInfo.iconType) {
    case 'treasure': return <TreasureIcon color="warning" />;
    case 'enemy': return <HazardIcon color="error" />;
    case 'friendly': return <NPCIcon color="success" />;
    case 'neutral': return <NPCIcon color="action" />;
    case 'location': return <LocationIcon color="primary" />;
    case 'mystery': return <MysteryIcon color="info" />;
    default: return <InfoIcon color="action" />;
  }
};

const getStatusIcon = (status: LocationEntity['status']) => {
  switch (status) {
    case 'discovered': return <VisibilityIcon color="primary" />;
    case 'completed': return <CompletedIcon color="success" />;
    case 'investigating': return <InvestigatingIcon color="warning" />;
    case 'unavailable': return <UnavailableIcon color="disabled" />;
    case 'undiscovered': return <UndiscoveredIcon color="action" />;
    default: return <InfoIcon color="action" />;
  }
};

const getStatusLabel = (status: LocationEntity['status']) => {
  switch (status) {
    case 'discovered': return '発見済み';
    case 'completed': return '調査完了';
    case 'investigating': return '調査中';
    case 'unavailable': return '利用不可';
    case 'undiscovered': return '未発見';
    default: return status;
  }
};

const getDangerLevelColor = (level: string) => {
  switch (level) {
    case 'safe': return 'success';
    case 'low': return 'info';
    case 'medium': return 'warning';
    case 'high': return 'error';
    case 'dangerous': return 'error';
    default: return 'default';
  }
};

const formatLastInteraction = (timestamp?: string) => {
  if (!timestamp) return '未調査';
  return new Date(timestamp).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ==========================================
// メインコンポーネント
// ==========================================

export const LocationEntityDisplay: React.FC<LocationEntityDisplayProps> = ({
  sessionId,
  locationId,
  locationName = '現在の場所',
  onEntitySelect,
  onEntityAction,
  autoRefresh = false,
  refreshInterval = 15000,
  compact = false,
  disabled = false,
  onLocationChanged,
  showLocationChangeIndicator = true
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const [showSettings, setShowSettings] = useState(false);

  // useLocationEntitiesフックを使用
  const {
    displayState,
    entities,
    loading,
    error,
    isLocationChanging,
    lastLocationId,
    refreshEntities,
    updateEntityStatus,
    forceRegenerateEntities,
    updateDisplaySettings,
    stats
  } = useLocationEntities({
    sessionId,
    locationId,
    autoRefresh,
    refreshInterval,
    enableLocationChangeDetection: true,
    onLocationChanged,
    forceRefreshOnLocationChange: true
  });


  // ==========================================
  // イベントハンドラー
  // ==========================================

  const handleEntityClick = (entity: LocationEntity) => {
    if (disabled) return;
    if (onEntitySelect) {
      onEntitySelect(entity);
    }
  };

  const handleEntityAction = (entity: LocationEntity, actionType: string) => {
    if (disabled) return;
    if (onEntityAction) {
      onEntityAction(entity.entityId, actionType);
    }
  };

  const handleRefresh = async () => {
    await refreshEntities();
  };

  const handleSettingsChange = (field: string, value: any) => {
    if (!displayState) return;
    
    updateDisplaySettings({
      [field]: value
    });
  };

  // ==========================================
  // フィルタリング・ソート
  // ==========================================

  const filteredAndSortedEntities = React.useMemo(() => {
    if (!displayState) return [];

    let filtered = entities;

    // フィルタリング
    if (!displayState.displaySettings.showUndiscovered) {
      filtered = filtered.filter(e => e.status !== 'undiscovered');
    }
    if (!displayState.displaySettings.showCompleted) {
      filtered = filtered.filter(e => e.status !== 'completed');
    }

    // ソート（フックで既にソートされているが、表示設定に応じて再ソート）
    const { sortBy, sortOrder } = displayState.displaySettings;
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'discovery_time':
          aValue = a.discoveredAt ? new Date(a.discoveredAt).getTime() : 0;
          bValue = b.discoveredAt ? new Date(b.discoveredAt).getTime() : 0;
          break;
        case 'danger_level':
          const dangerOrder = { safe: 0, low: 1, medium: 2, high: 3, dangerous: 4 };
          aValue = dangerOrder[a.displayInfo.dangerLevel as keyof typeof dangerOrder] || 0;
          bValue = dangerOrder[b.displayInfo.dangerLevel as keyof typeof dangerOrder] || 0;
          break;
        case 'interaction_count':
          aValue = a.interactionCount;
          bValue = b.interactionCount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [entities, displayState]);

  if (!displayState) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            {loading ? <CircularProgress /> : <Typography>エンティティ情報を読み込み中...</Typography>}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // ==========================================
  // レンダリング
  // ==========================================

  return (
    <Card>
      <CardContent>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" />
            {locationName} - エンティティ
            {isLocationChanging && showLocationChangeIndicator && (
              <Chip
                label="場所変更中"
                size="small"
                color="warning"
                icon={<CircularProgress size={16} />}
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title="設定">
              <IconButton
                size="small"
                onClick={() => setShowSettings(!showSettings)}
              >
                {showSettings ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
            
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
            
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* 場所変更通知 */}
        {isLocationChanging && showLocationChangeIndicator && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              場所が変更されました。エンティティ情報を更新しています...
              {lastLocationId && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  前回の場所: {lastLocationId}
                </Typography>
              )}
            </Typography>
          </Alert>
        )}

        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 統計情報 */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <Paper sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                総数
              </Typography>
              <Typography variant="h6" color="primary">
                {stats.totalEntities}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                発見済み
              </Typography>
              <Typography variant="h6" color="success.main">
                {stats.discoveredEntities}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                操作可能
              </Typography>
              <Typography variant="h6" color="info.main">
                {stats.interactableEntities}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                危険
              </Typography>
              <Typography variant="h6" color="error.main">
                {stats.dangerousEntities}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 設定パネル */}
        <Collapse in={showSettings}>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>
              表示設定
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>ソート基準</InputLabel>
                  <Select
                    value={displayState.displaySettings.sortBy}
                    onChange={(e) => handleSettingsChange('sortBy', e.target.value)}
                  >
                    <MenuItem value="name">名前</MenuItem>
                    <MenuItem value="discovery_time">発見時刻</MenuItem>
                    <MenuItem value="danger_level">危険度</MenuItem>
                    <MenuItem value="interaction_count">操作回数</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>ソート順</InputLabel>
                  <Select
                    value={displayState.displaySettings.sortOrder}
                    onChange={(e) => handleSettingsChange('sortOrder', e.target.value)}
                  >
                    <MenuItem value="asc">昇順</MenuItem>
                    <MenuItem value="desc">降順</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={displayState.displaySettings.showUndiscovered}
                      onChange={(e) => handleSettingsChange('showUndiscovered', e.target.checked)}
                      size="small"
                    />
                  }
                  label="未発見を表示"
                />
              </Grid>
              
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={displayState.displaySettings.showCompleted}
                      onChange={(e) => handleSettingsChange('showCompleted', e.target.checked)}
                      size="small"
                    />
                  }
                  label="完了済みを表示"
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>

        {/* エンティティリスト */}
        <Collapse in={expanded}>
          {loading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
            </Box>
          )}
          
          {filteredAndSortedEntities.length === 0 ? (
            <Alert severity="info">
              現在の表示設定では表示するエンティティがありません
            </Alert>
          ) : (
            <List dense={compact}>
              {filteredAndSortedEntities.map((entity) => (
                <ListItem
                  key={entity.id}
                  button={!disabled}
                  onClick={() => handleEntityClick(entity)}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': disabled ? {} : {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <ListItemIcon>
                    <Badge
                      badgeContent={entity.availableActionsCount}
                      color="primary"
                      invisible={entity.availableActionsCount === 0}
                    >
                      {getEntityIcon(entity)}
                    </Badge>
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight="medium">
                          {entity.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel(entity.status)}
                          size="small"
                          color={entity.displayInfo.statusColor}
                          variant="outlined"
                        />
                        <Chip
                          label={entity.displayInfo.dangerLevel}
                          size="small"
                          color={getDangerLevelColor(entity.displayInfo.dangerLevel) as any}
                          variant="outlined"
                        />
                      </Stack>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {entity.displayInfo.shortDescription}
                        </Typography>
                        {entity.lastInteractionTime && (
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            最終操作: {formatLastInteraction(entity.lastInteractionTime)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {entity.interactionCount > 0 && (
                        <Chip
                          label={`${entity.interactionCount}回`}
                          size="small"
                          variant="outlined"
                          icon={<TimeIcon />}
                        />
                      )}
                      {getStatusIcon(entity.status)}
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Collapse>

        {/* 最終更新時刻 */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          最終更新: {new Date(displayState.lastRefresh).toLocaleTimeString('ja-JP')}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default LocationEntityDisplay;