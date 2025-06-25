import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Button,
  IconButton,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { EntityEditFormProps } from './EventEditForm';

interface ItemEditFormProps extends EntityEditFormProps {
  entity: any; // Item/PoolItem type
}

export const ItemEditForm: React.FC<ItemEditFormProps> = ({
  entity,
  onEntityUpdate
}) => {
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);

  const handlePanelChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Effects management
  const addEffect = () => {
    const newEffect = {
      type: 'stat_boost',
      magnitude: 1,
      description: '',
      duration: 0
    };
    const effects = entity.effects || [];
    onEntityUpdate({
      effects: [...effects, newEffect]
    });
  };

  const updateEffect = (index: number, updates: any) => {
    const effects = [...(entity.effects || [])];
    effects[index] = { ...effects[index], ...updates };
    onEntityUpdate({ effects });
  };

  const removeEffect = (index: number) => {
    const effects = [...(entity.effects || [])];
    effects.splice(index, 1);
    onEntityUpdate({ effects });
  };

  // Acquisition methods management
  const addAcquisitionMethod = () => {
    const newMethod = {
      type: 'purchase',
      source: '',
      cost: 0,
      availability: 'common'
    };
    const methods = entity.acquisitionMethods || [];
    onEntityUpdate({
      acquisitionMethods: [...methods, newMethod]
    });
  };

  const updateAcquisitionMethod = (index: number, updates: any) => {
    const methods = [...(entity.acquisitionMethods || [])];
    methods[index] = { ...methods[index], ...updates };
    onEntityUpdate({ acquisitionMethods: methods });
  };

  const removeAcquisitionMethod = (index: number) => {
    const methods = [...(entity.acquisitionMethods || [])];
    methods.splice(index, 1);
    onEntityUpdate({ acquisitionMethods: methods });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 基本情報 */}
      <Typography variant="h6" gutterBottom>基本情報</Typography>
      
      <TextField
        label="名前"
        fullWidth
        value={entity.name || ''}
        onChange={(e) => onEntityUpdate({ name: e.target.value })}
        variant="outlined"
      />
      
      <TextField
        label="説明"
        fullWidth
        multiline
        rows={3}
        value={entity.description || ''}
        onChange={(e) => onEntityUpdate({ description: e.target.value })}
        variant="outlined"
      />
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel>アイテムタイプ</InputLabel>
          <Select
            value={entity.type || 'misc'}
            label="アイテムタイプ"
            onChange={(e) => onEntityUpdate({ type: e.target.value })}
          >
            <MenuItem value="weapon">武器</MenuItem>
            <MenuItem value="armor">防具</MenuItem>
            <MenuItem value="accessory">アクセサリー</MenuItem>
            <MenuItem value="consumable">消耗品</MenuItem>
            <MenuItem value="tool">道具</MenuItem>
            <MenuItem value="misc">その他</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl fullWidth>
          <InputLabel>レアリティ</InputLabel>
          <Select
            value={entity.rarity || 'common'}
            label="レアリティ"
            onChange={(e) => onEntityUpdate({ rarity: e.target.value })}
          >
            <MenuItem value="common">コモン</MenuItem>
            <MenuItem value="uncommon">アンコモン</MenuItem>
            <MenuItem value="rare">レア</MenuItem>
            <MenuItem value="epic">エピック</MenuItem>
            <MenuItem value="legendary">レジェンダリー</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="価値（ゴールド）"
          type="number"
          fullWidth
          value={entity.value || 0}
          onChange={(e) => onEntityUpdate({ value: parseInt(e.target.value) || 0 })}
          variant="outlined"
        />
        
        <TextField
          label="重量（kg）"
          type="number"
          step="0.1"
          fullWidth
          value={entity.weight || 0}
          onChange={(e) => onEntityUpdate({ weight: parseFloat(e.target.value) || 0 })}
          variant="outlined"
        />
        
        <TextField
          label="数量"
          type="number"
          fullWidth
          value={entity.quantity || 1}
          onChange={(e) => onEntityUpdate({ quantity: parseInt(e.target.value) || 1 })}
          variant="outlined"
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 詳細設定 - アコーディオン */}
      <Typography variant="h6" gutterBottom>詳細設定</Typography>

      {/* 効果設定 */}
      <Accordion expanded={expandedPanel === 'effects'} onChange={handlePanelChange('effects')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>アイテム効果</Typography>
          {entity.effects?.length > 0 && (
            <Chip 
              label={`${entity.effects.length}個`} 
              size="small" 
              color="primary" 
              sx={{ ml: 1 }}
            />
          )}
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(entity.effects || []).map((effect: any, index: number) => (
              <Box key={index} sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>効果タイプ</InputLabel>
                    <Select
                      value={effect.type || 'stat_boost'}
                      label="効果タイプ"
                      onChange={(e) => updateEffect(index, { type: e.target.value })}
                    >
                      <MenuItem value="stat_boost">能力値強化</MenuItem>
                      <MenuItem value="healing">回復</MenuItem>
                      <MenuItem value="damage">ダメージ</MenuItem>
                      <MenuItem value="buff">バフ</MenuItem>
                      <MenuItem value="debuff">デバフ</MenuItem>
                      <MenuItem value="utility">実用効果</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label="効果値"
                    type="number"
                    value={effect.magnitude || 0}
                    onChange={(e) => updateEffect(index, { magnitude: parseInt(e.target.value) || 0 })}
                    sx={{ width: 100 }}
                  />
                  
                  <TextField
                    label="持続時間"
                    type="number"
                    value={effect.duration || 0}
                    onChange={(e) => updateEffect(index, { duration: parseInt(e.target.value) || 0 })}
                    sx={{ width: 100 }}
                    helperText="0=即座, -1=永続"
                  />
                  
                  <IconButton
                    color="error"
                    onClick={() => removeEffect(index)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                
                <TextField
                  label="効果説明"
                  fullWidth
                  value={effect.description || ''}
                  onChange={(e) => updateEffect(index, { description: e.target.value })}
                  variant="outlined"
                  placeholder="この効果の詳細説明を入力"
                />
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addEffect}
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            >
              効果を追加
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 入手方法設定 */}
      <Accordion expanded={expandedPanel === 'acquisition'} onChange={handlePanelChange('acquisition')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>入手方法</Typography>
          {entity.acquisitionMethods?.length > 0 && (
            <Chip 
              label={`${entity.acquisitionMethods.length}個`} 
              size="small" 
              color="secondary" 
              sx={{ ml: 1 }}
            />
          )}
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(entity.acquisitionMethods || []).map((method: any, index: number) => (
              <Box key={index} sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>入手タイプ</InputLabel>
                    <Select
                      value={method.type || 'purchase'}
                      label="入手タイプ"
                      onChange={(e) => updateAcquisitionMethod(index, { type: e.target.value })}
                    >
                      <MenuItem value="purchase">購入</MenuItem>
                      <MenuItem value="quest_reward">クエスト報酬</MenuItem>
                      <MenuItem value="loot">戦利品</MenuItem>
                      <MenuItem value="crafting">クラフト</MenuItem>
                      <MenuItem value="treasure">宝物</MenuItem>
                      <MenuItem value="gift">贈り物</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label="入手先"
                    value={method.source || ''}
                    onChange={(e) => updateAcquisitionMethod(index, { source: e.target.value })}
                    sx={{ flexGrow: 1 }}
                    placeholder="店舗名、NPC名、場所など"
                  />
                  
                  <TextField
                    label="コスト"
                    type="number"
                    value={method.cost || 0}
                    onChange={(e) => updateAcquisitionMethod(index, { cost: parseInt(e.target.value) || 0 })}
                    sx={{ width: 100 }}
                  />
                  
                  <IconButton
                    color="error"
                    onClick={() => removeAcquisitionMethod(index)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                
                <FormControl fullWidth>
                  <InputLabel>入手難易度</InputLabel>
                  <Select
                    value={method.availability || 'common'}
                    label="入手難易度"
                    onChange={(e) => updateAcquisitionMethod(index, { availability: e.target.value })}
                  >
                    <MenuItem value="always">常時入手可能</MenuItem>
                    <MenuItem value="common">一般的</MenuItem>
                    <MenuItem value="uncommon">やや珍しい</MenuItem>
                    <MenuItem value="rare">稀少</MenuItem>
                    <MenuItem value="unique">一点物</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addAcquisitionMethod}
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            >
              入手方法を追加
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* その他設定 */}
      <Accordion expanded={expandedPanel === 'other'} onChange={handlePanelChange('other')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>その他設定</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="カスタムプロパティ（JSON形式）"
              fullWidth
              multiline
              rows={3}
              value={JSON.stringify(entity.properties || {}, null, 2)}
              onChange={(e) => {
                try {
                  const properties = JSON.parse(e.target.value);
                  onEntityUpdate({ properties });
                } catch (error) {
                  // JSON解析エラーは無視（入力中）
                }
              }}
              variant="outlined"
              placeholder='{"特殊能力": "値", "制限": "条件"}'
              helperText="JSON形式でカスタムプロパティを定義できます"
            />
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};