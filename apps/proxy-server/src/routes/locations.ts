import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { locationService, CreateLocationData, MoveCharacterData } from '../services/locationService';
import { ValidationError } from '../middleware/errorHandler';
import { APIResponse, Location, LocationMovement, LocationInteraction } from '@ai-agent-trpg/types';

const locationRouter = Router();

// ==========================================
// 場所管理
// ==========================================

/**
 * 場所一覧を取得
 */
locationRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const query = {
    name: req.query.name as string,
    type: req.query.type ? (req.query.type as string).split(',') : undefined,
    parentLocationId: req.query.parentLocationId as string,
    isKnown: req.query.isKnown ? req.query.isKnown === 'true' : undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };

  const locations = await locationService.getLocations(query);

  const response: APIResponse<typeof locations> = {
    success: true,
    data: locations,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 特定の場所を取得
 */
locationRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const location = await locationService.getLocationById(id);
  if (!location) {
    throw new ValidationError('Location not found');
  }

  const response: APIResponse<Location> = {
    success: true,
    data: location,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 新しい場所を作成
 */
locationRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const locationData: CreateLocationData = req.body;

  if (!locationData.name || !locationData.type) {
    throw new ValidationError('Name and type are required');
  }

  const location = await locationService.createLocation(locationData);

  const response: APIResponse<Location> = {
    success: true,
    data: location,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
}));

/**
 * 場所を更新
 */
locationRouter.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const updatedLocation = await locationService.updateLocation(id, updates);
  if (!updatedLocation) {
    throw new ValidationError('Location not found');
  }

  const response: APIResponse<Location> = {
    success: true,
    data: updatedLocation,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 場所を削除
 */
locationRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id: _id } = req.params;

  // TODO: Implement deleteLocation method

  const response: APIResponse<{ success: boolean }> = {
    success: true,
    data: { success: true },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// ==========================================
// 場所での存在情報
// ==========================================

/**
 * 場所にいるキャラクターを取得
 */
locationRouter.get('/:id/characters', asyncHandler(async (req: Request, res: Response) => {
  const { id: _id } = req.params;

  // TODO: Implement getCharactersInLocation method
  const characters: any[] = [];

  const response: APIResponse<typeof characters> = {
    success: true,
    data: characters,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 場所で発生するイベントを取得
 */
locationRouter.get('/:id/events', asyncHandler(async (req: Request, res: Response) => {
  const { id: _id } = req.params;

  // TODO: Implement getEventsInLocation method
  const events: any[] = [];

  const response: APIResponse<typeof events> = {
    success: true,
    data: events,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 接続されている場所を取得
 */
locationRouter.get('/:id/connections', asyncHandler(async (req: Request, res: Response) => {
  const { id: _id } = req.params;

  // TODO: Implement getConnectedLocations method
  const connectedLocations: any[] = [];

  const response: APIResponse<typeof connectedLocations> = {
    success: true,
    data: connectedLocations,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * 近くの場所を取得
 */
locationRouter.get('/:id/nearby', asyncHandler(async (req: Request, res: Response) => {
  const { id: _id } = req.params;
  // TODO: Implement maxDistance functionality

  // TODO: Implement findNearbyLocations method
  const nearbyLocations: any[] = [];

  const response: APIResponse<typeof nearbyLocations> = {
    success: true,
    data: nearbyLocations,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// ==========================================
// キャラクター移動
// ==========================================

/**
 * キャラクターを移動
 */
locationRouter.post('/move', asyncHandler(async (req: Request, res: Response) => {
  const moveData: MoveCharacterData = req.body;

  if (!moveData.characterId || !moveData.toLocationId) {
    throw new ValidationError('Character ID and target location ID are required');
  }

  const movement = await locationService.moveCharacter(moveData);

  const response: APIResponse<LocationMovement> = {
    success: true,
    data: movement,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// ==========================================
// 場所での相互作用
// ==========================================

/**
 * 場所での相互作用を作成
 */
locationRouter.post('/:id/interactions', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { characterId, interactionType, details, context: _context } = req.body;

  if (!characterId || !interactionType || !details) {
    throw new ValidationError('Character ID, interaction type, and details are required');
  }

  const interaction = await locationService.createLocationInteraction(
    id,
    characterId,
    interactionType,
    details
  );

  const response: APIResponse<LocationInteraction> = {
    success: true,
    data: interaction,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
}));

/**
 * 場所での相互作用履歴を取得
 */
locationRouter.get('/:id/interactions', asyncHandler(async (req: Request, res: Response) => {
  const { id: _id } = req.params;
  // TODO: Implement filtering by characterId and interactionType

  // TODO: Implement getLocationInteractions method
  const interactions: any[] = [];

  const response: APIResponse<typeof interactions> = {
    success: true,
    data: interactions,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// ==========================================
// 便利なエンドポイント
// ==========================================

/**
 * デフォルトの場所を作成（開発用）
 */
locationRouter.post('/seed/default', asyncHandler(async (_req: Request, res: Response) => {
  const defaultLocations = [
    {
      name: '冒険者の街',
      description: '多くの冒険者が集まる賑やかな街',
      type: 'settlement' as const,
      environment: {
        lighting: 'bright' as const,
        temperature: 'comfortable' as const,
        weather: 'clear' as const,
        terrain: 'urban' as const,
        hazards: [],
        resources: ['宿屋', '商店', '酒場', '武器屋'],
      },
      properties: {
        isRestArea: true,
        hasShops: true,
        hasTeleporter: false,
        isSecret: false,
        isDangerous: false,
        magicLevel: 'low' as const,
        sanctity: 'neutral' as const,
      },
      aiData: {
        atmosphere: '活気に満ちた冒険者の街',
        suggestedActions: ['買い物をする', '情報収集', '仲間を探す'],
        narrativeHooks: ['新しい依頼の掲示板', '怪しい商人', '酒場での噂話'],
        ambientDescriptions: [
          '街の中央広場では商人たちが活発に商売をしている',
          '冒険者たちが酒場で今日の成果を語り合っている',
          '武器屋から金属を打つ音が響いている',
        ],
      },
    },
    {
      name: '暗い森',
      description: '古い木々に覆われた薄暗い森',
      type: 'wilderness' as const,
      environment: {
        lighting: 'dim' as const,
        temperature: 'cool' as const,
        weather: 'cloudy' as const,
        terrain: 'forest' as const,
        hazards: ['野生動物', '迷いやすい道'],
        resources: ['薬草', '木材', '野生果実'],
      },
      properties: {
        isRestArea: false,
        hasShops: false,
        hasTeleporter: false,
        isSecret: false,
        isDangerous: true,
        magicLevel: 'medium' as const,
        sanctity: 'neutral' as const,
      },
      aiData: {
        atmosphere: '神秘的で少し危険な森',
        suggestedActions: ['探索する', '薬草を採取', '隠れ場所を探す'],
        narrativeHooks: ['古い遺跡の噂', '森の精霊の目撃情報', '行方不明者の手がかり'],
        ambientDescriptions: [
          '木漏れ日が森の床を斑模様に照らしている',
          '遠くで何かの鳴き声が聞こえる',
          '足元の落ち葉がサクサクと音を立てる',
        ],
      },
    },
  ];

  const createdLocations = [];
  for (const locationData of defaultLocations) {
    // TODO: Fix locationData type compatibility with CreateLocationData
    const location = await locationService.createLocation(locationData as any);
    createdLocations.push(location);
  }

  const response: APIResponse<typeof createdLocations> = {
    success: true,
    data: createdLocations,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

export { locationRouter };