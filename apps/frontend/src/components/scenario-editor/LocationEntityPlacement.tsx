import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  Avatar,
  ListItemAvatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Schedule as ScheduleIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { EntityPool, AIMilestone, ID } from '@ai-agent-trpg/types';
import { locationEntityMappingAPI } from '@/api/locationEntityMapping';

interface LocationEntityPlacementProps {
  campaignId: ID;
  sessionId: ID;
  entityPool?: EntityPool;
  milestones: AIMilestone[];
  height?: number;
}

interface LocationInfo {
  id: string;
  name: string;
  description: string;
  milestoneId?: string;
}

interface EntityInfo {
  id: string;
  name: string;
  category: 'enemy' | 'event' | 'npc' | 'item' | 'quest' | 'practical' | 'trophy' | 'mystery';
  type: 'core' | 'bonus';
  description: string;
}

interface EntityMapping {
  entityId: string;
  entityName: string;
  entityCategory: string;
  entityType: 'core' | 'bonus';
  timeConditions?: string[];
  prerequisiteEntities?: string[];
  isAvailable: boolean;
}

interface AssignEntityDialogState {
  open: boolean;
  locationId: string;
  locationName: string;
}

export const LocationEntityPlacement: React.FC<LocationEntityPlacementProps> = ({
  campaignId,
  sessionId,
  entityPool,
  milestones,
  height = 600,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationInfo[]>([]);
  const [availableEntities, setAvailableEntities] = useState<EntityInfo[]>([]);
  const [locationMappings, setLocationMappings] = useState<Record<string, EntityMapping[]>>({});
  const [assignDialog, setAssignDialog] = useState<AssignEntityDialogState>({
    open: false,
    locationId: '',
    locationName: '',
  });
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [timeConditions, setTimeConditions] = useState<string[]>([]);
  const [prerequisiteEntities, setPrerequisiteEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // マイルストーンから場所情報を抽出
  useEffect(() => {
    const extractedLocations: LocationInfo[] = [];
    
    milestones.forEach((milestone) => {
      if (milestone.locations && milestone.locations.length > 0) {
        milestone.locations.forEach((location) => {
          extractedLocations.push({
            id: location.id,
            name: location.name,
            description: location.description || '',
            milestoneId: milestone.id,
          });
        });
      }
    });

    setLocations(extractedLocations);
    
    // 最初の場所を選択
    if (extractedLocations.length > 0 && !selectedLocation) {
      setSelectedLocation(extractedLocations[0].id);
    }
  }, [milestones, selectedLocation]);

  // エンティティプールから利用可能エンティティを抽出
  useEffect(() => {
    if (!entityPool?.entities) return;

    const entities: EntityInfo[] = [];
    const entityCollection = entityPool.entities;

    // コアエンティティ
    if (entityCollection.coreEntities) {
      Object.entries(entityCollection.coreEntities).forEach(([category, entityList]) => {
        if (Array.isArray(entityList)) {
          entityList.forEach((entity: any) => {
            entities.push({
              id: entity.id,
              name: entity.name,
              category: category as any,
              type: 'core',
              description: entity.description || '',
            });
          });
        }
      });
    }

    // ボーナスエンティティ
    if (entityCollection.bonusEntities) {
      Object.entries(entityCollection.bonusEntities).forEach(([category, entityList]) => {
        if (Array.isArray(entityList)) {
          entityList.forEach((entity: any) => {
            entities.push({
              id: entity.id,
              name: entity.name,
              category: category as any,
              type: 'bonus',
              description: entity.description || '',
            });
          });
        }
      });
    }

    setAvailableEntities(entities);
  }, [entityPool]);

  // 選択された場所のマッピングを取得
  useEffect(() => {
    if (selectedLocation) {
      loadLocationMappings(selectedLocation);
    }
  }, [selectedLocation]);

  const loadLocationMappings = async (locationId: string) => {
    try {
      setLoading(true);
      const mappings = await locationEntityMappingAPI.getEntitiesByLocation(locationId, sessionId);
      
      const entityMappings: EntityMapping[] = mappings.map((mapping) => ({
        entityId: mapping.entityId,
        entityName: `${mapping.entityCategory}_${mapping.entityId.slice(0, 8)}`, // 簡易表示
        entityCategory: mapping.entityCategory,
        entityType: mapping.entityType,
        timeConditions: mapping.timeConditions,
        prerequisiteEntities: mapping.prerequisiteEntities,
        isAvailable: mapping.isAvailable,
      }));

      setLocationMappings(prev => ({
        ...prev,
        [locationId]: entityMappings,
      }));
    } catch (err) {
      console.error('Failed to load location mappings:', err);
      setLocationMappings(prev => ({
        ...prev,
        [locationId]: [],
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignDialog = (locationId: string, locationName: string) => {
    setAssignDialog({
      open: true,
      locationId,
      locationName,
    });
    setSelectedEntity('');
    setTimeConditions([]);
    setPrerequisiteEntities([]);
  };

  const handleCloseAssignDialog = () => {
    setAssignDialog({
      open: false,
      locationId: '',
      locationName: '',
    });
  };

  const handleAssignEntity = async () => {
    if (!selectedEntity || !assignDialog.locationId) return;

    const entity = availableEntities.find(e => e.id === selectedEntity);
    if (!entity) return;

    try {
      setLoading(true);
      setError(null);

      // マッピングを作成
      const mappingData = {
        locationId: assignDialog.locationId,
        entityId: entity.id,
        entityType: entity.type,
        entityCategory: entity.category,
        timeConditions,
        prerequisiteEntities,
        isAvailable: true,
      };

      // API呼び出し（実装が必要）
      // await locationEntityMappingAPI.createMapping(sessionId, mappingData);

      // 一時的に楽観的更新
      const newMapping: EntityMapping = {
        entityId: entity.id,
        entityName: entity.name,
        entityCategory: entity.category,
        entityType: entity.type,
        timeConditions,
        prerequisiteEntities,
        isAvailable: true,
      };

      setLocationMappings(prev => ({
        ...prev,
        [assignDialog.locationId]: [
          ...(prev[assignDialog.locationId] || []),
          newMapping,
        ],
      }));

      handleCloseAssignDialog();
    } catch (err) {
      setError('エンティティの配置に失敗しました');
      console.error('Failed to assign entity:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEntityCategoryColor = (category: string) => {
    const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      enemy: 'error',
      event: 'info',
      npc: 'primary',
      item: 'success',
      quest: 'warning',
      practical: 'secondary',
      trophy: 'default',
      mystery: 'default',
    };
    return colorMap[category] || 'default';
  };

  const getEntityTypeIcon = (type: 'core' | 'bonus') => {
    return type === 'core' ? '🎯' : '✨';
  };

  const selectedLocationInfo = locations.find(loc => loc.id === selectedLocation);
  const currentMappings = selectedLocation ? (locationMappings[selectedLocation] || []) : [];

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationIcon />
        場所・エンティティ配置エディタ
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        マイルストーンで定義された場所にエンティティを配置し、発見条件を設定します。
        この設定により、プレイヤーが探索することでエンティティを段階的に発見できます。
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ flexGrow: 1 }}>
        {/* 場所一覧 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              利用可能な場所 ({locations.length})
            </Typography>
            <List>
              {locations.map((location) => (
                <ListItem key={location.id} disablePadding>
                  <ListItemButton
                    selected={selectedLocation === location.id}
                    onClick={() => setSelectedLocation(location.id)}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <LocationIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={location.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {location.description}
                          </Typography>
                          <Chip
                            label={`配置済み: ${currentMappings.length}`}
                            size="small"
                            color={currentMappings.length > 0 ? 'primary' : 'default'}
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* 選択された場所の詳細 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            {selectedLocationInfo ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {selectedLocationInfo.name} の配置エンティティ
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenAssignDialog(selectedLocationInfo.id, selectedLocationInfo.name)}
                    disabled={availableEntities.length === 0}
                  >
                    エンティティを配置
                  </Button>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedLocationInfo.description}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {currentMappings.length === 0 ? (
                  <Alert severity="info">
                    この場所にはまだエンティティが配置されていません。
                    「エンティティを配置」ボタンから追加してください。
                  </Alert>
                ) : (
                  <List>
                    {currentMappings.map((mapping, index) => (
                      <ListItem key={`${mapping.entityId}-${index}`}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: getEntityCategoryColor(mapping.entityCategory) }}>
                            {getEntityTypeIcon(mapping.entityType)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {mapping.entityName}
                              <Chip
                                label={mapping.entityCategory}
                                size="small"
                                color={getEntityCategoryColor(mapping.entityCategory)}
                              />
                              <Chip
                                label={mapping.entityType}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              {mapping.timeConditions && mapping.timeConditions.length > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <ScheduleIcon fontSize="small" />
                                  <Typography variant="caption">
                                    時間条件: {mapping.timeConditions.join(', ')}
                                  </Typography>
                                </Box>
                              )}
                              {mapping.prerequisiteEntities && mapping.prerequisiteEntities.length > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinkIcon fontSize="small" />
                                  <Typography variant="caption">
                                    前提条件: {mapping.prerequisiteEntities.length}個
                                  </Typography>
                                </Box>
                              )}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                {mapping.isAvailable ? (
                                  <VisibilityIcon fontSize="small" color="success" />
                                ) : (
                                  <VisibilityOffIcon fontSize="small" color="disabled" />
                                )}
                                <Typography variant="caption">
                                  {mapping.isAvailable ? '利用可能' : '利用不可'}
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            ) : (
              <Alert severity="info">
                左側の場所一覧から場所を選択してください。
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* エンティティ配置ダイアログ */}
      <Dialog
        open={assignDialog.open}
        onClose={handleCloseAssignDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {assignDialog.locationName} にエンティティを配置
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>エンティティを選択</InputLabel>
              <Select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                label="エンティティを選択"
              >
                {availableEntities.map((entity) => (
                  <MenuItem key={entity.id} value={entity.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label={entity.category}
                        size="small"
                        color={getEntityCategoryColor(entity.category)}
                      />
                      <Chip
                        label={entity.type}
                        size="small"
                        variant="outlined"
                      />
                      <Typography>{entity.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>時間条件</InputLabel>
              <Select
                multiple
                value={timeConditions}
                onChange={(e) => setTimeConditions(e.target.value as string[])}
                label="時間条件"
              >
                <MenuItem value="any">いつでも</MenuItem>
                <MenuItem value="day_time">昼間のみ</MenuItem>
                <MenuItem value="night_only">夜間のみ</MenuItem>
                <MenuItem value="morning_only">朝のみ</MenuItem>
                <MenuItem value="afternoon_only">午後のみ</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="前提エンティティID（カンマ区切り）"
              value={prerequisiteEntities.join(', ')}
              onChange={(e) => {
                const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                setPrerequisiteEntities(values);
              }}
              placeholder="entity1, entity2, ..."
              helperText="このエンティティが発見される前に必要な他のエンティティのIDを入力"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignDialog}>
            キャンセル
          </Button>
          <Button
            onClick={handleAssignEntity}
            variant="contained"
            disabled={!selectedEntity || loading}
          >
            配置
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};