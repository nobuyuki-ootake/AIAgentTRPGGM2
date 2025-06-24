import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Paper,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  Add as AddIcon,
  Groups as NPCIcon,
  SportsEsports as EnemyIcon,
  EventNote as EventIcon,
  Inventory as ItemIcon,
  Assignment as QuestIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
} from '@mui/icons-material';
import { useRecoilValue } from 'recoil';
import { 
  EntityPool,
  EntityPoolCollection,
  ID,
} from '@ai-agent-trpg/types';
import { appModeAtom } from '../../store/atoms';

interface EntityPoolManagerProps {
  /**
   * 現在のエンティティプール
   */
  entityPool?: EntityPool;
  
  /**
   * エンティティプール更新のコールバック
   */
  onEntityPoolUpdate?: (entityPool: EntityPool) => void;
  
  /**
   * エンティティ個別更新のコールバック
   */
  onEntityUpdate?: (entityType: string, entityId: ID, updates: any) => void;
  
  /**
   * パネルの高さ
   */
  height?: number;
}

type CoreEntityType = 'enemies' | 'events' | 'npcs' | 'items' | 'quests';
type BonusEntityType = 'practicalRewards' | 'trophyItems' | 'mysteryItems';
type EntityCategory = 'core' | 'bonus';
type SortOption = 'name' | 'difficulty' | 'level' | 'createdAt';

/**
 * エンティティプール詳細管理コンポーネント
 * シナリオ作成モード専用、GM向けのエンティティ管理機能
 */
export const EntityPoolManager: React.FC<EntityPoolManagerProps> = ({
  entityPool,
  height = 600,
}) => {
  const appMode = useRecoilValue(appModeAtom);
  const [selectedEntityType, setSelectedEntityType] = useState<CoreEntityType | BonusEntityType>('enemies');
  const [selectedCategory, setSelectedCategory] = useState<EntityCategory>('core');
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [showEntityDetail, setShowEntityDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  // 開発者モードでない場合は何も表示しない
  if (appMode !== 'developer') {
    return null;
  }

  // エンティティタイプのアイコンを取得
  const getEntityTypeIcon = (type: CoreEntityType | BonusEntityType, size: 'small' | 'medium' | 'large' = 'medium') => {
    const iconSize = size === 'small' ? 24 : size === 'medium' ? 32 : 48;
    
    switch (type) {
      case 'enemies': return <EnemyIcon style={{ fontSize: iconSize }} color="error" />;
      case 'events': return <EventIcon style={{ fontSize: iconSize }} color="primary" />;
      case 'npcs': return <NPCIcon style={{ fontSize: iconSize }} color="success" />;
      case 'items': return <ItemIcon style={{ fontSize: iconSize }} color="warning" />;
      case 'quests': return <QuestIcon style={{ fontSize: iconSize }} color="info" />;
      case 'practicalRewards': return <ItemIcon style={{ fontSize: iconSize }} color="warning" />;
      case 'trophyItems': return <ItemIcon style={{ fontSize: iconSize }} color="secondary" />;
      case 'mysteryItems': return <ItemIcon style={{ fontSize: iconSize }} color="primary" />;
      default: return <ItemIcon style={{ fontSize: iconSize }} color="disabled" />;
    }
  };

  // エンティティタイプの表示名を取得
  const getEntityTypeLabel = (type: CoreEntityType | BonusEntityType) => {
    const labels = {
      enemies: '敵キャラクター',
      events: 'インタラクティブイベント',
      npcs: 'NPCキャラクター',
      items: 'アイテム',
      quests: 'クエスト',
      practicalRewards: '実用報酬',
      trophyItems: 'トロフィーアイテム',
      mysteryItems: '謎のアイテム',
    };
    return labels[type];
  };

  // 現在選択されたエンティティリストを取得
  const getCurrentEntities = () => {
    if (!entityPool) return [];
    
    let entities: any[] = [];
    
    // 新しい二層構造をサポート
    const entityCollection = entityPool.entities as EntityPoolCollection;
    if (entityCollection.coreEntities && entityCollection.bonusEntities) {
      // 新構造
      if (selectedCategory === 'core') {
        switch (selectedEntityType as CoreEntityType) {
          case 'enemies':
            entities = entityCollection.coreEntities.enemies || [];
            break;
          case 'events':
            entities = entityCollection.coreEntities.events || [];
            break;
          case 'npcs':
            entities = entityCollection.coreEntities.npcs || [];
            break;
          case 'items':
            entities = entityCollection.coreEntities.items || [];
            break;
          case 'quests':
            entities = entityCollection.coreEntities.quests || [];
            break;
        }
      } else {
        switch (selectedEntityType as BonusEntityType) {
          case 'practicalRewards':
            entities = entityCollection.bonusEntities.practicalRewards || [];
            break;
          case 'trophyItems':
            entities = entityCollection.bonusEntities.trophyItems || [];
            break;
          case 'mysteryItems':
            entities = entityCollection.bonusEntities.mysteryItems || [];
            break;
        }
      }
    } else {
      // 旧構造との互換性
      const legacyEntities = entityPool.entities as any;
      switch (selectedEntityType) {
        case 'enemies':
          entities = legacyEntities.enemies || [];
          break;
        case 'events':
          entities = legacyEntities.events || [];
          break;
        case 'npcs':
          entities = legacyEntities.npcs || [];
          break;
        case 'items':
          entities = legacyEntities.items || [];
          break;
        case 'quests':
          entities = legacyEntities.quests || [];
          break;
      }
    }

    // フィルタリング
    let filteredEntities = entities;
    
    // 検索フィルター
    if (searchQuery) {
      filteredEntities = filteredEntities.filter(entity =>
        entity.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 難易度フィルター
    if (filterDifficulty !== 'all') {
      filteredEntities = filteredEntities.filter(entity =>
        entity.difficulty === filterDifficulty ||
        entity.level?.toString() === filterDifficulty
      );
    }

    // ソート
    filteredEntities.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'difficulty':
          return (a.difficulty || '').localeCompare(b.difficulty || '');
        case 'level':
          return (a.level || 0) - (b.level || 0);
        case 'createdAt':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });

    return filteredEntities;
  };

  // 難易度に応じた色を取得
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
      case '簡単':
        return 'success';
      case 'normal':
      case '普通':
        return 'primary';
      case 'hard':
      case '困難':
        return 'warning';
      case 'very_hard':
      case '非常に困難':
        return 'error';
      default:
        return 'default';
    }
  };

  // エンティティ詳細を表示
  const showEntityDetails = (entity: any) => {
    setSelectedEntity(entity);
    setShowEntityDetail(true);
  };

  // カテゴリ選択タブ
  const CategoryTabs = () => (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant={selectedCategory === 'core' ? 'contained' : 'outlined'}
          onClick={() => {
            setSelectedCategory('core');
            setSelectedEntityType('enemies');
          }}
          size="small"
        >
          コアエンティティ
        </Button>
        <Button
          variant={selectedCategory === 'bonus' ? 'contained' : 'outlined'}
          onClick={() => {
            setSelectedCategory('bonus');
            setSelectedEntityType('practicalRewards');
          }}
          size="small"
        >
          ボーナスエンティティ
        </Button>
      </Box>
    </Box>
  );

  // エンティティタイプ選択タブ
  const EntityTypeTabs = () => {
    const coreEntityTypes: CoreEntityType[] = ['enemies', 'events', 'npcs', 'items', 'quests'];
    const bonusEntityTypes: BonusEntityType[] = ['practicalRewards', 'trophyItems', 'mysteryItems'];
    
    const entityTypes = selectedCategory === 'core' ? coreEntityTypes : bonusEntityTypes;
    
    const getEntityCount = (type: CoreEntityType | BonusEntityType) => {
      if (!entityPool) return 0;
      
      const entityCollection = entityPool.entities as EntityPoolCollection;
      if (entityCollection.coreEntities && entityCollection.bonusEntities) {
        // 新構造
        if (selectedCategory === 'core') {
          return entityCollection.coreEntities[type as CoreEntityType]?.length || 0;
        } else {
          return entityCollection.bonusEntities[type as BonusEntityType]?.length || 0;
        }
      } else {
        // 旧構造との互換性
        const legacyEntities = entityPool.entities as any;
        return legacyEntities[type]?.length || 0;
      }
    };
    
    return (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {entityTypes.map((type) => {
            const count = getEntityCount(type);
            return (
              <Button
                key={type}
                variant={selectedEntityType === type ? 'contained' : 'outlined'}
                startIcon={getEntityTypeIcon(type, 'small')}
                endIcon={<Chip label={count} size="small" />}
                onClick={() => setSelectedEntityType(type)}
                size="small"
              >
                {getEntityTypeLabel(type)}
              </Button>
            );
          })}
        </Box>
      </Box>
    );
  };

  // フィルター・検索・ソートコントロール
  const FilterControls = () => (
    <Box sx={{ mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="名前や説明で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>難易度フィルター</InputLabel>
            <Select
              value={filterDifficulty}
              label="難易度フィルター"
              onChange={(e) => setFilterDifficulty(e.target.value)}
              startAdornment={<FilterIcon sx={{ mr: 1 }} />}
            >
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="easy">簡単</MenuItem>
              <MenuItem value="normal">普通</MenuItem>
              <MenuItem value="hard">困難</MenuItem>
              <MenuItem value="very_hard">非常に困難</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>並び順</InputLabel>
            <Select
              value={sortBy}
              label="並び順"
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              startAdornment={<SortIcon sx={{ mr: 1 }} />}
            >
              <MenuItem value="name">名前順</MenuItem>
              <MenuItem value="difficulty">難易度順</MenuItem>
              <MenuItem value="level">レベル順</MenuItem>
              <MenuItem value="createdAt">作成日順</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );

  // エンティティカード
  const EntityCard = ({ entity }: { entity: any }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="div">
            {entity.name || 'Unnamed Entity'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {entity.difficulty && (
              <Chip
                label={entity.difficulty}
                color={getDifficultyColor(entity.difficulty) as any}
                size="small"
              />
            )}
            {entity.level && (
              <Chip label={`Lv.${entity.level}`} size="small" variant="outlined" />
            )}
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {entity.description || 'No description available'}
        </Typography>

        {/* エンティティタイプ固有の情報 */}
        {selectedEntityType === 'enemies' && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {entity.healthPoints && (
              <Chip label={`HP: ${entity.healthPoints}`} size="small" color="error" />
            )}
            {entity.attackPower && (
              <Chip label={`攻撃力: ${entity.attackPower}`} size="small" color="warning" />
            )}
            {entity.defenseRating && (
              <Chip label={`防御力: ${entity.defenseRating}`} size="small" color="info" />
            )}
          </Box>
        )}

        {selectedEntityType === 'npcs' && entity.role && (
          <Chip label={entity.role} size="small" color="primary" sx={{ mb: 1 }} />
        )}

        {selectedEntityType === 'items' && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {entity.type && <Chip label={entity.type} size="small" color="primary" />}
            {entity.rarity && <Chip label={entity.rarity} size="small" color="secondary" />}
          </Box>
        )}

        {selectedEntityType === 'events' && entity.eventType && (
          <Chip label={entity.eventType} size="small" color="primary" sx={{ mb: 1 }} />
        )}
      </CardContent>
      
      <CardActions>
        <Button
          size="small"
          startIcon={<PreviewIcon />}
          onClick={() => showEntityDetails(entity)}
        >
          詳細
        </Button>
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => {
            // TODO: 編集機能実装
            console.log('Edit entity:', entity);
          }}
        >
          編集
        </Button>
        <Button
          size="small"
          startIcon={<DeleteIcon />}
          color="error"
          onClick={() => {
            // TODO: 削除機能実装
            console.log('Delete entity:', entity);
          }}
        >
          削除
        </Button>
      </CardActions>
    </Card>
  );

  // エンティティリスト
  const EntityList = () => {
    const entities = getCurrentEntities();

    if (entities.length === 0) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 2 }}>
            {getEntityTypeIcon(selectedEntityType, 'large')}
          </Box>
          <Typography variant="h6" gutterBottom>
            {getEntityTypeLabel(selectedEntityType)}がありません
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            AI生成機能を使用してエンティティプールを作成するか、
            手動でエンティティを追加してください。
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
            onClick={() => {
              // TODO: エンティティ追加機能実装
              console.log('Add new entity');
            }}
          >
            新しい{getEntityTypeLabel(selectedEntityType)}を追加
          </Button>
        </Paper>
      );
    }

    return (
      <Box>
        {entities.map((entity, index) => (
          <EntityCard key={entity.id || index} entity={entity} />
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ItemIcon color="primary" />
          エンティティプール管理
          <Chip label="GM専用" color="warning" size="small" />
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          このツールはシナリオ作成専用です。生成されたエンティティはプレイヤーには表示されません。
        </Alert>

        {!entityPool && (
          <Alert severity="warning">
            エンティティプールが生成されていません。シナリオエディタのAI生成機能を使用してください。
          </Alert>
        )}
      </Box>

      {entityPool && (
        <>
          {/* カテゴリ選択 */}
          <CategoryTabs />
          
          {/* エンティティタイプ選択 */}
          <EntityTypeTabs />

          {/* フィルター・検索・ソートコントロール */}
          <FilterControls />

          {/* エンティティリスト */}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <EntityList />
          </Box>
        </>
      )}

      {/* エンティティ詳細ダイアログ */}
      <Dialog
        open={showEntityDetail}
        onClose={() => setShowEntityDetail(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getEntityTypeIcon(selectedEntityType, 'small')}
          {selectedEntity?.name || 'エンティティ詳細'}
        </DialogTitle>
        <DialogContent>
          {selectedEntity && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedEntity.description}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* エンティティタイプ固有の詳細情報 */}
              {selectedEntityType === 'enemies' && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">ステータス</Typography>
                    <Typography>HP: {selectedEntity.healthPoints || 'N/A'}</Typography>
                    <Typography>攻撃力: {selectedEntity.attackPower || 'N/A'}</Typography>
                    <Typography>防御力: {selectedEntity.defenseRating || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">基本情報</Typography>
                    <Typography>レベル: {selectedEntity.level || 'N/A'}</Typography>
                    <Typography>難易度: {selectedEntity.difficulty || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              )}

              {selectedEntityType === 'npcs' && (
                <Box>
                  <Typography variant="subtitle2">NPC情報</Typography>
                  <Typography>役割: {selectedEntity.role || 'N/A'}</Typography>
                  <Typography>重要度: {selectedEntity.importance || 'N/A'}</Typography>
                </Box>
              )}

              {selectedEntityType === 'items' && (
                <Box>
                  <Typography variant="subtitle2">アイテム情報</Typography>
                  <Typography>タイプ: {selectedEntity.type || 'N/A'}</Typography>
                  <Typography>レア度: {selectedEntity.rarity || 'N/A'}</Typography>
                  <Typography>効果: {selectedEntity.effect || 'N/A'}</Typography>
                </Box>
              )}

              {selectedEntityType === 'events' && (
                <Box>
                  <Typography variant="subtitle2">イベント情報</Typography>
                  <Typography>タイプ: {selectedEntity.eventType || 'N/A'}</Typography>
                  <Typography>トリガー: {selectedEntity.trigger || 'N/A'}</Typography>
                  <Typography>結果: {selectedEntity.outcome || 'N/A'}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEntityDetail(false)}>
            閉じる
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => {
              // TODO: 編集機能実装
              setShowEntityDetail(false);
            }}
          >
            編集
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntityPoolManager;