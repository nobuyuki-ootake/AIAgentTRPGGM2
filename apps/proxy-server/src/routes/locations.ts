import { Router } from 'express';
import { Location, APIResponse, PaginatedResponse } from '@ai-agent-trpg/types';
import { locationService, CreateLocationData, MoveCharacterData, LocationSearchQuery } from '../services/locationService';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 場所一覧の取得
 */
router.get('/', asyncHandler(async (req, res) => {
  const query: LocationSearchQuery = {
    name: req.query.name as string,
    type: req.query.type ? (Array.isArray(req.query.type) ? req.query.type : [req.query.type]) as string[] : undefined,
    parentLocationId: req.query.parentLocationId as string,
    isKnown: req.query.isKnown ? req.query.isKnown === 'true' : undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };

  const result = await locationService.getLocations(query);
  
  logger.info('Locations retrieved successfully', {
    component: 'locations-api',
    query,
    totalCount: result.totalCount
  });

  const response: APIResponse<PaginatedResponse<Location>> = {
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 特定の場所の詳細取得
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const location = await locationService.getLocationById(id);

  if (!location) {
    throw new NotFoundError('Location', id);
  }

  logger.info('Location retrieved successfully', {
    component: 'locations-api',
    locationId: id,
    locationName: location.name
  });

  const response: APIResponse<Location> = {
    success: true,
    data: location,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 新しい場所の作成
 */
router.post('/', asyncHandler(async (req, res) => {
  const locationData: CreateLocationData = req.body;
  const location = await locationService.createLocation(locationData);

  logger.info('Location created successfully', {
    component: 'locations-api',
    locationId: location.id,
    locationName: location.name
  });

  const response: APIResponse<Location> = {
    success: true,
    data: location,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
}));

/**
 * 場所の更新
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const location = await locationService.updateLocation(id, updates);

  if (!location) {
    throw new NotFoundError('Location', id);
  }

  logger.info('Location updated successfully', {
    component: 'locations-api',
    locationId: id,
    locationName: location.name
  });

  const response: APIResponse<Location> = {
    success: true,
    data: location,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * キャラクターの移動
 */
router.post('/move', asyncHandler(async (req, res) => {
  const moveData: MoveCharacterData = req.body;
  const movement = await locationService.moveCharacter(moveData);

  logger.info('Character moved successfully', {
    component: 'locations-api',
    characterId: moveData.characterId,
    fromLocation: movement.fromLocation,
    toLocation: movement.toLocation
  });

  const response: APIResponse<any> = {
    success: true,
    data: movement,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
}));

export default router;