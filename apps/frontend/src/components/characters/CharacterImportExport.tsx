import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tab,
  Tabs,
  TextField,
  Alert,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  ImportExportRounded,
  DownloadRounded,
  UploadRounded,
  DeleteRounded,
  ContentCopyRounded,
} from '@mui/icons-material';
import { Character, TRPGCharacter } from '@ai-agent-trpg/types';

interface CharacterImportExportProps {
  open: boolean;
  onClose: () => void;
  characters: Character[];
  onImportCharacter: (character: Character) => void;
  campaignId: string;
}

interface ExportableCharacter extends Omit<TRPGCharacter, 'id' | 'campaignId' | 'createdAt' | 'updatedAt'> {
  exportVersion: string;
  exportDate: string;
}

export const CharacterImportExport: React.FC<CharacterImportExportProps> = ({
  open,
  onClose,
  characters,
  onImportCharacter,
  campaignId,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [savedCharacters, setSavedCharacters] = useState<ExportableCharacter[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ローカルストレージからキャラクターを読み込み
  React.useEffect(() => {
    if (open) {
      loadSavedCharacters();
    }
  }, [open]);

  const loadSavedCharacters = () => {
    try {
      const saved = localStorage.getItem('trpg-saved-characters');
      if (saved) {
        const characters = JSON.parse(saved) as ExportableCharacter[];
        setSavedCharacters(characters);
      }
    } catch (error) {
      console.error('Failed to load saved characters:', error);
    }
  };

  const saveCharacterToLocal = (character: ExportableCharacter) => {
    try {
      const saved = localStorage.getItem('trpg-saved-characters');
      const existingCharacters = saved ? JSON.parse(saved) as ExportableCharacter[] : [];
      
      // 既存の同名キャラクターを削除
      const filteredCharacters = existingCharacters.filter(c => c.name !== character.name);
      const updatedCharacters = [...filteredCharacters, character];
      
      localStorage.setItem('trpg-saved-characters', JSON.stringify(updatedCharacters));
      setSavedCharacters(updatedCharacters);
    } catch (error) {
      console.error('Failed to save character to local storage:', error);
    }
  };

  const deleteCharacterFromLocal = (characterName: string) => {
    try {
      const saved = localStorage.getItem('trpg-saved-characters');
      if (saved) {
        const characters = JSON.parse(saved) as ExportableCharacter[];
        const filtered = characters.filter(c => c.name !== characterName);
        localStorage.setItem('trpg-saved-characters', JSON.stringify(filtered));
        setSavedCharacters(filtered);
      }
    } catch (error) {
      console.error('Failed to delete character from local storage:', error);
    }
  };

  const exportCharacter = (character: Character) => {
    const trpgCharacter = character as TRPGCharacter;
    const exportableCharacter: any = {
      name: trpgCharacter.name,
      characterType: trpgCharacter.characterType,
      characterClass: trpgCharacter.characterClass,
      level: trpgCharacter.level,
      experience: trpgCharacter.experience,
      description: trpgCharacter.description,
      background: trpgCharacter.background,
      baseStats: trpgCharacter.baseStats,
      derivedStats: trpgCharacter.derivedStats,
      skills: trpgCharacter.skills,
      equipment: trpgCharacter.equipment,
      notes: trpgCharacter.gmNotes,
      imageUrl: trpgCharacter.appearance?.image,
      exportVersion: '1.0',
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(exportableCharacter, null, 2);
  };

  const downloadCharacter = (character: Character) => {
    const exportData = exportCharacter(character);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name.replace(/[^a-zA-Z0-9]/g, '_')}_character.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveCharacterToLibrary = (character: Character) => {
    const trpgCharacter = character as TRPGCharacter;
    const exportableCharacter: any = {
      name: trpgCharacter.name,
      characterType: trpgCharacter.characterType,
      characterClass: trpgCharacter.characterClass,
      level: trpgCharacter.level,
      experience: trpgCharacter.experience,
      description: trpgCharacter.description,
      background: trpgCharacter.background,
      baseStats: trpgCharacter.baseStats,
      derivedStats: trpgCharacter.derivedStats,
      skills: trpgCharacter.skills,
      equipment: trpgCharacter.equipment,
      notes: trpgCharacter.gmNotes,
      imageUrl: trpgCharacter.appearance?.image,
      exportVersion: '1.0',
      exportDate: new Date().toISOString(),
    };

    saveCharacterToLocal(exportableCharacter);
  };

  const copyToClipboard = (character: Character) => {
    const exportData = exportCharacter(character);
    navigator.clipboard.writeText(exportData).then(() => {
      // クリップボードにコピー成功の通知を表示（実装は省略）
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportText(content);
        processImport(content);
      };
      reader.readAsText(file);
    }
  };

  const processImport = (text: string) => {
    try {
      setImportError(null);
      const characterData = JSON.parse(text) as ExportableCharacter;
      
      // 基本的な検証
      if (!characterData.name || !characterData.characterType) {
        throw new Error('無効なキャラクターデータです。必要なフィールドが不足しています。');
      }

      // 新しいIDを生成してインポート
      const importedCharacter = {
        ...characterData,
        id: `imported_${Date.now()}`,
        campaignId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as TRPGCharacter;

      onImportCharacter(importedCharacter);
      setImportText('');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'インポートに失敗しました');
    }
  };

  const handleImportFromText = () => {
    if (importText.trim()) {
      processImport(importText);
    }
  };

  const importFromLibrary = (savedCharacter: ExportableCharacter) => {
    const importedCharacter = {
      ...savedCharacter,
      id: `imported_${Date.now()}`,
      campaignId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as TRPGCharacter;

    onImportCharacter(importedCharacter);
  };

  const getCharacterSummary = (character: Character | ExportableCharacter) => {
    const trpgChar = character as TRPGCharacter;
    return `レベル${trpgChar.level} ${trpgChar.characterClass} (${trpgChar.characterType})`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ImportExportRounded color="primary" />
          <Typography variant="h6">
            キャラクター インポート/エクスポート
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 2 }}>
          <Tab label="エクスポート" />
          <Tab label="インポート" />
          <Tab label="マイライブラリ" />
        </Tabs>

        {/* エクスポートタブ */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              キャラクターをファイルに保存したり、他のキャンペーンで使用するためにライブラリに保存できます。
            </Typography>

            {characters.length === 0 ? (
              <Alert severity="info">
                エクスポートできるキャラクターがありません。
              </Alert>
            ) : (
              <List>
                {characters.map((character) => (
                  <React.Fragment key={character.id}>
                    <ListItem>
                      <ListItemText
                        primary={character.name}
                        secondary={getCharacterSummary(character)}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => saveCharacterToLibrary(character)}
                            title="ライブラリに保存"
                          >
                            <ImportExportRounded />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(character)}
                            title="クリップボードにコピー"
                          >
                            <ContentCopyRounded />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => downloadCharacter(character)}
                            title="ファイルとしてダウンロード"
                          >
                            <DownloadRounded />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* インポートタブ */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ファイルから読み込むか、直接JSONデータを貼り付けてキャラクターをインポートできます。
            </Typography>

            {importError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {importError}
              </Alert>
            )}

            <Box sx={{ mb: 3 }}>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <Button
                variant="outlined"
                startIcon={<UploadRounded />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ mb: 2 }}
              >
                ファイルを選択
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                または、JSONデータを直接貼り付け
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="エクスポートしたJSONデータをここに貼り付けてください..."
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                onClick={handleImportFromText}
                disabled={!importText.trim()}
              >
                インポート
              </Button>
            </Box>
          </Box>
        )}

        {/* マイライブラリタブ */}
        {activeTab === 2 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              保存済みのキャラクターライブラリです。ここからキャラクターを現在のキャンペーンにインポートできます。
            </Typography>

            {savedCharacters.length === 0 ? (
              <Alert severity="info">
                保存されているキャラクターがありません。エクスポートタブからキャラクターをライブラリに保存してください。
              </Alert>
            ) : (
              <List>
                {savedCharacters.map((character, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={character.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {getCharacterSummary(character)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              保存日: {new Date(character.exportDate).toLocaleDateString('ja-JP')}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => importFromLibrary(character)}
                          >
                            インポート
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => deleteCharacterFromLocal(character.name)}
                            color="error"
                          >
                            <DeleteRounded />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};