import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  TextField,
  Divider,
  Alert,
} from '@mui/material';
import {
  DirectionsRun as RunIcon,
  DirectionsWalk as WalkIcon,
  DirectionsBike as RideIcon,
  Flight as FlyIcon,
  Explore as TeleportIcon,
  Group as GroupIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { Character, Location, LocationMovement, ID } from '@ai-agent-trpg/types';
import { useLocation } from '../../hooks/useLocations';
import { moveCharacter } from '../../api/locations';
import { useSnackbar } from 'notistack';

interface CharacterMovementProps {
  open: boolean;
  onClose: () => void;
  character: Character;
  currentLocation: Location;
  availableLocations: Location[];
  onMovementComplete?: (movement: LocationMovement) => void;
}

const CharacterMovement: React.FC<CharacterMovementProps> = ({
  open,
  onClose,
  character,
  currentLocation,
  availableLocations,
  onMovementComplete,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<ID>('');
  const [movementType, setMovementType] = useState<LocationMovement['movementType']>('walk');
  const [transportMethod, setTransportMethod] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(30);
  const [companions, setCompanions] = useState<ID[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { charactersInLocation } = useLocation(currentLocation.id);
  const { enqueueSnackbar } = useSnackbar();

  // 同行者候補（現在の場所にいる他のキャラクター）
  const availableCompanions = charactersInLocation.filter(c => c.id !== character.id);

  useEffect(() => {
    if (open) {
      setSelectedLocationId('');
      setMovementType('walk');
      setTransportMethod('');
      setEstimatedDuration(30);
      setCompanions([]);
    }
  }, [open]);

  const handleMove = async () => {
    if (!selectedLocationId) return;

    setLoading(true);
    try {
      const movement = await moveCharacter({
        characterId: character.id,
        toLocationId: selectedLocationId,
        movementType,
        transportMethod: transportMethod || undefined,
        estimatedDuration,
        companions,
      });

      enqueueSnackbar(`${character.name}が移動しました`, { variant: 'success' });
      onMovementComplete?.(movement);
      onClose();
    } catch (error) {
      console.error('Movement failed:', error);
      enqueueSnackbar('移動に失敗しました', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: LocationMovement['movementType']) => {
    switch (type) {
    case 'walk':
      return <WalkIcon />;
    case 'run':
      return <RunIcon />;
    case 'ride':
      return <RideIcon />;
    case 'fly':
      return <FlyIcon />;
    case 'teleport':
      return <TeleportIcon />;
    default:
      return <WalkIcon />;
    }
  };

  const getMovementLabel = (type: LocationMovement['movementType']) => {
    const labels = {
      walk: '歩行',
      run: '走行',
      ride: '騎乗',
      fly: '飛行',
      teleport: 'テレポート',
      swim: '水泳',
      climb: '登はん',
    } as const;
    return labels[type] || type;
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

  const selectedLocation = availableLocations.find(loc => loc.id === selectedLocationId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth data-testid="character-movement-dialog">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PersonIcon />
          {character.name}の移動
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {/* 現在の場所 */}
          <Typography variant="subtitle2" gutterBottom>
            現在の場所
          </Typography>
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="h6">{currentLocation.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {currentLocation.description}
            </Typography>
          </Box>

          {/* 移動先選択 */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>移動先</InputLabel>
            <Select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              data-testid="destination-select"
            >
              {availableLocations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography>{location.name}</Typography>
                    <Chip label={getLocationTypeLabel(location.type)} size="small" />
                    {location.properties.isDangerous && (
                      <Chip label="危険" size="small" color="error" />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 選択された場所の詳細 */}
          {selectedLocation && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="h6">{selectedLocation.name}</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedLocation.description}
              </Typography>
              {selectedLocation.properties.isDangerous && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  この場所は危険です。注意して進んでください。
                </Alert>
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* 移動方法 */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>移動方法</InputLabel>
            <Select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as LocationMovement['movementType'])}
              data-testid="movement-type-select"
            >
              <MenuItem value="walk">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WalkIcon />
                  歩行
                </Box>
              </MenuItem>
              <MenuItem value="run">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RunIcon />
                  走行
                </Box>
              </MenuItem>
              <MenuItem value="ride">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RideIcon />
                  騎乗
                </Box>
              </MenuItem>
              <MenuItem value="fly">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FlyIcon />
                  飛行
                </Box>
              </MenuItem>
              <MenuItem value="teleport">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TeleportIcon />
                  テレポート
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* 交通手段（オプション） */}
          {(movementType === 'ride' || movementType === 'fly') && (
            <TextField
              fullWidth
              label="交通手段"
              value={transportMethod}
              onChange={(e) => setTransportMethod(e.target.value)}
              placeholder={movementType === 'ride' ? '馬、馬車など' : '魔法のじゅうたん、ドラゴンなど'}
              sx={{ mb: 2 }}
              data-testid="transport-method-input"
            />
          )}

          {/* 推定移動時間 */}
          <TextField
            fullWidth
            type="number"
            label="推定移動時間（分）"
            value={estimatedDuration}
            onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 30)}
            sx={{ mb: 2 }}
            inputProps={{ min: 1 }}
            data-testid="duration-input"
          />

          {/* 同行者選択 */}
          {availableCompanions.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                同行者（オプション）
              </Typography>
              <List dense>
                {availableCompanions.map((companion) => (
                  <ListItem
                    key={companion.id}
                    button
                    onClick={() => {
                      setCompanions(prev =>
                        prev.includes(companion.id)
                          ? prev.filter(id => id !== companion.id)
                          : [...prev, companion.id],
                      );
                    }}
                    data-testid={`companion-${companion.id}`}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {companion.name.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={companion.name}
                      secondary={`${companion.characterType} - レベル ${companion.level}`}
                    />
                    {companions.includes(companion.id) && (
                      <Chip label="選択済み" color="primary" size="small" />
                    )}
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
        <Button
          onClick={handleMove}
          variant="contained"
          disabled={!selectedLocationId || loading}
          startIcon={getMovementIcon(movementType)}
          data-testid="confirm-movement"
        >
          {getMovementLabel(movementType)}で移動
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CharacterMovement;