import React from 'react';
import {
  Button,
  IconButton,
  Fab,
  Card,
  CardContent,
  CardActions,
  TextField,
  Slider,
  Switch,
  Chip,
  styled,
  useTheme,
  useMediaQuery,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Paper,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
} from '@mui/icons-material';

// タッチ操作に最適化されたボタン
const TouchButton = styled(Button)(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    minHeight: '48px',
    padding: theme.spacing(1.5, 2),
    fontSize: '1rem',
    borderRadius: '8px',
    '&:active': {
      transform: 'scale(0.95)',
      transition: 'transform 0.1s ease',
    },
  },
}));

// タッチ操作に最適化されたアイコンボタン
const TouchIconButton = styled(IconButton)(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    minWidth: '48px',
    minHeight: '48px',
    padding: theme.spacing(1.5),
    '&:active': {
      transform: 'scale(0.9)',
      transition: 'transform 0.1s ease',
    },
  },
}));

// タッチ操作に最適化されたFAB
const TouchFab = styled(Fab)(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    width: '64px',
    height: '64px',
    '&:active': {
      transform: 'scale(0.9)',
      transition: 'transform 0.1s ease',
    },
  },
}));

// タッチ操作に最適化されたカード
const TouchCard = styled(Card)(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    '&:active': {
      transform: 'scale(0.98)',
      transition: 'transform 0.1s ease',
    },
  },
}));

// タッチ操作に最適化されたテキストフィールド
const TouchTextField = styled(TextField)(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    '& .MuiInputBase-root': {
      minHeight: '48px',
      fontSize: '16px', // iOS zoom防止
    },
    '& .MuiInputBase-input': {
      padding: theme.spacing(1.5, 2),
    },
  },
}));

// 数値入力用のコンポーネント
interface TouchNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
}

export const TouchNumberInput: React.FC<TouchNumberInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDecrement = () => {
    if (value > min) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(Math.min(max, value + step));
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {label && (
        <Typography variant="body2" sx={{ minWidth: 'max-content' }}>
          {label}
        </Typography>
      )}
      <TouchIconButton
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        size={isMobile ? 'large' : 'medium'}
      >
        <RemoveIcon />
      </TouchIconButton>
      <Box
        sx={{
          minWidth: '60px',
          textAlign: 'center',
          fontSize: isMobile ? '1.1rem' : '1rem',
          fontWeight: 'bold',
        }}
      >
        {value}
      </Box>
      <TouchIconButton
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        size={isMobile ? 'large' : 'medium'}
      >
        <AddIcon />
      </TouchIconButton>
    </Box>
  );
};

// タッチ操作に最適化されたスライダー
interface TouchSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  marks?: boolean;
}

export const TouchSlider: React.FC<TouchSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled = false,
  marks = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ px: 2 }}>
      {label && (
        <Typography variant="body2" gutterBottom>
          {label}: {value}
        </Typography>
      )}
      <Slider
        value={value}
        onChange={(_, newValue) => onChange(newValue as number)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        marks={marks}
        sx={{
          [theme.breakpoints.down('md')]: {
            height: '8px',
            '& .MuiSlider-thumb': {
              width: '24px',
              height: '24px',
            },
            '& .MuiSlider-track': {
              height: '8px',
            },
            '& .MuiSlider-rail': {
              height: '8px',
            },
          },
        }}
      />
    </Box>
  );
};

// タッチ操作に最適化されたリスト
interface TouchListProps {
  items: Array<{
    id: string;
    primary: string;
    secondary?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }>;
  selectable?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
}

export const TouchList: React.FC<TouchListProps> = ({
  items,
  selectable = false,
  selected,
  onSelect,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <List sx={{ p: 0 }}>
      {items.map((item, index) => (
        <Box key={item.id}>
          <ListItemButton
            onClick={() => {
              if (selectable && onSelect) {
                onSelect(item.id);
              }
              if (item.onClick) {
                item.onClick();
              }
            }}
            disabled={item.disabled}
            selected={selectable && selected === item.id}
            sx={{
              [theme.breakpoints.down('md')]: {
                minHeight: '56px',
                px: 2,
                py: 1.5,
                '&:active': {
                  backgroundColor: theme.palette.action.selected,
                },
              },
            }}
          >
            {item.icon && (
              <ListItemIcon
                sx={{
                  [theme.breakpoints.down('md')]: {
                    minWidth: '48px',
                  },
                }}
              >
                {item.icon}
              </ListItemIcon>
            )}
            <ListItemText
              primary={item.primary}
              secondary={item.secondary}
              sx={{
                [theme.breakpoints.down('md')]: {
                  '& .MuiListItemText-primary': {
                    fontSize: '1rem',
                  },
                  '& .MuiListItemText-secondary': {
                    fontSize: '0.875rem',
                  },
                },
              }}
            />
          </ListItemButton>
          {index < items.length - 1 && <Divider />}
        </Box>
      ))}
    </List>
  );
};

// タッチ操作に最適化されたトグルボタングループ
interface TouchToggleButtonGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  exclusive?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export const TouchToggleButtonGroup: React.FC<TouchToggleButtonGroupProps> = ({
  value,
  onChange,
  options,
  exclusive = true,
  orientation = 'horizontal',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <ToggleButtonGroup
      value={value}
      exclusive={exclusive}
      onChange={(_, newValue) => {
        if (newValue !== null) {
          onChange(newValue);
        }
      }}
      orientation={orientation}
      sx={{
        [theme.breakpoints.down('md')]: {
          '& .MuiToggleButton-root': {
            minHeight: '48px',
            px: 2,
            py: 1.5,
            fontSize: '1rem',
          },
        },
      }}
    >
      {options.map((option) => (
        <ToggleButton
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          sx={{
            [theme.breakpoints.down('md')]: {
              '&:active': {
                transform: 'scale(0.95)',
                transition: 'transform 0.1s ease',
              },
            },
          }}
        >
          {option.icon && (
            <Box sx={{ mr: option.label ? 1 : 0 }}>{option.icon}</Box>
          )}
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

// エクスポート
export {
  TouchButton,
  TouchIconButton,
  TouchFab,
  TouchCard,
  TouchTextField,
};