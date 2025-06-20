import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  Stack,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Send as SendIcon,
  SmartToy as AIIcon,
  PersonAdd as InviteIcon,
  Close as CloseIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { 
  CharacterConversation, 
  ConversationMessage, 
  Character,
  ConversationStartRequest,
  ID 
} from '@ai-agent-trpg/types';
import { useConversations } from '@/hooks/useConversations';

interface ConversationPanelProps {
  locationId: ID;
  characters: Character[];
  currentUserId?: ID; // プレイヤーのキャラクターID
}

const ConversationPanel: React.FC<ConversationPanelProps> = ({
  locationId,
  characters,
  currentUserId,
}) => {
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<ID[]>([]);
  const [conversationType, setConversationType] = useState<ConversationStartRequest['conversationType']>('casual');
  const [initialMessage, setInitialMessage] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const {
    conversations,
    activeConversation,
    loading,
    startConversation,
    addMessage,
    generateAIResponse,
    endConversation,
    selectConversation,
  } = useConversations(locationId);

  const handleStartConversation = async () => {
    if (!currentUserId || selectedTargets.length === 0) return;

    try {
      const request: ConversationStartRequest = {
        initiatorId: currentUserId,
        targetCharacterIds: selectedTargets,
        locationId,
        conversationType,
        initialMessage: initialMessage || undefined,
      };

      await startConversation(request);
      setStartDialogOpen(false);
      setSelectedTargets([]);
      setInitialMessage('');
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!activeConversation || !currentUserId || !newMessage.trim()) return;

    try {
      await addMessage(activeConversation.id, currentUserId, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleAIResponse = async (characterId: ID) => {
    if (!activeConversation) return;

    try {
      await generateAIResponse(activeConversation.id, characterId);
    } catch (error) {
      console.error('Failed to generate AI response:', error);
    }
  };

  const getCharacterName = (characterId: ID) => {
    return characters.find(c => c.id === characterId)?.name || 'Unknown';
  };

  const getMessageColor = (message: ConversationMessage) => {
    if (message.speakerId === currentUserId) return 'primary.light';
    const character = characters.find(c => c.id === message.speakerId);
    if (character?.characterType === 'NPC') return 'secondary.light';
    if (character?.characterType === 'Enemy') return 'error.light';
    return 'grey.100';
  };

  const availableTargets = characters.filter(c => 
    c.id !== currentUserId && 
    (!activeConversation || !activeConversation.participants.includes(c.id))
  );

  const nonUserParticipants = activeConversation?.participants.filter(id => id !== currentUserId) || [];

  return (
    <Box>
      {/* 会話一覧 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <ChatIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              進行中の会話 ({conversations.length})
            </Typography>
            {currentUserId && (
              <Button
                variant="contained"
                startIcon={<ChatIcon />}
                onClick={() => setStartDialogOpen(true)}
                size="small"
                disabled={characters.length <= 1}
              >
                会話開始
              </Button>
            )}
          </Box>

          {conversations.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              まだ会話がありません
            </Typography>
          ) : (
            <List dense>
              {conversations.map((conversation) => (
                <ListItem
                  key={conversation.id}
                  button
                  selected={activeConversation?.id === conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                  divider
                >
                  <ListItemText
                    primary={conversation.title || `${conversation.conversationType} conversation`}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={conversation.mood}
                          size="small"
                          color={conversation.mood === 'friendly' ? 'success' : 'default'}
                        />
                        <Typography variant="caption">
                          参加者: {conversation.participants.map(getCharacterName).join(', ')}
                        </Typography>
                      </Box>
                    }
                  />
                  {conversation.status === 'active' && (
                    <Chip label="進行中" color="primary" size="small" />
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* アクティブな会話 */}
      {activeConversation && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {activeConversation.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => endConversation(activeConversation.id)}
                >
                  会話終了
                </Button>
              </Box>
            </Box>

            {/* メッセージ履歴 */}
            <Paper sx={{ maxHeight: 300, overflow: 'auto', p: 1, mb: 2 }}>
              {activeConversation.messages.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  まだメッセージがありません
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {activeConversation.messages.map((message) => (
                    <Box
                      key={message.id}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: getMessageColor(message),
                        alignSelf: message.speakerId === currentUserId ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {getCharacterName(message.speakerId)} • {new Date(message.timestamp).toLocaleTimeString()}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {message.content}
                      </Typography>
                      {message.metadata?.emotion && (
                        <Chip 
                          label={message.metadata.emotion} 
                          size="small" 
                          sx={{ mt: 0.5 }} 
                        />
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>

            {/* メッセージ送信 */}
            {currentUserId && activeConversation.status === 'active' && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="メッセージを入力..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || loading}
                  startIcon={<SendIcon />}
                >
                  送信
                </Button>
              </Box>
            )}

            {/* AI応答ボタン */}
            {nonUserParticipants.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ width: '100%', mb: 1 }}>
                  AI応答を生成:
                </Typography>
                {nonUserParticipants.map((characterId) => (
                  <Button
                    key={characterId}
                    variant="outlined"
                    size="small"
                    startIcon={<AIIcon />}
                    onClick={() => handleAIResponse(characterId)}
                    disabled={loading}
                  >
                    {getCharacterName(characterId)}
                  </Button>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* 会話開始ダイアログ */}
      <Dialog open={startDialogOpen} onClose={() => setStartDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新しい会話を開始</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>会話の種類</InputLabel>
              <Select
                value={conversationType}
                onChange={(e) => setConversationType(e.target.value as any)}
                label="会話の種類"
              >
                <MenuItem value="casual">雑談</MenuItem>
                <MenuItem value="information">情報交換</MenuItem>
                <MenuItem value="negotiation">交渉</MenuItem>
                <MenuItem value="quest">クエスト関連</MenuItem>
                <MenuItem value="conflict">対立</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>話しかける相手</InputLabel>
              <Select
                multiple
                value={selectedTargets}
                onChange={(e) => setSelectedTargets(e.target.value as ID[])}
                label="話しかける相手"
              >
                {availableTargets.map((character) => (
                  <MenuItem key={character.id} value={character.id}>
                    {character.name} ({character.characterType})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="最初のメッセージ（任意）"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="会話の口火を切るメッセージを入力..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartDialogOpen(false)}>
            キャンセル
          </Button>
          <Button 
            variant="contained" 
            onClick={handleStartConversation}
            disabled={selectedTargets.length === 0 || !currentUserId}
          >
            会話開始
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConversationPanel;