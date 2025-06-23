import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Grid,
  Alert,
  Fab,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CompleteIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { TRPGEvent, Character } from '@ai-agent-trpg/types';
import { eventAPI, characterAPI } from '@/api';
import { useRecoilValue } from 'recoil';
import { currentCampaignAtom } from '@/store/atoms';
import { useNotification } from '@/components/common/NotificationProvider';
import { CreateEventRequest } from '@/api/events';

interface EventFormData {
  title: string;
  description: string;
  type: 'story' | 'combat' | 'social' | 'exploration' | 'puzzle' | 'rest';
  scheduledDate: string;
  duration: number;
  location: string;
  participants: string[];
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme';
  challengeRating: number;
  questId?: string;
}

const TimelinePage: React.FC = () => {
  const [events, setEvents] = useState<TRPGEvent[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TRPGEvent | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<TRPGEvent | null>(null);
  
  const currentCampaign = useRecoilValue(currentCampaignAtom);
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    type: 'story',
    scheduledDate: new Date().toISOString().slice(0, 16),
    duration: 60,
    location: '',
    participants: [],
    difficulty: 'medium',
    challengeRating: 3,
    questId: undefined,
  });

  useEffect(() => {
    if (currentCampaign) {
      loadEvents();
      loadCharacters();
    }
  }, [currentCampaign]);

  const loadEvents = async () => {
    if (!currentCampaign) return;
    
    try {
      setLoading(true);
      const campaignEvents = await eventAPI.getEventsByCampaign(currentCampaign.id);
      setEvents(campaignEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
      showError('イベントの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadCharacters = async () => {
    if (!currentCampaign) return;
    
    try {
      const campaignCharacters = await characterAPI.getCharactersByCampaign(currentCampaign.id);
      setCharacters(campaignCharacters);
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  };

  const handleCreateEvent = async () => {
    if (!currentCampaign) return;

    try {
      const eventData: CreateEventRequest = {
        ...formData,
        campaignId: currentCampaign.id,
      };

      const newEvent = await eventAPI.createEvent(eventData);
      setEvents(prev => [...prev, newEvent]);
      setDialogOpen(false);
      resetForm();
      showSuccess('イベントが作成されました');
    } catch (error) {
      console.error('Failed to create event:', error);
      showError('イベントの作成に失敗しました');
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    try {
      const updatedEvent = await eventAPI.updateEvent(editingEvent.id, formData);
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? updatedEvent : e));
      setDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      showSuccess('イベントが更新されました');
    } catch (error) {
      console.error('Failed to update event:', error);
      showError('イベントの更新に失敗しました');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await eventAPI.deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      showSuccess('イベントが削除されました');
    } catch (error) {
      console.error('Failed to delete event:', error);
      showError('イベントの削除に失敗しました');
    }
    setAnchorEl(null);
  };

  const handleStartEvent = async (eventId: string) => {
    try {
      const startedEvent = await eventAPI.startEvent(eventId);
      setEvents(prev => prev.map(e => e.id === eventId ? startedEvent : e));
      showSuccess('イベントが開始されました');
    } catch (error) {
      console.error('Failed to start event:', error);
      showError('イベントの開始に失敗しました');
    }
    setAnchorEl(null);
  };

  const handleCompleteEvent = async (eventId: string) => {
    try {
      const outcomes = {
        success: true,
        experience: 100,
        rewards: ['経験値 100'],
        consequences: [],
        storyImpact: ['物語が進展しました'],
      };

      const completedEvent = await eventAPI.completeEvent(eventId, outcomes);
      setEvents(prev => prev.map(e => e.id === eventId ? completedEvent : e));
      showSuccess('イベントが完了しました');
    } catch (error) {
      console.error('Failed to complete event:', error);
      showError('イベントの完了に失敗しました');
    }
    setAnchorEl(null);
  };

  const handleCreateMockEvent = async () => {
    if (!currentCampaign) return;

    try {
      const mockEventData = eventAPI.createMockEvent(currentCampaign.id);
      // Fill participants with random characters
      const availableCharacters = characters.filter(c => c.characterType === 'PC');
      mockEventData.participants = availableCharacters.slice(0, Math.min(4, availableCharacters.length)).map(c => c.id);
      
      const newEvent = await eventAPI.createEvent(mockEventData);
      setEvents(prev => [...prev, newEvent]);
      showSuccess('モックイベントが作成されました');
    } catch (error) {
      console.error('Failed to create mock event:', error);
      showError('モックイベントの作成に失敗しました');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'story',
      scheduledDate: new Date().toISOString().slice(0, 16),
      duration: 60,
      location: '',
      participants: [],
      difficulty: 'medium',
      challengeRating: 3,
      questId: undefined,
    });
  };

  const openEditDialog = (event: TRPGEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      type: event.type,
      scheduledDate: event.scheduledDate.slice(0, 16),
      duration: event.duration,
      location: event.locationId || '',
      participants: event.participants,
      difficulty: event.difficulty,
      challengeRating: event.challengeRating,
      questId: event.questId,
    });
    setDialogOpen(true);
    setAnchorEl(null);
  };

  const getEventStatusColor = (event: TRPGEvent) => {
    if (event.completedAt) return 'success';
    if (event.actualStartTime) return 'warning';
    return 'default';
  };

  const getEventStatusText = (event: TRPGEvent) => {
    if (event.completedAt) return '完了';
    if (event.actualStartTime) return '実行中';
    return '予定';
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

  if (!currentCampaign) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          キャンペーンを選択してください
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          タイムライン - {currentCampaign.name}
        </Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={handleCreateMockEvent}
            sx={{ mr: 1 }}
            data-testid="create-mock-event-button"
          >
            モックイベント作成
          </Button>
          <Fab
            color="primary"
            aria-label="add event"
            onClick={() => setDialogOpen(true)}
            size="medium"
            data-testid="create-event-button"
          >
            <AddIcon />
          </Fab>
        </Box>
      </Box>

      {loading ? (
        <Alert severity="info">イベントを読み込み中...</Alert>
      ) : events.length === 0 ? (
        <Alert severity="info">
          まだイベントがありません。「+」ボタンをクリックして最初のイベントを作成しましょう。
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {events.map((event) => (
            <Grid item xs={12} md={6} lg={4} key={event.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                }}
                data-testid={`event-card-${event.id}`}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="h3" noWrap>
                      {getTypeIcon(event.type)} {event.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setSelectedEvent(event);
                        setAnchorEl(e.currentTarget);
                      }}
                      data-testid={`event-menu-${event.id}`}
                    >
                      <MoreIcon />
                    </IconButton>
                  </Box>

                  <Box display="flex" gap={1} mb={2}>
                    <Chip
                      label={event.type}
                      color={getTypeColor(event.type)}
                      size="small"
                    />
                    <Chip
                      label={getEventStatusText(event)}
                      color={getEventStatusColor(event)}
                      size="small"
                    />
                    <Chip
                      label={event.difficulty}
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {event.description}
                  </Typography>

                  <Box display="flex" alignItems="center" mb={1}>
                    <ScheduleIcon fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      {new Date(event.scheduledDate).toLocaleString('ja-JP')}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <LocationIcon fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2">{event.locationId || '未設定'}</Typography>
                  </Box>

                  <Box display="flex" alignItems="center">
                    <GroupIcon fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      参加者: {event.participants.length}人
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions>
                  {!event.actualStartTime && (
                    <Tooltip title="イベント開始">
                      <Button
                        size="small"
                        startIcon={<PlayIcon />}
                        onClick={() => handleStartEvent(event.id)}
                        data-testid={`start-event-${event.id}`}
                      >
                        開始
                      </Button>
                    </Tooltip>
                  )}
                  {event.actualStartTime && !event.completedAt && (
                    <Tooltip title="イベント完了">
                      <Button
                        size="small"
                        startIcon={<CompleteIcon />}
                        onClick={() => handleCompleteEvent(event.id)}
                        data-testid={`complete-event-${event.id}`}
                      >
                        完了
                      </Button>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Event Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => selectedEvent && openEditDialog(selectedEvent)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>編集</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedEvent && handleDeleteEvent(selectedEvent.id)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>削除</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create/Edit Event Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEvent ? 'イベント編集' : '新しいイベント作成'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="イベント名"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                data-testid="event-title-input"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="説明"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                data-testid="event-description-input"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>イベントタイプ</InputLabel>
                <Select
                  value={formData.type}
                  label="イベントタイプ"
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  data-testid="event-type-select"
                >
                  <MenuItem value="story">ストーリー</MenuItem>
                  <MenuItem value="combat">戦闘</MenuItem>
                  <MenuItem value="social">社会的</MenuItem>
                  <MenuItem value="exploration">探索</MenuItem>
                  <MenuItem value="puzzle">謎解き</MenuItem>
                  <MenuItem value="rest">休息</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>難易度</InputLabel>
                <Select
                  value={formData.difficulty}
                  label="難易度"
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                  data-testid="event-difficulty-select"
                >
                  <MenuItem value="trivial">とても簡単</MenuItem>
                  <MenuItem value="easy">簡単</MenuItem>
                  <MenuItem value="medium">普通</MenuItem>
                  <MenuItem value="hard">難しい</MenuItem>
                  <MenuItem value="extreme">とても難しい</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="予定日時"
                value={formData.scheduledDate}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                data-testid="event-scheduled-date-input"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="予定時間（分）"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                data-testid="event-duration-input"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="場所"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                data-testid="event-location-input"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>参加キャラクター</InputLabel>
                <Select
                  multiple
                  value={formData.participants}
                  label="参加キャラクター"
                  onChange={(e) => setFormData(prev => ({ ...prev, participants: e.target.value as string[] }))}
                  data-testid="event-participants-select"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const character = characters.find(c => c.id === value);
                        return (
                          <Chip key={value} label={character?.name || value} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {characters.map((character) => (
                    <MenuItem key={character.id} value={character.id}>
                      {character.name} ({character.characterType})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}
            variant="contained"
            data-testid="save-event-button"
          >
            {editingEvent ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TimelinePage;