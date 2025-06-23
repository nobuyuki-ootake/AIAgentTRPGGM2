import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Add as AddIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  Star as SuggestIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { TRPGEvent } from '@ai-agent-trpg/types';
import { useSessionEvents } from '@/hooks/useSessionEvents';

interface EventPanelProps {
  sessionId?: string;
  campaignId: string;
  sessionMode: 'exploration' | 'combat' | 'social' | 'planning';
  onEventStart?: (event: TRPGEvent) => void;
  onEventComplete?: (event: TRPGEvent) => void;
}

export const EventPanel: React.FC<EventPanelProps> = ({
  sessionId,
  campaignId,
  sessionMode,
  onEventStart,
  onEventComplete,
}) => {
  const [quickEventDialog, setQuickEventDialog] = useState(false);
  const [quickEventTitle, setQuickEventTitle] = useState('');
  const [quickEventDescription, setQuickEventDescription] = useState('');
  const [quickEventType, setQuickEventType] = useState<TRPGEvent['type']>('story');

  const {
    currentEvent,
    eventQueue,
    loading,
    actions: {
      triggerEvent,
      completeCurrentEvent,
      getSuggestedEvents,
      autoSuggestEvent,
      createQuickEvent,
      reloadEvents,
    },
  } = useSessionEvents({ sessionId, campaignId });

  const handleTriggerEvent = async (eventId: string) => {
    const startedEvent = await triggerEvent(eventId);
    if (startedEvent && onEventStart) {
      onEventStart(startedEvent);
    }
  };

  const handleCompleteEvent = async () => {
    const completedEvent = await completeCurrentEvent();
    if (completedEvent && onEventComplete) {
      onEventComplete(completedEvent);
    }
  };

  const handleCreateQuickEvent = async () => {
    if (!quickEventTitle.trim()) return;

    const createdEvent = await createQuickEvent(
      quickEventTitle,
      quickEventDescription,
      quickEventType,
    );

    if (createdEvent) {
      setQuickEventDialog(false);
      setQuickEventTitle('');
      setQuickEventDescription('');
      setQuickEventType('story');
      
      if (onEventStart) {
        onEventStart(createdEvent);
      }
    }
  };

  const suggestedEvents = getSuggestedEvents(sessionMode);

  const getTypeIcon = (type: string) => {
    switch (type) {
    case 'combat': return '⚔️';
    case 'social': return '💬';
    case 'exploration': return '🗺️';
    case 'puzzle': return '🧩';
    case 'rest': return '😴';
    default: return '📖';
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, any> = {
      story: 'primary',
      combat: 'error',
      social: 'info',
      exploration: 'success',
      puzzle: 'warning',
      rest: 'secondary',
    };
    return colors[type] || 'default';
  };

  return (
    <Box>
      {/* Current Event */}
      {currentEvent && (
        <Card sx={{ mb: 2 }} data-testid="current-event-card">
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="h6" component="h3">
                {getTypeIcon(currentEvent.type)} {currentEvent.title}
              </Typography>
              <Chip
                label="実行中"
                color="warning"
                size="small"
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary" mb={2}>
              {currentEvent.description}
            </Typography>

            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <Box display="flex" alignItems="center">
                <LocationIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">{currentEvent.locationId || '未設定'}</Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <GroupIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">{currentEvent.participants.length}人</Typography>
              </Box>
            </Box>

            <Chip
              label={currentEvent.type}
              color={getTypeColor(currentEvent.type)}
              size="small"
            />
          </CardContent>
          <CardActions>
            <Button
              startIcon={<CompleteIcon />}
              onClick={handleCompleteEvent}
              variant="contained"
              color="success"
              data-testid="complete-current-event-button"
            >
              イベント完了
            </Button>
          </CardActions>
        </Card>
      )}

      {/* Event Queue Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          イベントキュー
        </Typography>
        <Box>
          <Tooltip title="推奨イベント提案">
            <IconButton
              onClick={() => autoSuggestEvent(sessionMode)}
              disabled={loading}
              size="small"
            >
              <SuggestIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="イベント更新">
            <IconButton
              onClick={reloadEvents}
              disabled={loading}
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="クイックイベント作成">
            <IconButton
              onClick={() => setQuickEventDialog(true)}
              color="primary"
              size="small"
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Suggested Events */}
      {suggestedEvents.length > 0 && (
        <Box mb={2}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            推奨イベント ({sessionMode}モード)
          </Typography>
          <List dense>
            {suggestedEvents.slice(0, 3).map((event) => (
              <ListItem key={event.id} disablePadding>
                <ListItemButton
                  onClick={() => handleTriggerEvent(event.id)}
                  data-testid={`suggested-event-${event.id}`}
                >
                  <ListItemIcon>
                    <Typography>{getTypeIcon(event.type)}</Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={event.title}
                    secondary={`${event.locationId || '未設定'} • ${event.difficulty}`}
                  />
                  <Chip
                    label={event.type}
                    color={getTypeColor(event.type)}
                    size="small"
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 1 }} />
        </Box>
      )}

      {/* All Events */}
      {eventQueue.length === 0 ? (
        <Alert severity="info">
          利用可能なイベントがありません。タイムラインで新しいイベントを作成してください。
        </Alert>
      ) : (
        <List>
          {eventQueue.map((event) => (
            <ListItem key={event.id} disablePadding>
              <ListItemButton
                onClick={() => handleTriggerEvent(event.id)}
                data-testid={`queue-event-${event.id}`}
              >
                <ListItemIcon>
                  <Typography>{getTypeIcon(event.type)}</Typography>
                </ListItemIcon>
                <ListItemText
                  primary={event.title}
                  secondary={
                    <Box component="span">
                      <Typography component="span" variant="body2">
                        {event.locationId || '未設定'} • {event.difficulty}
                      </Typography>
                      <br />
                      <Typography component="span" variant="caption" color="text.secondary">
                        {new Date(event.scheduledDate).toLocaleString('ja-JP')}
                      </Typography>
                    </Box>
                  }
                />
                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                  <Chip
                    label={event.type}
                    color={getTypeColor(event.type)}
                    size="small"
                  />
                  <StartIcon color="action" />
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {/* Quick Event Creation Dialog */}
      <Dialog
        open={quickEventDialog}
        onClose={() => setQuickEventDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>クイックイベント作成</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="イベント名"
              value={quickEventTitle}
              onChange={(e) => setQuickEventTitle(e.target.value)}
              sx={{ mb: 2 }}
              data-testid="quick-event-title-input"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="説明"
              value={quickEventDescription}
              onChange={(e) => setQuickEventDescription(e.target.value)}
              sx={{ mb: 2 }}
              data-testid="quick-event-description-input"
            />
            <FormControl fullWidth>
              <InputLabel>イベントタイプ</InputLabel>
              <Select
                value={quickEventType}
                label="イベントタイプ"
                onChange={(e) => setQuickEventType(e.target.value as TRPGEvent['type'])}
                data-testid="quick-event-type-select"
              >
                <MenuItem value="story">ストーリー</MenuItem>
                <MenuItem value="combat">戦闘</MenuItem>
                <MenuItem value="social">社会的</MenuItem>
                <MenuItem value="exploration">探索</MenuItem>
                <MenuItem value="puzzle">謎解き</MenuItem>
                <MenuItem value="rest">休息</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickEventDialog(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleCreateQuickEvent}
            variant="contained"
            disabled={!quickEventTitle.trim()}
            data-testid="create-quick-event-button"
          >
            作成して開始
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};