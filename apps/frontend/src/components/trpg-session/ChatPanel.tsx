import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Divider,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Avatar,
} from '@mui/material';
import {
  SendRounded,
  CasinoRounded,
  PersonRounded,
  GroupsRounded,
} from '@mui/icons-material';
import { SessionState, Character } from '@ai-agent-trpg/types';

interface ChatPanelProps {
  session: SessionState;
  characters: Character[];
  isPlayerMode?: boolean;
  onSendMessage: (message: string, type: 'ic' | 'ooc', characterId?: string) => void;
  onRollDice: (dice: string, purpose: string, characterId?: string) => void;
  currentChallenge?: {
    description: string;
    difficulty: number;
    modifiers: string[];
  };
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  session,
  characters,
  isPlayerMode = false,
  onSendMessage,
  onRollDice,
  _currentChallenge,
}) => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'ic' | 'ooc'>('ic');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.chatLog]);

  const handleSendMessage = useCallback(() => {
    if (message.trim()) {
      onSendMessage(
        message.trim(),
        messageType,
        selectedCharacterId || undefined,
      );
      setMessage('');
    }
  }, [message, messageType, selectedCharacterId, onSendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleQuickDice = useCallback((dice: string) => {
    const purpose = selectedCharacterId
      ? `${characters.find(c => c.id === selectedCharacterId)?.name} のロール`
      : 'クイックロール';
    onRollDice(dice, purpose, selectedCharacterId || undefined);
  }, [selectedCharacterId, characters, onRollDice]);

  const placeholderText = useMemo(() => {
    return messageType === 'ic'
      ? 'キャラクターとしてメッセージを入力...'
      : 'プレイヤーとしてメッセージを入力...';
  }, [messageType]);

  const handleCharacterChange = useCallback((e: any) => {
    setSelectedCharacterId(e.target.value);
  }, []);

  const handleMessageTypeChange = useCallback((e: any) => {
    setMessageType(e.target.value as 'ic' | 'ooc');
  }, []);

  const getMessageColor = useCallback((type: string) => {
    switch (type) {
    case 'ic': return 'primary';
    case 'ooc': return 'default';
    case 'system': return 'info';
    case 'dice': return 'success';
    case 'whisper': return 'secondary';
    default: return 'default';
    }
  }, []);

  const getMessageIcon = useCallback((type: string) => {
    switch (type) {
    case 'ic': return <PersonRounded />;
    case 'ooc': return <GroupsRounded />;
    case 'dice': return <CasinoRounded />;
    default: return null;
    }
  }, []);

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">チャット</Typography>
      </Box>

      {/* メッセージ表示エリア */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          bgcolor: 'background.default',
        }}
      >
        <Stack spacing={1}>
          {session.chatLog.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
              }}
            >
              {/* アイコン */}
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: `${getMessageColor(msg.type)}.main`,
                  fontSize: '1rem',
                }}
              >
                {getMessageIcon(msg.type) || msg.speaker.charAt(0)}
              </Avatar>

              {/* メッセージ内容 */}
              <Box sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {msg.speaker}
                  </Typography>
                  <Chip
                    label={msg.type.toUpperCase()}
                    size="small"
                    color={getMessageColor(msg.type)}
                    sx={{ height: 20 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(msg.timestamp).toLocaleTimeString('ja-JP')}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.message}
                </Typography>
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Stack>
      </Box>

      <Divider />

      {/* ダイスクイックボタン - プレイヤーモード時は非表示 */}
      {!isPlayerMode && (
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1}>
            <Typography variant="caption" sx={{ alignSelf: 'center', mr: 1 }}>
              クイックダイス:
            </Typography>
            {['1d4', '1d6', '1d8', '1d10', '1d12', '1d20', '1d100'].map((dice) => (
              <Chip
                key={dice}
                label={dice}
                size="small"
                clickable
                onClick={() => handleQuickDice(dice)}
                icon={<CasinoRounded />}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* 入力エリア */}
      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          {/* キャラクター選択とメッセージタイプ */}
          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>キャラクター</InputLabel>
              <Select
                value={selectedCharacterId}
                onChange={handleCharacterChange}
                label="キャラクター"
              >
                <MenuItem value="">
                  <em>プレイヤー</em>
                </MenuItem>
                {characters.map((char) => (
                  <MenuItem key={char.id} value={char.id}>
                    {char.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>タイプ</InputLabel>
              <Select
                value={messageType}
                onChange={handleMessageTypeChange}
                label="タイプ"
              >
                <MenuItem value="ic">IC</MenuItem>
                <MenuItem value="ooc">OOC</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* メッセージ入力 */}
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholderText}
              size="small"
            />
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={!message.trim()}
            >
              <SendRounded />
            </IconButton>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};