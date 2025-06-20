import { Router } from 'express';
import { Character, APIResponse } from '@ai-agent-trpg/types';
import { characterService } from '../services/characterService';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';

export const characterRouter = Router();

// キャラクター一覧取得（キャンペーン別）
characterRouter.get('/', asyncHandler(async (req, res) => {
  const campaignId = req.query.campaignId as string;
  const characterType = req.query.characterType as string;

  if (!campaignId) {
    throw new ValidationError('Campaign ID is required');
  }

  const characters = await characterService.getCharactersByCampaign(campaignId, characterType);

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

  const character = await characterService.getCharacterById(id);

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
  const characterData = req.body;

  if (!characterData.name || !characterData.campaignId || !characterData.characterType) {
    throw new ValidationError('Character name, campaign ID, and character type are required');
  }

  const character = await characterService.createCharacter(characterData);

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

  const character = await characterService.updateCharacter(id, updateData);

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

  const deleted = await characterService.deleteCharacter(id);

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