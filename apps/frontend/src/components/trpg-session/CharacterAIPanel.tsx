import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Collapse,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  Person as PersonIcon,
  Healing as HealingIcon,
  LocalFireDepartment as AttackIcon,
  Support as SupportIcon,
  Balance as BalanceIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import {
  ActionPriority,
  PersonalityType,
  CommunicationStyle,
  CharacterAISettings,
  CharacterAISettingsResponse,
  UpdateCharacterAIRequest,
  ActionAnalysis,
  Character,
  ID,
} from '@ai-agent-trpg/types';
import { apiClient } from '../../api/client';

interface CharacterAIPanelProps {
  sessionId: ID;
  characters: Character[];
  onSettingsChange?: (characterId: ID, settings: CharacterAISettings) => void;
  disabled?: boolean;
}

interface CharacterAIAPI {
  getCharacterAISettings: (sessionId: ID) => Promise<CharacterAISettingsResponse>;
  updateCharacterAI: (sessionId: ID, characterId: ID, request: UpdateCharacterAIRequest) => Promise<{ success: boolean }>;
}

const characterAIAPI: CharacterAIAPI = {
  getCharacterAISettings: async (sessionId: ID): Promise<CharacterAISettingsResponse> => {
    const response = await apiClient.get<CharacterAISettingsResponse>(`/ai-agent/character-ai?sessionId=${sessionId}`);
    return response;
  },
  updateCharacterAI: async (sessionId: ID, characterId: ID, request: UpdateCharacterAIRequest): Promise<{ success: boolean }> => {
    const response = await apiClient.put<{ success: boolean }>(`/ai-agent/character-ai/${characterId}?sessionId=${sessionId}`, request);
    return response;
  }
};

interface CharacterWithAI extends Character {
  aiSettings: CharacterAISettings;
  lastAction?: ActionAnalysis;
}

export const CharacterAIPanel: React.FC<CharacterAIPanelProps> = ({
  sessionId,
  characters,
  onSettingsChange,
  disabled = false,
}) => {
  const [charactersWithAI, setCharactersWithAI] = useState<CharacterWithAI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCharacter, setExpandedCharacter] = useState<ID | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<ID | null>(null);
  const [editingSettings, setEditingSettings] = useState<CharacterAISettings | null>(null);

  // Load character AI settings
  const loadCharacterAISettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await characterAIAPI.getCharacterAISettings(sessionId);
      
      // Merge with existing characters data
      const charactersWithAISettings: CharacterWithAI[] = characters.map(character => {
        const apiCharacter = response.characters.find(c => c.characterId === character.id);
        
        // Default AI settings if not found
        const defaultSettings: CharacterAISettings = {
          actionPriority: 'balanced',
          personality: 'calm',
          communicationStyle: 'polite',
        };
        
        return {
          ...character,
          aiSettings: apiCharacter ? {
            actionPriority: apiCharacter.actionPriority,
            personality: apiCharacter.personality,
            communicationStyle: apiCharacter.communicationStyle,
          } : defaultSettings,
          lastAction: apiCharacter?.lastAction,
        };
      });
      
      setCharactersWithAI(charactersWithAISettings);
    } catch (err) {
      setError('キャラクターAI設定の読み込みに失敗しました');
      console.error('Failed to load character AI settings:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, characters]);

  // Update character AI settings
  const updateCharacterAISettings = useCallback(async (characterId: ID, settings: CharacterAISettings) => {
    try {
      setLoading(true);
      setError(null);
      
      const request: UpdateCharacterAIRequest = {
        actionPriority: settings.actionPriority,
        personality: settings.personality,
        communicationStyle: settings.communicationStyle,
      };
      
      const result = await characterAIAPI.updateCharacterAI(sessionId, characterId, request);
      
      if (result.success) {
        // Update local state
        setCharactersWithAI(prev => prev.map(char => 
          char.id === characterId 
            ? { ...char, aiSettings: settings }
            : char
        ));
        
        onSettingsChange?.(characterId, settings);
        setEditingCharacter(null);
        setEditingSettings(null);
      } else {
        throw new Error('キャラクターAI設定の更新に失敗しました');
      }
    } catch (err) {
      setError('キャラクターAI設定の更新に失敗しました');
      console.error('Failed to update character AI settings:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, onSettingsChange]);

  // Handle edit start
  const handleEditStart = (character: CharacterWithAI) => {
    setEditingCharacter(character.id);
    setEditingSettings({ ...character.aiSettings });
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditingCharacter(null);
    setEditingSettings(null);
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (editingCharacter && editingSettings) {
      await updateCharacterAISettings(editingCharacter, editingSettings);
    }
  };

  // Load initial data
  useEffect(() => {
    loadCharacterAISettings();
  }, [loadCharacterAISettings]);

  // Display names for enums
  const actionPriorityNames: Record<ActionPriority, { label: string; icon: React.ReactNode; color: any }> = {
    attack_focus: { label: 'Attack Focus - 攻撃重視', icon: <AttackIcon />, color: 'error' },
    healing_focus: { label: 'Healing Focus - 回復重視', icon: <HealingIcon />, color: 'success' },
    support_focus: { label: 'Support Focus - 支援重視', icon: <SupportIcon />, color: 'info' },
    balanced: { label: 'Balanced - バランス型', icon: <BalanceIcon />, color: 'primary' },
  };

  const personalityTypeNames: Record<PersonalityType, string> = {
    aggressive: 'Aggressive - 積極的',
    cautious: 'Cautious - 慎重',
    calm: 'Calm - 冷静',
  };

  const communicationStyleNames: Record<CommunicationStyle, string> = {
    direct: 'Direct - 直接的',
    polite: 'Polite - 丁寧',
    casual: 'Casual - カジュアル',
  };

  // Filter AI-controllable characters (NPCs and Enemies)
  const aiCharacters = charactersWithAI.filter(char => 
    char.characterType === 'NPC' || char.characterType === 'Enemy'
  );

  if (aiCharacters.length === 0) {
    return (
      <Card data-testid="character-ai-panel">
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <PersonIcon color="disabled" />
            <Typography variant="h6" color="text.secondary">
              キャラクターAI設定
            </Typography>
          </Box>
          <Alert severity="info">
            このセッションにはAI制御可能なキャラクター（NPCまたは敵）がいません。
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card data-testid="character-ai-panel">
        <CardContent>
          {/* ヘッダー */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <PersonIcon color="primary" />
              <Typography variant="h6">
                キャラクターAI設定
              </Typography>
              <Chip
                label={`${aiCharacters.length}体のキャラクター`}
                color="primary"
                size="small"
              />
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          )}

          {/* キャラクターリスト */}
          <List>
            {aiCharacters.map((character, index) => {
              const isExpanded = expandedCharacter === character.id;
              const isEditing = editingCharacter === character.id;
              const currentSettings = isEditing ? editingSettings! : character.aiSettings;
              
              return (
                <Box key={character.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: character.characterType === 'NPC' ? 'primary.main' : 'error.main' }}>
                        {character.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            {character.name}
                          </Typography>
                          <Chip
                            label={character.characterType}
                            size="small"
                            color={character.characterType === 'NPC' ? 'primary' : 'error'}
                          />
                        </Box>
                      }
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Chip
                            label={actionPriorityNames[currentSettings.actionPriority].label}
                            size="small"
                            color={actionPriorityNames[currentSettings.actionPriority].color}
                          />
                          <Chip
                            label={personalityTypeNames[currentSettings.personality]}
                            size="small"
                            color="default"
                          />
                          <Chip
                            label={communicationStyleNames[currentSettings.communicationStyle]}
                            size="small"
                            color="default"
                          />
                        </Stack>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        {!isEditing ? (
                          <>
                            <Tooltip title="設定を編集">
                              <IconButton
                                onClick={() => handleEditStart(character)}
                                disabled={disabled || loading}
                                data-testid={`edit-character-${character.id}`}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <IconButton
                              onClick={() => setExpandedCharacter(isExpanded ? null : character.id)}
                              data-testid={`expand-character-${character.id}`}
                            >
                              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <Tooltip title="保存">
                              <IconButton
                                onClick={handleEditSave}
                                disabled={loading}
                                color="primary"
                                data-testid={`save-character-${character.id}`}
                              >
                                <SaveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="キャンセル">
                              <IconButton
                                onClick={handleEditCancel}
                                disabled={loading}
                                data-testid={`cancel-character-${character.id}`}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>

                  {/* 詳細設定エリア */}
                  <Collapse in={isExpanded || isEditing}>
                    <Box sx={{ pl: 9, pr: 2, pb: 2 }}>
                      <Grid container spacing={2}>
                        {/* 行動優先度設定 */}
                        <Grid item xs={12} md={4}>
                          <FormControl fullWidth size="small" disabled={!isEditing || disabled || loading}>
                            <InputLabel>行動優先度</InputLabel>
                            <Select
                              value={currentSettings.actionPriority}
                              onChange={(e) => setEditingSettings(prev => prev ? {
                                ...prev,
                                actionPriority: e.target.value as ActionPriority
                              } : null)}
                              label="行動優先度"
                              data-testid={`action-priority-select-${character.id}`}
                            >
                              {Object.entries(actionPriorityNames).map(([value, { label }]) => (
                                <MenuItem key={value} value={value}>
                                  {label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* 性格設定 */}
                        <Grid item xs={12} md={4}>
                          <FormControl fullWidth size="small" disabled={!isEditing || disabled || loading}>
                            <InputLabel>性格</InputLabel>
                            <Select
                              value={currentSettings.personality}
                              onChange={(e) => setEditingSettings(prev => prev ? {
                                ...prev,
                                personality: e.target.value as PersonalityType
                              } : null)}
                              label="性格"
                              data-testid={`personality-select-${character.id}`}
                            >
                              {Object.entries(personalityTypeNames).map(([value, label]) => (
                                <MenuItem key={value} value={value}>
                                  {label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* コミュニケーションスタイル設定 */}
                        <Grid item xs={12} md={4}>
                          <FormControl fullWidth size="small" disabled={!isEditing || disabled || loading}>
                            <InputLabel>会話スタイル</InputLabel>
                            <Select
                              value={currentSettings.communicationStyle}
                              onChange={(e) => setEditingSettings(prev => prev ? {
                                ...prev,
                                communicationStyle: e.target.value as CommunicationStyle
                              } : null)}
                              label="会話スタイル"
                              data-testid={`communication-style-select-${character.id}`}
                            >
                              {Object.entries(communicationStyleNames).map(([value, label]) => (
                                <MenuItem key={value} value={value}>
                                  {label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>

                      {/* 最後のアクション情報 */}
                      {character.lastAction && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            最後のAI行動
                          </Typography>
                          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" gutterBottom>
                              <strong>発話:</strong> {character.lastAction.dialogue}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>行動:</strong> {character.lastAction.behavior}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>判断理由:</strong> {character.lastAction.reasoning}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(character.lastAction.timestamp).toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Collapse>

                  {index < aiCharacters.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};