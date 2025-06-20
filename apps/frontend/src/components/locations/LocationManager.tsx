import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
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
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Explore as ExploreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Location, LocationQuery } from '@ai-agent-trpg/types';
import { useLocations, useLocation } from '../../hooks/useLocations';
import { CreateLocationData } from '../../api/locations';

interface LocationManagerProps {
  campaignId?: string;
}

const LocationManager: React.FC<LocationManagerProps> = ({ campaignId }) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);
  const [query, setQuery] = useState<LocationQuery>({});

  const { 
    locations, 
    loading, 
    error, 
    fetchLocations, 
    createLocation, 
    updateLocation, 
    deleteLocation,
    seedDefaultLocations 
  } = useLocations(query);

  const { 
    location: selectedLocation, 
    charactersInLocation, 
    connectedLocations 
  } = useLocation(selectedLocationId);

  const handleCreateLocation = async (data: CreateLocationData) => {
    try {
      await createLocation(data);
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create location:', error);
    }
  };

  const handleEditLocation = async (data: Partial<Location>) => {
    if (selectedLocationId) {
      try {
        await updateLocation(selectedLocationId, data);
        setEditDialogOpen(false);
      } catch (error) {
        console.error('Failed to update location:', error);
      }
    }
  };

  const handleDeleteLocation = async () => {
    if (locationToDelete) {
      try {
        await deleteLocation(locationToDelete);
        setDeleteDialogOpen(false);
        setLocationToDelete(null);
        if (selectedLocationId === locationToDelete) {
          setSelectedLocationId(null);
        }
      } catch (error) {
        console.error('Failed to delete location:', error);
      }
    }
  };

  const getLocationTypeColor = (type: Location['type']) => {
    const colors = {
      region: 'primary',
      settlement: 'secondary',
      building: 'info',
      room: 'default',
      dungeon: 'warning',
      wilderness: 'success',
      landmark: 'error',
    } as const;
    return colors[type] || 'default';
  };

  const getLocationTypeLabel = (type: Location['type']) => {
    const labels = {
      region: '地域',
      settlement: '集落',
      building: '建物',
      room: '部屋',
      dungeon: 'ダンジョン',
      wilderness: '野外',
      landmark: 'ランドマーク',
    };
    return labels[type] || type;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          場所管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="デフォルト場所を作成">
            <IconButton onClick={seedDefaultLocations} color="info">
              <ExploreIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="更新">
            <IconButton onClick={() => fetchLocations(query)} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新しい場所を作成
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 場所一覧 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                場所一覧
              </Typography>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="場所名で検索..."
                  value={query.name || ''}
                  onChange={(e) => setQuery({ ...query, name: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      fetchLocations(query);
                    }
                  }}
                />
              </Box>
              <List>
                {locations.map((location) => (
                  <ListItem
                    key={location.id}
                    button
                    selected={selectedLocationId === location.id}
                    onClick={() => setSelectedLocationId(location.id)}
                    data-testid={`location-item-${location.id}`}
                  >
                    <LocationIcon sx={{ mr: 2, color: 'text.secondary' }} />
                    <ListItemText
                      primary={location.name}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip
                            label={getLocationTypeLabel(location.type)}
                            size="small"
                            color={getLocationTypeColor(location.type)}
                          />
                          {location.properties.isDangerous && (
                            <Chip label="危険" size="small" color="error" />
                          )}
                          {location.properties.isSecret && (
                            <Chip label="秘密" size="small" color="warning" />
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="編集">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLocationId(location.id);
                            setEditDialogOpen(true);
                          }}
                          data-testid={`edit-location-${location.id}`}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="削除">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocationToDelete(location.id);
                            setDeleteDialogOpen(true);
                          }}
                          data-testid={`delete-location-${location.id}`}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 場所詳細 */}
        <Grid item xs={12} md={6}>
          {selectedLocation ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedLocation.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {selectedLocation.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={getLocationTypeLabel(selectedLocation.type)}
                    color={getLocationTypeColor(selectedLocation.type)}
                    sx={{ mr: 1 }}
                  />
                  {selectedLocation.properties.isRestArea && (
                    <Chip label="休憩エリア" color="success" sx={{ mr: 1 }} />
                  )}
                  {selectedLocation.properties.hasShops && (
                    <Chip label="商店" color="info" sx={{ mr: 1 }} />
                  )}
                  {selectedLocation.properties.isDangerous && (
                    <Chip label="危険" color="error" sx={{ mr: 1 }} />
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* 環境情報 */}
                <Typography variant="subtitle2" gutterBottom>
                  環境
                </Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      照明: {selectedLocation.environment.lighting}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      温度: {selectedLocation.environment.temperature}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      天候: {selectedLocation.environment.weather}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      地形: {selectedLocation.environment.terrain}
                    </Typography>
                  </Grid>
                </Grid>

                {/* 現在いるキャラクター */}
                <Typography variant="subtitle2" gutterBottom>
                  <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  現在いるキャラクター ({charactersInLocation.length})
                </Typography>
                <List dense>
                  {charactersInLocation.map((character) => (
                    <ListItem key={character.id}>
                      <ListItemText primary={character.name} />
                    </ListItem>
                  ))}
                </List>

                {/* 接続された場所 */}
                {connectedLocations.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      接続された場所
                    </Typography>
                    <List dense>
                      {connectedLocations.map((connected) => (
                        <ListItem
                          key={connected.id}
                          button
                          onClick={() => setSelectedLocationId(connected.id)}
                        >
                          <ListItemText primary={connected.name} />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  場所を選択してください
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* 作成ダイアログ */}
      <LocationDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateLocation}
        title="新しい場所を作成"
      />

      {/* 編集ダイアログ */}
      {selectedLocation && (
        <LocationDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSubmit={handleEditLocation}
          title="場所を編集"
          initialData={selectedLocation}
        />
      )}

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>場所を削除</DialogTitle>
        <DialogContent>
          <Typography>
            この場所を削除してもよろしいですか？この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleDeleteLocation} color="error">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// 場所作成・編集ダイアログコンポーネント
interface LocationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  title: string;
  initialData?: Location;
}

const LocationDialog: React.FC<LocationDialogProps> = ({
  open,
  onClose,
  onSubmit,
  title,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<CreateLocationData>>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: initialData?.type || 'settlement',
    environment: initialData?.environment || {
      lighting: 'bright',
      temperature: 'comfortable',
      weather: 'clear',
      terrain: 'urban',
      hazards: [],
      resources: [],
    },
    properties: initialData?.properties || {
      isRestArea: false,
      hasShops: false,
      hasTeleporter: false,
      isSecret: false,
      isDangerous: false,
      magicLevel: 'none',
      sanctity: 'neutral',
    },
  });

  const handleSubmit = () => {
    if (formData.name && formData.description && formData.environment) {
      onSubmit(formData);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="場所名"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="location-name-input"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>場所の種類</InputLabel>
                <Select
                  value={formData.type || 'settlement'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Location['type'] })}
                  data-testid="location-type-select"
                >
                  <MenuItem value="region">地域</MenuItem>
                  <MenuItem value="settlement">集落</MenuItem>
                  <MenuItem value="building">建物</MenuItem>
                  <MenuItem value="room">部屋</MenuItem>
                  <MenuItem value="dungeon">ダンジョン</MenuItem>
                  <MenuItem value="wilderness">野外</MenuItem>
                  <MenuItem value="landmark">ランドマーク</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="説明"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                data-testid="location-description-input"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                プロパティ
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.properties?.isRestArea || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        properties: { ...formData.properties, isRestArea: e.target.checked },
                      })
                    }
                  />
                }
                label="休憩エリア"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.properties?.hasShops || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        properties: { ...formData.properties, hasShops: e.target.checked },
                      })
                    }
                  />
                }
                label="商店あり"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.properties?.isDangerous || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        properties: { ...formData.properties, isDangerous: e.target.checked },
                      })
                    }
                  />
                }
                label="危険"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.properties?.isSecret || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        properties: { ...formData.properties, isSecret: e.target.checked },
                      })
                    }
                  />
                }
                label="秘密の場所"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSubmit} variant="contained" data-testid="submit-location">
          {initialData ? '更新' : '作成'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationManager;