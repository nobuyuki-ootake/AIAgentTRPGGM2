import { Router } from 'express';
import { Character, APIResponse } from '@ai-agent-trpg/types';
import { getCharacterService } from '../services/characterService';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';

export const characterRouter = Router();

// キャラクター一覧取得（キャンペーン別）
characterRouter.get('/', asyncHandler(async (req, res) => {
  const campaignId = req.query.campaignId as string;
  const characterType = req.query.characterType as string;

  if (!campaignId) {
    throw new ValidationError('Campaign ID is required');
  }

  const characters = await getCharacterService().getCharactersByCampaign(campaignId, characterType);

  const response: APIResponse<Character[]> = {
    success: true,
    data: characters,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// キャラクター詳細取得
characterRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const character = await getCharacterService().getCharacterById(id);

  if (!character) {
    throw new NotFoundError('Character', id);
  }

  const response: APIResponse<Character> = {
    success: true,
    data: character,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// キャラクター作成
characterRouter.post('/', asyncHandler(async (req, res) => {
  console.log('=== Creating character ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  const characterData = req.body;

  if (!characterData.name || !characterData.campaignId || !characterData.characterType) {
    console.log('Validation failed - missing required fields');
    throw new ValidationError('Character name, campaign ID, and character type are required');
  }

  console.log('Calling characterService.createCharacter...');
  const character = await getCharacterService().createCharacter(characterData);
  console.log('Character service returned:', character ? `${character.name} (${character.id})` : 'null');

  const response: APIResponse<Character> = {
    success: true,
    data: character,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
}));

// キャラクター更新
characterRouter.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const character = await getCharacterService().updateCharacter(id, updateData);

  if (!character) {
    throw new NotFoundError('Character', id);
  }

  const response: APIResponse<Character> = {
    success: true,
    data: character,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// キャラクター削除
characterRouter.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await getCharacterService().deleteCharacter(id);

  if (!deleted) {
    throw new NotFoundError('Character', id);
  }

  const response: APIResponse<null> = {
    success: true,
    data: null,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));