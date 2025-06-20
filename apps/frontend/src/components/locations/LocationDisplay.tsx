import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Security as ShieldIcon,
  Dangerous as DangerIcon,
  Store as StoreIcon,
  Hotel as RestIcon,
  Visibility as ExploreIcon,
  WbSunny as LightIcon,
  Thermostat as TempIcon,
  Cloud as WeatherIcon,
  Terrain as TerrainIcon,
} from '@mui/icons-material';
import { Location, Character } from '@ai-agent-trpg/types';

interface LocationDisplayProps {
  location: Location;
  characters?: Character[];
  onCharacterClick?: (character: Character) => void;
  onLocationAction?: (actionType: string) => void;
  compact?: boolean;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({
  location,
  characters = [],
  onCharacterClick,
  onLocationAction,
  compact = false,
}) => {
  const getEnvironmentIcon = (type: string) => {
    switch (type) {
      case 'lighting':
        return <LightIcon />;
      case 'temperature':
        return <TempIcon />;
      case 'weather':
        return <WeatherIcon />;
      case 'terrain':
        return <TerrainIcon />;
      default:
        return null;
    }
  };

  const getEnvironmentLabel = (key: string, value: string) => {
    const labels: Record<string, Record<string, string>> = {
      lighting: {
        bright: '明るい',
        dim: '薄暗い',
        dark: '暗い',
        magical: '魔法的な光',
      },
      temperature: {
        freezing: '極寒',
        cold: '寒い',
        cool: '涼しい',
        comfortable: '快適',
        warm: '暖かい',
        hot: '暑い',
        scorching: '灼熱',
      },
      weather: {
        clear: '晴れ',
        cloudy: '曇り',
        rainy: '雨',
        stormy: '嵐',
        snowy: '雪',
        foggy: '霧',
      },
      terrain: {
        urban: '都市部',
        forest: '森林',
        mountain: '山地',
        desert: '砂漠',
        swamp: '湿地',
        cave: '洞窟',
        underground: '地下',
      },
    };
    return labels[key]?.[value] || value;
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

  if (compact) {
    return (
      <Paper sx={{ p: 2, mb: 2 }} data-testid={`location-display-${location.id}`}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LocationIcon color="primary" />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{location.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip
                label={getLocationTypeLabel(location.type)}
                size="small"
                color={getLocationTypeColor(location.type)}
              />
              {characters.length > 0 && (
                <Chip
                  icon={<PeopleIcon />}
                  label={`${characters.length}人`}
                  size="small"
                  variant="outlined"
                />
              )}
              {location.properties.isDangerous && (
                <Chip icon={<DangerIcon />} label="危険" size="small" color="error" />
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Card sx={{ height: '100%' }} data-testid={`location-display-${location.id}`}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <LocationIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" component="h2">
              {location.name}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              <Chip
                label={getLocationTypeLabel(location.type)}
                color={getLocationTypeColor(location.type)}
              />
              {location.properties.isRestArea && (
                <Chip icon={<RestIcon />} label="休憩エリア" color="success" size="small" />
              )}
              {location.properties.hasShops && (
                <Chip icon={<StoreIcon />} label="商店" color="info" size="small" />
              )}
              {location.properties.isDangerous && (
                <Chip icon={<DangerIcon />} label="危険" color="error" size="small" />
              )}
              {location.properties.isSecret && (
                <Chip icon={<ShieldIcon />} label="秘密" color="warning" size="small" />
              )}
            </Box>
          </Box>
        </Box>

        <Typography variant="body1" color="text.secondary" paragraph>
          {location.description}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* 環境情報 */}
        <Typography variant="h6" gutterBottom>
          環境
        </Typography>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {Object.entries(location.environment).map(([key, value]) => {
            if (key === 'hazards' || key === 'resources' || !value) return null;
            return (
              <Grid item xs={6} sm={3} key={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getEnvironmentIcon(key)}
                  <Typography variant="body2">
                    {getEnvironmentLabel(key, value as string)}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* 危険要素 */}
        {location.environment.hazards.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              危険要素
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {location.environment.hazards.map((hazard, index) => (
                <Chip key={index} label={hazard} color="error" size="small" />
              ))}
            </Box>
          </Box>
        )}

        {/* 利用可能リソース */}
        {location.environment.resources.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              利用可能なリソース
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {location.environment.resources.map((resource, index) => (
                <Chip key={index} label={resource} color="success" size="small" />
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* 現在いるキャラクター */}
        <Typography variant="h6" gutterBottom>
          <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          現在いるキャラクター ({characters.length})
        </Typography>
        {characters.length > 0 ? (
          <List dense>
            {characters.map((character) => (
              <ListItem
                key={character.id}
                button={!!onCharacterClick}
                onClick={() => onCharacterClick?.(character)}
                data-testid={`character-in-location-${character.id}`}
              >
                <ListItemIcon>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {character.name.charAt(0)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={character.name}
                  secondary={`${character.characterType} - レベル ${character.level}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            誰もいません
          </Typography>
        )}

        {/* AI生成の雰囲気描写 */}
        {location.aiData?.ambientDescriptions && location.aiData.ambientDescriptions.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              雰囲気
            </Typography>
            <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: 1, borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                {location.aiData.ambientDescriptions[
                  Math.floor(Math.random() * location.aiData.ambientDescriptions.length)
                ]}
              </Typography>
            </Box>
          </>
        )}

        {/* 推奨アクション */}
        {location.aiData?.suggestedActions && location.aiData.suggestedActions.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              推奨アクション
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {location.aiData.suggestedActions.map((action, index) => (
                <Tooltip key={index} title="クリックして実行">
                  <Chip
                    label={action}
                    variant="outlined"
                    clickable
                    onClick={() => onLocationAction?.(action)}
                    icon={<ExploreIcon />}
                    data-testid={`location-action-${index}`}
                  />
                </Tooltip>
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationDisplay;